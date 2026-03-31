console.log('TEST RIPRISTINO BACKUP');

const { DatabaseService } = require('./src/services/DatabaseService');

const testRestore = async () => {
  try {
    const db = new DatabaseService();
    console.log('Initializing database...');
    await db.initialize();
    
    console.log('Getting all data...');
    const data = await db.getAllData();
    
    console.log('Data structure:', {
      workEntries: data.workEntries?.length || 0,
      settings: data.settings?.length || 0,
      standbyDays: data.standbyDays?.length || 0
    });
    
    if (data.workEntries && data.workEntries.length > 0) {
      console.log('Sample entry:', data.workEntries[0]);
      
      // Verifica specificamente gli interventi
      const entriesWithInterventi = data.workEntries.filter(entry => 
        entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
      );
      
      console.log('Entries with interventi:', entriesWithInterventi.length);
      
      if (entriesWithInterventi.length > 0) {
        console.log('Sample entry with interventi:', {
          date: entriesWithInterventi[0].date,
          interventi: entriesWithInterventi[0].interventi
        });
      }
    }
    
    // Test backup and restore
    console.log('\n--- TESTING BACKUP & RESTORE ---');
    
    // Create backup
    console.log('Creating backup...');
    const backupData = await db.getAllData();
    
    // Save current entry count
    const originalCount = backupData.workEntries.length;
    console.log('Original entries count:', originalCount);
    
    // Test restore (without actually clearing data for safety)
    console.log('Testing restore process...');
    
    // Check if backup contains all necessary data
    const hasRequiredData = backupData.workEntries && 
                           backupData.settings && 
                           backupData.standbyDays !== undefined;
    
    console.log('Backup data validation:', {
      hasWorkEntries: !!backupData.workEntries,
      workEntriesCount: backupData.workEntries?.length || 0,
      hasSettings: !!backupData.settings,
      settingsCount: backupData.settings?.length || 0,
      hasStandbyDays: backupData.standbyDays !== undefined,
      standbyDaysCount: backupData.standbyDays?.length || 0,
      hasVersion: !!backupData.version,
      hasExportDate: !!backupData.exportDate
    });
    
    if (hasRequiredData) {
      console.log('✅ Backup data is valid and complete');
    } else {
      console.log('❌ Backup data is missing required fields');
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
};

testRestore();
