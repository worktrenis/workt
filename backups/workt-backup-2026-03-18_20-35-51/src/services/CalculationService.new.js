import { 
  CCNL_CONTRACTS
} from '../constants';
import { NetEarningsCalculator, calculateRealNet } from './NetEarningsCalculator';
import TimeCalculator from './TimeCalculator';
import EarningsCalculator from './EarningsCalculator';
import StandbyCalculator from './StandbyCalculator';
import AllowanceCalculator from './AllowanceCalculator';

/**
 * Servizio principale per tutti i calcoli delle retribuzioni e indennità
 * Coordina i vari moduli specializzati
 */
class CalculationService {
  constructor() {
    this.defaultContract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    this.netCalculator = new NetEarningsCalculator(this.defaultContract);
    
    // Inizializza i moduli specializzati
    this.timeCalculator = new TimeCalculator();
    this.earningsCalculator = new EarningsCalculator(this.timeCalculator);
    this.standbyCalculator = new StandbyCalculator(this.timeCalculator);
    this.allowanceCalculator = new AllowanceCalculator(this.timeCalculator);
  }

  // Delega i metodi di calcolo ore al TimeCalculator
  parseTime(timeString) {
    return this.timeCalculator.parseTime(timeString);
  }

  minutesToHours(minutes) {
    return this.timeCalculator.minutesToHours(minutes);
  }

  calculateTimeDifference(startTime, endTime) {
    return this.timeCalculator.calculateTimeDifference(startTime, endTime);
  }

  calculateWorkHours(workEntry) {
    return this.timeCalculator.calculateWorkHours(workEntry);
  }

  calculateTravelHours(workEntry) {
    return this.timeCalculator.calculateTravelHours(workEntry);
  }

  calculateStandbyWorkHours(workEntry) {
    return this.timeCalculator.calculateStandbyWorkHours(workEntry);
  }

  calculateStandbyTravelHours(workEntry) {
    return this.timeCalculator.calculateStandbyTravelHours(workEntry);
  }

  calculateOvertimeDetails(workHours, travelHours, contract = this.defaultContract) {
    return this.timeCalculator.calculateOvertimeDetails(workHours, travelHours, contract);
  }

  // Metodo principale per il calcolo delle retribuzioni giornaliere
  calculateDailyEarnings(workEntry, settings) {
    console.log(`[CalculationService] calculateDailyEarnings - Modalità calcolo viaggio: ${settings.travelHoursSetting || 'EXCESS_AS_TRAVEL'}`, {
      workEntry: workEntry.date,
      settingsPassed: settings.travelHoursSetting,
      travelCompensationRate: settings.travelCompensationRate || 1.0
    });

    // 1. Verifica se è un giorno fisso (ferie, permessi, malattia, etc.)
    const fixedDayResult = this.earningsCalculator.calculateFixedDayEarnings(workEntry, settings);
    if (fixedDayResult?.isFixedDay) {
      return fixedDayResult.earnings;
    }

    // 2. Calcola le ore base
    const workHours = this.timeCalculator.calculateWorkHours(workEntry);
    const travelHours = this.timeCalculator.calculateTravelHours(workEntry);
    const standbyWorkHours = this.timeCalculator.calculateStandbyWorkHours(workEntry);
    const standbyTravelHours = this.timeCalculator.calculateStandbyTravelHours(workEntry);

    // 3. Calcola la retribuzione base
    const basicEarnings = this.earningsCalculator.calculateBasicEarnings(workEntry, settings, workHours, travelHours);

    // 4. Calcola gli interventi di reperibilità
    const standbyWork = this.standbyCalculator.calculateStandbyWorkEarnings(workEntry, settings, basicEarnings.contract);

    // 5. Calcola l'indennità di reperibilità
    const standbyAllowance = this.standbyCalculator.calculateStandbyAllowance(workEntry, settings);

    // 6. Calcola l'indennità di trasferta
    const travelAllowance = this.allowanceCalculator.calculateTravelAllowance(
      workEntry, 
      settings, 
      workHours, 
      travelHours, 
      standbyWorkHours
    );

    // 7. Calcola rimborsi pasti
    const mealAllowances = this.allowanceCalculator.calculateMealAllowances(workEntry, settings);

    // 8. Totale lordo
    const total = basicEarnings.regularPay + 
                  basicEarnings.overtimePay + 
                  basicEarnings.ordinaryBonusPay + 
                  basicEarnings.travelPay + 
                  standbyWork.standbyWorkPay + 
                  standbyWork.standbyTravelPay + 
                  standbyAllowance + 
                  travelAllowance;

    // 9. Calcolo netto
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

    return {
      regularPay: basicEarnings.regularPay,
      overtimePay: basicEarnings.overtimePay,
      ordinaryBonusPay: basicEarnings.ordinaryBonusPay,
      travelPay: basicEarnings.travelPay,
      standbyWorkPay: standbyWork.standbyWorkPay,
      standbyTravelPay: standbyWork.standbyTravelPay,
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
        regularHours: basicEarnings.regularHours,
        overtimeHours: basicEarnings.overtimeHours,
        isStandbyDay: this.standbyCalculator.isStandbyDay(workEntry, settings)
      },
      note: this.standbyCalculator.isStandbyDay(workEntry, settings) ? 'Indennità reperibilità inclusa. Il CCNL Metalmeccanico PMI non prevede una retribuzione aggiuntiva per la prima uscita: ogni intervento è retribuito secondo le maggiorazioni orarie.' : undefined,
      mealAllowances,
    };
  }

  // Calcolo del breakdown dettagliato
  calculateEarningsBreakdown(workEntry, settings) {
    // Implementazione semplificata per ora
    // Potrebbe essere spostata in un modulo separato se diventa troppo complessa
    const earnings = this.calculateDailyEarnings(workEntry, settings);
    
    return {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(earnings.breakdown.workHours, 8),
          viaggio_giornaliera: Math.min(earnings.breakdown.travelHours, Math.max(0, 8 - earnings.breakdown.workHours)),
          lavoro_extra: Math.max(0, earnings.breakdown.workHours - 8),
          viaggio_extra: Math.max(0, earnings.breakdown.travelHours - Math.max(0, 8 - earnings.breakdown.workHours))
        },
        earnings: {
          giornaliera: earnings.regularPay,
          viaggio_extra: earnings.travelPay,
          lavoro_extra: earnings.overtimePay
        },
        total: earnings.regularPay + earnings.overtimePay + earnings.travelPay
      },
      standby: this.standbyCalculator.calculateStandbyBreakdown(workEntry, settings),
      allowances: {
        travel: earnings.travelAllowance,
        meal: 0, // Da implementare
        standby: earnings.standbyAllowance
      },
      totalEarnings: earnings.total,
      details: {
        isSaturday: false, // Da implementare
        isSunday: false,   // Da implementare
        isHoliday: false,  // Da implementare
        isSpecialDay: false,
        regularHours: earnings.breakdown.regularHours,
        extraHours: earnings.breakdown.overtimeHours,
        totalOrdinaryHours: earnings.breakdown.workHours + earnings.breakdown.travelHours,
        corrected: false
      }
    };
  }

  // Metodi di utilità per compatibilità
  getHourlyRateWithBonus(params) {
    return this.earningsCalculator.getHourlyRateWithBonus(params);
  }

  calculateStandbyBreakdown(workEntry, settings) {
    return this.standbyCalculator.calculateStandbyBreakdown(workEntry, settings);
  }
}

export default CalculationService;
