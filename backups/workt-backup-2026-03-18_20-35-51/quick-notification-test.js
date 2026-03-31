// quick-notification-test.js
// Script per testare rapidamente il sistema notifiche nell'app

import { Alert } from 'react-native';
import SystemNotificationPersistenceService from './src/services/SystemNotificationPersistenceService';

const quickTest = async () => {
  try {
    console.log('🧪 Test rapido sistema notifiche...');
    
    // Aggiungi alcune notifiche di test
    const testNotifications = [
      {
        type: 'info',
        title: '🎉 Sistema Attivo',
        message: 'Il sistema di notifiche persistenti è ora funzionante!',
        priority: 'high'
      },
      {
        type: 'warning',
        title: '⚠️ Promemoria Backup',
        message: 'Ricordati di controllare il backup automatico',
        priority: 'medium'
      },
      {
        type: 'success',
        title: '✅ Test Completato',
        message: 'I test del sistema sono stati completati con successo',
        priority: 'low'
      }
    ];
    
    let addedCount = 0;
    for (const notification of testNotifications) {
      const id = await SystemNotificationPersistenceService.addNotification(notification);
      if (id) addedCount++;
    }
    
    // Ottieni statistiche
    const stats = await SystemNotificationPersistenceService.getStatistics();
    const unread = await SystemNotificationPersistenceService.getUnreadNotifications();
    
    Alert.alert(
      '🧪 Test Sistema Notifiche',
      `Test completato con successo!\n\n` +
      `📊 Risultati:\n` +
      `• ${addedCount} notifiche aggiunte\n` +
      `• ${stats.total} notifiche totali\n` +
      `• ${unread.length} non lette\n` +
      `• ${stats.byType.error || 0} errori\n` +
      `• ${stats.byType.warning || 0} avvisi\n` +
      `• ${stats.byType.info || 0} info\n` +
      `• ${stats.byType.success || 0} successi\n\n` +
      `🎯 Vai su Impostazioni → Notifiche di Sistema per vedere il risultato!`,
      [
        {
          text: 'Perfetto!',
          style: 'default'
        }
      ]
    );
    
    console.log('✅ Test rapido completato:', {
      addedNotifications: addedCount,
      totalNotifications: stats.total,
      unreadNotifications: unread.length,
      statistics: stats
    });
    
    return true;
  } catch (error) {
    console.error('❌ Errore durante test rapido:', error);
    Alert.alert(
      '❌ Test Fallito',
      `Errore durante test sistema notifiche:\n\n${error.message}`,
      [{ text: 'OK', style: 'cancel' }]
    );
    return false;
  }
};

// Funzione per pulire le notifiche di test
const clearTestNotifications = async () => {
  try {
    await SystemNotificationPersistenceService.clearAllNotifications();
    Alert.alert(
      '🗑️ Pulizia Completata',
      'Tutte le notifiche di test sono state rimosse.',
      [{ text: 'OK' }]
    );
    console.log('✅ Notifiche di test pulite');
    return true;
  } catch (error) {
    console.error('❌ Errore pulizia notifiche:', error);
    Alert.alert(
      '❌ Errore',
      `Impossibile pulire le notifiche:\n\n${error.message}`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

// Funzione per aggiungere una notifica singola di test
const addSingleTestNotification = async (type = 'info') => {
  try {
    const notifications = {
      info: {
        type: 'info',
        title: '📢 Notifica Informativa',
        message: 'Questa è una notifica informativa di test',
        priority: 'medium'
      },
      warning: {
        type: 'warning',
        title: '⚠️ Avviso Importante',
        message: 'Questa è una notifica di avviso di test',
        priority: 'high'
      },
      error: {
        type: 'error',
        title: '🚨 Errore Critico',
        message: 'Questa è una notifica di errore di test',
        priority: 'high'
      },
      success: {
        type: 'success',
        title: '✅ Operazione Riuscita',
        message: 'Questa è una notifica di successo di test',
        priority: 'low'
      }
    };
    
    const notification = notifications[type] || notifications.info;
    const id = await SystemNotificationPersistenceService.addNotification(notification);
    
    if (id) {
      Alert.alert(
        '➕ Notifica Aggiunta',
        `Notifica "${notification.title}" aggiunta con successo!\n\nID: ${id}\n\nControlla il badge nel menu Impostazioni.`,
        [{ text: 'Perfetto!' }]
      );
      console.log(`✅ Notifica ${type} aggiunta:`, id);
      return id;
    } else {
      throw new Error('Impossibile aggiungere la notifica');
    }
  } catch (error) {
    console.error('❌ Errore aggiunta notifica:', error);
    Alert.alert(
      '❌ Errore',
      `Impossibile aggiungere la notifica:\n\n${error.message}`,
      [{ text: 'OK' }]
    );
    return null;
  }
};

export default quickTest;
export { clearTestNotifications, addSingleTestNotification };
