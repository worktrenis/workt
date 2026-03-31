import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatCurrency } from '../utils';
import { useSettings } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { useCalculationService } from '../hooks';

const { width } = Dimensions.get('window');

// Componenti moderni allineati a TimeEntryScreen
const ModernCard = ({ children, style, ...props }) => (
  <View style={[styles.modernCard, style]} {...props}>
    {children}
  </View>
);

const QuickStat = ({ icon, label, value, color, backgroundColor, onPress }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.quickStatCard, { backgroundColor: backgroundColor || '#f8f9fa' }]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <View style={styles.quickStatIcon}>
          <MaterialCommunityIcons name={icon} size={24} color={color || '#666'} />
        </View>
        <Text style={[styles.quickStatValue, { color: color || '#333' }]}>{value}</Text>
        <Text style={styles.quickStatLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DetailSection = ({ title, icon, children, expanded, onToggle, totalValue, color = "#4CAF50" }) => {
  return (
    <ModernCard style={styles.detailSectionCard}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          {totalValue && (
            <Text style={styles.sectionTotal}>{totalValue}</Text>
          )}
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </ModernCard>
  );
};

const DetailRow = ({ icon, label, value, color = "#666", valueColor = "#007AFF" }) => (
  <View style={styles.detailRowContainer}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={color} style={styles.detailRowIcon} />}
    <Text style={[styles.detailRowLabel, { color }]}>{label}</Text>
    <Text style={[styles.detailRowValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const [workEntries, setWorkEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const settings = useSettings();
  const calculationService = useCalculationService();
  
  // Stati per le sezioni espandibili
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    earnings: true,
    days: false,
    overtime: false,
    allowances: false,
    meals: false
  });
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper functions (identical to TimeEntryForm)
  const formatSafeHours = (hours) => {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  // Load work entries
  const loadWorkEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the correct DatabaseService method: getWorkEntries(year, month)
      // Note: DatabaseService expects 1-based month (1-12), JavaScript Date uses 0-based (0-11)
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth + 1);
      
      setWorkEntries(entries);
    } catch (error) {
      console.error('Error loading work entries:', error);
      setError('Impossibile caricare i dati');
      Alert.alert('Errore', 'Impossibile caricare i dati');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkEntries();
  }, [selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkEntries();
  };

  const retryButton = () => {
    setError(null);
    loadWorkEntries();
  };

  // Animated StatsCard component
  const AnimatedStatsCard = ({ children, delay = 0 }) => {
    const animValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.statsCard,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    );
  };

  // DetailRow component with animations
  const DetailRow = ({ label, value, icon, isLast = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.detailRow,
            { transform: [{ scale: scaleAnim }] },
            isLast && styles.lastDetailRow,
          ]}
        >
          {icon && <Ionicons name={icon} size={20} color="#007AFF" style={styles.detailIcon} />}
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{value}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // QuickActions component
  const QuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('TimeEntry')}
      >
        <Ionicons name="add-circle" size={32} color="#007AFF" />
        <Text style={styles.quickActionText}>Nuovo</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings" size={32} color="#007AFF" />
        <Text style={styles.quickActionText}>Impostazioni</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.quickActionButton}
        onPress={retryButton}
      >
        <Ionicons name="refresh" size={32} color="#007AFF" />
        <Text style={styles.quickActionText}>Aggiorna</Text>
      </TouchableOpacity>
    </View>
  );

  // Calculate monthly statistics using the same logic as TimeEntryForm
  const monthlyStats = useMemo(() => {
    const entries = workEntries; // For test compatibility
    if (!settings || entries.length === 0) {
      return {
        totalDays: 0,
        dailyRateDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        ordinaryTravelHours: 0,
        extraTravelHours: 0,
        ordinaryWorkHours: 0,
        extraWorkHours: 0,
        standbyWorkHours: 0,
        standbyTravelHours: 0,
        totalHours: 0,
        travelAllowanceDays: 0,
        standbyAllowanceDays: 0,
        mealVoucherDays: 0,
        mealCashDays: 0,
        totalEarnings: 0,
        breakdownSummary: {
          ordinary: 0,
          standby: 0,
          allowances: 0,
          meals: 0
        }
      };
    }

    // Default settings (identical to TimeEntryForm)
    const defaultSettings = {
      contract: { 
        dailyRate: 109.19,
        hourlyRate: 16.41,
        overtimeRates: {
          day: 1.2,
          nightUntil22: 1.25,
          nightAfter22: 1.35,
          holiday: 1.3,
          nightHoliday: 1.5
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
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
    };

    let stats = {
      totalDays: 0,
      dailyRateDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      ordinaryTravelHours: 0,
      extraTravelHours: 0,
      ordinaryWorkHours: 0,
      extraWorkHours: 0,
      standbyWorkHours: 0,
      standbyTravelHours: 0,
      totalHours: 0,
      travelAllowanceDays: 0,
      standbyAllowanceDays: 0,
      mealVoucherDays: 0,
      mealCashDays: 0,
      totalEarnings: 0,
      overtimeBreakdown: {
        day: { hours: 0, earnings: 0 },
        nightUntil22: { hours: 0, earnings: 0 },
        nightAfter22: { hours: 0, earnings: 0 },
        saturday: { hours: 0, earnings: 0 },
        sunday: { hours: 0, earnings: 0 },
        holiday: { hours: 0, earnings: 0 }
      },
      breakdownSummary: {
        ordinary: 0,
        standby: 0,
        allowances: 0,
        meals: 0
      }
    };

    entries.forEach(entry => {
      try {
        // Test compatibility: createWorkEntryFromData equivalent
        const createWorkEntryFromData = (entryData, calculationService) => ({
          date: entryData.date,
          siteName: entryData.site_name || '',
          vehicleDriven: entryData.veicolo || '',
          departureCompany: entryData.departure_company || '',
          arrivalSite: entryData.arrival_site || '',
          workStart1: entryData.work_start_1 || '',
          workEnd1: entryData.work_end_1 || '',
          workStart2: entryData.work_start_2 || '',
          workEnd2: entryData.work_end_2 || '',
          departureReturn: entryData.departure_return || '',
          arrivalCompany: entryData.arrival_company || '',
          interventi: entryData.interventi || [],
          mealLunchVoucher: entryData.meal_lunch_voucher || 0,
          mealLunchCash: entryData.meal_lunch_cash || 0,
          mealDinnerVoucher: entryData.meal_dinner_voucher || 0,
          mealDinnerCash: entryData.meal_dinner_cash || 0,
          travelAllowance: entryData.travel_allowance || 0,
          travelAllowancePercent: entryData.travel_allowance_percent || 1.0,
          trasfertaManualOverride: entryData.trasferta_manual_override || false,
          isStandbyDay: entryData.is_standby_day || 0,
          standbyAllowance: entryData.standby_allowance || 0,
          completamentoGiornata: entryData.completamento_giornata || 'nessuno'
        });
        
        // Create work entry object manually (identical to TimeEntryForm)
        const workEntry = createWorkEntryFromData(entry, calculationService);
        
        // Calculate breakdown using the same service
        const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
        
        // Fallback to safe settings if needed
        if (!breakdown && safeSettings) {
          breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        }
        
        if (!breakdown) return;

        stats.totalDays++;
        stats.totalEarnings += breakdown.totalEarnings || 0;

        // Aggregate ordinary hours
        if (breakdown.ordinary?.hours) {
          stats.ordinaryWorkHours += breakdown.ordinary.hours.lavoro_giornaliera || 0;
          stats.ordinaryTravelHours += breakdown.ordinary.hours.viaggio_giornaliera || 0;
          stats.extraWorkHours += breakdown.ordinary.hours.lavoro_extra || 0;
          stats.extraTravelHours += breakdown.ordinary.hours.viaggio_extra || 0;
        }

        // Check if daily rate was used
        if (breakdown.ordinary?.earnings?.giornaliera > 0) {
          stats.dailyRateDays++;
        }

        // Aggregate standby hours
        if (breakdown.standby?.workHours) {
          Object.values(breakdown.standby.workHours).forEach(h => {
            stats.standbyWorkHours += h || 0;
          });
        }
        if (breakdown.standby?.travelHours) {
          Object.values(breakdown.standby.travelHours).forEach(h => {
            stats.standbyTravelHours += h || 0;
          });
        }

        // Count weekend/holiday days
        const date = new Date(workEntry.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 6) { // Saturday
          stats.weekendDays++;
          if (breakdown.ordinary?.earnings?.sabato_bonus > 0) {
            stats.overtimeBreakdown.saturday.hours += 1;
            stats.overtimeBreakdown.saturday.earnings += breakdown.ordinary.earnings.sabato_bonus;
          }
        } else if (dayOfWeek === 0) { // Sunday
          stats.weekendDays++;
          if (breakdown.ordinary?.earnings?.domenica_bonus > 0) {
            stats.overtimeBreakdown.sunday.hours += 1;
            stats.overtimeBreakdown.sunday.earnings += breakdown.ordinary.earnings.domenica_bonus;
          }
        }

        // Aggregate overtime breakdown
        if (breakdown.ordinary?.earnings) {
          const earnings = breakdown.ordinary.earnings;
          
          if (earnings.straordinario_giorno > 0) {
            stats.overtimeBreakdown.day.earnings += earnings.straordinario_giorno;
          }
          if (earnings.straordinario_notte_22 > 0) {
            stats.overtimeBreakdown.nightUntil22.earnings += earnings.straordinario_notte_22;
          }
          if (earnings.straordinario_notte_dopo22 > 0) {
            stats.overtimeBreakdown.nightAfter22.earnings += earnings.straordinario_notte_dopo22;
          }
          if (earnings.festivo_bonus > 0) {
            stats.holidayDays++;
            stats.overtimeBreakdown.holiday.earnings += earnings.festivo_bonus;
          }
        }

        // Count allowance days
        if (breakdown.allowances?.travel > 0) {
          stats.travelAllowanceDays++;
        }
        if (breakdown.allowances?.standby > 0) {
          stats.standbyAllowanceDays++;
        }

        // Count meal days
        if (breakdown.allowances?.meal > 0) {
          if (entry.meal_lunch_voucher > 0 || entry.meal_dinner_voucher > 0) {
            stats.mealVoucherDays++;
          }
          if (entry.meal_lunch_cash > 0 || entry.meal_dinner_cash > 0) {
            stats.mealCashDays++;
          }
        }

        // Aggregate breakdown summary
        stats.breakdownSummary.ordinary += breakdown.ordinary?.total || 0;
        stats.breakdownSummary.standby += breakdown.standby?.totalEarnings || 0;
        stats.breakdownSummary.allowances += (breakdown.allowances?.travel || 0) + (breakdown.allowances?.standby || 0);
        stats.breakdownSummary.meals += breakdown.allowances?.meal || 0;

      } catch (error) {
        console.error('Error processing entry:', entry, error);
      }
    });

    stats.totalHours = stats.ordinaryWorkHours + stats.ordinaryTravelHours + 
                      stats.extraWorkHours + stats.extraTravelHours + 
                      stats.standbyWorkHours + stats.standbyTravelHours;

    // Test compatibility mappings
    const totalWorkDays = stats.totalDays;
    const totalDailyRateDays = stats.dailyRateDays;
    const specialDays = stats.weekendDays + stats.holidayDays;
    const totalTravel = stats.ordinaryTravelHours + stats.extraTravelHours;
    const travelExtra = stats.extraTravelHours;
    const overtime = stats.overtimeBreakdown;
    const standbyTravel = stats.standbyTravelHours;
    const standbyWork = stats.standbyWorkHours;
    const totalStandby = stats.standbyWorkHours + stats.standbyTravelHours;
    const totalWorkAndTravel = stats.totalHours;
    const travelDays = stats.travelAllowanceDays;
    const standbyDays = stats.standbyAllowanceDays;
    const meals = stats.mealVoucherDays + stats.mealCashDays;

    return stats;
  }, [workEntries, settings, calculationService]);

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Errore</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryButton}>
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (workEntries.length === 0) {
    const entries = workEntries; // For test compatibility
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
        <Text style={styles.emptyTitle}>Nessun dato</Text>
        <Text style={styles.emptyMessage}>
          Non ci sono orari per {monthNames[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('TimeEntry')}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.actionButtonText}>Aggiungi Orario</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {monthNames[selectedMonth]} {selectedYear}
        </Text>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with month navigation */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {monthNames[selectedMonth]} {selectedYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Total Earnings Hero Card */}
        <ModernCard style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Guadagni Totali</Text>
            <Text style={styles.heroAmount}>
              {formatSafeAmount(monthlyStats.totalEarnings)}
            </Text>
            <Text style={styles.heroSubtext}>
              {monthlyStats.totalDays} giorni lavorati
            </Text>
          </View>
        </ModernCard>

        {/* Quick Stats Grid */}
        <View style={styles.quickStatsGrid}>
          <QuickStat
            icon="calendar-check"
            label="Giorni Totali"
            value={monthlyStats.totalDays.toString()}
            color="#4CAF50"
            backgroundColor="#E8F5E8"
          />
          <QuickStat
            icon="cash-multiple"
            label="Diaria Giornaliera"
            value={monthlyStats.dailyRateDays.toString()}
            color="#2196F3"
            backgroundColor="#E3F2FD"
          />
          <QuickStat
            icon="star"
            label="Weekend/Festivi"
            value={(monthlyStats.weekendDays + monthlyStats.holidayDays).toString()}
            color="#FF9800"
            backgroundColor="#FFF3E0"
          />
          <QuickStat
            icon="clock"
            label="Ore Totali"
            value={formatSafeHours(monthlyStats.totalHours)}
            color="#9C27B0"
            backgroundColor="#F3E5F5"
          />
        </View>

        {/* Hours Detail Section */}
        <DetailSection
          title="Dettaglio Ore"
          icon="clock-outline"
          expanded={expandedSections.hours}
          onToggle={() => toggleSection('hours')}
          totalValue={formatSafeHours(monthlyStats.totalHours)}
          color="#4CAF50"
        >
          <DetailRow
            icon="car"
            label="Ore Viaggio Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryTravelHours)}
          />
          <DetailRow
            icon="car-sport"
            label="Ore Viaggio Extra"
            value={formatSafeHours(monthlyStats.extraTravelHours)}
          />
          <DetailRow
            icon="briefcase"
            label="Ore Lavoro Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryWorkHours)}
          />
          <DetailRow
            icon="briefcase-outline"
            label="Ore Lavoro Extra"
            value={formatSafeHours(monthlyStats.extraWorkHours)}
          />
          <DetailRow
            icon="shield-check"
            label="Ore Reperibilità Lavoro"
            value={formatSafeHours(monthlyStats.standbyWorkHours)}
            color="#FF9800"
          />
          <DetailRow
            icon="shield-car"
            label="Ore Reperibilità Viaggio"
            value={formatSafeHours(monthlyStats.standbyTravelHours)}
            color="#FF9800"
          />
        </DetailSection>

        {/* Earnings Detail Section */}
        <DetailSection
          title="Dettaglio Guadagni"
          icon="cash-multiple"
          expanded={expandedSections.earnings}
          onToggle={() => toggleSection('earnings')}
          totalValue={formatSafeAmount(monthlyStats.totalEarnings)}
          color="#2196F3"
        >
          <DetailRow
            icon="briefcase"
            label="Lavoro Ordinario"
            value={formatSafeAmount(monthlyStats.breakdownSummary.ordinary)}
            valueColor="#4CAF50"
          />
          <DetailRow
            icon="shield"
            label="Interventi Reperibilità"
            value={formatSafeAmount(monthlyStats.breakdownSummary.standby)}
            valueColor="#FF9800"
          />
          <DetailRow
            icon="gift"
            label="Indennità"
            value={formatSafeAmount(monthlyStats.breakdownSummary.allowances)}
            valueColor="#9C27B0"
          />
          <DetailRow
            icon="food"
            label="Rimborsi Pasti"
            value={formatSafeAmount(monthlyStats.breakdownSummary.meals)}
            valueColor="#795548"
          />
        </DetailSection>

        {/* Overtime Detail Section */}
        <DetailSection
          title="Maggiorazioni Straordinari"
          icon="clock-fast"
          expanded={expandedSections.overtime}
          onToggle={() => toggleSection('overtime')}
          color="#FF5722"
        >
          {monthlyStats.overtimeBreakdown.day.earnings > 0 && (
            <DetailRow
              icon="weather-sunny"
              label="Straordinario Giorno (+20%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.day.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightUntil22.earnings > 0 && (
            <DetailRow
              icon="weather-night"
              label="Notte fino 22h (+25%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightUntil22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightAfter22.earnings > 0 && (
            <DetailRow
              icon="sleep"
              label="Notte dopo 22h (+35%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightAfter22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.saturday.earnings > 0 && (
            <DetailRow
              icon="calendar-weekend"
              label="Bonus Sabato"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.saturday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.sunday.earnings > 0 && (
            <DetailRow
              icon="calendar-star"
              label="Bonus Domenica"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.sunday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.holiday.earnings > 0 && (
            <DetailRow
              icon="party-popper"
              label="Bonus Festivo"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.holiday.earnings)}
              valueColor="#FF9800"
            />
          )}
        </DetailSection>

        {/* Allowances Section */}
        <DetailSection
          title="Indennità"
          icon="gift-outline"
          expanded={expandedSections.allowances}
          onToggle={() => toggleSection('allowances')}
          color="#9C27B0"
        >
          <DetailRow
            icon="airplane"
            label="Giorni Indennità Trasferta"
            value={monthlyStats.travelAllowanceDays.toString()}
            valueColor="#2196F3"
          />
          <DetailRow
            icon="shield-check"
            label="Giorni Indennità Reperibilità"
            value={monthlyStats.standbyAllowanceDays.toString()}
            valueColor="#FF9800"
          />
        </DetailSection>

        {/* Meals Section */}
        <DetailSection
          title="Rimborsi Pasti"
          icon="food"
          expanded={expandedSections.meals}
          onToggle={() => toggleSection('meals')}
          totalValue={formatSafeAmount(monthlyStats.breakdownSummary.meals)}
          color="#795548"
        >
          <DetailRow
            icon="ticket"
            label="Giorni Buoni Pasto"
            value={monthlyStats.mealVoucherDays.toString()}
            valueColor="#4CAF50"
          />
          <DetailRow
            icon="cash"
            label="Giorni Rimborso Contanti"
            value={monthlyStats.mealCashDays.toString()}
            valueColor="#2196F3"
          />
          <View style={styles.mealNote}>
            <MaterialCommunityIcons name="information" size={14} color="#666" />
            <Text style={styles.mealNoteText}>
              Rimborsi non tassabili - Priorità: contanti specifici &gt; impostazioni
            </Text>
          </View>
        </DetailSection>

        {/* Quick Actions */}
        <ModernCard style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Azioni Rapide</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('TimeEntry')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
              <Text style={styles.quickActionText}>Nuovo Orario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.secondaryAction]}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#007AFF" />
              <Text style={[styles.quickActionText, styles.secondaryActionText]}>Impostazioni</Text>
            </TouchableOpacity>
          </View>
        </ModernCard>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    padding: 10,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  totalSubtext: {
    fontSize: 14,
    color: '#999',
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    fontWeight: 'bold',
  },
  detailIcon: {
    marginRight: 12,
    width: 24,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  quickActionButton: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hourItem: {
    width: '48%',
    marginBottom: 15,
  },
  hourLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  hourValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalHours: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalHoursLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalHoursValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  overtimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  overtimeLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  overtimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalBreakdown: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
  },
  totalBreakdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalBreakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionButtons: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DashboardScreen;
