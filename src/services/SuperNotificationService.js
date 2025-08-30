// 🚀 SUPER NOTIFICATION SERVICE - Sistema avanzato di notifiche per WorkTracker
// Versione ottimizzata con gestione robusta dei permessi e programmazione intelligente

let AsyncStorage, Platform, Alert, AppState, Notifications;

// ✅ VERIFICA DISPONIBILITÀ REACT NATIVE
function checkReactNativeAvailability() {
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
      dismissAllNotificationsAsync: async () => {},
    };
    return false;
  }
}

class SuperNotificationService {
  constructor() {
    this.initialized = false;
    this.isReactNativeEnvironment = checkReactNativeAvailability();
    this.hasPermission = false;
    this.databaseService = null; // Import dinamico per evitare loop
    this.isReprogramming = false; // Protezione contro chiamate multiple
    // Import del DatabaseService
    try {
      this.DatabaseServiceInstance = require('./DatabaseService').default;
    } catch (error) {
      console.warn('⚠️ Errore import DatabaseService:', error.message);
      this.DatabaseServiceInstance = null;
    }
    this.periodicNotificationTimer = null;
    console.log('🚀 SuperNotificationService inizializzato', this.isReactNativeEnvironment ? '(React Native)' : '(Node.js Mock)');
  }

  // ✅ INIZIALIZZAZIONE
  async initialize() {
    if (this.initialized) return true;

    try {
      if (this.isReactNativeEnvironment) {
        // Configura handler notifiche
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,  // Sostituisce shouldShowAlert
            shouldShowList: true,    // Sostituisce shouldShowAlert
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        
        // Configura canale di notifica per Android con icona personalizzata
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'WorkT - Promemoria',
              importance: Notifications.AndroidImportance.HIGH,
            });
            console.log('📱 Canale notifiche Android configurato');
          } catch (channelError) {
            console.warn('⚠️ Errore configurazione canale notifiche:', channelError.message);
          }
        }
        // Avvia il trigger periodico per la riprogrammazione notifiche ogni 2 ore
        this.startPeriodicNotificationCheck();
        
        // Verifica permessi
        this.hasPermission = await this.hasPermissions();
        
        // ✅ LISTENER PER RIPROGRAMMAZIONE AUTOMATICA QUANDO APP TORNA IN FOREGROUND
        this.setupAppStateListener();
        
        console.log('✅ SuperNotificationService inizializzato correttamente');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione SuperNotificationService:', error);
      return false;
    }
  }

  // ⏰ TIMER PERIODICO PER RIPROGRAMMAZIONE NOTIFICHE
  startPeriodicNotificationCheck() {
    if (this.periodicNotificationTimer) {
      clearInterval(this.periodicNotificationTimer);
    }
    // Ogni 2 ore (7200000 ms)
    this.periodicNotificationTimer = setInterval(async () => {
      try {
        console.log('⏰ Trigger periodico: controllo e riprogrammazione notifiche...');
        await this.checkAndReprogramNotifications();
      } catch (err) {
        console.warn('⚠️ Errore trigger periodico notifiche:', err.message);
      }
    }, 7200000);
    console.log('⏰ Timer periodico notifiche avviato (ogni 2 ore)');
  }

  // 🔄 SETUP LISTENER APPSTATE PER RIPROGRAMMAZIONE AUTOMATICA
  setupAppStateListener() {
    if (!this.isReactNativeEnvironment) return;
    
    this.lastAppState = AppState.currentState;
    this.lastNotificationCheck = Date.now();
    
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('🔄 AppState changed:', this.lastAppState, '→', nextAppState);
      
      // Quando l'app torna in foreground da background
      if (this.lastAppState === 'background' && nextAppState === 'active') {
        const timeSinceLastCheck = Date.now() - this.lastNotificationCheck;
        
        // Se è passata più di 2 ore (aumentato da 1 ora), verifica e riprogramma notifiche
        if (timeSinceLastCheck > 2 * 60 * 60 * 1000) { // 2 ore
          console.log('🔄 App tornata in foreground dopo 2+ ore, verifico notifiche...');
          
          // Aggiungi ulteriore delay per evitare conflitti con altre inizializzazioni
          setTimeout(async () => {
            await this.checkAndReprogramNotifications();
            this.lastNotificationCheck = Date.now();
          }, 2000); // 2 secondi di delay
        } else {
          console.log(`⏭️ App tornata in foreground ma controllo recente (${Math.round(timeSinceLastCheck/1000/60)} min fa)`);
        }
      }
      
      this.lastAppState = nextAppState;
    });
    
    console.log('👁️ AppState listener configurato per riprogrammazione automatica');
  }

  // 🔄 CONTROLLO E RIPROGRAMMAZIONE INTELLIGENTE
  async checkAndReprogramNotifications() {
    try {
      console.log('🔍 Controllo necessità riprogrammazione notifiche...');
      
      // Aggiungi protezione contro chiamate multiple
      if (this.isReprogramming) {
        console.log('⏳ Riprogrammazione già in corso, skip...');
        return { action: 'skipped', reason: 'already_in_progress' };
      }
      
      this.isReprogramming = true;
      
      const scheduled = await this.getScheduledNotifications();
      console.log(`📅 Notifiche attualmente programmate: ${scheduled.length}`);
      
      // Se ci sono meno di 5 notifiche programmate, riprogramma
      if (scheduled.length < 5) {
        console.log('⚠️ Poche notifiche programmate, riprogrammo automaticamente...');
        
        const settings = await this.getSettings();
        if (settings && (settings.enabled || settings.workEnabled || settings.timeEnabled || settings.standbyReminder?.enabled || settings.standbyReminders?.enabled)) {
          const result = await this.scheduleNotifications(settings, true);
          console.log(`✅ Riprogrammate ${result.totalScheduled} notifiche automaticamente (cancellate: ${result.cancelled})`);
          
          this.isReprogramming = false;
          return { ...result, action: 'reprogrammed' };
        }
      } else {
        console.log('✅ Numero adeguato di notifiche programmate, nessuna azione necessaria');
      }
      
      this.isReprogramming = false;
      return { totalScheduled: scheduled.length, action: 'none' };
      
    } catch (error) {
      this.isReprogramming = false;
      console.error('❌ Errore controllo riprogrammazione notifiche:', error);
      return { error: error.message };
    }
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

  // ✅ SETUP LISTENER NOTIFICHE (per compatibilità) - DISATTIVATO PER DEBUG
  setupNotificationListener() {
    try {
      if (this.isReactNativeEnvironment && Notifications) {
        console.log('✅ Listener notifiche configurati (modalità silenziosa)');
        return { subscription: null, responseSubscription: null };
      }
    } catch (error) {
      console.warn('⚠️ Errore setup listener notifiche:', error.message);
    }
  }

  // ✅ IMPOSTAZIONI PREDEFINITE
  getDefaultSettings() {
    return {
      enabled: false,
      morningTime: '07:30',
      eveningTime: '18:30',
      weekendsEnabled: false,
      workReminder: { enabled: false, morningTime: '07:30', weekendsEnabled: false },
      timeEntryReminder: { enabled: false, time: '18:30', weekendsEnabled: false },
      standbyReminder: { enabled: false, notifications: [] },
      backupReminder: { enabled: false, time: '02:00', frequency: 'daily' }
    };
  }

  // ✅ CARICA IMPOSTAZIONI
  async getSettings() {
    try {
      const saved = await AsyncStorage.getItem('superNotificationSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultSettings(), ...parsed };
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni:', error);
      return this.getDefaultSettings();
    }
  }

  // ✅ SALVA IMPOSTAZIONI
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('superNotificationSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni:', error);
      return false;
    }
  }

  // 🚀 PROGRAMMAZIONE NOTIFICHE PRINCIPALE
  async scheduleNotifications(settings, forceReschedule = false) {
    if (!this.initialized) await this.initialize();
    
    try {
      if (!settings.enabled || !this.hasPermission) {
        console.log('⏹️ Notifiche disabilitate o permessi mancanti');
        return { totalScheduled: 0, cancelled: 0 };
      }

      let cancelledCount = 0;
      if (forceReschedule) {
        console.log('🗑️ CANCELLAZIONE ROBUSTA - Rimuovo TUTTE le notifiche');
        
        try {
          const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
          console.log(`🔍 DEBUG: Trovate ${existingNotifications.length} notifiche programmate da cancellare`);
          cancelledCount = existingNotifications.length;
        } catch (debugError) {
          console.warn('⚠️ Errore debug notifiche esistenti:', debugError.message);
        }
        
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
        
        // Aggiungi un piccolo delay per assicurarsi che la cancellazione sia completa
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`🧹 ${cancelledCount} notifiche esistenti cancellate`);
      }

      let totalScheduled = 0;

      if (settings.workReminder?.enabled || settings.workReminders?.enabled) {
        const workSettings = settings.workReminder || settings.workReminders;
        const count = await this.scheduleMorningReminders(workSettings);
        totalScheduled += count;
        console.log(`📅 Programmati ${count} promemoria inizio lavoro`);
      }

      if (settings.timeEntryReminder?.enabled || settings.timeEntryReminders?.enabled) {
        const timeSettings = settings.timeEntryReminder || settings.timeEntryReminders;
        const count = await this.scheduleTimeEntryReminders(timeSettings);
        totalScheduled += count;
        console.log(`⏰ Programmati ${count} promemoria inserimento orari`);
      }

      if (settings.backupReminder?.enabled) {
        const count = await this.scheduleBackupReminders(settings.backupReminder);
        totalScheduled += count;
        console.log(`💾 Programmati ${count} promemoria backup automatico`);
      }

      if (settings.standbyReminder?.enabled || settings.standbyReminders?.enabled) {
        const standbyNotificationSettings = settings.standbyReminder || settings.standbyReminders;
        const count = await this.scheduleStandbyReminders(standbyNotificationSettings);
        totalScheduled += count;
        console.log(`📞 Programmati ${count} promemoria reperibilità`);
      }

      console.log(`✅ Totale notifiche programmate: ${totalScheduled} (cancellate: ${cancelledCount})`);
      await AsyncStorage.setItem('last_notification_schedule', new Date().toISOString());
      
      // Verifica finale per debug
      try {
        const finalCheck = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`🔍 VERIFICA FINALE: ${finalCheck.length} notifiche effettivamente programmate nel sistema`);
        
        if (finalCheck.length !== totalScheduled) {
          console.warn(`⚠️ MISMATCH: Programmato ${totalScheduled}, trovato ${finalCheck.length}`);
        }
      } catch (verifyError) {
        console.warn('⚠️ Errore verifica finale:', verifyError.message);
      }
      
      return { totalScheduled, cancelled: cancelledCount };

    } catch (error) {
      console.error('❌ Errore programmazione notifiche:', error);
      return { error: error.message, totalScheduled: 0, cancelled: 0 };
    }
  }

  // 📅 PROMEMORIA INIZIO LAVORO (7 giorni per continuità automatica)
  async scheduleMorningReminders(settings) {
    if (!settings.morningTime) {
      console.error('❌ Orario promemoria mattutino non configurato');
      return 0;
    }
    
    try {
      const [hours, minutes] = settings.morningTime.split(':').map(Number);
      const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      let scheduledCount = 0;
      
      // 🎯 PROGRAMMA PER 7 GIORNI (una settimana completa per continuità)
      for (let day = 0; day <= 7; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        if (targetDate <= new Date()) continue;
        
        const now = new Date();
        const timeDiff = targetDate.getTime() - now.getTime();
        
        // PROGRAMMA SEMPRE LA NOTIFICA COME IL TEST
        console.log(`📅 [NO FILTER] Programmando promemoria lavoro per: ${targetDate.toLocaleString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌅 Buongiorno! Inizio Lavoro',
            body: 'È ora di iniziare la giornata lavorativa. Ricordati di registrare l\'orario di inizio.',
            data: { 
              type: 'work_reminder', 
              date: targetDate.toISOString().split('T')[0],
              timestamp: targetDate.getTime()
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
            color: '#1E3A8A',
            categoryIdentifier: 'work_reminder',
            ...(Platform.OS === 'android' && { channelId: 'default' }),
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
        
        scheduledCount++;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria mattutini:', error);
      return 0;
    }
  }

  // ⏰ PROMEMORIA INSERIMENTO ORARI (7 giorni per continuità automatica)
  async scheduleTimeEntryReminders(settings) {
    if (!settings.time && !settings.eveningTime) {
      console.error('❌ Orario promemoria inserimento orari non configurato');
      return 0;
    }
    
    try {
      const timeString = settings.time || settings.eveningTime;
      const [hours, minutes] = timeString.split(':').map(Number);
      const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      let scheduledCount = 0;
      
      // 🎯 PROGRAMMA PER 7 GIORNI (una settimana completa per continuità)
      for (let day = 0; day <= 7; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        if (targetDate <= new Date()) continue;
        
        const now = new Date();
        const timeDiff = targetDate.getTime() - now.getTime();
        
        // PROGRAMMA SEMPRE LA NOTIFICA COME IL TEST
        console.log(`📅 [NO FILTER] Programmando time entry per: ${targetDate.toLocaleString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
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
            color: '#1E3A8A',
            categoryIdentifier: 'time_entry_reminder',
            ...(Platform.OS === 'android' && { channelId: 'default' }),
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
        
        scheduledCount++;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria inserimento:', error);
      return 0;
    }
  }

  // 💾 BACKUP AUTOMATICO - Programmazione promemoria backup ogni 24 ore
  async scheduleBackupReminders(settings) {
    if (!settings.enabled) return 0;

    try {
      const [hours, minutes] = settings.time.split(':');
      let scheduledCount = 0;
      const now = new Date();
      
      // 🎯 PROGRAMMA BACKUP OGNI 24 ORE per i prossimi 7 giorni
      for (let day = 0; day < 7; day++) {
        const targetDate = new Date(now);
        
        // Ogni giorno alla stessa ora
        targetDate.setDate(now.getDate() + day);
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // PROGRAMMA SEMPRE LA NOTIFICA COME IL TEST
        console.log(`💾 [NO FILTER] Programmando backup automatico GIORNALIERO per: ${targetDate.toLocaleString('it-IT')}`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💾 Backup Automatico Giornaliero WorkT',
            body: 'È ora di creare il backup giornaliero dei tuoi dati lavorativi. Tap per aprire.',
            data: { 
              type: 'backup_reminder',
              timestamp: targetDate.getTime(),
              day: day,
              frequency: 'daily'
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
            color: '#1E3A8A',
            categoryIdentifier: 'backup_reminder',
            ...(Platform.OS === 'android' && { channelId: 'default' }),
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
        
        scheduledCount++;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione backup automatico:', error);
      return 0;
    }
  }

  // 📞 PROMEMORIA REPERIBILITÀ (14 giorni per continuità automatica) 
  async scheduleStandbyReminders(settings) {
    console.log('📞 [DEBUG] scheduleStandbyReminders chiamato con settings:', JSON.stringify(settings, null, 2));
    
    if (!settings || !settings.enabled) {
      console.log('⏹️ Promemoria reperibilità disabilitati (enabled=false)');
      return 0;
    }
    
    if (!settings.notifications || !Array.isArray(settings.notifications)) {
      console.log('⏹️ Configurazione notifiche reperibilità non valida:', settings);
      return 0;
    }

    try {
      console.log('📞 [DEBUG] DatabaseServiceInstance disponibile:', !!this.DatabaseServiceInstance);
      console.log('📞 [DEBUG] DatabaseServiceInstance type:', typeof this.DatabaseServiceInstance);
      console.log('📞 [DEBUG] DatabaseServiceInstance methods:', this.DatabaseServiceInstance ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.DatabaseServiceInstance)) : 'N/A');
      
      // 📞 1. Ottieni le impostazioni complete dal database
      const appSettings = await this.DatabaseServiceInstance.getSetting('appSettings', null);
      console.log('📞 [DEBUG] appSettings dal database:', JSON.stringify(appSettings, null, 2));
      
      // 📞 2. Estrai le impostazioni di standby
      const standbySettings = appSettings?.standbySettings;
      console.log('📞 [DEBUG] standbySettings estratte:', JSON.stringify(standbySettings, null, 2));
      
      if (!standbySettings?.enabled) {
        console.log('📞 Sistema reperibilità disabilitato nel database (enabled=false)');
        return 0;
      }
      
      if (!standbySettings?.standbyDays) {
        console.log('📞 Nessun giorno di reperibilità configurato nel calendario (standbyDays mancante)');
        return 0;
      }
      
      const selectedDays = Object.keys(standbySettings.standbyDays).filter(date => 
        standbySettings.standbyDays[date].selected
      );
      console.log('📞 [DEBUG] Giorni selezionati trovati:', selectedDays.length, selectedDays);
      
      if (selectedDays.length === 0) {
        console.log('📞 Nessun giorno di reperibilità selezionato nel calendario');
        return 0;
      }

      let totalScheduled = 0;
      const now = new Date();

      // Per ogni notifica configurata (oggi, domani, etc.)
      for (const notification of settings.notifications) {
        console.log('📞 [DEBUG] Processando notifica:', JSON.stringify(notification, null, 2));
        
        if (!notification.enabled || !notification.time) {
          console.log('📞 [DEBUG] Notifica saltata: enabled=', notification.enabled, 'time=', notification.time);
          continue;
        }

        const [hours, minutes] = notification.time.split(':').map(Number);
        let scheduledForThisNotification = 0;

        // Per ogni giorno di reperibilità
        for (const standbyDateStr of selectedDays) {
          const standbyDate = new Date(standbyDateStr);
          
          // Calcola la data di notifica in base a daysInAdvance
          const notificationDate = new Date(standbyDate);
          notificationDate.setDate(standbyDate.getDate() - (notification.daysInAdvance || 0));
          notificationDate.setHours(hours, minutes, 0, 0);

          // Solo notifiche future e nei prossimi 14 giorni (esteso per continuità)
          if (notificationDate <= now) {
            console.log(`📞 [DEBUG] Notifica nel passato saltata: ${notificationDate.toLocaleString('it-IT')} <= ${now.toLocaleString('it-IT')}`);
            continue;
          }
          if (notificationDate.getTime() - now.getTime() > 14 * 24 * 60 * 60 * 1000) {
            console.log(`📞 [DEBUG] Notifica troppo lontana saltata: ${notificationDate.toLocaleString('it-IT')}`);
            continue;
          }

          const timeDiff = notificationDate.getTime() - now.getTime();
          
          console.log(`📞 [NO FILTER] Programmando reperibilità (${notification.daysInAdvance || 0} giorni prima) per: ${notificationDate.toLocaleString('it-IT')} - Reperibilità: ${standbyDate.toLocaleDateString('it-IT')} (tra ${Math.round(timeDiff/1000/60)} min)`);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '📞 Promemoria Reperibilità',
              body: notification.message || `Turno di reperibilità ${notification.daysInAdvance === 0 ? 'oggi' : 'domani'}`,
              data: { 
                type: 'standby_reminder',
                standbyDate: standbyDateStr,
                daysInAdvance: notification.daysInAdvance || 0,
                timestamp: notificationDate.getTime()
              },
              sound: Platform.OS === 'android' ? 'default' : true,
              priority: Platform.OS === 'android' ? 'high' : undefined,
              color: '#FF9500',
              categoryIdentifier: 'standby_reminder',
              ...(Platform.OS === 'android' && { channelId: 'default' }),
            },
            trigger: {
              type: 'date',
              date: notificationDate,
            },
          });
          
          scheduledForThisNotification++;
          totalScheduled++;
        }

        console.log(`📞 Notifica "${notification.message || 'Reperibilità'}" programmata per ${scheduledForThisNotification} giorni`);
      }
      
      console.log(`📞 [DEBUG] Totale notifiche reperibilità programmate: ${totalScheduled}`);
      return totalScheduled;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria reperibilità:', error);
      return 0;
    }
  }

  // 🧪 TEST NOTIFICA IMMEDIATA
  async scheduleTestNotification() {
    try {
      if (!this.hasPermission) {
        console.warn('⚠️ Permessi notifiche mancanti per test');
        return false;
      }

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
          color: '#1E3A8A',
          categoryIdentifier: 'test_notification',
          ...(Platform.OS === 'android' && { channelId: 'default' }),
        },
        trigger: {
          type: 'date',
          date: testTime,
        },
      });
      
      console.log('✅ Notifica di test programmata con successo');
      return true;
      
    } catch (error) {
      console.error('❌ Errore programmazione notifica di test:', error);
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
      const lastSchedule = await AsyncStorage.getItem('last_notification_schedule');
      
      const byType = {};
      scheduledNotifications.forEach(notification => {
        const type = notification.content.data?.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });
      
      return {
        total: scheduledNotifications.length,
        byType,
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

  // OTTIENI NOTIFICHE PROGRAMMATE
  async getScheduledNotifications() {
    try {
      if (!this.isReactNativeEnvironment || !Notifications) {
        return [];
      }
      
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled;
    } catch (error) {
      console.error('❌ Errore ottenimento notifiche programmate:', error);
      return [];
    }
  }

  // 🔄 RIPROGRAMMAZIONE FORZATA
  async forceReschedule() {
    console.log('🔄 Riprogrammazione forzata di tutte le notifiche...');
    const settings = await this.getSettings();
    return await this.scheduleNotifications(settings, true);
  }

  // 🔍 CONTROLLO E RECOVERY NOTIFICHE MANCATE
  async checkAndRecoverMissedNotifications() {
    try {
      console.log('🔍 Verifica notifiche perse...');
      
      const scheduled = await this.getScheduledNotifications();
      
      if (scheduled.length === 0) {
        console.log('ℹ️ Nessuna notifica programmata. Usa Impostazioni → Notifiche per attivarle manualmente.');
        return { recovered: false, reason: 'no_auto_scheduling' };
      }
      
      console.log(`✅ Nessuna notifica persa trovata`);
      return { recovered: false, scheduled: scheduled.length };
      
    } catch (error) {
      console.error('❌ Errore verifica notifiche perse:', error);
      return { error: error.message };
    }
  }

  // 🧹 CLEANUP LISTENER APPSTATE
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      console.log('🧹 AppState listener rimosso');
    }
  }
}

// ✅ EXPORT CORRETTO PER COMPATIBILITY COMPLETA
const superNotificationInstance = new SuperNotificationService();

// Export CommonJS (per App.js che usa require)
module.exports = superNotificationInstance;

// Export ES6 default (per import ES6)
module.exports.default = superNotificationInstance;

// Export named per compatibilità
module.exports.SuperNotificationService = SuperNotificationService;
