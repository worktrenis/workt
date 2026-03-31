// Test specifico per verificare il calcolo CCNL della domenica
import { CalculationService } from './src/services/CalculationService.js';

async function testSundayCalculation() {
  console.log('🧪 TEST CALCOLO CCNL DOMENICA 6 LUGLIO 2025');
  
  // Dati di test per domenica 6 luglio 2025 (02:00-06:00 = lavoro notturno domenica)
  const testWorkEntry = {
    date: '2025-07-06', // Domenica
    workStart1: '02:00',
    workEnd1: '06:00',
    workStart2: '',
    workEnd2: '',
    departureCompany: '01:00',
    arrivalSite: '02:00',
    departureReturn: '06:00',
    arrivalCompany: '07:00'
  };
  
  console.log('📅 Data di test:', testWorkEntry.date);
  console.log('🕐 Orario lavoro:', `${testWorkEntry.workStart1}-${testWorkEntry.workEnd1}`);
  console.log('🚗 Orario viaggio:', `${testWorkEntry.departureCompany}-${testWorkEntry.arrivalSite} e ${testWorkEntry.departureReturn}-${testWorkEntry.arrivalCompany}`);
  
  try {
    const calculationService = new CalculationService();
    const result = await calculationService.calculateEarningsBreakdown(testWorkEntry);
    
    console.log('');
    console.log('📊 RISULTATO CALCOLO:');
    console.log('- Totale guadagno:', result.breakdown?.totalEarnings?.toFixed(2), '€');
    console.log('- Metodo calcolo:', result.breakdown?.method);
    console.log('- CCNL compliant:', result.details?.ccnlCompliant);
    console.log('- Motivo:', result.details?.reason);
    
    if (result.details?.hourlyRatesBreakdown) {
      console.log('');
      console.log('🕐 DETTAGLIO FASCE ORARIE:');
      console.log(JSON.stringify(result.details.hourlyRatesBreakdown, null, 2));
    }
    
    // Verifica aspettative:
    // 4h di lavoro domenica notturno dovrebbe dare:
    // Base: €16.57/h × Domenica +30% × Notturno +35% = cumulo CCNL
    // Formula: 16.57 × (1.30 + 1.35 - 1.0) = 16.57 × 1.65 = €27.34/h
    // Totale: €27.34 × 4h = €109.36
    
    const expectedAmount = 109.36;
    const actualAmount = result.breakdown?.totalEarnings || 0;
    
    console.log('');
    console.log('✅ VERIFICA CCNL:');
    console.log(`- Atteso: €${expectedAmount} (domenica +30% + notturno +35% = +65%)`);
    console.log(`- Ottenuto: €${actualAmount.toFixed(2)}`);
    console.log(`- Differenza: €${Math.abs(actualAmount - expectedAmount).toFixed(2)}`);
    console.log(`- Conformità CCNL: ${Math.abs(actualAmount - expectedAmount) < 1 ? '✅ CONFORME' : '❌ NON CONFORME'}`);
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testSundayCalculation().catch(console.error);
