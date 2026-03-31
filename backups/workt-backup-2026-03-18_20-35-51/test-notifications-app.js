// 🧪 TEST SEMPLIFICATO: Verifica sistemi notifiche nell'app React Native
// Da chiamare direttamente nell'app per testare i sistemi

console.log('🧪 === TEST NOTIFICHE REACT NATIVE ===');

// Test che può essere eseguito nell'app
export const testNotificationSystems = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    expo: { working: false, details: [] },
    javascript: { working: false, details: [] },
    recommendation: ''
  };

  console.log('🔄 Inizio test sistemi notifiche...');

  // TEST 1: JavaScript Timers (sempre disponibile)
  console.log('\n🚀 TEST 1: JavaScript Timers');
  try {
    const jsTestPromise = new Promise((resolve) => {
      const startTime = Date.now();
      console.log('⏰ Avvio timer JavaScript di 3 secondi...');
      
      setTimeout(() => {
        const endTime = Date.now();
        const actualDelay = endTime - startTime;
        console.log(`✅ Timer JavaScript eseguito dopo ${actualDelay}ms (target: 3000ms)`);
        console.log(`🎯 Precisione: ${Math.abs(actualDelay - 3000) < 100 ? 'ALTA' : 'MEDIA'}`);
        
        results.javascript.working = true;
        results.javascript.details.push(`Timer eseguito in ${actualDelay}ms`);
        results.javascript.details.push(`Precisione: ${Math.abs(actualDelay - 3000)}ms di differenza`);
        
        resolve(true);
      }, 3000);
    });

    await jsTestPromise;
    console.log('✅ Test JavaScript Timer: SUCCESSO');
    
  } catch (error) {
    console.error('❌ Test JavaScript Timer fallito:', error);
    results.javascript.details.push(`Errore: ${error.message}`);
  }

  // TEST 2: Expo Notifications (se disponibile)
  console.log('\n🔋 TEST 2: Expo Notifications');
  try {
    // Importa dinamicamente per evitare errori se non disponibile
    const Notifications = await import('expo-notifications');
    
    console.log('📱 Verifica permessi...');
    const { status } = await Notifications.getPermissionsAsync();
    console.log(`   Status permessi: ${status}`);
    results.expo.details.push(`Permessi: ${status}`);
    
    if (status !== 'granted') {
      console.log('📱 Richiesta permessi...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      console.log(`   Nuovi permessi: ${newStatus}`);
      results.expo.details.push(`Permessi ottenuti: ${newStatus}`);
    }

    // Configura handler di test
    console.log('⚙️ Configurazione handler...');
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📬 Handler chiamato per:', notification.request.identifier);
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    // Test notifica con delay breve
    console.log('📅 Programmazione notifica test (5 secondi)...');
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Expo',
        body: 'Questa è una notifica di test Expo',
        data: { type: 'expo_test', testTime: new Date().toISOString() }
      },
      trigger: { seconds: 5 },
    });

    console.log(`✅ Notifica Expo programmata: ${notificationId}`);
    results.expo.details.push(`Notifica programmata: ${notificationId}`);

    // Verifica notifiche in coda
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Notifiche in coda: ${scheduled.length}`);
    results.expo.details.push(`Notifiche in coda: ${scheduled.length}`);

    results.expo.working = scheduled.length > 0;
    console.log(`✅ Test Expo Notifications: ${results.expo.working ? 'SUCCESSO' : 'FALLITO'}`);
    
  } catch (error) {
    console.error('❌ Test Expo Notifications fallito:', error);
    results.expo.details.push(`Errore: ${error.message}`);
  }

  // ANALISI E RACCOMANDAZIONE
  console.log('\n📊 === ANALISI RISULTATI ===');
  console.log(`🚀 JavaScript Timers: ${results.javascript.working ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);
  console.log(`🔋 Expo Notifications: ${results.expo.working ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);

  if (results.expo.working && results.javascript.working) {
    results.recommendation = 'IBRIDO: Usa Expo per notifiche native + JavaScript per timing preciso';
    console.log('🎯 RACCOMANDAZIONE: Sistema IBRIDO (Expo + JavaScript)');
  } else if (results.expo.working) {
    results.recommendation = 'EXPO: Usa solo Expo Notifications';
    console.log('🎯 RACCOMANDAZIONE: Solo EXPO Notifications');
  } else if (results.javascript.working) {
    results.recommendation = 'JAVASCRIPT: Usa solo JavaScript Timers con Alert';
    console.log('🎯 RACCOMANDAZIONE: Solo JavaScript Timers');
  } else {
    results.recommendation = 'PROBLEMA: Nessun sistema funziona';
    console.log('🎯 RACCOMANDAZIONE: Investigare problemi di sistema');
  }

  console.log('\n📋 REPORT COMPLETO:');
  console.log(JSON.stringify(results, null, 2));

  return results;
};

// Funzione per testare SOLO il sistema JavaScript (sempre disponibile)
export const testJavaScriptOnly = async () => {
  console.log('🚀 === TEST SOLO JAVASCRIPT TIMERS ===');
  
  const testResults = [];
  
  // Test 1: Timer breve (2 secondi)
  console.log('⏰ Test 1: Timer breve (2 secondi)');
  const test1Promise = new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const duration = Date.now() - start;
      const result = {
        test: 'Timer breve',
        target: 2000,
        actual: duration,
        accuracy: Math.abs(duration - 2000),
        success: Math.abs(duration - 2000) < 200 // entro 200ms
      };
      testResults.push(result);
      console.log(`✅ Timer breve: ${duration}ms (target: 2000ms, diff: ${result.accuracy}ms)`);
      resolve(result);
    }, 2000);
  });

  await test1Promise;

  // Test 2: Timer medio (10 secondi)
  console.log('⏰ Test 2: Timer medio (10 secondi)');
  const test2Promise = new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const duration = Date.now() - start;
      const result = {
        test: 'Timer medio',
        target: 10000,
        actual: duration,
        accuracy: Math.abs(duration - 10000),
        success: Math.abs(duration - 10000) < 500 // entro 500ms
      };
      testResults.push(result);
      console.log(`✅ Timer medio: ${duration}ms (target: 10000ms, diff: ${result.accuracy}ms)`);
      resolve(result);
    }, 10000);
  });

  await test2Promise;

  // Analisi risultati
  const allSuccess = testResults.every(r => r.success);
  const avgAccuracy = testResults.reduce((sum, r) => sum + r.accuracy, 0) / testResults.length;

  console.log('\n📊 RISULTATI TEST JAVASCRIPT:');
  console.log(`✅ Tutti i test passati: ${allSuccess ? 'SÌ' : 'NO'}`);
  console.log(`🎯 Precisione media: ${avgAccuracy.toFixed(0)}ms`);
  console.log(`🔧 Affidabilità: ${avgAccuracy < 100 ? 'ALTA' : avgAccuracy < 500 ? 'MEDIA' : 'BASSA'}`);

  return {
    allSuccess,
    averageAccuracy: avgAccuracy,
    reliability: avgAccuracy < 100 ? 'ALTA' : avgAccuracy < 500 ? 'MEDIA' : 'BASSA',
    results: testResults
  };
};

// Funzione per verificare lo stato attuale del NotificationService
export const checkCurrentNotificationService = async () => {
  console.log('🔍 === VERIFICA STATO NOTIFICATIONSERVICE ===');
  
  try {
    // Prova a importare il NotificationService
    const NotificationService = (await import('./src/services/NotificationService')).default;
    
    if (!NotificationService) {
      console.log('❌ NotificationService non importabile');
      return { working: false, reason: 'Import fallito' };
    }

    // Crea istanza
    const notificationService = new NotificationService();
    
    // Verifica se il sistema alternativo è disponibile
    const hasAlternative = notificationService.alternativeService ? true : false;
    const useAlternative = notificationService.shouldUseAlternativeSystem ? notificationService.shouldUseAlternativeSystem() : false;
    
    console.log(`🔧 Sistema alternativo disponibile: ${hasAlternative ? '✅' : '❌'}`);
    console.log(`🔧 Sistema alternativo attivo: ${useAlternative ? '✅' : '❌'}`);
    
    // Verifica permessi se Expo è disponibile
    let expoWorking = false;
    try {
      const hasPermissions = await notificationService.hasPermissions();
      console.log(`🔋 Permessi Expo: ${hasPermissions ? '✅' : '❌'}`);
      expoWorking = hasPermissions;
    } catch (error) {
      console.log(`🔋 Expo non disponibile: ${error.message}`);
    }

    // Verifica notifiche programmate
    let scheduledCount = 0;
    try {
      const scheduled = await notificationService.getScheduledNotifications();
      scheduledCount = scheduled.length;
      console.log(`📅 Notifiche programmate: ${scheduledCount}`);
    } catch (error) {
      console.log(`📅 Errore verifica notifiche: ${error.message}`);
    }

    return {
      working: true,
      hasAlternativeSystem: hasAlternative,
      usingAlternativeSystem: useAlternative,
      expoWorking: expoWorking,
      scheduledNotifications: scheduledCount,
      recommendation: useAlternative ? 'Sistema JavaScript attivo' : 'Sistema Expo attivo'
    };

  } catch (error) {
    console.error('❌ Errore verifica NotificationService:', error);
    return { working: false, reason: error.message };
  }
};

// Test rapido da console
export const quickTest = () => {
  console.log('⚡ === QUICK TEST ===');
  console.log('🚀 Test JavaScript Timer veloce (1 secondo)...');
  
  const start = Date.now();
  setTimeout(() => {
    const duration = Date.now() - start;
    console.log(`✅ Timer eseguito in ${duration}ms (target: 1000ms)`);
    console.log(`🎯 Precisione: ${Math.abs(duration - 1000) < 50 ? '🟢 OTTIMA' : Math.abs(duration - 1000) < 200 ? '🟡 BUONA' : '🔴 SCARSA'}`);
  }, 1000);
  
  console.log('⏰ Timer avviato, risultato tra 1 secondo...');
};
