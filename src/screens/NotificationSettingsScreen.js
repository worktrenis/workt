import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import TimeInput from '../components/TimeInput';
import { useTheme } from '../contexts/ThemeContext';
const NotificationService = require('../services/SuperNotificationService');

const NotificationSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [settings, setSettings] = useState({
    enabled: false,
    morningTime: '07:30',
    eveningTime: '18:30',
    weekendsEnabled: false,
    workReminder: { enabled: false, morningTime: '07:30', weekendsEnabled: false },
    timeEntryReminder: { enabled: false, time: '18:30', weekendsEnabled: false },
    standbyReminder: { enabled: false, notifications: [] },
    backupReminder: { enabled: false, time: '02:00', frequency: 'weekly' }
  });
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerField, setTimePickerField] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Funzione per pulire dati corrotti delle notifiche
  const cleanCorruptedNotificationData = async () => {
    try {
      const notificationData = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
      if (notificationData) {
        const parsed = JSON.parse(notificationData);
        let needsUpdate = false;
        
        // Pulisce i dati di standby
        if (parsed.standbyReminder || parsed.standbyReminders) {
          const standbyData = parsed.standbyReminder || parsed.standbyReminders;
          
          if (standbyData.notifications && Array.isArray(standbyData.notifications)) {
            standbyData.notifications = standbyData.notifications.map(notif => {
              let cleanedNotif = { ...notif };
              
              // Correggi il typo messsage -> message
              if (cleanedNotif.messsage && !cleanedNotif.message) {
                cleanedNotif.message = cleanedNotif.messsage;
                delete cleanedNotif.messsage;
                needsUpdate = true;
                console.log('✅ Corretto typo "messsage" -> "message"');
              }
              
              // Assicurati che il tempo sia una stringa valida
              if (!cleanedNotif.time || typeof cleanedNotif.time !== 'string') {
                cleanedNotif.time = '08:00';
                needsUpdate = true;
                console.log('✅ Corretto tempo non valido -> "08:00"');
              }
              
              // Assicurati che enabled sia boolean
              if (typeof cleanedNotif.enabled !== 'boolean') {
                cleanedNotif.enabled = true;
                needsUpdate = true;
              }
              
              // Assicurati che daysInAdvance sia numero
              if (typeof cleanedNotif.daysInAdvance !== 'number') {
                cleanedNotif.daysInAdvance = 0;
                needsUpdate = true;
              }
              
              return cleanedNotif;
            });
            
            // Aggiorna i dati puliti
            if (parsed.standbyReminder) {
              parsed.standbyReminder.notifications = standbyData.notifications;
            }
            if (parsed.standbyReminders) {
              parsed.standbyReminders.notifications = standbyData.notifications;
            }
          }
        }
        
        if (needsUpdate) {
          await AsyncStorage.setItem('NOTIFICATION_SETTINGS', JSON.stringify(parsed));
          console.log('✅ Dati delle notifiche puliti e salvati');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Errore nella pulizia dati notifiche:', error);
      return false;
    }
  };

  // Carica le impostazioni al mount
  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
    
    // Setup listener per le notifiche - DISATTIVATO per evitare programmazione automatica
    // NotificationService.setupNotificationListener();
  }, []);

  const checkNotificationPermissions = async () => {
    try {
      const permission = await NotificationService.hasPermissions();
      setHasPermission(permission);
    } catch (error) {
      console.error('❌ Errore verifica permessi notifiche:', error);
      setHasPermission(false);
    }
  };

  const requestNotificationPermissions = async () => {
    const granted = await NotificationService.requestPermissions();
    setHasPermission(granted);
    
    if (!granted) {
      Alert.alert(
        'Permessi necessari',
        'Per ricevere notifiche, abilita i permessi nelle impostazioni del dispositivo.',
        [{ text: 'OK' }]
      );
    }
    
    return granted;
  };

  const loadSettings = async () => {
    try {
      // Prima pulisci eventuali dati corrotti
      await cleanCorruptedNotificationData();
      
      console.log('🔍 DEBUG - Iniziando caricamento impostazioni notifiche...');
      const loadedSettings = await NotificationService.getSettings();
      console.log('🔍 DEBUG - Impostazioni caricate dal servizio:', JSON.stringify(loadedSettings, null, 2));
      
      // Verifica che loadedSettings sia un oggetto valido
      if (!loadedSettings || typeof loadedSettings !== 'object') {
        console.error('❌ Impostazioni caricate non valide');
        // Usa le impostazioni predefinite
        setSettings(NotificationService.getDefaultSettings());
      } else {
        // Converti le impostazioni dal formato servizio (singolare) a normalizedSettings (plurale)
        const normalizedSettings = {
          ...loadedSettings,
          // Normalizzazione da singolare a plurale per la UI
          workReminders: loadedSettings.workReminder || loadedSettings.workReminders || { enabled: false, morningTime: '07:30', weekendsEnabled: false },
          timeEntryReminders: loadedSettings.timeEntryReminder || loadedSettings.timeEntryReminders || { enabled: false, time: '18:30', weekendsEnabled: false },
          standbyReminders: loadedSettings.standbyReminder || loadedSettings.standbyReminders || { enabled: false, notifications: [] },
          dailySummary: loadedSettings.dailySummary || { enabled: false, time: '21:00' },
          overtimeAlerts: loadedSettings.overtimeAlerts || { enabled: false }
        };
        
        console.log('🔍 DEBUG - standbyReminders prima dell\'inizializzazione:', JSON.stringify(normalizedSettings.standbyReminders, null, 2));
        
        // CORREZIONE FORMATO: gestisce sia il formato stringa che array
        if (normalizedSettings.standbyReminders) {
          // Se notifications è una stringa, convertila in array
          if (typeof normalizedSettings.standbyReminders.notifications === 'string') {
            console.log('🔧 CONVERSIONE: trovato formato stringa, converto in array');
            const timeString = normalizedSettings.standbyReminders.notifications;
            normalizedSettings.standbyReminders.notifications = [
              {
                daysInAdvance: 0,
                enabled: true,
                time: timeString,
                message: 'Turno di reperibilità oggi'
              },
              {
                daysInAdvance: 1,
                enabled: true,
                time: '20:00',
                message: 'Turno di reperibilità domani'
              }
            ];
            console.log('✅ Conversione completata:', JSON.stringify(normalizedSettings.standbyReminders.notifications, null, 2));
          }
        }
        
        // Assicurati che i promemoria di reperibilità abbiano le notifiche di default se vuoti
        if (!normalizedSettings.standbyReminders.notifications || normalizedSettings.standbyReminders.notifications.length === 0) {
          console.log('🔧 Inizializzo promemoria reperibilità di default');
          normalizedSettings.standbyReminders.notifications = [
            {
              daysInAdvance: 0,
              enabled: true,
              time: '07:30',
              message: 'Turno di reperibilità oggi'
            },
            {
              daysInAdvance: 1,
              enabled: true,
              time: '20:00',
              message: 'Turno di reperibilità domani'
            }
          ];
          
          // Salva immediatamente i promemoria inizializzati
          try {
            await AsyncStorage.setItem('standbyReminder', JSON.stringify(normalizedSettings.standbyReminders));
            console.log('✅ Promemoria reperibilità salvati in AsyncStorage');
          } catch (error) {
            console.error('❌ Errore nel salvataggio promemoria:', error);
          }
        }
        
        console.log('🔍 Promemoria reperibilità caricati:', JSON.stringify(normalizedSettings.standbyReminders, null, 2));
        console.log('🔍 DEBUG - normalizedSettings finali:', JSON.stringify(normalizedSettings, null, 2));
        
        // Usa le impostazioni normalizzate
        // Imposta anche il flag di reprogramOnOpen se presente
        normalizedSettings.reprogramOnOpen = typeof loadedSettings.reprogramOnOpen === 'boolean' ? loadedSettings.reprogramOnOpen : true;
        setSettings(normalizedSettings);
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento impostazioni notifiche:', error);
      // In caso di errore, usa le impostazioni predefinite
      setSettings(NotificationService.getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      // Converti le impostazioni da normalizedSettings (plurale) a formato servizio (singolare)
      const serviceSettings = {
        ...newSettings,
        // Normalizzazione da plurale a singolare per il servizio
        workReminder: newSettings.workReminders,
        timeEntryReminder: newSettings.timeEntryReminders,
        standbyReminder: newSettings.standbyReminders
      };
      
      // Rimuovi le chiavi duplicate (plurali) per non confondere il servizio
      delete serviceSettings.workReminders;
      delete serviceSettings.timeEntryReminders;
      delete serviceSettings.standbyReminders;
      
      const success = await NotificationService.saveSettings(serviceSettings);
      if (success) {
        setSettings(newSettings);
        // Salva anche il flag reprogramOnOpen nel servizio
        try {
          const svc = { ...serviceSettings, reprogramOnOpen: !!newSettings.reprogramOnOpen };
          await NotificationService.saveSettings(svc);
        } catch (err) {
          console.warn('⚠️ Impossibile salvare reprogramOnOpen:', err.message);
        }
        
        // Riprogramma automaticamente le notifiche con le nuove impostazioni
        await NotificationService.scheduleNotifications(serviceSettings, true);
        console.log('✅ Impostazioni salvate e notifiche riprogrammate');
        
        Alert.alert('Successo', 'Impostazioni salvate e notifiche riprogrammate automaticamente.');
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
      }
    } catch (error) {
      console.error('❌ Errore nel salvataggio impostazioni notifiche:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
    }
  };

  const handleMainToggle = async (value) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
    }
    setSettings({ ...settings, enabled: value });
  };

  const handleSectionToggle = (section, value) => {
    // Verifica che la sezione esista prima di aggiornarla
    if (!settings || !settings[section]) {
      console.error(`❌ Sezione ${section} non trovata nelle impostazioni`);
      // Inizializza la sezione se non esiste
      const newSettings = { ...settings };
      newSettings[section] = { enabled: value };
      setSettings(newSettings);
      return;
    }
    const newSettings = {
      ...settings,
      [section]: { ...settings[section], enabled: value }
    };
    setSettings(newSettings);
  };

  const handleTimeChange = (section, field, time) => {
    console.log('🔍 DEBUG handleTimeChange chiamata:', { section, field, time });
    const toTimeString = (t) => {
      if (!t) return null;
      if (typeof t === 'string') {
        // Accetta HH:mm
        const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        return m ? t : null;
      }
      // DateTimePicker passa un Date
      if (t instanceof Date) {
        const hh = t.getHours().toString().padStart(2, '0');
        const mm = t.getMinutes().toString().padStart(2, '0');
        return `${hh}:${mm}`;
      }
      // Fallback: oggetto con getHours/getMinutes
      if (typeof t.getHours === 'function' && typeof t.getMinutes === 'function') {
        const hh = t.getHours().toString().padStart(2, '0');
        const mm = t.getMinutes().toString().padStart(2, '0');
        return `${hh}:${mm}`;
      }
      return null;
    };

    const timeString = toTimeString(time);
    if (!timeString) {
      console.warn('⚠️ Orario non valido in handleTimeChange:', time);
      return;
    }
    console.log('🔍 DEBUG timeString generata:', timeString);
    
    let newSettings = { ...settings };
    console.log('🔍 DEBUG newSettings prima:', newSettings);
    
    // Verifica che la sezione esista
    if (!newSettings[section]) {
      console.warn(`⚠️ Sezione ${section} non trovata, inizializzazione...`);
      newSettings[section] = {};
    }
    
    // Gestione speciale per notifiche di reperibilità
    if (section === 'standbyReminders' && field.startsWith('notifications.')) {
      console.log('🔍 DEBUG - Gestione notifiche reperibilità');
      const notificationIndex = parseInt(field.split('.')[1]);
      console.log('🔍 DEBUG notificationIndex:', notificationIndex);
      
      // Verifica che notifications esista
      if (!newSettings.standbyReminders.notifications) {
        console.log('🔍 DEBUG - Inizializzazione array notifications');
        newSettings.standbyReminders.notifications = [];
      }
      
      // Verifica che l'elemento all'indice esista
      if (!newSettings.standbyReminders.notifications[notificationIndex]) {
        console.log('🔍 DEBUG - Inizializzazione notification elemento', notificationIndex);
        newSettings.standbyReminders.notifications[notificationIndex] = {};
      }
      
      newSettings.standbyReminders.notifications[notificationIndex].time = timeString;
      console.log('🔍 DEBUG - Nuovo valore impostato:', newSettings.standbyReminders.notifications[notificationIndex]);
    } else {
      console.log('🔍 DEBUG - Gestione normale');
      // Gestione normale
      newSettings[section] = { ...newSettings[section], [field]: timeString };
    }
    
    console.log('🔍 DEBUG newSettings dopo:', newSettings);
    setSettings(newSettings);
    setShowTimePicker(false);
    console.log('🔍 DEBUG handleTimeChange completata');
  };

  const openTimePicker = (section, field) => {
    setTimePickerField(`${section}.${field}`);
    setShowTimePicker(true);
  };

  const openStandbyTimePicker = (notificationIndex) => {
    // Per gestire correttamente l'aggiornamento, usiamo lo stesso pattern delle altre funzioni
    setTimePickerField(`standbyReminders.notifications.${notificationIndex}`);
    setShowTimePicker(true);
  };

  const getCurrentTime = () => {
    console.log(`🔍 DEBUG getCurrentTime chiamata per campo: ${timePickerField}`);
    if (!timePickerField) return new Date();
    
    // Split per campi con più livelli come standbyReminders.notifications.0
    const parts = timePickerField.split('.');
    const section = parts[0];
    const field = parts.slice(1).join('.');
    let timeString = '00:00'; // Default
    
    console.log(`🔍 DEBUG split - section: "${section}", field: "${field}"`);

    try {
      // Verifica che la sezione esista
      if (!settings || !settings[section]) {
        console.warn(`⚠️ Sezione ${section} non trovata in getCurrentTime`);
        return new Date();
      }
      
      if (section === 'standbyReminders' && field.startsWith('notifications.')) {
        // Caso speciale per standbyReminders.notifications.X
        const notificationIndex = parseInt(field.split('.')[1]);
        console.log(`🔍 DEBUG - field: "${field}", notificationIndex: ${notificationIndex}`);
        
        if (settings.standbyReminders.notifications && 
            settings.standbyReminders.notifications[notificationIndex] &&
            settings.standbyReminders.notifications[notificationIndex].time) {
          timeString = settings.standbyReminders.notifications[notificationIndex].time;
          console.log(`🔍 DEBUG - timeString from notification[${notificationIndex}]: ${timeString}`);
        }
      } else {
        // Caso normale section.field
        if (settings[section] && settings[section][field]) {
          timeString = settings[section][field];
          console.log(`🔍 DEBUG getCurrentTime - section: ${section}, field: ${field}, timeString:`, timeString);
        }
      }
      
      // Assicurati che il formato sia corretto
      if (Array.isArray(timeString)) {
        console.warn(`⚠️ Formato orario non valido: ricevuto array invece di stringa per ${timePickerField}:`, timeString);
        timeString = '08:00';
      } else if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) {
        console.warn(`⚠️ Formato orario non valido:`, timeString);
        timeString = '08:00';
      }
      
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      
      return date;
    } catch (error) {
      console.error('❌ Errore in getCurrentTime:', error);
      return new Date(); // Valore predefinito in caso di errore
    }
  };

  const getCurrentTimeString = () => {
    const date = getCurrentTime();
    if (!date || !(date instanceof Date)) return '08:00';
    const hh = date.getHours();
    const mm = date.getMinutes();
    const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad2(hh)}:${pad2(mm)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={theme.dark ? "light" : "dark"} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="bell-outline" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Normalizza i nomi delle proprietà (singolare/plurale) e assicura che tutte le proprietà necessarie esistano
  const normalizedSettings = { ...settings };
  
  // Assicurati che workReminder/workReminders esista e sia normalizzato
  if (!normalizedSettings.workReminders && normalizedSettings.workReminder) {
    normalizedSettings.workReminders = { ...normalizedSettings.workReminder };
  } else if (!normalizedSettings.workReminders) {
    normalizedSettings.workReminders = { 
      enabled: false, 
      morningTime: '07:30',
      weekendsEnabled: false 
    };
  }
  
  // Assicurati che timeEntryReminder/timeEntryReminders esista e sia normalizzato
  if (!normalizedSettings.timeEntryReminders && normalizedSettings.timeEntryReminder) {
    normalizedSettings.timeEntryReminders = { ...normalizedSettings.timeEntryReminder };
  } else if (!normalizedSettings.timeEntryReminders) {
    normalizedSettings.timeEntryReminders = { 
      enabled: false, 
      time: '18:30',
      weekendsEnabled: false 
    };
  }
  
  // Assicurati che standbyReminder/standbyReminders esista e sia normalizzato
  if (!normalizedSettings.standbyReminders && normalizedSettings.standbyReminder) {
    normalizedSettings.standbyReminders = { ...normalizedSettings.standbyReminder };
  } else if (!normalizedSettings.standbyReminders) {
    normalizedSettings.standbyReminders = { 
      enabled: false,
      notifications: []
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header principale */}
        <View style={styles.headerCard}>
          <MaterialCommunityIcons name="bell-ring" size={32} color="#2196F3" />
          <Text style={styles.headerTitle}>Notifiche</Text>
          <Text style={styles.headerSubtitle}>
            Configura promemoria e avvisi per non dimenticare mai di registrare i tuoi orari di lavoro
          </Text>
        </View>

        {/* Toggle riprogrammazione all'apertura */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="sync" size={24} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Riprogramma all'apertura</Text>
            <Switch
              value={!!normalizedSettings.reprogramOnOpen}
              onValueChange={(value) => setSettings({ ...settings, reprogramOnOpen: value })}
              trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
              thumbColor={normalizedSettings.reprogramOnOpen ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionSubtitle}>Quando attivo, l'app riprogramma automaticamente le notifiche ogni volta che viene aperta.</Text>
          </View>
        </View>

        {/* Interruttore principale */}
        <View style={styles.sectionCard}>
          <View style={styles.mainToggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.mainToggleTitle}>Abilita Notifiche</Text>
              <Text style={styles.mainToggleSubtitle}>
                {hasPermission ? 'Permessi concessi' : 'Permessi necessari'}
              </Text>
            </View>
            <Switch
              value={normalizedSettings.enabled}
              onValueChange={handleMainToggle}
              trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
              thumbColor={normalizedSettings.enabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          
          {!hasPermission && (
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestNotificationPermissions}
            >
              <MaterialCommunityIcons name="shield-check" size={20} color="#2196F3" />
              <Text style={styles.permissionButtonText}>Richiedi Permessi</Text>
            </TouchableOpacity>
          )}
        </View>

        {normalizedSettings.enabled && (
          <>
            {/* Promemoria inizio lavoro */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alarm" size={24} color="#FF9800" />
                <Text style={styles.sectionTitle}>Promemoria Inizio Lavoro</Text>
                <Switch
                  value={normalizedSettings.workReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('workReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={normalizedSettings.workReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.workReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('workReminders', 'morningTime')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{normalizedSettings.workReminders.morningTime}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={normalizedSettings.workReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...normalizedSettings,
                          workReminders: { ...normalizedSettings.workReminders, weekendsEnabled: value }
                        };
                        setSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={normalizedSettings.workReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Promemoria inserimento orari */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clock-edit" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Promemoria Inserimento</Text>
                <Switch
                  value={normalizedSettings.timeEntryReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('timeEntryReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={normalizedSettings.timeEntryReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.timeEntryReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('timeEntryReminders', 'time')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{normalizedSettings.timeEntryReminders.time}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={normalizedSettings.timeEntryReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...normalizedSettings,
                          timeEntryReminders: { ...normalizedSettings.timeEntryReminders, weekendsEnabled: value }
                        };
                        setSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={normalizedSettings.timeEntryReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Promemoria reperibilità - sempre visibile */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="phone-alert" size={24} color="#9C27B0" />
                <Text style={styles.sectionTitle}>Promemoria Reperibilità</Text>
                <Switch
                  value={normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('standbyReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={(normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled) ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.optionDescription}>
                  Ricevi promemoria basati sul calendario di reperibilità
                </Text>
                {/* Se abilitato, mostra notifiche configurabili o pulsante per aggiungerle */}
                {normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled && (
                  <>
                    {(!normalizedSettings.standbyReminders.notifications || normalizedSettings.standbyReminders.notifications.length === 0) ? (
                      <TouchableOpacity
                        style={[
                          {
                            backgroundColor: theme.colors.surface,
                            borderRadius: 10,
                            paddingVertical: 12,
                            alignItems: 'center',
                            marginBottom: 12,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            borderWidth: 1.5,
                            borderColor: theme.colors.primary,
                            shadowColor: theme.dark ? '#000' : theme.colors.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 4,
                            elevation: 2
                          }
                        ]}
                        onPress={() => {
                          // Aggiungi "Giorno stesso" e "Il giorno prima" se non esistono
                          const defaultNotifications = [
                            {
                              daysInAdvance: 0,
                              enabled: true,
                              time: '07:30',
                              message: 'Turno di reperibilità oggi',
                            },
                            {
                              daysInAdvance: 1,
                              enabled: true,
                              time: '20:00',
                              message: 'Turno di reperibilità domani',
                            }
                          ];
                          const newSettings = { ...normalizedSettings };
                          newSettings.standbyReminders = {
                            ...newSettings.standbyReminders,
                            notifications: defaultNotifications
                          };
                          setSettings(newSettings);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="plus-circle"
                          size={22}
                          color={theme.dark ? theme.colors.accent || '#BB86FC' : theme.colors.primary}
                          style={{marginRight: 8}}
                        />
                        <Text
                          style={{
                            color: theme.dark ? (theme.colors.accentText || '#fff') : theme.colors.primary,
                            fontWeight: 'bold',
                            fontSize: 16
                          }}
                        >
                          Aggiungi promemoria "Giorno stesso" e "Giorno prima"
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      Array.isArray(normalizedSettings.standbyReminders.notifications) ? 
                      normalizedSettings.standbyReminders.notifications.map((notification, index) => (
                        <View key={index} style={styles.standbyNotificationItem}>
                          <View style={styles.standbyNotificationHeader}>
                            <Text style={styles.standbyNotificationTitle}>
                              {notification.daysInAdvance === 0 ? 'Giorno stesso' :
                               notification.daysInAdvance === 1 ? 'Il giorno prima' :
                               `${notification.daysInAdvance} giorni prima`}
                            </Text>
                            <Switch
                              value={notification.enabled}
                              onValueChange={(value) => {
                                const newSettings = { ...normalizedSettings };
                                if (!newSettings.standbyReminders.notifications) {
                                  newSettings.standbyReminders.notifications = [];
                                }
                                if (!newSettings.standbyReminders.notifications[index]) {
                                  newSettings.standbyReminders.notifications[index] = {};
                                }
                                newSettings.standbyReminders.notifications[index].enabled = value;
                                setSettings(newSettings);
                              }}
                              trackColor={{ false: '#E0E0E0', true: '#E1BEE7' }}
                              thumbColor={notification.enabled ? '#9C27B0' : '#f4f3f4'}
                              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                          </View>
                          {notification.enabled && (
                            <View style={styles.standbyNotificationContent}>
                              <TouchableOpacity 
                                style={styles.timeSelector}
                                onPress={() => openStandbyTimePicker(index)}
                              >
                                <Text style={styles.timeSelectorLabel}>Orario</Text>
                                <Text style={styles.timeSelectorValue}>{notification.time}</Text>
                              </TouchableOpacity>
                              <Text style={styles.standbyNotificationMessage}>
                                "{notification.message}"
                              </Text>
                            </View>
                          )}
                        </View>
                      )) : (
                        <Text style={styles.optionDescription}>
                          Nessun promemoria configurato
                        </Text>
                      )
                    )}
                  </>
                )}
              </View>
            </View>
          </>
        )}

        {/* Info e suggerimenti */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color={theme.dark ? theme.colors.text : '#2196F3'} />
          <Text style={styles.infoTitle}>Suggerimenti</Text>
          <Text style={styles.infoText}>
            • Le notifiche ti aiutano a mantenere la costanza nell'inserimento degli orari{'\n'}
            • Puoi disabilitare specifici tipi di promemoria{'\n'}
            • I promemoria weekend sono opzionali{'\n'}
            • Le notifiche rispettano le impostazioni del sistema{'\n'}
            • Le notifiche vengono programmate automaticamente quando salvi le impostazioni
          </Text>
        </View>
      </ScrollView>

      {/* Pulsante Salva Impostazioni */}
      {normalizedSettings.enabled && (
        <View style={{padding: 16, backgroundColor: 'transparent'}}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.dark ? '#0A84FF' : '#2196F3',
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 8,
              shadowColor: theme.dark ? '#000' : '#2196F3',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme.dark ? 0.3 : 0.2,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => saveSettings(settings)}
          >
            <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16, marginTop: 4}}>Salva Impostazioni</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Time Input replaces circular picker for numeric entry */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ marginBottom: 8, color: theme.colors.text, fontWeight: '600' }}>
                  Inserisci orario (HH:mm)
                </Text>
                <TimeInput
                  value={getCurrentTimeString()}
                  onChange={(t) => {
                    // t is string like '07:30' or partial
                    if (t && t.length === 5) {
                      const parts = timePickerField.split('.');
                      const section = parts[0];
                      const field = parts.slice(1).join('.');
                      handleTimeChange(section, field, t);
                      setShowTimePicker(false);
                    }
                  }}
                  inputStyle={{
                    backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : '#fff',
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    fontSize: 18,
                    paddingVertical: 12,
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Chiudi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.dark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: theme.dark ? '#1C1C1E' : theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: theme.dark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.3 : 0.1,
    shadowRadius: 4,
  },
  mainToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mainToggleSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark ? 'rgba(0, 122, 255, 0.2)' : '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.dark ? '#0A84FF' : '#007AFF',
  },
  permissionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.dark ? '#0A84FF' : '#007AFF',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 12,
  },
  sectionContent: {
    paddingLeft: 36,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255, 255, 255, 0.2)' : '#E0E0E0',
  },
  timeSelectorLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.dark ? '#0A84FF' : '#007AFF',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: theme.dark ? theme.colors.surface : '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: theme.dark ? theme.colors.border : '#C8E6C9',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.dark ? theme.colors.text : '#2E7D32',
    marginLeft: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.dark ? theme.colors.textSecondary : '#2E7D32',
    lineHeight: 20,
  },
  standbyNotificationItem: {
    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0',
  },
  standbyNotificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  standbyNotificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  standbyNotificationContent: {
    paddingLeft: 8,
  },
  standbyNotificationMessage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default NotificationSettingsScreen;
