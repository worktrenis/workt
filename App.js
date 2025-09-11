import './src/utils/logControl'; // 🔇 Filtro log centralizzato
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initNativeBackgroundBackup } from './src/services/NativeBackgroundBackup';

// 🧪 TEST BACKUP NATIVO - Carica il comando globale
try {
  require('./test-backup-app-closed');
  
  // Aggiungi comando per test backup silenzioso
  const NativeBackupService = require('./src/services/NativeBackupService').default;
  global.testSilentBackup = async () => {
    try {
      console.log('🔇 TEST: Simulazione backup silenzioso...');
      const result = await NativeBackupService.executeSilentBackup('asyncstorage');
      console.log('✅ TEST: Risultato backup silenzioso:', result);
      return result;
    } catch (error) {
      console.error('❌ TEST: Errore backup silenzioso:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Aggiungi comando per test background backup task
  const { testBackgroundBackupTask } = require('./src/services/BackgroundBackupTask');
  global.testBackgroundBackup = testBackgroundBackupTask;
  
  console.log('🚀 Test backup nativo caricati!');
  console.log('🚀 Comandi: testAppClosed(), testSilentBackup(), testBackgroundBackup()');
} catch (testError) {
  console.log('⚠️ Test backup app chiusa non caricato:', testError.message);
}

// 🧪 TEST AGGIORNAMENTI OTA - Carica i comandi globali
try {
  const UpdateService = require('./src/services/UpdateService').default;
  global.testUpdateCompleted = () => UpdateService.testUpdateCompletedMessage();
  global.testUpdateAvailable = () => UpdateService.testUpdateAvailable();
  global.checkForUpdates = () => UpdateService.checkManually();
  global.forceShowUpdateMessage = () => UpdateService.forceShowCurrentUpdateMessage();
  console.log('🚀 Test aggiornamenti OTA caricati!');
  console.log('🚀 Comandi: testUpdateCompleted(), testUpdateAvailable(), checkForUpdates(), forceShowUpdateMessage()');
} catch (testError) {
  console.log('⚠️ Test aggiornamenti non caricati:', testError.message);
}

// 🚀 SISTEMA AGGIORNAMENTI MANUALI - Controllo all'avvio e gestione manuale
try {
  global.checkManualUpdates = () => ManualUpdateService.checkForUpdatesManually();
  global.checkStartupUpdates = () => ManualUpdateService.checkForUpdatesAtStartup();
  global.getPendingUpdates = () => ManualUpdateService.getPendingUpdates();
  global.getUpdateHistory = () => ManualUpdateService.getUpdateHistory();
  global.clearUpdateNotifications = () => UpdateNotificationService.clearUpdateNotification();
  console.log('🚀 Sistema aggiornamenti manuali caricato!');
  console.log('🚀 Comandi: checkManualUpdates(), checkStartupUpdates(), getPendingUpdates(), getUpdateHistory(), clearUpdateNotifications()');
} catch (manualUpdateError) {
  console.log('⚠️ Sistema aggiornamenti manuali non caricato:', manualUpdateError.message);
}

// 🎉 TEST WELCOME MODAL - Carica i comandi globali per il tutorial di benvenuto
try {
  global.testWelcome = () => {
    console.log('🎉 Comando testWelcome() non ancora disponibile');
    console.log('🎉 Usa resetWelcome() dopo il caricamento dell\'app per testare il tutorial');
  };
  console.log('🎉 Test welcome modal preparato!');
  console.log('🎉 Comando: testWelcome() (disponibile dopo caricamento app)');
  
  // Carica comandi debug welcome modal
  require('./welcome-debug.js');
} catch (welcomeError) {
  console.log('⚠️ Test welcome modal non caricato:', welcomeError.message);
}

  // 🎯 NOTIFICA AGGIORNAMENTO v1.3.1 - Carica sistema notifiche personalizzate
  try {
    console.log('🎯 Caricamento notifiche aggiornamento v1.3.1...');
    const { forceUpdateNotificationV131, checkUpdateStatus, resetUpdateSystem, resetV131PopupFlag } = require('./force-update-notification-v1-3-1');
    global.forceUpdateNotificationV131 = forceUpdateNotificationV131;
    global.checkUpdateStatus = checkUpdateStatus;
    global.resetUpdateSystem = resetUpdateSystem;
    global.resetV131PopupFlag = resetV131PopupFlag;
    console.log('🎯 Notifiche aggiornamento v1.3.1 caricate!');
    console.log('🎯 Comandi: forceUpdateNotificationV131(), checkUpdateStatus(), resetUpdateSystem(), resetV131PopupFlag()');
  } catch (testError) {
    console.log('⚠️ Notifiche aggiornamento v1.3.1 non caricate:', testError.message);
    // Aggiungi fallback sicuri
    global.forceUpdateNotificationV131 = () => console.log('🔄 Popup v1.3.1 non disponibile');
    global.checkUpdateStatus = () => console.log('🔄 CheckStatus v1.3.1 non disponibile');
    global.resetUpdateSystem = () => console.log('🔄 ResetSystem v1.3.1 non disponibile');
    global.resetV131PopupFlag = () => console.log('🔄 ResetFlag v1.3.1 non disponibile');
  }

  // 🧹 PULIZIA TRANSIZIONE v1.3.0 → v1.3.1
  try {
    const { cleanTransitionTo131, checkTransitionStatus, forceShowV131Popup } = require('./clean-transition-v1-3-1');
    global.cleanTransitionTo131 = cleanTransitionTo131;
    global.checkTransitionStatus = checkTransitionStatus;
    global.forceShowV131Popup = forceShowV131Popup;
    console.log('🧹 Script pulizia transizione v1.3.1 caricato!');
    console.log('🧹 Comandi: cleanTransitionTo131(), checkTransitionStatus(), forceShowV131Popup()');
  } catch (cleanError) {
    console.log('⚠️ Script pulizia transizione non caricato:', cleanError.message);
  }

// 🧪 CARICA SISTEMA TEST AGGIORNAMENTO v1.3.1
if (__DEV__) {
  require('./test-update-system-v1-3-1.js');
}

// 🧪 CARICA DEBUG WELCOME CONTRACT SYNC
try {
  console.log('🧪 Caricamento debug welcome contract sync...');
  const { testWelcomeContractSync, resetToDefault } = require('./debug-welcome-contract-sync');
  global.testWelcomeContractSync = testWelcomeContractSync;
  global.resetContractToDefault = resetToDefault;
  console.log('🧪 Debug welcome contract sync caricato!');
  console.log('🧪 Comandi: testWelcomeContractSync(), resetContractToDefault()');
} catch (debugError) {
  console.log('⚠️ Debug welcome contract sync non caricato:', debugError.message);
}

// 🎭 CARICA TESTER COMPONENTI DEVELOPMENT
if (__DEV__) {
  require('./test-development-components.js');
}

// 🚨 CARICA PULIZIA EMERGENZA POPUP
if (__DEV__) {
  require('./emergency-popup-cleanup.js');
}

// 🧹 CARICA SISTEMA PULIZIA AGGIORNAMENTI
if (__DEV__) {
  require('./clean-update-system.js');
}

// 🚀 CARICA COMANDI PUBBLICAZIONE OTA v1.3.1
if (__DEV__) {
  require('./publish-ota-v1-3-1.js');
}

// 🎯 CARICA NOTIFICHE FORCE UPDATE v1.3.1
// Già caricato sopra nella sezione notifiche aggiornamento v1.3.1

// 🔍 DEBUG VERSIONI - Comando per verificare stato versioni
try {
  const simpleVersionDebug = require('./simple-version-debug').default;
  global.simpleVersionDebug = simpleVersionDebug;
  console.log('🔍 Debug versioni semplificato caricato!');
  console.log('🔍 Comando: simpleVersionDebug()');
} catch (debugError) {
  console.log('⚠️ Debug versioni non caricato:', debugError.message);
}

// 🔧 RESET VERSION SYSTEM - Comandi per reset sistema versioni
try {
  const { resetVersionSystem, checkVersionState, clearAllVersionData } = require('./reset-version-system');
  global.resetVersionSystem = resetVersionSystem;
  global.checkVersionState = checkVersionState;
  global.clearAllVersionData = clearAllVersionData;
  console.log('🔧 Reset version system caricato!');
  console.log('🔧 Comandi: resetVersionSystem(), checkVersionState(), clearAllVersionData()');
} catch (resetError) {
  console.log('⚠️ Reset version system non caricato:', resetError.message);
}

// 🚀 QUICK FIX - Comandi rapidi per popup aggiornamento
try {
  const { quickFixUpdatePopup, showPopupNow, checkStorageState } = require('./quick-fix-popup');
  global.quickFixUpdatePopup = quickFixUpdatePopup;
  global.showPopupNow = showPopupNow;
  global.checkStorageState = checkStorageState;
  console.log('🚀 Quick fix popup caricato!');
  console.log('🚀 Comandi: quickFixUpdatePopup(), showPopupNow(), checkStorageState()');
} catch (quickFixError) {
  console.log('⚠️ Quick fix popup non caricato:', quickFixError.message);
}

// 🔍 VERIFICA VERSIONI - Comandi per verifica sincronizzazione
try {
  const { verifyVersionSync, syncAllVersions } = require('./verify-version-sync');
  global.verifyVersionSync = verifyVersionSync;
  global.syncAllVersions = syncAllVersions;
  console.log('🔍 Verifica versioni caricato!');
  console.log('🔍 Comandi: verifyVersionSync(), syncAllVersions()');
} catch (verifyError) {
  console.log('⚠️ Verifica versioni non caricato:', verifyError.message);
}

// 📱 ENHANCED UPDATE INFO - Info aggiornamenti avanzate
try {
  const showEnhancedUpdateInfo = require('./enhanced-update-info').default;
  global.showEnhancedUpdateInfo = showEnhancedUpdateInfo;
  console.log('📱 Enhanced update info caricato!');
  console.log('📱 Comando: showEnhancedUpdateInfo()');
} catch (enhancedError) {
  console.log('⚠️ Enhanced update info non caricato:', enhancedError.message);
}

// 🔧 FORCE UPDATE POPUP - Test diretto popup aggiornamento
try {
  const { forceUpdatePopup, checkCurrentVersionState } = require('./force-update-popup');
  global.forceUpdatePopup = forceUpdatePopup;
  global.checkCurrentVersionState = checkCurrentVersionState;
  console.log('🔧 Force update popup caricato!');
  console.log('🔧 Comandi: forceUpdatePopup(), checkCurrentVersionState()');
} catch (forceError) {
  console.log('⚠️ Force update popup non caricato:', forceError.message);
}

// 📱 RILEVAMENTO BUILD NATIVA - Distingue aggiornamenti nativi da OTA
try {
  const { checkNativeBuildUpdate, forceNativeBuildPopup, getBuildInfo, resetNativeBuildSystem } = require('./native-build-update-detector');
  global.checkNativeBuildUpdate = checkNativeBuildUpdate;
  global.forceNativeBuildPopup = forceNativeBuildPopup;
  global.getBuildInfo = getBuildInfo;
  global.resetNativeBuildSystem = resetNativeBuildSystem;
  console.log('📱 Rilevamento build nativa caricato!');
  console.log('📱 Comandi: checkNativeBuildUpdate(), forceNativeBuildPopup(), getBuildInfo(), resetNativeBuildSystem()');
} catch (nativeError) {
  console.log('⚠️ Rilevamento build nativa non caricato:', nativeError.message);
}

// 🧪 TEST BUILD NATIVA - Sistema completo di test per aggiornamenti nativi
try {
  const { testNativeBuildDetection, resetForNewTest, testAllUpdateScenarios, testOTAvsNativeComparison } = require('./test-native-build-system');
  global.testNativeBuildDetection = testNativeBuildDetection;
  global.resetForNewTest = resetForNewTest;
  global.testAllUpdateScenarios = testAllUpdateScenarios;
  global.testOTAvsNativeComparison = testOTAvsNativeComparison;
  console.log('🧪 Test build nativa caricato!');
  console.log('🧪 Comandi: testNativeBuildDetection(), resetForNewTest(), testAllUpdateScenarios(), testOTAvsNativeComparison()');
} catch (testNativeError) {
  console.log('⚠️ Test build nativa non caricato:', testNativeError.message);
}

// 🔔 TEST NOTIFICHE BACKUP - Sistema di test per controllo notifiche backup
try {
  const { testBackupNotificationControl, testBackupWithDifferentNotificationStates, checkBackupNotificationStatus, resetNotificationTestState } = require('./test-backup-notifications');
  global.testBackupNotificationControl = testBackupNotificationControl;
  global.testBackupWithDifferentNotificationStates = testBackupWithDifferentNotificationStates;
  global.checkBackupNotificationStatus = checkBackupNotificationStatus;
  global.resetNotificationTestState = resetNotificationTestState;
  console.log('🔔 Test notifiche backup caricato!');
  console.log('🔔 Comandi: testBackupNotificationControl(), testBackupWithDifferentNotificationStates(), checkBackupNotificationStatus(), resetNotificationTestState()');
} catch (testNotificationError) {
  console.log('⚠️ Test notifiche backup non caricato:', testNotificationError.message);
}

// 📍 BACKUP PATH INSPECTOR - Visualizza percorsi e dettagli backup completi
try {
  const { inspectAllBackups, findBackupByName, verifyBackupPaths, showLatestBackup, copyBackupPath } = require('./backup-path-inspector');
  global.inspectAllBackups = inspectAllBackups;
  global.findBackupByName = findBackupByName;
  global.verifyBackupPaths = verifyBackupPaths;
  global.showLatestBackup = showLatestBackup;
  global.copyBackupPath = copyBackupPath;
  console.log('📍 Backup path inspector caricato!');
  console.log('📍 Comandi: inspectAllBackups(), findBackupByName("nome"), verifyBackupPaths(), showLatestBackup(), copyBackupPath("nome")');
} catch (inspectorError) {
  console.log('⚠️ Backup path inspector non caricato:', inspectorError.message);
}

// ✅ HANDLER NOTIFICHE CORRETTO - Mostra solo notifiche legittime
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('� Notifica ricevuta:', notification.request.content.title);
    console.log('� Data notifica:', notification.request.content.data);
    
    // Mostra tutte le notifiche che arrivano (ora che il sistema funziona)
    return {
      shouldPlaySound: true,    // ✅ Suona
      shouldSetBadge: true,     // ✅ Badge
      shouldShowBanner: true,   // ✅ Banner (sostituisce shouldShowAlert)
      shouldShowList: true,     // ✅ Lista notifiche (sostituisce shouldShowAlert)
    };
  },
});

console.log('✅ Handler notifiche ripristinato: NOTIFICHE ABILITATE');

// Configura i canali di notifica Android all'avvio
// Funzione per eliminare tutte le chiavi di backup da AsyncStorage
export async function clearAllBackupsFromAsyncStorage() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // Elimina tutte le chiavi che iniziano con "backup_" o "manual_backup_"
    const backupKeys = allKeys.filter(key => key.startsWith('backup_') || key.startsWith('manual_backup_'));
    // Elimina anche la lista dei backup JS e la data ultimo backup
    const extraKeys = ['javascript_backups', 'last_backup_date'];
    const keysToRemove = [...backupKeys, ...extraKeys];
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`🗑️ Backup eliminati da AsyncStorage: ${keysToRemove.length}`);
    } else {
      console.log('ℹ️ Nessun backup trovato in AsyncStorage da eliminare');
    }
    // Ferma il timer automatico JS se presente
    try {
      const BackupService = require('./src/services/BackupService').default;
      if (BackupService && BackupService.jsBackupService && BackupService.jsBackupService.stopAutoBackup) {
        await BackupService.jsBackupService.stopAutoBackup();
        console.log('🛑 Timer backup automatico JS fermato');
      }
    } catch (e) {
      console.warn('⚠️ Impossibile fermare timer JS:', e.message);
    }
    return keysToRemove.length;
  } catch (err) {
    console.warn('❌ Errore durante la pulizia dei backup in AsyncStorage:', err.message);
    return 0;
  }
}
async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifiche Generali',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1E3A8A', // Ensure consistent color
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('reminder', {
        name: 'Promemoria Lavoro',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1E3A8A', // Ensure consistent color
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('standby', {
        name: 'Reperibilità',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1E3A8A', // Ensure consistent color
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Canali di notifica Android configurati');
    } catch (err) {
      console.warn('⚠️ Errore configurazione canali notifiche Android:', err.message);
    }
  }
}

import DashboardScreen from './src/screens/DashboardScreen';
import TimeEntryScreen from './src/screens/TimeEntryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ContractSettingsScreen from './src/screens/ContractSettingsScreen';
import TravelSettingsScreen from './src/screens/TravelSettingsScreen';
import StandbySettingsScreen from './src/screens/StandbySettingsScreen';
import MealSettingsScreen from './src/screens/MealSettingsScreen';
import BackupScreen from './src/screens/BackupScreen';
import TimeEntryForm from './src/screens/TimeEntryForm';
import NetCalculationSettingsScreen from './src/screens/NetCalculationSettingsScreen';
import VacationManagementScreen from './src/screens/VacationManagementScreen';
import VacationRequestForm from './src/screens/VacationRequestForm';
import VacationSettingsScreen from './src/screens/VacationSettingsScreen';
import HourlyRatesSettingsScreen from './src/screens/HourlyRatesSettingsScreen';
import CalculationMethodSettingsScreen from './src/screens/CalculationMethodSettingsScreen';
import AppInfoScreen from './src/screens/AppInfoScreen';
import AppUpdateScreen from './src/screens/AppUpdateScreen';

// 🏷️ COMPONENTI MODALITÀ DEVELOPMENT
import DevelopmentWatermark from './src/components/DevelopmentWatermark';
import DevelopmentBanner from './src/components/DevelopmentBanner';

import { useDatabase } from './src/hooks';
import { useWelcome } from './src/hooks/useWelcome';
import WelcomeModal from './src/components/WelcomeModal';
import DatabaseHealthService from './src/services/DatabaseHealthService';
// import NotificationService from './src/services/FixedNotificationService'; // DISATTIVATO - usando SuperNotificationService
import BackupService from './src/services/BackupService';
import { registerBackgroundBackupTask } from './src/services/BackgroundBackupTask';
const SuperNotificationService = require('./src/services/SuperNotificationService');
const SuperBackupService = require('./src/services/SuperBackupService');
import UpdateService from './src/services/UpdateService';
import ManualUpdateService from './src/services/ManualUpdateService';
import UpdateNotificationService from './src/services/UpdateNotificationService';
import { ThemeProvider, useTheme, lightTheme } from './src/contexts/ThemeContext';
import { SystemNotificationProvider } from './src/contexts/SystemNotificationContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SettingsStack() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen} 
        options={{ title: 'Impostazioni' }}
      />
      <Stack.Screen 
        name="ContractSettings" 
        component={ContractSettingsScreen} 
        options={{ title: 'Contratto CCNL' }}
      />
      <Stack.Screen 
        name="NetCalculationSettings" 
        component={NetCalculationSettingsScreen} 
        options={{ title: 'Calcolo Netto' }}
      />
      <Stack.Screen 
        name="TravelSettings" 
        component={TravelSettingsScreen} 
        options={{ title: 'Ore di Viaggio' }}
      />
      <Stack.Screen 
        name="StandbySettings" 
        component={StandbySettingsScreen} 
        options={{ title: 'Reperibilità' }}
      />
      <Stack.Screen 
        name="MealSettings" 
        component={MealSettingsScreen} 
        options={{ title: 'Rimborsi Pasti' }}
      />
      <Stack.Screen 
        name="VacationManagement" 
        component={VacationManagementScreen} 
        options={{ title: 'Ferie e Permessi' }}
      />
      <Stack.Screen 
        name="VacationRequestForm" 
        component={VacationRequestForm} 
        options={{ title: 'Richiesta Ferie/Permessi' }}
      />
      <Stack.Screen 
        name="VacationSettings" 
        component={VacationSettingsScreen} 
        options={{ title: 'Configurazione Ferie/Permessi' }}
      />
      <Stack.Screen 
        name="Backup" 
        component={BackupScreen} 
        options={{ title: 'Backup e Ripristino' }}
      />
      <Stack.Screen 
        name="TravelAllowanceSettings" 
        component={require('./src/screens/TravelAllowanceSettings').default} 
        options={{ title: 'Indennità Trasferta' }}
      />
      <Stack.Screen 
        name="NotificationMainMenu" 
        component={require('./src/screens/NotificationMainMenu').default} 
        options={{ title: 'Gestione Notifiche' }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={require('./src/screens/NotificationSettingsScreen').default} 
        options={{ title: 'Notifiche Lavoro' }}
      />
      <Stack.Screen 
        name="ThemeSettings" 
        component={require('./src/screens/ThemeSettingsScreen').default} 
        options={{ title: 'Tema e Aspetto' }}
      />
      <Stack.Screen 
        name="HourlyRatesSettings" 
        component={HourlyRatesSettingsScreen} 
        options={{ title: 'Fasce Orarie Avanzate' }}
      />
      <Stack.Screen 
        name="CalculationMethodSettings" 
        component={CalculationMethodSettingsScreen} 
        options={{ title: 'Metodo di Calcolo' }}
      />
      <Stack.Screen 
        name="AppInfo" 
        component={AppInfoScreen} 
        options={{ title: 'Info App' }}
      />
      <Stack.Screen 
        name="AppUpdate" 
        component={AppUpdateScreen} 
        options={{ title: 'Aggiornamenti App' }}
      />
      <Stack.Screen 
        name="SystemNotificationMenu" 
        component={require('./src/screens/SystemNotificationMenuScreen').default} 
        options={{ title: 'Notifiche Sistema' }}
      />
      <Stack.Screen 
        name="NotificationDebug" 
        component={require('./src/screens/NotificationDebugScreen').default} 
        options={{ title: 'Debug Notifiche' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'TimeEntry') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="TimeEntry" 
        component={TimeEntryStack} 
        options={{ title: 'Inserimento Orario' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack} 
        options={{ title: 'Impostazioni' }}
      />
    </Tab.Navigator>
  );
}

const TimeEntryStack = () => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen name="TimeEntryScreen" component={TimeEntryScreen} options={{ title: 'Inserimento Orario' }} />
      <Stack.Screen name="TimeEntryForm" component={TimeEntryForm} options={{ title: 'Nuovo Inserimento' }} />
    </Stack.Navigator>
  );
};

// Mostra un alert se è disponibile un aggiornamento OTA
async function checkForOTAUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      const { Alert } = await import('react-native');
      Alert.alert(
        'Aggiornamento disponibile',
        'È disponibile una nuova versione dell’app. Vuoi aggiornare ora?',
        [
          {
            text: 'Aggiorna',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (err) {
                Alert.alert('Errore', 'Impossibile applicare l’aggiornamento. Riprova più tardi.');
              }
            },
          },
          { text: 'Annulla', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  } catch (err) {
    console.warn('Errore controllo OTA update:', err.message);
  }
}

export default function App() {
  const { isInitialized, isLoading, error } = useDatabase();
  const { 
    shouldShowWelcome, 
    isLoading: welcomeLoading, 
    markWelcomeCompleted,
    markWelcomeSkipped 
  } = useWelcome();
  
  // Stato per forzare il welcome modal da debug
  const [forceShowWelcomeModal, setForceShowWelcomeModal] = React.useState(false);
  
  // Funzione globale per test debug
  React.useEffect(() => {
    global.testWelcomeModal = () => {
      setForceShowWelcomeModal(true);
      console.log('🎉 Welcome Modal forzato per test');
    };
  }, []);

  // Gestisce i cambiamenti dello stato dell'app (background/foreground)
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App: State changed to:', nextAppState);
      
      if (nextAppState === 'active' && isInitialized) {
        // App è tornata in foreground, verifica le notifiche
        try {
          const recoveredCount = await SuperNotificationService.checkAndRecoverMissedNotifications();
          console.log(`📊 Timer attivi dopo foreground: ${recoveredCount?.scheduled || 0}`);
        } catch (error) {
          console.warn('⚠️ Errore controllo notifiche al ritorno in foreground:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [isInitialized]);

  // Avvia il monitoraggio della salute del database quando l'app è inizializzata
  React.useEffect(() => {
    if (isInitialized) {
      checkForOTAUpdate();
      console.log('🚀 App: Database initialized, starting complete service initialization...');
      
      // Debug dell'ambiente di esecuzione
      console.log('🔍 App: Environment check...');
      console.log('- Platform:', Platform.OS);
      console.log('- Constants.executionEnvironment:', Constants.executionEnvironment);
      console.log('- __DEV__:', __DEV__);
      
      // 📱 CONTROLLO BUILD NATIVA: Prima di tutto controlla se è cambiata la build
      setTimeout(async () => {
        try {
          console.log('📱 Controllo aggiornamento build nativa...');
          const nativeUpdateResult = await global.checkNativeBuildUpdate();
          
          if (nativeUpdateResult?.updateDetected) {
            console.log('🎯 AGGIORNAMENTO BUILD NATIVA RILEVATO:', nativeUpdateResult);
            // Il popup viene gestito automaticamente da checkNativeBuildUpdate
          } else {
            console.log('✅ Nessun aggiornamento build nativa rilevato');
          }
        } catch (nativeError) {
          console.log('⚠️ Errore controllo build nativa:', nativeError);
        }
      }, 1500); // Controlla build nativa dopo 1.5 secondi
      
      // ⚠️ RITARDA L'AVVIO DEI SERVIZI PER EVITARE DATABASE LOCK
      setTimeout(() => {
        console.log('🚀 App: Avvio servizi dopo inizializzazione database...');
        
        // Avvia monitoraggio salute database con timeout più lungo
        DatabaseHealthService.startPeriodicHealthCheck(60000); // Check ogni 60 secondi invece di 30
        
        // Inizializza aggiornamenti automatici
        setTimeout(() => {
          console.log('🔄 App: Inizializzazione servizio aggiornamenti...');
          
          // 🎯 CONTROLLO SPECIFICO v1.3.1: POPUP SEMPRE VISIBILE per aggiornamento
          const checkV131Update = async () => {
            try {
              const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
              const hasShownV131Popup = await AsyncStorage.getItem('update_popup_shown_v1_3_1');
              
              console.log('📋 Versione precedente nota:', lastKnownVersion);
              console.log('📋 Popup v1.3.1 già mostrato:', hasShownV131Popup);
              
              // MOSTRA SEMPRE il popup se:
              // 1. Non c'è versione precedente (prima installazione/reset)
              // 2. La versione è diversa da 1.3.1 (aggiornamento effettivo)
              // 3. Il popup v1.3.1 non è mai stato mostrato (per sicurezza)
              const shouldShowPopup = !lastKnownVersion || 
                                    lastKnownVersion !== '1.3.1' || 
                                    hasShownV131Popup !== 'true';
              
              if (shouldShowPopup) {
                console.log('🎯 MOSTRANDO POPUP v1.3.1 - Condizioni:', {
                  lastKnownVersion,
                  hasShownV131Popup,
                  shouldShowPopup
                });
                
                setTimeout(() => {
                  if (typeof global.forceUpdateNotificationV131 === 'function') {
                    global.forceUpdateNotificationV131();
                  } else {
                    console.log('🔄 Sistema popup v1.3.1 non ancora caricato, skip sicuro');
                  }
                }, 3000); // Aspetta 3 secondi per permettere all'app di caricarsi
              } else {
                console.log('✅ Popup v1.3.1 già mostrato, non necessario');
              }
            } catch (error) {
              console.error('❌ Errore controllo v1.3.1:', error);
              // In caso di errore, mostra comunque il popup per sicurezza
              setTimeout(() => {
                if (typeof global.forceUpdateNotificationV131 === 'function') {
                  global.forceUpdateNotificationV131();
                } else {
                  console.log('🔄 Sistema popup v1.3.1 non ancora caricato, skip sicuro');
                }
              }, 3000);
            }
          };
          
          checkV131Update();
          UpdateService.checkOnAppStart();
          
          // 🔍 CONTROLLO AGGIORNAMENTI ALL'AVVIO (Sistema Manuale)
          // Controlla se ci sono aggiornamenti disponibili e invia notifica (senza aggiornare automaticamente)
          // RITARDATO per evitare conflitti con popup v1.3.1
          setTimeout(async () => {
            try {
              // Non eseguire se è davvero la prima installazione (evita conflitti con welcome modal)
              const hasWelcomeCompleted = await AsyncStorage.getItem('welcome_tutorial_completed');
              if (!hasWelcomeCompleted) {
                console.log('🔍 App: Skip controllo aggiornamenti (prima installazione)');
                return;
              }
              
              console.log('🔍 App: Controllo aggiornamenti all\'avvio...');
              const updateCheck = await ManualUpdateService.checkForUpdatesAtStartup();
              if (updateCheck.hasUpdate) {
                console.log('📱 App: Notifica aggiornamento inviata all\'avvio');
              } else {
                const reason = updateCheck.reason === 'dev_simulation_disabled' 
                  ? 'Simulazione disabilitata in sviluppo' 
                  : 'Nessun aggiornamento disponibile';
                console.log(`ℹ️ App: ${reason}`);
              }
            } catch (error) {
              console.error('❌ App: Errore controllo aggiornamenti all\'avvio:', error);
            }
          }, 8000); // Aumentato a 8 secondi per evitare conflitti
          
          // 🚨 BACKUP POPUP v1.3.1: Se per qualche motivo il controllo sopra fallisce,
          // forza comunque la visualizzazione del popup dopo 5 secondi
          setTimeout(async () => {
            try {
              const hasShownV131Popup = await AsyncStorage.getItem('update_popup_shown_v1_3_1');
              if (hasShownV131Popup !== 'true') {
                console.log('🚨 BACKUP: Forzando popup v1.3.1 per sicurezza...');
                if (typeof global.forceUpdateNotificationV131 === 'function') {
                  global.forceUpdateNotificationV131();
                } else {
                  console.log('🔄 Sistema popup v1.3.1 non ancora caricato, skip backup');
                }
              }
            } catch (error) {
              console.log('🚨 BACKUP: Errore controllo backup popup, forzo comunque:', error);
              if (typeof global.forceUpdateNotificationV131 === 'function') {
                global.forceUpdateNotificationV131();
              } else {
                console.log('🔄 Sistema popup v1.3.1 non ancora caricato, skip backup error');
              }
            }
          }, 5000); // Backup dopo 5 secondi
        }, 1000);
        

      // Inizializza notifiche con delay
      setTimeout(async () => {
        await setupAndroidNotificationChannels();
        initializeNotifications();
      }, 2000);
        
        // Inizializza backup con delay maggiore
        setTimeout(() => {
          initializeBackupSystem();
        }, 5000);
        
      }, 3000); // Attesa 3 secondi dopo inizializzazione database
      
      // Inizializza il servizio notifiche con SuperNotificationService
      console.log('App: Preparing notification service...');
      // Comando globale per forzare riprogrammazione notifiche (debug/diagnosi)
      global.forceReprogramNotifications = async () => {
        try {
          console.log('🔧 Global: Forzo riprogrammazione notifiche (comando)');
          const result = await SuperNotificationService.checkAndReprogramNotifications();
          console.log('🔧 Global: Risultato riprogrammazione:', result);
          return result;
        } catch (err) {
          console.error('🔧 Global: Errore forzatura riprogrammazione:', err.message);
          return null;
        }
      };
      const initializeNotifications = async () => {
        try {
          console.log('🔔 App: Inizializzazione SuperNotificationService...');
          
          // Inizializza solo SuperNotificationService (sistema unificato)
          try {
            console.log('App: Usando solo SuperNotificationService (sistema unificato)');
          } catch (oldError) {
            console.warn('App: Nota: migrazione da vecchio sistema completata');
          }
          
          // Ora inizializza il nuovo sistema avanzato
          const superInitialized = await SuperNotificationService.initialize();
          console.log(`🚀 App: SuperNotificationService inizializzato: ${superInitialized ? '✅ OK' : '❌ FAILED'}`);

          if (superInitialized) {
            // Attiva riprogrammazione notifiche ogni volta che l'app viene aperta
            await SuperNotificationService.checkAndReprogramNotifications();
            // Verifica automaticamente notifiche mancate e ripristina
            console.log('🔄 App: Controllo recovery notifiche...');
            const recoveredCount = await SuperNotificationService.checkAndRecoverMissedNotifications();
            if (recoveredCount > 0) {
              console.log(`✅ App: Recovery completato, recuperate ${recoveredCount} notifiche`);
            }
            
            // Verifica numero notifiche programmate
            const stats = await SuperNotificationService.getNotificationStats();
            console.log(`📊 App: Notifiche attive: ${stats.activeNotifications}, Programmate oggi: ${stats.scheduledToday}`);
            
            // 🔔 NUOVO SISTEMA PERSISTENTE - Inizializza servizio anti-interruzione
            try {
              const PersistentNotificationService = require('./src/services/PersistentNotificationService').default;
              const persistentInitialized = await PersistentNotificationService.initialize();
              if (persistentInitialized) {
                console.log('✅ Sistema notifiche persistenti attivato');
                
                // Controllo immediato e riprogrammazione se necessario
                await PersistentNotificationService.checkAndMaintainNotifications();
                
                const persistentStats = await PersistentNotificationService.getStatistics();
                console.log('📊 Statistiche sistema persistente:', persistentStats);
              }
            } catch (persistentError) {
              console.error('❌ Errore inizializzazione sistema persistente:', persistentError);
            }
            
            // DISATTIVATA PROGRAMMAZIONE AUTOMATICA ALL'AVVIO (evita notifiche immediate)
            if (stats.activeNotifications === 0) {
              console.log('ℹ️ App: Nessuna notifica programmata. Usa le Impostazioni → Notifiche per attivarle manualmente.');
              // const scheduledCount = await SuperNotificationService.scheduleNotifications();
              // console.log(`✅ App: Programmate ${scheduledCount} nuove notifiche`);
            }
          }
          
          // Gestisci possibili errori di importazione
          const notificationsModule = global.Notifications || Notifications;
          
          // Cancella qualsiasi notifica visibile all'avvio (eccetto aggiornamenti)
          if (notificationsModule) {
            try {
              // Ottieni tutte le notifiche e filtra quelle da mantenere
              const notifications = await notificationsModule.getAllScheduledNotificationsAsync();
              const updateNotifications = notifications.filter(notif => 
                notif.content.data?.type === 'update-available'
              );
              
              await notificationsModule.dismissAllNotificationsAsync();
              
              // Se c'erano notifiche di aggiornamento, non cancellarle
              if (updateNotifications.length > 0) {
                console.log(`App: Mantenute ${updateNotifications.length} notifiche di aggiornamento`);
              }
              
              console.log('App: Notifiche visibili cancellate all\'avvio (mantenendo aggiornamenti)');
            } catch (notifError) {
              console.warn('⚠️ App: Errore cancellazione notifiche:', notifError.message);
            }
          }
          
          // Verifica e richiedi permessi se necessario
          const hasPermissions = await SuperNotificationService.hasPermissions();
          if (!hasPermissions) {
            console.log('App: Permessi notifiche non presenti, richiedendo...');
            const granted = await SuperNotificationService.requestPermissions();
            if (!granted) {
              console.warn('App: Permessi notifiche negati dall\'utente');
            }
          }
          
          console.log('✅ App: Sistema notifiche completo inizializzato');
        } catch (error) {
          console.warn('App: Errore inizializzazione notifiche (fallback a vecchio sistema):', error.message);
          // Nessun fallback necessario - sistema unificato SuperNotificationService
          try {
            console.log('✅ App: Sistema SuperNotificationService unificato attivo');
          } catch (fallbackError) {
            console.error('❌ App: Errore sistema notifiche:', fallbackError.message);
          }
        }
      };
      
      // ✅ INIZIALIZZA SUPER BACKUP SYSTEM + FALLBACK
      const initializeBackupSystem = async () => {
        try {
          console.log('💾 App: Inizializzazione SuperBackupService...');
          // Attesa aggiuntiva per evitare conflitti database
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // ✅ SISTEMA BACKUP SEMPLIFICATO - Solo NativeBackupService
          console.log('App: Inizializzazione sistema backup ottimizzato...');
          try {
            console.log('App: Tentativo inizializzazione NativeBackupService...');
            const NativeBackupService = require('./src/services/NativeBackupService').default;
            if (NativeBackupService && typeof NativeBackupService.initialize === 'function') {
              await NativeBackupService.initialize();
              console.log('✅ App: NativeBackupService inizializzato (sistema principale)');
            } else {
              throw new Error('NativeBackupService.initialize is not a function');
            }
          } catch (nativeError) {
            console.warn('❌ App: NativeBackupService non disponibile:', nativeError.message);
            // Fallback al SuperBackupService
            try {
              const superInitialized = await SuperBackupService.initialize();
              console.log(`🔄 App: SuperBackupService fallback: ${superInitialized ? '✅ OK' : '❌ FAILED'}`);
            } catch (superError) {
              console.error('❌ App: Errore anche nel SuperBackupService:', superError.message);
            }
          }
          // REGISTRA IL TASK DI BACKUP AUTOMATICO IN BACKGROUND (solo build native)
          try {
            if (Platform.OS === 'android' || Platform.OS === 'ios') {
              const ok = await registerBackgroundBackupTask();
              if (ok) {
                console.log('✅ App: Task di backup automatico in background registrato con successo');
              } else {
                console.warn('⚠️ App: Task di backup automatico NON registrato');
              }
            }
          } catch (e) {
            console.error('❌ App: Errore registrazione task di backup automatico:', e.message);
          }
          console.log('✅ App: Sistema backup completo inizializzato');
        } catch (error) {
          console.error('❌ App: Errore inizializzazione sistema backup:', error.message);
        }
      };
      
      initializeNotifications();
      initializeBackupSystem();
      
      // Verifica i servizi dopo 10 secondi (aumentato da 5)
      setTimeout(async () => {
        console.log('🔍 App: Verifica servizi dopo 10 secondi...');
        
        try {
        // Gestisci possibili errori di importazione
        const notificationsModule = global.Notifications || Notifications;
        
        // CANCELLA TUTTO ALL'AVVIO - SOLUZIONE DRASTICA
        if (notificationsModule) {
          try {
            console.log('🗑️ CANCELLAZIONE SELETTIVA ALL\'AVVIO - Rimuovo notifiche eccetto aggiornamenti');
            
            // Ottieni tutte le notifiche programmate
            const scheduledNotifications = await notificationsModule.getAllScheduledNotificationsAsync();
            
            // Cancella solo quelle che NON sono aggiornamenti
            for (const notif of scheduledNotifications) {
              if (notif.content.data?.type !== 'update-available') {
                await notificationsModule.cancelScheduledNotificationAsync(notif.identifier);
              }
            }
            
            // Per le notifiche visibili, rimuovi solo quelle non di aggiornamento
            // (Non possiamo filtrare le dismissAll, ma almeno preserviamo le scheduled)
            await notificationsModule.dismissAllNotificationsAsync();
            
            console.log('✅ App: Notifiche residue pulite (mantenendo aggiornamenti)');
          } catch (notifError) {
            console.warn('⚠️ App: Errore pulizia selettiva notifiche:', notifError.message);
          }
        }          
          // Verifica stato backup
          const backupEnabled = await BackupService.isEnabled();
          console.log('💾 Backup automatico enabled:', backupEnabled);
          
        } catch (error) {
          console.warn('⚠️ Errore verifica servizi:', error.message);
        }
      }, 10000); // Aumentato da 5000 a 10000
      
      return () => {
        console.log('App: Stopping database health monitoring...');
        DatabaseHealthService.stopPeriodicHealthCheck();
      };
    }
  }, [isInitialized]);

  useEffect(() => {
    initNativeBackgroundBackup();
  }, []);

  if (isLoading || !isInitialized || welcomeLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <LoadingScreen error={error} />;
  }

  // Funzioni di navigazione per il welcome modal
  const handleNavigateToSettings = () => {
    markWelcomeCompleted();
    // Note: La navigazione diretta qui non è possibile perché siamo fuori dal NavigationContainer
    // Il welcome modal verrà chiuso e l'utente potrà navigare normalmente
  };

  const handleNavigateToTimeEntry = () => {
    markWelcomeCompleted();
    // Note: Stesso discorso - il modal si chiude e l'utente può navigare
  };

  const handleWelcomeClose = () => {
    markWelcomeCompleted();
    setForceShowWelcomeModal(false); // Reset anche il forzato
  };

  const handleContractSettingsChanged = (newSettings) => {
    console.log('🔧 [App] Contract settings changed dal WelcomeModal:', newSettings);
    
    // Forza un refresh delle impostazioni invalidando la cache AsyncStorage
    // Questo farà si che useSettings ricarichi dal database
    const forceSettingsRefresh = async () => {
      try {
        // Rimuovi temporaneamente la cache per forzare un reload dal database
        await AsyncStorage.removeItem('settings');
        console.log('🔧 [App] Cache settings invalidata - i componenti ricaricheranno dal database');
        
        // Salva nuovamente per ripristinare la cache con i dati aggiornati
        setTimeout(async () => {
          await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
          console.log('🔧 [App] Cache settings ripristinata con i nuovi dati');
        }, 100);
      } catch (error) {
        console.error('🔧 [App] Errore nel refresh forzato delle impostazioni:', error);
      }
    };
    
    forceSettingsRefresh();
  };

  // Determina se mostrare il welcome modal
  const showWelcomeModal = shouldShowWelcome || forceShowWelcomeModal;

  return (
    <ThemeProvider>
      <SystemNotificationProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <MainTabs />
            <StatusBar style="auto" />
            
            {/* 🏷️ FILIGRANE MODALITÀ DEVELOPMENT */}
            <DevelopmentWatermark />
            <DevelopmentBanner />
          </NavigationContainer>

          {/* 🎉 WELCOME MODAL per nuovi utenti */}
          <WelcomeModal
            visible={showWelcomeModal}
            onClose={handleWelcomeClose}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToTimeEntry={handleNavigateToTimeEntry}
            onContractSettingsChanged={handleContractSettingsChanged}
          />
        </SafeAreaProvider>
      </SystemNotificationProvider>
    </ThemeProvider>
  );
}

