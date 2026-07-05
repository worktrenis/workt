import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatCurrency, parseDateOnlyToLocalDate } from '../utils';
import { useSettings, useCalculationService } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';
import RealPayslipCalculator from '../services/RealPayslipCalculator';
import DatabaseService from '../services/DatabaseService';
import DataUpdateService from '../services/DataUpdateService';
import FixedDaysService from '../services/FixedDaysService';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { isItalianHoliday } from '../constants/holidays';
import { captureAndShare } from '../utils/screenshotUtils';

const { width } = Dimensions.get('window');

// Helper functions (identiche al TimeEntryForm)
const formatSafeAmount = (amount) => {
  if (amount === undefined || amount === null) return '0,00 €';
  return `${amount.toFixed(2).replace('.', ',')} €`;
};

const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

// Log di debug: attivi solo in sviluppo (in produzione restano silenziosi)
const DASHBOARD_DEBUG = __DEV__ === true;
const debugLog = (...args) => {
  if (DASHBOARD_DEBUG) console.log(...args);
};

const DashboardScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { settings, isLoading: settingsLoading, refreshSettings, updatePartialSettings } = useSettings();
  const calculationService = useCalculationService();

  // 🍽️ Rimborso pasti (cash standard) - per anno + residuo anno precedente
  const [allTimeMealCashStandard, setAllTimeMealCashStandard] = useState({
    total: 0,
    lunchVoucherCount: 0,
    dinnerVoucherCount: 0
  });
  const [yearMealCashStandard, setYearMealCashStandard] = useState({
    year: new Date().getFullYear(),
    total: 0,
    lunchVoucherCount: 0,
    dinnerVoucherCount: 0
  });
  const [prevYearMealCashStandard, setPrevYearMealCashStandard] = useState({
    year: new Date().getFullYear() - 1,
    total: 0,
    lunchVoucherCount: 0,
    dinnerVoucherCount: 0
  });
  const [mealReimbModalVisible, setMealReimbModalVisible] = useState(false);
  const [mealReimbInput, setMealReimbInput] = useState('');
  const [mealReimbEditIndex, setMealReimbEditIndex] = useState(null);
  const [mealReimbUsePrevYearKeys, setMealReimbUsePrevYearKeys] = useState(false);
  const [mealReimbModalYear, setMealReimbModalYear] = useState(null);

  const formatLocalYYYYMMDD = useCallback((date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Funzione per ottenere colori consistenti per le card giornaliere
  const getDayCardStyle = (dayType) => {
    const baseStyles = {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    };

    switch (dayType) {
      case 'work':
        return {
          backgroundColor: theme.name === 'dark' ? '#1a237e20' : '#e3f2fd',
          borderColor: theme.colors.primary,
        };
      case 'work-saturday':
        return {
          backgroundColor: theme.name === 'dark' ? '#8e24aa20' : '#f8bbd9',
          borderColor: '#8e24aa',
        };
      case 'work-sunday':
        return {
          backgroundColor: theme.name === 'dark' ? '#ff6f0020' : '#ffe0b2',
          borderColor: '#ff6f00',
        };
      case 'work-holiday':
        return {
          backgroundColor: theme.name === 'dark' ? '#7b1fa220' : '#e1bee7',
          borderColor: '#7b1fa2',
        };
      case 'work-standby':
        return {
          backgroundColor: theme.name === 'dark' ? '#ff980030' : '#fff3e0',
          borderColor: theme.colors.accent,
        };
      case 'standby-only':
      case 'standby':
        return {
          backgroundColor: theme.name === 'dark' ? '#ffc10720' : '#fffbf0',
          borderColor: theme.colors.warning,
        };
      case 'vacation':
        return {
          backgroundColor: theme.name === 'dark' ? '#4caf5020' : '#e8f5e8',
          borderColor: theme.colors.success,
        };
      case 'compensatory':
        return {
          backgroundColor: theme.name === 'dark' ? '#9c27b020' : '#f3e5f5',
          borderColor: theme.colors.overtime,
        };
      case 'fixed':
        return {
          backgroundColor: theme.name === 'dark' ? '#60798320' : '#eceff1',
          borderColor: theme.colors.standby,
        };
      default:
        return baseStyles;
    }
  };

  // 🔧 FUNZIONE HELPER PER OTTENERE TARIFFE REALI INDENNITÀ REPERIBILITÀ
  const getStandbyRatesFromSettings = (settings) => {
    // Valori CCNL per livello (override dei vecchi default)
    const contractKey = settings?.contract?.key;
    const { getStandbyRatesForContract } = require('../constants');
    const ccnlRates = getStandbyRatesForContract(contractKey);
    const IND_16H_FERIALE = ccnlRates.feriale16; // ex 4.22
    const IND_24H_FERIALE = ccnlRates.feriale24; // ex 7.03
    const IND_24H_FESTIVO = ccnlRates.festivo24; // ex 10.63
    
    if (!settings?.standbySettings?.enabled) {
      return {
        feriale: IND_24H_FERIALE,
        sabato: IND_24H_FERIALE,
        festivo: IND_24H_FESTIVO
      };
    }
    
  // Usa impostazioni personalizzate se disponibili
    const customFeriale16 = settings.standbySettings.customFeriale16;
    const customFeriale24 = settings.standbySettings.customFeriale24;
    const customFestivo = settings.standbySettings.customFestivo;
    const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  const saturdayMode = settings.standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
    
    // Calcola tariffa feriale
    let ferialeRate;
    if (allowanceType === '16h') {
      ferialeRate = customFeriale16 || IND_16H_FERIALE;
    } else {
      ferialeRate = customFeriale24 || IND_24H_FERIALE;
    }
    
    // Calcola tariffa festivo
    const festivoRate = customFestivo || IND_24H_FESTIVO;
    
    // Sabato: segue le regole feriali o festive a seconda dell'impostazione
  const sabatoRate = saturdayMode === 'festivo' ? festivoRate : (saturdayMode === 'feriale24' ? (customFeriale24 || IND_24H_FERIALE) : ferialeRate);
    
    return {
      feriale: ferialeRate,
      sabato: sabatoRate,
      festivo: festivoRate
    };
  };
  
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date()); // Data per navigazione mesi
  const lastVisitedRef = useRef(null);
  const selectedDateRef = useRef(new Date());
  const lastKnownNowRef = useRef({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const loadSeqRef = useRef(0);
  const screenshotRef = useRef(null);
  const [dataMonthKey, setDataMonthKey] = useState(null); // YYYY-MM del dataset attualmente caricato
  const [workEntries, setWorkEntries] = useState([]);
  const [monthlyAggregated, setMonthlyAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixedDaysData, setFixedDaysData] = useState(null);
  const [fixedDaysLoading, setFixedDaysLoading] = useState(true);
  const [completionData, setCompletionData] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(true);
  const [isDailyBreakdownExpanded, setIsDailyBreakdownExpanded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false); // Flag per evitare calcoli multipli
  const isCalculatingRef = useRef(false);
  const calcSeqRef = useRef(0);
  const pendingCalcRef = useRef(null);
  const [standbyRates, setStandbyRates] = useState({ feriale: 0, sabato: 0, festivo: 0 }); // Tariffe reperibilità (calcolate)

  // � Debug: monitora cambiamenti selectedDate
  useEffect(() => {
    debugLog('📅 Dashboard: selectedDate cambiato:', formatMonthYear(selectedDate));
  }, [selectedDate, formatMonthYear]);

  // �🔄 Ascolta parametri di navigazione per refresh automatico
  useEffect(() => {
    if (route?.params?.refreshCalculations) {
      debugLog('🔄 DASHBOARD - Refresh richiesto dalle impostazioni');
      // Reset del parametro per evitare loop infiniti
      navigation.setParams({ refreshCalculations: false });
      
      // Forza ricaricamento impostazioni e ricalcolo
      const refreshData = async () => {
        await refreshSettings();
        const target = lastVisitedRef.current ? new Date(lastVisitedRef.current) : selectedDate;
        await loadData(target);
      };
      
      refreshData();
    }
  }, [route?.params?.refreshCalculations, route?.params?.timestamp]);

  // 🔄 Listener per aggiornamenti automatici dei dati dal database
  useEffect(() => {
    const handleWorkEntriesUpdate = (action, data) => {
      debugLog('🔄 DASHBOARD - Ricevuto aggiornamento:', action, data);
      
      // Per ripristini completi del backup, ricarica sempre i dati
      if (action === 'BULK_RESTORE') {
        debugLog('🔄 DASHBOARD - Ripristino backup completo, ricarico tutti i dati...');
        loadData();
        return;
      }
      
      // Ricarica i dati solo se l'aggiornamento riguarda il mese corrente.
      // Robustezza: se year/month non arrivano, proviamo a ricavarli dalla data.
      let entryYear = data?.year;
      let entryMonth = data?.month;

      if ((!entryYear || !entryMonth) && data?.date) {
        const d = parseDateOnlyToLocalDate(data.date);
        if (d && !Number.isNaN(d.getTime())) {
          entryYear = d.getFullYear();
          entryMonth = d.getMonth() + 1;
        }
      }

      // Se non riusciamo a determinare il mese/anno, facciamo comunque refresh del mese selezionato
      if (!entryYear || !entryMonth) {
        debugLog('🔄 DASHBOARD - Update senza month/year determinabili, ricarico dati per mese selezionato');
        loadData();
        return;
      }
      const currentYear = selectedDate.getFullYear();
      const currentMonth = selectedDate.getMonth() + 1;
      
      if (entryYear === currentYear && entryMonth === currentMonth) {
        debugLog('🔄 DASHBOARD - Aggiornamento per mese corrente, ricarico dati...');
        loadData();
      } else {
        debugLog('⏭️ DASHBOARD - Update ricevuto per', entryMonth, '/', entryYear, 'ma la dashboard è su', currentMonth, '/', currentYear, '- nessun refresh');
      }
    };

    DataUpdateService.onWorkEntriesUpdated(handleWorkEntriesUpdate);

    return () => {
      DataUpdateService.removeAllListeners('workEntriesUpdated');
    };
  }, [selectedDate]);

  // Mantieni in un ref la selectedDate per uso in effetti senza dipendenze
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // 🔄 AGGIORNAMENTO AUTOMATICO: Ricarica dati quando la Dashboard torna in focus (una volta per focus)
  useFocusEffect(
    useCallback(() => {
      const currentSelected = selectedDateRef.current;
      const now = new Date();
      const prevNow = lastKnownNowRef.current;

      const didNowChange = prevNow.year !== now.getFullYear() || prevNow.month !== now.getMonth();
      const wasViewingPrevCurrent =
        currentSelected.getFullYear() === prevNow.year &&
        currentSelected.getMonth() === prevNow.month;

      // Caso anno/mese cambiato mentre l'app era aperta: se l'utente stava guardando il mese corrente precedente,
      // riallinea al nuovo mese corrente (evita "dashboard non aggiorna" a Capodanno).
      if (didNowChange && wasViewingPrevCurrent) {
        debugLog('🔄 DASHBOARD - Cambio mese/anno rilevato, riallineo al mese corrente:', formatMonthYear(now));
        lastVisitedRef.current = new Date(now);
        setSelectedDate(new Date(now));
      } else {
        const keepDate = lastVisitedRef.current ? new Date(lastVisitedRef.current) : currentSelected;
        debugLog('🔄 DASHBOARD - Screen focalizzato, ricarico dati per:', formatMonthYear(keepDate));

        // Se differisce, aggiorna selectedDate (triggererà il loadData nell'useEffect dedicato)
        if (
          keepDate.getMonth() !== currentSelected.getMonth() ||
          keepDate.getFullYear() !== currentSelected.getFullYear()
        ) {
          setSelectedDate(keepDate);
        } else {
          // Altrimenti ricarica direttamente i dati del mese mantenuto
          loadData(keepDate);
        }
      }

      lastKnownNowRef.current = { year: now.getFullYear(), month: now.getMonth() };
      // Aggiorna anche le impostazioni
      refreshSettings();
    }, [])
  );

  // 🔄 Ricarica dati quando cambia il mese selezionato
  useEffect(() => {
    debugLog('🔄 Dashboard: Ricarico dati per nuovo mese:', formatMonthYear(selectedDate));
    // Memorizza l'ultimo mese visitato per ripristino al ritorno
    lastVisitedRef.current = new Date(selectedDate);
    loadData();
  }, [selectedDate]);

  // 🔄 Effetto per ricaricamento automatico quando cambiano le impostazioni
  // ...rimosso useEffect che rilanciava il calcolo sulle impostazioni...

  // 🔍 DEBUG SETTINGS CARICAMENTO
  useEffect(() => {
    debugLog('🔍 DASHBOARD DEBUG - Settings loading status:', settingsLoading);
    debugLog('🔍 DASHBOARD DEBUG - Settings available:', !!settings);
    if (settings) {
      debugLog('🔍 DASHBOARD DEBUG - Settings mealAllowances:', JSON.stringify(settings.mealAllowances, null, 2));
      debugLog('🔍 DASHBOARD DEBUG - Settings travelAllowance:', JSON.stringify(settings.travelAllowance, null, 2));
      debugLog('🔍 DASHBOARD DEBUG - Settings travelHoursSetting:', settings.travelHoursSetting);
      debugLog('🔍 DASHBOARD DEBUG - Settings travelCompensationRate:', settings.travelCompensationRate);
    }
  }, [settingsLoading, settings]);

  // 📊 Memoizza analytics per evitare ricalcoli inutili
  const analytics = useMemo(() => monthlyAggregated?.analytics || {}, [monthlyAggregated?.analytics]);
  const monthlyEarnings = useMemo(() => monthlyAggregated?.totalEarnings || 0, [monthlyAggregated?.totalEarnings]);
  const monthlyHours = useMemo(() => monthlyAggregated?.totalHours || 0, [monthlyAggregated?.totalHours]);
  const breakdown = useMemo(() => monthlyAggregated?.breakdown || {}, [monthlyAggregated?.breakdown]);

  // Carica dati dal database
  const loadData = useCallback(async (dateOverride = null) => {
    try {
      const seq = ++loadSeqRef.current;
      const targetDate = dateOverride instanceof Date ? dateOverride : selectedDate;
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      let entries = await DatabaseService.getWorkEntries(year, month);
      // Ordina sempre per data crescente (dal giorno 1 in basso)
      entries = entries.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

      // Se nel frattempo è partita una nuova loadData, ignora questo risultato
      if (seq !== loadSeqRef.current) return;

      setDataMonthKey(`${year}-${String(month).padStart(2, '0')}`);
      setWorkEntries(entries);
      await loadFixedDaysData(targetDate);
      await loadCompletionData(targetDate);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadAllTimeMealCashStandard = useCallback(async () => {
    if (!settings) return;

    try {
      // Il conteggio deve seguire l'anno del mese selezionato in dashboard
      // (es. se nel 2026 apro dicembre 2025, devo vedere i totali 2025).
      const selectedYear = (selectedDate instanceof Date ? selectedDate : new Date()).getFullYear();
      const prevYear = selectedYear - 1;
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      const prevYearStart = `${prevYear}-01-01`;
      const prevYearEnd = `${prevYear}-12-31`;

      const [countsAllTime, countsYear, countsPrevYear] = await Promise.all([
        DatabaseService.getAllTimeMealCashStandardCounts(),
        DatabaseService.getMealCashStandardCountsByDateRange(yearStart, yearEnd),
        DatabaseService.getMealCashStandardCountsByDateRange(prevYearStart, prevYearEnd)
      ]);
      const lunchCash = Number(settings?.mealAllowances?.lunch?.cashAmount || 0);
      const dinnerCash = Number(settings?.mealAllowances?.dinner?.cashAmount || 0);
      const lunchCountAllTime = Number(countsAllTime?.lunchVoucherCount || 0);
      const dinnerCountAllTime = Number(countsAllTime?.dinnerVoucherCount || 0);
      const lunchCountYear = Number(countsYear?.lunchVoucherCount || 0);
      const dinnerCountYear = Number(countsYear?.dinnerVoucherCount || 0);
      const lunchCountPrevYear = Number(countsPrevYear?.lunchVoucherCount || 0);
      const dinnerCountPrevYear = Number(countsPrevYear?.dinnerVoucherCount || 0);

      const totalAllTime = lunchCountAllTime * lunchCash + dinnerCountAllTime * dinnerCash;
      const totalYear = lunchCountYear * lunchCash + dinnerCountYear * dinnerCash;
      const totalPrevYear = lunchCountPrevYear * lunchCash + dinnerCountPrevYear * dinnerCash;
      setAllTimeMealCashStandard({
        total: totalAllTime,
        lunchVoucherCount: lunchCountAllTime,
        dinnerVoucherCount: dinnerCountAllTime
      });
      setYearMealCashStandard({
        year: selectedYear,
        total: totalYear,
        lunchVoucherCount: lunchCountYear,
        dinnerVoucherCount: dinnerCountYear
      });
      setPrevYearMealCashStandard({
        year: prevYear,
        total: totalPrevYear,
        lunchVoucherCount: lunchCountPrevYear,
        dinnerVoucherCount: dinnerCountPrevYear
      });
    } catch (e) {
      console.warn('⚠️ loadAllTimeMealCashStandard failed:', e?.message);
      setAllTimeMealCashStandard({ total: 0, lunchVoucherCount: 0, dinnerVoucherCount: 0 });
      const y = (selectedDate instanceof Date ? selectedDate : new Date()).getFullYear();
      setYearMealCashStandard({ year: y, total: 0, lunchVoucherCount: 0, dinnerVoucherCount: 0 });
      setPrevYearMealCashStandard({ year: y - 1, total: 0, lunchVoucherCount: 0, dinnerVoucherCount: 0 });
    }
  }, [settings, selectedDate]);

  useEffect(() => {
    if (!settingsLoading && settings) {
      loadAllTimeMealCashStandard();
    }
  }, [settingsLoading, settings, loadAllTimeMealCashStandard]);

  const maybeRolloverMealCashStandardYear = useCallback(async () => {
    if (!settings || typeof updatePartialSettings !== 'function') return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastRolloverYear = Number(settings?.mealCashStandardLastRolloverYear || 0);

    // Prima inizializzazione: memorizza anno corrente senza azzerare nulla.
    if (!lastRolloverYear) {
      await updatePartialSettings({ mealCashStandardLastRolloverYear: currentYear });
      return;
    }

    // Già fatto per quest'anno
    if (lastRolloverYear === currentYear) return;

    const previousYear = currentYear - 1;
    const prevYearStart = `${previousYear}-01-01`;
    const prevYearEnd = `${previousYear}-12-31`;

    const countsPrevYear = await DatabaseService.getMealCashStandardCountsByDateRange(prevYearStart, prevYearEnd);
    const lunchCash = Number(settings?.mealAllowances?.lunch?.cashAmount || 0);
    const dinnerCash = Number(settings?.mealAllowances?.dinner?.cashAmount || 0);

    const prevYearMatured =
      (Number(countsPrevYear?.lunchVoucherCount || 0) * lunchCash) +
      (Number(countsPrevYear?.dinnerVoucherCount || 0) * dinnerCash);

    const currentList = Array.isArray(settings?.mealCashStandardReimbursements)
      ? settings.mealCashStandardReimbursements
      : [];
    const prevYearReimbursed = currentList.length > 0
      ? currentList.reduce((sum, v) => sum + (Number(v) || 0), 0)
      : Number(settings?.mealCashStandardReimbursed || 0);

    const prevYearResidualComputed = prevYearMatured - prevYearReimbursed;

    await updatePartialSettings({
      mealCashStandardPreviousYear: previousYear,
      mealCashStandardPreviousYearResidual: prevYearResidualComputed,
      mealCashStandardPreviousYearReimbursements: currentList,
      mealCashStandardPreviousYearReimbursed: prevYearReimbursed,
      mealCashStandardLastRolloverYear: currentYear,
      mealCashStandardReimbursements: [],
      mealCashStandardReimbursed: 0
    });
  }, [settings, updatePartialSettings]);

  useEffect(() => {
    if (!settingsLoading && settings) {
      maybeRolloverMealCashStandardYear();
    }
  }, [settingsLoading, settings, maybeRolloverMealCashStandardYear]);

  // Calcola aggregazione mensile solo quando sia workEntries che settings sono aggiornati
  useEffect(() => {
    const doAggregation = async () => {
      if (!settingsLoading && settings) {
        const ym = (typeof dataMonthKey === 'string' && dataMonthKey.includes('-')) ? dataMonthKey.split('-') : null;
        const dataYear = ym ? Number(ym[0]) : null;
        const dataMonth = ym ? Number(ym[1]) : null;
        // Chiama sempre calculateMonthlyAggregation, anche con array vuoto
        // La funzione sa gestire correttamente le indennità di reperibilità anche senza work entries
        await calculateMonthlyAggregation(workEntries, dataYear, dataMonth);

        // 🍽️ Aggiorna anche lo storico cash standard quando cambiano i dati
        await loadAllTimeMealCashStandard();
      }
    };
    
    doAggregation();
  }, [settingsLoading, settings, workEntries, loadAllTimeMealCashStandard, dataMonthKey]);

  // Ricarica i dati dei giorni fissi quando cambia il toggle di visualizzazione dei giorni speciali senza ore
  useEffect(() => {
    try {
      if (!settingsLoading && settings) {
        loadFixedDaysData();
      }
    } catch (e) {
      console.warn('⚠️ Reload fixed days on toggle change failed:', e?.message);
    }
  }, [settings?.showEffectiveEarningsOnSpecialNoWorkDays, loadFixedDaysData, settingsLoading]);

  // Carica dati dei giorni fissi (ferie, permessi, malattia, riposo, festivi)
  const loadFixedDaysData = useCallback(async (dateOverride = null) => {
    try {
      setFixedDaysLoading(true);
      const baseDate = dateOverride instanceof Date ? dateOverride : selectedDate;
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      
      // Carica dati giorni fissi usando FixedDaysService
      if (FixedDaysService && typeof FixedDaysService.getFixedDaysSummary === 'function') {
        // Passa le impostazioni correnti così da applicare tariffa giornaliera corretta e preferenze di visualizzazione
        const data = await FixedDaysService.getFixedDaysSummary(startDate, endDate, settings);
        setFixedDaysData(data);
      } else {
        console.warn('FixedDaysService.getFixedDaysSummary non disponibile, uso dati mock');
        // Dati mock se il servizio non è disponibile
        setFixedDaysData({
          totalDays: 0,
          totalEarnings: 0,
          vacation: { days: 0, earnings: 0 },
          sick: { days: 0, earnings: 0 },
          permit: { days: 0, earnings: 0 },
          compensatory: { days: 0, earnings: 0 },
          holiday: { days: 0, earnings: 0 }
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati giorni fissi:', error);
      setFixedDaysData({
        totalDays: 0,
        totalEarnings: 0,
        vacation: { days: 0, earnings: 0 },
        sick: { days: 0, earnings: 0 },
        permit: { days: 0, earnings: 0 },
        compensatory: { days: 0, earnings: 0 },
        holiday: { days: 0, earnings: 0 }
      });
    } finally {
      setFixedDaysLoading(false);
    }
  }, [selectedDate, settings]);

  // Carica dati dei giorni in completamento
  const loadCompletionData = useCallback(async (dateOverride = null) => {
    try {
      setCompletionLoading(true);
      const baseDate = dateOverride instanceof Date ? dateOverride : selectedDate;
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      
      // Carica dati completamento usando FixedDaysService
      if (FixedDaysService && typeof FixedDaysService.getCompletionStats === 'function') {
        // Passa la travelHoursSetting attuale tramite variabile globale (workaround per funzione asincrona)
        if (typeof global !== 'undefined') {
          global.dashboardTravelHoursSetting = settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS';
        }
        const data = await FixedDaysService.getCompletionStats(startDate, endDate);
        setCompletionData(data);
      } else {
        console.warn('FixedDaysService.getCompletionStats non disponibile');
        setCompletionData({
          totalEntries: 0,
          totalCompletionHours: 0,
          byType: {}
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati completamento:', error);
      setCompletionData({
        totalEntries: 0,
        totalCompletionHours: 0,
        byType: {}
      });
    } finally {
      setCompletionLoading(false);
    }
  }, [selectedDate]);

  // Calcola aggregazione mensile fedele al breakdown del TimeEntryForm
  const calculateMonthlyAggregation = async (entries, yearOverride = null, monthOverride = null) => {
    debugLog('🔧 DASHBOARD - INIZIO calculateMonthlyAggregation con', entries.length, 'entries');

    // Sequenza: ogni richiesta incrementa. I risultati vecchi non vengono applicati.
    const calcSeq = ++calcSeqRef.current;
    
    // Evita calcoli multipli simultanei
    if (isCalculatingRef.current) {
      debugLog('🔧 DASHBOARD DEBUG - Calcolo già in corso, metto in coda ultimo mese richiesto...');
      pendingCalcRef.current = { entries, yearOverride, monthOverride };
      return;
    }

    isCalculatingRef.current = true;
    setIsCalculating(true);
    
    try {
      // ⭐ CONTROLLO CRITICO: Non calcolare finché le impostazioni non sono caricate
      if (settingsLoading) {
        debugLog('🔧 DASHBOARD DEBUG - Settings ancora in caricamento, attesa...');
        return;
      }

    if (!settings) {
      debugLog(' DASHBOARD DEBUG - Settings non disponibili, skip...');
      return;
    }

    debugLog('🔧 DASHBOARD - Calcolo aggregazione per', entries.length, 'entries');
    debugLog('🔧 DASHBOARD DEBUG - Travel mode corrente:', settings?.travelHoursSetting);
    debugLog('🔧 DASHBOARD DEBUG - Meal settings correnti:', JSON.stringify(settings?.mealAllowances, null, 2));

    // Definizione di safeSettings (identica al TimeEntryForm)
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
      travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS', // Nuova logica di default
      multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false // Nuova opzione multi-turno
    };

    debugLog('🔧 DASHBOARD DEBUG - settings originali:', JSON.stringify(settings, null, 2));
    debugLog('🔧 DASHBOARD DEBUG - safeSettings travelHoursSetting:', safeSettings.travelHoursSetting);
    debugLog('🔧 DASHBOARD DEBUG - safeSettings pasti:', JSON.stringify(safeSettings.mealAllowances, null, 2));
    debugLog('🔧 DASHBOARD DEBUG - safeSettings trasferta:', JSON.stringify(safeSettings.travelAllowance, null, 2));

    // 🔧 CALCOLA TARIFFE REALI INDENNITÀ REPERIBILITÀ
    const calculatedStandbyRates = getStandbyRatesFromSettings(safeSettings);
    debugLog('🔧 DASHBOARD DEBUG - tariffe reperibilità:', calculatedStandbyRates);
    setStandbyRates(calculatedStandbyRates);

    // 🔄 CALCOLO AUTOMATICO INDENNITÀ DI REPERIBILITÀ DAL CALENDARIO
    const year = (typeof yearOverride === 'number' && Number.isFinite(yearOverride)) ? yearOverride : selectedDate.getFullYear();
    const month = (typeof monthOverride === 'number' && Number.isFinite(monthOverride)) ? monthOverride : (selectedDate.getMonth() + 1);
    const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(year, month, safeSettings);
    
    debugLog('🔧 DASHBOARD DEBUG - Indennità reperibilità dal calendario:', standbyAllowances);

    if (!entries || entries.length === 0) {
      // Calcola solo le indennità di reperibilità anche senza entries
      const standbyTotal = standbyAllowances.reduce((sum, allowance) => sum + allowance.allowance, 0);
      const standbyDays = standbyAllowances.length;
      
      setMonthlyAggregated({
        totalEarnings: standbyTotal,
        ordinary: { total: 0, hours: {}, days: 0 },
        standby: { totalEarnings: 0, workHours: {}, travelHours: {}, days: 0 },
        allowances: { 
          travel: 0, 
          meal: 0, 
          standby: standbyTotal,
          travelDays: 0,
          mealDays: 0,
          standbyDays: standbyDays,
          // Suddivisione indennità trasferta per percentuale
          travelByPercent: {
            '100': { amount: 0, days: 0 },
            '78': { amount: 0, days: 0 },
            '50': { amount: 0, days: 0 },
            'other': { amount: 0, days: 0 }
          }
        },
        meals: { 
          lunch: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          }, 
          dinner: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          // Suddivisione pasti per tipologia e importo
          byType: {
            vouchers: { total: 0, count: 0, days: 0 },
            cashStandard: { total: 0, count: 0, days: 0 },
            cashSpecific: { total: 0, count: 0, days: 0 }
          }
        },
        daysWorked: 0,
        totalHours: 0,
        // Nuove metriche avanzate
        analytics: {
          averageHoursPerDay: 0,
          averageEarningsPerDay: 0,
          averageEarningsPerHour: 0,
          overtimePercentage: 0,
          standbyWorkRatio: 0,
          weekendWorkDays: 0,
          saturdayWorkDays: 0,
          sundayWorkDays: 0,
          nightWorkHours: 0,
          eveningWorkHours: 0,
          holidayWorkDays: 0,
          travelHoursTotal: 0,
          maxDailyHours: 0,
          minDailyHours: 0,
          totalWorkingDays: 0,
          // Nuovi pattern migliorati
          consecutiveWorkDays: 0,
          daysWithOvertime: 0,
          standbyInterventions: 0,
          averageStartTime: null,
          workIntensityDistribution: {
            light: 0,    // < 6h
            normal: 0,   // 6-9h
            intense: 0,  // 9-12h
            extreme: 0   // > 12h
          },
          efficiency: {
            ordinaryVsStandby: 0,
            workVsTravel: 0,
            productivityScore: 0
          },
          breakdown: {
            ordinaryPercentage: 0,
            standbyPercentage: 0,
            allowancesPercentage: 0,
            overtimeHours: 0,
            extraTravelHours: 0,
            regularHours: 0
          }
        }
      });
      return;
    }

    debugLog('🔧 DASHBOARD DEBUG - settings originali:', JSON.stringify(settings, null, 2));
    debugLog('🔧 DASHBOARD DEBUG - safeSettings pasti:', JSON.stringify(safeSettings.mealAllowances, null, 2));
    debugLog('🔧 DASHBOARD DEBUG - safeSettings trasferta:', JSON.stringify(settings?.travelAllowance, null, 2));

    // Aggrega tutti i breakdown giornalieri
    let aggregated = {
      totalEarnings: 0,
      // Mappa per salvare i breakdown giornalieri (chiave: data, valore: breakdown)
      dailyBreakdowns: new Map(),
      ordinary: {
        total: 0,
        days: 0,
        hours: {
          lavoro_giornaliera: 0,
          viaggio_giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0
        },
        earnings: {
          giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0,
          sabato_bonus: 0,
          domenica_bonus: 0,
          festivo_bonus: 0
        },
        // Breakdown dettagliati per fasce
        breakdownDetails: {
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalTravelHours: 0,
          travelInRegular: 0,
          travelAsOvertime: 0,
          supplements: {
            total: 0,
            byTimeRange: {} // es: "20:00-22:00": { hours: X, amount: Y, rate: Z }
          },
          overtime: {
            total: 0,
            byPercentage: {} // es: "120%": { hours: X, amount: Y }, "135%": {...}
          },
          dailyRateBreakdown: {
            totalDays: 0,
            totalAmount: 0
          }
        }
      },
      standby: {
        totalEarnings: 0,
        days: 0,
        workHours: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelHours: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        workEarnings: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelEarnings: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        }
      },
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0,
        travelDays: 0,
        mealDays: 0,
        standbyDays: 0,
        // Suddivisione indennità reperibilità per tipo di giorno
        standbyByType: {
          feriale: { amount: 0, days: 0 },
          festivo: { amount: 0, days: 0 },
          sabato: { amount: 0, days: 0 }
        },
        // Suddivisione indennità trasferta per percentuale
        travelByPercent: {
          '100': { amount: 0, days: 0 },
          '78': { amount: 0, days: 0 },
          '50': { amount: 0, days: 0 },
          'other': { amount: 0, days: 0 }
        }
      },        meals: {
          lunch: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          dinner: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          // Suddivisione pasti per tipologia e importo
          byType: {
            vouchers: { total: 0, count: 0, days: 0 },
            cashStandard: { total: 0, count: 0, days: 0 },
            cashSpecific: { total: 0, count: 0, days: 0 }
          }
        },
      daysWorked: 0,
      totalHours: 0,
      // Nuove metriche avanzate
      analytics: {
        dailyHours: [],
        dailyEarnings: [],
        weekendWorkDays: 0,
        saturdayWorkDays: 0,
        sundayWorkDays: 0,
        holidayWorkDays: 0,
        nightWorkHours: 0,
        eveningWorkHours: 0,
        travelHoursTotal: 0,
        totalWorkingDays: 0,
        standbyInterventions: 0,
        maxDailyHours: 0,
        minDailyHours: Infinity,
        averageHoursPerDay: 0,
        averageEarningsPerDay: 0,
        averageEarningsPerHour: 0,
        overtimePercentage: 0,
        standbyWorkRatio: 0,
        // Breakdown per giorni speciali
        specialDaysBreakdown: {
          saturday: { hours: 0, earnings: 0 },
          sunday: { hours: 0, earnings: 0 },
          holiday: { hours: 0, earnings: 0 }
        },
        efficiency: {
          ordinaryVsStandby: 0,
          workVsTravel: 0,
          productivityScore: 0
        },
        breakdown: {
          ordinaryPercentage: 0,
          standbyPercentage: 0,
          allowancesPercentage: 0,
          overtimeHours: 0,
          regularHours: 0
        }
      }
    };

    // Itera su ogni entry e calcola il breakdown
    for (const entry of entries) {
      try {
        // Crea sempre workEntry per uso successivo
        const workEntry = createWorkEntryFromData(entry);
        
        // Calcola il breakdown per questa entry
        const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        
        if (!breakdown) continue;

        // 🔧 DEBUG: Log per verificare se usa sistema CCNL per giorni speciali
        if (breakdown.details?.ccnlCompliant) {
          debugLog(`[Dashboard] ✅ CCNL-compliant per ${entry.date}: €${breakdown.totalEarnings?.toFixed(2)}, Metodo: ${breakdown.details.hourlyRatesMethod}`);
          if (breakdown.details.hourlyRatesBreakdown) {
            breakdown.details.hourlyRatesBreakdown.forEach(item => {
              debugLog(`[Dashboard]   - ${item.name}: ${item.hours?.toFixed(1)}h × €${item.hourlyRate?.toFixed(2)} = €${item.earnings?.toFixed(2)} (+${item.totalBonus}%)`);
            });
          }
        }

        // Calcola le ore totali giornaliere una sola volta, per evitare errori
        const dailyHours = Object.values(breakdown.ordinary?.hours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);

        // Salva il breakdown giornaliero nella mappa
        aggregated.dailyBreakdowns.set(entry.date, {
          breakdown,
          workEntry,
          dailyHours,
          totalEarnings: breakdown.totalEarnings || 0
        });

        // Aggrega totale
        aggregated.totalEarnings += breakdown.totalEarnings || 0;
        
        // ✅ CORREZIONE: Non conteggiare i giorni fissi (ferie, malattia, ecc.) come giorni lavorati
        const isFixedDay = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(workEntry.dayType);
        
        if (!isFixedDay) {
          // Solo i giorni realmente lavorativi vengono conteggiati
          aggregated.daysWorked += 1;
          
          // Aggiungi alle analytics solo per giorni lavorativi
          aggregated.analytics.dailyHours.push(dailyHours);
          aggregated.analytics.dailyEarnings.push(breakdown.totalEarnings || 0);
          
          // Aggiorna min/max ore giornaliere (solo per giorni lavorativi)
          if (dailyHours > aggregated.analytics.maxDailyHours) {
            aggregated.analytics.maxDailyHours = dailyHours;
          }
          if (dailyHours < aggregated.analytics.minDailyHours && dailyHours > 0) {
            aggregated.analytics.minDailyHours = dailyHours;
          }
        } else {
          debugLog(`📅 Dashboard: Giorno fisso escluso dal conteggio lavorativo: ${entry.date} (${workEntry.dayType})`);
        }

        // Analizza tipo di giornata
        const entryDate = parseDateOnlyToLocalDate(entry.date);
        const dayOfWeek = entryDate.getDay();
        const isHoliday = isItalianHoliday(entryDate);
        
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Domenica o Sabato
          aggregated.analytics.weekendWorkDays += 1;
          
          if (dayOfWeek === 6) { // Sabato
            aggregated.analytics.saturdayWorkDays += 1;
            // Traccia ore e guadagni sabato con breakdown dettagliato
            aggregated.analytics.specialDaysBreakdown.saturday.hours += dailyHours;
            aggregated.analytics.specialDaysBreakdown.saturday.earnings += breakdown.totalEarnings || 0;
            
            // Salva il breakdown dettagliato per il calcolo corretto delle percentuali
            if (breakdown.details) {
              if (!aggregated.analytics.specialDaysBreakdown.saturday.detailedBreakdown) {
                aggregated.analytics.specialDaysBreakdown.saturday.detailedBreakdown = [];
              }
              aggregated.analytics.specialDaysBreakdown.saturday.detailedBreakdown.push(breakdown.details);
            }
          } else if (dayOfWeek === 0) { // Domenica
            aggregated.analytics.sundayWorkDays += 1;
            // Traccia ore e guadagni domenica con breakdown dettagliato
            aggregated.analytics.specialDaysBreakdown.sunday.hours += dailyHours;
            aggregated.analytics.specialDaysBreakdown.sunday.earnings += breakdown.totalEarnings || 0;
            
            // Salva il breakdown dettagliato per il calcolo corretto delle percentuali
            if (breakdown.details) {
              if (!aggregated.analytics.specialDaysBreakdown.sunday.detailedBreakdown) {
                aggregated.analytics.specialDaysBreakdown.sunday.detailedBreakdown = [];
              }
              aggregated.analytics.specialDaysBreakdown.sunday.detailedBreakdown.push(breakdown.details);
            }
          }
        }

        // Traccia giorni festivi lavorati
        if (isHoliday) {
          aggregated.analytics.holidayWorkDays += 1;
          // Traccia ore e guadagni festivi con breakdown dettagliato
          aggregated.analytics.specialDaysBreakdown.holiday.hours += dailyHours;
          aggregated.analytics.specialDaysBreakdown.holiday.earnings += breakdown.totalEarnings || 0;
          
          // Salva il breakdown dettagliato per il calcolo corretto delle percentuali
          if (breakdown.details) {
            if (!aggregated.analytics.specialDaysBreakdown.holiday.detailedBreakdown) {
              aggregated.analytics.specialDaysBreakdown.holiday.detailedBreakdown = [];
            }
            aggregated.analytics.specialDaysBreakdown.holiday.detailedBreakdown.push(breakdown.details);
          }
        }

        // Conta ore notturne - RIMOSSO: ora calcolato alla fine usando dati aggregati
        // (evitato doppio conteggio e problemi con dati non disponibili nel loop giornaliero)

        // Conta ore di viaggio totali
        const travelHours = Object.values(breakdown.ordinary?.hours || {}).filter((_, index) => 
          ['viaggio_giornaliera', 'viaggio_extra'].includes(Object.keys(breakdown.ordinary.hours)[index])
        ).reduce((a, b) => a + b, 0) + Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
        
        aggregated.analytics.travelHoursTotal += travelHours;

        // Conta interventi reperibilità (usa workEntry parsato invece di entry grezzo)
        if (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0) {
          // Conta solo gli interventi con dati validi (non vuoti)
          const validInterventi = workEntry.interventi.filter(intervento => {
            return intervento.work_start_1 && intervento.work_end_1; // Almeno orario inizio e fine del primo turno
          });
          if (validInterventi.length > 0) {
            debugLog(`🔧 DEBUG INTERVENTI - Giorno ${workEntry.date}: ${validInterventi.length} interventi validi su ${workEntry.interventi.length} totali`);
          }
          aggregated.analytics.standbyInterventions += validInterventi.length;
        }

        // Determina se è un giorno ordinario o non ordinario (usa variabili già dichiarate sopra)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // domenica o sabato
        const isOrdinaryDay = !isWeekend && !isHoliday; // Vero giorno ordinario (lun-ven, non festivo)

        // Aggrega ore ordinarie SOLO per giorni veramente ordinari
        if (breakdown.ordinary && isOrdinaryDay) {
          aggregated.ordinary.total += breakdown.ordinary.total || 0;
          
          // Conta giorni con attività ordinarie (solo giorni feriali, no weekend/festivi)
          if ((breakdown.ordinary.total || 0) > 0) {
            aggregated.ordinary.days += 1;
            debugLog(`🔧 DEBUG ORDINARIO - Giorno ${entry.date}: feriale, isStandbyDay=${workEntry.isStandbyDay}, ordinary.total=${breakdown.ordinary.total}, ordinaryDays ora=${aggregated.ordinary.days}`);
          }
          
          // Ore ordinarie
          if (breakdown.ordinary.hours) {
            Object.keys(breakdown.ordinary.hours).forEach(key => {
              if (aggregated.ordinary.hours[key] !== undefined) {
                aggregated.ordinary.hours[key] += breakdown.ordinary.hours[key] || 0;
              }
            });
          }

          // 🆕 ACCUMULA BREAKDOWN DETTAGLIATI
          if (breakdown.details) {
            const details = breakdown.details;
            
            // Accumula breakdown fasce orarie
            if (details.hourlyRatesBreakdown && details.hourlyRatesBreakdown.length > 0) {
              details.hourlyRatesBreakdown.forEach(fascia => {
                const key = fascia.name || fascia.timeRange || 'Sconosciuto';
                if (!aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key]) {
                  aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key] = {
                    hours: 0,
                    amount: 0,
                    rate: fascia.rate || 1,
                    hourlyRate: fascia.hourlyRate || 0
                  };
                }
                aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key].hours += fascia.hours || 0;
                aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key].amount += fascia.earnings || 0;
              });
            }

            // 🆕 ACCUMULA ANCHE DA DAILY_RATE_WITH_SUPPLEMENTS regularBreakdown
            if (details.dailyRateBreakdown && details.dailyRateBreakdown.regularBreakdown && details.dailyRateBreakdown.regularBreakdown.length > 0) {
              debugLog('🔧 DASHBOARD DEBUG - Trovato regularBreakdown:', details.dailyRateBreakdown.regularBreakdown);
              details.dailyRateBreakdown.regularBreakdown.forEach(period => {
                if (period.breakdown && period.breakdown.length > 0) {
                  period.breakdown.forEach(fascia => {
                    // Solo i supplementi (rate > 0), non le ore diurne
                    if (fascia.rate > 0 && fascia.hours > 0) {
                      // Usa fasce orarie standard invece del timeRange specifico del turno
                      let standardTimeRange;
                      let percentuale;
                      
                      if (fascia.type === 'Serale') {
                        standardTimeRange = '20:00-22:00 (Serale)';
                        percentuale = 25; // +25%
                      } else if (fascia.type === 'Notturno') {
                        standardTimeRange = '22:00-06:00 (Notturno)';
                        percentuale = 35; // +35%
                      } else {
                        // Fallback per altri tipi
                        standardTimeRange = `${fascia.type}`;
                        percentuale = Math.round(fascia.rate * 100);
                      }
                      
                      const key = standardTimeRange;
                      const hourlyRate = breakdown.details?.dailyRateBreakdown?.baseRate || settings?.contract?.hourlyRate || 16.15;
                      
                      if (!aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key]) {
                        aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key] = {
                          hours: 0,
                          amount: 0,
                          rate: 1 + fascia.rate, // Converte da 0.25 a 1.25
                          hourlyRate: hourlyRate,
                          percentage: percentuale
                        };
                      }
                      aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key].hours += fascia.hours || 0;
                      aggregated.ordinary.breakdownDetails.supplements.byTimeRange[key].amount += fascia.amount || 0;
                      
                      debugLog(`🔧 DASHBOARD DEBUG - Aggiunto supplemento ${key}: ${fascia.hours}h × €${fascia.amount.toFixed(2)} (+${percentuale}%)`);
                    }
                  });
                }
              });
            }

            // Accumula breakdown tariffa giornaliera
            if (details.dailyRateBreakdown) {
              const drb = details.dailyRateBreakdown;
              if (drb.dailyRate > 0) {
                aggregated.ordinary.breakdownDetails.dailyRateBreakdown.totalDays += 1;
                aggregated.ordinary.breakdownDetails.dailyRateBreakdown.totalAmount += drb.dailyRate;
              }
              
              // Supplementi dalle prime 8 ore
              if (drb.supplements > 0) {
                aggregated.ordinary.breakdownDetails.supplements.total += drb.supplements;
              }
              
              // Straordinari per percentuale
              if (drb.overtimeBreakdown && drb.overtimeBreakdown.length > 0) {
                debugLog(`🔧 DEBUG OVERTIME ENTRY ${entry.date} - overtimeBreakdown:`, JSON.stringify(drb.overtimeBreakdown, null, 2));
                
                drb.overtimeBreakdown.forEach(overtimePeriod => {
                  // Ogni overtimePeriod ha una proprietà breakdown con i dettagli
                  if (overtimePeriod.breakdown && overtimePeriod.breakdown.length > 0) {
                    overtimePeriod.breakdown.forEach(overtime => {
                      const rate = overtime.rate || 1;
                      const percentage = Math.round(rate * 100) + '%';
                      debugLog(`🔧 DEBUG OVERTIME FASCIA - Date: ${entry.date}, Rate: ${rate}, Percentage: ${percentage}, Hours: ${overtime.hours}, Earnings: ${overtime.amount}`);
                      
                      if (!aggregated.ordinary.breakdownDetails.overtime.byPercentage[percentage]) {
                        aggregated.ordinary.breakdownDetails.overtime.byPercentage[percentage] = {
                          hours: 0,
                          amount: 0,
                          rate: rate
                        };
                      }
                      aggregated.ordinary.breakdownDetails.overtime.byPercentage[percentage].hours += overtime.hours || 0;
                      aggregated.ordinary.breakdownDetails.overtime.byPercentage[percentage].amount += overtime.amount || 0;
                    });
                  }
                });
              }
              
              // Viaggi breakdown
              if (drb.travelBreakdown && drb.travelBreakdown.length > 0) {
                drb.travelBreakdown.forEach(travel => {
                  if (travel.type === 'regular') {
                    aggregated.ordinary.breakdownDetails.travelInRegular += travel.hours || 0;
                  } else if (travel.type === 'overtime') {
                    aggregated.ordinary.breakdownDetails.travelAsOvertime += travel.hours || 0;
                  }
                });
                aggregated.ordinary.breakdownDetails.totalTravelHours += drb.travelEarnings > 0 ? 
                  drb.travelBreakdown.reduce((sum, t) => sum + (t.hours || 0), 0) : 0;
              }
            }
          }

          // Calcola totali per breakdown (include giorni non ordinari negli straordinari)
          aggregated.ordinary.breakdownDetails.totalRegularHours = 
            (aggregated.ordinary.hours.lavoro_giornaliera || 0) + 
            (aggregated.ordinary.hours.viaggio_giornaliera || 0);
          
          // Straordinari = lavoro extra + viaggio extra + giorni non ordinari
          const specialDaysHours = (aggregated.analytics.specialDaysBreakdown.saturday.hours || 0) +
                                   (aggregated.analytics.specialDaysBreakdown.sunday.hours || 0) +
                                   (aggregated.analytics.specialDaysBreakdown.holiday.hours || 0);
          
          aggregated.ordinary.breakdownDetails.totalOvertimeHours = 
            (aggregated.ordinary.hours.lavoro_extra || 0) + 
            (aggregated.ordinary.hours.viaggio_extra || 0) + 
            specialDaysHours;
          aggregated.ordinary.breakdownDetails.overtime.total = 
            Object.values(aggregated.ordinary.breakdownDetails.overtime.byPercentage)
              .reduce((sum, item) => sum + item.amount, 0);

          // Guadagni ordinari
          if (breakdown.ordinary.earnings) {
            Object.keys(breakdown.ordinary.earnings).forEach(key => {
              if (aggregated.ordinary.earnings[key] !== undefined) {
                aggregated.ordinary.earnings[key] += breakdown.ordinary.earnings[key] || 0;
              }
            });
          }
        } else if (breakdown.ordinary && !isOrdinaryDay) {
          debugLog(`🔧 DEBUG ORDINARIO - Giorno ${entry.date}: ESCLUSO da attività ordinarie (weekend=${isWeekend}, festivo=${isHoliday}), ordinary.total=${breakdown.ordinary.total}`);
        }

        // Aggrega reperibilità
        if (breakdown.standby) {
          aggregated.standby.totalEarnings += breakdown.standby.totalEarnings || 0;
          
          // Conta giorni con attività in reperibilità
          if (workEntry.isStandbyDay && (breakdown.standby.totalEarnings || 0) > 0) {
            aggregated.standby.days += 1;
            debugLog(`🔧 DEBUG REPERIBILITA - Giorno ${entry.date}: isStandbyDay=${workEntry.isStandbyDay}, standby.totalEarnings=${breakdown.standby.totalEarnings}, standbyDays ora=${aggregated.standby.days}`);
          }
          
          // Ore lavoro reperibilità
          if (breakdown.standby?.workHours) {
            Object.keys(breakdown.standby.workHours).forEach(key => {
              if (aggregated.standby.workHours[key] !== undefined) {
                aggregated.standby.workHours[key] += breakdown.standby.workHours[key] || 0;
              }
            });
          }

          // Ore viaggio reperibilità
          if (breakdown.standby?.travelHours) {
            Object.keys(breakdown.standby.travelHours).forEach(key => {
              if (aggregated.standby.travelHours[key] !== undefined) {
                aggregated.standby.travelHours[key] += breakdown.standby.travelHours[key] || 0;
              }
            });
          }

          // Guadagni lavoro reperibilità
          if (breakdown.standby?.workEarnings) {
            Object.keys(breakdown.standby.workEarnings).forEach(key => {
              if (aggregated.standby.workEarnings[key] !== undefined) {
                aggregated.standby.workEarnings[key] += breakdown.standby.workEarnings[key] || 0;
              }
            });
          }

          // Guadagni viaggio reperibilità
          if (breakdown.standby.travelEarnings) {
            Object.keys(breakdown.standby.travelEarnings).forEach(key => {
              if (aggregated.standby.travelEarnings[key] !== undefined) {
                aggregated.standby.travelEarnings[key] += breakdown.standby.travelEarnings[key] || 0;
              }
            });
          }
        }

        // Aggrega indennità trasferta e suddivide per percentuale EFFETTIVA
        if (breakdown.allowances && breakdown.allowances.travel > 0) {
          const travelAmount = breakdown.allowances.travel;
          aggregated.allowances.travel += travelAmount;
          
          // Calcola la percentuale EFFETTIVA basandosi sull'importo calcolato
          // rispetto all'importo base della trasferta dalle impostazioni
          const dailyTravelAmount = safeSettings.travelAllowance?.dailyAmount || 15.0;
          const effectivePercent = dailyTravelAmount > 0 ? (travelAmount / dailyTravelAmount) : 1.0;
          
          let percentCategory = 'other';
          
          // Categorizza in base alla percentuale EFFETTIVA (con tolleranza per errori di arrotondamento)
          if (Math.abs(effectivePercent - 1.0) < 0.02) {
            percentCategory = '100';
          } else if (Math.abs(effectivePercent - 0.78) < 0.02) {
            percentCategory = '78';
          } else if (Math.abs(effectivePercent - 0.5) < 0.02) {
            percentCategory = '50';
          } else {
            // Per percentuali diverse, usa la percentuale approssimata
            const roundedPercent = Math.round(effectivePercent * 100);
            if (roundedPercent >= 85 && roundedPercent <= 95) {
              percentCategory = 'other'; // Es. 87.5% del calcolo proporzionale CCNL
            }
          }
          
          aggregated.allowances.travelByPercent[percentCategory].amount += travelAmount;
          aggregated.allowances.travelByPercent[percentCategory].days += 1;
          
          debugLog(`🔧 DEBUG TRASFERTA CATEGORIZZATA - Giorno ${entry.date}: ${travelAmount.toFixed(2)}€ su ${dailyTravelAmount}€ base = ${(effectivePercent * 100).toFixed(1)}% effettiva (categoria: ${percentCategory}, form: ${workEntry.travelAllowancePercent || 'n/a'})`);
        }
        
        // Aggrega altre indennità
        if (breakdown.allowances) {
          const standbyAmount = breakdown.allowances.standby || 0;
          aggregated.allowances.standby += standbyAmount;
          
          // Se c'è indennità reperibilità, categorizza per tipo di giorno
          if (standbyAmount > 0) {
            const entryDate = parseDateOnlyToLocalDate(entry.date);
            const isSaturday = entryDate.getDay() === 6;
            const isSunday = entryDate.getDay() === 0;
            const isHoliday = isItalianHoliday(entryDate);

            const saturdayAsRest = safeSettings?.standbySettings?.saturdayAsRest === true;
            const saturdayMode = safeSettings?.standbySettings?.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
            
            let dayType = 'feriale';

            // Festivo: domenica, festivo, oppure sabato configurato come riposo/festivo
            if (isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo')) {
              dayType = 'festivo';
            } else if (isSaturday) {
              // Sabato feriale / feriale24
              dayType = 'sabato';
            }
            
            aggregated.allowances.standbyByType[dayType].amount += standbyAmount;
            aggregated.allowances.standbyByType[dayType].days += 1;
            
            debugLog(`🔧 DEBUG STANDBY TIPO - Giorno ${entry.date} (${dayType}): €${standbyAmount.toFixed(2)}, totale ${dayType}: €${aggregated.allowances.standbyByType[dayType].amount.toFixed(2)} (${aggregated.allowances.standbyByType[dayType].days} giorni)`);
          }
        }
        
        // Conta giorni con indennità basandosi sui dati diretti
        if (workEntry.travelAllowance && (breakdown.allowances?.travel || 0) > 0) {
          aggregated.allowances.travelDays += 1;
          debugLog(`🔧 DEBUG TRASFERTA - Giorno ${entry.date}: travelAllowance=${workEntry.travelAllowance}, breakdown.travel=${breakdown.allowances?.travel}, travelDays ora=${aggregated.allowances.travelDays}`);
        }
        if (workEntry.isStandbyDay && (breakdown.allowances?.standby || 0) > 0) {
          aggregated.allowances.standbyDays += 1;
          debugLog(`🔧 DEBUG STANDBY - Giorno ${entry.date}: isStandbyDay=${workEntry.isStandbyDay}, breakdown.standby=${breakdown.allowances?.standby}, standbyDays ora=${aggregated.allowances.standbyDays}`);
        }

        // Aggrega pasti dettagliati e calcola totale rimborsi con suddivisione per tipologia
        let mealAllowanceTotal = 0;
        let hasMealToday = false;
        let todayVoucherCount = 0;
        let todayCashStandardCount = 0;
        let todayCashSpecificCount = 0;
        
        if (workEntry.mealLunchVoucher || workEntry.mealLunchCash) {
          debugLog('🔧 DASHBOARD DEBUG - Pranzo trovato:', {
            voucher: workEntry.mealLunchVoucher,
            cash: workEntry.mealLunchCash,
            safeSettingsVoucher: safeSettings.mealAllowances?.lunch?.voucherAmount,
            safeSettingsCash: safeSettings.mealAllowances?.lunch?.cashAmount
          });
          
          if (workEntry.mealLunchCash > 0) {
            // Pasto con importo specifico
            aggregated.meals.lunch.specific += workEntry.mealLunchCash;
            aggregated.meals.lunch.specificDays += 1;
            mealAllowanceTotal += workEntry.mealLunchCash;
            aggregated.meals.byType.cashSpecific.total += workEntry.mealLunchCash;
            todayCashSpecificCount += 1;
            hasMealToday = true;
          } else {
            // Pranzo senza cash specifico - aggiungiamo buono e/o contanti standard
            if (workEntry.mealLunchVoucher) {
              // Buono pasto
              const voucherAmount = safeSettings.mealAllowances?.lunch?.voucherAmount || 0;
              aggregated.meals.lunch.voucher += voucherAmount;
              aggregated.meals.lunch.voucherDays += 1;
              mealAllowanceTotal += voucherAmount;
              aggregated.meals.byType.vouchers.total += voucherAmount;
              todayVoucherCount += 1;
              hasMealToday = true;
              
              // Aggiungi anche i contanti standard insieme al buono
              const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
              aggregated.meals.lunch.cash += cashAmount;
              aggregated.meals.lunch.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
            } else {
              // Solo contanti standard (senza buono)
              const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
              aggregated.meals.lunch.cash += cashAmount;
              aggregated.meals.lunch.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
              hasMealToday = true;
            }
          }
        }

        if (workEntry.mealDinnerVoucher || workEntry.mealDinnerCash) {
          if (workEntry.mealDinnerCash > 0) {
            // Pasto con importo specifico
            aggregated.meals.dinner.specific += workEntry.mealDinnerCash;
            aggregated.meals.dinner.specificDays += 1;
            mealAllowanceTotal += workEntry.mealDinnerCash;
            aggregated.meals.byType.cashSpecific.total += workEntry.mealDinnerCash;
            todayCashSpecificCount += 1;
            hasMealToday = true;
          } else {
            // Cena senza cash specifico - aggiungiamo buono e/o contanti standard
            if (workEntry.mealDinnerVoucher) {
              // Buono pasto
              const voucherAmount = safeSettings.mealAllowances?.dinner?.voucherAmount || 0;
              aggregated.meals.dinner.voucher += voucherAmount;
              aggregated.meals.dinner.voucherDays += 1;
              mealAllowanceTotal += voucherAmount;
              aggregated.meals.byType.vouchers.total += voucherAmount;
              todayVoucherCount += 1;
              hasMealToday = true;
              
              // Aggiungi anche i contanti standard insieme al buono
              const cashAmount = safeSettings.mealAllowances?.dinner?.cashAmount || 0;
              aggregated.meals.dinner.cash += cashAmount;
              aggregated.meals.dinner.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
            } else {
              // Solo contanti standard (senza buono)
              const cashAmount = safeSettings.mealAllowances?.dinner?.cashAmount || 0;
              aggregated.meals.dinner.cash += cashAmount;
              aggregated.meals.dinner.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
              hasMealToday = true;
            }
          }
        }

        // Conta giorni e pasti per tipologia
        if (hasMealToday) {
          if (todayVoucherCount > 0) {
            aggregated.meals.byType.vouchers.count += todayVoucherCount;
            if (aggregated.meals.byType.vouchers.days === undefined) aggregated.meals.byType.vouchers.days = 0;
            if (todayVoucherCount > 0) aggregated.meals.byType.vouchers.days += 1;
          }
          if (todayCashStandardCount > 0) {
            aggregated.meals.byType.cashStandard.count += todayCashStandardCount;
            if (aggregated.meals.byType.cashStandard.days === undefined) aggregated.meals.byType.cashStandard.days = 0;
            if (todayCashStandardCount > 0) aggregated.meals.byType.cashStandard.days += 1;
          }
          if (todayCashSpecificCount > 0) {
            aggregated.meals.byType.cashSpecific.count += todayCashSpecificCount;
            if (aggregated.meals.byType.cashSpecific.days === undefined) aggregated.meals.byType.cashSpecific.days = 0;
            if (todayCashSpecificCount > 0) aggregated.meals.byType.cashSpecific.days += 1;
          }
        }

        // Aggrega il totale rimborsi pasti
        aggregated.allowances.meal += mealAllowanceTotal;
        if (mealAllowanceTotal > 0) {
          aggregated.allowances.mealDays += 1;
          debugLog(`🔧 DEBUG PASTI - Giorno ${entry.date}: mealAllowanceTotal=${mealAllowanceTotal}, mealDays ora=${aggregated.allowances.mealDays}`);
        }
        debugLog('🔧 DASHBOARD DEBUG - mealAllowanceTotal aggiunto:', mealAllowanceTotal);

        // Calcola ore totali
        aggregated.totalHours += dailyHours;

      } catch (error) {
        console.error('Errore nel calcolo breakdown per entry:', entry.id, error);
      }
    }

    debugLog('🔧 DASHBOARD DEBUG - Totali finali aggregated.allowances:', aggregated.allowances);
    debugLog('🔧 DASHBOARD DEBUG - Totali finali aggregated.meals:', aggregated.meals);

    // Calcola metriche analytics finali
    if (aggregated.daysWorked > 0) {
      // Medie
      aggregated.analytics.averageHoursPerDay = aggregated.totalHours / aggregated.daysWorked;
      aggregated.analytics.averageEarningsPerDay = aggregated.totalEarnings / aggregated.daysWorked;
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.averageEarningsPerHour = aggregated.totalEarnings / aggregated.totalHours;
      }

      // Calcola ore straordinarie vs regolari (CORRETTO + GIORNI NON ORDINARI)
      // Straordinari = ore di lavoro oltre l'orario normale + giorni non ordinari
      const regularOvertimeHours = aggregated.ordinary.hours.lavoro_extra || 0;
      const standbyOvertimeHours = Object.values(aggregated.standby.workHours || {}).reduce((a, b) => a + b, 0);
      const specialDaysOvertimeHours = (aggregated.analytics.specialDaysBreakdown.saturday.hours || 0) +
                                       (aggregated.analytics.specialDaysBreakdown.sunday.hours || 0) +
                                       (aggregated.analytics.specialDaysBreakdown.holiday.hours || 0);
      
      const actualOvertimeHours = regularOvertimeHours + standbyOvertimeHours + specialDaysOvertimeHours;
      
      // Ore di viaggio extra (separate dagli straordinari) - Include viaggio ordinario + reperibilità
      const ordinaryExtraTravelHours = aggregated.ordinary.hours.viaggio_extra || 0;
      const standbyTotalTravelHours = Object.values(aggregated.standby.travelHours || {}).reduce((a, b) => a + b, 0);
      const extraTravelHours = ordinaryExtraTravelHours + standbyTotalTravelHours;
      
      // Ore regolari = totale - straordinari veri - viaggio extra
      const regularHours = aggregated.totalHours - actualOvertimeHours - extraTravelHours;
      
      aggregated.analytics.breakdown.overtimeHours = actualOvertimeHours;
      aggregated.analytics.breakdown.extraTravelHours = extraTravelHours;
      aggregated.analytics.breakdown.regularHours = regularHours;
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.overtimePercentage = (actualOvertimeHours / aggregated.totalHours) * 100;
      }

      // Rapporto reperibilità vs ordinario
      if (aggregated.totalEarnings > 0) {
        aggregated.analytics.standbyWorkRatio = (aggregated.standby.totalEarnings / aggregated.totalEarnings) * 100;
        
        // CORREZIONE: Usa la somma corretta dei componenti per calcolare le percentuali
        // totalEarnings = ordinary + travel + standby.totalEarnings (che già include standby allowance)
        // Quindi per le percentuali dobbiamo usare: ordinary + standby.totalEarnings + travel + meal
        const totalEarningsForPercentages = aggregated.ordinary.total + 
                                           aggregated.standby.totalEarnings + 
                                           (aggregated.allowances.travel || 0) + 
                                           (aggregated.allowances.meal || 0);
        
        // Percentuali di breakdown earnings
        aggregated.analytics.breakdown.ordinaryPercentage = (aggregated.ordinary.total / totalEarningsForPercentages) * 100;
        aggregated.analytics.breakdown.standbyPercentage = (aggregated.standby.totalEarnings / totalEarningsForPercentages) * 100;
        aggregated.analytics.breakdown.allowancesPercentage = ((aggregated.allowances.travel || 0) / totalEarningsForPercentages) * 100;
      }

      // Efficienza lavoro vs viaggio
      const totalWorkHours = Object.values(aggregated.ordinary.hours).filter((_, index) => 
        ['lavoro_giornaliera', 'lavoro_extra'].includes(Object.keys(aggregated.ordinary.hours)[index])
      ).reduce((a, b) => a + b, 0) + Object.values(aggregated.standby.workHours).reduce((a, b) => a + b, 0);
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.efficiency.workVsTravel = (totalWorkHours / aggregated.totalHours) * 100;
      }

      // Score di produttività (combinazione di vari fattori)
      const baseScore = 50;
      const efficiencyBonus = (aggregated.analytics.efficiency.workVsTravel - 70) * 0.5; // Bonus se lavoro > 70%
      const overtimePenalty = aggregated.analytics.overtimePercentage > 20 ? -10 : 0; // Penalità se troppi straordinari
      const standbyBonus = aggregated.analytics.standbyWorkRatio > 0 ? 10 : 0; // Bonus per reperibilità
      
      aggregated.analytics.efficiency.productivityScore = Math.max(0, Math.min(100, 
        baseScore + efficiencyBonus + overtimePenalty + standbyBonus
      ));

      // Fix per minDailyHours se nessun dato valido
      if (aggregated.analytics.minDailyHours === Infinity) {
        aggregated.analytics.minDailyHours = 0;
      }

      // CORREZIONE FINALE: Calcola ore notturne dai dati aggregati corretti
      // Reset delle ore notturne per calcolo corretto
      aggregated.analytics.nightWorkHours = 0;
      aggregated.analytics.eveningWorkHours = 0;
      
      // 1. Ore notturne da reperibilità (dati aggregati standby)
      const standbyNightTotal = (aggregated.standby.workHours?.night || 0) + 
                               (aggregated.standby.workHours?.saturday_night || 0) + 
                               (aggregated.standby.workHours?.night_holiday || 0) +
                               (aggregated.standby.travelHours?.night || 0) + 
                               (aggregated.standby.travelHours?.saturday_night || 0) + 
                               (aggregated.standby.travelHours?.night_holiday || 0);
      
      // 2. Ore notturne da supplementi ordinari (dati aggregati)
      let ordinaryNightTotal = 0;
      if (aggregated.ordinary?.breakdownDetails?.supplements?.byTimeRange) {
        Object.entries(aggregated.ordinary.breakdownDetails.supplements.byTimeRange).forEach(([timeRange, data]) => {
          // Identifica solo la fascia notturna reale (22:00-06:00),
          // evitando di includere la fascia serale/fino alle 22h.
          const normalizedTimeRange = (timeRange || '').toLowerCase();
          const hasEveningMarker = normalizedTimeRange.includes('20:00-22:00') ||
                                  normalizedTimeRange.includes('fino alle 22') ||
                                  normalizedTimeRange.includes('serale');
          const hasNightMarker = normalizedTimeRange.includes('22:00-06:00') ||
                                normalizedTimeRange.includes('22:00') ||
                                normalizedTimeRange.includes('dopo le 22') ||
                                normalizedTimeRange.includes('oltre le 22') ||
                                normalizedTimeRange.includes('notturno') ||
                                normalizedTimeRange.includes('night');
          const isNightTimeRange = hasNightMarker && !hasEveningMarker;
          
          if (isNightTimeRange && (data.hours || 0) > 0) {
            ordinaryNightTotal += data.hours || 0;
          }
        });
      }
      
      // Totale ore notturne = standby + ordinarie
      aggregated.analytics.nightWorkHours = standbyNightTotal + ordinaryNightTotal;
      
      debugLog(`🔧 NIGHT CALCULATION FINAL - Standby: ${standbyNightTotal}h, Ordinary: ${ordinaryNightTotal}h, Total: ${aggregated.analytics.nightWorkHours}h`);

      // 🔧 Calcolo ore serali finali usando dati aggregati (20:00-22:00)
      const standbyEveningTotal = (aggregated.standby?.workHours?.evening || 0) + (aggregated.standby?.travelHours?.evening || 0);
      
      let ordinaryEveningTotal = 0;
      if (aggregated.ordinary?.breakdownDetails?.supplements?.byTimeRange) {
        Object.entries(aggregated.ordinary.breakdownDetails.supplements.byTimeRange).forEach(([timeRange, data]) => {
          const isEveningTimeRange = timeRange.includes('20:00-22:00') || 
                                   timeRange.toLowerCase().includes('serale') ||
                                   (timeRange.includes('20:00') && timeRange.includes('22:00'));
          
          if (isEveningTimeRange && (data.hours || 0) > 0) {
            ordinaryEveningTotal += data.hours || 0;
          }
        });
      }
      
      // Totale ore serali = standby + ordinarie
      aggregated.analytics.eveningWorkHours = standbyEveningTotal + ordinaryEveningTotal;
      
      debugLog(`🔧 EVENING CALCULATION FINAL - Standby: ${standbyEveningTotal}h, Ordinary: ${ordinaryEveningTotal}h, Total: ${aggregated.analytics.eveningWorkHours}h`);

      // 🔧 CALCOLO NUOVI PATTERN MIGLIORATI
      
      // 1. Calcola giorni consecutivi lavorati
      let currentStreak = 0;
      let maxStreak = 0;
      const sortedEntries = entries.sort((a, b) => {
        const da = parseDateOnlyToLocalDate(a.date);
        const db = parseDateOnlyToLocalDate(b.date);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      });
      let lastDate = null;
      
      sortedEntries.forEach(entry => {
        const currentDate = parseDateOnlyToLocalDate(entry.date);
        if (lastDate) {
          const dayDiff = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        lastDate = currentDate;
      });
      maxStreak = Math.max(maxStreak, currentStreak);
      aggregated.analytics.consecutiveWorkDays = maxStreak;
      
      // 2. Calcola pattern analytics usando i dati già aggregati
      let daysWithOvertime = 0;
      let totalInterventions = 0;
      let totalStartMinutes = 0;
      let validStartTimes = 0;
      let intensityDistribution = { light: 0, normal: 0, intense: 0, extreme: 0 };
      
      // Usa le analytics già calcolate che hanno i dati corretti
      debugLog(`🔧 DEBUG AGGREGATED ANALYTICS:`, aggregated.analytics);
      
      // Giorni + di 8h totali: usa dailyHours dagli analytics
      aggregated.analytics.dailyHours.forEach(hours => {
        if (hours > 8) {
          daysWithOvertime++;
        }
      });

      // Distribuzione intensità basata su dailyHours totali (lavoro + viaggio)
      aggregated.analytics.dailyHours.forEach((hours, index) => {
        if (hours < 6) {
          intensityDistribution.light++;
        } else if (hours <= 9) {
          intensityDistribution.normal++;
        } else if (hours <= 12) {
          intensityDistribution.intense++;
        } else {
          intensityDistribution.extreme++;
        }
      });
      
      // Interventi: usa il totale già calcolato
      totalInterventions = aggregated.analytics.standbyInterventions;
      
      // Orario medio: calcolalo dagli entry grezzi
      entries.forEach(entry => {
        // Usa work_start_1 se workStart1 non è disponibile
        const startTime1 = entry.workStart1 || entry.work_start_1;
        
        if (startTime1) {
          let timeStr = '';
          if (typeof startTime1 === 'string') {
            // Formato "HH:MM"
            if (startTime1.includes(':')) {
              timeStr = startTime1;
            } else {
              // String numerica "HHMM"
              timeStr = startTime1.padStart(4, '0');
              timeStr = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
            }
          } else {
            // Formato numerico HHMM
            timeStr = startTime1.toString().padStart(4, '0');
            timeStr = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
          }
          
          const [hours, minutes] = timeStr.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes) && hours < 24 && minutes < 60) {
            totalStartMinutes += hours * 60 + minutes;
            validStartTimes++;
          }
        }
      });
      
      debugLog(`🔧 DEBUG PATTERN RESULTS:`, {
        daysWithOvertime: `${daysWithOvertime} (ore > 8h)`,
        totalInterventions: `${totalInterventions} (da analytics)`,
        validStartTimes,
        intensityDistribution,
        totalEntries: entries.length
      });
      
      aggregated.analytics.daysWithOvertime = daysWithOvertime;
      aggregated.analytics.standbyInterventions = totalInterventions;
      aggregated.analytics.workIntensityDistribution = intensityDistribution;
      
      debugLog(`🔧 DEBUG PATTERN FINAL:`, {
        daysWithOvertime: `${daysWithOvertime}/${entries.length}`,
        totalInterventions,
        validStartTimes,
        intensityDistribution
      });
      
      // Calcola orario medio di inizio
      if (validStartTimes > 0) {
        const avgMinutes = Math.round(totalStartMinutes / validStartTimes);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        aggregated.analytics.averageStartTime = `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`;
        debugLog(`🔧 DEBUG AVERAGE START TIME: ${aggregated.analytics.averageStartTime}`);
      }
    }

    // 🎯 RIEPILOGO CONTATORI GIORNI
    debugLog('🔧 CONTATORI FINALI:', {
      ordinaryDays: aggregated.ordinary.days,
      standbyDays: aggregated.standby.days,
      travelDays: aggregated.allowances.travelDays,
      standbyAllowanceDays: aggregated.allowances.standbyDays,
      mealDays: aggregated.allowances.mealDays,
      totalDaysWorked: aggregated.daysWorked
    });

    // 🔄 AGGIUNGI INDENNITÀ DI REPERIBILITÀ DAL CALENDARIO
    // Calcola le indennità per i giorni di reperibilità che non hanno entries
    const existingEntryDates = entries.map(entry => entry.date);
    const standbyOnlyDays = standbyAllowances.filter(allowance => !existingEntryDates.includes(allowance.date));
    
    if (standbyOnlyDays.length > 0) {
      const standbyOnlyTotal = standbyOnlyDays.reduce((sum, allowance) => sum + allowance.allowance, 0);
      debugLog('🔧 DASHBOARD DEBUG - Indennità solo reperibilità:', {
        giorni: standbyOnlyDays.length,
        totale: standbyOnlyTotal,
        dettagli: standbyOnlyDays
      });
      
      // Aggiungi al totale generale
      aggregated.allowances.standby += standbyOnlyTotal;
      aggregated.allowances.standbyDays += standbyOnlyDays.length;
      aggregated.totalEarnings += standbyOnlyTotal;
      aggregated.standby.totalEarnings += standbyOnlyTotal; // <-- CORREZIONE: somma anche qui
      
      // Aggiungi anche alla suddivisione per tipo
      standbyOnlyDays.forEach(allowance => {
        const dateObj = parseDateOnlyToLocalDate(allowance.date);
        const isSaturday = dateObj.getDay() === 6;
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = isItalianHoliday(allowance.date);

        const saturdayAsRest = safeSettings?.standbySettings?.saturdayAsRest === true;
        const saturdayMode = safeSettings?.standbySettings?.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');

        let dayType = 'feriale';
        if (isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo')) {
          dayType = 'festivo';
        } else if (isSaturday) {
          dayType = 'sabato';
        }

        aggregated.allowances.standbyByType[dayType].amount += allowance.allowance;
        aggregated.allowances.standbyByType[dayType].days += 1;
        debugLog(`🔧 DEBUG STANDBY CALENDARIO - Giorno ${allowance.date} (${dayType}): €${allowance.allowance.toFixed(2)}, totale ${dayType}: €${aggregated.allowances.standbyByType[dayType].amount.toFixed(2)} (${aggregated.allowances.standbyByType[dayType].days} giorni)`);
      });
    }

    // Aggiungi le impostazioni per il calcolo delle percentuali nella dashboard
    aggregated.settings = safeSettings;

    // Converti la Map in oggetto normale per compatibilità con React state
    // Ordina sempre i breakdown per data crescente (dal giorno 1 in basso)
    aggregated.dailyBreakdownsObj = {};
    const sortedBreakdowns = Array.from(aggregated.dailyBreakdowns.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));
    for (const [date, breakdown] of sortedBreakdowns) {
      aggregated.dailyBreakdownsObj[date] = breakdown;
    }
    delete aggregated.dailyBreakdowns; // Rimuovi la Map originale

    // 💰 CALCOLO NETTO MENSILE - Aggiungi calcolo netto per completezza dashboard
    if (aggregated.totalEarnings > 0) {
      const payslipSettings = {
        method: settings?.netCalculation?.method || 'irpef',
        customDeductionRate: settings?.netCalculation?.customDeductionRate || 32
      };
      
      debugLog('🔍 Dashboard - Calcolo netto per:', aggregated.totalEarnings, 'con impostazioni:', payslipSettings);
      
      const netCalculation = RealPayslipCalculator.calculateNetFromGross(aggregated.totalEarnings, payslipSettings);
      
      // Aggiungi i campi del netto al summary
      aggregated.netTotalEarnings = netCalculation.net;
      aggregated.totalDeductions = netCalculation.totalDeductions;
      aggregated.deductionRate = netCalculation.deductionRate;
      
      debugLog('🔍 Dashboard - Netto calcolato:', {
        lordo: aggregated.totalEarnings,
        netto: aggregated.netTotalEarnings,
        trattenute: aggregated.totalDeductions,
        percentuale: (aggregated.deductionRate * 100).toFixed(1) + '%'
      });
    } else {
      aggregated.netTotalEarnings = 0;
      aggregated.totalDeductions = 0;
      aggregated.deductionRate = 0;
    }

    // Se nel frattempo è stato richiesto un nuovo calcolo (es. cambio mese), scarta questo risultato
    if (calcSeq !== calcSeqRef.current) {
      debugLog('🔧 DASHBOARD - Risultato calcolo obsoleto, scarto (mese cambiato durante il calcolo).');
      return;
    }

    setMonthlyAggregated(aggregated);
    debugLog('🔧 DASHBOARD - FINE calculateMonthlyAggregation');
    debugLog('🔧 DASHBOARD - Totale finale calcolato: €' + (aggregated.totalEarnings || 0).toFixed(2));
    debugLog('🔧 DASHBOARD - Giorni lavorati:', aggregated.daysWorked || 0);
    } catch (error) {
      console.error('🔧 DASHBOARD - Errore in calculateMonthlyAggregation:', error);
    } finally {
      isCalculatingRef.current = false;
      setIsCalculating(false);

      // Se durante il calcolo è arrivata una nuova richiesta (cambio mese), esegui subito l'ultima
      if (pendingCalcRef.current) {
        const pending = pendingCalcRef.current;
        pendingCalcRef.current = null;
        await Promise.resolve();
        await calculateMonthlyAggregation(pending.entries, pending.yearOverride, pending.monthOverride);
      }
    }
  };

  // ...rimosso useEffect che rilanciava i calcoli...

  // 🔍 DEBUG: Monitor dei cambiamenti in monthlyAggregated
  useEffect(() => {
    const total = monthlyAggregated?.totalEarnings || 0;
    const days = monthlyAggregated?.daysWorked || 0;
    const timestamp = new Date().toLocaleTimeString();
    debugLog(`📊 DASHBOARD MONITOR [${timestamp}] - monthlyAggregated cambiato: €${total.toFixed(2)}, ${days} giorni`);
    if (total > 0) {
      debugLog(`📊 DASHBOARD MONITOR [${timestamp}] - Breakdown presenti:`, {
        ordinary: monthlyAggregated?.ordinary?.total || 0,
        standby: monthlyAggregated?.standby?.totalEarnings || 0,
        allowances: {
          travel: monthlyAggregated?.allowances?.travel || 0,
          meal: monthlyAggregated?.allowances?.meal || 0,
          standby: monthlyAggregated?.allowances?.standby || 0
        }
      });
    }
  }, [monthlyAggregated]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      debugLog('🔄 DASHBOARD - Inizio refresh manuale...');
      debugLog('🔄 DASHBOARD - Refresh per mese:', formatMonthYear(selectedDate));
      // Refresh sia impostazioni che dati
      await refreshSettings();
      debugLog('🔄 DASHBOARD - Settings aggiornate');
      await loadData();
      debugLog('🔄 DASHBOARD - Dati ricaricati');
      debugLog('🔄 DASHBOARD - Refresh manuale completato');
    } catch (error) {
      console.error('Errore nel refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSettings]);


  // Navigazione tra i mesi
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    debugLog('🔍 Dashboard: Navigazione mese precedente:', {
      from: formatMonthYear(selectedDate),
      to: formatMonthYear(newDate)
    });
    setSelectedDate(newDate);
    setLoading(true);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    debugLog('🔍 Dashboard: Navigazione mese successivo:', {
      from: formatMonthYear(selectedDate),
      to: formatMonthYear(newDate)
    });
    setSelectedDate(newDate);
    setLoading(true);
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
    setLoading(true);
  };

  // Formatta il mese e anno per il titolo
  const formatMonthYear = useCallback((date) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  // Verifica se ci sono dati da mostrare
  const hasOrdinaryData = monthlyAggregated?.ordinary?.total > 0;
  const hasStandbyData = monthlyAggregated?.standby?.totalEarnings > 0 ||
    Object.values(monthlyAggregated?.standby?.workHours || {}).some(h => h > 0) ||
    Object.values(monthlyAggregated?.standby?.travelHours || {}).some(h => h > 0);
  const mealCashStandardReimbursements = Array.isArray(settings?.mealCashStandardReimbursements)
    ? settings.mealCashStandardReimbursements
    : [];

  const getMealReimbAmount = useCallback((item) => {
    if (item && typeof item === 'object') return Number(item.amount || 0);
    return Number(item || 0);
  }, []);

  const getMealReimbTs = useCallback((item) => {
    if (item && typeof item === 'object') {
      const ts = Number(item.ts);
      return Number.isFinite(ts) ? ts : null;
    }
    return null;
  }, []);
  const mealCashStandardReimbursed = useMemo(() => {
    if (mealCashStandardReimbursements.length > 0) {
      return mealCashStandardReimbursements.reduce((sum, v) => sum + (getMealReimbAmount(v) || 0), 0);
    }
    return Number(settings?.mealCashStandardReimbursed || 0);
  }, [mealCashStandardReimbursements, settings?.mealCashStandardReimbursed, getMealReimbAmount]);
  const allTimeCashStandardTotal = Number(allTimeMealCashStandard?.total || 0);
  const selectedYearCashStandardTotal = Number(yearMealCashStandard?.total || 0);
  const selectedYearNumber = Number(yearMealCashStandard?.year || (selectedDate instanceof Date ? selectedDate.getFullYear() : new Date().getFullYear()));
  const actualCurrentYear = new Date().getFullYear();
  const isViewingActualCurrentYear = selectedYearNumber === actualCurrentYear;
  const isViewingActualPreviousYear = selectedYearNumber === (actualCurrentYear - 1);
  const prevYearResidualYear = Number(settings?.mealCashStandardPreviousYear || 0);
  const prevYearResidual = Number(settings?.mealCashStandardPreviousYearResidual || 0);
  const prevYearReimbursements = Array.isArray(settings?.mealCashStandardPreviousYearReimbursements)
    ? settings.mealCashStandardPreviousYearReimbursements
    : [];
  const prevYearReimbursed = useMemo(() => {
    if (prevYearReimbursements.length > 0) {
      return prevYearReimbursements.reduce((sum, v) => sum + (getMealReimbAmount(v) || 0), 0);
    }
    return Number(settings?.mealCashStandardPreviousYearReimbursed || 0);
  }, [prevYearReimbursements, settings?.mealCashStandardPreviousYearReimbursed, getMealReimbAmount]);

  const prevYearCashStandardTotal = Number(prevYearMealCashStandard?.total || 0);

  // Se sto guardando un anno diverso da quello attuale, mostro "già rimborsato" e "residuo"
  // riferiti a quell'anno (solo se disponibile: anno corrente reale o anno precedente salvato).
  const displayedReimbursed = isViewingActualCurrentYear
    ? mealCashStandardReimbursed
    : (isViewingActualPreviousYear ? prevYearReimbursed : 0);
  const displayedResidual = isViewingActualCurrentYear
    ? (prevYearResidual + (selectedYearCashStandardTotal - mealCashStandardReimbursed))
    : (selectedYearCashStandardTotal - displayedReimbursed);
  const hasAllowancesData = (monthlyAggregated?.allowances?.travel > 0 || 
                            monthlyAggregated?.allowances?.meal > 0 || 
                            monthlyAggregated?.allowances?.standby > 0 ||
                            selectedYearCashStandardTotal > 0 ||
                            mealCashStandardReimbursed !== 0 ||
                            prevYearResidual !== 0 ||
                            prevYearReimbursed !== 0 ||
                            prevYearCashStandardTotal > 0);

  const renderOrdinarySection = () => {
    if (!hasOrdinaryData) return null;

    const ordinary = monthlyAggregated?.ordinary || {};
    const settings = monthlyAggregated?.settings || {};
    const breakdownDetails = ordinary.breakdownDetails || {};
    const dailyRate = settings?.contract?.dailyRate || 107.69;
    const hourlyRate = settings?.contract?.hourlyRate || 16.15;
    
    // 🔧 DEBUG: Mostra tutti i breakdown accumulati
    debugLog('🔧 DASHBOARD DEBUG - Breakdown completo ordinary:', JSON.stringify({
      'ordinary.hours': ordinary.hours,
      'ordinary.earnings': ordinary.earnings,
      'breakdownDetails.overtime': breakdownDetails.overtime,
      'breakdownDetails.supplements': breakdownDetails.supplements
    }, null, 2));
    
    // Calcola totali ore
    const totalRegularHours = (ordinary.hours?.lavoro_giornaliera || 0) + (ordinary.hours?.viaggio_giornaliera || 0);
    const totalOvertimeHours = (ordinary.hours?.lavoro_extra || 0) + (ordinary.hours?.viaggio_extra || 0);
    const totalWorkHours = (ordinary.hours?.lavoro_giornaliera || 0) + (ordinary.hours?.lavoro_extra || 0);
    const totalTravelHours = (ordinary.hours?.viaggio_giornaliera || 0) + (ordinary.hours?.viaggio_extra || 0);
    const grandTotalHours = totalRegularHours + totalOvertimeHours;
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderWithIcon}>
          <MaterialCommunityIcons name="briefcase-clock" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Attività Ordinarie</Text>
        </View>

        {/* 📅 TOTALE GIORNI FERIALI INSERITI */}
        <View style={[styles.breakdownItem, { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16 }]}>
              📅 Totale Giorni Feriali Inseriti
            </Text>
            <Text style={[styles.breakdownValue, { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }]}>
              {ordinary.days || 0} giorni
            </Text>
          </View>
          <Text style={styles.breakdownDetail}>
            ⏰ Totale ore: {formatSafeHours(grandTotalHours)} • Lavoro: {formatSafeHours(totalWorkHours)} • Viaggio: {formatSafeHours(totalTravelHours)}
          </Text>
        </View>

        {/* 🟢 ORE REGOLARI (prime 8h/giorno) */}
        {totalRegularHours > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🟢 Ore Regolari (prime 8h/giorno)
            </Text>
            <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📊 Totale Ore Regolari
                </Text>
                <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.success }]}>
                  {formatSafeHours(totalRegularHours)}
                </Text>
              </View>
              {(() => {
                const parts = [];
                if ((ordinary.hours?.lavoro_giornaliera || 0) > 0) {
                  parts.push(`• Lavoro: ${formatSafeHours(ordinary.hours.lavoro_giornaliera)}`);
                }
                if ((ordinary.hours?.viaggio_giornaliera || 0) > 0) {
                  parts.push(`• Viaggio: ${formatSafeHours(ordinary.hours.viaggio_giornaliera)}`);
                }
                return (
                  <Text style={styles.breakdownDetail}>{parts.join(' ')}</Text>
                );
              })()}
              <Text style={styles.breakdownDetail}>
                💰 Guadagno: Solo dalla tariffa giornaliera CCNL
              </Text>
              <Text style={[styles.breakdownAmount, { color: theme.colors.success, fontWeight: 'bold' }]}>
                {formatSafeAmount(breakdownDetails.dailyRateBreakdown?.totalAmount || (dailyRate * ordinary.days))}
              </Text>
            </View>
          </View>
        )}

        {/* 💰 ORE STRAORDINARIE LAVORO */}
        {(() => {
          debugLog('🔧 DEBUG STRAORDINARI CONDIZIONE - ordinary.hours?.lavoro_extra:', ordinary.hours?.lavoro_extra);
          debugLog('🔧 DEBUG STRAORDINARI CONDIZIONE - condition result:', (ordinary.hours?.lavoro_extra || 0) > 0);
          return null;
        })()}
        {(ordinary.hours?.lavoro_extra || 0) > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              💰 Ore Straordinarie Lavoro (oltre 8h/giorno)
            </Text>
            <Text style={[styles.breakdownDetail, { marginBottom: 8, fontStyle: 'italic' }]}>
              Solo ore di lavoro effettivo oltre le 8h giornaliere (escluso viaggio)
            </Text>
            
            {/* Se ci sono breakdown dettagliati per fasce, mostrali */}
            {Object.keys(breakdownDetails.overtime?.byPercentage || {}).length > 0 ? (
              <>
                <Text style={[styles.breakdownDetail, { marginBottom: 8, color: theme.colors.textSecondary, fontSize: 12 }]}>
                  🔍 Breakdown dettagliato per fasce orarie:
                </Text>
                {(() => {
                  debugLog('🔧 DEBUG STRAORDINARI RENDERING - breakdownDetails.overtime:', JSON.stringify(breakdownDetails.overtime, null, 2));
                  const entries = Object.entries(breakdownDetails.overtime.byPercentage);
                  debugLog('🔧 DEBUG STRAORDINARI RENDERING - entries before filter:', entries);
                  const filtered = entries.filter(([percentage, data]) => {
                    const shouldShow = data.hours > 0; // Rimuovo filtro su 100%
                    debugLog(`🔧 DEBUG STRAORDINARI RENDERING - ${percentage}: hours=${data.hours}, shouldShow=${shouldShow}`);
                    return shouldShow;
                  });
                  debugLog('🔧 DEBUG STRAORDINARI RENDERING - entries after filter:', filtered);
                  return null;
                })()}
                {Object.entries(breakdownDetails.overtime.byPercentage)
                  .filter(([percentage, data]) => data.hours > 0) // Rimuovo filtro su 100%
                  .map(([percentage, data]) => {
                    // Determina il tipo di straordinario basato sulla percentuale
                    let overtimeType = '';
                    const rate = data.rate;
                    if (rate === 1.2) {
                      overtimeType = 'Straordinario diurno';
                    } else if (rate === 1.25) {
                      overtimeType = 'Straordinario serale';
                    } else if (rate === 1.35) {
                      overtimeType = 'Straordinario notturno';
                    } else if (rate === 1.45) {
                      overtimeType = 'Straordinario serale';
                    } else if (rate === 1.5) {
                      overtimeType = 'Straordinario notturno';
                    } else {
                      overtimeType = `Straordinario`;
                    }

                    return (
                      <View key={percentage} style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>
                            🔥 {overtimeType}
                          </Text>
                          <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.warning }]}>
                            {data.hours.toFixed(1)}h
                          </Text>
                        </View>
                        <Text style={styles.breakdownDetail}>
                          €{((data.amount / data.hours) / rate).toFixed(2)} × {rate.toFixed(2)} × {data.hours.toFixed(1)}h = €{data.amount.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
              </>
            ) : (
              <>
                <Text style={[styles.breakdownDetail, { marginBottom: 8, color: theme.colors.textSecondary, fontSize: 12 }]}>
                  📊 Straordinari standard (breakdown dettagliato non disponibile):
                </Text>
                {/* Altrimenti mostra solo gli straordinari standard +20% */}
                <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      🔥 Straordinari Standard (+20%)
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatSafeHours(ordinary.hours.lavoro_extra)}
                    </Text>
                  </View>
                  <Text style={styles.breakdownDetail}>
                    €{hourlyRate.toFixed(2).replace('.', ',')} × 1,20 × {formatSafeHours(ordinary.hours.lavoro_extra)} = €{(hourlyRate * 1.20 * ordinary.hours.lavoro_extra).toFixed(2).replace('.', ',')}
                  </Text>
                  <Text style={styles.breakdownAmount}>
                    {formatSafeAmount(ordinary.earnings?.lavoro_extra || 0)}
                  </Text>
                </View>
              </>
            )}
            
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Straordinari Lavoro</Text>
              <Text style={[styles.breakdownTotal, { color: theme.colors.warning, fontWeight: 'bold' }]}>
                {formatSafeAmount(ordinary.earnings?.lavoro_extra || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* 🌙 SUPPLEMENTI PER FASCE ORARIE */}
        {Object.keys(breakdownDetails.supplements?.byTimeRange || {}).length > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🌙 Supplementi per Fasce Orarie
            </Text>
            {Object.entries(breakdownDetails.supplements.byTimeRange).map(([timeRange, data]) => (
              <View key={timeRange} style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    🌙 {timeRange}
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatSafeHours(data.hours)}
                  </Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  €{(data.hourlyRate || hourlyRate).toFixed(2).replace('.', ',')} × {formatSafeHours(data.hours)} × +{data.percentage || Math.round(((data.rate || 1) - 1) * 100)}% = €{data.amount.toFixed(2).replace('.', ',')}
                </Text>
                <Text style={styles.breakdownAmount}>
                  {formatSafeAmount(data.amount)}
                </Text>
              </View>
            ))}
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Supplementi</Text>
              <Text style={[styles.breakdownTotal, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                {formatSafeAmount(breakdownDetails.supplements?.total || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* 🚗 VIAGGIO */}
        {totalTravelHours > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🚗 Viaggio
            </Text>
            
            {/* Totale ore viaggio */}
            <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📊 Totale Ore Viaggio
                </Text>
                <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.info }]}>
                  {formatSafeHours(totalTravelHours)}
                </Text>
              </View>
            </View>

            {/* Viaggio in ore regolari */}
            {ordinary.hours?.viaggio_giornaliera > 0 && (
              <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <MaterialCommunityIcons name="car-clock" size={16} color={theme.colors.success} style={{ marginRight: 5 }} />
                  <Text style={styles.breakdownLabel}>
                    Viaggio in ore regolari
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatSafeHours(ordinary.hours.viaggio_giornaliera)}
                  </Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  Compreso nella tariffa giornaliera CCNL
                </Text>
              </View>
            )}

            {/* Viaggio compensato */}
            {ordinary.hours?.viaggio_extra > 0 && (
              <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    💰 Viaggio compensato
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatSafeHours(ordinary.hours.viaggio_extra)}
                  </Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  €{hourlyRate.toFixed(2).replace('.', ',')} × {formatSafeHours(ordinary.hours.viaggio_extra)} × {Math.round((settings.travelCompensationRate || 1.0) * 100)}%
                </Text>
                <Text style={styles.breakdownAmount}>
                  {formatSafeAmount(ordinary.earnings?.viaggio_extra || 0)}
                </Text>
              </View>
            )}

            {/* Totale Guadagno Viaggio */}
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Guadagno Viaggio</Text>
              <Text style={[styles.breakdownTotal, { color: theme.colors.info, fontWeight: 'bold' }]}>
                {formatSafeAmount(ordinary.earnings?.viaggio_extra || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* 🎊 MAGGIORAZIONI WEEKEND/FESTIVI */}
        {(ordinary.earnings?.sabato_bonus > 0 || ordinary.earnings?.domenica_bonus > 0 || ordinary.earnings?.festivo_bonus > 0) && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🎊 Maggiorazioni Weekend/Festivi
            </Text>
            {ordinary.earnings?.sabato_bonus > 0 && (
              <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>🗓️ Sabato (+25%)</Text>
                  <Text style={styles.breakdownAmount}>{formatSafeAmount(ordinary.earnings.sabato_bonus)}</Text>
                </View>
              </View>
            )}
            {ordinary.earnings?.domenica_bonus > 0 && (
              <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>🗓️ Domenica (+30%)</Text>
                  <Text style={styles.breakdownAmount}>{formatSafeAmount(ordinary.earnings.domenica_bonus)}</Text>
                </View>
              </View>
            )}
            {ordinary.earnings?.festivo_bonus > 0 && (
              <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>🎉 Festivo (+30%)</Text>
                  <Text style={styles.breakdownAmount}>{formatSafeAmount(ordinary.earnings.festivo_bonus)}</Text>
                </View>
              </View>
            )}
          </View>
        )}


        {/* 🏆 TOTALE FINALE ATTIVITÀ ORDINARIE */}
        <View style={[styles.breakdownItem, { 
          marginTop: 16, 
          paddingTop: 16, 
          borderTopWidth: 2, 
          borderTopColor: theme.colors.primary,
          backgroundColor: theme.colors.surface,
          padding: 12,
          borderRadius: 8
        }]}>
          <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 18, marginBottom: 4 }]}>
            🏆 TOTALE ATTIVITÀ ORDINARIE
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.breakdownDetail}>
              {ordinary.days} giorni • {formatSafeHours(grandTotalHours)} ore totali
            </Text>
            <Text style={[styles.breakdownTotal, { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary }]}>
              {formatSafeAmount(ordinary.total)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStandbySection = () => {
    const standbyInterventionsCount = monthlyAggregated?.analytics?.standbyInterventions || 0;

    // Nascondi la card solo se la preferenza è OFF e non ci sono interventi nel mese
    if (
      settings &&
      settings.standbySettings &&
      settings.standbySettings.showInterventionsCard === false &&
      standbyInterventionsCount === 0
    ) {
      return null;
    }
    const standby = monthlyAggregated?.standby || {};
  // Calcola i guadagni SOLO degli interventi (lavoro + viaggio) senza indennità giornaliere
  const sumValues = (obj) => Object.values(obj || {}).reduce((a, b) => a + (b || 0), 0);
  const interventionsAmount = sumValues(standby.workEarnings) + sumValues(standby.travelEarnings);
  // Mostra sempre la card se abilitata dalle impostazioni, anche con 0 interventi

    // Debug log per vedere i dati standby
    debugLog('🔍 STANDBY DEBUG - Dati standby ricevuti:', {
      workHours: standby.workHours,
      workEarnings: standby.workEarnings,
      travelHours: standby.travelHours,
      travelEarnings: standby.travelEarnings,
      totalEarnings: standby.totalEarnings
    });
    
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderWithIcon}>
          <MaterialCommunityIcons name="phone-alert" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Interventi Reperibilità</Text>
        </View>
        {/* 📞 TOTALE INTERVENTI REPERIBILITÀ */}
        <View style={[styles.breakdownItem, { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16 }]}>
              📞 Totale Interventi Reperibilità
            </Text>
            <Text style={[styles.breakdownValue, { fontSize: 18, fontWeight: 'bold', color: theme.colors.overtime }]}>
              {standbyInterventionsCount} interventi
            </Text>
          </View>
          <Text style={styles.breakdownDetail}>
            ⏰ Totale ore: {formatSafeHours((standby.workHours?.ordinary || 0) + (standby.workHours?.evening || 0) + (standby.workHours?.night || 0) + (standby.workHours?.holiday || 0) + (standby.workHours?.saturday || 0) + (standby.workHours?.saturday_night || 0) + (standby.workHours?.night_holiday || 0) + (standby.travelHours?.ordinary || 0) + (standby.travelHours?.evening || 0) + (standby.travelHours?.night || 0) + (standby.travelHours?.saturday || 0) + (standby.travelHours?.saturday_night || 0) + (standby.travelHours?.holiday || 0) + (standby.travelHours?.night_holiday || 0))}
          </Text>
          <Text style={[styles.breakdownAmount, { color: theme.colors.overtime, fontWeight: 'bold', fontSize: 16 }]}>
            {formatSafeAmount(interventionsAmount)}
          </Text>
        </View>

        {/* 💼 BREAKDOWN DETTAGLIATO INTERVENTI */}
        <Text style={[styles.breakdownDetail, { marginBottom: 8, color: theme.colors.textSecondary, fontSize: 12, marginLeft: 10 }]}>
          🔍 Breakdown dettagliato ore e maggiorazioni:
        </Text>
        
        {/* Creo breakdown simile ai giorni non ordinari */}
        {(() => {
          const breakdown = [];
          
          // Aggiungo elementi di lavoro
          if (standby.workHours?.ordinary > 0) {
            breakdown.push({
              name: 'Lavoro diurno',
              hours: standby.workHours.ordinary,
              earnings: standby.workEarnings?.ordinary || 0,
              rate: standby.workEarnings?.ordinary && standby.workHours.ordinary ? 
                    (standby.workEarnings.ordinary / standby.workHours.ordinary) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.2,
              hourlyRate: standby.workEarnings?.ordinary && standby.workHours.ordinary ? 
                         (standby.workEarnings.ordinary / standby.workHours.ordinary) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.2,
              isTravel: false
            });
          }
          
          if (standby.workHours?.evening > 0) {
            breakdown.push({
              name: 'Lavoro serale',
              hours: standby.workHours.evening,
              earnings: standby.workEarnings?.evening || 0,
              rate: standby.workEarnings?.evening && standby.workHours.evening ? 
                    (standby.workEarnings.evening / standby.workHours.evening) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.25,
              hourlyRate: standby.workEarnings?.evening && standby.workHours.evening ? 
                         (standby.workEarnings.evening / standby.workHours.evening) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.25,
              isTravel: false
            });
          }
          
          if (standby.workHours?.night > 0) {
            breakdown.push({
              name: 'Lavoro notturno',
              hours: standby.workHours.night,
              earnings: standby.workEarnings?.night || 0,
              rate: standby.workEarnings?.night && standby.workHours.night ? 
                    (standby.workEarnings.night / standby.workHours.night) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.35,
              hourlyRate: standby.workEarnings?.night && standby.workHours.night ? 
                         (standby.workEarnings.night / standby.workHours.night) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.35,
              isTravel: false
            });
          }
          
          if (standby.workHours?.holiday > 0) {
            breakdown.push({
              name: 'Lavoro festivo',
              hours: standby.workHours.holiday,
              earnings: standby.workEarnings?.holiday || 0,
              rate: standby.workEarnings?.holiday && standby.workHours.holiday ? 
                    (standby.workEarnings.holiday / standby.workHours.holiday) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.3,
              hourlyRate: standby.workEarnings?.holiday && standby.workHours.holiday ? 
                         (standby.workEarnings.holiday / standby.workHours.holiday) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.3,
              isTravel: false
            });
          }
          
          if (standby.workHours?.saturday > 0) {
            breakdown.push({
              name: 'Lavoro sabato',
              hours: standby.workHours.saturday,
              earnings: standby.workEarnings?.saturday || 0,
              rate: standby.workEarnings?.saturday && standby.workHours.saturday ? 
                    (standby.workEarnings.saturday / standby.workHours.saturday) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.25,
              hourlyRate: standby.workEarnings?.saturday && standby.workHours.saturday ? 
                         (standby.workEarnings.saturday / standby.workHours.saturday) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.25,
              isTravel: false
            });
          }
          
          // Aggiungo elementi di viaggio
          if (standby.travelHours?.ordinary > 0) {
            breakdown.push({
              name: 'Viaggio',
              hours: standby.travelHours.ordinary,
              earnings: standby.travelEarnings?.ordinary || 0,
              rate: standby.travelEarnings?.ordinary && standby.travelHours.ordinary ? 
                    (standby.travelEarnings.ordinary / standby.travelHours.ordinary) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1,
              hourlyRate: standby.travelEarnings?.ordinary && standby.travelHours.ordinary ? 
                         (standby.travelEarnings.ordinary / standby.travelHours.ordinary) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15),
              isTravel: true,
              travelCalculationType: 'WORK_RATE'
            });
          }
          
          if (standby.travelHours?.evening > 0) {
            breakdown.push({
              name: 'Viaggio',
              hours: standby.travelHours.evening,
              earnings: standby.travelEarnings?.evening || 0,
              rate: standby.travelEarnings?.evening && standby.travelHours.evening ? 
                    (standby.travelEarnings.evening / standby.travelHours.evening) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.25,
              hourlyRate: standby.travelEarnings?.evening && standby.travelHours.evening ? 
                         (standby.travelEarnings.evening / standby.travelHours.evening) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.25,
              isTravel: true,
              travelCalculationType: 'WORK_RATE'
            });
          }
          
          if (standby.travelHours?.night > 0) {
            breakdown.push({
              name: 'Viaggio',
              hours: standby.travelHours.night,
              earnings: standby.travelEarnings?.night || 0,
              rate: standby.travelEarnings?.night && standby.travelHours.night ? 
                    (standby.travelEarnings.night / standby.travelHours.night) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.25,
              hourlyRate: standby.travelEarnings?.night && standby.travelHours.night ? 
                         (standby.travelEarnings.night / standby.travelHours.night) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.25,
              isTravel: true,
              travelCalculationType: 'WORK_RATE'
            });
          }
          
          if (standby.travelHours?.saturday > 0) {
            breakdown.push({
              name: 'Viaggio',
              hours: standby.travelHours.saturday,
              earnings: standby.travelEarnings?.saturday || 0,
              rate: standby.travelEarnings?.saturday && standby.travelHours.saturday ? 
                    (standby.travelEarnings.saturday / standby.travelHours.saturday) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.25,
              hourlyRate: standby.travelEarnings?.saturday && standby.travelHours.saturday ? 
                         (standby.travelEarnings.saturday / standby.travelHours.saturday) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.25,
              isTravel: true,
              travelCalculationType: 'WORK_RATE'
            });
          }
          
          if (standby.travelHours?.holiday > 0) {
            breakdown.push({
              name: 'Viaggio',
              hours: standby.travelHours.holiday,
              earnings: standby.travelEarnings?.holiday || 0,
              rate: standby.travelEarnings?.holiday && standby.travelHours.holiday ? 
                    (standby.travelEarnings.holiday / standby.travelHours.holiday) / (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) : 1.3,
              hourlyRate: standby.travelEarnings?.holiday && standby.travelHours.holiday ? 
                         (standby.travelEarnings.holiday / standby.travelHours.holiday) : (monthlyAggregated?.settings?.contract?.hourlyRate || 16.15) * 1.3,
              isTravel: true,
              travelCalculationType: 'WORK_RATE'
            });
          }
          
          // Unisci viaggi identici (stessa percentuale)
          const mergedBreakdown = [];
          const travelGroups = {};
          
          breakdown.forEach(entry => {
            if (entry.isTravel) {
              const key = `${entry.rate.toFixed(2)}_${entry.travelCalculationType}`;
              
              if (!travelGroups[key]) {
                travelGroups[key] = {
                  ...entry,
                  hours: 0,
                  earnings: 0
                };
              }
              
              travelGroups[key].hours += entry.hours;
              travelGroups[key].earnings += entry.earnings;
            } else {
              mergedBreakdown.push(entry);
            }
          });
          
          // Aggiungi i viaggi uniti
          Object.values(travelGroups).forEach(group => {
            mergedBreakdown.push(group);
          });
          
          return mergedBreakdown.map((item, index) => {
            const isTravel = item.isTravel;
            const backgroundColor = isTravel ? theme.colors.card : theme.colors.surface;
            const icon = isTravel ? '🚗' : '💼';
            
            // Calcola la percentuale di bonus
            let bonusText = '';
            if (item.travelCalculationType === 'FIXED_RATE') {
              bonusText = 'tariffa fissa';
            } else if (item.rate && item.rate !== 1) {
              bonusText = `+${Math.round((item.rate - 1) * 100)}%`;
            } else {
              bonusText = 'standard';
            }
            
            return (
              <View key={index} style={[styles.breakdownItem, { marginLeft: 10, backgroundColor, padding: 8, borderRadius: 4, marginBottom: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {icon} {item.name}
                  </Text>
                  <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: isTravel ? '#0277bd' : '#2e7d32' }]}>
                    {formatSafeHours(item.hours)}
                  </Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  €{(item.hourlyRate || 0).toFixed(2)} × {formatSafeHours(item.hours)} × {bonusText} = €{(item.earnings || 0).toFixed(2)}
                </Text>
              </View>
            );
          });
        })()}

        {/* TOTALE FINALE */}
        <View style={[styles.breakdownItem, { 
          marginTop: 16, 
          paddingTop: 16, 
          borderTopWidth: 2, 
          borderTopColor: theme.colors.overtime,
          backgroundColor: theme.colors.surface,
          padding: 12,
          borderRadius: 8
        }]}>
          <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 18, marginBottom: 4 }]}>
            📞 TOTALE INTERVENTI REPERIBILITÀ
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.breakdownDetail}>
              {monthlyAggregated?.analytics?.standbyInterventions || 0} interventi • {formatSafeHours((standby.workHours?.ordinary || 0) + (standby.workHours?.evening || 0) + (standby.workHours?.night || 0) + (standby.workHours?.holiday || 0) + (standby.workHours?.saturday || 0) + (standby.workHours?.saturday_night || 0) + (standby.workHours?.night_holiday || 0) + (standby.travelHours?.ordinary || 0) + (standby.travelHours?.evening || 0) + (standby.travelHours?.night || 0) + (standby.travelHours?.saturday || 0) + (standby.travelHours?.saturday_night || 0) + (standby.travelHours?.holiday || 0) + (standby.travelHours?.night_holiday || 0))} ore totali
            </Text>
            <Text style={[styles.breakdownTotal, { fontSize: 20, fontWeight: 'bold', color: theme.colors.overtime }]}>
              {formatSafeAmount(interventionsAmount)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAllowancesSection = () => {
    if (!hasAllowancesData) return null;

    const allowances = monthlyAggregated?.allowances || {};
    const meals = monthlyAggregated?.meals || {};

    const cashStandardResidual = selectedYearCashStandardTotal - mealCashStandardReimbursed;
    const canEditCashStandardReimb = isViewingActualCurrentYear || isViewingActualPreviousYear;
    const showCashStandardReimbursement = (
      selectedYearCashStandardTotal > 0 ||
      mealCashStandardReimbursed !== 0 ||
      prevYearResidual !== 0 ||
      prevYearReimbursed !== 0 ||
      prevYearCashStandardTotal > 0
    );

    const openMealReimbModal = () => {
      // Consentiamo modifica solo per anno corrente reale o anno precedente salvato.
      if (!canEditCashStandardReimb) {
        Alert.alert('Info', 'Puoi modificare i rimborsi solo per l\'anno corrente o per l\'anno precedente (residuo).');
        return;
      }

      setMealReimbInput('');
      setMealReimbEditIndex(null);
      const usePrev = !isViewingActualCurrentYear && isViewingActualPreviousYear;
      setMealReimbUsePrevYearKeys(usePrev);
      setMealReimbModalYear(selectedYearNumber);
      setMealReimbModalVisible(true);
    };

    const persistMealReimbursementsList = async (newList) => {
      const rawList = Array.isArray(newList) ? newList : [];
      // Normalizza: supporta lista legacy di numeri e nuova lista di oggetti { amount, ts }
      const safeList = rawList
        .map((item) => {
          if (item && typeof item === 'object') {
            const amount = Number(item.amount || 0);
            const ts = Number(item.ts);
            return {
              amount: Number.isFinite(amount) ? amount : 0,
              ...(Number.isFinite(ts) ? { ts } : {})
            };
          }
          const amount = Number(item || 0);
          return { amount: Number.isFinite(amount) ? amount : 0 };
        })
        .filter((it) => Number(it.amount || 0) !== 0);

      const newTotal = safeList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

      // Calcolo residuo per l'anno mostrato (yearMealCashStandard è già allineato a selectedDate)
      const maturedForDisplayedYear = Number(selectedYearCashStandardTotal || 0);
      const newResidual = maturedForDisplayedYear - newTotal;

      // Se sto guardando l'anno precedente (es. 2025 da 2026), aggiorna i campi dedicati.
      if (mealReimbUsePrevYearKeys) {
        await updatePartialSettings({
          mealCashStandardPreviousYear: selectedYearNumber,
          mealCashStandardPreviousYearReimbursements: safeList,
          mealCashStandardPreviousYearReimbursed: newTotal,
          mealCashStandardPreviousYearResidual: newResidual
        });
        return;
      }

      await updatePartialSettings({
        mealCashStandardReimbursements: safeList,
        // Mantieni anche il legacy aggiornato per compatibilità
        mealCashStandardReimbursed: newTotal
      });
    };

    const saveMealReimbursed = async () => {
      try {
        const raw = String(mealReimbInput ?? '').trim();
        const parsed = raw.length === 0 ? 0 : parseFloat(raw.replace(',', '.'));
        const delta = Number.isFinite(parsed) ? parsed : 0;

        // Se non inserisce nulla, non modificare.
        if (!delta) {
          setMealReimbModalVisible(false);
          return;
        }

        const currentList = mealReimbUsePrevYearKeys
          ? (Array.isArray(settings?.mealCashStandardPreviousYearReimbursements)
            ? settings.mealCashStandardPreviousYearReimbursements
            : [])
          : (Array.isArray(settings?.mealCashStandardReimbursements)
            ? settings.mealCashStandardReimbursements
            : []);

        let newList = [];

        // Caso MODIFICA: non facciamo split automatico (manteniamo il target corrente)
        if (mealReimbEditIndex !== null && mealReimbEditIndex >= 0 && mealReimbEditIndex < currentList.length) {
          newList = currentList.map((v, i) => {
            if (i !== mealReimbEditIndex) return v;
            // Preserva timestamp se presente
            if (v && typeof v === 'object') return { ...v, amount: delta };
            return { amount: delta };
          });
          await persistMealReimbursementsList(newList);
        } else {
          // Caso AGGIUNTA: se siamo nell'anno corrente reale, paga prima il residuo anno precedente.
          const nowTs = Date.now();

          if (!mealReimbUsePrevYearKeys && isViewingActualCurrentYear) {
            const prevResidual = Math.max(0, Number(prevYearResidual || 0));
            const allocateToPrev = Math.min(delta, prevResidual);
            const allocateToCurrent = delta - allocateToPrev;

            const payload = {};

            // Aggiorna anno precedente (riduce residuo e aumenta rimborsato/lista)
            if (allocateToPrev > 0) {
              const prevListRaw = Array.isArray(settings?.mealCashStandardPreviousYearReimbursements)
                ? settings.mealCashStandardPreviousYearReimbursements
                : [];
              const prevList = prevListRaw
                .map((item) => {
                  if (item && typeof item === 'object') {
                    const amount = Number(item.amount || 0);
                    const ts = Number(item.ts);
                    return {
                      amount: Number.isFinite(amount) ? amount : 0,
                      ...(Number.isFinite(ts) ? { ts } : {})
                    };
                  }
                  const amount = Number(item || 0);
                  return { amount: Number.isFinite(amount) ? amount : 0 };
                })
                .filter((it) => Number(it.amount || 0) !== 0);

              const newPrevList = [...prevList, { amount: allocateToPrev, ts: nowTs }];
              const newPrevTotal = newPrevList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);

              payload.mealCashStandardPreviousYear = actualCurrentYear - 1;
              payload.mealCashStandardPreviousYearReimbursements = newPrevList;
              payload.mealCashStandardPreviousYearReimbursed = newPrevTotal;
              payload.mealCashStandardPreviousYearResidual = Math.max(0, prevResidual - allocateToPrev);
            }

            // Aggiorna anno corrente solo con l'eventuale eccedenza
            if (allocateToCurrent > 0) {
              const currentListNorm = currentList
                .map((item) => {
                  if (item && typeof item === 'object') {
                    const amount = Number(item.amount || 0);
                    const ts = Number(item.ts);
                    return {
                      amount: Number.isFinite(amount) ? amount : 0,
                      ...(Number.isFinite(ts) ? { ts } : {})
                    };
                  }
                  const amount = Number(item || 0);
                  return { amount: Number.isFinite(amount) ? amount : 0 };
                })
                .filter((it) => Number(it.amount || 0) !== 0);

              const newCurrentList = [...currentListNorm, { amount: allocateToCurrent, ts: nowTs }];
              const newCurrentTotal = newCurrentList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
              payload.mealCashStandardReimbursements = newCurrentList;
              payload.mealCashStandardReimbursed = newCurrentTotal;
            }

            // Se tutto è andato su anno precedente, comunque aggiorna legacy corrente a 0 coerente
            if (allocateToCurrent <= 0) {
              // Mantieni lista corrente com'è; assicura total legacy coerente
              const currentListNorm = Array.isArray(settings?.mealCashStandardReimbursements)
                ? settings.mealCashStandardReimbursements
                : [];
              const currentTotal = currentListNorm.reduce((sum, v) => sum + (getMealReimbAmount(v) || 0), 0);
              payload.mealCashStandardReimbursed = Number(currentTotal || 0);
            }

            await updatePartialSettings(payload);
          } else {
            // Aggiunta normale (stai modificando direttamente l'anno selezionato)
            newList = [...currentList, { amount: delta, ts: nowTs }];
            await persistMealReimbursementsList(newList);
          }
        }

        setMealReimbModalVisible(false);
        setMealReimbEditIndex(null);
      } catch (e) {
        console.error('Errore salvataggio rimborso pasti:', e);
        Alert.alert('Errore', 'Impossibile salvare l\'importo rimborsato.');
      }
    };

    const deleteMealReimbursement = async (index) => {
      try {
        const currentList = mealReimbUsePrevYearKeys
          ? (Array.isArray(settings?.mealCashStandardPreviousYearReimbursements)
              ? settings.mealCashStandardPreviousYearReimbursements
              : [])
          : (Array.isArray(settings?.mealCashStandardReimbursements)
              ? settings.mealCashStandardReimbursements
              : []);
        if (index < 0 || index >= currentList.length) return;

        const newList = currentList.filter((_, i) => i !== index);
        await persistMealReimbursementsList(newList);

        // Se stavi modificando proprio quell'elemento, reset
        if (mealReimbEditIndex === index) {
          setMealReimbEditIndex(null);
          setMealReimbInput('');
        }
      } catch (e) {
        console.error('Errore eliminazione rimborso pasti:', e);
        Alert.alert('Errore', 'Impossibile eliminare l\'importo.');
      }
    };
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Indennità e Buoni</Text>
        
        {/* Indennità trasferta */}
        {allowances.travel > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Indennità trasferta</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.travel)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {allowances.travelDays || 0} giorni con indennità trasferta
            </Text>
            
            {/* Dettaglio suddivisione per percentuale */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Suddivisione per percentuale:</Text>
              {allowances.travelByPercent['100'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 100% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '15,00€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['100'].amount)} 
                  ({allowances.travelByPercent['100'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['78'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 78% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount * 0.78;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '11,70€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['78'].amount)} 
                  ({allowances.travelByPercent['78'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['50'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 50% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount * 0.50;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '7,50€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['50'].amount)} 
                  ({allowances.travelByPercent['50'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['other'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • Altre: {formatSafeAmount(allowances.travelByPercent['other'].amount)} 
                  ({allowances.travelByPercent['other'].days} giorni)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Indennità reperibilità */}
        {allowances.standby > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Indennità reperibilità</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.standby)}</Text>
            </View>
            <View style={styles.breakdownSubItems}>
              {/* Feriale */}
              {allowances.standbyByType?.feriale?.amount > 0 && standbyRates?.feriale !== undefined && (
                <Text style={styles.breakdownDetail}>
                  Feriale ({standbyRates.feriale.toFixed(2).replace('.', ',')}€/giorno): €{allowances.standbyByType.feriale.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.feriale.days} gg)
                </Text>
              )}
              
              {/* Sabato */}
              {allowances.standbyByType?.sabato?.amount > 0 && standbyRates?.sabato !== undefined && (
                <Text style={styles.breakdownDetail}>
                  Sabato ({standbyRates.sabato.toFixed(2).replace('.', ',')}€/giorno): €{allowances.standbyByType.sabato.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.sabato.days} gg)
                </Text>
              )}
              
              {/* Festivo */}
              {allowances.standbyByType?.festivo?.amount > 0 && standbyRates?.festivo !== undefined && (
                <Text style={styles.breakdownDetail}>
                  Festivo ({standbyRates.festivo.toFixed(2).replace('.', ',')}€/giorno): €{allowances.standbyByType.festivo.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.festivo.days} gg)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Rimborsi pasti */}
        {allowances.meal > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Rimborsi pasti</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.meal)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {allowances.mealDays || 0} giorni con rimborsi pasti
            </Text>

            {/* Suddivisione per tipologia (buoni, cash standard, cash specifico) */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Suddivisione:</Text>
              {((meals?.byType?.vouchers?.total || 0) > 0) && (
                <Text style={styles.breakdownSubDetail}>
                  • Buoni pasto: {formatSafeAmount(meals.byType.vouchers.total)} ({meals.byType.vouchers.count || 0} pezzi{(meals.byType.vouchers.days || 0) > 0 ? `, ${meals.byType.vouchers.days} gg` : ''})
                </Text>
              )}
              {((meals?.byType?.cashStandard?.total || 0) > 0) && (
                <Text style={styles.breakdownSubDetail}>
                  • Cash standard: {formatSafeAmount(meals.byType.cashStandard.total)} ({meals.byType.cashStandard.count || 0} pasti{(meals.byType.cashStandard.days || 0) > 0 ? `, ${meals.byType.cashStandard.days} gg` : ''})
                </Text>
              )}
              {((meals?.byType?.cashSpecific?.total || 0) > 0) && (
                <Text style={styles.breakdownSubDetail}>
                  • Cash specifico: {formatSafeAmount(meals.byType.cashSpecific.total)} ({meals.byType.cashSpecific.count || 0} pasti{(meals.byType.cashSpecific.days || 0) > 0 ? `, ${meals.byType.cashSpecific.days} gg` : ''})
                </Text>
              )}
            </View>

            {/* Dettaglio pranzo/cena */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Dettaglio pranzo/cena:</Text>
              <View style={styles.mealSubSection}>
                {(meals?.lunch?.voucher || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Pranzo - buoni: {formatSafeAmount(meals.lunch.voucher)} ({meals.lunch.voucherDays || 0} gg)
                  </Text>
                )}
                {(meals?.lunch?.cash || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Pranzo - cash: {formatSafeAmount(meals.lunch.cash)} ({meals.lunch.cashDays || 0} gg)
                  </Text>
                )}
                {(meals?.lunch?.specific || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Pranzo - cash specifico: {formatSafeAmount(meals.lunch.specific)} ({meals.lunch.specificDays || 0} gg)
                  </Text>
                )}
              </View>
              <View style={styles.mealSubSection}>
                {(meals?.dinner?.voucher || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Cena - buoni: {formatSafeAmount(meals.dinner.voucher)} ({meals.dinner.voucherDays || 0} gg)
                  </Text>
                )}
                {(meals?.dinner?.cash || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Cena - cash: {formatSafeAmount(meals.dinner.cash)} ({meals.dinner.cashDays || 0} gg)
                  </Text>
                )}
                {(meals?.dinner?.specific || 0) > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    • Cena - cash specifico: {formatSafeAmount(meals.dinner.specific)} ({meals.dinner.specificDays || 0} gg)
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Rimborso pasti (cash standard) - anno corrente + anno precedente */}
        {showCashStandardReimbursement && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Rimborso pasti (cash standard)</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(selectedYearCashStandardTotal)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              Totale maturato ({yearMealCashStandard.year}) • Pranzo: {yearMealCashStandard.lunchVoucherCount || 0} • Cena: {yearMealCashStandard.dinnerVoucherCount || 0}
            </Text>

            {(isViewingActualCurrentYear && prevYearResidualYear > 0 && prevYearResidual > 0) && (
              <View style={styles.mealResidualRow}>
                <Text style={styles.breakdownDetail}>Residuo anno precedente ({prevYearResidualYear})</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(prevYearResidual)}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={openMealReimbModal}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel={`Modifica già rimborsato (${yearMealCashStandard.year})`}
              accessibilityHint="Tocca per aggiungere, modificare o eliminare gli importi rimborsati"
              style={styles.mealResidualRow}
            >
              <Text style={[styles.breakdownDetail, { textDecorationLine: 'underline', color: theme.colors.primary }]}>Già rimborsato ({yearMealCashStandard.year})</Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.primary }]}>{formatSafeAmount(displayedReimbursed)}</Text>
            </TouchableOpacity>

            <View style={styles.mealResidualRow}>
              <Text style={styles.breakdownDetail}>Residuo da rimborsare</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(displayedResidual)}</Text>
            </View>

            {/* Per l'anno corrente: mostra solo il residuo anno precedente (sopra), senza blocco dettagliato */}
          </View>
        )}

        {/* Modale inserimento già rimborsato */}
        <Modal
          visible={mealReimbModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMealReimbModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBackdrop} />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
              enabled={false}
            >
              <Text style={styles.modalTitle}>Rimborso pasti (cash standard) {mealReimbModalYear ? `(${mealReimbModalYear})` : ''}</Text>
              <Text style={styles.modalSubtitle}>
                {mealReimbEditIndex !== null
                  ? 'Modifica l\'importo selezionato.'
                  : 'Inserisci l\'importo rimborsato oggi/questa volta: verrà sommato al totale (può superare il maturato).'}
              </Text>

              <View style={styles.modalInputRow}>
                <TextInput
                  value={mealReimbInput}
                  onChangeText={setMealReimbInput}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  style={styles.modalTextInput}
                />
                <Text style={styles.modalInputSuffix}>€</Text>
              </View>

              <Text style={styles.breakdownDetail}>
                Totale rimborsato finora: {formatSafeAmount(mealReimbUsePrevYearKeys ? prevYearReimbursed : mealCashStandardReimbursed)}
              </Text>

              {(mealReimbUsePrevYearKeys ? prevYearReimbursements.length : mealCashStandardReimbursements.length) > 0 && (
                <View style={{ marginTop: 12, width: '100%' }}>
                  <Text style={styles.breakdownDetail}>Inserimenti (ultimi 10):</Text>
                  {(() => {
                    const list = mealReimbUsePrevYearKeys ? prevYearReimbursements : mealCashStandardReimbursements;
                    const max = 10;
                    const start = Math.max(0, list.length - max);
                    const slice = list.slice(start);
                    return slice
                      .map((amount, localIdx) => ({
                        amount,
                        index: start + localIdx
                      }))
                      .reverse();
                  })().map((item) => {
                    const isEditing = mealReimbEditIndex === item.index;
                    const ts = getMealReimbTs(item.amount);
                    const dateLabel = ts
                      ? new Date(ts).toLocaleDateString('it-IT')
                      : null;
                    return (
                      <View
                        key={`meal-reimb-${item.index}`}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 6
                        }}
                      >
                        <Text style={styles.breakdownDetail}>
                          • {formatSafeAmount(getMealReimbAmount(item.amount))}{dateLabel ? `  (${dateLabel})` : ''}{isEditing ? ' (in modifica)' : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setMealReimbEditIndex(item.index);
                              setMealReimbInput(String(getMealReimbAmount(item.amount) || 0).replace('.', ','));
                            }}
                          >
                            <Text style={[styles.breakdownDetail, { textDecorationLine: 'underline' }]}>Modifica</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                'Elimina inserimento',
                                'Vuoi eliminare questo importo rimborsato?',
                                [
                                  { text: 'Annulla', style: 'cancel' },
                                  { text: 'Elimina', style: 'destructive', onPress: () => deleteMealReimbursement(item.index) }
                                ]
                              );
                            }}
                          >
                            <Text style={[styles.breakdownDetail, { textDecorationLine: 'underline' }]}>Elimina</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  onPress={() => setMealReimbModalVisible(false)}
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                >
                  <Text style={styles.modalButtonText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveMealReimbursed}
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {mealReimbEditIndex !== null ? 'Salva modifica' : 'Aggiungi'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Ore lavoro senza viaggio extra */}
        {(monthlyAggregated?.totalHours > 0) && ((monthlyAggregated?.ordinary?.hours?.viaggio_extra || 0) > 0) && 
         ((monthlyAggregated.totalHours - (monthlyAggregated.ordinary.hours.viaggio_extra || 0)) > 0) && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Ore senza viaggio extra</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(
                  (monthlyAggregated.totalHours || 0) - (monthlyAggregated.ordinary.hours.viaggio_extra || 0)
                )}
              </Text>
            </View>
            <Text style={styles.breakdownDetail}>
              Tutte le ore di lavoro, viaggio ordinario e reperibilità (esclude solo viaggio extra)
            </Text>
            
            {/* Suddivisione semplificata */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Composizione:</Text>
              
              <View style={styles.mealSubSection}>
                <Text style={styles.breakdownSubDetail}>• Ore totali: {formatSafeHours(monthlyAggregated.totalHours || 0)}</Text>
                <Text style={styles.breakdownSubDetail}>• Viaggio extra escluso: -{formatSafeHours(monthlyAggregated.ordinary.hours.viaggio_extra || 0)}</Text>
                <Text style={styles.breakdownSubDetail}>• Risultato netto: {formatSafeHours((monthlyAggregated.totalHours || 0) - (monthlyAggregated.ordinary.hours.viaggio_extra || 0))}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSummaryStats = () => {
    // Escludi i guadagni dei giorni fissi dalla sezione "Retribuzione" per evitare doppio conteggio con lo stipendio CCNL
    const showEffective = (settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false);
    // Calcolo deterministico: usa dailyRate * numero di giorni fissi per evitare flicker al cambio toggle
    const dailyRateForFixed = (() => {
      const contractDaily = settings?.contract?.dailyRate;
      if (typeof contractDaily === 'number' && contractDaily > 0) return contractDaily;
      const monthly = settings?.contract?.monthlySalary;
      const wd = settings?.contract?.workingDaysPerMonth || 26;
      return (monthly && wd) ? (monthly / wd) : 0;
    })();
    const fixedDaysCount = (
      (fixedDaysData?.vacation?.days || 0) +
      (fixedDaysData?.sick?.days || 0) +
      (fixedDaysData?.permit?.days || 0) +
      (fixedDaysData?.compensatory?.days || 0) +
      (fixedDaysData?.holiday?.days || 0)
    );
    const fixedSum = showEffective ? (dailyRateForFixed * fixedDaysCount) : 0;
    const adjustedTotalEarnings = Math.max(0, (monthlyAggregated?.totalEarnings || 0) - (fixedSum || 0));

    // Totale netto stimato (spostato in cima sotto il titolo riepilogo)
    const netEstimatedTotalBlock = (() => {
      // Determina se è il mese corrente
      const currentDate = new Date();
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const isCurrentMonth = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === selectedMonth;

      // Calcola il lordo previsto/totale del mese (non maturato ad oggi)
      const baseSalary = settings?.contract?.monthlySalary || 2866.96;
      const currentTotal = adjustedTotalEarnings;
      const daysWorked = monthlyAggregated?.daysWorked || 0;
      const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;

      let grossAmount;

      if (isCurrentMonth && daysWorked > 0) {
        // Mese corrente: usa il previsto fine mese (solo feriali lun-ven)
          const dailyRate = baseSalary / workingDaysInMonth;
          const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
          const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
          // Conta i festivi sui quali sono state effettivamente svolte ore di lavoro
          const dailyBreakdowns = monthlyAggregated?.dailyBreakdowns;
          let holidayWorkedWithHours = 0;
          if (dailyBreakdowns) {
            if (dailyBreakdowns instanceof Map) {
              for (const [d, v] of dailyBreakdowns) {
                const dh = v?.dailyHours || 0;
                if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(d))) holidayWorkedWithHours++;
              }
            } else if (typeof dailyBreakdowns.forEach === 'function') {
              dailyBreakdowns.forEach((v, k) => {
                const dh = v?.dailyHours || 0;
                if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(k))) holidayWorkedWithHours++;
              });
            } else {
              Object.keys(dailyBreakdowns).forEach(k => {
                const v = dailyBreakdowns[k];
                const dh = v?.dailyHours || 0;
                if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(k))) holidayWorkedWithHours++;
              });
            }
          }
          // I festivi con ore vengono considerati 'extra' e sottratti dal conteggio delle feriali
          const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayWorkedWithHours));
          const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
          const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
          grossAmount = baseSalary + realExtraEarnings;
      } else if (!isCurrentMonth && daysWorked > 0) {
        // Mese passato: calcola il totale teorico del mese (non maturato) usando solo feriali
        const dailyRate = baseSalary / workingDaysInMonth;
        const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
        const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
        // Conta i festivi sui quali sono state effettivamente svolte ore di lavoro
        const dailyBreakdowns2 = monthlyAggregated?.dailyBreakdowns;
        let holidayWorkedWithHours2 = 0;
        if (dailyBreakdowns2) {
          if (dailyBreakdowns2 instanceof Map) {
            for (const [d, v] of dailyBreakdowns2) {
              const dh = v?.dailyHours || 0;
              if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(d))) holidayWorkedWithHours2++;
            }
          } else if (typeof dailyBreakdowns2.forEach === 'function') {
            dailyBreakdowns2.forEach((v, k) => {
              const dh = v?.dailyHours || 0;
              if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(k))) holidayWorkedWithHours2++;
            });
          } else {
            Object.keys(dailyBreakdowns2).forEach(k => {
              const v = dailyBreakdowns2[k];
              const dh = v?.dailyHours || 0;
              if (dh > 0 && isItalianHoliday(parseDateOnlyToLocalDate(k))) holidayWorkedWithHours2++;
            });
          }
        }
        const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayWorkedWithHours2));
        const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
        const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
        grossAmount = baseSalary + realExtraEarnings;
      } else {
        // Fallback: usa il totale effettivo se non ci sono dati sufficienti
        grossAmount = currentTotal;
      }

      // Aggiungi i pasti cash al calcolo finale
      const cashMealsFromForm = (monthlyAggregated?.meals?.byType?.cashSpecific?.total || 0);

      if (grossAmount > 0) {
        try {
          // 💰 Usa impostazioni salvate dall'utente con default IRPEF
          const payslipSettings = {
            method: settings?.netCalculation?.method || 'irpef', // Default IRPEF
            customDeductionRate: settings?.netCalculation?.customDeductionRate || 32 // Fallback 32% realistico
          };

          // 🎯 Scelta base di calcolo: cifra presente vs stima annuale
          let calculationBase = grossAmount;
          let isEstimated = false;

          const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;

          // ✅ Se l'utente ha scelto "stima annuale", usa SEMPRE lo stipendio base
          if (!useActualAmount && settings?.contract?.monthlySalary) {
            // Usa lo stipendio base mensile per garantire percentuali consistenti
            calculationBase = settings.contract.monthlySalary;
            isEstimated = true;
          }

          const netCalculation = RealPayslipCalculator.calculateNetFromGross(calculationBase, payslipSettings);

          // Totale finale = netto + pasti cash
          const finalNetTotal = netCalculation.net + cashMealsFromForm;

          return (
            <>
              <View style={[styles.totalRow, { marginTop: 8 }]}>
                <Text style={[styles.totalLabel, { color: theme.colors.income }]}>Totale Netto Stimato</Text>
                <Text style={[styles.totalAmount, { color: theme.colors.income }]}>{formatSafeAmount(finalNetTotal)}</Text>
              </View>
              <Text style={[styles.totalSubtext, { fontSize: 12, color: theme.colors.textSecondary }]}>
                Trattenute: {formatSafeAmount(netCalculation.totalDeductions)} ({(netCalculation.deductionRate * 100).toFixed(1)}% - {payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF + INPS + Addizionali'})
              </Text>
              {cashMealsFromForm > 0 && (
                <Text style={[styles.totalSubtext, { fontSize: 11, color: theme.colors.accent, fontStyle: 'italic' }]}>
                  Include cash pasti: {formatSafeAmount(cashMealsFromForm)} (netto tasse: {formatSafeAmount(netCalculation.net)})
                </Text>
              )}
              {isEstimated && (
                <Text style={[styles.totalSubtext, { fontSize: 11, color: theme.colors.textDisabled, fontStyle: 'italic' }]}>
                  *Calcolo basato su stipendio standard (€{calculationBase.toFixed(2)}/mese)
                </Text>
              )}
              {!isEstimated && calculationBase === grossAmount && (
                <Text style={[styles.totalSubtext, { fontSize: 11, color: theme.colors.textSecondary }]}>
                  Calcolato sul {isCurrentMonth ? 'previsto fine mese' : 'totale mese'} (€{grossAmount.toFixed(2)})
                </Text>
              )}
              <Text style={styles.totalSubtext}>
                Include attività ordinarie, interventi in reperibilità e indennità (esclusi rimborsi pasti)
              </Text>
            </>
          );
        } catch (error) {
          console.warn('Errore calcolo netto:', error);
          return (
            <>
              <View style={[styles.totalRow, { marginTop: 8 }]}>
                <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Totale Netto Stimato</Text>
                <Text style={[styles.totalAmount, { color: theme.colors.textSecondary }]}>Calcolo non disponibile</Text>
              </View>
              <Text style={styles.totalSubtext}>
                Include attività ordinarie, interventi in reperibilità e indennità (esclusi rimborsi pasti)
              </Text>
            </>
          );
        }
      }

      return null;
    })();

    return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Riepilogo {selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Text>

      {netEstimatedTotalBlock}
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Giorni effettivi</Text>
          <Text style={styles.statValue}>{monthlyAggregated?.daysWorked || 0}</Text>
  </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ore totali</Text>
          <Text style={styles.statValue}>{formatSafeHours(monthlyAggregated?.totalHours || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ore senza viaggio extra</Text>
          <Text style={styles.statValue}>
            {formatSafeHours(
              (monthlyAggregated?.totalHours || 0) - (monthlyAggregated?.ordinary?.hours?.viaggio_extra || 0)
            )}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Indennità</Text>
          <Text style={styles.statValue}>
            {formatSafeAmount((monthlyAggregated?.allowances?.travel || 0) + (monthlyAggregated?.allowances?.standby || 0))}
          </Text>
        </View>

  </View>

      <View style={styles.totalSection}>
        {/* 📋 RETRIBUZIONE MENSILE - Previsto vs Effettivo */}
        <View style={[styles.educationalBreakdown, { backgroundColor: theme.colors.surface, borderRadius: 0, padding: 0, marginBottom: 16, marginLeft: 0, marginRight: 0 }]}> 
          <Text style={[styles.sectionTitle, { marginBottom: 16, color: theme.colors.text }]}>Retribuzione</Text>
          <View style={[styles.salaryRow, { backgroundColor: theme.colors.card, borderRadius: 0, paddingVertical: 12, paddingHorizontal: 0, marginBottom: 12, marginLeft: 0, marginRight: 0 }]}> 
            <View style={styles.salaryMainRow}>
              <Text style={[styles.salaryLabel, { color: theme.colors.text, fontSize: 16, fontWeight: '600' }]}>
                Stipendio CCNL ({settings?.contract?.workingDaysPerMonth || 26}gg)
              </Text>
              <Text style={[styles.salaryAmount, { color: theme.colors.text, fontSize: 16, fontWeight: 'bold' }]}>
                {formatSafeAmount(settings?.contract?.monthlySalary || 2866.96)}
              </Text>
            </View>
            <Text style={[styles.salaryNote, { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}>
              ↳ Include festivi e riposi • Base: {formatSafeAmount((settings?.contract?.monthlySalary || 2866.96) / (settings?.contract?.workingDaysPerMonth || 26))}/giorno
            </Text>
          </View>

          {/* Giorni lavorati vs pagati */}
          <View style={[styles.workDaysRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
            <Text style={[styles.workDaysLabel, { color: theme.colors.textSecondary, fontSize: 14 }]}>
              Giorni effettivamente lavorati: {monthlyAggregated?.daysWorked || 0}/{settings?.contract?.workingDaysPerMonth || 26}
            </Text>
          </View>
          
          <Text style={[styles.workDaysNote, { color: theme.colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 12 }]}>
            ↳ Esclusi giorni fissi: ferie, malattia, permessi, riposi, festivi
          </Text>

          {/* Compensi aggiuntivi - SOLO TOTALE EXTRA PURI */}
          {(() => {
            // Usa gli incassi aggiustati: escludono i giorni speciali senza ore quando il toggle è attivo
            const totalEarnings = adjustedTotalEarnings;
            const daysWorked = monthlyAggregated?.daysWorked || 0;
            const baseSalary = settings?.contract?.monthlySalary || 2866.96;
            const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
            
            if (totalEarnings <= 0 || daysWorked <= 0) return null;
            
            // Calcola la retribuzione base per i giorni feriali lavorati (lun-ven)
            const dailyRate = baseSalary / workingDaysInMonth;
            const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
            const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
            const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
            const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
            const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
            
            // Compensi extra = Totale maturato - Retribuzione base giorni lavorati
            const totalExtraEarnings = Math.max(0, totalEarnings - baseEarningsForWorkedDays);
            
              if (totalExtraEarnings > 0) {
              return (
                <View style={styles.extrasSection}>
                  <Text style={[styles.extrasTitle, { color: theme.colors.text }]}>
                    ⚡ COMPENSI AGGIUNTIVI MATURATI
                  </Text>
                  
                  <View style={styles.extraRow}>
                    <Text style={[styles.extraLabel, { color: theme.colors.textSecondary }]}> 
                      Totale compensi extra ({weekdaysWorked} giorni feriali lavorati)
                    </Text>
                    <Text style={[styles.extraAmount, { color: theme.colors.accent || theme.colors.primary }]}>
                      {formatSafeAmount(totalExtraEarnings)}
                    </Text>
                  </View>
                  
                  <Text style={[styles.extraNote, { color: theme.colors.textSecondary }]}> 
                    ↳ Esclusa retribuzione base CCNL (feriali lun-ven): {formatSafeAmount(baseEarningsForWorkedDays)}
                  </Text>
                  {/* Nota su giorni speciali senza ore: esclusi dagli extra */}
                  {settings?.showEffectiveEarningsOnSpecialNoWorkDays && (
                    <Text style={[styles.extraNote, { color: theme.colors.textSecondary }]}> 
                      Nota: la retribuzione dei giorni speciali senza ore è già coperta dallo stipendio CCNL (26gg) ed è esclusa dai compensi extra.
                    </Text>
                  )}
                </View>
              );
            }
            return null;
          })()}
          {/* Sezione comparativa: Maturato vs Previsto */}
          <View style={[styles.comparisonSection, { borderTopWidth: 2, borderTopColor: theme.colors.warning || theme.colors.accent, paddingTop: 16, marginTop: 16 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 12, color: theme.colors.text, fontSize: 16, fontWeight: '600' }]}>💳 LORDO IN BUSTA</Text>
            </View>
            {/* Lordo maturato ad oggi */}
            <View style={[styles.currentEarningsRow, { backgroundColor: theme.colors.card, borderRadius: 8, padding: 12, marginBottom: 12 }]}> 
              <View style={[styles.comparisonMainRow, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                <Text style={[styles.comparisonLabel, { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail"> 
                  💰 Lordo maturato ad oggi
                </Text>
                <View style={{ flex: 0, minWidth: 0, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 0, marginRight: 0 }}>
                  <Text style={[styles.comparisonAmount, { color: theme.colors.success || theme.colors.primary, fontSize: 16, fontWeight: 'bold' }]}> 
                    {formatSafeAmount(adjustedTotalEarnings)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.comparisonNote, { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}> 
                ↳ Basato sui giorni effettivamente lavorati
              </Text>
            </View>

            {/* Previsione fine mese */}
            {(() => {
              const baseSalary = settings?.contract?.monthlySalary || 2866.96;
              const currentTotal = adjustedTotalEarnings;
              
              // Determina se il mese è corrente o passato
              const currentDate = new Date();
              const selectedYear = selectedDate.getFullYear();
              const selectedMonth = selectedDate.getMonth();
              const isCurrentMonth = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === selectedMonth;
              
              // Se è il mese corrente, calcola una previsione
              // Se è un mese passato, mostra il totale effettivo come "previsto" (che era quello reale)
              let projectedTotal;
              let noteText;
              
              if (isCurrentMonth) {
                // Mese corrente: retribuzione mensile CCNL + extra reali accumulati fino ad oggi
                const daysWorked = monthlyAggregated?.daysWorked || 0;
                const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
                const dailyRate = baseSalary / workingDaysInMonth; // Retribuzione giornaliera CCNL
                
                if (daysWorked > 0) {
                  // Retribuzione CCNL per i soli giorni feriali lavorati (lun-ven)
                  const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
                  const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
                  const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
                  const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
                  const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
                  
                  // Extra reali = totale guadagnato - retribuzione base dei giorni lavorati
                  const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
                  
                  // PREVISTO = Retribuzione mensile completa (26 giorni) + Extra reali accumulati
                  projectedTotal = baseSalary + realExtraEarnings;
                  noteText = `↳ Stipendio CCNL (26gg) + extra reali accumulati (${weekdaysWorked}gg feriali)`;
                } else {
                  projectedTotal = baseSalary;
                  noteText = "↳ Stipendio CCNL base (nessun dato disponibile)";
                }
              } else {
                // Mese passato: calcola comunque il "totale teorico del mese"
                // = Stipendio CCNL completo + extra reali del mese
                const daysWorked = monthlyAggregated?.daysWorked || 0;
                const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
                const dailyRate = baseSalary / workingDaysInMonth;
                
                if (daysWorked > 0) {
                  // Retribuzione CCNL per i soli giorni feriali lavorati (lun-ven)
                  const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
                  const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
                  const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
                  const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
                  const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
                  
                  // Extra reali = totale guadagnato - retribuzione base dei giorni lavorati  
                  const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
                  
                  // TOTALE TEORICO = Retribuzione mensile completa + Extra reali
                  projectedTotal = baseSalary + realExtraEarnings;
                  noteText = `↳ Teorico: CCNL (26gg) + extra reali mese (${weekdaysWorked}gg feriali)`;
                } else {
                  projectedTotal = baseSalary;
                  noteText = "↳ Stipendio CCNL teorico (nessun giorno lavorato)";
                }
              }
              
              return (
                <View style={[styles.projectedEarningsRow, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.colors.border }]}> 
                  <View style={[styles.comparisonMainRow, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                    <Text style={[styles.comparisonLabel, { color: theme.colors.text, fontSize: 13, fontWeight: '600', flex: 1, flexShrink: 1, paddingHorizontal: 2 }]} numberOfLines={1} ellipsizeMode="tail"> 
                      🎯 Lordo previsto a fine mese
                    </Text>
                    <View style={{ flex: 0, minWidth: 0, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 0, marginRight: 0 }}>
                      <Text style={[styles.comparisonAmount, { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' }]}> 
                        {formatSafeAmount(projectedTotal)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.comparisonNote, { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}> 
                    {noteText}
                  </Text>
                </View>
              );
            })()}

            {/* Differenza e percentuale completamento */}
            {(() => {
              const current = adjustedTotalEarnings;
              const currentDate = new Date();
              const selectedYear = selectedDate.getFullYear();
              const selectedMonth = selectedDate.getMonth();
              const isCurrentMonth = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === selectedMonth;
              
              // Solo per il mese corrente mostra il progresso
              if (!isCurrentMonth) return null;
              
              const baseSalary = settings?.contract?.monthlySalary || 2866.96;
              const daysWorked = monthlyAggregated?.daysWorked || 0;
              const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
              
              if (daysWorked === 0) return null;
              
              // USA LA STESSA LOGICA CORRETTA del "Previsto fine mese"
              const dailyRate = baseSalary / workingDaysInMonth;
              const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
              const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
              const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
              const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
              const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
              const realExtraEarnings = Math.max(0, current - baseEarningsForWorkedDays);
              const projected = baseSalary + realExtraEarnings;
              
              const difference = projected - current;
              const completionPercentage = projected > 0 ? (current / projected * 100) : 0;
              
              if (difference > 0) {
                return (
                  <View style={[styles.progressRow, { marginTop: 12, padding: 8, backgroundColor: theme.colors.card, borderRadius: 6 }]}>
                    <Text style={[styles.progressText, { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }]}>
                      📈 Completamento: {completionPercentage.toFixed(1)}% • Mancano: {formatSafeAmount(difference)}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>

          {/* Sezione NETTO - Comparativa Maturato vs Previsto */}
          <View style={[styles.comparisonSection, { borderTopWidth: 2, borderTopColor: theme.colors.warning || theme.colors.accent, paddingTop: 16, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 12, color: theme.colors.text, fontSize: 16, fontWeight: '600' }]}>
              💳 NETTO IN BUSTA
            </Text>

            {/* Netto maturato fino ad ora */}
            {(() => {
              // Calcola il netto sulla stessa base del "Lordo maturato ad oggi" (adjustedTotalEarnings)
              // per evitare che il netto risulti superiore al lordo quando ci sono pochi inserimenti
              const payslipSettings = {
                method: settings?.netCalculation?.method || 'irpef',
                customDeductionRate: settings?.netCalculation?.customDeductionRate || 32
              };
              const currentNet = adjustedTotalEarnings > 0
                ? (RealPayslipCalculator.calculateNetFromGross(adjustedTotalEarnings, payslipSettings).net || 0)
                : 0;
              const cashMealsFromForm = (monthlyAggregated?.meals?.byType?.cashSpecific?.total || 0);
              const finalNetWithCash = currentNet + cashMealsFromForm;
              
              return (
                <View style={[styles.currentEarningsRow, { backgroundColor: theme.colors.card, borderRadius: 8, padding: 12, marginBottom: 12 }]}>
                  <View style={[styles.comparisonMainRow, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                    <Text style={[styles.comparisonLabel, { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail"> 
                      💰 Netto maturato ad oggi
                    </Text>
                    <View style={{ flex: 0, minWidth: 0, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 0, marginRight: 0 }}>
                      <Text style={[styles.comparisonAmount, { color: theme.colors.success || theme.colors.primary, fontSize: 16, fontWeight: 'bold' }]}> 
                        {formatSafeAmount(finalNetWithCash)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.comparisonNote, { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}>
                    ↳ Al netto di tasse e contributi sui giorni lavorati
                  </Text>
                  {cashMealsFromForm > 0 && (
                    <Text style={[styles.comparisonNote, { color: theme.colors.accent, fontSize: 11, fontStyle: 'italic', marginTop: 2 }]}>
                      ↳ Include cash pasti: {formatSafeAmount(cashMealsFromForm)} (netto: {formatSafeAmount(currentNet)})
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Netto previsto fine mese */}
            {(() => {
              const baseSalary = settings?.contract?.monthlySalary || 2866.96;
              const currentTotal = adjustedTotalEarnings;
              const currentNet = monthlyAggregated?.netTotalEarnings || 0;
              
              // Determina se il mese è corrente o passato
              const currentDate = new Date();
              const selectedYear = selectedDate.getFullYear();
              const selectedMonth = selectedDate.getMonth();
              const isCurrentMonth = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === selectedMonth;
              
              // Usa le impostazioni del calcolo netto dalle impostazioni
              const payslipSettings = {
                method: settings?.netCalculation?.method || 'irpef',
                customDeductionRate: settings?.netCalculation?.customDeductionRate || 32
              };
              
              let projectedNet;
              let noteText;
              
              if (isCurrentMonth) {
                // Mese corrente: calcola previsione netto
                const daysWorked = monthlyAggregated?.daysWorked || 0;
                const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
                
                if (daysWorked > 0) {
                  // Retribuzione CCNL per i soli giorni feriali lavorati (lun-ven)
                  const dailyRate = baseSalary / workingDaysInMonth;
                  const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
                  const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
                  const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
                  const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
                  const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
                  
                  // Extra reali = totale guadagnato - retribuzione base dei giorni lavorati
                  const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
                  
                  // PREVISTO LORDO = Retribuzione mensile completa + Extra reali accumulati
                  const projectedGross = baseSalary + realExtraEarnings;
                  
                  const projectedNetCalculation = RealPayslipCalculator.calculateNetFromGross(projectedGross, payslipSettings);
                  projectedNet = projectedNetCalculation.net;
                  noteText = `↳ Netto su CCNL (26gg) + extra reali (${weekdaysWorked}gg feriali) - ${payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF'}`;
                } else {
                  const baseSalaryNetCalculation = RealPayslipCalculator.calculateNetFromGross(baseSalary, payslipSettings);
                  projectedNet = baseSalaryNetCalculation.net;
                  noteText = `↳ Stipendio base al netto (${payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF'})`;
                }
              } else {
                // Mese passato: calcola il netto teorico del mese
                const daysWorked = monthlyAggregated?.daysWorked || 0;
                const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
                const dailyRate = baseSalary / workingDaysInMonth;
                
                if (daysWorked > 0) {
                  // Retribuzione CCNL per i soli giorni feriali lavorati (lun-ven)
                  const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
                  const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
                  const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
                  const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
                  const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
                  
                  // Extra reali = totale guadagnato - retribuzione base dei giorni lavorati
                  const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
                  
                  // TOTALE LORDO TEORICO = Retribuzione mensile completa + Extra reali
                  const projectedGross = baseSalary + realExtraEarnings;
                  
                  const projectedNetCalculation = RealPayslipCalculator.calculateNetFromGross(projectedGross, payslipSettings);
                  projectedNet = projectedNetCalculation.net;
                  noteText = `↳ Netto teorico: CCNL (26gg) + extra reali - ${payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF'}`;
                } else {
                  const baseSalaryNetCalculation = RealPayslipCalculator.calculateNetFromGross(baseSalary, payslipSettings);
                  projectedNet = baseSalaryNetCalculation.net;
                  noteText = `↳ Netto teorico CCNL base - ${payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF'}`;
                }
              }
              
              // Aggiungi i pasti cash inseriti direttamente nel form (non da impostazioni)
              const cashMealsFromForm = (monthlyAggregated?.meals?.byType?.cashSpecific?.total || 0);
              const finalNetWithCash = projectedNet + cashMealsFromForm;
              
              return (
                <View style={[styles.projectedEarningsRow, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.colors.border }]}>
                  <View style={[styles.comparisonMainRow, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                    <Text style={[styles.comparisonLabel, { color: theme.colors.text, fontSize: 13, fontWeight: '600', flex: 1, flexShrink: 1, paddingHorizontal: 0, paddingRight: 0, marginRight: 0 }]} numberOfLines={1} ellipsizeMode="tail"> 
                      🎯 {isCurrentMonth ? 'Netto previsto a fine mese' : 'Netto mese'}
                    </Text>
                    <View style={{ flex: 0, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 0, marginRight: 0 }}>
                      <Text style={[styles.comparisonAmount, { color: theme.colors.warning || theme.colors.accent, fontSize: 16, fontWeight: 'bold' }]}> 
                        {formatSafeAmount(finalNetWithCash)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.comparisonNote, { color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 }]}>
                    {noteText}
                  </Text>
                  {cashMealsFromForm > 0 && (
                    <Text style={[styles.comparisonNote, { color: theme.colors.accent, fontSize: 11, fontStyle: 'italic', marginTop: 2 }]}>
                      ↳ Include cash pasti: {formatSafeAmount(cashMealsFromForm)} (netto: {formatSafeAmount(projectedNet)})
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Differenza netto e percentuale completamento */}
            {(() => {
              const currentNet = monthlyAggregated?.netTotalEarnings || 0;
              const cashMealsFromForm = (monthlyAggregated?.meals?.byType?.cashSpecific?.total || 0);
              const currentNetWithCash = currentNet + cashMealsFromForm;
              
              const currentDate = new Date();
              const selectedYear = selectedDate.getFullYear();
              const selectedMonth = selectedDate.getMonth();
              const isCurrentMonth = currentDate.getFullYear() === selectedYear && currentDate.getMonth() === selectedMonth;
              
              // Solo per il mese corrente mostra il progresso
              if (!isCurrentMonth) return null;
              
              const baseSalary = settings?.contract?.monthlySalary || 2866.96;
              const currentTotal = adjustedTotalEarnings;
              const daysWorked = monthlyAggregated?.daysWorked || 0;
              const workingDaysInMonth = settings?.contract?.workingDaysPerMonth || 26;
              
              if (daysWorked === 0) return null;
              
              // Usa le stesse impostazioni del calcolo netto
              const payslipSettings = {
                method: settings?.netCalculation?.method || 'irpef',
                customDeductionRate: settings?.netCalculation?.customDeductionRate || 32
              };
              
              // USA LA STESSA LOGICA CORRETTA del "Netto previsto fine mese": solo giorni feriali (lun-ven)
              const dailyRate = baseSalary / workingDaysInMonth;
              const saturdayDays = monthlyAggregated?.analytics?.saturdayWorkDays || 0;
              const sundayDays = monthlyAggregated?.analytics?.sundayWorkDays || 0;
              const holidayDays = monthlyAggregated?.analytics?.holidayWorkDays || 0;
              const weekdaysWorked = Math.max(0, (daysWorked || 0) - (saturdayDays + sundayDays + holidayDays));
              const baseEarningsForWorkedDays = dailyRate * weekdaysWorked;
              const realExtraEarnings = Math.max(0, currentTotal - baseEarningsForWorkedDays);
              const projectedGross = baseSalary + realExtraEarnings;
              
              const projectedNetCalculation = RealPayslipCalculator.calculateNetFromGross(projectedGross, payslipSettings);
              const projectedNet = projectedNetCalculation.net;
              
              // Aggiungi i pasti cash anche al previsto
              const projectedNetWithCash = projectedNet + cashMealsFromForm;
              
              const netDifference = projectedNetWithCash - currentNetWithCash;
              const netCompletionPercentage = projectedNetWithCash > 0 ? (currentNetWithCash / projectedNetWithCash * 100) : 0;
              
              if (netDifference > 0) {
                return (
                  <View style={[styles.progressRow, { marginTop: 12, padding: 8, backgroundColor: theme.colors.card, borderRadius: 6 }]}>
                    <Text style={[styles.progressText, { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }]}>
                      📈 Completamento netto: {netCompletionPercentage.toFixed(1)}% • Mancano: {formatSafeAmount(netDifference)}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
        </View>
      </View>
    </View>
  );
  };

  const renderAnalyticsSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="chart-bar" size={24} color="#4caf50" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Analisi Performance</Text>
        </View>
        
        {/* Medie e statistiche principali */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Media ore/giorno</Text>
            <Text style={styles.analyticsValue}>{formatSafeHours(analytics.averageHoursPerDay)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Media €/giorno</Text>
            <Text style={styles.analyticsValue}>{formatSafeAmount(analytics.averageEarningsPerDay)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Tariffa media €/h</Text>
            <Text style={styles.analyticsValue}>{formatSafeAmount(analytics.averageEarningsPerHour)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Score produttività</Text>
            <Text style={[styles.analyticsValue, { 
              color: analytics.efficiency.productivityScore >= 70 ? '#4caf50' : 
                     analytics.efficiency.productivityScore >= 50 ? '#ff9800' : '#f44336' 
            }]}>
              {analytics.efficiency.productivityScore.toFixed(0)}/100
            </Text>
          </View>
        </View>

        {/* Range ore giornaliere */}
        <View style={styles.analyticsDetail}>
          <Text style={styles.analyticsDetailLabel}>Range ore giornaliere</Text>
          <Text style={styles.analyticsDetailValue}>
            {formatSafeHours(analytics.minDailyHours)} - {formatSafeHours(analytics.maxDailyHours)}
          </Text>
        </View>

        {/* Breakdown ore */}
        <View style={styles.analyticsDetail}>
          <Text style={styles.analyticsDetailLabel}>Composizione ore</Text>
          <View style={styles.hoursBreakdown}>
            <Text style={styles.hoursBreakdownItem}>
              • Regolari: {formatSafeHours(analytics?.breakdown?.regularHours || 0)} 
              ({(analytics?.breakdown?.regularHours || 0) > 0 ? (((analytics?.breakdown?.regularHours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Straordinari: {formatSafeHours(analytics?.breakdown?.overtimeHours || 0)} 
              ({(analytics?.overtimePercentage || 0).toFixed(1)}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Viaggio Extra: {formatSafeHours(analytics?.breakdown?.extraTravelHours || 0)} 
              ({(analytics?.breakdown?.extraTravelHours || 0) > 0 ? (((analytics?.breakdown?.extraTravelHours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Viaggi: {formatSafeHours(analytics?.travelHoursTotal || 0)} 
              ({(analytics?.travelHoursTotal || 0) > 0 ? (((analytics?.travelHoursTotal || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Notturne (22:00-06:00): {formatSafeHours(analytics.nightWorkHours)} 
              ({analytics.nightWorkHours > 0 ? ((analytics.nightWorkHours / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Serali (20:00-22:00): {formatSafeHours(analytics.eveningWorkHours)} 
              ({analytics.eveningWorkHours > 0 ? ((analytics.eveningWorkHours / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            {/* Ore giorni non ordinari */}
            {((analytics?.specialDaysBreakdown?.saturday?.hours || 0) + 
              (analytics?.specialDaysBreakdown?.sunday?.hours || 0) + 
              (analytics?.specialDaysBreakdown?.holiday?.hours || 0)) > 0 && (
              <>
                <Text style={styles.hoursBreakdownItem}>
                  • Sabato: {formatSafeHours(analytics?.specialDaysBreakdown?.saturday?.hours || 0)} 
                  ({(analytics?.specialDaysBreakdown?.saturday?.hours || 0) > 0 ? (((analytics?.specialDaysBreakdown?.saturday?.hours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
                </Text>
                <Text style={styles.hoursBreakdownItem}>
                  • Domenica: {formatSafeHours(analytics?.specialDaysBreakdown?.sunday?.hours || 0)} 
                  ({(analytics?.specialDaysBreakdown?.sunday?.hours || 0) > 0 ? (((analytics?.specialDaysBreakdown?.sunday?.hours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
                </Text>
                <Text style={styles.hoursBreakdownItem}>
                  • Festivi: {formatSafeHours(analytics?.specialDaysBreakdown?.holiday?.hours || 0)} 
                  ({(analytics?.specialDaysBreakdown?.holiday?.hours || 0) > 0 ? (((analytics?.specialDaysBreakdown?.holiday?.hours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderWorkPatternSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#2196f3" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Pattern di Lavoro</Text>
        </View>
        
        <View style={styles.patternGrid}>
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-check" size={20} color="#4caf50" />
            <Text style={styles.patternLabel}>Giorni consecutivi max</Text>
            <Text style={styles.patternValue}>{analytics.consecutiveWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="clock-plus" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni + di 8h totali</Text>
            <Text style={styles.patternValue}>{analytics.daysWithOvertime}/{monthlyAggregated.daysWorked}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-today" size={20} color="#3f51b5" />
            <Text style={styles.patternLabel}>Giorni sabato lavorati</Text>
            <Text style={styles.patternValue}>{analytics.saturdayWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-star" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni domenica lavorati</Text>
            <Text style={styles.patternValue}>{analytics.sundayWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="phone-alert" size={20} color="#e91e63" />
            <Text style={styles.patternLabel}>Interventi reperibilità</Text>
            <Text style={styles.patternValue}>{analytics.standbyInterventions}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="clock-start" size={20} color="#2196f3" />
            <Text style={styles.patternLabel}>Orario medio inizio</Text>
            <Text style={styles.patternValue}>{analytics.averageStartTime || '--:--'}</Text>
          </View>
        </View>

        {/* Distribuzione intensità lavorativa */}
        <View style={styles.intensitySection}>
          <Text style={styles.intensityTitle}>Distribuzione Intensità Giornaliera</Text>
          <View style={styles.intensityGrid}>
            <View style={styles.intensityItem}>
              <View style={[styles.intensityDot, { backgroundColor: '#4caf50' }]} />
              <Text style={styles.intensityLabel}>Leggera (&lt;6h)</Text>
              <Text style={styles.intensityValue}>{analytics.workIntensityDistribution.light}</Text>
            </View>
            <View style={styles.intensityItem}>
              <View style={[styles.intensityDot, { backgroundColor: '#2196f3' }]} />
              <Text style={styles.intensityLabel}>Normale (6-9h)</Text>
              <Text style={styles.intensityValue}>{analytics.workIntensityDistribution.normal}</Text>
            </View>
            <View style={styles.intensityItem}>
              <View style={[styles.intensityDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.intensityLabel}>Intensa (9-12h)</Text>
              <Text style={styles.intensityValue}>{analytics.workIntensityDistribution.intense}</Text>
            </View>
            <View style={styles.intensityItem}>
              <View style={[styles.intensityDot, { backgroundColor: '#f44336' }]} />
              <Text style={styles.intensityLabel}>Estrema (&gt;12h)</Text>
              <Text style={styles.intensityValue}>{analytics.workIntensityDistribution.extreme}</Text>
            </View>
          </View>
        </View>

        {/* Efficienza lavoro vs viaggio */}
        <View style={styles.efficiencySection}>
          <Text style={styles.efficiencyTitle}>Efficienza Lavoro/Viaggio</Text>
          <View style={styles.efficiencyBar}>
            <View 
              style={[
                styles.efficiencyFill, 
                { 
                  width: `${analytics.efficiency.workVsTravel}%`,
                  backgroundColor: analytics.efficiency.workVsTravel >= 70 ? '#4caf50' : 
                                  analytics.efficiency.workVsTravel >= 50 ? '#ff9800' : '#f44336'
                }
              ]} 
            />
          </View>
          <Text style={styles.efficiencyLabel}>
            {analytics.efficiency.workVsTravel.toFixed(1)}% tempo dedicato al lavoro effettivo
          </Text>
        </View>
      </View>
    );
  };

  const renderSpecialDaysSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    // Calcola ore totali per giorni non ordinari
    const saturdayHours = analytics?.specialDaysBreakdown?.saturday?.hours || 0;
    const sundayHours = analytics?.specialDaysBreakdown?.sunday?.hours || 0;
    const holidayHours = analytics?.specialDaysBreakdown?.holiday?.hours || 0;
    const totalSpecialHours = saturdayHours + sundayHours + holidayHours;
    const totalSpecialDays = (analytics.saturdayWorkDays || 0) + (analytics.sundayWorkDays || 0) + (analytics.holidayWorkDays || 0);

    // Calcola guadagni per giorni non ordinari
    const saturdayEarnings = analytics?.specialDaysBreakdown?.saturday?.earnings || 0;
    const sundayEarnings = analytics?.specialDaysBreakdown?.sunday?.earnings || 0;
    const holidayEarnings = analytics?.specialDaysBreakdown?.holiday?.earnings || 0;
    const totalSpecialEarnings = saturdayEarnings + sundayEarnings + holidayEarnings;

    if (totalSpecialDays === 0) return null;

    // Funzione helper per elaborare breakdown dettagliati
    const getDetailedBreakdownInfo = (detailedBreakdowns) => {
      if (!detailedBreakdowns || detailedBreakdowns.length === 0) return null;
      
      const combined = {
        hourlyRatesBreakdown: [],
        totalEarnings: 0
      };
      
      detailedBreakdowns.forEach(breakdown => {
        if (breakdown.hourlyRatesBreakdown) {
          combined.hourlyRatesBreakdown.push(...breakdown.hourlyRatesBreakdown);
        }
        combined.totalEarnings += breakdown.totalEarnings || 0;
      });
      
      return combined;
    };

    // Funzione helper: raggruppa per percentuale separando Lavoro/Viaggio
    const groupByPercentageWorkTravel = (breakdown) => {
      if (!breakdown || breakdown.length === 0) return [];
      const groups = {};

      const getIsTravel = (entry) => entry?.period?.includes('travel_') || entry?.name?.includes('Viaggio');
      const getPercentKey = (entry) => {
        if (entry?.travelCalculationType === 'FIXED_RATE') return { key: 'fixed', label: 'tariffa fissa', percent: null };
        if (typeof entry?.totalBonus === 'number') {
          const p = Math.round(entry.totalBonus);
          return { key: `p${p}`, label: `+${p}%`, percent: p };
        }
        if (entry?.rate && entry.rate !== 1) {
          const p = Math.round((entry.rate - 1) * 100);
          return { key: `p${p}`, label: `+${p}%`, percent: p };
        }
        return { key: 'p0', label: 'standard', percent: 0 };
      };

      breakdown.forEach((entry) => {
        const isTravel = !!getIsTravel(entry);
        const { key, label, percent } = getPercentKey(entry);
        const type = isTravel ? 'travel' : 'work';
        const groupKey = `${type}_${key}`;

        if (!groups[groupKey]) {
          groups[groupKey] = {
            type,
            key,
            label,
            percent,
            hours: 0,
            earnings: 0,
            hourlyRate: entry?.hourlyRate, // prendi la prima disponibile
          };
        }
        groups[groupKey].hours += entry?.hours || 0;
        groups[groupKey].earnings += entry?.earnings || 0;
        // se non c'è hourlyRate, prova a valorizzare da entry
        if (!groups[groupKey].hourlyRate && entry?.hourlyRate) {
          groups[groupKey].hourlyRate = entry.hourlyRate;
        }
      });

      // Ordina: prima Lavoro poi Viaggio; all'interno ordina per percentuale decrescente (fixed alla fine)
      const sorted = Object.values(groups).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'work' ? -1 : 1;
        // metti 'fixed' alla fine
        const aIsFixed = a.key === 'fixed';
        const bIsFixed = b.key === 'fixed';
        if (aIsFixed !== bIsFixed) return aIsFixed ? 1 : -1;
        // percentuale decrescente (null trattata come -Infinity)
        const ap = typeof a.percent === 'number' ? a.percent : -Infinity;
        const bp = typeof b.percent === 'number' ? b.percent : -Infinity;
        return bp - ap;
      });

      return sorted;
    };

    // Funzione helper per renderizzare i dettagli del breakdown
    const renderBreakdownDetails = (detailedBreakdowns, fallbackText) => {
      const breakdownInfo = getDetailedBreakdownInfo(detailedBreakdowns);
      if (!breakdownInfo || !breakdownInfo.hourlyRatesBreakdown.length) {
        return <Text style={styles.breakdownDetail}>{fallbackText}</Text>;
      }
      
      // Aggrega per percentuale separando Lavoro e Viaggio
      const aggregated = groupByPercentageWorkTravel(breakdownInfo.hourlyRatesBreakdown);

      return aggregated.map((group, index) => {
        const isTravel = group.type === 'travel';
        const backgroundColor = isTravel ? theme.colors.card : theme.colors.surface;
        const icon = isTravel ? '🚗' : '💼';
        const labelPrefix = isTravel ? 'Viaggio' : 'Lavoro';
        const labelSuffix = group.key === 'fixed' ? 'tariffa fissa' : group.label; // standard / +X%
        const hr = group.hourlyRate || hourlyRate || 0;

        return (
          <View key={index} style={[styles.breakdownItem, { marginLeft: 10, backgroundColor, padding: 8, borderRadius: 4, marginBottom: 4 }]}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {icon} {labelPrefix} {labelSuffix !== 'standard' ? `(${labelSuffix})` : ''}
              </Text>
              <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: isTravel ? '#0277bd' : '#2e7d32' }]}>
                {formatSafeHours(group.hours)}
              </Text>
            </View>
            <Text style={styles.breakdownDetail}>
              €{hr.toFixed(2)} × {formatSafeHours(group.hours)} × {labelSuffix} = €{(group.earnings || 0).toFixed(2)}
            </Text>
          </View>
        );
      });
    };

    const settings = monthlyAggregated?.settings || {};
    const hourlyRate = settings?.contract?.hourlyRate || 16.15;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderWithIcon}>
          <MaterialCommunityIcons name="calendar-star" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Giorni Non Ordinari</Text>
        </View>

        {/* 📅 TOTALE GIORNI NON ORDINARI */}
        <View style={[styles.breakdownItem, { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16 }]}>
              📅 Totale Giorni Non Ordinari
            </Text>
            <Text style={[styles.breakdownValue, { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary }]}>
              {totalSpecialDays} giorni
            </Text>
          </View>
          <Text style={styles.breakdownDetail}>
            ⏰ Totale ore: {formatSafeHours(totalSpecialHours)} • {((totalSpecialHours / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1)}% del totale
          </Text>
          <Text style={[styles.breakdownAmount, { color: theme.colors.secondary, fontWeight: 'bold', fontSize: 16 }]}>
            {formatSafeAmount(totalSpecialEarnings)}
          </Text>
        </View>

        {/* 🟠 SABATO */}
        {analytics.saturdayWorkDays > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🟠 Sabato
            </Text>
            
            {/* Totale ore sabato */}
            <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📊 Giorni Sabato Lavorati
                </Text>
                <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.warning }]}>
                  {analytics.saturdayWorkDays} giorni • {formatSafeHours(saturdayHours)}
                </Text>
              </View>
            </View>
            
            {/* Breakdown dettagliato */}
            <Text style={[styles.breakdownDetail, { marginBottom: 8, color: '#666', fontSize: 12, marginLeft: 10 }]}>
              🔍 Breakdown dettagliato ore e maggiorazioni:
            </Text>
            {renderBreakdownDetails(analytics.specialDaysBreakdown?.saturday?.detailedBreakdown, 'Calcolo dettagliato')}
            
            {/* Totale */}
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Sabato</Text>
              <Text style={[styles.breakdownTotal, { color: '#ff9800', fontWeight: 'bold' }]}>
                {formatSafeAmount(saturdayEarnings)}
              </Text>
            </View>
          </View>
        )}

        {/* 🔴 DOMENICA */}
        {analytics.sundayWorkDays > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              🔴 Domenica
            </Text>
            
            {/* Totale ore domenica */}
            <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📊 Giorni Domenica Lavorati
                </Text>
                <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.error }]}>
                  {analytics.sundayWorkDays} giorni • {formatSafeHours(sundayHours)}
                </Text>
              </View>
            </View>
            
            {/* Breakdown dettagliato */}
            <Text style={[styles.breakdownDetail, { marginBottom: 8, color: '#666', fontSize: 12, marginLeft: 10 }]}>
              🔍 Breakdown dettagliato ore e maggiorazioni:
            </Text>
            {renderBreakdownDetails(analytics.specialDaysBreakdown?.sunday?.detailedBreakdown, 'Calcolo dettagliato')}
            
            {/* Totale */}
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Domenica</Text>
              <Text style={[styles.breakdownTotal, { color: '#f44336', fontWeight: 'bold' }]}>
                {formatSafeAmount(sundayEarnings)}
              </Text>
            </View>
          </View>
        )}

        {/* 💝 FESTIVI */}
        {analytics.holidayWorkDays > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 16, marginBottom: 12 }]}>
              💝 Festivi
            </Text>
            
            {/* Totale ore festivi */}
            <View style={[styles.breakdownItem, { marginLeft: 10, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 6 }]}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📊 Giorni Festivi Lavorati
                </Text>
                <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: theme.colors.secondary }]}>
                  {analytics.holidayWorkDays} giorni • {formatSafeHours(holidayHours)}
                </Text>
              </View>
            </View>
            
            {/* Breakdown dettagliato */}
            <Text style={[styles.breakdownDetail, { marginBottom: 8, color: '#666', fontSize: 12, marginLeft: 10 }]}>
              🔍 Breakdown dettagliato ore e maggiorazioni:
            </Text>
            {renderBreakdownDetails(analytics.specialDaysBreakdown?.holiday?.detailedBreakdown, 'Calcolo dettagliato')}
            
            {/* Totale */}
            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
              <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Festivi</Text>
              <Text style={[styles.breakdownTotal, { color: '#e91e63', fontWeight: 'bold' }]}>
                {formatSafeAmount(holidayEarnings)}
              </Text>
            </View>
          </View>
        )}

        {/* TOTALE FINALE */}
        <View style={[styles.breakdownItem, { 
          marginTop: 16, 
          paddingTop: 16, 
          borderTopWidth: 2, 
          borderTopColor: theme.colors.secondary,
          backgroundColor: theme.colors.surface,
          padding: 12,
          borderRadius: 8
        }]}>
          <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 18, marginBottom: 4 }]}>
            💰 TOTALE GIORNI NON ORDINARI
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.breakdownDetail}>
              {totalSpecialDays} giorni • {formatSafeHours(totalSpecialHours)} ore totali
            </Text>
            <Text style={[styles.breakdownTotal, { fontSize: 20, fontWeight: 'bold', color: theme.colors.secondary }]}>
              {formatSafeAmount(totalSpecialEarnings)}
            </Text>
          </View>
          <Text style={[styles.breakdownDetail, { marginTop: 6, fontSize: 11, color: '#666', fontStyle: 'italic' }]}>
            ℹ️ Importo comprensivo di indennità trasferta e reperibilità
          </Text>
        </View>
      </View>
    );
  };

  const renderEarningsBreakdownSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.totalEarnings || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="cash-multiple" size={24} color="#ff9800" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Composizione Guadagni</Text>
        </View>
        
        <View style={styles.earningsBreakdown}>
          {/* Attività ordinarie */}
          <View style={styles.earningsItem}>
            <View style={styles.earningsItemHeader}>
              <View style={[styles.earningsColorBar, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.earningsItemLabel}>Attività Ordinarie</Text>
              <Text style={styles.earningsItemPercentage}>
                {(analytics?.breakdown?.ordinaryPercentage || 0).toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.earningsItemAmount}>
              {formatSafeAmount(monthlyAggregated?.ordinary?.total)}
            </Text>
          </View>

          {/* Reperibilità */}
          {(monthlyAggregated?.standby?.totalEarnings || 0) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: theme.colors.expense }]} />
                <Text style={styles.earningsItemLabel}>Reperibilità</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(analytics?.breakdown?.standbyPercentage || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated?.standby?.totalEarnings || 0)}
              </Text>
            </View>
          )}

          {/* Indennità (solo trasferte) */}
          {(monthlyAggregated?.allowances?.travel || 0) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: theme.colors.travel }]} />
                <Text style={styles.earningsItemLabel}>Indennità Trasferta</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(analytics?.breakdown?.allowancesPercentage || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated?.allowances?.travel || 0)}
              </Text>
            </View>
          )}

          {/* Giorni Non Ordinari (sabato, domenica, festivi) */}
          {(() => {
            const specialDaysEarnings = (analytics?.specialDaysBreakdown?.saturday?.earnings || 0) + 
                                      (analytics?.specialDaysBreakdown?.sunday?.earnings || 0) + 
                                      (analytics?.specialDaysBreakdown?.holiday?.earnings || 0);
            return specialDaysEarnings > 0;
          })() && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#9c27b0' }]} />
                <Text style={styles.earningsItemLabel}>Giorni Non Ordinari</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(() => {
                    const specialDaysEarnings = (analytics?.specialDaysBreakdown?.saturday?.earnings || 0) + 
                                              (analytics?.specialDaysBreakdown?.sunday?.earnings || 0) + 
                                              (analytics?.specialDaysBreakdown?.holiday?.earnings || 0);
                    const totalForPercentages = monthlyAggregated.ordinary.total + 
                                               monthlyAggregated.standby.totalEarnings + 
                                               (monthlyAggregated.allowances?.travel || 0) + 
                                               specialDaysEarnings;
                    return totalForPercentages > 0 ? (specialDaysEarnings / totalForPercentages * 100).toFixed(1) : '0.0';
                  })()}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(
                  (analytics?.specialDaysBreakdown?.saturday?.earnings || 0) + 
                  (analytics?.specialDaysBreakdown?.sunday?.earnings || 0) + 
                  (analytics?.specialDaysBreakdown?.holiday?.earnings || 0)
                )}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Renderizza il riepilogo giornaliero collassabile
  const renderDailyBreakdown = () => {
    try {
      // Aggiungi la dichiarazione analytics per compatibilità
      const analytics = monthlyAggregated?.analytics;
      
      // Calcola indennità di reperibilità dal calendario per il mese corrente
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(year, month, settings);
      
      const hasEntries = workEntries && workEntries.length > 0;
      const hasStandbyOnly = standbyAllowances && standbyAllowances.length > 0;
      
      if (!hasEntries && !hasStandbyOnly) {
        return null;
      }

      // Calcola statistiche per il mini-riepilogo usando i dati reali degli entries
      const standbyOnlyDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return workEntry?.isStandbyDay && !workEntry?.workStart1 && !workEntry?.workStart2;
        } catch (error) {
          console.error('Errore nel filtrare standbyOnlyDays:', error);
          return false;
        }
      }).length : 0;
      
      const workAndStandbyDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2);
        } catch (error) {
          console.error('Errore nel filtrare workAndStandbyDays:', error);
          return false;
        }
      }).length : 0;

      const workOnlyDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return !workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2 || workEntry?.isFixedDay);
        } catch (error) {
          console.error('Errore nel filtrare workOnlyDays:', error);
          return false;
        }
      }).length : 0;

      // Conteggio giorni non ordinari (sabato, domenica, festivi) con lavoro
      const saturdayWorkDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          const dateObj = parseDateOnlyToLocalDate(entry.date);
          const isSaturday = dateObj.getDay() === 6;
          return isSaturday && (workEntry?.workStart1 || workEntry?.workStart2);
        } catch (error) {
          console.error('Errore nel filtrare saturdayWorkDays:', error);
          return false;
        }
      }).length : 0;

      const sundayWorkDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          const dateObj = parseDateOnlyToLocalDate(entry.date);
          const isSunday = dateObj.getDay() === 0;
          return isSunday && (workEntry?.workStart1 || workEntry?.workStart2);
        } catch (error) {
          console.error('Errore nel filtrare sundayWorkDays:', error);
          return false;
        }
      }).length : 0;

      const holidayWorkDays = hasEntries ? workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          const isHoliday = calculationService?.isItalianHoliday && calculationService.isItalianHoliday(entry.date);
          return isHoliday && (workEntry?.workStart1 || workEntry?.workStart2);
        } catch (error) {
          console.error('Errore nel filtrare holidayWorkDays:', error);
          return false;
        }
      }).length : 0;

      // Aggiungi giorni di reperibilità dal calendario senza entries
      const existingEntryDates = hasEntries ? workEntries.map(entry => entry.date) : [];
      const standbyOnlyFromCalendar = standbyAllowances.filter(allowance => !existingEntryDates.includes(allowance.date)).length;
      
      const totalStandbyOnlyDays = standbyOnlyDays + standbyOnlyFromCalendar;

      // Crea array con i dati reali degli entries
      const entriesData = hasEntries ? workEntries
        .map(entry => {
          try {
            const workEntry = createWorkEntryFromData(entry);
            if (!workEntry || !entry?.date) {
              return null; // Skip invalid entries
            }
            
            const dateObj = parseDateOnlyToLocalDate(entry.date);
            if (isNaN(dateObj.getTime())) {
              return null; // Skip invalid dates
            }
            
            const dayOfMonth = dateObj.getDate() || 0;
            
            // 🔧 CALCOLO MIGLIORATO: usa dati affidabili (per data) dell'aggregazione come prima fonte
            let dailyHours = 0;
            let earnings = 0;
            let hasSavedBreakdown = false;

            // 1) Fonte preferita: breakdown salvati per data (chiave affidabile)
            try {
              if (monthlyAggregated?.dailyBreakdownsObj && monthlyAggregated.dailyBreakdownsObj[entry.date]) {
                const savedBreakdown = monthlyAggregated.dailyBreakdownsObj[entry.date];
                earnings = savedBreakdown.totalEarnings;
                dailyHours = savedBreakdown.dailyHours;
                hasSavedBreakdown = true;
                debugLog(`🔧 DAILY DEBUG - ${entry.date}: da breakdown salvati (preferito), hours=${(dailyHours || 0).toFixed(2)}, earnings=€${(earnings || 0).toFixed(2)}`);
              }
            } catch (error) {
              console.error('Errore nell\'accesso ai breakdown salvati:', error);
            }

            // 2) Fallback: array analytics indicizzati (può variare con l'ordine)
            if (!hasSavedBreakdown && !workEntry.isFixedDay && (earnings === 0 && dailyHours === 0) && monthlyAggregated?.analytics?.dailyHours && monthlyAggregated?.analytics?.dailyEarnings) {
              const entryIndex = workEntries.findIndex(we => we.id === entry.id);
              if (entryIndex >= 0 && entryIndex < monthlyAggregated.analytics.dailyHours.length) {
                dailyHours = monthlyAggregated.analytics.dailyHours[entryIndex] || 0;
                earnings = monthlyAggregated.analytics.dailyEarnings[entryIndex] || 0;
                debugLog(`🔧 DAILY DEBUG - ${entry.date}: da analytics (fallback), hours=${dailyHours.toFixed(2)}, earnings=€${earnings.toFixed(2)}`);
              }
            } else if ((hasSavedBreakdown || workEntry.isFixedDay) && (earnings === 0 && dailyHours === 0)) {
              // Evita override dei giorni fissi o con breakdown salvato (0 è autorevole per ferie/malattia/permesso/riposo)
              debugLog(`🔧 DAILY DEBUG - ${entry.date}: skip analytics fallback (${hasSavedBreakdown ? 'saved' : 'fixed day'})`);
            }

            // 3) Fallback: usa totalEarnings dal database se disponibile e > 0
            if (!hasSavedBreakdown && !workEntry.isFixedDay && earnings === 0 && entry.totalEarnings && entry.totalEarnings > 0) {
              earnings = entry.totalEarnings;
              debugLog(`🔧 DAILY DEBUG - ${entry.date}: da database (fallback), earnings=€${earnings.toFixed(2)}`);
            }
            
            // 4) Ultimo fallback: calcolo manuale
            if (!hasSavedBreakdown && !workEntry.isFixedDay && earnings === 0) {
              const safeSettings = monthlyAggregated?.settings || {
                contract: { 
                  dailyRate: 109.19,
                  hourlyRate: 16.41,
                  overtimeRates: { day: 1.2, nightUntil22: 1.25, nightAfter22: 1.35 }
                },
                standbySettings: { dailyAllowance: 7.5 },
                travelAllowance: { dailyAmount: 15.0 },
                mealAllowances: { lunch: { voucherAmount: 5.29 }, dinner: { voucherAmount: 5.29 } }
              };
              
              const hourlyRate = safeSettings.contract.hourlyRate;
              const dailyRate = safeSettings.contract.dailyRate;
              
              if (workEntry.isStandbyDay && !workEntry.workStart1 && !workEntry.workStart2) {
                // Solo reperibilità senza lavoro
                earnings = safeSettings.standbySettings.dailyAllowance;
                debugLog(`🔧 DAILY DEBUG - ${entry.date}: solo reperibilità, earnings=€${earnings.toFixed(2)}`);
              } else {
                // Calcola ore di lavoro dai dati base
                let workHours = 0;
                
                if (workEntry.workStart1 && workEntry.workEnd1) {
                  const start1 = new Date(`1970-01-01T${workEntry.workStart1}:00`);
                  const end1 = new Date(`1970-01-01T${workEntry.workEnd1}:00`);
                  if (end1 > start1) {
                    workHours += (end1 - start1) / (1000 * 60 * 60);
                  }
                }
                if (workEntry.workStart2 && workEntry.workEnd2) {
                  const start2 = new Date(`1970-01-01T${workEntry.workStart2}:00`);
                  const end2 = new Date(`1970-01-01T${workEntry.workEnd2}:00`);
                  if (end2 > start2) {
                    workHours += (end2 - start2) / (1000 * 60 * 60);
                  }
                }
                
                if (dailyHours === 0) {
                  dailyHours = workHours;
                }
                
                if (workHours > 0) {
                  // Calcolo semplificato: usa tariffa giornaliera se <= 8h, altrimenti aggiungi straordinari
                  if (workHours <= 8) {
                    earnings = dailyRate;
                  } else {
                    // Tariffa giornaliera + straordinari a +20%
                    const overtimeHours = workHours - 8;
                    earnings = dailyRate + (overtimeHours * hourlyRate * 1.2);
                  }
                  
                  // Aggiungi indennità se applicabili
                  if (workEntry.isStandbyDay) {
                    earnings += safeSettings.standbySettings.dailyAllowance;
                  }
                  if (workEntry.travelAllowance && workEntry.travelAllowancePercent) {
                    const travelAmount = safeSettings.travelAllowance.dailyAmount || 15.0;
                    earnings += (travelAmount * workEntry.travelAllowancePercent / 100);
                  }
                  if (workEntry.mealLunchVoucher) {
                    earnings += safeSettings.mealAllowances.lunch.voucherAmount;
                  }
                  if (workEntry.mealLunchCash) {
                    earnings += workEntry.mealLunchCash;
                  }
                  if (workEntry.mealDinnerVoucher) {
                    earnings += safeSettings.mealAllowances.dinner.voucherAmount;
                  }
                  if (workEntry.mealDinnerCash) {
                    earnings += workEntry.mealDinnerCash;
                  }
                  
                  debugLog(`🔧 DAILY DEBUG - ${entry.date}: calcolato manualmente, hours=${workHours.toFixed(2)}, earnings=€${earnings.toFixed(2)}`);
                }
              }
            }
          
          // Determina il tipo di giornata basandosi sui dati reali
          let dayType = 'rest';
          let typeLabel = 'Riposo';
          let typeIcon = '⭕';
          
          if (workEntry?.isFixedDay) {
            // Giorni fissi (ferie, malattia, permesso, riposo, festivo)
            const rawType = String(workEntry?.dayType || '').toLowerCase();
            switch (rawType) {
              case 'ferie':
                dayType = 'vacation';
                typeLabel = 'Ferie';
                typeIcon = '🏖️';
                break;
              case 'riposo':
                dayType = 'compensatory';
                typeLabel = 'Riposo Compensativo';
                typeIcon = '🛏️';
                break;
              case 'permesso':
                dayType = 'fixed';
                typeLabel = 'Permesso';
                typeIcon = '📅';
                break;
              case 'malattia':
                dayType = 'fixed';
                typeLabel = 'Malattia';
                typeIcon = '🏥';
                break;
              case 'festivo':
                dayType = 'fixed';
                typeLabel = 'Festivo';
                typeIcon = '🎉';
                break;
              default:
                // Fallback: mantieni compatibilità col vecchio campo siteName
                if (workEntry?.siteName && String(workEntry.siteName).toLowerCase().includes('ferie')) {
                  dayType = 'vacation';
                  typeLabel = 'Ferie';
                  typeIcon = '🏖️';
                } else if (workEntry?.siteName && String(workEntry.siteName).toLowerCase().includes('riposo')) {
                  dayType = 'compensatory';
                  typeLabel = 'Riposo Compensativo';
                  typeIcon = '🛏️';
                } else {
                  dayType = 'fixed';
                  typeLabel = 'Giorno Fisso';
                  typeIcon = '📅';
                }
                break;
            }
          } else if (workEntry?.isStandbyDay && !workEntry?.workStart1 && !workEntry?.workStart2) {
            // Solo reperibilità senza lavoro
            dayType = 'standby-only';
            typeLabel = 'Solo Reperibilità';
            typeIcon = '🟡';
          } else if (workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2)) {
            // Lavoro + reperibilità
            dayType = 'work-standby';
            typeLabel = 'Lavoro + Reperibilità';
            typeIcon = '🟠';
          } else if (workEntry?.workStart1 || workEntry?.workStart2) {
            // Lavoro - determina il tipo di giorno
            const dateObj = parseDateOnlyToLocalDate(entry.date);
            const dayOfWeek = dateObj.getDay();
            const isHoliday = calculationService?.isItalianHoliday && calculationService.isItalianHoliday(entry.date);
            
            if (isHoliday) {
              dayType = 'work-holiday';
              typeLabel = 'Lavoro Festivo';
              typeIcon = '🎉';
            } else if (dayOfWeek === 0) { // Domenica
              dayType = 'work-sunday';
              typeLabel = 'Lavoro Domenica';
              typeIcon = '🌅';
            } else if (dayOfWeek === 6) { // Sabato
              dayType = 'work-saturday';
              typeLabel = 'Lavoro Sabato';
              typeIcon = '📅';
            } else {
              dayType = 'work';
              typeLabel = 'Lavoro Ordinario';
              typeIcon = '🔵';
            }
          }
          
          return {
            dayOfMonth: Math.max(dayOfMonth, 1) || 1, // Assicura un numero valido >= 1
            dateObj,
            hours: Number(dailyHours) || 0,
            earnings: Number(earnings) || 0,
            entryData: entry,
            workEntry,
            dayType: String(dayType || 'rest'),
            typeLabel: String(typeLabel || 'N/A'),
            typeIcon: String(typeIcon || '⭕'),
          };
          
          } catch (error) {
            console.error('Errore nel processare entry:', entry?.id, error);
            return null; // Skip entries che causano errori
          }
        })
        .filter(day => day !== null) // Rimuovi entries invalide
        .sort((a, b) => (b?.dateObj || new Date()) - (a?.dateObj || new Date())) : []; // Ordina dal più recente al più vecchio

      // Aggiungi giorni di reperibilità dal calendario senza entries
      const standbyOnlyEntries = standbyAllowances
        .filter(allowance => !existingEntryDates.includes(allowance.date))
        .map(allowance => {
          const dateObj = parseDateOnlyToLocalDate(allowance.date);
          const dayOfMonth = dateObj.getDate();
          
          return {
            dateObj,
            dayOfMonth,
            hours: 0,
            earnings: allowance.allowance,
            entryData: {
              id: `standby-${allowance.date}`,
              date: allowance.date,
              type: 'standby_only',
              standbyAllowance: allowance.allowance,
              isStandbyDay: true
            },
            dayType: 'standby',
            typeLabel: 'Solo Reperibilità',
            typeIcon: '🟡',
          };
        });

      // Combina entries e giorni di reperibilità
      const dailyData = [...entriesData, ...standbyOnlyEntries]
        .sort((a, b) => (b?.dateObj || new Date()) - (a?.dateObj || new Date()));

      return (
        <View style={styles.sectionCard}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setIsDailyBreakdownExpanded(!isDailyBreakdownExpanded)}
            activeOpacity={0.7}
          >
            <View style={{width: '100%'}}>
              <View style={styles.collapsibleHeaderContent}>
                <MaterialCommunityIcons name="calendar-today" size={20} color={theme.colors.primary} />
                <Text style={styles.collapsibleTitle}>Riepilogo Giornaliero</Text>
                <MaterialCommunityIcons 
                  name={String(isDailyBreakdownExpanded ? "chevron-up" : "chevron-down")}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.miniSummary}>
                <Text style={styles.miniSummaryText}>{String(dailyData?.length || 0)} giorni totali • {String(formatSafeHours(dailyData.reduce((total, day) => total + (day?.hours || 0), 0)))} ore lavoro</Text>
                <Text style={styles.miniSummaryText}>{String(formatSafeAmount(dailyData.reduce((total, day) => total + (day?.earnings || 0), 0)))} guadagno totale</Text>
                {(totalStandbyOnlyDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`🟡 ${totalStandbyOnlyDays || 0} giorni solo reperibilità`}</Text>)}
                {(workAndStandbyDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`🟠 ${workAndStandbyDays || 0} giorni lavoro + reperibilità`}</Text>)}
                {(workOnlyDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`🔵 ${workOnlyDays || 0} giorni lavoro ordinario`}</Text>)}
                {(saturdayWorkDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`📅 ${saturdayWorkDays || 0} giorni lavoro sabato`}</Text>)}
                {(sundayWorkDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`🌅 ${sundayWorkDays || 0} giorni lavoro domenica`}</Text>)}
                {(holidayWorkDays || 0) > 0 && (<Text style={styles.miniSummaryText}>{`🎉 ${holidayWorkDays || 0} giorni lavoro festivi`}</Text>)}
              </View>
            </View>
          </TouchableOpacity>
          
          {isDailyBreakdownExpanded && (
            <View style={styles.collapsibleContent}>
              {dailyData.map((day, index) => {
                const cardStyle = getDayCardStyle(day?.dayType);
                return (
                  <TouchableOpacity 
                    key={`${day?.dateObj?.getTime() || index}-${index}`} 
                    style={[styles.dailyListItem, cardStyle]}
                    onPress={() => navigation.navigate('TimeEntry', { 
                      screen: 'TimeEntryForm', 
                      params: { 
                        isEdit: true, 
                        entry: {
                          // Unisci dati raw e trasformati per compatibilità completa
                          ...day?.entryData,
                          ...day?.workEntry, 
                          id: day?.entryData?.id, // Assicura che l'ID sia dal DB
                          date: day?.entryData?.date // Assicura che la data sia dal DB
                        },
                        enableDelete: true 
                      } 
                    })}
                    activeOpacity={0.7}
                >
                  <View style={{width: '100%'}}>
                    <View style={styles.dailyListHeader}>
                      <View style={styles.dailyListDate}>
                        <Text style={styles.dailyListDay}>{String(day?.dayOfMonth || '')}</Text>
                        <Text style={styles.dailyListDateText}>{String(day?.dateObj?.toLocaleDateString?.('it-IT', { weekday: 'short' })) || ''}</Text>
                      </View>
                      <View style={styles.dailyListType}>
                        <Text style={styles.dailyListTypeIcon}>{String(day?.typeIcon || '')}</Text>
                        <Text style={styles.dailyListTypeText}>{String(day?.typeLabel || '')}</Text>
                      </View>
                      <View style={styles.dailyListStats}>
                        <Text style={styles.dailyListHours}>{String(formatSafeHours(day?.hours || ''))}</Text>
                        {(() => {
                          const specialTypes = ['vacation','compensatory','fixed'];
                          const isSpecialDayType = specialTypes.includes(String(day?.dayType || ''));
                          const noWorkHours = (day?.hours || 0) <= 0;
                          const showEffective = (settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false);
                          if (isSpecialDayType && noWorkHours && !showEffective) {
                            return null;
                          }
                          return <Text style={styles.dailyListEarnings}>{String(formatSafeAmount(day?.earnings || ''))}</Text>;
                        })()}
                      </View>
                    </View>
                    <View style={styles.dailyListDetails}>
                      {(day?.workEntry?.isStandbyDay === true || day?.workEntry?.isStandbyDay === 1 || day?.workEntry?.isStandbyDay === '1') && (<Text style={styles.dailyListDetail}>🟡 Reperibilità</Text>)}
                      {!(day?.dayType === 'vacation' || day?.dayType === 'compensatory' || day?.dayType === 'fixed') &&
                       day?.workEntry?.completamentoGiornata && String(day.workEntry.completamentoGiornata).toLowerCase() !== 'nessuno' && String(day.workEntry.completamentoGiornata).trim() !== '' && (() => {
                        const c = String(day.workEntry.completamentoGiornata || '').toLowerCase();
                        const completionLabel = c === 'riposo' ? '🛌 Riposo Compensativo' :
                          c === 'ferie' ? '🏖️ Ferie' :
                          c === 'malattia' ? '🏥 Malattia' :
                          c === 'permesso' ? '📅 Permesso' :
                          c === 'festivo' ? '🎉 Festivo' :
                          String(day.workEntry.completamentoGiornata || '');

                        const completionBg = c === 'riposo' ? '#f3e5f5' :
                          c === 'ferie' ? '#e8f5e9' :
                          c === 'malattia' ? '#fff3e0' :
                          c === 'permesso' ? '#e3f2fd' :
                          c === 'festivo' ? '#ffebee' :
                          '#eceff1';

                        const completionTextColor = c === 'riposo' ? '#6a1b9a' :
                          c === 'ferie' ? '#2e7d32' :
                          c === 'malattia' ? '#ef6c00' :
                          c === 'permesso' ? '#1565c0' :
                          c === 'festivo' ? '#c62828' :
                          theme.colors.text;

                        return (
                          <View style={{ backgroundColor: completionBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 2 }}>
                            <Text style={[styles.dailyListDetail, { color: completionTextColor, marginBottom: 0 }]}>Giornata completata con: {completionLabel}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                </TouchableOpacity>
                );
              })}
              
              {(dailyData?.length || 0) === 0 && (
                <View style={styles.emptyDailyList}>
                  <Text style={styles.emptyDailyText}>Nessuna attività registrata questo mese</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('Errore nella renderizzazione del riepilogo giornaliero:', error);
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Riepilogo Giornaliero</Text>
          <Text style={styles.errorText}>Errore nel caricamento dei dati</Text>
        </View>
      );
    }
  };



  const renderWorkPatternsSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#4caf50" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Pattern Lavorativo</Text>
        </View>
        
        <View style={styles.patternGrid}>
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni weekend</Text>
            <Text style={styles.patternValue}>{analytics.weekendWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="phone-alert" size={20} color="#e91e63" />
            <Text style={styles.patternLabel}>Interventi reperibilità</Text>
            <Text style={styles.patternValue}>{analytics?.standbyInterventions || 0}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#3f51b5" />
            <Text style={styles.patternLabel}>Giorni sabato lavorati</Text>
            <Text style={styles.patternValue}>{analytics?.saturdayWorkDays || 0}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-star" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni domenica lavorati</Text>
            <Text style={styles.patternValue}>{analytics?.sundayWorkDays || 0}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="car" size={20} color="#795548" />
            <Text style={styles.patternLabel}>
              Incidenza reperibilità: {(analytics?.standbyWorkRatio || 0).toFixed(1)}% del totale
            </Text>
            <Text style={styles.standbyRatioSubtext}>
              {analytics?.standbyInterventions || 0} interventi su {monthlyAggregated?.daysWorked || 0} giorni lavorati
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFixedDaysSection = () => {
    if (fixedDaysLoading || !fixedDaysData || fixedDaysData.totalDays === 0) return null;
  const showEffective = (settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false);

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="beach" size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Ferie e Permessi</Text>
        </View>
        
        <View style={styles.fixedDaysGrid}>
          {fixedDaysData.vacation.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="beach" size={20} color={theme.colors.success} />
              <Text style={styles.fixedDayLabel}>Ferie</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.vacation.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{!showEffective ? '' : (typeof fixedDaysData.vacation.earnings === 'string' ? fixedDaysData.vacation.earnings : formatSafeAmount(fixedDaysData.vacation.earnings))}</Text>
            </View>
          )}
          
          {fixedDaysData.sick.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="medical-bag" size={20} color={theme.colors.warning} />
              <Text style={styles.fixedDayLabel}>Malattia</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.sick.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{!showEffective ? '' : (typeof fixedDaysData.sick.earnings === 'string' ? fixedDaysData.sick.earnings : formatSafeAmount(fixedDaysData.sick.earnings))}</Text>
            </View>
          )}
          
          {fixedDaysData.permit.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.colors.info} />
              <Text style={styles.fixedDayLabel}>Permesso</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.permit.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{!showEffective ? '' : (typeof fixedDaysData.permit.earnings === 'string' ? fixedDaysData.permit.earnings : formatSafeAmount(fixedDaysData.permit.earnings))}</Text>
            </View>
          )}
          
          {fixedDaysData.compensatory.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="clock-time-eight" size={20} color={theme.colors.overtime} />
              <Text style={styles.fixedDayLabel}>Riposo Comp.</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.compensatory.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{!showEffective ? '' : (typeof fixedDaysData.compensatory.earnings === 'string' ? fixedDaysData.compensatory.earnings : formatSafeAmount(fixedDaysData.compensatory.earnings))}</Text>
            </View>
          )}
          
          {fixedDaysData.holiday.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="calendar-star" size={20} color={theme.colors.error} />
              <Text style={styles.fixedDayLabel}>Festivi</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.holiday.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{!showEffective ? '' : (typeof fixedDaysData.holiday.earnings === 'string' ? fixedDaysData.holiday.earnings : formatSafeAmount(fixedDaysData.holiday.earnings))}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.fixedDaysSummary}>
          <Text style={styles.fixedDaysSummaryText}>
            Totale: {fixedDaysData.totalDays} giorni{showEffective ? ` - ${formatSafeAmount(fixedDaysData.totalEarnings)}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderCompletionSection = () => {
    if (completionLoading || !completionData || completionData.totalEntries === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="clipboard-list" size={24} color={theme.colors.overtime} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Giorni in Completamento</Text>
        </View>

        {/* Lista dettagliata giorni completati */}
        {completionData.details && completionData.details.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {completionData.details.map((item, idx) => (
              <View key={item.date + '-' + idx} style={[styles.breakdownRow, { borderBottomWidth: 0.5, borderColor: theme.colors.border, paddingVertical: 4 }]}> 
                <Text style={[styles.breakdownLabel, { flex: 1 }]}>{item.date}</Text>
                <Text style={[styles.breakdownLabel, { flex: 1 }]}> 
                  {item.type === 'ferie' ? '🏖️ Ferie' :
                   item.type === 'malattia' ? '🏥 Malattia' :
                   item.type === 'permesso' ? '📅 Permesso' :
                   item.type === 'riposo' ? '🛌 Riposo Compensativo' : item.type}
                </Text>
                <Text style={[styles.breakdownValue, { flex: 1, textAlign: 'right' }]}>{item.hours.toFixed(1)} h</Text>
              </View>
            ))}
          </View>
        )}

        {/* Riepilogo totale e per tipologia */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Totale giorni</Text>
            <Text style={styles.breakdownValue}>{completionData.totalEntries}</Text>
          </View>
          <Text
            style={[styles.breakdownDetail, { flexWrap: 'nowrap', flexShrink: 1 }]}
            numberOfLines={1}
            ellipsizeMode='clip'
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {completionData.totalCompletionDays} giorni
            {completionData.totalCompletionExtraHours > 0
              ? ` + ${completionData.totalCompletionExtraHours} ore`
              : ''}
            {` (${completionData.totalCompletionHours.toFixed(1)} ore totali in completamento)`}
          </Text>
        </View>

        {Object.entries(completionData.byType || {}).map(([tipo, data]) => (
          <View key={tipo} style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {tipo === 'ferie' ? '🏖️ Ferie' : 
                 tipo === 'malattia' ? '🏥 Malattia' : 
                 tipo === 'permesso' ? '📅 Permesso' : 
                 tipo === 'riposo' ? '🛌 Riposo Compensativo' : tipo}
              </Text>
              <Text style={styles.breakdownValue}>
                {data.count} giorni
                {data.extraHours > 0 ? ` + ${data.extraHours} ore` : ''}
              </Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {data.totalHours.toFixed(1)} ore totali
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Debug rimosso per evitare errori di scope con safeSettings

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento dati...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAnyMonthData =
    (workEntries?.length || 0) > 0 ||
    (fixedDaysData?.totalDays || 0) > 0 ||
    (completionData?.totalEntries || 0) > 0 ||
    (monthlyAggregated?.totalEarnings || 0) > 0 ||
    (monthlyAggregated?.allowances?.standbyDays || 0) > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android'
              ? StatusBar.currentHeight || 0
              : Math.max(2, insets.top - 10),
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>Mensile</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                style={styles.pdfButton} 
                onPress={() => navigation.navigate('YearlyReport')}
                disabled={loading || refreshing}
              >
                <MaterialCommunityIcons 
                  name="chart-box" 
                  size={24} 
                  color={loading || refreshing ? theme.colors.textSecondary : theme.colors.primary} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={() => captureAndShare(screenshotRef)}
                disabled={loading || refreshing}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={24}
                  color={loading || refreshing ? theme.colors.textSecondary : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.monthNavigation}>
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToPreviousMonth}
          >
            <View>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.monthTitleContainer} onPress={goToCurrentMonth}>
            <View style={{alignItems: 'center'}}>
              <Text style={styles.monthTitle}>
                {formatMonthYear(selectedDate)}
              </Text>
              {selectedDate.getMonth() !== currentDate.getMonth() || 
               selectedDate.getFullYear() !== currentDate.getFullYear() ? (
                <Text style={styles.currentMonthIndicator}>Tocca per tornare al mese corrente</Text>
              ) : null}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToNextMonth}
          >
            <View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        automaticallyAdjustKeyboardInsets={false}
      >
        <View ref={screenshotRef} collapsable={false}>
        {hasAnyMonthData ? (
          <>
            {renderSummaryStats()}
            {renderAllowancesSection()}
            {renderAnalyticsSection()}
            {renderWorkPatternSection()}
            {renderEarningsBreakdownSection()}
            {renderOrdinarySection()}
            {renderSpecialDaysSection()}
            {renderStandbySection()}
            {/* Card Ferie/Permessi rimossa su richiesta */}
            {renderCompletionSection()}
            {renderDailyBreakdown()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nessun dato per questo mese</Text>
            <Text style={styles.emptySubtitle}>
              Usa il pulsante + per aggiungere il tuo primo orario di lavoro
            </Text>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Pulsante flottante per aggiungere nuovo orario */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TimeEntry', { 
          screen: 'TimeEntryForm' 
        })}
        activeOpacity={0.8}
      >
        <View>
          <Ionicons name="add" size={24} color="white" />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    backgroundColor: theme.colors.card,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    ...theme.colors.cardElevation,
  },
  headerTop: {
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: theme.name === 'dark' ? `${theme.colors.primary}22` : `${theme.colors.primary}14`,
    borderWidth: 1,
    borderColor: theme.name === 'dark' ? `${theme.colors.primary}55` : `${theme.colors.primary}22`,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pdfButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthNavButton: {
    padding: 3,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  currentMonthIndicator: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 0,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginTop: 3,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    ...theme.colors.cardElevation,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    width: '48%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  
  // 📋 STILI PER STRUTTURA EDUCATIVA RETRIBUZIONE
  educationalBreakdown: {
    // Contenitore principale per il breakdown educativo
  },
  salaryRow: {
    // Riga dello stipendio CCNL fisso
    paddingHorizontal: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  salaryMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryLabel: {
    // Stili per etichetta stipendio
  },
  salaryAmount: {
    // Stili per importo stipendio
  },
  salaryNote: {
    // Stili per nota esplicativa
  },
  workDaysRow: {
    // Riga giorni lavorati vs pagati
  },
  workDaysLabel: {
    // Etichetta giorni lavorati
  },
  workHoursInfo: {
    // Info ore totali
  },
  extrasSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  extrasTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 4,
  width: '100%',
  },
  extraLabel: {
  fontSize: 13,
  flex: 1,
  flexShrink: 1,
  flexWrap: 'wrap',
  paddingRight: 8,
  },
  extraAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  flexShrink: 0,
  minWidth: 84,
  maxWidth: 140,
  textAlign: 'right',
  alignSelf: 'flex-start',
  },
  extraNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  totalFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalFinalLabel: {
    // Etichetta totale finale
  },
  totalFinalAmount: {
    // Importo totale finale
  },
  
  // Nuovi stili per la sezione comparativa
  comparisonSection: {
    marginTop: 16,
    paddingHorizontal: 0, // nessun padding orizzontale
    width: '100%',
    alignSelf: 'stretch',
    maxWidth: undefined, // nessun limite
  },
  currentEarningsRow: {
    flexDirection: 'column',
    paddingTop: 8, // più spazio tra titolo e importo
    paddingBottom: 4,
  },
  projectedEarningsRow: {
    flexDirection: 'column',
    paddingTop: 8, // più spazio tra titolo e importo
    paddingBottom: 4,
  },
  comparisonMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8, // più spazio ai lati
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 13.5, // ancora più piccolo
    fontWeight: '600',
    flexShrink: 1,
  },
  comparisonAmount: {
    textAlign: 'right',
    fontSize: 13.5, // ancora più piccolo
    fontWeight: 'bold',
    flexShrink: 0,
    minWidth: 90, // forza spazio per l'importo
  },
  comparisonNote: {
    marginTop: 4,
    fontSize: 11.5, // leggermente più piccolo
  },
  progressRow: {
    marginTop: 8,
  },
  progressText: {
    textAlign: 'center',
  },
  
  totalSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    ...theme.colors.cardElevation,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  breakdownDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    marginTop: 2,
  },
  breakdownSubItems: {
    marginLeft: 8,
    marginTop: 4,
  },
  breakdownSubDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 16,
    marginTop: 1,
  },
  mealDetail: {
    marginLeft: 8,
    marginTop: 4,
  },
  mealSubSection: {
    marginLeft: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  mealResidualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.cardShadow,
    opacity: theme.name === 'dark' ? 0.7 : 0.45,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    marginBottom: 14,
  },
  modalTextInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
  modalInputSuffix: {
    color: theme.colors.textSecondary,
    marginLeft: 8,
    fontSize: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    marginLeft: 10,
  },
  modalButtonSecondary: {
    backgroundColor: theme.colors.surface,
  },
  modalButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: theme.name === 'dark' ? theme.colors.text : theme.colors.background,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
    paddingTop: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.textDisabled,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Nuovi stili per le sezioni analytics
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsItem: {
    width: '48%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  analyticsLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  analyticsDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  analyticsDetailLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  analyticsDetailValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  hoursBreakdown: {
    marginTop: 8,
  },
  hoursBreakdownItem: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  // Stili per la sezione pattern lavorativo
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  patternItem: {
    width: '48%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  patternValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },

  efficiencySection: {
    marginTop: 8,
  },
  efficiencyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  efficiencyBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 4,
  },
  efficiencyLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // Stili per la distribuzione intensità
  intensitySection: {
    marginTop: 16,
    marginBottom: 8,
  },
  intensityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 12,
  },
  intensityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  intensityItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  intensityLabel: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  intensityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    minWidth: 20,
    textAlign: 'right',
  },
  // Stili per la sezione breakdown guadagni
  earningsBreakdown: {
    marginBottom: 16,
  },
  earningsItem: {
    marginBottom: 12,
  },
  earningsItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  earningsItemLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  earningsItemPercentage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  earningsItemAmount: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  standbyRatioSection: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  standbyRatioLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  standbyRatioSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  fixedDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fixedDayItem: {
    width: '48%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  fixedDayLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
  },
  fixedDayValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  fixedDayAmount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  fixedDaysSummary: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  fixedDaysSummaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  
  // Stili per il riepilogo giornaliero collassabile
  collapsibleHeader: {
    flexDirection: 'column',
    padding: 16,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 8,
  },
  miniSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  miniSummaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  collapsibleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Nuovi stili per lista verticale
  dailyListItem: {
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dailyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyListDate: {
    flex: 1,
    alignItems: 'center',
  },
  dailyListDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dailyListDateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  dailyListType: {
    flex: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dailyListTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dailyListTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dailyListStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dailyListHours: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dailyListEarnings: {
    fontSize: 12,
    color: theme.colors.income,
    fontWeight: '500',
  },
  dailyListDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dailyListDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    paddingLeft: 4,
  },
  emptyDailyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDailyText: {
    fontSize: 14,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  // Vecchi stili mantenuti per compatibilità 
  dailyScrollView: {
    maxHeight: 120,
    marginTop: 12,
  },
  dailyScrollContent: {
    paddingHorizontal: 4,
  },
  dailyItem: {
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 2,
  },
  dailyDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dailyHours: {
    fontSize: 11,
    color: '#2196f3',
    fontWeight: '600',
    marginBottom: 2,
  },
  dailyEarnings: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '500',
  },
  dailyLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default DashboardScreen;
