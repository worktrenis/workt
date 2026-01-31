import { isItalianHoliday } from '../constants/holidays';

/**
 * Gestisce tutti i calcoli delle indennità (trasferta, pasti, etc.)
 */
export class AllowanceCalculator {
  
  constructor(timeCalculator) {
    this.timeCalculator = timeCalculator;
  }

  /**
   * Calcola l'indennità di trasferta in base alle regole CCNL e alle impostazioni
   */
  calculateTravelAllowance(workEntry, settings, workHours, travelHours, standbyWorkHours) {
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
        const isStandbyDay = this.isStandbyDay(workEntry, settings);
        const isStandbyNonLavorativo = isStandbyDay && standbyWorkHours > 0 && totalWorked === 0;
        attiva = travelHours > 0 || isStandbyNonLavorativo;
      } else {
        // Default per calcoli proporzionali o con mezza giornata
        if (calculationMethod === 'PROPORTIONAL_CCNL' || calculationMethod === 'FULL_ALLOWANCE_HALF_DAY' || calculationMethod === 'HALF_ALLOWANCE_HALF_DAY') {
          attiva = effectiveTotalWorked > 0;
        } else {
          attiva = travelHours > 0; // Fallback
        }
      }
      
      // Verifica se è un giorno domenicale o festivo
      const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = isItalianHoliday(workEntry.date);
      
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
          
          console.log(`[AllowanceCalculator] Indennità trasferta CCNL proporzionale per ${workEntry.date}: ${effectiveTotalWorked}h (${workHours}h lavoro + ${travelHours}h viaggio + ${standbyWorkHours}h reperibilità) / ${standardWorkDay}h = ${(proportionalRate * 100).toFixed(1)}% → ${baseTravelAllowance.toFixed(2)}€ (travelAllowancePercent ignorato per conformità CCNL)`);
        }
        // Logica precedente per retrocompatibilità - SOLO se PROPORTIONAL_CCNL non è attivo
        else if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY') && isHalfDay) {
          baseTravelAllowance = travelAllowanceAmount / 2;
          console.log(`[AllowanceCalculator] Indennità trasferta 50% per mezza giornata (${workEntry.date}): ${baseTravelAllowance.toFixed(2)}€`);
        }
        // FULL_ALLOWANCE_HALF_DAY mantiene l'importo pieno anche per mezze giornate
        
        // Applica l'indennità senza maggiorazioni per giorni speciali (a meno che non sia configurato diversamente)
        travelAllowance = baseTravelAllowance * travelAllowancePercent;
        
        console.log(`[AllowanceCalculator] Indennità trasferta finale per ${workEntry.date}: ${baseTravelAllowance.toFixed(2)}€ × ${travelAllowancePercent} = ${(travelAllowance || 0).toFixed(2)}€ (metodo: ${calculationMethod}, speciale: ${isSunday || isHoliday}, override: ${manualOverride}, applyOnSpecialDays: ${applyOnSpecialDays})`);
      }
    }

    return travelAllowance;
  }

  /**
   * Calcola i rimborsi pasti
   */
  calculateMealAllowances(workEntry, settings) {
    const mealAllowances = {};
    
    // Pranzo
    if (workEntry.mealLunchVoucher === 1) {
      mealAllowances.lunch = { 
        type: 'voucher', 
        amount: settings.mealAllowances?.lunch?.voucherAmount || 0 
      };
    }
    if (workEntry.mealLunchCash > 0) {
      mealAllowances.lunch = { 
        type: 'cash', 
        amount: workEntry.mealLunchCash 
      };
    }
    
    // Cena
    if (workEntry.mealDinnerVoucher === 1) {
      mealAllowances.dinner = { 
        type: 'voucher', 
        amount: settings.mealAllowances?.dinner?.voucherAmount || 0 
      };
    }
    if (workEntry.mealDinnerCash > 0) {
      mealAllowances.dinner = { 
        type: 'cash', 
        amount: workEntry.mealDinnerCash 
      };
    }

    return mealAllowances;
  }

  /**
   * Verifica se il giorno è configurato come reperibile
   */
  isStandbyDay(workEntry, settings) {
    const dateStr = workEntry.date;
    const standbySettings = settings.standbySettings || {};
    const standbyDays = standbySettings.standbyDays || {};
    
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
    
    // Se disattivato manualmente, ignora le impostazioni da calendario
    return isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
  }
}

export default AllowanceCalculator;
