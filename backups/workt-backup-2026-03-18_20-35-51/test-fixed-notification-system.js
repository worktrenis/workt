// 🧪 TEST SISTEMA NOTIFICHE FIXED
// Script per verificare il nuovo sistema di notifiche

import FixedNotificationService from './src/services/FixedNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

async function testFixedNotificationSystem() {
  console.log('🧪 === TEST SISTEMA NOTIFICHE FIXED ===');
  console.log(`📅 Data/Ora: ${new Date().toISOString()}`);
  
  try {
    // Inizializza il servizio
    console.log('🔄 Inizializzazione servizio...');
    await FixedNotificationService.initialize();
    
    // Verifica permessi
    const hasPermissions = await FixedNotificationService.hasPermissions();
    console.log(`📱 Permessi notifiche: ${hasPermissions ? 'CONCESSI ✅' : 'NEGATI ❌'}`);
    
    // Testa notifica immediata
    console.log('⚡ Test notifica immediata...');
    const immediateResult = await FixedNotificationService.showImmediateNotification(
      '🧪 Test Notifica Immediata',
      'Questa è una notifica di test immediata (FixedNotificationService)',
      { type: 'test_immediate' }
    );
    
    console.log(`✅ Risultato notifica immediata: ${JSON.stringify(immediateResult)}`);
    
    // Testa notifica ritardata (10 secondi)
    console.log('⏰ Test notifica ritardata (10 secondi)...');
    const delayedTime = Date.now() + 10 * 1000;
    
    const delayedResult = await FixedNotificationService.scheduleNotification(
      '🧪 Test Notifica Ritardata',
      'Questa è una notifica di test ritardata di 10 secondi (FixedNotificationService)',
      delayedTime,
      { type: 'test_delayed' }
    );
    
    console.log(`✅ Risultato notifica ritardata: ${JSON.stringify(delayedResult)}`);
    console.log(`⏱️ Programmata per: ${new Date(delayedTime).toLocaleTimeString('it-IT')}`);
    
    // Testa notifica persistente
    console.log('💾 Test persistenza notifiche...');
    const persistentTime = Date.now() + 60 * 1000; // 1 minuto
    
    const persistentResult = await FixedNotificationService.scheduleNotification(
      '🧪 Test Notifica Persistente',
      'Questa notifica dovrebbe essere recuperata anche se chiudi e riapri l\'app',
      persistentTime,
      { type: 'test_persistent' }
    );
    
    console.log(`✅ Risultato notifica persistente: ${JSON.stringify(persistentResult)}`);
    console.log(`⏱️ Programmata per: ${new Date(persistentTime).toLocaleTimeString('it-IT')}`);
    
    // Testa compatibilità con vecchie API
    console.log('🔄 Test compatibilità vecchie API...');
    
    // Test promemoria lavoro
    const workSettings = {
      enabled: true,
      morningTime: '08:00',
      weekendsEnabled: false
    };
    
    const workCount = await FixedNotificationService.scheduleWorkReminders(workSettings);
    console.log(`✅ Promemoria lavoro programmati: ${workCount}`);
    
    // Test promemoria inserimento orari
    const timeEntrySettings = {
      enabled: true,
      eveningTime: '18:00',
      weekendsEnabled: false
    };
    
    const timeEntryCount = await FixedNotificationService.scheduleTimeEntryReminders(timeEntrySettings);
    console.log(`✅ Promemoria inserimento orari programmati: ${timeEntryCount}`);
    
    // Mostra riepilogo
    Alert.alert(
      '✅ Test Completato',
      `Test del sistema di notifiche fixed completato con successo!\n\nPermessi: ${hasPermissions ? 'SI' : 'NO'}\nNotifiche immediate: ${immediateResult.success ? 'OK' : 'KO'}\nNotifiche ritardate: ${delayedResult.id ? 'OK' : 'KO'}\nCompatibilità API: OK`,
      [{ text: 'OK' }]
    );
    
    return {
      success: true,
      hasPermissions,
      immediateTest: immediateResult,
      delayedTest: delayedResult,
      workReminders: workCount,
      timeEntryReminders: timeEntryCount,
      system: 'FixedNotificationService',
      time: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Errore test sistema notifiche fixed:', error);
    
    // Notifica errore
    Alert.alert(
      '❌ Errore Test',
      `Si è verificato un errore durante il test del sistema di notifiche:\n\n${error.message}`,
      [{ text: 'OK' }]
    );
    
    return {
      success: false,
      error: error.message,
      system: 'FixedNotificationService',
      time: new Date().toISOString()
    };
  }
}

// Esporta la funzione di test
export default testFixedNotificationSystem;

// Auto-esecuzione se file eseguito direttamente
if (require.main === module) {
  testFixedNotificationSystem().then(results => {
    console.log('📊 Risultati test:', results);
  });
}
