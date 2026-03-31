/**
 * 🕐 TEST INTEGRAZIONE SISTEMA MULTI-FASCIA
 * Verifico che tutto funzioni correttamente dal TimeEntryForm alla Dashboard
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

const TestMultiFasciaIntegration = () => {
  
  const runIntegrationTest = async () => {
    console.log('🕐 === INIZIO TEST INTEGRAZIONE MULTI-FASCIA ===');
    
    try {
      // Importa i servizi necessari
      const CalculationService = require('./src/services/CalculationService').default;
      const HourlyRatesService = require('./src/services/HourlyRatesService').default;
      
      const calculationService = new CalculationService();
      
      // 1. Verifica che HourlyRatesService sia attivo
      console.log('1️⃣ Verifico stato HourlyRatesService...');
      const isActive = await HourlyRatesService.isHourlyRatesEnabled();
      console.log(`   Sistema multi-fascia attivo: ${isActive ? '✅ SÌ' : '❌ NO'}`);
      
      // 2. Test dati di esempio - lavoro attraverso più fasce orarie
      console.log('2️⃣ Preparazione dati test...');
      const testWorkEntry = {
        date: '2024-01-15', // Lunedì
        startTime: '07:00',  // Inizio lavoro diurno
        endTime: '22:00',    // Fine lavoro notturno (attraversa tutte e 3 le fasce)
        travelStartTime: '06:30',
        travelEndTime: '22:30',
        type: 'standby',
        travelCompensation: true,
        notes: 'Test multi-fascia integration'
      };
      
      const testSettings = {
        contract: {
          hourlyRate: 16.41,
          overtimeRates: {
            day: 1.2,
            saturday: 1.25,
            holiday: 1.3
          }
        },
        travelHoursSetting: 'STANDARD'
      };
      
      console.log('   Dati test:', {
        orari: `${testWorkEntry.startTime} - ${testWorkEntry.endTime}`,
        viaggi: `${testWorkEntry.travelStartTime} - ${testWorkEntry.travelEndTime}`,
        durata: '15 ore di lavoro attraverso tutte le fasce'
      });
      
      // 3. Calcola breakdown con sistema multi-fascia
      console.log('3️⃣ Calcolo breakdown...');
      const breakdown = await calculationService.calculateEarningsBreakdown(testWorkEntry, testSettings);
      
      console.log('   Risultato calcolo:', {
        sistemaUsato: breakdown.details?.hourlyRatesMethod || 'standard',
        totaleOrario: breakdown.ordinary?.total || 0,
        haBreakdown: !!(breakdown.details?.hourlyRatesBreakdown),
        numereFasce: breakdown.details?.hourlyRatesBreakdown?.length || 0
      });
      
      // 4. Verifica che il breakdown multi-fascia sia presente
      if (breakdown.details?.hourlyRatesBreakdown) {
        console.log('4️⃣ ✅ BREAKDOWN MULTI-FASCIA TROVATO!');
        
        breakdown.details.hourlyRatesBreakdown.forEach((fascia, index) => {
          console.log(`   Fascia ${index + 1}: ${fascia.name}`);
          console.log(`     Orario: ${fascia.hours?.toFixed(2) || 0}h`);
          console.log(`     Tariffa: €${fascia.hourlyRate?.toFixed(2) || 0}`);
          console.log(`     Guadagno: €${fascia.earnings?.toFixed(2) || 0}`);
          console.log(`     Maggiorazione: ${((fascia.rate || 1) - 1) * 100}%`);
          console.log(`     Colore: ${fascia.color || 'N/A'}`);
        });
        
        const totaleFasce = breakdown.details.hourlyRatesBreakdown.reduce((sum, fascia) => sum + (fascia.earnings || 0), 0);
        console.log(`   Totale da fasce: €${totaleFasce.toFixed(2)}`);
        console.log(`   Totale breakdown: €${breakdown.ordinary?.total?.toFixed(2) || 0}`);
        
        const differenza = Math.abs(totaleFasce - (breakdown.ordinary?.total || 0));
        if (differenza < 0.01) {
          console.log('   ✅ I totali coincidono perfettamente!');
        } else {
          console.log(`   ⚠️ Differenza nei totali: €${differenza.toFixed(2)}`);
        }
        
      } else {
        console.log('4️⃣ ❌ BREAKDOWN MULTI-FASCIA NON TROVATO');
        console.log('   Il sistema potrebbe non essere attivo o ci sono errori');
      }
      
      // 5. Test compatibilità con versione sincrona
      console.log('5️⃣ Test compatibilità versione sincrona...');
      const syncBreakdown = calculationService.calculateEarningsBreakdownSync(testWorkEntry, testSettings);
      
      console.log('   Risultato sync:', {
        totale: syncBreakdown.ordinary?.total || 0,
        differenzaAsync: Math.abs((syncBreakdown.ordinary?.total || 0) - (breakdown.ordinary?.total || 0))
      });
      
      // 6. Conclusioni test
      console.log('6️⃣ === RISULTATI TEST ===');
      
      const risultati = {
        servizioAttivo: isActive,
        breakdownPresente: !!(breakdown.details?.hourlyRatesBreakdown),
        fasceTrovate: breakdown.details?.hourlyRatesBreakdown?.length || 0,
        totaleCalcolato: breakdown.ordinary?.total || 0,
        compatibilitaSync: Math.abs((syncBreakdown.ordinary?.total || 0) - (breakdown.ordinary?.total || 0)) < 0.01
      };
      
      console.log('   Risultati finali:', risultati);
      
      if (risultati.servizioAttivo && risultati.breakdownPresente && risultati.fasceTrovate > 0) {
        console.log('   🎉 ✅ INTEGRAZIONE MULTI-FASCIA FUNZIONANTE!');
        return true;
      } else {
        console.log('   ❌ Ci sono problemi nell\'integrazione');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Errore durante test integrazione:', error);
      console.error('Stack trace:', error.stack);
      return false;
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🕐 Test Integrazione Multi-Fascia
      </Text>
      
      <TouchableOpacity 
        style={{
          backgroundColor: '#2196F3',
          padding: 15,
          borderRadius: 8,
          marginBottom: 15
        }}
        onPress={async () => {
          const result = await runIntegrationTest();
          Alert.alert(
            'Test Completato',
            result ? 'Integrazione multi-fascia funzionante!' : 'Ci sono problemi da risolvere',
            [{ text: 'OK' }]
          );
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          Avvia Test Integrazione
        </Text>
      </TouchableOpacity>
      
      <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18 }}>
        Questo test verifica che:{'\n'}
        • HourlyRatesService sia attivo{'\n'}
        • CalculationService integri correttamente le fasce{'\n'}
        • Il breakdown multi-fascia sia generato{'\n'}
        • La compatibilità sync/async funzioni{'\n'}
        • I totali siano corretti
      </Text>
    </View>
  );
};

export default TestMultiFasciaIntegration;
