/**
 * Test della correzione import dinamico CalculationService
 */

console.log('=== TEST IMPORT DINAMICO ===\n');

const testImportDinamico = async () => {
  try {
    console.log('🔍 Testando import dinamico CalculationService...');
    
    // Test import dinamico
    const CalculationServiceModule = await import('./src/services/CalculationService.js');
    console.log('✅ Import dinamico riuscito');
    
    const CalculationService = CalculationServiceModule.default;
    console.log('✅ Classe CalculationService estratta');
    
    const service = new CalculationService();
    console.log('✅ Istanza CalculationService creata');
    
    // Test del metodo
    if (typeof service.calculateMonthlyStandbyAllowances === 'function') {
      console.log('✅ Metodo calculateMonthlyStandbyAllowances disponibile');
    } else {
      console.log('❌ Metodo calculateMonthlyStandbyAllowances non trovato');
    }
    
    console.log('\n🎯 RISULTATO: Import dinamico funziona!');
    console.log('📱 Ora prova a generare il PDF nell\'app');
    
  } catch (error) {
    console.error('❌ Errore durante test import dinamico:', error.message);
    console.log('\n💡 Possibili soluzioni:');
    console.log('1. Verifica che il file CalculationService.js esista');
    console.log('2. Controlla che sia un ES6 module');
    console.log('3. Assicurati che export default sia presente');
  }
};

testImportDinamico();
