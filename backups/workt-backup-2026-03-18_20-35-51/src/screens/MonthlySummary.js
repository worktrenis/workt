import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { createWorkEntryFromData, getSafeSettings, calculateItemBreakdown, formatSafeHours } from '../utils/earningsHelper';
import DatabaseService from '../services/DatabaseService';
import { PressableAnimated, FadeInCard, CardSkeleton } from '../components/AnimatedComponents';

const { width } = Dimensions.get('window');

// Componente moderno per le statistiche mensili
const ModernSummaryCard = ({ monthlySummary }) => (
  <FadeInCard style={styles.modernSummaryCard}>
    <View style={styles.summaryHeader}>
      <MaterialCommunityIcons name="chart-line" size={24} color="#2196F3" />
      <Text style={styles.modernSummaryTitle}>Riepilogo del mese</Text>
    </View>
    
    <View style={styles.summaryStats}>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Attività ordinarie</Text>
          <Text style={styles.statValue}>{formatCurrency(monthlySummary.totalOrdinary)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Reperibilità</Text>
          <Text style={styles.statValue}>{formatCurrency(monthlySummary.totalStandby)}</Text>
        </View>
      </View>
      
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Indennità trasferta</Text>
          <Text style={styles.statValue}>{formatCurrency(monthlySummary.totalAllowances)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rimborsi pasti</Text>
          <Text style={styles.statValue}>{formatCurrency(monthlySummary.totalMealAllowances)}</Text>
          <Text style={styles.statNote}>(non tassabili)</Text>
        </View>
      </View>
      
      <View style={styles.grandTotalContainer}>
        <Text style={styles.modernGrandTotalLabel}>Totale mensile</Text>
        <Text style={styles.modernGrandTotalValue}>{formatCurrency(monthlySummary.grandTotal)}</Text>
      </View>
    </View>
  </FadeInCard>
);

// Componente moderno per gli elementi della lista
const ModernEntryItem = ({ item, index }) => {
  const { date, breakdown, workEntry } = item;
  const day = date.getDate();
  const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
  
  // Determina il tipo di giornata
  let dayType = 'lavorativa';
  if (workEntry.isHoliday) {
    dayType = 'festivo';
  } else if (workEntry.completamentoGiornata !== 'nessuno') {
    dayType = workEntry.completamentoGiornata;
  }

  const TypeIcon = ({ type, size = 20, color = '#2196F3' }) => {
    const iconConfig = iconsConfig[type] || iconsConfig.lavorativa;
    const IconComponent = iconConfig.component;
    
    return (
      <IconComponent name={iconConfig.name} size={size} color={color} />
    );
  };

  return (
    <FadeInCard delay={index * 50} style={styles.modernEntryItem}>
      <PressableAnimated style={styles.entryPressable}>
        <View style={styles.modernDateHeader}>
          <View style={styles.modernDateBox}>
            <Text style={styles.modernDateDay}>{day}</Text>
            <Text style={styles.modernDateDayName}>{dayName}</Text>
          </View>
          
          <View style={styles.modernIconContainer}>
            <TypeIcon type={dayType} size={24} color="#333" />
            {workEntry.isStandbyDay && (
              <View style={[styles.modernBadge, { backgroundColor: '#E91E63' }]}>
                <MaterialCommunityIcons name="phone" size={16} color="white" />
              </View>
            )}
            {workEntry.travelAllowance && (
              <View style={[styles.modernBadge, { backgroundColor: '#4CAF50' }]}>
                <MaterialCommunityIcons name="car" size={16} color="white" />
              </View>
            )}
          </View>
          
          <View style={styles.modernDailyTotal}>
            <Text style={styles.modernTotalValue}>{formatCurrency(breakdown.total || 0)}</Text>
          </View>
        </View>
        
        <View style={styles.modernBreakdownContainer}>
          {/* Attività ordinarie */}
          {breakdown.ordinary && breakdown?.ordinary?.total > 0 && (
            <View style={styles.modernBreakdownSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="briefcase" size={16} color="#2196F3" />
                <Text style={styles.modernSectionLabel}>Attività ordinarie</Text>
                <Text style={styles.modernSectionValue}>{formatCurrency(breakdown?.ordinary?.total)}</Text>
              </View>
              
              {breakdown?.ordinary?.hours.lavoro_giornaliera + breakdown?.ordinary?.hours.viaggio_giornaliera > 0 && (
                <Text style={styles.modernBreakdownDetail}>
                  Giornaliero: {formatSafeHours(
                    breakdown?.ordinary?.hours.lavoro_giornaliera + 
                    breakdown?.ordinary?.hours.viaggio_giornaliera
                  )} ore
                </Text>
              )}
              
              {breakdown?.ordinary?.hours.lavoro_extra > 0 && (
                <Text style={styles.modernBreakdownDetail}>
                  Lavoro extra: {formatSafeHours(breakdown?.ordinary?.hours.lavoro_extra)} ore
                </Text>
              )}
              
              {breakdown?.ordinary?.hours.viaggio_extra > 0 && (
                <Text style={styles.modernBreakdownDetail}>
                  Viaggio extra: {formatSafeHours(breakdown?.ordinary?.hours.viaggio_extra)} ore
                </Text>
              )}
            </View>
          )}
          
          {/* Reperibilità */}
          {breakdown.standby && breakdown?.standby?.total > 0 && (
            <View style={styles.modernBreakdownSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="phone-in-talk" size={16} color="#9C27B0" />
                <Text style={styles.modernSectionLabel}>Reperibilità</Text>
                <Text style={styles.modernSectionValue}>{formatCurrency(breakdown?.standby?.total)}</Text>
              </View>
              
              {Object.values(breakdown?.standby?.workHours || {}).some(h => h > 0) && (
                <Text style={styles.modernBreakdownDetail}>
                  Interventi: {formatSafeHours(
                    Object.values(breakdown?.standby?.workHours).reduce((sum, h) => sum + h, 0)
                  )} ore
                </Text>
              )}
            </View>
          )}
          
          {/* Indennità */}
          {breakdown.allowances && breakdown?.allowances?.travel > 0 && (
            <View style={styles.modernBreakdownSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="briefcase-variant" size={16} color="#FF9800" />
                <Text style={styles.modernSectionLabel}>Indennità trasferta</Text>
                <Text style={styles.modernSectionValue}>{formatCurrency(breakdown?.allowances?.travel)}</Text>
              </View>
            </View>
          )}
          
          {/* Rimborsi pasti */}
          {breakdown.allowances && breakdown?.allowances?.meal > 0 && (
            <View style={styles.modernBreakdownSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="food" size={16} color="#4CAF50" />
                <Text style={styles.modernSectionLabel}>Rimborsi pasti</Text>
                <Text style={styles.modernSectionValue}>{formatCurrency(breakdown?.allowances?.meal)}</Text>
              </View>
              <Text style={styles.modernBreakdownDetail}>Non inclusi nel totale (non tassabili)</Text>
            </View>
          )}
        </View>
      </PressableAnimated>
    </FadeInCard>
  );
};

// Configurazione delle icone corrette per i tipi di giornata/completamento
const iconsConfig = {
  nessuno: { name: 'close-circle', component: MaterialCommunityIcons },
  ferie: { name: 'beach', component: MaterialCommunityIcons },
  permesso: { name: 'account-clock-outline', component: MaterialCommunityIcons },
  malattia: { name: 'emoticon-sick-outline', component: MaterialCommunityIcons },
  riposo: { name: 'bed', component: MaterialCommunityIcons },
  lavorativa: { name: 'briefcase-outline', component: MaterialCommunityIcons },
};

/**
 * Componente riepilogo guadagni mensili
 * Utilizza lo stesso format di dati e lo stesso servizio di calcolo del form di inserimento orario
 */
const MonthlySummary = ({ month, year }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();
  
  // Carica i dati dal database
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Carica tutti gli inserimenti orari del mese usando getWorkEntries
        const data = await DatabaseService.getWorkEntries(year, month);
        setEntries(data || []);
      } catch (error) {
        console.error('Errore nel caricamento dati mensili:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [month, year]);

  // Converte gli inserimenti orari in un formato compatibile con il calcolo
  const convertedEntries = useMemo(() => {
    if (!entries || !settings) return [];
    
    // Usa le funzioni helper per i calcoli, garantendo coerenza con il form
    const safeSettings = getSafeSettings(settings);
    
    return entries.map(entry => {
      // Usa la funzione helper per creare l'oggetto workEntry nello stesso formato del form
      const workEntry = createWorkEntryFromData(entry);
      
      // Calcola il breakdown dei guadagni usando la stessa funzione helper del form
      const breakdown = calculateItemBreakdown(entry, settings);
      
      return {
        id: entry.id,
        date: new Date(entry.date),
        breakdown,
        workEntry
      };
    });
  }, [entries, settings]);

  // Calcola il totale mensile
  const monthlySummary = useMemo(() => {
    if (!convertedEntries.length) return null;
    
    // Calcola i totali per categoria
    let totalOrdinary = 0;
    let totalStandby = 0;
    let totalAllowances = 0;
    let totalMealAllowances = 0;
    let grandTotal = 0;
    
    convertedEntries.forEach(entry => {
      const { breakdown } = entry;
      if (!breakdown) return;
      
      // Somma tutte le categorie
      if (breakdown.ordinary && breakdown?.ordinary?.earnings) {
        totalOrdinary += 
          (breakdown?.ordinary?.earnings.giornaliera || 0) + 
          (breakdown?.ordinary?.earnings.viaggio_extra || 0) +
          (breakdown?.ordinary?.earnings.lavoro_extra || 0);
      }
      
      if (breakdown.standby) {
        totalStandby += breakdown?.standby?.total || 0;
      }
      
      if (breakdown.allowances) {
        // Indennità trasferta
        totalAllowances += breakdown?.allowances?.travel || 0;
        
        // Rimborsi pasti (separati dal totale generale)
        totalMealAllowances += breakdown?.allowances?.meal || 0;
      }
      
      grandTotal += breakdown.total || 0;
    });
    
    return {
      totalOrdinary,
      totalStandby,
      totalAllowances,
      totalMealAllowances,
      grandTotal
    };
  }, [convertedEntries]);

  // Render un singolo inserimento orario usando il componente moderno
  const renderEntryItem = ({ item, index }) => (
    <ModernEntryItem item={item} index={index} />
  );

  // Se sta caricando, mostra l'indicatore moderno
  if (isLoading) {
    return (
      <View style={styles.modernLoadingContainer}>
        <FadeInCard style={styles.loadingCard}>
          <CardSkeleton />
          <Text style={styles.modernLoadingText}>Caricamento riepilogo mensile...</Text>
        </FadeInCard>
      </View>
    );
  }

  // Se non ci sono dati, mostra un messaggio moderno
  if (!convertedEntries.length) {
    return (
      <View style={styles.modernEmptyContainer}>
        <FadeInCard style={styles.emptyCard}>
          <MaterialCommunityIcons name="calendar-alert" size={64} color="#ccc" />
          <Text style={styles.modernEmptyText}>Nessun inserimento per questo mese</Text>
          <Text style={styles.emptySubtext}>Inizia ad aggiungere le tue ore di lavoro</Text>
        </FadeInCard>
      </View>
    );
  }

  return (
    <View style={styles.modernContainer}>
      {/* Intestazione mese moderna */}
      <FadeInCard style={styles.modernMonthHeader}>
        <View style={styles.monthHeaderContent}>
          <MaterialCommunityIcons name="calendar-month" size={28} color="white" />
          <Text style={styles.modernMonthTitle}>
            {new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </FadeInCard>
      
      {/* Riepilogo mensile moderno */}
      {monthlySummary && (
        <ModernSummaryCard monthlySummary={monthlySummary} />
      )}
      
      {/* Lista inserimenti del mese */}
      <FlatList
        data={convertedEntries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEntryItem}
        contentContainerStyle={styles.modernListContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Stili moderni
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    paddingTop: 8, // Aggiunge spazio sotto la status bar
  },
  modernMonthHeader: {
    margin: 16,
    marginTop: 8, // Riduce il margine superiore per evitare sovrapposizioni
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  monthHeaderContent: {
    backgroundColor: '#2196F3',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernMonthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textTransform: 'capitalize',
    marginLeft: 12,
  },
  modernSummaryCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modernSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  summaryStats: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  grandTotalContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  modernGrandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  modernGrandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  modernListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modernEntryItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  entryPressable: {
    padding: 20,
  },
  modernDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernDateBox: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  modernDateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modernDateDayName: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  modernIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modernDailyTotal: {
    alignItems: 'flex-end',
  },
  modernTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
  },
  modernBreakdownContainer: {
    paddingTop: 8,
  },
  modernBreakdownSection: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernSectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  modernSectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modernBreakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginLeft: 24,
  },
  modernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 300,
  },
  modernLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modernEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    padding: 20,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 300,
  },
  modernEmptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Stili legacy mantenuti per compatibilità
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  monthHeader: {
    backgroundColor: '#0066cc',
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'capitalize',
  },
  monthlySummary: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    marginLeft: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  listContainer: {
    paddingBottom: 20,
  },
  entryItem: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateBox: {
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateDayName: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  iconContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 8,
  },
  dailyTotal: {
    alignItems: 'flex-end',
  },
  dailyTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  dailyTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  breakdownContainer: {
    padding: 16,
  },
  breakdownSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default MonthlySummary;
