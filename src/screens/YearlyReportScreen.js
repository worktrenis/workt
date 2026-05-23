import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import FixedDaysService from '../services/FixedDaysService';
import { useCalculationService, useSettings } from '../hooks';
import { formatCurrency, parseDateOnlyToLocalDate } from '../utils';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import RealPayslipCalculator from '../services/RealPayslipCalculator';
import VacationService from '../services/VacationService';
import { isItalianHoliday } from '../constants/holidays';

const { width } = Dimensions.get('window');

const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const monthNamesFull = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const YearlyReportScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const calculationService = useCalculationService();
  const { settings, isLoading: settingsLoading } = useSettings();
  const styles = createStyles(theme);

  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyData, setMonthlyData] = useState({});
  const [earningsMode, setEarningsMode] = useState('netto'); // 'totale' | 'netto'
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [monthEntries, setMonthEntries] = useState({});
  const [loadingMonthEntries, setLoadingMonthEntries] = useState(false);
  const [vacationSettings, setVacationSettings] = useState(null);
  const calcSeqRef = useRef(0);
  const tableHeaderScrollRef = useRef(null);
  const tableBodyScrollRef = useRef(null);
  const doubleTapTimestamps = useRef({});

  const toDateKey = (value) => {
    const d = parseDateOnlyToLocalDate(value);
    if (!d || isNaN(d.getTime())) return String(value || '');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayOfMonthNumber = (value) => {
    const d = parseDateOnlyToLocalDate(value);
    if (!d || isNaN(d.getTime())) return null;
    return d.getDate();
  };

  const isStandbyActiveFromEntry = (entry, workEntry) => {
    const manualOff =
      workEntry?.isStandbyDay === false ||
      workEntry?.isStandbyDay === 0 ||
      workEntry?.isStandbyDay === '0' ||
      entry?.isStandbyDay === false ||
      entry?.isStandbyDay === 0 ||
      entry?.isStandbyDay === '0' ||
      entry?.is_standby_day === false ||
      entry?.is_standby_day === 0 ||
      entry?.is_standby_day === '0';

    if (manualOff) return false;

    return (
      workEntry?.isStandbyDay === true ||
      workEntry?.isStandbyDay === 1 ||
      workEntry?.isStandbyDay === '1' ||
      entry?.isStandbyDay === true ||
      entry?.isStandbyDay === 1 ||
      entry?.isStandbyDay === '1' ||
      entry?.is_standby_day === true ||
      entry?.is_standby_day === 1 ||
      entry?.is_standby_day === '1'
    );
  };

  const loadYearData = async () => {
    if (!settings) return;
    const calcSeq = ++calcSeqRef.current;
    
    // Costruisce safeSettings identico al Dashboard per ottenere gli stessi risultati
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
        overtimeLimit: { hours: 8, type: 'daily' }
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
      ...settings,
      contract: { ...defaultSettings.contract, ...(settings.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings.mealAllowances || {}) },
      travelHoursSetting: settings.travelHoursSetting || 'TRAVEL_RATE_EXCESS',
      multiShiftTravelAsWork: settings.multiShiftTravelAsWork || false,
    };

    try {
      setLoading(true);
      const data = {};

      // Carica i mesi in sequenza (non parallelo) per evitare lock del DB
      for (let month = 1; month <= 12; month++) {
        if (calcSeq !== calcSeqRef.current) {
          return;
        }
        try {
          const entries = await DatabaseService.getWorkEntries(year, month);
          const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(year, month, safeSettings) || [];
          
          const monthData = {
            month,
            totalHours: 0,
            totalEarnings: 0,
            workDays: 0,
            _standbyDays: 0,
            _standbyWeekdayDays: 0,
            _standbySaturdayDays: 0,
            _standbySundayDays: 0,
            _standbyHolidayDays: 0,
            _standbyInterventions: 0,
          };

          if (entries && entries.length > 0) {
            let totalHours = 0;
            let totalEarnings = 0;
            // Analytics identici al Dashboard:
            // - saturdayWorkDays/sundayWorkDays/holidayWorkDays contati su TUTTI gli entry (anche fissi)
            // - effectiveWorkDays (daysWorked) conta solo i NON-fissi
            let saturdayDays = 0;
            let sundayDays = 0;
            let holidayWorkDays = 0;
            let cashMealsTotal = 0;
            let effectiveWorkDays = 0;
            let mealLunchVoucher = 0;
            let mealLunchCashWithVoucher = 0;
            let mealLunchCashOnly = 0;
            let mealDinnerVoucher = 0;
            let mealDinnerCashWithVoucher = 0;
            let mealDinnerCashOnly = 0;
            let travelAllowanceAmount = 0;
            let travelAllowanceDays = 0;
            let festivoFull = 0;
            let festivoPartial = 0;
            let ferieFull = 0;
            let feriePartial = 0;
            let permessoFull = 0;
            let permessoPartial = 0;
            let malattiaFull = 0;
            let malattiaPartial = 0;
            let riposoCompFull = 0;
            let riposoCompPartial = 0;
            let mealLunchVoucherCount = 0;
            let mealLunchCashWithVoucherCount = 0;
            let mealLunchCashOnlyCount = 0;
            let mealDinnerVoucherCount = 0;
            let mealDinnerCashWithVoucherCount = 0;
            let mealDinnerCashOnlyCount = 0;
            // Ore viaggio e straordinari
            let travelHoursTotal = 0;
            let travelInRegular = 0;
            const overtimeByPercentage = {};
            // Composizione ore (come Dashboard)
            let regularWorkHours = 0;
            let overtimeWorkHours = 0;
            let travelRegularHours = 0;
            let travelExtraHours = 0;
            let saturdayHours = 0;
            let sundayHours = 0;
            let holidayHours = 0;
            let standbyDays = 0;
            let standbyWeekdayDays = 0;
            let standbySaturdayDays = 0;
            let standbySundayDays = 0;
            let standbyHolidayDays = 0;
            const standbyDaysSet = new Set();
            const standbyWeekdayDaysSet = new Set();
            const standbySaturdayDaysSet = new Set();
            const standbySundayDaysSet = new Set();
            const standbyHolidayDaysSet = new Set();
            let standbyInterventions = 0;
            let standbyNightHours = 0;
            let standbyEveningHours = 0;
            // supplementi per fascia oraria (identico al Dashboard)
            const supplementsByTimeRange = {};

            for (const entry of entries) {
              try {
                const workEntry = createWorkEntryFromData(entry);
                const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
                if (!breakdown) continue;

              // Calcolo ore identico al Dashboard
              const dailyHours =
                Object.values(breakdown.ordinary?.hours || {}).reduce((a, b) => a + b, 0) +
                Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
              totalHours += dailyHours;
              totalEarnings += breakdown.totalEarnings || 0;

              // Ore viaggio totali (ordinary)
              const entryTravelHours = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + (breakdown.ordinary?.hours?.viaggio_extra || 0);
              travelHoursTotal += entryTravelHours;

              // Usa i valori già calcolati da CalculationService (= come è pagato con le settings reali)
              const entryDate = parseDateOnlyToLocalDate(entry.date);
              const dow = entryDate.getDay();
              const isSaturday = breakdown.details?.isSaturday ?? (dow === 6);
              const isSunday   = breakdown.details?.isSunday   ?? (dow === 0);
              const isHolidayDay = breakdown.details?.isHoliday ?? isItalianHoliday(entryDate);
              const isSpecialDay = isSaturday || isSunday || isHolidayDay;

              // specialDayMultiplier è il moltiplicatore che CalculationService ha effettivamente usato
              // (es. 1.25 sabato, 1.30 domenica/festivo) — calcolato dalle settings dell'utente, non da default
              const specialMult = breakdown.details?.specialDayMultiplier ?? (
                isSpecialDay
                  ? (isSaturday
                      ? (safeSettings.contract?.overtimeRates?.saturday ?? 1)
                      : (safeSettings.contract?.overtimeRates?.holiday ?? 1))
                  : 1
              );
              const routeToOvertime = isSpecialDay && specialMult > 1 && !breakdown.details?.isFixedDay;

              if (routeToOvertime) {
                const hrBreakdown = breakdown.details?.hourlyRatesBreakdown || [];
                if (hrBreakdown.length > 0) {
                  // Accumula per %, lavoro + viaggio insieme alla stessa %
                  for (const fascia of hrBreakdown) {
                    if ((fascia.hours || 0) <= 0) continue;
                    const rate = Number.isFinite(fascia.rate) && fascia.rate > 0 ? fascia.rate : specialMult;
                    const pctLabel = '+' + Math.round((rate - 1) * 100) + '%';
                    if (!overtimeByPercentage[pctLabel]) overtimeByPercentage[pctLabel] = { hours: 0, amount: 0, rate };
                    overtimeByPercentage[pctLabel].hours += fascia.hours;
                    overtimeByPercentage[pctLabel].amount += fascia.earnings || 0;
                    overtimeWorkHours += fascia.hours;
                  }
                } else {
                  // Fallback: nessuna fascia, usa totale con multiplier del giorno
                  const allHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0)
                    + (breakdown.ordinary?.hours?.lavoro_extra || 0)
                    + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0)
                    + (breakdown.ordinary?.hours?.viaggio_extra || 0);
                  overtimeWorkHours += allHours;
                  const pctLabel = '+' + Math.round((specialMult - 1) * 100) + '%';
                  if (!overtimeByPercentage[pctLabel]) overtimeByPercentage[pctLabel] = { hours: 0, amount: 0, rate: specialMult };
                  overtimeByPercentage[pctLabel].hours += allHours;
                  overtimeByPercentage[pctLabel].amount += breakdown.totalEarnings || 0;
                }
              } else {
                regularWorkHours  += breakdown.ordinary?.hours?.lavoro_giornaliera || 0;
                const extraH = breakdown.ordinary?.hours?.lavoro_extra || 0;
                overtimeWorkHours += extraH;
                // Accumula percentuali straordinari feriali
                if (extraH > 0) {
                  let accPct = false;
                  // 1) Prova da breakdown.details.dailyRateBreakdown.overtimeBreakdown (metodo DAILY_RATE_WITH_SUPPLEMENTS)
                  const bkdOvt = breakdown.details?.dailyRateBreakdown?.overtimeBreakdown || [];
                  for (const ob of bkdOvt) {
                    if (ob.breakdown) {
                      for (const ot of ob.breakdown) {
                        if ((ot.hours || 0) <= 0) continue;
                        const r = ot.rate || 1;
                        const pct = '+' + Math.round((r - 1) * 100) + '%';
                        if (!overtimeByPercentage[pct]) overtimeByPercentage[pct] = { hours: 0, amount: 0, rate: r };
                        overtimeByPercentage[pct].hours += ot.hours;
                        overtimeByPercentage[pct].amount += ot.amount || 0;
                        accPct = true;
                      }
                    }
                  }
                  // 2) Prova da hourlyRatesBreakdown (metodo orario puro) — solo fasce con rate > 1
                  if (!accPct && breakdown.details?.hourlyRatesBreakdown?.length > 0) {
                    for (const f of breakdown.details.hourlyRatesBreakdown) {
                      if ((f.hours || 0) <= 0) continue;
                      const r = Number.isFinite(f.rate) && f.rate > 0 ? f.rate : 1;
                      if (r <= 1) continue; // solo fasce con maggiorazione
                      const pct = '+' + Math.round((r - 1) * 100) + '%';
                      if (!overtimeByPercentage[pct]) overtimeByPercentage[pct] = { hours: 0, amount: 0, rate: r };
                      overtimeByPercentage[pct].hours += f.hours;
                      overtimeByPercentage[pct].amount += f.earnings || 0;
                      accPct = true;
                    }
                  }
                  // 3) Fallback: usa contract.overtimeRates.day
                  if (!accPct) {
                    const dayRate = safeSettings.contract?.overtimeRates?.day || 1.2;
                    const pct = '+' + Math.round((dayRate - 1) * 100) + '%';
                    if (!overtimeByPercentage[pct]) overtimeByPercentage[pct] = { hours: 0, amount: 0, rate: dayRate };
                    overtimeByPercentage[pct].hours += extraH;
                    overtimeByPercentage[pct].amount += breakdown.ordinary?.earnings?.lavoro_extra || 0;
                  }
                }
              }
              travelRegularHours += breakdown.ordinary?.hours?.viaggio_giornaliera || 0;
              travelExtraHours   += breakdown.ordinary?.hours?.viaggio_extra || 0;
              standbyNightHours += (breakdown.standby?.workHours?.night || 0) + (breakdown.standby?.workHours?.night_holiday || 0) + (breakdown.standby?.workHours?.saturday_night || 0) + (breakdown.standby?.travelHours?.night || 0) + (breakdown.standby?.travelHours?.saturday_night || 0) + (breakdown.standby?.travelHours?.night_holiday || 0);
              standbyEveningHours += (breakdown.standby?.workHours?.evening || 0) + (breakdown.standby?.travelHours?.evening || 0);

              // Giorni reperibilita: SOLO flag impostato nel TimeEntryForm
              if (isStandbyActiveFromEntry(entry, workEntry)) {
                standbyDays += 1;
                const standbyDate = parseDateOnlyToLocalDate(entry.date);
                const standbyDow = standbyDate.getDay();
                const standbyIsHoliday = isItalianHoliday(entry.date);
                const dayNum = getDayOfMonthNumber(entry.date);
                if (dayNum !== null) standbyDaysSet.add(dayNum);
                if (standbyIsHoliday) {
                  standbyHolidayDays += 1;
                  if (dayNum !== null) standbyHolidayDaysSet.add(dayNum);
                } else if (standbyDow === 6) {
                  standbySaturdayDays += 1;
                  if (dayNum !== null) standbySaturdayDaysSet.add(dayNum);
                } else if (standbyDow === 0) {
                  standbySundayDays += 1;
                  if (dayNum !== null) standbySundayDaysSet.add(dayNum);
                } else {
                  standbyWeekdayDays += 1;
                  if (dayNum !== null) standbyWeekdayDaysSet.add(dayNum);
                }
              }

              // Uscite reperibilita: stessa logica del Dashboard (interventi validi)
              if (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0) {
                const validInterventi = workEntry.interventi.filter((intervento) => intervento.work_start_1 && intervento.work_end_1);
                standbyInterventions += validInterventi.length;
              }
              // Supplementi fascia oraria da hourlyRatesBreakdown (calcolo tariffa oraria pura)
              if (breakdown.details?.hourlyRatesBreakdown) {
                for (const fascia of breakdown.details.hourlyRatesBreakdown) {
                  const key = fascia.name || fascia.timeRange || 'Sconosciuto';
                  if (!supplementsByTimeRange[key]) supplementsByTimeRange[key] = { hours: 0 };
                  supplementsByTimeRange[key].hours += fascia.hours || 0;
                }
              }
              // Supplementi da dailyRateBreakdown.regularBreakdown (calcolo tariffa giornaliera)
              if (breakdown.details?.dailyRateBreakdown?.regularBreakdown) {
                for (const period of breakdown.details.dailyRateBreakdown.regularBreakdown) {
                  if (period.breakdown) {
                    for (const fascia of period.breakdown) {
                      if (fascia.rate > 0 && fascia.hours > 0) {
                        let key = fascia.type === 'Serale' ? '20:00-22:00 (Serale)'
                                : fascia.type === 'Notturno' ? '22:00-06:00 (Notturno)'
                                : fascia.type || 'Altro';
                        if (!supplementsByTimeRange[key]) supplementsByTimeRange[key] = { hours: 0 };
                        supplementsByTimeRange[key].hours += fascia.hours || 0;
                      }
                    }
                  }
                }
              }
              // Ore viaggio pagate come viaggio (tipo 'regular' nel travelBreakdown)
              const drbs = breakdown.breakdown?.regularBreakdown || [];
              for (const drb of (Array.isArray(drbs) ? drbs : [])) {
                if (drb.travelBreakdown) {
                  for (const tb of drb.travelBreakdown) {
                    if (tb.type === 'regular') travelInRegular += tb.hours || 0;
                  }
                }
              }
              // Ore viaggio standby
              travelHoursTotal += Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);

              const dayType = entry.day_type || entry.dayType || '';
              const isFixedDay = entry.is_fixed_day === 1 || entry.is_fixed_day === true ||
                ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);

              // daysWorked: solo giorni effettivi (non fissi), identico a Dashboard
              if (!isFixedDay) effectiveWorkDays++;

              // Contatori sabato/domenica/festivo (informativi, indipendenti da Reg./Straord.)
              if (isSaturday && dailyHours > 0) {
                saturdayDays++;
                saturdayHours += dailyHours;
              } else if (isSunday && dailyHours > 0) {
                sundayDays++;
                sundayHours += dailyHours;
              }
              if (isHolidayDay && dailyHours > 0) {
                holidayWorkDays++;
                holidayHours += dailyHours;
              }

              // Pasti cash specifici (aggiunti al netto come nel Dashboard)
              if (workEntry.mealLunchCash > 0) cashMealsTotal += workEntry.mealLunchCash;
              if (workEntry.mealDinnerCash > 0) cashMealsTotal += workEntry.mealDinnerCash;
              const dailyTravelAllowance = breakdown.allowances?.travel || 0;
              travelAllowanceAmount += dailyTravelAllowance;
              travelAllowanceDays += getTravelEquivalentDay(entry, breakdown, safeSettings);

              const specialProgress = getSpecialDayProgress(entry, breakdown, safeSettings);
              if (specialProgress) {
                if (specialProgress.specialType === 'festivo') {
                  festivoFull += specialProgress.full;
                  festivoPartial += specialProgress.partial;
                }
                if (specialProgress.specialType === 'ferie') {
                  ferieFull += specialProgress.full;
                  feriePartial += specialProgress.partial;
                }
                if (specialProgress.specialType === 'permesso') {
                  permessoFull += specialProgress.full;
                  permessoPartial += specialProgress.partial;
                }
                if (specialProgress.specialType === 'malattia') {
                  malattiaFull += specialProgress.full;
                  malattiaPartial += specialProgress.partial;
                }
                if (specialProgress.specialType === 'riposo_compensativo') {
                  riposoCompFull += specialProgress.full;
                  riposoCompPartial += specialProgress.partial;
                }
              }
              // Pasti: importi reali allineati alle impostazioni rimborsi
              const lunchVoucherRaw = parseFloat(entry.meal_lunch_voucher ?? 0) || 0;
              const lunchCashRaw = parseFloat(entry.meal_lunch_cash ?? 0) || 0;
              const dinnerVoucherRaw = parseFloat(entry.meal_dinner_voucher ?? 0) || 0;
              const dinnerCashRaw = parseFloat(entry.meal_dinner_cash ?? 0) || 0;

              const lunchVoucherSetting = parseFloat(safeSettings?.mealAllowances?.lunch?.voucherAmount) || 0;
              const lunchCashSetting = parseFloat(safeSettings?.mealAllowances?.lunch?.cashAmount) || 0;
              const dinnerVoucherSetting = parseFloat(safeSettings?.mealAllowances?.dinner?.voucherAmount) || 0;
              const dinnerCashSetting = parseFloat(safeSettings?.mealAllowances?.dinner?.cashAmount) || 0;

              const lunchVoucherAmount = lunchVoucherRaw > 0
                ? (lunchVoucherRaw > 1 ? lunchVoucherRaw : (lunchVoucherSetting > 0 ? lunchVoucherSetting : lunchVoucherRaw))
                : 0;
              const dinnerVoucherAmount = dinnerVoucherRaw > 0
                ? (dinnerVoucherRaw > 1 ? dinnerVoucherRaw : (dinnerVoucherSetting > 0 ? dinnerVoucherSetting : dinnerVoucherRaw))
                : 0;

              const lunchCashWithVoucherAmount = lunchVoucherRaw > 0
                ? (lunchCashRaw > 0 ? lunchCashRaw : lunchCashSetting)
                : 0;
              const lunchCashOnlyAmount = lunchVoucherRaw > 0
                ? 0
                : (lunchCashRaw > 0 ? lunchCashRaw : 0);
              const dinnerCashWithVoucherAmount = dinnerVoucherRaw > 0
                ? (dinnerCashRaw > 0 ? dinnerCashRaw : dinnerCashSetting)
                : 0;
              const dinnerCashOnlyAmount = dinnerVoucherRaw > 0
                ? 0
                : (dinnerCashRaw > 0 ? dinnerCashRaw : 0);

              mealLunchVoucher += lunchVoucherAmount;
              mealLunchCashWithVoucher += lunchCashWithVoucherAmount;
              mealLunchCashOnly += lunchCashOnlyAmount;
              mealDinnerVoucher += dinnerVoucherAmount;
              mealDinnerCashWithVoucher += dinnerCashWithVoucherAmount;
              mealDinnerCashOnly += dinnerCashOnlyAmount;
              if (lunchVoucherAmount > 0) mealLunchVoucherCount += 1;
              if (lunchCashWithVoucherAmount > 0) mealLunchCashWithVoucherCount += 1;
              if (lunchCashOnlyAmount > 0) mealLunchCashOnlyCount += 1;
              if (dinnerVoucherAmount > 0) mealDinnerVoucherCount += 1;
                if (dinnerCashWithVoucherAmount > 0) mealDinnerCashWithVoucherCount += 1;
                if (dinnerCashOnlyAmount > 0) mealDinnerCashOnlyCount += 1;
              } catch (entryErr) {
                // Non bloccare l'intero mese per una entry anomala
                console.warn(`Errore entry ${entry?.date || 'sconosciuta'} nel mese ${month}:`, entryErr?.message);
              }
            }

            monthData.totalHours = totalHours;
            monthData.totalEarnings = totalEarnings;
            monthData.workDays = entries.length;
            monthData._effectiveWorkDays = effectiveWorkDays;
            monthData._saturdayDays = saturdayDays;
            monthData._sundayDays = sundayDays;
            monthData._holidayWorkDays = holidayWorkDays;
            monthData._cashMeals = cashMealsTotal;
            monthData._travelHoursTotal = travelHoursTotal;
            monthData._travelInRegular = travelInRegular;
            monthData._overtimeByPercentage = overtimeByPercentage;
            monthData._regularWorkHours = regularWorkHours;
            monthData._overtimeWorkHours = overtimeWorkHours;
            monthData._travelRegularHours = travelRegularHours;
            monthData._travelExtraHours = travelExtraHours;
            monthData._saturdayHours = saturdayHours;
            monthData._sundayHours = sundayHours;
            monthData._holidayHours = holidayHours;
            monthData._standbyDays = standbyDays;
            monthData._standbyWeekdayDays = standbyWeekdayDays;
            monthData._standbySaturdayDays = standbySaturdayDays;
            monthData._standbySundayDays = standbySundayDays;
            monthData._standbyHolidayDays = standbyHolidayDays;
            monthData._standbyDaysList = Array.from(standbyDaysSet).sort((a, b) => a - b);
            monthData._standbyWeekdayDaysList = Array.from(standbyWeekdayDaysSet).sort((a, b) => a - b);
            monthData._standbySaturdayDaysList = Array.from(standbySaturdayDaysSet).sort((a, b) => a - b);
            monthData._standbySundayDaysList = Array.from(standbySundayDaysSet).sort((a, b) => a - b);
            monthData._standbyHolidayDaysList = Array.from(standbyHolidayDaysSet).sort((a, b) => a - b);
            monthData._standbyInterventions = standbyInterventions;
            monthData._mealLunchVoucher = mealLunchVoucher;
            monthData._mealLunchCashWithVoucher = mealLunchCashWithVoucher;
            monthData._mealLunchCashOnly = mealLunchCashOnly;
            monthData._mealLunchCash = mealLunchCashWithVoucher + mealLunchCashOnly;
            monthData._mealDinnerVoucher = mealDinnerVoucher;
            monthData._mealDinnerCashWithVoucher = mealDinnerCashWithVoucher;
            monthData._mealDinnerCashOnly = mealDinnerCashOnly;
            monthData._mealDinnerCash = mealDinnerCashWithVoucher + mealDinnerCashOnly;
            monthData._meals = mealLunchVoucher + mealLunchCashWithVoucher + mealLunchCashOnly + mealDinnerVoucher + mealDinnerCashWithVoucher + mealDinnerCashOnly;
            monthData._travelAllowanceAmount = travelAllowanceAmount;
            monthData._travelAllowanceDays = travelAllowanceDays;
            monthData._mealLunchVoucherCount = mealLunchVoucherCount;
            monthData._mealLunchCashWithVoucherCount = mealLunchCashWithVoucherCount;
            monthData._mealLunchCashOnlyCount = mealLunchCashOnlyCount;
            monthData._mealDinnerVoucherCount = mealDinnerVoucherCount;
            monthData._mealDinnerCashWithVoucherCount = mealDinnerCashWithVoucherCount;
            monthData._mealDinnerCashOnlyCount = mealDinnerCashOnlyCount;
            monthData._festivoFull = festivoFull;
            monthData._festivoPartial = festivoPartial;
            monthData._ferieFull = ferieFull;
            monthData._feriePartial = feriePartial;
            monthData._permessoFull = permessoFull;
            monthData._permessoPartial = permessoPartial;
            monthData._malattiaFull = malattiaFull;
            monthData._malattiaPartial = malattiaPartial;
            monthData._riposoCompFull = riposoCompFull;
            monthData._riposoCompPartial = riposoCompPartial;
            // Calcolo notturne/serali identico al Dashboard
            let mNight = standbyNightHours;
            let mEvening = standbyEveningHours;
            // supplementi da fasce orarie ordinarie
            Object.entries(supplementsByTimeRange).forEach(([key, val]) => {
              const k = key.toLowerCase();
              const isEvening = k.includes('20:00-22:00') || k.includes('serale');
              const isNight = !isEvening && (k.includes('22:00') || k.includes('notturno') || k.includes('night'));
              if (isNight) mNight += val.hours || 0;
              if (isEvening) mEvening += val.hours || 0;
            });
            monthData._nightHours = mNight;
            monthData._eveningHours = mEvening;
          }

          // Allineato al Dashboard: aggiunge indennita di reperibilita dai giorni in calendario
          // che non hanno una entry registrata.
          const existingEntryDates = new Set((entries || []).map((entry) => toDateKey(entry.date)));
          const standbyOnlyDays = standbyAllowances.filter((allowance) => !existingEntryDates.has(toDateKey(allowance.date)));
          if (standbyOnlyDays.length > 0) {
            const standbyOnlyTotal = standbyOnlyDays.reduce((sum, allowance) => sum + (allowance.allowance || 0), 0);
            monthData.totalEarnings += standbyOnlyTotal;

            standbyOnlyDays.forEach((allowance) => {
              const d = parseDateOnlyToLocalDate(allowance.date);
              const dow = d.getDay();
              const holiday = isItalianHoliday(allowance.date);
              const dayNum = getDayOfMonthNumber(allowance.date);
              monthData._standbyDays = (monthData._standbyDays || 0) + 1;
              if (dayNum !== null && Array.isArray(monthData._standbyDaysList)) {
                monthData._standbyDaysList.push(dayNum);
              }
              if (holiday) {
                monthData._standbyHolidayDays = (monthData._standbyHolidayDays || 0) + 1;
                if (dayNum !== null && Array.isArray(monthData._standbyHolidayDaysList)) {
                  monthData._standbyHolidayDaysList.push(dayNum);
                }
              } else if (dow === 6) {
                monthData._standbySaturdayDays = (monthData._standbySaturdayDays || 0) + 1;
                if (dayNum !== null && Array.isArray(monthData._standbySaturdayDaysList)) {
                  monthData._standbySaturdayDaysList.push(dayNum);
                }
              } else if (dow === 0) {
                monthData._standbySundayDays = (monthData._standbySundayDays || 0) + 1;
                if (dayNum !== null && Array.isArray(monthData._standbySundayDaysList)) {
                  monthData._standbySundayDaysList.push(dayNum);
                }
              } else {
                monthData._standbyWeekdayDays = (monthData._standbyWeekdayDays || 0) + 1;
                if (dayNum !== null && Array.isArray(monthData._standbyWeekdayDaysList)) {
                  monthData._standbyWeekdayDaysList.push(dayNum);
                }
              }
            });

            const sortUniqueDays = (arr) => Array.from(new Set(arr || [])).sort((a, b) => a - b);
            monthData._standbyDaysList = sortUniqueDays(monthData._standbyDaysList);
            monthData._standbyWeekdayDaysList = sortUniqueDays(monthData._standbyWeekdayDaysList);
            monthData._standbySaturdayDaysList = sortUniqueDays(monthData._standbySaturdayDaysList);
            monthData._standbySundayDaysList = sortUniqueDays(monthData._standbySundayDaysList);
            monthData._standbyHolidayDaysList = sortUniqueDays(monthData._standbyHolidayDaysList);
          }
          // Giorni reperibilita: include flag su entry + giorni solo calendario senza entry
          monthData._standbyDays = monthData._standbyDays || 0;
          monthData._standbyWeekdayDays = monthData._standbyWeekdayDays || 0;
          monthData._standbySaturdayDays = monthData._standbySaturdayDays || 0;
          monthData._standbySundayDays = monthData._standbySundayDays || 0;
          monthData._standbyHolidayDays = monthData._standbyHolidayDays || 0;
          monthData._standbyDaysList = monthData._standbyDaysList || [];
          monthData._standbyWeekdayDaysList = monthData._standbyWeekdayDaysList || [];
          monthData._standbySaturdayDaysList = monthData._standbySaturdayDaysList || [];
          monthData._standbySundayDaysList = monthData._standbySundayDaysList || [];
          monthData._standbyHolidayDaysList = monthData._standbyHolidayDaysList || [];

          // Calcola "Lordo Retribuzione" identico alla card Dashboard:
          // adjustedTotalEarnings = totalEarnings - (dailyRateForFixed * fixedDaysCount)
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          let fixedDaysCount = 0;
          try {
            const fixedData = await FixedDaysService.getFixedDaysSummary(startDate, endDate, safeSettings);
            fixedDaysCount =
              (fixedData?.vacation?.days || 0) +
              (fixedData?.sick?.days || 0) +
              (fixedData?.permit?.days || 0) +
              (fixedData?.compensatory?.days || 0) +
              (fixedData?.holiday?.days || 0);
          } catch (_) { /* ignora errori sui giorni fissi */ }

          const showEffective = safeSettings?.showEffectiveEarningsOnSpecialNoWorkDays !== false;
          const dailyRateForFixed = (() => {
            const contractDaily = safeSettings?.contract?.dailyRate;
            if (typeof contractDaily === 'number' && contractDaily > 0) return contractDaily;
            const monthly = safeSettings?.contract?.monthlySalary;
            const wd = safeSettings?.contract?.workingDaysPerMonth || 26;
            return (monthly && wd) ? (monthly / wd) : 0;
          })();
          const fixedSum = showEffective ? (dailyRateForFixed * fixedDaysCount) : 0;
          monthData.grossEarnings = Math.max(0, monthData.totalEarnings - fixedSum);

          // Calcola "Totale Netto Stimato" identico alla card Dashboard:
          // grossAmount = baseSalary + max(0, lordo - dailyRate * giorni_feriali_lavorati)
          // poi IRPEF su monthlySalary (o grossAmount se useActualAmount=true)
          const payslipSettings = {
            method: settings?.netCalculation?.method || 'irpef',
            customDeductionRate: settings?.netCalculation?.customDeductionRate || 32,
          };
          const baseSalary = safeSettings?.contract?.monthlySalary || 2866.96;
          const workingDaysInMonth = safeSettings?.contract?.workingDaysPerMonth || 26;
          const dailyRateNet = baseSalary / workingDaysInMonth;
          const daysWorked = monthData._effectiveWorkDays || 0; // solo giorni effettivi, come Dashboard
          const satDays = monthData._saturdayDays || 0;
          const sunDays = monthData._sundayDays || 0;
          const holDays = monthData._holidayWorkDays || 0;
          const weekdaysWorked = Math.max(0, daysWorked - satDays - sunDays - holDays);
          const baseEarningsForWorkedDays = dailyRateNet * weekdaysWorked;
          const realExtraEarnings = Math.max(0, monthData.grossEarnings - baseEarningsForWorkedDays);
          const grossAmount = daysWorked > 0 ? (baseSalary + realExtraEarnings) : monthData.grossEarnings;

          const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
          // Preferiamo usare il lordo reale del mese se è disponibile (evita discrepanze con la Dashboard)
          const calcBase = (monthData.grossEarnings && monthData.grossEarnings > 0)
            ? grossAmount
            : ((!useActualAmount && baseSalary) ? baseSalary : grossAmount);
          const cashMeals = monthData._cashMeals || 0;
          if (calcBase > 0) {
            const netCalc = RealPayslipCalculator.calculateNetFromGross(calcBase, payslipSettings);
            monthData.netEarnings = (netCalc.net || 0) + cashMeals;
          } else {
            monthData.netEarnings = cashMeals;
          }

          data[month] = monthData;
        } catch (e) {
          console.warn(`Errore mese ${month}:`, e?.message);
          data[month] = { month, totalHours: 0, totalEarnings: 0, workDays: 0 };
        }
      }

      if (calcSeq === calcSeqRef.current) {
        setMonthlyData(data);
      }
    } catch (error) {
      console.error('Errore caricamento dati annuali:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati annuali.');
    } finally {
      if (calcSeq === calcSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!settingsLoading && settings) {
      loadYearData();
    }
  }, [year, settings, settingsLoading]);

  useEffect(() => {
    const loadVacSettings = async () => {
      try {
        const vs = await VacationService.getVacationSettings();
        setVacationSettings(vs);
      } catch (e) {
        console.warn('Errore caricamento impostazioni ferie:', e?.message);
      }
    };
    loadVacSettings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadYearData();
    setRefreshing(false);
  };

  const statistics = useMemo(() => {
    const stats = {
      totalHours: 0,
      totalEarnings: 0,
      totalWorkDays: 0,
      averageHoursPerDay: 0,
      averageEarningsPerDay: 0,
      maxEarningsMonth: null,
      maxEarningsValue: 0,
      // Ore viaggio e straordinari
      travelHoursTotal: 0,
      travelInRegular: 0,
      overtimeByPercentage: {},
    };

    const getEarnings = (monthData) => {
      if (earningsMode === 'netto') return monthData.netEarnings || 0;
      if (earningsMode === 'lordo') return monthData.grossEarnings || 0;
      return monthData.totalEarnings || 0;
    };

    Object.values(monthlyData).forEach((monthData) => {
      stats.totalHours += monthData.totalHours || 0;
      stats.totalEarnings += getEarnings(monthData);
      stats.totalWorkDays += monthData.workDays || 0;
      stats.travelHoursTotal += monthData._travelHoursTotal || 0;
      stats.travelInRegular += monthData._travelInRegular || 0;
      // Accumula straordinari per fascia
      const mOvt = monthData._overtimeByPercentage || {};
      Object.entries(mOvt).forEach(([pct, val]) => {
        if (!stats.overtimeByPercentage[pct]) stats.overtimeByPercentage[pct] = { hours: 0, amount: 0, rate: val.rate };
        stats.overtimeByPercentage[pct].hours += val.hours || 0;
        stats.overtimeByPercentage[pct].amount += val.amount || 0;
      });

      if (getEarnings(monthData) > stats.maxEarningsValue) {
        stats.maxEarningsValue = getEarnings(monthData);
        stats.maxEarningsMonth = monthNames[monthData.month - 1];
      }
    });

    if (stats.totalWorkDays > 0) {
      stats.averageHoursPerDay = stats.totalHours / stats.totalWorkDays;
      stats.averageEarningsPerDay = stats.totalEarnings / stats.totalWorkDays;
    }

    return stats;
  }, [monthlyData, earningsMode]);

  const buildReportHtml = ({ months, title }) => {
    const formatEquivalentDays = (value) => {
      const rounded = Math.round((value || 0) * 10) / 10;
      return rounded.toFixed(1).replace('.', ',');
    };

    // Percentuali configurate per serale/notte (dalle impostazioni contract.overtimeRates)
    const cfgOvertime = settings?.contract?.overtimeRates || {};
    const cfgSeraleMult = cfgOvertime.nightUntil22 || cfgOvertime.night || 1.25;
    const cfgNotteMult = cfgOvertime.nightAfter22 || cfgOvertime.overtimeNightAfter22 || cfgSeraleMult || 1.35;
    const cfgSeralePct = Math.round((cfgSeraleMult - 1) * 100);
    const cfgNottePct = Math.round((cfgNotteMult - 1) * 100);

    const modeLabel = earningsMode === 'netto' ? 'Netto Stimato IRPEF' : 'Totale Inserimenti';
    const renderMealsCell = (d) => {
      const lines = [];
      if ((d._mealLunchVoucher || 0) > 0) lines.push(`🍽🎟 ${(d._mealLunchVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchVoucherCount || 0})`);
      if ((d._mealLunchCashWithVoucher || 0) > 0) lines.push(`🎟💶 ${(d._mealLunchCashWithVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchCashWithVoucherCount || 0})`);
      if ((d._mealLunchCashOnly || 0) > 0) lines.push(`💶 ${(d._mealLunchCashOnly || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchCashOnlyCount || 0})`);
      if ((d._mealDinnerVoucher || 0) > 0) lines.push(`🍷🎟 ${(d._mealDinnerVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerVoucherCount || 0})`);
      if ((d._mealDinnerCashWithVoucher || 0) > 0) lines.push(`🎟💶 ${(d._mealDinnerCashWithVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerCashWithVoucherCount || 0})`);
      if ((d._mealDinnerCashOnly || 0) > 0) lines.push(`💶 ${(d._mealDinnerCashOnly || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerCashOnlyCount || 0})`);
      return lines.length ? lines.map((l) => `<div class="mini-row mini-meal">${l}</div>`).join('') : '—';
    };

    const totGg = months.reduce((s, d) => s + (d.workDays || 0), 0);
    const totEffectiveGg = months.reduce((s, d) => s + (d._effectiveWorkDays || 0), 0);
    const totHoursNum = months.reduce((s, d) => s + (d.totalHours || 0), 0);
    const totHours = formatSafeHours(totHoursNum);
    const totEarnings = formatSafeAmount(
      months.reduce((s, d) => s + (earningsMode === 'netto' ? (d.netEarnings || 0) : (d.totalEarnings || 0)), 0)
    );
    const totReg = formatSafeHours(months.reduce((s, d) => s + (d._regularWorkHours || 0), 0));
    const totStr = formatSafeHours(months.reduce((s, d) => s + (d._overtimeWorkHours || 0), 0));
    const totVia = formatSafeHours(months.reduce((s, d) => s + (d._travelRegularHours || 0), 0));
    const totViaExt = formatSafeHours(months.reduce((s, d) => s + (d._travelExtraHours || 0), 0));
    const totNotNum = months.reduce((s, d) => s + (d._nightHours || 0), 0);
    const totSerNum = months.reduce((s, d) => s + (d._eveningHours || 0), 0);
    const totNot = formatSafeHours(totNotNum);
    const totSer = formatSafeHours(totSerNum);
    const totNotPct = totHoursNum > 0 ? Math.round((totNotNum / totHoursNum) * 100) : 0;
    const totSerPct = totHoursNum > 0 ? Math.round((totSerNum / totHoursNum) * 100) : 0;
    const totSab = formatSafeHours(months.reduce((s, d) => s + (d._saturdayHours || 0), 0));
    const totDom = formatSafeHours(months.reduce((s, d) => s + (d._sundayHours || 0), 0));
    const totRepGg = months.reduce((s, d) => s + (d._standbyDays || 0), 0);
    const totRepFer = months.reduce((s, d) => s + (d._standbyWeekdayDays || 0), 0);
    const totRepSab = months.reduce((s, d) => s + (d._standbySaturdayDays || 0), 0);
    const totRepDom = months.reduce((s, d) => s + (d._standbySundayDays || 0), 0);
    const totRepFest = months.reduce((s, d) => s + (d._standbyHolidayDays || 0), 0);
    const totRepUsc = months.reduce((s, d) => s + (d._standbyInterventions || 0), 0);
    const totTrasfInd = formatSafeAmount(months.reduce((s, d) => s + (d._travelAllowanceAmount || 0), 0));
    const totTrasfIndDays = months.reduce((s, d) => s + (d._travelAllowanceDays || 0), 0);
    const totFestivo = formatSpecialCount(months.reduce((s, d) => s + (d._festivoFull || 0), 0), months.reduce((s, d) => s + (d._festivoPartial || 0), 0));
    const totFerie = formatSpecialCount(months.reduce((s, d) => s + (d._ferieFull || 0), 0), months.reduce((s, d) => s + (d._feriePartial || 0), 0));
    const totPermesso = formatSpecialCount(months.reduce((s, d) => s + (d._permessoFull || 0), 0), months.reduce((s, d) => s + (d._permessoPartial || 0), 0));
    const totMalattia = formatSpecialCount(months.reduce((s, d) => s + (d._malattiaFull || 0), 0), months.reduce((s, d) => s + (d._malattiaPartial || 0), 0));
    const totRipComp = formatSpecialCount(months.reduce((s, d) => s + (d._riposoCompFull || 0), 0), months.reduce((s, d) => s + (d._riposoCompPartial || 0), 0));
    const totalMealsData = {
      _mealLunchVoucher: months.reduce((s, d) => s + (d._mealLunchVoucher || 0), 0),
      _mealLunchCashWithVoucher: months.reduce((s, d) => s + (d._mealLunchCashWithVoucher || 0), 0),
      _mealLunchCashOnly: months.reduce((s, d) => s + (d._mealLunchCashOnly || 0), 0),
      _mealDinnerVoucher: months.reduce((s, d) => s + (d._mealDinnerVoucher || 0), 0),
      _mealDinnerCashWithVoucher: months.reduce((s, d) => s + (d._mealDinnerCashWithVoucher || 0), 0),
      _mealDinnerCashOnly: months.reduce((s, d) => s + (d._mealDinnerCashOnly || 0), 0),
      _mealLunchVoucherCount: months.reduce((s, d) => s + (d._mealLunchVoucherCount || 0), 0),
      _mealLunchCashWithVoucherCount: months.reduce((s, d) => s + (d._mealLunchCashWithVoucherCount || 0), 0),
      _mealLunchCashOnlyCount: months.reduce((s, d) => s + (d._mealLunchCashOnlyCount || 0), 0),
      _mealDinnerVoucherCount: months.reduce((s, d) => s + (d._mealDinnerVoucherCount || 0), 0),
      _mealDinnerCashWithVoucherCount: months.reduce((s, d) => s + (d._mealDinnerCashWithVoucherCount || 0), 0),
      _mealDinnerCashOnlyCount: months.reduce((s, d) => s + (d._mealDinnerCashOnlyCount || 0), 0),
    };

    const rowsHtml = months.map((data, idx) => {
      const earnings = earningsMode === 'netto' ? (data.netEarnings || 0) : (data.totalEarnings || 0);
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      const totalH = data.totalHours || 0;
      const nightPct = totalH > 0 ? Math.round(((data._nightHours || 0) / totalH) * 100) : 0;
      const evenPct = totalH > 0 ? Math.round(((data._eveningHours || 0) / totalH) * 100) : 0;
      return `<tr style="background:${bg}">
        <td class="col-mese">${monthNamesFull[data.month - 1]}</td>
        <td>Lavorati ${data._effectiveWorkDays || 0}<br/>Inseriti ${data.workDays || 0}</td>
        <td>${formatSafeHours(data.totalHours)}</td>
        <td class="col-earn">${formatSafeAmount(earnings)}</td>
        <td class="col-green">${formatSafeHours(data._regularWorkHours || 0)}</td>
        <td class="col-orange">${formatSafeHours(data._overtimeWorkHours || 0)}</td>
        <td>${formatSafeHours(data._travelRegularHours || 0)}</td>
        <td>${formatSafeHours(data._travelExtraHours || 0)}</td>
        <td class="col-indigo">${formatSafeHours(data._nightHours || 0)}${totalH > 0 ? ' (' + nightPct + '%)' : ''}</td>
        <td class="col-purple">${formatSafeHours(data._eveningHours || 0)}${totalH > 0 ? ' (' + evenPct + '%)' : ''}</td>
        <td>${formatSafeHours(data._saturdayHours || 0)}</td>
        <td>${formatSafeHours(data._sundayHours || 0)}</td>
        <td>${data._standbyDays || 0}</td>
        <td>${data._standbyWeekdayDays || 0}</td>
        <td>${data._standbySaturdayDays || 0}</td>
        <td>${data._standbySundayDays || 0}</td>
        <td>${data._standbyHolidayDays || 0}</td>
        <td>${data._standbyInterventions || 0}</td>
        <td>${formatSafeAmount(data._travelAllowanceAmount || 0)} (x${formatEquivalentDays(data._travelAllowanceDays || 0)})</td>
        <td>${formatSpecialCount(data._festivoFull || 0, data._festivoPartial || 0)}</td>
        <td>${formatSpecialCount(data._ferieFull || 0, data._feriePartial || 0)}</td>
        <td>${formatSpecialCount(data._permessoFull || 0, data._permessoPartial || 0)}</td>
        <td>${formatSpecialCount(data._malattiaFull || 0, data._malattiaPartial || 0)}</td>
        <td>${formatSpecialCount(data._riposoCompFull || 0, data._riposoCompPartial || 0)}</td>
        <td class="col-pasti">${renderMealsCell(data)}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 2mm 8mm 6mm 8mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
  h2 { font-size: 14px; margin: 0 0 1px; color: #1e40af; }
  p.sub { font-size: 10px; color: #555; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #1e40af; color: #fff; padding: 6px 4px; text-align: center; font-size: 9px; border: 1px solid #1e40af; }
  td { padding: 5px 4px; text-align: center; font-size: 9px; border: 1px solid #dde1e7; }
  .col-mese { font-weight: 700; color: #1e40af; text-align: left; padding-left: 6px; }
  .col-earn { font-weight: 700; color: #1e40af; }
  .col-green { color: #16a34a; }
  .col-orange { color: #d97706; }
  .col-indigo { color: #4f46e5; }
  .col-purple { color: #7c3aed; }
  .col-pasti { text-align: center; white-space: normal; word-break: break-word; }
  .mini-row { line-height: 1.2; margin: 0 0 1px; }
  .mini-meal { text-align: center; }
  tfoot td { background: #1e40af; color: #fff; font-weight: 700; border: 1px solid #1e3a8a; }
  tfoot td.col-mese { color: #fff; }
  .w-mese { width: 6.8%; }
  .w-giorni { width: 4%; }
  .w-oretot { width: 6%; }
  .w-guadagni { width: 7%; }
  .w-col { width: 3.8%; }
  .w-ind { width: 8%; }
  .w-pasti { width: 9%; }
</style>
</head>
<body>
<h2>${title}</h2>
<p class="sub">Modalità: ${modeLabel} &nbsp;|&nbsp; Stampato il: ${new Date().toLocaleDateString('it-IT')}</p>
<table>
  <thead>
    <tr>
      <th class="w-mese">Mese</th>
      <th class="w-giorni">Giorni</th>
      <th class="w-oretot">Ore Tot</th>
      <th class="w-guadagni">Guadagni</th>
      <th class="w-col">Reg.</th>
      <th class="w-col">Straord.</th>
      <th class="w-col">Viaggio come lav.</th>
      <th class="w-col">Viaggio comp.</th>
      <th class="w-col">Notturne al ${cfgNottePct}%</th>
      <th class="w-col">Serali al ${cfgSeralePct}%</th>
      <th class="w-col">Sabato</th>
      <th class="w-col">Domenica</th>
      <th class="w-col">Giorni<br/>Reperibile</th>
      <th class="w-col">Rep.<br/>Fer</th>
      <th class="w-col">Rep.<br/>Sab</th>
      <th class="w-col">Rep.<br/>Dom</th>
      <th class="w-col">Rep.<br/>Fest</th>
      <th class="w-col">Usc.Rep</th>
      <th class="w-ind">Ind.Trasf</th>
      <th class="w-col">Festivo</th>
      <th class="w-col">Ferie</th>
      <th class="w-col">Permesso</th>
      <th class="w-col">Malattia</th>
      <th class="w-col">Rip.Comp</th>
      <th class="w-pasti">Pasti</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot>
    <tr>
      <td class="col-mese">TOT</td>
      <td>Lavorati ${totEffectiveGg}<br/>Inseriti ${totGg}</td>
      <td>${totHours}</td>
      <td>${totEarnings}</td>
      <td>${totReg}</td>
      <td>${totStr}</td>
      <td>${totVia}</td>
      <td>${totViaExt}</td>
      <td class="col-indigo">${totNot}${totHoursNum > 0 ? ' (' + totNotPct + '%)' : ''}</td>
      <td class="col-purple">${totSer}${totHoursNum > 0 ? ' (' + totSerPct + '%)' : ''}</td>
      <td>${totSab}</td>
      <td>${totDom}</td>
      <td>${totRepGg}</td>
      <td>${totRepFer}</td>
      <td>${totRepSab}</td>
      <td>${totRepDom}</td>
      <td>${totRepFest}</td>
      <td>${totRepUsc}</td>
      <td>${totTrasfInd} (x${formatEquivalentDays(totTrasfIndDays)})</td>
      <td>${totFestivo}</td>
      <td>${totFerie}</td>
      <td>${totPermesso}</td>
      <td>${totMalattia}</td>
      <td>${totRipComp}</td>
      <td class="col-pasti">${renderMealsCell(totalMealsData)}</td>
    </tr>
  </tfoot>
</table>
</body>
</html>`;
  };

  const getEntriesWithBreakdownForMonth = async (month) => {
    if (monthEntries[month]) return monthEntries[month];

    const entries = await DatabaseService.getWorkEntries(year, month);
    const defaultSettings = {
      contract: {
        hourlyRate: 16.15,
        dailyRate: 107.69,
        monthlyGrossSalary: 2800.0,
        normalHours: 40,
        dailyHours: 8,
        saturdayBonus: 0.2,
        nightBonus: 0.25,
        nightBonus2: 0.35,
        overtimeBonus: 0.2,
        overtimeLimit: { hours: 8, type: 'daily' },
      },
      travelCompensationRate: 1.0,
      standbySettings: {
        dailyAllowance: 7.5,
        dailyIndemnity: 7.5,
        travelWithBonus: false,
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 },
      },
    };
    const safeSettings = {
      ...defaultSettings,
      ...settings,
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
      travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS',
      multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false,
    };

    const entriesWithBreakdown = await Promise.all(
      (entries || []).map(async (entry) => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
          return { ...entry, breakdown };
        } catch {
          return { ...entry, breakdown: null };
        }
      })
    );

    const existingDateKeys = new Set((entriesWithBreakdown || []).map((entry) => toDateKey(entry.date)));
    const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(year, month, safeSettings) || [];
    const standbyOnlyEntries = standbyAllowances
      .filter((allowance) => !existingDateKeys.has(toDateKey(allowance.date)))
      .map((allowance) => ({
        id: `standby-only-${allowance.date}`,
        date: allowance.date,
        day_type: isItalianHoliday(allowance.date) ? 'festivo' : 'lavorativa',
        is_standby_day: 1,
        isStandbyDay: 1,
        standby_allowance: allowance.allowance || 0,
        interventi: [],
        breakdown: {
          ordinary: { hours: {} },
          standby: { workHours: {}, travelHours: {} },
          allowances: { travel: 0, standby: allowance.allowance || 0 },
          details: { hourlyRatesBreakdown: [] },
          totalEarnings: allowance.allowance || 0,
        },
      }));

    const mergedEntries = [...entriesWithBreakdown, ...standbyOnlyEntries]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    setMonthEntries((prev) => ({ ...prev, [month]: mergedEntries }));
    return mergedEntries;
  };

  const buildMonthlyDetailedReportHtml = ({ month, monthData, entries }) => {
    const monthLabel = `${monthNamesFull[month - 1]} ${year}`;
    const formatEquivalentDays = (value) => {
      const rounded = Math.round((value || 0) * 10) / 10;
      return rounded.toFixed(1).replace('.', ',');
    };
    const esc = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Percentuali configurate per serale/notte (dalle impostazioni contract.overtimeRates)
    const cfgOvertime = settings?.contract?.overtimeRates || {};
    const cfgSeraleMult = cfgOvertime.nightUntil22 || cfgOvertime.night || 1.25;
    const cfgNotteMult = cfgOvertime.nightAfter22 || cfgOvertime.overtimeNightAfter22 || cfgSeraleMult || 1.35;
    const cfgSeralePct = Math.round((cfgSeraleMult - 1) * 100);
    const cfgNottePct = Math.round((cfgNotteMult - 1) * 100);

    const getOreTotWidth = () => {
      const allSiteNames = [];
      (entries || []).forEach((entry) => {
        const mainSite = entry?.site_name || entry?.siteName || '';
        if (mainSite) allSiteNames.push(String(mainSite));
        const viaggi = (() => {
          if (!entry?.viaggi) return [];
          if (Array.isArray(entry.viaggi)) return entry.viaggi;
          try { return JSON.parse(entry.viaggi) || []; } catch { return []; }
        })();
        viaggi.forEach((v) => {
          if (v?.site_name) allSiteNames.push(String(v.site_name));
        });
      });

      const maxLen = allSiteNames.reduce((m, s) => Math.max(m, s.length), 0);
      if (maxLen <= 10) return 11.5;
      if (maxLen <= 16) return 13.0;
      if (maxLen <= 24) return 14.5;
      return 16.0;
    };

    const oreTotWidth = getOreTotWidth();
    const pastiWidth = 9.0;

    const renderScheduleHtml = (entry, totalHours) => {
      const rows = [];
      const vd = String(entry?.vehicle_driven || entry?.vehicleDriven || '').toLowerCase();
      const isSpecificVehicleFlag = ['andata_ritorno', 'solo_andata', 'solo_ritorno', 'non_guidato'].includes(vd);
      const driveOutbound = vd === 'andata_ritorno' || vd === 'solo_andata' || (!isSpecificVehicleFlag && vd);
      const driveReturn = vd === 'andata_ritorno' || vd === 'solo_ritorno' || (!isSpecificVehicleFlag && vd);
      const hasDriven = vd && vd !== 'non_guidato';

      const addTravelRow = (icon, isReturn, label, time) => {
        const drivenThisLeg = isReturn ? driveReturn : driveOutbound;
        const effectiveLabel = label ? `${label}` : '';

        rows.push(`<div class="mini-row">${icon} 🏗 ${esc(effectiveLabel)}${drivenThisLeg ? '' : ' ✕'}</div>`);
        if (time) {
          rows.push(`<div class="mini-row">🕒 ${esc(time)}</div>`);
        }
      };

      const addRow = (icon, label, time) => {
        if (label) rows.push(`<div class="mini-row">${icon} ${esc(label)}</div>`);
        if (time) rows.push(`<div class="mini-row">🕒 ${esc(time)}</div>`);
      };

      const renderCantiereBlock = (dep, arr, ws1, we1, ws2, we2, depR, arrC, site) => {
        const sLabel = site || '';
        if (dep && arr) addTravelRow('🚗', false, sLabel, `${dep}→${arr}`);
        if (ws1 && we1) {
          if (!dep && sLabel) addRow('🏗', sLabel, '');
          addRow('🕒', '', `${ws1}-${we1}`);
        }
        if (ws2 && we2) addRow('🕒', '', `${ws2}-${we2}`);
        if (depR && arrC) addTravelRow('↩', true, '', `${depR}→${arrC}`);
      };

      renderCantiereBlock(
        entry?.departure_company,
        entry?.arrival_site,
        entry?.work_start_1,
        entry?.work_end_1,
        entry?.work_start_2,
        entry?.work_end_2,
        entry?.departure_return,
        entry?.arrival_company,
        entry?.site_name || entry?.siteName || ''
      );

      const viaggi = (() => {
        if (!entry?.viaggi) return [];
        if (Array.isArray(entry.viaggi)) return entry.viaggi;
        try { return JSON.parse(entry.viaggi) || []; } catch { return []; }
      })();

      viaggi.forEach((v) => {
        renderCantiereBlock(
          v?.departure_company,
          v?.arrival_site,
          v?.work_start_1,
          v?.work_end_1,
          v?.work_start_2,
          v?.work_end_2,
          v?.departure_return,
          v?.arrival_company,
          v?.site_name || ''
        );
      });

      const hasWorkHours = !!(
        entry?.work_start_1 ||
        entry?.work_start_2 ||
        entry?.departure_company ||
        entry?.departure_return
      );

      if (!hasWorkHours) {
        const dayType = entry?.day_type || entry?.dayType || '';
        const dayTypeLabels = {
          ferie: '🏖 Ferie',
          malattia: '🩺 Malattia',
          permesso: '📅 Permesso',
          riposo: '🛌 Riposo',
          festivo: '⭐ Festivo',
          reperibilità: '📻 Reperibilita',
          reperibilita: '📻 Reperibilita',
          standby: '📻 Reperibilita',
        };
        if (dayTypeLabels[dayType]) rows.push(`<div class="mini-row">${dayTypeLabels[dayType]}</div>`);

        if ((parseFloat(entry?.meal_lunch_voucher || 0) > 0) || (parseFloat(entry?.meal_lunch_cash || 0) > 0)) {
          rows.push('<div class="mini-row">🍽 Pranzo</div>');
        }
        if ((parseFloat(entry?.meal_dinner_voucher || 0) > 0) || (parseFloat(entry?.meal_dinner_cash || 0) > 0)) {
          rows.push('<div class="mini-row">🌙 Cena</div>');
        }
        if (parseFloat(entry?.travel_allowance || 0) > 0) {
          rows.push('<div class="mini-row">🚗 Trasferta</div>');
        }
        if (
          parseFloat(entry?.standby_allowance || 0) > 0 ||
          entry?.is_standby_day === 1 ||
          entry?.is_standby_day === true ||
          entry?.is_standby_day === '1'
        ) {
          rows.push('<div class="mini-row">📻 Reperibilita</div>');
        }
      }

      rows.push(`<div class="mini-row mini-tot">✔ Tot: ${esc(formatSafeHours(totalHours || 0))}</div>`);
      return rows.join('');
    };

    const renderMonthMeals = (d) => {
      const lines = [];
      if ((d._mealLunchVoucher || 0) > 0) lines.push(`🍽🎟 ${(d._mealLunchVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchVoucherCount || 0})`);
      if ((d._mealLunchCashWithVoucher || 0) > 0) lines.push(`🎟💶 ${(d._mealLunchCashWithVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchCashWithVoucherCount || 0})`);
      if ((d._mealLunchCashOnly || 0) > 0) lines.push(`💶 ${(d._mealLunchCashOnly || 0).toFixed(2).replace('.', ',')}€ (x${d._mealLunchCashOnlyCount || 0})`);
      if ((d._mealDinnerVoucher || 0) > 0) lines.push(`🍷🎟 ${(d._mealDinnerVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerVoucherCount || 0})`);
      if ((d._mealDinnerCashWithVoucher || 0) > 0) lines.push(`🎟💶 ${(d._mealDinnerCashWithVoucher || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerCashWithVoucherCount || 0})`);
      if ((d._mealDinnerCashOnly || 0) > 0) lines.push(`💶 ${(d._mealDinnerCashOnly || 0).toFixed(2).replace('.', ',')}€ (x${d._mealDinnerCashOnlyCount || 0})`);
      return lines.length ? lines.map((l) => `<div class="mini-row">${esc(l)}</div>`).join('') : '—';
    };

    const detailRows = (entries || [])
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((entry, idx) => {
        const dayData = extractBreakdownHours(entry.breakdown, entry);
        const meals = getMealDisplayAmounts(entry);
        const dayOfMonth = String(entry.date || '').split('-')[2] || '—';
        const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';

        const mealLines = [];
        if (meals.mealLunchVoucher > 0) mealLines.push(`🍽🎟 ${meals.mealLunchVoucher.toFixed(2).replace('.', ',')}€`);
        if (meals.mealLunchCashWithVoucher > 0) mealLines.push(`🎟💶 ${meals.mealLunchCashWithVoucher.toFixed(2).replace('.', ',')}€`);
        if (meals.mealLunchCashOnly > 0) mealLines.push(`💶 ${meals.mealLunchCashOnly.toFixed(2).replace('.', ',')}€`);
        if (meals.mealDinnerVoucher > 0) mealLines.push(`🍷🎟 ${meals.mealDinnerVoucher.toFixed(2).replace('.', ',')}€`);
        if (meals.mealDinnerCashWithVoucher > 0) mealLines.push(`🎟💶 ${meals.mealDinnerCashWithVoucher.toFixed(2).replace('.', ',')}€`);
        if (meals.mealDinnerCashOnly > 0) mealLines.push(`💶 ${meals.mealDinnerCashOnly.toFixed(2).replace('.', ',')}€`);

        return `<tr style="background:${bg}">
          <td class="col-mese">${esc(dayData.dayName || '—')}</td>
          <td>${esc(dayOfMonth)}</td>
          <td class="col-oretot">${renderScheduleHtml(entry, dayData.totalHours || 0)}</td>
          <td class="col-earn">${esc(formatSafeAmount(dayData.dailyEarnings || 0))}</td>
          <td class="col-green">${esc(formatSafeHours(dayData.ordinaryHours || 0))}</td>
          <td class="col-orange">${(() => {
            const h = dayData.overtimeHours || 0;
            if (h <= 0) return '—';
            const pctMap = dayData._overtimePctMap;
            if (!pctMap || pctMap.size === 0) return esc(formatSafeHours(h));
            const lines = Array.from(pctMap.entries())
              .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
              .map(([pct, { hours: ph }]) => `<span style="font-size:7px;color:#9a3412;display:block">${esc(formatSafeHours(ph))} ${esc(pct)}</span>`)
              .join('');
            return esc(formatSafeHours(h)) + lines;
          })()}</td>
          <td>${esc(formatSafeHours(dayData.travelRegular || 0))}</td>
          <td>${esc(formatSafeHours(dayData.travelExtra || 0))}</td>
          <td class="col-indigo">${esc(formatSafeHours(dayData.nightHours || 0))}</td>
          <td class="col-purple">${esc(formatSafeHours(dayData.eveningHours || 0))}</td>
          <td>${dayData.isSaturday ? 'Si' : '—'}</td>
          <td>${dayData.isSunday ? 'Si' : '—'}</td>
          <td>${dayData.isStandby ? 'Si' : '—'}</td>
          <td>${dayData.standbyInterventi > 0 ? dayData.standbyInterventi : '—'}</td>
          <td>${esc(formatSafeAmount(dayData.travelAllowanceAmount || 0))}</td>
          <td>${dayData.specialType === 'festivo' ? esc(dayData.specialLabel || '1') : '—'}</td>
          <td>${dayData.specialType === 'ferie' ? esc(dayData.specialLabel || '1') : '—'}</td>
          <td>${dayData.specialType === 'permesso' ? esc(dayData.specialLabel || '1') : '—'}</td>
          <td>${dayData.specialType === 'malattia' ? esc(dayData.specialLabel || '1') : '—'}</td>
          <td>${dayData.specialType === 'riposo_compensativo' ? esc(dayData.specialLabel || '1') : '—'}</td>
          <td class="col-pasti">${mealLines.length > 0 ? mealLines.map((l) => `<div class="mini-row mini-meal">${esc(l)}</div>`).join('') : '—'}</td>
        </tr>`;
      })
      .join('');

    const totalH = monthData.totalHours || 0;
    const monthNightPct = totalH > 0 ? Math.round(((monthData._nightHours || 0) / totalH) * 100) : 0;
    const monthEvenPct = totalH > 0 ? Math.round(((monthData._eveningHours || 0) / totalH) * 100) : 0;

    const monthRow = `<tr class="month-row">
      <td class="col-mese">${esc(monthNamesFull[month - 1])}</td>
      <td>${monthData._effectiveWorkDays || 0}<br/>${monthData.workDays || 0}</td>
      <td>${esc(formatSafeHours(monthData.totalHours || 0))}</td>
      <td class="col-earn">${esc(formatSafeAmount(earningsMode === 'netto' ? (monthData.netEarnings || 0) : (monthData.totalEarnings || 0)))}</td>
      <td class="col-green">${esc(formatSafeHours(monthData._regularWorkHours || 0))}</td>
      <td class="col-orange">${(() => {
        const h = monthData._overtimeWorkHours || 0;
        if (h <= 0) return '—';
        const byPct = monthData._overtimeByPercentage || {};
        const entries2 = Object.entries(byPct).filter(([, v]) => (v.hours || 0) > 0);
        if (entries2.length === 0) return esc(formatSafeHours(h));
        const lines = entries2
          .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
          .map(([pct, v]) => `<span style="font-size:7px;color:#9a3412;display:block">${esc(formatSafeHours(v.hours))} ${esc(pct)}</span>`)
          .join('');
        return esc(formatSafeHours(h)) + lines;
      })()}</td>
      <td>${esc(formatSafeHours(monthData._travelRegularHours || 0))}</td>
      <td>${esc(formatSafeHours(monthData._travelExtraHours || 0))}</td>
      <td class="col-indigo">${esc(formatSafeHours(monthData._nightHours || 0))}${totalH > 0 ? ' (' + monthNightPct + '%)' : ''}</td>
      <td class="col-purple">${esc(formatSafeHours(monthData._eveningHours || 0))}${totalH > 0 ? ' (' + monthEvenPct + '%)' : ''}</td>
      <td>${esc(formatSafeHours(monthData._saturdayHours || 0))}</td>
      <td>${esc(formatSafeHours(monthData._sundayHours || 0))}</td>
      <td>${monthData._standbyDays || 0}</td>
      <td>${monthData._standbyInterventions || 0}</td>
      <td>${esc(formatSafeAmount(monthData._travelAllowanceAmount || 0))} (x${formatEquivalentDays(monthData._travelAllowanceDays || 0)})</td>
      <td>${esc(formatSpecialCount(monthData._festivoFull || 0, monthData._festivoPartial || 0))}</td>
      <td>${esc(formatSpecialCount(monthData._ferieFull || 0, monthData._feriePartial || 0))}</td>
      <td>${esc(formatSpecialCount(monthData._permessoFull || 0, monthData._permessoPartial || 0))}</td>
      <td>${esc(formatSpecialCount(monthData._malattiaFull || 0, monthData._malattiaPartial || 0))}</td>
      <td>${esc(formatSpecialCount(monthData._riposoCompFull || 0, monthData._riposoCompPartial || 0))}</td>
      <td class="col-pasti">${renderMonthMeals(monthData)}</td>
    </tr>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A3 landscape; margin: 2mm 8mm 6mm 8mm; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; }
  h2 { font-size: 14px; margin: 0 0 1px; color: #1e40af; }
  p.sub { font-size: 10px; color: #555; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #1e40af; color: #fff; padding: 6px 4px; text-align: center; font-size: 8px; border: 1px solid #1e40af; }
  td { padding: 5px 4px; text-align: center; font-size: 8px; border: 1px solid #dde1e7; vertical-align: top; }
  .col-mese { font-weight: 700; color: #1e40af; text-align: left; padding-left: 6px; }
  .col-earn { font-weight: 700; color: #1e40af; }
  .col-green { color: #16a34a; }
  .col-orange { color: #d97706; }
  .col-indigo { color: #4f46e5; }
  .col-purple { color: #7c3aed; }
  .col-oretot { text-align: left; white-space: normal; word-break: break-word; }
  .col-pasti { text-align: center; white-space: normal; word-break: break-word; }
  .mini-row { line-height: 1.25; margin: 0 0 1px; }
  .mini-meal { text-align: center; }
  .mini-tot { font-weight: 700; color: #1e40af; margin-top: 2px; }
  .month-row td { background: #c7d2fe; color: #1e3a8a; font-weight: 700; border-top: 2px solid #1e40af; border-bottom: 2px solid #1e40af; }
  tfoot td { background: #e0e7ff; color: #1e3a8a; font-weight: 700; border: 1px solid #c7d2fe; }
  .footer-label { text-align: right; padding-right: 8px; }
  .w-mese { width: 6.8%; }
  .w-giorni { width: 3.2%; }
  .w-oretot { width: ${oreTotWidth}%; }
  .w-guadagni { width: 6.5%; }
  .w-col { width: 3.4%; }
  .w-ind { width: 7.5%; }
  .w-pasti { width: ${pastiWidth}%; }
</style>
</head>
<body>
<h2>Riepilogo Mensile ${monthLabel}</h2>
<p class="sub">Modalità: ${earningsMode === 'netto' ? 'Netto Stimato IRPEF' : 'Totale Inserimenti'} &nbsp;|&nbsp; Stampato il: ${new Date().toLocaleDateString('it-IT')}</p>
<table>
  <thead>
    <tr>
      <th class="w-mese">Mese</th>
      <th class="w-giorni">Giorni</th>
      <th class="w-oretot">Ore Tot</th>
      <th class="w-guadagni">Guadagni</th>
      <th class="w-col">Reg.</th>
      <th class="w-col">Straord.</th>
      <th class="w-col">Viaggio come lav.</th>
      <th class="w-col">Viaggio comp.</th>
      <th class="w-col">Notturne al ${cfgNottePct}%</th>
      <th class="w-col">Serali al ${cfgSeralePct}%</th>
      <th class="w-col">Sabato</th>
      <th class="w-col">Domenica</th>
      <th class="w-col">Giorni<br/>Reperibile</th>
      <th class="w-col">Usc.Rep</th>
      <th class="w-ind">Ind.Trasf</th>
      <th class="w-col">Festivo</th>
      <th class="w-col">Ferie</th>
      <th class="w-col">Permesso</th>
      <th class="w-col">Malattia</th>
      <th class="w-col">Rip.Comp</th>
      <th class="w-pasti">Pasti</th>
    </tr>
  </thead>
  <tbody>
    ${monthRow}
    ${detailRows || '<tr><td colspan="21">Nessun inserimento nel mese selezionato</td></tr>'}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="20" class="footer-label">Totale Pasti Mese</td>
      <td class="col-pasti">${renderMonthMeals(monthData)}</td>
    </tr>
  </tfoot>
</table>
</body>
</html>`;
  };

  const shareReportPdf = async ({ html, fileName }) => {
    const { uri } = await Print.printToFileAsync({ html, orientation: Print.Orientation.landscape });
    const destUri = FileSystem.documentDirectory + fileName;
    await FileSystem.moveAsync({ from: uri, to: destUri });
    await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  };

  const printReport = async ({ html }) => {
    await Print.printAsync({ html, orientation: Print.Orientation.landscape });
  };

  const handleMonthLongPress = (month) => {
    const monthData = monthlyData?.[month];
    if (!monthData) return;

    const monthLabel = `${monthNamesFull[month - 1]} ${year}`;
    Alert.alert(
      'Azioni Mese',
      monthLabel,
      [
        {
          text: 'Condividi PDF',
          onPress: async () => {
            try {
              const entries = await getEntriesWithBreakdownForMonth(month);
              const html = buildMonthlyDetailedReportHtml({ month, monthData, entries });
              await shareReportPdf({ html, fileName: `Riepilogo Mensile ${monthLabel}.pdf` });
            } catch (err) {
              Alert.alert('Errore', 'Impossibile condividere il mese: ' + (err?.message || ''));
            }
          },
        },
        {
          text: 'Stampa',
          onPress: async () => {
            try {
              const entries = await getEntriesWithBreakdownForMonth(month);
              const html = buildMonthlyDetailedReportHtml({ month, monthData, entries });
              await printReport({ html });
            } catch (err) {
              Alert.alert('Errore', 'Impossibile stampare il mese: ' + (err?.message || ''));
            }
          },
        },
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };

  const handlePrint = async () => {
    try {
      const months = Object.values(monthlyData);
      const html = buildReportHtml({ months, title: `Riepilogo Annuale ${year}` });
      await shareReportPdf({ html, fileName: `Riepilogo Annuale ${year}.pdf` });
    } catch (err) {
      Alert.alert('Errore', 'Impossibile aprire la stampa: ' + (err?.message || ''));
    }
  };

  const ChartBar = ({ value, maxValue, label, height = 150 }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const barHeight = (percentage / 100) * height;

    return (
      <View style={styles.chartBarContainer}>
        <View style={[styles.chartBar, { height: barHeight, backgroundColor: theme.colors.primary }]} />
        <Text style={styles.chartLabel}>{label}</Text>
        <Text style={styles.chartValue}>{value.toFixed(0)}</Text>
      </View>
    );
  };

  // � Estrae le ore dal breakdown (identico al DashboardScreen)
  const extractBreakdownHours = (breakdown, entry) => {
    if (!breakdown) return {};
    
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const entryDate = parseDateOnlyToLocalDate(entry.date);
    const dow = entryDate.getDay();
    const dayName = days[dow];
    
    // Routing ore: usa breakdown.details (= quello che CalculationService ha calcolato con le settings reali)
    const _rawLavGiorn = breakdown.ordinary?.hours?.lavoro_giornaliera || 0;
    const _rawLavExtra = breakdown.ordinary?.hours?.lavoro_extra || 0;
    const _isSat = breakdown.details?.isSaturday ?? (dow === 6);
    const _isSun = breakdown.details?.isSunday   ?? (dow === 0);
    const _isHol = breakdown.details?.isHoliday  ?? isItalianHoliday(entryDate);
    const _isSpecial = _isSat || _isSun || _isHol;
    const _mult = breakdown.details?.specialDayMultiplier ?? (
      _isSpecial
        ? (_isSat
            ? (settings?.contract?.overtimeRates?.saturday ?? 1)
            : (settings?.contract?.overtimeRates?.holiday ?? 1))
        : 1
    );
    const _routeOT = _isSpecial && _mult > 1 && !breakdown.details?.isFixedDay;

    // Se giorno speciale con bonus: costruisci mappa per-percentuale (lavoro + viaggio insieme)
    let _overtimePctMap = null;
    if (_routeOT) {
      const hrBkd = breakdown.details?.hourlyRatesBreakdown || [];
      const allFasce = hrBkd.filter(f => (f.hours || 0) > 0);
      if (allFasce.length > 0) {
        _overtimePctMap = new Map();
        for (const f of allFasce) {
          const rate = Number.isFinite(f.rate) && f.rate > 0 ? f.rate : _mult;
          const key = '+' + Math.round((rate - 1) * 100) + '%';
          const prev = _overtimePctMap.get(key) || { hours: 0, rate };
          _overtimePctMap.set(key, { hours: prev.hours + f.hours, rate });
        }
      } else {
        // Fallback: tutte le ore sotto un'unica %
        const allH = (_rawLavGiorn + _rawLavExtra
          + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0)
          + (breakdown.ordinary?.hours?.viaggio_extra || 0));
        if (allH > 0) {
          _overtimePctMap = new Map([['+' + Math.round((_mult - 1) * 100) + '%', { hours: allH, rate: _mult }]]);
        }
      }
    }

    const ordinaryHours = _routeOT ? 0 : _rawLavGiorn;
    const overtimeHours = _routeOT
      ? (_overtimePctMap ? Array.from(_overtimePctMap.values()).reduce((s, v) => s + v.hours, 0) : (_rawLavGiorn + _rawLavExtra))
      : _rawLavExtra;

    // Per giorni feriali con straordinari: costruisci mappa per-% 
    if (!_routeOT && overtimeHours > 0 && !_overtimePctMap) {
      let accPct = false;
      // 1) breakdown.details.dailyRateBreakdown.overtimeBreakdown (DAILY_RATE_WITH_SUPPLEMENTS)
      const bkdOvt = breakdown.details?.dailyRateBreakdown?.overtimeBreakdown || [];
      for (const ob of bkdOvt) {
        if (ob.breakdown) {
          for (const ot of ob.breakdown) {
            if ((ot.hours || 0) <= 0) continue;
            const r = ot.rate || 1;
            const key = '+' + Math.round((r - 1) * 100) + '%';
            if (!_overtimePctMap) _overtimePctMap = new Map();
            const prev = _overtimePctMap.get(key) || { hours: 0, rate: r };
            _overtimePctMap.set(key, { hours: prev.hours + ot.hours, rate: r });
            accPct = true;
          }
        }
      }
      // 2) hourlyRatesBreakdown: solo fasce con rate > 1
      if (!accPct && breakdown.details?.hourlyRatesBreakdown?.length > 0) {
        for (const f of breakdown.details.hourlyRatesBreakdown) {
          if ((f.hours || 0) <= 0) continue;
          const r = Number.isFinite(f.rate) && f.rate > 0 ? f.rate : 1;
          if (r <= 1) continue;
          const key = '+' + Math.round((r - 1) * 100) + '%';
          if (!_overtimePctMap) _overtimePctMap = new Map();
          const prev = _overtimePctMap.get(key) || { hours: 0, rate: r };
          _overtimePctMap.set(key, { hours: prev.hours + f.hours, rate: r });
          accPct = true;
        }
      }
      // 3) Fallback: contract.overtimeRates.day
      if (!accPct) {
        const dayRate = settings?.contract?.overtimeRates?.day || 1.2;
        const key = '+' + Math.round((dayRate - 1) * 100) + '%';
        _overtimePctMap = new Map([[key, { hours: overtimeHours, rate: dayRate }]]);
      }
    }
    
    // Ore viaggio
    const travelRegular = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0);
    const travelExtra = (breakdown.ordinary?.hours?.viaggio_extra || 0);
    
    // Notturne e serali da supplementi (identico a MonthlyPrintService.getNightEvening)
    let nightHours = 0;
    let eveningHours = 0;
    // 1) Standby
    nightHours += (breakdown.standby?.workHours?.night || 0) + (breakdown.standby?.workHours?.night_holiday || 0)
                + (breakdown.standby?.workHours?.saturday_night || 0) + (breakdown.standby?.travelHours?.night || 0)
                + (breakdown.standby?.travelHours?.saturday_night || 0) + (breakdown.standby?.travelHours?.night_holiday || 0);
    eveningHours += (breakdown.standby?.workHours?.evening || 0) + (breakdown.standby?.travelHours?.evening || 0);
    // 2) PURE_HOURLY → hourlyRatesBreakdown
    for (const item of (breakdown.details?.hourlyRatesBreakdown || [])) {
      const k = (item.name || item.timeRange || '').toLowerCase();
      if (k.includes('notturno') || k.includes('22:00')) nightHours += item.hours || 0;
      else if (k.includes('serale') || k.includes('20:00')) eveningHours += item.hours || 0;
    }
    // 3) DAILY_RATE_WITH_SUPPLEMENTS → dailyRateBreakdown.regularBreakdown
    for (const period of (breakdown.details?.dailyRateBreakdown?.regularBreakdown || [])) {
      for (const f of (period.breakdown || [])) {
        if (f.type === 'Notturno') nightHours += f.hours || 0;
        else if (f.type === 'Serale') eveningHours += f.hours || 0;
      }
    }
    
    // Totale ore (lavoro + viaggio + standby lavoro + standby viaggio)
    const totalHours = ordinaryHours + overtimeHours + travelRegular + travelExtra + 
                      Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                      Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
    
    // Sabato/domenica
    const isSaturday = dow === 6;
    const isSunday = dow === 0;
    const isHoliday = isItalianHoliday(entryDate);
    
    const workEntry = createWorkEntryFromData(entry);

    // Reperibilita: stessa logica usata nell'aggregazione mensile
    const isStandby = isStandbyActiveFromEntry(entry, workEntry);
    const standbyInterventi = (workEntry.interventi && Array.isArray(workEntry.interventi))
      ? workEntry.interventi.filter(i => i.work_start_1 && i.work_end_1).length
      : 0;
    const specialProgress = getSpecialDayProgress(entry, breakdown, {
      contract: {
        dailyRate: parseFloat(settings?.contract?.dailyRate) || 107.69,
        dailyHours: parseFloat(settings?.contract?.dailyHours) || 8,
      }
    });
    
    return {
      date: entry.date,
      dayName,
      totalHours,
      ordinaryHours,
      overtimeHours,
      _specialPct: _routeOT && !_overtimePctMap ? ('+' + Math.round((_mult - 1) * 100) + '%') : null,
      _overtimePctMap: _overtimePctMap || null,
      travelRegular,
      travelExtra,
      travelAllowanceAmount: breakdown.allowances?.travel || 0,
      nightHours,
      eveningHours,
      isSaturday,
      isSunday,
      isHoliday,
      isStandby,
      standbyWeekday: isStandby && !isSaturday && !isSunday && !isHoliday,
      standbySaturday: isStandby && isSaturday,
      standbySunday: isStandby && isSunday,
      standbyHoliday: isStandby && !isSaturday && !isSunday && isHoliday,
      standbyInterventi,
      specialType: specialProgress?.specialType || null,
      specialLabel: specialProgress?.label || null,
      dailyEarnings: breakdown.totalEarnings || 0,
      workEntry: entry,
      breakdown
    };
  };

  // Importi pasti reali per UI: converte eventuali flag 1/0 in valore da impostazioni
  const getMealDisplayAmounts = (entry) => {
    const lunchVoucherRaw = parseFloat(entry?.meal_lunch_voucher ?? entry?.mealLunchVoucher ?? 0) || 0;
    const lunchCashRaw = parseFloat(entry?.meal_lunch_cash ?? entry?.mealLunchCash ?? 0) || 0;
    const dinnerVoucherRaw = parseFloat(entry?.meal_dinner_voucher ?? entry?.mealDinnerVoucher ?? 0) || 0;
    const dinnerCashRaw = parseFloat(entry?.meal_dinner_cash ?? entry?.mealDinnerCash ?? 0) || 0;

    const lunchVoucherSetting = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;
    const lunchCashSetting = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;
    const dinnerVoucherSetting = parseFloat(settings?.mealAllowances?.dinner?.voucherAmount) || 0;
    const dinnerCashSetting = parseFloat(settings?.mealAllowances?.dinner?.cashAmount) || 0;

    const resolveVoucherAmount = (raw, fromSettings) => {
      if (raw <= 0) return 0;
      if (raw > 1) return raw;
      return fromSettings > 0 ? fromSettings : raw;
    };

    return {
      mealLunchVoucher: resolveVoucherAmount(lunchVoucherRaw, lunchVoucherSetting),
      mealLunchCashWithVoucher: lunchVoucherRaw > 0
        ? (lunchCashRaw > 0 ? lunchCashRaw : lunchCashSetting)
        : 0,
      mealLunchCashOnly: lunchVoucherRaw > 0
        ? 0
        : (lunchCashRaw > 0 ? lunchCashRaw : 0),
      mealDinnerVoucher: resolveVoucherAmount(dinnerVoucherRaw, dinnerVoucherSetting),
      mealDinnerCashWithVoucher: dinnerVoucherRaw > 0
        ? (dinnerCashRaw > 0 ? dinnerCashRaw : dinnerCashSetting)
        : 0,
      mealDinnerCashOnly: dinnerVoucherRaw > 0
        ? 0
        : (dinnerCashRaw > 0 ? dinnerCashRaw : 0),
      mealLunchCash: (lunchVoucherRaw > 0 ? (lunchCashRaw > 0 ? lunchCashRaw : lunchCashSetting) : 0) +
        (lunchVoucherRaw > 0 ? 0 : (lunchCashRaw > 0 ? lunchCashRaw : 0)),
      mealDinnerCash: (dinnerVoucherRaw > 0 ? (dinnerCashRaw > 0 ? dinnerCashRaw : dinnerCashSetting) : 0) +
        (dinnerVoucherRaw > 0 ? 0 : (dinnerCashRaw > 0 ? dinnerCashRaw : 0)),
    };
  };

  const normalizeSpecialDayType = (rawType) => {
    const t = (rawType || '').toString().toLowerCase().trim();
    if (t === 'festivo') return 'festivo';
    if (t === 'ferie') return 'ferie';
    if (t === 'permesso') return 'permesso';
    if (t === 'malattia' || t === 'malatia') return 'malattia';
    if (t === 'riposo' || t === 'riposo_compensativo' || t === 'riposo compensativo') return 'riposo_compensativo';
    return null;
  };

  const getSpecialDayProgress = (entry, breakdown, safeCfg) => {
    const specialType = normalizeSpecialDayType(entry?.day_type || entry?.dayType);

    // Giornata lavorativa completata con ferie/permesso/etc. (parte di ore)
    if (!specialType) {
      const completamento = normalizeSpecialDayType(
        entry?.completamento_giornata || entry?.completamentoGiornata ||
        breakdown?.details?.completamentoTipo
      );
      if (!completamento) return null;

      const dailyHours = parseFloat(safeCfg?.contract?.dailyHours) || 8;
      // breakdown.details.totalOrdinaryHours = lavoro + viaggio (sempre impostato dal CalculationService)
      // È la fonte più affidabile perché rispetta le impostazioni ore viaggio
      let missingHours = 0;
      const totalOrdinary = parseFloat(breakdown?.details?.totalOrdinaryHours);
      if (!isNaN(totalOrdinary) && totalOrdinary > 0) {
        missingHours = Math.max(0, dailyHours - totalOrdinary);
      } else {
        // Fallback solo se breakdown non disponibile: conta lavoro + viaggio dai campi grezzi
        const parseMin = (t) => { if (!t) return null; const p = String(t).split(':'); return p.length < 2 ? null : parseInt(p[0],10)*60+parseInt(p[1],10); };
        let worked = 0;
        const s1 = parseMin(entry?.work_start_1 ?? entry?.workStart1), e1 = parseMin(entry?.work_end_1 ?? entry?.workEnd1);
        if (s1 !== null && e1 !== null && e1 > s1) worked += (e1 - s1) / 60;
        const s2 = parseMin(entry?.work_start_2 ?? entry?.workStart2), e2 = parseMin(entry?.work_end_2 ?? entry?.workEnd2);
        if (s2 !== null && e2 !== null && e2 > s2) worked += (e2 - s2) / 60;
        // aggiunge anche ore viaggio grezze (partenza azienda → arrivo cantiere + rientro)
        const dc = parseMin(entry?.departure_company ?? entry?.departureCompany);
        const as_ = parseMin(entry?.arrival_site ?? entry?.arrivalSite);
        if (dc !== null && as_ !== null && as_ > dc) worked += (as_ - dc) / 60;
        const dr = parseMin(entry?.departure_return ?? entry?.departureReturn);
        const ac = parseMin(entry?.arrival_company ?? entry?.arrivalCompany);
        if (dr !== null && ac !== null && ac > dr) worked += (ac - dr) / 60;
        if (worked > 0) missingHours = Math.max(0, dailyHours - worked);
      }
      if (missingHours <= 0) return null;

      const ratio = Math.min(missingHours / dailyHours, 1);
      const hoursLabel = `${missingHours.toFixed(1).replace('.', ',')} h`;
      if (ratio >= 0.995) {
        return { specialType: completamento, full: 1, partial: 0, label: hoursLabel };
      }
      if (ratio > 0) {
        return { specialType: completamento, full: 0, partial: ratio, label: hoursLabel };
      }
      return null;
    }

    const dh = parseFloat(safeCfg?.contract?.dailyHours) || 8;
    const fullDayAmount = parseFloat(safeCfg?.contract?.dailyRate) || 0;
    const fixedEarnings = parseFloat(breakdown?.fixedEarnings ?? entry?.fixed_earnings ?? entry?.fixedEarnings ?? 0) || 0;

    let ratio = 1;
    if (breakdown?.isFixedDay) {
      if (fixedEarnings > 0 && fullDayAmount > 0) {
        ratio = Math.min(fixedEarnings / fullDayAmount, 1);
      } else {
        ratio = 1;
      }
    }

    const hoursVal = ratio * dh;
    const hoursLabel2 = `${hoursVal.toFixed(1).replace('.', ',')} h`;
    if (ratio >= 0.995) {
      return { specialType, full: 1, partial: 0, label: hoursLabel2 };
    }
    if (ratio > 0) {
      return { specialType, full: 0, partial: ratio, label: hoursLabel2 };
    }
    return null;
  };

  // Giorni equivalenti trasferta allineati alla stessa logica mostrata in TimeEntryForm
  const getTravelEquivalentDay = (entry, breakdown, safeSettings) => {
    const travelAllowance = breakdown?.allowances?.travel || 0;
    if (travelAllowance <= 0) return 0;

    const travelSettings = safeSettings?.travelAllowance || {};
    const selectedOptions = travelSettings.selectedOptions || [travelSettings.option || 'WITH_TRAVEL'];

    const workHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) +
      (breakdown?.ordinary?.hours?.lavoro_extra || 0);
    const travelHours = (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0) +
      (breakdown?.ordinary?.hours?.viaggio_extra || 0);
    const totalWorked = workHours + travelHours;

    if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
      const standbyWorkHours = breakdown?.standby
        ? Object.values(breakdown?.standby?.workHours || {}).reduce((a, b) => a + b, 0)
        : 0;
      const standbyTravelHours = breakdown?.standby
        ? Object.values(breakdown?.standby?.travelHours || {}).reduce((a, b) => a + b, 0)
        : 0;
      const totalHours = totalWorked + standbyWorkHours + standbyTravelHours;
      return Math.min(totalHours / 8, 1.0);
    }

    if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY')) {
      if (totalWorked > 0 && totalWorked < 8) return 0.5;
      return 1.0;
    }

    const manualPercent = parseFloat(entry?.travel_allowance_percent ?? entry?.travelAllowancePercent ?? 1);
    if (!Number.isNaN(manualPercent) && manualPercent > 0 && manualPercent < 1) {
      return manualPercent;
    }

    return 1.0;
  };

  // � Formatta tutti gli orari di lavoro e viaggio per il giorno
  const renderDaySchedule = (entry, totalHours) => {
    const siteName = entry.site_name || '';
    const fc = theme.colors;
    const rows = [];
    const vd = String(entry.vehicle_driven || entry.vehicleDriven || '').toLowerCase();
    const isSpecificVehicleFlag = ['andata_ritorno', 'solo_andata', 'solo_ritorno', 'non_guidato'].includes(vd);
    const driveOutbound = vd === 'andata_ritorno' || vd === 'solo_andata' || (!isSpecificVehicleFlag && vd);
    const driveReturn = vd === 'andata_ritorno' || vd === 'solo_ritorno' || (!isSpecificVehicleFlag && vd);

    const addTravelRow = (key, isReturn, label, time) => {
      const drivenThisLeg = isReturn ? driveReturn : driveOutbound;

      rows.push(
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 1 }}>
          <View style={{ width: 13, height: 11, marginRight: 2 }}>
            <MaterialCommunityIcons
              name="car-side"
              size={11}
              color={isReturn ? '#E53935' : '#FFA726'}
              style={{ transform: isReturn ? [{ scaleX: -1 }] : [] }}
            />
            {!drivenThisLeg && (
              <Text style={{
                position: 'absolute', top: -2, right: -1,
                fontSize: 9, fontWeight: '900', color: '#E53935', lineHeight: 11
              }}>✕</Text>
            )}
          </View>
          {label ? <Text style={{ fontSize: 9, color: fc.text, fontWeight: '600' }}>{label} </Text> : null}
          {time ? <Text style={{ fontSize: 9, color: fc.textSecondary }}>{time}</Text> : null}
        </View>
      );
    };

    const addRow = (key, icon, iconColor, label, time, iconFlip) => {
      rows.push(
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 1 }}>
          <Ionicons name={icon} size={9} color={iconColor} style={{ marginRight: 2, transform: iconFlip ? [{ scaleX: -1 }] : [] }} />
          {label ? <Text style={{ fontSize: 9, color: fc.text, fontWeight: '600' }}>{label} </Text> : null}
          {time ? <Text style={{ fontSize: 9, color: fc.textSecondary }}>{time}</Text> : null}
        </View>
      );
    };

    const renderCantiereBlock = (prefix, dep, arr, ws1, we1, ws2, we2, depR, arrC, site) => {
      const sLabel = site || '';
      if (dep && arr) {
        addTravelRow(`${prefix}-va`, false, sLabel || '', `${dep}→${arr}`);
      }
      if (ws1 && we1) {
        if (!dep && sLabel) addRow(`${prefix}-sn`, 'business-outline', fc.primary, sLabel, '', false);
        addRow(`${prefix}-l1`, 'time-outline', fc.primary, '', `${ws1}-${we1}`, false);
      }
      if (ws2 && we2) {
        addRow(`${prefix}-l2`, 'time-outline', fc.primary, '', `${ws2}-${we2}`, false);
      }
      if (depR && arrC) {
        addTravelRow(`${prefix}-vr`, true, '', `${depR}→${arrC}`);
      }
    };

    // Cantiere 1 principale
    renderCantiereBlock(
      'c1',
      entry.departure_company, entry.arrival_site,
      entry.work_start_1, entry.work_end_1,
      entry.work_start_2, entry.work_end_2,
      entry.departure_return, entry.arrival_company,
      siteName
    );

    // Cantieri aggiuntivi (campo "viaggi")
    const viaggi = (() => {
      if (!entry.viaggi) return [];
      if (Array.isArray(entry.viaggi)) return entry.viaggi;
      try { return JSON.parse(entry.viaggi) || []; } catch { return []; }
    })();

    viaggi.forEach((v, i) => {
      renderCantiereBlock(
        `c${i + 2}`,
        v.departure_company, v.arrival_site,
        v.work_start_1, v.work_end_1,
        v.work_start_2, v.work_end_2,
        v.departure_return, v.arrival_company,
        v.site_name || ''
      );
    });

    // Interventi reperibilita: mostra gli orari anche quando non ci sono ore nel blocco principale
    const interventi = (() => {
      const parsed = createWorkEntryFromData(entry);
      return Array.isArray(parsed?.interventi) ? parsed.interventi : [];
    })();

    interventi.forEach((intv, i) => {
      const hasTimes = (intv?.work_start_1 && intv?.work_end_1) || (intv?.work_start_2 && intv?.work_end_2);
      if (!hasTimes) return;

      addRow(`int-${i}-lbl`, 'call-outline', '#9C27B0', `Intervento ${i + 1}`, '', false);
      renderCantiereBlock(
        `int-${i}`,
        intv?.departure_company,
        intv?.arrival_site,
        intv?.work_start_1,
        intv?.work_end_1,
        intv?.work_start_2,
        intv?.work_end_2,
        intv?.departure_return,
        intv?.arrival_company,
        intv?.site_name || ''
      );
    });

    // Totale
    rows.push(
      <View key="tot" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
        <Ionicons name="checkmark-circle-outline" size={9} color={fc.primary} style={{ marginRight: 2 }} />
        <Text style={{ fontSize: 9, color: fc.primary, fontWeight: '700' }}>Tot: {formatSafeHours(totalHours)}</Text>
      </View>
    );

    // Se non ci sono ore lavoro/viaggio, mostra cosa è presente nel giorno
    const hasWorkHours = !!(
      entry.work_start_1 ||
      entry.work_start_2 ||
      entry.departure_company ||
      entry.departure_return ||
      interventi.some((intv) =>
        (intv?.work_start_1 && intv?.work_end_1) ||
        (intv?.work_start_2 && intv?.work_end_2)
      )
    );
    if (!hasWorkHours) {
      const extras = [];
      const dayType = entry.day_type || entry.dayType || '';
      const dayTypeLabels = {
        ferie: { icon: 'sunny-outline', label: 'Ferie', color: '#4CAF50' },
        malattia: { icon: 'medkit-outline', label: 'Malattia', color: '#F44336' },
        permesso: { icon: 'calendar-outline', label: 'Permesso', color: '#2196F3' },
        riposo: { icon: 'bed-outline', label: 'Riposo', color: '#9E9E9E' },
        festivo: { icon: 'star-outline', label: 'Festivo', color: '#FF9800' },
        reperibilità: { icon: 'radio-outline', label: 'Reperibilità', color: '#9C27B0' },
        standby: { icon: 'radio-outline', label: 'Reperibilità', color: '#9C27B0' },
      };
      if (dayTypeLabels[dayType]) {
        const dt = dayTypeLabels[dayType];
        extras.push(
          <View key="dt" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name={dt.icon} size={9} color={dt.color} style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 9, color: dt.color, fontWeight: '600' }}>{dt.label}</Text>
          </View>
        );
      }
      if ((entry.meal_lunch_voucher > 0) || (entry.meal_lunch_cash > 0)) {
        extras.push(
          <View key="lunch" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="restaurant-outline" size={9} color="#FF9800" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 9, color: '#FF9800' }}>Pranzo</Text>
          </View>
        );
      }
      if ((entry.meal_dinner_voucher > 0) || (entry.meal_dinner_cash > 0)) {
        extras.push(
          <View key="dinner" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="moon-outline" size={9} color="#7C4DFF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 9, color: '#7C4DFF' }}>Cena</Text>
          </View>
        );
      }
      if (entry.travel_allowance > 0) {
        extras.push(
          <View key="travel" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <MaterialCommunityIcons name="car-side" size={9} color="#FFA726" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 9, color: '#FFA726' }}>Trasferta</Text>
          </View>
        );
      }
      if (entry.standby_allowance > 0 || entry.is_standby_day === 1) {
        extras.push(
          <View key="standby" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="radio-outline" size={9} color="#9C27B0" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 9, color: '#9C27B0' }}>Reperibilità</Text>
          </View>
        );
      }
      if (extras.length > 0) rows.push(...extras);
    }

    return rows.length > 1 ? rows : [
      <Text key="empty" style={{ fontSize: 9, color: fc.textSecondary }}>—{'\n'}Tot: {formatSafeHours(totalHours)}</Text>
    ];
  };

  // �📅 Carica e alterna espansione del mese
  const toggleMonthExpand = async (month) => {
    if (expandedMonth === month) {
      setExpandedMonth(null);
      return;
    }

    // Se gli entry sono già caricati, mostra solo
    if (monthEntries[month]) {
      setExpandedMonth(month);
      return;
    }

    // Altrimenti carica gli entry del mese con i breakdown
    try {
      setLoadingMonthEntries(true);
      const entries = await DatabaseService.getWorkEntries(year, month);
      
      // Carica il breakdown per ogni entry (identico a DashboardScreen)
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
          overtimeLimit: { hours: 8, type: 'daily' }
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
        ...settings,
        contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
        standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
        mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
        travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS',
        multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false,
      };

      const entriesWithBreakdown = await Promise.all((entries || []).map(async (entry) => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          const breakdown = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
          return { ...entry, breakdown };
        } catch (e) {
          console.warn(`Errore breakdown per ${entry.date}:`, e?.message);
          return { ...entry, breakdown: null };
        }
      }));

      const existingDateKeys = new Set((entriesWithBreakdown || []).map((entry) => toDateKey(entry.date)));
      const standbyAllowances = calculationService.calculateMonthlyStandbyAllowances(year, month, safeSettings) || [];
      const standbyOnlyEntries = standbyAllowances
        .filter((allowance) => !existingDateKeys.has(toDateKey(allowance.date)))
        .map((allowance) => ({
          id: `standby-only-${allowance.date}`,
          date: allowance.date,
          day_type: isItalianHoliday(allowance.date) ? 'festivo' : 'lavorativa',
          is_standby_day: 1,
          isStandbyDay: 1,
          standby_allowance: allowance.allowance || 0,
          interventi: [],
          breakdown: {
            ordinary: { hours: {} },
            standby: { workHours: {}, travelHours: {} },
            allowances: { travel: 0, standby: allowance.allowance || 0 },
            details: { hourlyRatesBreakdown: [] },
            totalEarnings: allowance.allowance || 0,
          },
        }));

      const mergedEntries = [...entriesWithBreakdown, ...standbyOnlyEntries]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      setMonthEntries(prev => ({ ...prev, [month]: mergedEntries }));
      setExpandedMonth(month);
    } catch (error) {
      console.error(`Errore caricamento entry mese ${month}:`, error);
      Alert.alert('Errore', `Impossibile caricare gli inserimenti di ${monthNames[month - 1]}`);
    } finally {
      setLoadingMonthEntries(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={[styles.centerContent, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento dati annuali...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // Percentuali configurate per intestazioni Notturne/Serali (UI)
  const uiCfgOvertime = settings?.contract?.overtimeRates || {};
  const uiSeraleMult = uiCfgOvertime.nightUntil22 || uiCfgOvertime.night || 1.25;
  const uiNotteMult = uiCfgOvertime.nightAfter22 || uiCfgOvertime.overtimeNightAfter22 || uiSeraleMult || 1.35;
  const uiSeralePct = Math.round((uiSeraleMult - 1) * 100);
  const uiNottePct = Math.round((uiNotteMult - 1) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        stickyHeaderIndices={[6]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 0 }]}>
          <TouchableOpacity onPress={() => { setYear(year - 1); setExpandedMonth(null); setMonthEntries({}); }} style={styles.yearButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.yearTitle}>{year}</Text>
          <TouchableOpacity onPress={() => { setYear(year + 1); setExpandedMonth(null); setMonthEntries({}); }} style={styles.yearButton}>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Selettore modalità retribuzione */}
        <View style={styles.modeSelector}>
          {[
            { key: 'totale', label: 'Totale Inserimenti' },
            { key: 'netto', label: 'Netto Stimato (IRPEF)' },
          ].map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeButton,
                earningsMode === mode.key && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setEarningsMode(mode.key)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.modeButtonText,
                    earningsMode === mode.key && { color: '#fff', fontWeight: 'bold' },
                  ]}
                >
                  {mode.label}
                </Text>
                {mode.key === 'totale' && (
                  <TouchableOpacity
                    style={{ marginLeft: 3 }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    onPress={() =>
                      Alert.alert(
                        'Totale Inserimenti',
                        'Importo lordo complessivo derivato da tutti gli inserimenti effettuati nel registro orario: ore ordinarie, straordinari, viaggi, reperibilità e indennità varie. Non include detrazioni fiscali.',
                      )
                    }
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={earningsMode === 'totale' ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistiche principali */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.success + '20' }]}>
            <Text style={styles.statLabel}>Ore Totali</Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {formatSafeHours(statistics.totalHours)}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={styles.statLabel}>
              {earningsMode === 'netto' ? 'Netto Stimato (IRPEF)' : 'Totale Inserimenti'}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatSafeAmount(statistics.totalEarnings)}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.warning + '20' }]}>
            <Text style={styles.statLabel}>Giorni Lavoro</Text>
            <Text style={[styles.statValue, { color: theme.colors.warning }]}>
              {statistics.totalWorkDays}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.info + '20' }]}>
            <Text style={styles.statLabel}>Media Ore/Giorno</Text>
            <Text style={[styles.statValue, { color: theme.colors.info }]}>
              {formatSafeHours(statistics.averageHoursPerDay)}
            </Text>
          </View>
        </View>

        {/* Ulteriori statistiche */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistiche Dettagliate</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Media Guadagni/Giorno:</Text>
            <Text style={styles.infoValue}>{formatSafeAmount(statistics.averageEarningsPerDay)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mese Migliore:</Text>
            <View style={styles.infoBest}>
              <Text style={styles.infoValue}>{statistics.maxEarningsMonth}</Text>
              <Text style={[styles.infoValue, { fontSize: 14 }]}>
                {formatSafeAmount(statistics.maxEarningsValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Grafico a barre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Guadagni Mensili</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
            <View style={styles.chart}>
              {Object.values(monthlyData).map((data) => {
                const val = earningsMode === 'netto' ? (data.netEarnings || 0) : earningsMode === 'lordo' ? (data.grossEarnings || 0) : (data.totalEarnings || 0);
                return (
                  <ChartBar
                    key={data.month}
                    value={val}
                    maxValue={statistics.maxEarningsValue}
                    label={monthNames[data.month - 1]}
                    height={150}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Dettagli mensili - titolo */}
        <View style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Text style={styles.sectionTitle}>📋 Dettagli Mensili</Text>
            <TouchableOpacity
              onPress={handlePrint}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 5 }}>Condividi</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, paddingHorizontal: 4, marginTop: -8, marginBottom: 6 }}>
            Info: per stampare/condividere il dettaglio giornaliero di un mese, tieni premuto sulla riga del mese.
          </Text>
        </View>

        {/* Riga blu colonne — sticky: si incolla al top mentre scorri */}
        <ScrollView
          horizontal
          ref={tableHeaderScrollRef}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={[styles.tRow, styles.tHeaderRow]}>
            <Text style={[styles.tCell, styles.tCellMese, styles.tHeaderText]}>Mese</Text>
            <Text style={[styles.tCell, styles.tCellGg, styles.tHeaderText]}>Giorni</Text>
            <Text style={[styles.tCell, styles.tHeaderText, { width: 100 }]}>Ore Tot</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Guadagni</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Reg.</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Straord.</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Viaggio{`\n`}come lav.</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Viaggio{`\n`}comp.</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>{`Notturne al ${uiNottePct}%`}</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>{`Serali al ${uiSeralePct}%`}</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Sabato</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Domenica</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Giorni{`\n`}Reperibile</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Rep.{`\n`}Fer</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Rep.{`\n`}Sab</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Rep.{`\n`}Dom</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Rep.{`\n`}Fest</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Usc.Rep</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Ind.Trasf</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Festivo</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Ferie</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Permesso</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Malattia</Text>
            <Text style={[styles.tCell, styles.tHeaderText]}>Rip.Comp</Text>
            <Text style={[styles.tCell, styles.tHeaderText, { width: 110 }]}>Pasti</Text>
          </View>
        </ScrollView>

        {/* Mensilità: scorrono nella pagina (niente area verticale fissa) */}
        <ScrollView
          horizontal
          ref={tableBodyScrollRef}
          showsHorizontalScrollIndicator={true}
          scrollEventThrottle={16}
          onScroll={(e) => {
            tableHeaderScrollRef.current?.scrollTo({
              x: e.nativeEvent.contentOffset.x,
              animated: false,
            });
          }}
        >
          <View>

              {Object.values(monthlyData).map((data, idx) => {
                const earnings = earningsMode === 'netto' ? (data.netEarnings || 0) : (data.totalEarnings || 0);
                const isExpanded = expandedMonth === data.month;
                const entries = monthEntries[data.month] || [];
                const totalH = data.totalHours || 0;
                const nightPct = totalH > 0 ? Math.round(((data._nightHours || 0) / totalH) * 100) : 0;
                const evenPct = totalH > 0 ? Math.round(((data._eveningHours || 0) / totalH) * 100) : 0;
                
                return (
                  <View key={data.month}>
                    <TouchableOpacity 
                      onPress={() => toggleMonthExpand(data.month)}
                      onLongPress={() => handleMonthLongPress(data.month)}
                      delayLongPress={250}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.tRow, idx % 2 === 0 && { backgroundColor: theme.colors.surface }]}>
                        <View
                          style={{
                            width: 96,
                            paddingVertical: 10,
                            paddingHorizontal: 4,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text numberOfLines={1} style={{ color: theme.colors.text, fontWeight: '600', fontSize: 12 }}>
                            {monthNamesFull[data.month - 1]}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={12}
                            color={theme.colors.textSecondary}
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                          />
                        </View>
                        <View style={[styles.tCell, styles.tCellGg, { paddingVertical: 4, alignItems: 'center', justifyContent: 'center' }]}> 
                          <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>Lavorati {data._effectiveWorkDays || 0}</Text>
                          <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Inseriti {data.workDays || 0}</Text>
                        </View>
                        <Text style={[styles.tCell, { width: 100, textAlign: 'center' }]}>{formatSafeHours(data.totalHours)}</Text>
                        <Text style={[styles.tCell, { color: theme.colors.primary, fontWeight: '600' }]}>{formatSafeAmount(earnings)}</Text>
                        <Text style={[styles.tCell, { color: theme.colors.success }]}>{formatSafeHours(data._regularWorkHours || 0)}</Text>
                        <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 4 }]}>
                          {(() => {
                            const ovtTotal = data._overtimeWorkHours || 0;
                            const byPct = data._overtimeByPercentage || {};
                            const pctEntries = Object.entries(byPct).filter(([, v]) => v.hours > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
                            return (
                              <>
                                <Text style={{ color: theme.colors.warning || '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                                  {formatSafeHours(ovtTotal)}
                                </Text>
                                {pctEntries.map(([pct, val]) => (
                                  <Text key={pct} style={{ fontSize: 9, color: '#fb923c', textAlign: 'center' }}>
                                    {formatSafeHours(val.hours)} {pct}
                                  </Text>
                                ))}
                              </>
                            );
                          })()}
                        </View>
                        <Text style={styles.tCell}>{formatSafeHours(data._travelRegularHours || 0)}</Text>
                        <Text style={styles.tCell}>{formatSafeHours(data._travelExtraHours || 0)}</Text>
                        <Text style={[styles.tCell, { color: '#6366f1' }]}>{formatSafeHours(data._nightHours || 0)}{totalH > 0 ? ' (' + nightPct + '%)' : ''}</Text>
                        <Text style={[styles.tCell, { color: '#8b5cf6' }]}>{formatSafeHours(data._eveningHours || 0)}{totalH > 0 ? ' (' + evenPct + '%)' : ''}</Text>
                        <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                          {(data._saturdayDays || 0) > 0 ? (
                            <>
                              <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>{data._saturdayDays} gg</Text>
                              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(data._saturdayHours || 0)}</Text>
                            </>
                          ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                        </View>
                        <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                          {(data._sundayDays || 0) > 0 ? (
                            <>
                              <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>{data._sundayDays} gg</Text>
                              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(data._sundayHours || 0)}</Text>
                            </>
                          ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                        </View>
                        <Text style={styles.tCell}>{data._standbyDays || 0}</Text>
                        <Text style={styles.tCell}>{data._standbyWeekdayDays || 0}</Text>
                        <Text style={styles.tCell}>{data._standbySaturdayDays || 0}</Text>
                        <Text style={styles.tCell}>{data._standbySundayDays || 0}</Text>
                        <Text style={styles.tCell}>{data._standbyHolidayDays || 0}</Text>
                        <Text style={styles.tCell}>{data._standbyInterventions || 0}</Text>
                        <Text style={[styles.tCell, { color: '#0ea5e9', fontWeight: '600' }]}>{formatSafeAmount(data._travelAllowanceAmount || 0)} (x{formatEquivalentDays(data._travelAllowanceDays || 0)})</Text>
                        <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                          {(data._holidayWorkDays || 0) > 0 ? (
                            <>
                              <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>{data._holidayWorkDays} gg</Text>
                              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(data._holidayHours || 0)}</Text>
                            </>
                          ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                        </View>
                        <Text style={styles.tCell}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = ((data._ferieFull||0)+(data._feriePartial||0))*dh; return h > 0 ? `${h.toFixed(1).replace('.',',')} h` : '—'; })()}</Text>
                        <Text style={styles.tCell}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = ((data._permessoFull||0)+(data._permessoPartial||0))*dh; return h > 0 ? `${h.toFixed(1).replace('.',',')} h` : '—'; })()}</Text>
                        <Text style={styles.tCell}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = ((data._malattiaFull||0)+(data._malattiaPartial||0))*dh; return h > 0 ? `${h.toFixed(1).replace('.',',')} h` : '—'; })()}</Text>
                        <Text style={styles.tCell}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = ((data._riposoCompFull||0)+(data._riposoCompPartial||0))*dh; return h > 0 ? `${h.toFixed(1).replace('.',',')} h` : '—'; })()}</Text>
                        <View style={[styles.tCell, { width: 110, alignItems: 'center', paddingVertical: 4 }]}>
                          {(data._mealLunchVoucher > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <MaterialCommunityIcons name="silverware-fork-knife" size={10} color="#FF9800" />
                              <MaterialCommunityIcons name="ticket-outline" size={9} color="#FF9800" style={{ marginLeft: 1, marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#FF9800' }}>{data._mealLunchVoucher.toFixed(2).replace('.',',')}€ (x{data._mealLunchVoucherCount || 0})</Text>
                            </View>
                          )}
                          {(data._mealLunchCashWithVoucher > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <MaterialCommunityIcons name="ticket-outline" size={9} color="#2E7D32" />
                              <MaterialCommunityIcons name="cash" size={9} color="#2E7D32" style={{ marginLeft: 1, marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#2E7D32' }}>{data._mealLunchCashWithVoucher.toFixed(2).replace('.',',')}€ (x{data._mealLunchCashWithVoucherCount || 0})</Text>
                            </View>
                          )}
                          {(data._mealLunchCashOnly > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <MaterialCommunityIcons name="cash" size={9} color="#4CAF50" style={{ marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#4CAF50' }}>{data._mealLunchCashOnly.toFixed(2).replace('.',',')}€ (x{data._mealLunchCashOnlyCount || 0})</Text>
                            </View>
                          )}
                          {(data._mealDinnerVoucher > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                              <MaterialCommunityIcons name="glass-wine" size={10} color="#9C27B0" />
                              <MaterialCommunityIcons name="ticket-outline" size={9} color="#9C27B0" style={{ marginLeft: 1, marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#9C27B0' }}>{data._mealDinnerVoucher.toFixed(2).replace('.',',')}€ (x{data._mealDinnerVoucherCount || 0})</Text>
                            </View>
                          )}
                          {(data._mealDinnerCashWithVoucher > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialCommunityIcons name="ticket-outline" size={9} color="#1976D2" />
                              <MaterialCommunityIcons name="cash" size={9} color="#1976D2" style={{ marginLeft: 1, marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#1976D2' }}>{data._mealDinnerCashWithVoucher.toFixed(2).replace('.',',')}€ (x{data._mealDinnerCashWithVoucherCount || 0})</Text>
                            </View>
                          )}
                          {(data._mealDinnerCashOnly > 0) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialCommunityIcons name="cash" size={9} color="#2196F3" style={{ marginRight: 2 }} />
                              <Text style={{ fontSize: 9, color: '#2196F3' }}>{data._mealDinnerCashOnly.toFixed(2).replace('.',',')}€ (x{data._mealDinnerCashOnlyCount || 0})</Text>
                            </View>
                          )}
                          {(!data._mealLunchVoucher && !data._mealLunchCashWithVoucher && !data._mealLunchCashOnly && !data._mealDinnerVoucher && !data._mealDinnerCashWithVoucher && !data._mealDinnerCashOnly) && <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>—</Text>}
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Tendina dettagli inserimenti del mese */}
                    {isExpanded && (
                      <View style={{ backgroundColor: theme.colors.background, borderLeftWidth: 3, borderLeftColor: theme.colors.primary }}>
                        {loadingMonthEntries ? (
                          <View style={{ padding: 16, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                          </View>
                        ) : entries && entries.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                              {/* Righe dei giorni - ESATTAMENTE allineate alle 14 colonne della tabella */}
                              {entries.map((entry) => {
                                const dayData = extractBreakdownHours(entry.breakdown, entry);
                                const meals = getMealDisplayAmounts(entry);
                                // Estrai solo il giorno dalla data (YYYY-MM-DD → DD)
                                const dayOfMonth = entry.date.split('-')[2];
                                const isRealEntry = entry.id && !String(entry.id).startsWith('standby-only-');

                                // Doppio tap → apri TimeEntryForm in modalità edit
                                const handleDoubleTap = () => {
                                  if (!isRealEntry) return;
                                  const now = Date.now();
                                  const last = doubleTapTimestamps.current[entry.date] || 0;
                                  if (now - last < 350) {
                                    doubleTapTimestamps.current[entry.date] = 0;
                                    navigation.navigate('TimeEntry', {
                                      screen: 'TimeEntryForm',
                                      params: { entry, isEdit: true, enableDelete: true }
                                    });
                                  } else {
                                    doubleTapTimestamps.current[entry.date] = now;
                                  }
                                };
                                
                                return (
                                  <TouchableOpacity
                                    key={entry.date}
                                    activeOpacity={isRealEntry ? 0.7 : 1}
                                    onPress={handleDoubleTap}
                                    style={[styles.tRow, { backgroundColor: theme.colors.surface + '40' }]}
                                  >
                                    {/* Colonna 1: Giorno settimanale */}
                                    <Text style={[styles.tCell, styles.tCellMese, { color: theme.colors.text, fontWeight: '600' }]}>
                                      {dayData.dayName}
                                    </Text>
                                    
                                    {/* Colonna 2: Giorno del mese (es. 06) */}
                                    <Text style={[styles.tCell, styles.tCellGg]}>
                                      {dayOfMonth}
                                    </Text>
                                    
                                    {/* Colonna 3: Ore Tot - Orari dettagliati + totale */}
                                    <View style={styles.tCellOreTot}>
                                      {renderDaySchedule(entry, dayData.totalHours)}
                                    </View>
                                    
                                    {/* Colonna 4: Guadagni */}
                                    <Text style={[styles.tCell, { color: theme.colors.primary, fontWeight: '600' }]}>
                                      {formatSafeAmount(dayData.dailyEarnings)}
                                    </Text>
                                    
                                    {/* Colonna 5: Reg. - Ore ordinarie */}
                                    <Text style={[styles.tCell, { color: theme.colors.success }]}>
                                      {formatSafeHours(dayData.ordinaryHours)}
                                    </Text>
                                    
                                    {/* Colonna 6: Straord. - Totale + righe per % (lavoro+viaggio insieme) */}
                                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 4 }]}>
                                      {dayData.overtimeHours > 0 ? (
                                        <>
                                          <Text style={{ color: theme.colors.warning || '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                                            {formatSafeHours(dayData.overtimeHours)}
                                          </Text>
                                          {dayData._overtimePctMap && dayData._overtimePctMap.size > 0
                                            ? Array.from(dayData._overtimePctMap.entries())
                                                .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
                                                .map(([pct, val]) => (
                                                  <Text key={pct} style={{ fontSize: 9, color: '#fb923c', textAlign: 'center' }}>
                                                    {formatSafeHours(val.hours)} {pct}
                                                  </Text>
                                                ))
                                            : dayData._specialPct
                                              ? <Text style={{ fontSize: 9, color: '#fb923c' }}>{dayData._specialPct}</Text>
                                              : null}
                                        </>
                                      ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                                    </View>
                                    
                                    {/* Colonna 7: Viaggio - Ore viaggio ordinarie */}
                                    <Text style={styles.tCell}>
                                      {formatSafeHours(dayData.travelRegular)}
                                    </Text>
                                    
                                    {/* Colonna 8: Viag.Ext - Ore viaggio extra */}
                                    <Text style={styles.tCell}>
                                      {formatSafeHours(dayData.travelExtra)}
                                    </Text>
                                    
                                    {/* Colonna 9: Notturne */}
                                    <Text style={[styles.tCell, { color: '#6366f1' }]}>
                                      {formatSafeHours(dayData.nightHours)}
                                    </Text>
                                    
                                    {/* Colonna 10: Serali */}
                                    <Text style={[styles.tCell, { color: '#8b5cf6' }]}>
                                      {formatSafeHours(dayData.eveningHours)}
                                    </Text>
                                    
                                    {/* Colonna 11: Sabato */}
                                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                                      {dayData.isSaturday && dayData.totalHours > 0 ? (
                                        <>
                                          <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>Sì</Text>
                                          <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(dayData.totalHours)}</Text>
                                        </>
                                      ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                                    </View>
                                    
                                    {/* Colonna 12: Domenica */}
                                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                                      {dayData.isSunday && dayData.totalHours > 0 ? (
                                        <>
                                          <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>Sì</Text>
                                          <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(dayData.totalHours)}</Text>
                                        </>
                                      ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                                    </View>
                                    
                                    {/* Colonna 13: Rep.Gg */}
                                    <Text style={styles.tCell}>
                                      {dayData.isStandby ? 'Si' : '—'}
                                    </Text>
                                    
                                    {/* Colonna 14: Rep.Fer */}
                                    <Text style={styles.tCell}>
                                      {dayData.standbyWeekday ? 'Si' : '—'}
                                    </Text>

                                    {/* Colonna 15: Rep.Sab */}
                                    <Text style={styles.tCell}>
                                      {dayData.standbySaturday ? 'Si' : '—'}
                                    </Text>

                                    {/* Colonna 16: Rep.Dom */}
                                    <Text style={styles.tCell}>
                                      {dayData.standbySunday ? 'Si' : '—'}
                                    </Text>

                                    {/* Colonna 17: Rep.Fest */}
                                    <Text style={styles.tCell}>
                                      {dayData.standbyHoliday ? 'Si' : '—'}
                                    </Text>

                                    {/* Colonna 18: Usc.Rep - Interventi */}
                                    <Text style={styles.tCell}>
                                      {dayData.standbyInterventi > 0 ? 'Si' : '—'}
                                    </Text>

                                    {/* Colonna 19: Indennita Trasferta */}
                                    <Text style={[styles.tCell, { color: '#0ea5e9', fontWeight: '600' }]}>
                                      {formatSafeAmount(dayData.travelAllowanceAmount || 0)}
                                    </Text>

                                    {/* Colonna 20: Festivo */}
                                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                                      {dayData.isHoliday && dayData.totalHours > 0 ? (
                                        <>
                                          <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>Sì</Text>
                                          <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>{formatSafeHours(dayData.totalHours)}</Text>
                                        </>
                                      ) : <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>—</Text>}
                                    </View>

                                    {/* Colonna 21: Ferie */}
                                    <Text style={styles.tCell}>{dayData.specialType === 'ferie' ? dayData.specialLabel : '—'}</Text>

                                    {/* Colonna 22: Permesso */}
                                    <Text style={styles.tCell}>{dayData.specialType === 'permesso' ? dayData.specialLabel : '—'}</Text>

                                    {/* Colonna 23: Malattia */}
                                    <Text style={styles.tCell}>{dayData.specialType === 'malattia' ? dayData.specialLabel : '—'}</Text>

                                    {/* Colonna 24: Riposo Compensativo */}
                                    <Text style={styles.tCell}>{dayData.specialType === 'riposo_compensativo' ? dayData.specialLabel : '—'}</Text>

                                    {/* Colonna 25: Pasti */}
                                    <View style={[styles.tCell, { width: 110, alignItems: 'center', paddingVertical: 4 }]}>
                                      {(meals.mealLunchVoucher > 0 || meals.mealLunchCashWithVoucher > 0 || meals.mealLunchCashOnly > 0) && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                                          <MaterialCommunityIcons name="silverware-fork-knife" size={11} color="#FF9800" style={{ marginRight: 2 }} />
                                          <View>
                                            {meals.mealLunchVoucher > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="ticket-outline" size={9} color="#FF9800" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#FF9800' }}>{meals.mealLunchVoucher.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                            {meals.mealLunchCashWithVoucher > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="ticket-outline" size={9} color="#2E7D32" style={{ marginRight: 1 }} />
                                                <MaterialCommunityIcons name="cash" size={9} color="#2E7D32" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#2E7D32' }}>{meals.mealLunchCashWithVoucher.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                            {meals.mealLunchCashOnly > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="cash" size={9} color="#4CAF50" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#4CAF50' }}>{meals.mealLunchCashOnly.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                          </View>
                                        </View>
                                      )}
                                      {(meals.mealDinnerVoucher > 0 || meals.mealDinnerCashWithVoucher > 0 || meals.mealDinnerCashOnly > 0) && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                          <MaterialCommunityIcons name="glass-wine" size={11} color="#9C27B0" style={{ marginRight: 2 }} />
                                          <View>
                                            {meals.mealDinnerVoucher > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="ticket-outline" size={9} color="#9C27B0" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#9C27B0' }}>{meals.mealDinnerVoucher.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                            {meals.mealDinnerCashWithVoucher > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="ticket-outline" size={9} color="#1976D2" style={{ marginRight: 1 }} />
                                                <MaterialCommunityIcons name="cash" size={9} color="#1976D2" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#1976D2' }}>{meals.mealDinnerCashWithVoucher.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                            {meals.mealDinnerCashOnly > 0 && (
                                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="cash" size={9} color="#2196F3" style={{ marginRight: 1 }} />
                                                <Text style={{ fontSize: 9, color: '#2196F3' }}>{meals.mealDinnerCashOnly.toFixed(2).replace('.',',')}€</Text>
                                              </View>
                                            )}
                                          </View>
                                        </View>
                                      )}
                                      {(!meals.mealLunchVoucher && !meals.mealLunchCashWithVoucher && !meals.mealLunchCashOnly && !meals.mealDinnerVoucher && !meals.mealDinnerCashWithVoucher && !meals.mealDinnerCashOnly) && (
                                        <Text style={{ fontSize: 9, color: theme.colors.textSecondary }}>—</Text>
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        ) : (
                          <Text style={{ paddingHorizontal: 12, paddingVertical: 8, color: theme.colors.textSecondary, fontSize: 12 }}>
                            Nessun inserimento per questo mese
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Footer totali */}
              <View style={{ height: 2, backgroundColor: theme.colors.primary }} />
              <View style={[styles.tRow, styles.tFooterRow]}>
                <Text style={[styles.tCell, styles.tCellMese, styles.tHeaderText]}>TOT</Text>
                <Text style={[styles.tCell, styles.tCellGg, styles.tHeaderText]}>{statistics.totalWorkDays}</Text>
                <Text style={[styles.tCell, styles.tHeaderText, { width: 100 }]}>{formatSafeHours(statistics.totalHours)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText, { fontWeight: '700', textAlignVertical: 'center', alignSelf: 'center' }]}>{formatSafeAmount(statistics.totalEarnings)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeHours(Object.values(monthlyData).reduce((s, d) => s + (d._regularWorkHours || 0), 0))}</Text>
                {(() => {
                  const ovtTotal = Object.values(monthlyData).reduce((s, d) => s + (d._overtimeWorkHours || 0), 0);
                  const byPct = statistics.overtimeByPercentage || {};
                  const pctEntries = Object.entries(byPct).filter(([, v]) => v.hours > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
                  return (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 4 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 12, fontWeight: '600' }]}>{formatSafeHours(ovtTotal)}</Text>
                      {pctEntries.map(([pct, val]) => (
                        <Text key={pct} style={{ fontSize: 9, color: '#fb923c', textAlign: 'center' }}>
                          {formatSafeHours(val.hours)} {pct}
                        </Text>
                      ))}
                    </View>
                  );
                })()}
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeHours(Object.values(monthlyData).reduce((s, d) => s + (d._travelRegularHours || 0), 0))}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeHours(Object.values(monthlyData).reduce((s, d) => s + (d._travelExtraHours || 0), 0))}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeHours(Object.values(monthlyData).reduce((s, d) => s + (d._nightHours || 0), 0))}{statistics.totalHours ? ' (' + Math.round((Object.values(monthlyData).reduce((s, d) => s + (d._nightHours || 0), 0) / statistics.totalHours) * 100) + '%)' : ''}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeHours(Object.values(monthlyData).reduce((s, d) => s + (d._eveningHours || 0), 0))}{statistics.totalHours ? ' (' + Math.round((Object.values(monthlyData).reduce((s, d) => s + (d._eveningHours || 0), 0) / statistics.totalHours) * 100) + '%)' : ''}</Text>
                {(() => {
                  const totDays = Object.values(monthlyData).reduce((s, d) => s + (d._saturdayDays || 0), 0);
                  const totHrs = Object.values(monthlyData).reduce((s, d) => s + (d._saturdayHours || 0), 0);
                  return totDays > 0 ? (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 11 }]}>{totDays} gg</Text>
                      <Text style={{ fontSize: 10, color: '#ffffffaa' }}>{formatSafeHours(totHrs)}</Text>
                    </View>
                  ) : <Text style={[styles.tCell, styles.tHeaderText]}>—</Text>;
                })()}
                {(() => {
                  const totDays = Object.values(monthlyData).reduce((s, d) => s + (d._sundayDays || 0), 0);
                  const totHrs = Object.values(monthlyData).reduce((s, d) => s + (d._sundayHours || 0), 0);
                  return totDays > 0 ? (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 11 }]}>{totDays} gg</Text>
                      <Text style={{ fontSize: 10, color: '#ffffffaa' }}>{formatSafeHours(totHrs)}</Text>
                    </View>
                  ) : <Text style={[styles.tCell, styles.tHeaderText]}>—</Text>;
                })()}
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbyDays || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbyWeekdayDays || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbySaturdayDays || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbySundayDays || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbyHolidayDays || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{Object.values(monthlyData).reduce((s, d) => s + (d._standbyInterventions || 0), 0)}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{formatSafeAmount(Object.values(monthlyData).reduce((s, d) => s + (d._travelAllowanceAmount || 0), 0))} (x{formatEquivalentDays(Object.values(monthlyData).reduce((s, d) => s + (d._travelAllowanceDays || 0), 0))})</Text>
                {(() => {
                  const totDays = Object.values(monthlyData).reduce((s, d) => s + (d._holidayWorkDays || 0), 0);
                  const totHrs = Object.values(monthlyData).reduce((s, d) => s + (d._holidayHours || 0), 0);
                  return totDays > 0 ? (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 3 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 11 }]}>{totDays} gg</Text>
                      <Text style={{ fontSize: 10, color: '#ffffffaa' }}>{formatSafeHours(totHrs)}</Text>
                    </View>
                  ) : <Text style={[styles.tCell, styles.tHeaderText]}>—</Text>;
                })()}
                {(() => {
                  const today = new Date();
                  const monthsElapsed = year < today.getFullYear() ? 12 : (year > today.getFullYear() ? 0 : today.getMonth() + 1);
                  const dailyHours = settings?.contract?.dailyHours || 8;
                  const usedFull = Object.values(monthlyData).reduce((s, d) => s + (d._ferieFull || 0), 0);
                  const usedPartial = Object.values(monthlyData).reduce((s, d) => s + (d._feriePartial || 0), 0);
                  const usedHours = (usedFull + usedPartial) * dailyHours;
                  const maturatiAdOggi = vacationSettings ? (vacationSettings.ferieMaturatiMensili || 0) * monthsElapsed : null;
                  const disponibili = maturatiAdOggi !== null ? (vacationSettings.ferieResAnniPrec || 0) + maturatiAdOggi : null;
                  const residual = disponibili !== null ? disponibili - usedHours : null;
                  return (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 4 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 11, textAlign: 'center' }]}>{usedHours > 0 ? `${usedHours.toFixed(1)} h` : '—'}</Text>
                      {residual !== null && (
                        <Text style={{ fontSize: 9, color: residual >= 0 ? '#A5D6A7' : '#FF8A80', textAlign: 'center', fontWeight: '600' }}>
                          Res: {residual.toFixed(1)} ore
                        </Text>
                      )}
                    </View>
                  );
                })()}
                {(() => {
                  const today = new Date();
                  const monthsElapsed = year < today.getFullYear() ? 12 : (year > today.getFullYear() ? 0 : today.getMonth() + 1);
                  const dailyHours = settings?.contract?.dailyHours || 8;
                  const usedFull = Object.values(monthlyData).reduce((s, d) => s + (d._permessoFull || 0), 0);
                  const usedPartial = Object.values(monthlyData).reduce((s, d) => s + (d._permessoPartial || 0), 0);
                  const usedHours = (usedFull + usedPartial) * dailyHours;
                  const maturatiAdOggi = vacationSettings
                    ? ((vacationSettings.permROAMaturatiMensili || 0) + (vacationSettings.permFestMaturatiMensili || 0)) * monthsElapsed
                    : null;
                  const disponibili = maturatiAdOggi !== null
                    ? (vacationSettings.permROAResAnniPrec || 0) + (vacationSettings.permFestResAnniPrec || 0) + maturatiAdOggi
                    : null;
                  const residual = disponibili !== null ? disponibili - usedHours : null;
                  return (
                    <View style={[styles.tCell, { alignItems: 'center', paddingVertical: 4 }]}>
                      <Text style={[styles.tHeaderText, { fontSize: 11, textAlign: 'center' }]}>{usedHours > 0 ? `${usedHours.toFixed(1)} h` : '—'}</Text>
                      {residual !== null && (
                        <Text style={{ fontSize: 9, color: residual >= 0 ? '#A5D6A7' : '#FF8A80', textAlign: 'center', fontWeight: '600' }}>
                          Res: {residual.toFixed(1)} ore
                        </Text>
                      )}
                    </View>
                  );
                })()}
                <Text style={[styles.tCell, styles.tHeaderText]}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = (Object.values(monthlyData).reduce((s,d)=>s+(d._malattiaFull||0),0) + Object.values(monthlyData).reduce((s,d)=>s+(d._malattiaPartial||0),0)) * dh; return h > 0 ? `${h.toFixed(1)} h` : '—'; })()}</Text>
                <Text style={[styles.tCell, styles.tHeaderText]}>{(() => { const dh = settings?.contract?.dailyHours || 8; const h = (Object.values(monthlyData).reduce((s,d)=>s+(d._riposoCompFull||0),0) + Object.values(monthlyData).reduce((s,d)=>s+(d._riposoCompPartial||0),0)) * dh; return h > 0 ? `${h.toFixed(1)} h` : '—'; })()}</Text>
                <View style={[styles.tCell, styles.tHeaderText, { width: 110, alignItems: 'center', paddingVertical: 4 }]}>
                  {(() => { const lv = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchVoucher||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchVoucherCount||0),0); return lv > 0 ? <View style={{ flexDirection:'row', alignItems:'center', marginBottom:2 }}><MaterialCommunityIcons name="silverware-fork-knife" size={10} color="#FFE082" /><MaterialCommunityIcons name="ticket-outline" size={9} color="#FFE082" style={{ marginLeft:1, marginRight:2 }} /><Text style={{ fontSize:9, color:'#FFE082' }}>{lv.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                  {(() => { const lcw = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchCashWithVoucher||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchCashWithVoucherCount||0),0); return lcw > 0 ? <View style={{ flexDirection:'row', alignItems:'center', marginBottom:2 }}><MaterialCommunityIcons name="ticket-outline" size={9} color="#A5D6A7" /><MaterialCommunityIcons name="cash" size={9} color="#A5D6A7" style={{ marginLeft:1, marginRight:2 }} /><Text style={{ fontSize:9, color:'#A5D6A7' }}>{lcw.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                  {(() => { const lco = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchCashOnly||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealLunchCashOnlyCount||0),0); return lco > 0 ? <View style={{ flexDirection:'row', alignItems:'center', marginBottom:2 }}><MaterialCommunityIcons name="cash" size={9} color="#A5D6A7" style={{ marginRight:2 }} /><Text style={{ fontSize:9, color:'#A5D6A7' }}>{lco.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                  {(() => { const dv = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerVoucher||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerVoucherCount||0),0); return dv > 0 ? <View style={{ flexDirection:'row', alignItems:'center', marginBottom:2 }}><MaterialCommunityIcons name="glass-wine" size={10} color="#CE93D8" /><MaterialCommunityIcons name="ticket-outline" size={9} color="#CE93D8" style={{ marginLeft:1, marginRight:2 }} /><Text style={{ fontSize:9, color:'#CE93D8' }}>{dv.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                  {(() => { const dcw = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerCashWithVoucher||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerCashWithVoucherCount||0),0); return dcw > 0 ? <View style={{ flexDirection:'row', alignItems:'center', marginBottom:2 }}><MaterialCommunityIcons name="ticket-outline" size={9} color="#90CAF9" /><MaterialCommunityIcons name="cash" size={9} color="#90CAF9" style={{ marginLeft:1, marginRight:2 }} /><Text style={{ fontSize:9, color:'#90CAF9' }}>{dcw.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                  {(() => { const dco = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerCashOnly||0),0); const c = Object.values(monthlyData).reduce((s,d)=>s+(d._mealDinnerCashOnlyCount||0),0); return dco > 0 ? <View style={{ flexDirection:'row', alignItems:'center' }}><MaterialCommunityIcons name="cash" size={9} color="#90CAF9" style={{ marginRight:2 }} /><Text style={{ fontSize:9, color:'#90CAF9' }}>{dco.toFixed(2).replace('.',',')}€ (x{c})</Text></View> : null; })()}
                </View>
              </View>
          </View>
        </ScrollView>

        <View style={{ height: 20 }} />

        {/* Info point legenda icone */}
        <View style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>Legenda icone dettaglio giornata</Text>
          </View>

          {/* Viaggio andata - ha guidato */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
            <View style={{ width: 13, height: 11, marginRight: 8 }}>
              <MaterialCommunityIcons name="car-side" size={11} color="#FFA726" />
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.text }}>Viaggio <Text style={{ fontWeight: '700' }}>andata</Text> (ha guidato)</Text>
          </View>

          {/* Viaggio ritorno - ha guidato */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
            <View style={{ width: 13, height: 11, marginRight: 8 }}>
              <MaterialCommunityIcons name="car-side" size={11} color="#E53935" style={{ transform: [{ scaleX: -1 }] }} />
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.text }}>Viaggio <Text style={{ fontWeight: '700' }}>ritorno</Text> (ha guidato)</Text>
          </View>

          {/* Viaggio - non ha guidato */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
            <View style={{ width: 13, height: 11, marginRight: 8 }}>
              <MaterialCommunityIcons name="car-side" size={11} color="#FFA726" />
              <Text style={{ position: 'absolute', top: -2, right: -1, fontSize: 9, fontWeight: '900', color: '#E53935', lineHeight: 11 }}>✕</Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.text }}>Viaggio (passeggero, <Text style={{ fontWeight: '700' }}>non ha guidato</Text>)</Text>
          </View>

          {/* Orario lavoro */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
            <Ionicons name="time-outline" size={11} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}>Orario di <Text style={{ fontWeight: '700' }}>lavoro</Text></Text>
          </View>

          {/* Cantiere */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
            <Ionicons name="business-outline" size={11} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}>Nome <Text style={{ fontWeight: '700' }}>cantiere</Text></Text>
          </View>

          {/* Totale */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="checkmark-circle-outline" size={11} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}><Text style={{ fontWeight: '700' }}>Totale ore</Text> giornata</Text>
          </View>

          {/* Separatore pasti */}
          <View style={{ height: 1, backgroundColor: theme.colors.border, marginBottom: 8 }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 7 }}>PASTI</Text>

          {/* Pranzo buono */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={11} color="#FF9800" />
            <MaterialCommunityIcons name="ticket-outline" size={10} color="#FF9800" style={{ marginLeft: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}><Text style={{ fontWeight: '700' }}>Pranzo</Text> con buono pasto</Text>
          </View>

          {/* Pranzo contanti */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={11} color="#4CAF50" />
            <MaterialCommunityIcons name="cash" size={10} color="#4CAF50" style={{ marginLeft: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}><Text style={{ fontWeight: '700' }}>Pranzo</Text> pagato in contanti</Text>
          </View>

          {/* Cena buono */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="glass-wine" size={11} color="#9C27B0" />
            <MaterialCommunityIcons name="ticket-outline" size={10} color="#9C27B0" style={{ marginLeft: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}><Text style={{ fontWeight: '700' }}>Cena</Text> con buono pasto</Text>
          </View>

          {/* Cena contanti */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="glass-wine" size={11} color="#2196F3" />
            <MaterialCommunityIcons name="cash" size={10} color="#2196F3" style={{ marginLeft: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: theme.colors.text }}><Text style={{ fontWeight: '700' }}>Cena</Text> pagata in contanti</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// Helper functions
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

const formatEquivalentDays = (value) => {
  const rounded = Math.round((value || 0) * 10) / 10;
  return rounded.toFixed(1).replace('.', ',');
};

const formatSpecialCount = (full, partial) => {
  const f = Math.round((full || 0));
  const p = partial || 0;
  if (f === 0 && p <= 0) return '—';
  if (f > 0 && p > 0) return `${f}+${formatEquivalentDays(p)}p`;
  if (f > 0) return `${f}`;
  return `${formatEquivalentDays(p)}p`;
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 12,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    yearButton: {
      padding: 8,
    },
    yearTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 24,
      gap: 12,
    },
    modeSelector: {
      flexDirection: 'row',
      marginBottom: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    modeBtnWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    modeButtonText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    infoBtn: {
      paddingRight: 6,
      paddingVertical: 8,
    },
    statCard: {
      width: '48%',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    infoBest: {
      alignItems: 'flex-end',
    },
    hoursCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 14,
      borderLeftWidth: 4,
      marginBottom: 2,
    },
    hoursCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hoursRow: {
      flexDirection: 'row',
      gap: 12,
    },
    hoursItem: {
      flex: 1,
    },
    hoursLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    hoursValue: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    overtimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    overtimeBadge: {
      backgroundColor: (theme.colors.warning || '#f59e0b') + '25',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      minWidth: 52,
      alignItems: 'center',
    },
    overtimeBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.warning || '#f59e0b',
    },
    overtimeHours: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 12,
    },
    overtimeAmount: {
      fontSize: 14,
      fontWeight: '600',
    },
    chartScroll: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 200,
      gap: 8,
      paddingVertical: 12,
      paddingRight: 24,
    },
    chartBarContainer: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: 40,
      height: 180,
    },
    chartBar: {
      width: 32,
      borderRadius: 4,
      marginBottom: 8,
    },
    chartLabel: {
      fontSize: 11,
      color: theme.colors.text,
      marginBottom: 4,
      fontWeight: '600',
    },
    chartValue: {
      fontSize: 9,
      color: theme.colors.textSecondary,
    },
    tRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      alignItems: 'center',
    },
    tHeaderRow: {
      backgroundColor: theme.colors.primary,
    },
    tFooterRow: {
      backgroundColor: theme.colors.primary,
      borderTopWidth: 2,
      borderTopColor: theme.colors.primary,
    },
    tHeaderText: {
      color: '#fff',
      fontWeight: '700',
    },
    tCell: {
      width: 72,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 12,
      color: theme.colors.text,
      textAlign: 'center',
    },
    tCellMese: {
      width: 96,
      fontWeight: '500',
    },
    tCellGg: {
      width: 52,
    },
    tCellOreTot: {
      width: 100,
      paddingVertical: 4,
      paddingHorizontal: 6,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
  });

export default YearlyReportScreen;
