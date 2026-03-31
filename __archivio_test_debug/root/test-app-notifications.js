// 🧪 TEST PRATICO NOTIFICHE NELL'APP
// Test per verificare se le notifiche funzionano con app chiusa
// Ora: 23:14 del 29/07/25

console.log('🧪 === TEST PRATICO SUPER NOTIFICATION SERVICE ===');

async function testAppNotifications() {
  try {
    console.log('📱 Importando SuperNotificationService...');
    
    // Importa il servizio reale
    const notificationService = require('./src/services/SuperNotificationService.js');
    
    console.log('✅ SuperNotificationService importato con successo');
    console.log('📊 Tipo:', typeof notificationService);
    console.log('📊 Metodi disponibili:', Object.getOwnPropertyNames(Object.getPrototypeOf(notificationService)));
    
    // Test 1: Inizializzazione
    console.log('\n🚀 === TEST 1: INIZIALIZZAZIONE ===');
    console.log('Stato initialized:', notificationService.initialized);
    console.log('Stato hasPermission:', notificationService.hasPermission);
    
    // Test 2: Caricamento settings
    console.log('\n⚙️ === TEST 2: SETTINGS ===');
    const settings = await notificationService.getSettings();
    console.log('Settings caricati:', JSON.stringify(settings, null, 2));
    
    // Test 3: Statistiche notifiche attuali
    console.log('\n📊 === TEST 3: STATISTICHE ATTUALI ===');
    const stats = await notificationService.getNotificationStats();
    console.log('Notifiche programmate:', stats.scheduled);
    if (stats.notifications && stats.notifications.length > 0) {
      console.log('Dettagli notifiche:');
      stats.notifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} - ${notif.triggerDate}`);
      });
    }
    
    // Test 4: Test notifica immediata (per verificare permessi)
    console.log('\n🧪 === TEST 4: NOTIFICA IMMEDIATA ===');
    console.log('Inviando notifica test immediata...');
    const testResult = await notificationService.testNotificationSystem();
    console.log('Risultato test:', testResult);
    
    // Test 5: Programmazione notifiche per domani
    console.log('\n📅 === TEST 5: PROGRAMMAZIONE DOMANI ===');
    console.log('Programmando notifiche per domani mattina...');
    
    // Forza cancellazione notifiche esistenti
    await notificationService.cancelAllNotifications();
    console.log('🧹 Notifiche esistenti cancellate');
    
    // Programma nuove notifiche
    const scheduledCount = await notificationService.scheduleNotifications(settings, true);
    console.log(`📱 Programmate ${scheduledCount} notifiche`);
    
    // Verifica programmazione
    const newStats = await notificationService.getNotificationStats();
    console.log(`✅ Verifica: ${newStats.scheduled} notifiche in coda`);
    
    if (newStats.notifications && newStats.notifications.length > 0) {
      console.log('📋 Notifiche programmate:');
      newStats.notifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title}`);
        console.log(`     ⏰ Programmata per: ${notif.triggerDate}`);
      });
    }
    
    // Test 6: Verifica timing
    console.log('\n⏰ === TEST 6: VERIFICA TIMING ===');
    const now = new Date();
    const tomorrow8am = new Date();
    tomorrow8am.setDate(tomorrow8am.getDate() + 1);
    tomorrow8am.setHours(8, 0, 0, 0);
    
    console.log('Ora attuale:', now.toLocaleString('it-IT'));
    console.log('Prima notifica dovrebbe arrivare:', tomorrow8am.toLocaleString('it-IT'));
    console.log('Tra:', Math.round((tomorrow8am.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10, 'ore');
    
    console.log('\n🎉 === RISULTATI FINALI ===');
    console.log(`✅ SuperNotificationService funzionante: ${notificationService.initialized}`);
    console.log(`✅ Permessi concessi: ${notificationService.hasPermission}`);
    console.log(`✅ Notifiche programmate: ${newStats.scheduled}`);
    console.log(`✅ Prossima notifica: domani alle 8:00`);
    
    if (scheduledCount > 0) {
      console.log('\n🚀 SUCCESSO! Le notifiche sono programmate correttamente.');
      console.log('📱 Chiudi l\'app e aspetta fino a domani mattina alle 8:00 per verificare.');
      console.log('🔔 Se arriva la notifica domani mattina, il sistema funziona perfettamente!');
    } else {
      console.log('\n⚠️ ATTENZIONE: Nessuna notifica programmata.');
      console.log('🔧 Verifica i permessi nelle impostazioni del telefono.');
    }
    
  } catch (error) {
    console.error('❌ Errore test:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAppNotifications();
