import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/DatabaseService';
import DatabaseHealthService from '../services/DatabaseHealthService';
import { useCalculationService } from './useCalculationService';
import { useVacationAutoCompile } from './useVacationAutoCompile';
import { useWelcome } from './useWelcome';
import { DEFAULT_SETTINGS, CCNL_CONTRACTS } from '../constants';
import { applyScheduledCCNLIncrements } from '../services/CCNLUpdateService';
import { CCNL_2025_2026_INCREMENTS } from '../constants';
import { invalidateAIContextCache } from '../services/AIContextManager';

export { useCalculationService, useVacationAutoCompile, useWelcome };

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      await DatabaseService.ensureInitialized();
      
      // Initialize default settings if not exists OR migrate old structure
      const existingSettings = await DatabaseService.getSetting('appSettings');
      if (!existingSettings) {
        console.log('🆕 Primo avvio - impostazioni default');
        await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
      } else {
        // Verifica integrità del contratto
        const contractValid = existingSettings.contract && 
                             typeof existingSettings.contract === 'object' &&
                             existingSettings.contract.monthlySalary &&
                             existingSettings.contract.overtimeRates;
        
        if (!contractValid) {
          console.log('🚨 Contratto corrotto - reset completo');
          await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
        } else {
          // Migrazione: aggiungi netCalculation se non esiste o ha struttura vecchia
          let needsUpdate = false;
          const updatedSettings = { ...existingSettings };
        
        if (!existingSettings.netCalculation) {
          updatedSettings.netCalculation = {
            method: existingSettings.netCalculationMethod || 'irpef',
            customDeductionRate: existingSettings.customNetPercentage || 32,
            useActualAmount: false // Default: usa stima annuale
          };
          needsUpdate = true;
        } else if (existingSettings.netCalculation.useActualAmount === undefined) {
          // Migrazione: aggiungi useActualAmount se manca
          updatedSettings.netCalculation = {
            ...existingSettings.netCalculation,
            useActualAmount: false
          };
          needsUpdate = true;
        }

        // Migrazione: aggiungi preferenza visualizzazione giorni speciali se mancante
        if (updatedSettings.showEffectiveEarningsOnSpecialNoWorkDays === undefined) {
          updatedSettings.showEffectiveEarningsOnSpecialNoWorkDays = DEFAULT_SETTINGS.showEffectiveEarningsOnSpecialNoWorkDays;
          needsUpdate = true;
        }

        // 🍽️ Migrazione: rimborsi pasti cash standard incrementali
        // Nuovo formato: array di importi rimborsati nel tempo.
        if (updatedSettings.mealCashStandardReimbursements === undefined) {
          const legacyTotal = Number(existingSettings.mealCashStandardReimbursed || 0);
          if (Number.isFinite(legacyTotal) && legacyTotal !== 0) {
            updatedSettings.mealCashStandardReimbursements = [legacyTotal];
          } else {
            updatedSettings.mealCashStandardReimbursements = [];
          }
          needsUpdate = true;
        }
        
        // Pulisci le vecchie proprietà se esistono
        if (existingSettings.netCalculationMethod !== undefined) {
          delete updatedSettings.netCalculationMethod;
          needsUpdate = true;
        }
        if (existingSettings.customNetPercentage !== undefined) {
          delete updatedSettings.customNetPercentage;
          needsUpdate = true;
        }
        
        // 🔄 MIGRAZIONE NUOVE LOGICHE VIAGGIO
        console.log('🔍 DEBUG - Controllo migrazione viaggio, travelHoursSetting attuale:', existingSettings.travelHoursSetting);
        if (existingSettings.travelHoursSetting) {
          const oldSetting = existingSettings.travelHoursSetting;
          const oldSettings = ['TRAVEL_SEPARATE', 'EXCESS_AS_TRAVEL', 'EXCESS_AS_OVERTIME', 'AS_WORK', 'MULTI_SHIFT_OPTIMIZED'];
          console.log('🔍 DEBUG - oldSetting:', oldSetting, ', è nelle vecchie?', oldSettings.includes(oldSetting));
          
          // Controlla se l'impostazione attuale è una di quelle vecchie
          if (oldSettings.includes(oldSetting)) {
            let newSetting = 'TRAVEL_RATE_EXCESS'; // Default
            
            if (oldSetting === 'TRAVEL_SEPARATE') {
              newSetting = 'TRAVEL_RATE_ALL';
            } else if (oldSetting === 'EXCESS_AS_TRAVEL') {
              newSetting = 'TRAVEL_RATE_EXCESS';
            } else if (oldSetting === 'EXCESS_AS_OVERTIME') {
              newSetting = 'OVERTIME_EXCESS';
            } else if (oldSetting === 'AS_WORK') {
              newSetting = 'TRAVEL_RATE_EXCESS'; // Migra a logica più sensata
            } else if (oldSetting === 'MULTI_SHIFT_OPTIMIZED') {
              newSetting = 'TRAVEL_RATE_EXCESS';
              updatedSettings.multiShiftTravelAsWork = true; // Abilita opzione multi-turno
            }
            
            updatedSettings.travelHoursSetting = newSetting;
            needsUpdate = true;
            
            console.log(`🔄 Migrazione viaggio: ${oldSetting} → ${newSetting}${updatedSettings.multiShiftTravelAsWork ? ' + multi-turno' : ''}`);
          }
        }
        
        // Aggiungi nuove opzioni se mancano
        if (updatedSettings.multiShiftTravelAsWork === undefined) {
          updatedSettings.multiShiftTravelAsWork = false;
          needsUpdate = true;
        }
        
          if (needsUpdate) {
            console.log('🔄 Migrazione impostazioni...');
            await DatabaseService.setSetting('appSettings', updatedSettings);
          }
        }
      }
      
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Database initialization failed:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isInitialized,
    isLoading,
    error,
    retryInit: initializeDatabase
  };
};

export const useWorkEntries = (year, month, showAllEntries = false) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const minRetryInterval = 2000; // 2 secondi

  const loadEntries = async (forceLoad = false) => {
    // Prevenzione spam di chiamate
    const now = Date.now();
    if (!forceLoad && now - lastLoadTime < minRetryInterval) {
      console.log('LoadEntries: Troppo presto per ricaricare, saltando...');
      return;
    }

    // Limite retry per prevenire loop infinito
    if (retryCount >= maxRetries) {
      console.log('LoadEntries: Limite retry raggiunto, fermando...');
      setError(new Error('Troppi tentativi di ricaricamento falliti'));
      return;
    }

    try {
      console.log(`Loading work entries${showAllEntries ? ' (all history)' : ` for ${year}-${month}`}... (attempt ${retryCount + 1})`);
      setIsLoading(true);
      setLastLoadTime(now);
      
      let workEntries;
      if (showAllEntries) {
        // Carica tutti gli inserimenti senza filtro per mese/anno
        workEntries = await DatabaseService.getAllWorkEntries();
        console.log(`Loaded ${workEntries.length} work entries (all history)`);
      } else {
        workEntries = await DatabaseService.getWorkEntries(year, month);
        console.log(`Loaded ${workEntries.length} work entries for ${year}-${month}`);
      }
      
      setEntries(workEntries);
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading work entries:', err);
      setRetryCount(prev => prev + 1);
      
      // Log dell'errore nel servizio di salute
      await DatabaseHealthService.logDatabaseError('loadEntries', err);
      
      if (retryCount + 1 >= maxRetries) {
        setError(new Error(`Caricamento fallito dopo ${maxRetries} tentativi: ${err.message}`));
        setEntries([]);
      } else {
        // Retry con backoff esponenziale
        setTimeout(() => {
          loadEntries(true);
        }, 1000 * Math.pow(2, retryCount));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (year && month) {
      setRetryCount(0); // Reset retry count on new params
      loadEntries(true);
    }
  }, [year, month]);
  const calculationService = useCalculationService();

  const addEntry = async (workEntry) => {
    try {
      const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      const earnings = await calculationService.calculateDailyEarnings(workEntry, settings);
      
      const entryWithEarnings = {
        ...workEntry,
        totalEarnings: earnings.total
      };
      
      const id = await DatabaseService.insertWorkEntry(entryWithEarnings);
      await loadEntries(true); // Force reload entries
      return id;
    } catch (err) {
      console.error('Error adding work entry:', err);
      throw err;
    }
  };

  const updateEntry = async (id, workEntry) => {
    try {
      const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      const earnings = await calculationService.calculateDailyEarnings(workEntry, settings);
      
      const entryWithEarnings = {
        ...workEntry,
        totalEarnings: earnings.total
      };
      
      await DatabaseService.updateWorkEntry(id, entryWithEarnings);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error updating work entry:', err);
      throw err;
    }
  };

  const deleteEntry = async (id) => {
    try {
      await DatabaseService.deleteWorkEntry(id);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error deleting work entry:', err);
      throw err;
    }
  };

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: () => loadEntries(true),
    canRetry: retryCount < maxRetries,
    retryCount
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const loadSettings = async (forceLoad = false) => {
    if (retryCount >= maxRetries && !forceLoad) {
      console.log('LoadSettings: Limite retry raggiunto, saltando...');
      return;
    }

    try {
      setIsLoading(true);
      console.log('� HOOK - loadSettings: Caricamento da database... forceLoad:', forceLoad);
      
      // 🚨 RESTORE FIX: Se forceLoad è true, ignora completamente AsyncStorage
      if (forceLoad) {
        console.log('🚨 HOOK - Reload forzato, ignorando AsyncStorage');
      } else {
        // Verifica se abbiamo settings in cache
        try {
          const cachedSettings = await AsyncStorage.getItem('settings');
          if (cachedSettings) {
            const parsed = JSON.parse(cachedSettings);
            console.log('🚨 HOOK - Settings trovati in cache, usando quelli');
            setSettings(parsed);
            setIsLoading(false);
            return;
          }
        } catch (cacheError) {
          console.log('🚨 HOOK - Errore lettura cache:', cacheError.message);
        }
      }
      
  let appSettings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      
      // Allineamento minimi tabellari aggiornati per TUTTI i livelli (se inferiori e senza tariffe personalizzate)
      try {
        const key = appSettings.contract?.key;
        const isCustom = appSettings.contract?.customRatesEnabled === true;
        if (key && CCNL_CONTRACTS[key] && !isCustom) {
          const def = CCNL_CONTRACTS[key];
          const currentMonthly = Number(appSettings.contract?.monthlySalary);
          if (!Number.isNaN(currentMonthly) && currentMonthly < def.monthlySalary) {
            const newMonthly = def.monthlySalary;
            const workingDays = appSettings.contract.workingDaysPerMonth || def.workingDaysPerMonth || 26;
            const updatedContract = {
              ...appSettings.contract,
              monthlySalary: newMonthly,
              dailyRate: parseFloat((newMonthly / workingDays).toFixed(2)),
              hourlyRate: parseFloat((newMonthly / 173).toFixed(2)),
              lastUpdated: def.lastUpdated,
              source: (def.source || 'CCNL Unionmeccanica Confapi') + ' (allineato minimi)'
            };
            appSettings = { ...appSettings, contract: updatedContract };
            await DatabaseService.setSetting('appSettings', appSettings);
            await AsyncStorage.setItem('settings', JSON.stringify(appSettings));
            try {
              const levelName = def.name?.split(' - ').pop() || key.replace('METALMECCANICO_PMI_', 'Livello ');
              Alert.alert('Minimi CCNL aggiornati', `${levelName} allineato a € ${newMonthly.toFixed(2)}.`);
            } catch {}
          }
        }
      } catch (e) {
        console.log('⚠️ HOOK - Errore allineamento minimi CCNL:', e?.message);
      }

      // Adeguamenti automatici CCNL (se attivi)
      try {
        if (appSettings.autoUpdateCCNLIncrements && appSettings.contract?.key) {
          const key = appSettings.contract.key;
          const applied = appSettings.ccnlAppliedIncrements?.[key] || [];
          const { contract: updatedContract, updated } = applyScheduledCCNLIncrements(appSettings.contract, undefined, applied);
          if (updated) {
            // Marca come applicate tutte le decorrenze <= oggi non ancora applicate
            const today = new Date().toISOString().slice(0,10);
            const pending = Object.keys(CCNL_2025_2026_INCREMENTS[key] || {}).filter(d => d <= today && !applied.includes(d) && !(key==='METALMECCANICO_PMI_L5' && d==='2025-06-01'));
            const newApplied = [...applied, ...pending];
            appSettings = { 
              ...appSettings, 
              contract: updatedContract,
              ccnlAppliedIncrements: { 
                ...(appSettings.ccnlAppliedIncrements || {}),
                [key]: newApplied
              }
            };
            // Persisti l'adeguamento per coerenza tra riavvii
            await DatabaseService.setSetting('appSettings', appSettings);
            await AsyncStorage.setItem('settings', JSON.stringify(appSettings));
            console.log('✅ HOOK - Adeguamento automatico CCNL applicato:', updatedContract.monthlySalary);
            try {
              const dates = pending.join(', ');
              const euro = (n) => `€ ${Number(n).toFixed(2)}`;
              Alert.alert(
                'Adeguamento CCNL applicato',
                `Retribuzione mensile aggiornata a ${euro(updatedContract.monthlySalary)}${dates ? `\nDecorrenze: ${dates}` : ''}`
              );
            } catch {}
          }
        }
      } catch (e) {
        console.log('⚠️ HOOK - Errore adeguamento automatico CCNL:', e?.message);
      }

      // 🚨 DEBUG CONTRATTO dal database
      const contractType = appSettings.contract_type || 'unknown';
      const dailyRate = appSettings.daily_rate || 'non trovato';
      console.log('🚨 HOOK - Database contratto:', contractType, 'tariffa:', dailyRate);
      
      // Sincronizza anche AsyncStorage per le notifiche
      await AsyncStorage.setItem('settings', JSON.stringify(appSettings));
      console.log('� HOOK - Settings sincronizzate in AsyncStorage');
      
      console.log('🔍 HOOK - loadSettings: Dati caricati dal database');
      if (appSettings?.netCalculation) {
        console.log('- NetCalculation trovato:', JSON.stringify(appSettings.netCalculation, null, 2));
      } else {
        console.log('- NetCalculation NON trovato, usando default');
      }
      
      // Log delle impostazioni di viaggio
      console.log('🚗 HOOK - Travel Settings:', {
        travelHoursSetting: appSettings.travelHoursSetting,
        travelCompensationRate: appSettings.travelCompensationRate,
        hasFullSettings: !!appSettings
      });
      
      setSettings(appSettings);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('❌ HOOK - Error loading settings:', err);
      await DatabaseHealthService.logDatabaseError('loadSettings', err);
      setRetryCount(prev => prev + 1);
      
      if (retryCount + 1 >= maxRetries) {
        setError(new Error(`Caricamento impostazioni fallito dopo ${maxRetries} tentativi: ${err.message}`));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(true);
    
    // 🚨 RESTORE FIX: Listener per ricaricamenti forzati dopo ripristino
    const interval = setInterval(async () => {
      try {
        const cacheSettings = await AsyncStorage.getItem('settings');
        if (!cacheSettings && settings && Object.keys(settings).length > 0) {
          // Cache è stata pulita ma abbiamo ancora impostazioni caricate - ricarica
          console.log('🔄 HOOK - Cache pulita rilevata, forzando reload...');
          loadSettings(true);
        }
      } catch (error) {
        // Ignora errori di controllo cache
      }
    }, 2000); // Controlla ogni 2 secondi

    return () => clearInterval(interval);
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      console.log('🔧 HOOK - updateSettings chiamato');
      console.log('- Nuove impostazioni da salvare:', JSON.stringify(newSettings.netCalculation, null, 2));
      
      // Salva nel database SQLite
      await DatabaseService.setSetting('appSettings', newSettings);
      
      // Salva anche in AsyncStorage per le notifiche
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
      console.log('✅ HOOK - Settings salvate anche in AsyncStorage per notifiche');
      
      // 🔄 CRITICO: Invalida il cache del AI Assistant affinché ricarichi i valori reali
      invalidateAIContextCache();
      console.log('🔄 HOOK - AI Context cache invalidato');
      
      setSettings(newSettings);
      setRetryCount(0);
      
      console.log('✅ HOOK - updateSettings completato');
      console.log('- Settings state aggiornato:', JSON.stringify(newSettings.netCalculation, null, 2));
    } catch (err) {
      console.error('❌ HOOK - Error updating settings:', err);
      throw err;
    }
  };

  const updatePartialSettings = async (partialSettings) => {
    try {
      // ⚠️ IMPORTANTE: non usare solo lo state `settings` come base.
      // All'avvio `settings` parte da DEFAULT_SETTINGS e `isLoading` può essere false:
      // se una schermata chiama updatePartialSettings troppo presto rischiamo di sovrascrivere
      // le impostazioni reali nel DB con i default.
      // Per sicurezza, prendiamo sempre la versione corrente dal DB come base.
      const baseSettings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);

      // Perform deep merge for nested settings we know can be partially updated
      const updatedSettings = { ...(baseSettings || DEFAULT_SETTINGS) };

      // If standbySettings provided, merge its fields instead of replacing whole object
      if (partialSettings.standbySettings) {
        updatedSettings.standbySettings = {
          ...((baseSettings?.standbySettings) || DEFAULT_SETTINGS.standbySettings), // Usa i default se non esiste
          ...(partialSettings.standbySettings || {})
        };
      }

      // Merge other top-level partials shallowly
      const shallowKeys = Object.keys(partialSettings).filter(k => k !== 'standbySettings');
      for (const k of shallowKeys) {
        updatedSettings[k] = partialSettings[k];
      }

      await updateSettings(updatedSettings);
    } catch (err) {
      console.error('Error updating partial settings:', err);
      throw err;
    }
  };

  const reloadSettings = () => loadSettings(true);

  return {
    settings,
    isLoading,
    error,
    reloadSettings,
    updateSettings,
    updatePartialSettings,
    refreshSettings: () => {
      console.log('🔄 HOOK - refreshSettings chiamato, ricaricando da database...');
      return loadSettings(true);
    },
    canRetry: retryCount < maxRetries
  };
};

export const useStandbyCalendar = (year, month) => {
  const [standbyDays, setStandbyDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStandbyDays = async () => {
    try {
      setIsLoading(true);
      const days = await DatabaseService.getStandbyDays(year, month);
      setStandbyDays(days);
      setError(null);
    } catch (err) {
      console.error('Error loading standby days:', err);
      setError(err);
      setStandbyDays([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (year && month) {
      loadStandbyDays();
    }
  }, [year, month]);

  const toggleStandbyDay = async (date) => {
    try {
      const existingDay = standbyDays.find(day => day.date === date);
      const newStandbyStatus = !existingDay?.is_standby;
      
      await DatabaseService.setStandbyDay(date, newStandbyStatus);
      await loadStandbyDays(); // Reload standby days
      
  // Aggiorna le notifiche di reperibilità quando il calendario cambia
  const SuperNotificationService = require('../services/SuperNotificationService');
  await SuperNotificationService.scheduleNotifications(await SuperNotificationService.getSettings(), true);
      
    } catch (err) {
      console.error('Error toggling standby day:', err);
      throw err;
    }
  };

  const isStandbyDay = (date) => {
    return standbyDays.some(day => day.date === date && day.is_standby);
  };

  return {
    standbyDays,
    isLoading,
    error,
    toggleStandbyDay,
    isStandbyDay,
    refreshStandbyDays: loadStandbyDays
  };
};

export const useMonthlySummary = (year, month) => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { settings } = useSettings();
  const calculationService = useCalculationService();
  const [entries, setEntries] = useState([]);
  const minRefreshInterval = 1000; // 1 secondo
  
  // Carica gli inserimenti del mese
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoading(true);
        if (!year || !month) return;
        
        // Usa la funzione getWorkEntries che richiede year e month
        const data = await DatabaseService.getWorkEntries(year, month);
        setEntries(data || []);
      } catch (err) {
        console.error('Error loading month entries:', err);
        setError(err);
      }
    };
    
    loadEntries();
  }, [year, month]);
  
  // Calcola il riepilogo quando entrambi entries e settings sono pronti
  useEffect(() => {
    const calculateSummary = async () => {
      try {
        if (!entries || !settings || !Array.isArray(entries) || !year || !month) {
          console.log('Skip calculation: missing data or invalid parameters', { 
            hasEntries: Boolean(entries), 
            isArray: Array.isArray(entries), 
            entriesLength: entries ? entries.length : 0,
            hasSettings: Boolean(settings),
            year: year,
            month: month
          });
          return;
        }
        
        const monthlySummary = calculationService.calculateMonthlySummary(entries, settings, month, year);
        setSummary(monthlySummary);
        setError(null);
      } catch (err) {
        console.error('Error calculating monthly summary:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateSummary();
  }, [entries, settings, calculationService]);

  const refreshSummary = async (forceRefresh = false) => {
    // Prevenzione spam di refresh
    const now = Date.now();
    if (!forceRefresh && now - lastRefreshTime < minRefreshInterval) {
      console.log('Dashboard: Refresh troppo frequente, saltando...');
      return;
    }

    try {
      console.log('Dashboard: Refreshing summary and entries...');
      setLastRefreshTime(now);
      setIsLoading(true);
      
      // Reload entries usando getWorkEntries che richiede year e month
      const data = await DatabaseService.getWorkEntries(year, month);
      setEntries(data || []);
    } catch (err) {
      console.error('Error refreshing monthly summary:', err);
      setError(err);
    }
  };

  // Può effettuare il refresh
  const canRefresh = !isLoading;

  return { summary, isLoading, error, refreshSummary, canRefresh };
};
