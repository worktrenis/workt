// Test per verificare le impostazioni di reperibilità
const CalculationService = require('./src/services/CalculationService');

// Simuliamo un workEntry di reperibilità con viaggi
const workEntry = {
  date: '2025-07-25',
  work_start: '08:00',
  work_end: '10:00',
  travel_start: '07:00',
  travel_end: '10:30',
  is_standby: 1,
  interventi: [
    {
      departure_company: '07:00',
      arrival_location: '08:00',
      work_start_1: '08:00',
      work_end_1: '10:00',
      departure_return: '10:00',
      arrival_company: '10:30'
    }
  ]
};

// Test 1: Con travelWithBonus = false (disabilitato)
const settingsDisabled = {
  contract: {
    name: "CCNL Metalmeccanico PMI - Livello 5",
    code: "METAL_PMI_L5",
    hourlyRate: 16.57,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  },
  travelCompensationRate: 1,
  standbySettings: {
    enabled: true,
    dailyAllowance: 15,
    travelWithBonus: false // DISABILITATO
  }
};

// Test 2: Con travelWithBonus = true (abilitato)
const settingsEnabled = {
  contract: {
    name: "CCNL Metalmeccanico PMI - Livello 5",
    code: "METAL_PMI_L5",
    hourlyRate: 16.57,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  },
  travelCompensationRate: 1,
  standbySettings: {
    enabled: true,
    dailyAllowance: 15,
    travelWithBonus: true // ABILITATO
  }
};

console.log('=== TEST STANDBY TRAVEL SETTINGS ===\n');

// Test con impostazioni disabilitate
console.log('🚫 TEST 1: travelWithBonus = false');
const calcService1 = new CalculationService();
const result1 = calcService1.calculateStandbyBreakdown(workEntry, settingsDisabled);
console.log('Travel breakdown:', result1.travel);
console.log('');

// Test con impostazioni abilitate
console.log('✅ TEST 2: travelWithBonus = true');
const calcService2 = new CalculationService();
const result2 = calcService2.calculateStandbyBreakdown(workEntry, settingsEnabled);
console.log('Travel breakdown:', result2.travel);
console.log('');

// Test 3: Senza travelWithBonus (undefined)
const settingsUndefined = {
  contract: {
    name: "CCNL Metalmeccanico PMI - Livello 5",
    code: "METAL_PMI_L5",
    hourlyRate: 16.57,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  },
  travelCompensationRate: 1,
  standbySettings: {
    enabled: true,
    dailyAllowance: 15
    // travelWithBonus NON DEFINITO
  }
};

console.log('❓ TEST 3: travelWithBonus = undefined (default)');
const calcService3 = new CalculationService();
const result3 = calcService3.calculateStandbyBreakdown(workEntry, settingsUndefined);
console.log('Travel breakdown:', result3.travel);
