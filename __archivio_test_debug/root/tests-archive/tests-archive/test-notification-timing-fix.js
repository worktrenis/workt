/**
 * TEST COMPLETO SISTEMA NOTIFICHE
 * Utility standalone per testare e risolvere i problemi di timing delle notifiche
 */

import * as Notifications from 'expo-notifications';

// 🧪 TEST SISTEMA DI NOTIFICHE CON CORREZIONE TIMING
export const testNotificationTimingSystem = async () => {
  console.log('🚨 === TEST SISTEMA NOTIFICHE TIMING ===');
  console.log('');

  try {
    // FASE 1: Verifica permessi
    console.log('📋 FASE 1: Verifica permessi...');
    const permissions = await Notifications.getPermissionsAsync();
    console.log(`   Permessi: ${permissions.status}`);
    
    if (permissions.status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync();
      console.log(`   Richiesti permessi: ${request.status}`);
    }
    console.log('');

    // FASE 2: Pulizia completa
    console.log('🧹 FASE 2: Pulizia completa notifiche...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Aspetta per assicurarsi che la cancellazione sia effettiva
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const remaining = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   Notifiche rimanenti dopo pulizia: ${remaining.length}`);
    console.log('');

    // FASE 3: Test progressivo con timing diversi
    console.log('⏰ FASE 3: Test timing progressivo...');
    
    const testCases = [
      { delay: 30, label: '30 secondi' },
      { delay: 60, label: '1 minuto' },
      { delay: 120, label: '2 minuti' },
      { delay: 300, label: '5 minuti' }
    ];

    const testResults = [];

    for (const testCase of testCases) {
      console.log(`   🧪 Test ${testCase.label}...`);
      
      const targetDate = new Date();
      targetDate.setSeconds(targetDate.getSeconds() + testCase.delay);
      
      const result = await scheduleVerifiedNotification(
        `🧪 Test ${testCase.label}`,
        `Questa notifica dovrebbe arrivare tra ${testCase.label}`,
        targetDate,
        {
          type: 'timing_test',
          expectedDelay: testCase.delay,
          testLabel: testCase.label
        }
      );
      
      testResults.push({
        label: testCase.label,
        success: result.success,
        notificationId: result.notificationId
      });
      
      console.log(`   ${result.success ? '✅' : '❌'} ${testCase.label}: ${result.success ? 'OK' : result.reason}`);
    }
    
    console.log('');

    // FASE 4: Verifica che le notifiche siano effettivamente programmate
    console.log('🔍 FASE 4: Verifica notifiche programmate...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   Notifiche totali programmate: ${finalScheduled.length}`);
    
    const testNotifications = finalScheduled.filter(notif => 
      notif.content?.data?.type === 'timing_test'
    );
    console.log(`   Notifiche test trovate: ${testNotifications.length}`);
    
    // Analizza timing di ogni notifica test
    const now = new Date();
    testNotifications.forEach((notif, index) => {
      if (notif.trigger?.date) {
        const triggerDate = new Date(notif.trigger.date);
        const timeDiff = triggerDate.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        const secondsDiff = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        console.log(`     ${index + 1}. ${notif.content.data?.testLabel || 'Test'}: tra ${minutesDiff}m ${secondsDiff}s`);
      }
    });
    
    console.log('');

    // FASE 5: Istruzioni per il monitoraggio
    console.log('📱 FASE 5: Monitoraggio...');
    console.log('   ⏰ Controlla il telefono nei prossimi minuti');
    console.log('   ✅ Se le notifiche arrivano ai tempi giusti = PROBLEMA RISOLTO');
    console.log('   ❌ Se arrivano immediatamente = PROBLEMA PERSISTE');
    console.log('');
    
    console.log('📊 RIEPILOGO TEST:');
    testResults.forEach(result => {
      console.log(`   ${result.success ? '✅' : '❌'} ${result.label}: ${result.success ? 'Programmato' : 'Fallito'}`);
    });
    
    return {
      success: testResults.every(r => r.success),
      totalTests: testResults.length,
      successfulTests: testResults.filter(r => r.success).length,
      scheduledNotifications: finalScheduled.length,
      testNotifications: testNotifications.length
    };

  } catch (error) {
    console.error('❌ ERRORE TEST SISTEMA:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Funzione di programmazione notifiche con verifica anti-immediato
const scheduleVerifiedNotification = async (title, body, targetDate, data = {}) => {
  try {
    const now = new Date();
    const timeDiff = targetDate.getTime() - now.getTime();
    
    // Verifica che la data sia nel futuro
    if (timeDiff <= 0) {
      return { success: false, reason: 'Data nel passato' };
    }
    
    // Usa un delay minimo di 10 secondi per evitare delivery immediato
    const minDelay = 10 * 1000; // 10 secondi
    let actualTargetDate = targetDate;
    
    if (timeDiff < minDelay) {
      actualTargetDate = new Date(now.getTime() + minDelay);
    }
    
    const notificationRequest = {
      content: {
        title: title,
        body: body,
        sound: 'default',
        data: {
          ...data,
          scheduledDate: actualTargetDate.toISOString(),
          programmedAt: now.toISOString(),
          verificationEnabled: true
        }
      },
      trigger: {
        date: actualTargetDate,
      },
    };
    
    const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);
    
    return { 
      success: true, 
      notificationId, 
      actualDate: actualTargetDate 
    };
    
  } catch (error) {
    return { 
      success: false, 
      reason: error.message 
    };
  }
};

// 🚨 EMERGENCY FIX per notifiche immediate
export const emergencyNotificationFix = async () => {
  console.log('🚨 === RIPARAZIONE EMERGENZA NOTIFICHE ===');
  console.log('');
  
  try {
    // 1. Cancella TUTTO
    console.log('🧹 FASE 1: Pulizia completa sistema...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cleanup = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   Pulizia: ${cleanup.length === 0 ? '✅ OK' : '❌ FALLITA'}`);
    console.log('');

    // 2. Test singolo di verifica
    console.log('🧪 FASE 2: Test verifica sistema...');
    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + 45); // 45 secondi
    
    const testResult = await scheduleVerifiedNotification(
      '🔧 Test Sistema',
      'Se vedi questa notifica tra 45 secondi, il sistema funziona!',
      testDate,
      { type: 'system_verification', immediate: false }
    );
    
    console.log(`   Test: ${testResult.success ? '✅ OK' : '❌ FALLITO'}`);
    
    if (!testResult.success) {
      console.log('   ❌ Sistema notifiche non funzionante!');
      return { success: false, reason: 'Test verifica fallito' };
    }
    console.log('');

    // 3. Attendi e verifica
    console.log('⏰ FASE 3: Verifica programmazione...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   Notifiche programmate: ${scheduled.length}`);
    
    if (scheduled.length === 0) {
      console.log('   ❌ Nessuna notifica programmata! Sistema rotto.');
      return { success: false, reason: 'Nessuna notifica programmata' };
    }
    
    console.log('   ✅ Sistema sembra funzionare');
    console.log('');
    
    // 4. Programmazione MINIMALE per test
    console.log('📱 FASE 4: Programmazione test minimale...');
    
    // Programma solo una notifica di test ogni ora per le prossime 3 ore
    const testHours = [1, 2, 3];
    let programmedCount = 0;
    
    for (const hour of testHours) {
      const testTime = new Date();
      testTime.setHours(testTime.getHours() + hour);
      testTime.setMinutes(0);
      testTime.setSeconds(0);
      
      const result = await scheduleVerifiedNotification(
        `🧪 Test ${hour}h`,
        `Test notifica programmata per le ${testTime.toLocaleTimeString('it-IT')}`,
        testTime,
        { type: 'hourly_test', hour: hour }
      );
      
      if (result.success) {
        programmedCount++;
        console.log(`   ✅ Test ${hour}h: programmato`);
      } else {
        console.log(`   ❌ Test ${hour}h: ${result.reason}`);
      }
    }
    
    console.log('');
    console.log(`📊 RIEPILOGO: ${programmedCount}/3 notifiche test programmate`);
    console.log('⏰ Controlla il telefono nelle prossime ore!');
    
    return {
      success: programmedCount > 0,
      testNotificationsScheduled: programmedCount,
      message: `${programmedCount} notifiche test programmate`
    };

  } catch (error) {
    console.error('🚨 ❌ ERRORE RIPARAZIONE:', error);
    return { success: false, reason: error.message };
  }
};

// Export default per uso nel debug screen
export default {
  testNotificationTimingSystem,
  emergencyNotificationFix
};
