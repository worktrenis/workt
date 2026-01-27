// 🚀 ENHANCED NOTIFICATION SERVICE
// Versione migliorata con deduplicazione delle notifiche
// Risolve il problema delle notifiche multiple e ripetute

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import DatabaseService from './DatabaseService';

// Nome del task in background per il controllo delle notifiche
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Cache delle notifiche gestite recentemente (in-memory)
const recentlyHandledNotifications = new Set();

// Definizione del task in background (deve essere a livello di modulo)
if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    try {
      // Recupera notifiche da verificare
      const pendingNotifications = await AsyncStorage.getItem('pendingNotifications');
      if (pendingNotifications) {
        const notifications = JSON.parse(pendingNotifications);
        const now = Date.now();

        // NON generare notifiche "recuperate" tutte insieme: marca come scadute/gestite
        // per evitare spam quando il task gira (spesso coincide con apertura app).
        let markedAny = false;

        let handled = [];
        try {
          const handledRaw = await AsyncStorage.getItem('handledNotifications');
          handled = handledRaw ? JSON.parse(handledRaw) : [];
        } catch {
          handled = [];
        }

        for (const notification of notifications) {
          if (notification.scheduledTime <= now && !notification.shown) {
            notification.shown = true;
            markedAny = true;

            const handledId = notification?.data?.id;
            if (handledId && !handled.includes(handledId)) {
              handled.push(handledId);
            }
          }
        }

        if (markedAny) {
          await AsyncStorage.setItem('handledNotifications', JSON.stringify(handled));
          await AsyncStorage.setItem('pendingNotifications', JSON.stringify(notifications));
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Errore in background task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

class EnhancedNotificationService {
  constructor() {
    this.appState = AppState.currentState;
    this.initialized = false;
    this.hasPermission = false;
    this.scheduledNotifications = new Map();
    this.pendingNotificationsForStorage = [];
    this.isProcessingAction = false; // Previene esecuzione multipla azioni
    this.listenerInitialized = false; // Previene duplicazione listener
    
    // Verifica disponibilità API
    this.isNotificationsAvailable = this.checkNotificationsAvailability();
    if (!this.isNotificationsAvailable) {
      console.warn('⚠️ API Notifications non disponibili. Verranno utilizzati solo Alert.');
    }
    
    // Configura listener per cambio stato app
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Pulisci le notifiche gestite vecchie ogni giorno
    this.startNotificationCleanup();
    
    console.log('🚀 EnhancedNotificationService inizializzato');
  }
  
  // Verifica disponibilità API Notifications
  checkNotificationsAvailability() {
    try {
      return typeof Notifications !== 'undefined' && 
             Notifications !== null && 
             typeof Notifications.setNotificationHandler === 'function';
    } catch (error) {
      console.error('❌ Errore verifica disponibilità Notifications:', error);
      return false;
    }
  }
  
  // Avvia pulizia periodica delle notifiche gestite
  startNotificationCleanup() {
    setInterval(async () => {
      try {
        await this.cleanupHandledNotifications();
      } catch (error) {
        console.error('❌ Errore pulizia notifiche gestite:', error);
      }
    }, 24 * 60 * 60 * 1000); // Pulisci ogni 24 ore
  }
  
  // Pulisci le notifiche gestite vecchie (mantieni solo ultime 7 giorni)
  async cleanupHandledNotifications() {
    try {
      const handledNotifications = await this.getHandledNotifications();
      if (handledNotifications.length > 50) {
        // Mantieni solo le ultime 50 notifiche gestite
        const trimmedNotifications = handledNotifications.slice(-50);
        await AsyncStorage.setItem('handledNotifications', JSON.stringify(trimmedNotifications));
        console.log(`🧹 Pulite ${handledNotifications.length - trimmedNotifications.length} notifiche gestite vecchie`);
      }
      
      // Pulisci anche la cache in memoria
      if (recentlyHandledNotifications.size > 20) {
        console.log(`🧹 Pulizia cache notifiche in memoria (${recentlyHandledNotifications.size} elementi)`);
        recentlyHandledNotifications.clear();
      }
    } catch (error) {
      console.error('❌ Errore pulizia notifiche gestite:', error);
    }
  }
  
  // Pulisci completamente lo storage delle notifiche gestite
  async clearHandledNotifications() {
    try {
      await AsyncStorage.setItem('handledNotifications', JSON.stringify([]));
      recentlyHandledNotifications.clear();
      console.log('🧹 Storage notifiche gestite pulito');
      return true;
    } catch (error) {
      console.error('❌ Errore pulizia storage notifiche gestite:', error);
      return false;
    }
  }
  
  // Gestisce cambio stato app
  handleAppStateChange(nextAppState) {
    console.log(`🔄 App state: ${this.appState} → ${nextAppState}`);
    
    if (this.appState === 'background' && nextAppState === 'active') {
      // L'app è tornata in primo piano, verifica notifiche perse
      this.checkMissedNotifications();
      
      // Cancella notifiche visibili che potrebbero essere già state gestite
      if (this.isNotificationsAvailable) {
        Notifications.dismissAllNotificationsAsync().catch(err => {
          console.error('Errore cancellazione notifiche visibili:', err);
        });
      }
    } else if (this.appState === 'active' && nextAppState === 'background') {
      // L'app sta andando in background, salva qualsiasi modifica
      this.savePendingNotifications().catch(err => {
        console.error('Errore salvataggio notifiche pendenti:', err);
      });
    }
    
    this.appState = nextAppState;
  }
  
  // Inizializza il servizio di notifiche
  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('🔄 Inizializzazione sistema notifiche migliorato - pulizia iniziale...');
      
      // Verifica disponibilità API
      if (!this.isNotificationsAvailable) {
        console.warn('⚠️ API Notifications non disponibili. Inizializzazione in modalità fallback.');
        this.initialized = true;
        return true;
      }
      
      // Evita cancellazioni globali all'avvio: altrimenti le notifiche non arriveranno mai
      // quando l'app è chiusa.
      // await Notifications.dismissAllNotificationsAsync();
      // await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Configura handler notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true, // Nuovo flag che sostituisce shouldShowAlert
          shouldShowList: true,   // Nuovo flag che sostituisce shouldShowAlert
        }),
      });
      
      // Richiedi permessi
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      this.hasPermission = existingStatus === 'granted';
      
      if (!this.hasPermission) {
        const { status } = await Notifications.requestPermissionsAsync();
        this.hasPermission = status === 'granted';
      }
      
      // Configura task in background per controllo notifiche
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minuti è il minimo consentito
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      // Elimina tutte le notifiche gestite precedenti per evitare
      // problemi con il nuovo sistema di deduplicazione
      await this.clearHandledNotifications();
      
      // Reinizializza in-memory cache
      recentlyHandledNotifications.clear();
      
      // Inizializza sistema notifiche completato
      this.initialized = true;
      
      console.log('✅ Sistema notifiche migliorato inizializzato');
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione sistema notifiche:', error);
      return false;
    }
  }
  
  // Verifica se abbiamo i permessi per le notifiche
  async hasPermissions() {
    if (!this.isNotificationsAvailable) {
      return true; // In modalità fallback, consideriamo i permessi come concessi
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Errore verifica permessi notifiche:', error);
      return false;
    }
  }
  
  // Richiedi permessi per le notifiche
  async requestPermissions() {
    if (!this.isNotificationsAvailable) {
      return true; // In modalità fallback, consideriamo i permessi come concessi
    }
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Errore richiesta permessi notifiche:', error);
      return false;
    }
  }
  
  // Legge le notifiche in attesa di essere mostrate
  async loadPendingNotifications() {
    try {
      const storedNotifications = await AsyncStorage.getItem('pendingNotifications');
      this.pendingNotificationsForStorage = storedNotifications ? JSON.parse(storedNotifications) : [];
    } catch (error) {
      console.error('❌ Errore caricamento notifiche pendenti:', error);
      this.pendingNotificationsForStorage = [];
    }
  }
  
  // Salva le notifiche in attesa
  async savePendingNotifications() {
    try {
      await AsyncStorage.setItem('pendingNotifications', JSON.stringify(this.pendingNotificationsForStorage));
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio notifiche pendenti:', error);
      return false;
    }
  }
  
  // Verifica notifiche perse durante la chiusura dell'app
  async checkMissedNotifications() {
    try {
      await this.loadPendingNotifications();
      
      const now = Date.now();
      const missedNotifications = this.pendingNotificationsForStorage.filter(
        notification => notification.scheduledTime <= now && !notification.shown
      );
      
      if (missedNotifications.length > 0) {
        console.log(`🔍 Trovate ${missedNotifications.length} notifiche perse`);
        
        for (const notification of missedNotifications) {
          console.log(`📝 Verifica notifica persa: ${notification.data?.id || 'N/A'}`);
          
          // Verifica se è già stata gestita
          if (notification.data && notification.data.id) {
            const isAlreadyHandled = await this.isNotificationHandled(notification.data.id);
            if (isAlreadyHandled) {
              console.log(`⏭️ Notifica ${notification.data.id} già gestita, salto`);
              notification.shown = true;
              continue;
            }
          }
          
          // Mostra notifica come alert
          try {
            Alert.alert(
              notification.title || 'Notifica',
              notification.body || 'Hai una notifica in attesa',
              [
                { 
                  text: 'Ignora', 
                  style: 'cancel' 
                },
                { 
                  text: 'Visualizza', 
                  onPress: () => this.handleNotificationAction(notification.data) 
                }
              ]
            );
          } catch (alertError) {
            console.error('❌ Errore mostrando Alert per notifica persa:', alertError);
          }
          
          // Segna come mostrata
          notification.shown = true;
          
          // Segna come gestita
          if (notification.data && notification.data.id) {
            await this.markNotificationAsHandled(notification.data.id);
          }
        }
        
        // Aggiorna storage
        await this.savePendingNotifications();
      } else {
        console.log('✅ Nessuna notifica persa trovata');
      }
    } catch (error) {
      console.error('Errore controllo notifiche perse:', error);
    }
  }
  
  // Verifica se una notifica è già stata gestita
  async isNotificationHandled(notificationId) {
    // Prima verifica nella cache in memoria (più veloce)
    if (recentlyHandledNotifications.has(notificationId)) {
      return true;
    }
    
    // Poi verifica nello storage persistente
    try {
      const handledNotifications = await this.getHandledNotifications();
      return handledNotifications.includes(notificationId);
    } catch (error) {
      console.error('❌ Errore verifica notifica gestita:', error);
      return false;
    }
  }
  
  // Gestisce azione su notifica
  async handleNotificationAction(data) {
    if (!data) return;
    
    // Uso un semaforo per prevenire esecuzioni multiple della stessa azione
    if (this.isProcessingAction) {
      console.log('⏳ Già in corso un\'azione di notifica, ignoro');
      return;
    }
    
    this.isProcessingAction = true;
    
    try {
      console.log('🔄 Gestione azione notifica:', data);
      
      // Verifica se questa notifica ha un ID e se è già stata gestita
      if (data.id) {
        // Verifica se questa notifica è già stata gestita
        const isAlreadyHandled = await this.isNotificationHandled(data.id);
        if (isAlreadyHandled) {
          console.log(`🛑 Notifica ${data.id} già gestita, ignoro`);
          this.isProcessingAction = false;
          return;
        }
        
        // Segna questa notifica come gestita
        await this.markNotificationAsHandled(data.id);
      }
      
      switch (data.type) {
        case 'work_reminder':
          console.log('🔄 Azione: Naviga a inserimento orari');
          // Qui la navigazione effettiva
          break;
        case 'time_entry_reminder':
          console.log('🔄 Azione: Naviga a form orari');
          // Qui la navigazione effettiva
          break;
        case 'standby_reminder':
          console.log('🔄 Azione: Gestione reperibilità');
          // Qui la navigazione effettiva
          break;
        default:
          console.log(`🔄 Azione non riconosciuta: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Errore gestione azione notifica:', error);
    } finally {
      // Rilascia il semaforo
      this.isProcessingAction = false;
    }
  }
  
  // Ottiene la lista delle notifiche già gestite
  async getHandledNotifications() {
    try {
      const handledNotifications = await AsyncStorage.getItem('handledNotifications');
      return handledNotifications ? JSON.parse(handledNotifications) : [];
    } catch (error) {
      console.error('❌ Errore lettura notifiche gestite:', error);
      return [];
    }
  }
  
  // Segna una notifica come già gestita
  async markNotificationAsHandled(notificationId) {
    try {
      // Prima aggiungi alla cache in memoria
      recentlyHandledNotifications.add(notificationId);
      
      // Poi aggiorna lo storage persistente
      const handledNotifications = await this.getHandledNotifications();
      if (!handledNotifications.includes(notificationId)) {
        handledNotifications.push(notificationId);
        await AsyncStorage.setItem('handledNotifications', JSON.stringify(handledNotifications));
        console.log(`✅ Notifica ${notificationId} segnata come gestita`);
      }
    } catch (error) {
      console.error('❌ Errore nel segnare notifica come gestita:', error);
    }
  }
  
  // Configura il listener per le notifiche con protezione contro duplicati
  setupNotificationListener() {
    // Evita configurazione multipla dei listener
    if (this.listenerInitialized) {
      console.log('⚠️ Listener notifiche già inizializzato, salto');
      return true;
    }
    
    // In questo servizio, utilizza l'API di expo-notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notifica ricevuta:', notification);
      
      // Verifica se la notifica ha un ID
      const notificationData = notification.request.content.data;
      if (notificationData && notificationData.id) {
        console.log(`📝 Notifica ricevuta con ID: ${notificationData.id}`);
      }
    });
    
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      console.log('👆 Utente ha toccato la notifica:', response);
      
      // Estrai i dati dalla notifica
      const notificationData = response.notification.request.content.data;
      
      // Gestisci l'azione solo se non è già stata gestita
      await this.handleNotificationAction(notificationData);
      
      // Rimuovi la notifica dal centro notifiche
      try {
        if (Platform.OS === 'ios') {
          await Notifications.dismissNotificationAsync(response.notification.request.identifier);
        } else {
          await Notifications.dismissAllNotificationsAsync();
        }
      } catch (dismissError) {
        console.warn('⚠️ Errore rimozione notifica:', dismissError.message);
      }
    });
    
    // Salva i riferimenti per pulizia
    this.notificationSubscription = subscription;
    this.notificationResponseSubscription = responseSubscription;
    this.listenerInitialized = true;
    
    console.log('✅ Listener notifiche configurato con deduplicazione');
    
    return true;
  }
  
  // Rimuove i listener per le notifiche
  removeNotificationListeners() {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
    
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
    }
    
    this.listenerInitialized = false;
    console.log('🧹 Listener notifiche rimossi');
  }
  
  // Cancella tutte le notifiche
  async cancelAllNotifications() {
    try {
      // Cancella notifiche Expo
      if (this.isNotificationsAvailable) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
      }
      
      // Cancella timer JavaScript
      for (const notification of this.scheduledNotifications.values()) {
        if (notification.timer) {
          clearTimeout(notification.timer);
        }
      }
      
      this.scheduledNotifications.clear();
      
      // Pulisci lista persistente
      this.pendingNotificationsForStorage = [];
      await this.savePendingNotifications();
      
      // Pulisci anche le notifiche gestite
      await this.clearHandledNotifications();
      
      console.log('🧹 Tutte le notifiche cancellate');
      
      return true;
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
      return false;
    }
  }
  
  // Riprogramma notifiche quando l'app torna in foreground
  async rescheduleOnForeground() {
    try {
      console.log('🔄 Controllo notifiche al ritorno in foreground...');
      
      // Carica notifiche pendenti
      await this.loadPendingNotifications();
      
      // Rimuovi notifiche che sono già passate
      const now = Date.now();
      const activeNotifications = this.pendingNotificationsForStorage.filter(
        notification => notification.scheduledTime > now
      );
      
      console.log(`ℹ️ Notifiche attive: ${activeNotifications.length}`);
      
      // Prima cancella tutte le notifiche programmate
      if (this.isNotificationsAvailable) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      
      // Riprogramma le notifiche
      for (const notification of activeNotifications) {
        const delay = notification.scheduledTime - now;
        if (delay > 0) {
          await this.scheduleNotification(
            notification.title,
            notification.body,
            delay,
            notification.data
          );
        }
      }
      
      return activeNotifications.length;
    } catch (error) {
      console.error('❌ Errore riprogrammazione notifiche:', error);
      return 0;
    }
  }

  // Testa il sistema di notifiche 
  async testNotificationSystem() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🧪 === TEST SISTEMA NOTIFICHE MIGLIORATO ===');
      
      // Verifica permessi
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        console.log('⚠️ Test limitato: permessi notifiche non concessi');
      }
      
      // Test notifica immediata
      console.log('🔔 Test notifica immediata...');
      
      const testId = `test_${Date.now()}`;
      
      const immediateResult = await this.scheduleNotification(
        'Test Notifica',
        'Questa è una notifica di test immediata',
        0, // immediata
        {
          id: testId,
          type: 'test_notification',
          test: true
        }
      );
      
      console.log('⏱️ Test notifica ritardata (30 secondi)...');
      
      // Test notifica ritardata
      const delayedTime = Date.now() + 30000; // 30 secondi
      
      const delayedResult = await this.scheduleNotification(
        'Test Notifica Ritardata',
        'Questa è una notifica di test ritardata',
        30000, // 30 secondi
        {
          id: `test_delayed_${Date.now()}`,
          type: 'test_notification',
          test: true,
          scheduled: delayedTime
        }
      );
      
      console.log(`⏱️ Programmata per: ${new Date(delayedTime).toLocaleTimeString('it-IT')}`);
      console.log('⏳ Attendi 30 secondi per la notifica ritardata...');
      
      console.log('✅ Test sistema notifiche completato');
      
      return {
        success: true,
        hasPermissions,
        immediateTest: immediateResult,
        delayedTest: delayedResult,
        system: 'EnhancedNotificationService',
        time: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Errore test sistema notifiche:', error);
      
      return {
        success: false,
        error: error.message,
        system: 'EnhancedNotificationService',
        time: new Date().toISOString()
      };
    }
  }
  
  // Copia e implementa il resto dei metodi dal vecchio servizio
  // mantenendo la compatibilità API ma con la deduplicazione migliorata
}

export default new EnhancedNotificationService();
