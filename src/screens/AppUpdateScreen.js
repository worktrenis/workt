import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ManualUpdateService from '../services/ManualUpdateService';
import UpdateNotificationService from '../services/UpdateNotificationService';
import UpdateConfirmationModal from '../components/UpdateConfirmationModal';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

const { width } = Dimensions.get('window');

const AppUpdateScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [currentVersion, setCurrentVersion] = useState('');
  const [nativeBuildVersion, setNativeBuildVersion] = useState('');
  const [runtimeVersion, setRuntimeVersion] = useState('');
  const [updateChannel, setUpdateChannel] = useState('');
  const [manualUpdateVersion, setManualUpdateVersion] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Versione app (config/nativa)
      const configVersion = Constants.expoConfig?.version;
      const nativeVersion = Application.nativeApplicationVersion;
      setCurrentVersion(configVersion || nativeVersion || '');
      setNativeBuildVersion(Application.nativeBuildVersion || '');
      setRuntimeVersion(Updates.runtimeVersion || '');
      setUpdateChannel(Updates.channel || Constants.expoConfig?.updates?.requestHeaders?.['expo-channel-name'] || '');

      // Versione del sistema di aggiornamento manuale (se usata)
      if (ManualUpdateService.syncVersionFromStorage) {
        await ManualUpdateService.syncVersionFromStorage();
      }
      setManualUpdateVersion(ManualUpdateService.getCurrentVersion());
      await loadPendingUpdates();
      await loadUpdateHistory();
    } catch (error) {
      console.error('❌ Errore caricamento dati iniziali:', error);
    }
  };

  const loadPendingUpdates = async () => {
    try {
      const updates = await ManualUpdateService.getPendingUpdates();
      setPendingUpdates(updates);
    } catch (error) {
      console.error('❌ Errore caricamento aggiornamenti pendenti:', error);
    }
  };

  const loadUpdateHistory = async () => {
    try {
      const history = await ManualUpdateService.getUpdateHistory();
      setUpdateHistory(history);
    } catch (error) {
      console.error('❌ Errore caricamento cronologia:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const result = await ManualUpdateService.checkForUpdatesManually();
      
      if (result.hasUpdate) {
        Alert.alert(
          '🚀 Aggiornamento Trovato!',
          `È disponibile la versione ${result.updateInfo.versionName}. Riceverai una notifica per procedere con l'aggiornamento.`,
          [{ text: 'OK' }]
        );
        
        // Ricarica gli aggiornamenti pendenti
        await loadPendingUpdates();
      } else if (result.reason === 'no_update_available') {
        Alert.alert(
          'ℹ️ Nessun Aggiornamento',
          'La tua app è già aggiornata all\'ultima versione disponibile.',
          [{ text: 'OK' }]
        );
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert(
        '❌ Errore Controllo',
        `Impossibile controllare gli aggiornamenti:\n\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdatePress = (updateInfo) => {
    setSelectedUpdate(updateInfo);
    setShowUpdateModal(true);
  };

  const handleUpdateConfirm = async (result) => {
    setShowUpdateModal(false);
    setSelectedUpdate(null);
    
    if (result.success) {
      // Se è una simulazione in dev, ricarica i dati
      if (result.action === 'simulated_update') {
        Alert.alert(
          '✅ Aggiornamento Simulato',
          `App aggiornata alla versione ${result.newVersion}!`,
          [{ text: 'OK' }]
        );
        
        setManualUpdateVersion(result.newVersion);
        await loadPendingUpdates();
        await loadUpdateHistory();
      }
      // Se è un vero aggiornamento, l'app si riavvierà automaticamente
    }
  };

  const handleUpdateCancel = () => {
    setShowUpdateModal(false);
    setSelectedUpdate(null);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('❌ Errore refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const clearAllNotifications = async () => {
    try {
      await UpdateNotificationService.clearAllUpdateNotifications();
      setPendingUpdates([]);
      Alert.alert(
        '🧹 Notifiche Pulite',
        'Tutte le notifiche di aggiornamento sono state rimosse.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        '❌ Errore',
        'Impossibile pulire le notifiche.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'failed':
        return { name: 'alert-circle', color: '#F44336' };
      case 'cancelled':
        return { name: 'cancel', color: '#FF9800' };
      default:
        return { name: 'information', color: '#2196F3' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Aggiornamenti App
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Version Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Versione Attuale
            </Text>
          </View>
          <View style={styles.versionInfo}>
            <Text style={[styles.versionNumber, { color: theme.colors.text }]}>
              v{currentVersion}
            </Text>
            <Text style={[styles.versionLabel, { color: theme.colors.textSecondary }]}>
              Versione installata
            </Text>
            {(nativeBuildVersion || runtimeVersion || updateChannel) ? (
              <Text style={[styles.versionLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                {nativeBuildVersion ? `Build ${nativeBuildVersion}` : ''}
                {(nativeBuildVersion && (runtimeVersion || updateChannel)) ? ' • ' : ''}
                {runtimeVersion ? `Runtime ${runtimeVersion}` : ''}
                {(runtimeVersion && updateChannel) ? ' • ' : ''}
                {updateChannel ? `Canale ${updateChannel}` : ''}
              </Text>
            ) : null}

            {manualUpdateVersion && manualUpdateVersion !== currentVersion ? (
              <Text style={[styles.versionLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                Sistema aggiornamenti: v{manualUpdateVersion}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Check for Updates */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCheckForUpdates}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color="white" />
            )}
            <Text style={styles.checkButtonText}>
              {isChecking ? 'Controllo in corso...' : 'Controlla Aggiornamenti'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Updates */}
        {pendingUpdates.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="download" size={24} color="#4CAF50" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Aggiornamenti Disponibili
              </Text>
              <TouchableOpacity onPress={clearAllNotifications}>
                <Text style={[styles.clearText, { color: theme.colors.primary }]}>
                  Pulisci
                </Text>
              </TouchableOpacity>
            </View>
            
            {pendingUpdates.map((update, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.updateItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => handleUpdatePress(update)}
              >
                <View style={styles.updateIcon}>
                  <MaterialCommunityIcons name="download" size={20} color="#4CAF50" />
                </View>
                <View style={styles.updateContent}>
                  <Text style={[styles.updateVersion, { color: theme.colors.text }]}>
                    WorkT v{update.versionName}
                  </Text>
                  <Text style={[styles.updateDate, { color: theme.colors.textSecondary }]}>
                    {update.releaseDate && formatDate(update.releaseDate)}
                  </Text>
                  {update.simulatedInDev && (
                    <Text style={styles.devBadge}>DEV MODE</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Update History */}
        {updateHistory.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={24} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Cronologia Aggiornamenti
              </Text>
            </View>
            
            {updateHistory.slice(0, 10).map((entry, index) => {
              const statusIcon = getStatusIcon(entry.status);
              return (
                <View
                  key={entry.id || index}
                  style={[styles.historyItem, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: statusIcon.color + '20' }]}>
                    <MaterialCommunityIcons 
                      name={statusIcon.name} 
                      size={16} 
                      color={statusIcon.color} 
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyVersion, { color: theme.colors.text }]}>
                      v{entry.versionName}
                    </Text>
                    <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                      {formatDate(entry.timestamp)}
                    </Text>
                    {entry.errorMessage && (
                      <Text style={styles.historyError}>
                        {entry.errorMessage}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.historyStatus, { color: statusIcon.color }]}>
                    {entry.status === 'completed' ? 'Completato' : 
                     entry.status === 'failed' ? 'Fallito' : 'Annullato'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {pendingUpdates.length === 0 && updateHistory.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle" size={64} color={theme.colors.primary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              App Aggiornata
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              La tua app è aggiornata all'ultima versione disponibile.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Update Confirmation Modal */}
      <UpdateConfirmationModal
        visible={showUpdateModal}
        updateInfo={selectedUpdate}
        currentVersion={currentVersion}
        onConfirm={handleUpdateConfirm}
        onCancel={handleUpdateCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensa il back button
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  versionInfo: {
    alignItems: 'center',
  },
  versionNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 14,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
  },
  updateVersion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  updateDate: {
    fontSize: 12,
  },
  devBadge: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyVersion: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
  historyError: {
    fontSize: 11,
    color: '#F44336',
    marginTop: 2,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AppUpdateScreen;
