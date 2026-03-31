/**
 * Test completo del sistema di notifiche corretto
 * Questo file testa la riparazione del problema di timing delle notifiche
 */

import NotificationService from './src/services/NotificationService.js';

async function testNotificationSystemFix() {
  console.log('🚨 === TEST SISTEMA NOTIFICHE CORRETTO ===');
  console.log('');

  try {
    // FASE 1: Pulizia completa
    console.log('🧹 FASE 1: Pulizia completa sistema...');
    const cleanup = await NotificationService.cleanupAllNotifications();
    console.log(`   Pulizia completata: ${cleanup}`);
    console.log('');

    // FASE 2: Test emergenza
    console.log('🚨 FASE 2: Test riparazione di emergenza...');
    const emergency = await NotificationService.emergencyNotificationFix();
    console.log(`   Riparazione: ${emergency.success ? '✅ OK' : '❌ FAILED'}`);
    if (emergency.success) {
      console.log(`   Notifiche programmate: ${emergency.notificationsScheduled}`);
    } else {
      console.log(`   Errore: ${emergency.reason}`);
    }
    console.log('');

    // FASE 3: Diagnostica avanzata
    console.log('🔧 FASE 3: Diagnostica avanzata...');
    const diagnostic = await NotificationService.advancedNotificationDiagnostic();
    
    if (diagnostic) {
      console.log(`   📊 Permessi: ${diagnostic.permissions}`);
      console.log(`   📊 Totali: ${diagnostic.totalScheduled}`);
      console.log(`   📊 Immediate (problema): ${diagnostic.immediateCount}`);
      console.log(`   📊 Future (corrette): ${diagnostic.futureCount}`);
      console.log(`   📊 Scadute: ${diagnostic.expiredCount}`);
      console.log(`   📊 Test: ${diagnostic.testResult ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ Diagnostica fallita');
    }
    console.log('');

    // FASE 4: Test specifico del timing
    console.log('⏰ FASE 4: Test timing specifico...');
    
    // Test notifica a 1 minuto
    console.log('   Programmando notifica test tra 1 minuto...');
    const test1min = await NotificationService.scheduleTestNotification(
      '🧪 Test 1 Minuto',
      'Questa dovrebbe arrivare tra 1 minuto',
      60
    );
    console.log(`   Test 1 min: ${test1min ? '✅' : '❌'}`);

    // Test notifica a 2 minuti
    console.log('   Programmando notifica test tra 2 minuti...');
    const test2min = await NotificationService.scheduleTestNotification(
      '🧪 Test 2 Minuti',
      'Questa dovrebbe arrivare tra 2 minuti',
      120
    );
    console.log(`   Test 2 min: ${test2min ? '✅' : '❌'}`);

    console.log('');

    // FASE 5: Verifica finale
    console.log('📊 FASE 5: Verifica finale...');
    setTimeout(async () => {
      try {
        const final = await NotificationService.getScheduledNotifications();
        console.log(`   Notifiche finali programmate: ${final.length}`);
        
        final.forEach((notif, i) => {
          if (notif.content.data?.type === 'test_notification') {
            const scheduledDate = notif.trigger?.date ? new Date(notif.trigger.date) : null;
            const now = new Date();
            const timeDiff = scheduledDate ? Math.floor((scheduledDate - now) / (1000 * 60)) : 'N/A';
            console.log(`     ${i+1}. ${notif.content.title} - tra ${timeDiff} minuti`);
          }
        });

        if (final.length === 0) {
          console.log('   ❌ PROBLEMA GRAVE: Nessuna notifica programmata!');
          console.log('   💡 Il sistema di notifiche potrebbe essere completamente rotto');
        } else {
          console.log('   ✅ Sistema sembra funzionare');
        }

      } catch (error) {
        console.error('   ❌ Errore verifica finale:', error);
      }
    }, 2000);

    console.log('🔔 CONTROLLA il telefono nelle prossime 2 ore per verificare che le notifiche arrivino ai tempi giusti!');
    console.log('');
    console.log('✅ Test completato');

  } catch (error) {
    console.error('❌ Errore nel test sistema:', error);
  }
}

// Esegui il test
testNotificationSystemFix();
