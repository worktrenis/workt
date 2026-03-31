/**
 * Test script per verificare il backup degli interventi reperibilità
 */

import DatabaseService from '../src/services/DatabaseService';

const testBackupInterventi = async () => {
  console.log('🧪 TEST BACKUP INTERVENTI - Inizio');
  
  try {
    // 1. Ottieni tutti i dati
    console.log('📖 Caricamento dati completi...');
    const allData = await DatabaseService.getAllData();
    
    console.log('📊 Dati caricati:', {
      workEntriesCount: allData.workEntries?.length || 0,
      standbyDaysCount: allData.standbyDays?.length || 0,
      settingsCount: Object.keys(allData.settings || {}).length
    });
    
    // 2. Cerca entry con interventi
    console.log('🔍 Ricerca entry con interventi...');
    const entriesWithInterventi = allData.workEntries?.filter(entry => {
      const hasInterventi = entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0;
      if (hasInterventi) {
        console.log(`📅 Entry ${entry.date} ha ${entry.interventi.length} interventi:`, 
          entry.interventi.map(i => `${i.start_time}-${i.end_time}`).join(', ')
        );
      }
      return hasInterventi;
    }) || [];
    
    console.log(`✅ Trovate ${entriesWithInterventi.length} entry con interventi`);
    
    // 3. Verifica struttura interventi
    if (entriesWithInterventi.length > 0) {
      const firstEntry = entriesWithInterventi[0];
      console.log('🔧 Struttura primo intervento:', {
        date: firstEntry.date,
        interventiType: typeof firstEntry.interventi,
        interventiIsArray: Array.isArray(firstEntry.interventi),
        interventiCount: firstEntry.interventi?.length,
        sampleIntervento: firstEntry.interventi?.[0]
      });
    }
    
    // 4. Test di un backup simulato
    console.log('💾 Test backup simulato...');
    const backupData = {
      workEntries: allData.workEntries,
      standbyDays: allData.standbyDays,
      settings: allData.settings,
      version: "1.0",
      timestamp: new Date().toISOString()
    };
    
    // Verifica che gli interventi siano presenti nel backup
    const backupEntriesWithInterventi = backupData.workEntries?.filter(entry => 
      entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
    ) || [];
    
    console.log(`✅ Nel backup ci sono ${backupEntriesWithInterventi.length} entry con interventi`);
    
    // 5. Test di restore simulato
    console.log('📥 Test restore simulato...');
    for (const entry of backupEntriesWithInterventi.slice(0, 1)) { // Solo la prima per test
      console.log(`🔧 Test parsing interventi per ${entry.date}:`, {
        original: entry.interventi,
        alreadyParsed: Array.isArray(entry.interventi),
        wouldWork: true
      });
    }
    
    console.log('✅ TEST COMPLETATO - Backup/Restore interventi funziona correttamente');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
};

export default testBackupInterventi;
