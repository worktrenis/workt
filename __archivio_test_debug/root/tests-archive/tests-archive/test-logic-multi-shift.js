// Test semplice per verificare logica MULTI_SHIFT_OPTIMIZED
console.log('🔍 Test logica MULTI_SHIFT_OPTIMIZED');
console.log('=====================================');

// Simula i valori della tua situazione
const workHours = 6.6;      // 6.6 ore di lavoro
const travelHours = 0;      // 0 ore di viaggio  
const totalHours = workHours + travelHours;
const standardWorkDay = 8;
const dailyRate = 110.23;   // Daily rate CCNL aggiornato

console.log(`📊 Dati input:`);
console.log(`   Ore lavoro: ${workHours}`);
console.log(`   Ore viaggio: ${travelHours}`);
console.log(`   Totale ore: ${totalHours}`);
console.log(`   Standard work day: ${standardWorkDay}`);
console.log(`   Daily rate CCNL: ${dailyRate}€`);

console.log(`\n🎯 Logica MULTI_SHIFT_OPTIMIZED:`);

let regularPay = 0;
let travelPay = 0;
let overtimePay = 0;

if (totalHours >= standardWorkDay) {
  console.log(`   ✅ Totale ore (${totalHours}) >= ${standardWorkDay} → Giornata completa`);
  regularPay = dailyRate;
  const extraHours = totalHours - standardWorkDay;
  if (extraHours > 0) {
    console.log(`   💰 Ore extra (${extraHours}) pagate come viaggio`);
    travelPay = extraHours * 16.15; // hourly rate base
  }
} else {
  console.log(`   📉 Totale ore (${totalHours}) < ${standardWorkDay} → Calcolo proporzionale`);
  const proportion = totalHours / standardWorkDay;
  regularPay = dailyRate * proportion;
  console.log(`   💰 Calcolo: ${dailyRate}€ × (${totalHours}/${standardWorkDay}) = ${dailyRate}€ × ${proportion.toFixed(4)} = ${regularPay.toFixed(2)}€`);
  travelPay = 0;
  overtimePay = 0;
}

const total = regularPay + travelPay + overtimePay;

console.log(`\n📋 Risultato finale:`);
console.log(`   Regular Pay: ${regularPay.toFixed(2)}€`);
console.log(`   Travel Pay: ${travelPay.toFixed(2)}€`);
console.log(`   Overtime Pay: ${overtimePay.toFixed(2)}€`);
console.log(`   TOTALE: ${total.toFixed(2)}€`);

console.log(`\n🔍 Verifica:`);
const expected = 91.44; // 110.23 * (6.6/8)
console.log(`   Risultato atteso: ${expected}€`);
console.log(`   Risultato calcolato: ${total.toFixed(2)}€`);
console.log(`   ✅ Corretto: ${Math.abs(total - expected) < 0.01 ? 'SÌ' : 'NO'}`);

console.log(`\n📝 Nel tuo caso dovrebbe mostrare:`);
console.log(`   - Modalità: MULTI_SHIFT_OPTIMIZED`);
console.log(`   - Calcolo proporzionale CCNL`);  
console.log(`   - Nessuna eccedenza viaggio (0 ore extra)`);
console.log(`   - Retribuzione: ${regularPay.toFixed(2)}€ invece di 109.34€`);
