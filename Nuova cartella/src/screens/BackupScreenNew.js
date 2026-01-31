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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';

const BackupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [backupDestination, setBackupDestination] = useState('asyncstorage');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  useEffect(() => {
    loadBackupSettings();
    loadAvailableDestinations();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const settings = await BackupService.getBackupSettings();
      setAutoBackupEnabled(settings.enabled);
      setAutoBackupTime(settings.time);
      setBackupDestination(settings.destination || 'asyncstorage');
      console.log('✅ Impostazioni backup caricate:', settings);
    } catch (error) {
      console.error('Errore caricamento impostazioni backup:', error);
    }
  };

  const loadAvailableDestinations = async () => {
    try {
      const destinations = BackupService.getAvailableDestinations();
      setAvailableDestinations(destinations);
      console.log('📁 Destinazioni backup disponibili:', destinations);
    } catch (error) {
      console.error('Errore caricamento destinazioni backup:', error);
    }
  };

  const saveBackupSettings = async () => {
    try {
      setIsLoading(true);
      const success = await BackupService.updateAllBackupSettings(
        autoBackupEnabled, 
        autoBackupTime, 
        backupDestination
      );
      
      if (success) {
        Alert.alert('Successo', 'Impostazioni backup salvate correttamente');
        const systemStatus = BackupService.getSystemStatus();
        console.log('📱 Sistema backup attivo:', systemStatus.current);
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

  const createManualBackup = async () => {
    try {
      setIsLoading(true);
      const result = await BackupService.createManualBackup();
      
      Alert.alert(
        result.success ? '✅ Backup Creato' : '❌ Backup Fallito',
        result.success 
          ? `Backup manuale creato con successo!${result.backupKey ? `\\nChiave: ${result.backupKey}` : ''}` 
          : `Errore durante la creazione del backup: ${result.error}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Errore backup manuale:', error);
      Alert.alert('❌ Errore', `Errore: ${error.message}`, [{ text: 'OK' }]);
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
        {/* Sezione Backup Automatico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Backup Automatico</Text>
          
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
        </View>

        {/* Bottone Salva Impostazioni */}
        <TouchableOpacity style={styles.saveButton} onPress={saveBackupSettings} disabled={isLoading}>
          <Ionicons name="save-outline" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>

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
            style={[styles.button, { backgroundColor: theme.colors.secondary }]}
            onPress={showBackupStats}
            disabled={isLoading}
          >
            <Ionicons name="stats-chart-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Mostra Statistiche</Text>
          </TouchableOpacity>
        </View>

        {/* Info Sistema */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            📦 I backup includono tutte le ore lavorate e configurazioni.{'\n'}
            🚀 Sistema IBRIDO: Backup nativo (app builds) + fallback JavaScript (Expo).{'\n'}
            🔔 Sistema nativo: Funziona anche con app chiusa tramite notifiche.{'\n'}
            📁 Scegli dove salvare i backup automatici dalla destinazione sopra.
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
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.primaryLight || theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
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
});

export default BackupScreen;
