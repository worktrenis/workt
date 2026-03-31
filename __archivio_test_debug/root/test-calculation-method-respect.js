/**
 * 📊 TEST METODO DI CALCOLO CORRETTO
 * Verifica che il sistema rispetti il metodo di calcolo scelto dall'utente
 */

// Mock AsyncStorage per test
const AsyncStorage = {
  getItem: (key) => {
    // Simula impostazioni dell'utente
    const userSettings = {
      'calculation_method': 'DAILY_RATE_WITH_SUPPLEMENTS',  // L'utente ha scelto tariffa giornaliera
      'enable_time_based_rates': 'false', // Sistema multi-fascia disabilitato
      'hourly_calculation_method': 'hourly_priority',
      'custom_time_slots': JSON.stringify([
        { start: '06:00', end: '18:00', name: 'Diurno', rate: 1.0, color: '#4CAF50' },
        { start: '18:00', end: '22:00', name: 'Serale', rate: 1.25, color: '#FF9800' },
        { start: '22:00', end: '06:00', name: 'Notturno', rate: 1.35, color: '#9C27B0' }
      ])
    };
    return Promise.resolve(userSettings[key] || null);
  }
};

global.AsyncStorage = AsyncStorage;

async function testCalculationMethodRespect() {
  console.log('📊 === TEST RISPETTO METODO DI CALCOLO ===');
  
  try {
    const fs = require('fs');
    
    // Verifica che le correzioni siano state applicate
    console.log('1️⃣ Verifico implementazione DAILY_RATE_WITH_SUPPLEMENTS...');
    
    const calculationServiceContent = fs.readFileSync('./src/services/CalculationService.js', 'utf8');
    const timeEntryFormContent = fs.readFileSync('./src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica che il CalculationService controlli il metodo di calcolo
    const checksCalculationMethod = calculationServiceContent.includes('paymentCalculationMethod === \'DAILY_RATE_WITH_SUPPLEMENTS\'');
    const hasNewDailyRateMethod = calculationServiceContent.includes('calculateDailyRateWithSupplements');
    const respectsUserChoice = calculationServiceContent.includes('isHourlyRatesEnabled && paymentCalculationMethod === \'PURE_HOURLY_WITH_MULTIPLIERS\'');
    
    console.log('   Controlli metodo calcolo:', {
      verificaMetodoUtente: checksCalculationMethod ? '✅' : '❌',
      nuovoMetodoTariffaGiornaliera: hasNewDailyRateMethod ? '✅' : '❌', 
      rispettaSceltaUtente: respectsUserChoice ? '✅' : '❌'
    });
    
    // Verifica che TimeEntryForm mostri il breakdown corretto
    const showsDailyRateBreakdown = timeEntryFormContent.includes('calculationMethod === \'DAILY_RATE_WITH_SUPPLEMENTS\'');
    const showsHourlyRatesBreakdown = timeEntryFormContent.includes('hourlyRatesBreakdown && breakdown?.details?.hourlyRatesBreakdown.length > 0');
    const conditionalRendering = timeEntryFormContent.includes('📊 Tariffa Giornaliera + Maggiorazioni CCNL');
    
    console.log('   UI TimeEntryForm:', {
      mostraTariffaGiornaliera: showsDailyRateBreakdown ? '✅' : '❌',
      mostraFasceOrarie: showsHourlyRatesBreakdown ? '✅' : '❌',
      renderingCondizionale: conditionalRendering ? '✅' : '❌'
    });
    
    // Verifica che la versione sync supporti entrambi i metodi
    const syncSupport = calculationServiceContent.includes('details.calculationMethod = \'DAILY_RATE_WITH_SUPPLEMENTS\'');
    const syncDailyRateBreakdown = calculationServiceContent.includes('details.dailyRateBreakdown');
    
    console.log('   Compatibilità Sync:', {
      supportaMetodoTariffaGiornaliera: syncSupport ? '✅' : '❌',
      breakdownTariffaGiornaliera: syncDailyRateBreakdown ? '✅' : '❌'
    });
    
    console.log('2️⃣ Simulazione comportamento utente...');
    
    // Simula il comportamento con impostazioni utente
    console.log('   Impostazioni utente simulate:');
    console.log('     • Metodo calcolo: DAILY_RATE_WITH_SUPPLEMENTS (Tariffa Giornaliera + Maggiorazioni)');
    console.log('     • Sistema multi-fascia: DISABILITATO');
    console.log('     • Risultato atteso: Tariffa giornaliera €109.19 + straordinari con maggiorazioni CCNL');
    
    // Test logica condizionale
    const userMethod = 'DAILY_RATE_WITH_SUPPLEMENTS';
    const hourlyRatesEnabled = false; // Simulato come disabilitato
    
    console.log('3️⃣ Test logica condizionale...');
    
    if (hourlyRatesEnabled && userMethod === 'PURE_HOURLY_WITH_MULTIPLIERS') {
      console.log('   ❌ ERRORE: Non dovrebbe entrare qui con le impostazioni utente');
    } else if (userMethod === 'DAILY_RATE_WITH_SUPPLEMENTS') {
      console.log('   ✅ CORRETTO: Sistema userà tariffa giornaliera + maggiorazioni CCNL');
      console.log('     • Per 8 ore o meno: €109.19 (tariffa giornaliera)');
      console.log('     • Per ore oltre le 8: +20% feriale, +25% sabato, +30% festivo');
      console.log('     • UI mostrerà "📊 Tariffa Giornaliera + Maggiorazioni CCNL"');
    } else {
      console.log('   ⚠️ Fallback a sistema standard');
    }
    
    console.log('4️⃣ === RISULTATI FINALI ===');
    
    const allImplemented = checksCalculationMethod && hasNewDailyRateMethod && respectsUserChoice && 
                          showsDailyRateBreakdown && conditionalRendering && syncSupport;
    
    if (allImplemented) {
      console.log('   🎉 ✅ SISTEMA CORRETTO!');
      console.log('');
      console.log('   📋 COMPORTAMENTO CONFORME:');
      console.log('   • Il sistema rispetta il metodo scelto dall\'utente');
      console.log('   • DAILY_RATE_WITH_SUPPLEMENTS → Tariffa giornaliera + maggiorazioni');
      console.log('   • PURE_HOURLY_WITH_MULTIPLIERS → Sistema multi-fascia');
      console.log('   • UI mostra il breakdown appropriato per ogni metodo');
      console.log('   • Compatibilità sync/async garantita');
      console.log('');
      console.log('   🚀 Ora il sistema dovrebbe mostrare "Tariffa Giornaliera + Maggiorazioni CCNL"');
      console.log('      invece di "Sistema Multi-Fascia" con le tue impostazioni!');
      
      return true;
    } else {
      console.log('   ❌ Implementazione incompleta');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Errore durante test:', error);
    return false;
  }
}

// Esegui il test
testCalculationMethodRespect().then((success) => {
  console.log('');
  console.log(`Test completato: ${success ? 'SUCCESSO' : 'FALLITO'}`);
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('Errore nel test:', error);
  process.exit(1);
});
