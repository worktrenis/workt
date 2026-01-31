import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TestFasceOrarie = () => {
  const [testResults, setTestResults] = useState('Caricamento test...');

  useEffect(() => {
    runFasceTest();
  }, []);

  const runFasceTest = async () => {
    try {
      console.log('🧪 AVVIO TEST FASCE ORARIE');
      
      // Importa il CalculationService
      const CalculationService = await import('../services/CalculationService');
      const calculationService = new CalculationService.default();
      calculationService.useDetailedCalculation = true;

      // Test Entry: 25/07/2025 - Turno notturno 20:00-06:00
      const testWorkEntry = {
        date: '2025-07-25',
        startTime: '20:00',
        endTime: '06:00',
        workStart1: '20:00',
        workEnd1: '06:00',
        workStart2: null,
        workEnd2: null,
        travelKm: 0,
        travelTime: 0,
        notes: 'Test fasce orarie notturne - Multi turno'
      };

      const testSettings = {
        hourlyRate: 16.15,
        contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
        useDetailedCalculation: true,
        travelHoursSetting: 'NO_TRAVEL'
      };

      console.log('🔄 Eseguendo calcolo test...');
      const result = await calculationService.calculateDailyEarnings(testWorkEntry, testSettings);

      // Carica le impostazioni delle fasce orarie
      const timeSlotsData = await AsyncStorage.getItem('custom_time_slots');
      const enableTimeBasedRates = await AsyncStorage.getItem('enable_time_based_rates');
      
      console.log('📋 Fasce orarie caricate:', timeSlotsData);
      console.log('📋 Fasce abilitate:', enableTimeBasedRates);

      const totalHours = (result.regularHours || 0) + (result.overtimeHours || 0);
      const totalPay = (result.regularPay || 0) + (result.overtimePay || 0);
      const averageHourlyRate = totalPay / totalHours;

      let testOutput = `🧪 TEST FASCE ORARIE - 25/07/2025\n`;
      testOutput += `═══════════════════════════════════════\n\n`;
      
      testOutput += `📋 CONFIGURAZIONE:\n`;
      testOutput += `• Entry: Turno 20:00-06:00 (10h notturne)\n`;
      testOutput += `• Tariffa base: €16.15/h\n`;
      testOutput += `• Fasce abilitate: ${enableTimeBasedRates || 'non impostato'}\n\n`;
      
      testOutput += `📊 RISULTATI CALCOLO:\n`;
      testOutput += `• Ore totali: ${totalHours.toFixed(1)}h\n`;
      testOutput += `• Retribuzione: €${totalPay.toFixed(2)}\n`;
      testOutput += `• Tariffa media: €${averageHourlyRate.toFixed(2)}/h\n\n`;

      // Analisi fasce orarie
      if (timeSlotsData) {
        const slots = JSON.parse(timeSlotsData);
        testOutput += `🎯 FASCE ORARIE ATTIVE:\n`;
        slots.forEach(slot => {
          testOutput += `• ${slot.name}: ${slot.start}-${slot.end} (x${slot.rate})\n`;
        });
        testOutput += `\n`;
      }

      // Verifiche
      testOutput += `✅ VERIFICHE:\n`;
      
      // Verifica ore
      if (totalHours >= 9.5 && totalHours <= 10.5) {
        testOutput += `✅ Ore corrette: ${totalHours.toFixed(1)}h\n`;
      } else {
        testOutput += `❌ Ore sbagliate: ${totalHours.toFixed(1)}h (atteso ~10h)\n`;
      }

      // Verifica maggiorazioni (dovrebbe essere almeno serale/notturna)
      const expectedMinRate = 16.15 * 1.20; // Almeno 20% di maggiorazione
      if (averageHourlyRate >= expectedMinRate) {
        testOutput += `✅ Maggiorazioni OK: €${averageHourlyRate.toFixed(2)}/h\n`;
      } else {
        testOutput += `❌ Maggiorazioni basse: €${averageHourlyRate.toFixed(2)}/h\n`;
      }

      // Verifica sistema utilizzato
      if (result.breakdown && JSON.stringify(result.breakdown).includes('fascia')) {
        testOutput += `✅ Sistema fasce orarie ATTIVO\n`;
      } else {
        testOutput += `❌ Sistema tradizionale (8h base)\n`;
      }

      if (result.breakdown) {
        testOutput += `\n🔍 BREAKDOWN:\n${JSON.stringify(result.breakdown, null, 2)}`;
      }

      setTestResults(testOutput);
      console.log('✅ Test completato');

    } catch (error) {
      console.error('❌ Errore test:', error);
      setTestResults(`❌ ERRORE NEL TEST:\n${error.message}\n\nStack:\n${error.stack}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Test Fasce Orarie - 25/07/2025
      </Text>
      
      <TouchableOpacity 
        onPress={runFasceTest}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 20 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          🔄 Rilancia Test
        </Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {testResults}
        </Text>
      </ScrollView>
    </View>
  );
};

export default TestFasceOrarie;
