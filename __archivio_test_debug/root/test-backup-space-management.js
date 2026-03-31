// 🧪 TEST GESTIONE SPAZIO BACKUP
// Testa il nuovo sistema di pulizia automatica per errori SQLITE_FULL

import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeBackupService from './src/services/NativeBackupService';
import DatabaseService from './src/services/DatabaseService';

async function testBackupSpaceManagement() {
  console.log('🧪 === TEST GESTIONE SPAZIO BACKUP ===\n');
  
  try {
    // 1. Verifica stato attuale AsyncStorage
    console.log('📊 1. STATO ATTUALE ASYNCSTORAGE');
    const allKeys = await AsyncStorage.getAllKeys();
    const backupKeys = allKeys.filter(key => 
      key.startsWith('backup_') || 
      key.startsWith('auto_backup_') ||
      key.includes('_backup_')
    );
    
    console.log(`   Totale chiavi AsyncStorage: ${allKeys.length}`);
    console.log(`   Backup esistenti: ${backupKeys.length}`);
    
    // Calcola spazio occupato approssimativo
    let totalSize = 0;
    for (const key of backupKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          console.log(`   - ${key}: ${(data.length/1024).toFixed(1)}KB`);
        }
      } catch (e) {
        console.log(`   - ${key}: ERRORE lettura`);
      }
    }
    
    console.log(`   Spazio backup totale: ${(totalSize/1024/1024).toFixed(2)}MB\n`);
    
    // 2. Test funzione pulizia
    console.log('🧹 2. TEST PULIZIA BACKUP VECCHI');
    await NativeBackupService.cleanOldBackups();
    
    // Ricontrolla dopo pulizia
    const newKeys = await AsyncStorage.getAllKeys();
    const newBackupKeys = newKeys.filter(key => 
      key.startsWith('backup_') || 
      key.startsWith('auto_backup_') ||
      key.includes('_backup_')
    );
    
    console.log(`   Backup dopo pulizia: ${newBackupKeys.length}`);
    console.log(`   Backup rimossi: ${backupKeys.length - newBackupKeys.length}\n`);
    
    // 3. Test ottimizzazione database
    console.log('🗃️ 3. TEST OTTIMIZZAZIONE DATABASE');
    const dbStats = await DatabaseService.getDatabaseStats();
    console.log('   Statistiche database:');
    console.log(`   - Tabelle: ${dbStats.tableCount}`);
    console.log(`   - Righe totali: ${dbStats.totalRows}`);
    console.log(`   - Dimensione stimata: ${dbStats.estimatedSize}\n`);
    
    console.log('   Eseguendo ottimizzazione...');
    await DatabaseService.optimizeDatabase();
    console.log('   ✅ Ottimizzazione completata\n');
    
    // 4. Test backup dopo ottimizzazione
    console.log('💾 4. TEST BACKUP DOPO OTTIMIZZAZIONE');
    const backupResult = await NativeBackupService.executeBackup(false);
    
    if (backupResult.success) {
      console.log('   ✅ Backup riuscito dopo ottimizzazione');
      console.log(`   📁 Salvato in: ${backupResult.path}`);
    } else {
      console.log('   ❌ Backup ancora in errore:');
      console.error(`   Errore: ${backupResult.error}`);
    }
    
    // 5. Test simulazione errore SQLITE_FULL
    console.log('\n🧪 5. SIMULAZIONE GESTIONE ERRORE SQLITE_FULL');
    
    // Crea un backup fittizio per testare la gestione dell'errore
    const testBackupKey = 'test_backup_' + Date.now();
    const fakeBackupData = {
      timestamp: new Date().toISOString(),
      test: 'Questo è un test per verificare la gestione SQLITE_FULL',
      size: 'large'
    };
    
    const saveResult = await NativeBackupService.saveToAsyncStorage(testBackupKey, fakeBackupData);
    
    if (saveResult.success) {
      console.log('   ✅ Salvataggio test riuscito');
      // Pulisci il test
      await AsyncStorage.removeItem(testBackupKey);
    } else {
      console.log('   ❌ Errore nel salvataggio test:');
      console.error(`   ${saveResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ ERRORE NEL TEST:', error);
  }
  
  console.log('\n🏁 === TEST COMPLETATO ===');
}

// Esegui il test
testBackupSpaceManagement();
