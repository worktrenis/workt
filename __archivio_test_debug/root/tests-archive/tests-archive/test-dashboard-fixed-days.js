// Test per verificare la funzionalità della dashboard per giorni fissi
import FixedDaysService from './src/services/FixedDaysService.js';

async function testFixedDaysService() {
  console.log('🧪 Test FixedDaysService - Inizio');
  
  try {
    // Test date (luglio 2025)
    const startDate = new Date(2025, 6, 1); // 1 luglio 2025
    const endDate = new Date(2025, 6, 31);  // 31 luglio 2025
    
    console.log('📅 Periodo test:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
    
    // Test getFixedDaysSummary
    console.log('\n🔍 Test getFixedDaysSummary...');
    const summary = await FixedDaysService.getFixedDaysSummary(startDate, endDate);
    console.log('📊 Summary giorni fissi:', JSON.stringify(summary, null, 2));
    
    // Test getCompletionStats
    console.log('\n🔍 Test getCompletionStats...');
    const completionStats = await FixedDaysService.getCompletionStats(startDate, endDate);
    console.log('📊 Stats completamento giornata:', JSON.stringify(completionStats, null, 2));
    
    // Test helper methods
    console.log('\n🔍 Test calculateTotalWorkHours...');
    const mockEntry = {
      work_start_1: '08:00',
      work_end_1: '12:00',
      work_start_2: '13:00',
      work_end_2: '17:00',
      viaggi: JSON.stringify([
        {
          work_start_1: '18:00',
          work_end_1: '20:00'
        }
      ])
    };
    
    const totalHours = FixedDaysService.calculateTotalWorkHours(mockEntry);
    console.log('⏰ Ore totali calcolate:', totalHours, 'ore');
    
    // Test calculateHoursDifference
    console.log('\n🔍 Test calculateHoursDifference...');
    const hoursDiff = FixedDaysService.calculateHoursDifference('08:00', '17:00');
    console.log('⏰ Differenza ore:', hoursDiff, 'ore');
    
    console.log('\n✅ Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui test
testFixedDaysService();
