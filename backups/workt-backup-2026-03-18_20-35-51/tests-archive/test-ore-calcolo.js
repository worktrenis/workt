// Test diretto dei calcoli con dati di esempio
import CalculationService from './src/services/CalculationService.js';
import { createWorkEntryFromData } from './src/utils/earningsHelper.js';
import { DEFAULT_SETTINGS } from './src/constants/index.js';

// Creo dati di test simili a quelli che dovrebbero essere nel database
const testEntry = {
  id: 1,
  date: '2025-07-10',
  site_name: 'Cantiere Test',
  vehicle_driven: 'Furgone',
  departure_company: '07:00',
  arrival_site: '08:30',
  work_start_1: '08:30',
  work_end_1: '12:30',
  work_start_2: '13:30',
  work_end_2: '17:30',
  departure_return: '17:30',
  arrival_company: '19:00',
  interventi: '[]', // Stringa JSON vuota
  viaggi: '[]', // Stringa JSON vuota
  meal_lunch_voucher: 1,
  meal_lunch_cash: 0,
  meal_dinner_voucher: 0,
  meal_dinner_cash: 0,
  travel_allowance: 1,
  travel_allowance_percent: 1.0,
  trasferta_manual_override: 0,
  is_standby_day: 0,
  standby_allowance: 0,
  completamento_giornata: 'nessuno',
  day_type: 'lavorativa',
  is_fixed_day: 0,
  fixed_earnings: 0
};

console.log('🧪 TEST CALCOLO ORE - Dati di esempio');
console.log('=====================================');

try {
  // Parse entry come fa l'app
  const workEntry = createWorkEntryFromData(testEntry);
  console.log('📝 Entry parsata:', JSON.stringify(workEntry, null, 2));

  // Crea il calculation service
  const calculationService = new CalculationService();
  
  // Test calcoli individuali
  const workHours = calculationService.calculateWorkHours(workEntry);
  const travelHours = calculationService.calculateTravelHours(workEntry);
  const breakdown = calculationService.calculateEarningsBreakdown(workEntry, DEFAULT_SETTINGS);

  console.log('\n⏰ RISULTATI CALCOLI:');
  console.log(`Ore lavoro: ${workHours}`);
  console.log(`Ore viaggio: ${travelHours}`);
  console.log(`Ore totali: ${workHours + travelHours}`);
  
  console.log('\n💰 BREAKDOWN GUADAGNI:');
  console.log(JSON.stringify(breakdown, null, 2));

  if (breakdown && breakdown.totalEarnings) {
    console.log(`\n✅ GUADAGNO TOTALE: €${breakdown.totalEarnings.toFixed(2)}`);
  } else {
    console.log('\n❌ ERRORE: Breakdown nullo o senza totalEarnings');
  }

} catch (error) {
  console.error('❌ ERRORE NEL TEST:', error);
  console.error(error.stack);
}
