import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_ALLOWANCE = 15.00;

const TravelAllowanceSettings = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [enabled, setEnabled] = useState(settings.travelAllowance?.enabled || false);
  const [dailyAmount, setDailyAmount] = useState(settings.travelAllowance?.dailyAmount?.toString() || DEFAULT_ALLOWANCE.toString());
  const [autoActivate, setAutoActivate] = useState(settings.travelAllowance?.autoActivate || false);
  const [applyOnSpecialDays, setApplyOnSpecialDays] = useState(settings.travelAllowance?.applyOnSpecialDays || false);
  // Opzioni di attivazione indennità
  const options = [
    { key: 'WITH_TRAVEL', label: 'Solo se presenti ore di viaggio', group: 'base' },
    { key: 'ALWAYS', label: 'Sempre, anche senza viaggio', group: 'base' },
    { key: 'FULL_DAY_ONLY', label: 'Solo se giornata lavorativa completa', group: 'day' },
    { key: 'ALSO_ON_STANDBY', label: 'Anche nei giorni reperibili non lavorativi con intervento', group: 'extra' },
    { key: 'FULL_ALLOWANCE_HALF_DAY', label: 'Tariffa piena anche con mezza giornata', group: 'amount' },
    { key: 'HALF_ALLOWANCE_HALF_DAY', label: 'Metà indennità se mezza giornata', group: 'amount' },
    { key: 'PROPORTIONAL_CCNL', label: 'Calcolo proporzionale CCNL (ore/8 × indennità)', group: 'amount', recommended: true },
  ];

  // Permetti selezione multipla, ma solo una per gruppo base e amount
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = settings.travelAllowance?.selectedOptions || ['WITH_TRAVEL'];
    return Array.isArray(initial) ? initial : [initial];
  });

  const handleOptionToggle = (key, group) => {
    setSelectedOptions(prev => {
      let filtered = prev.filter(optKey => {
        // Solo una per gruppo base e amount
        if (group === 'base') return options.find(o => o.key === optKey)?.group !== 'base';
        if (group === 'amount') return options.find(o => o.key === optKey)?.group !== 'amount';
        return true;
      });
      if (!prev.includes(key)) filtered.push(key);
      return filtered;
    });
  };

  useEffect(() => {
    setEnabled(settings.travelAllowance?.enabled || false);
    setDailyAmount(settings.travelAllowance?.dailyAmount?.toString() || DEFAULT_ALLOWANCE.toString());
    setAutoActivate(settings.travelAllowance?.autoActivate || false);
    setApplyOnSpecialDays(settings.travelAllowance?.applyOnSpecialDays || false);
    setSelectedOptions(settings.travelAllowance?.selectedOptions || ['WITH_TRAVEL']);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updatePartialSettings({
        travelAllowance: {
          enabled,
          dailyAmount: parseFloat(dailyAmount) || 0,
          autoActivate,
          applyOnSpecialDays,
          selectedOptions
        }
      });
      Alert.alert('Successo', 'Impostazioni indennità trasferta salvate', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="business" size={28} color="#607D8B" style={{marginRight:8}} />
          <Text style={styles.headerTitle}>Indennità Trasferta</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Attiva indennità trasferta</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: theme.colors.border, true: '#007AFF' }}
              thumbColor={enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          {enabled && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Importo giornaliero</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={dailyAmount}
                    onChangeText={setDailyAmount}
                    placeholder="15.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Attivazione automatica</Text>
                <Switch
                  value={autoActivate}
                  onValueChange={setAutoActivate}
                  trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                  thumbColor={autoActivate ? '#fff' : '#f4f3f4'}
                />
                <Text style={styles.inputHelp}>
                  Se attivo, l'indennità viene applicata automaticamente nei giorni con viaggio.
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Applica nei giorni speciali (domenica e festivi)</Text>
                <Switch
                  value={applyOnSpecialDays}
                  onValueChange={setApplyOnSpecialDays}
                  trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                  thumbColor={applyOnSpecialDays ? '#fff' : '#f4f3f4'}
                />
                <Text style={styles.inputHelp}>
                  Se attivo, l'indennità viene applicata anche nelle domeniche e nei giorni festivi.
                  Normalmente secondo CCNL, nei giorni domenicali e festivi l'indennità di trasferta non viene applicata.
                  {'\n'}NOTA: Il sabato è sempre considerato un giorno lavorativo normale per l'indennità trasferta.
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Regole di attivazione</Text>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionRow, 
                      selectedOptions.includes(opt.key) && styles.selectedOption,
                      opt.recommended && styles.recommendedOption
                    ]}
                    onPress={() => handleOptionToggle(opt.key, opt.group)}
                  >
                    <Ionicons 
                      name={selectedOptions.includes(opt.key) ? 'checkbox' : 'square-outline'} 
                      size={20} 
                      color={selectedOptions.includes(opt.key) ? '#007AFF' : theme.colors.textSecondary} 
                      style={{marginRight:8}} 
                    />
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, opt.recommended && styles.recommendedLabel]}>
                        {opt.label}
                        {opt.recommended && (
                          <Text style={styles.recommendedBadge}> ✅ CCNL</Text>
                        )}
                      </Text>
                      {opt.key === 'PROPORTIONAL_CCNL' && (
                        <Text style={styles.optionDescription}>
                          Conforme al CCNL. Esempi: 6h = 75% indennità, 7h = 87.5% indennità
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#007AFF" style={{marginRight:4}} />
          <Text style={styles.infoText}>
            L'indennità trasferta è un contributo giornaliero previsto dal CCNL o da accordi aziendali. 
            {'\n\n'}✅ <Text style={{fontWeight: 'bold'}}>NOVITÀ CCNL</Text>: Il calcolo proporzionale è conforme al CCNL Metalmeccanico PMI e calcola l'indennità in base alle ore effettive lavorate: (ore_totali / 8) × indennità_giornaliera.
            {'\n\n'}Puoi scegliere quando attivarla: solo con viaggio, sempre, anche nei giorni reperibili con intervento, e come calcolare l'importo per giornate parziali.
          </Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  scrollView: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: theme.colors.card, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: theme.colors.text 
  },
  card: { 
    backgroundColor: theme.colors.card, 
    borderRadius: 14, 
    padding: 16, 
    margin: 16, 
    shadowColor: theme.colors.shadow, 
    shadowOpacity: 0.07, 
    shadowRadius: 8, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: theme.colors.border 
  },
  rowBetween: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  label: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: theme.colors.text 
  },
  inputGroup: { 
    marginBottom: 16 
  },
  inputLabel: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    marginBottom: 4 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.surface, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    paddingHorizontal: 8 
  },
  textInput: { 
    flex: 1, 
    height: 40, 
    fontSize: 16, 
    color: theme.colors.text 
  },
  inputSuffix: { 
    fontSize: 16, 
    color: theme.colors.textSecondary, 
    marginLeft: 4 
  },
  inputHelp: { 
    fontSize: 12, 
    color: theme.colors.textSecondary, 
    marginTop: 4 
  },
  optionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 6 
  },
  selectedOption: { 
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff', 
    borderRadius: 6,
    paddingHorizontal: 4
  },
  recommendedOption: { 
    borderWidth: 1, 
    borderColor: '#4CAF50', 
    borderRadius: 6, 
    paddingHorizontal: 4 
  },
  optionContent: { 
    flex: 1 
  },
  optionLabel: { 
    fontSize: 15, 
    color: theme.colors.text 
  },
  recommendedLabel: { 
    fontWeight: 'bold' 
  },
  recommendedBadge: { 
    fontSize: 12, 
    color: '#4CAF50', 
    fontWeight: 'bold' 
  },
  optionDescription: { 
    fontSize: 12, 
    color: theme.colors.textSecondary, 
    marginTop: 2, 
    fontStyle: 'italic' 
  },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: theme.colors.surface, 
    borderRadius: 8, 
    padding: 10, 
    margin: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  infoText: { 
    fontSize: 13, 
    color: theme.colors.textSecondary, 
    flex: 1 
  },
  saveButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 8, 
    padding: 14, 
    margin: 16, 
    alignItems: 'center' 
  },
  saveButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default TravelAllowanceSettings;
