/**
 * Servizio per gestire gli aggiornamenti dei dati nell'app
 * Implementazione compatibile con React Native senza dipendenze esterne
 */
class DataUpdateService {
  constructor() {
    this.listeners = new Map();
    this.maxListeners = 50;
  }

  // Metodi base per gestione eventi
  emit(eventType, ...args) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error('DataUpdateService - Error in listener:', error);
        }
      });
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners.size >= this.maxListeners) {
      console.warn(`DataUpdateService - Max listeners (${this.maxListeners}) reached for event: ${eventType}`);
    }
    
    eventListeners.add(callback);
  }

  removeListener(eventType, callback) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  removeAllListeners(eventType) {
    if (eventType) {
      console.log('🧹 DataUpdateService - Removing all listeners for:', eventType);
      this.listeners.delete(eventType);
    } else {
      console.log('🧹 DataUpdateService - Removing all listeners');
      this.listeners.clear();
    }
  }

  listenerCount(eventType) {
    const eventListeners = this.listeners.get(eventType);
    return eventListeners ? eventListeners.size : 0;
  }

  // Notifica che i work entries sono stati modificati
  notifyWorkEntriesUpdated(action, data = {}) {
    console.log('📡 DataUpdateService - Notificando aggiornamento work entries:', action, data);
    this.emit('workEntriesUpdated', action, data);
  }

  // Notifica che le impostazioni sono state modificate
  notifySettingsUpdated(data = {}) {
    console.log('📡 DataUpdateService - Notificando aggiornamento impostazioni:', data);
    this.emit('settingsUpdated', data);
  }

  // Notifica che il calendario reperibilità è stato modificato
  notifyStandbyCalendarUpdated(data = {}) {
    console.log('📡 DataUpdateService - Notificando aggiornamento calendario reperibilità:', data);
    this.emit('standbyCalendarUpdated', data);
  }

  // Ascolta gli aggiornamenti dei work entries
  onWorkEntriesUpdated(callback) {
    this.on('workEntriesUpdated', callback);
    return () => this.removeListener('workEntriesUpdated', callback);
  }

  // Ascolta gli aggiornamenti delle impostazioni
  onSettingsUpdated(callback) {
    this.on('settingsUpdated', callback);
    return () => this.removeListener('settingsUpdated', callback);
  }

  // Ascolta gli aggiornamenti del calendario reperibilità
  onStandbyCalendarUpdated(callback) {
    this.on('standbyCalendarUpdated', callback);
    return () => this.removeListener('standbyCalendarUpdated', callback);
  }
}

// Istanza singleton
const dataUpdateService = new DataUpdateService();

export default dataUpdateService;
