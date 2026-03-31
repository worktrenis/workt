// Test script per verificare la modalità MULTI_SHIFT_OPTIMIZED
console.log('🧪 TESTING MULTI_SHIFT_OPTIMIZED MODE');

// Simula un workEntry con multi-turni
const testWorkEntry = {
  date: '2025-07-13',
  siteName: 'Test Multi-Turno',
  vehicleDriven: 'Furgone',
  
  // TURNO PRINCIPALE (0)
  departureCompany: '08:00', // ← VIAGGIO ESTERNO (partenza azienda)
  arrivalSite: '09:00',      // 1h viaggio
  workStart1: '09:00',
  workEnd1: '12:00',         // 3h lavoro
  departureReturn: '12:00',
  arrivalCompany: '13:00',   // 1h viaggio (interno se c'è altro turno)
  
  // TURNI AGGIUNTIVI (viaggi[])
  viaggi: [
    {
      // TURNO 2
      departure_company: '13:00', // ← VIAGGIO INTERNO (tra turni)
      arrival_site: '14:00',      // 1h viaggio
      work_start_1: '14:00',
      work_end_1: '17:00',        // 3h lavoro
      departure_return: '17:00',  // ← VIAGGIO ESTERNO (ultimo ritorno)
      arrival_company: '18:00'    // 1h viaggio
    }
  ],
  
  interventi: [],
  mealLunchVoucher: 0,
  mealDinnerVoucher: 0,
  travelAllowance: 1,
  isStandbyDay: 0
};

const testSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35
    }
  },
  travelCompensationRate: 1.0,
  travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED'
};

console.log('📊 Expected breakdown:');
console.log('- Viaggi esterni (primo + ultimo): 2h (08:00-09:00 + 17:00-18:00)');
console.log('- Viaggi interni (tra turni): 2h (12:00-13:00 + 13:00-14:00)');
console.log('- Lavoro totale: 6h (09:00-12:00 + 14:00-17:00)');
console.log('- Lavoro effettivo (con viaggi interni): 8h (6h + 2h viaggi interni)');
console.log('- Risultato atteso: 109.19€ giornaliera + 32.82€ viaggio esterno = 142.01€');

export { testWorkEntry, testSettings };
