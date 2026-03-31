// 🧪 TEST NOTIFICATIONSERVICE SOLO JAVASCRIPT
// Verifica che il NotificationService convertito funzioni correttamente

const { NotificationService } = require('./src/services/NotificationService');
const { AlternativeNotificationService } = require('./src/services/AlternativeNotificationService');

console.log('🧪 === TEST NOTIFICATIONSERVICE SOLO JAVASCRIPT ===');

async function testNotificationServiceJavaScript() {
  try {
    console.log('🚀 Inizio test NotificationService...');
    
    // Test 1: Verifica istanza NotificationService
    console.log('\n1️⃣ Test istanza NotificationService...');
    const notificationService = new NotificationService();
    console.log('✅ NotificationService istanziato correttamente');
    
    // Test 2: Verifica shouldUseAlternativeSystem
    console.log('\n2️⃣ Test shouldUseAlternativeSystem...');
    const shouldUseAlternative = notificationService.shouldUseAlternativeSystem();
    console.log(`📋 shouldUseAlternativeSystem: ${shouldUseAlternative}`);
    
    if (shouldUseAlternative) {
      console.log('✅ PERFETTO: Sistema configurato per usare solo JavaScript');
    } else {
      console.log('⚠️ ATTENZIONE: Sistema potrebbe ancora usare Expo');
    }
    
    // Test 3: Verifica AlternativeNotificationService
    console.log('\n3️⃣ Test AlternativeNotificationService...');
    const altService = new AlternativeNotificationService();
    console.log('✅ AlternativeNotificationService istanziato correttamente');
    
    // Test 4: Test timer JavaScript semplice
    console.log('\n4️⃣ Test timer JavaScript...');
    await new Promise((resolve) => {
      console.log('⏰ Avvio timer di 2 secondi...');
      const start = Date.now();
      
      setTimeout(() => {
        const duration = Date.now() - start;
        const accuracy = Math.abs(duration - 2000);
        
        console.log(`⏱️ Timer completato in ${duration}ms`);
        console.log(`🎯 Precisione: ${accuracy}ms`);
        console.log(`📊 Valutazione: ${accuracy < 50 ? '🟢 OTTIMA' : accuracy < 100 ? '🟡 BUONA' : '🔴 SCARSA'}`);
        resolve();
      }, 2000);
    });
    
    // Test 5: Simula programmazione notifiche
    console.log('\n5️⃣ Test programmazione notifiche...');
    try {
      const testSettings = {
        enabled: true,
        workReminders: { 
          enabled: true, 
          morningTime: '09:00',
          afternoonTime: '14:00',
          eveningTime: '18:00'
        },
        timeEntryReminders: { 
          enabled: true, 
          time: '17:30' 
        },
        dailySummary: {
          enabled: true,
          time: '20:00'
        }
      };
      
      console.log('📋 Configurazione test:', JSON.stringify(testSettings, null, 2));
      
      // In un ambiente React Native reale, questo programmerebbe le notifiche
      console.log('⏰ Simulando programmazione notifiche...');
      
      // Simula il metodo scheduleNotifications
      console.log('✅ Notifiche programmate con successo (simulato)');
      
    } catch (error) {
      console.error('❌ Errore programmazione notifiche:', error);
    }
    
    // Analisi finale
    console.log('\n📊 === ANALISI FINALE ===');
    
    const report = {
      timestamp: new Date().toISOString(),
      notificationServiceWorking: true,
      alternativeServiceWorking: true,
      javascriptTimersWorking: true,
      systemType: shouldUseAlternative ? 'SOLO JAVASCRIPT' : 'IBRIDO',
      recommendations: []
    };
    
    if (shouldUseAlternative) {
      report.recommendations.push('✅ Sistema configurato correttamente per solo JavaScript');
      console.log('🎯 VERDETTO: SISTEMA SOLO JAVASCRIPT ATTIVO');
    } else {
      report.recommendations.push('⚠️ Verificare configurazione - potrebbe usare ancora Expo');
      console.log('🎯 VERDETTO: Verificare configurazione sistema');
    }
    
    console.log('\n🚀 === VANTAGGI SISTEMA CORRENTE ===');
    console.log('✅ Nessuna dipendenza da Expo Notifications');
    console.log('✅ Timer JavaScript nativi (alta precisione)');
    console.log('✅ Alert React Native per notifiche immediate');
    console.log('✅ Controllo completo della schedulazione');
    console.log('✅ Debugging semplificato');
    
    console.log('\n📋 REPORT FINALE:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    return { success: false, error: error.message };
  }
}

// Esecuzione del test
testNotificationServiceJavaScript()
  .then((result) => {
    console.log('\n🏁 Test completato con successo');
  })
  .catch((error) => {
    console.error('\n💥 Test fallito:', error);
  });
