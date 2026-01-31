import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { parseNumericValue } from '../utils';

const HourlyRatesSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Impostazioni principali
  const [calculationMethod, setCalculationMethod] = useState('hourly_priority'); // 'hourly_priority' o 'daily_priority'
  const [enableTimeBasedRates, setEnableTimeBasedRates] = useState(true);
  
  // Fasce orarie personalizzate - 3 FASCE: Diurno, Serale, Notturno
  const [timeSlots, setTimeSlots] = useState([
    { id: 'diurno', name: 'Diurno', start: '06:00', end: '14:00', rate: 1.0, color: '#2196F3' },
    { id: 'serale', name: 'Serale', start: '14:00', end: '22:00', rate: 1.0, color: '#FF9800' },
    { id: 'notturno', name: 'Notturno', start: '22:00', end: '06:00', rate: 1.25, color: '#9C27B0' }
  ]);
  
  // Stati temporanei per input numerico più fluido
  const [inputValues, setInputValues] = useState({});
  
  // Impostazioni straordinario
  const [overtimeSettings, setOvertimeSettings] = useState({
    enabled: true,
    dailyThreshold: 8, // ore dopo le quali scatta lo straordinario
    weeklyThreshold: 40, // ore settimanali dopo le quali scatta lo straordinario
    overtimeRate: 1.2, // maggiorazione straordinario diurno
    overtimeNightRate: 1.5, // maggiorazione straordinario notturno
    combineMaggiorazioni: true // se combinare maggiorazioni notturne + straordinario
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Carica impostazioni metodo di calcolo
      const methodData = await AsyncStorage.getItem('hourly_calculation_method');
      if (methodData) {
        setCalculationMethod(methodData);
      }
      
      // Carica impostazioni fasce orarie
      const timeSlotsData = await AsyncStorage.getItem('custom_time_slots');
      console.log('🔧 CARICAMENTO FASCE:', {
        rawData: timeSlotsData,
        hasData: !!timeSlotsData
      });
      
      if (timeSlotsData) {
        const loadedSlots = JSON.parse(timeSlotsData);
        console.log('🔧 FASCE CARICATE:', loadedSlots);
        
        // 🔥 CONTROLLO: Se ci sono ancora le vecchie 4 fasce, forza l'aggiornamento alle 3 nuove
        if (loadedSlots.length === 4 && loadedSlots.some(slot => slot.id === 'morning' || slot.id === 'night_early')) {
          console.log('🔄 AGGIORNAMENTO: Rilevate vecchie 4 fasce, aggiorno alle 3 nuove fasce');
          const newSlots = [
            { id: 'diurno', name: 'Diurno', start: '06:00', end: '14:00', rate: 1.0, color: '#2196F3' },
            { id: 'serale', name: 'Serale', start: '14:00', end: '22:00', rate: 1.0, color: '#FF9800' },
            { id: 'notturno', name: 'Notturno', start: '22:00', end: '06:00', rate: 1.25, color: '#9C27B0' }
          ];
          setTimeSlots(newSlots);
          // Salva immediatamente le nuove fasce
          await AsyncStorage.setItem('custom_time_slots', JSON.stringify(newSlots));
          console.log('✅ AGGIORNAMENTO: Nuove 3 fasce salvate automaticamente');
        } else {
          setTimeSlots(loadedSlots);
        }
      } else {
        console.log('🔧 USANDO FASCE DEFAULT (nessun dato salvato)');
        // 🔥 SALVA AUTOMATICAMENTE LE FASCE DI DEFAULT
        const defaultSlots = [
          { id: 'diurno', name: 'Diurno', start: '06:00', end: '14:00', rate: 1.0, color: '#2196F3' },
          { id: 'serale', name: 'Serale', start: '14:00', end: '22:00', rate: 1.0, color: '#FF9800' },
          { id: 'notturno', name: 'Notturno', start: '22:00', end: '06:00', rate: 1.25, color: '#9C27B0' }
        ];
        await AsyncStorage.setItem('custom_time_slots', JSON.stringify(defaultSlots));
        console.log('✅ INIZIALIZZAZIONE: Nuove 3 fasce salvate come default');
      }
      
      // Carica impostazioni straordinario
      const overtimeData = await AsyncStorage.getItem('overtime_settings');
      if (overtimeData) {
        setOvertimeSettings(JSON.parse(overtimeData));
      }
      
      // Carica abilitazione fasce orarie
      const timeBasedData = await AsyncStorage.getItem('enable_time_based_rates');
      if (timeBasedData) {
        setEnableTimeBasedRates(JSON.parse(timeBasedData));
      }
      
      console.log('✅ Impostazioni fasce orarie caricate');
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni fasce orarie:', error);
      Alert.alert('Errore', 'Impossibile caricare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      await AsyncStorage.setItem('hourly_calculation_method', calculationMethod);
      await AsyncStorage.setItem('custom_time_slots', JSON.stringify(timeSlots));
      await AsyncStorage.setItem('overtime_settings', JSON.stringify(overtimeSettings));
      await AsyncStorage.setItem('enable_time_based_rates', JSON.stringify(enableTimeBasedRates));
      
      console.log('✅ SALVATAGGIO FASCE:', {
        method: calculationMethod,
        slotsCount: timeSlots.length,
        slots: timeSlots,
        enabled: enableTimeBasedRates
      });
      
      console.log('✅ Impostazioni fasce orarie salvate');
      Alert.alert(
        '✅ Salvato',
        'Le impostazioni delle fasce orarie sono state salvate correttamente.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni fasce orarie:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTimeSlot = (id, field, value) => {
    setTimeSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const resetToDefaults = () => {
    Alert.alert(
      '⚠️ Reset Impostazioni',
      'Vuoi ripristinare le impostazioni predefinite? Tutte le personalizzazioni andranno perse.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setCalculationMethod('hourly_priority');
            setEnableTimeBasedRates(true);
            setTimeSlots([
              { id: 'day', name: 'Lavoro Diurno', start: '06:00', end: '20:00', rate: 1.0, color: '#2196F3' },
              { id: 'evening', name: 'Lavoro Notturno fino alle 22h', start: '20:00', end: '22:00', rate: 1.25, color: '#FF9800' },
              { id: 'night', name: 'Lavoro Notturno oltre le 22h', start: '22:00', end: '06:00', rate: 1.35, color: '#9C27B0' }
            ]);
            setOvertimeSettings({
              enabled: true,
              dailyThreshold: 8,
              weeklyThreshold: 40,
              overtimeRate: 1.2,
              overtimeNightRate: 1.5,
              combineMaggiorazioni: true
            });
          }
        }
      ]
    );
  };

  const testCCNLCompliance = async () => {
    try {
      // Prima salva le impostazioni correnti
      await saveSettings();
      
      Alert.alert(
        '🧪 Test Conformità CCNL',
        'Questo test verificherà che il nuovo sistema di fasce orarie rispetti i requisiti CCNL.\n\nTest case: Turno 20:00-06:00 (10 ore)\n\nSecondo CCNL:\n• 20:00-22:00: Notturno fino 22h +25%\n• 22:00-06:00: Notturno oltre 22h +35%\n• Prime 8 ore: Con maggiorazioni\n• Ultime 2 ore: Straordinario',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Esegui Test',
            onPress: async () => {
              try {
                // Importa CalculationService
                const CalculationService = await import('../services/CalculationService');
                const calculationService = new CalculationService.default();
                calculationService.useDetailedCalculation = true;
                
                const testWorkEntry = {
                  date: '2024-01-15',
                  startTime: '20:00',
                  endTime: '06:00',
                  travelKm: 0,
                  travelTime: 0,
                  notes: 'Test CCNL compliance'
                };
                
                const testSettings = {
                  hourlyRate: 15.00,
                  contractType: 'CCNL_METALMECCANICI_INDUSTRIA',
                  useDetailedCalculation: true,
                  travelHoursSetting: 'NO_TRAVEL'
                };
                
                console.log('🧪 Avvio test CCNL...');
                const result = await calculationService.calculateDailyEarnings(testWorkEntry, testSettings);
                
                const totalHours = (result.regularHours || 0) + (result.overtimeHours || 0);
                const totalPay = (result.regularPay || 0) + (result.overtimePay || 0);
                const averageHourlyRate = totalPay / totalHours;
                const expectedMinimumRate = 15 * 1.25; // Minimo con 25% maggiorazione serale
                
                let testResults = `📊 RISULTATI TEST CCNL\n\n`;
                testResults += `⏰ Ore totali: ${totalHours.toFixed(1)}h\n`;
                testResults += `💰 Retribuzione totale: €${totalPay.toFixed(2)}\n`;
                testResults += `📈 Tariffa media: €${averageHourlyRate.toFixed(2)}/h\n\n`;
                
                testResults += `✅ VERIFICHE:\n`;
                testResults += totalHours >= 9.9 && totalHours <= 10.1 ? 
                  `✅ Ore corrette (${totalHours.toFixed(1)}h)\n` : 
                  `❌ Ore sbagliate (${totalHours.toFixed(1)}h invece di 10h)\n`;
                  
                testResults += averageHourlyRate >= expectedMinimumRate ? 
                  `✅ Maggiorazioni applicate (€${averageHourlyRate.toFixed(2)}/h >= €${expectedMinimumRate.toFixed(2)}/h)\n` : 
                  `❌ Maggiorazioni insufficienti (€${averageHourlyRate.toFixed(2)}/h < €${expectedMinimumRate.toFixed(2)}/h)\n`;
                
                testResults += result.regularHours > 0 ? 
                  `✅ Ore regolari riconosciute (${result.regularHours.toFixed(1)}h)\n` : 
                  `❌ Nessuna ora regolare riconosciuta\n`;
                
                if (result.breakdown) {
                  testResults += `\n📋 DETTAGLIO:\n`;
                  testResults += JSON.stringify(result.breakdown, null, 2);
                }
                
                Alert.alert('🧪 Risultati Test CCNL', testResults, [{ text: 'OK' }]);
                
              } catch (error) {
                console.error('❌ Errore test CCNL:', error);
                Alert.alert(
                  '❌ Errore Test',
                  `Si è verificato un errore durante il test:\n\n${error.message}\n\nVerifica la console per dettagli.`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Errore preparazione test:', error);
      Alert.alert('Errore', 'Impossibile preparare il test');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Fasce Orarie</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Fasce Orarie Avanzate</Text>
        <TouchableOpacity onPress={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        
        {/* Sezione Metodo di Calcolo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Metodo di Calcolo</Text>
          
          <View style={styles.optionContainer}>
            <TouchableOpacity
              style={[
                styles.methodOption,
                calculationMethod === 'hourly_priority' && styles.methodOptionSelected
              ]}
              onPress={() => setCalculationMethod('hourly_priority')}
            >
              <View style={styles.methodHeader}>
                <Ionicons 
                  name={calculationMethod === 'hourly_priority' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={calculationMethod === 'hourly_priority' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.methodTitle,
                  calculationMethod === 'hourly_priority' && { color: theme.colors.primary }
                ]}>
                  Priorità Fasce Orarie (Consigliato)
                </Text>
              </View>
              <Text style={styles.methodDescription}>
                🕐 Le maggiorazioni si applicano in base all'orario effettivo di lavoro.
                {'\n'}📋 Esempio: 14:00-02:00 → 14-20 diurno, 20-22 notturno +25%, 22-02 notturno +35%
                {'\n'}✅ Conforme CCNL con maggiorazioni per fasce orarie
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                calculationMethod === 'daily_priority' && styles.methodOptionSelected
              ]}
              onPress={() => setCalculationMethod('daily_priority')}
            >
              <View style={styles.methodHeader}>
                <Ionicons 
                  name={calculationMethod === 'daily_priority' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={calculationMethod === 'daily_priority' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.methodTitle,
                  calculationMethod === 'daily_priority' && { color: theme.colors.primary }
                ]}>
                  Priorità Ore Giornaliere (Legacy)
                </Text>
              </View>
              <Text style={styles.methodDescription}>
                📊 Prime 8 ore sempre normali, maggiorazioni solo sullo straordinario.
                {'\n'}📋 Esempio: 14:00-02:00 → Prime 8h normali, 4h straordinario notturno
                {'\n'}⚠️ Non considera fasce orarie nelle ore normali
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Abilita/Disabilita Fasce Orarie */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>🕐 Abilita Fasce Orarie Personalizzate</Text>
              <Text style={styles.switchDescription}>
                Applica maggiorazioni diverse in base all'orario di lavoro
              </Text>
            </View>
            <Switch
              value={enableTimeBasedRates}
              onValueChange={setEnableTimeBasedRates}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={enableTimeBasedRates ? '#FFFFFF' : theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Fasce Orarie Personalizzate */}
        {enableTimeBasedRates && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Fasce Orarie Personalizzate</Text>
            <Text style={styles.sectionDescription}>
              Configura le maggiorazioni per diverse fasce orarie della giornata
            </Text>
            
            {timeSlots.map((slot, index) => (
              <View key={slot.id} style={styles.timeSlotContainer}>
                <View style={styles.timeSlotHeader}>
                  <View style={[styles.timeSlotColor, { backgroundColor: slot.color }]} />
                  <Text style={styles.timeSlotName}>{slot.name}</Text>
                </View>
                
                <View style={styles.timeSlotInputs}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Inizio</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={slot.start}
                      onChangeText={(value) => updateTimeSlot(slot.id, 'start', value)}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </View>
                  
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Fine</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={slot.end}
                      onChangeText={(value) => updateTimeSlot(slot.id, 'end', value)}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </View>
                  
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.inputLabel}>Maggiorazione</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={inputValues[`rate_${slot.id}`] !== undefined ? inputValues[`rate_${slot.id}`] : slot.rate.toString()}
                      onChangeText={(value) => {
                        // Aggiorna lo stato temporaneo per mostrare il valore digitato
                        setInputValues(prev => ({ ...prev, [`rate_${slot.id}`]: value }));
                        
                        // Valida e aggiorna solo se il valore è valido
                        if (value === '' || /^\d*[.,]?\d*$/.test(value)) {
                          const numValue = parseNumericValue(value, slot.rate);
                          if (!isNaN(numValue) && numValue > 0) {
                            updateTimeSlot(slot.id, 'rate', numValue);
                          }
                        }
                      }}
                      onBlur={() => {
                        // Pulisce lo stato temporaneo quando l'utente esce dal campo
                        setInputValues(prev => {
                          const newState = { ...prev };
                          delete newState[`rate_${slot.id}`];
                          return newState;
                        });
                      }}
                      placeholder="1.0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <Text style={styles.timeSlotExample}>
                  💰 Tariffa: x{slot.rate} (es. €16.15 → €{(16.15 * slot.rate).toFixed(2)}/h)
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Impostazioni Straordinario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Impostazioni Straordinario</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Abilita Straordinario</Text>
              <Text style={styles.switchDescription}>
                Applica maggiorazioni per ore di lavoro oltre la soglia giornaliera
              </Text>
            </View>
            <Switch
              value={overtimeSettings.enabled}
              onValueChange={(value) => setOvertimeSettings(prev => ({ ...prev, enabled: value }))}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={overtimeSettings.enabled ? '#FFFFFF' : theme.colors.textSecondary}
            />
          </View>

          {overtimeSettings.enabled && (
            <>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Soglia Giornaliera (ore)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={overtimeSettings.dailyThreshold.toString()}
                  onChangeText={(value) => {
                    const numValue = parseInt(value) || 8;
                    setOvertimeSettings(prev => ({ ...prev, dailyThreshold: numValue }));
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Maggiorazione Diurna</Text>
                <TextInput
                  style={styles.numberInput}
                  value={inputValues['overtime_rate'] !== undefined ? inputValues['overtime_rate'] : overtimeSettings.overtimeRate.toString()}
                  onChangeText={(value) => {
                    setInputValues(prev => ({ ...prev, 'overtime_rate': value }));
                    
                    if (value === '' || /^\d*[.,]?\d*$/.test(value)) {
                      const numValue = parseNumericValue(value, overtimeSettings.overtimeRate);
                      if (!isNaN(numValue) && numValue > 0) {
                        setOvertimeSettings(prev => ({ ...prev, overtimeRate: numValue }));
                      }
                    }
                  }}
                  onBlur={() => {
                    setInputValues(prev => {
                      const newState = { ...prev };
                      delete newState['overtime_rate'];
                      return newState;
                    });
                  }}
                  placeholder="1.2"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Maggiorazione Notturna</Text>
                <TextInput
                  style={styles.numberInput}
                  value={inputValues['overtime_night_rate'] !== undefined ? inputValues['overtime_night_rate'] : overtimeSettings.overtimeNightRate.toString()}
                  onChangeText={(value) => {
                    setInputValues(prev => ({ ...prev, 'overtime_night_rate': value }));
                    
                    if (value === '' || /^\d*[.,]?\d*$/.test(value)) {
                      const numValue = parseNumericValue(value, overtimeSettings.overtimeNightRate);
                      if (!isNaN(numValue) && numValue > 0) {
                        setOvertimeSettings(prev => ({ ...prev, overtimeNightRate: numValue }));
                      }
                    }
                  }}
                  onBlur={() => {
                    setInputValues(prev => {
                      const newState = { ...prev };
                      delete newState['overtime_night_rate'];
                      return newState;
                    });
                  }}
                  placeholder="1.5"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchTitle}>Combina Maggiorazioni</Text>
                  <Text style={styles.switchDescription}>
                    Applica contemporaneamente maggiorazione notturna + straordinario
                  </Text>
                </View>
                <Switch
                  value={overtimeSettings.combineMaggiorazioni}
                  onValueChange={(value) => setOvertimeSettings(prev => ({ ...prev, combineMaggiorazioni: value }))}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={overtimeSettings.combineMaggiorazioni ? '#FFFFFF' : theme.colors.textSecondary}
                />
              </View>
            </>
          )}
        </View>

        {/* Info e Reset */}
        <View style={styles.section}>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.infoText}>
              ⚙️ Queste impostazioni controllano come vengono calcolate le maggiorazioni orarie.{'\n'}
              🕐 "Priorità Fasce Orarie" rispetta gli orari effettivi di lavoro.{'\n'}
              📊 "Priorità Ore Giornaliere" usa il metodo tradizionale con soglia fissa.{'\n'}
              💡 Le modifiche si applicano ai nuovi inserimenti e ricalcoli.
            </Text>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
            <Ionicons name="refresh-outline" size={20} color={theme.colors.error} />
            <Text style={styles.resetButtonText}>Reset a Impostazioni Predefinite</Text>
          </TouchableOpacity>

          {/* Test CCNL Compliance */}
          <TouchableOpacity style={styles.testButton} onPress={testCCNLCompliance}>
            <Ionicons name="flask-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.testButtonText}>🧪 Test Conformità CCNL</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  optionContainer: {
    gap: 12,
  },
  methodOption: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer || theme.colors.surface,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  methodDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  timeSlotContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timeSlotColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timeSlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  timeSlotInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  timeInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  timeInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  rateInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  timeSlotExample: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    width: 80,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  testButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default HourlyRatesSettingsScreen;
