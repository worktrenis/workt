import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

class UpdateNotificationService {
  constructor() {
    this.STORAGE_KEY = 'manual_update_notifications';
    this.CHANNEL_ID = 'app-updates';
    this.setupNotificationChannel();
  }

  async setupNotificationChannel() {
    try {
      await Notifications.setNotificationChannelAsync(this.CHANNEL_ID, {
        name: 'Aggiornamenti App',
        description: 'Notifiche per aggiornamenti disponibili',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });
    } catch (error) {
      console.error('❌ Errore setup canale notifiche:', error);
    }
  }

  /**
   * Invia notifica quando è disponibile un aggiornamento
   */
  async notifyUpdateAvailable(updateInfo) {
    try {
      const { versionName, changelog, releaseDate } = updateInfo;
      
      // Salva info aggiornamento per dopo
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_${versionName}`, 
        JSON.stringify(updateInfo)
      );

      // Mostra notifica
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚀 Aggiornamento Disponibile',
          body: `WorkT v${versionName} è pronto! Tocca per aggiornare dalle impostazioni.`,
          categoryIdentifier: 'update-available',
          data: {
            type: 'update-available',
            version: versionName,
            timestamp: Date.now()
          },
          sound: 'default',
        },
        trigger: null, // Mostra immediatamente
      });

      console.log(`📱 Notifica inviata per aggiornamento v${versionName}`);
      return true;
    } catch (error) {
      console.error('❌ Errore invio notifica aggiornamento:', error);
      return false;
    }
  }

  /**
   * Rimuove notifiche di aggiornamento già processate
   */
  async clearUpdateNotification(versionName) {
    try {
      await AsyncStorage.removeItem(`${this.STORAGE_KEY}_${versionName}`);
      
      // Cancella notifiche con quella versione
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of notifications) {
        if (notification.content.data?.version === versionName) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log(`🧹 Rimossa notifica per v${versionName}`);
    } catch (error) {
      console.error('❌ Errore rimozione notifica:', error);
    }
  }

  /**
   * Ottiene info degli aggiornamenti pendenti
   */
  async getPendingUpdates() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const updateKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY));
      
      const updates = [];
      for (const key of updateKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          updates.push(JSON.parse(data));
        }
      }
      
      return updates.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    } catch (error) {
      console.error('❌ Errore recupero aggiornamenti pendenti:', error);
      return [];
    }
  }

  /**
   * Pulisce tutte le notifiche di aggiornamento
   */
  async clearAllUpdateNotifications() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const updateKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY));
      
      if (updateKeys.length > 0) {
        await AsyncStorage.multiRemove(updateKeys);
        console.log(`🧹 Rimosse ${updateKeys.length} notifiche di aggiornamento`);
      }
    } catch (error) {
      console.error('❌ Errore pulizia notifiche:', error);
    }
  }
}

export default new UpdateNotificationService();
