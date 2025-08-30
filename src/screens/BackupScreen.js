import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { formatDate } from '../utils';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';
import AutoBackupService from '../services/AutoBackupService';
import { clearAllBackupsFromAsyncStorage } from '../../App';

const BackupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [existingBackups, setExistingBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // State per backup automatico al salvataggio
  const [autoBackupOnSave, setAutoBackupOnSave] = useState(false);
  const [showBackupNotification, setShowBackupNotification] = useState(true);
  const [maxBackupsCount, setMaxBackupsCount] = useState(5);
  const [autoBackupDestination, setAutoBackupDestination] = useState('memory');
  const [customPaths, setCustomPaths] = useState({});
  const [backupStats, setBackupStats] = useState(null);
  
  // State per configurazione cloud
  const [cloudProvider, setCloudProvider] = useState('drive');
  const [cloudEmail, setCloudEmail] = useState('');

  // Carica le impostazioni backup al salvataggio all'avvio della schermata
  useEffect(() => {
    const loadBackupSettings = async () => {
      try {
        // Carica impostazioni backup al salvataggio con gestione errori
        try {
          const autoBackupSettings = await AutoBackupService.getAutoBackupSettings();
          setAutoBackupOnSave(autoBackupSettings.enabled);
          setShowBackupNotification(autoBackupSettings.showNotification);
          setMaxBackupsCount(autoBackupSettings.maxBackups);
          setAutoBackupDestination(autoBackupSettings.destination || 'memory');
          
          // Carica informazioni sui percorsi personalizzati
          const pathsInfo = await AutoBackupService.getCustomPathsInfo();
          setCustomPaths(pathsInfo || {});
          
          // Carica statistiche backup con fallback
          try {
            const stats = await AutoBackupService.getBackupStats();
            console.log('🔍 DEBUG - backupStats caricati:', JSON.stringify(stats, null, 2));
            
            // Calcolo alternativo diretto se getBackupStats non funziona
            if (!stats || stats.count === 0) {
              console.log('🔍 FALLBACK - Calcolo statistiche manualmente...');
              const keys = await AsyncStorage.getAllKeys();
              const autoBackupKeys = keys.filter(key => key.startsWith('auto_backup_'));
              console.log('🔍 FALLBACK - Chiavi backup trovate:', autoBackupKeys.length);
              
              let totalSize = 0;
              let lastBackup = null;
              
              for (const key of autoBackupKeys) {
                try {
                  const data = await AsyncStorage.getItem(key);
                  if (data) {
                    totalSize += data.length;
                    const backup = JSON.parse(data);
                    if (backup.created && (!lastBackup || backup.created > lastBackup)) {
                      lastBackup = backup.created;
                    }
                  }
                } catch (e) {
                  console.log('❌ Errore lettura backup:', key, e);
                }
              }
              
              setBackupStats({
                count: autoBackupKeys.length,
                totalSize: Math.round(totalSize / 1024),
                lastBackup: lastBackup
              });
              console.log('🔍 FALLBACK - Statistiche calcolate:', {
                count: autoBackupKeys.length,
                totalSize: Math.round(totalSize / 1024),
                lastBackup: lastBackup
              });
            } else {
              setBackupStats({
                count: stats.count || 0,
                totalSize: Math.round((stats.totalSize || 0) / 1024),
                lastBackup: stats.lastBackup
              });
            }
          } catch (statsError) {
            console.log('❌ Errore caricamento statistiche, provo fallback:', statsError);
            // Fallback completo
            const keys = await AsyncStorage.getAllKeys();
            const autoBackupKeys = keys.filter(key => key.startsWith('auto_backup_'));
            setBackupStats({
              count: autoBackupKeys.length,
              totalSize: 0,
              lastBackup: null
            });
          }
          
          // Carica configurazione cloud
          const cloudConfig = await AutoBackupService.getCloudConfig();
          setCloudProvider(cloudConfig.provider || 'drive');
          setCloudEmail(cloudConfig.email || '');
        } catch (autoBackupError) {
          console.warn('⚠️ Errore caricamento impostazioni AutoBackupService:', autoBackupError);
          // Usa valori di default se il servizio non è disponibile
          setAutoBackupOnSave(false);
          setShowBackupNotification(true);
          setMaxBackupsCount(5);
          setAutoBackupDestination('memory');
          setCustomPaths({});
          setBackupStats(null);
        }
      } catch (e) {
        console.error('Errore caricamento impostazioni backup:', e);
      }
    };
    
    const initializeBackupScreen = async () => {
      await loadBackupSettings();
      // Carica anche la lista dei backup all'avvio
      await loadExistingBackups();
      // Pulisci SEMPRE automaticamente i backup in eccesso se il backup automatico è attivo
      console.log('🔄 Controllo pulizia automatica backup...');
      try {
        const settings = await AutoBackupService.getAutoBackupSettings();
        if (settings.enabled && settings.maxBackups > 0) {
          console.log(`🧹 Pulizia automatica attiva: mantengo max ${settings.maxBackups} backup`);
          await cleanExcessAutoBackups();
          // Ricarica statistiche e lista dopo pulizia
          const stats = await AutoBackupService.getBackupStats();
          setBackupStats(stats);
          await loadExistingBackups();
        } else {
          console.log('ℹ️ Backup automatico non attivo, salto pulizia');
        }
      } catch (cleanError) {
        console.error('⚠️ Errore pulizia automatica:', cleanError);
      }
    };
    
    initializeBackupScreen();
    
    // Controllo periodico ogni 30 secondi per pulizia automatica
    const cleanupInterval = setInterval(async () => {
      try {
        const settings = await AutoBackupService.getAutoBackupSettings();
        if (settings.enabled && settings.maxBackups > 0) {
          console.log('🔄 Controllo periodico pulizia backup automatici...');
          const autoBackups = await AutoBackupService.getAutoBackupsList();
          if (autoBackups.length > settings.maxBackups) {
            console.log(`🧹 Pulizia periodica: ${autoBackups.length} > ${settings.maxBackups}`);
            await cleanExcessAutoBackups();
            // Aggiorna silenziosamente le statistiche con fallback
            try {
              const stats = await AutoBackupService.getBackupStats();
              if (!stats || stats.count === 0) {
                // Fallback
                const keys = await AsyncStorage.getAllKeys();
                const autoBackupKeys = keys.filter(key => key.startsWith('auto_backup_'));
                setBackupStats({
                  count: autoBackupKeys.length,
                  totalSize: 0,
                  lastBackup: null
                });
              } else {
                setBackupStats({
                  count: stats.count || 0,
                  totalSize: Math.round((stats.totalSize || 0) / 1024),
                  lastBackup: stats.lastBackup
                });
              }
            } catch (statsError) {
              console.warn('⚠️ Errore aggiornamento statistiche:', statsError);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Errore controllo periodico:', error);
      }
    }, 30000); // Ogni 30 secondi
    
    // Cleanup interval on unmount
    return () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    };
  }, []);

  // Salva le impostazioni del backup automatico al salvataggio
  const saveAutoBackupOnSaveSettings = async () => {
    try {
      setIsLoading(true);
      const settings = {
        enabled: autoBackupOnSave,
        showNotification: showBackupNotification,
        maxBackups: maxBackupsCount,
        destination: autoBackupDestination
      };
      
      const success = await AutoBackupService.saveAutoBackupSettings(settings);
      
      if (success) {
        // Pulisci SEMPRE automaticamente i backup automatici in eccesso
        console.log('🧹 Pulizia automatica backup dopo salvataggio impostazioni...');
        await cleanExcessAutoBackups();
        
        Alert.alert('Successo', 'Impostazioni backup automatico salvate correttamente');
        // Ricarica le statistiche
        const stats = await AutoBackupService.getBackupStats();
        console.log('🔍 DEBUG - backupStats dopo salvataggio:', JSON.stringify(stats, null, 2));
        setBackupStats(stats);
        
        // Ricarica la lista backup
        await loadExistingBackups();
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni');
      }
    } catch (error) {
      console.error('Errore salvataggio impostazioni backup automatico:', error);
      Alert.alert('Errore', 'Errore durante il salvataggio delle impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  // Pulisce i backup automatici in eccesso mantenendo solo il numero configurato
  const cleanExcessAutoBackups = async () => {
    try {
      console.log('🧹 Pulizia backup automatici in eccesso...');
      
      // Ottieni le impostazioni correnti per essere sicuri
      const settings = await AutoBackupService.getAutoBackupSettings();
      const maxBackups = settings.maxBackups || maxBackupsCount || 5;
      
      // Ottieni tutti i backup automatici
      const autoBackups = await AutoBackupService.getAutoBackupsList();
      console.log(`📊 Trovati ${autoBackups.length} backup automatici, limite: ${maxBackups}`);
      
      if (autoBackups.length > maxBackups) {
        // Ordina per data (più recenti per primi)
        autoBackups.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        
        // Backup da eliminare (quelli in eccesso)
        const backupsToDelete = autoBackups.slice(maxBackups);
        console.log(`🗑️ Elimino ${backupsToDelete.length} backup automatici in eccesso`);
        
        let deletedCount = 0;
        for (const backup of backupsToDelete) {
          try {
            if (backup.filePath && backup.filePath.includes('/')) {
              await FileSystem.deleteAsync(backup.filePath);
              console.log(`✅ Eliminato backup automatico: ${backup.name}`);
              deletedCount++;
            }
          } catch (deleteError) {
            console.warn(`⚠️ Errore eliminazione backup ${backup.name}:`, deleteError);
          }
        }
        
        console.log(`🎯 Eliminati ${deletedCount}/${backupsToDelete.length} backup automatici, mantenuti ${maxBackups} più recenti`);
        return deletedCount;
      } else {
        console.log(`✅ Numero backup automatici (${autoBackups.length}) entro il limite (${maxBackups})`);
        return 0;
      }
    } catch (error) {
      console.error('❌ Errore pulizia backup automatici:', error);
      return 0;
    }
  };

  // Gestisce l'impostazione di un percorso personalizzato per la memoria
  const setCustomMemoryPath = async () => {
    try {
      setIsLoading(true);
      const result = await AutoBackupService.setCustomMemoryPath();
      
      if (result.success) {
        Alert.alert('Successo', 'Percorso personalizzato impostato correttamente');
        // Ricarica le informazioni sui percorsi
        const pathsInfo = await AutoBackupService.getCustomPathsInfo();
        setCustomPaths(pathsInfo || {});
      } else {
        Alert.alert('Errore', result.error || 'Impossibile impostare il percorso');
      }
    } catch (error) {
      console.error('Errore impostazione percorso:', error);
      Alert.alert('Errore', 'Errore durante l\'impostazione del percorso');
    } finally {
      setIsLoading(false);
    }
  };

  // Resetta un percorso personalizzato
  const resetCustomPath = async (destinationType) => {
    try {
      setIsLoading(true);
      const success = await AutoBackupService.resetCustomPath(destinationType);
      
      if (success) {
        Alert.alert('Successo', 'Percorso ripristinato a quello di default');
        // Ricarica le informazioni sui percorsi
        const pathsInfo = await AutoBackupService.getCustomPathsInfo();
        setCustomPaths(pathsInfo || {});
      } else {
        Alert.alert('Errore', 'Impossibile ripristinare il percorso');
      }
    } catch (error) {
      console.error('Errore reset percorso:', error);
      Alert.alert('Errore', 'Errore durante il ripristino del percorso');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatta la dimensione file in modo leggibile
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Funzione per ottenere il nome visualizzabile della destinazione
  const getDestinationDisplayName = (destination) => {
    switch (destination) {
      case 'asyncstorage':
        return 'Memoria App';
      case 'filesystem':
        return 'File System';
      case 'cloud':
        return 'Cloud';
      default:
        return destination || 'Sconosciuto';
    }
  };

  // Funzione per ottenere il percorso completo del backup
  const getFullBackupPath = (backup) => {
    // Per AsyncStorage, mostra la posizione interna
    if (backup.destination === 'asyncstorage' || !backup.destination) {
      return `Memoria app: ${backup.name || backup.key}`;
    }
    
    // Per file condivisi, mostra informazioni user-friendly
    if (backup.destination === 'sharing') {
      return `File condiviso: ${backup.name || 'Backup'}`;
    }
    
    // Per file system, cerca il percorso completo
    if (backup.destination === 'filesystem') {
      const fullPath = backup.filePath || backup.path;
      if (fullPath && fullPath !== backup.key && fullPath.includes('/')) {
        return fullPath;
      }
      return `File system: ${backup.name || backup.key}`;
    }
    
    // Fallback generico
    return backup.path || backup.name || backup.key;
  };

  // Funzione per pulire backup duplicati
  const cleanDuplicateBackups = async () => {
    try {
      console.log('🧹 Pulizia backup duplicati...');
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => 
        key.startsWith('backup_') || 
        key.startsWith('manual-backup-') || 
        key.startsWith('manual_backup_') || 
        key.startsWith('auto-backup-') ||
        key.startsWith('worktracker-backup-')
      );
      
      const backupsByTimestamp = {};
      
      for (const key of backupKeys) {
        const backupData = await AsyncStorage.getItem(key);
        if (backupData) {
          const parsed = JSON.parse(backupData);
          const metadata = parsed.metadata || parsed.backupInfo || {};
          const timestamp = metadata.created || metadata.createdAt;
          
          if (timestamp) {
            const timeKey = new Date(timestamp).getTime();
            if (!backupsByTimestamp[timeKey]) {
              backupsByTimestamp[timeKey] = [];
            }
            backupsByTimestamp[timeKey].push({ key, metadata });
          }
        }
      }
      
      // Rimuovi duplicati (mantieni solo il primo)
      let removedCount = 0;
      for (const timeKey in backupsByTimestamp) {
        const backups = backupsByTimestamp[timeKey];
        if (backups.length > 1) {
          // Mantieni solo il primo, rimuovi gli altri
          for (let i = 1; i < backups.length; i++) {
            await AsyncStorage.removeItem(backups[i].key);
            removedCount++;
            console.log(`🗑️ Rimosso backup duplicato: ${backups[i].key}`);
          }
        }
      }
      
      if (removedCount > 0) {
        Alert.alert('Pulizia Completata', `Rimossi ${removedCount} backup duplicati`);
        await loadExistingBackups(); // Ricarica la lista
      } else {
        Alert.alert('Pulizia', 'Nessun backup duplicato trovato');
      }
      
    } catch (error) {
      console.error('❌ Errore pulizia duplicati:', error);
      Alert.alert('Errore', 'Errore durante la pulizia dei backup duplicati');
    }
  };

  // Carica la lista dei backup esistenti
  const loadExistingBackups = async () => {
    try {
      setLoadingBackups(true);
      
      // Carica backup manuali
      let manualBackups = [];
      if (typeof BackupService.getExistingBackups === 'function') {
        manualBackups = await BackupService.getExistingBackups();
      }
      
      // Carica backup automatici
      let autoBackups = [];
      try {
        autoBackups = await AutoBackupService.getAutoBackupsList();
      } catch (autoError) {
        console.warn('⚠️ Errore caricamento backup automatici:', autoError);
      }
      
      console.log(`📊 BACKUP RECAP: ${manualBackups.length} manuali + ${autoBackups.length} automatici = ${manualBackups.length + autoBackups.length} totali`);
      
      // Combina e ordina tutti i backup per data (più recenti per primi)
      const allBackups = [...(manualBackups || []), ...(autoBackups || [])];

      // Normalizzazione: NON perdere la chiave reale di storage (serve per AsyncStorage.getItem)
      const normalizedBackups = allBackups.map((backup, index) => {
        const storageKey = backup.key || backup.backupKey || `backup_${index}`; // chiave reale
        return {
          ...backup,
          storageKey,              // conserva la chiave originale (per sicurezza)
            // key usata da FlatList: usiamo la stessa chiave reale per evitare mismatch
          key: storageKey,
          displayName: backup.name || storageKey, // nome da mostrare (UI può usare name già esistente)
          createdAt: backup.createdAt || backup.date || new Date(),
          size: backup.size || 0,
          filePath: backup.filePath || backup.path // Assicura che filePath sia sempre disponibile
        };
      });
      
      normalizedBackups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setExistingBackups(normalizedBackups);
    } catch (error) {
      console.error('Errore caricamento backup esistenti:', error);
      setExistingBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Carica i backup esistenti all'avvio
  useEffect(() => {
    loadExistingBackups();
  }, []);

  // 🔄 AGGIORNAMENTO AUTOMATICO: Ricarica backup SEMPRE quando la pagina viene focalizzata
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 BACKUP - Screen focalizzato, ricarico lista backup automaticamente (SEMPRE)...');
      loadExistingBackups();
    }, []) // Nessuna dipendenza - refresh SEMPRE
  );


  // ...
// ...existing code...

  // ✅ ELIMINA BACKUP SPECIFICO
  const deleteBackup = async (backup) => {
    Alert.alert(
      '🗑️ Elimina Backup',
      `Vuoi eliminare il backup "${backup.name}"?\n\nCreato: ${new Date(backup.createdAt).toLocaleString('it-IT')}\nDimensione: ${(backup.size / 1024).toFixed(2)} KB`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingBackups(true);
              
              console.log('🗑️ DEBUG - Tentativo eliminazione backup:', {
                name: backup.name,
                type: backup.type,
                filePath: backup.filePath,
                path: backup.path,
                key: backup.key
              });
              
              let success = false;
              
              // Elimina in base al tipo di backup
              if (backup.type === 'auto') {
                // Backup automatico - elimina direttamente il file
                const targetPath = backup.filePath || backup.path;
                console.log('🗑️ DEBUG - Eliminazione backup automatico:', targetPath);
                
                if (targetPath && targetPath.includes('/')) {
                  await FileSystem.deleteAsync(targetPath);
                  console.log('✅ DEBUG - Backup automatico eliminato con successo');
                  success = true;
                } else {
                  console.error('❌ DEBUG - Percorso file backup automatico non valido:', targetPath);
                  throw new Error('Percorso file non valido');
                }
              } else {
                // Backup manuale - usa il servizio esistente
                console.log('🗑️ DEBUG - Eliminazione backup manuale:', backup.key);
                await BackupService.deleteLocalBackup(backup.key);
                console.log('✅ DEBUG - Backup manuale eliminato con successo');
                success = true;
              }
              
              if (success) {
                await loadExistingBackups(); // Ricarica la lista
                
                Alert.alert(
                  '✅ Backup Eliminato',
                  `Il backup "${backup.name}" è stato eliminato con successo.`
                );
              }
            } catch (error) {
              console.error('❌ Errore eliminazione backup:', error);
              Alert.alert(
                '❌ Errore',
                `Impossibile eliminare il backup: ${error.message}\n\nRiprova o contatta il supporto.`
              );
            } finally {
              setLoadingBackups(false);
            }
          }
        }
      ]
    );
  };

  // ✅ RIPRISTINA BACKUP SPECIFICO
  const restoreSpecificBackup = async (backup) => {
    Alert.alert(
      '⚠️ Ripristina Backup',
      `Vuoi ripristinare il backup "${backup.name}"?\n\nCreato: ${new Date(backup.createdAt).toLocaleString('it-IT')}\n\n❌ ATTENZIONE: Tutti i dati attuali verranno sostituiti!`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              let backupData;
              
              if (backup.type === 'auto') {
                // Backup automatico - leggi dal file system
                const FileSystem = await import('expo-file-system');
                const fileContent = await FileSystem.readAsStringAsync(backup.filePath);
                const parsedData = JSON.parse(fileContent);
                
                // Estrai solo i dati (senza metadati)
                backupData = JSON.stringify(parsedData.data || parsedData);
              } else {
                // Backup manuale - leggi da AsyncStorage
                const storageKey = backup.storageKey || backup.key; // usa sempre la chiave reale
                backupData = await AsyncStorage.getItem(storageKey);
                console.log('🔎 RESTORE manuale - uso storageKey:', storageKey, 'length:', backupData?.length || 0);
                if (!backupData) {
                  throw new Error('Dati backup non trovati');
                }
              }

              await BackupService.importBackup(backupData);
              
              // 🚨 CRITICAL FIX: Pulisci cache e forza reload completo
              console.log('🔄 RESTORE: Pulizia cache e forzando reload...');
              
              // Pulisci AsyncStorage cache delle impostazioni
              await AsyncStorage.removeItem('settings');
              console.log('🗑️ RESTORE: Cache settings pulita');
              
              Alert.alert(
                '✅ Ripristino Completato',
                `Il backup "${backup.name}" è stato ripristinato con successo!\n\nL'app verrà riavviata per applicare le modifiche.`,
                [{
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Dashboard' }],
                    });
                  }
                }]
              );
              
            } catch (error) {
              console.error('Errore ripristino backup:', error);
              Alert.alert(
                '❌ Errore Ripristino',
                'Impossibile ripristinare il backup. Il file potrebbe essere corrotto.'
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ ESPORTA BACKUP SPECIFICO
  const exportSpecificBackup = async (backup) => {
    try {
      setIsLoading(true);
      
      let backupContent;
      
      if (backup.type === 'auto') {
        // Backup automatico - leggi dal file system
        const FileSystem = await import('expo-file-system');
        backupContent = await FileSystem.readAsStringAsync(backup.filePath);
      } else {
        // Backup manuale - leggi da AsyncStorage
  const storageKey = backup.storageKey || backup.key;
  backupContent = await AsyncStorage.getItem(storageKey);
  console.log('📤 EXPORT manuale - uso storageKey:', storageKey, 'length:', backupContent?.length || 0);
        if (!backupContent) {
          throw new Error('Dati backup non trovati');
        }
      }

      // Salva come file per l'esportazione
      const fileName = `${backup.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, backupContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Esporta Backup: ${backup.name}`
        });
      } else {
        Alert.alert('✅ Backup Salvato', `File salvato in: ${fileUri}`);
      }
      
    } catch (error) {
      console.error('Errore esportazione backup:', error);
      Alert.alert(
        '❌ Errore Esportazione',
        'Impossibile esportare il backup. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createManualBackup = async () => {
    try {
      setIsLoading(true);
      
      // Usa il nuovo metodo con selezione destinazione
      const result = await BackupService.createManualBackupWithDestinationChoice();
      
      Alert.alert(
        result.success ? '✅ Backup Creato' : '❌ Backup Fallito',
        result.success 
          ? `${result.message}${result.method ? `\n\nMetodo: ${result.method}` : ''}${result.fileName ? `\nFile: ${result.fileName}` : ''}` 
          : `Errore durante la creazione del backup: ${result.error}`,
        [{ 
          text: 'OK',
          onPress: () => {
            if (result.success) {
              loadExistingBackups(); // Ricarica la lista backup
            }
          }
        }]
      );
    } catch (error) {
      console.error('❌ Errore backup manuale:', error);
      Alert.alert('❌ Errore', `Errore: ${error.message}`, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async () => {
    try {
      setIsLoading(true);
      
      // Usa expo-document-picker per scegliere il file
      const DocumentPicker = await import('expo-document-picker');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false
      });
      
      if (result.canceled) {
        console.log('📱 Selezione file annullata dall\'utente');
        return;
      }
      
      console.log('📁 File selezionato:', result.assets[0].name);
      
      // Leggi il contenuto del file
      const FileSystem = await import('expo-file-system');
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      
      // Conferma ripristino
      Alert.alert(
        '⚠️ Conferma Ripristino',
        `Vuoi ripristinare il backup "${result.assets[0].name}"?\n\n❌ ATTENZIONE: Tutti i dati attuali verranno sostituiti con quelli del backup!`,
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Ripristina', 
            style: 'destructive',
            onPress: async () => {
              try {
                const restoreResult = await BackupService.importBackup(fileContent);
                
                // 🚨 CRITICAL FIX: Pulisci cache e forza reload completo
                console.log('🔄 RESTORE: Pulizia cache e forzando reload...');
                
                // Pulisci AsyncStorage cache delle impostazioni
                await AsyncStorage.removeItem('settings');
                console.log('🗑️ RESTORE: Cache settings pulita');
                
                Alert.alert(
                  '✅ Ripristino Completato',
                  `Backup "${result.assets[0].name}" ripristinato con successo!\n\nL'app verrà riavviata per applicare le modifiche.`,
                  [{ 
                    text: 'OK',
                    onPress: () => {
                      // Ricarica l'app
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                      });
                    }
                  }]
                );
              } catch (importError) {
                console.error('❌ Errore ripristino:', importError);
                Alert.alert(
                  '❌ Errore Ripristino', 
                  `Impossibile ripristinare il backup:\n${importError.message}`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore selezione/ripristino backup:', error);
      Alert.alert(
        '❌ Errore', 
        `Errore durante la selezione del file:\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showBackupStats = async () => {
    try {
      const stats = await BackupService.getBackupStats();
      const systemStatus = BackupService.getSystemStatus();
      
      const message = stats ? 
        `🔄 SISTEMA BACKUP ATTIVO: ${systemStatus.current.toUpperCase()}

📊 Statistiche:
• Backup totali: ${stats.totalBackups || 0}
• Backup manuali: ${stats.manualBackups || 0}
• Backup automatici: ${stats.automaticBackups || 0}
• Sistema attivo: ${stats.isActive ? '✅ SÌ' : '❌ NO'}
• Ultimo backup: ${stats.lastBackup ? new Date(stats.lastBackup).toLocaleString('it-IT') : 'Mai'}
• Prossimo backup: ${stats.nextBackup ? new Date(stats.nextBackup).toLocaleString('it-IT') : 'Non programmato'}

🚀 Sistema Nativo (Affidabile):
• Disponibile: ${systemStatus.native.isNativeReady ? '✅ SÌ' : '❌ NO'}
• Tipo: ${systemStatus.native.systemType}
• Stato: ${systemStatus.native.description}

📱 Sistema JavaScript (Fallback):
• Disponibile: ✅ SÌ
• Tipo: ${systemStatus.javascript.systemType}

💡 Raccomandazione:
${systemStatus.recommendation}

📁 Destinazione Backup:
${availableDestinations.find(d => d.id === backupDestination)?.name || 'Memoria App'}`
        : 'Errore nel recupero delle statistiche';
        
      Alert.alert('📊 Statistiche Sistema Backup', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Errore statistiche:', error);
      Alert.alert('❌ Errore', 'Impossibile ottenere le statistiche', [{ text: 'OK' }]);
    }
  };

  // 🔧 RIPARAZIONE INTERVENTI CORROTTI
  const repairCorruptedInterventi = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        '🔧 Riparazione Interventi Corrotti',
        'Questa operazione verificherà e riparerà eventuali dati di interventi corrotti nel database. I dati corrotti verranno resettati a array vuoto. Vuoi continuare?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Ripara', 
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔧 INIZIO RIPARAZIONE INTERVENTI');
                
                // Ottieni tutti i work entries
                const allEntries = await DatabaseService.getAllWorkEntries();
                console.log(`📊 Controllo ${allEntries.length} entries...`);
                
                let repairedCount = 0;
                let convertedCount = 0;
                let corruptedEntries = [];
                
                // Controlla ogni entry
                for (const entry of allEntries) {
                  let needsRepair = false;
                  let repairedData = '[]';
                  
                  if (entry.interventi) {
                    if (typeof entry.interventi === 'string') {
                      try {
                        const parsed = JSON.parse(entry.interventi);
                        if (!Array.isArray(parsed)) {
                          needsRepair = true;
                          repairedData = JSON.stringify([]);
                        }
                      } catch (error) {
                        console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}: ${entry.interventi}`);
                        
                        // Tentativo di conversione automatica per formato oggetto
                        let cleaned = String(entry.interventi)
                          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                          .replace(/\n/g, ' ')
                          .replace(/\r/g, ' ')
                          .replace(/\t/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
                        
                        // Gestione formato specifico: [{departure_company=19:25, arrival_site=22:25...}]
                        if (cleaned.includes('=') && cleaned.includes('{') && cleaned.includes('}')) {
                          try {
                            let jsonString = cleaned
                              .replace(/\{([^}]+)\}/g, (match, content) => {
                                let pairs = content.split(',').map(pair => {
                                  let [key, value] = pair.split('=');
                                  if (key && value !== undefined) {
                                    return `"${key.trim()}":"${value.trim()}"`;
                                  } else if (key) {
                                    return `"${key.trim()}":""`;
                                  }
                                  return '';
                                }).filter(pair => pair);
                                
                                return `{${pairs.join(',')}}`;
                              });
                            
                            // Verifica che sia JSON valido
                            const converted = JSON.parse(jsonString);
                            repairedData = jsonString;
                            convertedCount++;
                            console.log(`✅ Convertito entry ${entry.id} da formato oggetto a JSON`);
                          } catch (conversionError) {
                            console.warn(`❌ Conversione fallita per entry ${entry.id}:`, conversionError.message);
                            repairedData = '[]';
                          }
                        }
                        
                        needsRepair = true;
                        corruptedEntries.push({
                          date: entry.date,
                          id: entry.id,
                          error: error.message
                        });
                      }
                    } else if (!Array.isArray(entry.interventi)) {
                      needsRepair = true;
                      repairedData = JSON.stringify([]);
                    }
                  }
                  
                  // Ripara se necessario
                  if (needsRepair) {
                    console.log(`🔧 Riparando ${entry.date}...`);
                    
                    // Aggiorna nel database
                    await DatabaseService.db.runAsync(
                      `UPDATE work_entries SET interventi = ? WHERE date = ?`,
                      [repairedData, entry.date]
                    );
                    
                    repairedCount++;
                  }
                }
                
                let resultMessage = `🔧 RIPARAZIONE COMPLETATA:

📊 Risultati:
• Entries controllate: ${allEntries.length}
• Entries riparate: ${repairedCount}
• Entries convertite automaticamente: ${convertedCount}
• Entries corrotte trovate: ${corruptedEntries.length}`;

                if (corruptedEntries.length > 0) {
                  resultMessage += `\n\n🗂️ Date con dati corrotti riparate:`;
                  corruptedEntries.forEach((entry, index) => {
                    resultMessage += `\n${index + 1}. ${entry.date} (ID: ${entry.id})`;
                  });
                }

                if (repairedCount === 0) {
                  resultMessage += `\n\n✅ Nessuna riparazione necessaria. Tutti i dati sono integri!`;
                } else {
                  if (convertedCount > 0) {
                    resultMessage += `\n\n🔄 ${convertedCount} entries sono state convertite automaticamente dal formato oggetto al formato JSON.`;
                  }
                  if (repairedCount - convertedCount > 0) {
                    resultMessage += `\n\n⚠️ ${repairedCount - convertedCount} entries con dati non recuperabili sono state resettate a array vuoto.`;
                  }
                }
                
                Alert.alert('✅ Riparazione Completata', resultMessage, [{ text: 'OK' }]);
                
              } catch (error) {
                console.error('❌ Errore durante riparazione:', error);
                Alert.alert(
                  '❌ Errore Riparazione', 
                  `Si è verificato un errore durante la riparazione:\n\n${error.message}`, 
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore riparazione interventi:', error);
      Alert.alert('❌ Errore', 'Impossibile avviare la riparazione', [{ text: 'OK' }]);
      setIsLoading(false);
    }
  };
  const debugInterventiBackup = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        '🧪 Debug Interventi Backup',
        'Questo test verificherà se gli interventi di reperibilità vengono correttamente salvati e ripristinati nei backup. Vuoi continuare?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Avvia Test', 
            onPress: async () => {
              try {
                console.log('🧪 INIZIO DEBUG INTERVENTI BACKUP');
                
                // 1. Verifica entry attuali con interventi
                const currentEntries = await DatabaseService.getAllWorkEntries();
                const entriesWithInterventi = currentEntries.filter(entry => {
                  try {
                    const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
                    return interventi && Array.isArray(interventi) && interventi.length > 0;
                  } catch (e) {
                    return false;
                  }
                });
                
                console.log(`🧪 Entry totali: ${currentEntries.length}`);
                console.log(`🧪 Entry con interventi: ${entriesWithInterventi.length}`);
                
                // 2. Test backup
                console.log('🧪 Test creazione backup...');
                const backupData = await DatabaseService.getAllData();
                const backupEntriesWithInterventi = backupData.workEntries.filter(entry => 
                  entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
                );
                
                console.log(`🧪 Entry con interventi nel backup: ${backupEntriesWithInterventi.length}`);
                
                // 3. Risultati
                let resultMessage = `🧪 RISULTATI TEST INTERVENTI:

📊 Situazione Attuale:
• Entry totali nel database: ${currentEntries.length}
• Entry con interventi nel database: ${entriesWithInterventi.length}
• Entry con interventi nel backup: ${backupEntriesWithInterventi.length}

✅ Stato Sistema:`;

                if (entriesWithInterventi.length === 0) {
                  resultMessage += `
⚠️ Non ci sono interventi nel database da testare.

💡 Suggerimento: Aggiungi alcuni interventi di reperibilità tramite la funzione "Modifica Entry" e poi riprova questo test.`;
                } else if (entriesWithInterventi.length === backupEntriesWithInterventi.length) {
                  resultMessage += `
✅ SUCCESSO: Gli interventi vengono inclusi correttamente nel backup!

🎯 Tutti i ${entriesWithInterventi.length} interventi sono presenti nel backup.`;
                } else {
                  resultMessage += `
❌ PROBLEMA: Discrepanza tra database e backup!

Database: ${entriesWithInterventi.length} entry con interventi
Backup: ${backupEntriesWithInterventi.length} entry con interventi`;
                }
                
                // Log dettagliato per debug
                if (entriesWithInterventi.length > 0) {
                  console.log('🧪 DETTAGLI INTERVENTI NEL DATABASE:');
                  entriesWithInterventi.forEach((entry, index) => {
                    const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
                    console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${interventi.length}`);
                  });
                }
                
                if (backupEntriesWithInterventi.length > 0) {
                  console.log('🧪 DETTAGLI INTERVENTI NEL BACKUP:');
                  backupEntriesWithInterventi.forEach((entry, index) => {
                    console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${entry.interventi.length}`);
                  });
                }
                
                Alert.alert('🧪 Test Completato', resultMessage, [{ text: 'OK' }]);
                
              } catch (error) {
                console.error('❌ Errore durante debug:', error);
                Alert.alert(
                  '❌ Errore Test', 
                  `Si è verificato un errore durante il test:\n\n${error.message}`, 
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore debug interventi:', error);
      Alert.alert('❌ Errore', 'Impossibile avviare il test di debug', [{ text: 'OK' }]);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <ScrollView style={styles.content}>
        {/* Nuova Sezione: Backup Automatico al Salvataggio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup Automatico al Salvataggio</Text>
          <Text style={styles.sectionDescription}>
            Crea automaticamente un backup ogni volta che salvi un inserimento
          </Text>
          
          <View style={styles.autoBackupContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Attiva backup al salvataggio</Text>
              <Switch
                value={autoBackupOnSave}
                onValueChange={setAutoBackupOnSave}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            
            {autoBackupOnSave && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Mostra notifica backup</Text>
                  <Switch
                    value={showBackupNotification}
                    onValueChange={setShowBackupNotification}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                </View>
                
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Backup da mantenere:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={maxBackupsCount || 5}
                      onValueChange={(value) => setMaxBackupsCount(value)}
                      style={styles.picker}
                      dropdownIconColor={theme.colors.primary}
                    >
                      <Picker.Item label="3" value={3} />
                      <Picker.Item label="5" value={5} />
                      <Picker.Item label="10" value={10} />
                    </Picker>
                  </View>
                </View>
                
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Destinazione backup:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={autoBackupDestination}
                      onValueChange={setAutoBackupDestination}
                      style={styles.picker}
                      dropdownIconColor={theme.colors.primary}
                    >
                      <Picker.Item label="📱 Memoria" value="memory" />
                      <Picker.Item label="📂 Cartella" value="custom" />
                      <Picker.Item label="☁️ Cloud" value="cloud" />
                    </Picker>
                  </View>
                </View>
                
                {/* Configurazione cloud */}
                {autoBackupDestination === 'cloud' && (
                  <View style={styles.customPathContainer}>
                    <Text style={styles.pathsTitle}>☁️ Configurazione Cloud</Text>
                    <View style={styles.cloudConfigSection}>
                      <Text style={styles.pickerLabel}>Provider:</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={cloudProvider}
                          onValueChange={setCloudProvider}
                          style={styles.picker}
                          dropdownIconColor={theme.colors.primary}
                        >
                          <Picker.Item label="Google Drive" value="drive" />
                          <Picker.Item label="iCloud" value="icloud" />
                        </Picker>
                      </View>
                      
                      <Text style={styles.pickerLabel}>Email/Account:</Text>
                      <TextInput
                        style={styles.cloudEmailInput}
                        value={cloudEmail}
                        onChangeText={setCloudEmail}
                        placeholder="es. tuoemail@gmail.com"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      
                      <TouchableOpacity
                        style={[styles.pathButton, styles.pathButtonPrimary]}
                        onPress={async () => {
                          try {
                            const success = await AutoBackupService.setCloudConfig(cloudProvider, cloudEmail);
                            if (success) {
                              Alert.alert('Successo', 'Configurazione cloud salvata');
                            } else {
                              Alert.alert('Errore', 'Impossibile salvare la configurazione');
                            }
                          } catch (error) {
                            console.error('Errore configurazione cloud:', error);
                            Alert.alert('Errore', 'Errore durante il salvataggio');
                          }
                        }}
                        disabled={isLoading || !cloudEmail.trim()}
                      >
                        <Text style={styles.pathButtonText}>💾 Salva Configurazione</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {/* Selezione cartella personalizzata */}
                {autoBackupDestination === 'custom' && (
                  <View style={styles.customPathContainer}>
                    <Text style={styles.pathsTitle}>📂 Cartella backup personalizzata</Text>
                    <Text style={styles.customPathDescription}>
                      Scegli dove salvare i backup. Verrà aperto il menu di condivisione: 
                      salva il file nella cartella desiderata per impostare il percorso.
                    </Text>
                    <TouchableOpacity
                      style={[styles.pathButton, styles.pathButtonPrimary]}
                      onPress={async () => {
                        try {
                          setIsLoading(true);
                          const result = await AutoBackupService.selectBackupFolder();
                          if (result.success) {
                            Alert.alert('✅ Percorso Impostato', 
                              `I backup verranno salvati nella cartella selezionata.\n\nPercorso: ${result.displayName}`,
                              [{ text: 'OK' }]
                            );
                            // Ricarica le informazioni sui percorsi
                            const pathsInfo = await AutoBackupService.getCustomPathsInfo();
                            setCustomPaths(pathsInfo || {});
                          } else if (!result.canceled) {
                            Alert.alert('Errore', result.error || 'Impossibile configurare il percorso personalizzato');
                          }
                        } catch (error) {
                          console.error('Errore configurazione percorso:', error);
                          Alert.alert('Errore', 'Errore durante la configurazione del percorso');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.pathButtonText}>📁 Scegli Cartella</Text>
                    </TouchableOpacity>
                    
                    {customPaths.custom && (
                      <View style={styles.selectedPathInfo}>
                        <Text style={styles.selectedPathLabel}>Cartella selezionata:</Text>
                        <Text style={styles.selectedPathValue} numberOfLines={2} ellipsizeMode="middle">
                          {customPaths.custom.path}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Statistiche backup */}
                {autoBackupOnSave && (
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsTitle}>📊 Statistiche backup automatici</Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>Backup totali:</Text>
                      <Text style={styles.statsValue}>{backupStats?.count || 0}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsLabel}>Spazio occupato:</Text>
                      <Text style={styles.statsValue}>{formatFileSize(backupStats?.totalSize || 0)}</Text>
                    </View>
                    {backupStats?.lastBackup && (
                      <View style={styles.statsRow}>
                        <Text style={styles.statsLabel}>Ultimo backup:</Text>
                        <Text style={styles.statsValue}>
                          {formatDate(backupStats.lastBackup)}
                        </Text>
                      </View>
                    )}
                    {!backupStats && (
                      <View style={styles.statsRow}>
                        <Text style={styles.statsLabel}>Stato:</Text>
                        <Text style={styles.statsValue}>Caricamento...</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Bottone Salva Impostazioni Backup Automatico */}
          {autoBackupOnSave && (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#4CAF50' }]} 
              onPress={saveAutoBackupOnSaveSettings} 
              disabled={isLoading}
            >
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={[styles.saveButtonText, { color: 'white' }]}>
                Salva Impostazioni Backup Automatico
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sezione Backup Manuali */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup Manuali</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={createManualBackup}
            disabled={isLoading}
          >
            <Ionicons name="download-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Crea Backup Manuale</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#FF6B35' }]}
            onPress={restoreBackup}
            disabled={isLoading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Ripristina da File</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ BACKUP ESISTENTI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Backup Salvati</Text>
          
          {/* Pulsante Aggiorna Lista sempre visibile */}
          <TouchableOpacity
            style={[styles.button, styles.refreshButton]}
            onPress={loadExistingBackups}
            disabled={loadingBackups}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              Aggiorna Lista
            </Text>
          </TouchableOpacity>
          
          {loadingBackups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Caricamento backup...</Text>
            </View>
          ) : existingBackups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Nessun backup trovato</Text>
              <Text style={styles.emptySubtext}>Crea il tuo primo backup per iniziare</Text>
            </View>
          ) : (
            <>
              <Text style={styles.backupCount}>
                📊 {existingBackups.length} backup disponibili
              </Text>
              {existingBackups.map((backup, index) => {
                return (
                <View key={backup.key} style={styles.backupItem}>
                  <View style={styles.backupHeader}>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupName}>{backup.name || 'Backup senza nome'}</Text>
                      <Text style={styles.backupDate}>
                        📅 {new Date(backup.createdAt).toLocaleString('it-IT')}
                      </Text>
                      <Text style={styles.backupSize}>
                        💾 {Math.round(backup.size / 1024)} KB
                      </Text>
                      {backup.type === 'auto' && (
                        <Text style={styles.backupType}>🤖 Automatico</Text>
                      )}
                      {backup.type === 'javascript_local' && (
                        <Text style={styles.backupType}>📱 JavaScript</Text>
                      )}
                      {backup.type === 'manual' && (
                        <Text style={styles.backupType}>✋ Manuale</Text>
                      )}
                      {(backup.type === 'automatic' || backup.type === 'auto') && (
                        <Text style={styles.backupType}>🔄 Automatico</Text>
                      )}
                      <Text style={styles.backupDestination}>
                        📁 {getDestinationDisplayName(backup.destination)}
                      </Text>
                      <Text style={styles.backupPath} numberOfLines={2} ellipsizeMode="middle">
                        📂 {getFullBackupPath(backup)}
                      </Text>
                    </View>
                    <View style={styles.backupActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.exportButton]}
                        onPress={() => exportSpecificBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.restoreButton]}
                        onPress={() => restoreSpecificBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => deleteBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {backup.entries > 0 && (
                    <Text style={styles.backupEntries}>
                      📋 {backup.entries} ore registrate
                    </Text>
                  )}
                </View>
                );
              })}
            </>
          )}
          
          {/* Pulsante Cancella Tutti i Backup sempre visibile */}
          <TouchableOpacity
            style={{ 
              marginTop: 20, 
              backgroundColor: existingBackups.length > 0 ? '#d32f2f' : '#757575', 
              borderRadius: 6, 
              padding: 12, 
              alignItems: 'center' 
            }}
            disabled={existingBackups.length === 0}
            onPress={async () => {
                Alert.alert(
                  'Conferma eliminazione',
                  'Sei sicuro di voler eliminare tutti i backup? Questa azione non può essere annullata.',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    { text: 'Elimina tutto', style: 'destructive', onPress: async () => {
                        try {
                          console.log('🗑️ Avvio eliminazione tutti i backup...');
                          
                          let result = null;
                          
                          // Prova prima il metodo principale
                          if (BackupService && typeof BackupService.deleteAllBackups === 'function') {
                            console.log('🔄 Chiamando BackupService.deleteAllBackups...');
                            result = await BackupService.deleteAllBackups();
                            console.log('✅ BackupService.deleteAllBackups completato:', result);
                          } else if (typeof clearAllBackupsFromAsyncStorage === 'function') {
                            console.log('🔄 Chiamando clearAllBackupsFromAsyncStorage...');
                            const deletedCount = await clearAllBackupsFromAsyncStorage();
                            result = { success: true, deletedCount, message: `Eliminati ${deletedCount} backup` };
                            console.log('✅ clearAllBackupsFromAsyncStorage completato:', result);
                          } else {
                            throw new Error('Nessun metodo di eliminazione disponibile');
                          }
                          
                          // Ricarica la lista backup con protezione
                          try {
                            console.log('🔄 Ricaricando lista backup...');
                            if (typeof loadExistingBackups === 'function') {
                              await loadExistingBackups();
                              console.log('✅ Lista backup ricaricata');
                            } else {
                              console.warn('⚠️ loadExistingBackups non disponibile');
                            }
                          } catch (reloadError) {
                            console.warn('⚠️ Errore ricaricamento lista backup:', reloadError.message);
                          }
                          
                          // Mostra risultato
                          Alert.alert(
                            result.success ? '✅ Backup Eliminati' : '❌ Errore', 
                            result.message || `Eliminazione ${result.success ? 'completata' : 'fallita'}: ${result.deletedCount || 0} backup`
                          );
                          
                        } catch (e) {
                          console.error('❌ Errore eliminazione backup:', e);
                          // Proteggi l'app da crash con timeout
                          setTimeout(() => {
                            Alert.alert('❌ Errore', `Errore durante l'eliminazione: ${e.message}`);
                          }, 100);
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={{ 
                color: existingBackups.length > 0 ? 'white' : '#bdbdbd', 
                fontWeight: 'bold', 
                fontSize: 16 
              }}>
                🗑️ Cancella tutti i backup {existingBackups.length === 0 ? '(0)' : `(${existingBackups.length})`}
              </Text>
            </TouchableOpacity>
        </View>




 




      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Elaborando...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Funzione per creare stili dinamici basati sul tema
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  autoBackupContainer: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  timeContainer: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  timeSelectorText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  destinationContainer: {
    gap: 8,
  },
  destinationLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  destinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  destinationButtonText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  destinationDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.1)' : theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: theme.name === 'dark' ? 1 : 0,
    borderColor: theme.name === 'dark' ? 'rgba(33, 150, 243, 0.3)' : 'transparent',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.name === 'dark' ? '#E3F2FD' : theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    minHeight: 300,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  destinationList: {
    padding: 16,
  },
  destinationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  destinationOptionSelected: {
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  destinationOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  destinationOptionText: {
    flex: 1,
    gap: 4,
  },
  destinationOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  destinationOptionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  destinationOptionTags: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagAvailable: {
    backgroundColor: theme.colors.success || '#4CAF50',
  },
  tagReliable: {
    backgroundColor: theme.colors.warning || '#FF9800',
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  
  // ✅ STILI BACKUP ESISTENTI
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  backupCount: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  backupItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backupInfo: {
    flex: 1,
    marginRight: 16,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  backupDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  backupSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  backupType: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  backupDestination: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '500',
  },
  backupPath: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  backupEntries: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  exportButton: {
    backgroundColor: '#2196F3', // Blu per condivisione
  },
  restoreButton: {
    backgroundColor: '#4CAF50', // Verde per ripristino
  },
  deleteButton: {
    backgroundColor: '#F44336', // Rosso per eliminazione
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  pickerContainer: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  picker: {
    height: 50,
    color: theme.colors.text,
  },
  statsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statsValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pathsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pathsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  pathItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pathHeader: {
    marginBottom: 6,
  },
  pathLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  pathStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  pathButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pathButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  pathButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pathButtonSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  pathButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onPrimary,
  },
  pathButtonTextSecondary: {
    color: theme.colors.text,
  },
  customPathContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customPathDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  selectedPathInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedPathLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  selectedPathValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  cloudConfigSection: {
    gap: 12,
  },
  cloudEmailInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: 14,
  },
});
export default BackupScreen;
