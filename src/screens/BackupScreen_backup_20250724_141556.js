import React, { useState, useEffect } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';
import { formatDate } from '../utils';
          </Text>
        </View>
      </ScrollView>

      {/* Modal Selezione Destinazione */}
      {showDestinationPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📁 Scegli Destinazione Backup</Text>
              <TouchableOpacity onPress={() => setShowDestinationPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.destinationList}>
              {availableDestinations.map((destination) => (
                <TouchableOpacity
                  key={destination.id}
                  style={[
                    styles.destinationOption,
                    backupDestination === destination.id && styles.destinationOptionSelected
                  ]}
                  onPress={() => {
                    setBackupDestination(destination.id);
                    setShowDestinationPicker(false);
                  }}
                >
                  <View style={styles.destinationOptionLeft}>
                    <Ionicons 
                      name={destination.icon} 
                      size={24} 
                      color={backupDestination === destination.id ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <View style={styles.destinationOptionText}>
                      <Text style={[
                        styles.destinationOptionName,
                        backupDestination === destination.id && { color: theme.colors.primary }
                      ]}>
                        {destination.name}
                      </Text>
                      <Text style={styles.destinationOptionDescription}>
                        {destination.description}
                      </Text>
                      <View style={styles.destinationOptionTags}>
                        {destination.available && (
                          <View style={[styles.tag, styles.tagAvailable]}>
                            <Text style={styles.tagText}>✅ Disponibile</Text>
                          </View>
                        )}
                        {destination.reliable && (
                          <View style={[styles.tag, styles.tagReliable]}>
                            <Text style={styles.tagText}>🔒 Affidabile</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {backupDestination === destination.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );'../services/BackupService';
import { formatDate } from '../utils';

const BackupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme); // Stili dinamici basati sul tema
  const [isLoading, setIsLoading] = useState(false);
  const [recentBackups, setRecentBackups] = useState([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [lastBackupDate, setLastBackupDate] = useState(null);
  const [backupDestination, setBackupDestination] = useState('asyncstorage');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  useEffect(() => {
    loadBackupSettings();
    loadRecentBackups();
    loadAvailableDestinations();
  }, []);

  // Carica impostazioni backup dal sistema ibrido
  const loadBackupSettings = async () => {
    try {
      // Ottieni impostazioni dal sistema appropriato
      const settings = await BackupService.getBackupSettings();
      const lastBackup = await AsyncStorage.getItem('last_backup_date');

      setAutoBackupEnabled(settings.enabled);
      setAutoBackupTime(settings.time);
      setBackupDestination(settings.destination || 'asyncstorage');
      if (lastBackup) setLastBackupDate(lastBackup);
      
      console.log('✅ Impostazioni backup caricate:', settings);
    } catch (error) {
      console.error('Errore caricamento impostazioni backup:', error);
    }
  };

  // Carica destinazioni disponibili
  const loadAvailableDestinations = async () => {
    try {
      const destinations = BackupService.getAvailableDestinations();
      setAvailableDestinations(destinations);
      console.log('📁 Destinazioni backup disponibili:', destinations);
    } catch (error) {
      console.error('Errore caricamento destinazioni backup:', error);
    }
  };

  // Carica gli ultimi 3 backup dalla cartella dell'app
  const loadRecentBackups = async () => {
    try {
      // Carica dalla cartella dell'app, non dal percorso personalizzato
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        // Se la cartella non esiste, creala e imposta lista vuota
        await FileSystem.makeDirectoryAsync(backupDir, { intermediateDirectories: true });
        setRecentBackups([]);
        return;
      }

      // Prima prova a caricare da AsyncStorage (backup recenti salvati)
      const backupsInfo = await AsyncStorage.getItem('recent_backups');
      if (backupsInfo) {
        const backups = JSON.parse(backupsInfo);
        
        // Verifica che i file esistano ancora
        const validBackups = [];
        for (const backup of backups) {
          const fileInfo = await FileSystem.getInfoAsync(backup.path);
          if (fileInfo.exists) {
            validBackups.push(backup);
          }
        }
        
        setRecentBackups(validBackups.slice(0, 3)); // Solo gli ultimi 3
        return;
      }

      // Se non ci sono backup salvati in AsyncStorage, scansiona la cartella
      const files = await FileSystem.readDirectoryAsync(backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const filePath = `${backupDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          return {
            name: file,
            path: filePath,
            date: new Date(fileInfo.modificationTime).toISOString(),
            size: fileInfo.size
          };
        });

      const resolvedBackups = await Promise.all(backupFiles);
      const sortedBackups = resolvedBackups
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      setRecentBackups(sortedBackups);
      
      // Salva in AsyncStorage per future chiamate
      if (sortedBackups.length > 0) {
        await AsyncStorage.setItem('recent_backups', JSON.stringify(sortedBackups));
      }
    } catch (error) {
      console.error('Errore caricamento backup recenti:', error);
      setRecentBackups([]);
    }
  };

  // Salva le impostazioni auto-backup nel sistema ibrido (completo)
  const saveBackupSettings = async () => {
    try {
      setIsLoading(true);
      
      // Salva tramite il sistema appropriato con tutte le impostazioni
      const success = await BackupService.updateAllBackupSettings(
        autoBackupEnabled, 
        autoBackupTime, 
        backupDestination
      );
      
      if (success) {
        Alert.alert('Successo', 'Impostazioni backup salvate correttamente');
        
        // Mostra info sistema
        const systemStatus = BackupService.getSystemStatus();
        console.log('📱 Sistema backup attivo:', systemStatus.current);
        console.log('💡 Info:', systemStatus.recommendation);
        console.log('📁 Destinazione:', backupDestination);
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni backup');
      }
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  // Scegli percorso personalizzato
  const selectCustomPath = async () => {
    try {
      Alert.alert(
        'Informazione',
        'Per sicurezza, i backup verranno salvati nella cartella dell\'app e potrai condividerli nel percorso che preferisci usando il pulsante "Condividi".',
        [{ text: 'OK' }]
      );
      
      // Usa sempre la cartella dell'app
      const documentsPath = FileSystem.documentDirectory;
      const backupPath = `${documentsPath}backups/`;
      
      // Crea la cartella se non esiste
      const dirInfo = await FileSystem.getInfoAsync(backupPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupPath, { intermediateDirectories: true });
      }
    } catch (error) {
      console.error('Errore selezione percorso:', error);
      Alert.alert('Errore', 'Impossibile impostare il percorso di backup');
    }
  };

  // Crea backup manuale e scegli dove salvarlo
  const createManualBackup = async () => {
    setIsLoading(true);
    try {
      // Genera nome file con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `worktracker-backup-${timestamp}.json`;
      
      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();
      
      // Aggiungi metadati backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'manual',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Crea il file temporaneamente nella cache
      const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(backupData, null, 2));

      // Apri immediatamente il menu di condivisione per scegliere dove salvare
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          mimeType: 'application/json',
          dialogTitle: 'Scegli dove salvare il backup',
          UTI: 'public.json'
        });

        // Salva anche una copia locale per la lista recenti
        const localBackupPath = `${FileSystem.documentDirectory}backups/`;
        const dirInfo = await FileSystem.getInfoAsync(localBackupPath);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(localBackupPath, { intermediateDirectories: true });
        }
        
        const localFilePath = `${localBackupPath}${fileName}`;
        await FileSystem.copyAsync({
          from: tempPath,
          to: localFilePath
        });

        // Aggiorna lista backup recenti
        const newBackup = {
          name: fileName,
          path: localFilePath,
          date: new Date().toISOString(),
          size: (await FileSystem.getInfoAsync(localFilePath)).size
        };

        const updatedBackups = [newBackup, ...recentBackups].slice(0, 3);
        setRecentBackups(updatedBackups);
        await AsyncStorage.setItem('recent_backups', JSON.stringify(updatedBackups));
        await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
        setLastBackupDate(new Date().toISOString());

        Alert.alert(
          'Backup Creato!',
          `Backup ${fileName} creato e pronto per essere salvato.\n\nScegli dall'app di sistema dove salvarlo definitivamente.`
        );
      } else {
        Alert.alert('Errore', 'Sistema di condivisione non disponibile');
      }
    } catch (error) {
      console.error('Errore creazione backup:', error);
      Alert.alert('Errore', `Impossibile creare il backup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Ripristina da backup
  const restoreFromBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      console.log('DocumentPicker result:', result);

      if (result.type === 'success' || (result.assets && result.assets.length > 0)) {
        // Gestisce sia il formato vecchio che nuovo di DocumentPicker
        const fileUri = result.uri || (result.assets && result.assets[0].uri);
        
        if (!fileUri) {
          Alert.alert('Errore', 'Impossibile accedere al file selezionato');
          return;
        }

        Alert.alert(
          'Conferma Ripristino',
          'Sei sicuro di voler ripristinare questo backup? Tutti i dati attuali verranno sostituiti.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Ripristina', style: 'destructive', onPress: () => performRestore(fileUri) }
          ]
        );
      }
    } catch (error) {
      console.error('Errore selezione file backup:', error);
      Alert.alert('Errore', 'Impossibile selezionare il file di backup');
    }
  };

  // Esegui ripristino
  const performRestore = async (fileUri) => {
    setIsLoading(true);
    try {
      console.log('Attempting to restore from:', fileUri);
      
      // Leggi contenuto file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      console.log('File content length:', fileContent.length);
      
      const backupData = JSON.parse(fileContent);
      console.log('Parsed backup data keys:', Object.keys(backupData));

      // Verifica che sia un backup valido
      if (!backupData.backupInfo || backupData.backupInfo.app !== 'WorkTracker') {
        throw new Error('File di backup non valido o non compatibile');
      }

      console.log('Backup validation passed, calling restoreData...');

      // Ripristina dati nel database - usa il metodo corretto
      const result = await DatabaseService.restoreData(backupData);
      console.log('Restore result:', result);

      Alert.alert(
        'Successo', 
        'Backup ripristinato correttamente!\n\nL\'app verrà ricaricata per mostrare i dati aggiornati.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Aggiorna i backup recenti per riflettere il nuovo stato
              loadRecentBackups();
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Errore ripristino backup:', error);
      Alert.alert('Errore', `Impossibile ripristinare il backup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ BACKUP AUTOMATICO JAVASCRIPT (sostituisce Expo FileSystem)
  const createAutoBackup = async () => {
    try {
      console.log('🔄 Creazione backup automatico JavaScript...');
      
      // Usa il nuovo BackupService JavaScript
      const result = await BackupService.autoBackup();
      
      if (result) {
        console.log('✅ Backup automatico JavaScript completato');
        
        // Aggiorna lista backup recenti
        const backups = await BackupService.listLocalBackups();
        const recentBackups = backups.slice(0, 3);
        
        // Aggiorna timestamp ultimo backup
        await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
        
        return true;
      } else {
        throw new Error('Backup automatico fallito');
      }
      
    } catch (error) {
      console.error('❌ Errore backup automatico JavaScript:', error);
      return false;
    }
  };

  // ✅ CONFIGURA BACKUP AUTOMATICO JAVASCRIPT
  const setupAutoBackup = async () => {
    try {
      console.log('🔄 Configurazione backup automatico JavaScript...');
      
      // Importa BackupService se non già fatto
      // Configura backup automatico con il nuovo sistema
      await BackupService.setupAutoBackup(autoBackupEnabled, autoBackupTime);
      
      if (autoBackupEnabled) {
        console.log(`� Backup automatico JavaScript attivato per le ${autoBackupTime}`);
        console.log('✅ Sistema: JavaScript Timer + AsyncStorage');
        console.log('💡 I backup vengono salvati automaticamente nell\'app');
      } else {
        console.log('🛑 Backup automatico JavaScript disattivato');
      }
      
    } catch (error) {
      console.error('❌ Errore configurazione backup automatico:', error);
    }
  };

  useEffect(() => {
    setupAutoBackup();
  }, [autoBackupEnabled, autoBackupTime]);

  // Condividi backup con opzione di salvataggio
  const shareBackupWithSaveOption = async (backup) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.path, {
          mimeType: 'application/json',
          dialogTitle: 'Salva Backup WorkTracker nel percorso che preferisci'
        });
      } else {
        Alert.alert('Errore', 'Condivisione non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Errore condivisione backup:', error);
      Alert.alert('Errore', 'Impossibile condividere il backup');
    }
  };

  // Condividi backup
  const shareBackup = async (backup) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.path, {
          mimeType: 'application/json',
          dialogTitle: 'Condividi Backup WorkTracker'
        });
      } else {
        Alert.alert('Errore', 'Condivisione non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Errore condivisione backup:', error);
      Alert.alert('Errore', 'Impossibile condividere il backup');
    }
  };

  // Formatta dimensione file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Ripristina un backup specifico dalla lista recenti
  const restoreSpecificBackup = async (backup) => {
    Alert.alert(
      'Conferma Ripristino',
      `Sei sicuro di voler ripristinare il backup "${backup.name}"?\n\nTutti i dati attuali verranno sostituiti.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Ripristina', style: 'destructive', onPress: () => performRestore(backup.path) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup e Ripristino</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sezione Percorso Personalizzato */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup Diretto</Text>
          <Text style={styles.pathHelpText}>
            Quando crei un backup, si aprirà automaticamente il menu di sistema per scegliere dove salvarlo:{'\n'}
            📱 File Manager per salvare in cartelle locali{'\n'}
            ☁️ Google Drive, OneDrive per il cloud{'\n'}
            📧 Email, WhatsApp per inviarlo{'\n'}
            💾 Una copia viene sempre mantenuta nell'app
          </Text>
        </View>

        {/* Sezione Backup Automatico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Automatico</Text>
          <View style={styles.autoBackupContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Attiva backup automatico</Text>
              <Switch
                value={autoBackupEnabled}
                onValueChange={setAutoBackupEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            {autoBackupEnabled && (
              <>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeLabel}>Orario backup (ogni 24h):</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={autoBackupTime}
                    onChangeText={setAutoBackupTime}
                    placeholder="HH:MM"
                  />
                </View>
                
                {/* Selezione Destinazione Backup */}
                <View style={styles.destinationContainer}>
                  <Text style={styles.destinationLabel}>📁 Destinazione backup:</Text>
                  <TouchableOpacity 
                    style={styles.destinationButton}
                    onPress={() => setShowDestinationPicker(true)}
                  >
                    <Ionicons 
                      name={availableDestinations.find(d => d.id === backupDestination)?.icon || 'folder-outline'} 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.destinationButtonText}>
                      {availableDestinations.find(d => d.id === backupDestination)?.name || 'Memoria App'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  
                  <Text style={styles.destinationDescription}>
                    {availableDestinations.find(d => d.id === backupDestination)?.description || 
                     'Salva nella memoria interna dell\'app'}
                  </Text>
                </View>
              </>
            )}
          </View>
          {lastBackupDate && (
            <Text style={styles.lastBackupText}>
              Ultimo backup: {formatDate(new Date(lastBackupDate))}
            </Text>
          )}
        </View>

        {/* Bottone Salva Impostazioni */}
        <TouchableOpacity style={styles.saveButton} onPress={saveBackupSettings}>
          <Ionicons name="save-outline" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>

        {/* Sezione Backup Recenti */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Recenti</Text>
          {recentBackups.length > 0 ? (
            recentBackups.map((backup, index) => (
              <View key={index} style={styles.backupItem}>
                <View style={styles.backupInfo}>
                  <Text style={styles.backupName}>{backup.name}</Text>
                  <Text style={styles.backupDetails}>
                    {formatDate(new Date(backup.date))} • {formatFileSize(backup.size)}
                  </Text>
                  <Text style={styles.backupPath} numberOfLines={1}>
                    {backup.path}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareBackupButton}
                  onPress={() => shareBackup(backup)}
                >
                  <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.restoreBackupButton}
                  onPress={() => restoreSpecificBackup(backup)}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.warning} />
                </TouchableOpacity>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              </View>
            ))
          ) : (
            <Text style={styles.noBackupsText}>Nessun backup recente</Text>
          )}
        </View>

        {/* Pulsanti Azione */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={createManualBackup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={theme.colors.onPrimary} />
            )}
            <Text style={styles.actionButtonText}>Crea e Salva Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={restoreFromBackup}
            disabled={isLoading}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.actionButtonText}>Ripristina da File</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ SEZIONE TEST BACKUP JAVASCRIPT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Test Sistema Backup</Text>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.success, marginBottom: 12 }]}
            onPress={async () => {
              try {
                setIsLoading(true);
                console.log('🧪 Test backup automatico JavaScript...');
                
                const result = await BackupService.testBackupSystem();
                
                Alert.alert(
                  result ? '✅ Test Riuscito' : '❌ Test Fallito',
                  result 
                    ? 'Il sistema backup JavaScript funziona correttamente!' 
                    : 'Si è verificato un errore durante il test del backup.',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('❌ Errore test backup:', error);
                Alert.alert('❌ Errore Test', `Errore: ${error.message}`, [{ text: 'OK' }]);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Ionicons name="flask-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Test Sistema Backup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.warning, marginBottom: 12 }]}
            onPress={async () => {
              try {
                setIsLoading(true);
                console.log('🔄 Test backup manuale tramite sistema ibrido...');
                
                const result = await BackupService.createManualBackup();
                
                Alert.alert(
                  result.success ? '✅ Backup Creato' : '❌ Backup Fallito',
                  result.success 
                    ? `Backup manuale creato con successo!${result.backupKey ? `\nChiave: ${result.backupKey}` : ''}` 
                    : `Errore durante la creazione del backup: ${result.error}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('❌ Errore backup manuale:', error);
                Alert.alert('❌ Errore', `Errore: ${error.message}`, [{ text: 'OK' }]);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Ionicons name="build-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Test Backup Manuale</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={async () => {
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

� Sistema JavaScript (Fallback):
• Disponibile: ✅ SÌ
• Tipo: ${systemStatus.javascript.systemType}
• Timer attivo: ${systemStatus.javascript.hasBackupTimer ? '✅ SÌ' : '❌ NO'}

💡 Raccomandazione:
${systemStatus.recommendation}

🔧 Debug Sistema ${stats.systemInfo?.type?.toUpperCase()}:
${stats.systemInfo?.description}
• Affidabile 24/7: ${stats.systemInfo?.isReliable ? '✅ SÌ' : '❌ NO'}
• Ha notifiche: ${stats.systemInfo?.hasNotifications ? '✅ SÌ' : '❌ NO'}`
                : 'Errore nel recupero delle statistiche';
                
                Alert.alert('📊 Statistiche Sistema Backup', message, [{ text: 'OK' }]);
              } catch (error) {
                console.error('❌ Errore statistiche:', error);
                Alert.alert('❌ Errore', 'Impossibile ottenere le statistiche', [{ text: 'OK' }]);
              }
            }}
          >
            <Ionicons name="stats-chart-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Mostra Statistiche</Text>
          </TouchableOpacity>
        </View>

        {/* Info aggiornata sistema ibrido */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            📦 I backup includono tutte le ore lavorate, impostazioni contratto e configurazioni.{'\n'}
            � Sistema IBRIDO: Backup nativo (app builds) + fallback JavaScript (Expo).{'\n'}
            🔔 Sistema nativo: Funziona anche con app chiusa tramite notifiche programmate.{'\n'}
            � Sistema JavaScript: Solo app aperta, con timer JavaScript e AsyncStorage.{'\n'}
            📍 Backup automatici nella cartella app, usa "Condividi" per cloud/cartelle esterne.
          </Text>
        </View>
      </ScrollView>
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
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.colors.cardElevation,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textSecondary,
  },
  selectButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  pathHelpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  autoBackupContainer: {
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 80,
    textAlign: 'center',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  lastBackupText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  backupDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  backupPath: {
    fontSize: 11,
    color: theme.colors.textDisabled,
    marginTop: 2,
  },
  noBackupsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  createButton: {
    backgroundColor: theme.colors.success,
  },
  restoreButton: {
    backgroundColor: theme.colors.warning,
  },
  actionButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  shareBackupButton: {
    padding: 8,
    marginRight: 8,
  },
  restoreBackupButton: {
    padding: 8,
    marginRight: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BackupScreen;
