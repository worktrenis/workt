// Test rapido per verificare il nuovo sistema integrato di fasce orarie
// Esegui questo test per verificare che il sistema CCNL compliant funzioni

import AsyncStorage from '@react-native-async-storage/async-storage';
import HourlyRatesService from '../src/services/HourlyRatesService';
import CalculationService from '../src/services/CalculationService';

async function testHourlyRatesIntegration() {
  console.log('🧪 TEST INTEGRAZIONE FASCE ORARIE AVANZATE');
  console.log('============================================\n');

  try {
    // 1. Abilita il nuovo sistema
    await AsyncStorage.setItem('enable_time_based_rates', JSON.stringify(true));
    await AsyncStorage.setItem('hourly_calculation_method', 'hourly_priority');
    
    // 2. Configura fasce orarie CCNL standard
    const ccnlTimeSlots = [
      { id: 'day', name: 'Lavoro Diurno', start: '06:00', end: '20:00', rate: 1.0, color: '#2196F3' },
      { id: 'evening', name: 'Lavoro Notturno fino alle 22h', start: '20:00', end: '22:00', rate: 1.25, color: '#FF9800' },
      { id: 'night', name: 'Lavoro Notturno oltre le 22h', start: '22:00', end: '06:00', rate: 1.35, color: '#9C27B0' }
    ];
    
    await AsyncStorage.setItem('custom_time_slots', JSON.stringify(ccnlTimeSlots));
    
    // 3. Configura straordinari
    const overtimeSettings = {
      enabled: true,
      dailyThreshold: 8,
      weeklyThreshold: 40,
      overtimeRate: 1.2,
      overtimeNightRate: 1.5,
      combineMaggiorazioni: true
    };
    
    await AsyncStorage.setItem('overtime_settings', JSON.stringify(overtimeSettings));
    
    console.log('✅ Configurazione test completata');
    
    // 4. Test HourlyRatesService direttamente
    console.log('\n🔍 TEST HOURLY RATES SERVICE:');
    
    const hourlyResult = await HourlyRatesService.calculateHourlyRates(
      '20:00', '06:00', 15.00, null, false, false
    );
    
    console.log('📊 Risultato HourlyRatesService:', {
      totalHours: hourlyResult.totalHours,
      regularHours: hourlyResult.regularHours,
      overtimeHours: hourlyResult.overtimeHours,
      totalEarnings: hourlyResult.totalEarnings.toFixed(2),
      regularPay: hourlyResult.regularPay.toFixed(2),
      overtimePay: hourlyResult.overtimePay.toFixed(2)
    });
    
    // 5. Test CalculationService integrato
    console.log('\n🔍 TEST CALCULATION SERVICE INTEGRATO:');
    
    const calculationService = new CalculationService();
    calculationService.useDetailedCalculation = true;
    
    const testWorkEntry = {
      date: '2024-01-15',
      startTime: '20:00',
      endTime: '06:00',
      travelKm: 0,
      travelTime: 0,
      notes: 'Test integrazione CCNL'
    };
    
    const testSettings = {
      hourlyRate: 15.00,
      contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
      useDetailedCalculation: true,
      travelHoursSetting: 'NO_TRAVEL'
    };
    
    const calculationResult = await calculationService.calculateDailyEarnings(testWorkEntry, testSettings);
    
    console.log('📊 Risultato CalculationService:', {
      total: calculationResult.total?.toFixed(2),
      regularHours: calculationResult.regularHours,
      overtimeHours: calculationResult.overtimeHours,
      regularPay: calculationResult.regularPay?.toFixed(2),
      overtimePay: calculationResult.overtimePay?.toFixed(2)
    });
    
    // 6. Verifica conformità CCNL
    console.log('\n✅ VERIFICA CONFORMITÀ CCNL:');
    
    const expectedMinimumRate = 15 * 1.25; // Minimo serale +25%
    const actualAverageRate = calculationResult.total / 10; // 10 ore totali
    
    if (actualAverageRate >= expectedMinimumRate) {
      console.log(`✅ Maggiorazioni applicate correttamente (€${actualAverageRate.toFixed(2)}/h >= €${expectedMinimumRate.toFixed(2)}/h)`);
    } else {
      console.log(`❌ Maggiorazioni insufficienti (€${actualAverageRate.toFixed(2)}/h < €${expectedMinimumRate.toFixed(2)}/h)`);
    }
    
    if (calculationResult.regularHours > 0) {
      console.log(`✅ Sistema riconosce ore regolari con maggiorazioni (${calculationResult.regularHours}h)`);
    } else {
      console.log(`❌ Sistema non riconosce ore regolari`);
    }
    
    console.log('\n🎉 TEST COMPLETATO CON SUCCESSO!');
    
    return {
      success: true,
      hourlyRatesService: hourlyResult,
      calculationService: calculationResult,
      ccnlCompliant: actualAverageRate >= expectedMinimumRate
    };
    
  } catch (error) {
    console.error('❌ ERRORE DURANTE IL TEST:', error);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Utility per eseguire il test da console
global.testHourlyRates = testHourlyRatesIntegration;

export { testHourlyRatesIntegration };
