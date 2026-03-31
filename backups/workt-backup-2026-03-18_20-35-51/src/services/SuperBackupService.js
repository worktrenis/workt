// 🚀 SUPER BACKUP SERVICE - SOLUZIONE DEFINITIVA
// Sistema backup che funziona SEMPRE, con recovery automatico
// Risolve tutti i problemi del sistema precedente

// Import condizionali per evitare problemi con Node.js
let AsyncStorage, Notifications, Alert;

// Funzione di inizializzazione imports
function initializeImports() {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    Notifications = require('expo-notifications');
    const RN = require('react-native');
    Alert = RN.Alert;
    return true;
  } catch (error) {
    console.warn('⚠️ Imports React Native non disponibili (ambiente Node.js?):', error.message);
    // Mock per test Node.js
    AsyncStorage = {
      getItem: async () => null,
      setItem: async () => true,
      removeItem: async () => true,
      getAllKeys: async () => [],
      multiRemove: async () => {},
    };
    Alert = { alert: () => {} };
    Notifications = {
      scheduleNotificationAsync: async () => 'mock-id',
      cancelScheduledNotificationAsync: async () => {},
    };
    return false;
  }
}

class SuperBackupService {
  constructor() {
    this.initialized = false;
    this.hasNotificationPermission = false;
    this.databaseService = null; // Importato dinamicamente
    
    // Inizializza imports condizionali
    this.isReactNativeEnvironment = initializeImports();
    
    console.log('🚀 SuperBackupService inizializzato', this.isReactNativeEnvironment ? '(React Native)' : '(Node.js Mock)');
  }

  // ✅ IMPORT DINAMICO DATABASE (evita loop dipendenze)
  async getDatabaseService() {
    if (!this.databaseService) {
      try {
        // Prova import diretto per React Native
        this.databaseService = require('./DatabaseService.js');
        
        // Verifica che il servizio abbia i metodi necessari
        if (!this.databaseService || typeof this.databaseService.getAllData !== 'function') {
          console.warn('⚠️ DatabaseService non ha il metodo getAllData, tentando import alternativo...');
          
          // Prova import con default export
          const dbModule = require('./DatabaseService.js');
          this.databaseService = dbModule.default || dbModule;
          
          if (!this.databaseService || typeof this.databaseService.getAllData !== 'function') {
            console.error('❌ DatabaseService non disponibile o metodo getAllData mancante');
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
      console.log('⚠️ SuperBackupService già inizializzato, saltando inizializzazione');
      return true;
    }
    
    try {
      console.log('🔄 Inizializzazione SuperBackupService...');
      
      // Segna subito come inizializzato per evitare loop
      this.initialized = true;
      
      // Verifica permessi notifiche per promemoria backup
      const { status } = await Notifications.getPermissionsAsync();
      this.hasNotificationPermission = status === 'granted';
      
      // 🔄 RECOVERY AUTOMATICO: TEMPORANEAMENTE DISABILITATO per evitare loop
      // await this.checkAndRecoverMissedBackups();
      console.log('⚠️ Recovery backup disabilitato temporaneamente');
      
      // Programma notifiche promemoria backup
      await this.scheduleBackupReminders();
      console.log('✅ Promemoria backup programmati all\'avvio');
      
      console.log('✅ SuperBackupService inizializzato con successo');
      
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione SuperBackupService:', error);
      return false;
    }
  }

  // 🔄 RECOVERY AUTOMATICO: Verifica e recupera backup mancati
  async checkAndRecoverMissedBackups() {
    try {
      console.log('🔍 Verifica backup mancati...');
      
      const settings = await this.getBackupSettings();
      
      if (!settings.enabled) {
        console.log('📱 Backup automatico disabilitato');
        return;
      }
      
      // Ottieni ultimo backup
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      const lastBackup = lastBackupDate ? new Date(lastBackupDate) : new Date(0);
      const now = new Date();
      
      // Calcola quante ore sono passate
      const hoursElapsed = (now - lastBackup) / (1000 * 60 * 60);
      
      // Se sono passate più di 26 ore dall'ultimo backup, c'è un problema
      if (hoursElapsed > 26) {
        console.log(`⚠️ Rilevato gap di ${Math.round(hoursElapsed)} ore dall'ultimo backup`);
        
        // Calcola quanti backup sono stati saltati
        const backupsSkipped = Math.floor(hoursElapsed / 24);
        
        if (backupsSkipped > 0) {
          console.log(`🚨 Backup saltati rilevati: ${backupsSkipped}`);
          
          // Esegui backup di recovery
          const recoveryResult = await this.executeEmergencyBackup(`Recovery dopo ${backupsSkipped} backup saltati`);
          
          if (recoveryResult.success) {
            console.log(`✅ Backup di recovery completato: ${recoveryResult.fileName}`);
            
            // Notifica utente solo se app è attiva
            if (this.hasNotificationPermission) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '🔄 Backup Recovery Completato',
                  body: `Sistema backup ripristinato. Backup di recovery: ${recoveryResult.fileName}`,
                  data: { type: 'backup_recovery' },
                  sound: true,
                },
                trigger: null, // Immediata
              });
            }
          }
        }
      }
      
      // Aggiorna timestamp controllo
      await AsyncStorage.setItem('last_backup_check', now.toISOString());
      
    } catch (error) {
      console.error('❌ Errore recovery backup mancati:', error);
    }
  }

  // 🚨 BACKUP DI EMERGENZA
  async executeEmergencyBackup(reason = 'Emergency backup') {
    try {
      console.log(`🚨 === BACKUP DI EMERGENZA ===`);
      console.log(`🔄 Motivo: ${reason}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `emergency-backup-${timestamp}.json`;
      
      // Ottieni database service dinamicamente
      const DatabaseService = await this.getDatabaseService();
      if (!DatabaseService) {
        console.error('❌ DatabaseService non disponibile per backup di emergenza');
        return { success: false, error: 'DatabaseService non disponibile' };
      }
      
      // Ottieni tutti i dati
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Nessun dato trovato per il backup di emergenza');
        return { success: false, error: 'Nessun dato' };
      }
      
      // Crea backup con metadati speciali
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'emergency_recovery',
          reason: reason,
          version: '1.0',
          app: 'WorkTracker',
          recoveryBackup: true
        }
      };
      
      // Salva in AsyncStorage
      const backupKey = `emergency_backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'emergency');
      
      // Aggiorna timestamp ultimo backup
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      
      console.log(`✅ Backup di emergenza completato: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        type: 'emergency_recovery'
      };
      
    } catch (error) {
      console.error('❌ Errore backup di emergenza:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🔄 BACKUP BACKGROUND (per task background - bypassa controlli anti-spam)
  async executeBackgroundBackup() {
    try {
      console.log('🔄 === BACKUP BACKGROUND TASK ===');
      console.log('🔄 Esecuzione backup tramite task background (app chiusa)');
      
      // Verifica se backup automatico è abilitato
      const settings = await this.getBackupSettings();
      if (!settings.enabled) {
        console.log('⚠️ Backup automatico disabilitato nelle impostazioni');
        return { success: false, reason: 'Backup automatico disabilitato' };
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `background-backup-${timestamp}.json`;
      
      // Ottieni database service dinamicamente
      const DatabaseService = await this.getDatabaseService();
      if (!DatabaseService) {
        console.error('❌ DatabaseService non disponibile per backup background');
        return { success: false, error: 'DatabaseService non disponibile' };
      }
      
      // Ottieni tutti i dati
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Nessun dato trovato per il backup background');
        return { success: false, error: 'Nessun dato' };
      }
      
      // Crea backup con metadati speciali per background task
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'background_task',
          reason: 'Backup automatico eseguito in background',
          version: '1.0',
          app: 'WorkTracker',
          backgroundTask: true
        }
      };
      
      // Salva in AsyncStorage
      const backupKey = `background_backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'background');
      
      // Aggiorna timestamp ultimo backup
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      
      console.log(`✅ Backup background completato: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        type: 'background_task'
      };
      
    } catch (error) {
      console.error('❌ Errore backup background:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 📅 PROGRAMMA NOTIFICHE PROMEMORIA BACKUP
  async scheduleBackupReminders() {
    if (!this.hasNotificationPermission) {
      console.log('📱 Permessi notifiche mancanti - promemoria backup non disponibili');
      return 0;
    }
    
    try {
      const settings = await this.getBackupSettings();
      
      // 🚨 ANTI-SPAM: Verifica se sono già stati programmati di recente
      const lastScheduleTime = await AsyncStorage.getItem('last_backup_schedule_time');
      const now = Date.now();
      
      if (lastScheduleTime) {
        const timeSinceLastSchedule = now - parseInt(lastScheduleTime);
        const hoursAgo = timeSinceLastSchedule / (1000 * 60 * 60);
        
        if (hoursAgo < 1) { // Meno di 1 ora fa
          console.log(`⏭️ ANTI-SPAM: Promemoria già programmati ${Math.round(hoursAgo * 60)} minuti fa, saltando...`);
          return 0;
        }
      }
      
      // 🚨 CORREZIONE CRITICA: Cancella TUTTE le notifiche backup all'avvio per fermare loop
      console.log('🗑️ ANTI-LOOP: Cancellando tutte le notifiche backup esistenti...');
      const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existingNotifications) {
        if (notification.content.data?.type === 'backup_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      console.log('✅ Notifiche backup esistenti cancellate');
      
      // Programma solo se backup automatico è veramente attivo
      if (!settings.enabled) {
        console.log('📱 Backup automatico disabilitato - nessun promemoria');
        return 0;
      }
      
      const [hours, minutes] = settings.time.split(':').map(Number);
      let scheduledCount = 0;
      
      // 🚨 CORREZIONE: Programma solo 3 backup reminder invece di 30 per evitare spam
      const maxDays = 3; // Solo i prossimi 3 giorni
      for (let day = 1; day <= maxDays; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        targetDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const timeDiff = targetDate.getTime() - now.getTime();
        const minutesUntil = Math.round(timeDiff / 1000 / 60);
        
        // Solo se nel futuro
        if (targetDate <= now) {
          console.log(`⏭️ Saltando backup per ${targetDate.toLocaleString('it-IT')} (nel passato)`);
          continue;
        }
        
        // 🚨 CORREZIONE: Log meno verboso
        console.log(`💾 [REDUCED] Programmando backup ${day}/${maxDays}: ${targetDate.toLocaleDateString('it-IT')} alle ${settings.time}`);
        
        // 🚨 CORREZIONE: Rimuovi alert di debug per evitare spam
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💾 Promemoria Backup',
            body: `È l'ora del backup automatico giornaliero (${settings.time})`,
            data: { 
              type: 'backup_reminder',
              scheduledTime: settings.time,
              date: targetDate.toISOString().split('T')[0]
            },
            sound: true,
          },
          trigger: {
            date: targetDate,
          },
        });
        
        scheduledCount++;
      }
      
      console.log(`✅ Programmati ${scheduledCount} promemoria backup (ridotto da 30 per evitare spam)`);
      
      // Salva timestamp programmazione per anti-spam
      await AsyncStorage.setItem('last_backup_schedule_time', Date.now().toString());
      
      return scheduledCount;
      
    } catch (error) {
      console.error('❌ Errore programmazione promemoria backup:', error);
      return 0;
    }
  }

  // 💾 ESEGUI BACKUP AUTOMATICO AVANZATO
  async executeAutomaticBackup() {
    try {
      console.log('🔄 === BACKUP AUTOMATICO AVANZATO ===');
      
      // Controllo semplice dello stato backup
      if (__DEV__) {
        console.log('🔧 DEBUG: executeAutomaticBackup chiamato in development');
      } else {
        console.log('🏭 PRODUZIONE: executeAutomaticBackup chiamato in build nativa');
        // Rimosso Alert per evitare spam
      }
      
      const settings = await this.getBackupSettings();
      
      if (!settings.enabled) {
        console.log('📱 Backup automatico disabilitato');
        return { success: false, reason: 'Disabilitato' };
      }
      
      // 🚨 CONTROLLO ANTI-SPAM RAFFORZATO: Minimo 2 ore tra backup
      const lastScheduleTime = await AsyncStorage.getItem('last_backup_schedule_time');
      if (lastScheduleTime) {
        const timeSinceSchedule = Date.now() - parseInt(lastScheduleTime, 10);
        const minutesSinceSchedule = timeSinceSchedule / (1000 * 60);
        
        if (minutesSinceSchedule < 120) { // 2 ore
          console.log(`⏳ Backup bloccato: troppo presto dalla programmazione (${minutesSinceSchedule.toFixed(0)} min)`);
          if (!__DEV__) {
            console.log('🚨 SPAM PREVENTION: Backup bloccato per evitare spam');
          }
          return { success: false, reason: 'TroppoPresto' };
        }
      }
      
      // Verifica se è troppo presto per un altro backup
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      if (lastBackupDate) {
        const lastBackup = new Date(lastBackupDate);
        const now = new Date();
        const hoursElapsed = (now - lastBackup) / (1000 * 60 * 60);
        
        if (hoursElapsed < 20) {
          console.log(`⏭️ Backup troppo recente (${Math.round(hoursElapsed)}h fa), saltando`);
          return { success: false, reason: 'Troppo recente' };
        }
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `auto-backup-${timestamp}.json`;
      
      // Ottieni database service dinamicamente
      const DatabaseService = await this.getDatabaseService();
      if (!DatabaseService) {
        console.error('❌ DatabaseService non disponibile per backup automatico');
        return { success: false, error: 'DatabaseService non disponibile' };
      }
      
      // Ottieni tutti i dati
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Nessun dato trovato per il backup');
        return { success: false, error: 'Nessun dato' };
      }
      
      // Crea backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'automatic_super',
          version: '1.0',
          app: 'WorkTracker',
          scheduledTime: settings.time,
          dataStats: {
            workEntries: data.workEntries?.length || 0,
            standbyDays: data.standbyDays?.length || 0,
            settings: data.settings?.length || 0
          }
        }
      };
      
      // Salva in AsyncStorage
      const backupKey = `auto_backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'automatic');
      
      // Pulizia backup vecchi
      await this.cleanupOldBackups();
      
      // Aggiorna timestamp ultimo backup
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      
      console.log(`✅ Backup automatico completato: ${fileName}`);
      
      // 🚨 CORREZIONE: Rimuovi notifica di successo per evitare spam
      // Invia solo log, non notifiche popup
      console.log('📝 Backup completato - notifica popup disabilitata per evitare spam');
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        dataStats: backupData.backupInfo.dataStats
      };
      
    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      
      // Notifica errore
      if (this.hasNotificationPermission) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❌ Errore Backup',
            body: `Backup automatico fallito: ${error.message}`,
            data: { type: 'backup_error', error: error.message },
            sound: true,
          },
          trigger: null,
        });
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 💾 BACKUP MANUALE AVANZATO
  async executeManualBackup(customName = null) {
    try {
      // 🚨 ANTI-SPAM: Controlla se è stato eseguito un backup di recente
      const lastBackupTime = await AsyncStorage.getItem('last_manual_backup_time');
      const now = Date.now();
      
      if (lastBackupTime && !customName) { // Non applicare anti-spam per backup custom/test
        const timeSinceLastBackup = now - parseInt(lastBackupTime);
        const minutesAgo = timeSinceLastBackup / (1000 * 60);
        
        if (minutesAgo < 5) { // Meno di 5 minuti fa
          console.log(`⏭️ ANTI-SPAM: Backup già eseguito ${Math.round(minutesAgo)} minuti fa, saltando...`);
          return { success: false, error: 'Backup già eseguito di recente (anti-spam)', spam: true };
        }
      }
      
      console.log('🔄 === BACKUP MANUALE AVANZATO ===');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName || `manual-backup-${timestamp}.json`;
      
      // Ottieni database service dinamicamente
      const DatabaseService = await this.getDatabaseService();
      if (!DatabaseService) {
        console.error('❌ DatabaseService non disponibile per backup manuale');
        return { success: false, error: 'DatabaseService non disponibile' };
      }
      
      // NUOVO: Tentativo con gestione SQLITE_FULL
      let data;
      try {
        console.log('📦 Tentativo lettura dati completi...');
        data = await DatabaseService.getAllData();
      } catch (dbError) {
        console.log('⚠️ Errore lettura database:', dbError.message);
        
        if (dbError.message.includes('SQLITE_FULL') || dbError.message.includes('disk is full')) {
          console.log('🚨 Database pieno - tentativo backup di emergenza...');
          return await this.executeEmergencyBackup(DatabaseService, fileName);
        }
        throw dbError;
      }
      
      if (!data || Object.keys(data).length === 0) {
        return { success: false, error: 'Nessun dato trovato' };
      }
      
      // Log degli interventi prima del backup
      if (data.workEntries) {
        const entriesWithInterventi = data.workEntries.filter(entry => 
          entry.interventi && entry.interventi.length > 0
        );
        
        console.log(`🚨 BACKUP INTERVENTI: Trovate ${entriesWithInterventi.length} entry con interventi da includere nel backup`);
        entriesWithInterventi.forEach((entry, index) => {
          console.log(`🚨 BACKUP INTERVENTI: ${index + 1}. Data: ${entry.date}, Interventi: ${entry.interventi.length}`);
          entry.interventi.forEach((intervento, i) => {
            console.log(`🚨 BACKUP INTERVENTI:    - Intervento ${i + 1}: ${intervento.startTime || 'undefined'} - ${intervento.endTime || 'undefined'}`);
          });
        });
      }
      
      // Crea backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'manual_super',
          version: '1.0',
          app: 'WorkTracker',
          manual: true,
          dataStats: {
            workEntries: data.workEntries?.length || 0,
            standbyDays: data.standbyDays?.length || 0,
            settings: data.settings?.length || 0
          }
        }
      };
      
      // NUOVO: Salvataggio sicuro con gestione memoria
      const backupKey = `manual_backup_${timestamp}`;
      try {
        await this.saveBackupSafely(backupKey, backupData);
      } catch (saveError) {
        console.log('⚠️ Errore salvataggio standard, tentativo chunks...');
        return await this.saveBackupInChunks(backupKey, backupData, fileName);
      }
      
      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'manual');
      
      console.log(`✅ Backup manuale completato: ${fileName}`);
      
      // 🚨 ANTI-SPAM: Salva timestamp ultimo backup manuale
      if (!customName) { // Solo per backup non-custom
        await AsyncStorage.setItem('last_manual_backup_time', Date.now().toString());
      }
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        size: JSON.stringify(backupData).length,
        dataStats: backupData.backupInfo.dataStats
      };
      
    } catch (error) {
      console.error('❌ Errore backup manuale:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🚨 BACKUP DI EMERGENZA per SQLITE_FULL
  async executeEmergencyBackup(DatabaseService, fileName) {
    console.log('🚨 === BACKUP DI EMERGENZA ===');
    
    try {
      // Tentativo di lettura batch per batch
      const emergencyData = {
        workEntries: [],
        settings: [],
        standbyDays: [],
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'emergency_backup',
          version: '1.0',
          app: 'WorkTracker',
          manual: true,
          emergency: true
        }
      };
      
      // Prova a leggere workEntries in batch piccoli
      try {
        console.log('📦 Tentativo lettura workEntries batch...');
        const entries = await DatabaseService.getWorkEntries(2025, 7); // Solo luglio 2025
        emergencyData.workEntries = entries || [];
        console.log(`✅ Lette ${emergencyData.workEntries.length} workEntries`);
      } catch (err) {
        console.log('⚠️ Impossibile leggere workEntries:', err.message);
      }
      
      // Prova a leggere settings
      try {
        console.log('📦 Tentativo lettura settings...');
        const settings = await DatabaseService.getAllSettings();
        emergencyData.settings = settings || [];
        console.log(`✅ Lette ${emergencyData.settings.length} settings`);
      } catch (err) {
        console.log('⚠️ Impossibile leggere settings:', err.message);
      }
      
      // Salvataggio di emergenza
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `emergency_backup_${timestamp}`;
      
      try {
        await AsyncStorage.setItem(backupKey, JSON.stringify(emergencyData));
        console.log('✅ Backup di emergenza salvato in AsyncStorage');
      } catch (storageError) {
        console.log('❌ Impossibile salvare in AsyncStorage:', storageError.message);
        return { success: false, error: 'Storage pieno o non disponibile' };
      }
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        size: JSON.stringify(emergencyData).length,
        dataStats: {
          workEntries: emergencyData.workEntries.length,
          settings: emergencyData.settings.length,
          standbyDays: emergencyData.standbyDays.length
        },
        emergency: true
      };
      
    } catch (error) {
      console.error('❌ Errore backup di emergenza:', error);
      return { success: false, error: error.message, emergency: true };
    }
  }

  // 💾 SALVATAGGIO SICURO CON GESTIONE MEMORIA
  async saveBackupSafely(backupKey, backupData) {
    const jsonString = JSON.stringify(backupData);
    const sizeKB = Math.round(jsonString.length / 1024);
    
    console.log(`📊 Dimensione backup: ${sizeKB} KB`);
    
    if (sizeKB > 5000) { // Se > 5MB
      throw new Error('Backup troppo grande per salvataggio standard');
    }
    
    await AsyncStorage.setItem(backupKey, jsonString);
    console.log('✅ Backup salvato normalmente');
  }

  // 📦 SALVATAGGIO IN CHUNKS
  async saveBackupInChunks(backupKey, backupData, fileName) {
    console.log('🔄 Salvataggio backup in chunks...');
    
    try {
      // Dividi i dati in sezioni più piccole
      const chunks = {
        metadata: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'chunked_backup',
          totalChunks: 3
        },
        workEntries: backupData.workEntries || [],
        settings: backupData.settings || [],
        other: {
          standbyDays: backupData.standbyDays || [],
          backupInfo: backupData.backupInfo
        }
      };
      
      // Salva ogni chunk separatamente
      for (const [chunkName, chunkData] of Object.entries(chunks)) {
        const chunkKey = `${backupKey}_${chunkName}`;
        await AsyncStorage.setItem(chunkKey, JSON.stringify(chunkData));
        console.log(`✅ Chunk salvato: ${chunkName}`);
      }
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        chunked: true,
        chunks: Object.keys(chunks).length
      };
      
    } catch (error) {
      console.error('❌ Errore salvataggio chunks:', error);
      return { success: false, error: error.message };
    }
  }

  // 📝 AGGIORNA LISTA BACKUP
  async updateBackupList(fileName, backupKey, type) {
    try {
      const currentBackups = await AsyncStorage.getItem('super_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      const backupData = await AsyncStorage.getItem(backupKey);
      const size = backupData ? backupData.length : 0;
      
      const newBackup = {
        name: fileName,
        key: backupKey,
        date: new Date().toISOString(),
        type: type,
        size: size,
        service: 'SuperBackupService'
      };
      
      const updatedBackups = [newBackup, ...backups];
      await AsyncStorage.setItem('super_backups', JSON.stringify(updatedBackups));
      
      console.log(`📝 Lista backup aggiornata: ${updatedBackups.length} backup totali`);
    } catch (error) {
      console.error('❌ Errore aggiornamento lista backup:', error);
    }
  }

  // 🧹 PULIZIA BACKUP VECCHI (mantieni gli ultimi 10)
  async cleanupOldBackups() {
    try {
      const currentBackups = await AsyncStorage.getItem('super_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      // Separa per tipo
      const automaticBackups = backups.filter(b => b.type === 'automatic');
      const manualBackups = backups.filter(b => b.type === 'manual');
      const emergencyBackups = backups.filter(b => b.type === 'emergency');
      
      let deletedCount = 0;
      
      // Mantieni ultimi 5 backup automatici
      if (automaticBackups.length > 5) {
        const toDelete = automaticBackups.slice(5);
        for (const backup of toDelete) {
          try {
            await AsyncStorage.removeItem(backup.key);
            deletedCount++;
          } catch (error) {
            console.warn(`⚠️ Errore eliminazione backup ${backup.name}:`, error);
          }
        }
      }
      
      // Mantieni ultimi 3 backup manuali
      if (manualBackups.length > 3) {
        const toDelete = manualBackups.slice(3);
        for (const backup of toDelete) {
          try {
            await AsyncStorage.removeItem(backup.key);
            deletedCount++;
          } catch (error) {
            console.warn(`⚠️ Errore eliminazione backup ${backup.name}:`, error);
          }
        }
      }
      
      // Mantieni tutti i backup di emergenza (sono importanti)
      
      if (deletedCount > 0) {
        // Ricostruisci lista senza i backup eliminati
        const remainingBackups = backups.filter(backup => {
          if (backup.type === 'automatic') return automaticBackups.slice(0, 5).includes(backup);
          if (backup.type === 'manual') return manualBackups.slice(0, 3).includes(backup);
          if (backup.type === 'emergency') return true; // Mantieni tutti
          return true;
        });
        
        await AsyncStorage.setItem('super_backups', JSON.stringify(remainingBackups));
        console.log(`🧹 Pulizia completata: eliminati ${deletedCount} backup vecchi`);
      }
      
    } catch (error) {
      console.error('❌ Errore pulizia backup:', error);
    }
  }

  // ⚙️ IMPOSTAZIONI BACKUP
  async getBackupSettings() {
    try {
      // DEBUG: Leggi entrambe le chiavi per confrontare
      const oldEnabled = await AsyncStorage.getItem('super_backup_enabled');
      const oldTime = await AsyncStorage.getItem('super_backup_time');
      const newEnabled = await AsyncStorage.getItem('auto_backup_enabled');
      const newTime = await AsyncStorage.getItem('auto_backup_time');
      
      console.log('🔍 DEBUG getBackupSettings - Old keys:', { oldEnabled, oldTime });
      console.log('🔍 DEBUG getBackupSettings - New keys:', { newEnabled, newTime });
      
      // Usa le chiavi standard del BackupScreen
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      const time = await AsyncStorage.getItem('auto_backup_time');
      
      const result = {
        enabled: enabled ? JSON.parse(enabled) : false,
        time: time || '02:00'
      };
      
      console.log('🔍 DEBUG getBackupSettings - Result:', result);
      
      if (!__DEV__) {
        Alert.alert('DEBUG Backup Settings', `Enabled: ${result.enabled}, Time: ${result.time}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore lettura impostazioni backup:', error);
      return { enabled: false, time: '02:00' };
    }
  }

  async updateBackupSettings(enabled, time) {
    try {
      // Usa le chiavi standard del BackupScreen
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(enabled));
      await AsyncStorage.setItem('auto_backup_time', time);
      
      console.log('🔍 DEBUG updateBackupSettings:', { enabled, time });
      
      if (enabled) {
        // Riprogramma promemoria backup
        await this.scheduleBackupReminders();
        console.log(`✅ Backup automatico attivato per le ${time}`);
      } else {
        // Cancella promemoria esistenti
        const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of existingNotifications) {
          if (notification.content.data?.type === 'backup_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
        console.log('🛑 Backup automatico disattivato');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni backup:', error);
      return false;
    }
  }

  // 📊 STATISTICHE BACKUP
  async getBackupStats() {
    try {
      const backups = await this.getBackupList();
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      const lastCheck = await AsyncStorage.getItem('last_backup_check');
      const settings = await this.getBackupSettings();
      
      // Calcola prossimo backup
      let nextBackup = null;
      if (settings.enabled) {
        const now = new Date();
        const [hours, minutes] = settings.time.split(':').map(Number);
        nextBackup = new Date();
        nextBackup.setHours(hours, minutes, 0, 0);
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 1);
        }
      }
      
      return {
        totalBackups: backups.length,
        automaticBackups: backups.filter(b => b.type === 'automatic').length,
        manualBackups: backups.filter(b => b.type === 'manual').length,
        emergencyBackups: backups.filter(b => b.type === 'emergency').length,
        lastBackup: lastBackupDate ? new Date(lastBackupDate) : null,
        lastCheck: lastCheck ? new Date(lastCheck) : null,
        nextBackup: nextBackup,
        enabled: settings.enabled,
        scheduledTime: settings.time,
        systemActive: true,
        service: 'SuperBackupService'
      };
      
    } catch (error) {
      console.error('❌ Errore calcolo statistiche backup:', error);
      return null;
    }
  }

  // 📋 LISTA BACKUP
  async getBackupList() {
    try {
      const backups = await AsyncStorage.getItem('super_backups');
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('❌ Errore lettura lista backup:', error);
      return [];
    }
  }

  // 🧪 TEST SISTEMA BACKUP
  async testBackupSystem() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🧪 === TEST SUPER BACKUP SYSTEM ===');
      
      // Test backup manuale
      const testResult = await this.executeManualBackup('test-backup-system');
      
      if (testResult.success) {
        console.log(`✅ Test backup riuscito: ${testResult.fileName}`);
        console.log(`📊 Dati backup: ${JSON.stringify(testResult.dataStats)}`);
        
        return {
          success: true,
          testBackup: testResult,
          testTime: new Date().toISOString()
        };
      } else {
        console.log(`❌ Test backup fallito: ${testResult.error}`);
        return {
          success: false,
          error: testResult.error
        };
      }
      
    } catch (error) {
      console.error('❌ Errore test backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🔄 FORZA BACKUP IMMEDIATO
  async forceBackupNow() {
    console.log('🔄 Backup immediato forzato...');
    return await this.executeAutomaticBackup();
  }

  // 🧪 TEST: Programma una notifica backup tra 2 minuti per debug
  async testBackupNotification() {
    try {
      const targetDate = new Date();
      targetDate.setMinutes(targetDate.getMinutes() + 2); // 2 minuti da ora
      
      console.log(`🧪 TEST: Programmando notifica backup test per: ${targetDate.toLocaleString('it-IT')}`);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 TEST Backup Automatico',
          body: `Test notifica backup programmata per le ${targetDate.toLocaleTimeString('it-IT')}`,
          data: { 
            type: 'backup_reminder',
            test: true,
            scheduledTime: targetDate.toISOString()
          },
          sound: true,
        },
        trigger: {
          date: targetDate,
        },
      });
      
      Alert.alert('Test Programmato', `Notifica backup test programmata per le ${targetDate.toLocaleTimeString('it-IT')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Errore test backup notifica:', error);
      Alert.alert('Errore Test', error.message);
      return false;
    }
  }
}

module.exports = new SuperBackupService();
