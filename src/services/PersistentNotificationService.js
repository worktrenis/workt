// 🔔 SISTEMA NOTIFICHE PERSISTENTI E CONTINUE - Soluzione Definitiva
// Risolve il problema delle notifiche che si fermano dopo 2-3

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import DatabaseService from './DatabaseService';

class PersistentNotificationService {
  constructor() {
    this.initialized = false;
    this.hasPermission = false;
    this.lastCheck = Date.now();
    this.minNotificationsThreshold = 10; // Soglia minima più alta
    this.maxNotificationsScheduled = 64; // Limite sistema iOS/Android
    this.rescheduleInterval = 30 * 60 * 1000; // 30 minuti invece di 1 ora
    this.appStateSubscription = null;
    this.backgroundTaskId = null;
    
    console.log('🔔 PersistentNotificationService inizializzato');
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Setup handler notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Richiedi permessi
      this.hasPermission = await this.requestPermissions();
      
      if (!this.hasPermission) {
        console.error('❌ Permessi notifiche non concessi');
        return false;
      }

      // Setup AppState listener più aggressivo
      this.setupAppStateListener();
      
      // Setup timer riprogrammazione periodica
      this.setupPeriodicRescheduling();
      
      this.initialized = true;
      console.log('✅ PersistentNotificationService inizializzato completamente');
      return true;
      
    } catch (error) {
      console.error('❌ Errore inizializzazione PersistentNotificationService:', error);
      return false;
    }
  }

  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      console.log(`🔔 Permessi notifiche: ${finalStatus}`);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('❌ Errore richiesta permessi:', error);
      return false;
    }
  }

  setupAppStateListener() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log(`🔄 AppState: ${nextAppState}`);
      
      if (nextAppState === 'active') {
        const timeSinceLastCheck = Date.now() - this.lastCheck;
        
        // Controllo più frequente: ogni 30 minuti invece di 1 ora
        if (timeSinceLastCheck > this.rescheduleInterval) {
          console.log('🔄 App attiva, controllo notifiche...');
          await this.checkAndMaintainNotifications();
          this.lastCheck = Date.now();
        }
      }
    });
    
    console.log('👁️ AppState listener configurato (controllo ogni 30min)');
  }

  setupPeriodicRescheduling() {
    // Timer che controlla periodicamente anche se l'app è aperta
    setInterval(async () => {
      if (AppState.currentState === 'active') {
        console.log('⏰ Controllo periodico notifiche (timer 30min)');
        await this.checkAndMaintainNotifications();
      }
    }, this.rescheduleInterval);
    
    console.log('⏰ Timer periodico configurato (30 minuti)');
  }

  async checkAndMaintainNotifications() {
    try {
      if (!this.hasPermission) {
        console.log('⚠️ Nessun permesso notifiche, skip controllo');
        return;
      }

      // Ottieni notifiche programmate
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📊 Notifiche attualmente programmate: ${scheduled.length}`);

      // Se sotto la soglia minima, riprogramma SEMPRE
      if (scheduled.length < this.minNotificationsThreshold) {
        console.log(`🚨 SOGLIA CRITICA: Solo ${scheduled.length} notifiche programmate (min: ${this.minNotificationsThreshold})`);
        await this.emergencyReschedule();
      } else {
        console.log(`✅ Notifiche sufficienti: ${scheduled.length}/${this.minNotificationsThreshold}`);
      }

      // Salva timestamp ultimo controllo
      await AsyncStorage.setItem('last_notification_check', Date.now().toString());

    } catch (error) {
      console.error('❌ Errore controllo notifiche:', error);
    }
  }

  async emergencyReschedule() {
    try {
      console.log('🚨 RIPROGRAMMAZIONE EMERGENZA - Cancello e ricreo tutte le notifiche');
      
      // Cancella tutte le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      
      // Carica impostazioni notifiche
      const settings = await this.loadNotificationSettings();
      
      if (!settings.enabled) {
        console.log('⚠️ Notifiche disabilitate dalle impostazioni');
        return 0;
      }

      let totalScheduled = 0;

      // Programma notifiche per tipo
      if (settings.workReminder?.enabled) {
        const count = await this.scheduleWorkReminders(settings.workReminder);
        totalScheduled += count;
        console.log(`📅 Riprogrammati ${count} promemoria lavoro`);
      }

      if (settings.timeEntryReminder?.enabled) {
        const count = await this.scheduleTimeEntryReminders(settings.timeEntryReminder);
        totalScheduled += count;
        console.log(`⏰ Riprogrammati ${count} promemoria orari`);
      }

      if (settings.standbyReminder?.enabled) {
        const count = await this.scheduleStandbyReminders(settings.standbyReminder);
        totalScheduled += count;
        console.log(`📞 Riprogrammati ${count} promemoria reperibilità`);
      }

      if (settings.backupReminder?.enabled) {
        const count = await this.scheduleBackupReminders(settings.backupReminder);
        totalScheduled += count;
        console.log(`💾 Riprogrammati ${count} promemoria backup`);
      }

      console.log(`✅ RIPROGRAMMAZIONE COMPLETATA: ${totalScheduled} notifiche totali`);
      return totalScheduled;

    } catch (error) {
      console.error('❌ Errore riprogrammazione emergenza:', error);
      return 0;
    }
  }

  async loadNotificationSettings() {
    try {
      // Prova multiple chiavi per compatibilità - ordine per priorità
      const possibleKeys = [
        'superNotificationSettings',    // Prima: impostazioni SuperNotificationService
        'NOTIFICATION_SETTINGS',        // Seconda: impostazioni utente delle notifiche
        'notification_settings',       // Terza: chiave legacy
        'system_notification_settings_v1' // Ultima: impostazioni di sistema (fallback)
      ];
      
      let settings = null;
      let usedKey = null;
      
      for (const key of possibleKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsedData = JSON.parse(stored);
          // Verifica che i dati siano realmente impostazioni notifiche
          // system_notification_settings_v1 contiene solo dati di sistema
          if (key === 'system_notification_settings_v1') {
            // Salta questa chiave perché contiene solo impostazioni di sistema
            console.log(`📋 DEBUG: Saltando chiave ${key} (solo impostazioni sistema)`);
            continue;
          }
          
          // Per le altre chiavi, verifica che contengano dati di notifica
          if (parsedData.workReminder || parsedData.timeEntryReminder || 
              parsedData.morningTime || parsedData.eveningTime ||
              parsedData.workReminders || parsedData.timeEntryReminders) {
            settings = stored;
            usedKey = key;
            break;
          }
          
          console.log(`📋 DEBUG: Chiave ${key} non contiene impostazioni notifiche valide`);
        }
      }
      
      const defaultSettings = {
        enabled: true,
        workReminder: { 
          enabled: true, 
          morningTime: '08:00',
          weekendsEnabled: false
        },
        timeEntryReminder: { 
          enabled: true, 
          eveningTime: '18:00',
          weekendsEnabled: false
        },
        standbyReminder: { 
          enabled: false, // Disabilito di default
          notificationsEnabled: false
        },
        backupReminder: { 
          enabled: false, // Disabilito di default
          frequency: 'weekly',
          time: '20:00',
          days: [0]
        }
      };
      
      if (!settings) {
        console.log('📋 DEBUG: Nessuna impostazione trovata in nessuna chiave');
        console.log('📋 DEBUG: Chiavi cercate:', possibleKeys);
        // Prova a controllare tutte le chiavi disponibili
        const allKeys = await AsyncStorage.getAllKeys();
        const notificationKeys = allKeys.filter(key => 
          key.toLowerCase().includes('notification') || 
          key.toLowerCase().includes('settings')
        );
        console.log('📋 DEBUG: Chiavi notifiche disponibili:', notificationKeys);
        return defaultSettings;
      }
      
      console.log(`📋 DEBUG: Impostazioni caricate da chiave: ${usedKey}`);
      
      const loadedSettings = JSON.parse(settings);
      console.log(`📋 Impostazioni ${usedKey} caricate:`, loadedSettings);
      
      // Normalizza le impostazioni per la compatibilità con questo servizio
      const normalizedSettings = {
        enabled: loadedSettings.enabled !== undefined ? loadedSettings.enabled : true,
        workReminder: {
          enabled: loadedSettings.workReminder?.enabled || loadedSettings.workReminders?.enabled || true,
          morningTime: loadedSettings.workReminder?.morningTime || loadedSettings.morningTime || '08:00',
          weekendsEnabled: loadedSettings.workReminder?.weekendsEnabled || false
        },
        timeEntryReminder: {
          enabled: loadedSettings.timeEntryReminder?.enabled || loadedSettings.timeEntryReminders?.enabled || true,
          // Supporta sia 'time' che 'eveningTime' per compatibilità
          eveningTime: loadedSettings.timeEntryReminder?.time || loadedSettings.timeEntryReminder?.eveningTime || loadedSettings.eveningTime || '18:00',
          weekendsEnabled: loadedSettings.timeEntryReminder?.weekendsEnabled || false
        },
        standbyReminder: loadedSettings.standbyReminder || loadedSettings.standbyReminders || { enabled: false },
        backupReminder: loadedSettings.backupReminder || { enabled: false, frequency: 'weekly', time: '20:00', days: [0] }
      };
      
      console.log('🔧 Impostazioni normalizzate per PersistentNotificationService:', {
        workReminder: normalizedSettings.workReminder,
        timeEntryReminder: normalizedSettings.timeEntryReminder,
        standbyReminder: normalizedSettings.standbyReminder
      });
      
      return normalizedSettings;
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni:', error);
      return { enabled: false };
    }
  }

  async scheduleWorkReminders(settings) {
    if (!settings.morningTime) return 0;
    
    try {
      const [hours, minutes] = settings.morningTime.split(':').map(Number);
      const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      let scheduledCount = 0;
      
      console.log(`📅 DEBUG scheduleWorkReminders - Usando orario: ${settings.morningTime}`);
      
      // Programma per 14 giorni invece di 7 per maggiore continuità
      for (let day = 0; day <= 14; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        if (targetDate <= new Date()) continue;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌅 Buongiorno! Inizio Lavoro',
            body: 'È ora di iniziare la giornata lavorativa. Ricordati di registrare l\'orario di inizio.',
            data: { 
              type: 'work_reminder', 
              date: targetDate.toISOString().split('T')[0],
              persistent: true // Flag per identificare notifiche persistenti
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
            color: '#1E3A8A',
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
        
        scheduledCount++;
        
        // Limite sicurezza per non superare i limiti di sistema
        if (scheduledCount >= 20) break;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria lavoro:', error);
      return 0;
    }
  }

  async scheduleTimeEntryReminders(settings) {
    // Gestisce sia il formato nuovo (time) che quello vecchio (eveningTime)
    const timeValue = settings.time || settings.eveningTime;
    if (!timeValue) return 0;
    
    try {
      const [hours, minutes] = timeValue.split(':').map(Number);
      let scheduledCount = 0;
      
      console.log(`⏰ DEBUG scheduleTimeEntryReminders - Usando orario: ${timeValue}`);
      
      // Programma per 14 giorni
      for (let day = 0; day <= 14; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        targetDate.setHours(hours, minutes, 0, 0);
        
        if (targetDate <= new Date()) continue;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Promemoria Orari',
            body: 'Non dimenticare di inserire gli orari di lavoro di oggi.',
            data: { 
              type: 'time_entry_reminder', 
              date: targetDate.toISOString().split('T')[0],
              persistent: true
            },
            sound: Platform.OS === 'android' ? 'default' : true,
            priority: Platform.OS === 'android' ? 'high' : undefined,
            color: '#1E3A8A',
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
        
        scheduledCount++;
        
        if (scheduledCount >= 20) break;
      }
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria orari:', error);
      return 0;
    }
  }

  async scheduleStandbyReminders(settings) {
    // Implementazione promemoria reperibilità
    try {
      if (!settings || !settings.enabled) {
        console.log('ℹ️ Notifiche reperibilità disabilitate');
        return 0;
      }

      // Usa il DatabaseService importato invece di require dinamico
      try {
        await DatabaseService.ensureInitialized();
      } catch (error) {
        console.error('❌ Errore inizializzazione DatabaseService:', error);
        return 0;
      }
      
      // Verifica che il DatabaseService abbia i metodi necessari
      if (!DatabaseService.getStandbyScheduleForNext7Days || !DatabaseService.getStandbySettings) {
        console.log('⚠️ DatabaseService non ha i metodi reperibilità, usa dati simulati');
        return await this.scheduleStandbyRemindersSimulated(settings);
      }

      console.log('📞 [DEBUG] Caricando dati reperibilità dal database...');
      
      // Usa lo stesso metodo del SuperNotificationService per ottenere i giorni di reperibilità
      const appSettings = await DatabaseService.getSetting('appSettings', null);
      console.log('📞 [DEBUG] appSettings dal database:', appSettings ? 'trovato' : 'non trovato');
      
      const standbySettings = appSettings?.standbySettings;
      console.log('📞 [DEBUG] standbySettings estratte:', standbySettings ? 'trovato' : 'non trovato');
      
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

      console.log(`📞 Programmazione notifiche per ${selectedDays.length} giorni di reperibilità`);
      
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

          // Programma la notifica
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📞 Promemoria Reperibilità',
                body: notification.message + ` (${standbyDate.toLocaleDateString('it-IT')})`,
                data: { 
                  type: 'standby_reminder',
                  standbyDate: standbyDateStr,
                  notificationType: notification.daysInAdvance === 0 ? 'today' : 'tomorrow',
                  persistent: true
                },
                sound: Platform.OS === 'android' ? 'default' : true,
                priority: Platform.OS === 'android' ? 'high' : undefined,
                color: '#9C27B0',
              },
              trigger: {
                type: 'date',
                date: notificationDate,
              },
            });
            
            scheduledForThisNotification++;
            totalScheduled++;
            
            console.log(`📞 [NO FILTER] Programmando reperibilità (${notification.daysInAdvance} giorni prima) per: ${notificationDate.toLocaleString('it-IT')} - Reperibilità: ${standbyDate.toLocaleDateString('it-IT')} (tra ${Math.round((notificationDate.getTime() - now.getTime()) / (1000 * 60))} min)`);
            
          } catch (error) {
            console.error('❌ Errore programmazione notifica reperibilità:', error);
          }
        }
        
        console.log(`📞 Notifica "${notification.message}" programmata per ${scheduledForThisNotification} giorni`);
      }
      
      console.log(`📞 [DEBUG] Totale notifiche reperibilità programmate: ${totalScheduled}`);
      return totalScheduled;
      
    } catch (error) {
      console.error('❌ Errore scheduleStandbyReminders:', error);
      return 0;
    }
  }

  async scheduleStandbyRemindersSimulated(settings) {
    // Implementazione con dati simulati per test
    try {
      console.log('🧪 Usando dati simulati per reperibilità');
      
      let scheduledCount = 0;
      const now = new Date();
      
      // Crea turni di reperibilità simulati per i prossimi 14 giorni
      for (let day = 1; day <= 14; day++) {
        // Solo nei weekend per simulazione
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        if (targetDate.getDay() === 0 || targetDate.getDay() === 6) { // Domenica o Sabato
          const startDate = new Date(targetDate);
          startDate.setHours(18, 0, 0, 0); // Inizio alle 18:00
          
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(8, 0, 0, 0); // Fine alle 8:00 del giorno dopo
          
          // Notifica 1 ora prima
          const notificationTime = new Date(startDate);
          notificationTime.setHours(17, 0, 0, 0); // 17:00
          
          if (notificationTime > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📞 Promemoria Reperibilità',
                body: `La tua reperibilità inizia tra un'ora (${startDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})})`,
                data: { 
                  type: 'standby_reminder',
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                  standbyId: `sim_${day}`,
                  persistent: true,
                  simulated: true
                },
                sound: Platform.OS === 'android' ? 'default' : true,
                priority: Platform.OS === 'android' ? 'high' : undefined,
                color: '#9C27B0',
              },
              trigger: {
                type: 'date',
                date: notificationTime,
              },
            });
            
            scheduledCount++;
          }
        }
      }
      
      console.log(`✅ Programmate ${scheduledCount} notifiche reperibilità simulate`);
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore scheduleStandbyRemindersSimulated:', error);
      return 0;
    }
  }

  async scheduleBackupReminders(settings) {
    // Implementazione promemoria backup
    try {
      if (!settings || !settings.enabled) {
        console.log('ℹ️ Notifiche backup disabilitate');
        return 0;
      }

      // Configurazioni predefinite per backup
      const backupConfig = {
        frequency: settings.frequency || 'weekly', // daily, weekly, monthly
        time: settings.time || '20:00',
        days: settings.days || [0] // 0 = Domenica (default per weekly)
      };

      console.log('💾 Programmazione notifiche backup:', backupConfig);
      
      let scheduledCount = 0;
      const now = new Date();
      const [hours, minutes] = backupConfig.time.split(':').map(Number);
      
      // Programma per 14 giorni invece di 7 per maggiore continuità
      for (let day = 0; day <= 14; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        targetDate.setHours(hours, minutes, 0, 0);
        
        // Salta se la data è già passata
        if (targetDate <= now) continue;
        
        let shouldSchedule = false;
        
        // Determina se programmare in base alla frequenza
        switch (backupConfig.frequency) {
          case 'daily':
            shouldSchedule = true;
            break;
          case 'weekly':
            shouldSchedule = backupConfig.days.includes(targetDate.getDay());
            break;
          case 'monthly':
            // Primo del mese o giorni specifici
            shouldSchedule = targetDate.getDate() === 1 || backupConfig.days.includes(targetDate.getDate());
            break;
        }
        
        if (shouldSchedule) {
          // Determina il messaggio in base alla frequenza
          let title, body;
          
          switch (backupConfig.frequency) {
            case 'daily':
              title = '💾 Backup Giornaliero';
              body = 'È ora di effettuare il backup giornaliero dei tuoi dati di lavoro.';
              break;
            case 'weekly':
              title = '💾 Backup Settimanale';
              body = 'È ora di effettuare il backup settimanale dei tuoi dati di lavoro.';
              break;
            case 'monthly':
              title = '💾 Backup Mensile';
              body = 'È ora di effettuare il backup mensile dei tuoi dati di lavoro.';
              break;
            default:
              title = '💾 Promemoria Backup';
              body = 'È ora di effettuare il backup dei tuoi dati di lavoro.';
          }
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: { 
                type: 'backup_reminder',
                frequency: backupConfig.frequency,
                scheduledDate: targetDate.toISOString(),
                persistent: true
              },
              sound: Platform.OS === 'android' ? 'default' : true,
              priority: Platform.OS === 'android' ? 'default' : undefined,
              color: '#607D8B',
            },
            trigger: {
              type: 'date',
              date: targetDate,
            },
          });
          
          scheduledCount++;
        }
      }
      
      console.log(`✅ Programmate ${scheduledCount} notifiche backup (${backupConfig.frequency})`);
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore scheduleBackupReminders:', error);
      return 0;
    }
  }

  // API pubblica per integrare con il sistema esistente
  async forceReschedule() {
    return await this.emergencyReschedule();
  }

  async getStatistics() {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const lastCheck = await AsyncStorage.getItem('last_notification_check');
      
      return {
        totalScheduled: scheduled.length,
        threshold: this.minNotificationsThreshold,
        needsReschedule: scheduled.length < this.minNotificationsThreshold,
        lastCheck: lastCheck ? new Date(parseInt(lastCheck)) : null,
        hasPermission: this.hasPermission,
        initialized: this.initialized
      };
    } catch (error) {
      console.error('❌ Errore statistiche:', error);
      return { error: error.message };
    }
  }

  // Metodo per forza la riprogrammazione da interfaccia debug
  async forceReschedule() {
    try {
      console.log('🔧 RIPROGRAMMAZIONE FORZATA DA DEBUG');
      
      // Cancella tutte le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      
      // Carica impostazioni notifiche dalle impostazioni utente
      const settings = await this.loadNotificationSettings();
      
      console.log('🔧 DEBUG RIPROGRAMMAZIONE - Impostazioni caricate:');
      console.log('- Notifiche abilitate:', settings.enabled);
      if (settings.workReminder) {
        console.log('- Orario promemoria lavoro:', settings.workReminder.morningTime);
        console.log('- Promemoria lavoro attivi:', settings.workReminder.enabled);
      }
      if (settings.timeEntryReminder) {
        console.log('- Orario promemoria orari:', settings.timeEntryReminder.eveningTime);
        console.log('- Promemoria orari attivi:', settings.timeEntryReminder.enabled);
      }
      if (settings.standbyReminder) {
        console.log('- Promemoria reperibilità attivi:', settings.standbyReminder.enabled);
        console.log('- Impostazioni reperibilità:', settings.standbyReminder);
      }
      
      if (!settings.enabled) {
        console.log('⚠️ Notifiche disabilitate dalle impostazioni');
        return 0;
      }

      let totalScheduled = 0;

      // Programma notifiche per tipo
      if (settings.workReminder?.enabled) {
        const count = await this.scheduleWorkReminders(settings.workReminder);
        totalScheduled += count;
        console.log(`📅 Riprogrammati ${count} promemoria lavoro`);
      }

      if (settings.timeEntryReminder?.enabled) {
        const count = await this.scheduleTimeEntryReminders(settings.timeEntryReminder);
        totalScheduled += count;
        console.log(`⏰ Riprogrammati ${count} promemoria orari`);
      }

      if (settings.standbyReminder?.enabled) {
        const count = await this.scheduleStandbyReminders(settings.standbyReminder);
        totalScheduled += count;
        console.log(`📞 Riprogrammati ${count} promemoria reperibilità`);
      }

      if (settings.backupReminder?.enabled) {
        const count = await this.scheduleBackupReminders(settings.backupReminder);
        totalScheduled += count;
        console.log(`💾 Riprogrammati ${count} promemoria backup`);
      }
      
      console.log(`✅ Riprogrammazione forzata completata: ${totalScheduled} notifiche`);
      return totalScheduled;
      
    } catch (error) {
      console.error('❌ Errore riprogrammazione forzata:', error);
      throw error;
    }
  }

  // Cleanup per evitare memory leak
  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    console.log('🧹 PersistentNotificationService distrutto');
  }
}

// Istanza singleton
const persistentNotificationService = new PersistentNotificationService();

export default persistentNotificationService;
