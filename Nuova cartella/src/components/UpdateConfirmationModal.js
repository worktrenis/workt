import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ManualUpdateService from '../services/ManualUpdateService';

const { width } = Dimensions.get('window');

const UpdateConfirmationModal = ({ 
  visible, 
  updateInfo, 
  currentVersion,
  onConfirm, 
  onCancel,
  onUpdateComplete 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState('');

  useEffect(() => {
    if (!visible) {
      setIsUpdating(false);
      setUpdateProgress('');
    }
  }, [visible]);

  const handleConfirmUpdate = async () => {
    try {
      setIsUpdating(true);
      setUpdateProgress('Preparazione aggiornamento...');

      // Simula progress per UX migliore
      const progressSteps = [
        'Preparazione aggiornamento...',
        'Download in corso...',
        'Verifica integrità...',
        'Applicazione aggiornamento...',
        'Completamento...'
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        setUpdateProgress(progressSteps[i]);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Esegui l'aggiornamento effettivo
      const result = await ManualUpdateService.performUpdate(updateInfo, true);
      
      if (result.success) {
        setUpdateProgress('Aggiornamento completato! Riavvio...');
        
        // Notifica il completamento
        if (onUpdateComplete) {
          onUpdateComplete(result);
        }
        
        if (onConfirm) {
          onConfirm(result);
        }
      }
    } catch (error) {
      console.error('❌ Errore durante aggiornamento:', error);
      
      setIsUpdating(false);
      setUpdateProgress('');
      
      Alert.alert(
        '❌ Errore Aggiornamento',
        `Si è verificato un errore durante l'aggiornamento:\n\n${error.message}\n\nRiprova più tardi.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    if (isUpdating) {
      Alert.alert(
        'Aggiornamento in corso',
        'Non è possibile annullare l\'aggiornamento una volta iniziato.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!updateInfo) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="download" 
                size={32} 
                color="#4CAF50" 
              />
            </View>
            <Text style={styles.title}>
              {isUpdating ? 'Aggiornamento in corso...' : 'Aggiornamento Disponibile'}
            </Text>
            <Text style={styles.subtitle}>
              {isUpdating ? updateProgress : `WorkT v${updateInfo.versionName}`}
            </Text>
          </View>

          {/* Version Info */}
          {!isUpdating && (
            <>
              <View style={styles.versionInfo}>
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Versione attuale:</Text>
                  <Text style={styles.versionValue}>{currentVersion}</Text>
                </View>
                <MaterialCommunityIcons 
                  name="arrow-down" 
                  size={20} 
                  color="#666" 
                  style={styles.arrowIcon}
                />
                <View style={styles.versionRow}>
                  <Text style={styles.versionLabel}>Nuova versione:</Text>
                  <Text style={[styles.versionValue, styles.newVersion]}>
                    {updateInfo.versionName}
                  </Text>
                </View>
              </View>

              {/* Release Date */}
              {updateInfo.releaseDate && (
                <View style={styles.releaseInfo}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                  <Text style={styles.releaseDate}>
                    Rilasciato il {formatDate(updateInfo.releaseDate)}
                  </Text>
                </View>
              )}

              {/* Changelog */}
              {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                <View style={styles.changelogContainer}>
                  <Text style={styles.changelogTitle}>Novità in questa versione:</Text>
                  <ScrollView style={styles.changelogScroll} showsVerticalScrollIndicator={false}>
                    {updateInfo.changelog.map((change, index) => (
                      <View key={index} style={styles.changelogItem}>
                        <Text style={styles.changelogBullet}>•</Text>
                        <Text style={styles.changelogText}>{change}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Development Warning */}
              {updateInfo.simulatedInDev && (
                <View style={styles.devWarning}>
                  <MaterialCommunityIcons name="code-tags" size={16} color="#FF9800" />
                  <Text style={styles.devWarningText}>
                    Modalità sviluppo - Aggiornamento simulato
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Progress Indicator */}
          {isUpdating && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.progressText}>{updateProgress}</Text>
              <Text style={styles.progressNote}>
                L'app si riavvierà automaticamente al termine.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isUpdating}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                {isUpdating ? 'Attendere...' : 'No, più tardi'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton,
                isUpdating && styles.buttonDisabled
              ]}
              onPress={handleConfirmUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={16} color="white" />
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>
                    Sì, aggiorna ora
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: width * 0.9,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  versionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  versionLabel: {
    fontSize: 14,
    color: '#666',
  },
  versionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  newVersion: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  arrowIcon: {
    marginVertical: 8,
  },
  releaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  releaseDate: {
    fontSize: 14,
    color: '#666',
  },
  changelogContainer: {
    marginBottom: 16,
  },
  changelogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  changelogScroll: {
    maxHeight: 120,
  },
  changelogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  changelogBullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    marginTop: 2,
  },
  changelogText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },
  devWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  devWarningText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  progressNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
  },
  confirmButtonText: {
    color: 'white',
  },
});

export default UpdateConfirmationModal;
