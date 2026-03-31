// 🧪 TEST PULSANTE CANCELLA TUTTI I BACKUP
// Script per verificare che il metodo deleteAllBackups funzioni

import BackupService from './src/services/BackupService.js';
import { clearAllBackupsFromAsyncStorage } from './App.js';

console.log('🧪 TEST CANCELLAZIONE TUTTI I BACKUP');
console.log('=====================================');

async function testDeleteAllBackups() {
  try {
    console.log('\n1. 🔍 Verifica metodi disponibili...');
    console.log(`BackupService.deleteAllBackups: ${typeof BackupService.deleteAllBackups}`);
    console.log(`clearAllBackupsFromAsyncStorage: ${typeof clearAllBackupsFromAsyncStorage}`);
    
    console.log('\n2. 📊 Lista backup esistenti prima della cancellazione...');
    if (typeof BackupService.getExistingBackups === 'function') {
      const existingBackups = await BackupService.getExistingBackups();
      console.log(`Backup trovati: ${existingBackups.length}`);
      existingBackups.forEach((backup, i) => {
        console.log(`  ${i + 1}. ${backup.name} (${backup.key})`);
      });
    }
    
    console.log('\n3. 🗑️ Test eliminazione...');
    if (typeof BackupService.deleteAllBackups === 'function') {
      console.log('Usando BackupService.deleteAllBackups()...');
      const result = await BackupService.deleteAllBackups();
      console.log('Risultato:', result);
    } else {
      console.log('⚠️ BackupService.deleteAllBackups non disponibile');
      console.log('Usando clearAllBackupsFromAsyncStorage fallback...');
      const deletedCount = await clearAllBackupsFromAsyncStorage();
      console.log(`Eliminati ${deletedCount} backup`);
    }
    
    console.log('\n4. ✅ Verifica dopo cancellazione...');
    if (typeof BackupService.getExistingBackups === 'function') {
      const remainingBackups = await BackupService.getExistingBackups();
      console.log(`Backup rimanenti: ${remainingBackups.length}`);
    }
    
    console.log('\n✅ TEST COMPLETATO');
    
  } catch (error) {
    console.error('❌ ERRORE DURANTE IL TEST:', error);
  }
}

// Esegui test se eseguito direttamente
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testDeleteAllBackups;
} else {
  testDeleteAllBackups();
}

export default testDeleteAllBackups;
