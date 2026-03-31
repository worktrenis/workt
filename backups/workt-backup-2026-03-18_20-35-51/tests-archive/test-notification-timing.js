import NotificationService from './src/services/NotificationService.js';
import * as Notifications from 'expo-notifications';

async function testNotificationTiming() {
  console.log('🧪 === TEST TIMING NOTIFICHE ===');
  console.log(`⏰ Test avviato alle: ${new Date().toISOString()}`);
  
  try {
    // Pulisci tutte le notifiche esistenti
    await NotificationService.cleanupAllNotifications();
    console.log('🧹 Notifiche precedenti cancellate');
    
    // Test 1: Notifica con trigger di 30 secondi
    console.log('\n🧪 TEST 1: Notifica con trigger seconds (30s)');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Trigger Seconds',
        body: 'Questa notifica dovrebbe arrivare tra 30 secondi',
        sound: 'default',
        data: { 
          type: 'test_notification',
          testType: 'seconds_trigger',
          scheduledFor: new Date(Date.now() + 30000).toISOString()
        }
      },
      trigger: {
        seconds: 30,
      },
    });
    
    console.log('✅ Notifica con trigger seconds programmata');
    
    // Test 2: Notifica con trigger date
    console.log('\n🧪 TEST 2: Notifica con trigger date (45s)');
    
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 45);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Trigger Date',
        body: 'Questa notifica dovrebbe arrivare tra 45 secondi',
        sound: 'default',
        data: { 
          type: 'test_notification',
          testType: 'date_trigger',
          scheduledFor: futureDate.toISOString()
        }
      },
      trigger: {
        date: futureDate,
      },
    });
    
    console.log('✅ Notifica con trigger date programmata');
    
    // Verifica notifiche programmate dopo 5 secondi
    setTimeout(async () => {
      console.log('\n📋 VERIFICA NOTIFICHE PROGRAMMATE (dopo 5s):');
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔢 Notifiche programmate: ${scheduled.length}`);
      
      scheduled.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.content.title}`);
        console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
        console.log(`     ID: ${notif.identifier}`);
      });
      
      if (scheduled.length === 0) {
        console.log('❌ PROBLEMA: Nessuna notifica programmata trovata!');
      } else {
        console.log('✅ Notifiche correttamente programmate');
      }
    }, 5000);
    
    // Test del sistema completo
    console.log('\n🧪 TEST 3: Sistema NotificationService');
    
    setTimeout(async () => {
      const testSettings = {
        enabled: true,
        timeEntryReminders: {
          enabled: true,
          time: '20:05', // 5 minuti da ora corrente (approssimativo)
          weekendsEnabled: true
        }
      };
      
      console.log('📱 Test programmazione automatica...');
      await NotificationService.forceScheduleNotifications(testSettings);
      
      // Verifica finale dopo altri 5 secondi
      setTimeout(async () => {
        console.log('\n📋 VERIFICA FINALE SISTEMA:');
        const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`🔢 Notifiche sistema: ${finalScheduled.length}`);
        
        if (finalScheduled.length > 0) {
          finalScheduled.forEach((notif, index) => {
            const data = notif.content.data;
            const scheduledDate = data?.scheduledDate ? new Date(data.scheduledDate) : null;
            const now = new Date();
            
            console.log(`  ${index + 1}. ${notif.content.title}`);
            console.log(`     Tipo: ${data?.type}`);
            
            if (scheduledDate) {
              const timeDiff = scheduledDate.getTime() - now.getTime();
              const minutesDiff = Math.floor(timeDiff / (1000 * 60));
              console.log(`     Programmata per: ${scheduledDate.toLocaleString('it-IT')} (tra ${minutesDiff} minuti)`);
            }
            
            console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
          });
        }
      }, 5000);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

export default testNotificationTiming;
