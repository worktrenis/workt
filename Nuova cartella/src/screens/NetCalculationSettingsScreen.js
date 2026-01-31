import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';
import RealPayslipCalculator from '../services/RealPayslipCalculator';

const NetCalculationSettingsScreen = ({ navigation }) => {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { theme } = useTheme();
  const [method, setMethod] = useState(settings?.netCalculation?.method || 'irpef');
  const [customPercentage, setCustomPercentage] = useState(
    String(settings?.netCalculation?.customDeductionRate || 32)
  );
  const [useActualAmount, setUseActualAmount] = useState(
    settings?.netCalculation?.useActualAmount ?? false
  );
  // Usa la retribuzione mensile dalle impostazioni contratto
  const previewAmount = useMemo(() => {
    return settings?.contract?.monthlySalary ? Number(settings.contract.monthlySalary) : 2800.00;
  }, [settings?.contract?.monthlySalary]);

  // Debug caricamento impostazioni
  React.useEffect(() => {
    console.log('🔍 CARICAMENTO IMPOSTAZIONI NETTO:');
    console.log('- Settings ricevuti:', !!settings);
    if (settings?.netCalculation) {
      console.log('- Metodo dal DB:', settings.netCalculation.method);
      console.log('- Percentuale dal DB:', settings.netCalculation.customDeductionRate);
      console.log('- Usa cifra presente dal DB:', settings.netCalculation.useActualAmount);
      
      // Aggiorna stati se diversi
      if (settings.netCalculation.method !== method) {
        setMethod(settings.netCalculation.method);
        console.log('🔄 Aggiornato metodo:', settings.netCalculation.method);
      }
      if (String(settings.netCalculation.customDeductionRate) !== customPercentage) {
        setCustomPercentage(String(settings.netCalculation.customDeductionRate));
        console.log('🔄 Aggiornata percentuale:', settings.netCalculation.customDeductionRate);
      }
      if (settings.netCalculation.useActualAmount !== useActualAmount) {
        setUseActualAmount(settings.netCalculation.useActualAmount);
        console.log('🔄 Aggiornata modalità:', settings.netCalculation.useActualAmount);
      }
    } else {
      console.log('❌ Nessuna impostazione netCalculation trovata');
    }
  }, [settings]);

  // Calcola preview in tempo reale
  const getPreviewCalculation = () => {
    const tempSettings = {
      method: method,
      customDeductionRate: parseFloat(customPercentage) || 25
    };
    
    return RealPayslipCalculator.calculateNetFromGross(previewAmount, tempSettings);
  };

  const handleSave = async () => {
    try {
      const customPerc = parseFloat(customPercentage);
      
      if (method === 'custom' && (isNaN(customPerc) || customPerc < 0 || customPerc > 100)) {
        Alert.alert('Errore', 'Inserisci una percentuale valida tra 0 e 100');
        return;
      }

      const newSettings = {
        ...settings,
        netCalculation: {
          method: method,
          customDeductionRate: customPerc || 32,
          useActualAmount: useActualAmount
        }
      };

      console.log('🔧 SALVATAGGIO IMPOSTAZIONI NETTO:');
      console.log('- Metodo:', method);
      console.log('- Percentuale:', customPerc);
      console.log('- Usa cifra presente:', useActualAmount);
      console.log('- Settings completi:', JSON.stringify(newSettings.netCalculation, null, 2));

      await updateSettings(newSettings);
      
      console.log('✅ Salvataggio completato, ricarico impostazioni...');
      
      // 🔄 Forza il ricaricamento delle impostazioni dal database
      await refreshSettings();
      
      console.log('✅ Impostazioni ricaricate, tutto completato');

      Alert.alert('Successo', 'Impostazioni salvate correttamente', [
        { 
          text: 'OK', 
          onPress: () => {
            // Naviga indietro e forza refresh della dashboard
            navigation.goBack();
            // Se veniamo dalla dashboard, forza il refresh
            if (navigation.getState()?.routes?.some(route => route.name === 'Dashboard')) {
              // Usa navigation params per segnalare che serve refresh
              navigation.navigate('Dashboard', { 
                refreshCalculations: true,
                timestamp: Date.now() // Per forzare re-render
              });
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
      console.error('Error saving net calculation settings:', error);
    }
  };

  const preview = getPreviewCalculation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={[styles.scrollContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Calcolo Netto</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Descrizione */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Scegli come calcolare il netto dello stipendio nella dashboard
        </Text>
      </View>

      {/* Metodi di calcolo */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Metodo di Calcolo</Text>
        
        {/* Opzione IRPEF */}
        <TouchableOpacity
          style={[
            styles.option, 
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            method === 'irpef' && { 
              borderColor: '#007AFF', 
              backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff'
            }
          ]}
          onPress={() => setMethod('irpef')}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="calculator" 
                size={24} 
                color={method === 'irpef' ? '#007AFF' : (theme.name === 'dark' ? '#888' : '#666')} 
              />
              <Text style={[
                styles.optionTitle, 
                { color: theme.colors.text },
                method === 'irpef' && { color: '#007AFF', fontWeight: '600' }
              ]}>
                Aliquote IRPEF Reali
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Calcolo basato su aliquote IRPEF 2025, contributi INPS e addizionali regionali/comunali
            </Text>
            <View style={styles.features}>
              <Text style={[styles.feature, { color: theme.colors.textSecondary }]}>• Aliquote IRPEF a scaglioni (23%, 35%, 43%)</Text>
              <Text style={[styles.feature, { color: theme.colors.textSecondary }]}>• Contributi INPS 9.87%</Text>
              <Text style={[styles.feature, { color: theme.colors.textSecondary }]}>• Addizionali regionali/comunali ~2.5%</Text>
              <Text style={[styles.feature, { color: theme.colors.textSecondary }]}>• Detrazioni standard automatiche</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Opzione Personalizzata */}
        <TouchableOpacity
          style={[
            styles.option, 
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            method === 'custom' && { 
              borderColor: '#007AFF', 
              backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff'
            }
          ]}
          onPress={() => setMethod('custom')}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="settings" 
                size={24} 
                color={method === 'custom' ? '#007AFF' : (theme.name === 'dark' ? '#888' : '#666')} 
              />
              <Text style={[
                styles.optionTitle, 
                { color: theme.colors.text },
                method === 'custom' && { color: '#007AFF', fontWeight: '600' }
              ]}>
                Percentuale Personalizzata
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Usa una percentuale fissa di trattenute basata sui tuoi dati reali
            </Text>
          </View>
        </TouchableOpacity>

        {/* Input percentuale personalizzata */}
        {method === 'custom' && (
          <View style={[styles.customInput, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Percentuale Trattenute (%)</Text>
            <TextInput
              style={[styles.textInput, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              value={customPercentage}
              onChangeText={setCustomPercentage}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={5}
            />
            <Text style={[styles.inputHelp, { color: theme.colors.textSecondary }]}>
              Esempio: se dal lordo €2,839 ricevi netto €2,122, la percentuale è circa 25%
            </Text>
          </View>
        )}
      </View>

      {/* Modalità di calcolo */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Base di Calcolo</Text>
        
        <TouchableOpacity
          style={[
            styles.option, 
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            !useActualAmount && { 
              borderColor: '#007AFF', 
              backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff'
            }
          ]}
          onPress={() => setUseActualAmount(false)}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="trending-up" 
                size={24} 
                color={!useActualAmount ? '#007AFF' : (theme.name === 'dark' ? '#888' : '#666')} 
              />
              <Text style={[
                styles.optionTitle, 
                { color: theme.colors.text },
                !useActualAmount && { color: '#007AFF', fontWeight: '600' }
              ]}>
                Stima Annuale (Consigliato)
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Per guadagni bassi, calcola basandosi sullo stipendio base annuale per maggiore accuratezza
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option, 
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            useActualAmount && { 
              borderColor: '#007AFF', 
              backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff'
            }
          ]}
          onPress={() => setUseActualAmount(true)}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="calculator" 
                size={24} 
                color={useActualAmount ? '#007AFF' : (theme.name === 'dark' ? '#888' : '#666')} 
              />
              <Text style={[
                styles.optionTitle, 
                { color: theme.colors.text },
                useActualAmount && { color: '#007AFF', fontWeight: '600' }
              ]}>
                Cifra Presente
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
              Calcola sempre sulla cifra mensile effettiva, anche se molto bassa
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Anteprima</Text>
        <View style={[styles.preview, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>Stipendio Lordo:</Text>
            <Text style={[styles.previewValue, { color: theme.colors.text }]}>€{previewAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>Trattenute:</Text>
            <Text style={[styles.previewValue, { color: theme.colors.text }]}>
              €{preview.totalDeductions.toFixed(2)} ({(preview.deductionRate * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={[styles.previewRow, styles.netRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.netLabel, { color: theme.colors.text }]}>Stipendio Netto:</Text>
            <Text style={[styles.netValue, { color: theme.colors.income }]}>€{preview.net.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Info IRPEF */}
      {method === 'irpef' && (
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Dettagli Calcolo IRPEF</Text>
          <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Il calcolo utilizza le aliquote IRPEF ufficiali 2025:
            </Text>
            <Text style={[styles.bracket, { color: theme.colors.primary }]}>• 0-28.000€: 23%</Text>
            <Text style={[styles.bracket, { color: theme.colors.primary }]}>• 28.000-50.000€: 35%</Text>
            <Text style={[styles.bracket, { color: theme.colors.primary }]}>• Oltre 50.000€: 43%</Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              + Contributi INPS dipendente (9.87%)
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              + Addizionali regionali/comunali (~2.5%)
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              - Detrazioni lavoro dipendente
            </Text>
          </View>
        </View>
      )}
      </ScrollView>
      
      {/* Pulsante Salva in basso */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  option: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionContent: {
    
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  selectedText: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
    paddingLeft: 8,
  },
  feature: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  customInput: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  preview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  netValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bracket: {
    fontSize: 13,
    color: '#007AFF',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
});

export default NetCalculationSettingsScreen;
