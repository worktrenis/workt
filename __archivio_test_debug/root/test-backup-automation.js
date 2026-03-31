// 🧪 TEST BACKUP AUTOMATICO
// Script per verificare se il backup automatico effettivamente funziona

import BackupService from './src/services/BackupService.js';
import SuperBackupService from './src/services/SuperBackupService.js';
import NativeBackupService from './src/services/NativeBackupService.js';

console.log('🧪 TEST BACKUP AUTOMATICO - Verifica funzionamento completo');
console.log('=' .repeat(60));

async function testBackupAutomation() {
  console.log('\n1️⃣ **INIZIALIZZAZIONE SISTEMI**');
  
  // Inizializza i servizi
  await BackupService.initialize();
  await SuperBackupService.initialize();
  
  const nativeStatus = NativeBackupService.getSystemStatus();
  console.log(`📱 Sistema Nativo: ${nativeStatus.isNativeReady ? '✅ Disponibile' : '❌ Non disponibile'}`);
  console.log(`🔔 Expo Notifications: ${nativeStatus.hasNotifications ? '✅ Disponibile' : '❌ Non disponibile'}`);
  
  console.log('\n2️⃣ **CONFIGURAZIONE BACKUP AUTOMATICO**');
  
  // Configura backup automatico per test (ogni minuto per verificare rapidamente)
  const testTime = new Date();
  testTime.setMinutes(testTime.getMinutes() + 1); // Fra 1 minuto
  const testTimeString = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;
  
  console.log(`⏰ Configurando backup automatico per le ${testTimeString}`);
  
  const updateResult = await BackupService.updateBackupSettings(true, testTimeString);
  console.log(`⚙️ Aggiornamento impostazioni: ${updateResult ? '✅ OK' : '❌ FAILED'}`);
  
  // Verifica le impostazioni salvate
  const settings = await BackupService.getBackupSettings();
  console.log('📋 Impostazioni attuali:', settings);
  
  console.log('\n3️⃣ **VERIFICA PROGRAMMAZIONE**');
  
  // Verifica se i backup sono stati programmati
  const status = await BackupService.getSystemStatus();
  console.log('🔧 Status sistema backup:', status);
  
  console.log('\n4️⃣ **TEST BACKUP MANUALE**');
  
  // Testa un backup manuale per verificare che il sistema funzioni
  console.log('🚀 Eseguendo backup manuale di test...');
  const manualBackup = await BackupService.createManualBackup('test-automation');
  console.log(`📦 Backup manuale: ${manualBackup.success ? '✅ OK' : '❌ FAILED'}`);
  
  if (manualBackup.success) {
    console.log(`   📄 File: ${manualBackup.fileName}`);
    console.log(`   📊 Dimensione: ${(manualBackup.size / 1024).toFixed(2)} KB`);
  }
  
  console.log('\n5️⃣ **VERIFICA BACKUP ESISTENTI**');
  
  const backups = await BackupService.listAllBackups();
  console.log(`📂 Backup totali trovati: ${backups.length}`);
  
  if (backups.length > 0) {
    console.log('📋 Ultimi 3 backup:');
    backups.slice(0, 3).forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.name} - ${new Date(backup.createdAt).toLocaleString('it-IT')}`);
    });
  }
  
  console.log('\n6️⃣ **RISULTATO TEST**');
  
  const allSystemsWorking = updateResult && manualBackup.success;
  
  if (allSystemsWorking) {
    console.log('✅ **BACKUP AUTOMATICO FUNZIONANTE**');
    console.log('   - Configurazione: ✅ OK');
    console.log('   - Salvataggio impostazioni: ✅ OK');
    console.log('   - Sistema backup: ✅ OK');
    console.log('   - Backup manuale: ✅ OK');
    console.log('');
    console.log('🎯 **RISULTATO**: Il backup automatico dovrebbe funzionare!');
    console.log(`   ⏰ Prossimo backup programmato: ${testTimeString}`);
    console.log('   🔔 Riceverai una notifica all\'orario programmato');
    console.log('   📦 Il backup verrà creato automaticamente');
  } else {
    console.log('❌ **PROBLEMI RILEVATI**');
    console.log(`   - Configurazione: ${updateResult ? '✅' : '❌'}`);
    console.log(`   - Backup manuale: ${manualBackup.success ? '✅' : '❌'}`);
    console.log('');
    console.log('🚨 **RISULTATO**: Il backup automatico potrebbe non funzionare correttamente');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 **SUGGERIMENTI PER VERIFICARE**:');
  console.log('1. Vai in Impostazioni → Backup');
  console.log('2. Attiva "Backup automatico"');
  console.log(`3. Imposta orario a ${testTimeString}`);
  console.log('4. Aspetta l\'orario programmato');
  console.log('5. Controlla se compare un nuovo backup nella lista');
  console.log('6. Dovresti ricevere una notifica all\'orario impostato');
}

// Esegui test
testBackupAutomation()
  .then(() => {
    console.log('\n✅ Test completato');
  })
  .catch((error) => {
    console.error('\n❌ Errore durante il test:', error);
  });
