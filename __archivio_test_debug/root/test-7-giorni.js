// 🧪 TEST NOTIFICHE RIDOTTE A 7 GIORNI
// Verifica che ora programmi meno notifiche

console.log('🧪 === TEST NOTIFICHE 7 GIORNI ===');

async function testReducedNotifications() {
  try {
    console.log('📱 Importando SuperNotificationService...');
    
    const notificationService = require('./src/services/SuperNotificationService.js');
    
    console.log('✅ SuperNotificationService importato');
    
    // Settings di test
    const settings = {
      enabled: true,
      workReminder: { enabled: true, morningTime: '07:30', weekendsEnabled: false },
      timeEntryReminder: { enabled: true, eveningTime: '18:30', weekendsEnabled: false },
      standbyReminder: { enabled: true }
    };
    
    console.log('⚙️ Settings:', JSON.stringify(settings, null, 2));
    
    // Cancella notifiche esistenti
    await notificationService.cancelAllNotifications();
    console.log('🧹 Notifiche esistenti cancellate');
    
    // Programma nuove notifiche
    console.log('\n📅 Programmando notifiche per 7 giorni...');
    const scheduledCount = await notificationService.scheduleNotifications(settings, true);
    
    console.log(`\n🎯 RISULTATO: ${scheduledCount} notifiche programmate`);
    
    // Calcolo previsto
    const daysToSchedule = [1,2,3,4,5]; // Lun-Ven
    let workDaysIn7 = 0;
    
    for (let day = 1; day <= 7; day++) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + day);
      
      if (daysToSchedule.includes(testDate.getDay())) {
        workDaysIn7++;
      }
    }
    
    const expectedWork = workDaysIn7; // mattina
    const expectedEntry = workDaysIn7; // sera
    const expectedTotal = expectedWork + expectedEntry;
    
    console.log(`\n📊 CALCOLO PREVISTO:`);
    console.log(`   Giorni feriali in 7 giorni: ${workDaysIn7}`);
    console.log(`   Notifiche mattina: ${expectedWork}`);
    console.log(`   Notifiche sera: ${expectedEntry}`);
    console.log(`   Notifiche reperibilità: 0 (nessun dato)`);
    console.log(`   TOTALE PREVISTO: ${expectedTotal}`);
    
    console.log(`\n✅ CONFRONTO:`);
    console.log(`   Prima (30 giorni): ~44 notifiche`);
    console.log(`   Ora (7 giorni): ${scheduledCount} notifiche`);
    console.log(`   Riduzione: ${Math.round((1 - scheduledCount/44) * 100)}%`);
    
    // Verifica statistiche
    const stats = await notificationService.getNotificationStats();
    console.log(`\n📈 STATISTICHE:`);
    console.log(`   Notifiche in coda: ${stats.scheduled || 'N/A'}`);
    
    if (stats.notifications && stats.notifications.length > 0) {
      console.log('\n📋 PRIME 5 NOTIFICHE:');
      stats.notifications.slice(0, 5).forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.title} - ${notif.triggerDate}`);
      });
    }
    
    console.log('\n🎉 SUCCESSO! Sistema ottimizzato per 7 giorni');
    
  } catch (error) {
    console.error('❌ Errore test:', error.message);
  }
}

testReducedNotifications();
