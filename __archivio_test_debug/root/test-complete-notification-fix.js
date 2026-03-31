// 🧪 TEST DEL NUOVO SISTEMA DI NOTIFICHE CORRETTO
// Esegui questo file per verificare che il sistema funzioni correttamente

import FixedNotificationService from './src/services/FixedNotificationService';
import { Alert } from 'react-native';

// Funzione principale di test
export default async function testCompleteNotificationSystem() {
  console.log('🧪 === TEST COMPLETO SISTEMA NOTIFICHE CORRETTO ===');
  console.log(`📅 Data/Ora: ${new Date().toISOString()}`);
  
  try {
    // FASE 1: Inizializzazione
    console.log('\n🔄 FASE 1: INIZIALIZZAZIONE');
    const initialized = await FixedNotificationService.initialize();
    console.log(`✅ Sistema inizializzato: ${initialized ? 'OK' : 'KO'}`);
    
    // FASE 2: Verifica permessi
    console.log('\n🔑 FASE 2: VERIFICA PERMESSI');
    const hasPermissions = await FixedNotificationService.hasPermissions();
    console.log(`✅ Permessi: ${hasPermissions ? 'CONCESSI' : 'NEGATI'}`);
    
    if (!hasPermissions) {
      console.log('📱 Richiedo permessi...');
      const granted = await FixedNotificationService.requestPermissions();
      console.log(`✅ Permessi dopo richiesta: ${granted ? 'CONCESSI' : 'NEGATI'}`);
    }
    
    // FASE 3: Test notifica immediata
    console.log('\n⚡ FASE 3: TEST NOTIFICA IMMEDIATA');
    const immediateResult = await FixedNotificationService.showImmediateNotification(
      '🧪 Test Notifica Immediata',
      'Sistema notifiche corretto funzionante!',
      { type: 'test_immediate' }
    );
    console.log(`✅ Risultato notifica immediata: ${JSON.stringify(immediateResult)}`);
    
    // FASE 4: Test notifica ritardata
    console.log('\n⏰ FASE 4: TEST NOTIFICA RITARDATA (10 secondi)');
    const delayedTime = Date.now() + 10 * 1000;
    const delayedResult = await FixedNotificationService.scheduleNotification(
      '🧪 Test Notifica Ritardata',
      'Questa notifica è stata programmata per 10 secondi dopo.',
      delayedTime,
      { type: 'test_delayed' }
    );
    console.log(`✅ Risultato notifica ritardata: ${JSON.stringify(delayedResult)}`);
    console.log(`⏱️ Programmata per: ${new Date(delayedTime).toLocaleTimeString('it-IT')}`);
    
    // FASE 5: Test API compatibilità
    console.log('\n🔄 FASE 5: TEST API COMPATIBILITÀ');
    
    // Promemoria lavoro
    const workSettings = {
      enabled: true,
      morningTime: '08:00',
      weekendsEnabled: false
    };
    const workCount = await FixedNotificationService.scheduleWorkReminders(workSettings);
    console.log(`✅ Promemoria lavoro programmati: ${workCount}`);
    
    // Promemoria inserimento orari
    const timeEntrySettings = {
      enabled: true,
      eveningTime: '18:00',
      weekendsEnabled: false
    };
    const timeEntryCount = await FixedNotificationService.scheduleTimeEntryReminders(timeEntrySettings);
    console.log(`✅ Promemoria inserimento orari programmati: ${timeEntryCount}`);
    
    // FASE 6: Cancella notifiche
    console.log('\n🧹 FASE 6: TEST CANCELLAZIONE NOTIFICHE');
    const cancelResult = await FixedNotificationService.cancelAllNotifications();
    console.log(`✅ Notifiche cancellate: ${cancelResult ? 'OK' : 'KO'}`);
    
    // Risultato finale
    const results = {
      initialized,
      hasPermissions,
      immediateTest: immediateResult,
      delayedTest: delayedResult,
      workReminders: workCount,
      timeEntryReminders: timeEntryCount,
      cancelResult,
      system: 'FixedNotificationService',
      time: new Date().toISOString()
    };
    
    console.log('\n📊 RISULTATI FINALI TEST:');
    console.log(JSON.stringify(results, null, 2));
    
    Alert.alert(
      '✅ Test Completato',
      `Il sistema di notifiche è stato testato con successo!\n\nPermessi: ${hasPermissions ? 'OK' : 'KO'}\nNotifiche immediate: ${immediateResult.success ? 'OK' : 'KO'}\nNotifiche ritardate: ${delayedResult.id ? 'OK' : 'KO'}\nPromemoria programmati: ${workCount + timeEntryCount}`,
      [{ text: 'OK' }]
    );
    
    return results;
  } catch (error) {
    console.error('❌ ERRORE DURANTE IL TEST:', error);
    
    Alert.alert(
      '❌ Errore Test',
      `Si è verificato un errore durante il test del sistema di notifiche:\n\n${error.message}`,
      [{ text: 'OK' }]
    );
    
    return {
      success: false,
      error: error.message,
      time: new Date().toISOString()
    };
  }
}

// Esegue automaticamente se chiamato direttamente
if (require.main === module) {
  testCompleteNotificationSystem().then(results => {
    console.log('Test completato.');
  });
}
