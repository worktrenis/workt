/**
 * 🔧 DEBUG BACKUP SISTEMA - Test completo dopo risoluzione errori
 * Verifica che il backup funzioni correttamente ora che abbiamo risolto i 3k+ errori
 */

const DatabaseService = require('./src/services/DatabaseService.js');
const BackupService = require('./src/services/BackupService.js');

async function testBackupSystem() {
  console.log('🔧 TEST BACKUP SISTEMA - Post-fix errori\n');
  
  try {
    // 1. 📊 Verifica stato database
    console.log('1. 📊 Verifica stato database corrente...');
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`   📝 Totale inserimenti trovati: ${allEntries.length}`);
    
    if (allEntries.length > 0) {
      console.log('   📋 Primo inserimento (sample):');
      const firstEntry = allEntries[0];
      console.log(`   - ID: ${firstEntry.id}`);
      console.log(`   - Data: ${firstEntry.date}`);
      console.log(`   - Ore lavoro: ${firstEntry.workHours}`);
      console.log(`   - Straordinari: ${firstEntry.overtimeHours}`);
      console.log(`   - Importo lordo: €${firstEntry.grossAmount}`);
    } else {
      console.log('   ⚠️ Nessun inserimento trovato nel database');
      return;
    }
    
    // 2. 🗃️ Test getAllData (usato dal backup)
    console.log('\n2. 🗃️ Test funzione getAllData...');
    const allData = await DatabaseService.getAllData();
    console.log(`   📝 Dati processati: ${allData.workEntries.length} inserimenti`);
    
    if (allData.workEntries.length > 0) {
      const processedEntry = allData.workEntries[0];
      console.log('   📋 Primo inserimento processato:');
      console.log(`   - ID: ${processedEntry.id}`);
      console.log(`   - Data: ${processedEntry.date}`);
      console.log(`   - Ore lavoro: ${processedEntry.workHours}`);
      console.log(`   - Importo lordo: €${processedEntry.grossAmount}`);
    }
    
    // 3. 💾 Test creazione backup
    console.log('\n3. 💾 Test creazione backup...');
    const backupResult = await BackupService.createLocalBackup('test-post-fix');
    console.log(`   ✅ Backup creato: ${backupResult.filename}`);
    console.log(`   📁 Percorso: ${backupResult.filePath}`);
    
    // 4. 📖 Verifica contenuto backup
    console.log('\n4. 📖 Lettura contenuto backup...');
    const backupContent = await BackupService.readBackupFile(backupResult.filePath);
    console.log(`   📊 Inserimenti nel backup: ${backupContent.workEntries.length}`);
    
    if (backupContent.workEntries.length > 0) {
      const backupEntry = backupContent.workEntries[0];
      console.log('   📋 Primo inserimento nel backup:');
      console.log(`   - ID: ${backupEntry.id}`);
      console.log(`   - Data: ${backupEntry.date}`);
      console.log(`   - Ore lavoro: ${backupEntry.workHours}`);
      console.log(`   - Importo lordo: €${backupEntry.grossAmount}`);
    }
    
    // 5. 🔄 Test ripristino backup  
    console.log('\n5. 🔄 Test ripristino backup...');
    const restoreResult = await DatabaseService.restoreData(backupContent);
    console.log(`   ✅ Ripristino completato: ${restoreResult.workEntries} inserimenti`);
    
    // 6. 🔍 Verifica post-ripristino
    console.log('\n6. 🔍 Verifica database post-ripristino...');
    const postRestoreEntries = await DatabaseService.getAllWorkEntries();
    console.log(`   📝 Totale inserimenti dopo ripristino: ${postRestoreEntries.length}`);
    
    if (postRestoreEntries.length > 0) {
      const restoredEntry = postRestoreEntries[0];
      console.log('   📋 Primo inserimento ripristinato:');
      console.log(`   - ID: ${restoredEntry.id}`);
      console.log(`   - Data: ${restoredEntry.date}`);
      console.log(`   - Ore lavoro: ${restoredEntry.workHours}`);
      console.log(`   - Straordinari: ${restoredEntry.overtimeHours}`);
      console.log(`   - Importo lordo: €${restoredEntry.grossAmount}`);
    }
    
    console.log('\n🎯 RISULTATO TEST:');
    console.log(`   📊 Database originale: ${allEntries.length} inserimenti`);
    console.log(`   🗃️ Dati processati: ${allData.workEntries.length} inserimenti`);
    console.log(`   💾 Backup salvato: ${backupContent.workEntries.length} inserimenti`);
    console.log(`   🔄 Database ripristinato: ${postRestoreEntries.length} inserimenti`);
    
    // Verifica consistenza dati
    const isDataConsistent = 
      allEntries.length === allData.workEntries.length &&
      allData.workEntries.length === backupContent.workEntries.length &&
      backupContent.workEntries.length === postRestoreEntries.length;
    
    if (isDataConsistent) {
      console.log('   ✅ SUCCESSO: Tutti i passaggi hanno preservato i dati!');
    } else {
      console.log('   ❌ PROBLEMA: Perdita di dati durante il processo!');
    }
    
  } catch (error) {
    console.error('❌ ERRORE durante test backup:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Esegui il test
testBackupSystem();
