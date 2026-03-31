/**
 * Test completo per verificare sincronizzazione notifiche
 * Questo test verifica che le notifiche vengano programmate e cancellate correttamente
 */

import * as Notifications from 'expo-notifications';

const testNotificationSync = async () => {
  console.log('🧪 === TEST SINCRONIZZAZIONE NOTIFICHE ===');
  
  try {
    // 1. Cancella tutto all'inizio
    console.log('\n1️⃣ Pulizia iniziale...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let initial = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🔍 Notifiche iniziali: ${initial.length}`);
    
    // 2. Programma una notifica di test
    console.log('\n2️⃣ Programmazione notifica di test...');
    const testDate = new Date();
    testDate.setMinutes(testDate.getMinutes() + 2);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Sync',
        body: 'Notifica di test per sincronizzazione'
      },
      trigger: {
        date: testDate
      }
    });
    
    console.log(`📅 Notifica programmata per: ${testDate.toLocaleString()}`);
    
    // 3. Verifica immediata (potrebbe essere 0 per sync delay)
    console.log('\n3️⃣ Verifica immediata...');
    let immediate = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`🔍 Notifiche immediate: ${immediate.length}`);
    
    // 4. Verifica con retry (per sync)
    console.log('\n4️⃣ Verifica con retry...');
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      let retryCheck = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔄 Tentativo ${i + 1}/5: ${retryCheck.length} notifiche trovate`);
      
      if (retryCheck.length > 0) {
        console.log('✅ Sincronizzazione avvenuta!');
        retryCheck.forEach((notif, index) => {
          console.log(`  ${index + 1}. ${notif.content.title} - ${new Date(notif.trigger.date).toLocaleString()}`);
        });
        break;
      }
    }
    
    // 5. Test cancellazione
    console.log('\n5️⃣ Test cancellazione...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // 6. Verifica cancellazione con retry
    console.log('\n6️⃣ Verifica cancellazione...');
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      let cancelCheck = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔄 Verifica cancellazione ${i + 1}/5: ${cancelCheck.length} notifiche rimaste`);
      
      if (cancelCheck.length === 0) {
        console.log('✅ Cancellazione sincronizzata!');
        break;
      }
    }
    
    console.log('\n✅ Test sincronizzazione completato');
    
  } catch (error) {
    console.error('❌ Errore durante test:', error);
  }
};

// Funzione per simulare comportamento di SuperNotificationService
const testSuperNotificationService = async () => {
  console.log('\n🧪 === TEST SUPERNOTIFICATIONSERVICE BEHAVIOR ===');
  
  try {
    // Simula il metodo clearAllNotifications
    console.log('\n🗑️ Test clearAllNotifications...');
    
    // Programma alcune notifiche
    for (let i = 1; i <= 3; i++) {
      const testDate = new Date();
      testDate.setMinutes(testDate.getMinutes() + i * 5);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Test ${i}`,
          body: `Notifica di test ${i}`
        },
        trigger: {
          date: testDate
        }
      });
    }
    
    console.log('📅 Programmate 3 notifiche di test');
    
    // Aspetta sync
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verifica con retry (come nel clearAllNotifications)
    let existing = [];
    for (let i = 0; i < 3; i++) {
      existing = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔄 Tentativo lettura ${i + 1}/3: ${existing.length} notifiche trovate`);
      if (existing.length > 0 || i === 2) break;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`🔍 Trovate ${existing.length} notifiche:`);
    existing.forEach((notif, i) => {
      console.log(`  ${i + 1}. ${notif.content.title} - ${new Date(notif.trigger.date).toLocaleString()}`);
    });
    
    // Cancella con triplo tentativo
    for (let attempt = 1; attempt <= 3; attempt++) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`🗑️ Tentativo cancellazione ${attempt}/3 completato`);
    }
    
    // Verifica finale con retry
    let remaining = [];
    for (let i = 0; i < 3; i++) {
      remaining = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔍 Verifica finale ${i + 1}/3: ${remaining.length} notifiche rimaste`);
      if (remaining.length === 0 || i === 2) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`✅ Risultato finale: ${remaining.length} notifiche rimaste`);
    
  } catch (error) {
    console.error('❌ Errore durante test SuperNotificationService:', error);
  }
};

// Export delle funzioni di test
export { testNotificationSync, testSuperNotificationService };

// Se eseguito direttamente
if (require.main === module) {
  const runTests = async () => {
    await testNotificationSync();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testSuperNotificationService();
  };
  
  runTests().catch(console.error);
}
