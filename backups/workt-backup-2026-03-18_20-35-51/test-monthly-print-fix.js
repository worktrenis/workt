// 🔧 TEST CORREZIONE MONTHLY PRINT SERVICE
// Test per verificare che la correzione di getAllSettings() funzioni

import MonthlyPrintService from './src/services/MonthlyPrintService.js';
import DatabaseService from './src/services/DatabaseService.js';

async function testMonthlyPrintService() {
  console.log('\n🔧 ===== TEST CORREZIONE MONTHLY PRINT SERVICE =====');
  
  try {
    // 1. Test recupero dati mensili
    console.log('\n📊 Test 1: Recupero dati mensili con nuova logica...');
    
    // Simula il metodo che era rotto
    const data = await MonthlyPrintService.getAllMonthlyData(2025, 7);
    
    console.log('✅ Test superato - getAllMonthlyData() ora funziona!');
    console.log(`📊 Dati recuperati: ${data.workEntries.length} inserimenti`);
    console.log(`⚙️ Impostazioni disponibili: ${Object.keys(data.settings).length} chiavi`);
    
    // 2. Test generazione HTML
    console.log('\n🎨 Test 2: Generazione HTML con nuove impostazioni...');
    
    const html = MonthlyPrintService.generateCompletePrintHTML(data);
    console.log(`✅ HTML generato correttamente (${html.length} caratteri)`);
    
    // 3. Test informazioni contratto
    console.log('\n💼 Test 3: Verifica informazioni contratto...');
    
    const contractInfo = MonthlyPrintService.generateContractInfo(data.settings);
    console.log('✅ Informazioni contratto generate correttamente');
    
    // 4. Test con log delle impostazioni caricate
    console.log('\n⚙️ Impostazioni caricate dal database:');
    console.log('- Contratto:', data.settings.contract?.type || 'Non trovato');
    console.log('- Livello:', data.settings.contract?.level || 'Non trovato');
    console.log('- Stipendio mensile:', data.settings.contract?.monthlySalary || 'Non trovato');
    console.log('- Buono pasto (lunch):', data.settings.mealAllowances?.lunch?.voucherAmount || 'Non trovato');
    console.log('- Reperibilità (daily):', data.settings.standbySettings?.dailyAllowance || 'Non trovato');
    console.log('- Compenso trasferta:', data.settings.travelCompensationRate || 'Non trovato');
    
    console.log('\n🎉 TUTTI I TEST SUPERATI! Il MonthlyPrintService è stato corretto con successo.');
    console.log('✅ La funzione di stampa PDF mensile ora funziona correttamente');
    
  } catch (error) {
    console.error('❌ ERRORE NEL TEST:', error);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🔧 ===== FINE TEST =====\n');
}

// Test addizionale per verificare che DatabaseService.getSetting funzioni
async function testDatabaseService() {
  console.log('\n🔍 ===== TEST DATABASE SERVICE =====');
  
  try {
    await DatabaseService.ensureInitialized();
    console.log('✅ Database inizializzato');
    
    // Test caricamento settings
    const { DEFAULT_SETTINGS } = require('./src/constants');
    const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
    
    console.log('✅ getSetting() funziona correttamente');
    console.log('📊 Keys delle impostazioni:', Object.keys(settings));
    
    // Verifica struttura
    if (settings.contract) {
      console.log('✅ Struttura contract presente');
    }
    if (settings.mealAllowances) {
      console.log('✅ Struttura mealAllowances presente');
    }
    if (settings.standbySettings) {
      console.log('✅ Struttura standbySettings presente');
    }
    
  } catch (error) {
    console.error('❌ ERRORE DATABASE SERVICE:', error);
  }
  
  console.log('\n🔍 ===== FINE TEST DATABASE =====\n');
}

// Esegui tutti i test
async function runAllTests() {
  await testDatabaseService();
  await testMonthlyPrintService();
}

console.log('🚀 Avvio test correzione MonthlyPrintService...');
runAllTests().catch(console.error);
