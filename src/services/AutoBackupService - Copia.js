import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Sharing fro        {
          key: 'custom',
          label: '📁 Percorso Scelto',
          description: 'Scegli una cartella specifica',
          path: await this.getCustomBackupPath()
        },o-sharing';
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
      const backupDir = `${FileSystem.documentDirectory}backups/`;
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
      const backupDir = `${FileSystem.documentDirectory}backups/`;
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
            type: isAutomatic ? 'auto' : 'manual'
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

  async setCustomBackupPath(path) {
    try {
      await AsyncStorage.setItem('customBackupPath', path);
      console.log('✅ Percorso backup personalizzato salvato:', path);
    } catch (error) {
      console.error('❌ Errore nel salvataggio percorso personalizzato:', error);
    }
  }

  async selectBackupFolder() {
    try {
      const DocumentPicker = await import('expo-document-picker');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
        multiple: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        
        // Verifica che sia una cartella o estrai la cartella dal percorso
        let folderPath = selectedUri;
        if (selectedUri.includes('/')) {
          // Se è un file, prendi la cartella padre
          const pathParts = selectedUri.split('/');
          pathParts.pop(); // Rimuovi il nome del file
          folderPath = pathParts.join('/') + '/';
        }
        
        await this.setCustomBackupPath(folderPath);
        return { success: true, path: folderPath };
      } else {
        return { success: false, canceled: true };
      }
    } catch (error) {
      console.error('❌ Errore nella selezione cartella backup:', error);
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
          path: `${FileSystem.documentDirectory}../Downloads/`
        },
        {
          key: 'custom',
          label: '� Percorso Scelto',
          description: 'Scegli una cartella specifica',
          path: await this.getCustomBackupPath()
        },
        {
          key: 'cloud',
          label: '☁️ Cloud',
          description: 'Google Drive o iCloud',
          path: null
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

  async getCustomPathsInfo() {
    try {
      const destinations = await this.getAvailableDestinations();
      const currentDestination = await this.getBackupDestination();
      
      const pathsInfo = {};
      for (const dest of destinations) {
        pathsInfo[dest.key] = {
          label: dest.label,
          path: dest.path,
          active: dest.key === currentDestination
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
      
      if (cloudConfig.email) {
        // Se c'è un email configurato, usa quello come suggerimento
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: `Salva backup su ${cloudConfig.provider}`,
          UTI: 'public.json'
        });
      } else {
        // Condivisione generica
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Salva backup su cloud',
          UTI: 'public.json'
        });
      }
      
      console.log('☁️ File condiviso su cloud');
      return true;
    } catch (error) {
      console.error('❌ Errore condivisione cloud:', error);
      return false;
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
      
      switch (destination) {
        case 'custom':
          backupPath = await this.getCustomBackupPath();
          break;
        case 'cloud':
          // Per il cloud, salviamo temporaneamente in memoria e poi condividiamo
          backupPath = `${FileSystem.documentDirectory}temp_backups/`;
          break;
        case 'memory':
        default:
          backupPath = `${FileSystem.documentDirectory}backups/`;
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
          path: backupPath
        }
      };

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Se è cloud, condividi il file
      if (destination === 'cloud') {
        await this.shareToCloud(filePath);
      }
      
      console.log('✅ Backup automatico creato:', fileName, 'in:', backupPath);
      return { success: true, fileName, path: filePath, destination };
    } catch (error) {
      console.error('❌ Errore nella creazione backup automatico:', error);
      return { success: false, error: error.message };
    }
  }

  async performAutoBackup(interventi) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const isEnabled = await AsyncStorage.getItem('auto_backup_on_save_enabled');
      if (isEnabled !== 'true') {
        return;
      }

      const backupData = {
        interventi: interventi || [],
        exportDate: new Date().toISOString()
      };

      const result = await this.createAutoBackup(backupData);
      
      if (result.success) {
        await this.scheduleBackupNotification();
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      return { success: false, error: error.message };
    }
  }

  async scheduleBackupNotification() {
    try {
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

      // Carica tutti gli interventi per il backup
      const DatabaseService = (await import('./DatabaseService')).default;
      const interventi = await DatabaseService.getAllWorkEntries();
      
      const result = await this.performAutoBackup(interventi);
      return result;
    } catch (error) {
      console.error('❌ Errore backup automatico condizionale:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AutoBackupService();
