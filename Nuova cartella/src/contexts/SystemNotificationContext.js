// 🔔 CONTEXT PROVIDER PER NOTIFICHE DI SISTEMA
// Provider globale per gestire lo stato delle notifiche di sistema

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import SystemNotificationPersistence from '../services/SystemNotificationPersistenceService';

// 📋 TIPI DI AZIONI
const ACTIONS = {
  INITIALIZE_START: 'INITIALIZE_START',
  INITIALIZE_SUCCESS: 'INITIALIZE_SUCCESS',
  INITIALIZE_ERROR: 'INITIALIZE_ERROR',
  
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  CLEAR_ALL: 'CLEAR_ALL',
  
  UPDATE_STATS: 'UPDATE_STATS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  
  SET_FILTER: 'SET_FILTER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  LOAD_DATA_START: 'LOAD_DATA_START',
  LOAD_DATA_SUCCESS: 'LOAD_DATA_SUCCESS',
  LOAD_DATA_ERROR: 'LOAD_DATA_ERROR'
};

// 🏗️ STATO INIZIALE
const initialState = {
  // Dati
  notifications: [],
  stats: {
    total: 0,
    unread: 0,
    read: 0,
    highPriority: 0,
    byType: {},
    byCategory: {}
  },
  settings: {
    maxNotifications: 50,
    maxHistoryDays: 30,
    autoCleanup: true,
    enablePersistence: true,
    showDismissed: false
  },
  
  // Stati UI
  initialized: false,
  loading: false,
  error: null,
  selectedFilter: 'all',
  
  // Configurazione
  autoRefresh: true,
  refreshInterval: 30000
};

// 🔄 REDUCER
const systemNotificationReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.INITIALIZE_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case ACTIONS.INITIALIZE_SUCCESS:
      return {
        ...state,
        initialized: true,
        loading: false,
        error: null,
        ...action.payload
      };
      
    case ACTIONS.INITIALIZE_ERROR:
      return {
        ...state,
        initialized: false,
        loading: false,
        error: action.payload
      };
      
    case ACTIONS.ADD_NOTIFICATION:
      const newNotification = action.payload;
      const updatedNotifications = [newNotification, ...state.notifications];
      
      // Limita il numero di notifiche
      const limitedNotifications = updatedNotifications.slice(0, state.settings.maxNotifications);
      
      return {
        ...state,
        notifications: limitedNotifications,
        stats: calculateStats(limitedNotifications)
      };
      
    case ACTIONS.REMOVE_NOTIFICATION:
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        stats: calculateStats(filteredNotifications)
      };
      
    case ACTIONS.UPDATE_NOTIFICATION:
      const { id, updates } = action.payload;
      const updatedNotificationsList = state.notifications.map(n =>
        n.id === id ? { ...n, ...updates } : n
      );
      return {
        ...state,
        notifications: updatedNotificationsList,
        stats: calculateStats(updatedNotificationsList)
      };
      
    case ACTIONS.MARK_AS_READ:
      const readNotifications = state.notifications.map(n =>
        n.id === action.payload 
          ? { ...n, read: true, readAt: new Date() }
          : n
      );
      return {
        ...state,
        notifications: readNotifications,
        stats: calculateStats(readNotifications)
      };
      
    case ACTIONS.CLEAR_ALL:
      return {
        ...state,
        notifications: [],
        stats: calculateStats([])
      };
      
    case ACTIONS.UPDATE_STATS:
      return {
        ...state,
        stats: action.payload
      };
      
    case ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
      
    case ACTIONS.SET_FILTER:
      return {
        ...state,
        selectedFilter: action.payload
      };
      
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    case ACTIONS.LOAD_DATA_START:
      return {
        ...state,
        loading: action.payload !== false // Se payload è false, non mostra loading
      };
      
    case ACTIONS.LOAD_DATA_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        notifications: action.payload.notifications,
        stats: action.payload.stats,
        settings: action.payload.settings
      };
      
    case ACTIONS.LOAD_DATA_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    default:
      return state;
  }
};

// 📊 CALCOLA STATISTICHE
const calculateStats = (notifications) => {
  const stats = {
    total: notifications.length,
    unread: 0,
    read: 0,
    highPriority: 0,
    byType: {},
    byCategory: {}
  };
  
  notifications.forEach(notification => {
    // Contatori base
    if (notification.read) {
      stats.read++;
    } else {
      stats.unread++;
    }
    
    if (notification.priority >= 4) {
      stats.highPriority++;
    }
    
    // Raggruppa per tipo
    stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
    
    // Raggruppa per categoria
    stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
  });
  
  return stats;
};

// 🌐 CONTEXT
const SystemNotificationContext = createContext();

// 🎯 PROVIDER
export const SystemNotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(systemNotificationReducer, initialState);
  
  // 🔧 INIZIALIZZAZIONE
  const initialize = useCallback(async () => {
    try {
      dispatch({ type: ACTIONS.INITIALIZE_START });
      
      await SystemNotificationPersistence.initialize();
      
      const notifications = SystemNotificationPersistence.getNotifications();
      const stats = SystemNotificationPersistence.getNotificationStats();
      const settings = SystemNotificationPersistence.getSettings();
      
      dispatch({
        type: ACTIONS.INITIALIZE_SUCCESS,
        payload: { notifications, stats, settings }
      });
    } catch (error) {
      console.error('❌ Errore inizializzazione sistema notifiche:', error);
      dispatch({ type: ACTIONS.INITIALIZE_ERROR, payload: error.message });
    }
  }, []);

  // 📱 AZIONI NOTIFICHE
  const addNotification = useCallback(async (notification) => {
    try {
      const newNotification = await SystemNotificationPersistence.addNotification(notification);
      if (newNotification) {
        dispatch({ type: ACTIONS.ADD_NOTIFICATION, payload: newNotification });
        return newNotification;
      }
      return null;
    } catch (error) {
      console.error('❌ Errore aggiunta notifica:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return null;
    }
  }, []);

  const removeNotification = useCallback(async (notificationId) => {
    try {
      const success = await SystemNotificationPersistence.removeNotification(notificationId);
      if (success) {
        dispatch({ type: ACTIONS.REMOVE_NOTIFICATION, payload: notificationId });
      }
      return success;
    } catch (error) {
      console.error('❌ Errore rimozione notifica:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return false;
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const success = await SystemNotificationPersistence.markAsRead(notificationId);
      if (success) {
        dispatch({ type: ACTIONS.MARK_AS_READ, payload: notificationId });
      }
      return success;
    } catch (error) {
      console.error('❌ Errore segna come letta:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = state.notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await SystemNotificationPersistence.markAsRead(notification.id);
      }
      
      // Aggiorna tutte le notifiche non lette
      const updatedNotifications = state.notifications.map(n => 
        !n.read ? { ...n, read: true, readAt: new Date() } : n
      );
      
      dispatch({ 
        type: ACTIONS.LOAD_DATA_SUCCESS, 
        payload: { 
          notifications: updatedNotifications, 
          stats: calculateStats(updatedNotifications),
          settings: state.settings
        }
      });
      
      return unreadNotifications.length;
    } catch (error) {
      console.error('❌ Errore segna tutte come lette:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return 0;
    }
  }, [state.notifications, state.settings]);

  const clearAllNotifications = useCallback(async () => {
    try {
      const count = await SystemNotificationPersistence.clearAllNotifications();
      dispatch({ type: ACTIONS.CLEAR_ALL });
      return count;
    } catch (error) {
      console.error('❌ Errore cancellazione totale:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return 0;
    }
  }, []);

  // ⚙️ GESTIONE IMPOSTAZIONI
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const success = await SystemNotificationPersistence.updateSettings(newSettings);
      if (success) {
        dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: newSettings });
      }
      return success;
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return false;
    }
  }, []);

  // 🔄 AGGIORNAMENTO DATI
  const loadData = useCallback(async (showLoading = true) => {
    try {
      dispatch({ type: ACTIONS.LOAD_DATA_START, payload: showLoading });
      
      const notifications = SystemNotificationPersistence.getNotifications();
      const stats = SystemNotificationPersistence.getNotificationStats();
      const settings = SystemNotificationPersistence.getSettings();
      
      dispatch({
        type: ACTIONS.LOAD_DATA_SUCCESS,
        payload: { notifications, stats, settings }
      });
    } catch (error) {
      console.error('❌ Errore caricamento dati:', error);
      dispatch({ type: ACTIONS.LOAD_DATA_ERROR, payload: error.message });
    }
  }, []);

  // 🔍 FILTRI
  const setFilter = useCallback((filter) => {
    dispatch({ type: ACTIONS.SET_FILTER, payload: filter });
  }, []);

  const getFilteredNotifications = useCallback((filter = state.selectedFilter) => {
    let filtered = [...state.notifications];
    
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
    
    return filtered;
  }, [state.notifications, state.selectedFilter]);

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

  // 🧹 MANUTENZIONE
  const performCleanup = useCallback(async () => {
    try {
      const result = await SystemNotificationPersistence.performCleanup();
      await loadData(false); // Ricarica senza loading
      return result;
    } catch (error) {
      console.error('❌ Errore pulizia:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return { cleanedCount: 0, error: error.message };
    }
  }, [loadData]);

  // 🎣 EFFECTS
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto refresh se abilitato
  useEffect(() => {
    if (state.autoRefresh && state.refreshInterval > 0 && state.initialized) {
      const interval = setInterval(() => {
        loadData(false); // Aggiornamento silenzioso
      }, state.refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [state.autoRefresh, state.refreshInterval, state.initialized, loadData]);

  // 📋 VALORE CONTEXT
  const contextValue = {
    // Stato
    ...state,
    
    // Azioni
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    
    // Impostazioni
    updateSettings,
    
    // Dati
    loadData,
    
    // Filtri
    setFilter,
    getFilteredNotifications,
    
    // Helper
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    showBackupNotification,
    showUpdateNotification,
    
    // Manutenzione
    performCleanup,
    
    // Controllo errori
    clearError: () => dispatch({ type: ACTIONS.CLEAR_ERROR })
  };

  return (
    <SystemNotificationContext.Provider value={contextValue}>
      {children}
    </SystemNotificationContext.Provider>
  );
};

// 🎯 HOOK PER USARE IL CONTEXT
export const useSystemNotificationContext = () => {
  const context = useContext(SystemNotificationContext);
  if (!context) {
    throw new Error('useSystemNotificationContext deve essere usato all\'interno di SystemNotificationProvider');
  }
  return context;
};

// 🔧 HOOK SEMPLIFICATO PER BADGE
export const useNotificationBadge = () => {
  const context = useSystemNotificationContext();
  
  return {
    unreadCount: context.stats.unread,
    highPriorityCount: context.stats.highPriority,
    totalCount: context.stats.total,
    hasNotifications: context.stats.total > 0,
    hasUnread: context.stats.unread > 0,
    hasHighPriority: context.stats.highPriority > 0,
    loading: context.loading,
    error: context.error
  };
};

// 🎬 HOOK PER AZIONI RAPIDE
export const useQuickNotifications = () => {
  const context = useSystemNotificationContext();
  
  return {
    success: context.showSuccessNotification,
    error: context.showErrorNotification,
    warning: context.showWarningNotification,
    info: context.showInfoNotification,
    backup: context.showBackupNotification,
    update: context.showUpdateNotification
  };
};

export default SystemNotificationContext;
