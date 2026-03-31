/**
 * Test rapido per verificare le statistiche di completamento
 */

import DatabaseService from './src/services/DatabaseService.js';
import FixedDaysService from './src/services/FixedDaysService.js';

async function testCompletionStats() {
  try {
    console.log('🧪 TEST COMPLETION STATS - Inizio test...');
    
    // Inizializza database
    await DatabaseService.init();
    console.log('✅ Database inizializzato');
    
    // Test per luglio 2025
    const startDate = new Date(2025, 6, 1); // Luglio = indice 6
    const endDate = new Date(2025, 6, 31);
    
    console.log('📅 Periodo test:', { 
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    });
    
    // Ottieni tutte le entries per luglio 2025
    const allEntries = await DatabaseService.getWorkEntriesByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    console.log(`📊 Totale entries trovate: ${allEntries.length}`);
    
    // Mostra tutte le entries con i loro completamenti
    console.log('\n📋 TUTTE LE ENTRIES:');
    allEntries.forEach((entry, index) => {
      const completion = entry.completamento_giornata || 'nessuno';
      console.log(`${index + 1}. Data: ${entry.date}, Completamento: "${completion}", Tipo: ${entry.day_type || 'N/A'}`);
    });
    
    // Filtra entries con completamento
    const withCompletion = allEntries.filter(entry => {
      const completion = entry.completamento_giornata || 'nessuno';
      return completion && completion !== 'nessuno';
    });
    
    console.log(`\n🎯 Entries con completamento: ${withCompletion.length}`);
    withCompletion.forEach((entry, index) => {
      console.log(`${index + 1}. Data: ${entry.date}, Completamento: "${entry.completamento_giornata}"`);
    });
    
    // Testa la funzione getCompletionStats
    console.log('\n📊 TESTING getCompletionStats...');
    const stats = await FixedDaysService.getCompletionStats(startDate, endDate);
    
    console.log('\n✅ RISULTATO FINAL:', JSON.stringify(stats, null, 2));
    
    if (stats.totalDays > 0) {
      console.log('\n🎉 SUCCESS! La funzione getCompletionStats funziona correttamente!');
      console.log(`📈 Giorni con completamento: ${stats.totalDays}`);
      console.log(`⏰ Ore totali aggiunte: ${stats.totalHours.toFixed(1)}`);
      
      Object.entries(stats.completionTypes).forEach(([type, data]) => {
        if (data.days > 0) {
          console.log(`   - ${type}: ${data.days} giorni, ${data.hours.toFixed(1)} ore`);
        }
      });
    } else {
      console.log('⚠️  Nessun giorno con completamento trovato');
    }
    
  } catch (error) {
    console.error('❌ ERRORE nel test:', error);
  }
}

// Esegui il test
testCompletionStats();
