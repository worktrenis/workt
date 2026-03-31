// Aggiornamento dell'App.js per utilizzare EnhancedNotificationService

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

import { useDatabase } from './src/hooks';
import DatabaseHealthService from './src/services/DatabaseHealthService';
// Usa il nuovo servizio notifiche
import NotificationService from './src/services/EnhancedNotificationService';
import BackupService from './src/services/BackupService';
import UpdateService from './src/services/UpdateService';
import { ThemeProvider, useTheme, lightTheme } from './src/contexts/ThemeContext';

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
        name="NotificationSettings" 
        component={require('./src/screens/NotificationSettingsScreen').default} 
        options={{ title: 'Notifiche' }}
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

export default function App() {
  const { isInitialized, isLoading, error } = useDatabase();

  // Gestisce i cambiamenti dello stato dell'app (background/foreground)
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App: State changed to:', nextAppState);
      
      if (nextAppState === 'active' && isInitialized) {
        // App è tornata in foreground, verifica le notifiche
        try {
          const activeTimers = await NotificationService.rescheduleOnForeground();
          console.log(`📊 Timer attivi dopo foreground: ${activeTimers}`);
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
      console.log('🚀 App: Database initialized, starting complete service initialization...');
      
      // Debug dell'ambiente di esecuzione
      console.log('🔍 App: Environment check...');
      console.log('- Platform:', Platform.OS);
      console.log('- Constants.executionEnvironment:', Constants.executionEnvironment);
      console.log('- __DEV__:', __DEV__);
      
      // ⚠️ RITARDA L'AVVIO DEI SERVIZI PER EVITARE DATABASE LOCK
      setTimeout(() => {
        console.log('🚀 App: Avvio servizi dopo inizializzazione database...');
        
        // Avvia monitoraggio salute database con timeout più lungo
        DatabaseHealthService.startPeriodicHealthCheck(60000); // Check ogni 60 secondi invece di 30
        
        // Inizializza aggiornamenti automatici
        setTimeout(() => {
          console.log('🔄 App: Inizializzazione servizio aggiornamenti...');
          UpdateService.checkOnAppStart();
        }, 1000);
        
        // Inizializza notifiche con delay
        setTimeout(() => {
          initializeNotifications();
        }, 2000);
        
        // Inizializza backup con delay maggiore
        setTimeout(() => {
          initializeBackupSystem();
        }, 5000);
        
      }, 3000); // Attesa 3 secondi dopo inizializzazione database
      
      // Inizializza il servizio notifiche in modo più robusto
      console.log('App: Preparing notification service...');
      const initializeNotifications = async () => {
        try {
          console.log('App: Inizializzazione EnhancedNotificationService...');
          
          // Inizializza il servizio
          const initialized = await NotificationService.initialize();
          console.log(`App: Servizio notifiche inizializzato: ${initialized ? 'OK' : 'KO'}`);
          
          // Gestisci possibili errori di importazione
          const notificationsModule = global.Notifications || Notifications;
          
          // Cancella qualsiasi notifica visibile all'avvio
          if (notificationsModule) {
            try {
              await notificationsModule.dismissAllNotificationsAsync();
              console.log('App: Notifiche visibili cancellate all\'avvio');
            } catch (notifError) {
              console.warn('⚠️ App: Errore cancellazione notifiche:', notifError.message);
            }
          }
          
          // Verifica e richiedi permessi se necessario
          const hasPermissions = await NotificationService.hasPermissions();
          if (!hasPermissions) {
            console.log('App: Permessi notifiche non presenti, richiedendo...');
            const granted = await NotificationService.requestPermissions();
            if (!granted) {
              console.warn('App: Permessi notifiche negati dall\'utente');
            }
          }
          
          // Configura il listener per le notifiche (solo una volta)
          console.log('App: Configurazione listener notifiche...');
          NotificationService.setupNotificationListener();
          
          console.log('✅ App: Sistema notifiche migliorato completamente inizializzato');
        } catch (error) {
          console.warn('App: Errore inizializzazione notifiche (non critico):', error.message);
        }
      };
      
      // ✅ INIZIALIZZA BACKUP AUTOMATICO NATIVO + JAVASCRIPT
      const initializeBackupSystem = async () => {
        try {
          console.log('App: Inizializzazione sistema backup completo (con protezione database lock)...');
          
          // Attesa aggiuntiva per evitare conflitti database
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Prima prova il backup nativo
          try {
            console.log('App: Tentativo inizializzazione NativeBackupService...');
            const NativeBackupService = require('./src/services/NativeBackupService');
            await NativeBackupService.initialize();
            await NativeBackupService.initializeNativeBackup();
            console.log('✅ App: NativeBackupService inizializzato');
          } catch (nativeError) {
            console.warn('App: NativeBackupService non disponibile, usando fallback:', nativeError.message);
            // Fallback al backup JavaScript normale con attesa
            await new Promise(resolve => setTimeout(resolve, 2000));
            await BackupService.initialize();
            console.log('✅ App: BackupService JavaScript inizializzato (fallback)');
          }
          
          console.log('✅ App: Sistema backup completo inizializzato');
        } catch (error) {
          console.warn('App: Errore inizializzazione backup (non critico):', error.message);
        }
      };
      
      // Verifica i servizi dopo 10 secondi (aumentato da 5)
      setTimeout(async () => {
        console.log('🔍 App: Verifica servizi dopo 10 secondi...');
        
        try {
          // Gestisci possibili errori di importazione
          const notificationsModule = global.Notifications || Notifications;
          
          // Pulisci qualsiasi notifica residua
          if (notificationsModule) {
            try {
              await notificationsModule.dismissAllNotificationsAsync();
              await notificationsModule.cancelAllScheduledNotificationsAsync();
              console.log('✅ App: Notifiche residue pulite correttamente');
            } catch (notifError) {
              console.warn('⚠️ App: Errore pulizia notifiche:', notifError.message);
            }
          }
          
          // Verifica stato notifiche
          try {
            await NotificationService.testNotificationSystem();
            console.log('✅ Test sistema notifiche migliorato completato');
          } catch (testError) {
            console.warn('❌ Test notifiche fallito:', testError.message);
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

  if (isLoading || !isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return <LoadingScreen error={error} />;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <MainTabs />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
