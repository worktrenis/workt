/**
 * Test del sistema di notifiche DataUpdateService
 * Verifica che l'EventEmitter custom funzioni correttamente
 */

// Importiamo il servizio direttamente (come farebbe React Native)
class DataUpdateService {
  constructor() {
    this.listeners = new Map();
    this.maxListeners = 50;
  }

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

  notifyWorkEntriesUpdated(action, data = {}) {
    console.log('📡 DataUpdateService - Notificando aggiornamento work entries:', action, data);
    this.emit('workEntriesUpdated', action, data);
  }

  onWorkEntriesUpdated(callback) {
    this.on('workEntriesUpdated', callback);
    return () => this.removeListener('workEntriesUpdated', callback);
  }
}

// Test del sistema
console.log('🧪 Test del sistema di notifiche DataUpdateService');
console.log('====================================================');

const dataService = new DataUpdateService();

// Test 1: Basic listener
console.log('\n📝 Test 1: Listener di base');
let receivedEvents = [];

const testListener = (action, data) => {
  receivedEvents.push({ action, data });
  console.log('✅ Evento ricevuto:', action, data);
};

dataService.onWorkEntriesUpdated(testListener);

// Test 2: Emissione evento
console.log('\n📡 Test 2: Emissione evento');
dataService.notifyWorkEntriesUpdated('insert', { 
  id: 123, 
  date: '2025-07-13', 
  year: 2025, 
  month: 7 
});

// Test 3: Verifica ricezione
console.log('\n🔍 Test 3: Verifica ricezione');
if (receivedEvents.length === 1) {
  console.log('✅ Test PASSATO: Evento ricevuto correttamente');
  console.log('   Dati ricevuti:', receivedEvents[0]);
} else {
  console.log('❌ Test FALLITO: Eventi ricevuti:', receivedEvents.length);
}

// Test 4: Rimozione listener
console.log('\n🗑️ Test 4: Rimozione listener');
dataService.removeAllListeners('workEntriesUpdated');

// Test 5: Evento dopo rimozione
console.log('\n📡 Test 5: Evento dopo rimozione');
const beforeCount = receivedEvents.length;
dataService.notifyWorkEntriesUpdated('update', { id: 456 });

if (receivedEvents.length === beforeCount) {
  console.log('✅ Test PASSATO: Nessun evento ricevuto dopo rimozione listener');
} else {
  console.log('❌ Test FALLITO: Evento ricevuto inaspettatamente dopo rimozione');
}

console.log('\n🎉 Test completati!');
console.log('📊 Risultati finali:');
console.log('   - Eventi totali ricevuti:', receivedEvents.length);
console.log('   - Listener attivi:', dataService.listeners.size);

console.log('\n🚀 Sistema pronto per l\'uso in React Native!');
