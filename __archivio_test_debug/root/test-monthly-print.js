// 🧪 TEST STAMPA PDF MENSILE
// Test del servizio MonthlyPrintService

import MonthlyPrintService from '../src/services/MonthlyPrintService';

async function testMonthlyPrint() {
  try {
    console.log('🧪 TEST - Inizio test stampa PDF mensile');
    
    // Test per il mese corrente (luglio 2025)
    const year = 2025;
    const month = 7;
    
    console.log(`🧪 TEST - Test per ${month}/${year}`);
    
    // 1. Test recupero dati
    console.log('📊 TEST - Recupero dati mensili...');
    const data = await MonthlyPrintService.getAllMonthlyData(year, month);
    
    console.log(`📊 TEST - Dati recuperati:`);
    console.log(`  - Inserimenti: ${data.workEntries.length}`);
    console.log(`  - Settings: ${Object.keys(data.settings).length} chiavi`);
    console.log(`  - Standby: ${data.standbyData.length} giorni`);
    console.log(`  - Calcoli: ${data.monthlyCalculations ? 'OK' : 'MANCANTI'}`);
    
    // 2. Test generazione HTML
    console.log('🎨 TEST - Generazione HTML...');
    const html = MonthlyPrintService.generateCompletePrintHTML(data);
    console.log(`🎨 TEST - HTML generato: ${html.length} caratteri`);
    
    // 3. Test log contenuto
    console.log('📋 TEST - Log contenuto...');
    MonthlyPrintService.logPrintContent(data);
    
    // 4. Mostra anteprima inserimenti
    console.log('\n📅 TEST - Anteprima inserimenti:');
    data.workEntries.forEach((entry, index) => {
      const hasData = entry.work_start_1 || entry.total_earnings > 0 || entry.notes;
      console.log(`  ${index + 1}. ${entry.date} - ${entry.site_name || 'N/A'} - ${hasData ? '✅ HAS DATA' : '❌ EMPTY'}`);
      
      if (hasData) {
        console.log(`     Orari: ${entry.work_start_1 || 'N/A'} - ${entry.work_end_1 || 'N/A'}`);
        console.log(`     Compenso: ${entry.total_earnings || 0}€`);
        if (entry.notes) console.log(`     Note: ${entry.notes}`);
      }
    });
    
    console.log('\n✅ TEST COMPLETATO - Servizio pronto per l\'uso');
    
  } catch (error) {
    console.error('❌ TEST FALLITO:', error);
  }
}

// Esegui test se questo file viene lanciato direttamente
if (require.main === module) {
  testMonthlyPrint();
}

export default testMonthlyPrint;
