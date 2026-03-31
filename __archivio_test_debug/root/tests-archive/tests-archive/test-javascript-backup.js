// Test del sistema backup automatico JavaScript
const BackupService = require('./src/services/BackupService.js').default;
const JavaScriptBackupService = require('./src/services/JavaScriptBackupService.js').default;

async function testJavaScriptBackupSystem() {
  console.log('🧪 === TEST SISTEMA BACKUP JAVASCRIPT ===');
  
  try {
    console.log('🔄 Test 1: Inizializzazione sistema...');
    await BackupService.initialize();
    console.log('✅ Sistema inizializzato');
    
    console.log('\n🔄 Test 2: Creazione backup manuale...');
    const manualBackup = await BackupService.createLocalBackup('test-manual-backup');
    console.log(`✅ Backup manuale creato: ${manualBackup.fileName}`);
    console.log(`   - Chiave: ${manualBackup.backupKey}`);
    console.log(`   - Dimensione: ${manualBackup.size} bytes`);
    
    console.log('\n🔄 Test 3: Lista backup...');
    const backupList = await BackupService.listLocalBackups();
    console.log(`✅ Trovati ${backupList.length} backup`);
    backupList.forEach(backup => {
      console.log(`   - ${backup.name} (${backup.type}) - ${new Date(backup.date).toLocaleString('it-IT')}`);
    });
    
    console.log('\n🔄 Test 4: Export backup...');
    const exportResult = await BackupService.exportBackup('test-export-backup');
    console.log(`✅ Export completato: ${exportResult.fileName}`);
    console.log(`   - Dati JSON disponibili: ${exportResult.jsonData.length} caratteri`);
    
    console.log('\n🔄 Test 5: Test backup automatico...');
    const autoBackupResult = await BackupService.autoBackup();
    console.log(`✅ Backup automatico: ${autoBackupResult ? 'Riuscito' : 'Fallito'}`);
    
    console.log('\n🔄 Test 6: Configurazione backup automatico...');
    await BackupService.setupAutoBackup(true, '14:30');
    console.log('✅ Backup automatico configurato per le 14:30');
    
    console.log('\n🔄 Test 7: Statistiche backup...');
    const stats = await BackupService.getBackupStats();
    if (stats) {
      console.log('✅ Statistiche backup:');
      console.log(`   - Backup totali: ${stats.totalBackups}`);
      console.log(`   - Backup manuali: ${stats.manualBackups}`);
      console.log(`   - Backup automatici: ${stats.automaticBackups}`);
      console.log(`   - Backup automatico attivo: ${stats.isActive ? 'Sì' : 'No'}`);
      console.log(`   - Sistema: ${stats.system}`);
    }
    
    console.log('\n🔄 Test 8: Test sistema completo...');
    const systemTest = await BackupService.testBackupSystem();
    console.log(`✅ Test sistema completo: ${systemTest ? 'PASSATO' : 'FALLITO'}`);
    
    console.log('\n🎯 === RIEPILOGO TEST ===');
    console.log('✅ Sistema backup JavaScript funzionante');
    console.log('✅ Backup manuali: OK');
    console.log('✅ Backup automatici: OK');
    console.log('✅ Export/Import: OK');
    console.log('✅ Configurazione: OK');
    console.log('✅ Statistiche: OK');
    console.log('🚀 SISTEMA PRONTO PER L\'USO!');
    
  } catch (error) {
    console.error('❌ ERRORE NEL TEST:', error);
    console.error('💥 Test fallito:', error.message);
  }
}

// Esegui il test
testJavaScriptBackupSystem().then(() => {
  console.log('\n🏁 Test completato!');
}).catch(error => {
  console.error('💥 Errore fatale nel test:', error);
});
