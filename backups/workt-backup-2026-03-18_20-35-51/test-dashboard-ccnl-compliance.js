/**
 * TEST DASHBOARD CCNL COMPLIANCE
 * Verifica che il dashboard usi sempre il cumulo CCNL per giorni speciali
 */

const CalculationService = require('./src/services/CalculationService.js');

const calculationService = new CalculationService();

// Test workEntry per sabato
const saturdayWorkEntry = {
  date: '2025-01-25', // Sabato
  startTime: '23:00',
  endTime: '07:00',
  workHours: 8,
  travelHours: 0,
  dayType: 'lavorativa'
};

// Settings di test
const testSettings = {
  contract: {
    hourlyRate: 16.15,
    dailyRate: 109.19,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  }
};

async function testDashboardCCNL() {
  console.log('🧪 TEST DASHBOARD CCNL COMPLIANCE');
  console.log('='.repeat(50));
  
  console.log('📅 Test entry: Sabato 23:00-07:00 (8h notturno)');
  console.log('🎯 Aspettativa CCNL: Sabato +25% + Notturno +35% = +60%');
  console.log('💰 Tariffa attesa: €16,15 × 1,60 = €25,84/h');
  console.log('💰 Totale atteso: €25,84 × 8h = €206,72');
  console.log('');

  try {
    const breakdown = await calculationService.calculateEarningsBreakdown(saturdayWorkEntry, testSettings);
    
    console.log('✅ Breakdown calcolato dal dashboard:');
    console.log(`   💰 Totale: €${breakdown.totalEarnings?.toFixed(2) || 'N/A'}`);
    console.log(`   🎯 CCNL Compliant: ${breakdown.details?.ccnlCompliant ? '✅' : '❌'}`);
    console.log(`   📊 Metodo: ${breakdown.details?.hourlyRatesMethod || 'N/A'}`);
    
    if (breakdown.details?.hourlyRatesBreakdown) {
      console.log('   📋 Breakdown fasce orarie:');
      breakdown.details.hourlyRatesBreakdown.forEach(item => {
        console.log(`      ${item.name}: ${item.hours?.toFixed(1)}h × €${item.hourlyRate?.toFixed(2)} = €${item.earnings?.toFixed(2)} (+${item.totalBonus}%)`);
      });
    }
    
    // Verifica se il calcolo è corretto
    const expectedTotal = 206.72;
    const actualTotal = breakdown.totalEarnings || 0;
    const difference = Math.abs(expectedTotal - actualTotal);
    
    console.log('');
    console.log('🔍 VERIFICA CONFORMITÀ:');
    console.log(`   Atteso: €${expectedTotal.toFixed(2)}`);
    console.log(`   Ottenuto: €${actualTotal.toFixed(2)}`);
    console.log(`   Differenza: €${difference.toFixed(2)}`);
    
    if (difference < 1.0) {
      console.log('   ✅ CONFORME CCNL: Cumulo additivo corretto!');
    } else {
      console.log('   ❌ NON CONFORME: Differenza significativa!');
    }
    
  } catch (error) {
    console.log(`❌ Errore test: ${error.message}`);
    console.log('Stack:', error.stack);
  }
}

// Esegui test
testDashboardCCNL().catch(console.error);
