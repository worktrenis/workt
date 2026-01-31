/**
 * Test semplificato per verificare i messaggi delle notifiche di reperibilità
 * Da usare nelle DevTools dell'app React Native
 */

// Copia e incolla questo codice nella console dell'app per testare:

/*
// Test della funzione syncStandbyNotificationsWithCalendar
(async () => {
  try {
    console.log('🧪 Testing syncStandbyNotificationsWithCalendar...');
    
    // Importa il servizio (adatta il path se necessario)
    const NotificationService = require('./src/services/NotificationService').default;
    
    const result = await NotificationService.syncStandbyNotificationsWithCalendar();
    
    console.log('📊 Risultato test:');
    console.log('Count:', result.count);
    console.log('Dates:', result.dates);
    console.log('Message:', result.message);
    
    // Verifica che non contenga "undefined"
    if (result.message && result.message.includes('undefined')) {
      console.error('❌ PROBLEMA: Messaggio contiene "undefined"');
    } else {
      console.log('✅ RISOLTO: Messaggio corretto senza "undefined"');
    }
    
  } catch (error) {
    console.error('Errore test:', error);
  }
})();
*/

// Alternative: Test diretto nell'app React Native
export const testStandbySync = async () => {
  try {
    console.log('🧪 Test sincronizzazione reperibilità...');
    
    const NotificationService = require('../services/NotificationService').default;
    const result = await NotificationService.syncStandbyNotificationsWithCalendar();
    
    console.log('📊 Risultato:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Errore test:', error);
    return { error: error.message };
  }
};

export default testStandbySync;
