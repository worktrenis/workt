// 🚀 BACKUPSERVICE CONVERTITO A JAVASCRIPT
// Rimosse dipendenze Expo, aggiunto sistema JavaScript

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import JavaScriptBackupService from './JavaScriptBackupService';
import { Alert, Platform } from 'react-native';

class BackupService {
  constructor() {
    // 🚀 SISTEMA JAVASCRIPT: Usa AsyncStorage invece di FileSystem
    this.jsBackupService = JavaScriptBackupService;
    this.useJavaScriptSystem = true;
    
    console.log('🚀 BackupService inizializzato con SISTEMA JAVASCRIPT');
    console.log('✅ Expo FileSystem RIMOSSO - Usando AsyncStorage');
  }

  // ✅ JAVASCRIPT: Nessuna directory necessaria (AsyncStorage)
  async ensureBackupDirectory() {
    console.log('✅ Sistema JavaScript: AsyncStorage sempre pronto');
    return true;
  }

  // ✅ BACKUP JAVASCRIPT: Usa AsyncStorage invece di FileSystem
  async createLocalBackup(backupName = null, filteredData = null) {
    try {
      console.log('🔄 Creazione backup JavaScript...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = backupName || `worktracker-backup-${timestamp}.json`;

      let data;
      if (filteredData && typeof filteredData === 'object') {
        data = filteredData;
        console.log('✅ Utilizzo dati filtrati forniti dal chiamante per il backup');
      } else {
        // Get all data from database
        data = await DatabaseService.getAllData();
      }

      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'javascript_local',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // ✅ SALVA IN ASYNCSTORAGE invece di FileSystem
      const backupKey = `manual_backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));

      // Aggiorna lista backup
      await this.updateJavaScriptBackupList(fileName, backupKey, 'manual');

      console.log(`✅ Backup JavaScript creato: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        data: backupData
      };
      
    } catch (error) {
      console.error('❌ Errore creazione backup JavaScript:', error);
      throw error;
    }
  }

  // ✅ AGGIORNA LISTA BACKUP JAVASCRIPT
  async updateJavaScriptBackupList(fileName, backupKey, type = 'manual') {
    try {
      const currentBackups = await AsyncStorage.getItem('javascript_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      const newBackup = {
        name: fileName,
        key: backupKey,
        date: new Date().toISOString(),
        type: type,
        size: JSON.stringify(await AsyncStorage.getItem(backupKey)).length
      };

      const updatedBackups = [newBackup, ...backups];
      await AsyncStorage.setItem('javascript_backups', JSON.stringify(updatedBackups));
      
      console.log(`📝 Lista backup JavaScript aggiornata: ${updatedBackups.length} backup totali`);
    } catch (error) {
      console.error('Errore aggiornamento lista backup:', error);
    }
  }

  // ✅ EXPORT BACKUP JAVASCRIPT per condivisione
  async exportBackup(backupName = null, filteredData = null) {
    try {
      console.log('📤 Export backup JavaScript...');
      
      const result = await this.createLocalBackup(backupName, filteredData);
      
      if (result.success) {
        // Restituisci i dati per condivisione
        return {
          success: true,
          fileName: result.fileName,
          jsonData: JSON.stringify(result.data, null, 2),
          shareData: result.data
        };
      }
      
      throw new Error('Creazione backup fallita');
    } catch (error) {
      console.error('❌ Errore export backup:', error);
      throw error;
    }
  }
      const backup = await this.createLocalBackup(backupName, filteredData);

      // Share the backup file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Condividi Backup WorkTracker'
        });
      }

      return backup;
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw error;
    }
  }

  // Import backup from file
  async importBackup() {
    try {
      // Pick backup file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return { success: false, message: 'Operazione annullata' };
      }
      
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backupData = JSON.parse(fileContent);
      
      // Validate backup format
      if (!this.validateBackupFormat(backupData)) {
        throw new Error('Formato backup non valido');
      }
      
      // Restore data to database
      await DatabaseService.restoreData(backupData);
      
      // Record import in backup history
      await DatabaseService.recordBackup({
        backup_name: result.assets[0].name,
        backup_type: 'import',
        status: 'completed',
        notes: `Imported from ${result.assets[0].name}`
      });
      
      console.log('Backup imported successfully');
      return {
        success: true,
        fileName: result.assets[0].name,
        recordsCount: {
          workEntries: backupData.workEntries?.length || 0,
          standbyDays: backupData.standbyDays?.length || 0,
          settings: backupData.settings?.length || 0
        }
      };
    } catch (error) {
      console.error('Error importing backup:', error);
      throw error;
    }
  }

  // Import backup da percorso locale (senza picker)
  async importBackupFromPath(filePath) {
    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      const backupData = JSON.parse(fileContent);
      // Validate backup format
      if (!this.validateBackupFormat(backupData)) {
        throw new Error('Formato backup non valido');
      }
      // Restore data to database
      await DatabaseService.restoreData(backupData);
      // Record import in backup history
      await DatabaseService.recordBackup({
        backup_name: backupData.backupInfo?.name || 'manual-restore',
        backup_type: 'import',
        status: 'completed',
        notes: `Ripristinato da file locale: ${filePath}`
      });
      return {
        success: true,
        fileName: backupData.backupInfo?.name || 'manual-restore',
        recordsCount: {
          workEntries: backupData.workEntries?.length || 0,
          standbyDays: backupData.standbyDays?.length || 0,
          settings: backupData.settings?.length || 0
        }
      };
    } catch (error) {
      console.error('Error importing backup from path:', error);
      return { success: false, message: error.message };
    }
  }

  // List local backups
  async listLocalBackups() {
    return this.listAllBackups();
  }

  // Lista tutti i backup (locali e personalizzati)
  async listAllBackups() {
    try {
      await this.ensureBackupDirectory();
      
      // Prima controlla se la cartella backup è vuota
      const backupFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
      const jsonFiles = backupFiles.filter(file => file.endsWith('.json'));
      
      console.log(`📦 BACKUP FOLDER: Found ${jsonFiles.length} JSON files`);
      
      const backupList = [];
      
      // Se non ci sono file JSON fisici, la cartella è vuota
      if (jsonFiles.length === 0) {
        console.log('📦 BACKUP FOLDER: Empty - no JSON files found');
        
        // Pulisci anche i record dal database per sicurezza
        try {
          const dbRecordsCount = await DatabaseService.clearAllBackupRecords();
          if (dbRecordsCount > 0) {
            console.log(`🗄️ Cleaned ${dbRecordsCount} orphaned database records`);
          }
        } catch (dbError) {
          console.warn('⚠️ Error cleaning database records:', dbError);
        }
        
        return []; // Ritorna lista vuota
      }
      
      // Leggi i file fisici nella cartella locale
      for (const fileName of jsonFiles) {
        // Validazione del nome file
        if (!fileName || typeof fileName !== 'string' || fileName.length >= 255) {
          console.warn('⚠️ Nome file backup non valido ignorato:', fileName);
          continue;
        }
        
        const filePath = `${this.backupDirectory}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (!fileInfo.exists) {
          console.warn(`⚠️ File non esiste: ${fileName}`);
          continue;
        }
        
        try {
          const fileContent = await FileSystem.readAsStringAsync(filePath);
          const backupData = JSON.parse(fileContent);
          
          // Sanitizza il nome del file per sicurezza
          const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
          
          backupList.push({
            fileName: sanitizedFileName,
            originalFileName: fileName, // Mantieni l'originale per debug
            filePath,
            size: fileInfo.size,
            created: fileInfo.modificationTime,
            backupDate: backupData.backupInfo?.created || backupData.exportDate,
            recordsCount: {
              workEntries: backupData.workEntries?.length || 0,
              standbyDays: backupData.standbyDays?.length || 0,
              settings: backupData.settings?.length || 0
            },
            backupType: backupData.backupInfo?.type || 'local',
            location: 'App'
          });
        } catch (parseError) {
          console.warn('Could not parse backup file:', fileName, parseError);
        }
      }
      
      // Leggi anche i backup registrati nel database SOLO se corrispondono a file fisici
      const dbBackups = await DatabaseService.getAllBackupsFromDb();
      
      // Filtra i backup del database mantenendo solo quelli che hanno un file fisico corrispondente
      const validDbBackups = dbBackups.filter(dbBackup => {
        return jsonFiles.includes(dbBackup.fileName);
      });
      
      console.log(`🗄️ DATABASE: ${dbBackups.length} total records, ${validDbBackups.length} with physical files`);
      
      // Unisci, evitando duplicati (stesso nome e tipo)
      validDbBackups.forEach(dbB => {
        const already = backupList.find(b => 
          b.fileName === dbB.fileName && 
          b.backupType === dbB.backupType &&
          Math.abs(new Date(b.created) - new Date(dbB.created)) < 60000 // Differenza < 1 minuto
        );
        if (!already) {
          // Solo se il file fisico esiste realmente
          if (jsonFiles.includes(dbB.fileName)) {
            backupList.push({
              fileName: dbB.fileName,
              filePath: dbB.filePath,
              size: null,
              created: dbB.created,
              backupDate: dbB.created,
              recordsCount: {},
              backupType: dbB.backupType,
              location: dbB.backupType === 'custom' ? 'Personalizzato' : (dbB.backupType === 'download' ? 'Downloads' : 'App'),
              status: dbB.status,
              notes: dbB.notes
            });
          }
        }
      });
      
      // Rimuovi duplicati finali basandoti su fileName e created (timestamp)
      const uniqueBackups = backupList.filter((backup, index, arr) => {
        return index === arr.findIndex(b => 
          b.fileName === backup.fileName && 
          Math.abs(new Date(b.created) - new Date(backup.created)) < 60000
        );
      });
      
      // Ordina per data
      uniqueBackups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      console.log(`📦 BACKUP LIST: Found ${backupList.length} total, ${uniqueBackups.length} unique backups`);
      
      return uniqueBackups;
    } catch (error) {
      console.error('Error listing all backups:', error);
      throw error;
    }
  }

  // Delete local backup
  async deleteLocalBackup(fileName) {
    try {
      // Validazione e sanitizzazione del nome file
      if (!fileName || typeof fileName !== 'string') {
        throw new Error('Nome file backup non valido (non è una stringa)');
      }
      
      // Se il fileName contiene JSON o caratteri non validi, prova a trovare il file reale
      let actualFileName = fileName;
      
      // Se il nome contiene caratteri JSON, è probabilmente corrotto
      if (fileName.includes('{') || fileName.includes('"') || fileName.length >= 255) {
        console.log(`⚠️ Nome file corrotto rilevato: ${fileName.substring(0, 100)}...`);
        
        // Tenta di trovare il file corrispondente nella directory
        await this.ensureBackupDirectory();
        const allFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
        
        // Cerca un file che potrebbe corrispondere
        const matchingFile = allFiles.find(file => 
          file.endsWith('.json') && 
          file.length < 255 &&
          !file.includes('{') &&
          !file.includes('"')
        );
        
        if (matchingFile) {
          actualFileName = matchingFile;
          console.log(`✅ File corrispondente trovato: ${actualFileName}`);
        } else {
          // Se non trova un file valido, prova a eliminare tutti i file corrotti
          console.log(`🗑️ Tentativo rimozione file corrotti...`);
          for (const file of allFiles) {
            if (file.includes('{') || file.includes('"') || file.length >= 255) {
              try {
                const corruptedPath = `${this.backupDirectory}${file}`;
                await FileSystem.deleteAsync(corruptedPath);
                console.log(`✅ File corrotto rimosso: ${file.substring(0, 50)}...`);
                return { success: true, message: 'File corrotto rimosso' };
              } catch (deleteError) {
                console.error(`❌ Errore rimozione file corrotto: ${deleteError.message}`);
              }
            }
          }
          throw new Error('Impossibile trovare o rimuovere il file backup');
        }
      }
      
      const filePath = `${this.backupDirectory}${actualFileName}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log(`✅ Backup deleted: ${actualFileName}`);
        return { success: true };
      } else {
        throw new Error(`File backup non trovato: ${actualFileName}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting backup:`, error);
      throw error;
    }
  }

  // Validate backup format
  validateBackupFormat(backupData) {
    // Check required fields
    if (!backupData.exportDate && !backupData.backupInfo?.created) {
      return false;
    }
    
    // Check if it has expected data structure
    if (!Array.isArray(backupData.workEntries) && 
        !Array.isArray(backupData.standbyDays) && 
        !Array.isArray(backupData.settings)) {
      return false;
    }
    
    return true;
  }

  // 🧹 PULIZIA BACKUP CORROTTI
  async cleanupCorruptedBackups() {
    try {
      await this.ensureBackupDirectory();
      const backupFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
      let cleanedCount = 0;
      let totalSize = 0;
      
      for (const fileName of backupFiles) {
        // Controlla se il nome del file è corrotto (troppo lungo o contiene caratteri non validi)
        const isCorruptedName = !fileName || 
                               typeof fileName !== 'string' || 
                               fileName.length >= 255 ||
                               fileName.includes('{') ||
                               fileName.includes('}') ||
                               fileName.includes('"workEntries"');
        
        if (isCorruptedName && fileName.endsWith('.json')) {
          try {
            const filePath = `${this.backupDirectory}${fileName}`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (fileInfo.exists) {
              totalSize += fileInfo.size;
              await FileSystem.deleteAsync(filePath);
              cleanedCount++;
              console.log(`🗑️ Backup corrotto rimosso: ${fileName.substring(0, 50)}...`);
            }
          } catch (deleteError) {
            console.warn(`⚠️ Impossibile rimuovere file corrotto: ${fileName.substring(0, 50)}...`, deleteError);
          }
        }
      }
      
      return {
        success: true,
        cleanedCount,
        totalSize,
        message: cleanedCount > 0 ? 
          `Rimossi ${cleanedCount} backup corrotti (${(totalSize / 1024 / 1024).toFixed(2)} MB)` :
          'Nessun backup corrotto trovato'
      };
    } catch (error) {
      console.error('❌ Errore durante pulizia backup corrotti:', error);
      throw error;
    }
  }

  // 🗑️ CANCELLA TUTTI I BACKUP (metodo più robusto)
  async deleteAllBackups() {
    try {
      await this.ensureBackupDirectory();
      const backupFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
      let deletedCount = 0;
      let totalSize = 0;
      
      for (const fileName of backupFiles) {
        if (fileName.endsWith('.json')) {
          try {
            const filePath = `${this.backupDirectory}${fileName}`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (fileInfo.exists) {
              totalSize += fileInfo.size;
              await FileSystem.deleteAsync(filePath);
              deletedCount++;
              console.log(`🗑️ Backup rimosso: ${fileName.substring(0, 50)}${fileName.length > 50 ? '...' : ''}`);
            }
          } catch (deleteError) {
            console.warn(`⚠️ Errore rimozione backup: ${fileName.substring(0, 50)}...`, deleteError);
          }
        }
      }
      
      // Pulisci anche i record dal database
      try {
        console.log('🗄️ Pulizia record backup dal database...');
        const dbDeletedCount = await DatabaseService.clearAllBackupRecords();
        console.log(`✅ Rimossi ${dbDeletedCount} record backup dal database`);
      } catch (dbError) {
        console.warn('⚠️ Errore pulizia database backup:', dbError);
      }
      
      return {
        success: true,
        deletedCount,
        totalSize,
        message: `Rimossi ${deletedCount} backup fisici (${(totalSize / 1024 / 1024).toFixed(2)} MB)\nPuliti anche i record dal database`
      };
    } catch (error) {
      console.error('❌ Errore durante cancellazione tutti i backup:', error);
      throw error;
    }
  }

  // 💥 PULIZIA FORZATA - Rimuove completamente la cartella backup
  async forceCleanBackupFolder() {
    try {
      console.log('💥 Inizio pulizia forzata cartella backup...');
      
      // Controlla se la cartella esiste
      const dirInfo = await FileSystem.getInfoAsync(this.backupDirectory);
      let removedSize = 0;
      
      if (dirInfo.exists) {
        // Prova a leggere i file per calcolare lo spazio
        try {
          const files = await FileSystem.readDirectoryAsync(this.backupDirectory);
          for (const file of files) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(`${this.backupDirectory}${file}`);
              removedSize += fileInfo.size || 0;
            } catch (sizeError) {
              console.warn(`⚠️ Impossibile ottenere dimensione file: ${file}`);
            }
          }
        } catch (readError) {
          console.warn('⚠️ Impossibile leggere contenuto cartella:', readError);
        }
        
        // Rimuovi completamente la cartella
        await FileSystem.deleteAsync(this.backupDirectory, { idempotent: true });
        console.log('✅ Cartella backup rimossa completamente');
      }
      
      // Pulisci anche i record dal database
      try {
        console.log('🗄️ Pulizia record backup dal database...');
        await DatabaseService.clearAllBackupRecords();
        console.log('✅ Record backup rimossi dal database');
      } catch (dbError) {
        console.warn('⚠️ Errore pulizia database backup:', dbError);
      }
      
      // Ricrea la cartella vuota
      await this.ensureBackupDirectory();
      console.log('✅ Cartella backup ricreata vuota');
      
      return {
        success: true,
        message: `Reset completo eseguito.\nSpazio liberato: ${(removedSize / 1024 / 1024).toFixed(2)} MB\n\nLa cartella backup è stata ricreata vuota e i record dal database sono stati rimossi.`
      };
    } catch (error) {
      console.error('❌ Errore durante pulizia forzata:', error);
      throw error;
    }
  }
  
  // Validazione e filtraggio degli inserimenti di lavoro vuoti
  validateAndFilterWorkEntries(backupData) {
    if (!backupData || !backupData.workEntries || !Array.isArray(backupData.workEntries)) {
      return backupData;
    }
    
    const originalCount = backupData.workEntries.length;
    
    // Filtra gli inserimenti che non hanno dati significativi
    backupData.workEntries = backupData.workEntries.filter(entry => {
      if (!entry) return false;
      
      // Verifica se l'entry ha dati significativi
      // Controlla entrambi i formati possibili (snake_case e camelCase)
      return (
        (entry.site_name && entry.site_name.trim() !== '') ||
        (entry.siteName && entry.siteName.trim() !== '') ||
        (entry.work_start_1 && entry.work_start_1.trim() !== '') ||
        (entry.workStart1 && entry.workStart1.trim() !== '') ||
        (entry.work_end_1 && entry.work_end_1.trim() !== '') ||
        (entry.workEnd1 && entry.workEnd1.trim() !== '')
      );
    });
    
    const filteredCount = originalCount - backupData.workEntries.length;
    console.log(`🧹 BACKUP FILTRO: ${filteredCount} inserimenti vuoti rimossi dal backup (${(filteredCount/originalCount*100).toFixed(1)}%)`);
    
    return backupData;
  }
  
  // Importa backup con filtraggio degli inserimenti vuoti
  async importFilteredBackup(backupData) {
    try {
      if (!backupData) {
        throw new Error('Dati di backup non validi');
      }
      
      // Filtra gli inserimenti vuoti se non è già stato fatto
      const filteredData = this.validateAndFilterWorkEntries(backupData);
      
      // Ripristina i dati filtrati nel database
      await DatabaseService.restoreData(filteredData);
      
      // Registra l'operazione di importazione
      await DatabaseService.recordBackup({
        backup_name: filteredData.backupInfo?.name || 'filtered-restore',
        backup_type: 'filtered-import',
        status: 'completed',
        notes: `Ripristino filtrato con ${filteredData.workEntries?.length || 0} inserimenti validi`
      });
      
      return {
        success: true,
        fileName: filteredData.backupInfo?.name || 'filtered-restore',
        recordsCount: {
          workEntries: filteredData.workEntries?.length || 0,
          standbyDays: filteredData.standbyDays?.length || 0,
          settings: filteredData.settings?.length || 0
        }
      };
    } catch (error) {
      console.error('Errore durante il ripristino filtrato:', error);
      throw error;
    }
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const allBackups = await this.listAllBackups();
      const totalSize = allBackups.reduce((sum, backup) => sum + (backup.size || 0), 0);
      
      return {
        totalBackups: allBackups.length,
        totalSize,
        latestBackup: allBackups[0]?.created || null,
        oldestBackup: allBackups[allBackups.length - 1]?.created || null
      };
    } catch (error) {
      console.error('Error getting backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        latestBackup: null,
        oldestBackup: null
      };
    }
  }

  // Auto backup (called periodically)
  async autoBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `auto-backup-${timestamp}.json`;
      
      const result = await this.createLocalBackup(backupName);
      
      // Keep only last 5 auto backups
      await this.cleanupOldAutoBackups();
      
      return result;
    } catch (error) {
      console.error('Error in auto backup:', error);
      throw error;
    }
  }

  // Cleanup old auto backups
  async cleanupOldAutoBackups() {
    try {
      const backups = await this.listLocalBackups();
      const autoBackups = backups.filter(backup => backup.fileName.startsWith('auto-backup-'));
      
      // Keep only the 5 most recent auto backups
      if (autoBackups.length > 5) {
        const backupsToDelete = autoBackups.slice(5);
        
        for (const backup of backupsToDelete) {
          await this.deleteLocalBackup(backup.fileName);
        }
        
        console.log(`Cleaned up ${backupsToDelete.length} old auto backups`);
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Create local backup with custom name and location
  async createCustomLocalBackup(customName, saveToDownloads = false) {
    try {
      await this.ensureBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName.endsWith('.json') ? customName : `${customName}.json`;
      
      // Determine save location
      let filePath;
      if (saveToDownloads) {
        // Save to Downloads folder (requires permission on Android)
        filePath = `${FileSystem.documentDirectory}../Downloads/${fileName}`;
      } else {
        // Save to app's backup directory
        filePath = `${this.backupDirectory}${fileName}`;
      }
      
      // Get all data from database
      const data = await DatabaseService.getAllData();
      
      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: saveToDownloads ? 'download' : 'local',
          version: '1.0',
          app: 'WorkTracker'
        }
      };
      
      // Write to file
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Record backup in database
      await DatabaseService.recordBackup({
        backup_name: fileName,
        backup_type: saveToDownloads ? 'download' : 'local',
        file_path: filePath,
        status: 'completed'
      });
      
      console.log('Custom backup created:', filePath);
      return {
        success: true,
        filePath,
        fileName,
        size: (await FileSystem.getInfoAsync(filePath)).size,
        location: saveToDownloads ? 'Downloads' : 'App Directory'
      };
    } catch (error) {
      console.error('Error creating custom backup:', error);
      throw error;
    }
  }

  // Create backup with folder picker
  async createBackupWithFolderPicker(customName) {
    try {
      // Get all data from database
      const data = await DatabaseService.getAllData();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName.endsWith('.json') ? customName : `${customName}.json`;
      
      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'custom',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Convert data to string
      const jsonContent = JSON.stringify(backupData, null, 2);
      
      // Create temporary file
      const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempPath, jsonContent);
      
      // Use sharing to let user choose where to save
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          mimeType: 'application/json',
          dialogTitle: `Salva ${fileName}`
        });
        
        // Record backup in database
        await DatabaseService.recordBackup({
          backup_name: fileName,
          backup_type: 'custom',
          file_path: 'user_selected',
          status: 'completed'
        });
        
        // Clean up temp file
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
        
        return {
          success: true,
          fileName,
          location: 'Posizione scelta dall\'utente',
          size: jsonContent.length
        };
      } else {
        throw new Error('Sharing non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Error creating backup with folder picker:', error);
      throw error;
    }
  }

  // 🗑️ Pulisci backup vecchi
  async cleanOldBackups(daysToKeep = 7) {
    try {
      await this.ensureBackupDirectory();
      
      const backupFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
      const jsonFiles = backupFiles.filter(file => file.endsWith('.json'));
      
      let deletedCount = 0;
      let freedSpace = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      for (const fileName of jsonFiles) {
        const filePath = `${this.backupDirectory}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileDate = new Date(fileInfo.modificationTime * 1000);
          
          if (fileDate < cutoffDate) {
            // Backup più vecchio di daysToKeep giorni
            freedSpace += fileInfo.size || 0;
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
            console.log(`🗑️ Eliminato backup vecchio: ${fileName}`);
          }
        }
      }
      
      return {
        deletedCount,
        freedSpace,
        remainingBackups: jsonFiles.length - deletedCount
      };
    } catch (error) {
      console.error('Error cleaning old backups:', error);
      throw error;
    }
  }

  // Legge il contenuto di un file di backup con log dettagliati
  async readBackupFile(filePath, autoFilter = false) {
    try {
      console.log(`🔍 Lettura file di backup: ${filePath}`);
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      
      try {
        const backupData = JSON.parse(fileContent);

        // Validazione del contenuto del backup
        if (!backupData || typeof backupData !== 'object') {
          console.error('❌ Il file di backup non contiene dati validi');
          throw new Error('Il file di backup non contiene dati validi');
        }
        
        // Gestisce entrambi i tipi possibili di backup: con workEntries come array o come proprietà di un oggetto
        if (!Array.isArray(backupData.workEntries) && (!backupData.data || !Array.isArray(backupData.data.workEntries))) {
          console.warn('⚠️ Il backup non contiene array workEntries valido');
          
          // Cerca di ricostruire la struttura se possibile
          if (!backupData.workEntries) {
            backupData.workEntries = [];
            console.warn('⚠️ Creato array workEntries vuoto');
          }
        }
        
        // Applica il filtro se richiesto
        if (autoFilter) {
          return this.validateAndFilterWorkEntries(backupData);
        }

        console.log(`✅ Contenuto del backup validato con successo: ${backupData.workEntries?.length || 0} inserimenti trovati`);
        return backupData;
      } catch (jsonError) {
        console.error('❌ Errore nella conversione del file JSON:', jsonError);
        throw new Error(`Il file di backup non è in formato JSON valido: ${jsonError.message}`);
      }
    } catch (error) {
      console.error('Errore durante la lettura del file di backup:', error);
      throw error;
    }
  }
}

// Crea e esporta una singola istanza (Singleton Pattern)
const BackupServiceInstance = new BackupService();
export default BackupServiceInstance;
