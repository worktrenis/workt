// Test per modalità MULTI_SHIFT_OPTIMIZED con 6.6 ore di lavoro
const { CalculationService } = require('./CalculationService.js');
const { CCNL_CONTRACTS } = require('./src/constants/index.js');

// Inizializza il servizio
const calcService = new CalculationService();

// Dati di test: 6.6 ore di lavoro, nessun viaggio
const workEntry = {
  date: '2025-01-15',
  work_start_1: '08:00',
  work_end_1: '12:00',     // 4 ore
  work_start_2: '13:00', 
  work_end_2: '15:36',     // 2.6 ore
  // Totale: 6.6 ore di lavoro
  departure_home: null,
  arrival_site: null,
  departure_site: null,
  arrival_home: null,
  // Nessun viaggio
  isNight: false,
  dayType: 'lavorativa'
};

// Impostazioni con modalità MULTI_SHIFT_OPTIMIZED
const settings = {
  contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L5,
  travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED',
  travelCompensationRate: 1.0
};

console.log('🔍 Test MULTI_SHIFT_OPTIMIZED - 6.6 ore lavoro, 0 ore viaggio');
console.log('=====================================');

// Calcola ore di lavoro e viaggio
const workHours = calcService.calculateWorkHours(workEntry);
const travelHours = calcService.calculateTravelHours(workEntry);

console.log(`📊 Ore calcolate:`);
console.log(`   Lavoro: ${workHours} ore`);
console.log(`   Viaggio: ${travelHours} ore`);
console.log(`   Totale: ${workHours + travelHours} ore`);

// Calcola la retribuzione
const earnings = calcService.calculateDailyEarnings(workEntry, settings);

console.log(`\n💰 Calcolo retribuzione:`);
console.log(`   Daily Rate CCNL: ${settings.contract.dailyRate}€`);
console.log(`   Calcolo atteso: ${settings.contract.dailyRate}€ × (${workHours + travelHours}/8) = ${(settings.contract.dailyRate * (workHours + travelHours) / 8).toFixed(2)}€`);
console.log(`\n📋 Risultato effettivo:`);
console.log(`   Regular Pay: ${earnings.regularPay?.toFixed(2)}€`);
console.log(`   Overtime Pay: ${earnings.overtimePay?.toFixed(2)}€`);
console.log(`   Travel Pay: ${earnings.travelPay?.toFixed(2)}€`);
console.log(`   Ordinary Bonus: ${earnings.ordinaryBonusPay?.toFixed(2)}€`);
console.log(`   TOTALE: ${earnings.total?.toFixed(2)}€`);

console.log(`\n🎯 Verifica:`);
const expected = settings.contract.dailyRate * (workHours + travelHours) / 8;
const actual = earnings.total;
const isCorrect = Math.abs(actual - expected) < 0.01;

console.log(`   Atteso: ${expected.toFixed(2)}€`);
console.log(`   Calcolato: ${actual.toFixed(2)}€`);
console.log(`   ✅ Corretto: ${isCorrect ? 'SÌ' : 'NO'}`);

if (!isCorrect) {
  console.log(`   ❌ Differenza: ${(actual - expected).toFixed(2)}€`);
}
