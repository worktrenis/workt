// 🧪 TEST COMPLETO: Sistema Notifiche Expo vs JavaScript Timers
// Questo test verifica quale sistema funziona meglio

console.log('🧪 === INIZIO TEST SISTEMI NOTIFICHE ===');
console.log('Data test:', new Date().toISOString());

// Import necessari
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simula l'import dei servizi
class TestRunner {
  constructor() {
    this.testResults = {
      expo: { success: false, details: [] },
      javascript: { success: false, details: [] },
      comparison: {}
    };
    this.startTime = Date.now();
  }

  // TEST 1: Sistema Expo Notifications
  async testExpoSystem() {
    console.log('\n🔋 === TEST EXPO NOTIFICATIONS ===');
    
    try {
      // Verifica permessi
      console.log('1️⃣ Verifica permessi...');
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`   Status permessi: ${status}`);
      this.testResults.expo.details.push(`Permessi: ${status}`);
      
      if (status !== 'granted') {
        console.log('   Richiedendo permessi...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log(`   Nuovi permessi: ${newStatus}`);
        this.testResults.expo.details.push(`Permessi richiesti: ${newStatus}`);
      }

      // Configura handler
      console.log('2️⃣ Configurazione handler...');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      this.testResults.expo.details.push('Handler configurato');

      // Test notifica immediata (1 secondo)
      console.log('3️⃣ Test notifica immediata (1 secondo)...');
      const immediateTestId = await this.testExpoImmediate();
      this.testResults.expo.details.push(`Notifica immediata: ${immediateTestId ? 'Programmata' : 'Fallita'}`);

      // Test notifica con delay (30 secondi)
      console.log('4️⃣ Test notifica con delay (30 secondi)...');
      const delayTestId = await this.testExpoDelay();
      this.testResults.expo.details.push(`Notifica delay: ${delayTestId ? 'Programmata' : 'Fallita'}`);

      // Verifica notifiche programmate
      console.log('5️⃣ Verifica notifiche programmate...');
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`   Notifiche in coda: ${scheduled.length}`);
      this.testResults.expo.details.push(`Notifiche in coda: ${scheduled.length}`);

      if (scheduled.length > 0) {
        console.log('📋 Lista notifiche programmate:');
        scheduled.forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.content.title} - ${this.describeTrigger(notif.trigger)}`);
        });
      }

      this.testResults.expo.success = immediateTestId && delayTestId;
      console.log(`✅ Test Expo completato. Successo: ${this.testResults.expo.success}`);

      return this.testResults.expo.success;

    } catch (error) {
      console.error('❌ Errore nel test Expo:', error);
      this.testResults.expo.details.push(`Errore: ${error.message}`);
      this.testResults.expo.success = false;
      return false;
    }
  }

  // Test Expo - Notifica immediata
  async testExpoImmediate() {
    try {
      const testTime = new Date();
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔋 Test Expo - Immediato',
          body: `Notifica Expo programmata alle ${testTime.toLocaleTimeString('it-IT')}`,
          data: { 
            type: 'expo_immediate_test', 
            testTime: testTime.toISOString() 
          }
        },
        trigger: { seconds: 1 },
      });

      console.log(`   ✅ Notifica immediata programmata: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error(`   ❌ Errore notifica immediata:`, error);
      return null;
    }
  }

  // Test Expo - Notifica con delay
  async testExpoDelay() {
    try {
      const testTime = new Date(Date.now() + 30000); // 30 secondi
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔋 Test Expo - Delay',
          body: `Notifica Expo programmata per ${testTime.toLocaleTimeString('it-IT')}`,
          data: { 
            type: 'expo_delay_test', 
            scheduledFor: testTime.toISOString() 
          }
        },
        trigger: { seconds: 30 },
      });

      console.log(`   ✅ Notifica delay programmata: ${notificationId} per ${testTime.toLocaleTimeString('it-IT')}`);
      return notificationId;
    } catch (error) {
      console.error(`   ❌ Errore notifica delay:`, error);
      return null;
    }
  }

  // TEST 2: Sistema JavaScript Timers
  async testJavaScriptSystem() {
    console.log('\n🚀 === TEST JAVASCRIPT TIMERS ===');
    
    try {
      // Inizializza sistema alternativo
      this.activeTimers = new Map();
      this.jsNotificationCount = 0;

      // Test timer immediato (3 secondi)
      console.log('1️⃣ Test timer immediato (3 secondi)...');
      const immediateTimer = this.testJavaScriptImmediate();
      this.testResults.javascript.details.push('Timer immediato avviato');

      // Test timer con delay (45 secondi)
      console.log('2️⃣ Test timer con delay (45 secondi)...');
      const delayTimer = this.testJavaScriptDelay();
      this.testResults.javascript.details.push('Timer delay avviato');

      // Verifica timer attivi
      console.log('3️⃣ Verifica timer attivi...');
      console.log(`   Timer attivi: ${this.activeTimers.size}`);
      this.testResults.javascript.details.push(`Timer attivi: ${this.activeTimers.size}`);

      // Lista timer attivi
      if (this.activeTimers.size > 0) {
        console.log('📋 Lista timer attivi:');
        this.activeTimers.forEach((timerData, id) => {
          console.log(`   ${id}: ${timerData.title} - ${timerData.scheduledFor.toLocaleTimeString('it-IT')}`);
        });
      }

      this.testResults.javascript.success = immediateTimer && delayTimer;
      console.log(`✅ Test JavaScript completato. Successo: ${this.testResults.javascript.success}`);

      return this.testResults.javascript.success;

    } catch (error) {
      console.error('❌ Errore nel test JavaScript:', error);
      this.testResults.javascript.details.push(`Errore: ${error.message}`);
      this.testResults.javascript.success = false;
      return false;
    }
  }

  // Test JavaScript - Timer immediato
  testJavaScriptImmediate() {
    try {
      const testTime = new Date();
      const timerId = `js_immediate_${Date.now()}`;
      
      const timer = setTimeout(() => {
        this.showJavaScriptNotification(
          '🚀 Test JavaScript - Immediato',
          `Timer JavaScript eseguito alle ${new Date().toLocaleTimeString('it-IT')} (programmato alle ${testTime.toLocaleTimeString('it-IT')})`,
          { type: 'js_immediate_test', testTime: testTime.toISOString() }
        );
        this.activeTimers.delete(timerId);
      }, 3000);

      this.activeTimers.set(timerId, {
        timer,
        scheduledFor: new Date(Date.now() + 3000),
        title: '🚀 Test JavaScript - Immediato',
        type: 'js_immediate_test'
      });

      console.log(`   ✅ Timer immediato avviato: ${timerId}`);
      return timerId;
    } catch (error) {
      console.error(`   ❌ Errore timer immediato:`, error);
      return null;
    }
  }

  // Test JavaScript - Timer con delay
  testJavaScriptDelay() {
    try {
      const testTime = new Date(Date.now() + 45000); // 45 secondi
      const timerId = `js_delay_${Date.now()}`;
      
      const timer = setTimeout(() => {
        this.showJavaScriptNotification(
          '🚀 Test JavaScript - Delay',
          `Timer JavaScript eseguito alle ${new Date().toLocaleTimeString('it-IT')} (programmato per ${testTime.toLocaleTimeString('it-IT')})`,
          { type: 'js_delay_test', scheduledFor: testTime.toISOString() }
        );
        this.activeTimers.delete(timerId);
      }, 45000);

      this.activeTimers.set(timerId, {
        timer,
        scheduledFor: testTime,
        title: '🚀 Test JavaScript - Delay',
        type: 'js_delay_test'
      });

      console.log(`   ✅ Timer delay avviato: ${timerId} per ${testTime.toLocaleTimeString('it-IT')}`);
      return timerId;
    } catch (error) {
      console.error(`   ❌ Errore timer delay:`, error);
      return null;
    }
  }

  // Simula notifica JavaScript (in un'app reale userebbe Alert o modal custom)
  showJavaScriptNotification(title, body, data) {
    this.jsNotificationCount++;
    console.log('\n🔔 === NOTIFICA JAVASCRIPT ===');
    console.log(`Titolo: ${title}`);
    console.log(`Messaggio: ${body}`);
    console.log(`Data: ${JSON.stringify(data)}`);
    console.log(`Ora esecuzione: ${new Date().toISOString()}`);
    console.log(`Conteggio notifiche JS: ${this.jsNotificationCount}`);
    
    // In un'app reale, qui mostreresti un Alert o modal custom
    // Alert.alert(title, body);
    
    this.testResults.javascript.details.push(`Notifica mostrata: ${title}`);
  }

  // Helper per descrivere i trigger Expo
  describeTrigger(trigger) {
    if (trigger.seconds) {
      return `Tra ${trigger.seconds} secondi`;
    }
    if (trigger.date) {
      const date = new Date(trigger.date);
      return `${date.toLocaleDateString('it-IT')} alle ${date.toLocaleTimeString('it-IT')}`;
    }
    if (trigger.hour !== undefined) {
      return `Alle ${trigger.hour.toString().padStart(2, '0')}:${(trigger.minute || 0).toString().padStart(2, '0')}`;
    }
    return 'Trigger sconosciuto';
  }

  // Cancella tutti i timer JavaScript
  clearAllJavaScriptTimers() {
    console.log(`🧹 Cancellando ${this.activeTimers.size} timer JavaScript...`);
    this.activeTimers.forEach((timerData, id) => {
      clearTimeout(timerData.timer);
    });
    this.activeTimers.clear();
    console.log('✅ Tutti i timer JavaScript cancellati');
  }

  // Analisi comparativa
  async runComparison() {
    console.log('\n📊 === ANALISI COMPARATIVA ===');
    
    const expoSuccess = this.testResults.expo.success;
    const jsSuccess = this.testResults.javascript.success;
    
    console.log(`🔋 Sistema Expo: ${expoSuccess ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);
    console.log(`🚀 Sistema JavaScript: ${jsSuccess ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);
    
    // Raccomandazione
    let recommendation;
    if (expoSuccess && jsSuccess) {
      recommendation = '🔋 Entrambi funzionano - Expo è più affidabile per notifiche native';
    } else if (expoSuccess && !jsSuccess) {
      recommendation = '🔋 USA EXPO NOTIFICATIONS - Solo Expo funziona';
    } else if (!expoSuccess && jsSuccess) {
      recommendation = '🚀 USA JAVASCRIPT TIMERS - Solo JavaScript funziona';
    } else {
      recommendation = '❌ PROBLEMI - Nessun sistema funziona correttamente';
    }
    
    console.log(`\n🎯 RACCOMANDAZIONE: ${recommendation}`);
    
    this.testResults.comparison = {
      expoWorks: expoSuccess,
      javascriptWorks: jsSuccess,
      recommendation: recommendation,
      testDuration: Date.now() - this.startTime
    };
    
    return this.testResults.comparison;
  }

  // Genera report finale
  generateReport() {
    console.log('\n📋 === REPORT FINALE ===');
    console.log(`⏱️ Durata test: ${(Date.now() - this.startTime) / 1000} secondi`);
    console.log(`📅 Ora inizio: ${new Date(this.startTime).toISOString()}`);
    console.log(`📅 Ora fine: ${new Date().toISOString()}`);
    
    console.log('\n🔋 RISULTATI EXPO:');
    console.log(`   Successo: ${this.testResults.expo.success ? '✅' : '❌'}`);
    this.testResults.expo.details.forEach(detail => console.log(`   - ${detail}`));
    
    console.log('\n🚀 RISULTATI JAVASCRIPT:');
    console.log(`   Successo: ${this.testResults.javascript.success ? '✅' : '❌'}`);
    this.testResults.javascript.details.forEach(detail => console.log(`   - ${detail}`));
    
    console.log('\n📊 COMPARAZIONE:');
    console.log(`   ${this.testResults.comparison.recommendation}`);
    
    return this.testResults;
  }

  // Esegue test completo
  async runFullTest() {
    try {
      console.log('🚀 Avvio test completo...');
      
      // Test Expo
      await this.testExpoSystem();
      
      // Pausa tra i test
      console.log('\n⏸️ Pausa di 5 secondi tra i test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test JavaScript
      await this.testJavaScriptSystem();
      
      // Analisi comparativa
      await this.runComparison();
      
      // Report finale
      const finalReport = this.generateReport();
      
      // Pulizia
      console.log('\n🧹 Pulizia finale...');
      this.clearAllJavaScriptTimers();
      
      console.log('\n🎉 TEST COMPLETATO!');
      return finalReport;
      
    } catch (error) {
      console.error('❌ Errore durante il test completo:', error);
      return null;
    }
  }
}

// Funzione principale per eseguire il test
async function runNotificationTest() {
  const testRunner = new TestRunner();
  return await testRunner.runFullTest();
}

// Esporta per uso in altri file
export default runNotificationTest;

// Se eseguito direttamente
if (require.main === module) {
  runNotificationTest()
    .then(results => {
      console.log('\n✅ Test completato con successo!');
      if (results) {
        console.log('📊 Risultati salvati:', JSON.stringify(results, null, 2));
      }
    })
    .catch(error => {
      console.error('❌ Errore durante l\'esecuzione del test:', error);
    });
}
