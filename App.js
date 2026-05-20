import './src/utils/logControl'; // 🔇 Filtro log centralizzato
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Platform, Animated } from 'react-native';
import { PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllBackupsFromAsyncStorage as clearBackupsShared } from './src/services/BackupCleanupService';

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
  return clearBackupsShared();
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
import YearlyReportScreen from './src/screens/YearlyReportScreen';
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
const SuperNotificationService = require('./src/services/SuperNotificationService');
import UpdateService from './src/services/UpdateService';
import ManualUpdateService from './src/services/ManualUpdateService';
import UpdateNotificationService from './src/services/UpdateNotificationService';
import { ThemeProvider, useTheme, lightTheme } from './src/contexts/ThemeContext';
import { SystemNotificationProvider } from './src/contexts/SystemNotificationContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Zoom temporaneo: pinch per ingrandire, rilascia per tornare a 1:1
function PinchZoomWrapper({ children }) {
  const animScale = useRef(new Animated.Value(1)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { scale: animScale } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    const { state } = event.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      Animated.spring(animScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start();
    }
  };

  return (
    <PinchGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale: animScale }] }}>
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
}

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
        component={DashboardStack} 
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

const DashboardStack = () => {
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
      <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="YearlyReport" component={YearlyReportScreen} options={{ title: 'Riepilogo Annuale' }} />
    </Stack.Navigator>
  );
};

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
      <Stack.Screen name="TimeEntryForm" component={TimeEntryForm} options={{ headerShown: false }} />
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
          
          UpdateService.checkOnAppStart();
          
          // 🔍 CONTROLLO AGGIORNAMENTI ALL'AVVIO (Sistema Manuale)
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
          }, 8000);
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

          // Registra task di background per riprogrammare notifiche (se compatibile)
          try {
            const BackgroundReprogramService = require('./src/services/BackgroundReprogramService');
            const registered = await BackgroundReprogramService.ensureRegistered();
            console.log('🔁 App: BackgroundReprogramService registered:', registered);
          } catch (bgErr) {
            console.warn('⚠️ App: BackgroundReprogramService non disponibile:', bgErr.message);
          }

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
            
            // 🔕 DISATTIVATO: PersistentNotificationService
            // Motivo: era un secondo scheduler aggressivo che causava duplicati e riprogrammazioni in parallelo.
            console.log('ℹ️ App: PersistentNotificationService disattivato (uso solo SuperNotificationService)');
            
            // Auto-programmazione all'avvio se il servizio non trova notifiche attive
            if (stats.activeNotifications === 0) {
              const startupSettings = await SuperNotificationService.getSettings();
              if (startupSettings?.enabled) {
                const scheduleResult = await SuperNotificationService.scheduleNotifications(startupSettings, true);
                console.log(`✅ App: Auto-programmazione all'avvio completata (${scheduleResult?.totalScheduled || 0} notifiche)`);
              } else {
                console.log('ℹ️ App: Notifiche globali disabilitate nelle impostazioni, auto-programmazione non eseguita.');
              }
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
      
      // ✅ INIZIALIZZA BACKUP SOLO MANUALE + AUTO AL SALVATAGGIO
      const initializeBackupSystem = async () => {
        try {
          console.log('💾 App: Sistema backup ridotto attivo (manuale + auto al salvataggio)');
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

        // NOTA: Non cancellare le notifiche programmate all'avvio.
        // Farlo qui causava: notifiche che non arrivano all'orario e "mismatch" immediato.
        // Se serve pulire notifiche visibili, farlo manualmente o in una routine dedicata.
        if (notificationsModule) {
          console.log('ℹ️ App: Skip pulizia selettiva notifiche programmate (preservo promemoria utente)');
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
      <SystemNotificationProvider>
        <SafeAreaProvider>
          <PinchZoomWrapper>
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
          </PinchZoomWrapper>
        </SafeAreaProvider>
      </SystemNotificationProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}

