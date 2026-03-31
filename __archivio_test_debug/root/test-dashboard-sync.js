// Test per verificare la sincronizzazione tra TimeEntryForm e Dashboard
const CalculationService = require('./src/services/CalculationService');

// Simuliamo un workEntry completo
const workEntry = {
  date: '2025-07-25',
  work_start: '08:00',
  work_end: '17:00',
  travel_start: '07:30',
  travel_end: '17:30',
  is_standby: 0,
  interventi: []
};

// Impostazioni identiche a quelle che dovrebbero essere usate
const settingsTimeEntryForm = {
  contract: { 
    dailyRate: 109.19,
    hourlyRate: 16.41,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3,
      nightHoliday: 1.5
    }
  },
  travelCompensationRate: 1.0,
  travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED',
  standbySettings: {
    dailyAllowance: 7.5,
    dailyIndemnity: 7.5,
    travelWithBonus: false
  },
  mealAllowances: {
    lunch: { voucherAmount: 5.29 },
    dinner: { voucherAmount: 5.29 }
  }
};

const settingsDashboard = {
  contract: { 
    dailyRate: 109.19,
    hourlyRate: 16.41,
    monthlyGrossSalary: 2800.00,
    normalHours: 40,
    dailyHours: 8,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3,
      nightHoliday: 1.5
    },
    saturdayBonus: 0.2,
    nightBonus: 0.25,
    nightBonus2: 0.35,
    overtimeBonus: 0.2,
    overtimeLimit: {
      hours: 8,
      type: 'daily'
    }
  },
  travelCompensationRate: 1.0,
  travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED',
  standbySettings: {
    dailyAllowance: 7.5,
    dailyIndemnity: 7.5,
    travelWithBonus: false
  },
  mealAllowances: {
    lunch: { voucherAmount: 5.29 },
    dinner: { voucherAmount: 5.29 }
  }
};

console.log('=== TEST SINCRONIZZAZIONE DASHBOARD ===\n');

async function runTest() {
  const calcService = new CalculationService();
  
  // Test 1: Calcolo con impostazioni TimeEntryForm
  console.log('📱 TEST 1: Calcolo con impostazioni TimeEntryForm');
  const result1 = await calcService.calculateEarningsBreakdown(workEntry, settingsTimeEntryForm);
  console.log('Total Earnings:', result1.totalEarnings);
  console.log('Ordinary total:', result1.ordinary?.total);
  console.log('');
  
  // Test 2: Calcolo con impostazioni Dashboard
  console.log('📊 TEST 2: Calcolo con impostazioni Dashboard');
  const result2 = await calcService.calculateEarningsBreakdown(workEntry, settingsDashboard);
  console.log('Total Earnings:', result2.totalEarnings);
  console.log('Ordinary total:', result2.ordinary?.total);
  console.log('');
  
  // Test 3: Confronto risultati
  console.log('🔍 TEST 3: Confronto risultati');
  const difference = Math.abs((result1.totalEarnings || 0) - (result2.totalEarnings || 0));
  console.log('Differenza:', difference.toFixed(4), '€');
  
  if (difference < 0.01) {
    console.log('✅ I calcoli sono IDENTICI - sincronizzazione OK!');
  } else {
    console.log('❌ I calcoli sono DIVERSI - problema di sincronizzazione!');
    console.log('TimeEntryForm details:', JSON.stringify(result1, null, 2));
    console.log('Dashboard details:', JSON.stringify(result2, null, 2));
  }
}

runTest().catch(console.error);
