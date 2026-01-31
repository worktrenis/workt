import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import ComprehensivePDFService from '../services/ComprehensivePDFService_v2';
import { useCalculationService, useSettings } from '../hooks';
import { DEFAULT_SETTINGS } from '../constants';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import testPDFService from '../utils/testPDFService';

const { width } = Dimensions.get('window');

const PDFExportScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const calculationService = useCalculationService();
  const { settings, isLoading: settingsLoading } = useSettings();
  
  const [loading, setLoading] = useState(false);
  const [workEntries, setWorkEntries] = useState([]);
  const [monthlyAggregated, setMonthlyAggregated] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (settings && !settingsLoading) {
      loadWorkData();
    }
  }, [selectedMonth, selectedYear, settings, settingsLoading]);

  // Calcola aggregazione mensile identica al DashboardScreen
  const calculateMonthlyAggregation = async (entries) => {
    if (settingsLoading) {
      console.log('🔧 PDF EXPORT - Settings ancora in caricamento, attesa...');
      return {};
    }

    if (!settings) {
      console.log('🔧 PDF EXPORT - Settings non disponibili, skip...');
      return {};
    }

    console.log('🔧 PDF EXPORT - Calcolo aggregazione per', entries.length, 'entries');

    // Definizione di safeSettings (identica al DashboardScreen)
    const defaultSettings = {
      contract: {
        hourlyRate: 16.15,
        dailyRate: 107.69,
        monthlyGrossSalary: 2800.00,
        normalHours: 40,
        dailyHours: 8,
        saturdayBonus: 0.2,
        nightBonus: 0.25,
        nightBonus2: 0.35,
        overtimeBonus: 0.2,
        overtimeLimit: {
          hours: 8,
          type: 'daily'
        }
      },
      travelCompensationRate: 1.0,
      standbySettings: {
        dailyAllowance: 7.5,
        dailyIndemnity: 7.5,
        travelWithBonus: false
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 }
      }
    };
    
    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
      travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS',
      multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false
    };

    // Calcolo indennità di reperibilità dal calendario
    const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(selectedYear, selectedMonth, safeSettings);

    if (!entries || entries.length === 0) {
      const standbyTotal = standbyAllowances.reduce((sum, allowance) => sum + allowance.allowance, 0);
      return {
        totalEarnings: standbyTotal,
        ordinary: { total: 0, hours: {}, days: 0 },
        standby: { totalEarnings: standbyTotal, workHours: {}, travelHours: {}, days: 0 },
        allowances: { 
          travel: 0, 
          meal: 0, 
          standby: standbyTotal,
          travelDays: 0,
          mealDays: 0,
          standbyDays: standbyAllowances.length
        },
        daysWorked: 0,
        totalHours: 0
      };
    }

    // Aggrega tutti i breakdown giornalieri
    let aggregated = {
      totalEarnings: 0,
      ordinary: {
        total: 0,
        days: 0,
        hours: {
          lavoro_giornaliera: 0,
          viaggio_giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0
        }
      },
      standby: {
        totalEarnings: 0,
        days: 0,
        workHours: { ordinary: 0, evening: 0, night: 0, holiday: 0, saturday: 0, saturday_night: 0, night_holiday: 0 },
        travelHours: { ordinary: 0, evening: 0, night: 0, holiday: 0, saturday: 0, saturday_night: 0, night_holiday: 0 }
      },
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0,
        travelDays: 0,
        mealDays: 0,
        standbyDays: 0
      },
      daysWorked: 0,
      totalHours: 0
    };

    // Processa ogni entry
    for (const entry of entries) {
      try {
        const workEntry = createWorkEntryFromData(entry);
        const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        
        if (!breakdown) continue;

        aggregated.totalEarnings += breakdown.totalEarnings || 0;
        aggregated.daysWorked += 1;

        // Aggrega ore ordinarie
        if (breakdown.ordinary) {
          aggregated.ordinary.total += breakdown.ordinary.total || 0;
          
          if (breakdown.ordinary.hours) {
            Object.keys(breakdown.ordinary.hours).forEach(key => {
              if (aggregated.ordinary.hours[key] !== undefined) {
                aggregated.ordinary.hours[key] += breakdown.ordinary.hours[key] || 0;
              }
            });
          }
        }

        // Aggrega reperibilità
        if (breakdown.standby) {
          aggregated.standby.totalEarnings += breakdown.standby.totalEarnings || 0;
          
          if (breakdown.standby.workHours) {
            Object.keys(breakdown.standby.workHours).forEach(key => {
              if (aggregated.standby.workHours[key] !== undefined) {
                aggregated.standby.workHours[key] += breakdown.standby.workHours[key] || 0;
              }
            });
          }

          if (breakdown.standby.travelHours) {
            Object.keys(breakdown.standby.travelHours).forEach(key => {
              if (aggregated.standby.travelHours[key] !== undefined) {
                aggregated.standby.travelHours[key] += breakdown.standby.travelHours[key] || 0;
              }
            });
          }
        }

        // Aggrega indennità
        if (breakdown.allowances) {
          aggregated.allowances.travel += breakdown.allowances.travel || 0;
          aggregated.allowances.meal += breakdown.allowances.meal || 0;
          aggregated.allowances.standby += breakdown.allowances.standby || 0;
          
          if (breakdown.allowances.travel > 0) aggregated.allowances.travelDays += 1;
          if (breakdown.allowances.meal > 0) aggregated.allowances.mealDays += 1;
          if (breakdown.allowances.standby > 0) aggregated.allowances.standbyDays += 1;
        }

        // Calcola ore totali
        const dailyHours = Object.values(breakdown.ordinary?.hours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
        
        aggregated.totalHours += dailyHours;

      } catch (error) {
        console.error('Errore PDF nel calcolo breakdown per entry:', entry.id, error);
      }
    }

    // Aggiungi indennità di reperibilità dal calendario
    const existingEntryDates = entries.map(entry => entry.date);
    const standbyOnlyDays = standbyAllowances.filter(allowance => !existingEntryDates.includes(allowance.date));
    
    if (standbyOnlyDays.length > 0) {
      const standbyOnlyTotal = standbyOnlyDays.reduce((sum, allowance) => sum + allowance.allowance, 0);
      aggregated.allowances.standby += standbyOnlyTotal;
      aggregated.allowances.standbyDays += standbyOnlyDays.length;
      aggregated.totalEarnings += standbyOnlyTotal;
      aggregated.standby.totalEarnings += standbyOnlyTotal;
    }

    return aggregated;
  };

  const loadWorkData = async () => {
    try {
      setLoading(true);
      console.log('🔍 PDF Export: Caricamento dati per mese:', selectedMonth, 'anno:', selectedYear);
      
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth);
      setWorkEntries(entries);
      
      // Calcola aggregazione mensile usando la stessa logica del DashboardScreen
      const aggregated = await calculateMonthlyAggregation(entries);
      setMonthlyAggregated(aggregated);
      
    } catch (error) {
      console.error('❌ PDF Export: Errore caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del mese selezionato');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours) => {
    if (!hours) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '€0,00';
    return `€${amount.toFixed(2).replace('.', ',')}`;
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 PDF Export: Inizio export PDF completo');
      console.log('🚀 PDF Export: WorkEntries disponibili:', workEntries.length);
      console.log('🚀 PDF Export: MonthlyAggregated:', monthlyAggregated);
      
      if (workEntries.length === 0) {
        console.log('⚠️ PDF Export: Nessuna work entry disponibile');
        Alert.alert(
          'Nessun Dato',
          'Non ci sono registrazioni per il mese selezionato. Seleziona un mese diverso o aggiungi alcune registrazioni.',
          [{ text: 'OK' }]
        );
        return;
      }

      const monthName = getMonthName(selectedMonth);
      const totalHours = monthlyAggregated.totalHours || 0;
      const totalEarnings = monthlyAggregated.totalEarnings || 0;

      Alert.alert(
        '📄 Genera Report PDF Completo',
        `Stai per generare un report PDF dettagliato per ${monthName} ${selectedYear}.\n\nIl report includerà:\n• ${workEntries.length} registrazioni complete\n• ${formatHours(totalHours)} ore totali\n• ${formatCurrency(totalEarnings)} guadagno lordo\n• Breakdown dettagliati per ogni giorno\n• Tutte le informazioni del TimeEntryForm`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Genera PDF',
            onPress: async () => {
              try {
                console.log('📄 Avvio generazione PDF con nuovo servizio...');
                
                // Definizione di safeSettings (identica al DashboardScreen)
                const defaultSettings = {
                  contract: {
                    hourlyRate: 16.15,
                    dailyRate: 107.69,
                    monthlyGrossSalary: 2800.00,
                    normalHours: 40,
                    dailyHours: 8,
                    saturdayBonus: 0.2,
                    nightBonus: 0.25,
                    nightBonus2: 0.35,
                    overtimeBonus: 0.2,
                    overtimeLimit: {
                      hours: 8,
                      type: 'daily'
                    }
                  },
                  travelCompensationRate: 1.0,
                  standbySettings: {
                    dailyAllowance: 7.5,
                    dailyIndemnity: 7.5,
                    travelWithBonus: false
                  },
                  mealAllowances: {
                    lunch: { voucherAmount: 5.29 },
                    dinner: { voucherAmount: 5.29 }
                  }
                };
                
                const safeSettings = {
                  ...defaultSettings,
                  ...(settings || {}),
                  contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
                  standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
                  mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
                  travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS',
                  multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false
                };
                
                // Preparare work entries con breakdown allegati
                console.log('📄 PDF DEBUG - Inizio calcolo breakdown per', workEntries.length, 'entries');
                const entriesWithBreakdown = await Promise.all(
                  workEntries.map(async (entry) => {
                    try {
                      const workEntry = createWorkEntryFromData(entry);
                      const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
                      console.log(`📄 PDF DEBUG - Entry ${entry.date}: breakdown calcolato, totalEarnings=€${breakdown.totalEarnings}`);
                      return {
                        ...entry,
                        breakdown: breakdown
                      };
                    } catch (error) {
                      console.error('❌ PDF ERROR - Errore calcolo breakdown per entry:', entry.date, error);
                      return entry; // Restituisci entry senza breakdown in caso di errore
                    }
                  })
                );
                
                // Ricalcola il totale ore mensile dal breakdown (stesso metodo della dashboard)
                let correctedTotalHours = 0;
                let correctedTotalEarnings = 0;
                let validBreakdowns = 0;
                
                entriesWithBreakdown.forEach(entry => {
                  if (entry.breakdown) {
                    validBreakdowns++;
                    const dailyHours = Object.values(entry.breakdown.ordinary?.hours || {}).reduce((a, b) => a + b, 0) +
                                      Object.values(entry.breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                                      Object.values(entry.breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
                    correctedTotalHours += dailyHours;
                    correctedTotalEarnings += entry.breakdown.totalEarnings || 0;
                    console.log(`📄 PDF DEBUG - Entry ${entry.date}: ${dailyHours}h, €${entry.breakdown.totalEarnings}`);
                  } else {
                    console.log(`⚠️ PDF WARNING - Entry ${entry.date}: nessun breakdown allegato`);
                  }
                });
                
                console.log('📄 PDF DEBUG - Totali finali:', {
                  originalHours: monthlyAggregated.totalHours,
                  correctedHours: correctedTotalHours,
                  originalEarnings: monthlyAggregated.totalEarnings,
                  correctedEarnings: correctedTotalEarnings,
                  validBreakdowns,
                  totalEntries: entriesWithBreakdown.length
                });
                
                // Aggiorna monthlyAggregated con i totali corretti
                const correctedMonthlyAggregated = {
                  ...monthlyAggregated,
                  totalHours: correctedTotalHours,
                  totalEarnings: correctedTotalEarnings,
                  daysWorked: validBreakdowns
                };
                
                console.log('🔧 PDF CORRECTION - Confronto totali:');
                console.log('🔧 PDF CORRECTION - Ore originali:', monthlyAggregated.totalHours, '→ corrette:', correctedTotalHours);
                console.log('🔧 PDF CORRECTION - Guadagni originali: €', monthlyAggregated.totalEarnings, '→ corretti: €', correctedTotalEarnings);
                
                const result = await ComprehensivePDFService.generateMonthlyReport(
                  entriesWithBreakdown,
                  correctedMonthlyAggregated,
                  selectedMonth,
                  selectedYear
                );

                if (result.success) {
                  Alert.alert(
                    '✅ PDF Generato con Successo',
                    `Report completo esportato!\n\nFile salvato: ${result.uri.split('/').pop()}\n\nIl PDF include tutti i dettagli delle registrazioni, i breakdown e le informazioni complete per ogni giorno del mese.`,
                    [{ text: 'Perfetto' }]
                  );
                  console.log('✅ PDF Export completato con successo');
                } else {
                  throw new Error(result.message || 'Errore sconosciuto');
                }
              } catch (error) {
                console.error('❌ Errore generazione PDF:', error);
                Alert.alert(
                  '❌ Errore Generazione PDF', 
                  `Si è verificato un errore durante la generazione del PDF:\n\n${error.message}\n\nVerifica che l'app abbia i permessi necessari per salvare i file.`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Errore export PDF:', error);
      Alert.alert(
        'Errore', 
        'Errore durante la preparazione del PDF. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[month - 1];
  };

  const MonthSelector = () => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = [selectedYear - 1, selectedYear, selectedYear + 1];

    return (
      <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.selectorTitle, { color: theme.colors.text }]}>
          Seleziona Periodo
        </Text>
        
        <View style={styles.selectorRow}>
          <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>
            Mese:
          </Text>
          <View style={styles.monthsGrid}>
            {months.map(month => (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthButton,
                  {
                    backgroundColor: month === selectedMonth ? theme.colors.primary : theme.colors.surface,
                  }
                ]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text style={[
                  styles.monthButtonText,
                  {
                    color: month === selectedMonth ? 'white' : theme.colors.text,
                  }
                ]}>
                  {getMonthName(month).substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.selectorRow}>
          <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>
            Anno:
          </Text>
          <View style={styles.yearContainer}>
            <TouchableOpacity
              style={[styles.yearArrow, { backgroundColor: theme.colors.surface }]}
              onPress={() => setSelectedYear(selectedYear - 1)}
            >
              <MaterialCommunityIcons 
                name="chevron-left" 
                size={20} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
            
            <View style={[styles.currentYear, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.currentYearText, { color: 'white' }]}>
                {selectedYear}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.yearArrow, { backgroundColor: theme.colors.surface }]}
              onPress={() => setSelectedYear(selectedYear + 1)}
            >
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const StatsPreview = () => (
    <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
      <View style={styles.statsHeader}>
        <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
          📊 Anteprima Report: {getMonthName(selectedMonth)} {selectedYear}
        </Text>
        {workEntries.length > 0 && (
          <Text style={[styles.statsSubtitle, { color: theme.colors.textSecondary }]}>
            {workEntries.length} registrazioni trovate
          </Text>
        )}
      </View>
      
      {workEntries.length > 0 ? (
        <>
          {/* Sezione Principale */}
          <View style={styles.mainStatsGrid}>
            <View style={[styles.statCard, styles.primaryStatCard]}>
              <MaterialCommunityIcons name="clock" size={28} color={theme.colors.primary} />
              <Text style={[styles.statValue, styles.primaryStatValue, { color: theme.colors.text }]}>
                {formatHours(monthlyAggregated.totalHours)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Ore Totali
              </Text>
            </View>
            
            <View style={[styles.statCard, styles.primaryStatCard]}>
              <MaterialCommunityIcons name="currency-eur" size={28} color={theme.colors.income} />
              <Text style={[styles.statValue, styles.primaryStatValue, { color: theme.colors.text }]}>
                {formatCurrency(monthlyAggregated.totalEarnings)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Guadagno Lordo
              </Text>
            </View>
          </View>

          {/* Sezione Dettagli */}
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Dettagli Lavoro
            </Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <MaterialCommunityIcons name="calendar-check" size={20} color={theme.colors.secondary} />
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {monthlyAggregated.daysWorked}
                </Text>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Giorni Lavorati
                </Text>
              </View>
              
              <View style={styles.detailCard}>
                <MaterialCommunityIcons name="clock-fast" size={20} color={theme.colors.overtime} />
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {formatHours((monthlyAggregated.ordinary?.hours?.lavoro_extra || 0) + (monthlyAggregated.ordinary?.hours?.viaggio_extra || 0))}
                </Text>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Straordinari
                </Text>
              </View>

              <View style={styles.detailCard}>
                <MaterialCommunityIcons name="car" size={20} color={theme.colors.travel} />
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {formatHours(monthlyAggregated.ordinary?.hours?.viaggio_ordinario || 0)}
                </Text>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Viaggio Ordinario
                </Text>
              </View>

              <View style={styles.detailCard}>
                <MaterialCommunityIcons name="phone-in-talk" size={20} color={theme.colors.standby} />
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {formatHours(monthlyAggregated.ordinary?.hours?.reperibilita || 0)}
                </Text>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Reperibilità
                </Text>
              </View>
            </View>
          </View>

          {/* Sezione Giorni Speciali */}
          {(monthlyAggregated.saturday?.totalHours > 0 || 
            monthlyAggregated.sunday?.totalHours > 0 || 
            monthlyAggregated.holiday?.totalHours > 0) && (
            <View style={styles.specialDaysSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Giorni Non Ordinari
              </Text>
              <View style={styles.specialDaysGrid}>
                {monthlyAggregated.saturday?.totalHours > 0 && (
                  <View style={[styles.specialDayCard, { borderLeftColor: theme.colors.saturday }]}>
                    <Text style={[styles.specialDayLabel, { color: theme.colors.textSecondary }]}>
                      Sabato
                    </Text>
                    <Text style={[styles.specialDayValue, { color: theme.colors.text }]}>
                      {formatHours(monthlyAggregated.saturday.totalHours)}
                    </Text>
                    <Text style={[styles.specialDayEarnings, { color: theme.colors.income }]}>
                      {formatCurrency(monthlyAggregated.saturday.totalEarnings)}
                    </Text>
                  </View>
                )}
                
                {monthlyAggregated.sunday?.totalHours > 0 && (
                  <View style={[styles.specialDayCard, { borderLeftColor: theme.colors.sunday }]}>
                    <Text style={[styles.specialDayLabel, { color: theme.colors.textSecondary }]}>
                      Domenica
                    </Text>
                    <Text style={[styles.specialDayValue, { color: theme.colors.text }]}>
                      {formatHours(monthlyAggregated.sunday.totalHours)}
                    </Text>
                    <Text style={[styles.specialDayEarnings, { color: theme.colors.income }]}>
                      {formatCurrency(monthlyAggregated.sunday.totalEarnings)}
                    </Text>
                  </View>
                )}
                
                {monthlyAggregated.holiday?.totalHours > 0 && (
                  <View style={[styles.specialDayCard, { borderLeftColor: theme.colors.holiday }]}>
                    <Text style={[styles.specialDayLabel, { color: theme.colors.textSecondary }]}>
                      Festivi
                    </Text>
                    <Text style={[styles.specialDayValue, { color: theme.colors.text }]}>
                      {formatHours(monthlyAggregated.holiday.totalHours)}
                    </Text>
                    <Text style={[styles.specialDayEarnings, { color: theme.colors.income }]}>
                      {formatCurrency(monthlyAggregated.holiday.totalEarnings)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
            Nessuna registrazione trovata per {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          <Text style={[styles.noDataSubtext, { color: theme.colors.textSecondary }]}>
            Seleziona un mese diverso o aggiungi alcune registrazioni
          </Text>
        </View>
      )}
    </View>
  );

  // 🔍 DEBUG: Funzione per verificare tutti i dati disponibili
  const debugCheckAllData = async () => {
    try {
      console.log('🔍 DEBUG: Controllo tutti i dati disponibili...');
      
      // Verifica se il database è inizializzato
      await DatabaseService.ensureInitialized();
      console.log('✅ Database inizializzato');
      
      // Query per tutti i mesi disponibili
      const allEntries = await DatabaseService.getAllWorkEntries();
      console.log('📊 Totale entries nel database:', allEntries.length);
      
      if (allEntries.length > 0) {
        // Raggruppa per mese
        const entriesByMonth = {};
        allEntries.forEach(entry => {
          const monthKey = entry.date.substring(0, 7); // YYYY-MM
          if (!entriesByMonth[monthKey]) {
            entriesByMonth[monthKey] = [];
          }
          entriesByMonth[monthKey].push(entry);
        });
        
        console.log('📅 Entries per mese:');
        Object.keys(entriesByMonth).sort().forEach(month => {
          console.log(`${month}: ${entriesByMonth[month].length} entries`);
        });
        
        // Mostra esempio della prima entry
        console.log('📝 Esempio prima entry:', JSON.stringify(allEntries[0], null, 2));
        
        // Verifica il mese corrente selezionato
        const currentMonthKey = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
        const currentMonthEntries = entriesByMonth[currentMonthKey] || [];
        console.log(`🎯 Entries per mese selezionato (${currentMonthKey}):`, currentMonthEntries.length);
        
        Alert.alert(
          'Debug Database',
          `Database trovato!\n\n• Totale entries: ${allEntries.length}\n• Mesi disponibili: ${Object.keys(entriesByMonth).length}\n• Mese corrente (${currentMonthKey}): ${currentMonthEntries.length} entries\n\nDettagli nei log della console.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Nessuna entry trovata nel database');
        Alert.alert('Debug Database', 'Database vuoto - nessuna work entry trovata');
      }
      
    } catch (error) {
      console.error('❌ Errore nel debug:', error);
      Alert.alert('Errore Debug', `Errore: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.colors.statusBarStyle}
        backgroundColor={theme.colors.statusBarBackground}
      />
      
      {settingsLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Caricamento impostazioni...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.headerCard, { backgroundColor: theme.colors.card }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={theme.colors.error} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Export PDF Report
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Genera report PDF professionale dei tuoi orari di lavoro
            </Text>
          </View>

        {/* Selettore mese/anno */}
        <MonthSelector />

        {/* Anteprima statistiche */}
        <StatsPreview />

        {/* Pulsante di export */}
        <View style={[styles.exportContainer, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              {
                backgroundColor: workEntries.length > 0 ? theme.colors.error : theme.colors.border,
              }
            ]}
            onPress={handleExportPDF}
            disabled={loading || workEntries.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={24} color="white" />
                <Text style={styles.exportButtonText}>
                  Genera PDF Report
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.exportDescription, { color: theme.colors.textSecondary }]}>
            Il report includerà tutte le registrazioni del mese selezionato con breakdown dettagliato di ore e guadagni
          </Text>

          {/* 🔍 DEBUG: Pulsante temporaneo per verificare i dati */}
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: theme.colors.secondary }]}
            onPress={debugCheckAllData}
          >
            <MaterialCommunityIcons name="bug" size={20} color="white" />
            <Text style={styles.debugButtonText}>
              🔍 Debug Database
            </Text>
          </TouchableOpacity>

          {/* 🧪 TEST: Pulsante per testare il nuovo servizio PDF */}
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: '#4CAF50', marginTop: 10 }]}
            onPress={testPDFService}
            disabled={loading}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="white" />
            <Text style={styles.debugButtonText}>
              🧪 Test PDF Service
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="information" size={24} color={theme.colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              📋 Contenuto del Report
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Informazioni contratto CCNL{'\n'}
              • Riepilogo ore e guadagni{'\n'}
              • Tabella dettagliata registrazioni{'\n'}
              • Breakdown per tipologie di lavoro{'\n'}
              • Formato PDF professionale per condivisione
            </Text>
          </View>
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectorContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  selectorRow: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  monthScroll: {
    flexDirection: 'row',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    width: '22%', // 4 mesi per riga con gap
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentYear: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  currentYearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsHeader: {
    marginBottom: 20,
  },
  statsSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  mainStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryStatCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  primaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailCard: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  specialDaysSection: {
    marginBottom: 12,
  },
  specialDaysGrid: {
    gap: 8,
  },
  specialDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  specialDayLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  specialDayValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  specialDayEarnings: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  exportContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  exportDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default PDFExportScreen;
