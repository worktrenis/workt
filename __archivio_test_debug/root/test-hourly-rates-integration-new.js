// 🕐 TEST INTEGRAZIONE SISTEMA MULTI-FASCIA
// Verifica che il sistema di calcolo fasce orarie sia integrato correttamente

import CalculationService from './src/services/CalculationService.js';
import HourlyRatesService from './src/services/HourlyRatesService.js';

console.log('🕐 TEST SISTEMA MULTI-FASCIA');
console.log('================================');

const calculationService = new CalculationService();

// Test settings
const testSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3,
      saturday: 1.25
    }
  },
  travelCompensationRate: 1.0,
  travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED'
};

// Test workEntry con turno che attraversa fasce orarie diverse
const testWorkEntry = {
  date: '2025-07-25',
  siteName: 'Cantiere Test',
  vehicleDriven: 'andata_ritorno',
  departureCompany: '07:00',
  arrivalSite: '08:00',
  workStart1: '08:00',
  workEnd1: '17:00',
  workStart2: '19:00',
  workEnd2: '23:00',
  departureReturn: '23:00',
  arrivalCompany: '00:00',
  viaggi: [],
  interventi: [],
  mealLunchVoucher: 1,
  mealDinnerVoucher: 1,
  travelAllowance: 1,
  isStandbyDay: 0,
  standbyAllowance: 0,
  completamentoGiornata: 'nessuno',
  isFixedDay: false,
  fixedEarnings: 0
};

async function testBasicFunctionality() {
  try {
    console.log('\n🔧 Test base - Verifica istanze servizi...');
    
    console.log('✅ CalculationService importato:', typeof calculationService);
    console.log('✅ HourlyRatesService importato:', typeof HourlyRatesService);
    
    // Test basic HourlyRatesService
    console.log('\n� Test HourlyRatesService...');
    const defaultTimeSlots = HourlyRatesService.getDefaultTimeSlots();
    console.log('📊 Fasce orarie predefinite:', defaultTimeSlots.length);
    
    defaultTimeSlots.forEach((slot, index) => {
      console.log(`  ${index + 1}. ${slot.name}: ${slot.start}-${slot.end} (${slot.rate}x)`);
    });

    console.log('\n🔧 Test metodi di calcolo diretto...');
    
    // Test calcolo diretto con HourlyRatesService
    const directResult = await HourlyRatesService.calculateHourlyRates(
      '08:00', '17:00', 16.41, testSettings.contract
    );
    
    console.log('📋 Risultato calcolo diretto 08:00-17:00:');
    console.log('  Ore totali:', directResult.totalHours?.toFixed(2) || '0.00');
    console.log('  Guadagno totale:', `€${directResult.totalEarnings?.toFixed(2) || '0.00'}`);
    console.log('  Metodo:', directResult.method || 'N/A');
    
    if (directResult.breakdown) {
      console.log('  Breakdown fasce:');
      directResult.breakdown.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.name}: ${item.hours?.toFixed(2)}h @ €${item.hourlyRate?.toFixed(2)} = €${item.earnings?.toFixed(2)}`);
      });
    }

    console.log('\n✅ TEST BASE COMPLETATO');
    
  } catch (error) {
    console.error('\n❌ ERRORE NEL TEST BASE:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Esegui il test
testBasicFunctionality();
