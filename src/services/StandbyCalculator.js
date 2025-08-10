import { isItalianHoliday } from '../constants/holidays';
import { getWorkDayHours } from '../constants';

/**
 * Gestisce tutti i calcoli specifici per la reperibilità
 */
export class StandbyCalculator {
  
  constructor(timeCalculator) {
    this.timeCalculator = timeCalculator;
  }

  /**
   * Calcola l'indennità giornaliera di reperibilità secondo CCNL
   */
  calculateStandbyAllowance(workEntry, settings) {
    let standbyAllowance = 0;
    const dateStr = workEntry.date;
    const standbySettings = settings.standbySettings || {};
    
    // Verifica se la reperibilità è attiva
    const isStandbyDay = this.isStandbyDay(workEntry, settings);
    
    if (isStandbyDay && settings?.standbySettings?.enabled) {
      // Valori CCNL per livello (Unionmeccanica Confapi, 01/06/2025)
      const { getStandbyRatesForContract } = require('../constants');
      const contractKey = settings?.contract?.key;
      const ccnlRates = getStandbyRatesForContract(contractKey);
      const IND_16H_FERIALE = ccnlRates.feriale16;
      const IND_24H_FERIALE = ccnlRates.feriale24;
      const IND_24H_FESTIVO = ccnlRates.festivo24;
      
      // Verifica se abbiamo personalizzazioni
      const customFeriale16 = standbySettings.customFeriale16;
      const customFeriale24 = standbySettings.customFeriale24;
      const customFestivo = standbySettings.customFestivo;
      const allowanceType = standbySettings.allowanceType || '24h';
  const saturdayAsRest = standbySettings.saturdayAsRest === true;
  const saturdayMode = standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
      
      // Determina il tipo di giorno
      const dateObj = workEntry.date ? new Date(workEntry.date) : new Date();
      const isSunday = dateObj.getDay() === 0;
      const isSaturday = dateObj.getDay() === 6;
      const isHoliday = isItalianHoliday(workEntry.date);
      
      let baseDailyAllowance;
      
      // Determina il tipo di giorno considerando le impostazioni personalizzate
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayMode === 'festivo');
      
      if (isRestDay) {
        // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
        baseDailyAllowance = customFestivo || IND_24H_FESTIVO;
        console.log(`[StandbyCalculator] Indennità reperibilità giorno di riposo per ${workEntry.date}: ${baseDailyAllowance}€ (personalizzata: ${!!customFestivo})`);
      } else {
        // Giorni feriali (incluso sabato feriale/feriale24)
        if (isSaturday && saturdayMode === 'feriale24') {
          baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        } else if (allowanceType === '16h') {
          baseDailyAllowance = customFeriale16 || IND_16H_FERIALE;
        } else {
          baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
        }
        console.log(`[StandbyCalculator] Indennità reperibilità feriale ${allowanceType} per ${workEntry.date}: ${baseDailyAllowance}€ (personalizzata: ${!!(allowanceType === '16h' ? customFeriale16 : customFeriale24)})`);
      }
      
      standbyAllowance = baseDailyAllowance;
    }
    
    const isManuallyActivated = workEntry.isStandbyDay === true || 
                              workEntry.isStandbyDay === 1 || 
                              workEntry.standbyAllowance === true || 
                              workEntry.standbyAllowance === 1;
                              
    const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                workEntry.isStandbyDay === 0 ||
                                workEntry.standbyAllowance === false ||
                                workEntry.standbyAllowance === 0;
                                
    const isInCalendar = Boolean(standbySettings && 
                        standbySettings.enabled && 
                        standbySettings.standbyDays && 
                        dateStr && 
                        standbySettings.standbyDays[dateStr] && 
                        standbySettings.standbyDays[dateStr].selected === true);
    
    console.log(`[StandbyCalculator] Indennità reperibilità finale per ${workEntry.date}: ${(standbyAllowance || 0).toFixed(2)}€ (manuale: ${isManuallyActivated}, disattivata: ${isManuallyDeactivated}, calendario: ${isInCalendar})`);
    
    return standbyAllowance;
  }

  /**
   * Calcola la retribuzione per gli interventi durante la reperibilità
   */
  calculateStandbyWorkEarnings(workEntry, settings, contract) {
    const standbyWorkHours = this.timeCalculator.calculateStandbyWorkHours(workEntry);
    const standbyTravelHours = this.timeCalculator.calculateStandbyTravelHours(workEntry);
    
    if (standbyWorkHours === 0 && standbyTravelHours === 0) {
      return {
        standbyWorkPay: 0,
        standbyTravelPay: 0
      };
    }

    const baseRate = contract.hourlyRate;
    const travelCompensationRate = settings.travelCompensationRate || 1.0;
    
    // Calcolo retribuzione lavoro reperibilità con maggiorazioni CCNL
    let standbyWorkPay = 0;
    if (standbyWorkHours > 0) {
      // Qui dovrebbe essere implementata la logica dettagliata per le fasce orarie
      // Per ora usiamo una semplificazione
      standbyWorkPay = standbyWorkHours * baseRate * 1.25; // Maggiorazione base reperibilità
    }
    
    // Calcolo retribuzione viaggio reperibilità
    let standbyTravelPay = 0;
    if (standbyTravelHours > 0) {
      standbyTravelPay = standbyTravelHours * baseRate * travelCompensationRate;
    }

    return {
      standbyWorkPay,
      standbyTravelPay,
      // Aggiunte per compatibilità con Dashboard
      workHours: {
        ordinary: standbyWorkHours || 0
      },
      travelHours: {
        ordinary: standbyTravelHours || 0
      }
    };
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
    
    console.log(`[StandbyCalculator] Verifica reperibilità per ${dateStr}:`, {
        manuallyActivated: isManuallyActivated,
        manuallyDeactivated: isManuallyDeactivated,
        inCalendar: isInCalendar,
        standbyEnabled: standbySettings.enabled,
        standbyDays: standbyDays ? Object.keys(standbyDays).length : 0
    });
    
    // Se disattivato manualmente, ignora le impostazioni da calendario
    return isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
  }

  /**
   * Calcola il breakdown dettagliato della reperibilità
   */
  calculateStandbyBreakdown(workEntry, settings) {
    // Implementazione del breakdown dettagliato delle fasce orarie reperibilità
    // Per ora una versione semplificata
    const isStandbyDay = this.isStandbyDay(workEntry, settings);
    const standbyAllowance = this.calculateStandbyAllowance(workEntry, settings);
    const standbyWork = this.calculateStandbyWorkEarnings(workEntry, settings, settings.contract);
    
    return {
      dailyIndemnity: standbyAllowance,
      workHours: {},
      travelHours: {},
      workEarnings: {},
      travelEarnings: {},
      totalEarnings: standbyAllowance + standbyWork.standbyWorkPay + standbyWork.standbyTravelPay
    };
  }
}

export default StandbyCalculator;
