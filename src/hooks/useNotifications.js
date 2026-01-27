// 🔔 HOOK NOTIFICHE NATIVE
// Hook React per gestire notifiche con sistema automatico Expo + Fallback JavaScript

import { useState, useEffect } from 'react';
import NotificationService from '../services/FixedNotificationService';

export const useNotifications = () => {
  const [notificationStatus, setNotificationStatus] = useState({
    isNativeReady: false,
    systemType: 'loading',
    description: 'Inizializzazione...'
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Inizializzazione
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await NotificationService.initialize();
      
      // Ottieni stato dei permessi
      const hasPermissions = await NotificationService.hasPermissions();
      
      setNotificationStatus({
        isNativeReady: hasPermissions,
        systemType: hasPermissions ? 'expo-notifications' : 'javascript-fallback',
        description: hasPermissions 
          ? 'Notifiche expo-notifications attive' 
          : 'Fallback JavaScript (solo con app aperta)'
      });
      
      setIsInitialized(true);
      
      console.log('🔔 Hook notifiche inizializzato:', {
        isNativeReady: hasPermissions,
        systemType: hasPermissions ? 'expo-notifications' : 'javascript-fallback'
      });
    } catch (error) {
      console.error('❌ Errore inizializzazione hook notifiche:', error);
      setNotificationStatus({
        isNativeReady: false,
        systemType: 'error',
        description: 'Errore inizializzazione'
      });
      setIsInitialized(true);
    }
  };

  // Mostra notifica
  const showNotification = async (title, body, data = {}) => {
    try {
      return await NotificationService.showImmediateNotification(title, body, data);
    } catch (error) {
      console.error('❌ Errore mostra notifica:', error);
      return { success: false, error: error.message };
    }
  };

  // Test notifica
  const sendTestNotification = async () => {
    try {
      return await NotificationService.testNotificationSystem();
    } catch (error) {
      console.error('❌ Errore test notifica:', error);
      return { success: false, error: error.message };
    }
  };

  // Programma notifiche
  const scheduleNotifications = async (settings) => {
    try {
      const workCount = await NotificationService.scheduleWorkReminders(settings);
      const timeEntryCount = await NotificationService.scheduleTimeEntryReminders(settings);
      return { success: true, count: workCount + timeEntryCount };
    } catch (error) {
      console.error('❌ Errore programmazione notifiche:', error);
      return { success: false, error: error.message };
    }
  };

  // Cancella tutte le notifiche
  const cancelAllNotifications = async () => {
    try {
      return await NotificationService.cancelAllNotifications();
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
      return { success: false, error: error.message };
    }
  };

  // Ottieni statistiche
  const getNotificationStats = async () => {
    try {
      return { count: NotificationService.pendingNotificationsForStorage.length || 0 };
    } catch (error) {
      console.error('❌ Errore lettura statistiche:', error);
      return { count: 0, error: error.message };
    }
  };

  return {
    // Stato
    isInitialized,
    notificationStatus,
    isNativeReady: notificationStatus.isNativeReady,
    systemType: notificationStatus.systemType,
    systemDescription: notificationStatus.description,
    
    // Azioni
    showNotification,
    sendTestNotification,
    scheduleNotifications,
    cancelAllNotifications,
    getNotificationStats,
    
    // Utility
    reinitialize: initializeNotifications
  };
};

export default useNotifications;
