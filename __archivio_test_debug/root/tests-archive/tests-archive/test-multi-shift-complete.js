/**
 * Test completo per la modalità MULTI_SHIFT_OPTIMIZED
 * Questo script testa il calcolo delle ore di viaggio ottimizzato per multi-turni
 */

import { TimeCalculator } from './src/services/TimeCalculator.js';
import { EarningsCalculator } from './src/services/EarningsCalculator.js';

// Test case 1: Multi-turno con viaggi interni ed esterni
const testCase1 = {
  name: 'Multi-turno standard (2 turni)',
  workEntry: {
    date: '2025-07-13',
    siteName: 'Test Multi-Turno',
    vehicleDriven: 'Furgone',
    
    // TURNO PRINCIPALE (0) - Mattina
    departureCompany: '08:00', // ← VIAGGIO ESTERNO (partenza azienda)
    arrivalSite: '09:00',      // 1h viaggio
    workStart1: '09:00',
    workEnd1: '12:00',         // 3h lavoro
    departureReturn: '12:00',  // ← VIAGGIO INTERNO (tra turni)
    arrivalCompany: '13:00',   // 1h viaggio
    
    // TURNI AGGIUNTIVI (viaggi[])
    viaggi: [
      {
        // TURNO 2 - Pomeriggio
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
  },
  settings: {
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
  },
  expected: {
    externalTravel: 2, // 08:00-09:00 + 17:00-18:00
    internalTravel: 2, // 12:00-13:00 + 13:00-14:00  
    workHours: 6,      // 09:00-12:00 + 14:00-17:00
    effectiveWork: 8,  // 6h lavoro + 2h viaggi interni
    totalEarnings: 142.01 // 109.19 giornaliera + 32.82 viaggio esterno
  }
};

// Test case 2: Multi-turno con 3 turni
const testCase2 = {
  name: 'Multi-turno esteso (3 turni)',
  workEntry: {
    date: '2025-07-13',
    siteName: 'Test Multi-Turno Esteso',
    
    // TURNO PRINCIPALE - Mattina
    departureCompany: '07:00', // ← VIAGGIO ESTERNO
    arrivalSite: '08:00',      // 1h viaggio
    workStart1: '08:00',
    workEnd1: '11:00',         // 3h lavoro
    departureReturn: '11:00',  // ← VIAGGIO INTERNO
    arrivalCompany: '12:00',   // 1h viaggio
    
    viaggi: [
      {
        // TURNO 2 - Pomeriggio
        departure_company: '12:00', // ← VIAGGIO INTERNO
        arrival_site: '13:00',      // 1h viaggio
        work_start_1: '13:00',
        work_end_1: '15:00',        // 2h lavoro
        departure_return: '15:00',  // ← VIAGGIO INTERNO
        arrival_company: '16:00'    // 1h viaggio
      },
      {
        // TURNO 3 - Sera
        departure_company: '16:00', // ← VIAGGIO INTERNO
        arrival_site: '17:00',      // 1h viaggio
        work_start_1: '17:00',
        work_end_1: '19:00',        // 2h lavoro
        departure_return: '19:00',  // ← VIAGGIO ESTERNO (ultimo)
        arrival_company: '20:00'    // 1h viaggio
      }
    ]
  },
  settings: {
    contract: {
      hourlyRate: 16.41,
      dailyRate: 109.19,
      overtimeRates: { day: 1.2 }
    },
    travelCompensationRate: 1.0,
    travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED'
  },
  expected: {
    externalTravel: 2, // 07:00-08:00 + 19:00-20:00
    internalTravel: 4, // 11:00-12:00 + 12:00-13:00 + 15:00-16:00 + 16:00-17:00
    workHours: 7,      // 3h + 2h + 2h
    effectiveWork: 11, // 7h lavoro + 4h viaggi interni
    shouldHaveOvertime: true // 11h > 8h
  }
};

function runTests() {
  console.log('\n🧪 TESTING MULTI_SHIFT_OPTIMIZED CALCULATION\n');
  
  const timeCalculator = new TimeCalculator();
  const earningsCalculator = new EarningsCalculator(timeCalculator);
  
  // Test TimeCalculator.calculateTravelHoursWithTypes
  console.log('=== TEST CASE 1: Standard Multi-turno ===');
  testTravelCalculation(timeCalculator, testCase1);
  
  console.log('\n=== TEST CASE 2: Extended Multi-turno ===');
  testTravelCalculation(timeCalculator, testCase2);
  
  // Test EarningsCalculator
  console.log('\n=== EARNINGS CALCULATION TESTS ===');
  testEarningsCalculation(earningsCalculator, testCase1);
}

function testTravelCalculation(timeCalculator, testCase) {
  console.log(`🔍 Testing: ${testCase.name}`);
  
  // Test standard travel calculation
  const standardTravel = timeCalculator.calculateTravelHours(testCase.workEntry);
  console.log(`📊 Standard travel calculation: ${standardTravel}h`);
  
  // Test typed travel calculation (MULTI_SHIFT_OPTIMIZED)
  const typedTravel = timeCalculator.calculateTravelHoursWithTypes(testCase.workEntry);
  console.log(`🎯 Typed travel breakdown:`, {
    external: `${typedTravel.external}h`,
    internal: `${typedTravel.internal}h`,
    total: `${typedTravel.total}h`
  });
  
  // Validate results
  if (testCase.expected) {
    const externalMatch = Math.abs(typedTravel.external - testCase.expected.externalTravel) < 0.01;
    const internalMatch = Math.abs(typedTravel.internal - testCase.expected.internalTravel) < 0.01;
    
    console.log(`✅ External travel: ${externalMatch ? 'PASS' : 'FAIL'} (expected: ${testCase.expected.externalTravel}h, got: ${typedTravel.external}h)`);
    console.log(`✅ Internal travel: ${internalMatch ? 'PASS' : 'FAIL'} (expected: ${testCase.expected.internalTravel}h, got: ${typedTravel.internal}h)`);
  }
}

function testEarningsCalculation(earningsCalculator, testCase) {
  console.log(`💰 Testing earnings for: ${testCase.name}`);
  
  const workHours = earningsCalculator.timeCalculator.calculateWorkHours(testCase.workEntry);
  const travelHours = earningsCalculator.timeCalculator.calculateTravelHours(testCase.workEntry);
  
  console.log(`📈 Work hours: ${workHours}h, Travel hours: ${travelHours}h`);
  
  const earnings = earningsCalculator.calculateBasicEarnings(
    testCase.workEntry, 
    testCase.settings, 
    workHours, 
    travelHours
  );
  
  console.log(`💵 Earnings breakdown:`, {
    regular: `${earnings.regularPay?.toFixed(2) || 0}€`,
    overtime: `${earnings.overtimePay?.toFixed(2) || 0}€`,
    travel: `${earnings.travelPay?.toFixed(2) || 0}€`,
    total: `${(earnings.regularPay + earnings.overtimePay + earnings.travelPay).toFixed(2)}€`
  });
}

// Run the tests
runTests();
