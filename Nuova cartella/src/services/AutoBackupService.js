import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

class AutoBackupService {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    try {
      this.isInitialized = true;
      console.log('🔄 AutoBackupService: Inizializzato');
    } catch (error) {
      console.error('❌ AutoBackupService: Errore inizializzazione:', error);
      this.isInitialized = false;
    }
  }

  async getBackupStats() {
    try {
      // Usa la cartella di destinazione attuale
      const destination = await this.getBackupDestination();
      let backupDir;
      
      switch (destination) {
        case 'custom':
          backupDir = await this.getCustomBackupPath();
          break;
        case 'cloud':
          backupDir = `${FileSystem.documentDirectory}CloudBackups/`;
          break;
        case 'memory':
        default:
          backupDir = `${FileSystem.documentDirectory}Downloads/`;
          break;
      }
      
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        return { count: 0, totalSize: 0, lastBackup: null };
      }

      const files = await FileSystem.readDirectoryAsync(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      let totalSize = 0;
      let lastBackup = null;
      let mostRecentTime = 0;

      for (const fileName of backupFiles) {
        const filePath = `${backupDir}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        totalSize += fileInfo.size;
        
        // Prova a ottenere la data dai metadati del backup
        let backupTime = fileInfo.modificationTime;
        try {
          const fileContent = await FileSystem.readAsStringAsync(filePath);
          const backupData = JSON.parse(fileContent);
          if (backupData.metadata && backupData.metadata.timestamp) {
            const metadataTime = new Date(backupData.metadata.timestamp).getTime();
            if (!isNaN(metadataTime) && metadataTime > 0) {
              backupTime = metadataTime;
            }
          }
        } catch (parseError) {
          console.log('⚠️ Errore lettura metadati backup:', fileName, parseError.message);
        }

        if (backupTime > mostRecentTime) {
          mostRecentTime = backupTime;
          lastBackup = new Date(backupTime);
        }
      }

      return {
        count: backupFiles.length,
        totalSize: Math.round(totalSize / 1024), // KB
        lastBackup
      };
    } catch (error) {
      console.error('❌ Errore nel calcolo statistiche backup:', error);
      return { count: 0, totalSize: 0, lastBackup: null };
    }
  }

  async getAutoBackupsList() {
    try {
      // Usa la cartella di destinazione attuale
      const destination = await this.getBackupDestination();
      let backupDir;
      
      switch (destination) {
        case 'custom':
          backupDir = await this.getCustomBackupPath();
          break;
        case 'cloud':
          backupDir = `${FileSystem.documentDirectory}CloudBackups/`;
          break;
        case 'memory':
        default:
          backupDir = `${FileSystem.documentDirectory}Downloads/`;
          break;
      }
      
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      const backups = [];
      
      for (const fileName of backupFiles) {
        try {
          const filePath = `${backupDir}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          // Prova a leggere i metadati
          let timestamp = fileInfo.modificationTime;
          let isAutomatic = fileName.includes('wort-') || fileName.includes('auto-backup');
          
          try {
            const content = await FileSystem.readAsStringAsync(filePath);
            const data = JSON.parse(content);
            
            if (data.metadata) {
              if (data.metadata.timestamp) {
                const metadataTime = new Date(data.metadata.timestamp).getTime();
                if (!isNaN(metadataTime) && metadataTime > 0) {
                  timestamp = metadataTime;
                }
              }
              if (data.metadata.automatic !== undefined) {
                isAutomatic = data.metadata.automatic;
              }
            }
          } catch (parseError) {
            console.log('⚠️ Errore lettura metadati:', fileName);
          }

          backups.push({
            name: fileName,
            path: filePath,
            filePath: filePath, // Aggiunto per compatibilità con BackupScreen
            size: fileInfo.size,
            date: new Date(timestamp),
            type: isAutomatic ? 'auto' : 'manual',
            // ✅ INFO PERCORSO: Aggiungi informazioni sulla destinazione
            destination: destination,
            destinationPath: backupDir,
            destinationLabel: this.getDestinationLabel(destination)
          });
        } catch (error) {
          console.log('⚠️ Errore elaborazione file backup:', fileName, error.message);
        }
      }
      
      return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('❌ Errore nel caricamento lista backup automatici:', error);
      return [];
    }
  }

  async getCustomBackupPath() {
    try {
      const customPath = await AsyncStorage.getItem('customBackupPath');
      return customPath || `${FileSystem.documentDirectory}backups/`;
    } catch (error) {
      console.error('❌ Errore nel recupero percorso personalizzato:', error);
      return `${FileSystem.documentDirectory}backups/`;
    }
  }

  async setCustomBackupPath(path, displayName = null) {
    try {
      await AsyncStorage.setItem('customBackupPath', path);
      if (displayName) {
        await AsyncStorage.setItem('customBackupDisplayName', displayName);
      }
      console.log('✅ Percorso backup personalizzato salvato:', path, displayName || '');
    } catch (error) {
      console.error('❌ Errore nel salvataggio percorso personalizzato:', error);
    }
  }

  async getCustomBackupDisplayName() {
    try {
      const displayName = await AsyncStorage.getItem('customBackupDisplayName');
      return displayName || 'Cartella Personalizzata';
    } catch (error) {
      console.error('❌ Errore nel recupero nome percorso personalizzato:', error);
      return 'Cartella Personalizzata';
    }
  }

  async selectBackupFolder() {
    try {
      // Creiamo un file temporaneo da usare per "navigare" al percorso desiderato
      const tempFileName = 'WorkT-setup-backup-folder.txt';
      const tempFilePath = `${FileSystem.documentDirectory}${tempFileName}`;
      
      // Crea il file temporaneo con istruzioni
      const tempContent = `📁 WorkT - Configurazione Cartella Backup

Questo file ti aiuta a configurare dove salvare i backup automatici.

ISTRUZIONI:
1. Salva questo file nella cartella dove vuoi i backup
2. Torna nell'app per completare la configurazione
3. I backup futuri verranno salvati nella cartella selezionata

App: WorkT - Tracker Ore Lavoro
Data: ${new Date().toLocaleString('it-IT')}

Questo file può essere eliminato dopo la configurazione.`;

      await FileSystem.writeAsStringAsync(tempFilePath, tempContent);
      
      // Usa il sistema di condivisione per permettere all'utente di "salvare" il file
      const result = await Sharing.shareAsync(tempFilePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Salva nella cartella desiderata per i backup',
        UTI: 'public.plain-text'
      });
      
      // Genera un percorso unico basato sulla data/ora
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const customPath = `${FileSystem.documentDirectory}backup_${timestamp}/`;
      
      // Crea la cartella personalizzata
      const dirInfo = await FileSystem.getInfoAsync(customPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(customPath, { intermediates: true });
      }
      
      // Rimuovi il file temporaneo
      try {
        await FileSystem.deleteAsync(tempFilePath);
      } catch (deleteError) {
        console.log('⚠️ Errore rimozione file temporaneo:', deleteError.message);
      }
      
      // Salva il percorso con un nome descrittivo
      const displayName = `Backup personalizzato (${new Date().toLocaleDateString('it-IT')})`;
      await this.setCustomBackupPath(customPath, displayName);
      
      return { 
        success: true, 
        path: customPath,
        displayName: displayName
      };
      
    } catch (error) {
      console.error('❌ Errore nella selezione cartella backup:', error);
      return { success: false, error: error.message };
    }
  }

  async requestCustomPath() {
    try {
      // Per ora impostiamo un percorso di default personalizzato
      // In futuro si potrebbe aggiungere un input per l'utente
      const customPath = `${FileSystem.documentDirectory}custom_backups/`;
      
      // Crea la cartella se non esiste
      const dirInfo = await FileSystem.getInfoAsync(customPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(customPath, { intermediates: true });
      }
      
      await this.setCustomBackupPath(customPath);
      return { 
        success: true, 
        path: customPath,
        displayName: 'Cartella Backup Personalizzata'
      };
    } catch (error) {
      console.error('❌ Errore nella creazione percorso personalizzato:', error);
      return { success: false, error: error.message };
    }
  }

  async getAvailableDestinations() {
    try {
      return [
        {
          key: 'memory',
          label: '📱 Memoria App',
          description: 'Cartella download del dispositivo',
          path: `${FileSystem.documentDirectory}Downloads/`
        },
        {
          key: 'custom',
          label: '📁 Percorso Scelto',
          description: 'Scegli una cartella specifica',
          path: await this.getCustomBackupPath()
        },
        {
          key: 'cloud',
          label: '☁️ Cloud',
          description: 'Cartella sincronizzata con iCloud/Google Drive',
          path: `${FileSystem.documentDirectory}CloudBackups/`
        }
      ];
    } catch (error) {
      console.error('❌ Errore nel recupero destinazioni disponibili:', error);
      return [];
    }
  }

  async setBackupDestination(destination) {
    try {
      await AsyncStorage.setItem('auto_backup_destination', destination);
      console.log('✅ Destinazione backup impostata:', destination);
      return true;
    } catch (error) {
      console.error('❌ Errore nel salvataggio destinazione backup:', error);
      return false;
    }
  }

  async getBackupDestination() {
    try {
      const destination = await AsyncStorage.getItem('auto_backup_destination');
      return destination || 'memory';
    } catch (error) {
      console.error('❌ Errore nel recupero destinazione backup:', error);
      return 'memory';
    }
  }

  // 📍 LABEL DESTINAZIONE: Ottieni etichetta leggibile per la destinazione
  getDestinationLabel(destination) {
    switch (destination) {
      case 'memory':
        return '📱 Memoria App';
      case 'custom':
        return '📁 Percorso Personalizzato';
      case 'cloud':
        return '☁️ Cloud Sync';
      default:
        return '❓ Sconosciuto';
    }
  }

  async getCustomPathsInfo() {
    try {
      const destinations = await this.getAvailableDestinations();
      const currentDestination = await this.getBackupDestination();
      const customDisplayName = await this.getCustomBackupDisplayName();
      
      const pathsInfo = {};
      for (const dest of destinations) {
        pathsInfo[dest.key] = {
          label: dest.label,
          description: dest.description,
          path: dest.path,
          displayName: dest.key === 'custom' ? customDisplayName : dest.description,
          active: dest.key === currentDestination,
          isCustom: dest.key === 'custom'
        };
      }
      
      return pathsInfo;
    } catch (error) {
      console.error('❌ Errore nel recupero info percorsi:', error);
      return {};
    }
  }

  async setCustomMemoryPath() {
    try {
      const result = await this.selectBackupFolder();
      if (result.success) {
        await this.setBackupDestination('custom');
        return { success: true, path: result.path };
      } else {
        return { success: false, error: result.error || 'Selezione annullata' };
      }
    } catch (error) {
      console.error('❌ Errore nell\'impostazione percorso memoria personalizzato:', error);
      return { success: false, error: error.message };
    }
  }

  async resetCustomPath(destinationType) {
    try {
      // Reimposta alla destinazione di default
      await this.setBackupDestination('memory');
      
      // Resetta anche il percorso personalizzato se necessario
      if (destinationType === 'custom') {
        await this.setCustomBackupPath(`${FileSystem.documentDirectory}backups/`);
        await AsyncStorage.removeItem('customBackupDisplayName');
      }
      
      console.log('✅ Percorso personalizzato resettato:', destinationType);
      return true;
    } catch (error) {
      console.error('❌ Errore nel reset percorso personalizzato:', error);
      return false;
    }
  }

  async shareToCloud(filePath) {
    try {
      const cloudConfig = await this.getCloudConfig();
      
      // Per il cloud, usiamo un approccio più diretto
      // Invece di aprire sempre il menu condivisione, proviamo prima i servizi cloud nativi
      if (await this.isCloudAvailable()) {
        // Se c'è un servizio cloud configurato, usa quello
        await this.saveToNativeCloud(filePath);
      } else {
        // Altrimenti usa il menu di condivisione come fallback
        if (cloudConfig.email) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: `Salva backup su ${cloudConfig.provider || 'Cloud'}`,
            UTI: 'public.json'
          });
        } else {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Salva backup su cloud (scegli il servizio)',
            UTI: 'public.json'
          });
        }
      }
      
      console.log('☁️ File condiviso su cloud');
      return true;
    } catch (error) {
      console.error('❌ Errore condivisione cloud:', error);
      return false;
    }
  }

  async isCloudAvailable() {
    try {
      // Controlla se ci sono servizi cloud disponibili
      // Su iOS: iCloud, su Android: Google Drive
      const platform = require('expo-constants').default.platform;
      
      if (platform?.ios) {
        // Su iOS, iCloud è generalmente disponibile
        return true;
      } else if (platform?.android) {
        // Su Android, verifica se Google Play Services è disponibile
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('⚠️ Errore verifica cloud disponibilità:', error);
      return false;
    }
  }

  async saveToNativeCloud(filePath) {
    try {
      // Copia il file in una cartella che si sincronizza automaticamente con il cloud
      const cloudDir = `${FileSystem.documentDirectory}CloudBackups/`;
      
      // Crea la directory se non esiste
      const dirInfo = await FileSystem.getInfoAsync(cloudDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cloudDir, { intermediates: true });
      }
      
      // Copia il file nella cartella cloud
      const fileName = filePath.split('/').pop();
      const cloudFilePath = `${cloudDir}${fileName}`;
      
      await FileSystem.copyAsync({
        from: filePath,
        to: cloudFilePath
      });
      
      console.log('☁️ File copiato in cartella cloud:', cloudFilePath);
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio cloud nativo:', error);
      throw error;
    }
  }

  async getCloudConfig() {
    try {
      const config = await AsyncStorage.getItem('cloudBackupConfig');
      return config ? JSON.parse(config) : { provider: '', email: '' };
    } catch (error) {
      console.error('❌ Errore nel recupero configurazione cloud:', error);
      return { provider: '', email: '' };
    }
  }

  async setCloudConfig(provider, email) {
    try {
      const config = { provider, email };
      await AsyncStorage.setItem('cloudBackupConfig', JSON.stringify(config));
      console.log('☁️ Configurazione cloud salvata:', config);
      return true;
    } catch (error) {
      console.error('❌ Errore nel salvataggio configurazione cloud:', error);
      return false;
    }
  }

  generateShortBackupName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `WorkT-auto-backup-${year}-${month}-${day}_${hour}-${minute}-${second}.json`;
  }

  async createAutoBackup(data) {
    try {
      // Determina il percorso di backup basato sulla destinazione selezionata
      const destination = await this.getBackupDestination();
      let backupPath;
      let useCloudShare = false;
      
      switch (destination) {
        case 'custom':
          backupPath = await this.getCustomBackupPath();
          break;
        case 'cloud':
          // Per il cloud, prima salviamo localmente, poi gestiamo la sincronizzazione
          backupPath = `${FileSystem.documentDirectory}CloudBackups/`;
          useCloudShare = true;
          break;
        case 'memory':
        default:
          backupPath = `${FileSystem.documentDirectory}Downloads/`;
          break;
      }
      
      // Assicurati che la directory esista
      const dirInfo = await FileSystem.getInfoAsync(backupPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupPath, { intermediates: true });
      }

      const fileName = this.generateShortBackupName();
      const filePath = `${backupPath}${fileName}`;

      const backupData = {
        ...data,
        metadata: {
          timestamp: new Date().toISOString(),
          automatic: true,
          version: '1.0',
          destination: destination,
          path: backupPath,
          cloudSync: useCloudShare,
          // ✅ METADATI BACKUP COMPLETO: Info sui dati inclusi
          dataIncluded: {
            workEntries: data.workEntries?.length || 0,
            interventi: data.interventi?.length || 0,
            standbyDays: data.standbyDays?.length || 0,
            settings: data.settings?.length || 0,
            hasExportDate: !!data.exportDate
          }
        }
      };

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData)); // 🔧 FIX: Rimuovi indentazione per dimensioni coerenti
      
      // ✅ LOG BACKUP COMPLETO: Mostra cosa è stato incluso
      console.log('📦 Backup automatico dettagli:', {
        fileName: fileName,
        path: backupPath,
        dataIncluded: backupData.metadata.dataIncluded,
        totalSize: JSON.stringify(backupData).length + ' chars'
      });
      
      // Se è cloud, gestisci la sincronizzazione
      if (useCloudShare) {
        try {
          // Se il cloud non è configurato o non funziona, usa il menu condivisione
          const cloudConfig = await this.getCloudConfig();
          if (!cloudConfig.provider) {
            console.log('🔧 Cloud non configurato, apertura menu condivisione...');
            await this.shareToCloud(filePath);
          } else {
            console.log('☁️ File salvato nella cartella cloud sincronizzata');
          }
        } catch (cloudError) {
          console.log('⚠️ Errore sincronizzazione cloud, file salvato localmente');
        }
      }
      
      console.log('✅ Backup automatico creato:', fileName, 'in:', backupPath);
      return { success: true, fileName, path: filePath, destination, cloudSync: useCloudShare };
    } catch (error) {
      console.error('❌ Errore nella creazione backup automatico:', error);
      return { success: false, error: error.message };
    }
  }

  async performAutoBackup(interventi = null) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const isEnabled = await AsyncStorage.getItem('auto_backup_on_save_enabled');
      if (isEnabled !== 'true') {
        return;
      }

      // ✅ BACKUP COMPLETO: Include tutti i dati di sistema
      let backupData;
      
      if (interventi) {
        // Se vengono passati solo gli interventi, carica anche settings e standby
        const DatabaseService = (await import('./DatabaseService')).default;
        const allData = await DatabaseService.getAllData();
        
        backupData = {
          interventi: interventi,
          workEntries: allData.workEntries || [],
          standbyDays: allData.standbyDays || [],
          settings: allData.settings || [],
          exportDate: new Date().toISOString()
        };
      } else {
        // Altrimenti carica tutto dal database
        const DatabaseService = (await import('./DatabaseService')).default;
        const allData = await DatabaseService.getAllData();
        
        backupData = {
          interventi: allData.workEntries || [],
          workEntries: allData.workEntries || [],
          standbyDays: allData.standbyDays || [],
          settings: allData.settings || [],
          exportDate: new Date().toISOString()
        };
      }

      console.log('📦 Backup automatico completo:', {
        interventi: backupData.interventi?.length || 0,
        workEntries: backupData.workEntries?.length || 0,
        standbyDays: backupData.standbyDays?.length || 0,
        settings: backupData.settings?.length || 0
      });

      const result = await this.createAutoBackup(backupData);
      
      if (result.success) {
        // ✅ NOTIFICA CONDIZIONALE: Solo se abilitata nelle impostazioni
        const settings = await this.getAutoBackupSettings();
        if (settings.showNotification) {
          await this.scheduleBackupNotification();
          console.log('📢 Backup completato con notifica (abilitata)');
        } else {
          console.log('🔇 Backup completato senza notifica (disabilitata dall\'utente)');
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      return { success: false, error: error.message };
    }
  }

  async scheduleBackupNotification() {
    try {
      // ✅ CONTROLLO IMPOSTAZIONE NOTIFICHE: Rispetta la preferenza utente
      const showNotification = await AsyncStorage.getItem('auto_backup_show_notification');
      
      if (showNotification === 'false') {
        console.log('🔇 Notifica backup disabilitata dall\'utente, non mostro notifica');
        return;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Backup Completato',
          body: 'I tuoi dati sono stati salvati automaticamente',
          sound: false,
        },
        trigger: {
          seconds: 1,
        },
      });
      
      console.log('📢 Notifica backup programmata (abilitata dall\'utente)');
    } catch (error) {
      console.log('⚠️ Errore notifica backup:', error);
    }
  }

  async isAutoBackupEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('autoBackupEnabled');
      return enabled === 'true';
    } catch (error) {
      console.error('❌ Errore nel controllo stato backup automatico:', error);
      return false;
    }
  }

  async setAutoBackupEnabled(enabled) {
    try {
      await AsyncStorage.setItem('autoBackupEnabled', enabled ? 'true' : 'false');
      console.log('✅ Stato backup automatico aggiornato:', enabled);
    } catch (error) {
      console.error('❌ Errore nel salvataggio stato backup automatico:', error);
    }
  }

  async getAutoBackupSettings() {
    try {
      const settings = {
        enabled: await AsyncStorage.getItem('auto_backup_on_save_enabled') === 'true',
        destination: await AsyncStorage.getItem('auto_backup_destination') || 'memory',
        customPath: await AsyncStorage.getItem('auto_backup_custom_paths') || '',
        maxBackups: parseInt(await AsyncStorage.getItem('auto_backup_max_count') || '10'),
        showNotification: await AsyncStorage.getItem('auto_backup_show_notification') !== 'false'
      };
      
      console.log('📖 Impostazioni backup automatico caricate:', settings);
      return settings;
    } catch (error) {
      console.error('❌ Errore nel caricamento impostazioni backup automatico:', error);
      return {
        enabled: false,
        destination: 'memory',
        customPath: '',
        maxBackups: 10,
        showNotification: true
      };
    }
  }

  async saveAutoBackupSettings(settings) {
    try {
      await AsyncStorage.setItem('auto_backup_on_save_enabled', settings.enabled ? 'true' : 'false');
      await AsyncStorage.setItem('auto_backup_destination', settings.destination || 'memory');
      await AsyncStorage.setItem('auto_backup_custom_paths', settings.customPath || '');
      await AsyncStorage.setItem('auto_backup_max_count', (settings.maxBackups || 10).toString());
      await AsyncStorage.setItem('auto_backup_show_notification', settings.showNotification !== false ? 'true' : 'false');
      
      console.log('💾 Impostazioni backup automatico salvate:', settings);
      return true;
    } catch (error) {
      console.error('❌ Errore nel salvataggio impostazioni backup automatico:', error);
      return false;
    }
  }

  async performAutoBackupIfEnabled() {
    try {
      const isEnabled = await AsyncStorage.getItem('auto_backup_on_save_enabled');
      if (isEnabled !== 'true') {
        return { success: false, reason: 'disabled' };
      }

      // ✅ BACKUP COMPLETO: Carica tutti i dati dal database
      const DatabaseService = (await import('./DatabaseService')).default;
      const allData = await DatabaseService.getAllData();
      
      console.log('📊 Dati caricati per backup automatico:', {
        workEntries: allData.workEntries?.length || 0,
        standbyDays: allData.standbyDays?.length || 0,
        settings: allData.settings?.length || 0
      });
      
      const result = await this.performAutoBackup();
      return result;
    } catch (error) {
      console.error('❌ Errore backup automatico condizionale:', error);
      return { success: false, error: error.message };
    }
  }

  // 🧪 TEST NOTIFICHE BACKUP: Verifica le impostazioni notifiche
  async testBackupNotifications() {
    try {
      const settings = await this.getAutoBackupSettings();
      console.log('📋 Impostazioni notifiche backup:', {
        showNotification: settings.showNotification,
        enabled: settings.enabled,
        destination: settings.destination
      });
      
      if (settings.showNotification) {
        console.log('📢 Test: Mostro notifica di test...');
        await this.scheduleBackupNotification();
        return { success: true, message: 'Notifica test programmata' };
      } else {
        console.log('🔇 Test: Notifiche disabilitate, non mostro nulla');
        return { success: true, message: 'Notifiche disabilitate dall\'utente' };
      }
    } catch (error) {
      console.error('❌ Errore test notifiche:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔧 TOGGLE NOTIFICHE: Attiva/disattiva rapidamente le notifiche
  async toggleBackupNotifications() {
    try {
      const current = await AsyncStorage.getItem('auto_backup_show_notification');
      const newValue = current === 'false' ? 'true' : 'false';
      
      await AsyncStorage.setItem('auto_backup_show_notification', newValue);
      
      console.log(`🔄 Notifiche backup: ${current} → ${newValue}`);
      console.log(`📢 Notifiche backup ora: ${newValue === 'true' ? 'ABILITATE' : 'DISABILITATE'}`);
      
      return { 
        success: true, 
        previous: current === 'true', 
        current: newValue === 'true',
        message: `Notifiche backup ${newValue === 'true' ? 'abilitate' : 'disabilitate'}`
      };
    } catch (error) {
      console.error('❌ Errore toggle notifiche:', error);
      return { success: false, error: error.message };
    }
  }

  // 📍 MOSTRA PERCORSI BACKUP: Visualizza tutti i percorsi e info
  async showAllBackupPaths() {
    try {
      console.log('📍 PERCORSI BACKUP DETTAGLIATI:');
      console.log('===============================');
      
      // Destinazione attuale
      const currentDestination = await this.getBackupDestination();
      console.log(`🎯 Destinazione attuale: ${this.getDestinationLabel(currentDestination)} (${currentDestination})`);
      
      // Tutti i percorsi disponibili
      const destinations = await this.getAvailableDestinations();
      console.log('\n📂 TUTTI I PERCORSI DISPONIBILI:');
      
      for (const dest of destinations) {
        const isActive = dest.key === currentDestination;
        const status = isActive ? '✅ ATTIVO' : '⚪ Disponibile';
        
        console.log(`\n${status} ${dest.label}`);
        console.log(`   Tipo: ${dest.key}`);
        console.log(`   Descrizione: ${dest.description}`);
        console.log(`   Percorso: ${dest.path}`);
        
        // Verifica se la cartella esiste
        try {
          const dirInfo = await FileSystem.getInfoAsync(dest.path);
          if (dirInfo.exists) {
            const files = await FileSystem.readDirectoryAsync(dest.path);
            const backupFiles = files.filter(f => f.endsWith('.json'));
            console.log(`   📁 Cartella: Esistente (${backupFiles.length} backup trovati)`);
          } else {
            console.log(`   📁 Cartella: Non esistente`);
          }
        } catch (checkError) {
          console.log(`   📁 Cartella: Errore verifica (${checkError.message})`);
        }
      }
      
      // Percorso personalizzato dettagliato
      if (currentDestination === 'custom') {
        const customDisplayName = await this.getCustomBackupDisplayName();
        console.log(`\n🔧 PERCORSO PERSONALIZZATO DETTAGLI:`);
        console.log(`   Nome visualizzato: ${customDisplayName}`);
      }
      
      console.log('\n===============================');
      return destinations;
    } catch (error) {
      console.error('❌ Errore visualizzazione percorsi:', error);
      return null;
    }
  }

  // 📋 INFO BACKUP SPECIFICO: Mostra dettagli di un backup
  async showBackupDetails(backupPath) {
    try {
      console.log(`📋 DETTAGLI BACKUP: ${backupPath}`);
      console.log('================================');
      
      // Info file
      const fileInfo = await FileSystem.getInfoAsync(backupPath);
      console.log(`📁 Percorso completo: ${backupPath}`);
      console.log(`📊 Dimensione: ${Math.round(fileInfo.size / 1024)} KB`);
      console.log(`📅 Modificato: ${new Date(fileInfo.modificationTime).toLocaleString('it-IT')}`);
      
      // Leggi metadati se possibile
      try {
        const content = await FileSystem.readAsStringAsync(backupPath);
        const data = JSON.parse(content);
        
        if (data.metadata) {
          console.log('\n🏷️ METADATI BACKUP:');
          console.log(`   Timestamp: ${data.metadata.timestamp || 'Non disponibile'}`);
          console.log(`   Automatico: ${data.metadata.automatic ? 'Sì' : 'No'}`);
          console.log(`   Destinazione: ${data.metadata.destination || 'Non specificata'}`);
          console.log(`   Percorso: ${data.metadata.path || 'Non specificato'}`);
          console.log(`   Cloud Sync: ${data.metadata.cloudSync ? 'Sì' : 'No'}`);
          
          if (data.metadata.dataIncluded) {
            console.log('\n📊 DATI INCLUSI:');
            console.log(`   Work Entries: ${data.metadata.dataIncluded.workEntries || 0}`);
            console.log(`   Interventi: ${data.metadata.dataIncluded.interventi || 0}`);
            console.log(`   Standby Days: ${data.metadata.dataIncluded.standbyDays || 0}`);
            console.log(`   Settings: ${data.metadata.dataIncluded.settings || 0}`);
          }
        }
        
        // Conta elementi principali
        console.log('\n📈 CONTENUTO BACKUP:');
        console.log(`   Work Entries: ${data.workEntries?.length || 0}`);
        console.log(`   Interventi: ${data.interventi?.length || 0}`);
        console.log(`   Standby Days: ${data.standbyDays?.length || 0}`);
        console.log(`   Settings: ${data.settings?.length || 0}`);
        
      } catch (parseError) {
        console.log('⚠️ Impossibile leggere metadati backup');
      }
      
      console.log('================================');
      return fileInfo;
    } catch (error) {
      console.error('❌ Errore dettagli backup:', error);
      return null;
    }
  }
}

export default new AutoBackupService();
