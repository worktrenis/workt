import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utilizza il nuovo servizio notifiche migliorato
import NotificationService from '../services/EnhancedNotificationService';
import { useTheme } from '../contexts/ThemeContext';

const NotificationSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [standbyEnabled, setStandbyEnabled] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const { theme } = useTheme();
  
  // Carica impostazioni all'avvio
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Carica impostazioni dalle preferenze
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Verifica permessi
      const permissionsResult = await NotificationService.hasPermissions();
      setHasPermissions(permissionsResult);
      
      // Carica impostazioni
      const settings = await NotificationService.getSettings();
      
      // Imposta stati
      setNotificationsEnabled(settings.enabled !== false); // default a true
      setReminderEnabled(settings.timeEntryReminder !== false); // default a true
      setStandbyEnabled(settings.standbyReminder !== false); // default a true
      
      setLoading(false);
    } catch (error) {
      console.error('Errore caricamento impostazioni notifiche:', error);
      Alert.alert('Errore', 'Impossibile caricare le impostazioni delle notifiche');
      setLoading(false);
    }
  };
  
  // Salva impostazioni
  const saveSettings = async () => {
    try {
      const settings = {
        enabled: notificationsEnabled,
        timeEntryReminder: reminderEnabled,
        standbyReminder: standbyEnabled
      };
      
      await NotificationService.saveSettings(settings);
      
      // Aggiorna anche la programmazione delle notifiche
      if (notificationsEnabled) {
        // Riprogramma le notifiche in base alle nuove impostazioni
        await NotificationService.rescheduleOnForeground();
      } else {
        // Cancella tutte le notifiche
        await NotificationService.cancelAllNotifications();
      }
      
      Alert.alert('Successo', 'Impostazioni notifiche salvate');
    } catch (error) {
      console.error('Errore salvataggio impostazioni notifiche:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni delle notifiche');
    }
  };
  
  // ...existing code...
  
  // Pulisci tutte le notifiche
  const clearAllNotifications = async () => {
    try {
      setIsClearing(true);
      
      // Cancella tutte le notifiche programmate
      await NotificationService.cancelAllNotifications();
      
      // Pulisci la cronologia delle notifiche gestite
      await NotificationService.clearHandledNotifications();
      
      Alert.alert('Completato', 'Tutte le notifiche sono state cancellate');
      setIsClearing(false);
    } catch (error) {
      console.error('Errore pulizia notifiche:', error);
      Alert.alert('Errore', 'Impossibile cancellare le notifiche');
      setIsClearing(false);
    }
  };
  
  // Richiedi permessi notifiche
  const requestPermissions = async () => {
    try {
      const granted = await NotificationService.requestPermissions();
      setHasPermissions(granted);
      
      if (granted) {
        Alert.alert('Successo', 'Permessi per le notifiche concessi');
      } else {
        Alert.alert('Attenzione', 'Permessi per le notifiche negati. Le notifiche non funzioneranno.');
      }
    } catch (error) {
      console.error('Errore richiesta permessi:', error);
      Alert.alert('Errore', 'Impossibile richiedere i permessi per le notifiche');
    }
  };
  
  // Rendering delle impostazioni
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Caricamento impostazioni...
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: "#767577", true: theme.colors.primaryLight }}
                    thumbColor={notificationsEnabled ? theme.colors.primary : "#f4f3f4"}
                  />
                </View>
              </Card.Content>
            </Card>
            
            <Card style={[styles.card, { backgroundColor: theme.colors.card, opacity: notificationsEnabled ? 1 : 0.5 }]}>
              <Card.Title 
                title="Promemoria Inserimento Orari" 
                left={(props) => <Ionicons name="time" size={24} color={theme.colors.primary} />} 
                titleStyle={{ color: theme.colors.text }}
              />
              <Card.Content>
                <View style={styles.settingItem}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Promemoria orari di lavoro
                  </Text>
                  <Switch
                    value={reminderEnabled && notificationsEnabled}
            <Card style={[styles.card, { backgroundColor: theme.colors.card }]}> 
              <Card.Title 
                title="Strumenti Notifiche" 
                left={(props) => <Ionicons name="construct" size={24} color={theme.colors.primary} />} 
                titleStyle={{ color: theme.colors.text }}
              />
              <Card.Content>
                <Button 
                  mode="outlined" 
                  onPress={clearAllNotifications}
                  loading={isClearing}
                  disabled={isClearing}
                  style={[styles.button, { marginTop: 0 }]}
                  color={theme.colors.primary}
                >
                  Cancella Tutte le Notifiche
                </Button>
                {!hasPermissions && (
                  <Button 
                    mode="contained" 
                    onPress={requestPermissions}
                    style={[styles.button, { marginTop: 10, backgroundColor: theme.colors.error }]}
                  >
                    Richiedi Permessi Notifiche
                  </Button>
                )}
              </Card.Content>
            </Card>
                  Riceverai notifiche quando sei in reperibilità secondo il calendario configurato.
                </Text>
              </Card.Content>
            </Card>
            
            <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Card.Title 
                title="Strumenti Notifiche" 
                left={(props) => <Ionicons name="construct" size={24} color={theme.colors.primary} />} 
                titleStyle={{ color: theme.colors.text }}
              />
              <Card.Content>
                <Button 
                  mode="contained" 
                  onPress={testNotifications}
                  loading={isTesting}
                  disabled={isTesting}
                  style={styles.button}
                  color={theme.colors.primary}
                >
                  Testa Sistema Notifiche
                </Button>
                
                <Button 
                  mode="outlined" 
                  onPress={clearAllNotifications}
                  loading={isClearing}
                  disabled={isClearing}
                  style={[styles.button, { marginTop: 10 }]}
                  color={theme.colors.primary}
                >
                  Cancella Tutte le Notifiche
                </Button>
                
                {!hasPermissions && (
                  <Button 
                    mode="contained" 
                    onPress={requestPermissions}
                    style={[styles.button, { marginTop: 10, backgroundColor: theme.colors.error }]}
                  >
                    Richiedi Permessi Notifiche
                  </Button>
                )}
              </Card.Content>
            </Card>
            
            {testResult && (
              <Card style={[styles.card, { 
                backgroundColor: testResult.success ? '#e7f3e8' : '#f8e7e7',
                borderWidth: 1,
                borderColor: testResult.success ? '#c3e6cb' : '#f5c6cb'
              }]}>
                <Card.Title 
                  title="Risultato Test" 
                  left={(props) => <Ionicons 
                    name={testResult.success ? "checkmark-circle" : "alert-circle"} 
                    size={24} 
                    color={testResult.success ? 'green' : 'red'} 
                  />} 
                  titleStyle={{ color: testResult.success ? 'green' : 'red' }}
                />
                <Card.Content>
                  <Text style={styles.testResultText}>
                    {testResult.success 
                      ? 'Test completato con successo! Dovresti ricevere una notifica immediata e una ritardata.' 
                      : `Test fallito: ${testResult.error || 'Errore sconosciuto'}`}
                  </Text>
                  
                  {testResult.success && (
                    <Text style={styles.testInfoText}>
                      Sistema: {testResult.system || 'N/A'}{'\n'}
                      Permessi: {testResult.hasPermissions ? 'Concessi ✓' : 'Non concessi ⚠️'}{'\n'}
                      Ora: {new Date(testResult.time).toLocaleTimeString('it-IT')}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            )}
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                onPress={saveSettings}
                style={styles.saveButton}
                color={theme.colors.primary}
              >
                Salva Impostazioni
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 16,
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    marginVertical: 5,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  saveButton: {
    padding: 5,
  },
  testResultText: {
    fontSize: 14,
    marginBottom: 10,
  },
  testInfoText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default NotificationSettingsScreen;
