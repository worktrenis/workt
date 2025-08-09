// 🔔 SCHERMATA MENU NOTIFICHE DI SISTEMA
// Interfaccia completa per gestire le notifiche di sistema persistenti

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  Switch,
  FlatList,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SystemNotificationPersistence from '../services/SystemNotificationPersistenceService';

const { width } = Dimensions.get('window');

const SystemNotificationMenuScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 🔄 CARICAMENTO DATI
  const loadData = useCallback(async () => {
    try {
      await SystemNotificationPersistence.initialize();
      
      const allNotifications = SystemNotificationPersistence.getNotifications();
      const notificationStats = SystemNotificationPersistence.getNotificationStats();
      const systemSettings = SystemNotificationPersistence.getSettings();
      
      setNotifications(allNotifications);
      setStats(notificationStats);
      setSettings(systemSettings);
      
      applyFilter(allNotifications, selectedFilter);
    } catch (error) {
      console.error('❌ Errore caricamento notifiche sistema:', error);
      Alert.alert('Errore', 'Impossibile caricare le notifiche di sistema');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔍 FILTRI
  const applyFilter = (allNotifications, filter) => {
    let filtered = [...allNotifications];
    
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'high-priority':
        filtered = filtered.filter(n => n.priority >= 4);
        break;
      case 'system':
        filtered = filtered.filter(n => n.category === 'system');
        break;
      case 'backup':
        filtered = filtered.filter(n => n.category === 'backup');
        break;
      case 'update':
        filtered = filtered.filter(n => n.category === 'update');
        break;
      case 'error':
        filtered = filtered.filter(n => n.type === 'error');
        break;
      case 'warning':
        filtered = filtered.filter(n => n.type === 'warning');
        break;
      default:
        // 'all' - non filtrare
        break;
    }
    
    setFilteredNotifications(filtered);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    applyFilter(notifications, filter);
  };

  // 📱 AZIONI NOTIFICHE
  const markAsRead = async (notificationId) => {
    try {
      await SystemNotificationPersistence.markAsRead(notificationId);
      await loadData();
    } catch (error) {
      console.error('❌ Errore segna come letta:', error);
    }
  };

  const removeNotification = async (notificationId) => {
    Alert.alert(
      'Rimuovi Notifica',
      'Sei sicuro di voler rimuovere questa notifica?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            try {
              await SystemNotificationPersistence.removeNotification(notificationId);
              await loadData();
            } catch (error) {
              console.error('❌ Errore rimozione notifica:', error);
            }
          }
        }
      ]
    );
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Cancella Tutte',
      'Sei sicuro di voler cancellare tutte le notifiche?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella Tutte',
          style: 'destructive',
          onPress: async () => {
            try {
              await SystemNotificationPersistence.clearAllNotifications();
              await loadData();
            } catch (error) {
              console.error('❌ Errore cancellazione totale:', error);
            }
          }
        }
      ]
    );
  };

  // 🎯 GESTIONE DETTAGLI
  const showNotificationDetails = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // Segna come letta se non lo era già
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  // 📚 CRONOLOGIA
  const loadHistory = async () => {
    try {
      const historyData = SystemNotificationPersistence.getHistory({ limit: 50 });
      setHistory(historyData);
      setShowHistory(true);
    } catch (error) {
      console.error('❌ Errore caricamento cronologia:', error);
    }
  };

  // ⚙️ IMPOSTAZIONI
  const updateSettings = async (newSettings) => {
    try {
      await SystemNotificationPersistence.updateSettings(newSettings);
      setSettings({ ...settings, ...newSettings });
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni:', error);
    }
  };

  // 🧪 TEST
  const createTestNotifications = async () => {
    try {
      const count = await SystemNotificationPersistence.createTestNotifications();
      Alert.alert('Test Completato', `Create ${count} notifiche di test`);
      await loadData();
    } catch (error) {
      console.error('❌ Errore creazione test:', error);
    }
  };

  // 🎨 COMPONENTI UI
  const getNotificationIcon = (notification) => {
    const iconMap = {
      info: 'information',
      success: 'check-circle',
      warning: 'alert',
      error: 'alert-circle'
    };
    return iconMap[notification.type] || 'bell';
  };

  const getNotificationColor = (notification) => {
    const colorMap = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    return colorMap[notification.type] || theme.colors.primary;
  };

  const getPriorityIcon = (priority) => {
    if (priority >= 5) return 'priority-high';
    if (priority >= 4) return 'exclamation';
    if (priority >= 3) return 'minus';
    if (priority >= 2) return 'chevron-down';
    return 'low-priority';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
  };

  // 📋 COMPONENTE NOTIFICA
  const NotificationItem = ({ notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification,
        notification.priority >= 4 && styles.highPriorityNotification
      ]}
      onPress={() => showNotificationDetails(notification)}
      onLongPress={() => {
        Alert.alert(
          'Azioni Notifica',
          notification.title,
          [
            { text: 'Annulla', style: 'cancel' },
            !notification.read && {
              text: 'Segna come Letta',
              onPress: () => markAsRead(notification.id)
            },
            {
              text: 'Rimuovi',
              style: 'destructive',
              onPress: () => removeNotification(notification.id)
            }
          ].filter(Boolean)
        );
      }}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationLeft}>
          <MaterialCommunityIcons
            name={getNotificationIcon(notification)}
            size={24}
            color={getNotificationColor(notification)}
          />
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={styles.categoryText}>{notification.category}</Text>
              <Text style={styles.timestampText}>{formatTimestamp(notification.timestamp)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.notificationRight}>
          <MaterialCommunityIcons
            name={getPriorityIcon(notification.priority)}
            size={16}
            color={notification.priority >= 4 ? '#F44336' : theme.colors.textSecondary}
          />
          {!notification.read && (
            <View style={styles.unreadDot} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // 🔍 BARRA FILTRI
  const FilterBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterBar}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: 'all', label: 'Tutte', count: notifications.length },
        { key: 'unread', label: 'Non Lette', count: stats.unread || 0 },
        { key: 'high-priority', label: 'Priorità Alta', count: stats.highPriority || 0 },
        { key: 'system', label: 'Sistema', count: stats.byCategory?.system || 0 },
        { key: 'backup', label: 'Backup', count: stats.byCategory?.backup || 0 },
        { key: 'update', label: 'Aggiornamenti', count: stats.byCategory?.update || 0 },
        { key: 'error', label: 'Errori', count: stats.byType?.error || 0 },
        { key: 'warning', label: 'Avvisi', count: stats.byType?.warning || 0 }
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            selectedFilter === filter.key && styles.filterButtonActive
          ]}
          onPress={() => handleFilterChange(filter.key)}
        >
          <Text style={[
            styles.filterButtonText,
            selectedFilter === filter.key && styles.filterButtonTextActive
          ]}>
            {filter.label}
          </Text>
          {filter.count > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filter.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // 📱 MODAL DETTAGLI
  const DetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowDetailModal(false)}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Dettagli Notifica</Text>
          <View style={styles.modalHeaderRight} />
        </View>
        
        {selectedNotification && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <MaterialCommunityIcons
                name={getNotificationIcon(selectedNotification)}
                size={48}
                color={getNotificationColor(selectedNotification)}
                style={styles.detailIcon}
              />
              <Text style={styles.detailTitle}>{selectedNotification.title}</Text>
              <Text style={styles.detailMessage}>{selectedNotification.message}</Text>
            </View>
            
            <View style={styles.detailMeta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Tipo:</Text>
                <Text style={styles.metaValue}>{selectedNotification.type}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Categoria:</Text>
                <Text style={styles.metaValue}>{selectedNotification.category}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Priorità:</Text>
                <Text style={styles.metaValue}>{selectedNotification.priority}/5</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Data:</Text>
                <Text style={styles.metaValue}>
                  {new Date(selectedNotification.timestamp).toLocaleString('it-IT')}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Stato:</Text>
                <Text style={styles.metaValue}>
                  {selectedNotification.read ? 'Letta' : 'Non Letta'}
                </Text>
              </View>
              {selectedNotification.readAt && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Letta il:</Text>
                  <Text style={styles.metaValue}>
                    {new Date(selectedNotification.readAt).toLocaleString('it-IT')}
                  </Text>
                </View>
              )}
            </View>
            
            {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Dati Aggiuntivi</Text>
                <Text style={styles.dataText}>
                  {JSON.stringify(selectedNotification.data, null, 2)}
                </Text>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              {!selectedNotification.read && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.markReadButton]}
                  onPress={() => {
                    markAsRead(selectedNotification.id);
                    setShowDetailModal(false);
                  }}
                >
                  <MaterialCommunityIcons name="check" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Segna come Letta</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => {
                  removeNotification(selectedNotification.id);
                  setShowDetailModal(false);
                }}
              >
                <MaterialCommunityIcons name="delete" size={20} color="white" />
                <Text style={styles.actionButtonText}>Rimuovi</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  // ⚙️ MODAL IMPOSTAZIONI
  const SettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettings(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowSettings(false)}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Impostazioni Notifiche</Text>
          <View style={styles.modalHeaderRight} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Persistenza</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Abilita Persistenza</Text>
              <Switch
                value={settings.enablePersistence}
                onValueChange={(value) => updateSettings({ enablePersistence: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Pulizia Automatica</Text>
              <Switch
                value={settings.autoCleanup}
                onValueChange={(value) => updateSettings({ autoCleanup: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Mostra Rimosse</Text>
              <Switch
                value={settings.showDismissed}
                onValueChange={(value) => updateSettings({ showDismissed: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
          </View>
          
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Limiti</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Massimo Notifiche</Text>
              <TextInput
                style={styles.settingInput}
                value={settings.maxNotifications?.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 50;
                  updateSettings({ maxNotifications: num });
                }}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Giorni Cronologia</Text>
              <TextInput
                style={styles.settingInput}
                value={settings.maxHistoryDays?.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 30;
                  updateSettings({ maxHistoryDays: num });
                }}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
          </View>
          
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Azioni</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={createTestNotifications}
            >
              <MaterialCommunityIcons name="test-tube" size={20} color="white" />
              <Text style={styles.actionButtonText}>Crea Notifiche Test</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              onPress={async () => {
                await SystemNotificationPersistence.performCleanup();
                Alert.alert('Completato', 'Pulizia eseguita con successo');
                await loadData();
              }}
            >
              <MaterialCommunityIcons name="broom" size={20} color="white" />
              <Text style={styles.actionButtonText}>Pulizia Manuale</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => {
                Alert.alert(
                  'Cancella Cronologia',
                  'Sei sicuro?',
                  [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Cancella',
                      style: 'destructive',
                      onPress: async () => {
                        await SystemNotificationPersistence.clearHistory();
                        Alert.alert('Completato', 'Cronologia cancellata');
                      }
                    }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="history" size={20} color="white" />
              <Text style={styles.actionButtonText}>Cancella Cronologia</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // 📚 MODAL CRONOLOGIA
  const HistoryModal = () => (
    <Modal
      visible={showHistory}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowHistory(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowHistory(false)}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Cronologia Notifiche</Text>
          <View style={styles.modalHeaderRight} />
        </View>
        
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          style={styles.modalContent}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <MaterialCommunityIcons
                name={
                  item.action === 'added' ? 'plus' :
                  item.action === 'removed' ? 'delete' :
                  item.action === 'read' ? 'eye' : 'check'
                }
                size={20}
                color={theme.colors.primary}
              />
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{item.notificationTitle}</Text>
                <Text style={styles.historyAction}>
                  {item.action === 'added' ? 'Aggiunta' :
                   item.action === 'removed' ? 'Rimossa' :
                   item.action === 'read' ? 'Letta' : 'Azione'}
                </Text>
                <Text style={styles.historyTime}>
                  {new Date(item.timestamp).toLocaleString('it-IT')}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Nessuna cronologia disponibile</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="bell" size={48} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento notifiche...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifiche Sistema</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={loadHistory}
          >
            <MaterialCommunityIcons name="history" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={clearAllNotifications}
          >
            <MaterialCommunityIcons name="delete-sweep" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistiche */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total || 0}</Text>
          <Text style={styles.statLabel}>Totali</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.unreadNumber]}>{stats.unread || 0}</Text>
          <Text style={styles.statLabel}>Non Lette</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.priorityNumber]}>{stats.highPriority || 0}</Text>
          <Text style={styles.statLabel}>Priorità Alta</Text>
        </View>
      </View>

      {/* Filtri */}
      <FilterBar />

      {/* Lista Notifiche */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-off" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              {selectedFilter === 'all' 
                ? 'Nessuna notifica disponibile'
                : `Nessuna notifica per il filtro "${selectedFilter}"`
              }
            </Text>
            {selectedFilter === 'all' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={createTestNotifications}
              >
                <Text style={styles.actionButtonText}>Crea Notifiche Test</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modals */}
      <DetailModal />
      <SettingsModal />
      <HistoryModal />
    </SafeAreaView>
  );
};

// 🎨 STILI
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  unreadNumber: {
    color: '#2196F3',
  },
  priorityNumber: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  filterBar: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filterBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    borderLeftColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  highPriorityNotification: {
    borderLeftColor: '#F44336',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  timestampText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  notificationRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalHeaderRight: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  detailIcon: {
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  detailMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  detailMeta: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metaLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  dataText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
  },
  actionButtons: {
    paddingVertical: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  markReadButton: {
    backgroundColor: '#4CAF50',
  },
  removeButton: {
    backgroundColor: '#F44336',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingSection: {
    marginVertical: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minWidth: 80,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  historyAction: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});

export default SystemNotificationMenuScreen;
