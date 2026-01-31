// 🔔 HOOK REACT PER NOTIFICHE DI SISTEMA
// Hook personalizzato per gestire le notifiche di sistema in modo semplice

import { useState, useEffect, useCallback, useRef } from 'react';
import SystemNotificationPersistence from '../services/SystemNotificationPersistenceService';

const useSystemNotifications = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 secondi
    enableRealTimeUpdates = true,
    initialFilter = 'all'
  } = options;

  // Stati
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  
  // Refs per gestire cleanup
  const refreshIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // 🔄 CARICAMENTO DATI
  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Inizializza il servizio se necessario
      await SystemNotificationPersistence.initialize();

      // Carica tutti i dati
      const [
        allNotifications,
        notificationStats,
        systemSettings,
        notificationHistory
      ] = await Promise.all([
        Promise.resolve(SystemNotificationPersistence.getNotifications()),
        Promise.resolve(SystemNotificationPersistence.getNotificationStats()),
        Promise.resolve(SystemNotificationPersistence.getSettings()),
        Promise.resolve(SystemNotificationPersistence.getHistory({ limit: 50 }))
      ]);

      // Aggiorna stati solo se il componente è ancora montato
      if (isMountedRef.current) {
        setNotifications(allNotifications);
        setStats(notificationStats);
        setSettings(systemSettings);
        setHistory(notificationHistory);
        
        // Applica filtro corrente
        applyFilter(allNotifications, selectedFilter);
      }
    } catch (err) {
      console.error('❌ Errore caricamento notifiche sistema:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedFilter]);

  // 🔍 GESTIONE FILTRI
  const applyFilter = useCallback((allNotifications, filter) => {
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
      case 'success':
        filtered = filtered.filter(n => n.type === 'success');
        break;
      case 'info':
        filtered = filtered.filter(n => n.type === 'info');
        break;
      default:
        // 'all' - non filtrare
        break;
    }
    
    if (isMountedRef.current) {
      setFilteredNotifications(filtered);
    }
  }, []);

  const changeFilter = useCallback((filter) => {
    setSelectedFilter(filter);
    applyFilter(notifications, filter);
  }, [notifications, applyFilter]);

  // 📱 AZIONI NOTIFICHE
  const addNotification = useCallback(async (notification) => {
    try {
      const newNotification = await SystemNotificationPersistence.addNotification(notification);
      if (newNotification && enableRealTimeUpdates) {
        await loadData();
      }
      return newNotification;
    } catch (err) {
      console.error('❌ Errore aggiunta notifica:', err);
      setError(err.message);
      return null;
    }
  }, [loadData, enableRealTimeUpdates]);

  const removeNotification = useCallback(async (notificationId) => {
    try {
      const success = await SystemNotificationPersistence.removeNotification(notificationId);
      if (success && enableRealTimeUpdates) {
        await loadData();
      }
      return success;
    } catch (err) {
      console.error('❌ Errore rimozione notifica:', err);
      setError(err.message);
      return false;
    }
  }, [loadData, enableRealTimeUpdates]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const success = await SystemNotificationPersistence.markAsRead(notificationId);
      if (success && enableRealTimeUpdates) {
        await loadData();
      }
      return success;
    } catch (err) {
      console.error('❌ Errore segna come letta:', err);
      setError(err.message);
      return false;
    }
  }, [loadData, enableRealTimeUpdates]);

  const clearAllNotifications = useCallback(async () => {
    try {
      const count = await SystemNotificationPersistence.clearAllNotifications();
      if (enableRealTimeUpdates) {
        await loadData();
      }
      return count;
    } catch (err) {
      console.error('❌ Errore cancellazione totale:', err);
      setError(err.message);
      return 0;
    }
  }, [loadData, enableRealTimeUpdates]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await SystemNotificationPersistence.markAsRead(notification.id);
      }
      if (enableRealTimeUpdates) {
        await loadData();
      }
      return unreadNotifications.length;
    } catch (err) {
      console.error('❌ Errore segna tutte come lette:', err);
      setError(err.message);
      return 0;
    }
  }, [notifications, loadData, enableRealTimeUpdates]);

  // ⚙️ GESTIONE IMPOSTAZIONI
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const success = await SystemNotificationPersistence.updateSettings(newSettings);
      if (success) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
      return success;
    } catch (err) {
      console.error('❌ Errore aggiornamento impostazioni:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // 🧹 MANUTENZIONE
  const performCleanup = useCallback(async () => {
    try {
      const result = await SystemNotificationPersistence.performCleanup();
      if (enableRealTimeUpdates) {
        await loadData();
      }
      return result;
    } catch (err) {
      console.error('❌ Errore pulizia:', err);
      setError(err.message);
      return { cleanedCount: 0, error: err.message };
    }
  }, [loadData, enableRealTimeUpdates]);

  const clearHistory = useCallback(async () => {
    try {
      const count = await SystemNotificationPersistence.clearHistory();
      if (enableRealTimeUpdates) {
        await loadData();
      }
      return count;
    } catch (err) {
      console.error('❌ Errore cancellazione cronologia:', err);
      setError(err.message);
      return 0;
    }
  }, [loadData, enableRealTimeUpdates]);

  // 📊 UTILITÀ
  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const getHighPriorityCount = useCallback(() => {
    return notifications.filter(n => n.priority >= 4).length;
  }, [notifications]);

  const getNotificationsByCategory = useCallback((category) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const searchNotifications = useCallback((query) => {
    if (!query || query.trim() === '') {
      return filteredNotifications;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return filteredNotifications.filter(notification =>
      notification.title.toLowerCase().includes(searchTerm) ||
      notification.message.toLowerCase().includes(searchTerm) ||
      notification.category.toLowerCase().includes(searchTerm) ||
      notification.type.toLowerCase().includes(searchTerm)
    );
  }, [filteredNotifications]);

  // 🔄 AGGIORNAMENTO AUTOMATICO
  const startAutoRefresh = useCallback(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        loadData(false); // Non mostrare loading per aggiornamenti automatici
      }, refreshInterval);
    }
  }, [autoRefresh, refreshInterval, loadData]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // 🚀 HELPER PER NOTIFICHE COMUNI
  const showSuccessNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'success',
      category: 'system',
      priority: 2,
      data
    });
  }, [addNotification]);

  const showErrorNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'error',
      category: 'system',
      priority: 4,
      data
    });
  }, [addNotification]);

  const showWarningNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'warning',
      category: 'system',
      priority: 3,
      data
    });
  }, [addNotification]);

  const showInfoNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'info',
      category: 'system',
      priority: 2,
      data
    });
  }, [addNotification]);

  const showBackupNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'success',
      category: 'backup',
      priority: 2,
      data
    });
  }, [addNotification]);

  const showUpdateNotification = useCallback((title, message, data = {}) => {
    return addNotification({
      title,
      message,
      type: 'info',
      category: 'update',
      priority: 3,
      data
    });
  }, [addNotification]);

  // 📦 EXPORT/IMPORT
  const exportNotifications = useCallback(async () => {
    try {
      return await SystemNotificationPersistence.exportNotifications();
    } catch (err) {
      console.error('❌ Errore esportazione:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const importNotifications = useCallback(async (importData) => {
    try {
      const success = await SystemNotificationPersistence.importNotifications(importData);
      if (success && enableRealTimeUpdates) {
        await loadData();
      }
      return success;
    } catch (err) {
      console.error('❌ Errore importazione:', err);
      setError(err.message);
      return false;
    }
  }, [loadData, enableRealTimeUpdates]);

  // 🧪 TEST
  const createTestNotifications = useCallback(async () => {
    try {
      const count = await SystemNotificationPersistence.createTestNotifications();
      if (enableRealTimeUpdates) {
        await loadData();
      }
      return count;
    } catch (err) {
      console.error('❌ Errore creazione test:', err);
      setError(err.message);
      return 0;
    }
  }, [loadData, enableRealTimeUpdates]);

  // 🎣 EFFECTS
  useEffect(() => {
    isMountedRef.current = true;
    
    // Caricamento iniziale
    loadData(true);
    
    // Avvia aggiornamento automatico
    startAutoRefresh();
    
    // Cleanup
    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggiorna filtro quando cambia
  useEffect(() => {
    applyFilter(notifications, selectedFilter);
  }, [notifications, selectedFilter, applyFilter]);

  // 📋 RETURN HOOK API
  return {
    // Dati
    notifications,
    filteredNotifications,
    stats,
    settings,
    history,
    loading,
    error,
    selectedFilter,
    
    // Azioni notifiche
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    
    // Filtri
    changeFilter,
    searchNotifications,
    
    // Impostazioni
    updateSettings,
    
    // Manutenzione
    performCleanup,
    clearHistory,
    
    // Utilità
    getUnreadCount,
    getHighPriorityCount,
    getNotificationsByCategory,
    getNotificationsByType,
    
    // Aggiornamento
    loadData,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Helper per tipi comuni
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    showBackupNotification,
    showUpdateNotification,
    
    // Export/Import
    exportNotifications,
    importNotifications,
    
    // Test
    createTestNotifications,
    
    // Controllo errori
    clearError: () => setError(null)
  };
};

export default useSystemNotifications;
