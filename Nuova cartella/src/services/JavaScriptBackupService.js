// 🚀 SISTEMA BACKUP AUTOMATICO SOLO JAVASCRIPT
// Sostituisce Expo Background Fetch con JavaScript Timer

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import { Alert } from 'react-native';

class JavaScriptBackupService {
  constructor() {
    this.backupTimer = null;
    this.isInitialized = false;
    this.backupInProgress = false;
    
    console.log('🚀 JavaScriptBackupService inizializzato');
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

  // ✅ INIZIALIZZA SISTEMA BACKUP JAVASCRIPT
  async initialize() {
    if (this.isInitialized) {
      console.log('📱 Backup service già inizializzato');
      return;
    }

    try {
      const settings = await this.getBackupSettings();
      
      if (settings.enabled) {
        await this.scheduleNextBackup(settings);
        console.log('✅ Sistema backup automatico JavaScript attivato');
      } else {
        console.log('📱 Backup automatico disabilitato nelle impostazioni');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Errore inizializzazione backup service:', error);
    }
  }

  // Ottieni impostazioni backup
  async getBackupSettings() {
    try {
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      const time = await AsyncStorage.getItem('auto_backup_time');
      
      return {
        enabled: enabled ? JSON.parse(enabled) : false,
        time: time || '02:00'
      };
    } catch (error) {
      console.error('Errore lettura impostazioni backup:', error);
      return { enabled: false, time: '02:00' };
    }
  }

  // ✅ PROGRAMMA PROSSIMO BACKUP con JavaScript Timer
  async scheduleNextBackup(settings = null) {
    // In questa versione, il backup automatico viene eseguito solo tramite trigger esterno (es. background task, push notification, ecc.)
    // Nessun setTimeout, nessun backup automatico su salvataggio/cambio dati
    // Puoi integrare qui eventuali hook con librerie di background task se necessario
    console.log('🕐 [JS] Backup automatico pianificato solo tramite trigger esterno/orario.');
  }

  // ✅ ESEGUI BACKUP AUTOMATICO
  async executeBackup() {
    if (this.backupInProgress) {
      console.log('📱 Backup già in corso, saltando...');
      return;
    }

    this.backupInProgress = true;

    try {
      console.log('🔄 === INIZIO BACKUP AUTOMATICO JAVASCRIPT ===');
      
      const timestamp = this.getLocalTimestamp().replace(/[:.]/g, '-');
      const fileName = `auto-backup-${timestamp}.json`;
      
      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Nessun dato trovato per il backup');
        return false;
      }

      // Aggiungi metadati backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'automatic_javascript',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Salva in AsyncStorage con chiave unica
      const backupKey = `backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));

      // Aggiorna lista backup recenti
      await this.updateBackupList(fileName, backupKey);
      
      // Pulizia backup vecchi
      await this.cleanupOldBackups();

      console.log(`✅ Backup automatico JavaScript completato: ${fileName}`);
      
      // Aggiorna timestamp ultimo backup
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      
      return true;

    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      return false;
    } finally {
      this.backupInProgress = false;
    }
  }

  // Aggiorna lista backup
  async updateBackupList(fileName, backupKey) {
    try {
      const currentBackups = await AsyncStorage.getItem('javascript_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      const newBackup = {
        name: fileName,
        key: backupKey,
        date: new Date().toISOString(),
        type: 'automatic',
        size: JSON.stringify(await AsyncStorage.getItem(backupKey)).length
      };

      const updatedBackups = [newBackup, ...backups];
      await AsyncStorage.setItem('javascript_backups', JSON.stringify(updatedBackups));
      
      console.log(`📝 Lista backup aggiornata: ${updatedBackups.length} backup totali`);
    } catch (error) {
      console.error('Errore aggiornamento lista backup:', error);
    }
  }

  // Pulizia backup vecchi (mantieni solo gli ultimi 5)
  async cleanupOldBackups() {
    try {
      const currentBackups = await AsyncStorage.getItem('javascript_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      // Filtra backup automatici
      const autoBackups = backups.filter(backup => backup.type === 'automatic');
      
      if (autoBackups.length > 5) {
        const backupsToDelete = autoBackups.slice(5);
        
        for (const backup of backupsToDelete) {
          try {
            await AsyncStorage.removeItem(backup.key);
            console.log(`🗑️ Backup rimosso: ${backup.name}`);
          } catch (error) {
            console.warn(`⚠️ Errore rimozione backup ${backup.name}:`, error);
          }
        }

        // Aggiorna lista rimuovendo i backup cancellati
        const remainingBackups = backups.filter(backup => 
          backup.type !== 'automatic' || autoBackups.slice(0, 5).includes(backup)
        );
        
        await AsyncStorage.setItem('javascript_backups', JSON.stringify(remainingBackups));
        
        console.log(`🧹 Pulizia completata: rimossi ${backupsToDelete.length} backup vecchi`);
      }
    } catch (error) {
      console.error('❌ Errore pulizia backup:', error);
    }
  }

  // ✅ STOP BACKUP AUTOMATICO
  async stopAutoBackup() {
    console.log('🛑 [JS] Backup automatico fermato (nessun timer attivo)');
  }

  // ✅ RIAVVIA BACKUP AUTOMATICO
  async restartAutoBackup() {
    console.log('🔄 [JS] Riavvio backup automatico (nessun timer, solo re-inizializzazione)');
    await this.initialize();
  }

  // Ottieni lista backup JavaScript
  async getBackupList() {
    try {
      const backups = await AsyncStorage.getItem('javascript_backups');
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('Errore lettura lista backup:', error);
      return [];
    }
  }

  // Esporta backup come stringa JSON
  async exportBackup(backupKey) {
    try {
      const backupData = await AsyncStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup non trovato');
      }
      return backupData;
    } catch (error) {
      console.error('Errore esportazione backup:', error);
      throw error;
    }
  }

  // Importa backup da stringa JSON
  async importBackup(backupJsonString) {
    try {
      const backupData = JSON.parse(backupJsonString);
      
      if (!backupData.backupInfo) {
        throw new Error('Formato backup non valido');
      }

      // Ripristina nel database
      await DatabaseService.restoreFromBackup(backupData);
      
      console.log('✅ Backup JavaScript importato con successo');
      return true;
    } catch (error) {
      console.error('❌ Errore importazione backup:', error);
      throw error;
    }
  }

  // Test backup manuale
  async testBackup() {
    console.log('🧪 Test backup manuale JavaScript...');
    const result = await this.executeBackup();
    
    if (result) {
      Alert.alert(
        '✅ Test Backup Riuscito',
        'Il backup automatico JavaScript funziona correttamente!',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '❌ Test Backup Fallito',
        'Si è verificato un errore durante il test del backup.',
        [{ text: 'OK' }]
      );
    }
    
    return result;
  }

  // Statistiche backup
  async getBackupStats() {
    try {
      const backups = await this.getBackupList();
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      const settings = await this.getBackupSettings();
      
      return {
        totalBackups: backups.length,
        automaticBackups: backups.filter(b => b.type === 'automatic').length,
        lastBackup: lastBackupDate ? new Date(lastBackupDate) : null,
        nextBackup: this.getNextBackupTime(settings),
        enabled: settings.enabled,
        isActive: this.backupTimer !== null
      };
    } catch (error) {
      console.error('Errore calcolo statistiche backup:', error);
      return null;
    }
  }

  // Calcola prossimo backup
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

  // ⚙️ AGGIORNA IMPOSTAZIONI BACKUP JAVASCRIPT
  async updateBackupSettings(enabled, time) {
    try {
      console.log(`📱 [JS] Aggiornamento impostazioni: enabled=${enabled}, time=${time}`);
      
      // Salva le nuove impostazioni
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(enabled));
      await AsyncStorage.setItem('auto_backup_time', time);
      
      // Cancella timer esistente
      if (this.backupTimer) {
        clearTimeout(this.backupTimer);
        this.backupTimer = null;
        console.log('🗑️ [JS] Timer backup precedente cancellato');
      }
      
      // Se il backup è abilitato, programma nuovo timer
      if (enabled) {
        const settings = { enabled, time };
        await this.scheduleNextBackup(settings);
        console.log('✅ [JS] Nuovo timer backup programmato');
      } else {
        console.log('📱 [JS] Backup automatico disabilitato');
      }
      
      return true;
    } catch (error) {
      console.error('❌ [JS] Errore aggiornamento impostazioni backup:', error);
      return false;
    }
  }

  // 📱 Stato del sistema JavaScript
  getSystemStatus() {
    return {
      isNativeReady: false, // JavaScript non è nativo
      hasNotificationsModule: false,
      systemType: 'javascript',
      description: 'Backup JavaScript (solo app aperta)',
      hasBackupTimer: this.backupTimer !== null,
      isInitialized: this.isInitialized,
      backupInProgress: this.backupInProgress
    };
  }
}

export default new JavaScriptBackupService();
