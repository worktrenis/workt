import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';

const TravelSettingsScreen = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const { theme } = useTheme();
  const [selectedOption, setSelectedOption] = useState('TRAVEL_RATE_EXCESS');
  const [multiShiftTravelAsWork, setMultiShiftTravelAsWork] = useState(false);
  
  // Impostazioni per giorni speciali
  const [specialDaySettings, setSpecialDaySettings] = useState({
    saturday: 'FIXED_RATE',
    sunday: 'FIXED_RATE', 
    holiday: 'FIXED_RATE'
  });

  const styles = createStyles(theme);

  useEffect(() => {
    if (settings.travelHoursSetting) {
      setSelectedOption(settings.travelHoursSetting);
    }
    if (settings.multiShiftTravelAsWork !== undefined) {
      setMultiShiftTravelAsWork(settings.multiShiftTravelAsWork);
    }
    // Carica impostazioni giorni speciali
    if (settings.specialDayTravelSettings) {
      setSpecialDaySettings({
        saturday: settings.specialDayTravelSettings.saturday || 'FIXED_RATE',
        sunday: settings.specialDayTravelSettings.sunday || 'FIXED_RATE',
        holiday: settings.specialDayTravelSettings.holiday || 'FIXED_RATE'
      });
    }
  }, [settings]);

  const travelOptions = [
    {
      id: 'TRAVEL_RATE_EXCESS',
      title: '🚗 Viaggio eccedente con tariffa viaggio',
      description: 'Le prime 8 ore (lavoro + viaggio) sono retribuite con tariffa giornaliera. Le ore di viaggio eccedenti le 8h totali sono pagate con tariffa viaggio.',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h retribuzione viaggio',
      isRecommended: true
    },
    {
      id: 'TRAVEL_RATE_ALL',
      title: '🛣️ Viaggio sempre con tariffa viaggio',
      description: 'Tutte le ore di viaggio sono sempre pagate con tariffa viaggio specifica, indipendentemente dalle ore totali.',
      example: 'Esempio: 2h viaggio + 6h lavoro = 6h retribuzione giornaliera + 2h retribuzione viaggio'
    },
    {
      id: 'OVERTIME_EXCESS',
      title: '⏰ Viaggio eccedente come straordinario',
      description: 'Le prime 8 ore (lavoro + viaggio) sono retribuite con tariffa giornaliera. Le ore di viaggio eccedenti le 8h totali sono pagate come straordinari.',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h straordinario (+20%)'
    }
  ];

  const specialDayOptions = [
    {
      id: 'FIXED_RATE',
      title: '💰 Tariffa fissa',
      description: 'Le ore di viaggio sono pagate con la tariffa viaggio standard (come nei giorni feriali)',
      isDefault: true
    },
    {
      id: 'WORK_RATE',
      title: '⚙️ Come ore di lavoro',
      description: 'Le ore di viaggio sono pagate come ore di lavoro con le maggiorazioni del giorno speciale'
    },
    {
      id: 'PERCENTAGE_BONUS',
      title: '📈 Percentuale maggiorata',
      description: 'Le ore di viaggio mantengono la tariffa viaggio ma con la maggiorazione del giorno speciale'
    }
  ];

  const handleSave = async () => {
    try {
      console.log('🚀 TravelSettingsScreen - Salvando nuove impostazioni viaggio:', {
        travelHoursSetting: selectedOption,
        multiShiftTravelAsWork: multiShiftTravelAsWork,
        specialDayTravelSettings: specialDaySettings,
        settingsCorrente: settings.travelHoursSetting
      });
      
      await updatePartialSettings({
        travelHoursSetting: selectedOption,
        multiShiftTravelAsWork: multiShiftTravelAsWork,
        specialDayTravelSettings: specialDaySettings
      });

      console.log('✅ TravelSettingsScreen - Nuove impostazioni salvate con successo');

      Alert.alert('Successo', 'Impostazioni ore di viaggio aggiornate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving travel settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  const handleSpecialDayChange = (dayType, value) => {
    setSpecialDaySettings(prev => ({
      ...prev,
      [dayType]: value
    }));
  };

  const renderSpecialDayOption = (dayType, dayLabel, emoji) => (
    <View key={dayType} style={styles.specialDayContainer}>
      <Text style={styles.specialDayTitle}>{emoji} {dayLabel}</Text>
      {specialDayOptions.map(option => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.specialDayOption,
            specialDaySettings[dayType] === option.id && styles.selectedSpecialDayOption
          ]}
          onPress={() => handleSpecialDayChange(dayType, option.id)}
        >
          <View style={styles.specialDayOptionHeader}>
            <View style={[
              styles.radioButton,
              specialDaySettings[dayType] === option.id && styles.radioButtonSelected
            ]}>
              {specialDaySettings[dayType] === option.id && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <Text style={[
              styles.specialDayOptionTitle,
              specialDaySettings[dayType] === option.id && styles.selectedSpecialDayText
            ]}>
              {option.title}
            </Text>
            {option.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>DEFAULT</Text>
              </View>
            )}
          </View>
          <Text style={styles.specialDayOptionDescription}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOption = (option) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.optionCard,
        selectedOption === option.id && styles.selectedOption,
        option.isRecommended && styles.recommendedOption
      ]}
      onPress={() => setSelectedOption(option.id)}
    >
      <View style={styles.optionHeader}>
        <View style={[
          styles.optionRadio,
          selectedOption === option.id && styles.optionRadioSelected
        ]}>
          {selectedOption === option.id && (
            <View style={styles.optionRadioInner} />
          )}
        </View>
        <Text style={[
          styles.optionTitle,
          selectedOption === option.id && styles.selectedText
        ]}>{option.title}</Text>
        {option.isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>CONSIGLIATA</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.optionDescription}>{option.description}</Text>
      
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleLabel}>Esempio:</Text>
        <Text style={styles.exampleText}>{option.example}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ore di Viaggio</Text>
          <Text style={styles.headerSubtitle}>
            Scegli come vengono calcolate e retribuite le ore di viaggio
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Come funziona</Text>
          </View>
          <Text style={styles.infoText}>
            Le ore di viaggio includono gli spostamenti per raggiungere i cantieri. 
            Seleziona la logica di calcolo più adatta al tuo contratto e tipo di lavoro.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Logica di Calcolo</Text>
          {travelOptions.map(renderOption)}
        </View>

        {/* Sezione Opzioni Multi-cantiere */}
        <View style={styles.multiShiftContainer}>
          <Text style={styles.sectionTitle}>Opzioni Multi-cantiere</Text>
          <TouchableOpacity
            style={[
              styles.multiShiftCard,
              multiShiftTravelAsWork && styles.selectedMultiShift
            ]}
            onPress={() => setMultiShiftTravelAsWork(!multiShiftTravelAsWork)}
          >
            <View style={styles.multiShiftHeader}>
              <View style={[
                styles.multiShiftCheckbox,
                multiShiftTravelAsWork && styles.multiShiftCheckboxSelected
              ]}>
                {multiShiftTravelAsWork && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.multiShiftTitle}>
                🔄 Viaggi multi-cantiere come ore lavoro
              </Text>
            </View>
            <Text style={styles.multiShiftDescription}>
              Gli spostamenti tra cantieri durante la stessa giornata lavorativa 
              sono considerati ore di lavoro invece che viaggi. Solo andata/ritorno 
              dall'azienda vengono calcolati come viaggi.
            </Text>
            <View style={styles.exampleContainer}>
              <Text style={styles.exampleLabel}>Esempio:</Text>
              <Text style={styles.exampleText}>
                Azienda → Cantiere A (viaggio) → Cantiere B (lavoro) → Cantiere C (lavoro) → Azienda (viaggio)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sezione Giorni Speciali */}
        <View style={styles.specialDaysContainer}>
          <Text style={styles.sectionTitle}>Pagamento Viaggi - Giorni Speciali</Text>
          <View style={styles.specialDaysInfo}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.specialDaysInfoText}>
              Configura come vengono pagate le ore di viaggio nei giorni speciali
            </Text>
          </View>
          
          {renderSpecialDayOption('saturday', 'Sabato', '📅')}
          {renderSpecialDayOption('sunday', 'Domenica', '🙏')}
          {renderSpecialDayOption('holiday', 'Festivi', '🎉')}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Dettagli Calcolo</Text>
          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                Giornata lavorativa standard: 8 ore
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calculator" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                Retribuzione viaggio: {Math.round((settings.travelCompensationRate || 1) * 100)}% della retribuzione oraria
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="trending-up" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                Straordinari: +20% retribuzione oraria (giorno), +25% (sera), +35% (notte)
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="card" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                Retribuzione giornaliera: €{(settings.contract?.dailyRate || 107.69).toFixed(2)}
              </Text>
            </View>
          </View>
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
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: theme.colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 10,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  optionsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 15,
    marginTop: 5,
  },
  optionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff',
  },
  recommendedOption: {
    borderColor: '#4CAF50',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#007AFF',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  selectedText: {
    color: '#007AFF',
  },
  recommendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Stili Multi-turno
  multiShiftContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  multiShiftCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  selectedMultiShift: {
    borderColor: '#FF9800',
    backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.15)' : '#fff8f0',
  },
  multiShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  multiShiftCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: 'transparent',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiShiftCheckboxSelected: {
    backgroundColor: '#FF9800',
  },
  multiShiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  multiShiftDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  exampleContainer: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  exampleText: {
    fontSize: 13,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  detailsContainer: {
    backgroundColor: theme.colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  detailsContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // Stili per giorni speciali
  specialDaysContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  specialDaysInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  specialDaysInfoText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  specialDayContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialDayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 10,
  },
  specialDayOption: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedSpecialDayOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  specialDayOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  specialDayOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  selectedSpecialDayText: {
    color: theme.colors.primary,
  },
  specialDayOptionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  defaultBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default TravelSettingsScreen;
