// 🔔 SISTEMA PERSISTENZA NOTIFICHE DI SISTEMA
// Servizio per gestire la persistenza delle notifiche del menu notifiche

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const STORAGE_KEYS = {
  SYSTEM_NOTIFICATIONS: 'system_notifications_v1',
  NOTIFICATION_HISTORY: 'notification_history_v1',
  NOTIFICATION_SETTINGS: 'system_notification_settings_v1',
  DISMISSED_NOTIFICATIONS: 'dismissed_notifications_v1'
};

class SystemNotificationPersistenceService {
  constructor() {
    this.notifications = [];
    this.history = [];
    this.settings = {
      maxNotifications: 50,        // Massimo numero di notifiche da mantenere
      maxHistoryDays: 30,         // Giorni di cronologia da mantenere
      autoCleanup: true,          // Pulizia automatica
      enablePersistence: true,    // Persistenza abilitata
      showDismissed: false        // Mostra notifiche rimosse nell'archivio
    };
    this.dismissedNotifications = new Set();
    this.initialized = false;
    
    console.log('🔔 SystemNotificationPersistenceService inizializzato');
  }

  // 🔧 INIZIALIZZAZIONE
  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('🔄 Inizializzazione sistema persistenza notifiche...');
      
      // Carica dati esistenti
      await this.loadNotifications();
      await this.loadHistory();
      await this.loadSettings();
      await this.loadDismissedNotifications();
      
      // Pulizia automatica se abilitata
      if (this.settings.autoCleanup) {
        await this.performCleanup();
      }
      
      this.initialized = true;
      console.log('✅ Sistema persistenza notifiche inizializzato');
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione sistema persistenza:', error);
      return false;
    }
  }

  // 📱 GESTIONE NOTIFICHE
  
  /**
   * Aggiunge una notifica di sistema
   * @param {Object} notification - Oggetto notifica
   * @param {string} notification.id - ID univoco
   * @param {string} notification.title - Titolo
   * @param {string} notification.message - Messaggio
   * @param {string} notification.type - Tipo (info, warning, error, success)
   * @param {string} notification.category - Categoria (system, backup, update, etc.)
   * @param {Object} notification.data - Dati aggiuntivi
   * @param {Date} notification.timestamp - Data e ora
   * @param {boolean} notification.persistent - Se deve rimanere dopo riavvio
   * @param {number} notification.priority - Priorità (1-5, 5 più alta)
   */
  async addNotification(notification) {
    try {
      if (!this.initialized) await this.initialize();
      
      const systemNotification = {
        id: notification.id || `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title || 'Notifica Sistema',
        message: notification.message || '',
        type: notification.type || 'info', // info, warning, error, success
        category: notification.category || 'system',
        data: notification.data || {},
        timestamp: notification.timestamp || new Date(),
        persistent: notification.persistent !== false, // Default true
        priority: notification.priority || 3,
        read: false,
        dismissed: false,
        actions: notification.actions || []
      };
      
      // Verifica duplicati
      const existingIndex = this.notifications.findIndex(n => n.id === systemNotification.id);
      if (existingIndex >= 0) {
        // Aggiorna notifica esistente
        this.notifications[existingIndex] = { ...this.notifications[existingIndex], ...systemNotification };
      } else {
        // Aggiungi nuova notifica
        this.notifications.unshift(systemNotification);
      }
      
      // Limita numero di notifiche
      if (this.notifications.length > this.settings.maxNotifications) {
        const removed = this.notifications.splice(this.settings.maxNotifications);
        console.log(`🧹 Rimosse ${removed.length} notifiche per limite massimo`);
      }
      
      // Salva immediatamente se persistente
      if (systemNotification.persistent) {
        await this.saveNotifications();
      }
      
      // Aggiungi alla cronologia
      await this.addToHistory('added', systemNotification);
      
      console.log(`✅ Notifica sistema aggiunta: ${systemNotification.title}`);
      return systemNotification;
    } catch (error) {
      console.error('❌ Errore aggiunta notifica sistema:', error);
      return null;
    }
  }

  /**
   * Rimuove una notifica
   */
  async removeNotification(notificationId) {
    try {
      const index = this.notifications.findIndex(n => n.id === notificationId);
      if (index >= 0) {
        const notification = this.notifications[index];
        this.notifications.splice(index, 1);
        
        // Aggiungi ai rimossi se richiesto
        if (this.settings.showDismissed) {
          this.dismissedNotifications.add(notificationId);
          await this.saveDismissedNotifications();
        }
        
        await this.saveNotifications();
        await this.addToHistory('removed', notification);
        
        console.log(`🗑️ Notifica rimossa: ${notification.title}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore rimozione notifica:', error);
      return false;
    }
  }

  /**
   * Segna una notifica come letta
   */
  async markAsRead(notificationId) {
    try {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        notification.readAt = new Date();
        
        await this.saveNotifications();
        await this.addToHistory('read', notification);
        
        console.log(`👁️ Notifica segnata come letta: ${notification.title}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore segna come letta:', error);
      return false;
    }
  }

  /**
   * Ottiene tutte le notifiche
   */
  getNotifications(options = {}) {
    let notifications = [...this.notifications];
    
    // Filtri
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    if (options.category) {
      notifications = notifications.filter(n => n.category === options.category);
    }
    
    if (options.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }
    
    if (options.minPriority) {
      notifications = notifications.filter(n => n.priority >= options.minPriority);
    }
    
    // Ordinamento
    if (options.sortBy === 'priority') {
      notifications.sort((a, b) => b.priority - a.priority);
    } else {
      // Default: per timestamp (più recenti prima)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    return notifications;
  }

  /**
   * Ottiene statistiche notifiche
   */
  getNotificationStats() {
    const unread = this.notifications.filter(n => !n.read).length;
    const byType = {};
    const byCategory = {};
    
    this.notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
    });
    
    return {
      total: this.notifications.length,
      unread,
      read: this.notifications.length - unread,
      byType,
      byCategory,
      highPriority: this.notifications.filter(n => n.priority >= 4).length
    };
  }

  // 📚 GESTIONE CRONOLOGIA
  
  async addToHistory(action, notification) {
    try {
      const historyEntry = {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action, // added, removed, read, dismissed
        notificationId: notification.id,
        notificationTitle: notification.title,
        timestamp: new Date(),
        data: {
          type: notification.type,
          category: notification.category
        }
      };
      
      this.history.unshift(historyEntry);
      
      // Limita cronologia per giorni
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.maxHistoryDays);
      
      this.history = this.history.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      
      await this.saveHistory();
    } catch (error) {
      console.error('❌ Errore aggiunta cronologia:', error);
    }
  }

  getHistory(options = {}) {
    let history = [...this.history];
    
    if (options.action) {
      history = history.filter(h => h.action === options.action);
    }
    
    if (options.category) {
      history = history.filter(h => h.data.category === options.category);
    }
    
    if (options.limit) {
      history = history.slice(0, options.limit);
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // ⚙️ GESTIONE IMPOSTAZIONI
  
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      console.log('✅ Impostazioni persistenza aggiornate');
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni:', error);
      return false;
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  // 🧹 PULIZIA E MANUTENZIONE
  
  async performCleanup() {
    try {
      console.log('🧹 Avvio pulizia sistema notifiche...');
      
      let cleanedCount = 0;
      
      // Rimuovi notifiche vecchie (oltre il limite di giorni)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.maxHistoryDays);
      
      const originalLength = this.notifications.length;
      this.notifications = this.notifications.filter(notification => {
        const notificationDate = new Date(notification.timestamp);
        const keep = notificationDate > cutoffDate || notification.priority >= 4; // Mantieni alta priorità
        if (!keep) cleanedCount++;
        return keep;
      });
      
      // Pulisci cronologia vecchia
      this.history = this.history.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      
      // Pulisci notifiche rimosse vecchie
      const dismissedArray = Array.from(this.dismissedNotifications);
      // Per semplicità, mantieni solo gli ultimi 100 ID rimossi
      if (dismissedArray.length > 100) {
        this.dismissedNotifications = new Set(dismissedArray.slice(-100));
      }
      
      // Salva modifiche
      await this.saveAll();
      
      console.log(`🧹 Pulizia completata: rimosse ${cleanedCount} notifiche vecchie`);
      return { cleanedCount, remainingNotifications: this.notifications.length };
    } catch (error) {
      console.error('❌ Errore pulizia:', error);
      return { cleanedCount: 0, error: error.message };
    }
  }

  async clearAllNotifications() {
    try {
      const count = this.notifications.length;
      this.notifications = [];
      await this.saveNotifications();
      
      console.log(`🗑️ Cancellate tutte le ${count} notifiche sistema`);
      return count;
    } catch (error) {
      console.error('❌ Errore cancellazione totale:', error);
      return 0;
    }
  }

  async clearHistory() {
    try {
      const count = this.history.length;
      this.history = [];
      await this.saveHistory();
      
      console.log(`🗑️ Cancellata cronologia di ${count} elementi`);
      return count;
    } catch (error) {
      console.error('❌ Errore cancellazione cronologia:', error);
      return 0;
    }
  }

  // 💾 PERSISTENZA DATI
  
  async saveAll() {
    await Promise.all([
      this.saveNotifications(),
      this.saveHistory(),
      this.saveSettings(),
      this.saveDismissedNotifications()
    ]);
  }

  async saveNotifications() {
    try {
      const persistentNotifications = this.notifications.filter(n => n.persistent);
      await AsyncStorage.setItem(STORAGE_KEYS.SYSTEM_NOTIFICATIONS, JSON.stringify(persistentNotifications));
    } catch (error) {
      console.error('❌ Errore salvataggio notifiche:', error);
    }
  }

  async loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYSTEM_NOTIFICATIONS);
      if (stored) {
        this.notifications = JSON.parse(stored);
        console.log(`📱 Caricate ${this.notifications.length} notifiche sistema persistenti`);
      }
    } catch (error) {
      console.error('❌ Errore caricamento notifiche:', error);
      this.notifications = [];
    }
  }

  async saveHistory() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(this.history));
    } catch (error) {
      console.error('❌ Errore salvataggio cronologia:', error);
    }
  }

  async loadHistory() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      if (stored) {
        this.history = JSON.parse(stored);
        console.log(`📚 Caricata cronologia di ${this.history.length} elementi`);
      }
    } catch (error) {
      console.error('❌ Errore caricamento cronologia:', error);
      this.history = [];
    }
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(this.settings));
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni:', error);
    }
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
        console.log('⚙️ Impostazioni persistenza caricate');
      }
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni:', error);
    }
  }

  async saveDismissedNotifications() {
    try {
      const dismissed = Array.from(this.dismissedNotifications);
      await AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_NOTIFICATIONS, JSON.stringify(dismissed));
    } catch (error) {
      console.error('❌ Errore salvataggio notifiche rimosse:', error);
    }
  }

  async loadDismissedNotifications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_NOTIFICATIONS);
      if (stored) {
        const dismissed = JSON.parse(stored);
        this.dismissedNotifications = new Set(dismissed);
        console.log(`🗑️ Caricate ${dismissed.length} notifiche rimosse`);
      }
    } catch (error) {
      console.error('❌ Errore caricamento notifiche rimosse:', error);
      this.dismissedNotifications = new Set();
    }
  }

  // 🔧 UTILITÀ
  
  /**
   * Esporta tutte le notifiche per backup
   */
  async exportNotifications() {
    try {
      const exportData = {
        notifications: this.notifications,
        history: this.history,
        settings: this.settings,
        dismissed: Array.from(this.dismissedNotifications),
        exportDate: new Date(),
        version: '1.0'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Errore esportazione notifiche:', error);
      return null;
    }
  }

  /**
   * Importa notifiche da backup
   */
  async importNotifications(importData) {
    try {
      const data = typeof importData === 'string' ? JSON.parse(importData) : importData;
      
      if (data.notifications) {
        this.notifications = data.notifications;
      }
      
      if (data.history) {
        this.history = data.history;
      }
      
      if (data.settings) {
        this.settings = { ...this.settings, ...data.settings };
      }
      
      if (data.dismissed) {
        this.dismissedNotifications = new Set(data.dismissed);
      }
      
      await this.saveAll();
      
      console.log('✅ Notifiche importate con successo');
      return true;
    } catch (error) {
      console.error('❌ Errore importazione notifiche:', error);
      return false;
    }
  }

  /**
   * Crea notifiche di sistema predefinite per test
   */
  async createTestNotifications() {
    const testNotifications = [
      {
        title: 'Sistema Inizializzato',
        message: 'Il sistema di notifiche persistenti è stato inizializzato correttamente',
        type: 'success',
        category: 'system',
        priority: 3
      },
      {
        title: 'Backup Completato',
        message: 'Backup automatico completato con successo alle ' + new Date().toLocaleTimeString(),
        type: 'info',
        category: 'backup',
        priority: 2
      },
      {
        title: 'Attenzione',
        message: 'Questa è una notifica di avvertimento di test',
        type: 'warning',
        category: 'system',
        priority: 4
      }
    ];

    for (const notification of testNotifications) {
      await this.addNotification(notification);
    }

    console.log('✅ Notifiche di test create');
    return testNotifications.length;
  }
}

// Crea istanza singleton
const SystemNotificationPersistence = new SystemNotificationPersistenceService();

export default SystemNotificationPersistence;
 