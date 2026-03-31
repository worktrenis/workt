// Test rapido per verificare i fix delle notifiche

async function testNotificationFix() {
  console.log('🧪 === TEST FIX NOTIFICHE ===');
  
  try {
    // Importa il servizio
    const NotificationService = (await import('./src/services/NotificationService')).default;
    
    // 1. Esegui la riparazione di emergenza
    console.log('🚨 Eseguendo riparazione di emergenza...');
    const result = await NotificationService.emergencyNotificationFix();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ Errore: ${result.reason}`);
    }
    
    // 2. Test notifica immediata
    console.log('📱 Test notifica tra 10 secondi...');
    await NotificationService.scheduleTestNotification(
      '🔧 Test Fix',
      'Se ricevi questa notifica al momento giusto, il fix funziona!',
      10
    );
    
    // 3. Verifica programmate
    const scheduled = await NotificationService.getScheduledNotifications();
    console.log(`📋 Notifiche programmate: ${scheduled.length}`);
    
    scheduled.forEach((notif, i) => {
      if (notif.content.data?.type === 'test_notification') {
        console.log(`  Test ${i+1}: ${notif.content.title}`);
        console.log(`    Trigger: ${JSON.stringify(notif.trigger)}`);
      }
    });
    
    console.log('✅ Test completato. Controlla che la notifica arrivi tra 10 secondi!');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esporta per uso
export default testNotificationFix;

// Se eseguito direttamente
if (typeof global !== 'undefined' && global.expo) {
  testNotificationFix();
}
