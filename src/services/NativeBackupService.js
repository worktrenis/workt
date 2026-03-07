// 🚀 NATIVE BACKUP SERVICE
// Sistema backup per app nativa con notifiche programmate e scelta destinazione

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import { Alert } from 'react-native';
import SystemNotificationPersistence from './SystemNotificationPersistenceService';

class NativeBackupService {
  constructor() {
    this.notificationsModule = null;
    this.fileSystemModule = null;
    this.sharingModule = null;
    this.isNativeReady = false;
    this.initializationAttempted = false;
    this.scheduledBackupId = null;
    this.lastAutoBackupTime = 0; // Timestamp ultimo backup automatico (anti-loop)
    this.notificationListenerSetup = false; // Flag per evitare listener multipli
    this.backupCheckInterval = null; // Interval per check periodico backup automatico
    console.log('🚀 NativeBackupService inizializzato con supporto destinazioni multiple');
    // Inizializzazione esplicita: non auto-avviare all'import per evitare side-effects.
  }

  // Metodo di inizializzazione pubblico
  async initialize() {
    return await this.initializeNativeBackup();
  }

  // 🕐 Genera timestamp nel fuso orario locale italiano
  getLocalTimestamp() {
    const now = new Date();
    // Semplice: aggiungi 1 ora (UTC+1) o 2 ore (UTC+2) in base al DST
    const isDST = this.isDaylightSavingTime(now);
    const hoursToAdd = isDST ? 2 : 1; // UTC+2 in estate, UTC+1 in inverno
    const italianTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
    return italianTime.toISOString();
  }

  // Verifica se siamo in ora legale (DST)
  isDaylightSavingTime(date) {
    const year = date.getFullYear();
    // L'ora legale in Europa va dall'ultima domenica di marzo all'ultima domenica di ottobre
    const march = new Date(year, 2, 31); // 31 marzo
    const october = new Date(year, 9, 31); // 31 ottobre
    
    // Trova l'ultima domenica di marzo
    const lastSundayMarch = new Date(march.getTime() - (march.getDay() * 24 * 60 * 60 * 1000));
    // Trova l'ultima domenica di ottobre  
    const lastSundayOctober = new Date(october.getTime() - (october.getDay() * 24 * 60 * 60 * 1000));
    
    return date >= lastSundayMarch && date < lastSundayOctober;
  }

  // 🔧 Inizializzazione automatica con supporto destinazioni
  async initializeNativeBackup() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      // Tenta di importare expo-notifications
      const Notifications = await import('expo-notifications');
      this.notificationsModule = Notifications;
      
      // Tenta di importare expo-file-system (preferisci legacy per SDK 54)
      try {
        const FileSystem = await import('expo-file-system/legacy');
        this.fileSystemModule = FileSystem;
        console.log('✅ FileSystem legacy caricato per backup su file');
      } catch (fsLegacyError) {
        try {
          const FileSystem = await import('expo-file-system');
          this.fileSystemModule = FileSystem;
          console.log('✅ FileSystem module caricato per backup su file');
        } catch (fsError) {
          console.log('📱 FileSystem non disponibile - solo AsyncStorage');
        }
      }
      
      // Tenta di importare expo-sharing
      try {
        const Sharing = await import('expo-sharing');
        this.sharingModule = Sharing;
        console.log('✅ Sharing module caricato per backup cloud');
      } catch (shareError) {
        console.log('📱 Sharing non disponibile - solo storage locale');
      }
      
      // Configura il comportamento delle notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,  // Sostituisce shouldShowAlert
          shouldShowList: true,    // Sostituisce shouldShowAlert
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Richiedi permessi
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        this.isNativeReady = true;
        console.log('✅ Sistema backup NATIVO pronto (expo-notifications)');
        console.log('🔔 Backup automatico NATIVE: funziona anche con app chiusa!');
        
        // Inizializza il sistema di backup
        await this.initializeBackupSystem();
      } else {
        console.log('⚠️ Permessi notifiche negati - usando fallback JavaScript');
        this.isNativeReady = false;
      }

    } catch (error) {
      console.log('📱 expo-notifications non disponibile - usando fallback JavaScript');
      console.log('ℹ️ Il backup nativo sarà disponibile con build nativa');
      this.isNativeReady = false;
    }
  }

  // 🔄 Inizializza sistema backup (solo se richiesto)
  async initializeBackupSystem() {
    try {
      const settings = await this.getBackupSettings();
      
      if (settings.enabled && this.isNativeReady) {
        // NON programmare automaticamente all'avvio
        console.log('📱 Sistema backup nativo pronto, attivazione manuale richiesta');
      } else if (settings.enabled) {
        console.log('📱 Backup automatico abilitato ma sistema nativo non disponibile');
      } else {
        console.log('📱 Backup automatico disabilitato nelle impostazioni');
      }
    } catch (error) {
      console.error('❌ Errore inizializzazione sistema backup:', error);
    }
  }

  // 📋 Ottieni impostazioni backup complete
  async getBackupSettings() {
    try {
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      const time = await AsyncStorage.getItem('auto_backup_time');
      const destination = await AsyncStorage.getItem('auto_backup_destination');
      const customPath = await AsyncStorage.getItem('auto_backup_custom_path');
      
      return {
        enabled: enabled === 'true' || (enabled ? JSON.parse(enabled) : false),
        time: time || '02:00',
        destination: destination || 'asyncstorage', // asyncstorage, filesystem, cloud
        customPath: customPath || null
      };
    } catch (error) {
      console.error('Errore lettura impostazioni backup:', error);
      return { 
        enabled: false, 
        time: '02:00',
        destination: 'asyncstorage',
        customPath: null
      };
    }
  }

  // 📁 Ottieni destinazioni backup disponibili
  getAvailableDestinations() {
    const destinations = [
      {
        id: 'asyncstorage',
        name: 'Memoria App (AsyncStorage)',
        description: 'Salva nella memoria interna dell\'app (più veloce)',
        icon: 'phone-portrait-outline',
        available: true,
        reliable: true
      }
    ];

    if (this.fileSystemModule) {
      destinations.push({
        id: 'filesystem',
        name: 'File System',
        description: 'Salva come file nella cartella documenti del dispositivo',
        icon: 'folder-outline',
        available: true,
        reliable: true
      });
    }

    if (this.sharingModule) {
      destinations.push({
        id: 'cloud',
        name: 'Cloud Storage',
        description: 'Salva e condividi automaticamente nel cloud (Drive, iCloud)',
        icon: 'cloud-outline',
        available: true,
        reliable: false // Dipende dalla connessione
      });
    }

    return destinations;
  }

  // ⚙️ Aggiorna impostazioni destinazione backup
  async updateBackupDestination(destination, customPath = null) {
    try {
      await AsyncStorage.setItem('auto_backup_destination', destination);
      
      if (customPath) {
        await AsyncStorage.setItem('auto_backup_custom_path', customPath);
      } else {
        await AsyncStorage.removeItem('auto_backup_custom_path');
      }
      
      console.log(`📁 [NATIVE] Destinazione backup aggiornata: ${destination}`);
      if (customPath) {
        console.log(`📂 [NATIVE] Percorso personalizzato: ${customPath}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento destinazione backup:', error);
      return false;
    }
  }

  // 🔔 Programma backup nativo con notifiche background-ready
  // Pianifica backup nativo solo all'orario scelto, nessun backup su salvataggio/cambio dati
  async scheduleNativeBackup(settings) {
    if (!this.isNativeReady || !this.notificationsModule) {
      console.log('⚠️ Sistema nativo non disponibile per backup programmato');
      return false;
    }
    try {
      // Cancella tutte le notifiche programmate di tipo backup prima di schedulare
      await this.notificationsModule.cancelAllScheduledNotificationsAsync();
      this.scheduledBackupId = null;
      console.log('🗑️ [NATIVE] Tutte le notifiche backup precedenti cancellate');
      const [hours, minutes] = settings.time.split(':').map(Number);
      const now = new Date();
      const nextTrigger = new Date();
      nextTrigger.setHours(hours, minutes, 0, 0);
      if (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      const diffInSeconds = Math.floor((nextTrigger.getTime() - now.getTime()) / 1000);
      
      // Sicurezza: se il trigger è troppo vicino (meno di 30 secondi), sposta al giorno dopo
      if (diffInSeconds < 30) {
        console.log(`⚠️ [NATIVE] Trigger troppo vicino (${diffInSeconds}s), spostando al giorno successivo`);
        nextTrigger.setDate(nextTrigger.getDate() + 1);
        const newDiffInSeconds = Math.floor((nextTrigger.getTime() - now.getTime()) / 1000);
        console.log(`📅 [NATIVE] Nuovo trigger: ${nextTrigger.toLocaleString('it-IT')} (tra ${newDiffInSeconds} secondi)`);
      }
      
      const finalDiffInSeconds = Math.floor((nextTrigger.getTime() - now.getTime()) / 1000);
      
      // Salva il timestamp della programmazione per anti-trigger immediato
      // Salva anche il timestamp effettivo del prossimo trigger
      await AsyncStorage.setItem('last_backup_schedule_time', Date.now().toString());
      await AsyncStorage.setItem('last_backup_trigger_time', nextTrigger.getTime().toString());
      console.log(`[DEBUG] 📅 Trigger time salvato: ${nextTrigger.toLocaleString('it-IT')} (${nextTrigger.getTime()})`);
      console.log(`[DEBUG] 📅 Orario attuale: ${now.toLocaleString('it-IT')} (${now.getTime()})`);
      console.log(`[DEBUG] 📅 Differenza finale: ${finalDiffInSeconds} secondi`);
      
      // Nessun backup immediato, solo all'orario programmato
      console.log(`🔔 [NATIVE] Programmando backup automatico per: ${nextTrigger.toLocaleString('it-IT')} (tra ${finalDiffInSeconds} secondi)`);
      
      // Crea notifica SILENZIOSA che esegue backup automaticamente
      const notificationId = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title: '💾 WorkT - Backup Automatico',
          body: 'Esecuzione backup automatico in corso...',
          data: {
            type: 'auto_backup_silent',
            action: 'perform_backup_now',
            timestamp: new Date().toISOString(),
            destination: settings.destination || 'asyncstorage'
          },
          sound: false, // SILENZIOSO
          priority: this.notificationsModule.AndroidNotificationPriority.MIN, // PRIORITÀ MINIMA
          categoryIdentifier: 'BACKUP_SILENT',
          badge: 0, // Nessun badge
          autoDismiss: true // Auto-rimozione
        },
        trigger: {
          seconds: finalDiffInSeconds,
          repeats: false,
        },
      });
      
      this.scheduledBackupId = notificationId;
      
      if (!this.notificationListenerSetup) {
        this.setupSilentBackupListener();
        this.notificationListenerSetup = true;
      }
      
      console.log(`✅ [NATIVE] Backup silenzioso programmato con ID: ${notificationId}`);
      console.log(`📅 [NATIVE] Esecuzione automatica: ${nextTrigger.toLocaleString('it-IT')}`);
      return true;
    } catch (error) {
      console.error(`❌ [NATIVE] Errore programmazione backup: ${error.message}`);
      return false;
    }
  }

  // 🔇 Listener SILENZIOSO per backup automatico (come notifiche di sistema)
  setupSilentBackupListener() {
    if (!this.notificationsModule) return;
    if (this.notificationListenerSetup) return;
    this.notificationListenerSetup = true;
    console.log('� [NATIVE] Setup listener SILENZIOSO per backup automatico');
    
    // 1️⃣ LISTENER PRIMARIO: Notifica ricevuta (app in background/chiusa)
    this.notificationsModule.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      console.log('🔇 [NATIVE] Notifica backup ricevuta (app in background):', JSON.stringify(data));
      
      if (data?.type === 'auto_backup_silent' && data?.action === 'perform_backup_now') {
        console.log('🔇 [NATIVE] Esecuzione backup automatico SILENZIOSO...');
        
        try {
          // Esegui backup automaticamente SENZA UI
          const backupResult = await this.executeSilentBackup(data.destination || 'asyncstorage');
          
          if (backupResult.success) {
            console.log('✅ [NATIVE] Backup silenzioso completato con successo');
            
            // 🔔 Aggiungi notifica di sistema per backup completato
            await this.addSystemNotification({
              type: 'success',
              title: '✅ Backup Completato',
              message: `Backup automatico salvato con successo (${backupResult.entriesCount} registrazioni, ${(backupResult.size / 1024).toFixed(1)}KB)`,
              category: 'backup',
              priority: 'normal',
              persistent: true,
              metadata: {
                destination: backupResult.destination,
                entriesCount: backupResult.entriesCount,
                size: backupResult.size,
                timestamp: new Date().toISOString()
              }
            });
            
            // Programma il prossimo backup automaticamente
            setTimeout(async () => {
              await this.scheduleNextAutoBackup();
            }, 1000);
            
            // Notifica discreta di completamento (se richiesta)
            await this.showSilentBackupCompletedNotification(backupResult);
          } else {
            console.error('❌ [NATIVE] Backup silenzioso fallito:', backupResult.error);
            
            // 🔔 Aggiungi notifica di sistema per backup fallito
            await this.addSystemNotification({
              type: 'error',
              title: '❌ Backup Fallito',
              message: `Errore durante backup automatico: ${backupResult.error}`,
              category: 'backup',
              priority: 'high',
              persistent: true,
              metadata: {
                error: backupResult.error,
                timestamp: new Date().toISOString()
              }
            });
            
            await this.showSilentBackupErrorNotification(backupResult.error);
          }
          
        } catch (error) {
          console.error('❌ [NATIVE] Errore durante backup silenzioso:', error);
          await this.showSilentBackupErrorNotification(error.message);
        }
      }
    });
    
    // 2️⃣ LISTENER SECONDARIO: Risposta utente (se app viene riaperta)
    this.notificationsModule.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      console.log('� [NATIVE] Risposta utente a notifica backup:', JSON.stringify(data));
      
      if (data?.type === 'backup_completed_silent') {
        console.log('ℹ️ [NATIVE] Utente ha visualizzato notifica backup completato');
        // Nessuna azione richiesta - solo log
      }
    });
    
    console.log('✅ [NATIVE] Listener silenzioso configurato per backup automatico');
  }

  // Metodo per eseguire backup silenzioso senza UI
  async executeSilentBackup(destination = 'asyncstorage') {
    try {
      console.log('🔇 [NATIVE] Avvio backup silenzioso...');
      
      // Verifica anti-duplicato
      const lastAutoBackupStr = await AsyncStorage.getItem('last_auto_backup_date');
      const now = Date.now();
      
      if (lastAutoBackupStr) {
        const lastAutoTime = new Date(lastAutoBackupStr).getTime();
        const hoursSinceLast = (now - lastAutoTime) / (1000 * 60 * 60);
        
        if (hoursSinceLast < 8) { // Almeno 8 ore tra backup automatici
          console.log(`⏳ [NATIVE] Backup silenzioso saltato: già eseguito ${hoursSinceLast.toFixed(1)}h fa`);
          return { success: false, reason: 'too_recent' };
        }
      }
      
      // Ottieni i dati dal database
      const timeEntries = await DatabaseService.getAllTimeEntries() || [];
      const settings = await DatabaseService.getSettings() || {};
      
      const backupData = {
        timeEntries,
        settings,
        metadata: {
          version: '1.2.1',
          createdAt: new Date().toISOString(),
          type: 'auto_silent',
          platform: 'native'
        }
      };
      
      const backupKey = `auto_backup_silent_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
      
      // Salva in base alla destinazione
      let saveResult;
      switch (destination) {
        case 'filesystem':
          saveResult = await this.saveToFileSystem(backupKey, backupData);
          break;
        case 'cloud':
          saveResult = await this.saveToCloud(backupKey, backupData);
          break;
        default:
          saveResult = await this.saveToAsyncStorage(backupKey, backupData);
      }
      
      if (saveResult.success) {
        // Aggiorna timestamp ultimo backup
        await AsyncStorage.setItem('last_auto_backup_date', new Date().toISOString());
        console.log('✅ [NATIVE] Backup silenzioso completato con successo');
        
        return {
          success: true,
          destination: saveResult.destination,
          key: backupKey,
          size: JSON.stringify(backupData).length,
          entriesCount: timeEntries.length
        };
      } else {
        throw new Error(saveResult.error || 'Errore salvataggio backup');
      }
      
    } catch (error) {
      console.error('❌ [NATIVE] Errore backup silenzioso:', error);
      return { success: false, error: error.message };
    }
  }

  // Notifica discreta di backup completato
  async showSilentBackupCompletedNotification(backupResult) {
    if (!this.notificationsModule) return;
    
    try {
      await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title: '✅ Backup Completato',
          body: `Backup automatico salvato con successo (${backupResult.entriesCount} registrazioni)`,
          data: {
            type: 'backup_completed_silent',
            result: backupResult
          },
          sound: false,
          priority: this.notificationsModule.AndroidNotificationPriority.LOW,
          badge: 0,
          autoDismiss: true
        },
        trigger: null // Immediata
      });
      
      console.log('📲 [NATIVE] Notifica backup completato inviata');
    } catch (error) {
      console.error('❌ [NATIVE] Errore notifica backup completato:', error);
    }
  }

  // Notifica di errore backup
  async showSilentBackupErrorNotification(errorMessage) {
    if (!this.notificationsModule) return;
    
    try {
      await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title: '⚠️ Errore Backup',
          body: `Backup automatico fallito: ${errorMessage}`,
          data: {
            type: 'backup_error_silent',
            error: errorMessage
          },
          sound: true, // Solo per errori
          priority: this.notificationsModule.AndroidNotificationPriority.DEFAULT
        },
        trigger: null // Immediata
      });
      
      console.log('📲 [NATIVE] Notifica errore backup inviata');
    } catch (error) {
      console.error('❌ [NATIVE] Errore notifica errore backup:', error);
    }
  }

  // Programma automaticamente il prossimo backup
  async scheduleNextAutoBackup() {
    try {
      const settings = await this.getBackupSettings();
      if (settings.enabled) {
        console.log('🔄 [NATIVE] Programmazione automatica prossimo backup...');
        await this.updateBackupSettings(settings);
        console.log('✅ [NATIVE] Prossimo backup programmato automaticamente');
      }
    } catch (error) {
      console.error('❌ [NATIVE] Errore programmazione prossimo backup:', error);
    }
  }

  // Listener per compatibilità con SuperBackupService
  setupBackupCompatibilityListener() {
    if (!this.notificationsModule) return;
    
    this.notificationsModule.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      
      if (data?.type === 'backup_reminder') {
        // Gestione backup_reminder da SuperBackupService
        console.log('💾 [NATIVE] Ricevuto backup_reminder da SuperBackupService');
        await this.executeBackup(true);
        return;
      } else if (data?.type !== 'auto_backup_trigger') {
        console.log(`[DEBUG] 🔔 Notifica ricevuta (non backup):`, data?.type || 'unknown');
      }
    });
    
    this.notificationsModule.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'auto_backup_trigger') {
        console.log('👆 [NATIVE] Utente ha toccato notifica backup');
        await this.executeBackup(true);
      }
    });
    
    this.notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        console.log(`🔔 [NATIVE] Notifica ricevuta in background: ${data?.type}`);
        
        // Mostra solo le notifiche di conferma backup, non quelle di trigger
        if (data?.type === 'backup_complete') {
          return {
            shouldShowBanner: true,  // Sostituisce shouldShowAlert
            shouldShowList: true,    // Sostituisce shouldShowAlert
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        } else {
          // Per tutte le altre notifiche (incluso auto_backup_trigger), non mostrare
          return {
            shouldShowBanner: false, // Sostituisce shouldShowAlert
            shouldShowList: false,   // Sostituisce shouldShowAlert
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      },
    });
  }

  // 💾 Esegui backup con destinazione configurabile
  async executeBackup(isAutomatic = false) {
    try {
      const executionTime = new Date().toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log(`🔄 [NATIVE] 🚀 INIZIO BACKUP ${isAutomatic ? 'AUTOMATICO' : 'MANUALE'} alle ${executionTime}...`);

      // ANTI-LOOP: blocca backup automatico solo se già fatto automaticamente nelle ultime 20 ore
      // Ma permetti backup automatici programmati anche se ci sono stati backup manuali recenti
      if (isAutomatic) {
        const lastAutoBackupDateStr = await AsyncStorage.getItem('last_auto_backup_date');
        if (lastAutoBackupDateStr) {
          // ✅ VERIFICA CONSISTENZA: Se non ci sono backup fisici, rimuovi il timestamp
          const allKeys = await AsyncStorage.getAllKeys();
          const actualBackups = allKeys.filter(key => 
            key.startsWith('backup_auto_') || 
            key.startsWith('auto_backup_2')
          );
          
          if (actualBackups.length === 0) {
            console.log(`🧹 [NATIVE] Nessun backup fisico trovato ma timestamp presente - rimuovo timestamp inconsistente`);
            await AsyncStorage.removeItem('last_auto_backup_date');
            console.log(`✅ [NATIVE] Timestamp inconsistente rimosso - OK per nuovo backup`);
          } else {
            const lastAutoBackupDate = new Date(lastAutoBackupDateStr);
            const now = new Date();
            const diffMs = now - lastAutoBackupDate;
            
            // Se il timestamp è nel futuro, è corrotto - rimuovilo
            if (diffMs < 0) {
              console.log(`🧹 [NATIVE] Timestamp corrotto nel futuro (${Math.round(diffMs / (60 * 60 * 1000))}h), rimuovo la chiave`);
              await AsyncStorage.removeItem('last_auto_backup_date');
              console.log(`✅ [NATIVE] Timestamp corrotto rimosso - OK per nuovo backup`);
            } else if (diffMs < 20 * 60 * 60 * 1000) { // 20 ore (per gestire backup programmati il giorno dopo)
              console.log('⏳ [NATIVE] Backup automatico già eseguito nelle ultime 20 ore, skip!');
              return { success: false, error: 'Backup automatico già eseguito di recente' };
            } else {
              console.log(`✅ [NATIVE] Ultimo backup automatico: ${Math.round(diffMs / (60 * 60 * 1000))}h fa - OK per nuovo backup`);
            }
          }
        } else {
          console.log(`✅ [NATIVE] Nessun backup automatico precedente trovato - OK per nuovo backup`);
        }
      }

      // Ottieni impostazioni backup complete
      const settings = isAutomatic ? await this.getBackupSettings() : { destination: 'asyncstorage' };

      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();

      if (!data || Object.keys(data).length === 0) {
        throw new Error('Nessun dato trovato per il backup');
      }

      // Crea metadati backup
      const timestamp = this.getLocalTimestamp();
      const backupData = {
        metadata: {
          version: '1.0.0',
          created: timestamp,
          type: isAutomatic ? 'automatic' : 'manual',
          entries: data.workEntries?.length || 0,
          system: 'native',
          destination: settings.destination || 'asyncstorage'
        },
        data: data
      };

      const backupKey = `backup_${isAutomatic ? 'auto' : 'manual'}_${timestamp.replace(/[:.]/g, '-')}`;
      let saveResult = null;

      // Salva in base alla destinazione scelta
      switch (settings.destination) {
        case 'filesystem':
          saveResult = await this.saveToFileSystem(backupKey, backupData);
          break;
        case 'cloud':
          saveResult = await this.saveToCloud(backupKey, backupData);
          break;
        case 'asyncstorage':
        default:
          saveResult = await this.saveToAsyncStorage(backupKey, backupData);
          break;
      }

      if (!saveResult.success) {
        throw new Error(`Errore salvataggio in ${settings.destination}: ${saveResult.error}`);
      }

      // Aggiorna timestamp ultimo backup (generale e specifico per tipo)
      await AsyncStorage.setItem('last_backup_date', timestamp);
      if (isAutomatic) {
        await AsyncStorage.setItem('last_auto_backup_date', timestamp);
      }

      console.log(`✅ [NATIVE] Backup ${isAutomatic ? 'automatico' : 'manuale'} completato in ${settings.destination}: ${saveResult.path || backupKey}`);

      // Mostra notifica di conferma SOLO per backup automatici
      if (isAutomatic && this.notificationsModule) {
        try {
          // Verifica permessi notifiche prima di inviare
          const { status } = await this.notificationsModule.getPermissionsAsync();
          console.log(`🔔 [NATIVE] Status permessi notifiche: ${status}`);
          
          if (status !== 'granted') {
            console.warn('⚠️ [NATIVE] Permessi notifiche non concessi, impossibile mostrare conferma backup');
            return { success: true, backupKey, timestamp };
          }
          
          // ANTI-DUPLICATO: cancella tutte le notifiche backup complete prima di inviarne una nuova
          await this.notificationsModule.cancelAllScheduledNotificationsAsync();
          const fileName = saveResult.fileName || backupKey;
          const folderName = this.getDestinationDisplayName(settings.destination);
          await this.notificationsModule.scheduleNotificationAsync({
            content: {
              title: '✅ WorkT - Backup Automatico Completato',
              body: `Backup \"${fileName}\" salvato in ${folderName}.\n${data.workEntries?.length || 0} registrazioni salvate.`,
              data: { 
                type: 'backup_complete',
                timestamp: timestamp,
                destination: settings.destination,
                fileName,
                folderName,
                silent: false
              },
              sound: true,
              priority: this.notificationsModule.AndroidNotificationPriority.DEFAULT,
            },
            trigger: null // Immediata
          });

          console.log('📝 [NATIVE] Notifica conferma backup inviata');
          
        } catch (notificationError) {
          console.warn('⚠️ [NATIVE] Errore invio notifica conferma:', notificationError.message);
        }
      }

      const completionTime = new Date().toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log(`✅ [NATIVE] 🎉 BACKUP ${isAutomatic ? 'AUTOMATICO' : 'MANUALE'} COMPLETATO alle ${completionTime}!`);
      if (isAutomatic) {
        // Salva timestamp backup automatico per anti-loop
        await AsyncStorage.setItem('last_auto_backup_date', new Date().toISOString());
        console.log(`📅 [NATIVE] Timestamp backup automatico salvato: ${completionTime}`);
      }

      return { success: true, backupKey, timestamp };

    } catch (error) {
      console.error(`❌ [NATIVE] Errore backup: ${error.message}`);

      // Notifica errore (NON immediata per evitare spam)
      if (this.notificationsModule) {
        try {
          await this.notificationsModule.scheduleNotificationAsync({
            content: {
              title: '❌ Errore Backup',
              body: 'Si è verificato un errore durante il backup automatico',
              data: { type: 'backup_error' },
              priority: this.notificationsModule.AndroidNotificationPriority.LOW,
            },
            trigger: null
          });
        } catch (e) {}
      }
      return { success: false, error: error.message };
    }
  }

  // 💾 Salva in AsyncStorage
  async saveToAsyncStorage(backupKey, backupData) {
    try {
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`📱 [NATIVE] Backup salvato in AsyncStorage: ${backupKey}`);
      return { success: true, path: backupKey };
    } catch (error) {
      console.error('❌ Errore salvataggio AsyncStorage:', error);
      
      // 🧹 Se è un errore di spazio, prova a pulire e riprovare
      if (error.message && error.message.includes('SQLITE_FULL')) {
        console.log('🧹 Spazio pieno detected, pulisco backup vecchi...');
        
        try {
          // 1. Pulisci backup vecchi
          await this.cleanOldBackups();
          
          // 2. Ottimizza database
          if (typeof DatabaseService !== 'undefined' && DatabaseService.optimizeDatabase) {
            await DatabaseService.optimizeDatabase();
            console.log('🗃️ Database ottimizzato');
          }
          
          // 3. Riprova il salvataggio
          await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
          console.log(`📱 [NATIVE] Backup salvato dopo pulizia: ${backupKey}`);
          
          // 4. Notifica successo della pulizia automatica
          await this.sendNotification(
            'Backup automatico',
            'Spazio liberato automaticamente. Backup completato con successo.',
            { 
              seconds: 3,
              priority: 'normal'
            }
          );
          
          return { success: true, path: backupKey };
          
        } catch (retryError) {
          console.error('❌ Errore anche dopo pulizia:', retryError);
          
          // Notifica ritardata per evitare spam
          await this.sendNotification(
            'Backup automatico',
            'Spazio insufficiente. Controlla le impostazioni backup.',
            { 
              seconds: 10,
              priority: 'low'
            }
          );
          
          return { success: false, error: 'Spazio insufficiente dopo pulizia' };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 📁 Salva nel file system
  async saveToFileSystem(backupKey, backupData) {
    if (!this.fileSystemModule) {
      return { success: false, error: 'FileSystem non disponibile' };
    }

    try {
      const documentsPath = this.fileSystemModule.documentDirectory;
      const backupPath = `${documentsPath}backup/`;
      
      // Crea cartella backup se non esiste
      const dirInfo = await this.fileSystemModule.getInfoAsync(backupPath);
      if (!dirInfo.exists) {
        await this.fileSystemModule.makeDirectoryAsync(backupPath, { intermediateDirectories: true });
      }
      
      const fileName = `${backupKey}.json`;
      const filePath = `${backupPath}${fileName}`;
      
      await this.fileSystemModule.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Salva anche referenza in AsyncStorage per tracking
      await AsyncStorage.setItem(backupKey, JSON.stringify({
        ...backupData,
        metadata: {
          ...backupData.metadata,
          filePath: filePath,
          fileSize: JSON.stringify(backupData).length
        }
      }));
      
      console.log(`📁 [NATIVE] Backup salvato nel file system: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Errore salvataggio file system:', error);
      return { success: false, error: error.message };
    }
  }

  // ☁️ Salva nel cloud
  async saveToCloud(backupKey, backupData) {
    if (!this.sharingModule || !this.fileSystemModule) {
      return { success: false, error: 'Moduli cloud non disponibili' };
    }

    try {
      // Prima salva nel file system temporaneo
      const tempResult = await this.saveToFileSystem(backupKey, backupData);
      
      if (!tempResult.success) {
        return tempResult;
      }
      
      // Poi condividi automaticamente nel cloud
      const canShare = await this.sharingModule.isAvailableAsync();
      
      if (canShare) {
        await this.sharingModule.shareAsync(tempResult.path, {
          mimeType: 'application/json',
          dialogTitle: `Backup WorkT - ${new Date().toLocaleDateString('it-IT')}`,
          UTI: 'public.json'
        });
        
        console.log(`☁️ [NATIVE] Backup condiviso nel cloud: ${tempResult.path}`);
        return { success: true, path: tempResult.path, shared: true };
      } else {
        console.log('⚠️ [NATIVE] Sharing non disponibile, salvato solo localmente');
        return { success: true, path: tempResult.path, shared: false };
      }
    } catch (error) {
      console.error('❌ Errore salvataggio cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // 📝 Ottieni nome display della destinazione
  getDestinationDisplayName(destination) {
    const names = {
      'asyncstorage': 'Memoria App',
      'filesystem': 'File System',
      'cloud': 'Cloud Storage'
    };
    return names[destination] || 'Sconosciuta';
  }

  // 📊 Statistiche backup native
  async getBackupStats() {
    try {
      const settings = await this.getBackupSettings();
      const backups = await this.getBackupList();
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      
      return {
        totalBackups: backups.length,
        automaticBackups: backups.filter(b => b.type === 'automatic').length,
        manualBackups: backups.filter(b => b.type === 'manual').length,
        lastBackup: lastBackupDate ? new Date(lastBackupDate) : null,
        nextBackup: this.getNextBackupTime(settings),
        enabled: settings.enabled,
        isActive: this.isNativeReady && this.scheduledBackupId !== null,
        isNativeReady: this.isNativeReady,
        systemType: this.isNativeReady ? 'native' : 'fallback',
        scheduledBackupId: this.scheduledBackupId
      };
    } catch (error) {
      console.error('Errore calcolo statistiche backup native:', error);
      return null;
    }
  }

  // 📅 Calcola prossimo backup
  getNextBackupTime(settings) {
    if (!settings.enabled) return null;
    
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    const nextBackup = new Date();
    nextBackup.setHours(hours, minutes, 0, 0);
    
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }
    
    return nextBackup;
  }

  // 📋 Lista backup salvati
  async getBackupList() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith('backup_'));
      
      const backups = [];
      for (const key of backupKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          const parsed = JSON.parse(data);
          if (parsed.metadata) {
            backups.push({
              key,
              name: key,
              date: parsed.metadata.created,
              type: parsed.metadata.type,
              entries: parsed.metadata.entries,
              system: parsed.metadata.system || 'unknown'
            });
          }
        } catch (e) {
          console.warn(`Backup corrotto saltato: ${key}`);
        }
      }
      
      return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Errore lettura lista backup:', error);
      return [];
    }
  }

  // 🗑️ Cancella backup programmato
  async cancelScheduledBackup() {
    if (this.isNativeReady && this.scheduledBackupId && this.notificationsModule) {
      try {
        await this.notificationsModule.cancelScheduledNotificationAsync(this.scheduledBackupId);
        this.scheduledBackupId = null;
        console.log('🗑️ [NATIVE] Backup programmato cancellato');
        return true;
      } catch (error) {
        console.error('❌ [NATIVE] Errore cancellazione backup:', error);
        return false;
      }
    }
    return false;
  }

  // � METODO DI EMERGENZA: Cancella TUTTE le notifiche backup
  async emergencyStopAllBackupNotifications() {
    try {
      if (this.isNativeReady && this.notificationsModule) {
        // Cancella tutte le notifiche programmate
        await this.notificationsModule.cancelAllScheduledNotificationsAsync();
        console.log('🚨 [NATIVE] EMERGENZA: Tutte le notifiche backup cancellate');
        
        // Reset contatori
        this.scheduledBackupId = null;
        this.lastAutoBackupTime = Date.now(); // Previene esecuzioni immediate
        
        // Disabilita temporaneamente il backup automatico
        await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(false));
        console.log('🚨 [NATIVE] Backup automatico temporaneamente disabilitato');
        
        return true;
      }
    } catch (error) {
      console.error('❌ [NATIVE] Errore stop emergenza:', error);
    }
    return false;
  }

  // 🔄 Aggiorna impostazioni backup (enabled/time) - NUOVO APPROCCIO CON CHECK PERIODICO
  async updateBackupSettings(enabled, time) {
    try {
      console.log(`🔄 [NATIVE] Aggiornamento impostazioni: ${enabled ? 'Abilitato' : 'Disabilitato'} alle ${time}`);
      
      // Cancella sempre il backup precedente e il check periodico
      await this.cancelScheduledBackup();
      if (this.backupCheckInterval) {
        clearInterval(this.backupCheckInterval);
        this.backupCheckInterval = null;
      }
      
      // Cancella tutte le notifiche backup programmate
      try {
        await this.notificationsModule.cancelAllScheduledNotificationsAsync();
        console.log('🗑️ [NATIVE] Notifiche backup precedenti cancellate');
      } catch (cancelError) {
        console.warn('⚠️ [NATIVE] Errore cancellazione notifiche:', cancelError.message);
      }
      
      // Salva nuove impostazioni
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(enabled));
      await AsyncStorage.setItem('auto_backup_time', time);
      
      if (!enabled) {
        console.log('📱 [NATIVE] Backup automatico disabilitato');
        return true;
      }

      // NUOVO APPROCCIO: Check periodico invece di notifiche schedulate
      const [hour, minute] = time.split(':').map(Number);
      const now = new Date();
      const nextTrigger = new Date(now);
      nextTrigger.setHours(hour, minute, 0, 0);
      
      // Se l'ora è già passata oggi, programma per domani
      if (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      
      // Salva il trigger time
      await AsyncStorage.setItem('last_backup_schedule_time', Date.now().toString());
      await AsyncStorage.setItem('last_backup_trigger_time', nextTrigger.getTime().toString());
      
      const currentTimeFormatted = now.toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const triggerTimeFormatted = nextTrigger.toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log(`[DEBUG] 📅 Ora attuale: ${currentTimeFormatted}`);
      console.log(`[DEBUG] 📅 Prossimo backup programmato per: ${triggerTimeFormatted}`);
      
      // 🔔 SISTEMA IBRIDO: Notifica programmata + Check periodico
      // 1️⃣ Programma notifica per quando l'app è chiusa
      try {
        await this.notificationsModule.scheduleNotificationAsync({
          content: {
            title: '⏰ Backup Automatico Programmato',
            body: `È l'ora del backup automatico (${time})`,
            data: { 
              type: 'backup_trigger',
              scheduledTime: triggerTime.getTime(),
              destination: destination
            },
          },
          trigger: triggerTime,
        });
        console.log(`🔔 [NATIVE] Notifica backup programmata per le ${triggerTimeFormatted} (funziona con app chiusa)`);
      } catch (notifError) {
        console.warn('⚠️ [NATIVE] Errore programmazione notifica backup:', notifError.message);
      }
      
      // 2️⃣ Imposta check periodico per quando l'app è aperta
      this.backupCheckInterval = setInterval(async () => {
        try {
          const now = new Date();
          const currentTime = now.toLocaleString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          const triggerTimeStr = await AsyncStorage.getItem('last_backup_trigger_time');
          
          if (triggerTimeStr) {
            const triggerTime = parseInt(triggerTimeStr, 10);
            const diff = Math.abs(now.getTime() - triggerTime);
            const minutesDiff = diff / (1000 * 60);
            
            const triggerTimeFormatted = new Date(triggerTime).toLocaleString('it-IT', {
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            
            // Log di monitoraggio ogni minuto
            console.log(`🕐 [NATIVE CHECK - APP APERTA] Ora attuale: ${currentTime} | Backup programmato: ${triggerTimeFormatted} | Differenza: ${minutesDiff.toFixed(1)} min`);
            
            // Se siamo nel range di 1 minuto dal trigger time
            if (minutesDiff <= 1) {
              console.log(`⏰ [NATIVE CHECK - APP APERTA] 🎯 ORARIO BACKUP RAGGIUNTO! Ora attuale: ${currentTime}`);
              
              // Check anti-duplicate
              const lastAutoBackupStr = await AsyncStorage.getItem('last_auto_backup_date');
              console.log(`🔍 [DEBUG] lastAutoBackupStr valore: "${lastAutoBackupStr}"`);
              
              if (lastAutoBackupStr) {
                // ✅ VERIFICA CONSISTENZA: Se non ci sono backup fisici, rimuovi il timestamp
                const allKeys = await AsyncStorage.getAllKeys();
                const actualBackups = allKeys.filter(key => 
                  key.startsWith('backup_auto_') || 
                  key.startsWith('auto_backup_2')
                );
                
                if (actualBackups.length === 0) {
                  console.log(`🧹 [NATIVE] Nessun backup fisico trovato ma timestamp presente - rimuovo timestamp inconsistente`);
                  await AsyncStorage.removeItem('last_auto_backup_date');
                  console.log(`✅ [NATIVE] Timestamp inconsistente rimosso - OK per nuovo backup`);
                } else {
                  const lastAutoTime = new Date(lastAutoBackupStr).getTime();
                  const hoursSinceLast = (now.getTime() - lastAutoTime) / (1000 * 60 * 60);
                  
                  console.log(`🔍 [DEBUG] lastAutoTime: ${lastAutoTime} (${new Date(lastAutoTime).toLocaleString('it-IT')})`);
                  console.log(`🔍 [DEBUG] now.getTime(): ${now.getTime()} (${now.toLocaleString('it-IT')})`);
                  console.log(`🔍 [DEBUG] hoursSinceLast calcolato: ${hoursSinceLast.toFixed(2)}h`);
                  console.log(`🔍 [DEBUG] Backup fisici trovati: ${actualBackups.length} (${actualBackups.join(', ')})`);
                  
                  // Se il timestamp è nel futuro, è corrotto - rimuovilo
                  if (hoursSinceLast < 0) {
                    console.log(`🧹 [NATIVE] Timestamp corrotto nel futuro (${hoursSinceLast.toFixed(1)}h), rimuovo la chiave`);
                    await AsyncStorage.removeItem('last_auto_backup_date');
                    console.log(`✅ [NATIVE] Timestamp corrotto rimosso - OK per nuovo backup`);
                  } else if (hoursSinceLast < 8) {
                    console.log(`⏳ [NATIVE] Backup automatico già eseguito ${hoursSinceLast.toFixed(1)}h fa, skip`);
                    return;
                  } else {
                    console.log(`✅ [NATIVE] Ultimo backup automatico: ${hoursSinceLast.toFixed(1)}h fa - OK per nuovo backup`);
                  }
                }
              } else {
                console.log(`✅ [NATIVE] Nessun backup automatico precedente trovato - OK per nuovo backup`);
              }
              
              console.log(`✅ [NATIVE] 🚀 AVVIO BACKUP AUTOMATICO alle ${currentTime}`);
              await this.executeBackup(true);
              
              // Programma il prossimo backup per domani
              const tomorrow = new Date(triggerTime);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowFormatted = tomorrow.toLocaleString('it-IT', {
                hour: '2-digit', 
                minute: '2-digit', 
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              await AsyncStorage.setItem('last_backup_trigger_time', tomorrow.getTime().toString());
              console.log(`📅 [NATIVE] Prossimo backup programmato per: ${tomorrowFormatted}`);
            }
          } else {
            console.log(`🕐 [NATIVE CHECK] Ora attuale: ${currentTime} | Nessun backup programmato`);
          }
        } catch (checkError) {
          const errorTime = new Date().toLocaleString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          console.error(`❌ [NATIVE] Errore nel check periodico alle ${errorTime}:`, checkError);
        }
      }, 60000); // Check ogni minuto
      
      console.log(`✅ [NATIVE] Sistema backup automatico attivato con check periodico per le ${time}`);
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni backup:', error);
      return false;
    }
  }

  // 🔄 Metodo combinato per aggiornare tutte le impostazioni
  async updateAllBackupSettings(enabled, time, destination, customPath = null) {
    try {
      // Prima aggiorna la destinazione
      await this.updateBackupDestination(destination, customPath);
      
      // Poi aggiorna enabled e time
      return await this.updateBackupSettings(enabled, time);
    } catch (error) {
      console.error('❌ Errore aggiornamento completo impostazioni backup:', error);
      return false;
    }
  }

  // 📱 Stato del sistema
  getSystemStatus() {
    return {
      isNativeReady: this.isNativeReady,
      hasNotificationsModule: !!this.notificationsModule,
      systemType: this.isNativeReady ? 'native' : 'fallback',
      description: this.isNativeReady 
        ? 'Backup nativo (100% affidabile anche con app chiusa)'
        : 'Backup JavaScript (solo app aperta)',
      scheduledBackupId: this.scheduledBackupId
    };
  }

  // 🧹 Pulisce backup vecchi per liberare spazio
  async cleanOldBackups() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys.filter(key => 
        key.startsWith('backup_') || 
        key.startsWith('auto_backup_') ||
        key.includes('_backup_')
      );
      
      console.log(`🧹 Trovati ${backupKeys.length} backup da controllare`);
      
      if (backupKeys.length <= 3) {
        console.log('🧹 Meno di 3 backup, non pulisco');
        return;
      }
      
      // Ordina per data (più vecchi prima)
      const backupsWithDates = [];
      for (const key of backupKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const backup = JSON.parse(data);
            const date = backup.timestamp || backup.created_at || key;
            backupsWithDates.push({ key, date });
          }
        } catch (e) {
          // Se non riesco a leggere, lo considero da eliminare
          backupsWithDates.push({ key, date: '1970-01-01' });
        }
      }
      
      // Ordina per data (più vecchi prima)
      backupsWithDates.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Mantieni solo gli ultimi 3, rimuovi gli altri
      const toDelete = backupsWithDates.slice(0, -3);
      
      for (const { key } of toDelete) {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Rimosso backup vecchio: ${key}`);
        } catch (e) {
          console.error(`❌ Errore rimozione ${key}:`, e);
        }
      }
      
      console.log(`🧹 Pulizia completata: rimossi ${toDelete.length} backup vecchi`);
      
    } catch (error) {
      console.error('❌ Errore durante pulizia backup:', error);
    }  
  }

  // � METODO HELPER PER NOTIFICHE DI SISTEMA
  async addSystemNotification(notification) {
    try {
      await SystemNotificationPersistence.initialize();
      await SystemNotificationPersistence.addNotification(notification);
      console.log(`📱 Notifica sistema aggiunta: ${notification.title}`);
    } catch (error) {
      console.error('❌ Errore creazione notifica sistema:', error);
    }
  }

  // �📋 Alias per compatibilità con BackupService
  async listLocalBackups() {
    return await this.getBackupList();
  }

  // 💾 Alias per compatibilità - backup locale 
  async createLocalBackup(backupName = null, filteredData = null) {
    return await this.executeBackup(false); // false = manuale
  }

  // 🧪 TEST BACKUP CON APP CHIUSA
  async testBackupWithAppClosed() {
    console.log('🧪 === TEST BACKUP NATIVO CON APP CHIUSA ===');
    
    try {
      // Programma un backup tra 2 minuti
      const testTime = new Date();
      testTime.setMinutes(testTime.getMinutes() + 2);
      const timeString = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
      
      console.log(`🧪 Programmando backup test per le ${timeString} (tra 2 minuti)`);
      console.log('🧪 Per testare:');
      console.log('🧪 1. Chiudi completamente l\'app (background + swipe up)');
      console.log('🧪 2. Spegni lo schermo');
      console.log('🧪 3. Aspetta la notifica alle ' + timeString);
      console.log('🧪 4. Tocca la notifica per riaprire l\'app');
      console.log('🧪 5. Controlla se il backup è stato eseguito');
      
      // Attiva il backup automatico per il test
      const success = await this.updateBackupSettings(true, timeString);
      if (success) {
        console.log('✅ 🧪 Test programmato con successo!');
        console.log('💡 🧪 ISTRUZIONI: Chiudi l\'app ADESSO e aspetta la notifica!');
        return true;
      } else {
        console.error('❌ 🧪 Errore programmazione test');
        return false;
      }
    } catch (error) {
      console.error('❌ 🧪 Errore test backup app chiusa:', error);
      return false;
    }
  }
}

// Esporta istanza singleton
const nativeBackupService = new NativeBackupService();
export default nativeBackupService;
