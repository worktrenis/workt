const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./work_tracker.db');

console.log('🔍 Checking database structure...');

// Verifica tabelle
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('❌ Error getting tables:', err);
    db.close();
    return;
  }
  
  console.log('📋 Available tables:');
  rows.forEach(row => console.log(`- ${row.name}`));
  
  // Verifica work_entries
  const hasWorkEntries = rows.some(r => r.name === 'work_entries');
  if (hasWorkEntries) {
    console.log('\n✅ work_entries table found, checking data...');
    
    // Conteggio totale
    db.all('SELECT COUNT(*) as total FROM work_entries', (err2, countRows) => {
      if (err2) {
        console.error('❌ Error counting entries:', err2);
        db.close();
        return;
      }
      
      console.log(`📊 Total work entries: ${countRows[0].total}`);
      
      if (countRows[0].total > 0) {
        // Verifica entries per mese
        db.all(`SELECT 
          substr(date, 1, 7) as month, 
          COUNT(*) as count 
        FROM work_entries 
        GROUP BY substr(date, 1, 7) 
        ORDER BY month DESC 
        LIMIT 10`, (err3, monthRows) => {
          if (err3) {
            console.error('❌ Error getting monthly data:', err3);
          } else {
            console.log('\n📅 Entries by month:');
            monthRows.forEach(row => console.log(`${row.month}: ${row.count} entries`));
            
            // Mostra un esempio di entry
            db.all('SELECT * FROM work_entries LIMIT 1', (err4, sampleRows) => {
              if (err4) {
                console.error('❌ Error getting sample:', err4);
              } else if (sampleRows.length > 0) {
                console.log('\n📝 Sample entry structure:');
                console.log(JSON.stringify(sampleRows[0], null, 2));
              }
              db.close();
            });
          }
        });
      } else {
        console.log('⚠️ No entries found in database');
        db.close();
      }
    });
  } else {
    console.log('❌ work_entries table not found');
    db.close();
  }
});
