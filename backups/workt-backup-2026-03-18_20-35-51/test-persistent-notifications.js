// 🧪 TEST SISTEMA NOTIFICHE PERSISTENTI - Verifica Soluzione Interruzioni
// Testa il nuovo PersistentNotificationService per risolvere il problema 2-3 notifiche

import PersistentNotificationService from './src/services/PersistentNotificationService';
import * as Notifications from 'expo-notifications';

const testPersistentNotifications = async () => {
  console.log('🧪 TEST SISTEMA NOTIFICHE PERSISTENTI');
  console.log('=====================================');
  
  try {
    // Test 1: Inizializzazione
    console.log('\n📱 Test 1: Inizializzazione servizio...');
    const initialized = await PersistentNotificationService.initialize();
    console.log(`✅ Inizializzazione: ${initialized ? 'SUCCESSO' : 'FALLITA'}`);
    
    if (!initialized) {
      console.log('❌ Impossibile continuare i test senza inizializzazione');
      return;
    }

    // Test 2: Statistiche iniziali
    console.log('\n📊 Test 2: Statistiche iniziali...');
    const initialStats = await PersistentNotificationService.getStatistics();
    console.log('📈 Statistiche iniziali:', initialStats);

    // Test 3: Pulizia e preparazione
    console.log('\n🧹 Test 3: Pulizia notifiche esistenti...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    
    const afterCleanup = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`✅ Notifiche dopo pulizia: ${afterCleanup.length} (dovrebbe essere 0)`);

    // Test 4: Riprogrammazione emergenza
    console.log('\n🚨 Test 4: Riprogrammazione emergenza...');
    const rescheduled = await PersistentNotificationService.forceReschedule();
    console.log(`✅ Notifiche riprogrammate: ${rescheduled}`);

    // Test 5: Verifica notifiche programmate
    console.log('\n📅 Test 5: Verifica notifiche programmate...');
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Totale notifiche programmate: ${scheduledNotifications.length}`);
    
    if (scheduledNotifications.length > 0) {
      console.log('\n📋 Prime 5 notifiche programmate:');
      scheduledNotifications.slice(0, 5).forEach((notif, index) => {
        const trigger = notif.trigger;
        const triggerDate = trigger.type === 'date' ? new Date(trigger.date) : 'Trigger non-date';
        console.log(`  ${index + 1}. ${notif.content.title}`);
        console.log(`     📅 Data: ${triggerDate instanceof Date ? triggerDate.toLocaleString('it-IT') : triggerDate}`);
        console.log(`     🏷️ Tipo: ${notif.content.data?.type || 'Non specificato'}`);
      });
    }

    // Test 6: Controllo soglia minima
    console.log('\n⚠️ Test 6: Controllo soglia minima...');
    const statsAfterReschedule = await PersistentNotificationService.getStatistics();
    console.log('📈 Statistiche dopo riprogrammazione:', statsAfterReschedule);
    
    if (statsAfterReschedule.needsReschedule) {
      console.log('🚨 ATTENZIONE: Il sistema indica che serve ancora riprogrammazione');
    } else {
      console.log('✅ Soglia minima raggiunta, sistema stabile');
    }

    // Test 7: Simulazione controllo periodico
    console.log('\n⏰ Test 7: Simulazione controllo periodico...');
    await PersistentNotificationService.checkAndMaintainNotifications();
    
    const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Notifiche finali programmate: ${finalScheduled.length}`);

    // Test 8: Verifica distribuzione temporale
    console.log('\n📈 Test 8: Analisi distribuzione temporale...');
    const now = new Date();
    const timeDistribution = {
      next24h: 0,
      next3days: 0,
      next7days: 0,
      next14days: 0,
      future: 0
    };

    finalScheduled.forEach(notif => {
      if (notif.trigger.type === 'date') {
        const notifDate = new Date(notif.trigger.date);
        const timeDiff = notifDate.getTime() - now.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        if (daysDiff <= 1) timeDistribution.next24h++;
        else if (daysDiff <= 3) timeDistribution.next3days++;
        else if (daysDiff <= 7) timeDistribution.next7days++;
        else if (daysDiff <= 14) timeDistribution.next14days++;
        else timeDistribution.future++;
      }
    });

    console.log('📊 Distribuzione temporale notifiche:');
    console.log(`   📅 Prossime 24h: ${timeDistribution.next24h}`);
    console.log(`   📅 Prossimi 3 giorni: ${timeDistribution.next3days}`);
    console.log(`   📅 Prossimi 7 giorni: ${timeDistribution.next7days}`);
    console.log(`   📅 Prossimi 14 giorni: ${timeDistribution.next14days}`);
    console.log(`   📅 Oltre 14 giorni: ${timeDistribution.future}`);

    // Test 9: Verifica per tipo
    console.log('\n🏷️ Test 9: Analisi per tipo notifica...');
    const typeDistribution = {};
    finalScheduled.forEach(notif => {
      const type = notif.content.data?.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    console.log('📊 Distribuzione per tipo:');
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`   🏷️ ${type}: ${count}`);
    });

    // Risultato finale
    console.log('\n🎯 RISULTATO TEST');
    console.log('================');
    
    const success = finalScheduled.length >= statsAfterReschedule.threshold;
    console.log(`✅ Test ${success ? 'SUPERATO' : 'FALLITO'}`);
    console.log(`📊 Notifiche programmate: ${finalScheduled.length}/${statsAfterReschedule.threshold}`);
    console.log(`🔄 Sistema persistente: ${statsAfterReschedule.initialized ? 'ATTIVO' : 'INATTIVO'}`);
    console.log(`🔔 Permessi: ${statsAfterReschedule.hasPermission ? 'CONCESSI' : 'NEGATI'}`);

    if (success) {
      console.log('\n🎉 SISTEMA NOTIFICHE PERSISTENTI FUNZIONANTE!');
      console.log('• Notifiche programmate sufficienti per continuità');
      console.log('• Controllo automatico ogni 30 minuti');
      console.log('• Riprogrammazione automatica sotto soglia');
      console.log('• Sistema anti-interruzione attivo');
    } else {
      console.log('\n⚠️ SISTEMA NECESSITA ATTENZIONE');
      console.log('• Verificare permessi notifiche');
      console.log('• Controllare impostazioni notifiche');
      console.log('• Verificare limite sistema operativo');
    }

    return {
      success,
      totalNotifications: finalScheduled.length,
      threshold: statsAfterReschedule.threshold,
      timeDistribution,
      typeDistribution,
      stats: statsAfterReschedule
    };

  } catch (error) {
    console.error('\n❌ ERRORE DURANTE TEST:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test rapido per app aperta
const quickPersistentTest = async () => {
  console.log('⚡ TEST RAPIDO SISTEMA PERSISTENTE');
  
  try {
    const stats = await PersistentNotificationService.getStatistics();
    console.log('📊 Statistiche attuali:', stats);
    
    if (stats.needsReschedule) {
      console.log('🚨 Riprogrammazione necessaria, avvio...');
      const rescheduled = await PersistentNotificationService.forceReschedule();
      console.log(`✅ Riprogrammate ${rescheduled} notifiche`);
    } else {
      console.log('✅ Sistema stabile, nessuna azione richiesta');
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Errore test rapido:', error);
    return { error: error.message };
  }
};

export default testPersistentNotifications;
export { quickPersistentTest };

// Se eseguito direttamente
if (require.main === module) {
  testPersistentNotifications()
    .then(result => {
      console.log('\n📋 Risultato finale test:', result);
    })
    .catch(error => {
      console.error('\n💥 Errore critico test:', error);
    });
}
