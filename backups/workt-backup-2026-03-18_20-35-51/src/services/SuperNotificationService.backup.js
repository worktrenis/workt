// 🚀 SUPER NOTIFICATION SERVICE - SOLUZIONE DEFINITIVA
// Sistema notifiche che funziona SEMPRE, anche con app chiusa
// Risolve tutti i problemi del sistema precedente

// Import condizionali per evitare problemi con Node.js
let AsyncStorage, Platform, Alert, AppState, Notifications;

// Funzione di inizializzazione imports
function initializeImports() {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const RN = require('react-native');
    Platform = RN.Platform;
    Alert = RN.Alert;
    AppState = RN.AppState;
    Notifications = require('expo-notifications');
    return true;
  } catch (error) {
    console.warn('⚠️ Imports React Native non disponibili (ambiente Node.js?):', error.message);
    return false;
  }
}

class SuperNotificationService {
  constructor() {
    this.initialized = false;
    this.isReactNativeEnvironment = checkReactNativeAvailability();
    this.hasPermission = false;
    this.databaseService = null; // Import dinamico per evitare loop
    
    console.log('🚀 SuperNotificationService inizializzato', this.isReactNativeEnvironment ? '(React Native)' : '(Node.js Mock)');
        return false;
      }

      // Programmazione per 5 secondi nel futuro
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 5);
      
      console.log(`🧪 Programmando notifica di test per: ${testTime.toLocaleTimeString('it-IT')}`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notifica SuperService',
          body: `Test completato alle ${new Date().toLocaleTimeString('it-IT')}. Le modifiche funzionano correttamente!`,
          data: { 
            type: 'test_notification',
            timestamp: testTime.getTime(),
            testId: Math.random().toString(36).substr(2, 9)
          },
          sound: Platform.OS === 'android' ? 'default' : true,
          priority: Platform.OS === 'android' ? 'high' : undefined,
        },
        trigger: {
          date: testTime.getTime(),
        },
      });
      
      console.log('✅ Notifica di test programmata con successo');
      return true;
      
    } catch (error) {
      console.error('❌ Errore programmazione notifica di test:', error);
      return false;
    }
  }
}mbiente Node.js?):', error.message);
    // Mock per test Node.js
    AsyncStorage = {
      getItem: async () => null,
      setItem: async () => true,
      removeItem: async () => true,
    };
    Platform = { OS: 'android' };
    Alert = { alert: () => {} };
    AppState = { currentState: 'active' };
    Notifications = {
      setNotificationHandler: () => {},
      getPermissionsAsync: async () => ({ status: 'granted' }),
      requestPermissionsAsync: async () => ({ status: 'granted' }),
      scheduleNotificationAsync: async () => 'mock-id',
      getAllScheduledNotificationsAsync: async () => [],
      cancelAllScheduledNotificationsAsync: async () => {},
    };
    return false;
  }
}

class SuperNotificationService {
  constructor() {
    this.initialized = false;
    this.hasPermission = false;
    this.databaseService = null; // Importato dinamicamente
    
    // Inizializza imports condizionali
    this.isReactNativeEnvironment = initializeImports();
    this.appState = AppState.currentState;
    
    console.log('🚀 SuperNotificationService inizializzato', this.isReactNativeEnvironment ? '(React Native)' : '(Node.js Mock)');
  }

  // ✅ CONTROLLO PERMESSI
  async hasPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('⚠️ Errore controllo permessi notifiche:', error.message);
      return false;
    }
  }

  // ✅ RICHIESTA PERMESSI
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.warn('⚠️ Errore richiesta permessi notifiche:', error.message);
      return false;
    }
  }

  // ✅ IMPORT DINAMICO DATABASE (evita loop dipendenze)
  async getDatabaseService() {
    if (!this.databaseService) {
      try {
        // Prova import diretto per React Native
        this.databaseService = require('./DatabaseService.js');
        
        // Verifica che il servizio abbia i metodi necessari
        if (!this.databaseService || typeof this.databaseService.getStandbyScheduleForNext30Days !== 'function') {
          console.warn('⚠️ DatabaseService non ha i metodi necessari, tentando import alternativo...');
          
          // Prova import con default export
          const dbModule = require('./DatabaseService.js');
          this.databaseService = dbModule.default || dbModule;
          
          if (!this.databaseService) {
            console.error('❌ DatabaseService non disponibile');
            this.databaseService = null;
          } else {
            console.log('✅ DatabaseService importato con successo (metodo alternativo)');
          }
        } else {
          console.log('✅ DatabaseService importato con successo');
        }
      } catch (error) {
        console.warn('⚠️ DatabaseService non disponibile:', error.message);
        this.databaseService = null;
      }
    }
    return this.databaseService;
  }

  // ✅ INIZIALIZZAZIONE AVANZATA
  async initialize() {
    if (this.initialized) {
      console.log('⚠️ SuperNotificationService già inizializzato, saltando inizializzazione');
      return true;
    }
    
    try {
      console.log('🔄 Inizializzazione SuperNotificationService...');
      
      // Segna subito come inizializzato per evitare loop
      this.initialized = true;
      
      // ✅ CONFIGURA HANDLER NOTIFICHE OTTIMIZZATO
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('📱 Notifica ricevuta:', notification.request.content.title);
          
          // ✅ CONFIGURAZIONE OTTIMALE PER APP CHIUSA
          return {
            shouldShowBanner: true,     // Mostra banner
            shouldShowList: true,       // Aggiunge alla lista notifiche
            shouldPlaySound: true,      // Riproduce suono
            shouldSetBadge: false,      // Non usa badge (problemi noti)
          };
        },
        // ✅ AGGIUNGE HANDLER PER INTERAZIONE CON NOTIFICHE
        handleNotificationResponse: async (response) => {
          console.log('👆 Utente ha toccato notifica:', response.notification.request.content.title);
          
          // Gestisce azioni basate sul tipo di notifica
          const notificationData = response.notification.request.content.data;
          if (notificationData?.type === 'work_reminder') {
            console.log('🏢 Apri schermata inserimento orari lavoro');
          } else if (notificationData?.type === 'time_entry_reminder') {
            console.log('⏰ Apri schermata riepilogo giornaliero');
          } else if (notificationData?.type === 'standby_reminder') {
            console.log('📞 Apri schermata reperibilità');
          }
        },
      });
      
      // Richiedi permessi
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      this.hasPermission = existingStatus === 'granted';
      
      if (!this.hasPermission) {
        const { status } = await Notifications.requestPermissionsAsync();
        this.hasPermission = status === 'granted';
        
        if (!this.hasPermission) {
          console.warn('⚠️ Permessi notifiche non concessi - funzionalità limitata');
        }
      }
      
      // Configura listener cambio stato app
      AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      
      // ✅ ABILITA RECOVERY AUTOMATICO SOLO SE NON IN BUILD NATIVA
      console.log('🔄 Configurando recovery automatico...');
      
      // Verifica se siamo in build nativa (production/preview)
      const isNativeBuild = !__DEV__ && typeof __DEV__ !== 'undefined';
      
      if (isNativeBuild) {
        console.log('� Build nativa rilevata - recovery gentile abilitato');
        // Recovery più gentile per build nativa
        setTimeout(() => {
          this.checkAndRecoverMissedNotifications().catch(error => {
            console.warn('⚠️ Recovery gentile completato:', error.message);
          });
        }, 10000); // Delay maggiore per build nativa
      } else {
        console.log('🛠️ Modalità development - recovery normale');
        setTimeout(() => {
          this.checkAndRecoverMissedNotifications().catch(error => {
            console.warn('⚠️ Recovery automatico fallito (normale in alcuni casi):', error.message);
          });
        }, 2000);
      }
      
      console.log('✅ SuperNotificationService inizializzato con successo');
      
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione SuperNotificationService:', error);
      return false;
    }
  }

  // 🔄 RECOVERY AUTOMATICO: Verifica e ripristina notifiche mancate
  async checkAndRecoverMissedNotifications() {
    try {
      console.log('🔍 Verifica notifiche mancate...');
      
      // Ottieni ultimo check
      const lastCheck = await AsyncStorage.getItem('last_notification_check');
      const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
      const now = new Date();
      
      // Se è passato più di 1 giorno, potremmo aver perso notifiche
      const hoursElapsed = (now - lastCheckTime) / (1000 * 60 * 60);
      
      if (hoursElapsed > 24) {
        console.log(`⚠️ Rilevato gap di ${Math.round(hoursElapsed)} ore nelle notifiche`);
        console.log('🔄 Avvio recovery automatico notifiche...');
        
        // Riprogramma tutte le notifiche
        await this.emergencyNotificationRecovery();
      }
      
      // Aggiorna timestamp controllo
      await AsyncStorage.setItem('last_notification_check', now.toISOString());
      
    } catch (error) {
      console.error('❌ Errore recovery notifiche mancate:', error);
    }
  }

  // 🚨 RECOVERY DI EMERGENZA: Riprogramma tutte le notifiche
  async emergencyNotificationRecovery() {
    try {
      console.log('🚨 === RECOVERY DI EMERGENZA NOTIFICHE ===');
      
      // Cancella tutte le notifiche attuali (potrebbero essere incomplete)
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      
      // Carica impostazioni attuali
      const settings = await this.getSettings();
      
      if (settings.enabled) {
        // Riprogramma tutto da capo
        const scheduled = await this.scheduleNotifications(settings, true);
        console.log(`✅ Recovery completato: riprogrammate ${scheduled} notifiche`);
        
        // Mostra notifica di recovery (solo se app è aperta)
        if (AppState.currentState === 'active') {
          Alert.alert(
            '🔄 Sistema Notifiche Ripristinato',
            `Rilevato un problema con le notifiche. Sistema ripristinato con ${scheduled} notifiche programmate.`,
            [{ text: 'OK' }]
          );
        }
        
        return scheduled;
      }
      
    } catch (error) {
      console.error('❌ Errore recovery di emergenza:', error);
      return 0;
    }
  }

  // Gestisce cambio stato app
  handleAppStateChange(nextAppState) {
    if (this.appState === 'background' && nextAppState === 'active') {
      // App tornata in primo piano - verifica notifiche
      this.checkAndRecoverMissedNotifications();
    }
    this.appState = nextAppState;
  }

  // ✅ PROGRAMMAZIONE NOTIFICHE (7 giorni)
  async scheduleNotifications(settings = null, forceReschedule = false) {
    if (!this.initialized) await this.initialize();
    
    if (!this.hasPermission) {
      console.warn('⚠️ Permessi notifiche mancanti - impossibile programmare');
      return 0;
    }
    
    try {
      // Carica impostazioni se non fornite
      if (!settings) {
        settings = await this.getSettings();
      }
      
      if (!settings.enabled && !forceReschedule) {
        console.log('📱 Notifiche disabilitate');
        return 0;
      }
      
      // Cancella notifiche esistenti solo se necessario
      if (forceReschedule) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      
      let totalScheduled = 0;
      
      // 🔔 PROGRAMMA PROMEMORIA LAVORO (7 giorni)
      if (settings.workReminder?.enabled) {
        const workCount = await this.scheduleLongTermWorkReminders(settings.workReminder);
        totalScheduled += workCount;
        console.log(`✅ Programmati ${workCount} promemoria lavoro`);
      }
      
      // ⏰ PROGRAMMA PROMEMORIA INSERIMENTO ORARI (7 giorni)
      if (settings.timeEntryReminder?.enabled) {
        const entryCount = await this.scheduleLongTermTimeEntryReminders(settings.timeEntryReminder);
        totalScheduled += entryCount;
        console.log(`✅ Programmati ${entryCount} promemoria inserimento orari`);
      }
      
      // 📞 PROGRAMMA NOTIFICHE REPERIBILITÀ
      if (settings.standbyReminder?.enabled) {
        const standbyCount = await this.scheduleStandbyReminders();
        totalScheduled += standbyCount;
        console.log(`✅ Programmate ${standbyCount} notifiche reperibilità`);
      }
      
      console.log(`🎯 TOTALE NOTIFICHE PROGRAMMATE: ${totalScheduled}`);
      
      // Salva timestamp ultima programmazione
      await AsyncStorage.setItem('last_notification_schedule', new Date().toISOString());
      
      return totalScheduled;
      
    } catch (error) {
      console.error('❌ Errore programmazione notifiche:', error);
      return 0;
    }
  }

  // 🔔 PROMEMORIA LAVORO (7 giorni)
  async scheduleLongTermWorkReminders(settings) {
    if (!settings.morningTime) {
      console.error('❌ Orario promemoria lavoro non configurato');
      return 0;
    }
    
    try {
      const [hours, minutes] = settings.morningTime.split(':').map(Number);
      const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      let scheduledCount = 0;
      
      // 🎯 PROGRAMMA PER 7 GIORNI (invece di 30 - più efficiente)
      for (let day = 1; day <= 7; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        // Controlla giorno settimana
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        // Solo se nel futuro
        if (targetDate <= new Date()) continue;
        
        // ✅ VERIFICA DOPPIA CHE SIA NEL FUTURO
        const now = new Date();
        const timeDiff = targetDate.getTime() - now.getTime();
        
        if (timeDiff <= 60000) { // Almeno 1 minuto nel futuro
          console.log(`⏭️ Saltato giorno ${day}: troppo vicino (${Math.round(timeDiff/1000)}s)`);
          continue;
        }
        
        console.log(`📅 Programmando per: ${targetDate.toLocaleString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
        
        // ✅ PROGRAMMA CON TIMESTAMP ASSOLUTO (risolve problemi timezone)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🏢 Promemoria Lavoro',
            body: 'Ricordati di registrare gli orari di lavoro di oggi.',
            data: { 
              type: 'work_reminder', 
              date: targetDate.toISOString().split('T')[0],
              timestamp: targetDate.getTime() // Aggiunto timestamp per debug
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
          },
          trigger: {
            // ✅ USA TIMESTAMP INVECE DI OGGETTO DATE (evita problemi timezone)
            date: targetDate.getTime(),
          },
        });
        
        scheduledCount++;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria lavoro:', error);
      return 0;
    }
  }

  // ⏰ PROMEMORIA INSERIMENTO ORARI (7 giorni)
  async scheduleLongTermTimeEntryReminders(settings) {
    if (!settings.eveningTime) {
      console.error('❌ Orario promemoria inserimento orari non configurato');
      return 0;
    }
    
    try {
      const [hours, minutes] = settings.eveningTime.split(':').map(Number);
      const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      let scheduledCount = 0;
      
      // 🎯 PROGRAMMA PER 7 GIORNI (invece di 30 - più efficiente)
      for (let day = 0; day <= 7; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        // Controlla giorno settimana
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        // Solo se nel futuro
        if (targetDate <= new Date()) continue;
        
        // ✅ VERIFICA DOPPIA CHE SIA NEL FUTURO
        const now = new Date();
        const timeDiff = targetDate.getTime() - now.getTime();
        
        if (timeDiff <= 60000) { // Almeno 1 minuto nel futuro
          console.log(`⏭️ Saltato giorno ${day}: troppo vicino (${Math.round(timeDiff/1000)}s)`);
          continue;
        }
        
        console.log(`📅 Programmando time entry per: ${targetDate.toLocaleString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
        
        // ✅ PROGRAMMA CON TIMESTAMP ASSOLUTO
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Promemoria Inserimento Orari',
            body: 'Ricordati di inserire le ore di lavoro di oggi prima di finire.',
            data: { 
              type: 'time_entry_reminder', 
              date: targetDate.toISOString().split('T')[0],
              timestamp: targetDate.getTime()
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
          },
          trigger: {
            // ✅ USA TIMESTAMP INVECE DI OGGETTO DATE
            date: targetDate.getTime(),
          },
        });
        
        scheduledCount++;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria inserimento orari:', error);
      return 0;
    }
  }

  // 📞 PROGRAMMA NOTIFICHE REPERIBILITÀ
  async scheduleStandbyReminders() {
    try {
      // Ottieni database service dinamicamente
      const DatabaseService = await this.getDatabaseService();
      
      // Verifica se le funzioni database sono disponibili
      if (!DatabaseService || typeof DatabaseService.getStandbyScheduleForNext30Days !== 'function') {
        console.warn('⚠️ DatabaseService o funzione getStandbyScheduleForNext30Days non disponibile');
        return 0;
      }
      
      // Ottieni dati reperibilità per i prossimi 7 giorni
      const standbyData = await DatabaseService.getStandbyScheduleForNext30Days();
      
      if (!standbyData || standbyData.length === 0) {
        console.log('ℹ️ Nessun dato reperibilità trovato per i prossimi 7 giorni');
        return 0;
      }
      
      let scheduledCount = 0;
      const now = new Date();
      
      for (const standby of standbyData) {
        try {
          const startDate = new Date(standby.startDate);
          
          // Programma notifica 1 ora prima dell'inizio
          const notificationTime = new Date(startDate);
          notificationTime.setHours(notificationTime.getHours() - 1);
          
          // Solo se nel futuro
          if (notificationTime <= now) continue;
          
          // ✅ VERIFICA DOPPIA CHE SIA NEL FUTURO
          const now = new Date();
          const timeDiff = notificationTime.getTime() - now.getTime();
          
          if (timeDiff <= 60000) { // Almeno 1 minuto nel futuro
            console.log(`⏭️ Saltato standby: troppo vicino (${Math.round(timeDiff/1000)}s)`);
            continue;
          }
          
          console.log(`📞 Programmando standby per: ${notificationTime.toLocaleString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '📞 Promemoria Reperibilità',
              body: `La tua reperibilità inizia tra un'ora (${startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})`,
              data: { 
                type: 'standby_reminder', 
                standbyId: standby.id,
                startDate: standby.startDate,
                endDate: standby.endDate,
                timestamp: notificationTime.getTime()
              },
              sound: Platform.OS === 'android' ? 'default' : true,
              priority: Platform.OS === 'android' ? 'high' : undefined,
            },
            trigger: {
              // ✅ USA TIMESTAMP INVECE DI OGGETTO DATE
              date: notificationTime.getTime(),
            },
          });
          
          scheduledCount++;
          
        } catch (standbyError) {
          console.error('❌ Errore programmazione singola reperibilità:', standbyError);
        }
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione notifiche reperibilità:', error);
      return 0;
    }
  }

  // 🧪 TEST SISTEMA NOTIFICHE
  async testNotificationSystem() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🧪 === TEST SUPER NOTIFICATION SYSTEM ===');
      
      // Test permessi
      console.log(`📱 Permessi: ${this.hasPermission ? 'OK ✅' : 'MANCANTI ❌'}`);
      
      if (!this.hasPermission) {
        return {
          success: false,
          error: 'Permessi notifiche mancanti'
        };
      }
      
      // Test notifica immediata
      const testId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test SuperNotificationService',
          body: 'Il sistema di notifiche avanzato funziona correttamente!',
          data: { type: 'test' },
          sound: true,
        },
        trigger: null, // Immediata
      });
      
      // Test notifica programmata (30 secondi)
      const futureTime = new Date();
      futureTime.setSeconds(futureTime.getSeconds() + 30);
      
      console.log(`🕐 Test notifica programmata per: ${futureTime.toLocaleString('it-IT')}`);
      console.log(`⏰ Tra: ${Math.round((futureTime.getTime() - new Date().getTime()) / 1000)} secondi`);
      
      const delayedId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Test Programmato',
          body: 'Questa notifica doveva arrivare dopo 30 secondi!',
          data: { 
            type: 'test_delayed',
            scheduledFor: futureTime.toISOString(),
            timestamp: futureTime.getTime()
          },
          sound: true,
        },
        trigger: {
          // ✅ USA TIMESTAMP PER MAGGIORE PRECISIONE
          date: futureTime.getTime(),
        },
      });
      
      console.log(`✅ Test completato - ID immediata: ${testId}, ID programmata: ${delayedId}`);
      
      return {
        success: true,
        immediateId: testId,
        delayedId: delayedId,
        testTime: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Errore test notifiche:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ⚙️ IMPOSTAZIONI
  getDefaultSettings() {
    return {
      enabled: true,
      workReminder: {
        enabled: true,
        morningTime: '07:30',
        weekendsEnabled: false
      },
      timeEntryReminder: {
        enabled: true,
        eveningTime: '18:30',
        weekendsEnabled: false
      },
      standbyReminder: {
        enabled: true
      }
    };
  }

  async getSettings() {
    try {
      const storedSettings = await AsyncStorage.getItem('superNotificationSettings');
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('❌ Errore lettura impostazioni:', error);
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('superNotificationSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni:', error);
      return false;
    }
  }

  // 📊 STATISTICHE
  async getNotificationStats() {
    try {
      if (!this.hasPermission) {
        return { error: 'Permessi mancanti' };
      }
      
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const lastCheck = await AsyncStorage.getItem('last_notification_check');
      const lastSchedule = await AsyncStorage.getItem('last_notification_schedule');
      
      // Raggruppa per tipo
      const byType = {};
      scheduledNotifications.forEach(notification => {
        const type = notification.content.data?.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });
      
      return {
        total: scheduledNotifications.length,
        byType,
        lastCheck: lastCheck ? new Date(lastCheck) : null,
        lastSchedule: lastSchedule ? new Date(lastSchedule) : null,
        isSystemActive: scheduledNotifications.length > 0
      };
      
    } catch (error) {
      console.error('❌ Errore statistiche notifiche:', error);
      return { error: error.message };
    }
  }

  // 🗑️ PULIZIA
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      return true;
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
      return false;
    }
  }

  // � STATISTICHE SEMPLICI (per compatibilità App.js)
  async getNotificationStats() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const today = new Date().toDateString();
      const scheduledToday = scheduledNotifications.filter(notif => 
        new Date(notif.trigger.date).toDateString() === today
      ).length;
      
      return {
        activeNotifications: scheduledNotifications.length,
        scheduledToday: scheduledToday,
        isSystemActive: scheduledNotifications.length > 0
      };
    } catch (error) {
      console.warn('⚠️ Errore statistiche notifiche semplici:', error.message);
      return {
        activeNotifications: 0,
        scheduledToday: 0,
        isSystemActive: false
      };
    }
  }

  // �🔄 RIPROGRAMMAZIONE FORZATA
  async forceReschedule() {
    console.log('🔄 Riprogrammazione forzata di tutte le notifiche...');
    const settings = await this.getSettings();
    return await this.scheduleNotifications(settings, true);
  }
}

module.exports = new SuperNotificationService();
