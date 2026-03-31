// Test del nuovo sistema di notifiche con trigger basati su date assolute
// Questo file testa le correzioni implementate per risolvere il problema
// delle notifiche che arrivavano tutte insieme invece che agli orari programmati

import NotificationService from './src/services/NotificationService.js';

async function testFixedNotificationSystem() {
  console.log('🧪 TEST SISTEMA NOTIFICHE CORRETTO');
  console.log('====================================');
  
  try {
    // Inizializza il servizio
    const notificationService = new NotificationService();
    await notificationService.initialize();
    
    // Test 1: Programmazione con nuovo sistema date-based
    console.log('\n📅 TEST 1: Programmazione basata su date assolute');
    console.log('------------------------------------------------');
    
    const testSettings = {
      enabled: true,
      workReminders: {
        enabled: true,
        morningTime: '08:00',
        weekendsEnabled: false
      },
      timeEntryReminders: {
        enabled: true,
        time: '20:00',
        weekendsEnabled: false
      },
      dailySummary: {
        enabled: true,
        time: '21:00'
      },
      standbyReminders: {
        enabled: false
      }
    };
    
    // Cancella notifiche esistenti per test pulito
    await notificationService.cancelAllNotifications();
    
    // Programma le notifiche con il nuovo sistema
    console.log('🚀 Avvio programmazione con sistema corretto...');
    await notificationService.scheduleNotifications(testSettings);
    
    // Verifica le notifiche programmate
    const scheduledNotifications = await notificationService.getAllScheduledNotifications();
    console.log(`\n✅ Notifiche programmate: ${scheduledNotifications.length}`);
    
    // Test 2: Verifica dei trigger date-based
    console.log('\n🎯 TEST 2: Analisi trigger programmati');
    console.log('------------------------------------');
    
    let dateBasedCount = 0;
    let weekdayBasedCount = 0;
    
    scheduledNotifications.forEach((notification, index) => {
      const trigger = notification.trigger;
      const content = notification.content;
      
      console.log(`\n${index + 1}. ${content.title}`);
      console.log(`   Tipo: ${content.data?.type || 'sconosciuto'}`);
      
      if (trigger.date) {
        dateBasedCount++;
        const triggerDate = new Date(trigger.date);
        console.log(`   ✅ Trigger DATE-BASED: ${triggerDate.toLocaleString('it-IT')}`);
        console.log(`   📅 Data: ${triggerDate.toLocaleDateString('it-IT')}`);
        console.log(`   ⏰ Ora: ${triggerDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
      } else if (trigger.weekday !== undefined) {
        weekdayBasedCount++;
        console.log(`   ⚠️ Trigger WEEKDAY-BASED: giorno ${trigger.weekday}, ora ${trigger.hour}:${trigger.minute}`);
        console.log(`   ❌ PROBLEMA: Questo tipo di trigger causa notifiche immediate!`);
      } else {
        console.log(`   ❓ Trigger sconosciuto:`, trigger);
      }
    });
    
    // Test 3: Verifica distribuzione temporale
    console.log('\n📊 TEST 3: Distribuzione temporale');
    console.log('--------------------------------');
    
    const dateBasedNotifications = scheduledNotifications
      .filter(n => n.trigger.date)
      .map(n => ({
        title: n.content.title,
        date: new Date(n.trigger.date),
        type: n.content.data?.type
      }))
      .sort((a, b) => a.date - b.date);
    
    console.log(`📅 Notifiche basate su date: ${dateBasedCount}`);
    console.log(`⚠️ Notifiche basate su weekday: ${weekdayBasedCount}`);
    
    if (dateBasedNotifications.length > 0) {
      console.log(`\n🕐 Prima notifica: ${dateBasedNotifications[0].date.toLocaleString('it-IT')}`);
      console.log(`🕐 Ultima notifica: ${dateBasedNotifications[dateBasedNotifications.length - 1].date.toLocaleString('it-IT')}`);
      
      // Mostra le prossime 5 notifiche
      console.log('\n🔜 Prossime 5 notifiche:');
      dateBasedNotifications.slice(0, 5).forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.title}`);
        console.log(`      📅 ${notif.date.toLocaleDateString('it-IT')} alle ${notif.date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`      🏷️ Tipo: ${notif.type}`);
      });
    }
    
    // Test 4: Verifica auto-rinnovamento
    console.log('\n🔄 TEST 4: Auto-rinnovamento programmato');
    console.log('--------------------------------------');
    
    const autoRenewalNotifications = scheduledNotifications.filter(n => 
      n.content.data?.type === 'auto_renewal'
    );
    
    if (autoRenewalNotifications.length > 0) {
      const renewal = autoRenewalNotifications[0];
      const renewalDate = new Date(renewal.trigger.date);
      console.log(`✅ Auto-rinnovamento programmato per: ${renewalDate.toLocaleString('it-IT')}`);
      
      const daysUntilRenewal = Math.ceil((renewalDate - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`📅 Giorni mancanti al rinnovamento: ${daysUntilRenewal}`);
    } else {
      console.log('❌ Auto-rinnovamento non trovato!');
    }
    
    // Test 5: Verifica correzione del problema originale
    console.log('\n🎯 TEST 5: Verifica correzione problema');
    console.log('------------------------------------');
    
    const now = new Date();
    const immediateNotifications = scheduledNotifications.filter(n => {
      if (n.trigger.date) {
        const triggerDate = new Date(n.trigger.date);
        const timeDiff = triggerDate - now;
        return timeDiff < 60000; // Meno di 1 minuto
      }
      return false;
    });
    
    if (immediateNotifications.length > 0) {
      console.log(`❌ PROBLEMA PERSISTENTE: ${immediateNotifications.length} notifiche programmate per i prossimi 60 secondi!`);
      immediateNotifications.forEach(notif => {
        const triggerDate = new Date(notif.trigger.date);
        console.log(`   - ${notif.content.title}: ${triggerDate.toLocaleTimeString('it-IT')}`);
      });
    } else {
      console.log('✅ CORREZIONE CONFERMATA: Nessuna notifica programmata per i prossimi 60 secondi');
      console.log('✅ Le notifiche sono ora programmate per gli orari corretti');
    }
    
    // Statistiche finali
    console.log('\n📈 STATISTICHE FINALI');
    console.log('===================');
    console.log(`📊 Totale notifiche programmate: ${scheduledNotifications.length}`);
    console.log(`✅ Trigger basati su date: ${dateBasedCount} (corretto)`);
    console.log(`⚠️ Trigger basati su weekday: ${weekdayBasedCount} (da correggere)`);
    
    if (weekdayBasedCount === 0 && dateBasedCount > 0) {
      console.log('\n🎉 SUCCESSO: Tutte le notifiche utilizzano il nuovo sistema basato su date!');
      console.log('🎉 Il problema delle "8 notifiche in una volta" dovrebbe essere risolto!');
    } else if (weekdayBasedCount > 0) {
      console.log('\n⚠️ ATTENZIONE: Ci sono ancora notifiche che usano trigger weekday-based');
      console.log('⚠️ Questi potrebbero causare ancora il problema delle notifiche immediate');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Test delle funzioni diagnostiche
async function testDiagnosticFunctions() {
  console.log('\n🔧 TEST FUNZIONI DIAGNOSTICHE');
  console.log('============================');
  
  try {
    const notificationService = new NotificationService();
    
    // Test funzione diagnostica
    console.log('\n📋 Diagnosi notifiche:');
    await notificationService.diagnoseNotifications();
    
    // Test conteggio
    console.log('\n🔢 Conteggio notifiche programmate:');
    const count = await notificationService.getScheduledNotificationsCount();
    console.log(`   Totale: ${count}`);
    
  } catch (error) {
    console.error('❌ Errore nelle funzioni diagnostiche:', error);
  }
}

// Esecuzione test
async function runAllTests() {
  console.log('🧪 AVVIO TEST COMPLETO SISTEMA NOTIFICHE CORRETTO');
  console.log('================================================');
  
  await testFixedNotificationSystem();
  await testDiagnosticFunctions();
  
  console.log('\n✅ TEST COMPLETATO');
  console.log('================');
  console.log('Se vedi "SUCCESSO: Tutte le notifiche utilizzano il nuovo sistema basato su date!"');
  console.log('allora il problema delle notifiche immediate dovrebbe essere risolto.');
  console.log('\nPer testare completamente:');
  console.log('1. Compila l\'app in development build');
  console.log('2. Attiva le notifiche nelle impostazioni');
  console.log('3. Verifica che NON arrivino più 8 notifiche insieme');
  console.log('4. Attendi gli orari programmati (es. 20:00) per confermare l\'arrivo corretto');
}

// Esporta per uso in altri test
export { testFixedNotificationSystem, testDiagnosticFunctions, runAllTests };

// Se eseguito direttamente
if (require.main === module) {
  runAllTests().catch(console.error);
}
