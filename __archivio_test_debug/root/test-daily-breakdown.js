// Test per verificare i dati del riepilogo giornaliero Dashboard
const DatabaseService = require('./src/services/DatabaseService');

async function testDailyBreakdown() {
  try {
    console.log('=== TEST RIEPILOGO GIORNALIERO DASHBOARD ===\n');
    
    // Ottieni entries per il mese corrente
    const entries = await DatabaseService.getWorkEntries(2025, 7); // Luglio 2025
    
    console.log(`📊 Trovate ${entries.length} entries per Luglio 2025:`);
    
    entries.forEach((entry, index) => {
      console.log(`\n${index + 1}. Data: ${entry.date}`);
      console.log(`   SiteName: ${entry.siteName || 'N/A'}`);
      console.log(`   TotalEarnings (salvato DB): €${(entry.totalEarnings || 0).toFixed(2)}`);
      console.log(`   WorkStart1: ${entry.workStart1 || 'N/A'} - WorkEnd1: ${entry.workEnd1 || 'N/A'}`);
      console.log(`   TravelStart: ${entry.travelStart || 'N/A'} - TravelEnd: ${entry.travelEnd || 'N/A'}`);
      console.log(`   IsStandbyDay: ${entry.isStandbyDay ? 'Sì' : 'No'}`);
      
      // Calcola ore approssimative per verificare
      let calculatedHours = 0;
      if (entry.workStart1 && entry.workEnd1) {
        const start = new Date(`1970-01-01T${entry.workStart1}:00`);
        const end = new Date(`1970-01-01T${entry.workEnd1}:00`);
        if (end > start) {
          calculatedHours += (end - start) / (1000 * 60 * 60);
        }
      }
      if (entry.travelStart && entry.travelEnd) {
        const tStart = new Date(`1970-01-01T${entry.travelStart}:00`);
        const tEnd = new Date(`1970-01-01T${entry.travelEnd}:00`);
        if (tEnd > tStart) {
          calculatedHours += (tEnd - tStart) / (1000 * 60 * 60);
        }
      }
      console.log(`   Ore calcolate: ${calculatedHours.toFixed(2)}h`);
    });
    
    if (entries.length === 0) {
      console.log('\n❌ PROBLEMA: Nessuna entry trovata nel database!');
      console.log('🔧 VERIFICA:');
      console.log('1. Hai inserito dei dati tramite il TimeEntryForm?');
      console.log('2. I dati sono stati salvati correttamente nel database?');
      console.log('3. La data corrente è Luglio 2025?');
      
      // Verifica se ci sono entries in altri mesi
      const allEntries = await DatabaseService.getAllWorkEntries();
      console.log(`\n📋 Totale entries nel database: ${allEntries.length}`);
      
      if (allEntries.length > 0) {
        console.log('\n🗓️ Date disponibili nel database:');
        const uniqueDates = [...new Set(allEntries.map(e => e.date))].sort();
        uniqueDates.forEach(date => {
          const entry = allEntries.find(e => e.date === date);
          console.log(`   ${date}: €${(entry.totalEarnings || 0).toFixed(2)}`);
        });
      }
    } else {
      console.log('\n✅ RISULTATO: Ci sono dati nel database!');
      console.log('🔧 Se il riepilogo giornaliero mostra ancora 0, il problema è nella logica di rendering.');
    }
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

testDailyBreakdown();
