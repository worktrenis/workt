import { 
  CCNL_CONTRACTS, 
  calculateOvertimeRate, 
  isNightWork, 
  getWorkDayHours,
  MEAL_TIMES 
} from '../constants';
import { isItalianHoliday } from '../constants/holidays';
import { NetEarningsCalculator, calculateQuickNet, calculateDetailedNet, calculateRealNet } from './NetEarningsCalculator';
import { TimeCalculator } from './TimeCalculator';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { EarningsCalculator } from './EarningsCalculator';
import HourlyRatesService from './HourlyRatesService';

class CalculationService {
  constructor() {
    this.defaultContract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    this.netCalculator = new NetEarningsCalculator(this.defaultContract);
    this.timeCalculator = new TimeCalculator();
    this.earningsCalculator = new EarningsCalculator(this.timeCalculator);
  }

  getEffectiveDailyRateFromContract(contract) {
    const safeContract = contract || {};

    const explicitDailyRate = Number(safeContract.dailyRate);
    if (Number.isFinite(explicitDailyRate) && explicitDailyRate > 0) {
      return explicitDailyRate;
    }

    const monthlySalary = Number(safeContract.monthlySalary);
    const workingDaysPerMonthRaw = Number(safeContract.workingDaysPerMonth);
    const workingDaysPerMonth = Number.isFinite(workingDaysPerMonthRaw) && workingDaysPerMonthRaw > 0
      ? workingDaysPerMonthRaw
      : 26;

    if (Number.isFinite(monthlySalary) && monthlySalary > 0) {
      return monthlySalary / workingDaysPerMonth;
    }

    return 109.19;
  }

  // Parse time string to minutes from midnight
  parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes to hours
  minutesToHours(minutes) {
    return minutes / 60;
  }

  // Calculate time difference in minutes
  calculateTimeDifference(startTime, endTime) {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    // Handle overnight work (end time next day)
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  }

  // Calculate work hours from work entry
  calculateWorkHours(workEntry) {
    return this.timeCalculator.calculateWorkHours(workEntry);
  }

  // Calculate travel hours
  calculateTravelHours(workEntry) {
    return this.timeCalculator.calculateTravelHours(workEntry);
  }

  // Calculate breaks between shifts for meal allowance
  calculateBreaksBetweenShifts(workEntry) {
    return this.timeCalculator.calculateBreaksBetweenShifts(workEntry);
  }

  // Calculate standby work hours
  calculateStandbyWorkHours(workEntry) {
    let totalStandbyMinutes = 0;
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(intervento => {
        if (intervento.work_start_1 && intervento.work_end_1) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
        }
        if (intervento.work_start_2 && intervento.work_end_2) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
        }
      });
    } else {
      // Fallback per la vecchia struttura dati
      if (workEntry.standbyWorkStart1 && workEntry.standbyWorkEnd1) {
        totalStandbyMinutes += this.calculateTimeDifference(workEntry.standbyWorkStart1, workEntry.standbyWorkEnd1);
      }
      if (workEntry.standbyWorkStart2 && workEntry.standbyWorkEnd2) {
        totalStandbyMinutes += this.calculateTimeDifference(workEntry.standbyWorkStart2, workEntry.standbyWorkEnd2);
      }
    }
    return this.minutesToHours(totalStandbyMinutes);
  }

  // Calculate standby travel hours
  calculateStandbyTravelHours(workEntry) {
    let totalStandbyTravelMinutes = 0;
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(intervento => {
        if (intervento.departure_company && intervento.arrival_site) {
          totalStandbyTravelMinutes += this.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
        }
        if (intervento.departure_return && intervento.arrival_company) {
          totalStandbyTravelMinutes += this.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
        }
      });
    } else {
      // Fallback per la vecchia struttura dati
      if (workEntry.standbyDeparture && workEntry.standbyArrival) {
        totalStandbyTravelMinutes += this.calculateTimeDifference(workEntry.standbyDeparture, workEntry.standbyArrival);
      }
      if (workEntry.standbyReturnDeparture && workEntry.standbyReturnArrival) {
        totalStandbyTravelMinutes += this.calculateTimeDifference(workEntry.standbyReturnDeparture, workEntry.standbyReturnArrival);
      }
    }
    return this.minutesToHours(totalStandbyTravelMinutes);
  }

  // Calculate overtime hours based on work time and contract
  calculateOvertimeDetails(workHours, travelHours, contract = this.defaultContract) {
    const standardWorkDay = getWorkDayHours();
    const totalHours = workHours + travelHours;
    
    let regularHours = 0;
    let overtimeHours = 0;
    
    if (totalHours <= standardWorkDay) {
      regularHours = totalHours;
    } else {
      regularHours = standardWorkDay;
      overtimeHours = totalHours - standardWorkDay;
    }
    
    return {
      regularHours,
      overtimeHours,
      totalHours
    };
  }

  // Determina il metodo di calcolo configurato
  async getCalculationMethod() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      const method = await AsyncStorage.getItem('calculation_method');
      return method || 'DAILY_RATE_WITH_SUPPLEMENTS'; // Default CCNL compliant
    } catch (error) {
      console.warn('❌ Errore caricamento metodo calcolo:', error);
      return 'DAILY_RATE_WITH_SUPPLEMENTS';
    }
  }

  // Verifica se il calcolo misto è abilitato
  async getMixedCalculationEnabled() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      const enabled = await AsyncStorage.getItem('enable_mixed_calculation');
      return enabled ? JSON.parse(enabled) : true;
    } catch (error) {
      console.warn('❌ Errore caricamento calcolo misto:', error);
      return true;
    }
  }

  // Calcola con metodo tariffa giornaliera + maggiorazioni CCNL
  async calculateWithDailyRateAndSupplements(workEntry, settings, contract, baseRate, dailyRate) {
    console.log('📊 Calcolo CCNL: Tariffa Giornaliera + Maggiorazioni');
    
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    const standardWorkDay = getWorkDayHours();
    const totalHours = workHours + travelHours;
    
    let earnings = {
      regularPay: 0,
      overtimePay: 0,
      travelPay: 0,
      total: 0,
      details: {
        method: 'DAILY_RATE_WITH_SUPPLEMENTS',
        workHours,
        travelHours,
        totalHours,
        dailyRate,
        baseRate
      }
    };

    // Determina se il giorno è festivo
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isHoliday = isItalianHoliday(workEntry.date);
    const isSpecialDay = isSunday || isHoliday;

    if (totalHours <= standardWorkDay) {
      // Giornata normale: usa tariffa giornaliera
      earnings.regularPay = dailyRate;
      earnings.details.calculationType = 'DAILY_RATE_ONLY';
    } else {
      // Giornata con straordinario: tariffa giornaliera + maggiorazioni orarie
      earnings.regularPay = dailyRate;
      
      const overtimeHours = totalHours - standardWorkDay;
      
      // Calcola maggiorazioni per straordinario basate su fasce orarie
      const overtimeDetails = await this.calculateOvertimeWithTimeSlots(
        workEntry, 
        overtimeHours, 
        baseRate, 
        contract,
        isSpecialDay
      );
      
      earnings.overtimePay = overtimeDetails.total;
      earnings.details.calculationType = 'DAILY_RATE_PLUS_OVERTIME';
      earnings.details.overtimeDetails = overtimeDetails;
    }

    // Calcola compenso viaggi
    earnings.travelPay = travelHours * baseRate * (settings.travelCompensationRate || 1.0);
    
    earnings.total = earnings.regularPay + earnings.overtimePay + earnings.travelPay;
    
    console.log('📊 Risultato calcolo CCNL:', earnings);
    return earnings;
  }

  // Calcola con metodo tariffe orarie pure con moltiplicatori
  async calculateWithPureHourlyRates(workEntry, settings, contract, baseRate) {
    console.log('📊 Calcolo Orario Puro: Tariffe Differenziate per Fascia');
    
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    
    let earnings = {
      regularPay: 0,
      overtimePay: 0,
      travelPay: 0,
      total: 0,
      details: {
        method: 'PURE_HOURLY_WITH_MULTIPLIERS',
        workHours,
        travelHours,
        baseRate,
        timeSlotBreakdown: []
      }
    };

    // Calcola ore lavoro con fasce orarie differenziate
    if (workEntry.workStart1 && workEntry.workEnd1) {
      const slot1Result = await this.calculateHourlyRatesByTimeSlots(
        workEntry.workStart1,
        workEntry.workEnd1,
        baseRate,
        contract,
        false, // non straordinario base
        isItalianHoliday(workEntry.date),
        new Date(workEntry.date).getDay() === 0
      );
      earnings.regularPay += slot1Result.totalEarnings;
      earnings.details.timeSlotBreakdown.push({
        period: `${workEntry.workStart1}-${workEntry.workEnd1}`,
        ...slot1Result
      });
    }

    if (workEntry.workStart2 && workEntry.workEnd2) {
      const slot2Result = await this.calculateHourlyRatesByTimeSlots(
        workEntry.workStart2,
        workEntry.workEnd2,
        baseRate,
        contract,
        false,
        isItalianHoliday(workEntry.date),
        new Date(workEntry.date).getDay() === 0
      );
      earnings.regularPay += slot2Result.totalEarnings;
      earnings.details.timeSlotBreakdown.push({
        period: `${workEntry.workStart2}-${workEntry.workEnd2}`,
        ...slot2Result
      });
    }

    // Calcola compenso viaggi con tariffa base
    earnings.travelPay = travelHours * baseRate * (settings.travelCompensationRate || 1.0);
    
    earnings.total = earnings.regularPay + earnings.overtimePay + earnings.travelPay;
    
    console.log('📊 Risultato calcolo orario puro:', earnings);
    return earnings;
  }

  // Metodo principale di calcolo che sceglie il metodo appropriato
  async calculateDailyEarnings(workEntry, settings) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || (contract.monthlySalary / 173);
    const dailyRate = contract.dailyRate || (contract.monthlySalary / 26);
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const travelHoursSetting = settings.travelHoursSetting || 'MULTI_SHIFT_OPTIMIZED';
    
    // Determina il metodo di calcolo configurato
    const paymentCalculationMethod = await this.getCalculationMethod();
    const mixedCalculationEnabled = await this.getMixedCalculationEnabled();
    
    console.log('� METODO CALCOLO:', {
      calculationMethod,
      mixedCalculationEnabled,
      workEntry: workEntry.date
    });
    
    // �🔥 VERIFICA FASCE ORARIE PERSONALIZZATE (per retrocompatibilità)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let useAdvancedHourlyRates = false;
    let enableTimeBasedRates = false;
    
    try {
      const advancedRatesEnabled = await AsyncStorage.getItem('enable_time_based_rates');
      enableTimeBasedRates = advancedRatesEnabled ? JSON.parse(advancedRatesEnabled) : false;
      
      const customTimeSlots = await CalculationService.getCustomTimeSlots();
      useAdvancedHourlyRates = enableTimeBasedRates && customTimeSlots.length > 0;
      
      console.log('🔧 FASCE ORARIE DEBUG:', {
        enableTimeBasedRates,
        customSlotsFound: customTimeSlots.length,
        useAdvancedHourlyRates,
        workEntryId: workEntry.id,
        date: workEntry.date
      });
    } catch (error) {
      console.warn('❌ Errore caricamento fasce orarie:', error);
    }

    // Scegli il metodo di calcolo appropriato
    let earningsCalculation;
    
    if (calculationMethod === 'PURE_HOURLY_WITH_MULTIPLIERS') {
      earningsCalculation = await this.calculateWithPureHourlyRates(workEntry, settings, contract, baseRate);
    } else {
      // Default: DAILY_RATE_WITH_SUPPLEMENTS (conforme CCNL)
      earningsCalculation = await this.calculateWithDailyRateAndSupplements(workEntry, settings, contract, baseRate, dailyRate);
    }

    // Se il calcolo misto è abilitato, confronta i metodi e usa il più vantaggioso
    if (mixedCalculationEnabled && paymentCalculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS') {
      const alternativeCalculation = await this.calculateWithPureHourlyRates(workEntry, settings, contract, baseRate);
      
      if (alternativeCalculation.total > earningsCalculation.total) {
        console.log('💰 Calcolo misto: Metodo orario più vantaggioso', {
          ccnl: earningsCalculation.total,
          hourly: alternativeCalculation.total,
          difference: alternativeCalculation.total - earningsCalculation.total
        });
        earningsCalculation = alternativeCalculation;
        earningsCalculation.details.mixedCalculationApplied = true;
      }
    }

    // **NUOVO SISTEMA CONFIGURABILE ATTIVO**
    // Se uno dei nuovi metodi è configurato, usa quello invece del sistema legacy
    if (paymentCalculationMethod === 'PURE_HOURLY_WITH_MULTIPLIERS' || 
        (paymentCalculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS' && earningsCalculation)) {
      
      console.log('🔥 NUOVO SISTEMA DI CALCOLO ATTIVO:', paymentCalculationMethod);
      
      // Converti il risultato del nuovo sistema nel formato legacy per compatibilità
      const legacyResult = await this.convertToLegacyFormat(earningsCalculation, workEntry, settings);
      return legacyResult;
    }

    // **FALLBACK AL SISTEMA LEGACY** per retrocompatibilità
    console.log('📊 Usando sistema di calcolo legacy per compatibilità');
    
    // Log della modalità di calcolo viaggio utilizzata
    console.log(`[CalculationService] calculateDailyEarnings - Modalità calcolo viaggio: ${travelHoursSetting}`, {
      workEntry: workEntry.date,
      settingsPassed: settings.travelHoursSetting,
      settingsComplete: settings,
      travelCompensationRate
    });
    const standbySettings = settings.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    const dailyAllowance = parseFloat(standbySettings.dailyAllowance) || 0;

    // Calcolo ore base
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    const standbyWorkHours = this.calculateStandbyWorkHours(workEntry);
    const standbyTravelHours = this.calculateStandbyTravelHours(workEntry);

    // Determina se il giorno è festivo o domenica
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isHoliday = isItalianHoliday(workEntry.date);
    
    // Verifica se il giorno è segnato come reperibile sia tramite calendario impostazioni che flag manuale
    // Log di debug per verificare la data e le impostazioni di reperibilità
    const dateStr = workEntry.date; // Data in formato YYYY-MM-DD
    
    // Controlla se la reperibilità è stata disattivata manualmente nel form
    const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                workEntry.isStandbyDay === 0 ||
                                workEntry.standbyAllowance === false ||
                                workEntry.standbyAllowance === 0;
                                
    const isManuallyActivated = workEntry.isStandbyDay === true || 
                              workEntry.isStandbyDay === 1 || 
                              workEntry.standbyAllowance === true || 
                              workEntry.standbyAllowance === 1;
    
    // Verifica le impostazioni di reperibilità dal calendario
    const isInCalendar = Boolean(standbySettings && 
                        standbySettings.enabled && 
                        standbyDays && 
                        dateStr && 
                        standbyDays[dateStr] && 
                        standbyDays[dateStr].selected === true);
    
    console.log(`[CalculationService] calculateDailyEarnings - Verifica reperibilità per ${dateStr}:`, {
        manuallyActivated: isManuallyActivated,
        manuallyDeactivated: isManuallyDeactivated,
        inCalendar: isInCalendar,
        standbyEnabled: standbySettings.enabled,
        standbyDays: standbyDays ? Object.keys(standbyDays).length : 0
    });
    
    // Corretto: se disattivato manualmente, ignora le impostazioni da calendario
    const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);

    // Calcolo straordinari
    let overtimePay = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let regularHours = 0;
    let travelPay = 0;

    // LOGICA CCNL: gestione modalità viaggio
    const standardWorkDay = getWorkDayHours();
    console.log(`[CalculationService] Applicazione modalità viaggio: ${travelHoursSetting}`, {
      workHours,
      travelHours,
      standardWorkDay,
      totalHours: workHours + travelHours
    });
    
    if (travelHoursSetting === 'TRAVEL_SEPARATE') {
      console.log(`[CalculationService] Applicando modalità TRAVEL_SEPARATE`);
      // NUOVA MODALITÀ: Viaggio sempre pagato separatamente con tariffa viaggio
      travelPay = travelHours * baseRate * travelCompensationRate;
      
      // Per il lavoro, verifica se completare con diaria o ore effettive
      // In modalità TRAVEL_SEPARATE, considera SOLO le ore di lavoro per la diaria
      
      // 🔥 CONTROLLO FASCE ORARIE PERSONALIZZATE
      if (useAdvancedHourlyRates && workEntry.orario_inizio && workEntry.orario_fine) {
        console.log('🔧 USANDO FASCE ORARIE PERSONALIZZATE per calcolo regularPay');
        
        // Calcola con fasce orarie personalizzate per tutti i turni di lavoro
        const timeSlotResults = await this.calculateHourlyRatesByTimeSlots(
          workEntry.orario_inizio, 
          workEntry.orario_fine, 
          baseRate, 
          contract, 
          false, // non straordinario per ora
          isHoliday, 
          isSunday
        );
        
        // Se ci sono turni aggiuntivi (multi-turno), calcolali
        if (workEntry.multi_turno && workEntry.viaggi) {
          let viaggi;
          try {
            viaggi = typeof workEntry.viaggi === 'string' ? JSON.parse(workEntry.viaggi) : workEntry.viaggi;
          } catch (e) {
            viaggi = [];
          }
          
          for (const turno of viaggi) {
            if (turno.orario_inizio && turno.orario_fine) {
              const turnoResult = await this.calculateHourlyRatesByTimeSlots(
                turno.orario_inizio, 
                turno.orario_fine, 
                baseRate, 
                contract, 
                false, 
                isHoliday, 
                isSunday
              );
              
              timeSlotResults.totalEarnings += turnoResult.totalEarnings;
              timeSlotResults.totalHours += turnoResult.totalHours;
              timeSlotResults.timeSlots = [...timeSlotResults.timeSlots, ...turnoResult.timeSlots];
            }
          }
        }
        
        regularPay = timeSlotResults.totalEarnings;
        regularHours = timeSlotResults.totalHours;
        
        console.log('🔧 RISULTATO FASCE ORARIE:', {
          totalEarnings: timeSlotResults.totalEarnings,
          totalHours: timeSlotResults.totalHours,
          slotsUsed: timeSlotResults.timeSlots.length
        });
        
        // Calcola straordinario se ci sono ore oltre la soglia standard
        if (workHours > standardWorkDay) {
          const extraWorkHours = workHours - standardWorkDay;
          let overtimeBonusRate = this.getHourlyRateWithBonus({
            baseRate,
            isOvertime: true,
            isNight: workEntry.isNight || false,
            isHoliday,
            isSunday,
            contract
          });
          overtimePay = extraWorkHours * overtimeBonusRate;
          overtimeHours = extraWorkHours;
        }
      } else if (workHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraWorkHours = workHours - standardWorkDay;
        if (extraWorkHours > 0) {
          let overtimeBonusRate = this.getHourlyRateWithBonus({
            baseRate,
            isOvertime: true,
            isNight: workEntry.isNight || false,
            isHoliday,
            isSunday,
            contract
          });
          overtimePay = extraWorkHours * overtimeBonusRate;
          overtimeHours = extraWorkHours;
        }
      } else {
        // CORREZIONE: paga solo le ore di lavoro in proporzione al dailyRate CCNL
        // Il viaggio è già pagato separatamente sopra
        regularPay = dailyRate * (workHours / standardWorkDay);
        regularHours = workHours;
        overtimeHours = 0;
      }
    } else if (travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED') {
      console.log(`[CalculationService] Applicando modalità MULTI_SHIFT_OPTIMIZED`);
      // MULTI_SHIFT_OPTIMIZED: considera solo primo viaggio andata e ultimo ritorno
      // Per ora considera tutto il viaggio dato che la logica di ottimizzazione viaggi è in EarningsCalculator
      const totalRegularHours = workHours + travelHours;
      
      // 🔥 CONTROLLO FASCE ORARIE PERSONALIZZATE per MULTI_SHIFT_OPTIMIZED
      if (useAdvancedHourlyRates && workEntry.orario_inizio && workEntry.orario_fine) {
        console.log('🔧 USANDO FASCE ORARIE PERSONALIZZATE per MULTI_SHIFT_OPTIMIZED');
        
        // Calcola con fasce orarie personalizzate per tutti i turni di lavoro
        const timeSlotResults = await this.calculateHourlyRatesByTimeSlots(
          workEntry.orario_inizio, 
          workEntry.orario_fine, 
          baseRate, 
          contract, 
          false, 
          isHoliday, 
          isSunday
        );
        
        // Se ci sono turni aggiuntivi (multi-turno), calcolali
        if (workEntry.multi_turno && workEntry.viaggi) {
          let viaggi;
          try {
            viaggi = typeof workEntry.viaggi === 'string' ? JSON.parse(workEntry.viaggi) : workEntry.viaggi;
          } catch (e) {
            viaggi = [];
          }
          
          for (const turno of viaggi) {
            if (turno.orario_inizio && turno.orario_fine) {
              const turnoResult = await this.calculateHourlyRatesByTimeSlots(
                turno.orario_inizio, 
                turno.orario_fine, 
                baseRate, 
                contract, 
                false, 
                isHoliday, 
                isSunday
              );
              
              timeSlotResults.totalEarnings += turnoResult.totalEarnings;
              timeSlotResults.totalHours += turnoResult.totalHours;
              timeSlotResults.timeSlots = [...timeSlotResults.timeSlots, ...turnoResult.timeSlots];
            }
          }
        }
        
        regularPay = timeSlotResults.totalEarnings;
        regularHours = timeSlotResults.totalHours;
        
        // Il viaggio viene calcolato separatamente
        travelPay = travelHours * baseRate * travelCompensationRate;
        
        console.log('🔧 RISULTATO FASCE ORARIE MULTI_SHIFT:', {
          totalEarnings: timeSlotResults.totalEarnings,
          totalHours: timeSlotResults.totalHours,
          travelPay,
          slotsUsed: timeSlotResults.timeSlots.length
        });
        
      } else if (totalRegularHours >= standardWorkDay) {
        // Logica tradizionale: Giornata completa: paga giornaliera + eccedenza come viaggio
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraHours = totalRegularHours - standardWorkDay;
        if (extraHours > 0) {
          console.log(`[CalculationService] MULTI_SHIFT_OPTIMIZED: ore extra (${extraHours}h) pagate come viaggio`);
          travelPay = extraHours * baseRate * travelCompensationRate;
          overtimeHours = 0;
        }
      } else {
        console.log(`[CalculationService] MULTI_SHIFT_OPTIMIZED: totale ore (${totalRegularHours}h) < 8h → calcolo proporzionale CCNL`);
        // Giornata parziale: calcolo proporzionale della diaria CCNL
        regularPay = dailyRate * (totalRegularHours / standardWorkDay);
        regularHours = totalRegularHours;
        overtimeHours = 0;
        travelPay = 0; // Nessuna eccedenza da pagare come viaggio
      }
    } else {
      console.log(`[CalculationService] Applicando modalità ${travelHoursSetting} (logica esistente)`);
      // LOGICHE ESISTENTI: considera viaggio + lavoro insieme
      const totalRegularHours = workHours + travelHours;
      if (totalRegularHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraHours = totalRegularHours - standardWorkDay;
        if (extraHours > 0) {
          if (travelHoursSetting === 'EXCESS_AS_TRAVEL') {
            console.log(`[CalculationService] Ore extra (${extraHours}h) pagate come viaggio`);
            // Le ore oltre 8h sono pagate come viaggio
            travelPay = extraHours * baseRate * travelCompensationRate;
            overtimeHours = 0;
          } else if (travelHoursSetting === 'EXCESS_AS_OVERTIME') {
            console.log(`[CalculationService] Ore extra (${extraHours}h) pagate come straordinario`);
            // Le ore oltre 8h sono pagate come straordinario
            let overtimeBonusRate = this.getHourlyRateWithBonus({
              baseRate,
              isOvertime: true,
              isNight: workEntry.isNight || false,
              isHoliday,
              isSunday,
              contract
            });
            overtimePay = extraHours * overtimeBonusRate;
            overtimeHours = extraHours;
          } else {
            console.log(`[CalculationService] Modalità AS_WORK: ore extra incluse nel normale lavoro`);
            // AS_WORK: Default nessun extra, tutto come lavoro normale
            overtimeHours = 0;
          }
        }
      } else {
        console.log(`[CalculationService] Totale ore (${totalRegularHours}h) < giornata standard: calcolo proporzionale CCNL`);
        // CORREZIONE: paga sempre in proporzione al dailyRate CCNL
        regularPay = dailyRate * (totalRegularHours / standardWorkDay);
        regularHours = totalRegularHours;
        overtimeHours = 0;
      }
    }

    // Lavoro ordinario notturno/festivo/domenicale
    let ordinaryBonusPay = 0;
    if (!overtimeHours && (workEntry.isNight || isHoliday || isSunday)) {
      let ordinaryBonusRate = this.getHourlyRateWithBonus({
        baseRate,
        isOvertime: false,
        isNight: workEntry.isNight || false,
        isHoliday,
        isSunday,
        contract
      });
      // CORREZIONE: in modalità TRAVEL_SEPARATE usa solo regularHours (solo lavoro)
      // In modalità MULTI_SHIFT_OPTIMIZED usa regularHours (che include lavoro + viaggio ottimizzato)
      // In altre modalità usa totalRegularHours (lavoro + viaggio completo)
      let hoursForBonus;
      if (travelHoursSetting === 'TRAVEL_SEPARATE') {
        hoursForBonus = regularHours; // Solo ore di lavoro
      } else if (travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED') {
        hoursForBonus = regularHours; // Ore lavoro + viaggio ottimizzato
      } else {
        hoursForBonus = typeof totalRegularHours !== 'undefined' ? totalRegularHours : regularHours;
      }
      ordinaryBonusPay = hoursForBonus * (ordinaryBonusRate - baseRate);
    }

    // --- CALCOLO INTERVENTI DURANTE REPERIBILITÀ ---
    let standbyWorkPay = 0;
    if (standbyWorkHours > 0) {
      standbyWorkPay = this.calculateStandbyWorkEarnings(
        workEntry.standbyWorkStart1,
        workEntry.standbyWorkEnd1,
        workEntry.standbyWorkStart2,
        workEntry.standbyWorkEnd2,
        contract,
        workEntry.date
      );
    }
    let standbyTravelPay = 0;
    if (standbyTravelHours > 0) {
      standbyTravelPay = standbyTravelHours * baseRate * travelCompensationRate;
    }

    // --- INDENNITÀ GIORNALIERA REPERIBILITÀ ---
    // Utilizziamo la logica definita sopra per determinare se l'indennità si applica
    let standbyAllowance = 0;
    
    if (isStandbyDay && settings?.standbySettings?.enabled) {
      // Valori CCNL di default
  // Tariffe CCNL per livello
  const { getStandbyRatesForContract } = require('../constants');
  const contractKey = settings?.contract?.key;
  const ccnlRates = getStandbyRatesForContract(contractKey);
  const IND_16H_FERIALE = ccnlRates.feriale16;
  const IND_24H_FERIALE = ccnlRates.feriale24;
  const IND_24H_FESTIVO = ccnlRates.festivo24;
      
      // Verifica se abbiamo personalizzazioni
      const customFeriale16 = settings.standbySettings.customFeriale16;
      const customFeriale24 = settings.standbySettings.customFeriale24;
      const customFestivo = settings.standbySettings.customFestivo;
      const allowanceType = settings.standbySettings.allowanceType || '24h';
      const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
      
      let baseDailyAllowance;
      
      // Determina il tipo di giorno considerando le impostazioni personalizzate
      const isRestDay = isSunday || isHoliday || (isSaturday && saturdayAsRest);
      
      if (isRestDay) {
        // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
        baseDailyAllowance = customFestivo || IND_24H_FESTIVO;
        console.log(`[CalculationService] Indennità reperibilità giorno di riposo per ${workEntry.date}: ${baseDailyAllowance}€ (personalizzata: ${!!customFestivo})`);
      } else {
        // Giorni feriali (incluso sabato se non è giorno di riposo)
        if (allowanceType === '16h') {
          baseDailyAllowance = customFeriale16 || IND_16H_FERIALE;
        } else {
          baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        }
        console.log(`[CalculationService] Indennità reperibilità feriale ${allowanceType} per ${workEntry.date}: ${baseDailyAllowance}€ (personalizzata: ${!!(allowanceType === '16h' ? customFeriale16 : customFeriale24)})`);
      }
      
      standbyAllowance = baseDailyAllowance;
    }
    
    console.log(`[CalculationService] Indennità reperibilità finale per ${workEntry.date}: ${(standbyAllowance || 0).toFixed(2)}€ (manuale: ${isManuallyActivated}, disattivata: ${isManuallyDeactivated}, calendario: ${isInCalendar})`);

    // --- INDENNITÀ TRASFERTA ---
    // CORREZIONE APPLICATA (04/01/2025): Risolto problema doppio calcolo quando sia PROPORTIONAL_CCNL 
    // che HALF_ALLOWANCE_HALF_DAY erano attivi simultaneamente. Ora viene applicata solo una logica 
    // in base alla priorità: PROPORTIONAL_CCNL (conforme CCNL) ha precedenza assoluta.
    let travelAllowance = 0;
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    
    // Gestione delle opzioni: supporta sia il nuovo formato selectedOptions che il vecchio formato option
    const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
    
    // Determina il metodo di calcolo dall'array di opzioni selezionate
    let calculationMethod = 'HALF_ALLOWANCE_HALF_DAY'; // Default
    if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
      calculationMethod = 'PROPORTIONAL_CCNL';
    } else if (selectedOptions.includes('FULL_ALLOWANCE_HALF_DAY')) {
      calculationMethod = 'FULL_ALLOWANCE_HALF_DAY';
    }
    
    const autoActivate = travelAllowanceSettings.autoActivate;
    const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
    let travelAllowancePercent = 1.0;
    if (typeof workEntry.travelAllowancePercent === 'number') {
      travelAllowancePercent = workEntry.travelAllowancePercent;
    }
    // In modalità HALF_ALLOWANCE_HALF_DAY la percentuale legacy del form non deve influenzare l'importo:
    // la logica "mezza/intera" è già determinata dalle ore.
    if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY')) {
      travelAllowancePercent = 1.0;
    }
    if (travelAllowanceEnabled && travelAllowanceAmount > 0) {
      let attiva = false;
      
      // CORREZIONE: Per il calcolo CCNL proporzionale, include anche le ore di reperibilità
      // per determinare se la giornata è "piena" (>=8h totali)
      const totalWorked = workHours + travelHours;
      const totalWorkedWithStandby = workHours + travelHours + standbyWorkHours;
      
      // Usa ore totali (inclusa reperibilità) se il calcolo CCNL è attivo
      const effectiveTotalWorked = selectedOptions.includes('PROPORTIONAL_CCNL') 
        ? totalWorkedWithStandby 
        : totalWorked;
      
      const isFullDay = effectiveTotalWorked >= 8;
      const isHalfDay = effectiveTotalWorked > 0 && effectiveTotalWorked < 8;
      const isStandbyNonLavorativo = isStandbyDay && standbyWorkHours > 0 && totalWorked === 0;
      
      // Verifica se l'utente ha fatto un override manuale
      const manualOverride = workEntry.trasfertaManualOverride || false;
      
      // Determina l'attivazione basandosi sulle opzioni selezionate
      if (selectedOptions.includes('ALWAYS')) {
        attiva = true;
      } else if (selectedOptions.includes('FULL_DAY_ONLY')) {
        attiva = isFullDay;
      } else if (selectedOptions.includes('WITH_TRAVEL')) {
        attiva = travelHours > 0;
      } else if (selectedOptions.includes('ALSO_ON_STANDBY')) {
        attiva = travelHours > 0 || isStandbyNonLavorativo;
      } else {
        // Default per calcoli proporzionali o con mezza giornata
        if (calculationMethod === 'PROPORTIONAL_CCNL' || calculationMethod === 'FULL_ALLOWANCE_HALF_DAY' || calculationMethod === 'HALF_ALLOWANCE_HALF_DAY') {
          attiva = effectiveTotalWorked > 0;
        } else {
          attiva = travelHours > 0; // Fallback
        }
      }
      
      // Applica l'indennità se:
      // 1. Le condizioni di attivazione sono soddisfatte, E
      // 2. Non è un giorno speciale (domenica/festivo), OPPURE
      //    È abilitata l'impostazione per applicare l'indennità nei giorni speciali, OPPURE
      //    L'utente ha fatto un override manuale attivando l'indennità per questo giorno specifico
      if (attiva && (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride)) {
        let baseTravelAllowance = travelAllowanceAmount;
        
        // CORREZIONE DOPPIO CALCOLO: Applica una sola logica di calcolo in base alla priorità CCNL
        if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
          // PRIORITÀ 1: Calcolo proporzionale CCNL (conforme normativa)
          // Include anche le ore di reperibilità per determinare la proporzione
          const standardWorkDay = 8; // Ore standard CCNL
          const proportionalRate = Math.min(effectiveTotalWorked / standardWorkDay, 1.0); // Max 100%
          baseTravelAllowance = travelAllowanceAmount * proportionalRate;
          
          // CORREZIONE AGGIUNTIVA: Con calcolo CCNL, ignora travelAllowancePercent del form
          // per evitare doppi calcoli (il calcolo proporzionale è già completo)
          travelAllowancePercent = 1.0;
          
          console.log(`[CalculationService] Indennità trasferta CCNL proporzionale per ${workEntry.date}: ${effectiveTotalWorked}h (${workHours}h lavoro + ${travelHours}h viaggio + ${standbyWorkHours}h reperibilità) / ${standardWorkDay}h = ${(proportionalRate * 100).toFixed(1)}% → ${baseTravelAllowance.toFixed(2)}€ (travelAllowancePercent ignorato per conformità CCNL)`);
        }
        // Logica precedente per retrocompatibilità - SOLO se PROPORTIONAL_CCNL non è attivo
        else if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY') && isHalfDay) {
          baseTravelAllowance = travelAllowanceAmount / 2;
          // CORREZIONE: Con mezza giornata, ignora travelAllowancePercent del form
          // per evitare doppi calcoli (il dimezzamento è già completo)
          travelAllowancePercent = 1.0;
          console.log(`[CalculationService] Indennità trasferta 50% per mezza giornata (${workEntry.date}): ${baseTravelAllowance.toFixed(2)}€ (travelAllowancePercent forzato a 1.0 per evitare doppio calcolo)`);
        }
        // FULL_ALLOWANCE_HALF_DAY mantiene l'importo pieno anche per mezze giornate
        
        // Applica l'indennità senza maggiorazioni per giorni speciali (a meno che non sia configurato diversamente)
        travelAllowance = baseTravelAllowance * travelAllowancePercent;
        
      }
    }

    // Gestione giorni fissi (ferie, permessi, malattia, riposo compensativo, festivo)
    // Usando il nuovo campo dayType invece dei campi obsoleti ferie/permesso
  const dayType = workEntry.dayType || 'lavorativa';
  const isFixedDayBase = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);
  // Considera ‘festivo’ giorno fisso SOLO se non ci sono ore (lavoro/viaggio/interventi)
  const hasAnyHours = this.calculateWorkHours(workEntry) > 0 || this.calculateTravelHours(workEntry) > 0 || this.calculateStandbyWorkHours(workEntry) > 0;
  const isFixedDay = isFixedDayBase && (dayType !== 'festivo' || !hasAnyHours);
    
  if (isFixedDay && dayType !== 'lavorativa') {
      console.log(`[CalculationService] Giorno fisso rilevato (${dayType}) per ${workEntry.date}, applicazione retribuzione giornaliera standard`);
      
      // Per i giorni fissi, applica la preferenza: se disattiva la visualizzazione, non calcolare il guadagno (totale=0)
      const dailyRate = this.getEffectiveDailyRateFromContract(settings?.contract);
      const showEffective = settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false;
      const effectiveDaily = showEffective ? dailyRate : 0;
      
      // Se il giorno è anche di reperibilità, non perdere l'indennità (anche se non ci sono ore)
      const fixedDayTotal = effectiveDaily + (standbyAllowance || 0);

      return {
        regularPay: effectiveDaily,
        overtimePay: 0,
        ordinaryBonusPay: 0,
        travelPay: 0,
        standbyWorkPay: 0,
        standbyTravelPay: 0,
        standbyAllowance: standbyAllowance || 0,
        travelAllowance: 0,
        total: fixedDayTotal,
        breakdown: {
          isFixedDay: true,
          dayType: dayType
        }
      };
    }

    // Totale lordo
    const total = regularPay + overtimePay + ordinaryBonusPay + travelPay + standbyWorkPay + standbyTravelPay + standbyAllowance + travelAllowance;
    
    // 💰 CALCOLO NETTO - Priorità ai dati reali delle buste paga
    const realNetCalculation = calculateRealNet(total);
    const quickNetCalculation = this.netCalculator.calculateQuickNet(total);
    const detailedNetCalculation = this.netCalculator.calculateDetailedNet(total);
    
    // Scegli il calcolo migliore disponibile (priorità: reale > dettagliato > rapido)
    const netCalculation = realNetCalculation?.priority === 1 ? realNetCalculation : 
                          (detailedNetCalculation?.priority <= 2 ? detailedNetCalculation : quickNetCalculation);
    
    console.log('🔍 Calcolo Netto Debug:', {
      totalGross: total,
      realNet: realNetCalculation?.net,
      detailedNet: detailedNetCalculation?.net,
      quickNet: quickNetCalculation?.net,
      chosenMethod: netCalculation?.method,
      priority: netCalculation?.priority
    });
    
    // Alla fine di calculateDailyEarnings, prima del return
    const mealAllowances = {};
    if (workEntry.mealLunchVoucher === 1) mealAllowances.lunch = { type: 'voucher', amount: settings.mealAllowances?.lunch?.voucherAmount || 0 };
    if (workEntry.mealLunchCash > 0) mealAllowances.lunch = { type: 'cash', amount: workEntry.mealLunchCash };
    if (workEntry.mealDinnerVoucher === 1) mealAllowances.dinner = { type: 'voucher', amount: settings.mealAllowances?.dinner?.voucherAmount || 0 };
    if (workEntry.mealDinnerCash > 0) mealAllowances.dinner = { type: 'cash', amount: workEntry.mealDinnerCash };

    return {
      regularPay,
      overtimePay,
      ordinaryBonusPay,
      travelPay,
      standbyWorkPay,
      standbyTravelPay,
      standbyAllowance,
      travelAllowance,
      total, // Lordo totale
      // 💰 NUOVI CAMPI NETTO
      grossTotal: total, // Alias per chiarezza
      netTotal: netCalculation.net, // Netto calcolato
      totalDeductions: netCalculation.totalDeductions, // Trattenute totali
      deductionRate: netCalculation.deductionRate, // Percentuale trattenute
      // 🔍 CALCOLI DETTAGLIATI (opzionali per debugging/analisi)
      netCalculations: {
        quick: netCalculation,
        detailed: detailedNetCalculation
      },
      breakdown: {
        workHours,
        travelHours,
        standbyWorkHours,
        standbyTravelHours,
        regularHours,
        overtimeHours,
        isStandbyDay,
        // 🔧 NUOVI CAMPI FASCE ORARIE
        useAdvancedHourlyRates,
        enableTimeBasedRates,
        calculationMethod: useAdvancedHourlyRates ? 'FASCE_ORARIE_PERSONALIZZATE' : 'DIARIA_CCNL_TRADIZIONALE'
      },
      note: workEntry.isStandbyDay ? 'Indennità reperibilità inclusa. Il CCNL Metalmeccanico PMI non prevede una retribuzione aggiuntiva per la prima uscita: ogni intervento è retribuito secondo le maggiorazioni orarie.' : undefined,
      mealAllowances,
    };
  }

  // Esempio di utilizzo nei calcoli (da applicare in calculateDailyEarnings e simili):
  // const bonusRate = this.getHourlyRateWithBonus({
  //   baseRate: contract.hourlyRate,
  //   isOvertime: true,
  //   isNight: isNightWork(hour),
  //   isHoliday: isHolidayDay,
  //   isSunday: isSundayDay
  // });
  // earnings.overtimePay = overtimeHours * bonusRate;

  /**
   * @typedef {Object} EarningsBreakdown
   * @property {Object.<string, number>} hours - Ore suddivise per categoria (es. ordinary_day, overtime_night)
   * @property {Object.<string, number>} earnings - Guadagni suddivisi per categoria
   * @property {Object.<string, number>} allowances - Indennità (es. travel, standby)
   * @property {number} totalEarnings - Guadagno totale
   * @property {Object} details - Dettagli aggiuntivi (isHoliday, isSunday, etc.)
   */

  /**
   * Calcola la retribuzione giornaliera con un'analisi dettagliata di ogni fascia oraria e breakdown reperibilità.
   * @param {object} workEntry - L'oggetto con i dati di lavoro.
   * @param {object} settings - Le impostazioni dell'utente.
   * @returns {EarningsBreakdown} - Il dettaglio dei guadagni.
   */
  async calculateEarningsBreakdown(workEntry, settings) {
    // Inizializza le strutture di base per il calcolo
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || 16.41;
    const date = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSaturday = date.getDay() === 6;
    const isSunday = date.getDay() === 0;
    const isHoliday = isItalianHoliday(date);
    const isSpecialDay = isSaturday || isSunday || isHoliday;
    
    // Gestione giorni fissi (ferie, permessi, malattia, riposo compensativo, festivo)
    // Per questi giorni, viene corrisposta la retribuzione giornaliera standard
  const dayType = workEntry.dayType || 'lavorativa';
  const isFixedDayBase = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);
  const hasAnyHours = this.calculateWorkHours(workEntry) > 0 || this.calculateTravelHours(workEntry) > 0 || this.calculateStandbyWorkHours(workEntry) > 0;
  const isFixedDay = isFixedDayBase && (dayType !== 'festivo' || !hasAnyHours);
    
  if (isFixedDay && dayType !== 'lavorativa') {
      console.log(`[CalculationService] Giorno fisso rilevato (${dayType}) per ${workEntry.date}, applicazione retribuzione giornaliera standard`);
      
      // Per i giorni fissi, applica la preferenza: se disattiva la visualizzazione, non calcolare il guadagno (totale=0)
      const dailyRate = this.getEffectiveDailyRateFromContract(contract);
      const showEffective = settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false;
      const effectiveDaily = showEffective ? dailyRate : 0;

      // 🔧 FIX: se è reperibilità, includi l'indennità anche nei giorni fissi (es. festivo senza ore)
      let standbyIndemnity = 0;
      try {
        const standbySettings = settings?.standbySettings || {};
        const standbyDays = standbySettings?.standbyDays || {};
        const dateStr = workEntry.date;

        const isManuallyDeactivated = workEntry.isStandbyDay === false ||
          workEntry.isStandbyDay === 0 ||
          workEntry.standbyAllowance === false ||
          workEntry.standbyAllowance === 0;

        const isManuallyActivated = workEntry.isStandbyDay === true ||
          workEntry.isStandbyDay === 1 ||
          workEntry.standbyAllowance === true ||
          workEntry.standbyAllowance === 1;

        const isInCalendar = Boolean(standbySettings?.enabled && standbyDays?.[dateStr]?.selected);
        const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);

        if (isStandbyDay) {
          const { getStandbyRatesForContract } = require('../constants');
          const cKey = settings?.contract?.key;
          const r = getStandbyRatesForContract(cKey);
          const IND_16H_FERIALE = r.feriale16;
          const IND_24H_FERIALE = r.feriale24;
          const IND_24H_FESTIVO = r.festivo24;

          const customFeriale16 = standbySettings.customFeriale16;
          const customFeriale24 = standbySettings.customFeriale24;
          const customFestivo = standbySettings.customFestivo;
          const allowanceType = standbySettings.allowanceType || '24h';
          const saturdayAsRest = standbySettings.saturdayAsRest === true;
          const saturdayMode = standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');

          const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
          if (isRestDay) {
            standbyIndemnity = customFestivo || IND_24H_FESTIVO;
          } else if (isSaturday && saturdayMode === 'feriale24') {
            standbyIndemnity = customFeriale24 || IND_24H_FERIALE;
          } else if (allowanceType === '16h') {
            standbyIndemnity = customFeriale16 || IND_16H_FERIALE;
          } else {
            standbyIndemnity = customFeriale24 || IND_24H_FERIALE;
          }
        }
      } catch (e) {
        // Fallback silenzioso: non bloccare il calcolo dei giorni fissi
        standbyIndemnity = 0;
      }
      
      const fixedDayResult = {
        ordinary: {
          hours: {
            lavoro_giornaliera: 0,
            viaggio_giornaliera: 0,
            lavoro_extra: 0,
            viaggio_extra: 0
          },
          earnings: {
            giornaliera: effectiveDaily, // Retribuzione effettiva per giorni fissi in base alla preferenza
            viaggio_extra: 0,
            lavoro_extra: 0
          },
          total: effectiveDaily
        },
        standby: {
          workHours: {},
          travelHours: {},
          workEarnings: {},
          travelEarnings: {},
          dailyIndemnity: standbyIndemnity,
          totalEarnings: standbyIndemnity
        },
        allowances: {
          meal: 0,
          standby: standbyIndemnity
        },
        totalEarnings: effectiveDaily + standbyIndemnity,
        details: {
          isSaturday,
          isSunday,
          isHoliday,
          isSpecialDay,
          regularHours: 0,
          extraHours: 0,
          totalOrdinaryHours: 0,
          corrected: false,
          isFixedDay: true,
          dayType: dayType
        }
      };
      
      // Assicura che la proprietà analytics sia sempre presente per compatibilità dashboard
      fixedDayResult.analytics = {};
      return fixedDayResult;
    }
    
    // Calcolo ore di lavoro e viaggio
    const workHours = this.calculateWorkHours(workEntry) || 0;
    const travelHours = this.calculateTravelHours(workEntry) || 0;
    const standbyWorkHours = this.calculateStandbyWorkHours(workEntry) || 0;
    const totalOrdinaryHours = workHours + travelHours;
    const totalOrdinaryWithStandby = workHours + travelHours + standbyWorkHours;
    
    // Calcola dettagli di ore ordinarie/straordinarie
    const standardWorkDay = getWorkDayHours();
    let regularHours = Math.min(totalOrdinaryHours, standardWorkDay);
    let extraHours = Math.max(0, totalOrdinaryHours - standardWorkDay);
    
    // Struttura per il breakdown
    const result = {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(workHours, standardWorkDay),
          viaggio_giornaliera: Math.min(travelHours, Math.max(0, standardWorkDay - workHours)),
          lavoro_extra: Math.max(0, workHours - standardWorkDay),
          viaggio_extra: Math.max(0, travelHours - Math.max(0, standardWorkDay - workHours))
        },
        earnings: {
          giornaliera: 0,
          viaggio_extra: 0,
          lavoro_extra: 0
        },
        total: 0
      },
      standby: null,
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0
      },
      totalEarnings: 0,
      // Proprietà chiave normalizzate per accesso diretto
      totalOrdinaryHours: totalOrdinaryHours,
      regularHours: regularHours,
      extraHours: extraHours,
      details: {
        isSaturday,
        isSunday,
        isHoliday,
        isSpecialDay,
        regularHours,
        extraHours,
        totalOrdinaryHours,
        corrected: false
      }
    };
    
    // Calcola gli earnings per le ore ordinarie
    if (isSpecialDay) {
      // 🆕 NUOVO: Gestione completa fasce orarie per giorni speciali
      console.log(`[CalculationService] 🎯 Giorno speciale rilevato: ${workEntry.date} (Sabato: ${isSaturday}, Domenica: ${isSunday}, Festivo: ${isHoliday})`);
      
      // Determina maggiorazione base per il tipo di giorno
      const baseDayMultiplier = isHoliday || isSunday 
        ? (contract.overtimeRates?.holiday || 1.3)  // +30% festivo/domenica
        : (contract.overtimeRates?.saturday || 1.25); // +25% sabato
      
      console.log(`[CalculationService] 🎯 Maggiorazione base giorno speciale: ${baseDayMultiplier} (${Math.round((baseDayMultiplier-1)*100)}%)`);
      
      // 🔧 FORZA sempre il sistema CCNL-compliant per giorni speciali (cumulo additivo)
      console.log(`[CalculationService] 🎯 FORZA sistema CCNL per giorno speciale - Cumulo additivo maggiorazioni`);
      
      // Usa sempre il sistema di calcolo fasce orarie CCNL-compliant per giorni speciali
      const hourlyBreakdown = await this.calculateHourlyRatesBreakdown(workEntry, settings, workHours, travelHours, true, baseDayMultiplier);
      
      result.ordinary = hourlyBreakdown.ordinary;
      result.details.hourlyRatesBreakdown = hourlyBreakdown.breakdown;
      result.details.hourlyRatesMethod = hourlyBreakdown.method;
      result.details.specialDayMultiplier = baseDayMultiplier;
      result.details.ccnlCompliant = true; // Indica che usa il cumulo CCNL
      
      console.log(`[CalculationService] 🎯 Risultato CCNL giorno speciale:`, hourlyBreakdown);
        
    } else {
      // Giorni feriali: verifica se usare modalità speciale per calcolo viaggio
      const travelHoursSetting = settings.travelHoursSetting || 'MULTI_SHIFT_OPTIMIZED';
      
      // 🕐 NUOVO: Verifica il metodo di calcolo impostato dall'utente
      const paymentCalculationMethod = await this.getCalculationMethod();
      const isHourlyRatesEnabled = await this.isHourlyRatesActive();
      
      console.log(`[CalculationService] 🔍 DEBUG - Metodo calcolo: ${paymentCalculationMethod}, Multi-fascia: ${isHourlyRatesEnabled}`);
      
      // Il sistema multi-fascia si attiva SOLO con il metodo "PURE_HOURLY_WITH_MULTIPLIERS"
      if (isHourlyRatesEnabled && paymentCalculationMethod === 'PURE_HOURLY_WITH_MULTIPLIERS') {
        console.log(`[CalculationService] 🕐 Sistema multi-fascia ATTIVO - Metodo: ${paymentCalculationMethod}`);
        
        // Usa il nuovo sistema di calcolo fasce orarie
        const hourlyBreakdown = await this.calculateHourlyRatesBreakdown(workEntry, settings, workHours, travelHours);
        
        // Aggiorna il result con i valori delle fasce orarie
        result.ordinary = hourlyBreakdown.ordinary;
        result.details.hourlyRatesBreakdown = hourlyBreakdown.breakdown;
        result.details.hourlyRatesMethod = hourlyBreakdown.method;
        
        console.log(`[CalculationService] 🕐 Risultato fasce orarie:`, hourlyBreakdown);
        
    // Assicura che la proprietà analytics sia sempre presente per compatibilità dashboard
    result.analytics = result.analytics || {};
      } else if (paymentCalculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS') {
        console.log(`[CalculationService] 📊 Metodo DAILY_RATE_WITH_SUPPLEMENTS attivo - Tariffa giornaliera + maggiorazioni CCNL`);
        
        // Usa il metodo tariffa giornaliera + maggiorazioni CCNL come impostato dall'utente
        const dailyRateResult = this.calculateDailyRateWithSupplements(workEntry, settings, workHours, travelHours);
        
        console.log(`[CalculationService] 📊 DEBUG - Risultato calculateDailyRateWithSupplements:`, dailyRateResult);
        
        // Aggiorna il result con i valori della tariffa giornaliera
        result.ordinary = dailyRateResult.ordinary;
        result.details.calculationMethod = 'DAILY_RATE_WITH_SUPPLEMENTS';
        result.details.dailyRateBreakdown = dailyRateResult.breakdown;
        
        console.log(`[CalculationService] 📊 Risultato tariffa giornaliera finale:`, {
          ordinary: result.ordinary,
          calculationMethod: result.details.calculationMethod,
          breakdown: result.details.dailyRateBreakdown
        });
        
      } else if (travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED') {
        console.log(`[CalculationService] 🎯 Applying MULTI_SHIFT_OPTIMIZED mode`);
        
        // Usa l'EarningsCalculator con la nuova modalità
        const basicEarnings = this.earningsCalculator.calculateBasicEarnings(workEntry, settings, workHours, travelHours);
        
        // Aggiorna il result con i valori calcolati
        result.ordinary.earnings.giornaliera = basicEarnings.regularPay || 0;
        result.ordinary.earnings.lavoro_extra = basicEarnings.overtimePay || 0;
        result.ordinary.earnings.viaggio_extra = basicEarnings.travelPay || 0;
        result.ordinary.total = basicEarnings.regularPay + basicEarnings.overtimePay + basicEarnings.travelPay;
        
        // Aggiorna le ore per riflettere la modalità ottimizzata
        if (workHours + travelHours >= standardWorkDay) {
          result.details.isPartialDay = false;
          result.details.missingHours = 0;
        } else {
          result.details.isPartialDay = true;
          result.details.missingHours = standardWorkDay - (workHours + travelHours);
        }
        result.details.completamentoTipo = workEntry.completamentoGiornata || 'nessuno';
        
        console.log(`[CalculationService] 🎯 MULTI_SHIFT_OPTIMIZED result:`, {
          regularPay: basicEarnings.regularPay,
          overtimePay: basicEarnings.overtimePay,
          travelPay: basicEarnings.travelPay,
          total: result.ordinary.total
        });
      } else {
        // Giorni feriali: calcolo standard
        if (totalOrdinaryHours >= standardWorkDay) {
          // Giornata piena: paga giornaliera + extra
          result.ordinary.earnings.giornaliera = this.getEffectiveDailyRateFromContract(contract);
          
          // Usa la nuova logica per i viaggi extra
          const travelRateInfo = this.getTravelRateForDate(settings, workEntry.date, baseRate);
          result.ordinary.earnings.viaggio_extra = result.ordinary.hours.viaggio_extra * travelRateInfo.rate;
          
          result.ordinary.earnings.lavoro_extra = result.ordinary.hours.lavoro_extra * baseRate * (contract.overtimeRates?.day || 1.2);
          
          // Giornata completa: non necessita completamento
          result.details.isPartialDay = false;
          result.details.missingHours = 0;
          result.details.completamentoTipo = workEntry.completamentoGiornata || 'nessuno';
        } else {
          // Giornata parziale: proporzionale alle ore
          // Usa la nuova logica anche per viaggio giornaliera
          const travelRateInfo = this.getTravelRateForDate(settings, workEntry.date, baseRate);
          
          result.ordinary.earnings.giornaliera = (result.ordinary.hours.lavoro_giornaliera * baseRate) + 
                                                (result.ordinary.hours.viaggio_giornaliera * travelRateInfo.rate);
          
          // Per giorni feriali: calcola le ore mancanti e imposta isPartialDay
          result.details.isPartialDay = true;
          result.details.missingHours = standardWorkDay - totalOrdinaryHours;
          result.details.completamentoTipo = workEntry.completamentoGiornata || 'nessuno';
          
          // Se il completamento è specificato, considera la giornata come completa ai fini del calcolo
          if (workEntry.completamentoGiornata && workEntry.completamentoGiornata !== 'nessuno') {
            result.ordinary.earnings.giornaliera = this.getEffectiveDailyRateFromContract(contract);
          }
        }
        
        result.ordinary.total = result.ordinary.earnings.giornaliera + 
                               result.ordinary.earnings.viaggio_extra + 
                               result.ordinary.earnings.lavoro_extra;
      }
    }
    
    // Calcola la reperibilità se attiva
    // Se la reperibilità è esplicitamente disattivata nel form (flag a 0 o false), ignora le impostazioni calendario
    const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                workEntry.isStandbyDay === 0 ||
                                workEntry.standbyAllowance === false ||
                                workEntry.standbyAllowance === 0;
    
    // Se è esplicitamente attivata nel form, o non è esplicitamente disattivata e c'è nel calendario
    const isStandbyDay = (workEntry.isStandbyDay === true || 
                        workEntry.isStandbyDay === 1 || 
                        workEntry.standbyAllowance === true || 
                        workEntry.standbyAllowance === 1) ||
                        (!isManuallyDeactivated && 
                        settings?.standbySettings?.enabled && 
                        settings?.standbySettings?.standbyDays && 
                        settings?.standbySettings?.standbyDays[workEntry.date]?.selected);
    
    console.log(`[CalculationService] Stato reperibilità per ${workEntry.date}:`, {
      isManuallyActivated: workEntry.isStandbyDay === true || 
                          workEntry.isStandbyDay === 1 || 
                          workEntry.standbyAllowance === true || 
                          workEntry.standbyAllowance === 1,
      isManuallyDeactivated: isManuallyDeactivated,
      isInCalendar: settings?.standbySettings?.enabled && 
                   settings?.standbySettings?.standbyDays && 
                   settings?.standbySettings?.standbyDays[workEntry.date]?.selected,
      finalStatus: isStandbyDay
    });
    
    // Calcola sempre il breakdown per la reperibilità, ma l'indennità sarà 0 se disattivata
    result.standby = this.calculateStandbyBreakdown(workEntry, settings);
      
    // Aggiungi l'indennità giornaliera di reperibilità all'oggetto allowances
    // solo se la reperibilità è attiva (considerando anche l'attivazione manuale)
    if (isStandbyDay) {
      // CORREZIONE: Indennità applicata se reperibilità attiva, indipendentemente da settings.enabled
      // L'indennità deve essere applicata se:
      // 1. Reperibilità attivata manualmente, OPPURE
      // 2. Reperibilità nel calendario E settings.enabled = true
      console.log(`[CalculationService] Breakdown - Applicazione indennità reperibilità per ${workEntry.date} (standbyDay: ${isStandbyDay})`);
      
  // CORREZIONE: Usa tariffe CCNL per livello dal contratto
  const { getStandbyRatesForContract } = require('../constants');
  const cKey = settings?.contract?.key;
  const r = getStandbyRatesForContract(cKey);
  const IND_16H_FERIALE = r.feriale16;
  const IND_24H_FERIALE = r.feriale24;
  const IND_24H_FESTIVO = r.festivo24;
      
      // Verifica se abbiamo personalizzazioni
      const customFeriale16 = settings.standbySettings.customFeriale16;
      const customFeriale24 = settings.standbySettings.customFeriale24;
      const customFestivo = settings.standbySettings.customFestivo;
      const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  const saturdayMode = settings.standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
      
      let correctDailyAllowance;
      
      // Determina il tipo di giorno considerando le impostazioni personalizzate
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
      
      if (isRestDay) {
        // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
        correctDailyAllowance = customFestivo || IND_24H_FESTIVO;
        console.log(`[CalculationService] Breakdown - Indennità reperibilità giorno di riposo per ${workEntry.date}: ${correctDailyAllowance}€ (personalizzata: ${!!customFestivo})`);
      } else {
        // Giorni feriali (incluso sabato feriale/feriale24)
        if (isSaturday && saturdayMode === 'feriale24') {
          correctDailyAllowance = (customFeriale24 || IND_24H_FERIALE);
        } else if (allowanceType === '16h') {
          correctDailyAllowance = customFeriale16 || IND_16H_FERIALE;
        } else {
          correctDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        }
        console.log(`[CalculationService] Breakdown - Indennità reperibilità feriale ${allowanceType} per ${workEntry.date}: ${correctDailyAllowance}€ (personalizzata: ${!!(allowanceType === '16h' ? customFeriale16 : customFeriale24)})`);
      }
      
      result.allowances.standby = correctDailyAllowance;
      console.log(`[CalculationService] Aggiunta indennità reperibilità CCNL corretta di ${correctDailyAllowance}€ alle indennità per ${workEntry.date} (sostituito generico dailyAllowance)`);
    } else {
      // Assicura che l'indennità non sia mostrata se disattivata
      result.allowances.standby = 0;
    }
    
    // Calcola le indennità (trasferta, pasti, etc.)
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    let travelAllowancePercent = workEntry.travelAllowancePercent || 1.0;

    // In modalità HALF_ALLOWANCE_HALF_DAY la percentuale legacy del form non deve influenzare l'importo.
    // (La decisione mezza/intera è già guidata dalle ore.)
    {
      const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
      if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY')) {
        travelAllowancePercent = 1.0;
      }
    }
    
    // Calcola indennità trasferta in base alle regole
    if (travelAllowanceEnabled && travelAllowanceAmount > 0 && workEntry.travelAllowance) {
      // Verifica se l'indennità può essere applicata in giorni speciali
      const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
      // Verifica se l'utente ha fatto un override manuale
      const manualOverride = workEntry.trasfertaManualOverride || false;
      
      // Applica l'indennità se:
      // - Non è un giorno speciale (domenica/festivo), OPPURE
      // - È abilitata l'impostazione per applicare l'indennità nei giorni speciali, OPPURE
      // - L'utente ha fatto un override manuale attivando l'indennità per questo giorno specifico
      if (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride) {
        // Gestione delle opzioni: supporta sia il nuovo formato selectedOptions che il vecchio formato option
        const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
        
        // Determina il metodo di calcolo dall'array di opzioni selezionate
        let calculationMethod = 'HALF_ALLOWANCE_HALF_DAY'; // Default
        if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
          calculationMethod = 'PROPORTIONAL_CCNL';
        } else if (selectedOptions.includes('FULL_ALLOWANCE_HALF_DAY')) {
          calculationMethod = 'FULL_ALLOWANCE_HALF_DAY';
        }
        
        let baseTravelAllowance = travelAllowanceAmount;
        
        // CORREZIONE DOPPIO CALCOLO: Applica una sola logica di calcolo in base alla priorità CCNL
        if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
          // PRIORITÀ 1: Calcolo proporzionale CCNL (conforme normativa)
          // Include anche le ore di reperibilità per determinare la proporzione
          const standardWorkDay = 8; // Ore standard CCNL
          const effectiveHours = totalOrdinaryWithStandby; // Include reperibilità
          const proportionalRate = Math.min(effectiveHours / standardWorkDay, 1.0); // Max 100%
          baseTravelAllowance = travelAllowanceAmount * proportionalRate;
          
          // CORREZIONE AGGIUNTIVA: Con calcolo CCNL, ignora travelAllowancePercent del form
          // per evitare doppi calcoli (il calcolo proporzionale è già completo)
          travelAllowancePercent = 1.0;
          
          console.log(`[CalculationService] Breakdown - Indennità trasferta CCNL proporzionale per ${workEntry.date}: ${effectiveHours}h (${workHours}h lavoro + ${travelHours}h viaggio + ${standbyWorkHours}h reperibilità) / ${standardWorkDay}h = ${(proportionalRate * 100).toFixed(1)}% → ${baseTravelAllowance.toFixed(2)}€ (travelAllowancePercent ignorato per conformità CCNL)`);
        }
        // Logica precedente per retrocompatibilità - SOLO se PROPORTIONAL_CCNL non è attivo
        else if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY') && totalOrdinaryHours < 8) {
          baseTravelAllowance = travelAllowanceAmount / 2;
          // CORREZIONE: Con mezza giornata, ignora travelAllowancePercent del form
          // per evitare doppi calcoli (il dimezzamento è già completo)
          travelAllowancePercent = 1.0;
          console.log(`[CalculationService] Breakdown - Indennità trasferta 50% per mezza giornata (${workEntry.date}): ${baseTravelAllowance.toFixed(2)}€ (travelAllowancePercent forzato a 1.0 per evitare doppio calcolo)`);
        }
        // FULL_ALLOWANCE_HALF_DAY mantiene l'importo pieno anche per mezze giornate
        
        result.allowances.travel = baseTravelAllowance * travelAllowancePercent;
        
      }
    }
    
    // Calcola rimborsi pasti
    // Pranzo: valori specifici nel form hanno priorità sui valori dalle impostazioni
    if (workEntry.mealLunchCash > 0) {
      // Se c'è un valore specifico nel form, usa solo quello
      result.allowances.meal += workEntry.mealLunchCash;
    } else if (workEntry.mealLunchVoucher === 1) {
      result.allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
      result.allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
    }
    
    // Cena: stesso approccio del pranzo
    if (workEntry.mealDinnerCash > 0) {
      // Se c'è un valore specifico nel form, usa solo quello
      result.allowances.meal += workEntry.mealDinnerCash;
    } else if (workEntry.mealDinnerVoucher === 1) {
      result.allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
      result.allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
    }
    
    // Imposta che per i giorni speciali non è richiesto il completamento delle 8 ore
    if (isSaturday || isSunday || isHoliday) {
      result.details.isPartialDay = false;
      result.details.completamentoTipo = 'nessuno';
      result.details.missingHours = 0;
      // Assicuriamoci che il completamentoGiornata sia impostato su 'nessuno'
      workEntry.completamentoGiornata = 'nessuno';
    }
    
    // Calcola il totale guadagno giornaliero (esclusi rimborsi pasti)
    // CORREZIONE: result.standby.totalEarnings include già l'indennità giornaliera, 
    // quindi non dobbiamo sommare anche result.allowances.standby per evitare doppio conteggio
    result.totalEarnings = result.ordinary.total + 
                          (result.allowances.travel || 0) + 
                          (result.standby ? (result.standby.totalEarnings || 0) : 0);
    
    // Logging per giorni speciali
    if (isSpecialDay) {
      console.log("[CalculationService] Calcolo totale guadagno per " + workEntry.date + ":", {
        isHoliday,
        isSaturday, 
        isSunday,
        totalAllowances: result.allowances.travel,
        totalEarnings: result.totalEarnings,
        totalOrdinaryEarnings: result.ordinary.total,
        totalStandbyEarnings: result.standby?.totalEarnings || 0,
        // Dettagli per debug
        regularHours,
        extraHours,
        totalHours: (result.ordinary.hours.lavoro_giornaliera || 0) +
                   (result.ordinary.hours.viaggio_giornaliera || 0) +
                   (result.ordinary.hours.lavoro_extra || 0) +
                   (result.ordinary.hours.viaggio_extra || 0),
        baseRate: baseRate,
        appliedMultiplier: isHoliday || isSunday 
          ? (contract.overtimeRates?.holiday || 1.3)
          : (contract.overtimeRates?.saturday || 1.25),
        // Dettagli completamento giornata
        isPartialDay: result.details.isPartialDay,
        completamentoTipo: result.details.completamentoTipo,
        missingHours: result.details.missingHours
      });
      
      console.log("[CalculationService] Nei giorni speciali (sabato/domenica/festivi) non è richiesto effettuare 8 ore lavorative. Il completamento giornata è stato disattivato.");
    }
    
    // Log per debug - per tutti i giorni speciali
    if (isSpecialDay) {
      console.log("[CalculationService] Calcolo totale guadagno per " + workEntry.date + ":", {
        isHoliday: result.details.isHoliday,
        isSaturday: result.details.isSaturday,
        isSunday: result.details.isSunday,
        totalAllowances: result.allowances.travel || 0,
        totalEarnings: result.totalEarnings,
        totalOrdinaryEarnings: result.ordinary.total,
        totalStandbyEarnings: result.standby?.totalEarnings || 0,
        // Dettagli per debug
        regularHours: result.details.regularHours,
        extraHours: result.details.extraHours,
        totalHours: (result.ordinary.hours.lavoro_giornaliera || 0) +
                   (result.ordinary.hours.viaggio_giornaliera || 0) +
                   (result.ordinary.hours.lavoro_extra || 0) +
                   (result.ordinary.hours.viaggio_extra || 0),
        baseRate: settings.contract?.hourlyRate || 16.41,
        appliedMultiplier: isHoliday || isSunday 
          ? (settings.contract?.overtimeRates?.holiday || 1.3)
          : (settings.contract?.overtimeRates?.saturday || 1.25)
      });
    }
    
    return result;
  }

  /**
   * Versione sincrona di calculateEarningsBreakdown per compatibilità retroattiva
   * DEPRECATA: Usare sempre calculateEarningsBreakdown (asincrono) per garantire consistenza
   */
  calculateEarningsBreakdownSync(workEntry, settings) {
    console.warn('⚠️ calculateEarningsBreakdownSync è deprecato. Usa calculateEarningsBreakdown per consistenza.');
    try {
      // Per garantire consistenza, usa la stessa logica del metodo asincrono
      // ma senza chiamate async (versione semplificata)
      return this._calculateBasicBreakdown(workEntry, settings);
    } catch (error) {
      console.error('❌ Errore nel calcolo sincrono:', error);
      // Ritorna un breakdown vuoto in caso di errore
      return {
        ordinary: { total: 0, hours: {}, earnings: {} },
        standby: null,
        allowances: { travel: 0, meal: 0, standby: 0 },
        totalEarnings: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * Metodo di base per calcolo semplificato (senza sistema multi-fascia)
   * Garantisce consistenza con il metodo asincrono principale
   */
  _calculateBasicBreakdown(workEntry, settings) {
    console.log('[CalculationService] Usando metodo basic per compatibilità sync');
    
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || 16.41;
    const dailyRate = this.getEffectiveDailyRateFromContract(contract);
    
    // Calcola informazioni sulla data
    const date = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSaturday = date.getDay() === 6;
    const isSunday = date.getDay() === 0;
    const isHoliday = isItalianHoliday(date);
    const isSpecialDay = isSaturday || isSunday || isHoliday;
    
    // Gestione giorni fissi come il metodo asincrono
    const dayType = workEntry.dayType || 'lavorativa';
    const isFixedDay = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);
    
    if (isFixedDay && dayType !== 'lavorativa') {
      // 🔧 FIX: se è reperibilità, includi l'indennità anche nei giorni fissi (sync/basic)
      let standbyIndemnity = 0;
      try {
        const standbySettings = settings?.standbySettings || {};
        const standbyDays = standbySettings?.standbyDays || {};
        const dateStr = workEntry.date;

        const isManuallyDeactivated = workEntry.isStandbyDay === false ||
          workEntry.isStandbyDay === 0 ||
          workEntry.standbyAllowance === false ||
          workEntry.standbyAllowance === 0;

        const isManuallyActivated = workEntry.isStandbyDay === true ||
          workEntry.isStandbyDay === 1 ||
          workEntry.standbyAllowance === true ||
          workEntry.standbyAllowance === 1;

        const isInCalendar = Boolean(standbySettings?.enabled && standbyDays?.[dateStr]?.selected);
        const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);

        if (isStandbyDay) {
          const { getStandbyRatesForContract } = require('../constants');
          const cKey = settings?.contract?.key;
          const r = getStandbyRatesForContract(cKey);
          const IND_16H_FERIALE = r.feriale16;
          const IND_24H_FERIALE = r.feriale24;
          const IND_24H_FESTIVO = r.festivo24;

          const customFeriale16 = standbySettings.customFeriale16;
          const customFeriale24 = standbySettings.customFeriale24;
          const customFestivo = standbySettings.customFestivo;
          const allowanceType = standbySettings.allowanceType || '24h';
          const saturdayAsRest = standbySettings.saturdayAsRest === true;
          const saturdayMode = standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');

          const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
          if (isRestDay) {
            standbyIndemnity = customFestivo || IND_24H_FESTIVO;
          } else if (isSaturday && saturdayMode === 'feriale24') {
            standbyIndemnity = customFeriale24 || IND_24H_FERIALE;
          } else if (allowanceType === '16h') {
            standbyIndemnity = customFeriale16 || IND_16H_FERIALE;
          } else {
            standbyIndemnity = customFeriale24 || IND_24H_FERIALE;
          }
        }
      } catch (e) {
        standbyIndemnity = 0;
      }

      return {
        ordinary: {
          hours: {
            lavoro_giornaliera: 0,
            viaggio_giornaliera: 0,
            lavoro_extra: 0,
            viaggio_extra: 0
          },
          earnings: {
            giornaliera: dailyRate,
            viaggio_extra: 0,
            lavoro_extra: 0
          },
          total: dailyRate
        },
        standby: {
          workHours: {},
          travelHours: {},
          workEarnings: {},
          travelEarnings: {},
          dailyIndemnity: standbyIndemnity,
          totalEarnings: standbyIndemnity
        },
        allowances: {
          meal: 0,
          standby: standbyIndemnity
        },
        totalEarnings: dailyRate + standbyIndemnity,
        details: {
          isSaturday,
          isSunday,
          isHoliday,
          isSpecialDay,
          isFixedDay: true,
          dayType,
          syncMode: true
        }
      };
    }

    // Calcolo base per giorni lavorativi (versione semplificata)
    const ordinaryHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    
    // Calcoli base senza sistema multi-fascia
    const ordinaryEarnings = ordinaryHours * baseRate;
    const travelEarnings = travelHours * baseRate * (settings.travelMultiplier || 1);
    
    const result = {
      ordinary: {
        hours: {
          lavoro_giornaliera: ordinaryHours,
          viaggio_giornaliera: travelHours,
          lavoro_extra: 0,
          viaggio_extra: 0
        },
        earnings: {
          giornaliera: ordinaryEarnings + travelEarnings,
          viaggio_extra: 0,
          lavoro_extra: 0
        },
        total: ordinaryEarnings + travelEarnings
      },
      standby: null,
      allowances: {
        meal: 0,
        standby: 0
      },
      totalEarnings: ordinaryEarnings + travelEarnings,
      details: {
        isSaturday,
        isSunday,
        isHoliday,
        isSpecialDay,
        isFixedDay: false,
        syncMode: true
      }
    };
    
    return result;
  }

  /**
   * @typedef {Object} StandbyBreakdown
   * @property {number} dailyIndemnity - Indennità giornaliera per reperibilità
   * @property {Object} workHours - Ore di lavoro suddivise per fascia (es. ordinary, night, holiday)
   * @property {Object} travelHours - Ore di viaggio suddivise per fascia (es. ordinary, night, holiday)
   * @property {Object} workEarnings - Guadagni per il lavoro suddivisi per fascia
   * @property {Object} travelEarnings - Guadagni per il viaggio suddivisi per fascia
   * @property {number} totalEarnings - Guadagno totale per reperibilità (inclusa indennità)
   */

  /**
   * Calcola la suddivisione dettagliata della reperibilità per indennità, ore viaggio e ore lavoro, con fasce orarie e guadagni.
   * @param {object} workEntry - L'oggetto con i dati di lavoro.
   * @param {object} settings - Le impostazioni dell'utente.
   * @returns {StandbyBreakdown} - Il dettaglio della reperibilità.
   */
  calculateStandbyBreakdown(workEntry, settings) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate;
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const standbySettings = settings.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    const dailyAllowance = parseFloat(standbySettings.dailyAllowance) || 0;
    
    // Verifica reperibilità dall'impostazione calendario e/o flag manuale
    const dateStr = workEntry.date;
    
    // Se la reperibilità è esplicitamente disattivata nel form, ignora le impostazioni calendario
    const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                workEntry.isStandbyDay === 0 ||
                                workEntry.standbyAllowance === false ||
                                workEntry.standbyAllowance === 0;
                                
    const isManuallyActivated = workEntry.isStandbyDay === true || 
                              workEntry.isStandbyDay === 1 || 
                              workEntry.standbyAllowance === true || 
                              workEntry.standbyAllowance === 1;
    
    // Verifica le impostazioni di reperibilità dal calendario
    const isInCalendar = Boolean(standbySettings && 
                        standbySettings.enabled && 
                        standbyDays && 
                        dateStr && 
                        standbyDays[dateStr] && 
                        standbyDays[dateStr].selected === true);
    
    // Se è esplicitamente disattivata dal form, non è reperibilità anche se è nel calendario
    const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
    
    // Log dettagliato per debug reperibilità
    console.log(`[CalculationService] calculateStandbyBreakdown - Verifica reperibilità per ${dateStr}:`, {
      manuallyActivated: isManuallyActivated,
      manuallyDeactivated: isManuallyDeactivated,
      isInCalendar: isInCalendar,
      standbyEnabled: standbySettings.enabled,
      standbyDays: standbyDays ? Object.keys(standbyDays).length : 0,
      result: isStandbyDay
    });

    const parsedDate = this.safeParseDate(workEntry.date);
    if (!parsedDate) {
      return {
        dailyIndemnity: 0,
        workHours: {},
        travelHours: {},
        workEarnings: {},
        travelEarnings: {},
        totalEarnings: 0
      };
    }
    const isHoliday = isItalianHoliday(parsedDate);
    const isSunday = parsedDate.getDay() === 0;
    const isSaturday = parsedDate.getDay() === 6;

    // Segmenti di intervento reperibilità (inclusi tutti i viaggi di partenza e ritorno)
    const segments = [];
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      console.log(`[DEBUG] calculateStandbyBreakdown - Processing ${workEntry.interventi.length} interventi for ${workEntry.date}`);
      workEntry.interventi.forEach((iv, index) => {
        console.log(`[DEBUG] Intervento ${index + 1}:`, iv);
        
        // Viaggio di partenza (azienda -> luogo intervento)
        if (iv.departure_company && iv.arrival_site) {
          segments.push({ start: iv.departure_company, end: iv.arrival_site, type: 'standby_travel' });
          console.log(`[DEBUG] Added travel segment: ${iv.departure_company} → ${iv.arrival_site}`);
        }
        // Primo turno lavoro
        if (iv.work_start_1 && iv.work_end_1) {
          segments.push({ start: iv.work_start_1, end: iv.work_end_1, type: 'standby_work' });
          console.log(`[DEBUG] Added work segment 1: ${iv.work_start_1} → ${iv.work_end_1}`);
        }
        // Secondo turno lavoro
        if (iv.work_start_2 && iv.work_end_2) {
          segments.push({ start: iv.work_start_2, end: iv.work_end_2, type: 'standby_work' });
          console.log(`[DEBUG] Added work segment 2: ${iv.work_start_2} → ${iv.work_end_2}`);
        }
        // Viaggio di ritorno (luogo intervento -> azienda)
        if (iv.departure_return && iv.arrival_company) {
          segments.push({ start: iv.departure_return, end: iv.arrival_company, type: 'standby_travel' });
          console.log(`[DEBUG] Added return segment: ${iv.departure_return} → ${iv.arrival_company}`);
        }
      });
    } else {
      console.log(`[DEBUG] calculateStandbyBreakdown - No valid interventi array for ${workEntry.date}:`, workEntry.interventi);
    }
    
    console.log(`[DEBUG] Total segments extracted: ${segments.length}`, segments);

    // Suddivisione minuti per fascia oraria CCNL (tre fasce: diurno, serale, notturno)
    const minuteDetails = {
      work: { ordinary: 0, evening: 0, night: 0, saturday: 0, saturday_night: 0, holiday: 0, night_holiday: 0 },
      travel: { ordinary: 0, evening: 0, night: 0, saturday: 0, saturday_night: 0, holiday: 0, night_holiday: 0 }
    };

    for (const segment of segments) {
      const startMinutes = this.parseTime(segment.start);
      const duration = this.calculateTimeDifference(segment.start, segment.end);
      console.log(`[DEBUG] Processing segment ${segment.type}: ${segment.start} → ${segment.end}, duration: ${duration} min`);
      
      for (let i = 0; i < duration; i++) {
        const currentMinute = (startMinutes + i) % 1440;
        const hour = Math.floor(currentMinute / 60);
        let key = 'ordinary';
        
        // Logica di classificazione CCNL Metalmeccanico PMI per interventi di reperibilità
        if ((isHoliday || isSunday) && (hour >= 22 || hour < 6)) {
          key = 'night_holiday'; // Festivo notturno
        } else if (isHoliday || isSunday) {
          key = 'holiday'; // Festivo diurno/serale
        } else if (isSaturday && (hour >= 22 || hour < 6)) {
          key = 'saturday_night'; // Sabato notturno
        } else if (isSaturday) {
          key = 'saturday'; // Sabato diurno/serale
        } else if (hour >= 22 || hour < 6) {
          key = 'night'; // Notturno (22:00-06:00) +35%
        } else if (hour >= 20 && hour < 22) {
          key = 'evening'; // Serale (20:00-22:00) +25%
        } else {
          key = 'ordinary'; // Diurno (06:00-20:00) +20%
        }
        
        // Somma minuti
        if (segment.type === 'standby_work') minuteDetails.work[key]++;
        if (segment.type === 'standby_travel') minuteDetails.travel[key]++;
      }
    }

    // Conversione minuti in ore
    const hours = {
      work: {},
      travel: {}
    };
    Object.keys(minuteDetails.work).forEach(k => {
      hours.work[k] = this.minutesToHours(minuteDetails.work[k]);
      hours.travel[k] = this.minutesToHours(minuteDetails.travel[k]);
    });
    
    // Calcolo guadagni per fascia oraria
    const earnings = {
      work: {},
      travel: {}
    };
    // Calcola il totale ore giornaliere (lavoro ordinario + interventi reperibilità)
    const ordinaryWorkHours = this.calculateWorkHours(workEntry) || 0;
    const ordinaryTravelHours = this.calculateTravelHours(workEntry) || 0;
    const ordinaryTotalHours = ordinaryWorkHours + ordinaryTravelHours;
    
    const standbyWorkMinutes = Object.values(minuteDetails.work).reduce((a, b) => a + b, 0);
    const standbyTravelMinutes = Object.values(minuteDetails.travel).reduce((a, b) => a + b, 0);
    const standbyTotalHours = this.minutesToHours(standbyWorkMinutes + standbyTravelMinutes);
    
    const totalDailyHours = ordinaryTotalHours + standbyTotalHours;
    const standardWorkDay = getWorkDayHours(); // 8 ore
    
    // Nei giorni feriali, se le ORE ORDINARIE superano le 8 ore, le ore eccedenti di reperibilità 
    // potrebbero essere considerate straordinari secondo normativa CCNL
    // CORREZIONE: il controllo deve essere SOLO sulle ore ordinarie, non sul totale
    const isWeekday = !isSaturday && !isSunday && !isHoliday;
    const shouldApplyOvertimeToStandby = isWeekday && ordinaryTotalHours >= standardWorkDay;
    
    // Maggiorazioni CCNL per interventi di reperibilità
    const ccnlRates = contract.overtimeRates || {};
    
    // Controlla se le maggiorazioni CCNL sono attivate per i viaggi di reperibilità
    const applyTravelCCNLRates = standbySettings.travelWithBonus === true; // Deve essere esplicitamente true
    
    console.log(`[CalculationService] 🚨 DEBUG - Impostazioni reperibilità viaggi: travelWithBonus=${standbySettings.travelWithBonus}, applyTravelCCNLRates=${applyTravelCCNLRates}`);
    
    // Multipliers per LAVORO (includono logica straordinario se supera 8h)
    const workMultipliers = {
      ordinary: shouldApplyOvertimeToStandby ? (ccnlRates.day || 1.2) : 1.0, // Se supera 8h feriali, diventa straordinario
      evening: shouldApplyOvertimeToStandby ? (ccnlRates.overtimeNightUntil22 || 1.45) : (ccnlRates.nightUntil22 || 1.25), // Straordinario serale +45% o ordinario serale +25%
      night: shouldApplyOvertimeToStandby ? (ccnlRates.overtimeNightAfter22 || 1.5) : (ccnlRates.nightAfter22 || 1.35), // Straordinario notturno +50% o ordinario notturno +35%
      saturday: ccnlRates.saturday || 1.25, // Maggiorazione sabato configurabile
      saturday_night: shouldApplyOvertimeToStandby ? 
        1.50  // Straordinario notturno +50% (prevale sul sabato)
        : 1.35, // Ordinario notturno +35% (prevale sul sabato)
      holiday: shouldApplyOvertimeToStandby ? (ccnlRates.holiday || 1.3) : (ccnlRates.holiday || 1.3), // Straordinario festivo o ordinario festivo
      night_holiday: shouldApplyOvertimeToStandby ? 
        1.50  // Straordinario notturno +50% (prevale sul festivo)
        : 1.35 // Ordinario notturno +35% (prevale sul festivo)
    };
    
    // Multipliers per VIAGGI - Rispetta le impostazioni utente
    const travelMultipliers = {
      ordinary: 1.0, // Viaggi diurni sempre a tariffa base
      evening: applyTravelCCNLRates ? (ccnlRates.nightUntil22 || 1.25) : 1.0, // Solo se attivate nelle impostazioni
      night: applyTravelCCNLRates ? (ccnlRates.nightUntil22 || 1.25) : 1.0, // Solo se attivate nelle impostazioni
      saturday: 1.0, // Viaggi sabato a tariffa base (solo fascia oraria conta)
      saturday_night: applyTravelCCNLRates ? 1.25 : 1.0, // Solo se attivate nelle impostazioni
      holiday: 1.0, // Viaggi festivi a tariffa base
      night_holiday: applyTravelCCNLRates ? 1.25 : 1.0 // Solo se attivate nelle impostazioni
    };
    
    Object.keys(hours.work).forEach(k => {
      earnings.work[k] = hours.work[k] * baseRate * (workMultipliers[k] || 1.0);
      earnings.travel[k] = hours.travel[k] * baseRate * travelCompensationRate * (travelMultipliers[k] || 1.0);
    });

    // Guadagno totale reperibilità (inclusa indennità)
    // Se la reperibilità è disattivata manualmente, non consideriamo l'indennità
    const isStandbyActive = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
    
    // CORREZIONE: Calcola l'indennità CCNL corretta con tariffe per livello e saturdayMode
    let correctDailyAllowance = 0;
    if (isStandbyActive) {
      const { getStandbyRatesForContract } = require('../constants');
      const cKey = settings?.contract?.key;
      const rates = getStandbyRatesForContract(cKey);
      const IND_16H_FERIALE = rates.feriale16;
      const IND_24H_FERIALE = rates.feriale24;
      const IND_24H_FESTIVO = rates.festivo24;

      // Personalizzazioni
      const customFeriale16 = standbySettings.customFeriale16;
      const customFeriale24 = standbySettings.customFeriale24;
      const customFestivo = standbySettings.customFestivo;
      const allowanceType = standbySettings.allowanceType || '24h';
      const saturdayMode = standbySettings.saturdayMode || (standbySettings.saturdayAsRest ? 'festivo' : 'feriale');

      // Tipo giorno con saturdayMode
      const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');

      if (isRestDay) {
        correctDailyAllowance = customFestivo || IND_24H_FESTIVO;
        console.log(`[CalculationService] StandbyBreakdown - Indennità reperibilità giorno di riposo per ${dateStr}: ${correctDailyAllowance}€ (personalizzata: ${!!customFestivo})`);
      } else {
        if (isSaturday && saturdayMode === 'feriale24') {
          correctDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        } else if (allowanceType === '16h') {
          correctDailyAllowance = customFeriale16 || IND_16H_FERIALE;
        } else {
          correctDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        }
        console.log(`[CalculationService] StandbyBreakdown - Indennità reperibilità feriale (${isSaturday && saturdayMode==='feriale24' ? 'sabato 24h' : allowanceType}) per ${dateStr}: ${correctDailyAllowance}€`);
      }
    }
    
    // CORREZIONE: Gli earnings degli interventi devono essere calcolati sempre se ci sono interventi
    // L'indennità giornaliera viene applicata solo se la reperibilità è attiva
    const interventionEarnings = Object.values(earnings.work).reduce((a, b) => a + b, 0)
      + Object.values(earnings.travel).reduce((a, b) => a + b, 0);
    
    // L'indennità giornaliera viene aggiunta solo se la reperibilità è attiva
    const dailyIndemnity = isStandbyActive ? correctDailyAllowance : 0;
    
    const totalEarnings = interventionEarnings + dailyIndemnity;

    return {
      dailyIndemnity, // Indennità giornaliera
      workHours: hours.work, // Ore lavoro per fascia
      travelHours: hours.travel, // Ore viaggio per fascia
      workEarnings: earnings.work, // Guadagni lavoro per fascia
      travelEarnings: earnings.travel, // Guadagni viaggio per fascia
      totalEarnings // Guadagno totale reperibilità (inclusa indennità)
    };
  }

  getRateMultiplierForCategory(category, contract) {
    const ccnlRates = contract.overtimeRates; // Maggiorazioni CCNL
    if (category.includes('standby')) {
        // La reperibilità segue le stesse maggiorazioni del lavoro normale/straordinario
        category = category.replace('standby_', '');
    }

    if (category === 'overtime_night_holiday') return ccnlRates.holiday || 1.3; // Festivo
    if (category === 'overtime_holiday') return ccnlRates.holiday || 1.3; // Festivo
    if (category === 'overtime_night') return ccnlRates.nightAfter22 || 1.35; // Notturno +35%
    if (category === 'overtime') return ccnlRates.day || 1.2; // Diurno +20%
    if (category === 'ordinary_night_holiday') return ccnlRates.holiday || 1.3; // Festivo
    if (category === 'ordinary_holiday') return ccnlRates.holiday || 1.3; // Festivo
    if (category === 'ordinary_night') return ccnlRates.nightUntil22 || 1.25; // Serale +25%
    
    return 1.0; // ordinary
  }

  calculateAllowances(workEntry, settings, hoursBreakdown) {
      const allowances = {
          travel: 0,
          standby: 0,
          meal: 0,
      };

      // Dichiarazioni delle impostazioni
      const travelSettings = settings.travelAllowance || {};
      const standbySettings = settings.standbySettings || {};

      // Logica Indennità di Trasferta
      if (travelSettings.enabled) {
          // Verifica se ci sono ore di viaggio
          const travelHours = (hoursBreakdown.viaggio_giornaliera || 0) + (hoursBreakdown.viaggio_extra || 0);
          
          // Attiva l'indennità solo se:
          // 1) ci sono ore di viaggio, OPPURE
          // 2) il flag travelAllowance è stato attivato manualmente nel form
          if (travelHours > 0 || (workEntry.travelAllowance === 1 || workEntry.travelAllowance === true)) {
              // Applica percentuale se presente (per mezza giornata)
              const percentuale = workEntry.travelAllowancePercent || 1.0;
              allowances.travel = (parseFloat(travelSettings.dailyAmount) || 0) * percentuale;
          }
      }

      // Logica Indennità di Reperibilità
      // NOTA: Questo valore viene usato per mostrare l'indennità nel riepilogo
      const dateStr = workEntry.date; // Data in formato YYYY-MM-DD
      
      // Se la reperibilità è esplicitamente disattivata nel form, ignora le impostazioni calendario
      const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                  workEntry.isStandbyDay === 0 ||
                                  workEntry.standbyAllowance === false ||
                                  workEntry.standbyAllowance === 0;
                                  
      const isManuallyActivated = workEntry.isStandbyDay === true || 
                                workEntry.isStandbyDay === 1 || 
                                workEntry.standbyAllowance === true || 
                                workEntry.standbyAllowance === 1;
      
      const isInCalendar = Boolean(standbySettings.enabled && 
                          standbySettings.standbyDays && 
                          standbySettings.standbyDays[dateStr]?.selected);
      
      // Log di debug per verificare la data e le impostazioni di reperibilità
      console.log(`[CalculationService] Verifica reperibilità per ${dateStr}:`, {
          manuallyActivated: isManuallyActivated,
          manuallyDeactivated: isManuallyDeactivated,
          isInCalendar: isInCalendar,
          standbyEnabled: standbySettings.enabled,
          standbyDays: standbySettings.standbyDays ? Object.keys(standbySettings.standbyDays).length : 0
      });
      
      // Corretto: considera sia il flag manuale dal form che le impostazioni configurate
      // Se è esplicitamente disattivata dal form, non è reperibilità anche se è nel calendario
      const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
      
      if (isStandbyDay) {
          // CORREZIONE: Calcola l'indennità CCNL corretta con tariffe per livello
          const { getStandbyRatesForContract } = require('../constants');
          const cKey = settings?.contract?.key;
          const rates = getStandbyRatesForContract(cKey);
          const IND_16H_FERIALE = rates.feriale16;
          const IND_24H_FERIALE = rates.feriale24;
          const IND_24H_FESTIVO = rates.festivo24;
          
          // Verifica se abbiamo personalizzazioni
          const customFeriale16 = standbySettings.customFeriale16;
          const customFeriale24 = standbySettings.customFeriale24;
          const customFestivo = standbySettings.customFestivo;
          const allowanceType = standbySettings.allowanceType || '24h';
          const saturdayAsRest = standbySettings.saturdayAsRest === true;
          const saturdayMode = standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
          
          // Determina il tipo di giorno considerando le impostazioni personalizzate
          const dateObj = new Date(dateStr);
          const isSaturday = dateObj.getDay() === 6;
          const isSunday = dateObj.getDay() === 0;
          const isHoliday = false; // Assumiamo non festivo per semplicità, andrebbe verificato
          const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
          
          let correctStandbyAllowance;
          if (isRestDay) {
            // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
            correctStandbyAllowance = customFestivo || IND_24H_FESTIVO;
            console.log(`[CalculationService] Allowances - Indennità reperibilità giorno di riposo per ${dateStr}: ${correctStandbyAllowance}€ (personalizzata: ${!!customFestivo})`);
          } else {
            // Giorni feriali (incluso sabato se non è giorno di riposo)
            if (isSaturday && saturdayMode === 'feriale24') {
              correctStandbyAllowance = customFeriale24 || IND_24H_FERIALE;
            } else if (allowanceType === '16h') {
              correctStandbyAllowance = customFeriale16 || IND_16H_FERIALE;
            } else {
              correctStandbyAllowance = customFeriale24 || IND_24H_FERIALE;
            }
            console.log(`[CalculationService] Allowances - Indennità reperibilità feriale ${allowanceType} per ${dateStr}: ${correctStandbyAllowance}€ (personalizzata: ${!!(allowanceType === '16h' ? customFeriale16 : customFeriale24)})`);
          }
          
          allowances.standby = correctStandbyAllowance;
      }
      
      // Logica Buoni Pasto (aggiornata)
      // Gestisce correttamente i casi con valori specifici nel form (priorità) e quelli dalle impostazioni
      
      // Pranzo: valori specifici nel form hanno priorità sui valori dalle impostazioni
      if(workEntry.mealLunchCash > 0) {
        // Se c'è un valore specifico nel form, usa solo quello
        allowances.meal += workEntry.mealLunchCash;
      } else if (workEntry.mealLunchVoucher) {
        // Altrimenti usa i valori standard dalle impostazioni
        allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
        allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
      }
      
      // Cena: stesso approccio del pranzo
      if(workEntry.mealDinnerCash > 0) {
        // Se c'è un valore specifico nel form, usa solo quello
        allowances.meal += workEntry.mealDinnerCash;
      } else if (workEntry.mealDinnerVoucher) {
        // Altrimenti usa i valori standard dalle impostazioni
        allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
        allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
      }

      return allowances;
  }


  // Calcolo della tariffa oraria maggiorata in base al tipo di lavoro e giorno
  getHourlyRateWithBonus({
    baseRate,
    isOvertime = false,
    isNight = false,
    isHoliday = false,
    isSunday = false,
    contract = null
  }) {
    // Usa i tassi CCNL se disponibili, altrimenti fallback
    const rates = contract?.overtimeRates || {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    };

    if (isOvertime && isNight) return baseRate * (rates.nightAfter22 || 1.35); // Straordinario notturno +35%
    if (isOvertime && (isHoliday || isSunday)) return baseRate * (rates.holiday || 1.3); // Straordinario festivo/domenicale +30%
    if (isOvertime) return baseRate * (rates.day || 1.2); // Straordinario diurno +20%
    if (isNight && isHoliday) return baseRate * (rates.holiday || 1.3); // Lavoro ordinario notturno festivo +30%
    if (isNight) return baseRate * (rates.nightUntil22 || 1.25); // Lavoro ordinario notturno +25%
    if (isHoliday || isSunday) return baseRate * (rates.holiday || 1.3); // Lavoro ordinario festivo/domenicale +30%
    return baseRate;
  }

  // Calculate standby work earnings with night work considerations
  calculateStandbyWorkEarnings(start1, end1, start2, end2, contract, date) {
    let totalEarnings = 0;
    
    // Controlla se il giorno è festivo, domenica o sabato
    const workDate = new Date(date);
    const isSaturday = workDate.getDay() === 6;
    const isSunday = workDate.getDay() === 0;
    const isHoliday = isItalianHoliday(workDate);
    
    const shifts = [
      { start: start1, end: end1 },
      { start: start2, end: end2 }
    ];
    
    shifts.forEach(shift => {
      if (!shift.start || !shift.end) return;
      
      const startHour = parseInt(shift.start.split(':')[0]);
      const endHour = parseInt(shift.end.split(':')[0]);
      const shiftMinutes = this.calculateTimeDifference(shift.start, shift.end);
      const shiftHours = this.minutesToHours(shiftMinutes);
      
      // Gli interventi di reperibilità sono pagati come ore ORDINARIE, non straordinari
      let rate = contract.hourlyRate;
      
      // Applicare maggiorazioni secondo CCNL:
      // 1. Maggiorazione notturna se il turno è notturno
      if ((startHour >= 22 || startHour < 6) || (endHour >= 22 || endHour < 6)) {
        rate = contract.hourlyRate * (contract.overtimeRates?.night || 1.25); // +25% notturno
      }
      // 2. Maggiorazione festiva/domenicale 
      else if (isSunday || isHoliday) {
        rate = contract.hourlyRate * 1.30; // +30% festivo/domenicale
      }
      // 3. Maggiorazione sabato
      else if (isSaturday) {
        rate = contract.hourlyRate * (contract.overtimeRates?.saturday || 1.25); // Sabato configurabile
      }
      
      totalEarnings += shiftHours * rate;
    });
    
    return totalEarnings;
  }

  // Calculate monthly summary
  calculateMonthlySummary(workEntries, settings, month, year) {
    const summary = {
      totalHours: 0,
      workHours: 0,
      travelHours: 0,
      travelExtraHours: 0,
      overtimeHours: 0,
      standbyWorkHours: 0,
      standbyTravelHours: 0,
      regularDays: 0,
      weekendHolidayDays: 0,
      standbyDays: 0,
      travelAllowanceDays: 0,
      mealVoucherDays: 0,
      mealCashDays: 0,
      lunchCount: 0,
      dinnerCount: 0,
      mealVoucherAmount: 0,
      mealCashAmount: 0,
      totalEarnings: 0, // Lordo totale
      // 💰 NUOVI CAMPI NETTO
      grossTotalEarnings: 0, // Alias per chiarezza
      netTotalEarnings: 0, // Netto totale
      totalDeductions: 0, // Trattenute totali mensili
      deductionRate: 0, // Percentuale media trattenute
      regularPay: 0,
      overtimePay: 0,
      travelPay: 0,
      standbyPay: 0,
      allowances: 0,
      mealAllowances: 0,
      overtimeDetail: {
        day: 0,
        nightUntil22: 0,
        nightAfter22: 0
      },
      dailyBreakdown: []
    };
    
    // Protezione contro workEntries nullo o non array
    if (!workEntries || !Array.isArray(workEntries)) {
      console.error('calculateMonthlySummary: workEntries non valido', workEntries);
      return summary;
    }
    
    // Determina mese e anno dalle entry o dai parametri
    let targetMonth, targetYear;
    
    // Usa i parametri se forniti
    if (month !== undefined && year !== undefined) {
      targetMonth = month;
      targetYear = year;
    }
    // Altrimenti, prendi la prima entry valida per determinare mese/anno
    else if (workEntries.length > 0 && workEntries[0].date) {
      const firstEntryDate = new Date(workEntries[0].date);
      targetYear = firstEntryDate.getFullYear();
      targetMonth = firstEntryDate.getMonth() + 1; // getMonth() restituisce 0-11
    } else {
      // Se non ci sono entry e nessun parametro, usa il mese/anno corrente
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }
    
    // Aggiungiamo un'analisi iniziale del mese/anno per trovare i giorni di reperibilità dalle impostazioni
    // In caso di assenza di inserimenti normali per quei giorni
    if (settings?.standbySettings?.enabled && settings?.standbySettings?.standbyDays) {
      const standbyDays = settings.standbySettings.standbyDays;
      // Filtriamo le date di reperibilità che corrispondono al mese/anno richiesto
      const standbyDatesOfMonth = Object.keys(standbyDays).filter(date => {
        if (!standbyDays[date]?.selected) return false;
        
        const [y, m] = date.split('-');
        return parseInt(y) === parseInt(targetYear) && parseInt(m) === parseInt(targetMonth);
      });
      
      console.log(`[CalculationService] Trovati ${standbyDatesOfMonth.length} giorni di reperibilità nel mese ${targetYear}-${targetMonth} dalle impostazioni`);
    }
    
    workEntries.forEach(entry => {
      // 🔧 PARSING CORRETTO: Usa createWorkEntryFromData come nel TimeEntryScreen
      const parsedEntry = createWorkEntryFromData(entry, this);
      
      // Usa calculateEarningsBreakdown per logica consistente con TimeEntryScreen
      const breakdown = this.calculateEarningsBreakdown(parsedEntry, settings);
      
      // 🔧 CORREZIONE: Usa la stessa logica del Dashboard per calcolare le ore
      // Calcola ore di lavoro dal breakdown (include lavoro normale + straordinari)
      const workHours = Object.values(breakdown.ordinary?.hours || {}).reduce((sum, hours) => sum + hours, 0);
      
      // Calcola ore di viaggio dal breakdown 
      const travelHours = Object.values(breakdown.travel?.hours || {}).reduce((sum, hours) => sum + hours, 0);
      
      // Calcola ore straordinarie eccedenti (se disponibili)
      const travelExtraHours = breakdown.travel?.extraHours || 0;
      
      // Usa le ore di reperibilità dal breakdown dettagliato
      const standbyWorkHours = Object.values(breakdown.standby?.workHours || {}).reduce((sum, hours) => sum + hours, 0);
      const standbyTravelHours = Object.values(breakdown.standby?.travelHours || {}).reduce((sum, hours) => sum + hours, 0);
      
      console.log(`[CalculationService] ${parsedEntry.date}: Ore da breakdown - Lavoro: ${workHours}h, Viaggio: ${travelHours}h, Reperibilità lavoro: ${standbyWorkHours}h, Reperibilità viaggio: ${standbyTravelHours}h`);
      
      // Ore totali e per categoria
      summary.totalHours += workHours + travelHours + standbyWorkHours + standbyTravelHours;
      summary.workHours += workHours;
      summary.travelHours += travelHours;
      summary.travelExtraHours += travelExtraHours;
      summary.overtimeHours += breakdown.ordinary?.hours?.overtime || 0;
      summary.standbyWorkHours += standbyWorkHours;
      summary.standbyTravelHours += standbyTravelHours;
      
      // Dettaglio ore straordinarie per tipo di maggiorazione
      if (breakdown.ordinary?.hours) {
        summary.overtimeDetail.day += breakdown.ordinary.hours.overtime_day || 0;
        summary.overtimeDetail.nightUntil22 += breakdown.ordinary.hours.overtime_night_until_22 || 0;
        summary.overtimeDetail.nightAfter22 += breakdown.ordinary.hours.overtime_night_after_22 || 0;
      }
      
      // Conteggio giorni per tipo di reperibilità
      // Considera sia il flag manuale (isStandbyDay/standbyAllowance) che le impostazioni
      const isStandbyDayManual = parsedEntry.isStandbyDay === 1 || parsedEntry.standbyAllowance === 1;
      const isStandbyDayFromSettings = settings?.standbySettings?.enabled && 
        settings?.standbySettings?.standbyDays && 
        settings?.standbySettings?.standbyDays[parsedEntry.date]?.selected;
        
      if (isStandbyDayManual || isStandbyDayFromSettings) {
        summary.standbyDays++;
        console.log(`[CalculationService] Conteggio giorni reperibilità: ${parsedEntry.date} conteggiato. Fonte: ${isStandbyDayManual ? 'Flag manuale' : 'Impostazioni'}`);
      }
      
      // Giorni ordinari vs festivi/weekend
      const entryDate = new Date(parsedEntry.date);
      const isWeekend = entryDate.getDay() === 0 || entryDate.getDay() === 6; // domenica = 0, sabato = 6
      const isHoliday = isItalianHoliday(parsedEntry.date);
      
      if (isWeekend || isHoliday) {
        summary.weekendHolidayDays++;
      } else {
        summary.regularDays++;
      }
      
      // Conteggio giorni con trasferta
      if (parsedEntry.travelAllowance === 1) {
        summary.travelAllowanceDays++;
      }
      
      // Conteggio giorni con pasti usando logica corretta allineata al form
      let hasMealVoucher = false;
      let hasMealCash = false;
      
      // Logica pranzo: se c'è cash specifico, usa solo quello, altrimenti usa voucher dalle impostazioni
      if (parsedEntry.mealLunchCash > 0) {
        summary.lunchCount++;
        hasMealCash = true;
        summary.mealCashAmount += parsedEntry.mealLunchCash;
      } else if (parsedEntry.mealLunchVoucher === 1) {
        summary.lunchCount++;
        hasMealVoucher = true;
        summary.mealVoucherAmount += settings?.mealAllowances?.lunch?.voucherAmount || 0;
        // Aggiungi anche cash dalle impostazioni se configurato
        if (settings?.mealAllowances?.lunch?.cashAmount > 0) {
          hasMealCash = true;
          summary.mealCashAmount += settings.mealAllowances.lunch.cashAmount;
        }
      }
      
      // Logica cena: stessa logica del pranzo
      if (parsedEntry.mealDinnerCash > 0) {
        summary.dinnerCount++;
        hasMealCash = true;
        summary.mealCashAmount += parsedEntry.mealDinnerCash;
      } else if (parsedEntry.mealDinnerVoucher === 1) {
        summary.dinnerCount++;
        hasMealVoucher = true;
        summary.mealVoucherAmount += settings?.mealAllowances?.dinner?.voucherAmount || 0;
        // Aggiungi anche cash dalle impostazioni se configurato
        if (settings?.mealAllowances?.dinner?.cashAmount > 0) {
          hasMealCash = true;
          summary.mealCashAmount += settings.mealAllowances.dinner.cashAmount;
        }
      }
      
      if (hasMealVoucher) summary.mealVoucherDays++;
      if (hasMealCash) summary.mealCashDays++;
      
      // Importi totali usando breakdown corretto  
      summary.totalEarnings += breakdown.totalEarnings || 0;
      summary.regularPay += breakdown.ordinary?.total || 0;
      summary.overtimePay += breakdown.ordinary?.earnings?.overtime || 0;
      summary.travelPay += breakdown.ordinary?.earnings?.travel || 0;
      
      // Somma indennità di reperibilità
      summary.standbyPay += (breakdown.standby?.totalEarnings || 0) + (breakdown.allowances?.standby || 0);
      
      // Le altre indennità (trasferta)
      summary.allowances += breakdown.allowances?.travel || 0;
      
      // Rimborsi pasto usando breakdown corretto
      summary.mealAllowances += breakdown.allowances?.meal || 0;
      
      // Determina se è un giorno di reperibilità (da flag manuale o impostazioni)
      const isStandbyDay = parsedEntry.isStandbyDay === 1 || parsedEntry.standbyAllowance === 1 ||
        (settings?.standbySettings?.enabled && 
          settings?.standbySettings?.standbyDays && 
          settings?.standbySettings?.standbyDays[parsedEntry.date]?.selected);

      summary.dailyBreakdown.push({
        date: parsedEntry.date,
        workHours,
        travelHours,
        standbyWorkHours,
        standbyTravelHours,
        earnings: breakdown.totalEarnings || 0,
        isStandbyDay: isStandbyDay ? 1 : 0, // Normalizzato a 1/0 per consistenza
        // Aggiungi dettaglio indennità giornaliera di reperibilità per dashboard
        standbyAllowance: isStandbyDay ? (breakdown.allowances?.standby || 0) : 0
      });
    });
    
    // 💰 CALCOLO NETTO MENSILE - Priorità ai dati reali delle buste paga
    if (summary.totalEarnings > 0) {
      const realNetCalculation = calculateRealNet(summary.totalEarnings);
      const monthlyNetCalculation = this.netCalculator.calculateMonthlyNet(summary.totalEarnings);
      
      // Scegli il calcolo migliore (priorità: reale > teorico)
      const chosenCalculation = realNetCalculation?.priority === 1 ? realNetCalculation : monthlyNetCalculation;
      
      console.log('🔍 Calcolo Netto Mensile Debug:', {
        totalEarnings: summary.totalEarnings,
        realMethod: realNetCalculation?.method,
        realNet: realNetCalculation?.net,
        monthlyNet: monthlyNetCalculation?.net,
        chosenMethod: chosenCalculation?.method,
        chosenNet: chosenCalculation?.net
      });
      
      // Aggiorna i campi del summary con i calcoli netti
      summary.grossTotalEarnings = summary.totalEarnings; // Alias per chiarezza
      summary.netTotalEarnings = chosenCalculation.net;
      summary.totalDeductions = chosenCalculation.totalDeductions;
      summary.deductionRate = chosenCalculation.effectiveRate || chosenCalculation.deductionRate;
      
      // Aggiungi info dettagliate per debugging/analisi
      summary.netCalculations = {
        real: realNetCalculation,
        monthly: monthlyNetCalculation,
        chosen: chosenCalculation,
        estimatedAnnual: summary.totalEarnings * 12
      };
    }
    
    return summary;
  }

  /**
   * Safe date parsing utility
   */
  safeParseDate(dateValue) {
    if (!dateValue) return null;
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  }

  // Calcola l'indennità di reperibilità per un giorno specifico
  calculateStandbyAllowanceForDate(date, settings) {
    if (!settings?.standbySettings?.enabled) return 0;
    
    const standbyDays = settings.standbySettings.standbyDays || {};
    const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : date;

    // Controlla se il giorno è marcato come reperibilità nel calendario
    if (standbyDays[dateStr]?.selected) {
      // Controlla le impostazioni per weekend e festivi
      const dateObj = new Date(dateStr);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isHoliday = isItalianHoliday(dateStr);

      if ((isWeekend && !settings.standbySettings.includeWeekends) ||
          (isHoliday && !settings.standbySettings.includeHolidays)) {
        return 0;
      }

      // Usa dailyAllowance se impostato, altrimenti usa valori CCNL automatici
      let dailyAllowance = parseFloat(settings.standbySettings.dailyAllowance) || 0;
      
      if (dailyAllowance === 0) {
        // Tariffe CCNL automatiche per livello
        const { getStandbyRatesForContract } = require('../constants');
        const cKey = settings?.contract?.key;
        const rates = getStandbyRatesForContract(cKey);
        const IND_16H_FERIALE = rates.feriale16;
        const IND_24H_FERIALE = rates.feriale24;
        const IND_24H_FESTIVO = rates.festivo24;

        const allowanceType = settings.standbySettings.allowanceType || '24h';
        const saturdayMode = settings.standbySettings.saturdayMode || (settings.standbySettings.saturdayAsRest ? 'festivo' : 'feriale');

        const isSunday = dateObj.getDay() === 0;
        const isSaturday = dateObj.getDay() === 6;

        if (isHoliday || isSunday || (isSaturday && saturdayMode === 'festivo')) {
          dailyAllowance = IND_24H_FESTIVO;
        } else if (isSaturday && saturdayMode === 'feriale24') {
          dailyAllowance = IND_24H_FERIALE;
        } else {
          dailyAllowance = allowanceType === '24h' ? IND_24H_FERIALE : IND_16H_FERIALE;
        }
      }
      
      return dailyAllowance;
    }

    return 0;
  }

  // Calcola tutte le indennità di reperibilità per un mese specifico
  calculateMonthlyStandbyAllowances(year, month, settings) {
    if (!settings?.standbySettings?.enabled) return [];

    const results = [];
    const date = new Date(year, month - 1, 1); // Mese è 1-based
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      date.setDate(day);
      const dateStr = date.toISOString().slice(0, 10);
      // Usa getStandbyBreakdown per ottenere dettagli
      const breakdown = CalculationService.getStandbyBreakdown({ date: dateStr }, settings);
      if (breakdown.allowance > 0) {
        // Mappa il dayType in feriale/sabato/festivo
        let dayType = 'feriale';
        if (breakdown.details) {
          const rawType = breakdown.details.dayType?.toLowerCase() || '';
          if (rawType.includes('sabato')) {
            dayType = 'sabato';
          } else if (rawType.includes('festivo') || rawType.includes('domenica')) {
            dayType = 'festivo';
          }
        }
        results.push({
          date: dateStr,
          allowance: breakdown.allowance,
          type: 'standby',
          dayType: dayType
        });
      }
    }

    return results;
  }

  // Metodo per ottenere il breakdown dettagliato della reperibilità
  static getStandbyBreakdown(workEntry, settings) {
    const date = new Date(workEntry.date);
    const isSunday = date.getDay() === 0;
    const isSaturday = date.getDay() === 6;
    const isHoliday = isItalianHoliday(workEntry.date);
    
    const standbySettings = settings?.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    const dateStr = workEntry.date;
    
    // Logica per determinare se è giorno di reperibilità (presa da calculateDailyEarnings)
    const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                  workEntry.isStandbyDay === 0 ||
                                  workEntry.standbyAllowance === false ||
                                  workEntry.standbyAllowance === 0;
    
    const isManuallyActivated = workEntry.isStandbyDay === true || 
                                workEntry.isStandbyDay === 1 || 
                                workEntry.standbyAllowance === true || 
                                workEntry.standbyAllowance === 1;
    
    const isInCalendar = Boolean(standbySettings && 
                        standbySettings.enabled && 
                        standbyDays && 
                        dateStr && 
                        standbyDays[dateStr] && 
                        standbyDays[dateStr].selected === true);
    
    const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
    
    if (!isStandbyDay || !settings?.standbySettings?.enabled) {
      return {
        status: 'Non in reperibilità',
        allowance: 0,
        details: null
      };
    }
    
  // Tariffe CCNL per livello
  const { getStandbyRatesForContract } = require('../constants');
  const cKey = settings?.contract?.key;
  const rates = getStandbyRatesForContract(cKey);
  const IND_16H_FERIALE = rates.feriale16;
  const IND_24H_FERIALE = rates.feriale24;
  const IND_24H_FESTIVO = rates.festivo24;
    
    // Verifica personalizzazioni
    const customFeriale16 = settings.standbySettings.customFeriale16;
    const customFeriale24 = settings.standbySettings.customFeriale24;
    const customFestivo = settings.standbySettings.customFestivo;
    const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  const saturdayMode = settings.standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
    
    // Determina il tipo di giorno
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
    
    let standbyAllowance;
    let dayType;
    let isCustom = false;
    let defaultValue;
    
    if (isRestDay) {
      standbyAllowance = customFestivo || IND_24H_FESTIVO;
      dayType = isSunday ? 'Domenica' : (isHoliday ? 'Festivo' : 'Sabato (riposo)');
      isCustom = !!customFestivo;
      defaultValue = IND_24H_FESTIVO;
    } else {
      if (isSaturday && saturdayMode === 'feriale24') {
        standbyAllowance = customFeriale24 || IND_24H_FERIALE;
        isCustom = !!customFeriale24;
        defaultValue = IND_24H_FERIALE;
      } else if (allowanceType === '16h') {
        standbyAllowance = customFeriale16 || IND_16H_FERIALE;
        isCustom = !!customFeriale16;
        defaultValue = IND_16H_FERIALE;
      } else {
        standbyAllowance = customFeriale24 || IND_24H_FERIALE;
        isCustom = !!customFeriale24;
        defaultValue = IND_24H_FERIALE;
      }
      dayType = isSaturday ? 'Sabato (lavorativo)' : 'Feriale';
    }
    
    return {
      status: 'In reperibilità',
      allowance: standbyAllowance,
      details: {
        dayType,
        allowanceType: isRestDay ? '24h' : allowanceType,
        isCustom,
        defaultValue,
        source: isCustom ? 'Personalizzato' : 'CCNL',
        activationSource: isManuallyActivated ? 'Manuale' : 'Calendario'
      }
    };
  }

  // Helper per caricare fasce orarie personalizzate
  static async getCustomTimeSlots() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const customTimeSlotsData = await AsyncStorage.getItem('custom_time_slots');
      if (customTimeSlotsData) {
        const slots = JSON.parse(customTimeSlotsData);
        
        console.log('🔧 SLOT CARICATI DAL STORAGE:', slots);
        
        // Converti le fasce orarie dal formato HH:MM al formato minuti
        const convertedSlots = slots.map(slot => {
          const [startHour, startMin] = slot.start.split(':').map(Number);
          const [endHour, endMin] = slot.end.split(':').map(Number);
          
          let startMinutes = startHour * 60 + startMin;
          let endMinutes = endHour * 60 + endMin;
          
          // 🔥 GESTIONE SPECIALE PER FASCIA NOTTURNA CHE ATTRAVERSA MEZZANOTTE
          if (slot.id === 'notturno' && slot.start === '22:00' && slot.end === '06:00') {
            // Crea due fasce separate per la fascia notturna
            return [
              {
                start: startMinutes, // 22:00 = 1320 minuti
                end: 24 * 60,       // 24:00 = 1440 minuti  
                name: slot.name + ' (22-24)',
                multiplier: slot.rate || 1.25,
                id: slot.id + '_part1'
              },
              {
                start: 0,           // 00:00 = 0 minuti
                end: endMinutes,    // 06:00 = 360 minuti
                name: slot.name + ' (00-06)',
                multiplier: slot.rate || 1.25,
                id: slot.id + '_part2'
              }
            ];
          }
          
          // Gestisci attraversamento mezzanotte per altre fasce
          if (endMinutes <= startMinutes) {
            endMinutes += 24 * 60;
          }
          
          return {
            start: startMinutes,
            end: endMinutes,
            name: slot.name || slot.id,
            multiplier: slot.rate || 1.0,
            id: slot.id
          };
        }).flat(); // Usa flat() per gestire le fasce multiple del notturno
        
        console.log('🔧 SLOT CONVERTITI:', convertedSlots);
        return convertedSlots;
      }
    } catch (error) {
      console.warn('Errore caricamento fasce orarie personalizzate:', error);
    }
    return [];
  }

  // Calcola la retribuzione per fasce orarie CCNL dettagliate con supporto fasce personalizzate
  async calculateHourlyRatesByTimeSlots(startTime, endTime, baseRate, contract, isOvertime = false, isHoliday = false, isSunday = false) {
    const timeSlots = [];
    
    // Carica fasce orarie personalizzate
    const customTimeSlots = await CalculationService.getCustomTimeSlots();
    
    // Converti orari in minuti per calcoli più precisi
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Gestisci il caso di attraversamento della mezzanotte
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Aggiungi 24 ore
    }
    
    // 🔥 FASCE ORARIE PERSONALIZZABILI: Usa fasce personalizzate se disponibili
    const TIME_SLOTS = customTimeSlots.length > 0 ? customTimeSlots : [
      { start: 6 * 60, end: 20 * 60, name: 'diurno', multiplier: isOvertime ? (contract?.overtimeRates?.day || 1.2) : 1.0 },
      { start: 20 * 60, end: 22 * 60, name: 'serale', multiplier: isOvertime ? (contract?.overtimeRates?.nightUntil22 || 1.25) : 1.0 },
      { start: 22 * 60, end: 24 * 60, name: 'notturno', multiplier: isOvertime ? (contract?.overtimeRates?.nightAfter22 || 1.35) : (contract?.overtimeRates?.nightUntil22 || 1.25) },
      { start: 0, end: 6 * 60, name: 'notturno', multiplier: isOvertime ? (contract?.overtimeRates?.nightAfter22 || 1.35) : (contract?.overtimeRates?.nightUntil22 || 1.25) }
    ];
    
    console.log('🔧 FASCE ORARIE: Usando', customTimeSlots.length > 0 ? 'PERSONALIZZATE' : 'DEFAULT', {
      customSlotsFound: customTimeSlots.length,
      totalSlots: TIME_SLOTS.length,
      startTime,
      endTime,
      customSlots: customTimeSlots
    });
    
    // Applica maggiorazioni festive/domenicali se necessario
    const holidayMultiplier = isHoliday || isSunday ? (contract?.overtimeRates?.holiday || 1.3) : 1.0;
    
    let totalEarnings = 0;
    let totalHours = 0;
    
    // Calcola le intersezioni con ogni fascia oraria
    for (const slot of TIME_SLOTS) {
      let slotStart = slot.start;
      let slotEnd = slot.end;
      
      // Per le fasce che attraversano la mezzanotte, calcola anche il giorno successivo
      const slotsToCheck = [{ start: slotStart, end: slotEnd }];
      
      // Se il lavoro attraversa la mezzanotte, aggiungi le fasce del giorno successivo
      if (endMinutes > 24 * 60) {
        slotsToCheck.push({ start: slotStart + 24 * 60, end: slotEnd + 24 * 60 });
      }
      
      for (const currentSlot of slotsToCheck) {
        // Calcola l'intersezione
        const intersectionStart = Math.max(startMinutes, currentSlot.start);
        const intersectionEnd = Math.min(endMinutes, currentSlot.end);
        
        if (intersectionStart < intersectionEnd) {
          const slotMinutes = intersectionEnd - intersectionStart;
          const slotHours = slotMinutes / 60;
          
          // Applica maggiorazione festiva se necessario
          const finalMultiplier = Math.max(slot.multiplier, holidayMultiplier);
          
          const slotEarnings = slotHours * baseRate * finalMultiplier;
          
          timeSlots.push({
            name: slot.name,
            hours: slotHours,
            rate: baseRate * finalMultiplier,
            earnings: slotEarnings,
            multiplier: finalMultiplier,
            period: `${Math.floor(intersectionStart / 60).toString().padStart(2, '0')}:${(intersectionStart % 60).toString().padStart(2, '0')}-${Math.floor(intersectionEnd / 60).toString().padStart(2, '0')}:${(intersectionEnd % 60).toString().padStart(2, '0')}`
          });
          
          totalEarnings += slotEarnings;
          totalHours += slotHours;
        }
      }
    }
    
    return {
      timeSlots,
      totalHours,
      totalEarnings,
      averageRate: totalHours > 0 ? totalEarnings / totalHours : baseRate
    };
  }

  // Calcola straordinario con fasce orarie per metodo CCNL
  async calculateOvertimeWithTimeSlots(workEntry, overtimeHours, baseRate, contract, isSpecialDay = false) {
    console.log('📊 Calcolo straordinario CCNL con fasce orarie');
    
    const overtimeDetails = {
      total: 0,
      dayTimeOvertime: 0,
      eveningOvertime: 0,
      nightOvertime: 0,
      details: []
    };

    // Per il metodo CCNL, applichiamo le maggiorazioni standard
    // Straordinario diurno: +20%
    // Straordinario serale (20:00-22:00): +25%  
    // Straordinario notturno (22:00-06:00): +35%
    
    if (isSpecialDay) {
      // Nei giorni festivi, tutto lo straordinario ha maggiorazione del +35%
      overtimeDetails.total = overtimeHours * baseRate * 1.35;
      overtimeDetails.nightOvertime = overtimeHours;
      overtimeDetails.details.push({
        type: 'Festivo/Domenica',
        hours: overtimeHours,
        rate: baseRate * 1.35,
        amount: overtimeDetails.total
      });
    } else {
      // Per i giorni feriali, usa le maggiorazioni standard
      // Semplificazione: considera tutto come straordinario diurno +20%
      // In una versione più avanzata, si potrebbe analizzare gli orari effettivi
      overtimeDetails.total = overtimeHours * baseRate * 1.20;
      overtimeDetails.dayTimeOvertime = overtimeHours;
      overtimeDetails.details.push({
        type: 'Straordinario diurno',
        hours: overtimeHours,
        rate: baseRate * 1.20,
        amount: overtimeDetails.total
      });
    }

    console.log('📊 Dettaglio straordinario CCNL:', overtimeDetails);
    return overtimeDetails;
  }

  // Converte i risultati del nuovo sistema nel formato legacy per compatibilità
  async convertToLegacyFormat(earningsCalculation, workEntry, settings) {
    console.log('🔄 Convertendo risultato nuovo sistema in formato legacy');
    
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    const standbyWorkHours = this.calculateStandbyWorkHours(workEntry);
    const standbyTravelHours = this.calculateStandbyTravelHours(workEntry);

    // Determina se il giorno è festivo o domenica
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isHoliday = isItalianHoliday(workEntry.date);
    const isSpecialDay = isSaturday || isSunday || isHoliday;

    // Calcola le indennità (mantiene la logica legacy)
    const allowances = await this.calculateAllowances(workEntry, settings, workHours, travelHours, standbyWorkHours);

    // Costruisce il risultato nel formato legacy atteso dal sistema
    const legacyResult = {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(workHours, 8),
          viaggio_giornaliera: Math.min(travelHours, Math.max(0, 8 - workHours)),
          lavoro_extra: Math.max(0, workHours - 8),
          viaggio_extra: Math.max(0, travelHours - Math.max(0, 8 - workHours))
        },
        earnings: {
          giornaliera: earningsCalculation.regularPay || 0,
          viaggio_extra: earningsCalculation.travelPay || 0,
          lavoro_extra: earningsCalculation.overtimePay || 0
        },
        total: earningsCalculation.total || 0
      },
      standby: null, // Sarà calcolato separatamente se necessario
      allowances: allowances,
      totalEarnings: (earningsCalculation.total || 0) + (allowances.travel || 0) + (allowances.meal || 0) + (allowances.standby || 0),
      details: {
        isSaturday,
        isSunday,
        isHoliday,
        isSpecialDay,
        calculationMethod: earningsCalculation.details?.method || 'NEW_SYSTEM',
        useAdvancedHourlyRates: true,
        workHours,
        travelHours,
        standbyWorkHours,
        standbyTravelHours,
        originalEarningsCalculation: earningsCalculation
      },
      // Campi per compatibilità
      regularHours: Math.min(workHours + travelHours, 8),
      overtimeHours: Math.max(0, workHours + travelHours - 8),
      regularPay: earningsCalculation.regularPay || 0,
      overtimePay: earningsCalculation.overtimePay || 0,
      travelPay: earningsCalculation.travelPay || 0,
      total: earningsCalculation.total || 0
    };

    console.log('✅ Conversione completata:', {
      newSystemTotal: earningsCalculation.total,
      legacyFormatTotal: legacyResult.totalEarnings,
      method: earningsCalculation.details?.method
    });

    return legacyResult;
  }

  // Calcola le indennità usando la logica legacy (per compatibilità)
  async calculateAllowances(workEntry, settings, workHours, travelHours, standbyWorkHours) {
    const allowances = {
      travel: 0,
      meal: 0,
      standby: 0
    };

    // Calcola indennità trasferta (logica semplificata)
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    
    if (travelAllowanceEnabled && travelAllowanceAmount > 0 && workEntry.travelAllowance) {
      allowances.travel = travelAllowanceAmount * (workEntry.travelAllowancePercent || 1.0);
    }

    // Calcola rimborsi pasti (logica semplificata)
    if (workEntry.mealLunchCash > 0) {
      allowances.meal += workEntry.mealLunchCash;
    } else if (workEntry.mealLunchVoucher === 1) {
      allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
      allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
    }
    
    if (workEntry.mealDinnerCash > 0) {
      allowances.meal += workEntry.mealDinnerCash;
    } else if (workEntry.mealDinnerVoucher === 1) {
      allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
      allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
    }

    // Indennità reperibilità (logica semplificata)
    const standbySettings = settings.standbySettings || {};
    if (standbySettings.enabled && workEntry.isStandbyDay) {
      allowances.standby = parseFloat(standbySettings.dailyAllowance) || 0;
    }

    return allowances;
  }

  // 🕐 METODI PER SISTEMA MULTI-FASCIA
  
  /**
   * Verifica se il sistema multi-fascia è attivo
   */
  async isHourlyRatesActive() {
    try {
      return await HourlyRatesService.isHourlyRatesEnabled();
    } catch (error) {
      console.error('❌ Errore verifica sistema multi-fascia:', error);
      return false;
    }
  }

  /**
   * Calcola con metodo tariffa giornaliera + maggiorazioni CCNL (come impostato dall'utente)
   * Conforme CCNL: per giorni feriali, tariffa giornaliera per prime 8h + supplementi per fasce + straordinari
   */
  calculateDailyRateWithSupplements(workEntry, settings, workHours, travelHours) {
    const contract = settings.contract || this.defaultContract;
    const dailyRate = this.getEffectiveDailyRateFromContract(contract);
    const baseRate = contract.hourlyRate || 16.41;
    const standardWorkDay = getWorkDayHours();
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const travelHoursSetting = settings.travelHoursSetting || 'TRAVEL_RATE_EXCESS';
    const multiShiftTravelAsWork = settings.multiShiftTravelAsWork === true;
    
    const date = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSaturday = date.getDay() === 6;
    const isSunday = date.getDay() === 0;
    const isHoliday = isItalianHoliday(date);
    const isWeekday = !isSaturday && !isSunday && !isHoliday;
    
    // 🔄 MULTI-CANTIERE: spostamenti tra cantieri = ore lavoro
    // Solo il primo viaggio (azienda → primo cantiere) e l'ultimo (ultimo cantiere → azienda) restano viaggio
    let effectiveWorkHours = workHours;
    let effectiveTravelHours = travelHours;
    if (multiShiftTravelAsWork) {
      const typedTravel = this.timeCalculator.calculateTravelHoursWithTypes(workEntry);
      const externalTravelHours = typedTravel?.external || 0;
      const internalTravelHours = typedTravel?.internal || 0;

      effectiveWorkHours = workHours + internalTravelHours;
      effectiveTravelHours = externalTravelHours;

      console.log(`[CalculationService] 🔄 Multi-cantiere attivo (viaggi interni = lavoro)`, {
        originalWorkHours: workHours,
        originalTravelHours: travelHours,
        internalTravelAsWork: internalTravelHours,
        effectiveWorkHours,
        effectiveTravelHours
      });
    }

    const totalHours = effectiveWorkHours + effectiveTravelHours;
    let regularHours = Math.min(totalHours, standardWorkDay);
    let extraHours = Math.max(0, totalHours - standardWorkDay);

    console.log(`[CalculationService] 🐛 DEBUG Straordinari - totalHours: ${totalHours}, standardWorkDay: ${standardWorkDay}, extraHours iniziali: ${extraHours}`);

    // Calcolo compensazione viaggio secondo impostazione
    let travelEarnings = 0;
    let travelBreakdown = [];
    let travelExtraHours = 0; // Ore viaggio eccedenti che saranno pagate come viaggio
    
    if (effectiveTravelHours > 0) {
      if (travelHoursSetting === 'TRAVEL_RATE_EXCESS') {
        // Solo le ore viaggio eccedenti la giornata standard
        travelExtraHours = Math.max(0, effectiveTravelHours - Math.max(0, standardWorkDay - effectiveWorkHours));
        if (travelExtraHours > 0) {
          travelEarnings = travelExtraHours * baseRate * travelCompensationRate;
          travelBreakdown.push({
            type: 'Viaggio (eccedenza)',
            hours: travelExtraHours,
            rate: travelCompensationRate,
            hourlyRate: baseRate * travelCompensationRate,
            amount: travelEarnings
          });
          
          // CORREZIONE: Sottrai le ore viaggio eccedenti dagli straordinari
          // perché sono già pagate come compenso viaggio
          extraHours = Math.max(0, extraHours - travelExtraHours);
          console.log(`[CalculationService] 🚨 CORREZIONE TRAVEL_RATE_EXCESS: ${travelExtraHours}h viaggio eccedente già pagato come viaggio, extraHours ridotto a: ${extraHours}h`);
        }
      } else if (travelHoursSetting === 'TRAVEL_RATE_ALL') {
        // Tutte le ore viaggio
        travelEarnings = effectiveTravelHours * baseRate * travelCompensationRate;
        travelBreakdown.push({
          type: 'Viaggio (tutte le ore)',
          hours: effectiveTravelHours,
          rate: travelCompensationRate,
          hourlyRate: baseRate * travelCompensationRate,
          amount: travelEarnings
        });
        
        // CORREZIONE: Se paghiamo tutto il viaggio, escludiamo tutto dalle ore straordinarie
        extraHours = Math.max(0, extraHours - effectiveTravelHours);
        console.log(`[CalculationService] 🚨 CORREZIONE TRAVEL_RATE_ALL: ${effectiveTravelHours}h viaggio già pagato come viaggio, extraHours ridotto a: ${extraHours}h`);
      } else if (travelHoursSetting === 'OVERTIME_EXCESS') {
        // Eccedenza viaggio come straordinario
        // (già gestito sotto come extraHours)
        travelEarnings = 0;
        console.log(`[CalculationService] ✅ OVERTIME_EXCESS: Viaggio eccedente sarà pagato come straordinario`);
      } else {
        // Default: nessuna compensazione separata
        travelEarnings = 0;
      }
    }
    
    console.log(`[CalculationService] 📊 Calcolo DAILY_RATE_WITH_SUPPLEMENTS: ${regularHours}h base + ${extraHours}h extra (feriale: ${isWeekday})`);
    
    let ordinaryEarnings = 0;
    let supplementEarnings = 0; // Supplementi per fasce diverse nelle prime 8h
    let extraEarningsBreakdown = [];
    let totalExtraEarnings = 0;
    let regularBreakdown = [];
    
    // SOLO per giorni feriali: tariffa giornaliera + supplementi per fasce
    if (isWeekday && regularHours > 0) {
      // Base: tariffa giornaliera per prime 8 ore
      ordinaryEarnings = dailyRate;
      
      // Analizza se le prime 8 ore cadono in fasce serali/notturne
      const regularPeriods = this.extractRegularWorkPeriods(workEntry, regularHours);
      
      for (const period of regularPeriods) {
        const startMinutes = this.parseTime(period.startTime);
        const endMinutes = this.parseTime(period.endTime);
        const hours = period.hours;
        
        // Calcola quanto tempo cade in ciascuna fascia
        const timeSlotAnalysis = this.analyzeTimeSlotForPeriod(startMinutes, endMinutes);
        
        let totalSupplement = 0;
        const periodBreakdown = [];
        
        // Calcola supplementi per fascia serale (20:00-22:00, +25%)
        if (timeSlotAnalysis.eveningHours > 0) {
          const eveningSupplement = timeSlotAnalysis.eveningHours * baseRate * 0.25;
          totalSupplement += eveningSupplement;
          periodBreakdown.push({
            type: 'Serale',
            hours: timeSlotAnalysis.eveningHours,
            rate: 0.25,
            amount: eveningSupplement
          });
          console.log(`[CalculationService] 📊 Supplemento serale: ${timeSlotAnalysis.eveningHours}h × €${baseRate.toFixed(2)} × 0.25 = €${eveningSupplement.toFixed(2)}`);
        }
        
        // Calcola supplementi per fascia notturna (22:00-06:00, +35%)
        if (timeSlotAnalysis.nightHours > 0) {
          const nightSupplement = timeSlotAnalysis.nightHours * baseRate * 0.35;
          totalSupplement += nightSupplement;
          periodBreakdown.push({
            type: 'Notturno',
            hours: timeSlotAnalysis.nightHours,
            rate: 0.35,
            amount: nightSupplement
          });
          console.log(`[CalculationService] 📊 Supplemento notturno: ${timeSlotAnalysis.nightHours}h × €${baseRate.toFixed(2)} × 0.35 = €${nightSupplement.toFixed(2)}`);
        }
        
        // Ore diurne (nessun supplemento)
        if (timeSlotAnalysis.dayHours > 0) {
          periodBreakdown.push({
            type: 'Diurno',
            hours: timeSlotAnalysis.dayHours,
            rate: 0,
            amount: 0
          });
          console.log(`[CalculationService] 📊 Ore diurne: ${timeSlotAnalysis.dayHours}h (nessun supplemento)`);
        }
        
        supplementEarnings += totalSupplement;
        
        // Aggiungi al breakdown dettagliato
        if (periodBreakdown.length > 0) {
          regularBreakdown.push({
            timeRange: `${period.startTime}-${period.endTime}`,
            totalHours: hours,
            breakdown: periodBreakdown,
            totalSupplement: totalSupplement
          });
        }
      }
      
      console.log(`[CalculationService] 📊 Tariffa giornaliera: €${dailyRate.toFixed(2)} + supplementi: €${supplementEarnings.toFixed(2)}`);
    } 
    
    // Per giorni NON feriali o se non ci sono ore regolari
    else if (regularHours > 0) {
      // Usa calcolo orario standard con maggiorazioni per giorni speciali
      let specialDayRate = 1.3; // Default festivo +30%
      if (isSaturday) {
        specialDayRate = contract.overtimeRates?.saturday || 1.25; // Sabato +25%
      }
      
      ordinaryEarnings = regularHours * baseRate * specialDayRate;
      console.log(`[CalculationService] 📊 Giorno speciale: ${regularHours}h × €${baseRate.toFixed(2)} × ${specialDayRate} = €${ordinaryEarnings.toFixed(2)}`);
    }
    
    // Straordinari: sempre con maggiorazioni CCNL
    let totalOvertimeHours = 0; // Inizializza sempre la variabile
    if (extraHours > 0) {
      console.log(`[CalculationService] 🐛 DEBUG - Inizio calcolo straordinari, extraHours: ${extraHours}`);
      const overtimePeriods = this.extractOvertimePeriods(workEntry, standardWorkDay, settings);
      console.log(`[CalculationService] 🐛 DEBUG - overtimePeriods trovati:`, overtimePeriods);
      console.log(`[CalculationService] 🐛 DEBUG - overtimePeriods.length:`, overtimePeriods.length);
      console.log(`[CalculationService] 🐛 DEBUG - workEntry completo:`, {
        workStart1: workEntry.workStart1,
        workEnd1: workEntry.workEnd1,
        workStart2: workEntry.workStart2,
        workEnd2: workEntry.workEnd2,
        departureCompany: workEntry.departureCompany,
        arrivalSite: workEntry.arrivalSite,
        departureReturn: workEntry.departureReturn,
        arrivalCompany: workEntry.arrivalCompany
      });
      
      // CORREZIONE: Se non troviamo periodi ma abbiamo ore straordinarie, creiamo i periodi mancanti
      // SOLO se il totale giornaliero supera le 8 ore E non siamo in multi-cantiere
      // (Il multi-cantiere ha logica complessa che spesso confonde la distribuzione)
      const totalDailyHours = effectiveWorkHours + effectiveTravelHours;
      let viaggiArrayForFlags = workEntry.viaggi;
      if (typeof viaggiArrayForFlags === 'string') {
        try {
          viaggiArrayForFlags = JSON.parse(viaggiArrayForFlags);
        } catch (e) {
          viaggiArrayForFlags = null;
        }
      }
      const hasMultipleShifts = Array.isArray(viaggiArrayForFlags) && viaggiArrayForFlags.length > 0;
      
      if (overtimePeriods.length === 0 && totalDailyHours > 8 && !hasMultipleShifts) {
        console.log(`[CalculationService] ⚠️ CORREZIONE: Nessun periodo trovato ma ${totalDailyHours}h > 8h (no multi-cantiere), creo periodo straordinario artificiale`);
        // Crea un periodo straordinario artificiale usando il primo turno di lavoro
        if (workEntry.workStart1 && workEntry.workEnd1) {
          const workDuration = this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1) / 60;
          overtimePeriods.push({
            type: 'work',
            startTime: workEntry.workStart1,
            endTime: workEntry.workEnd1,
            duration: workDuration,
            hours: extraHours // Usa le ore straordinarie calcolate
          });
          console.log(`[CalculationService] ⚠️ CORREZIONE: Creato periodo artificiale: ${workEntry.workStart1}-${workEntry.workEnd1} (${extraHours}h straordinarie)`);
        }
      } else if (overtimePeriods.length === 0 && totalDailyHours <= 8) {
        console.log(`[CalculationService] ✅ NESSUNA CORREZIONE: ${totalDailyHours}h <= 8h, nessun straordinario da creare`);
      } else if (overtimePeriods.length === 0 && hasMultipleShifts) {
        console.log(`[CalculationService] ✅ NESSUNA CORREZIONE: Multi-cantiere rilevato, salto la correzione artificiale per evitare calcoli errati`);
      }
      
      // Sistema complesso di fasce orarie (ora dovrebbe funzionare)
      for (const period of overtimePeriods) {
        console.log(`[CalculationService] 🐛 DEBUG - Processando periodo:`, period);
        const startMinutes = this.parseTime(period.startTime);
        const endMinutes = this.parseTime(period.endTime);
        const hours = period.hours;

        console.log(`[CalculationService] 🐛 DEBUG - startMinutes: ${startMinutes}, endMinutes: ${endMinutes}, hours: ${hours}`);

        // Analizza quanto tempo cade in ciascuna fascia
        const timeSlotAnalysis = this.analyzeTimeSlotForPeriod(startMinutes, endMinutes);
        console.log(`[CalculationService] 🐛 DEBUG - timeSlotAnalysis:`, timeSlotAnalysis);
        let periodBreakdown = [];
        let totalPeriodEarnings = 0;

        // Diurno (06:00-20:00): maggiorazione da contratto
        if (timeSlotAnalysis.dayHours > 0) {
          const rate = contract.overtimeRates?.day ?? 1.2;
          const percent = `+${Math.round((rate-1)*100)}%`;
          const earnings = timeSlotAnalysis.dayHours * baseRate * rate;
          totalPeriodEarnings += earnings;
          periodBreakdown.push({
            type: 'Straordinario diurno',
            hours: timeSlotAnalysis.dayHours,
            rate: rate,
            percent: percent,
            amount: earnings
          });
          totalOvertimeHours += timeSlotAnalysis.dayHours;
        }
        // Straordinario serale (20:00-22:00): maggiorazione personalizzata
        if (timeSlotAnalysis.eveningHours > 0) {
          const rate = contract.overtimeRates?.overtimeNightUntil22 ?? contract.overtimeRates?.nightUntil22 ?? 1.25;
          const percent = `+${Math.round((rate-1)*100)}%`;
          const earnings = timeSlotAnalysis.eveningHours * baseRate * rate;
          totalPeriodEarnings += earnings;
          periodBreakdown.push({
            type: 'Straordinario serale (20:00-22:00)',
            hours: timeSlotAnalysis.eveningHours,
            rate: rate,
            percent: percent,
            amount: earnings
          });
          totalOvertimeHours += timeSlotAnalysis.eveningHours;
        }
        // Straordinario notturno (22:00-06:00): maggiorazione personalizzata
        if (timeSlotAnalysis.nightHours > 0) {
          const rate = contract.overtimeRates?.overtimeNightAfter22 ?? contract.overtimeRates?.nightAfter22 ?? 1.35;
          const percent = `+${Math.round((rate-1)*100)}%`;
          const earnings = timeSlotAnalysis.nightHours * baseRate * rate;
          totalPeriodEarnings += earnings;
          periodBreakdown.push({
            type: 'Straordinario notturno (dopo le 22)',
            hours: timeSlotAnalysis.nightHours,
            rate: rate,
            percent: percent,
            amount: earnings
          });
          totalOvertimeHours += timeSlotAnalysis.nightHours;
        }

        // Maggiorazioni aggiuntive per giorni speciali
        let periodType = 'Straordinario';
        let specialRate = 1.0;
        if (isSaturday) {
          specialRate = contract.overtimeRates?.saturday || 1.25;
          periodType += ' (Sabato)';
        } else if (isSunday || isHoliday) {
          specialRate = contract.overtimeRates?.holiday || 1.3;
          periodType += isSunday ? ' (Domenica)' : ' (Festivo)';
        }
        if (specialRate > 1.0) {
          // Se la maggiorazione festiva/sabato è superiore, applica a tutte le fasce
          periodBreakdown = periodBreakdown.map(b => {
            const newRate = Math.max(b.rate, specialRate);
            const newAmount = b.hours * baseRate * newRate;
            totalPeriodEarnings += (newAmount - b.amount);
            return { ...b, rate: newRate, amount: newAmount, percent: `+${Math.round((newRate-1)*100)}%` };
          });
        }

        totalExtraEarnings += totalPeriodEarnings;
        extraEarningsBreakdown.push({
          period: `${periodType}`,
          timeRange: `${period.startTime}-${period.endTime}`,
          breakdown: periodBreakdown,
          totalEarnings: totalPeriodEarnings
        });

        console.log(`[CalculationService] 📊 Straordinario ${periodType}: ${hours}h breakdown`, periodBreakdown);
      }
      // Imposta il totale ore straordinarie come somma di tutte le fasce
      // CORREZIONE: Non forzare totalOvertimeHours se le ore extra sono solo viaggio
      console.log(`[CalculationService] 🐛 DEBUG - Prima del fallback: totalOvertimeHours: ${totalOvertimeHours}, extraHours: ${extraHours}`);
      
      // LOGICA INTELLIGENTE: Solo se ci sono effettivamente periodi straordinari di LAVORO
      // Non applicare fallback se le ore extra sono solo dovute al viaggio
      if (totalOvertimeHours === 0 && extraHours > 0 && overtimePeriods.length === 0) {
        // Verifica se le ore extra sono dovute principalmente al viaggio
        const isExtraFromTravel = effectiveWorkHours <= standardWorkDay;
        
        if (!isExtraFromTravel) {
          console.log(`[CalculationService] ⚠️ CORREZIONE FINALE: Ore extra da lavoro effettivo, forzo totalOvertimeHours da 0 a ${extraHours}`);
          totalOvertimeHours = extraHours;
          // Aggiungi anche un breakdown semplificato per il fallback
          if (extraEarningsBreakdown.length === 0) {
            const rate = isSaturday ? (contract.overtimeRates?.saturday || 1.25) : 
                        (isSunday || isHoliday) ? (contract.overtimeRates?.holiday || 1.3) : 
                        (contract.overtimeRates?.day || 1.2);
            const earnings = extraHours * baseRate * rate;
            totalExtraEarnings = earnings;
            extraEarningsBreakdown.push({
              period: `Straordinario${isSaturday ? ' (Sabato)' : (isSunday || isHoliday) ? ' (Festivo)' : ' (Feriale)'}`,
              timeRange: 'Oltre 8h',
              breakdown: [{
                type: 'Straordinario',
                hours: extraHours,
                rate: rate,
                percent: `+${Math.round((rate-1)*100)}%`,
                amount: earnings
              }],
              totalEarnings: earnings
            });
            console.log(`[CalculationService] ⚠️ FALLBACK: Aggiunto breakdown semplificato - ${extraHours}h × €${baseRate.toFixed(2)} × ${rate} = €${earnings.toFixed(2)}`);
          }
        } else {
          console.log(`[CalculationService] ✅ NESSUN FALLBACK: Ore extra (${extraHours}h) dovute al viaggio, totalOvertimeHours rimane 0`);
        }
      }
      
      if (totalOvertimeHours === 0 && extraHours > 0 && overtimePeriods.length > 0) {
        console.log(`[CalculationService] ⚠️ FALLBACK: totalOvertimeHours era 0 ma ci sono periodi, usando extraHours: ${extraHours}`);
        totalOvertimeHours = extraHours;
      }
      extraHours = Math.round(totalOvertimeHours * 100) / 100;
      console.log(`[CalculationService] 🐛 DEBUG - Risultato finale: extraHours: ${extraHours}, totalExtraEarnings: ${totalExtraEarnings}`);
    }
    
    const totalEarnings = ordinaryEarnings + supplementEarnings + totalExtraEarnings + travelEarnings;

    // Funzione di normalizzazione breakdown
    const normalizeArray = arr => Array.isArray(arr)
      ? arr.map(item => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return { ...item };
          } else if (Array.isArray(item)) {
            // Se è un array annidato, prendi il primo oggetto plain
            return item.find(x => x && typeof x === 'object' && !Array.isArray(x)) || {};
          }
          return {};
        })
      : [];

    // DEBUG LOG per verificare cosa viene restituito
    console.log(`[CalculationService] 🚀 FINAL RETURN - breakdown.overtimeHours: ${totalOvertimeHours} (era ${extraHours})`);
    console.log(`[CalculationService] 🚀 FINAL RETURN - Full breakdown:`, JSON.stringify({
      overtimeHours: totalOvertimeHours,
      totalOvertimeEarnings: totalExtraEarnings,
      overtimeBreakdown: normalizeArray(extraEarningsBreakdown)
    }, null, 2));

    return {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(effectiveWorkHours, standardWorkDay),
          viaggio_giornaliera: Math.min(effectiveTravelHours, Math.max(0, standardWorkDay - effectiveWorkHours)),
          lavoro_extra: Math.max(0, effectiveWorkHours - standardWorkDay),
          viaggio_extra: Math.max(0, effectiveTravelHours - Math.max(0, standardWorkDay - effectiveWorkHours))
        },
        earnings: {
          giornaliera: ordinaryEarnings + supplementEarnings,
          viaggio_extra: travelEarnings,
          lavoro_extra: totalExtraEarnings
        },
        total: totalEarnings
      },
      breakdown: {
        dailyRate: ordinaryEarnings,
        supplements: supplementEarnings,
        regularBreakdown: normalizeArray(regularBreakdown),
        overtimeHours: totalOvertimeHours,
        overtimeBreakdown: normalizeArray(extraEarningsBreakdown),
        travelBreakdown: normalizeArray(travelBreakdown),
        travelEarnings: travelEarnings,
        totalOvertimeEarnings: totalExtraEarnings,
        totalEarnings: totalEarnings,
        method: 'DAILY_RATE_WITH_SUPPLEMENTS',
        isWeekday: isWeekday
      }
    };
  }

  /**
   * Estrae i periodi di lavoro regolare (prime 8 ore) per analisi fasce
   */
  extractRegularWorkPeriods(workEntry, regularHours) {
    const periods = [];
    
    console.log(`[CalculationService] 📊 DEBUG extractRegularWorkPeriods: regularHours=${regularHours}, workStart1=${workEntry.workStart1}, workEnd1=${workEntry.workEnd1}, workStart2=${workEntry.workStart2}, workEnd2=${workEntry.workEnd2}`);
    
    let remainingHours = regularHours;
    
    // Primo turno
    if (workEntry.workStart1 && workEntry.workEnd1 && remainingHours > 0) {
      const shift1DurationMinutes = this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
      const shift1Duration = shift1DurationMinutes / 60; // Converti in ore
      const hoursFromShift1 = Math.min(shift1Duration, remainingHours);
      
      if (hoursFromShift1 > 0) {
        const endTime = this.addHoursToTime(workEntry.workStart1, hoursFromShift1);
        periods.push({
          startTime: workEntry.workStart1,
          endTime: endTime,
          hours: hoursFromShift1
        });
        remainingHours -= hoursFromShift1;
        console.log(`[CalculationService] 📊 Primo turno regolare: ${workEntry.workStart1}-${endTime} (${hoursFromShift1}h)`);
      }
    }
    
    // Secondo turno (se necessario)
    if (workEntry.workStart2 && workEntry.workEnd2 && remainingHours > 0) {
      const shift2DurationMinutes = this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
      const shift2Duration = shift2DurationMinutes / 60; // Converti in ore
      const hoursFromShift2 = Math.min(shift2Duration, remainingHours);
      
      if (hoursFromShift2 > 0) {
        const endTime = this.addHoursToTime(workEntry.workStart2, hoursFromShift2);
        periods.push({
          startTime: workEntry.workStart2,
          endTime: endTime,
          hours: hoursFromShift2
        });
        remainingHours -= hoursFromShift2;
        console.log(`[CalculationService] 📊 Secondo turno regolare: ${workEntry.workStart2}-${endTime} (${hoursFromShift2}h)`);
      }
    }
    
    return periods;
  }

  /**
   * Estrae i periodi di straordinario dall'entry di lavoro
   */
  extractOvertimePeriods(workEntry, standardWorkDay, settings) {
    const periods = [];
    const multiShiftTravelAsWork = settings?.multiShiftTravelAsWork === true;
    
    // Calcola ore totali
    const workHours = this.calculateWorkHours(workEntry) || 0;
    const travelHours = this.calculateTravelHours(workEntry) || 0;
    const totalHours = workHours + travelHours;
    
    console.log(`[CalculationService] 📊 DEBUG extractOvertimePeriods: work=${workHours}h, travel=${travelHours}h, total=${totalHours}h, standard=${standardWorkDay}h`);
    
    if (totalHours <= standardWorkDay) {
      console.log(`[CalculationService] 📊 Nessuno straordinario: ${totalHours}h <= ${standardWorkDay}h`);
      return periods; // Nessuno straordinario
    }
    
    const extraHours = totalHours - standardWorkDay;
    console.log(`[CalculationService] 📊 Ore straordinarie da distribuire: ${extraHours}h`);
    
    // Estrai tutti i periodi lavorativi (turni + viaggi)
    const allWorkPeriods = [];

    // Normalizza viaggi per supportare sia array che JSON string
    let viaggiArray = workEntry.viaggi;
    if (typeof viaggiArray === 'string') {
      try {
        viaggiArray = JSON.parse(viaggiArray);
      } catch (e) {
        viaggiArray = null;
      }
    }

    // Determina quale ritorno e' esterno (ultimo della giornata)
    let lastReturnTravelSource = null;
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      lastReturnTravelSource = 'main';
    }
    if (viaggiArray && Array.isArray(viaggiArray)) {
      for (let i = viaggiArray.length - 1; i >= 0; i--) {
        const viaggio = viaggiArray[i];
        if (viaggio.departure_return && viaggio.arrival_company) {
          lastReturnTravelSource = `viaggio_${i + 1}`;
          break;
        }
      }
    }
    
    // Primo turno
    if (workEntry.workStart1 && workEntry.workEnd1) {
      const duration1 = this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1) / 60;
      allWorkPeriods.push({
        type: 'work',
        startTime: workEntry.workStart1,
        endTime: workEntry.workEnd1,
        duration: duration1
      });
    }
    
    // Secondo turno
    if (workEntry.workStart2 && workEntry.workEnd2) {
      const duration2 = this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2) / 60;
      allWorkPeriods.push({
        type: 'work',
        startTime: workEntry.workStart2,
        endTime: workEntry.workEnd2,
        duration: duration2
      });
    }
    
    // Viaggi principali
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      const travelOut = this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite) / 60;
      allWorkPeriods.push({
        type: 'travel',
        travelKind: 'external',
        startTime: workEntry.departureCompany,
        endTime: workEntry.arrivalSite,
        duration: travelOut
      });
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      const travelReturn = this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany) / 60;
      allWorkPeriods.push({
        type: 'travel',
        travelKind: lastReturnTravelSource === 'main' ? 'external' : 'internal',
        startTime: workEntry.departureReturn,
        endTime: workEntry.arrivalCompany,
        duration: travelReturn
      });
    }
    
    // Viaggi aggiuntivi
    if (viaggiArray && Array.isArray(viaggiArray)) {
      viaggiArray.forEach((viaggio, index) => {
        const vWorkStart1 = viaggio.workStart1 || viaggio.work_start_1;
        const vWorkEnd1 = viaggio.workEnd1 || viaggio.work_end_1;
        const vWorkStart2 = viaggio.workStart2 || viaggio.work_start_2;
        const vWorkEnd2 = viaggio.workEnd2 || viaggio.work_end_2;

        if (vWorkStart1 && vWorkEnd1) {
          const duration = this.calculateTimeDifference(vWorkStart1, vWorkEnd1) / 60;
          allWorkPeriods.push({
            type: 'work',
            startTime: vWorkStart1,
            endTime: vWorkEnd1,
            duration: duration
          });
        }
        
        if (vWorkStart2 && vWorkEnd2) {
          const duration = this.calculateTimeDifference(vWorkStart2, vWorkEnd2) / 60;
          allWorkPeriods.push({
            type: 'work',
            startTime: vWorkStart2,
            endTime: vWorkEnd2,
            duration: duration
          });
        }
        
        if (viaggio.departure_company && viaggio.arrival_site) {
          const duration = this.calculateTimeDifference(viaggio.departure_company, viaggio.arrival_site) / 60;
          allWorkPeriods.push({
            type: 'travel',
            travelKind: 'internal',
            startTime: viaggio.departure_company,
            endTime: viaggio.arrival_site,
            duration: duration
          });
        }
        
        if (viaggio.departure_return && viaggio.arrival_company) {
          const duration = this.calculateTimeDifference(viaggio.departure_return, viaggio.arrival_company) / 60;
          allWorkPeriods.push({
            type: 'travel',
            travelKind: lastReturnTravelSource === `viaggio_${index + 1}` ? 'external' : 'internal',
            startTime: viaggio.departure_return,
            endTime: viaggio.arrival_company,
            duration: duration
          });
        }
      });
    }
    
    // Ordina i periodi per orario di inizio, gestendo il cambio giorno
    allWorkPeriods.sort((a, b) => {
      let aMinutes = this.parseTime(a.startTime);
      let bMinutes = this.parseTime(b.startTime);
      
      // Se l'orario di fine è prima dell'orario di inizio, significa che attraversa la mezzanotte
      // Aggiungi 24 ore (1440 minuti) per posizionarlo correttamente nel giorno successivo
      if (this.parseTime(a.endTime) < this.parseTime(a.startTime)) {
        aMinutes += 24 * 60; // Sposta al giorno successivo
      }
      if (this.parseTime(b.endTime) < this.parseTime(b.startTime)) {
        bMinutes += 24 * 60; // Sposta al giorno successivo
      }
      
      return aMinutes - bMinutes;
    });
    
    console.log(`[CalculationService] 📊 Periodi di lavoro ordinati:`, allWorkPeriods);
    
    // Separa i periodi di lavoro da quelli di viaggio
    const workPeriods = allWorkPeriods.filter(p => p.type === 'work');
    const travelPeriods = allWorkPeriods.filter(p => p.type === 'travel');
    const internalTravelPeriods = allWorkPeriods.filter(p => p.type === 'travel' && p.travelKind === 'internal');
    
    console.log(`[CalculationService] � Solo periodi di LAVORO:`, workPeriods);
    console.log(`[CalculationService] 📊 Solo periodi di VIAGGIO:`, travelPeriods);
    
    // Calcola le ore cumulative per determinare quando iniziano gli straordinari
    // Determina quali periodi considerare per il calcolo straordinari
    const travelHoursSetting = settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS';
    let periodsForOvertime = [];
    
    if (travelHoursSetting === 'OVERTIME_EXCESS') {
      // Viaggio eccedente come straordinario: considera TUTTI i periodi
      periodsForOvertime = [...allWorkPeriods];
      console.log(`[CalculationService] ⚙️ OVERTIME_EXCESS: usando tutti i periodi per straordinari`);
    } else if (multiShiftTravelAsWork) {
      // Multi-cantiere: i viaggi interni sono ore lavoro ai fini straordinario
      periodsForOvertime = [...workPeriods, ...internalTravelPeriods];
      periodsForOvertime.sort((a, b) => {
        let aMinutes = this.parseTime(a.startTime);
        let bMinutes = this.parseTime(b.startTime);

        if (this.parseTime(a.endTime) < this.parseTime(a.startTime)) {
          aMinutes += 24 * 60;
        }
        if (this.parseTime(b.endTime) < this.parseTime(b.startTime)) {
          bMinutes += 24 * 60;
        }

        return aMinutes - bMinutes;
      });
      console.log(`[CalculationService] ⚙️ ${travelHoursSetting} + MULTI_CANTIERE: usando lavoro + viaggi interni per straordinari`);
    } else {
      // Solo ore di lavoro per straordinari: considera solo i periodi di lavoro
      periodsForOvertime = [...workPeriods];
      console.log(`[CalculationService] ⚙️ ${travelHoursSetting}: usando solo periodi di lavoro per straordinari`);
    }
    
    let cumulativeHours = 0;
    const standardWorkHours = standardWorkDay; // Ore standard da configurazione
    
    // Distribuisci gli straordinari sui periodi oltre le 8 ore
    let remainingOvertimeHours = extraHours;
    
    for (const period of periodsForOvertime) {
      const periodStartsAfter8Hours = cumulativeHours >= standardWorkHours;
      const periodEndsAfter8Hours = cumulativeHours + period.duration > standardWorkHours;
      
      console.log(`[CalculationService] 🔍 DEBUG - Periodo ${period.type.toUpperCase()}: ${period.startTime}-${period.endTime} (${period.duration}h), ore cumulative: ${cumulativeHours}h`);
      
      if (periodStartsAfter8Hours) {
        // Tutto questo periodo è straordinario
        const overtimeHours = Math.min(period.duration, remainingOvertimeHours);
        if (overtimeHours > 0) {
          periods.push({
            startTime: period.startTime,
            endTime: period.endTime,
            hours: overtimeHours,
            type: period.type
          });
          remainingOvertimeHours -= overtimeHours;
          console.log(`[CalculationService] 📊 Periodo completamente straordinario: ${period.startTime}-${period.endTime} (${overtimeHours}h)`);
        }
      } else if (periodEndsAfter8Hours) {
        // Solo parte di questo periodo è straordinario
        const overtimeHours = cumulativeHours + period.duration - standardWorkHours;
        const regularHoursInPeriod = period.duration - overtimeHours;
        const overtimeStartMinutes = this.parseTime(period.startTime) + (regularHoursInPeriod * 60);
        const overtimeStartTime = this.minutesToTimeString(overtimeStartMinutes);
        
        console.log(`[CalculationService] 🔍 DEBUG - Periodo parzialmente straordinario:`);
        console.log(`[CalculationService] 🔍 DEBUG - Ore regolari nel periodo: ${regularHoursInPeriod}h`);
        console.log(`[CalculationService] 🔍 DEBUG - Ore straordinarie nel periodo: ${overtimeHours}h`);
        console.log(`[CalculationService] 🔍 DEBUG - Straordinario inizia alle: ${overtimeStartTime}`);
        
        if (overtimeHours > 0) {
          periods.push({
            startTime: overtimeStartTime,
            endTime: period.endTime,
            hours: overtimeHours,
            type: period.type
          });
          remainingOvertimeHours -= overtimeHours;
          console.log(`[CalculationService] 📊 Periodo parzialmente straordinario: ${overtimeStartTime}-${period.endTime} (${overtimeHours}h)`);
        }
      }
      
      cumulativeHours += period.duration;
      
      if (remainingOvertimeHours <= 0) {
        break;
      }
    }
    
    console.log(`[CalculationService] 📊 Periodi straordinari estratti:`, periods);
    return periods;
  }

  /**
   * Analizza un periodo di lavoro per determinare quante ore cadono in ciascuna fascia oraria
   */
  analyzeTimeSlotForPeriod(startMinutes, endMinutes) {
    let dayHours = 0;      // 06:00-20:00
    let eveningHours = 0;  // 20:00-22:00
    let nightHours = 0;    // 22:00-06:00

    // Se il periodo attraversa la mezzanotte
    if (endMinutes < startMinutes) {
      // Prima parte: da start a 24:00
      const firstPartEnd = 24 * 60; // Mezzanotte
      dayHours += this.calculateHoursInSlot(startMinutes, firstPartEnd, 6 * 60, 20 * 60);
      eveningHours += this.calculateHoursInSlot(startMinutes, firstPartEnd, 20 * 60, 22 * 60);
      nightHours += this.calculateHoursInSlot(startMinutes, firstPartEnd, 22 * 60, 24 * 60);

      // Seconda parte: da 00:00 a end
      dayHours += this.calculateHoursInSlot(0, endMinutes, 6 * 60, 20 * 60);
      eveningHours += this.calculateHoursInSlot(0, endMinutes, 20 * 60, 22 * 60);
      nightHours += this.calculateHoursInSlot(0, endMinutes, 0, 6 * 60);
    } else {
      // Periodo normale nella stessa giornata
      dayHours = this.calculateHoursInSlot(startMinutes, endMinutes, 6 * 60, 20 * 60);
      eveningHours = this.calculateHoursInSlot(startMinutes, endMinutes, 20 * 60, 22 * 60);
      nightHours = this.calculateHoursInSlot(startMinutes, endMinutes, 22 * 60, 24 * 60);

      // Aggiungi ore notturne mattutine (00:00-06:00) se applicabile
      if (startMinutes < 6 * 60 || endMinutes <= 6 * 60) {
        nightHours += this.calculateHoursInSlot(startMinutes, endMinutes, 0, 6 * 60);
      }
    }

    // Arrotonda a due decimali ed evita NaN
    dayHours = Number.isFinite(dayHours) ? Math.max(0, Math.round(dayHours * 100) / 100) : 0;
    eveningHours = Number.isFinite(eveningHours) ? Math.max(0, Math.round(eveningHours * 100) / 100) : 0;
    nightHours = Number.isFinite(nightHours) ? Math.max(0, Math.round(nightHours * 100) / 100) : 0;

    return {
      dayHours,
      eveningHours,
      nightHours
    };
  }

  /**
   * Calcola quante ore di un periodo di lavoro cadono in una specifica fascia oraria
   */
  calculateHoursInSlot(workStart, workEnd, slotStart, slotEnd) {
    const overlapStart = Math.max(workStart, slotStart);
    const overlapEnd = Math.min(workEnd, slotEnd);
    const overlapMinutes = Math.max(0, overlapEnd - overlapStart);
    return overlapMinutes / 60; // Converti in ore
  }

  /**
   * Verifica se un orario è considerato notturno (22:00-06:00)
   */
  isNightTime(startMinutes, endMinutes) {
    // 22:00 = 1320 minuti, 06:00 = 360 minuti
    return (startMinutes >= 1320 || endMinutes <= 360);
  }

  /**
   * Verifica se un orario è considerato serale (20:00-22:00)
   */
  isEveningTime(startMinutes, endMinutes) {
    // 20:00 = 1200 minuti, 22:00 = 1320 minuti
    return (startMinutes >= 1200 && startMinutes < 1320);
  }

  /**
   * Converte minuti in stringa orario
   */
  minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Calcola il breakdown usando il sistema multi-fascia
   */
  async calculateHourlyRatesBreakdown(workEntry, settings, workHours, travelHours, isSpecialDay = false, baseDayMultiplier = 1.0) {
    try {
      const contract = settings.contract || this.defaultContract;
      const baseRate = contract.hourlyRate || 16.41;
      const standardWorkDay = getWorkDayHours();
      
      // Determina se è un giorno speciale per passare alle fasce orarie
      const date = workEntry.date ? new Date(workEntry.date) : new Date();
      const isSaturday = date.getDay() === 6;
      const isSunday = date.getDay() === 0;
      const isHoliday = isItalianHoliday(date);
      const isActualSpecialDay = isSpecialDay || isSaturday || isSunday || isHoliday;
      
      console.log(`[CalculationService] 🎯 calculateHourlyRatesBreakdown - DEBUG giorno speciale:`, {
        date: workEntry.date,
        dayOfWeek: date.getDay(),
        isSaturday, isSunday, isHoliday, 
        isSpecialDay, isActualSpecialDay,
        baseDayMultiplier
      });
      
      // Prepara gli orari di lavoro per il calcolo multi-fascia
      const workPeriods = this.extractWorkPeriods(workEntry);
      
      // Usa solo i periodi di lavoro effettivi, non i viaggi
      let allPeriods = [...workPeriods];
      
      let totalBreakdown = {
        totalHours: 0,
        totalEarnings: 0,
        breakdown: []
      };
      
      // Calcola ogni periodo separatamente
      for (const period of allPeriods) {
        if (period.startTime && period.endTime) {
          let periodCalculation;
          
          // 🔥 CCNL: Per giorni speciali, usa il nuovo metodo con bonus cumulativi
          if (isActualSpecialDay) {
            console.log(`[CalculationService] 🔥 CHIAMATA CCNL per periodo ${period.type}: ${period.startTime}-${period.endTime}, dayMultiplier: ${baseDayMultiplier}`);
            
            // Determina il tipo di giorno per il bonus CCNL
            const dayType = isHoliday ? 'HOLIDAY' : isSunday ? 'SUNDAY' : 'SATURDAY';
            
            // Ottieni le fasce orarie dalle impostazioni
            const hourlySettings = await HourlyRatesService.getSettings();
            const timeSlots = hourlySettings.timeSlots || [];
            
            console.log(`[CalculationService] 🔥 DEBUG CCNL chiamata con parametri corretti:`, {
              startTime: period.startTime,
              endTime: period.endTime,
              workDate: date,
              baseHourlyRate: baseRate,
              timeSlots: timeSlots.length,
              dayMultiplier: baseDayMultiplier,
              dayType: dayType
            });
            
            periodCalculation = await HourlyRatesService.calculateTimeSlotRatesWithDayBonus(
              period.startTime,
              period.endTime,
              date,                    // workDate
              baseRate,               // baseHourlyRate (16.57)
              timeSlots,              // timeSlots array
              baseDayMultiplier,      // dayMultiplier (1.3)
              dayType                 // dayType ("SUNDAY")
            );
            
            console.log(`[CalculationService] 🔥 RISULTATO CCNL per ${dayType}:`, {
              totalHours: periodCalculation.totalHours,
              totalEarnings: periodCalculation.totalEarnings,
              method: 'CCNL_CUMULATIVE'
            });
          } else {
            // Giorni feriali: usa metodo tradizionale
            periodCalculation = await HourlyRatesService.calculateHourlyRates(
              period.startTime,
              period.endTime,
              baseRate,
              contract,
              isHoliday || isActualSpecialDay, // isHoliday
              isSunday || isActualSpecialDay,  // isSunday  
              isSaturday                       // isSaturday (nuovo parametro)
            );
          }
          
          // Accumula i risultati
          totalBreakdown.totalHours += periodCalculation.totalHours || 0;
          totalBreakdown.totalEarnings += periodCalculation.totalEarnings || 0;
          
          // Aggiungi al breakdown con identificatore del periodo
          if (periodCalculation.breakdown) {
            periodCalculation.breakdown.forEach(item => {
              // Crea etichette più chiare per il lavoro
              let workLabel;
              if (item.name.includes('Notturno oltre le 22h')) {
                workLabel = `Lavoro notturno`;
              } else if (item.name.includes('Notturno fino le 22h')) {
                workLabel = `Lavoro notturno`;
              } else if (item.name.includes('Sabato')) {
                workLabel = `Lavoro sabato`;
              } else if (item.name.includes('Domenica') || item.name.includes('SUNDAY')) {
                workLabel = `Lavoro domenica`;
              } else if (item.name.includes('Festivo')) {
                workLabel = `Lavoro festivo`;
              } else {
                // Fallback: rimuovi TUTTE le informazioni tra parentesi
                workLabel = item.name.replace(/\s*\([^)]*\)/g, '').trim();
                if (!workLabel || workLabel.includes('undefined')) {
                  workLabel = 'Lavoro ordinario';
                }
              }
              
              totalBreakdown.breakdown.push({
                ...item,
                period: period.type,
                periodLabel: period.label,
                name: workLabel,
                specialDayMultiplier: isActualSpecialDay ? baseDayMultiplier : 1.0
              });
            });
          }
        }
      }
      
      // Calcola anche i viaggi se necessario
      // 🔥 SKIP viaggi se ci sono impostazioni specialDayTravelSettings - verranno gestiti dopo
      const hasSpecialDaySettings = settings.specialDayTravelSettings && 
        Object.keys(settings.specialDayTravelSettings).length > 0;
      
      if (!hasSpecialDaySettings) {
        console.log(`[CalculationService] 🚗 Nessuna impostazione giorni speciali - uso calcolo viaggi standard`);
        const travelPeriods = this.extractTravelPeriods(workEntry);
        for (const period of travelPeriods) {
          if (period.startTime && period.endTime) {
            // 🔥 USA LE NUOVE IMPOSTAZIONI GIORNI SPECIALI PER I VIAGGI
            const travelRateInfo = this.getTravelRateForDate(settings, date, baseRate);
            console.log(`[CalculationService] 🚗 Calcolo viaggio per ${date}:`, {
              specialDayTravelSettings: settings.specialDayTravelSettings,
              travelSetting: travelRateInfo.type,
              rate: travelRateInfo.rate,
              multiplier: travelRateInfo.multiplier,
              isSpecialDay: isActualSpecialDay,
              dayType: isHoliday ? 'HOLIDAY' : isSunday ? 'SUNDAY' : 'SATURDAY'
            });
            
            // Calcolo viaggi con logica standard (senza impostazioni speciali)
            const travelCalculation = await HourlyRatesService.calculateHourlyRates(
              period.startTime,
              period.endTime,
              travelRateInfo.rate,
              contract,
              isHoliday,
              isSunday,
              isSaturday
            );
            
            totalBreakdown.totalHours += travelCalculation.totalHours || 0;
            totalBreakdown.totalEarnings += travelCalculation.totalEarnings || 0;
            
            if (travelCalculation.breakdown) {
              travelCalculation.breakdown.forEach(item => {
                let travelLabel = `Viaggio standard`;
                totalBreakdown.breakdown.push({
                  ...item,
                  period: period.type,
                  periodLabel: period.label,
                  name: travelLabel,
                  travelCalculationType: 'STANDARD'
                });
              });
            }
          }
        }
      }
      
      // Calcola anche i viaggi con le impostazioni speciali dei giorni speciali  
      if (hasSpecialDaySettings && isActualSpecialDay) {
        console.log(`[CalculationService] 🚗 Calcolo viaggi con impostazioni giorni speciali per ${date}`);
        const travelPeriods = this.extractTravelPeriods(workEntry);
        
        for (const period of travelPeriods) {
          if (period.startTime && period.endTime) {
            const travelRateInfo = this.getTravelRateForDate(settings, date, baseRate);
            console.log(`[CalculationService] 🚗 Calcolo viaggio speciale ${period.type}:`, {
              type: travelRateInfo.type,
              rate: travelRateInfo.rate,
              multiplier: travelRateInfo.multiplier
            });
            
            let travelCalculation;
            
            if (travelRateInfo.type === 'WORK_RATE') {
              // 🔥 WORK_RATE: Calcola come lavoro con tutte le maggiorazioni CCNL
              const hourlySettings = await HourlyRatesService.getSettings();
              const timeSlots = hourlySettings.timeSlots || [];
              const dayType = isHoliday ? 'HOLIDAY' : isSunday ? 'SUNDAY' : 'SATURDAY';
              
              travelCalculation = await HourlyRatesService.calculateTimeSlotRatesWithDayBonus(
                period.startTime,
                period.endTime,
                date,
                settings.contract?.hourlyRate || baseRate,
                timeSlots,
                baseDayMultiplier,
                dayType
              );
            } else if (travelRateInfo.type === 'FIXED_RATE') {
              // 🔥 FIXED_RATE: Tariffa fissa SENZA maggiorazioni
              const travelHours = this.calculateHoursBetween(period.startTime, period.endTime);
              const fixedEarnings = travelHours * travelRateInfo.rate;
              
              travelCalculation = {
                totalHours: travelHours,
                totalEarnings: fixedEarnings,
                breakdown: [{
                  period: period.type,
                  periodLabel: period.label,
                  name: `Viaggio a tariffa fissa`,
                  hours: travelHours,
                  hourlyRate: travelRateInfo.rate,
                  earnings: fixedEarnings,
                  rate: 1.0,
                  travelCalculationType: 'FIXED_RATE'
                }]
              };
            } else if (travelRateInfo.type === 'PERCENTAGE_BONUS') {
              // 🔥 PERCENTAGE_BONUS: Tariffa CCNL + maggiorazione giorno speciale
              const travelHours = this.calculateHoursBetween(period.startTime, period.endTime);
              const bonusEarnings = travelHours * travelRateInfo.rate;
              
              travelCalculation = {
                totalHours: travelHours,
                totalEarnings: bonusEarnings,
                breakdown: [{
                  period: period.type,
                  periodLabel: period.label,
                  name: `Viaggio con maggiorazione`,
                  hours: travelHours,
                  hourlyRate: travelRateInfo.rate,
                  earnings: bonusEarnings,
                  rate: travelRateInfo.multiplier,
                  travelCalculationType: 'PERCENTAGE_BONUS'
                }]
              };
            }
            
            totalBreakdown.totalHours += travelCalculation.totalHours || 0;
            totalBreakdown.totalEarnings += travelCalculation.totalEarnings || 0;
            
            if (travelCalculation.breakdown) {
              travelCalculation.breakdown.forEach(item => {
                totalBreakdown.breakdown.push({
                  ...item,
                  period: period.type,
                  periodLabel: period.label,
                  travelCalculationType: travelRateInfo.type
                });
              });
            }
          }
        }
      }
      
      // Costruisci la struttura compatibile con il sistema esistente
      const ordinaryResult = {
        hours: {
          lavoro_giornaliera: Math.min(totalBreakdown.totalHours, standardWorkDay),
          viaggio_giornaliera: 0, // Già incluso nel calcolo multi-fascia
          lavoro_extra: Math.max(0, totalBreakdown.totalHours - standardWorkDay),
          viaggio_extra: 0 // Già incluso nel calcolo multi-fascia
        },
        earnings: {
          giornaliera: totalBreakdown.totalEarnings,
          viaggio_extra: 0,
          lavoro_extra: 0
        },
        total: totalBreakdown.totalEarnings
      };
      
      return {
        ordinary: ordinaryResult,
        breakdown: totalBreakdown.breakdown,
        method: 'hourly_rates_service',
        totalHours: totalBreakdown.totalHours,
        totalEarnings: totalBreakdown.totalEarnings
      };
      
    } catch (error) {
      console.error('❌ Errore calcolo multi-fascia:', error);
      
      // Fallback al calcolo standard
      return {
        ordinary: {
          hours: {
            lavoro_giornaliera: Math.min(workHours + travelHours, 8),
            viaggio_giornaliera: 0,
            lavoro_extra: Math.max(0, workHours + travelHours - 8),
            viaggio_extra: 0
          },
          earnings: {
            giornaliera: (workHours + travelHours) * (settings.contract?.hourlyRate || 16.41),
            viaggio_extra: 0,
            lavoro_extra: 0
          },
          total: (workHours + travelHours) * (settings.contract?.hourlyRate || 16.41)
        },
        breakdown: [],
        method: 'fallback_standard',
        error: error.message
      };
    }
  }

  /**
   * Estrae i periodi di lavoro dal workEntry
   */
  extractWorkPeriods(workEntry) {
    const periods = [];
    
    // Turno principale
    if (workEntry.workStart1 && workEntry.workEnd1) {
      periods.push({
        type: 'work_main_1',
        label: 'Turno 1',
        startTime: workEntry.workStart1,
        endTime: workEntry.workEnd1
      });
    }
    
    if (workEntry.workStart2 && workEntry.workEnd2) {
      periods.push({
        type: 'work_main_2',
        label: 'Turno 2',
        startTime: workEntry.workStart2,
        endTime: workEntry.workEnd2
      });
    }
    
    // Turni aggiuntivi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          periods.push({
            type: `work_additional_${index + 1}_1`,
            label: `Turno aggiuntivo ${index + 1}.1`,
            startTime: viaggio.work_start_1,
            endTime: viaggio.work_end_1
          });
        }
        
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          periods.push({
            type: `work_additional_${index + 1}_2`,
            label: `Turno aggiuntivo ${index + 1}.2`,
            startTime: viaggio.work_start_2,
            endTime: viaggio.work_end_2
          });
        }
      });
    }
    
    // Interventi reperibilità
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach((intervento, index) => {
        if (intervento.startTime && intervento.endTime) {
          periods.push({
            type: `standby_intervention_${index + 1}`,
            label: `Intervento reperibilità ${index + 1}`,
            startTime: intervento.startTime,
            endTime: intervento.endTime
          });
        }
      });
    }
    
    return periods;
  }

  /**
   * Estrae i periodi di viaggio dal workEntry
   */
  extractTravelPeriods(workEntry) {
    const periods = [];
    
    // Viaggio principale (partenza azienda → arrivo cantiere)
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      // Calcola orario fine viaggio (partenza + durata media stimata)
      // Per ora usiamo una logica semplificata
      const departureTime = workEntry.departureCompany;
      const workStartTime = workEntry.workStart1;
      
      if (departureTime && workStartTime) {
        periods.push({
          type: 'travel_outbound',
          label: 'Viaggio andata',
          startTime: departureTime,
          endTime: workStartTime
        });
      }
    }
    
    // Viaggio di ritorno (partenza cantiere → arrivo azienda)
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      periods.push({
        type: 'travel_return',
        label: 'Viaggio ritorno',
        startTime: workEntry.departureReturn,
        endTime: workEntry.arrivalCompany
      });
    }
    
    // Viaggi aggiuntivi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.departure_company && viaggio.arrival_site) {
          // Viaggio andata aggiuntivo
          const departureTime = viaggio.departure_company;
          const workStartTime = viaggio.work_start_1;
          
          if (departureTime && workStartTime) {
            periods.push({
              type: `travel_additional_${index + 1}_outbound`,
              label: `Viaggio aggiuntivo ${index + 1} andata`,
              startTime: departureTime,
              endTime: workStartTime
            });
          }
        }
        
        if (viaggio.departure_return && viaggio.arrival_company) {
          periods.push({
            type: `travel_additional_${index + 1}_return`,
            label: `Viaggio aggiuntivo ${index + 1} ritorno`,
            startTime: viaggio.departure_return,
            endTime: viaggio.arrival_company
          });
        }
      });
    }
    
    return periods;
  }

  /**
   * Calcola la tariffa di viaggio in base alle impostazioni dei giorni speciali
   * @param {Object} settings - Impostazioni dell'app
   * @param {string} date - Data in formato YYYY-MM-DD
   * @param {number} baseRate - Tariffa oraria base
   * @returns {Object} - { rate: number, multiplier: number, type: string }
   */
  getTravelRateForDate(settings, date, baseRate) {
    const defaultTravelRate = settings.travelCompensationRate || 1.0;
    
    console.log(`[CalculationService] 🔍 getTravelRateForDate chiamato per ${date}:`, {
      hasSpecialSettings: !!settings.specialDayTravelSettings,
      specialSettings: settings.specialDayTravelSettings,
      defaultTravelRate: defaultTravelRate,
      dateType: typeof date,
      dateValue: date
    });
    
    // 🔥 CORREZIONE: Gestisci correttamente sia stringhe che oggetti Date
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date + 'T12:00:00.000Z');
    } else {
      // Fallback per altri tipi
      dateObj = new Date(date);
    }
    
    const dayOfWeek = dateObj.getUTCDay();
    
    console.log(`[CalculationService] 🔍 DEBUG data parsing:`, {
      originalDate: date,
      dateObj: dateObj,
      dayOfWeek: dayOfWeek,
      dayName: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][dayOfWeek],
      isValidDate: !isNaN(dateObj.getTime())
    });
    
    // Determina il tipo di giorno
    let dayType = null;
    let settingKey = null;
    let isSpecialDay = false;
    
    if (dayOfWeek === 6) { // Sabato
      dayType = 'SATURDAY';
      settingKey = 'saturday';
      isSpecialDay = true;
    } else if (dayOfWeek === 0) { // Domenica
      dayType = 'SUNDAY';
      settingKey = 'sunday';
      isSpecialDay = true;
    } else if (isItalianHoliday(date)) { // Festivo
      dayType = 'HOLIDAY';
      settingKey = 'holiday';
      isSpecialDay = true;
    }
    
    console.log(`[CalculationService] 🔍 DEBUG tipo giorno:`, {
      dayType: dayType,
      settingKey: settingKey,
      isSpecialDay: isSpecialDay,
      holidayCheck: isItalianHoliday(date)
    });
    
    // Se è un giorno feriale, usa la tariffa standard
    if (!isSpecialDay) {
      console.log(`[CalculationService] 🔍 GIORNO FERIALE - restituisco FIXED_RATE`);
      return {
        rate: baseRate * defaultTravelRate,
        multiplier: defaultTravelRate,
        type: 'FIXED_RATE'
      };
    }
    
    // 🔥 CORREZIONE: Se non ci sono le impostazioni specifiche per giorni speciali,
    // usa il default FIXED_RATE ma con la tariffa CCNL corretta per evitare inconsistenze
    if (!settings.specialDayTravelSettings) {
      console.log(`[CalculationService] ⚠️ Nessuna impostazione giorni speciali trovata - uso FIXED_RATE default`);
      
      // 🚨 CORREZIONE TEMPORANEA: Se baseRate è la tariffa ridotta e siamo in un giorno speciale,
      // usa la tariffa CCNL corretta come fallback per evitare calcoli inconsistenti
      const ccnlBaseRate = settings.contract?.hourlyRate || baseRate;
      const shouldUseCCNLRate = baseRate < ccnlBaseRate * 0.8; // Se baseRate è molto più bassa, probabilmente è ridotta
      
      const finalRate = shouldUseCCNLRate ? ccnlBaseRate : baseRate;
      
      console.log(`[CalculationService] 🚗 Calcolo viaggio per ${date}:`, {
        dayType: dayType,
        isSpecialDay: isSpecialDay,
        rate: finalRate,
        multiplier: defaultTravelRate,
        specialDayTravelSettings: settings.specialDayTravelSettings,
        travelSetting: 'FIXED_RATE'
      });
      
      return {
        rate: finalRate * defaultTravelRate,
        multiplier: defaultTravelRate,
        type: 'FIXED_RATE'
      };
    }
    
    // Ora abbiamo le impostazioni - RISPETTA LA SCELTA DELL'UTENTE
    const specialSetting = settings.specialDayTravelSettings[settingKey] || 'FIXED_RATE';
    
    console.log(`[CalculationService] 🔍 DEBUG scelta utente:`, {
      settingKey: settingKey,
      specialSetting: specialSetting,
      allSettings: settings.specialDayTravelSettings
    });
    
    console.log(`[CalculationService] 🚗 Calcolo viaggio per ${date}:`, {
      dayType: dayType,
      isSpecialDay: isSpecialDay,
      rate: baseRate,
      multiplier: defaultTravelRate,
      specialDayTravelSettings: settings.specialDayTravelSettings,
      travelSetting: specialSetting
    });
    
    switch (specialSetting) {
      case 'WORK_RATE':
        // 🔥 SCELTA UTENTE: Paga come ore di lavoro - USA TARIFFA CCNL COMPLETA
        const ccnlBaseRate = settings.contract?.hourlyRate || baseRate;
        console.log(`[CalculationService] 🚗 WORK_RATE scelto dall'utente - uso tariffa CCNL: ${ccnlBaseRate}`);
        return {
          rate: ccnlBaseRate,
          multiplier: 1.0,
          type: 'WORK_RATE' // 🔥 CORRETTO: deve essere WORK_RATE per attivare il calcolo CCNL
        };
        
      case 'PERCENTAGE_BONUS':
        // 🔥 SCELTA UTENTE: Tariffa CCNL + maggiorazione del giorno speciale
        const ccnlBonusRate = settings.contract?.hourlyRate || baseRate;
        const dayMultiplier = this.getDayMultiplier(settings, dayType);
        const travelWithBonus = defaultTravelRate * dayMultiplier;
        console.log(`[CalculationService] 🚗 PERCENTAGE_BONUS scelto dall'utente - tariffa CCNL: ${ccnlBonusRate} × ${travelWithBonus}`);
        return {
          rate: ccnlBonusRate * travelWithBonus,
          multiplier: travelWithBonus,
          type: 'PERCENTAGE_BONUS'
        };
        
      case 'FIXED_RATE':
      default:
        // 🔥 SCELTA UTENTE: Tariffa CCNL fissa dalle impostazioni contratto
        const ccnlFixedRate = settings.contract?.hourlyRate || baseRate;
        console.log(`[CalculationService] 🚗 FIXED_RATE scelto dall'utente - uso tariffa CCNL contratto: ${ccnlFixedRate}`);
        return {
          rate: ccnlFixedRate * defaultTravelRate,
          multiplier: defaultTravelRate,
          type: 'FIXED_RATE'
        };
    }
  }

  /**
   * Ottiene il moltiplicatore per il tipo di giorno speciale
   * @param {Object} settings - Impostazioni dell'app
   * @param {string} dayType - 'saturday', 'sunday', 'holiday'
   * @returns {number} - Moltiplicatore (es. 1.25 per +25%)
   */
  getDayMultiplier(settings, dayType) {
    switch (dayType) {
      case 'SATURDAY':
        return settings.contract?.overtimeRates?.saturday || 1.25;
      case 'SUNDAY':
        return settings.contract?.overtimeRates?.holiday || 1.3; // Domenica come festivo
      case 'HOLIDAY':
        return settings.contract?.overtimeRates?.holiday || 1.3;
      default:
        return 1.0;
    }
  }

  /**
   * Calcola le ore tra due orari in formato HH:MM
   * @param {string} startTime - Orario di inizio (HH:MM)
   * @param {string} endTime - Orario di fine (HH:MM)
   * @returns {number} - Ore decimali
   */
  calculateHoursBetween(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Gestisce il caso di attraversamento mezzanotte
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    const totalMinutes = endMinutes - startMinutes;
    return totalMinutes / 60;
  }

  /**
   * Aggiunge ore a un orario in formato HH:MM
   */
  addHoursToTime(timeStr, hours) {
    if (!timeStr) return null;
    
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + (hours * 60);
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }
}

// --- FINE CLASSE ---

export default CalculationService;
