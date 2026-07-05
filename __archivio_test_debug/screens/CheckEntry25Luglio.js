import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../hooks';

const CheckEntry25Luglio = () => {
  const [results, setResults] = useState('Caricamento...');
  const [entry, setEntry] = useState(null);
  const { database, updateWorkEntry } = useDatabase();

  useEffect(() => {
    checkEntry();
  }, []);

  const checkEntry = async () => {
    try {
      console.log('🔍 VERIFICA ENTRY 25/07/2025');
      
      if (!database) {
        setResults('❌ Database non disponibile');
        return;
      }

      // Cerca l'entry del 25/07/2025
      const result = await new Promise((resolve, reject) => {
        database.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM work_entries WHERE date = ?',
            ['2025-07-25'],
            (_, { rows }) => resolve(rows._array),
            (_, error) => reject(error)
          );
        });
      });

      let output = `🔍 VERIFICA ENTRY 25/07/2025\n`;
      output += `═══════════════════════════════════════\n\n`;
      
      if (result.length === 0) {
        output += `❌ NESSUNA ENTRY TROVATA per il 25/07/2025\n\n`;
        output += `📝 Per testare le fasce orarie:\n`;
        output += `1. Vai in "Inserimento Orario"\n`;
        output += `2. Crea una nuova entry per il 25/07/2025\n`;
        output += `3. Imposta un turno notturno (es: 20:00-06:00)\n`;
        output += `4. Il sistema userà le nuove fasce orarie\n`;
      } else {
        output += `✅ ENTRY TROVATA per il 25/07/2025\n\n`;
        const entryData = result[0];
        setEntry(entryData); // Salva entry nello stato per il ricalcolo
        
        output += `📋 DETTAGLI ENTRY:\n`;
        output += `• ID: ${entryData.id}\n`;
        output += `• Data: ${entryData.date}\n`;
        output += `• Turno 1: ${entryData.work_start_1} - ${entryData.work_end_1}\n`;
        if (entryData.work_start_2 && entryData.work_end_2) {
          output += `• Turno 2: ${entryData.work_start_2} - ${entryData.work_end_2}\n`;
        }
        output += `• Sito: ${entryData.site_name || 'Non specificato'}\n`;
        output += `• Guadagno totale: €${entryData.total_earnings || 0}\n\n`;
        
        // Ora ricalcoliamo con le nuove fasce
        output += `🔄 RICALCOLANDO CON FASCE ORARIE...\n`;
        
        // Carica le impostazioni del metodo di calcolo
        const calculationMethod = await AsyncStorage.getItem('calculation_method') || 'DAILY_RATE_WITH_SUPPLEMENTS';
        const mixedCalculationEnabled = JSON.parse(await AsyncStorage.getItem('enable_mixed_calculation') || 'true');
        
        output += `\n🔧 METODO DI CALCOLO CONFIGURATO:\n`;
        output += `• Metodo: ${calculationMethod}\n`;
        output += `• Calcolo misto: ${mixedCalculationEnabled ? 'Abilitato' : 'Disabilitato'}\n`;
        
        const methodNames = {
          'DAILY_RATE_WITH_SUPPLEMENTS': 'Tariffa Giornaliera + Maggiorazioni CCNL',
          'PURE_HOURLY_WITH_MULTIPLIERS': 'Tariffe Orarie Pure con Moltiplicatori'
        };
        output += `• Descrizione: ${methodNames[calculationMethod] || 'Sconosciuto'}\n\n`;
        
        try {
          const CalculationService = await import('../services/CalculationService');
          const calculationService = new CalculationService.default();
          calculationService.useDetailedCalculation = true;

          const workEntry = {
            date: entryData.date,
            startTime: entryData.work_start_1,
            endTime: entryData.work_end_1,
            workStart1: entryData.work_start_1,
            workEnd1: entryData.work_end_1,
            workStart2: entryData.work_start_2,
            workEnd2: entryData.work_end_2,
            siteName: entryData.site_name,
            travelKm: 0,
            travelTime: 0,
          };

          // Carica le impostazioni del contratto
          const contractData = await AsyncStorage.getItem('contractSettings');
          const contract = contractData ? JSON.parse(contractData) : {
            hourlyRate: 16.15,
            dailyRate: 107.69,
            monthlySalary: 2800.00,
            overtimeRates: {
              holiday: 1.3,
              saturday: 1.25
            }
          };

          const settings = {
            contract: contract,
            hourlyRate: contract.hourlyRate || 16.15,
            contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
            useDetailedCalculation: true,
            travelHoursSetting: 'NO_TRAVEL'
          };

          const newResult = await calculationService.calculateDailyEarnings(workEntry, settings);
          
          const totalHours = (newResult.regularHours || 0) + (newResult.overtimeHours || 0);
          const totalPay = (newResult.regularPay || 0) + (newResult.overtimePay || 0);
          
          output += `\n📊 RISULTATI CON FASCE ORARIE:\n`;
          output += `• Ore totali: ${totalHours.toFixed(1)}h\n`;
          output += `• Retribuzione: €${totalPay.toFixed(2)}\n`;
          output += `• Tariffa media: €${(totalPay/totalHours).toFixed(2)}/h\n\n`;
          
          const difference = totalPay - (entryData.total_earnings || 0);
          if (Math.abs(difference) > 0.01) {
            output += `💰 DIFFERENZA: ${difference > 0 ? '+' : ''}€${difference.toFixed(2)}\n`;
            output += `⚠️ L'entry nel database ha un valore diverso!\n`;
            output += `🔄 Potrebbe essere necessario ricalcolare\n`;
          } else {
            output += `✅ Calcolo coerente con il database\n`;
          }

        } catch (calcError) {
          output += `❌ Errore nel calcolo: ${calcError.message}\n`;
        }
      }

      // Verifica anche le impostazioni fasce orarie
      const timeSlotsData = await AsyncStorage.getItem('custom_time_slots');
      const enableTimeBasedRates = await AsyncStorage.getItem('enable_time_based_rates');
      
      output += `\n🔧 CONFIGURAZIONE FASCE ORARIE:\n`;
      output += `• Abilitate: ${enableTimeBasedRates || 'non impostato'}\n`;
      if (timeSlotsData) {
        const slots = JSON.parse(timeSlotsData);
        output += `• Numero fasce: ${slots.length}\n`;
        slots.forEach(slot => {
          output += `  - ${slot.name}: ${slot.start}-${slot.end} (x${slot.rate})\n`;
        });
      } else {
        output += `• Fasce: Non configurate\n`;
      }

      setResults(output);
      
    } catch (error) {
      console.error('❌ Errore verifica:', error);
      setResults(`❌ ERRORE: ${error.message}\n\nStack: ${error.stack}`);
    }
  };

  const recalculateEntry = async () => {
    Alert.alert(
      entry ? 'Ricalcola Entry' : 'Test Fasce Orarie',
      entry ? 
        'Vuoi ricalcolare l\'entry del 25/07/2025 con le nuove fasce orarie?' :
        'Non esiste un\'entry per il 25/07/2025. Vuoi testare le fasce orarie con un turno notturno?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: entry ? 'Ricalcola' : 'Test Fasce', 
          onPress: async () => {
            try {
              setResults('🔄 Processando...\n');
              
              if (!entry) {
                // Test diretto delle fasce orarie senza creare entry nel database
                console.log('🧪 Testando fasce orarie con turno notturno 20:00-06:00...');
                
                const testWorkEntry = {
                  date: '2025-07-25',
                  workStart1: '20:00',
                  workEnd1: '23:59',
                  workStart2: '00:00',
                  workEnd2: '06:00',
                  // Aggiungi i campi che il CalculationService si aspetta
                  orario_inizio: '20:00',
                  orario_fine: '06:00',
                  siteName: 'Test Fasce Orarie',
                  vehicleDriven: 'non_guidato',
                  departureCompany: '',
                  arrivalSite: '',
                  departureReturn: '',
                  arrivalCompany: '',
                  interventi: [],
                  viaggi: [],
                  travelAllowance: 0,
                  isStandbyDay: 0,
                  dayType: 'lavorativa',
                  completamentoGiornata: 'nessuno'
                };

                console.log('🔄 Testando con workEntry:', testWorkEntry);

                // Esegui il test con le nuove fasce orarie
                const CalculationService = await import('../services/CalculationService');
                const calculationService = new CalculationService.default();
                
                // Carica le impostazioni del contratto
                const contractData = await AsyncStorage.getItem('contractSettings');
                const contract = contractData ? JSON.parse(contractData) : {
                  hourlyRate: 16.15,
                  dailyRate: 107.69,
                  monthlySalary: 2800.00,
                  overtimeRates: {
                    holiday: 1.3,
                    saturday: 1.25
                  }
                };

                const settings = {
                  contract: contract,
                  hourlyRate: contract.hourlyRate || 16.15,
                  contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
                  useDetailedCalculation: true,
                  travelHoursSetting: 'NO_TRAVEL'
                };
                
                const testResult = await calculationService.calculateDailyEarnings(testWorkEntry, settings);
                
                console.log('📊 Risultato test fasce orarie:', testResult);

                let output = '🧪 TEST FASCE ORARIE TURNO NOTTURNO\n';
                output += '═══════════════════════════════════════\n\n';
                output += '🌙 TURNO DI TEST: 20:00-06:00\n';
                output += '• Turno 1: 20:00-23:59 (3h 59min)\n';
                output += '• Turno 2: 00:00-06:00 (6h)\n';
                output += '• Totale: 10h\n\n';
                
                output += '💰 RISULTATI CALCOLO:\n';
                output += `• Retribuzione totale: €${(testResult.totalEarnings || testResult.total || 0).toFixed(2)}\n`;
                output += `• Ore regolari: ${(testResult.regularHours || 0).toFixed(1)}h\n`;
                output += `• Ore straordinarie: ${(testResult.overtimeHours || 0).toFixed(1)}h\n`;
                output += `• Paga base: €${(testResult.regularPay || 0).toFixed(2)}\n`;
                output += `• Paga straordinari: €${(testResult.overtimePay || 0).toFixed(2)}\n\n`;
                
                // Debug informazioni
                if (testResult.breakdown) {
                  output += `🔍 DEBUG INFORMAZIONI:\n`;
                  output += `• Metodo calcolo: ${testResult.breakdown.calculationMethod || 'N/A'}\n`;
                  output += `• Fasce abilitate: ${testResult.breakdown.enableTimeBasedRates || false}\n`;
                  output += `• Fasce avanzate: ${testResult.breakdown.useAdvancedHourlyRates || false}\n`;
                  output += `• Ore lavoro totali: ${testResult.breakdown.workHours || 0}\n\n`;
                }
                
                const totalEarnings = testResult.totalEarnings || testResult.total || 0;
                const totalHours = (testResult.regularHours || 0) + (testResult.overtimeHours || 0) || 10;
                const avgRate = totalEarnings / totalHours;
                output += `📊 ANALISI:\n`;
                output += `• Tariffa media: €${avgRate.toFixed(2)}/h\n`;
                output += `• Base €16.15/h: ${avgRate > 16.15 ? '✅' : '❌'} ${avgRate > 16.15 ? 'Maggiorata!' : 'Base normale'}\n\n`;
                
                if (avgRate > 16.15) {
                  const increase = ((avgRate - 16.15) / 16.15 * 100);
                  output += `🚀 Incremento: +${increase.toFixed(1)}% rispetto alla base\n`;
                  output += `💡 Le fasce orarie stanno funzionando!\n`;
                } else {
                  output += `⚠️ Nessun incremento - verificare configurazione fasce\n`;
                }

                setResults(output);

                Alert.alert(
                  'Test Completato!',
                  `Test fasce orarie terminato.\n\nTariffa media: €${avgRate.toFixed(2)}/h\n\nVerifica i dettagli sopra.`,
                  [{ text: 'OK' }]
                );
                return;
              }

              // Prepara i dati per il ricalcolo entry esistente
              const workEntry = {
                date: entry.date,
                workStart1: entry.work_start_1,
                workEnd1: entry.work_end_1,
                workStart2: entry.work_start_2,
                workEnd2: entry.work_end_2,
                siteName: entry.site_name || '',
                vehicleDriven: entry.vehicle_driven || 'non_guidato',
                departureCompany: entry.departure_company || '',
                arrivalSite: entry.arrival_site || '',
                departureReturn: entry.departure_return || '',
                arrivalCompany: entry.arrival_company || '',
                interventi: [],
                viaggi: [],
                travelAllowance: entry.travel_allowance || 0,
                isStandbyDay: entry.is_standby_day || 0,
                dayType: entry.day_type || 'lavorativa',
                completamentoGiornata: entry.completamento_giornata || 'nessuno'
              };

              console.log('🔄 Ricalcolando con workEntry:', workEntry);

              // Esegui il ricalcolo con le nuove fasce orarie
              const CalculationService = await import('../services/CalculationService');
              const calculationService = new CalculationService.default();
              
              // Carica le impostazioni del contratto
              const contractData = await AsyncStorage.getItem('contractSettings');
              const contract = contractData ? JSON.parse(contractData) : {
                hourlyRate: 16.15,
                dailyRate: 107.69,
                monthlySalary: 2800.00,
                overtimeRates: {
                  holiday: 1.3,
                  saturday: 1.25
                }
              };

              const settings = {
                contract: contract,
                hourlyRate: contract.hourlyRate || 16.15,
                contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
                useDetailedCalculation: true,
                travelHoursSetting: 'NO_TRAVEL'
              };
              
              const newResult = await calculationService.calculateDailyEarnings(workEntry, settings);
              
              console.log('📊 Risultato ricalcolo:', newResult);

              // Aggiorna nel database 
              await updateWorkEntry(entry.id, {
                total_earnings: newResult.totalEarnings
              });

              console.log('✅ Entry aggiornata nel database');

              // Ricarica per verificare
              await checkEntry();

              Alert.alert(
                'Ricalcolo Completato!',
                `Entry aggiornata con successo!\n\nNuovo totale: €${newResult.totalEarnings.toFixed(2)}\n\nVerifica i risultati sopra.`,
                [{ text: 'OK' }]
              );

            } catch (error) {
              console.error('❌ Errore ricalcolo:', error);
              Alert.alert('Errore', `Errore durante il processo: ${error.message}`);
              setResults(prev => prev + `\n❌ ERRORE: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Verifica Entry 25/07/2025
      </Text>
      
      <TouchableOpacity 
        onPress={checkEntry}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 10 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          🔄 Riverifica
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={recalculateEntry}
        style={{ 
          backgroundColor: '#FF9500', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 20 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {entry ? '🔢 Ricalcola Entry' : '🧪 Test Fasce Orarie'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {results}
        </Text>
      </ScrollView>
    </View>
  );
};

export default CheckEntry25Luglio;
