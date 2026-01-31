import { 
  CCNL_CONTRACTS, 
  getWorkDayHours
} from '../constants';
import { isItalianHoliday } from '../constants/holidays';

/**
 * Gestisce i calcoli delle retribuzioni base (giornaliera, straordinari, maggiorazioni)
 */
export class EarningsCalculator {
  
  constructor(timeCalculator) {
    this.timeCalculator = timeCalculator;
    this.defaultContract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  }

  /**
   * Calcola le maggiorazioni orarie in base alle condizioni di lavoro
   */
  getHourlyRateWithBonus({
    baseRate,
    isOvertime = false,
    isNight = false,
    isHoliday = false,
    isSunday = false,
    contract = this.defaultContract
  }) {
    let multiplier = 1.0;
    
    if (isOvertime) {
      if (isNight) {
        multiplier = contract.overtimeRates?.nightAfter22 || 1.35;
      } else if (isHoliday || isSunday) {
        multiplier = contract.overtimeRates?.holiday || 1.3;
      } else {
        multiplier = contract.overtimeRates?.day || 1.2;
      }
    } else {
      if (isNight) {
        multiplier = contract.overtimeRates?.nightUntil22 || 1.25;
      } else if (isHoliday || isSunday) {
        multiplier = contract.overtimeRates?.holiday || 1.3;
      } else if (isSunday) {
        multiplier = contract.overtimeRates?.saturday || 1.25;
      }
    }
    
    return baseRate * multiplier;
  }

  /**
   * Calcola la retribuzione per giorni fissi (ferie, permessi, malattia, etc.)
   */
  calculateFixedDayEarnings(workEntry, settings) {
    const dayType = workEntry.dayType || 'lavorativa';
    const isFixedDay = workEntry.isFixedDay || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType);
    
    if (isFixedDay && dayType !== 'lavorativa') {
      console.log(`[EarningsCalculator] Giorno fisso rilevato (${dayType}) per ${workEntry.date}, applicazione retribuzione giornaliera standard`);
      
      // Per i giorni fissi, viene corrisposta la retribuzione giornaliera standard
      const dailyRate = settings.contract?.dailyRate || 109.19;
      
      return {
        isFixedDay: true,
        dayType: dayType,
        earnings: {
          regularPay: dailyRate,
          overtimePay: 0,
          ordinaryBonusPay: 0,
          travelPay: 0,
          standbyWorkPay: 0,
          standbyTravelPay: 0,
          standbyAllowance: 0,
          travelAllowance: 0,
          total: dailyRate,
          // Aggiunta compatibilità Dashboard
          breakdown: {
            workHours: 0,
            travelHours: 0,
            standbyWorkHours: 0,
            standbyTravelHours: 0,
            regularHours: 8, // Ore standard giornaliera per giorno fisso
            overtimeHours: 0,
            isStandbyDay: false,
            isFixedDay: true,
            dayType: dayType
          },
          mealAllowances: {
            lunch: { voucher: 0, cash: 0 },
            dinner: { voucher: 0, cash: 0 }
          }
        }
      };
    }
    
    return null; // Non è un giorno fisso
  }

  /**
   * Calcola la retribuzione base per una giornata lavorativa
   */
  calculateBasicEarnings(workEntry, settings, workHours, travelHours) {
    const contract = settings.contract || this.defaultContract;
    const baseRate = contract.hourlyRate || (contract.monthlySalary / 173);
    const dailyRate = contract.dailyRate || (contract.monthlySalary / 26);
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    const travelHoursSetting = settings.travelHoursSetting || 'TRAVEL_RATE_EXCESS';
    const multiShiftTravelAsWork = settings.multiShiftTravelAsWork || false;
    
    // Log per verificare che le impostazioni vengano applicate correttamente
    console.log('🔧 EarningsCalculator - NUOVA logica viaggio:', {
      modalità: travelHoursSetting,
      multiShiftTravelAsWork,
      workHours,
      travelHours,
      dataCalcolo: workEntry.date
    });
    
    // Determina se il giorno è festivo o domenica
    const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
    const isSunday = dateObj.getDay() === 0;
    const isSaturday = dateObj.getDay() === 6;
    const isHoliday = isItalianHoliday(workEntry.date);
    
    // Calcolo straordinari
    let overtimePay = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let regularHours = 0;
    let travelPay = 0;

    // NUOVA LOGICA VIAGGIO: gestione logiche pulite
    const standardWorkDay = getWorkDayHours();
    
    // 🚗 Gestione logica multi-turno (se abilitata)
    let effectiveWorkHours = workHours;
    let effectiveTravelHours = travelHours;
    
    if (multiShiftTravelAsWork && workEntry.interventi && workEntry.interventi.length > 1) {
      // Calcola viaggi interni vs esterni per multi-turno
      const travelBreakdown = this.timeCalculator.calculateTravelHoursWithTypes(workEntry);
      const externalTravelHours = travelBreakdown.external || 0;
      const internalTravelHours = travelBreakdown.internal || 0;
      
      // I viaggi interni diventano lavoro
      effectiveWorkHours = workHours + internalTravelHours;
      effectiveTravelHours = externalTravelHours;
      
      console.log('🔄 Multi-turno applicato:', {
        originalWork: workHours,
        originalTravel: travelHours,
        internalTravelAsWork: internalTravelHours,
        effectiveWork: effectiveWorkHours,
        effectiveTravel: effectiveTravelHours
      });
    }
    
    // 🎯 Applicazione logiche di viaggio
    console.log(`[EarningsCalculator] Applicazione modalità viaggio: ${travelHoursSetting}`, {
      effectiveWorkHours,
      effectiveTravelHours,
      standardWorkDay,
      totalHours: effectiveWorkHours + effectiveTravelHours
    });
    
    if (travelHoursSetting === 'TRAVEL_RATE_ALL') {
      // 🛣️ LOGICA 2: Tutte le ore di viaggio sempre con tariffa viaggio
      console.log(`[EarningsCalculator] Applicando TRAVEL_RATE_ALL`);
      
      travelPay = effectiveTravelHours * baseRate * travelCompensationRate;
      
      // Lavoro pagato con logica CCNL standard
      if (effectiveWorkHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraWorkHours = effectiveWorkHours - standardWorkDay;
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
        regularPay = baseRate * effectiveWorkHours;
        regularHours = effectiveWorkHours;
        overtimeHours = 0;
      }
      
    } else if (travelHoursSetting === 'OVERTIME_EXCESS') {
      // 🕐 LOGICA 3: Ore viaggio eccedenti le 8h come straordinari
      console.log(`[EarningsCalculator] Applicando OVERTIME_EXCESS`);
      
      const totalHours = effectiveWorkHours + effectiveTravelHours;
      
      if (totalHours <= standardWorkDay) {
        // Tutto rientra nelle 8h: retribuzione giornaliera
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        travelPay = 0; // Incluso nella diaria
      } else {
        // Eccedenza pagata come straordinari
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const excessHours = totalHours - standardWorkDay;
        
        let overtimeBonusRate = this.getHourlyRateWithBonus({
          baseRate,
          isOvertime: true,
          isNight: workEntry.isNight || false,
          isHoliday,
          isSunday,
          contract
        });
        
        overtimePay = excessHours * overtimeBonusRate;
        overtimeHours = excessHours;
        travelPay = 0; // Viaggio incluso negli straordinari
      }
      
    } else {
      // 🚗 LOGICA 1 (DEFAULT): TRAVEL_RATE_EXCESS - Ore viaggio eccedenti con tariffa viaggio
      console.log(`[EarningsCalculator] Applicando TRAVEL_RATE_EXCESS (default)`);
      
      const totalHours = effectiveWorkHours + effectiveTravelHours;
      
      if (totalHours <= standardWorkDay) {
        // Tutto rientra nelle 8h: retribuzione giornaliera
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        travelPay = 0; // Incluso nella diaria
      } else {
        // Eccedenza viaggio pagata con tariffa viaggio
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const excessHours = totalHours - standardWorkDay;
        
        // Tutti gli eccessi sono viaggi (priorità al lavoro per la diaria)
        travelPay = excessHours * baseRate * travelCompensationRate;
        overtimeHours = 0; // Nessun straordinario
      }
    }
        const extraWorkHours = effectiveWorkHours - standardWorkDay;
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
        regularPay = baseRate * effectiveWorkHours;
        regularHours = effectiveWorkHours;
        overtimeHours = 0;
      }
      
      console.log(`[EarningsCalculator] 🎯 MULTI_SHIFT result:`, {
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        travelPay: travelPay.toFixed(2),
        total: (regularPay + overtimePay + travelPay).toFixed(2)
      });
    } else {
      console.log(`[EarningsCalculator] Applicando modalità ${travelHoursSetting} (logica esistente)`);
      // LOGICHE ESISTENTI: considera viaggio + lavoro insieme
      const totalRegularHours = workHours + travelHours;
      if (totalRegularHours >= standardWorkDay) {
        regularPay = dailyRate;
        regularHours = standardWorkDay;
        const extraHours = totalRegularHours - standardWorkDay;
        if (extraHours > 0) {
          if (travelHoursSetting === 'EXCESS_AS_TRAVEL') {
            console.log(`[EarningsCalculator] Ore extra (${extraHours}h) pagate come viaggio`);
            // Le ore oltre 8h sono pagate come viaggio
            travelPay = extraHours * baseRate * travelCompensationRate;
            overtimeHours = 0;
          } else if (travelHoursSetting === 'EXCESS_AS_OVERTIME') {
            console.log(`[EarningsCalculator] Ore extra (${extraHours}h) pagate come straordinario`);
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
            console.log(`[EarningsCalculator] Modalità AS_WORK: ore extra incluse nel normale lavoro`);
            // AS_WORK: Default nessun extra, tutto come lavoro normale
            overtimeHours = 0;
          }
        }
      } else {
        console.log(`[EarningsCalculator] Totale ore (${totalRegularHours}h) < giornata standard: calcolo proporzionale`);
        // Se meno di 8h, paga solo le ore effettive MA rispettando la modalità viaggio
        if (travelHoursSetting === 'AS_WORK') {
          console.log(`[EarningsCalculator] Modalità AS_WORK: tutto come lavoro normale`);
          // Tutto come lavoro normale
          regularPay = baseRate * totalRegularHours;
          regularHours = totalRegularHours;
        } else if (travelHoursSetting === 'TRAVEL_SEPARATE') {
          console.log(`[EarningsCalculator] Modalità TRAVEL_SEPARATE con <8h: viaggio separato + lavoro normale`);
          // Viaggio sempre pagato separatamente, lavoro come ore normali
          travelPay = travelHours * baseRate * travelCompensationRate;
          regularPay = workHours * baseRate;
          regularHours = workHours;
        } else {
          console.log(`[EarningsCalculator] Altre modalità con <8h: pagamento ore effettive (${travelHoursSetting})`);
          // Per EXCESS_AS_TRAVEL/EXCESS_AS_OVERTIME con meno di 8h, nessuna eccedenza
          regularPay = baseRate * totalRegularHours;
          regularHours = totalRegularHours;
        }
        overtimeHours = 0;
      }
    }

    // Lavoro ordinario notturno/festivo/domenicale
    let ordinaryBonusPay = 0;
    const totalRegularHours = workHours + travelHours;
    if (!overtimeHours && (workEntry.isNight || isHoliday || isSunday)) {
      let ordinaryBonusRate = this.getHourlyRateWithBonus({
        baseRate,
        isOvertime: false,
        isNight: workEntry.isNight || false,
        isHoliday,
        isSunday,
        contract
      });
      ordinaryBonusPay = totalRegularHours * (ordinaryBonusRate - baseRate);
    }

    return {
      regularPay,
      overtimePay,
      ordinaryBonusPay,
      travelPay,
      regularHours,
      overtimeHours,
      baseRate,
      contract
    };
  }
}

export default EarningsCalculator;
