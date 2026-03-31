const CalculationService = require('./CalculationService');

async function testFasce25Luglio() {
  console.log('🧪 TEST FASCE ORARIE - 25 LUGLIO 2025');
  console.log('=' * 50);
  
  try {
    // Crea il servizio di calcolo
    const calculationService = new CalculationService();
    calculationService.useDetailedCalculation = true;
    
    // Simula l'entry del 25/07/2025 (multi-turno notturno)
    const workEntry = {
      date: '2025-07-25',
      startTime: '20:00',
      endTime: '06:00', // Turno notturno 20:00-06:00 (10 ore)
      workStart1: '20:00',
      workEnd1: '06:00',
      workStart2: null,
      workEnd2: null,
      travelKm: 0,
      travelTime: 0,
      notes: 'Test fasce orarie notturne'
    };
    
    // Impostazioni CCNL
    const settings = {
      hourlyRate: 16.15,
      contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
      useDetailedCalculation: true,
      travelHoursSetting: 'NO_TRAVEL'
    };
    
    console.log('📋 Entry di test:', JSON.stringify(workEntry, null, 2));
    console.log('⚙️ Settings:', JSON.stringify(settings, null, 2));
    
    // Esegui il calcolo
    console.log('\n🔄 Eseguendo calcolo...');
    const result = await calculationService.calculateDailyEarnings(workEntry, settings);
    
    console.log('\n📊 RISULTATI:');
    console.log('─'.repeat(40));
    console.log(`💰 Retribuzione totale: €${(result.totalPay || result.regularPay + result.overtimePay || 0).toFixed(2)}`);
    console.log(`⏰ Ore totali: ${(result.totalHours || result.regularHours + result.overtimeHours || 0).toFixed(1)}h`);
    console.log(`📈 Tariffa media: €${((result.totalPay || result.regularPay + result.overtimePay || 0) / (result.totalHours || result.regularHours + result.overtimeHours || 1)).toFixed(2)}/h`);
    
    if (result.breakdown) {
      console.log('\n🔍 BREAKDOWN DETTAGLIATO:');
      console.log(JSON.stringify(result.breakdown, null, 2));
    }
    
    // Verifica se sta usando le fasce orarie
    const expectedMinimumRate = 16.15 * 1.25; // Dovrebbe avere almeno maggiorazione serale
    const actualRate = (result.totalPay || result.regularPay + result.overtimePay || 0) / (result.totalHours || result.regularHours + result.overtimeHours || 1);
    
    console.log('\n✅ VERIFICHE:');
    console.log('─'.repeat(40));
    
    if (actualRate >= expectedMinimumRate) {
      console.log(`✅ Maggiorazioni applicate correttamente (€${actualRate.toFixed(2)}/h >= €${expectedMinimumRate.toFixed(2)}/h)`);
    } else {
      console.log(`❌ Maggiorazioni insufficienti (€${actualRate.toFixed(2)}/h < €${expectedMinimumRate.toFixed(2)}/h)`);
    }
    
    if ((result.totalHours || result.regularHours + result.overtimeHours || 0) >= 9.5) {
      console.log(`✅ Ore riconosciute correttamente (${(result.totalHours || result.regularHours + result.overtimeHours || 0).toFixed(1)}h)`);
    } else {
      console.log(`❌ Ore insufficienti (${(result.totalHours || result.regularHours + result.overtimeHours || 0).toFixed(1)}h)`);
    }
    
    // Verifica se usa le fasce orarie personalizzate
    const usesAdvancedRates = result.breakdown && (
      result.breakdown.timeSlotBreakdown || 
      result.breakdown.hourlyRateBreakdown ||
      (result.breakdown.includes && result.breakdown.includes('fascia'))
    );
    
    if (usesAdvancedRates) {
      console.log('✅ Sistema fasce orarie avanzate attivo');
    } else {
      console.log('❌ Sistema fasce orarie tradizionale (8 ore base)');
    }
    
  } catch (error) {
    console.error('❌ ERRORE NEL TEST:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Esegui il test
testFasce25Luglio();
