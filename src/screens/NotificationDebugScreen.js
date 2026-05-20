import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  Platform,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Notifications from 'expo-notifications';

const NotificationDebugScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [persistentServiceEnabled, setPersistentServiceEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carica statistiche dal servizio attivo (SuperNotificationService)
      const SuperNotificationService = require('../services/SuperNotificationService');
      const superStats = await SuperNotificationService.getNotificationStats();
      const superSettings = await SuperNotificationService.getSettings();
      setStats({
        ...superStats,
        savedSettings: superSettings
      });

      // Carica notifiche programmate
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log(`📋 Caricate ${scheduled.length} notifiche`, scheduled.map(n => ({
        title: n.content.title,
        triggerType: n.trigger?.type,
        triggerDate: n.trigger?.date,
        triggerDateType: typeof n.trigger?.date
      })));
      
      // Ordina le notifiche per data di trigger (versione semplificata)
      const sortedNotifications = scheduled.sort((a, b) => {
        // Prova a estrarre le date per l'ordinamento
        const getDateValue = (notif) => {
          if (notif.trigger?.type === 'date') {
            const triggerValue = notif.trigger.date || notif.trigger.value;
            if (triggerValue) {
              try {
                const date = new Date(triggerValue);
                return isNaN(date.getTime()) ? 0 : date.getTime();
              } catch {
                return 0;
              }
            }
          }
          return 0;
        };
        
        const dateA = getDateValue(a);
        const dateB = getDateValue(b);
        
        // Ordina per data (prossime per prime)
        return dateA - dateB;
      });
      
      setScheduledNotifications(sortedNotifications);

    } catch (error) {
      console.error('❌ Errore caricamento dati debug:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati di debug');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceReschedule = async () => {
    Alert.alert(
      'Riprogrammazione Forzata',
      'Questa azione cancellerà tutte le notifiche esistenti e le riprogrammerà. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Continua', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const SuperNotificationService = require('../services/SuperNotificationService');
              const result = await SuperNotificationService.forceReschedule();
              
              Alert.alert(
                'Riprogrammazione Completata',
                `Sono state programmate ${result.totalScheduled} nuove notifiche (cancellate: ${result.cancelled}).`,
                [{ text: 'OK' }]
              );
              
              await loadData();
            } catch (error) {
              Alert.alert('Errore', `Errore riprogrammazione: ${error.message}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearAllNotifications = async () => {
    Alert.alert(
      'Cancella Tutte le Notifiche',
      'Questa azione cancellerà TUTTE le notifiche programmate. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Cancella', 
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              await Notifications.dismissAllNotificationsAsync();
              
              Alert.alert('Completato', 'Tutte le notifiche sono state cancellate.');
              await loadData();
            } catch (error) {
              Alert.alert('Errore', `Errore cancellazione: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleClearSpecificNotifications = async (type) => {
    Alert.alert(
      `Cancella Notifiche ${type}`,
      `Questa azione cancellerà tutte le notifiche di tipo "${type}". Continuare?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Cancella', 
          style: 'destructive',
          onPress: async () => {
            try {
              const scheduled = await Notifications.getAllScheduledNotificationsAsync();
              let cancelledCount = 0;
              
              for (const notif of scheduled) {
                if (notif.content.data?.type === type) {
                  await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                  cancelledCount++;
                }
              }
              
              Alert.alert('Completato', `Cancellate ${cancelledCount} notifiche di tipo "${type}".`);
              await loadData();
            } catch (error) {
              Alert.alert('Errore', `Errore cancellazione: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleOpenExactAlarmSettings = async () => {
    if (Platform.OS !== 'android') return;
    try {
      if (Platform.Version >= 31) {
        await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aprire le impostazioni. Vai manualmente in Impostazioni > App > WorkT > Allarmi e promemoria.');
    }
  };

  const handleOpenBatterySettings = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Linking.sendIntent(
        'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        [{ key: 'android.provider.extra.APP_PACKAGE', value: 'com.workt.production' }]
      );
    } catch (e) {
      // Fallback: apri impostazioni batteria generali
      try {
        await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      } catch (e2) {
        await Linking.openSettings();
      }
    }
  };

  const handleOpenNotificationSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aprire le impostazioni.');
    }
  };

  const handleCheckExactAlarm = async () => {
    if (Platform.OS !== 'android' || Platform.Version < 31) {
      Alert.alert('Info', 'Il permesso allarmi esatti è richiesto solo su Android 12 e superiori.');
      return;
    }
    try {
      const granted = await PermissionsAndroid.check('android.permission.SCHEDULE_EXACT_ALARM');
      if (granted) {
        Alert.alert('✅ OK', 'Il permesso "Allarmi esatti" è già attivo. Le notifiche possono arrivare in orario.');
      } else {
        Alert.alert(
          '⚠️ Permesso mancante',
          'Il permesso "Allarmi e promemoria" non è attivo. Questo è probabilmente il motivo per cui le notifiche arrivano in ritardo.\n\nPremi "Vai alle impostazioni" per attivarlo.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Vai alle impostazioni', onPress: handleOpenExactAlarmSettings },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Errore', `Impossibile verificare il permesso: ${e.message}`);
    }
  };

  const handleTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notifica',
          body: 'Questa è una notifica di test per verificare il funzionamento del sistema.',
          data: { type: 'test' },
        },
        trigger: {
          type: 'date',
          date: new Date(Date.now() + 5000), // 5 secondi
        },
      });
      
      Alert.alert('Test Programmato', 'Riceverai una notifica di test tra 5 secondi.');
    } catch (error) {
      Alert.alert('Errore', `Errore programmazione test: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return 'check-circle';
      case 'warning': return 'alert-circle';
      case 'error': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getSystemStatus = () => {
    if (!stats) return { status: 'unknown', message: 'Caricamento...' };
    
    if (!stats.hasPermission) {
      return { status: 'error', message: 'Permessi notifiche negati' };
    }
    
    if (!stats.initialized) {
      return { status: 'error', message: 'Sistema non inizializzato' };
    }
    
    if (stats.needsReschedule) {
      return { status: 'warning', message: `Solo ${stats.totalScheduled} notifiche (min: ${stats.threshold})` };
    }
    
    return { status: 'good', message: `Sistema stabile (${stats.totalScheduled} notifiche)` };
  };

  const systemStatus = getSystemStatus();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Debug Notifiche
        </Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <MaterialCommunityIcons 
            name="refresh" 
            size={24} 
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        {/* Status Sistema */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons 
              name={getStatusIcon(systemStatus.status)} 
              size={24} 
              color={getStatusColor(systemStatus.status)} 
            />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Status Sistema
            </Text>
          </View>
          
          <View style={[styles.statusCard, { borderColor: getStatusColor(systemStatus.status) }]}>
            <Text style={[styles.statusMessage, { color: getStatusColor(systemStatus.status) }]}>
              {systemStatus.message}
            </Text>
          </View>
        </View>

        {/* Statistiche */}
        {stats && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-bar" size={24} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Statistiche
              </Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {stats.totalScheduled}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Programmate
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {stats.threshold}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Soglia Min
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.hasPermission ? '#4CAF50' : '#F44336' }]}>
                  {stats.hasPermission ? '✓' : '✗'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Permessi
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.initialized ? '#4CAF50' : '#F44336' }]}>
                  {stats.initialized ? '✓' : '✗'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Inizializzato
                </Text>
              </View>
            </View>
            
            {stats.lastCheck && (
              <Text style={[styles.lastCheck, { color: theme.colors.textSecondary }]}>
                Ultimo controllo: {stats.lastCheck.toLocaleString('it-IT')}
              </Text>
            )}
          </View>
        )}

        {/* Azioni */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Azioni
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleForceReschedule}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="refresh-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Riprogramma Tutte</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={handleTestNotification}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="test-tube" size={20} color="white" />
            <Text style={styles.actionButtonText}>Test Notifica (5s)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={handleClearAllNotifications}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="delete-sweep" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancella Tutte</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => handleClearSpecificNotifications('backup_reminder')}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="delete" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancella Solo Backup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#607D8B' }]}
            onPress={() => handleClearSpecificNotifications('standby_reminder')}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="delete" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancella Solo Reperibilità</Text>
          </TouchableOpacity>
        </View>

        {/* ⚙️ FIX ANDROID - sezione critica per produzione */}
        {Platform.OS === 'android' && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderWidth: 2, borderColor: '#FF9800' }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="android" size={24} color="#FF9800" />
              <Text style={[styles.sectionTitle, { color: '#FF9800' }]}>
                Fix Android — Notifiche Puntuali
              </Text>
            </View>

            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
              Se le notifiche arrivano solo quando apri l'app, sono necessarie queste due impostazioni di sistema:
            </Text>

            {/* Step 1: Exact Alarm */}
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: 'rgba(255,152,0,0.08)', borderRadius: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                1. Allarmi e promemoria (Android 12+)
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                Senza questo permesso Android usa allarmi imprecisi che possono ritardare di ore.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#FF9800', borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                  onPress={handleCheckExactAlarm}
                >
                  <MaterialCommunityIcons name="alarm-check" size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Verifica</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#E65100', borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                  onPress={handleOpenExactAlarmSettings}
                >
                  <MaterialCommunityIcons name="cog" size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Attiva ora</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Step 2: Battery Optimization */}
            <View style={{ marginBottom: 10, padding: 10, backgroundColor: 'rgba(255,152,0,0.08)', borderRadius: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                2. Ottimizzazione batteria (Doze mode)
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                Android mette l'app in sleep e annulla gli allarmi. Devi scegliere "Non ottimizzare" per WorkT.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#F57C00', borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={handleOpenBatterySettings}
              >
                <MaterialCommunityIcons name="battery-off" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Apri impostazioni batteria</Text>
              </TouchableOpacity>
            </View>

            {/* Step 3: Manufacturer specific */}
            <View style={{ padding: 10, backgroundColor: 'rgba(255,152,0,0.08)', borderRadius: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                3. Impostazioni app di sistema
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                Su alcuni telefoni (Xiaomi, Samsung, Huawei) esistono impostazioni aggiuntive nelle impostazioni app.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#5D4037', borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={handleOpenNotificationSystemSettings}
              >
                <MaterialCommunityIcons name="tune" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Impostazioni app WorkT</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Diagnostica Impostazioni Salvate */}
        {stats?.savedSettings && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Impostazioni Salvate
              </Text>
            </View>
            
            {/* Allarmi Esatti */}
            {Platform.OS === 'android' && Platform.Version >= 31 && (
              <View style={{ 
                flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8,
                backgroundColor: stats.canScheduleExactAlarms ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.15)',
                borderRadius: 8, borderLeftWidth: 3, 
                borderLeftColor: stats.canScheduleExactAlarms ? '#4CAF50' : '#F44336' 
              }}>
                <MaterialCommunityIcons 
                  name={stats.canScheduleExactAlarms ? 'alarm-check' : 'alarm-off'} 
                  size={20} color={stats.canScheduleExactAlarms ? '#4CAF50' : '#F44336'} 
                />
                <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1, marginLeft: 8 }}>
                  {stats.canScheduleExactAlarms 
                    ? 'Allarmi esatti attivi — notifiche puntuali' 
                    : 'Allarmi esatti NON attivi — le notifiche potrebbero arrivare in ritardo. Vai in Impostazioni > App > WorkT > Allarmi e promemoria e attiva la voce.'
                  }
                </Text>
              </View>
            )}
            
            {(() => {
              const s = stats.savedSettings;
              const sections = [];
              
              const wr = s.workReminder || s.workReminders;
              if (wr) sections.push({ 
                label: '💼 Promemoria Lavoro', 
                enabled: wr.enabled, 
                detail: `Orario: ${wr.morningTime || '—'}, Weekend: ${wr.weekendsEnabled ? 'Sì' : 'No'}` 
              });
              
              const te = s.timeEntryReminder || s.timeEntryReminders;
              if (te) sections.push({ 
                label: '⏰ Inserimento Orari', 
                enabled: te.enabled, 
                detail: `Orario: ${te.time || te.eveningTime || '—'}, Weekend: ${te.weekendsEnabled ? 'Sì' : 'No'}` 
              });
              
              if (s.backupReminder) sections.push({ 
                label: '💾 Backup', 
                enabled: s.backupReminder.enabled, 
                detail: `Orario: ${s.backupReminder.time || '—'}` 
              });
              
              const sr = s.standbyReminder || s.standbyReminders;
              if (sr) sections.push({ 
                label: '📞 Reperibilità', 
                enabled: sr.enabled, 
                detail: `Notifiche: ${sr.notifications?.length || 0} configurate` 
              });
              
              return sections.map((sec, i) => (
                <View key={i} style={{ 
                  flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4,
                  borderBottomWidth: i < sections.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border 
                }}>
                  <MaterialCommunityIcons 
                    name={sec.enabled ? 'check-circle' : 'close-circle'} 
                    size={16} color={sec.enabled ? '#4CAF50' : '#9E9E9E'} 
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>{sec.label}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{sec.detail}</Text>
                  </View>
                </View>
              ));
            })()}
            
            {stats.lastSchedule && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                Ultima programmazione: {stats.lastSchedule.toLocaleString('it-IT')}
              </Text>
            )}
          </View>
        )}

        {/* Lista Notifiche Programmate */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={24} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notifiche Programmate ({scheduledNotifications.length})
            </Text>
          </View>
          
          {scheduledNotifications.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Nessuna notifica programmata
            </Text>
          ) : (
            scheduledNotifications.map((notif, index) => {
              // Gestione robusta delle date con debug migliorato
              let triggerDate = null;
              let dateDisplay = 'Data non disponibile';
              let isValidDate = false;
              
              const weekdayNames = ['', 'Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
              
              try {
                const triggerValue = notif.trigger?.date || notif.trigger?.value;
                const triggerType = notif.trigger?.type;
                
                if (triggerType === 'date' && triggerValue != null) {
                  const dateValue = triggerValue;
                  if (typeof dateValue === 'number') {
                    triggerDate = new Date(dateValue);
                  } else if (typeof dateValue === 'string') {
                    triggerDate = new Date(dateValue);
                  } else if (dateValue instanceof Date) {
                    triggerDate = dateValue;
                  } else if (dateValue && typeof dateValue === 'object') {
                    try {
                      if (dateValue.seconds) triggerDate = new Date(dateValue.seconds * 1000);
                      else if (dateValue._seconds) triggerDate = new Date(dateValue._seconds * 1000);
                      else if (typeof dateValue.valueOf === 'function') triggerDate = new Date(dateValue.valueOf());
                    } catch (e) {}
                  }
                  if (triggerDate && !isNaN(triggerDate.getTime())) {
                    isValidDate = true;
                    dateDisplay = triggerDate.toLocaleString('it-IT', {
                      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                  } else {
                    dateDisplay = `Formato non valido: ${String(dateValue).substring(0, 30)}`;
                  }
                } else if (triggerType === 'weekly') {
                  const h = String(notif.trigger.hour ?? notif.content?.data?.hour ?? '?').padStart(2, '0');
                  const m = String(notif.trigger.minute ?? notif.content?.data?.minute ?? '?').padStart(2, '0');
                  const wd = notif.trigger.weekday ?? notif.content?.data?.weekday;
                  const wdName = weekdayNames[wd] || `wd${wd}`;
                  dateDisplay = `🔁 Ogni ${wdName} alle ${h}:${m}`;
                  isValidDate = true;
                } else if (triggerType === 'daily') {
                  const h = String(notif.trigger.hour ?? notif.content?.data?.hour ?? '?').padStart(2, '0');
                  const m = String(notif.trigger.minute ?? notif.content?.data?.minute ?? '?').padStart(2, '0');
                  dateDisplay = `🔁 Ogni giorno alle ${h}:${m}`;
                  isValidDate = true;
                } else if (triggerType) {
                  dateDisplay = `Trigger tipo: ${triggerType}`;
                } else {
                  dateDisplay = 'Nessun trigger';
                }
              } catch (error) {
                dateDisplay = `Errore: ${error.message}`;
                console.error('❌ Errore parsing data:', error);
              }
              
              // Identificazione migliorata del tipo di notifica
              const type = notif.content.data?.type || 'unknown';
              const getTypeDisplayName = (type) => {
                switch (type) {
                  case 'work_reminder': return '💼 Promemoria Lavoro';
                  case 'time_entry_reminder': return '⏰ Promemoria Orari';
                  case 'standby_reminder': return '📞 Reperibilità';
                  case 'backup_reminder': return '💾 Backup';
                  case 'test': return '🧪 Test';
                  case 'system': return '🔔 Sistema';
                  case 'update': return '🔄 Aggiornamento';
                  default: return `🔸 ${type}`;
                }
              };
              
              const typeDisplay = getTypeDisplayName(type);
              
              // Aggiungi indicatori di urgenza/prossimità
              let urgencyIndicator = '';
              if (isValidDate && triggerDate) {
                const now = new Date();
                const timeDiff = triggerDate.getTime() - now.getTime();
                const minutesDiff = Math.floor(timeDiff / (1000 * 60));
                const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
                const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                
                if (timeDiff < 0) {
                  urgencyIndicator = '🔴 Scaduta';
                } else if (minutesDiff < 60) {
                  urgencyIndicator = `🟠 ${minutesDiff}min`;
                } else if (hoursDiff < 24) {
                  urgencyIndicator = `🟡 ${hoursDiff}h`;
                } else if (daysDiff < 7) {
                  urgencyIndicator = `🟢 ${daysDiff}g`;
                } else {
                  urgencyIndicator = `🔵 ${daysDiff}g`;
                }
              }
              
              return (
                <View key={notif.identifier || index} style={[styles.notificationItem, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                        {notif.content.title}
                      </Text>
                      {urgencyIndicator && (
                        <Text style={[styles.urgencyBadge, { 
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text
                        }]}>
                          {urgencyIndicator}
                        </Text>
                      )}
                    </View>
                    
                    <Text style={[styles.notificationBody, { color: theme.colors.textSecondary }]}>
                      {notif.content.body}
                    </Text>
                    
                    <Text style={[styles.notificationDate, { 
                      color: isValidDate ? theme.colors.primary : (theme.colors.error || '#F44336') 
                    }]}>
                      📅 {dateDisplay}
                    </Text>
                    
                    <View style={styles.notificationFooter}>
                      <Text style={[styles.notificationType, { color: theme.colors.textSecondary }]}>
                        {typeDisplay}
                      </Text>
                      {notif.identifier && (
                        <Text style={[styles.notificationId, { color: theme.colors.textSecondary }]}>
                          ID: {String(notif.identifier).substring(0, 8)}...
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    marginRight: 40,
  },
  refreshButton: {
    padding: 8,
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
  statusCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  lastCheck: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  urgencyBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationType: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationId: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 14,
  },
  moreText: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 12,
    marginTop: 8,
  },
});

export default NotificationDebugScreen;
