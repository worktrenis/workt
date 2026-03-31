// Test per il calcolo fasce orarie CCNL
const CalculationService = require('./CalculationService.js');

const calculationService = new CalculationService();

// Test Case 1: 20:00-02:00 (6h lavoro notturno)
const testCase1 = {
  date: '2025-07-16',
  startTime: '20:00',
  endTime: '02:00',
  travelStartTime1: '13:00',
  travelEndTime1: '14:00',
  travelStartTime2: '02:00',
  travelEndTime2: '03:00',
  isNight: true
};

const settings1 = {
  contract: {
    hourlyRate: 16.15,
    dailyRate: 110.23,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3
    }
  },
  travelCompensationRate: 1.0
};

console.log('\n=== TEST CASO 1: 20:00-02:00 + viaggi ===');
const result1 = calculationService.calculateDailyEarnings(testCase1, settings1);
console.log('Risultato:', result1);

// Test Case 2: 19:00-05:00 (10h totali)
const testCase2 = {
  date: '2025-07-16',
  startTime: '20:00', // Lavoro
  endTime: '04:00',   // Lavoro
  travelStartTime1: '19:00',
  travelEndTime1: '20:00',
  travelStartTime2: '04:00',
  travelEndTime2: '05:00',
  isNight: true
};

console.log('\n=== TEST CASO 2: 19:00-05:00 (viaggio+lavoro+rientro) ===');
const result2 = calculationService.calculateDailyEarnings(testCase2, settings1);
console.log('Risultato:', result2);
