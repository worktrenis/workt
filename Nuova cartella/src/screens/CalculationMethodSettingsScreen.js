import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const CalculationMethodSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [calculationMethod, setCalculationMethod] = useState('DAILY_RATE_WITH_SUPPLEMENTS'); // Default CCNL compliant
  const [enableMixedCalculation, setEnableMixedCalculation] = useState(true);
  const [loading, setLoading] = useState(true);

  const CALCULATION_METHODS = {
    DAILY_RATE_WITH_SUPPLEMENTS: {
      name: 'Tariffa Giornaliera + Maggiorazioni CCNL',
      description: 'Conforme CCNL Metalmeccanico: tariffa giornaliera base + maggiorazioni per orari specifici',
      details: [
        '• Base: €107.69/giorno (configurabile)',
        '• Straordinario diurno: +20% su tariffa oraria',
        '• Straordinario serale (20:00-22:00): +25%',
        '• Straordinario notturno (22:00-06:00): +35%',
        '• Conforme alla normativa contrattuale italiana'
      ],
      ccnlCompliant: true
    },
    PURE_HOURLY_WITH_MULTIPLIERS: {
      name: 'Tariffe Orarie Pure con Moltiplicatori',
      description: 'Sistema basato su tariffe orarie differenziate per fascia',
      details: [
        '• Tariffa oraria base: €16.15/ora',
        '• Diurno (06:00-20:00): x1.0 = €16.15/ora',
        '• Serale (20:00-22:00): x1.25 = €20.19/ora',
        '• Notturno (22:00-06:00): x1.35 = €21.80/ora',
        '• Calcolo diretto senza supplementi'
      ],
      ccnlCompliant: false
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const method = await AsyncStorage.getItem('calculation_method');
      const mixedCalc = await AsyncStorage.getItem('enable_mixed_calculation');
      
      if (method) {
        setCalculationMethod(method);
      }
      if (mixedCalc !== null) {
        setEnableMixedCalculation(JSON.parse(mixedCalc));
      }
    } catch (error) {
      console.error('Errore caricamento impostazioni metodo calcolo:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCalculationMethod = async (method) => {
    try {
      await AsyncStorage.setItem('calculation_method', method);
      setCalculationMethod(method);
      
      Alert.alert(
        'Metodo Salvato',
        `Metodo di calcolo impostato: ${CALCULATION_METHODS[method].name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Errore salvataggio metodo calcolo:', error);
      Alert.alert('Errore', 'Impossibile salvare il metodo di calcolo');
    }
  };

  const toggleMixedCalculation = async (value) => {
    try {
      await AsyncStorage.setItem('enable_mixed_calculation', JSON.stringify(value));
      setEnableMixedCalculation(value);
    } catch (error) {
      console.error('Errore salvataggio calcolo misto:', error);
    }
  };

  const showCCNLInfo = () => {
    Alert.alert(
      'Conformità CCNL Metalmeccanico',
      'Il CCNL Metalmeccanico PMI prevede:\n\n' +
      '• Retribuzione giornaliera base per il livello contrattuale\n' +
      '• Maggiorazioni percentuali per lavoro straordinario\n' +
      '• Maggiorazioni differenziate per orari diurni, serali e notturni\n' +
      '• Supplementi aggiuntivi per lavoro festivo\n\n' +
      'Il metodo "Tariffa Giornaliera + Maggiorazioni" è quello conforme alla normativa contrattuale italiana.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Caricamento impostazioni...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Metodo di Calcolo Retribuzione
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Scegli il metodo di calcolo per la retribuzione giornaliera
        </Text>

        {/* CCNL Info Button */}
        <TouchableOpacity
          style={[styles.infoButton, { backgroundColor: theme.colors.primary }]}
          onPress={showCCNLInfo}
        >
          <Text style={styles.infoButtonText}>ℹ️ Info CCNL Metalmeccanico</Text>
        </TouchableOpacity>

        {/* Calculation Methods */}
        {Object.entries(CALCULATION_METHODS).map(([key, method]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.methodCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: calculationMethod === key ? theme.colors.primary : theme.colors.border,
                borderWidth: calculationMethod === key ? 2 : 1,
              }
            ]}
            onPress={() => saveCalculationMethod(key)}
          >
            <View style={styles.methodHeader}>
              <View style={styles.methodTitleRow}>
                <Text style={[styles.methodName, { color: theme.colors.text }]}>
                  {method.name}
                </Text>
                {method.ccnlCompliant && (
                  <View style={[styles.ccnlBadge, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.ccnlBadgeText}>CCNL</Text>
                  </View>
                )}
                {calculationMethod === key && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
                {method.description}
              </Text>
            </View>

            <View style={styles.methodDetails}>
              {method.details.map((detail, index) => (
                <Text key={index} style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {detail}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Mixed Calculation Option */}
        <View style={[styles.optionCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.optionHeader}>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
              Calcolo Automatico per Giorni Misti
            </Text>
            <Switch
              value={enableMixedCalculation}
              onValueChange={toggleMixedCalculation}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
            Quando abilitato, per giornate con ore in fasce diverse, il sistema applicherà automaticamente 
            il metodo di calcolo più vantaggioso tra tariffa giornaliera e somma oraria.
          </Text>
        </View>

        {/* Current Settings Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
            Configurazione Attuale
          </Text>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
            Metodo: {CALCULATION_METHODS[calculationMethod].name}
          </Text>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
            Calcolo misto: {enableMixedCalculation ? 'Abilitato' : 'Disabilitato'}
          </Text>
          <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
            Conformità CCNL: {CALCULATION_METHODS[calculationMethod].ccnlCompliant ? '✅ Conforme' : '⚠️ Non standard'}
          </Text>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('CheckEntry25Luglio')}
        >
          <Text style={styles.testButtonText}>🧪 Test Calcolo 25 Luglio</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  infoButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  methodCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  methodHeader: {
    marginBottom: 12,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  ccnlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ccnlBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  methodDescription: {
    fontSize: 14,
  },
  methodDetails: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    marginBottom: 4,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  testButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalculationMethodSettingsScreen;
