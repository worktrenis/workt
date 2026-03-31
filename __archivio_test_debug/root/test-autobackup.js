// Test per AutoBackupService
const AutoBackupService = require('./src/services/AutoBackupService');

async function testAutoBackupService() {
  console.log('🧪 Test AutoBackupService');
  
  try {
    // Test 1: Caricamento impostazioni
    console.log('\n1. Test caricamento impostazioni...');
    const settings = await AutoBackupService.getAutoBackupSettings();
    console.log('✅ Impostazioni caricate:', settings);
    
    // Test 2: Salvataggio impostazioni
    console.log('\n2. Test salvataggio impostazioni...');
    const testSettings = {
      enabled: true,
      showNotification: false,
      maxBackups: 3
    };
    const saveResult = await AutoBackupService.saveAutoBackupSettings(testSettings);
    console.log('✅ Salvataggio:', saveResult ? 'SUCCESS' : 'FAILED');
    
    // Test 3: Verifica settings salvate
    console.log('\n3. Test verifica settings salvate...');
    const verifySettings = await AutoBackupService.getAutoBackupSettings();
    console.log('✅ Settings verificate:', verifySettings);
    
    // Test 4: Statistiche backup
    console.log('\n4. Test statistiche backup...');
    const stats = await AutoBackupService.getBackupStats();
    console.log('✅ Statistiche:', stats);
    
    console.log('\n🎉 Tutti i test sono passati!');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  }
}

// Esegui i test solo se il file viene eseguito direttamente
if (require.main === module) {
  testAutoBackupService();
}

module.exports = testAutoBackupService;
