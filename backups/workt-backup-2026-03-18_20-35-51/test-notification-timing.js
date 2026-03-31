// 🧪 TEST SPECIFICO PER TIMING DELLE NOTIFICHE
// Verifica perché le notifiche arrivano subito invece di essere programmate

console.log('🧪 === TEST TIMING NOTIFICHE ===');

// Simula l'ambiente React Native per il test
global.console = console;

try {
  // Importa il SuperNotificationService
  const SuperNotificationService = require('./src/services/SuperNotificationService.js');
  
  async function testNotificationTiming() {
    console.log('🚀 Inizializzazione SuperNotificationService...');
    
    const service = new SuperNotificationService();
    
    // Test 1: Verifica inizializzazione
    console.log('📱 Stato iniziale:', {
      initialized: service.initialized,
      hasPermission: service.hasPermission
    });
    
    // Test 2: Simula programmazione notifica per domani
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    console.log('📅 Data corrente:', new Date().toISOString());
    console.log('📅 Data programmata:', tomorrow.toISOString());
    console.log('⏰ Differenza (ore):', (tomorrow.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    
    // Test 3: Verifica logica di confronto date
    const now = new Date();
    const isInFuture = tomorrow > now;
    console.log('🔮 È nel futuro?', isInFuture);
    
    // Test 4: Simula la configurazione trigger di Expo
    const triggerConfig = {
      date: tomorrow
    };
    
    console.log('⚙️ Configurazione trigger:', JSON.stringify(triggerConfig, null, 2));
    
    // Test 5: Verifica settings di default
    try {
      const testSettings = {
        enabled: true,
        morningTime: '08:00',
        eveningTime: '18:00',
        weekendsEnabled: false
      };
      
      console.log('📋 Settings test:', testSettings);
      
      // Simula la logica di programmazione
      const [hours, minutes] = testSettings.morningTime.split(':').map(Number);
      const daysToSchedule = testSettings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
      
      console.log('🕐 Ore programmate:', hours, ':', minutes);
      console.log('📆 Giorni inclusi:', daysToSchedule);
      
      // Test programmazione per i prossimi 3 giorni
      for (let day = 1; day <= 3; day++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        
        console.log(`📅 Giorno +${day}:`, {
          date: targetDate.toDateString(),
          dayOfWeek: targetDate.getDay(),
          included: daysToSchedule.includes(targetDate.getDay())
        });
        
        if (!daysToSchedule.includes(targetDate.getDay())) {
          console.log(`   ⏭️ Saltato (weekend non abilitato)`);
          continue;
        }
        
        targetDate.setHours(hours, minutes, 0, 0);
        
        const isValidTime = targetDate > now;
        console.log(`   ⏰ Orario: ${targetDate.toISOString()}`);
        console.log(`   ✅ Valido: ${isValidTime}`);
        
        if (isValidTime) {
          console.log(`   📱 PROGRAMMAZIONE: ${targetDate.toLocaleString('it-IT')}`);
        }
      }
      
    } catch (settingsError) {
      console.error('❌ Errore test settings:', settingsError.message);
    }
    
    console.log('✅ Test timing completato');
  }
  
  // Esegui test
  testNotificationTiming().catch(error => {
    console.error('❌ Errore test:', error.message);
  });
  
} catch (error) {
  console.error('❌ Errore caricamento service:', error.message);
  
  // Test alternativo senza service
  console.log('🔄 Test alternativo...');
  
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  
  console.log('📊 Dati base:');
  console.log('   Ora:', now.toISOString());
  console.log('   Domani 8:00:', tomorrow.toISOString());
  console.log('   Differenza ms:', tomorrow.getTime() - now.getTime());
  console.log('   Differenza ore:', (tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
  console.log('   Nel futuro:', tomorrow > now);
}
