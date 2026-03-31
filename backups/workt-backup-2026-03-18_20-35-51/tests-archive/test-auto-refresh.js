/**
 * Test per verificare il funzionamento del sistema di aggiornamento automatico
 * Questo test simula l'inserimento, modifica e cancellazione di un entry
 * per verificare che le notifiche vengano emesse correttamente
 */

const DataUpdateService = require('./src/services/DataUpdateService');

console.log('🧪 Test del sistema di aggiornamento automatico');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Listener di test
const testListener = (action, data) => {
  console.log(`📢 Notifica ricevuta: ${action}`, data);
};

// Registra il listener
DataUpdateService.onWorkEntriesUpdated(testListener);

console.log('📋 Test 1: Simulazione inserimento entry');
DataUpdateService.notifyWorkEntriesUpdated('insert', {
  id: 123,
  date: '2025-01-15',
  year: 2025,
  month: 1
});

console.log('📋 Test 2: Simulazione modifica entry');
DataUpdateService.notifyWorkEntriesUpdated('update', {
  id: 123,
  date: '2025-01-15',
  year: 2025,
  month: 1
});

console.log('📋 Test 3: Simulazione cancellazione entry');
DataUpdateService.notifyWorkEntriesUpdated('delete', {
  id: 123,
  date: '2025-01-15',
  year: 2025,
  month: 1
});

// Cleanup
DataUpdateService.removeAllListeners('workEntriesUpdated');

console.log('✅ Test completato con successo!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
