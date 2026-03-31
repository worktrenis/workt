// 🔧 SISTEMA DI RIPARAZIONE INTERVENTI CORROTTI

const DatabaseService = require('./src/services/DatabaseService.js');

async function repairCorruptedInterventi() {
  try {
    console.log('🔧 INIZIO RIPARAZIONE INTERVENTI CORROTTI');
    
    // 1. Ottieni tutti i work entries
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`📊 Totale entries da controllare: ${allEntries.length}`);
    
    let repairedCount = 0;
    let corruptedEntries = [];
    
    // 2. Controlla ogni entry
    for (const entry of allEntries) {
      let needsRepair = false;
      let repairedInterventi = [];
      
      if (entry.interventi) {
        if (typeof entry.interventi === 'string') {
          try {
            // Prova a parsare
            const parsed = JSON.parse(entry.interventi);
            if (Array.isArray(parsed)) {
              repairedInterventi = parsed;
            } else {
              needsRepair = true;
              console.warn(`⚠️ Interventi non array per ${entry.date}`);
            }
          } catch (error) {
            needsRepair = true;
            corruptedEntries.push({
              date: entry.date,
              originalData: entry.interventi,
              error: error.message
            });
            console.warn(`❌ Errore parsing interventi per ${entry.date}:`, error.message);
            console.warn(`   Dati originali:`, entry.interventi);
          }
        } else if (Array.isArray(entry.interventi)) {
          repairedInterventi = entry.interventi;
        } else {
          needsRepair = true;
          console.warn(`⚠️ Tipo interventi non riconosciuto per ${entry.date}:`, typeof entry.interventi);
        }
      }
      
      // 3. Ripara se necessario
      if (needsRepair) {
        console.log(`🔧 Riparando entry ${entry.date}...`);
        
        // Aggiorna nel database con array vuoto
        await DatabaseService.db.runAsync(
          `UPDATE work_entries SET interventi = ? WHERE date = ?`,
          [JSON.stringify([]), entry.date]
        );
        
        repairedCount++;
      }
    }
    
    console.log(`\n📊 RISULTATI RIPARAZIONE:`);
    console.log(`✅ Entries riparate: ${repairedCount}`);
    console.log(`❌ Entries corrotte trovate: ${corruptedEntries.length}`);
    
    if (corruptedEntries.length > 0) {
      console.log(`\n🗂️ DETTAGLI ENTRIES CORROTTE:`);
      corruptedEntries.forEach((entry, index) => {
        console.log(`${index + 1}. Data: ${entry.date}`);
        console.log(`   Errore: ${entry.error}`);
        console.log(`   Dati: ${entry.originalData}`);
      });
    }
    
    console.log(`\n✅ RIPARAZIONE COMPLETATA`);
    
    return {
      success: true,
      repairedCount,
      corruptedEntries
    };
    
  } catch (error) {
    console.error('❌ Errore durante riparazione:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Esporta per uso in altri script
module.exports = { repairCorruptedInterventi };

// Se eseguito direttamente
if (require.main === module) {
  repairCorruptedInterventi();
}
