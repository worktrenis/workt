// 🎉 WELCOME HOOK - Gestisce la logica del messaggio di benvenuto
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_STORAGE_KEYS = {
  COMPLETED: 'welcome_tutorial_completed',
  SKIPPED: 'welcome_tutorial_skipped',
  FIRST_LAUNCH: 'app_first_launch_detected'
};

export const useWelcome = () => {
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkWelcomeStatus();
  }, []);

  const checkWelcomeStatus = async () => {
    try {
      setIsLoading(true);

      // Controlla se l'utente ha già completato o saltato il tutorial
      const [completed, skipped, firstLaunch] = await Promise.all([
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.COMPLETED),
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.SKIPPED),
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.FIRST_LAUNCH)
      ]);

      console.log('🎉 Welcome status:', { completed, skipped, firstLaunch });

      // Se ha già fatto il tutorial, non mostrarlo
      if (completed === 'true' || skipped === 'true') {
        setShouldShowWelcome(false);
        setIsLoading(false);
        return;
      }

      // Se non è mai stata rilevata una prima installazione, controllala
      if (!firstLaunch) {
        const isFirstTime = await checkIfFirstTimeUser();
        
        if (isFirstTime) {
          // Marca come prima installazione e mostra il welcome
          await AsyncStorage.setItem(WELCOME_STORAGE_KEYS.FIRST_LAUNCH, 'true');
          setShouldShowWelcome(true);
        } else {
          // Non è la prima volta, ma il tutorial non è mai stato completato
          // Potrebbe essere un utente esistente prima dell'introduzione del tutorial
          await AsyncStorage.setItem(WELCOME_STORAGE_KEYS.COMPLETED, 'true');
          setShouldShowWelcome(false);
        }
      } else {
        // Prima installazione già rilevata, mostra il welcome
        setShouldShowWelcome(true);
      }

    } catch (error) {
      console.error('Errore controllo welcome status:', error);
      setShouldShowWelcome(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfFirstTimeUser = async () => {
    try {
      // Controlla se ci sono già dati dell'app (inserimenti di lavoro, impostazioni, ecc.)
      const keys = await AsyncStorage.getAllKeys();
      
      // Se ci sono già chiavi dell'app, non è la prima volta
      const appDataKeys = keys.filter(key => 
        key.includes('work_entry') || 
        key.includes('settings') ||
        key.includes('contract') ||
        key.includes('backup') ||
        key.includes('last_known_build_version') ||
        key.includes('user_profile')
      );

      console.log('🔍 App data keys found:', appDataKeys.length);
      
      // Se ha meno di 3 chiavi dell'app, probabilmente è un nuovo utente
      return appDataKeys.length < 3;

    } catch (error) {
      console.error('Errore controllo primo utente:', error);
      // In caso di errore, assume sia un nuovo utente per sicurezza
      return true;
    }
  };

  const markWelcomeCompleted = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_STORAGE_KEYS.COMPLETED, 'true');
      setShouldShowWelcome(false);
      console.log('✅ Tutorial di benvenuto completato');
    } catch (error) {
      console.error('Errore salvataggio tutorial completato:', error);
    }
  };

  const markWelcomeSkipped = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_STORAGE_KEYS.SKIPPED, 'true');
      setShouldShowWelcome(false);
      console.log('⏭️ Tutorial di benvenuto saltato');
    } catch (error) {
      console.error('Errore salvataggio tutorial saltato:', error);
    }
  };

  const resetWelcome = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.COMPLETED),
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.SKIPPED),
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.FIRST_LAUNCH)
      ]);
      setShouldShowWelcome(true);
      console.log('🔄 Welcome status resettato');
    } catch (error) {
      console.error('Errore reset welcome:', error);
    }
  };

  const forceShowWelcome = () => {
    setShouldShowWelcome(true);
    console.log('🎯 Welcome forzato per test');
  };

  return {
    shouldShowWelcome,
    isLoading,
    markWelcomeCompleted,
    markWelcomeSkipped,
    resetWelcome,
    forceShowWelcome,
    checkWelcomeStatus
  };
};

// Funzione globale per test e debug
if (typeof global !== 'undefined') {
  global.resetWelcome = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.COMPLETED),
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.SKIPPED),
        AsyncStorage.removeItem(WELCOME_STORAGE_KEYS.FIRST_LAUNCH)
      ]);
      console.log('🔄 Welcome resettato completamente - riavvia l\'app per vedere il tutorial');
      return true;
    } catch (error) {
      console.error('❌ Errore reset welcome:', error);
      return false;
    }
  };
  
  global.checkWelcomeData = async () => {
    try {
      const [completed, skipped, firstLaunch] = await Promise.all([
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.COMPLETED),
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.SKIPPED),
        AsyncStorage.getItem(WELCOME_STORAGE_KEYS.FIRST_LAUNCH)
      ]);
      
      console.log('📊 Welcome data status:', {
        completed: completed === 'true',
        skipped: skipped === 'true',
        firstLaunch: firstLaunch === 'true'
      });
      
      return { completed, skipped, firstLaunch };
    } catch (error) {
      console.error('❌ Errore controllo welcome data:', error);
      return null;
    }
  };
  
  console.log('🎉 Welcome commands loaded!');
  console.log('🎉 Commands: resetWelcome(), checkWelcomeData()');
}

export default useWelcome;
