// 🧪 TEST BACKUP BACKGROUND TASK
// Questo script testa il funzionamento del backup automatico in background

console.log('🧪 === TEST BACKUP BACKGROUND TASK ===');
console.log('🧪 Questo test verifica il sistema di backup con app chiusa');
console.log('');

async function runBackgroundBackupTest() {
  try {
    // Import del modulo BackgroundBackupTask
    const { testBackgroundBackupTask, registerBackgroundBackupTask } = require('./src/services/BackgroundBackupTask');
    const SuperBackupService = require('./src/services/SuperBackupService');
    
    console.log('1️⃣ === VERIFICA PREREQUISITI ===');
    
    // Verifica che i moduli siano caricati
    console.log('✅ BackgroundBackupTask importato');
    console.log('✅ SuperBackupService importato');
    
    console.log('\n2️⃣ === TEST REGISTRAZIONE TASK ===');
    
    // Testa la registrazione del task
    const registrationResult = await registerBackgroundBackupTask();
    console.log(`📋 Registrazione task: ${registrationResult ? '✅ SUCCESSO' : '❌ FALLITA'}`);
    
    console.log('\n3️⃣ === TEST METODO BACKUP BACKGROUND ===');
    
    // Testa il metodo di backup background direttamente
    const backupResult = await SuperBackupService.executeBackgroundBackup();
    console.log('📊 Risultato backup background:', backupResult);
    
    if (backupResult.success) {
      console.log('✅ BACKUP BACKGROUND FUNZIONANTE!');
      console.log(`📁 File creato: ${backupResult.fileName}`);
      console.log(`🔑 Chiave: ${backupResult.backupKey}`);
    } else {
      console.log('❌ BACKUP BACKGROUND FALLITO');
      console.log(`🚨 Motivo: ${backupResult.error || backupResult.reason}`);
    }
    
    console.log('\n4️⃣ === TEST COMPLETO BACKGROUND TASK ===');
    
    // Esegue il test completo
    const fullTest = await testBackgroundBackupTask();
    console.log('📊 Test completo:', fullTest);
    
    console.log('\n🎯 === RISULTATI TEST ===');
    
    if (registrationResult && backupResult.success) {
      console.log('🎉 TUTTI I TEST SUPERATI!');
      console.log('✅ Il backup background dovrebbe funzionare con app chiusa');
      console.log('');
      console.log('📋 Per testare con app chiusa:');
      console.log('1. Fai una build nativa (eas build)');
      console.log('2. Installa l\'app sul dispositivo');
      console.log('3. Apri l\'app per registrare il task');
      console.log('4. Chiudi completamente l\'app');
      console.log('5. Aspetta 24 ore o forza l\'esecuzione del task');
      console.log('6. Riapri l\'app e verifica se c\'è un nuovo backup');
    } else {
      console.log('❌ ALCUNI TEST FALLITI');
      console.log('🔧 Controlla i log sopra per i dettagli degli errori');
    }
    
  } catch (error) {
    console.error('💥 ERRORE DURANTE IL TEST:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Esegui il test
runBackgroundBackupTest();

// Export per uso come modulo
module.exports = { runBackgroundBackupTest };
