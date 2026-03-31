// 🧪 TEST SERVIZIO STAMPA PDF MENSILE
// Testa la generazione PDF con dati di esempio

console.log('🧪 === TEST MONTHLY PRINT SERVICE ===');

import MonthlyPrintService from '../src/services/MonthlyPrintService';

// 📊 DATI DI TEST
const testWorkEntries = [
  {
    id: 1,
    date: '2025-07-01',
    site_name: 'Cantiere A',
    vehicle_driven: 'Fiat Ducato',
    vehiclePlate: 'AB123CD',
    work_start_1: '08:00',
    work_end_1: '12:00',
    work_start_2: '13:00',
    work_end_2: '16:00',
    departure_company: '06:30',
    arrival_site: '08:00',
    departure_return: '16:00',
    arrival_company: '17:30',
    meal_lunch_voucher: 1,
    meal_lunch_cash: 0,
    meal_dinner_voucher: 0,
    meal_dinner_cash: 0,
    travel_allowance: 15.00,
    standby_allowance: 0,
    total_earnings: 143.37,
    notes: 'Prima giornata del mese',
    day_type: 'lavorativa',
    interventi: '[]'
  },
  {
    id: 2,
    date: '2025-07-02',
    site_name: 'Cantiere A',
    vehicle_driven: 'Fiat Ducato',
    vehiclePlate: 'AB123CD',
    work_start_1: '08:00',
    work_end_1: '12:00',
    work_start_2: '13:00',
    work_end_2: '16:00',
    departure_company: '06:30',
    arrival_site: '08:00',
    departure_return: '16:00',
    arrival_company: '17:30',
    meal_lunch_voucher: 1,
    meal_lunch_cash: 0,
    travel_allowance: 15.00,
    standby_allowance: 0,
    total_earnings: 143.37,
    notes: '',
    day_type: 'lavorativa',
    interventi: '[]'
  },
  {
    id: 3,
    date: '2025-07-04',
    site_name: 'Cantiere A',
    vehicle_driven: 'Fiat Ducato',
    vehiclePlate: 'AB123CD',
    work_start_1: '08:00',
    work_end_1: '12:00',
    work_start_2: '13:00',
    work_end_2: '15:00',
    departure_company: '06:30',
    arrival_site: '08:00',
    departure_return: '15:00',
    arrival_company: '16:30',
    meal_lunch_voucher: 1,
    meal_lunch_cash: 0,
    travel_allowance: 15.00,
    standby_allowance: 7.03,
    is_standby_day: 1,
    total_earnings: 149.84,
    notes: 'Giorno in reperibilità',
    day_type: 'reperibilita',
    interventi: '[]'
  }
];

const testSettings = {
  contractType: 'Metalmeccanico PMI',
  contractLevel: 'Livello 5',
  monthlySalary: 2800,
  hourlyRate: 16.15,
  travelCompensationRate: 100,
  mealAllowances: {
    lunch: 7.00,
    dinner: 7.00
  },
  standbyAllowance: {
    daily: 25.00
  }
};

const testStandbyData = [
  { date: '2025-07-04', is_standby: true },
  { date: '2025-07-05', is_standby: true },
  { date: '2025-07-06', is_standby: true }
];

// 🧪 TEST FUNZIONI HELPER
async function testHelperFunctions() {
  console.log('\n🧪 Testing helper functions...');
  
  // Test parseTime
  const time = MonthlyPrintService.parseTime('08:30');
  console.log('Parse time 08:30:', time);
  
  // Test getHoursDifference
  const start = { hours: 8, minutes: 0 };
  const end = { hours: 12, minutes: 30 };
  const diff = MonthlyPrintService.getHoursDifference(start, end);
  console.log('Hours difference 08:00-12:30:', diff);
  
  // Test calculateWorkHours
  const workHours = MonthlyPrintService.calculateWorkHours(testWorkEntries[0]);
  console.log('Work hours for entry 1:', workHours);
  
  // Test calculateTravelHours
  const travelHours = MonthlyPrintService.calculateTravelHours(testWorkEntries[0]);
  console.log('Travel hours for entry 1:', travelHours);
  
  // Test formatHours
  const formatted = MonthlyPrintService.formatHours(7.5);
  console.log('Format 7.5 hours:', formatted);
}

// 🧪 TEST CALCOLI MENSILI
async function testMonthlyCalculations() {
  console.log('\n🧪 Testing monthly calculations...');
  
  const calculations = await MonthlyPrintService.calculateMonthlyTotals(testWorkEntries, testSettings);
  
  console.log('📊 Monthly calculations result:');
  console.log('   Total hours:', calculations.totalHours);
  console.log('   Ordinary hours:', calculations.ordinaryHours);
  console.log('   Overtime hours:', calculations.overtimeHours);
  console.log('   Working days:', calculations.workingDays);
  console.log('   Travel hours:', calculations.travelHours);
  console.log('   Total earnings:', calculations.totalEarnings);
}

// 🧪 TEST GENERAZIONE HTML
async function testHTMLGeneration() {
  console.log('\n🧪 Testing HTML generation...');
  
  const data = {
    workEntries: testWorkEntries,
    settings: testSettings,
    standbyData: testStandbyData,
    monthlyCalculations: await MonthlyPrintService.calculateMonthlyTotals(testWorkEntries, testSettings),
    year: 2025,
    month: 7
  };
  
  const html = MonthlyPrintService.generateCompletePrintHTML(data);
  
  console.log('📄 HTML generated, length:', html.length, 'characters');
  console.log('📄 HTML preview (first 200 chars):', html.substring(0, 200) + '...');
}

// 🧪 TEST LOG CONTENUTO
async function testContentLogging() {
  console.log('\n🧪 Testing content logging...');
  
  const data = {
    workEntries: testWorkEntries,
    settings: testSettings,
    standbyData: testStandbyData,
    monthlyCalculations: await MonthlyPrintService.calculateMonthlyTotals(testWorkEntries, testSettings),
    year: 2025,
    month: 7
  };
  
  MonthlyPrintService.logPrintContent(data);
}

// 🧪 ESEGUI TUTTI I TEST
async function runAllTests() {
  try {
    console.log('🧪 === INIZIO TEST MONTHLY PRINT SERVICE ===');
    
    await testHelperFunctions();
    await testMonthlyCalculations();
    await testHTMLGeneration();
    await testContentLogging();
    
    console.log('\n✅ === TUTTI I TEST COMPLETATI CON SUCCESSO ===');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  }
}

// Esegui i test se il file viene eseguito direttamente
if (require.main === module) {
  runAllTests();
}

export { runAllTests, testHelperFunctions, testMonthlyCalculations, testHTMLGeneration, testContentLogging };
