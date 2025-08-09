import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
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
          let isAutomatic = fileName.includes('wort-');
          
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

  generateShortBackupName() {
    const now = new Date();
    const year = now.getFullYear().toString().substr(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    
    return `wort-${day}${month}${year}-${hour}${minute}.json`;
  }

  async createAutoBackup(data) {
    try {
      const backupPath = await this.getCustomBackupPath();
      
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
          version: '1.0'
        }
      };

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      console.log('✅ Backup automatico creato:', fileName);
      return { success: true, fileName, path: filePath };
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

      const isEnabled = await AsyncStorage.getItem('autoBackupEnabled');
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
}

export default new AutoBackupService();
