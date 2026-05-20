/**
 * utilities/earningsHelper.js
 * Funzioni helper per la gestione unificata dei calcoli dei guadagni
 */
// Non importiamo più CalculationService, verrà passato come parametro

// Cache per memorizzare i risultati dei calcoli e migliorare le performance
const breakdownCache = new Map();

// Funzione per generare una chiave di cache basata su entry e settings
const generateCacheKey = (item, settings) => {
  const itemKey = item.id ? `${item.id}-${item.date}` : JSON.stringify(item);
  const settingsKey = JSON.stringify({
    hourlyRate: settings?.contract?.hourlyRate,
    dailyRate: settings?.contract?.dailyRate,
    travelRate: settings?.travelCompensationRate,
    standbyRate: settings?.standbySettings?.dailyAllowance,
  });
  return `${itemKey}-${settingsKey}`;
};

/**
 * Crea un oggetto work entry dal modello di dati nell'archivio
 * @param {Object} item - Entry dal database
 * @returns {Object} - Work entry nel formato atteso dal CalculationService
 */
export const createWorkEntryFromData = (entry, calculationServiceInstance = null) => {
  // Se riceviamo un oggetto con item (da renderItem di FlatList/SectionList)
  // prendiamo l'entry dall'item
  const workEntryData = entry.item || entry;

  // Log per debug
  // console.log('Input entry:', JSON.stringify(workEntryData, null, 2));
  
  // Crea workEntry con i valori corretti
  const workEntry = {
    date: workEntryData.date,
    siteName: workEntryData.siteName || workEntryData.site_name || '',
    vehicleDriven: workEntryData.vehicleDriven || workEntryData.vehicle_driven || '',
    departureCompany: workEntryData.departureCompany || workEntryData.departure_company || '',
    arrivalSite: workEntryData.arrivalSite || workEntryData.arrival_site || '',
    workStart1: workEntryData.workStart1 || workEntryData.work_start_1 || '',
    workEnd1: workEntryData.workEnd1 || workEntryData.work_end_1 || '',
    workStart2: workEntryData.workStart2 || workEntryData.work_start_2 || '',
    workEnd2: workEntryData.workEnd2 || workEntryData.work_end_2 || '',
    departureReturn: workEntryData.departureReturn || workEntryData.departure_return || '',
    arrivalCompany: workEntryData.arrivalCompany || workEntryData.arrival_company || '',
    // Parse interventi se è una stringa JSON con gestione errori migliorata
    interventi: (() => {
      if (typeof workEntryData.interventi === 'string') {
        try {
          // 🚨 FIX PARSING: Pulizia dati corrotti prima del parsing
          let cleanData = workEntryData.interventi.trim();
          
          // Se la stringa non inizia con [ o è vuota, restituisci array vuoto
          if (!cleanData || (!cleanData.startsWith('[') && !cleanData.startsWith('{'))) {
            // console.warn('🚨 PARSING: Dati interventi non validi:', cleanData);
            return [];
          }
          
          const parsed = JSON.parse(cleanData);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          // console.warn('🚨 PARSING: Errore parsing interventi:', error);
          // console.warn('🚨 PARSING: Dati originali:', workEntryData.interventi);
          
          // Tentativo di riparazione automatica per formati corrotti
          try {
            // console.warn('🚨 PARSING: Tentativo riparazione automatica...');
            
            let cleaned = String(workEntryData.interventi)
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Rimuovi caratteri di controllo
              .replace(/\n/g, ' ')
              .replace(/\r/g, ' ')
              .replace(/\t/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Gestione formato specifico: [{departure_company=19:25, arrival_site=22:25...}]
            if (cleaned.includes('=') && cleaned.includes('{') && cleaned.includes('}')) {
              // console.warn('🔧 PARSING: Rilevato formato oggetto, tentativo conversione...');
              
              // Converto il formato = in formato JSON
              let jsonString = cleaned
                .replace(/\{([^}]+)\}/g, (match, content) => {
                  // Processa il contenuto dell'oggetto
                  let pairs = content.split(',').map(pair => {
                    let [key, value] = pair.split('=');
                    if (key && value !== undefined) {
                      return `"${key.trim()}":"${value.trim()}"`;
                    } else if (key) {
                      return `"${key.trim()}":""`;
                    }
                    return '';
                  }).filter(pair => pair);
                  
                  return `{${pairs.join(',')}}`;
                });
              
              // console.warn('🔧 PARSING: JSON convertito:', jsonString);
              const repaired = JSON.parse(jsonString);
              // console.log('✅ PARSING: Conversione formato oggetto riuscita');
              return Array.isArray(repaired) ? repaired : [repaired];
            }
            
            // Se non è il formato oggetto, prova pulizia standard
            if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
              const repaired = JSON.parse(cleaned);
              // console.log('✅ PARSING: Riparazione automatica riuscita');
              return Array.isArray(repaired) ? repaired : [];
            }
            
            // console.warn('🚨 PARSING: Formato non riconosciuto, ritorno array vuoto');
            return [];
            
          } catch (secondError) {
            // console.warn('🚨 PARSING: Anche la riparazione automatica è fallita:', secondError.message);
            return [];
          }
        }
      }
      return Array.isArray(workEntryData.interventi) ? workEntryData.interventi : [];
    })(),
    // 🚀 MULTI-TURNO: Parse viaggi se è una stringa JSON
    viaggi: (() => {
      if (typeof workEntryData.viaggi === 'string') {
        try {
          const parsed = JSON.parse(workEntryData.viaggi);
          // console.log(`🔥 EARNINGSHELPER: Parsed viaggi per entry ${workEntryData.id}:`, {
          //   viaggiRaw: workEntryData.viaggi,
          //   viaggiParsed: parsed,
          //   viaggiCount: parsed.length
          // });
          return parsed;
        } catch (error) {
          console.warn('🔥 EARNINGSHELPER: Errore parsing viaggi:', error);
          return [];
        }
      }
      return workEntryData.viaggi || [];
    })(),
    // I campi pasti sono importi REAL (non flag booleani)
    mealLunchVoucher: parseFloat(workEntryData.mealLunchVoucher ?? workEntryData.meal_lunch_voucher ?? 0),
    mealLunchCash: parseFloat(workEntryData.mealLunchCash ?? workEntryData.meal_lunch_cash ?? 0),
    mealDinnerVoucher: parseFloat(workEntryData.mealDinnerVoucher ?? workEntryData.meal_dinner_voucher ?? 0),
    mealDinnerCash: parseFloat(workEntryData.mealDinnerCash ?? workEntryData.meal_dinner_cash ?? 0),
    travelAllowance: workEntryData.travelAllowance ?? workEntryData.travel_allowance === 1 ? 1 : 0,
    travelAllowancePercent: parseFloat(workEntryData.travelAllowancePercent ?? workEntryData.travel_allowance_percent ?? 1.0),
    trasfertaManualOverride: workEntryData.trasfertaManualOverride ?? workEntryData.trasferta_manual_override === 1,
    isStandbyDay: workEntryData.isStandbyDay ?? workEntryData.is_standby_day === 1 ? 1 : 0,
    standbyAllowance: workEntryData.standbyAllowance ?? workEntryData.standby_allowance === 1 ? 1 : 0,
    completamentoGiornata: workEntryData.completamentoGiornata || workEntryData.completamento_giornata || 'nessuno',
    dayType: workEntryData.dayType || workEntryData.day_type || 'lavorativa',
    // Campi per giorni fissi
    isFixedDay: (workEntryData.isFixedDay ?? workEntryData.is_fixed_day === 1) || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(workEntryData.dayType || workEntryData.day_type),
    fixedEarnings: parseFloat(workEntryData.fixedEarnings ?? workEntryData.fixed_earnings ?? 0)
  };

  // Log per debug risultato finale
  // console.log('Created workEntry:', JSON.stringify(workEntry, null, 2));
  
  return workEntry;
};

/**
 * Garantisce che le impostazioni abbiano tutti i valori di default necessari
 * @param {Object} settings - Impostazioni originali 
 * @returns {Object} - Impostazioni con valori di default
 */
export const getSafeSettings = (settings) => {
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
      dailyIndemnity: 7.5
    },
    mealAllowances: {
      lunch: { voucherAmount: 5.29 },
      dinner: { voucherAmount: 5.29 }
    }
  };
  
  // Merge settings 
  return {
    ...defaultSettings,
    ...(settings || {}),
    contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
    standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
    mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
  };
};

/**
 * Calcola il breakdown degli earnings utilizzando lo stesso servizio usato nel form
 * Implementa caching per migliorare le performance e gestione degli errori
 * @param {Object} item - Elemento dal database
 * @param {Object} settings - Impostazioni dell'applicazione
 * @param {Object} calculationServiceInstance - Istanza del servizio di calcolo
 * @returns {Object} - Breakdown calcolato
 */
export const calculateItemBreakdown = (item, settings, calculationServiceInstance = null) => {
  try {
    // Genera una chiave di cache unica per questa combinazione item+settings
    const cacheKey = generateCacheKey(item, settings);
    
    // Verifica se il risultato è già in cache
    if (breakdownCache.has(cacheKey)) {
      return breakdownCache.get(cacheKey);
    }
    
    // Se non in cache, calcola normalmente
    const workEntry = createWorkEntryFromData(item, calculationServiceInstance);
    const safeSettings = getSafeSettings(settings);
    
    // Calcola con gestione degli errori
    let result;
    try {
      if (calculationServiceInstance) {
        result = calculationServiceInstance.calculateEarningsBreakdown(workEntry, safeSettings);
      } else {
        // Fallback, ma non dovrebbe mai accadere
        console.warn('CalculationService non fornito, impossibile calcolare il breakdown');
        throw new Error('CalculationService non fornito');
      }
    } catch (calcError) {
      console.warn('Errore nel calcolo del breakdown:', calcError);
      // Restituisci un breakdown vuoto ma valido in caso di errore di calcolo
      result = {
        ordinary: { hours: {}, earnings: {}, total: 0 },
        standby: { workHours: {}, workEarnings: { total: 0 }, travelHours: {}, travelEarnings: { total: 0 } },
        allowances: { travel: 0, meal: 0, standby: 0 },
        total: 0
      };
    }
    
    // Salva in cache il risultato
    breakdownCache.set(cacheKey, result);
    
    // Limita la dimensione della cache (max 100 entries)
    if (breakdownCache.size > 100) {
      const firstKey = breakdownCache.keys().next().value;
      breakdownCache.delete(firstKey);
    }
    
    return result;
  } catch (error) {
    console.error('Errore critico nel calcolo del breakdown:', error);
    // Restituisci un breakdown di fallback
    return {
      ordinary: { hours: {}, earnings: {}, total: 0 },
      standby: { workHours: {}, workEarnings: { total: 0 }, travelHours: {}, travelEarnings: { total: 0 } },
      allowances: { travel: 0, meal: 0, standby: 0 },
      total: 0
    };
  }
};

/**
 * Formatta le ore in un formato leggibile
 * @param {Number} hours - Ore da formattare
 * @returns {String} - Stringa formattata "ore:minuti"
 */
export const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Formatta valori monetari secondo standard italiano
 * @param {Number} value - Valore da formattare
 * @param {Boolean} includeCurrency - Se includere il simbolo €
 * @returns {String} - Stringa formattata (es. "123,45")
 */
export const formatEuroValue = (value, includeCurrency = false) => {
  if (value === undefined || value === null) return '0,00';
  
  const formatted = value.toFixed(2).replace('.', ',');
  return includeCurrency ? `${formatted} €` : formatted;
};

/**
 * Pulisce la cache dei calcoli (da usare quando cambiano le impostazioni)
 */
export const clearBreakdownCache = () => {
  breakdownCache.clear();
};
