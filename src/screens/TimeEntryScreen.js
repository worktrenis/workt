import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useWorkEntries, useSettings, useCalculationService } from '../hooks';
import { formatDate, formatTime, formatCurrency, getDayName, formatSafeHours } from '../utils';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/DatabaseService';
import DataUpdateService from '../services/DataUpdateService';
import { PressableAnimated, FadeInCard, CardSkeleton, EnhancedTimeSlot, QuickStat } from '../components/AnimatedComponents';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const getEffectiveDailyRateFromSettings = (settings) => {
  const contract = settings?.contract || {};

  const explicitDailyRate = Number(contract.dailyRate);
  if (Number.isFinite(explicitDailyRate) && explicitDailyRate > 0) {
    return explicitDailyRate;
  }

  const monthlySalary = Number(contract.monthlySalary);
  const workingDaysPerMonthRaw = Number(contract.workingDaysPerMonth);
  const workingDaysPerMonth = Number.isFinite(workingDaysPerMonthRaw) && workingDaysPerMonthRaw > 0
    ? workingDaysPerMonthRaw
    : 26;

  if (Number.isFinite(monthlySalary) && monthlySalary > 0) {
    return monthlySalary / workingDaysPerMonth;
  }

  return 109.19;
};

const normalizeCcnlAmountInNotes = (notes, settings) => {
  if (!notes || typeof notes !== 'string') return notes;

  // Applica solo alle note generate automaticamente (non vogliamo toccare note libere dell'utente)
  if (!/\bCCNL\b/i.test(notes)) return notes;
  if (!/Retribuzione secondo CCNL|retribuito secondo CCNL/i.test(notes)) return notes;

  const dailyRate = getEffectiveDailyRateFromSettings(settings);
  return notes.replace(/CCNL\s*\(€\s*\d+(?:[\.,]\d{2})\)/i, `CCNL (€${dailyRate.toFixed(2)})`);
};

const dayTypeLabels = {
  lavorativa: { label: 'Lavoro', color: '#2196F3', icon: 'briefcase' },
  ferie: { label: 'Ferie', color: '#43a047', icon: 'beach' },
  permesso: { label: 'Permesso', color: '#ef6c00', icon: 'clock-outline' },
  malattia: { label: 'Malattia', color: '#d32f2f', icon: 'medical-bag' },
  riposo: { label: 'Riposo compensativo', color: '#757575', icon: 'sleep' },
  festivo: { label: 'Festivo', color: '#9c27b0', icon: 'calendar-star' },
};

const completamentoLabels = {
  nessuno: { label: 'Nessun completamento', color: '#999', icon: 'minus-circle-outline' },
  ferie: { label: 'Completato con Ferie', color: '#43a047', icon: 'beach' },
  permesso: { label: 'Completato con Permesso', color: '#ef6c00', icon: 'clock-outline' },
  malattia: { label: 'Completato con Malattia', color: '#d32f2f', icon: 'medical-bag' },
  riposo: { label: 'Completato con Riposo', color: '#757575', icon: 'sleep' },
  festivo: { label: 'Completato con Festivo', color: '#9c27b0', icon: 'calendar-star' },
};

// Componente per il badge informativo migliorato
const InfoBadge = ({ icon, label, value, color, backgroundColor, onPress, styles }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
    onPress && onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.modernBadge, { backgroundColor }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={[styles.modernBadgeLabel, { color }]}>{label}</Text>
        {value && <Text style={[styles.modernBadgeValue, { color }]}>{value}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Componente per gli orari migliorato
const TimeSlot = ({ icon, label, startTime, endTime, duration, color = '#666', styles }) => {
  if (!startTime || !endTime) return null;
  
  return (
    <View style={styles.timeSlotContainer}>
      <View style={styles.timeSlotHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
        <Text style={[styles.timeSlotLabel, { color }]}>{label}</Text>
        {duration && (
          <Text style={styles.timeSlotDuration}>
            ({formatSafeHours(duration)})
          </Text>
        )}
      </View>
      <Text style={styles.timeSlotTime}>
        {formatTime(startTime)} → {formatTime(endTime)}
      </Text>
    </View>
  );
};

// Componente per il breakdown guadagni
const EarningsBreakdown = ({ breakdown, onPress, styles }) => {
  const [expanded, setExpanded] = useState(false);

  const components = [];
  if (breakdown.ordinary?.total > 0) {
    components.push({ label: 'Ordinario', value: breakdown.ordinary.total, color: '#2196F3' });
  }
  if (breakdown.standby?.totalEarnings > 0) {
    const interventions = breakdown.standby.totalEarnings - (breakdown.standby.dailyIndemnity || 0);
    components.push({ label: 'Interventi', value: interventions, color: '#FF9800' });
  }
  if (breakdown.allowances?.standby > 0) {
    components.push({ label: 'Ind. Reperibilità', value: breakdown.allowances.standby, color: '#4CAF50' });
  }
  if (breakdown.allowances?.travel > 0) {
    components.push({ label: 'Ind. Trasferta', value: breakdown.allowances.travel, color: '#9C27B0' });
  }

  return (
    <TouchableOpacity 
      style={styles.earningsBreakdownContainer}
      onPress={() => {
        setExpanded(!expanded);
        onPress && onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.earningsHeader}>
        <Text style={styles.earningsTotal}>
          {formatCurrency(breakdown.totalEarnings)}
        </Text>
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </View>
      
      {expanded && components.length > 0 && (
        <View style={styles.earningsComponents}>
          {components.map((comp, index) => (
            <View key={index} style={styles.earningsComponent}>
              <View style={[styles.componentDot, { backgroundColor: comp.color }]} />
              <Text style={styles.componentLabel}>{comp.label}</Text>
              <Text style={styles.componentValue}>{formatCurrency(comp.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const ActionMenu = ({ visible, entry, onClose, onDeleted, styles }) => {
  const date = entry ? formatDate(entry.date) : '';
  const navigation = useNavigation();

  const handleEdit = () => {
    onClose();
    navigation.navigate('TimeEntryForm', { entry, isEdit: true });
  };

  const handleDelete = () => {
    Alert.alert(
      'Conferma eliminazione',
      `Sei sicuro di voler eliminare l'inserimento del ${date}?`,
      [
        {
          text: 'Annulla',
          style: 'cancel',
          onPress: onClose
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteWorkEntry(entry.id);
              onClose();
              onDeleted();
              Alert.alert('Successo', 'Inserimento eliminato con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare l\'inserimento');
            }
          }
        }
      ]
    );
  };

  if (!visible || !entry) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.actionMenu}>
          <TouchableOpacity style={styles.actionMenuItem} onPress={handleEdit}>
            <MaterialCommunityIcons name="pencil" size={24} color="#2196F3" />
            <Text style={styles.actionMenuText}>Modifica</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionMenuItem} onPress={handleDelete}>
            <MaterialCommunityIcons name="delete" size={24} color="#F44336" />
            <Text style={[styles.actionMenuText, { color: '#F44336' }]}>Elimina</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

// Componente DetailSection per sezioni organizzate come nel form
const DetailSection = ({ title, icon, iconColor, children, isLast = false, expanded = false, onToggle, styles }) => (
  <View style={[styles.detailSection, isLast && styles.lastDetailSection]}>
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onToggle}
      activeOpacity={onToggle ? 0.7 : 1}
    >
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {onToggle && (
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={18} 
          color="#666" 
        />
      )}
    </TouchableOpacity>
    {(!onToggle || expanded) && (
      <View style={styles.sectionContent}>
        {children}
      </View>
    )}
  </View>
);

// Componente DetailRow per singole righe di dettaglio
const DetailRow = ({ label, value, duration, highlight = false, isSubitem = false, calculation, styles }) => (
  <View style={[styles.detailRow, isSubitem && styles.subDetailRow]}>
    <Text style={[styles.detailLabel, isSubitem && styles.subDetailLabel]}>{label}</Text>
    <View style={styles.detailValueContainer}>
      <Text style={[
        styles.detailValue, 
        highlight && styles.highlightValue,
        isSubitem && styles.subDetailValue
      ]}>
        {value}
      </Text>
      {duration && (
        <Text style={styles.durationText}>({duration})</Text>
      )}
    </View>
    {calculation && (
      <Text style={styles.calculationText}>{calculation}</Text>
    )}
  </View>
);

// Componente per breakdown avanzato degli orari
const AdvancedHoursBreakdown = ({ breakdown, settings, styles }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!breakdown || !breakdown.ordinary) return null;

  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  const formatRateCalc = (hours, rate, total) => {
    if (hours <= 0) return '0,00 €';
    return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(hours)} = ${total.toFixed(2).replace('.', ',')} €`;
  };

  const hasOrdinaryHours = breakdown.ordinary?.hours && 
    (breakdown.ordinary.hours.lavoro_giornaliera > 0 || 
     breakdown.ordinary.hours.viaggio_giornaliera > 0 || 
     breakdown.ordinary.hours.lavoro_extra > 0 || 
     breakdown.ordinary.hours.viaggio_extra > 0);

  const hasStandbyHours = breakdown.standby?.workHours && 
    (Object.values(breakdown.standby.workHours).some(h => h > 0) || 
     Object.values(breakdown.standby.travelHours).some(h => h > 0));

  if (!hasOrdinaryHours && !hasStandbyHours) return null;

  return (
    <DetailSection
      title="Breakdown Dettagliato Orari"
      icon="chart-timeline-variant"
      iconColor="#FF5722"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      styles={styles}
    >
      {/* Attività Ordinarie */}
      {hasOrdinaryHours && (
        <>
          <Text style={styles.breakdownSubtitle}>Attività Ordinarie</Text>
          
          {/* Prime 8 ore giorni feriali */}
          {(!breakdown.details?.isSaturday && !breakdown.details?.isSunday && !breakdown.details?.isHoliday) &&
            (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) && (
              <View style={styles.breakdownItemContainer}>
                <DetailRow 
                  label="Giornaliero (prime 8h)" 
                  value={formatSafeHours(
                    (breakdown.ordinary.hours.lavoro_giornaliera || 0) +
                    (breakdown.ordinary.hours.viaggio_giornaliera || 0)
                  )}
                  calculation={(() => {
                    const totalOrdinaryHours = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                                             (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                    const dailyRate = getEffectiveDailyRateFromSettings(settings);
                    if (totalOrdinaryHours >= 8) {
                      return `${dailyRate.toFixed(2).replace('.', ',')} € × 1 giorno = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                    } else {
                      const percentage = (totalOrdinaryHours / 8 * 100).toFixed(0);
                      return `${dailyRate.toFixed(2).replace('.', ',')} € × ${percentage}% = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                    }
                  })()}
                  styles={styles}
                />
                {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                  <DetailRow 
                    label="- Lavoro" 
                    value={formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}
                    isSubitem={true}
                    styles={styles}
                  />
                )}
                {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                  <DetailRow 
                    label="- Viaggio" 
                    value={formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}
                    isSubitem={true}
                    styles={styles}
                  />
                )}
              </View>
          )}

          {/* Lavoro/Viaggio weekend/festivi */}
          {(breakdown.details?.isSaturday || breakdown.details?.isSunday || breakdown.details?.isHoliday) &&
            (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) && (
              <DetailRow 
                label={`Lavoro ordinario ${breakdown.details?.isSunday ? 'domenica' : 
                       breakdown.details?.isHoliday ? 'festivo' : 'sabato'}`}
                value={formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                                      (breakdown.ordinary.hours.viaggio_giornaliera || 0))}
                calculation={(() => {
                  const base = settings.contract?.hourlyRate || 16.41;
                  const multiplier = breakdown.details?.isSunday || breakdown.details?.isHoliday 
                    ? settings.contract?.overtimeRates?.holiday || 1.3
                    : settings.contract?.overtimeRates?.saturday || 1.25;
                  const ore = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                            (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                  return `${base.toFixed(2).replace('.', ',')} € × ${multiplier.toFixed(2).replace('.', ',')} × ${formatSafeHours(ore)} = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                })()}
                styles={styles}
              />
          )}

          {/* Ore extra */}
          {breakdown.ordinary.hours.lavoro_extra > 0 && (
            <DetailRow 
              label={`Lavoro extra (oltre 8h)${breakdown.details?.isSaturday ? ' (Sabato)' : 
                     breakdown.details?.isSunday ? ' (Domenica)' : 
                     breakdown.details?.isHoliday ? ' (Festivo)' : ''}`}
              value={formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}
              calculation={(() => {
                const base = settings.contract?.hourlyRate || 16.41;
                let overtime;
                if (breakdown.details?.isSaturday) {
                  overtime = settings.contract?.overtimeRates?.saturday || 1.25;
                } else if (breakdown.details?.isSunday || breakdown.details?.isHoliday) {
                  overtime = settings.contract?.overtimeRates?.holiday || 1.3;
                } else {
                  overtime = settings.contract?.overtimeRates?.day || 1.2;
                }
                const rate = base * overtime;
                return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(breakdown.ordinary.hours.lavoro_extra)} = ${breakdown.ordinary.earnings.lavoro_extra.toFixed(2).replace('.', ',')} €`;
              })()}
              styles={styles}
            />
          )}

          {breakdown.ordinary.hours.viaggio_extra > 0 && (
            <DetailRow 
              label="Viaggio extra (oltre 8h)"
              value={formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}
              calculation={(() => {
                const base = settings.contract?.hourlyRate || 16.41;
                const rate = base * (settings.travelCompensationRate || 1.0);
                return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} = ${breakdown.ordinary.earnings.viaggio_extra.toFixed(2).replace('.', ',')} €`;
              })()}
              styles={styles}
            />
          )}

          <DetailRow 
            label="Totale ordinario" 
            value={formatSafeAmount(breakdown.ordinary.total || 0)}
            highlight={true}
            styles={styles}
          />
        </>
      )}

      {/* Interventi Reperibilità */}
      {hasStandbyHours && (
        <>
          <Text style={styles.breakdownSubtitle}>Interventi Reperibilità</Text>
          
          {breakdown.standby.workHours?.ordinary > 0 && (
            <DetailRow 
              label="Lavoro diurno"
              value={formatSafeHours(breakdown.standby.workHours.ordinary)}
              calculation={formatRateCalc(
                breakdown.standby.workHours.ordinary,
                settings.contract?.hourlyRate || 16.41,
                breakdown.standby.workEarnings?.ordinary || 0
              )}
              styles={styles}
            />
          )}
          
          {breakdown.standby.workHours?.night > 0 && (
            <DetailRow 
              label="Lavoro notturno (+25%)"
              value={formatSafeHours(breakdown.standby.workHours.night)}
              calculation={formatRateCalc(
                breakdown.standby.workHours.night,
                (settings.contract?.hourlyRate || 16.41) * 1.25,
                breakdown.standby.workEarnings?.night || 0
              )}
              styles={styles}
            />
          )}
          
          {breakdown.standby.travelHours?.ordinary > 0 && (
            <DetailRow 
              label="Viaggio diurno"
              value={formatSafeHours(breakdown.standby.travelHours.ordinary)}
              duration={`Durata: ${formatSafeHours(breakdown.standby.travelHours.ordinary)}`}
              calculation={formatRateCalc(
                breakdown.standby.travelHours.ordinary,
                (settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0),
                breakdown.standby.travelEarnings?.ordinary || 0
              )}
              styles={styles}
            />
          )}
          
          {breakdown.standby.travelHours?.night > 0 && (
            <DetailRow 
              label="Viaggio notturno (+25%)"
              value={formatSafeHours(breakdown.standby.travelHours.night)}
              duration={`Durata: ${formatSafeHours(breakdown.standby.travelHours.night)}`}
              calculation={formatRateCalc(
                breakdown.standby.travelHours.night,
                (settings.contract?.hourlyRate || 16.41) * 1.25 * (settings.travelCompensationRate || 1.0),
                breakdown.standby.travelEarnings?.night || 0
              )}
              styles={styles}
            />
          )}

          {/* Totale reperibilità (lavoro + viaggi interventi) */}
          {(() => {
            const totalStandbyWork = Object.values(breakdown.standby.workHours || {}).reduce((sum, h) => sum + h, 0);
            const totalStandbyTravel = Object.values(breakdown.standby.travelHours || {}).reduce((sum, h) => sum + h, 0);
            const totalStandbyHours = totalStandbyWork + totalStandbyTravel;
            const totalStandbyEarnings = (breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0);
            
            return (
              <DetailRow 
                label={`Totale reperibilità (${formatSafeHours(totalStandbyHours)})`}
                value={formatSafeAmount(totalStandbyEarnings)}
                highlight={true}
                styles={styles}
              />
            );
          })()}
        </>
      )}
    </DetailSection>
  );
};

const TimeEntryScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [standbyAllowances, setStandbyAllowances] = useState([]);
  const [breakdowns, setBreakdowns] = useState({});
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const { entries, isLoading, error, refreshEntries, canRetry } = useWorkEntries(selectedYear, selectedMonth, true);
  const { settings } = useSettings();
  const calculationService = useCalculationService();

  // Refresh automatico solo quando cambiano le impostazioni o all'avvio
  const initializedRef = useRef(false);
  useEffect(() => {
    if (
      settings &&
      calculationService &&
      entries &&
      !initializedRef.current
    ) {
      initializedRef.current = true;
      setBreakdowns({});
      refreshEntries();
    }
  }, [settings, calculationService, entries, refreshEntries]);
  
  // Ref per tracciare l'ultimo refresh e debounce
  const lastRefreshRef = useRef(0);
  const refreshTimeoutRef = useRef(null);
  
  // Wrapper per refresh manuale: svuota breakdowns PRIMA di aggiornare entries con debounce
  const handleManualRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - (lastRefreshRef.current || 0);
    
    // Debounce: evita refresh troppo frequenti
    if (timeSinceLastRefresh < 1000) {
      console.log('🔄 Refresh troppo frequente, debounce attivo');
      
      // Cancella il timeout precedente se esistente
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Imposta un nuovo timeout per il refresh
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Refresh eseguito dopo debounce');
        setBreakdowns({});
        refreshEntries();
        lastRefreshRef.current = Date.now();
      }, 1000 - timeSinceLastRefresh);
      
      return;
    }
    
    // Refresh immediato se è passato abbastanza tempo
    console.log('🔄 Refresh manuale immediato');
    setBreakdowns({});
    refreshEntries();
    lastRefreshRef.current = now;
  }, [refreshEntries]);

  // Listener per il ritorno dal form - versione ottimizzata
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - (lastRefreshRef.current || 0);
      
      // Controlla se ci sono parametri di refresh
      const navigationState = navigation.getState();
      const currentRoute = navigationState.routes[navigationState.index];
      
      if (currentRoute.params?.refreshFromForm) {
        console.log('🔄 TimeEntryScreen: Parametro refresh dal form trovato');
        // Se arrivano dati precomputati, applicali subito per evitare flash con valori di default
        const { savedId, savedDate, precomputedTotal, precomputedBreakdown } = currentRoute.params || {};
        if (savedId && (precomputedTotal !== undefined || precomputedBreakdown)) {
          setBreakdowns(prev => ({
            ...prev,
            [savedId]: precomputedBreakdown || {
              ordinary: { total: precomputedTotal || 0, hours: {}, earnings: {} },
              standby: null,
              allowances: { travel: 0, meal: 0, standby: 0 },
              totalEarnings: precomputedTotal || 0,
              details: { prePrimed: true, date: savedDate }
            }
          }));
        }
        // In ogni caso, ricarica i dati dal DB (debounced) per allineare la lista
        handleManualRefresh();
        navigation.setParams({ refreshFromForm: undefined });
        return;
      }
      
      // Refresh automatico solo se è passato molto tempo (30 secondi)
      if (timeSinceLastRefresh > 30000) {
        console.log('🔄 TimeEntryScreen: Refresh automatico su focus (è passato molto tempo)');
        handleManualRefresh();
      } else {
        console.log(`🔄 TimeEntryScreen: Focus ricevuto, ma refresh recente (${Math.round(timeSinceLastRefresh/1000)}s fa)`);
      }
    });

    return unsubscribe;
  }, [navigation, handleManualRefresh]);

  // Funzioni per navigazione mesi
  const goToPreviousMonth = useCallback(() => {
    const newDate = new Date(selectedYear, selectedMonth - 2, 1); // -2 perché selectedMonth è 1-based
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth() + 1;
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    setBreakdowns({}); // Reset breakdowns per nuovo mese
  }, [selectedYear, selectedMonth]);

  const goToNextMonth = useCallback(() => {
    const newDate = new Date(selectedYear, selectedMonth, 1); // selectedMonth è già 1-based
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth() + 1;
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    setBreakdowns({}); // Reset breakdowns per nuovo mese
  }, [selectedYear, selectedMonth]);

  // Formatta il titolo del mese
  const formatMonthYear = useCallback(() => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth]);

  // Funzioni per gestire il calendario
  const openCalendar = useCallback(() => {
    console.log('🗓️ [CALENDAR] Apertura calendario richiesta');
    setShowCalendarModal(true);
  }, []);

  const closeCalendar = useCallback(() => {
    console.log('🗓️ [CALENDAR] Chiusura calendario richiesta');
    setShowCalendarModal(false);
  }, []);

  // Calcola le date marcate per il calendario
  const getMarkedDates = useCallback(() => {
    const markedDates = {};
    
    // Marca la data odierna
    const today = new Date().toISOString().split('T')[0];
    markedDates[today] = {
      marked: true,
      dotColor: '#4CAF50'
    };
    
    // Marca le date con inserimenti esistenti
    if (entries && entries.length > 0) {
      entries.forEach(entry => {
        if (entry.date) {
          const entryDate = entry.date;
          markedDates[entryDate] = {
            ...markedDates[entryDate],
            marked: true,
            dotColor: entryDate === today ? '#4CAF50' : '#2196F3'
          };
        }
      });
    }
    
    return markedDates;
  }, [entries]);

  const onDateSelect = useCallback(async (day) => {
    console.log('🗓️ [CALENDAR] Data selezionata:', day.dateString);
    const selectedDate = new Date(day.dateString);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    
    // Chiudi il calendario prima
    setShowCalendarModal(false);
    
    try {
      // Cerca se esiste già un inserimento per quella data
      const existingEntries = await DatabaseService.getWorkEntries(year, month);
      console.log('🗓️ [CALENDAR] Entries trovate per', year, month, ':', existingEntries.length);
      
      const entryForDate = existingEntries.find(entry => 
        entry.date === day.dateString
      );
      
      console.log('🗓️ [CALENDAR] Debug ricerca entry:');
      console.log('🗓️ [CALENDAR] - Data cercata:', day.dateString);
      console.log('🗓️ [CALENDAR] - Entries disponibili:', existingEntries.map(e => ({ id: e.id, date: e.date })));
      console.log('🗓️ [CALENDAR] - Entry trovato:', entryForDate ? { id: entryForDate.id, date: entryForDate.date } : 'NESSUNO');
      console.log('🗓️ [CALENDAR] Entry per', day.dateString, ':', entryForDate ? 'ESISTENTE' : 'NON ESISTENTE');
      
      if (entryForDate) {
        // Se esiste un inserimento, apri il form in modalità modifica
        console.log('🗓️ [CALENDAR] Navigando in modalità MODIFICA con:', {
          entryId: entryForDate.id,
          entry: entryForDate,
          year: year,
          month: month,
          isEdit: true,
          enableDelete: true
        });
        navigation.navigate('TimeEntryForm', {
          entryId: entryForDate.id,
          entry: entryForDate,
          year: year,
          month: month,
          isEdit: true,
          enableDelete: true
        });
      } else {
        // Se non esiste, crea nuovo inserimento per quella data
        console.log('🗓️ [CALENDAR] Navigando in modalità NUOVO con:', {
          initialDate: day.dateString,
          year: year,
          month: month
        });
        navigation.navigate('TimeEntryForm', {
          initialDate: day.dateString,
          year: year,
          month: month
        });
      }
      
      // Naviga al mese della data selezionata se diverso da quello corrente
      if (year !== selectedYear || month !== selectedMonth) {
        setSelectedYear(year);
        setSelectedMonth(month);
        setBreakdowns({}); // Reset breakdowns per nuovo mese
      }
    } catch (error) {
      console.error('🗓️ [CALENDAR] Errore nel recupero inserimenti per data:', error);
      // Fallback: apri il form per nuovo inserimento
      navigation.navigate('TimeEntryForm', {
        initialDate: day.dateString,
        year: year,
        month: month
      });
    }
  }, [navigation, selectedYear, selectedMonth]);

  // Crea stili dinamici basati sul tema
  const styles = createStyles(theme);

  // Carica le indennità di reperibilità quando cambiano anno/mese o settings
  useEffect(() => {
    if (settings?.standbySettings?.enabled) {
      const allowances = calculationService.calculateMonthlyStandbyAllowances(
        selectedYear,
        selectedMonth,
        settings
      );
      setStandbyAllowances(allowances);
    } else {
      setStandbyAllowances([]);
    }
  }, [selectedYear, selectedMonth, settings, calculationService]);

  // Debug: traccia le modalità di calcolo attive
  useEffect(() => {
    console.log('📊 [TimeEntryScreen] Modalità di calcolo attive:');
    console.log('- calculateEarningsBreakdown (async): ✅ Principale');
    console.log('- calculateEarningsBreakdownSync (sync): ⚠️ Disabilitato per consistenza');
    console.log('- Auto-retry per calcoli falliti: ✅ Attivo');
    console.log(`- Entries caricate: ${entries.length}`);
    console.log(`- Breakdowns calcolati: ${Object.keys(breakdowns).length}`);
    
    const failedCount = Object.keys(breakdowns).filter(id => 
      breakdowns[id]?.details?.calculationFailed
    ).length;
    if (failedCount > 0) {
      console.log(`- ❌ Calcoli falliti: ${failedCount}`);
    }
  }, [entries, breakdowns]);

  // Calcola breakdown solo al primo caricamento o quando mancano
  useEffect(() => {
    const calculateMissingBreakdowns = async () => {
      if (!entries?.length || !settings) return;
      
      // Trova solo le entries che non hanno ancora il breakdown
      const missingEntries = entries.filter(item => 
        item.type !== 'standby_only' && !breakdowns[item.id]
      );
      
      if (missingEntries.length === 0) {
        return; // Nessun calcolo necessario, esattamente come il refresh manuale
      }
      
      console.log(`📊 Calcolando breakdown per ${missingEntries.length} entries mancanti...`);
      
      // Copia i breakdown esistenti
      const newBreakdowns = { ...breakdowns };
      
      // Calcola solo quelli mancanti usando SEMPRE il metodo asincrono
  for (const item of missingEntries) {
        try {
          const workEntry = createWorkEntryFromData(item, calculationService);
          const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, settings);
          newBreakdowns[item.id] = breakdown;
        } catch (error) {
          console.error(`❌ Errore calcolo breakdown per entry ${item.id}:`, error);
          // Non usare più il fallback sincrono per evitare inconsistenze
          // Assegna un breakdown vuoto temporaneo
          newBreakdowns[item.id] = {
            ordinary: { total: 0, hours: {}, earnings: {} },
            standby: null,
            allowances: { travel: 0, meal: 0, standby: 0 },
            totalEarnings: 0,
            details: { error: error.message, calculationFailed: true }
          };
        }
      }
      
      setBreakdowns(newBreakdowns);
    };
    
    calculateMissingBreakdowns();
  }, [entries, settings, calculationService]); // ricalcola mancanti anche se cambiano le impostazioni

  // Sistema di auto-recovery per i calcoli falliti  
  useEffect(() => {
    const retryFailedCalculations = async () => {
      if (!settings || !calculationService) return;
      
      const failedIds = Object.keys(breakdowns).filter(id => 
        breakdowns[id]?.details?.calculationFailed
      );
      
      if (failedIds.length === 0) return;
      
      console.log(`🔄 Tentativo di ricalcolare ${failedIds.length} breakdown falliti...`);
      const newBreakdowns = { ...breakdowns };
      
      for (const id of failedIds) {
        const entry = entries.find(e => e.id.toString() === id);
        if (!entry) continue;
        
        try {
          const workEntry = createWorkEntryFromData(entry, calculationService);
          const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, settings);
          newBreakdowns[id] = breakdown;
          console.log(`✅ Ricalcolo riuscito per entry ${id}`);
        } catch (error) {
          console.error(`❌ Ricalcolo fallito per entry ${id}:`, error);
          // Mantieni l'errore ma aggiorna il timestamp
          newBreakdowns[id] = {
            ...newBreakdowns[id],
            details: {
              ...newBreakdowns[id].details,
              lastRetry: Date.now()
            }
          };
        }
      }
      
      setBreakdowns(newBreakdowns);
    };
    
    // Retry dopo 2 secondi se ci sono calcoli falliti
    const timer = setTimeout(retryFailedCalculations, 2000);
    return () => clearTimeout(timer);
  }, [breakdowns, settings, entries, calculationService]);

  // Pulisce breakdown di entries eliminate e forza ricalcolo solo se cambiano davvero le impostazioni  
  const lastSettingsHashRef = useRef();
  useEffect(() => {
    if (!settings) return;
    
    const settingsHash = JSON.stringify(settings);
    const settingsChanged = settingsHash !== lastSettingsHashRef.current;
    
    // Solo se le impostazioni sono davvero cambiate, forza il ricalcolo
    if (settingsChanged && lastSettingsHashRef.current !== undefined) {
      console.log('🔄 Impostazioni cambiate, forzo ricalcolo completo...');
      setBreakdowns({}); // Svuota tutto per forzare il ricalcolo
    } else {
      // Pulisci solo i breakdown di entries che non esistono più
      const currentEntryIds = entries?.map(e => e.id) || [];
      const existingBreakdownIds = Object.keys(breakdowns);
      const toRemove = existingBreakdownIds.filter(id => !currentEntryIds.includes(id));
      
      if (toRemove.length > 0) {
        const cleanedBreakdowns = { ...breakdowns };
        toRemove.forEach(id => delete cleanedBreakdowns[id]);
        setBreakdowns(cleanedBreakdowns);
      }
    }
    
    lastSettingsHashRef.current = settingsHash;
  }, [settings, entries]);

  // 🔄 Listener per aggiornamenti automatici dei dati dal database
  useEffect(() => {
    const handleWorkEntriesUpdate = (action, data) => {
      console.log('🔄 TIMEENTRY - Ricevuto aggiornamento:', action, data);
      
      // Per ripristini completi del backup, ricarica sempre i dati
      if (action === 'BULK_RESTORE') {
        console.log('🔄 TIMEENTRY - Ripristino backup completo, ricarico tutti i dati...');
        refreshEntries();
        return;
      }
      
      // Ricarica i dati solo se l'aggiornamento riguarda il mese corrente
      const entryYear = data?.year;
      const entryMonth = data?.month;
      
      if (entryYear === selectedYear && entryMonth === selectedMonth) {
        console.log('🔄 TIMEENTRY - Aggiornamento per mese corrente, ricarico dati...');
        refreshEntries();
      }
    };

    DataUpdateService.onWorkEntriesUpdated(handleWorkEntriesUpdate);

    return () => {
      DataUpdateService.removeAllListeners('workEntriesUpdated');
    };
  }, [selectedYear, selectedMonth, refreshEntries]);

  // Cleanup per i timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Array dei mesi in italiano
  const mesiItaliani = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Funzione per determinare il nome del mese dall'entry
  const getMonthLabel = (dateString) => {
    const entryDate = new Date(dateString);
    return `${mesiItaliani[entryDate.getMonth()]} ${entryDate.getFullYear()}`;
  };

  const handleLongPress = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowActionMenu(true);
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'standby_only') {
      // Card semplificata per solo reperibilità - esattamente come nella foto
      return (
        <View style={[styles.detailedCard, styles.standbyOnlyCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <Text style={styles.dayName}>{getDayName(item.date)}</Text>
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.standbyBadge}>
              <MaterialCommunityIcons name="phone-in-talk" size={16} color="#4CAF50" />
              <Text style={styles.standbyBadgeText}>Solo Reperibilità</Text>
            </View>
          </View>
          
          <View style={styles.standbySimpleContent}>
            <Text style={styles.standbySimpleAmount}>
              Indennità: {formatCurrency(item.standbyAllowance || 0)}
            </Text>
          </View>
        </View>
      );
    }

    // Card dettagliata simile al form per inserimenti normali
    const dbTotal = item.totalEarnings || item.total_earnings || 0;
    const breakdown = breakdowns[item.id] || {
      ordinary: { total: 0, hours: {}, earnings: {} },
      overtime: { total: 0, hours: {}, earnings: {} },
      nightWork: { total: 0, hours: {}, earnings: {} },
      travel: { total: 0, hours: {}, earnings: {} },
      standby: { total: 0, totalEarnings: 0, earnings: {}, workHours: {}, travelHours: {} },
      mealAllowances: { total: 0, count: 0, details: [] },
      allowances: { standby: 0, travel: 0 },
      // Usa il totale salvato nel DB come fallback per evitare flicker iniziale
      totalEarnings: dbTotal,
      details: {}
    };
    
    // Crea workEntry per accedere ai dati dell'entry
    const workEntry = createWorkEntryFromData(item, calculationService);

    const cantieri = (() => {
      const result = [];

      const primaryName = item.site_name || item.siteName || '';
      const primaryVehicle = item.vehicle_driven || item.vehicleDriven || '';
      const primaryPlate = item.targa_veicolo || item.vehiclePlate || '';
      if (primaryName && String(primaryName).trim()) {
        result.push({
          name: String(primaryName).trim(),
          vehicle: primaryVehicle,
          plate: primaryPlate,
        });
      }

      const additional = Array.isArray(workEntry?.viaggi) ? workEntry.viaggi : [];
      for (const s of additional) {
        const name = s?.site_name ?? s?.siteName ?? '';
        const vehicle = s?.veicolo ?? s?.vehicleDriven ?? '';
        const plate = s?.targa_veicolo ?? s?.vehiclePlate ?? '';
        if (name && String(name).trim()) {
          result.push({
            name: String(name).trim(),
            vehicle,
            plate,
          });
        }
      }

      // Dedup preservando ordine (per nome)
      return result.filter((v, i) => result.findIndex(x => x.name === v.name) === i);
    })();
    
    const dayTypeInfo = dayTypeLabels[item.day_type] || dayTypeLabels.lavorativa;
    const isSpecialDay = item.day_type !== 'lavorativa';

    return (
      <TouchableOpacity
        style={[
          styles.detailedCard,
          isSpecialDay && {
            borderLeftWidth: 4,
            borderLeftColor: dayTypeInfo.color
          }
        ]}
        onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.95}
      >
        {/* Header con data e tipo giornata */}
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dayName}>{getDayName(workEntry.date)}</Text>
            <Text style={styles.dateText}>{formatDate(workEntry.date)}</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Indicatore di calcolo fallito */}
            {breakdown.details?.calculationFailed && (
              <View style={styles.calculationErrorBadge}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#FF5722" />
                <Text style={styles.calculationErrorText}>Calcolo fallito</Text>
              </View>
            )}
            
            {isSpecialDay && (
              <View style={[styles.dayTypeBadge, { backgroundColor: dayTypeInfo.color }]}>
                <MaterialCommunityIcons name={dayTypeInfo.icon} size={14} color="white" />
                <Text style={styles.dayTypeBadgeText}>{dayTypeInfo.label}</Text>
              </View>
            )}
            <Text style={styles.totalEarnings}>{formatCurrency(breakdown.totalEarnings)}</Text>
          </View>
        </View>

        {/* Sezione Sito e Veicolo */}
        {(cantieri.length > 0 || item.vehicle_driven || item.targa_veicolo || item.vehiclePlate) && (
          <DetailSection
            title="Informazioni Lavoro"
            icon="briefcase"
            iconColor="#2196F3"
            styles={styles}
          >
            {cantieri.length > 0 && (() => {
              const formatVehicleLabel = (value) => {
                if (!value) return '';
                if (value === 'andata_ritorno') return 'Andata/Ritorno';
                if (value === 'solo_andata') return 'Solo andata';
                if (value === 'solo_ritorno') return 'Solo ritorno';
                if (value === 'non_guidato') return 'Non ho guidato';
                return value;
              };

              const base = cantieri[0] || {};
              const baseVehicle = base.vehicle || '';
              const basePlate = base.plate || '';

              const commonVehicle = !!baseVehicle && cantieri.slice(1).every(c => (c.vehicle || '') === baseVehicle);
              const commonPlate = !!basePlate && cantieri.slice(1).every(c => (c.plate || '') === basePlate);

              return (
                <>
                  {cantieri.map((c, idx) => (
                    <React.Fragment key={`cantiere-${item.id}-${idx}`}>
                      <DetailRow label={`Cantiere ${idx + 1}`} value={c.name} styles={styles} />
                    </React.Fragment>
                  ))}

                  {/* Veicolo: mostra una sola volta se uguale per tutti i cantieri */}
                  {cantieri.length === 1 && !!baseVehicle && (
                    <DetailRow label="Veicolo" value={formatVehicleLabel(baseVehicle)} styles={styles} />
                  )}
                  {cantieri.length > 1 && commonVehicle && (
                    <DetailRow label="Veicolo (tutti i cantieri)" value={formatVehicleLabel(baseVehicle)} styles={styles} />
                  )}
                  {cantieri.length > 1 && !commonVehicle && !!baseVehicle && (
                    <DetailRow label="Veicolo 1" value={formatVehicleLabel(baseVehicle)} styles={styles} />
                  )}
                  {cantieri.length > 1 && !commonVehicle && cantieri.slice(1).map((c, idx) => {
                    const absoluteIdx = idx + 1;
                    const value = c.vehicle || '';
                    if (!value) return null;
                    if (value === baseVehicle) return null;
                    return (
                      <DetailRow
                        key={`cantiere-vehicle-${item.id}-${absoluteIdx}`}
                        label={`Veicolo ${absoluteIdx + 1}`}
                        value={formatVehicleLabel(value)}
                        styles={styles}
                      />
                    );
                  })}

                  {/* Targa: mostra una sola volta se uguale per tutti i cantieri */}
                  {cantieri.length === 1 && !!basePlate && (
                    <DetailRow label="Targa" value={basePlate} styles={styles} />
                  )}
                  {cantieri.length > 1 && commonPlate && (
                    <DetailRow label="Targa (tutti i cantieri)" value={basePlate} styles={styles} />
                  )}
                  {cantieri.length > 1 && !commonPlate && !!basePlate && (
                    <DetailRow label="Targa 1" value={basePlate} styles={styles} />
                  )}
                  {cantieri.length > 1 && !commonPlate && cantieri.slice(1).map((c, idx) => {
                    const absoluteIdx = idx + 1;
                    const value = c.plate || '';
                    if (!value) return null;
                    if (value === basePlate) return null;
                    return (
                      <DetailRow
                        key={`cantiere-plate-${item.id}-${absoluteIdx}`}
                        label={`Targa ${absoluteIdx + 1}`}
                        value={value}
                        styles={styles}
                      />
                    );
                  })}
                </>
              );
            })()}

            {/* Fallback retro-compatibilità: se non ci sono cantieri ma ci sono dati veicolo */}
            {cantieri.length === 0 && item.vehicle_driven && (
              <DetailRow
                label="Veicolo"
                value={item.vehicle_driven === 'andata_ritorno' ? 'Andata/Ritorno' : item.vehicle_driven}
                styles={styles}
              />
            )}
            {cantieri.length === 0 && (item.targa_veicolo || item.vehiclePlate) && (
              <DetailRow label="Targa Veicolo" value={item.targa_veicolo || item.vehiclePlate} styles={styles} />
            )}
          </DetailSection>
        )}

        {/* Sezione Orari di Lavoro */}
        <DetailSection
          title="Orari Turni"
          icon="clock"
          iconColor="#2196F3"
          styles={styles}
        >
          {workEntry.workStart1 && workEntry.workEnd1 && (
            <DetailRow 
              label="Turno 1" 
              value={`${workEntry.workStart1} - ${workEntry.workEnd1}`}
              duration={(() => {
                if (!calculationService.calculateWorkHours) return null;
                const start1 = new Date(`2000-01-01T${workEntry.workStart1}`);
                let end1 = new Date(`2000-01-01T${workEntry.workEnd1}`);
                
                // Se l'orario di fine è minore dell'orario di inizio, significa che attraversa la mezzanotte
                if (end1 <= start1) {
                  end1.setDate(end1.getDate() + 1);
                }
                
                const duration1 = (end1 - start1) / (1000 * 60 * 60);
                return formatSafeHours(duration1);
              })()}
              styles={styles}
            />
          )}
          {workEntry.workStart2 && workEntry.workEnd2 && (
            <DetailRow 
              label="Turno 2" 
              value={`${workEntry.workStart2} - ${workEntry.workEnd2}`}
              duration={(() => {
                const start2 = new Date(`2000-01-01T${workEntry.workStart2}`);
                let end2 = new Date(`2000-01-01T${workEntry.workEnd2}`);
                
                // Se l'orario di fine è minore dell'orario di inizio, significa che attraversa la mezzanotte
                if (end2 <= start2) {
                  end2.setDate(end2.getDate() + 1);
                }
                
                const duration2 = (end2 - start2) / (1000 * 60 * 60);
                return formatSafeHours(duration2);
              })()}
              styles={styles}
            />
          )}
          {/* 🚀 MULTI-TURNO: Mostra turni aggiuntivi */}
          {workEntry.viaggi && Array.isArray(workEntry.viaggi) && (() => {
            let turnoNumber = 3; // Inizia dal turno 3
            return workEntry.viaggi.map((viaggio, index) => (
              <React.Fragment key={`viaggio-${index}`}>
                {viaggio.work_start_1 && viaggio.work_end_1 && (
                  <DetailRow 
                    label={`Turno ${turnoNumber++}`} 
                    value={`${viaggio.work_start_1} - ${viaggio.work_end_1}`}
                    duration={(() => {
                      const start = new Date(`2000-01-01T${viaggio.work_start_1}`);
                      let end = new Date(`2000-01-01T${viaggio.work_end_1}`);
                      
                      // Se l'orario di fine è minore dell'orario di inizio, significa che attraversa la mezzanotte
                      if (end <= start) {
                        end.setDate(end.getDate() + 1);
                      }
                      
                      const duration = (end - start) / (1000 * 60 * 60);
                      return formatSafeHours(duration);
                    })()}
                    styles={styles}
                  />
                )}
                {viaggio.work_start_2 && viaggio.work_end_2 && (
                  <DetailRow 
                    label={`Turno ${turnoNumber++}`} 
                    value={`${viaggio.work_start_2} - ${viaggio.work_end_2}`}
                    duration={(() => {
                      const start = new Date(`2000-01-01T${viaggio.work_start_2}`);
                      let end = new Date(`2000-01-01T${viaggio.work_end_2}`);
                      
                      // Se l'orario di fine è minore dell'orario di inizio, significa che attraversa la mezzanotte
                      if (end <= start) {
                        end.setDate(end.getDate() + 1);
                      }
                      
                      const duration = (end - start) / (1000 * 60 * 60);
                      return formatSafeHours(duration);
                    })()}
                    styles={styles}
                  />
                )}
              </React.Fragment>
            ));
          })()}
          {calculationService.calculateWorkHours && (
            <DetailRow 
              label="Totale Ore Lavoro" 
              value={formatSafeHours(calculationService.calculateWorkHours(workEntry))}
              highlight={true}
              styles={styles}
            />
          )}
        </DetailSection>

        {/* Sezione Viaggi */}
        {(workEntry.departureCompany || workEntry.departureReturn || (workEntry.viaggi && Array.isArray(workEntry.viaggi) && workEntry.viaggi.length > 0)) && (
          <DetailSection
            title="Viaggi"
            icon="car"
            iconColor="#FF9800"
            styles={styles}
          >
            {workEntry.departureCompany && workEntry.arrivalSite && (
              <DetailRow 
                label="Andata" 
                value={`${workEntry.departureCompany} - ${workEntry.arrivalSite}`}
                duration={(() => {
                  if (!calculationService.calculateTimeDifference) return null;
                  // Calcolo preciso della durata dell'andata
                  const andataMinutes = calculationService.calculateTimeDifference(
                    workEntry.departureCompany, 
                    workEntry.arrivalSite
                  );
                  return formatSafeHours(calculationService.minutesToHours(andataMinutes));
                })()}
                styles={styles}
              />
            )}
            {workEntry.departureReturn && workEntry.arrivalCompany && (
              <DetailRow 
                label="Ritorno" 
                value={`${workEntry.departureReturn} - ${workEntry.arrivalCompany}`}
                duration={(() => {
                  if (!calculationService.calculateTimeDifference) return null;
                  // Calcolo preciso della durata del ritorno
                  const ritornoMinutes = calculationService.calculateTimeDifference(
                    workEntry.departureReturn, 
                    workEntry.arrivalCompany
                  );
                  return formatSafeHours(calculationService.minutesToHours(ritornoMinutes));
                })()}
                styles={styles}
              />
            )}
            {/* 🚀 MULTI-TURNO: Mostra viaggi aggiuntivi */}
            {workEntry.viaggi && Array.isArray(workEntry.viaggi) && (() => {
              let viaggioNumber = 2; // Inizia dal viaggio 2 (dopo andata/ritorno principale)
              return workEntry.viaggi.map((viaggio, index) => (
                <React.Fragment key={`viaggio-travel-${index}`}>
                  {viaggio.departure_company && viaggio.arrival_site && (
                    <DetailRow 
                      label={`Viaggio ${viaggioNumber} - Andata`} 
                      value={`${viaggio.departure_company} - ${viaggio.arrival_site}`}
                      duration={(() => {
                        const start = new Date(`2000-01-01T${viaggio.departure_company}`);
                        const end = new Date(`2000-01-01T${viaggio.arrival_site}`);
                        const duration = (end - start) / (1000 * 60 * 60);
                        return formatSafeHours(duration);
                      })()}
                      styles={styles}
                    />
                  )}
                  {viaggio.departure_return && viaggio.arrival_company && (
                    <DetailRow 
                      label={`Viaggio ${viaggioNumber++} - Ritorno`} 
                      value={`${viaggio.departure_return} - ${viaggio.arrival_company}`}
                      duration={(() => {
                        const start = new Date(`2000-01-01T${viaggio.departure_return}`);
                        const end = new Date(`2000-01-01T${viaggio.arrival_company}`);
                        const duration = (end - start) / (1000 * 60 * 60);
                        return formatSafeHours(duration);
                      })()}
                      styles={styles}
                    />
                  )}
                  {!viaggio.departure_return && !viaggio.arrival_company && (viaggioNumber++, null)}
                </React.Fragment>
              ));
            })()}
            {calculationService.calculateTravelHours && (
              <DetailRow 
                label="Totale Viaggio" 
                value={formatSafeHours(calculationService.calculateTravelHours(workEntry))}
                highlight={true}
                styles={styles}
              />
            )}
          </DetailSection>
        )}

        {/* Sezione Reperibilità (se presente) */}
        {(workEntry.isStandbyDay === 1 || (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0)) && (
          <DetailSection
            title="Reperibilità"
            icon="phone-in-talk"
            iconColor="#4CAF50"
            styles={styles}
          >
            {workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0 && (
              <>
                {workEntry.interventi.map((intervento, index) => (
                  <View key={index} style={styles.interventoContainer}>
                    <Text style={styles.interventoTitle}>Intervento {index + 1}</Text>
                    {intervento.departure_company && intervento.arrival_site && (
                      <DetailRow 
                        label="Viaggio A" 
                        value={`${intervento.departure_company} - ${intervento.arrival_site} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                        styles={styles}
                      />
                    )}
                    {intervento.work_start_1 && intervento.work_end_1 && (
                      <DetailRow 
                        label="Lavoro" 
                        value={`${intervento.work_start_1} - ${intervento.work_end_1} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                        styles={styles}
                      />
                    )}
                    {intervento.work_start_2 && intervento.work_end_2 && (
                      <DetailRow 
                        label="Lavoro 2" 
                        value={`${intervento.work_start_2} - ${intervento.work_end_2} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                        styles={styles}
                      />
                    )}
                    {intervento.departure_return && intervento.arrival_company && (
                      <DetailRow 
                        label="Viaggio R" 
                        value={`${intervento.departure_return} - ${intervento.arrival_company} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                        styles={styles}
                      />
                    )}
                  </View>
                ))}
                {/* Totale complessivo interventi - sempre visibile e in evidenza */}
                {(() => {
                  const numInterventi = workEntry.interventi ? workEntry.interventi.length : 0;
                  
                  // Calcola il totale di tutti gli interventi (lavoro + viaggi)
                  let totalAllInterventiHours = 0;
                  
                  if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
                    workEntry.interventi.forEach(intervento => {
                    // Ore lavoro
                    if (intervento.work_start_1 && intervento.work_end_1) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    if (intervento.work_start_2 && intervento.work_end_2) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    // Ore viaggio andata
                    if (intervento.departure_company && intervento.arrival_site) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    // Ore viaggio ritorno
                    if (intervento.departure_return && intervento.arrival_company) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                  });
                  }
                  
                  if (totalAllInterventiHours > 0) {
                    const label = numInterventi > 1 ? "Totale Tutti Interventi (lavoro+viaggi)" : "Totale Intervento (lavoro+viaggi)";
                    return (
                      <DetailRow 
                        label={label}
                        value={formatSafeHours(totalAllInterventiHours)}
                        highlight={true}
                        styles={styles}
                      />
                    );
                  }
                  return null;
                })()}
                {calculationService.calculateStandbyTravelHours && (
                  <DetailRow 
                    label="Totale Ore Viaggio Interventi" 
                    value={formatSafeHours(calculationService.calculateStandbyTravelHours(workEntry))}
                    highlight={true}
                    styles={styles}
                  />
                )}
              </>
            )}
          </DetailSection>
        )}

        {/* Riepilogo Guadagni dettagliato come nel form */}
        <DetailSection
          title="Riepilogo Guadagni"
          icon="calculator"
          iconColor="#4CAF50"
          styles={styles}
        >
          {/* Breakdown componenti principali */}
          {breakdown.ordinary?.total > 0 && (
            <DetailRow 
              label="Attività Ordinarie" 
              value={formatCurrency(breakdown.ordinary.total)}
              styles={styles}
            />
          )}
          
          {breakdown.standby && breakdown.standby.totalEarnings > 0 && (
            <>
              <DetailRow 
                label="Interventi Reperibilità" 
                value={formatCurrency((breakdown.standby.totalEarnings || 0) - (breakdown.standby.dailyIndemnity || 0))}
                styles={styles}
              />
              {breakdown.allowances?.standby > 0 && (
                <DetailRow 
                  label="Indennità Reperibilità" 
                  value={formatCurrency(breakdown.allowances.standby)}
                  styles={styles}
                />
              )}
            </>
          )}
          
          {!breakdown.standby?.totalEarnings && breakdown.allowances?.standby > 0 && (
            <DetailRow 
              label="Indennità Reperibilità" 
              value={formatCurrency(breakdown.allowances.standby)}
              styles={styles}
            />
          )}
          
          {breakdown.allowances?.travel > 0 && (
            <DetailRow 
              label="Indennità Trasferta" 
              value={formatCurrency(breakdown.allowances.travel)}
              styles={styles}
            />
          )}
          
          {/* Totale ore giornata completo */}
          {(() => {
            const ordinaryHours = breakdown.ordinary?.hours ? 
              Object.values(breakdown.ordinary.hours).reduce((sum, h) => sum + h, 0) : 0;
            const standbyHours = breakdown.standby ? 
              (Object.values(breakdown.standby.workHours || {}).reduce((sum, h) => sum + h, 0) +
               Object.values(breakdown.standby.travelHours || {}).reduce((sum, h) => sum + h, 0)) : 0;
            const totalDayHours = ordinaryHours + standbyHours;
            
            if (totalDayHours > 0) {
              return (
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>TOTALE ORE GIORNATA</Text>
                  <Text style={styles.hoursValue}>{formatSafeHours(totalDayHours)}</Text>
                </View>
              );
            }
            return null;
          })()}
          
          {/* Visualizzazione Completamento Giornata */}
          {item.completamento_giornata && item.completamento_giornata !== 'nessuno' && (
            <View style={[styles.completamentoContainer, {
              borderLeftColor: completamentoLabels[item.completamento_giornata]?.color || '#666'
            }]}>
              <MaterialCommunityIcons 
                name={completamentoLabels[item.completamento_giornata]?.icon || 'information-outline'} 
                size={16} 
                color={completamentoLabels[item.completamento_giornata]?.color || '#666'} 
              />
              <Text style={[styles.completamentoText, { 
                color: completamentoLabels[item.completamento_giornata]?.color || '#666' 
              }]}>
                {completamentoLabels[item.completamento_giornata]?.label || 'Completamento non riconosciuto'}
              </Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTALE GIORNATA</Text>
            <Text style={styles.totalValue}>{formatCurrency(breakdown.totalEarnings)}</Text>
          </View>
          
          {/* Rimborsi Pasti sotto il totale con dettaglio cash/buono */}
          {breakdown.allowances?.meal > 0 && (
            <>
              <View style={styles.mealSeparator} />
              <DetailRow 
                label="Rimborsi Pasti (non tassabili)" 
                value={formatCurrency(breakdown.allowances.meal)}
                styles={styles}
              />
              {/* Dettaglio composizione rimborsi pasti con logica uguale al form */}
              {(workEntry.mealLunchVoucher || workEntry.mealLunchCash > 0) && (
                <DetailRow 
                  label="- Pranzo" 
                  value={(() => {
                    // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
                    if (workEntry.mealLunchCash > 0) {
                      return `${formatCurrency(workEntry.mealLunchCash)} (contanti - valore specifico)`;
                    }
                    
                    // Altrimenti usa i valori dalle impostazioni (standard)
                    const voucher = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;
                    const cash = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;
                    
                    if (voucher > 0 && cash > 0) {
                      return `${formatCurrency(voucher)} (buono) + ${formatCurrency(cash)} (contanti)`;
                    } else if (voucher > 0) {
                      return `${formatCurrency(voucher)} (buono)`;
                    } else if (cash > 0) {
                      return `${formatCurrency(cash)} (contanti)`;
                    } else {
                      return "Valore non impostato";
                    }
                  })()}
                  isSubitem={true}
                  styles={styles}
                />
              )}
              
              {(workEntry.mealDinnerVoucher || workEntry.mealDinnerCash > 0) && (
                <DetailRow 
                  label="- Cena" 
                  value={(() => {
                    // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
                    if (workEntry.mealDinnerCash > 0) {
                      return `${formatCurrency(workEntry.mealDinnerCash)} (contanti - valore specifico)`;
                    }
                    
                    // Altrimenti usa i valori dalle impostazioni (standard)
                    const voucher = parseFloat(settings?.mealAllowances?.dinner?.voucherAmount) || 0;
                    const cash = parseFloat(settings?.mealAllowances?.dinner?.cashAmount) || 0;
                    
                    if (voucher > 0 && cash > 0) {
                      return `${formatCurrency(voucher)} (buono) + ${formatCurrency(cash)} (contanti)`;
                    } else if (voucher > 0) {
                      return `${formatCurrency(voucher)} (buono)`;
                    } else if (cash > 0) {
                      return `${formatCurrency(cash)} (contanti)`;
                    } else {
                      return "Valore non impostato";
                    }
                  })()}
                  isSubitem={true}
                  styles={styles}
                />
              )}
            </>
          )}
          
          {/* Nota informativa per giorni speciali */}
          {(breakdown.details?.isSaturday || breakdown.details?.isSunday || breakdown.details?.isHoliday) && (
            <Text style={styles.specialDayNote}>
              {breakdown.details?.isSunday ? 'Maggiorazione domenicale' : 
               breakdown.details?.isHoliday ? 'Maggiorazione festiva' : 
               'Maggiorazione sabato'} applicata secondo CCNL
            </Text>
          )}
        </DetailSection>

        {/* Breakdown avanzato degli orari */}
        <AdvancedHoursBreakdown breakdown={breakdown} settings={settings} styles={styles} />

        {/* Note se presenti */}
        {item.notes && (
          <DetailSection
            title="Note"
            icon="note-text"
            iconColor="#666"
            isLast={true}
            styles={styles}
          >
            <Text style={styles.notesText}>{normalizeCcnlAmountInNotes(item.notes, settings)}</Text>
          </DetailSection>
        )}
      </TouchableOpacity>
    );
  }, [settings, navigation, handleLongPress, calculationService, styles]);

  // Raggruppamento entries per mese - mostra solo il mese selezionato
  const sections = useMemo(() => {
    const selectedMonthLabel = formatMonthYear();
    const entriesForSelectedMonth = [];
    
    // Filtra solo gli entries del mese selezionato
    entries?.forEach(entry => {
      const entryDate = new Date(entry.date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;
      
      if (entryYear === selectedYear && entryMonth === selectedMonth) {
        entriesForSelectedMonth.push({
          ...entry,
          type: 'work_entry'
        });
      }
    });

    // Filtra anche i standby allowances per il mese selezionato
    standbyAllowances?.forEach(standby => {
      const standbyDate = new Date(standby.date);
      const standbyYear = standbyDate.getFullYear();
      const standbyMonthNum = standbyDate.getMonth() + 1;
      
      if (standbyYear === selectedYear && standbyMonthNum === selectedMonth) {
        const existingEntry = entriesForSelectedMonth.find(
          e => e.date === standby.date
        );
        
        if (!existingEntry) {
          entriesForSelectedMonth.push({
            id: `standby-${standby.date}`,
            date: standby.date,
            type: 'standby_only',
            standbyAllowance: standby.allowance,
            isStandbyDay: true
          });
        }
      }
    });

    // Restituisci sempre una sezione per il mese selezionato (anche se vuota)
    return [{
      title: selectedMonthLabel,
      data: entriesForSelectedMonth.sort((a, b) => new Date(b.date) - new Date(a.date))
    }];
  }, [entries, standbyAllowances, selectedYear, selectedMonth, formatMonthYear]);

  // Calcolo delle statistiche del mese per l'header sezione
  const getSectionStats = (data) => {
    const totalEarnings = data.reduce((sum, item) => {
      if (item.type === 'standby_only') {
        return sum + (item.standbyAllowance || 0);
      }
      const breakdown = breakdowns[item.id];
      return sum + (breakdown?.totalEarnings || 0);
    }, 0);

    const workDays = data.filter(item => item.type !== 'standby_only').length;
    const standbyDays = data.filter(item => 
      item.type === 'standby_only' || item.isStandbyDay === 1
    ).length;

    return { totalEarnings, workDays, standbyDays };
  };

  // Funzione per calcolare le statistiche dettagliate di una giornata
  const getDetailedStats = (workEntry) => {
    const workHours = calculationService.calculateWorkHours(workEntry);
    const travelHours = calculationService.calculateTravelHours(workEntry);
    const standbyWorkHours = calculationService.calculateStandbyWorkHours(workEntry);
    
    const totalHours = workHours + travelHours;
    const isFullDay = totalHours >= 8;
    const isOvertime = totalHours > 8;
    const overtimeHours = isOvertime ? totalHours - 8 : 0;
    
    return {
      workHours,
      travelHours,
      standbyWorkHours,
      totalHours,
      isFullDay,
      isOvertime,
      overtimeHours
    };
  };

  // Funzione per determinare l'efficienza della giornata
  const getDayEfficiency = (stats, breakdown) => {
    const hourlyRate = 16.41; // Tariffa oraria base
    const expectedEarningsForHours = stats.totalHours * hourlyRate;
    const actualEarnings = breakdown.totalEarnings;
    const efficiency = actualEarnings / expectedEarningsForHours;
    
    if (efficiency >= 1.5) return { level: 'excellent', color: '#4CAF50', label: 'Eccellente' };
    if (efficiency >= 1.2) return { level: 'good', color: '#2196F3', label: 'Buona' };
    if (efficiency >= 1.0) return { level: 'normal', color: '#FF9800', label: 'Normale' };
    return { level: 'low', color: '#F44336', label: 'Bassa' };
  };

  // Funzione per formattare gli orari con contesto
  const formatTimeWithContext = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const duration = (end - start) / (1000 * 60 * 60);
    
    let contextInfo = '';
    if (start.getHours() < 6) contextInfo = ' (molto presto)';
    else if (start.getHours() < 8) contextInfo = ' (presto)';
    else if (end.getHours() > 20) contextInfo = ' (tardivo)';
    else if (end.getHours() > 18) contextInfo = ' (serale)';
    
    return {
      start: startTime,
      end: endTime,
      duration: duration.toFixed(1),
      context: contextInfo
    };
  };

  const renderSectionHeader = ({ section }) => {
    const stats = getSectionStats(section.data);
    
    return (
      <View style={styles.modernSectionHeader}>
        {/* Freccia sinistra per mese precedente */}
        <TouchableOpacity 
          style={styles.monthNavButton} 
          onPress={goToPreviousMonth}
        >
          <MaterialCommunityIcons name="chevron-left" size={36} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Contenuto centrale con scritte centrate */}
        <View style={styles.sectionHeaderContentCentered}>
          <Text style={styles.modernSectionTitle}>{section.title}</Text>
          <View style={styles.sectionStats}>
            <Text style={styles.sectionStatsText}>
              {section.data.length} giorni • {formatCurrency(stats.totalEarnings)}
            </Text>
            {stats.standbyDays > 0 && (
              <Text style={styles.sectionStatsSubtext}>
                {stats.standbyDays} giorni reperibilità
              </Text>
            )}
          </View>
        </View>

        {/* Freccia destra per mese successivo */}
        <TouchableOpacity 
          style={styles.monthNavButton} 
          onPress={goToNextMonth}
        >
          <MaterialCommunityIcons name="chevron-right" size={36} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Calendario cliccabile */}
        <TouchableOpacity onPress={openCalendar} style={styles.calendarButton}>
          <MaterialCommunityIcons name="calendar-month" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Caricamento inserimenti...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>Impossibile caricare gli inserimenti</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshEntries}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header di navigazione mensile fisso - mantiene aspetto originale */}
      {sections.length > 0 && (
        <View style={styles.modernSectionHeader}>
          {/* Freccia sinistra per mese precedente */}
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToPreviousMonth}
          >
            <MaterialCommunityIcons name="chevron-left" size={36} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Contenuto centrale con scritte centrate */}
          <View style={styles.sectionHeaderContentCentered}>
            <Text style={styles.modernSectionTitle}>{sections[0].title}</Text>
            <View style={styles.sectionStats}>
              <Text style={styles.sectionStatsText}>
                {sections[0].data.length} giorni • {formatCurrency(getSectionStats(sections[0].data).totalEarnings)}
              </Text>
              {getSectionStats(sections[0].data).standbyDays > 0 && (
                <Text style={styles.sectionStatsSubtext}>
                  {getSectionStats(sections[0].data).standbyDays} giorni reperibilità
                </Text>
              )}
            </View>
          </View>

          {/* Freccia destra per mese successivo */}
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToNextMonth}
          >
            <MaterialCommunityIcons name="chevron-right" size={36} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Calendario cliccabile */}
          <TouchableOpacity onPress={openCalendar} style={styles.calendarButton}>
            <MaterialCommunityIcons name="calendar-month" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id?.toString() || `${item.date}-${item.type}`}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleManualRefresh} colors={['#4CAF50']} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-plus" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nessun inserimento trovato</Text>
            <Text style={styles.emptyText}>
              Tocca il pulsante "+" per aggiungere il tuo primo inserimento lavorativo
            </Text>
          </View>
        )}
      />

      {/* FAB moderno */}
      <TouchableOpacity
        style={styles.modernFab}
        onPress={() => navigation.navigate('TimeEntryForm')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
        <Text style={styles.fabText}>Nuovo Inserimento</Text>
      </TouchableOpacity>

      <ActionMenu
        visible={showActionMenu}
        entry={selectedEntry}
        onClose={() => setShowActionMenu(false)}
        onDeleted={handleManualRefresh}
        styles={styles}
      />

      {/* Modale Calendario */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCalendar}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Seleziona una data</Text>
              <TouchableOpacity onPress={closeCalendar} style={styles.calendarCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarLegend}>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.calendarLegendText}>Oggi</Text>
              </View>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarDot, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.calendarLegendText}>Con inserimenti</Text>
              </View>
            </View>
            
            <Calendar
              onDayPress={onDateSelect}
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#4CAF50',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4CAF50',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#4CAF50',
                selectedDotColor: '#ffffff',
                arrowColor: '#4CAF50',
                disabledArrowColor: '#d9e1e8',
                monthTextColor: '#2d4150',
                indicatorColor: '#4CAF50',
                textDayFontFamily: 'monospace',
                textMonthFontFamily: 'monospace',
                textDayHeaderFontFamily: 'monospace',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13
              }}
              firstDay={1}
              hideExtraDays={true}
              showWeekNumbers={false}
              disableMonthChange={false}
              hideDayNames={false}
              hideArrows={false}
              enableSwipeMonths={true}
              style={styles.calendar}
            />
            
            <TouchableOpacity onPress={closeCalendar} style={styles.calendarCancelButton}>
              <Text style={styles.calendarCancelButtonText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 0,
    marginBottom: -45, // Riduce ulteriormente lo spazio con la tab bar
  },

  // Header fisso fluttuante con aspetto card
  fixedFloatingHeader: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderRadius: 16,
    ...theme.colors.cardElevation,
  },
  headerContentCentered: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  fixedHeaderTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: theme.colors.primary,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  headerStats: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerStatsText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerStatsSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  listContentWithHeader: {
    paddingTop: 100, // Spazio per l'header card fisso (top: 10 + altezza card ~90)
    padding: 6,
    paddingBottom: 90, // Spazio per il FAB
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  list: {
    flex: 1,
    marginTop: -55, // Riduce ulteriormente lo spazio sopra la lista
  },
  listContent: {
    padding: 6,
    paddingTop: 105, // Spazio maggiore per abbassare di più le card sottostanti
    paddingBottom: 90, // Spazio per il FAB ripristinato
  },

  // Stili per le sezioni moderne - ora fissa e fluttuante
  modernSectionHeader: {
    position: 'absolute',
    top: 8,
    left: 4,
    right: 4,
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    ...theme.colors.cardElevation,
  },
  // Pulsanti di navigazione mese nella card - frecce grandi senza sfondo
  monthNavButton: {
    padding: 16,
    marginHorizontal: 8,
  },
  // Contenuto centrale della sezione header (centrato)
  sectionHeaderContentCentered: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  modernSectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: theme.colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionStats: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  sectionStatsText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionStatsSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Stili per le card moderne
  modernCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 3, // Ridotto da 6 a 3 per alzare la visuale
    padding: 16,
    ...theme.colors.cardElevation,
  },
  standbyOnlyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    backgroundColor: theme.colors.surface,
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateSection: {
    flex: 1,
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernDayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dayTypeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Stili per il breakdown guadagni
  earningsBreakdownContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginRight: 8,
  },
  earningsComponents: {
    marginTop: 12,
    width: '100%',
  },
  earningsComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  componentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  componentLabel: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  componentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // Stili per le sezioni dettagliate (come nel form)
  detailSection: {
    marginBottom: 16,
  },
  lastDetailSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  sectionContent: {
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    minHeight: 32,
  },
  subDetailRow: {
    paddingLeft: 16,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  subDetailLabel: {
    fontSize: 13,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  subDetailValue: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  highlightValue: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  calculationText: {
    fontSize: 11,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
    marginTop: 2,
    width: '100%',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: theme.colors.success,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.info,
  },
  standbyTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  standbyTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  standbyTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  standbyTotalEarnings: {
    fontSize: 13,
    color: theme.colors.success,
    fontStyle: 'italic',
  },
  specialDayNote: {
    fontSize: 12,
    color: theme.colors.success,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // Stili per breakdown avanzato
  breakdownSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.info,
    marginBottom: 8,
    marginTop: 4,
  },
  breakdownItemContainer: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
  },

  // Stili per interventi
  interventoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },
  interventoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: 8,
  },

  // Stili per reperibilità only
  standbyEarningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  standbyEarningsText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  standbyInfoContainer: {
    marginTop:  12,
  },

  // Stili per il body delle card
  modernCardBody: {
    gap: 16,
  },

  // Stili per le informazioni del sito
  siteInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  siteDetails: {
    marginLeft: 12,
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Stili per gli slot temporali
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlotContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.border,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeSlotLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timeSlotDuration: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  timeSlotTime: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 26,
  },

  // Stili per l'indicatore di efficienza
  efficiencyIndicator: {
    marginBottom: 12,
  },
  efficiencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  efficiencyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  efficiencyDetails: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },

  // Stili per le statistiche rapide
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  // Stili per i badge moderni
  modernBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  modernBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  modernBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modernBadgeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },

  // Stili per le note
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  notesText: {
    marginLeft: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // Stili per il FAB moderno
  modernFab: {
    position: 'absolute',
    bottom: 70, // Spostato più in alto
    right: 20,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    ...theme.colors.cardElevation,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Stili per il modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxWidth: 300,
    ...theme.colors.cardElevation,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },

  // Stili per le righe di dettaglio
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subDetailRow: {
    backgroundColor: theme.colors.surface,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  subDetailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '500',
  },
  highlightValue: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    marginLeft: 4,
  },

  // Stili per le sezioni di dettaglio
  detailSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    ...theme.colors.cardElevation,
  },
  lastDetailSection: {
    marginBottom: 90, // Spazio per il FAB
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  sectionContent: {
    paddingLeft: 26,
  },

  // Stili per le info di reperibilità
  interventoContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  interventoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.success,
    marginBottom: 4,
  },

  // Stili per le card moderne dettagliate
  detailedCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 8,
    padding: 16,
    ...theme.colors.cardElevation,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  dayTypeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  calculationErrorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  calculationErrorText: {
    color: '#FF5722',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  completamentoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  completamentoText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  totalEarnings: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  standbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  standbyBadgeText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  standbyDetails: {
    marginTop: 16,
  },
  standbyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  
  // Stile semplificato per card reperibilità come nella foto
  standbySimpleContent: {
    marginTop: 12,
    marginBottom: 8,
  },
  standbySimpleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  
  // Stile per separatore rimborsi pasti
  mealSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  
  // Stile per nota informativa interventi
  interventoNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    lineHeight: 16,
  },

  // Stili per il calendario
  calendarButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  calendarLegendText: {
    fontSize: 12,
    color: '#666',
  },
  calendar: {
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  calendarCancelButton: {
    marginTop: 20,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default TimeEntryScreen;
