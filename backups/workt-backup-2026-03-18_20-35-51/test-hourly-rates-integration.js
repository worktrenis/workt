// Test di integrazione HourlyRatesService con CalculationService
// Questo test verifica che il nuovo sistema CCNL compliant funzioni correttamente

const CalculationService = require('./src/services/CalculationService');

async function testIntegration() {
  console.log('🧪 TEST INTEGRAZIONE HOURLY RATES SERVICE');
  console.log('==========================================\n');
  
  const calculationService = new CalculationService();
  
  // Abilita il calcolo dettagliato
  calculationService.useDetailedCalculation = true;
  
  // Test case: lavoro dalle 20:00 alle 06:00 (10 ore)
  // Secondo CCNL: dalle 20:00 alle 22:00 = notturno fino 22h (+25%)
  //               dalle 22:00 alle 06:00 = notturno oltre 22h (+35%)
  // Le prime 8 ore devono essere pagate con maggiorazioni per fascia oraria
  // Solo 2 ore sono straordinario
  
  const testWorkEntry = {
    date: '2024-01-15', // Lunedì normale
    startTime: '20:00',
    endTime: '06:00',
    travelKm: 0,
    travelTime: 0,
    notes: 'Test integrazione CCNL compliance'
  };
  
  const testSettings = {
    hourlyRate: 15.00,
    contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
    useDetailedCalculation: true,
    travelHoursSetting: 'NO_TRAVEL'
  };
  
  console.log('📋 Caso di test:');
  console.log(`   Orario: ${testWorkEntry.startTime} - ${testWorkEntry.endTime}`);
  console.log(`   Data: ${testWorkEntry.date}`);
  console.log(`   Tariffa base: €${testSettings.hourlyRate}/ora`);
  console.log(`   Contratto: ${testSettings.contractType}\n`);
  
  try {
    const result = await calculationService.calculateDailyEarnings(testWorkEntry, testSettings);
    
    console.log('📊 RISULTATI:');
    console.log('=============');
    console.log(`💰 Retribuzione totale: €${result.total?.toFixed(2) || 'N/A'}`);
    console.log(`⏰ Ore regolari: ${result.regularHours || 0}h - €${(result.regularPay || 0).toFixed(2)}`);
    console.log(`⚡ Ore straordinarie: ${result.overtimeHours || 0}h - €${(result.overtimePay || 0).toFixed(2)}`);
    console.log(`🚗 Rimborso viaggio: €${(result.travelPay || 0).toFixed(2)}`);
    
    if (result.breakdown) {
      console.log('\n📈 Dettaglio calcolo:');
      console.log(JSON.stringify(result.breakdown, null, 2));
    }
    
    // Verifica della correttezza CCNL
    console.log('\n✅ VERIFICA CCNL COMPLIANCE:');
    
    const expectedMinimum = 15 * 8 * 1.25; // 8 ore con almeno 25% di maggiorazione
    const actualRegularPay = result.regularPay || 0;
    
    if (actualRegularPay >= expectedMinimum) {
      console.log(`✅ Le prime 8 ore sono correttamente maggiorate (€${actualRegularPay.toFixed(2)} >= €${expectedMinimum.toFixed(2)})`);
    } else {
      console.log(`❌ Le prime 8 ore NON sono sufficientemente maggiorate (€${actualRegularPay.toFixed(2)} < €${expectedMinimum.toFixed(2)})`);
    }
    
    const totalHours = (result.regularHours || 0) + (result.overtimeHours || 0);
    if (Math.abs(totalHours - 10) < 0.1) {
      console.log(`✅ Ore totali corrette: ${totalHours}h`);
    } else {
      console.log(`❌ Ore totali incorrette: ${totalHours}h invece di 10h`);
    }
    
  } catch (error) {
    console.log('❌ ERRORE durante il test:', error);
    console.log(error.stack);
  }
}

// Esegui il test
testIntegration().then(() => {
  console.log('\n🏁 Test completato!');
}).catch(error => {
  console.log('💥 Errore critico:', error);
});
