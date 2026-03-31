/**
 * 🔍 TEST MANUALE BACKUP PROBLEM - Debug completo inserimenti vuoti
 * 
 * Script per identificare esattamente dove si perdono i dati negli inserimenti
 */

const DatabaseService = require('./src/services/DatabaseService.js');
const BackupService = require('./src/services/BackupService.js');
const { createWorkEntryFromData } = require('./src/utils/earningsHelper.js');

async function testCompleteBackupFlow() {
  console.log('🔍 ===== TEST COMPLETO BACKUP FLOW =====\n');
  
  try {
    // STEP 1: Verifica database raw
    console.log('STEP 1: 📊 Controllo database RAW...');
    const rawEntries = await DatabaseService.getAllWorkEntries();
    console.log(`  📝 Raw entries: ${rawEntries.length}`);
    
    if (rawEntries.length === 0) {
      console.log('❌ PROBLEMA: Database vuoto! Non ci sono inserimenti da testare.');
      return;
    }
    
    // Analizza primo entry raw
    const firstRaw = rawEntries[0];
    console.log('  📋 Primo raw entry completo:', {
      id: firstRaw.id,
      date: firstRaw.date,
      site_name: firstRaw.site_name,
      work_start_1: firstRaw.work_start_1,
      work_end_1: firstRaw.work_end_1,
      work_hours: firstRaw.work_hours,
      overtime_hours: firstRaw.overtime_hours,
      gross_amount: firstRaw.gross_amount,
      travel_hours: firstRaw.travel_hours,
      travel_allowance: firstRaw.travel_allowance,
      standby_hours: firstRaw.standby_hours,
      intervention_hours: firstRaw.intervention_hours,
      viaggi: firstRaw.viaggi,
      interventi: firstRaw.interventi,
      day_type: firstRaw.day_type,
      completion_type: firstRaw.completion_type,
      notes: firstRaw.notes
    });
    
    // Check se i campi sono effettivamente vuoti
    const isEmpty = !firstRaw.work_start_1 && !firstRaw.work_end_1 && 
                   (!firstRaw.work_hours || firstRaw.work_hours === 0) &&
                   (!firstRaw.gross_amount || firstRaw.gross_amount === 0);
    
    if (isEmpty) {
      console.log('❌ PROBLEMA TROVATO: L\'entry nel database è già vuota!');
      console.log('   Questo significa che il problema non è nel backup, ma nell\'inserimento dati.');
    } else {
      console.log('✅ Entry raw contiene dati validi.');
    }
    
    // STEP 2: Test createWorkEntryFromData
    console.log('\nSTEP 2: 🔄 Test createWorkEntryFromData...');
    const processed = createWorkEntryFromData(firstRaw);
    console.log('  📋 Entry processata:', {
      id: processed.id,
      date: processed.date,
      siteName: processed.siteName,
      workStart1: processed.workStart1,
      workEnd1: processed.workEnd1,
      workHours: processed.workHours,
      overtimeHours: processed.overtimeHours,
      grossAmount: processed.grossAmount,
      travelHours: processed.travelHours,
      travelAllowance: processed.travelAllowance,
      standbyHours: processed.standbyHours,
      interventionHours: processed.interventionHours,
      viaggi: processed.viaggi,
      interventi: processed.interventi,
      dayType: processed.dayType,
      completionType: processed.completionType,
      notes: processed.notes
    });
    
    // STEP 3: Test getAllData
    console.log('\nSTEP 3: 🗃️ Test getAllData...');
    const allData = await DatabaseService.getAllData();
    console.log(`  📝 getAllData entries: ${allData.workEntries.length}`);
    
    if (allData.workEntries.length > 0) {
      const firstGetAll = allData.workEntries[0];
      console.log('  📋 Primo getAllData entry:', {
        id: firstGetAll.id,
        date: firstGetAll.date,
        siteName: firstGetAll.siteName,
        workStart1: firstGetAll.workStart1,
        workEnd1: firstGetAll.workEnd1,
        workHours: firstGetAll.workHours,
        overtimeHours: firstGetAll.overtimeHours,
        grossAmount: firstGetAll.grossAmount
      });
    }
    
    // STEP 4: Test backup
    console.log('\nSTEP 4: 💾 Test backup creation...');
    const backupResult = await BackupService.createLocalBackup('test-debug');
    console.log(`  📁 Backup creato: ${backupResult.filename}`);
    
    // STEP 5: Test lettura backup
    console.log('\nSTEP 5: 📖 Test lettura backup...');
    const backupContent = await BackupService.readBackupFile(backupResult.filePath);
    console.log(`  📝 Backup entries: ${backupContent.workEntries.length}`);
    
    if (backupContent.workEntries.length > 0) {
      const firstBackup = backupContent.workEntries[0];
      console.log('  📋 Primo backup entry:', {
        id: firstBackup.id,
        date: firstBackup.date,
        siteName: firstBackup.siteName,
        workStart1: firstBackup.workStart1,
        workEnd1: firstBackup.workEnd1,
        workHours: firstBackup.workHours,
        overtimeHours: firstBackup.overtimeHours,
        grossAmount: firstBackup.grossAmount
      });
    }
    
    // STEP 6: CONFRONTO FINALE
    console.log('\nSTEP 6: 📊 CONFRONTO FINALE...');
    
    const rawHours = firstRaw.work_hours || 0;
    const rawGross = firstRaw.gross_amount || 0;
    const processedHours = processed.workHours || 0;
    const processedGross = processed.grossAmount || 0;
    const getAllHours = allData.workEntries[0]?.workHours || 0;
    const getAllGross = allData.workEntries[0]?.grossAmount || 0;
    const backupHours = backupContent.workEntries[0]?.workHours || 0;
    const backupGross = backupContent.workEntries[0]?.grossAmount || 0;
    
    console.log('  ⏰ Work Hours:');
    console.log(`    Raw DB: ${rawHours}`);
    console.log(`    Processed: ${processedHours}`);
    console.log(`    GetAllData: ${getAllHours}`);
    console.log(`    Backup: ${backupHours}`);
    
    console.log('  💰 Gross Amount:');
    console.log(`    Raw DB: ${rawGross}`);
    console.log(`    Processed: ${processedGross}`);
    console.log(`    GetAllData: ${getAllGross}`);
    console.log(`    Backup: ${backupGross}`);
    
    // DIAGNOSI
    console.log('\n🎯 DIAGNOSI:');
    if (rawHours === 0 && rawGross === 0) {
      console.log('❌ PROBLEMA: I dati sono vuoti già nel database!');
      console.log('   → Il problema è nell\'inserimento/salvataggio dati nel TimeEntryForm');
    } else if (processedHours === 0 || processedGross === 0) {
      console.log('❌ PROBLEMA: createWorkEntryFromData sta svuotando i dati!');
      console.log('   → Il problema è nella funzione di trasformazione');
    } else if (getAllHours === 0 || getAllGross === 0) {
      console.log('❌ PROBLEMA: getAllData sta perdendo i dati!');
      console.log('   → Il problema è nella funzione getAllData del DatabaseService');
    } else if (backupHours === 0 || backupGross === 0) {
      console.log('❌ PROBLEMA: Il backup sta perdendo i dati!');
      console.log('   → Il problema è nel BackupService');
    } else {
      console.log('✅ TUTTO OK: I dati fluiscono correttamente attraverso tutto il sistema!');
    }
    
  } catch (error) {
    console.error('❌ ERRORE durante test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Esegui il test
testCompleteBackupFlow();
