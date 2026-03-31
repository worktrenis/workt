// Test della sincronizzazione notifiche reperibilità con messaggi dettagliati
const NotificationService = require('./src/services/NotificationService.js').default;

async function testStandbySyncMessages() {
  console.log('🧪 === TEST SINCRONIZZAZIONE NOTIFICHE REPERIBILITÀ ===');
  
  try {
    console.log('🔄 Test 1: Sincronizzazione normale...');
    const result = await NotificationService.syncStandbyNotificationsWithCalendar();
    
    console.log('📊 Risultato sincronizzazione:');
    console.log(`   - Numero date: ${result.count}`);
    console.log(`   - Date trovate: [${result.dates.join(', ')}]`);
    console.log(`   - Messaggio: "${result.message}"`);
    
    if (result.count > 0) {
      console.log('✅ Test PASSATO: Date di reperibilità trovate e messaggio dettagliato generato');
    } else {
      console.log('⚠️ Test INFORMATIVO: Nessuna data trovata (normale se non ci sono date configurate)');
    }
    
    console.log('\n🔄 Test 2: Verifica formato messaggio...');
    if (result.message.includes('undefined')) {
      console.log('❌ PROBLEMA: Il messaggio contiene ancora "undefined"');
    } else {
      console.log('✅ RISOLTO: Il messaggio non contiene più "undefined"');
    }
    
    console.log('\n📋 Messaggio che verrà mostrato all\'utente:');
    console.log(`"${result.message}"`);
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testStandbySyncMessages().then(() => {
  console.log('\n🏁 Test completato!');
}).catch(error => {
  console.error('💥 Errore fatale nel test:', error);
});
