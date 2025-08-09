// 🎉 WELCOME MODAL - Messaggio di benvenuto per nuovi utenti
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ImageBackground,
  TextInput,
  Alert,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';

const { width, height } = Dimensions.get('window');

const WelcomeModal = ({ visible, onClose, onNavigateToSettings, onNavigateToTimeEntry, onContractSettingsChanged }) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  
  // 💰 Stati per configurazione retribuzione
  const [selectedLevel, setSelectedLevel] = useState('4'); // Livello 4 Operaio specializzato come livello medio
  const [customSalary, setCustomSalary] = useState('');
  const [isCustomSalary, setIsCustomSalary] = useState(false);

  // 📋 Livelli CCNL Metalmeccanico PMI con retribuzioni (valori ufficiali)
  const ccnlLevels = {
    '1': { name: 'Livello 1 - Apprendista', salary: 1417 },
    '2': { name: 'Livello 2 - Operaio generico', salary: 1565 },
    '3': { name: 'Livello 3 - Operaio comune', salary: 1737 },
    '4': { name: 'Livello 4 - Operaio specializzato', salary: 1812 },
    '5': { name: 'Livello 5 - Operaio qualificato', salary: 1941 },
    '6': { name: 'Livello 6 - Tecnico', salary: 2081 },
    '7': { name: 'Livello 7 - Tecnico specializzato', salary: 2233 },
    '8': { name: 'Livello 8 - Quadro tecnico', salary: 2428 },
    '9': { name: 'Livello 9 - Responsabile', salary: 2700 },
    'custom': { name: 'Altro contratto (personalizzabile)', salary: 0 }
  };

  const getCurrentSalary = () => {
    if (isCustomSalary || selectedLevel === 'custom') {
      return customSalary;
    }
    return ccnlLevels[selectedLevel]?.salary?.toString() || '';
  };

  // 🔄 Inizializza il customSalary con il valore di default
  useEffect(() => {
    if (selectedLevel !== 'custom' && !isCustomSalary) {
      setCustomSalary(ccnlLevels[selectedLevel].salary.toString());
    }
  }, [selectedLevel, isCustomSalary]);

  const steps = [
    {
      subtitle: 'La tua app completa per il tracciamento delle ore di lavoro',
      description: 'WorkT ti aiuta a tenere traccia delle tue ore lavorative, calcolare automaticamente la retribuzione e gestire tutti gli aspetti del tuo lavoro secondo i contratti CCNL italiani.\n\n• Calcolo automatico retribuzioni\n• Supporto CCNL Metalmeccanico\n• Gestione straordinari e maggiorazioni\n• Backup automatico dei dati',
      color: '#4CAF50',
      showLogo: true
    },
    {
      icon: 'currency-eur',
      title: 'Configura la tua Retribuzione',
      subtitle: 'Seleziona il tuo livello CCNL e retribuzione',
      description: 'Seleziona il tuo livello contrattuale per calcoli precisi secondo i CCNL Metalmeccanico PMI ufficiali. Se il tuo contratto non è tra quelli elencati, potrai sempre personalizzarlo nelle impostazioni.',
      color: '#FF9800',
      isFormStep: true
    },
    {
      icon: 'cog',
      title: 'Personalizza l\'App',
      subtitle: 'Configura tutto secondo le tue esigenze',
      description: 'Nelle impostazioni puoi configurare:\n• Indennità di trasferta\n• Reperibilità e interventi\n• Buoni pasto e rimborsi\n• Maggiorazioni orarie\n• Tema e notifiche',
      color: '#2196F3'
    },
    {
      icon: 'clock-plus',
      title: 'Primo Inserimento',
      subtitle: 'Inizia a tracciare le tue ore di lavoro',
      description: 'Ora sei pronto! Potrai registrare orari, pause, trasferte e tutti i dettagli della tua giornata lavorativa. Clicca "Iniziamo!" per inserire subito la tua prima giornata.',
      color: '#9C27B0'
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    console.log('🎯 [WelcomeModal] handleNext chiamato - Step corrente:', currentStep);
    
    // Se siamo nel passo della retribuzione, salviamo i dati
    if (currentStep === 1) {
      console.log('🎯 [WelcomeModal] Siamo nel passo retribuzione (step 1) - salvando dati...');
      const saved = await handleSaveRetribution();
      if (!saved) {
        console.log('🎯 [WelcomeModal] Salvataggio fallito - non procedo al passo successivo');
        return; // Non procedere se il salvataggio fallisce
      }
      console.log('🎯 [WelcomeModal] ✅ Salvataggio completato - procedo al passo successivo');
    }
    
    if (currentStep < steps.length - 1) {
      console.log('🎯 [WelcomeModal] Passando al passo successivo:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      console.log('🎯 [WelcomeModal] Ultimo passo raggiunto - chiamando handleFinish');
      handleFinish();
    }
  };

  const handleSaveRetribution = async () => {
    try {
      console.log('💰 [WelcomeModal] Inizio salvataggio retribuzione...');
      console.log('💰 [WelcomeModal] Livello selezionato:', selectedLevel);
      console.log('💰 [WelcomeModal] Salary corrente:', getCurrentSalary());
      
      const salaryToSave = getCurrentSalary();
      if (!salaryToSave || parseFloat(salaryToSave) <= 0) {
        console.error('💰 [WelcomeModal] Salary non valido:', salaryToSave);
        Alert.alert('Attenzione', 'Inserisci una retribuzione valida');
        return false;
      }

      // Mappa il livello selezionato alla chiave CCNL corretta
      const levelToKeyMap = {
        '1': 'METALMECCANICO_PMI_L1',
        '2': 'METALMECCANICO_PMI_L2', 
        '3': 'METALMECCANICO_PMI_L3',
        '4': 'METALMECCANICO_PMI_L4',
        '5': 'METALMECCANICO_PMI_L5',
        '6': 'METALMECCANICO_PMI_L6',
        '7': 'METALMECCANICO_PMI_L7',
        '8': 'METALMECCANICO_PMI_L8',
        '9': 'METALMECCANICO_PMI_L9',
        'custom': 'CUSTOM_CONTRACT'
      };

      const contractKey = levelToKeyMap[selectedLevel] || 'METALMECCANICO_PMI_L5';
      const monthlySalary = parseFloat(salaryToSave);

      console.log('💰 [WelcomeModal] Contract key mappata:', contractKey);
      console.log('💰 [WelcomeModal] Monthly salary parsata:', monthlySalary);

      // Crea contratto nel formato corretto per le impostazioni
      const contractData = {
        key: contractKey,
        name: selectedLevel === 'custom' ? 'Contratto Personalizzato' : ccnlLevels[selectedLevel].name,
        code: contractKey,
        monthlySalary: monthlySalary,
        dailyRate: monthlySalary / 26,
        hourlyRate: monthlySalary / 173,
        workingDaysPerMonth: 26,
        workingHoursPerDay: 8,
        overtimeRates: {
          day: 1.2,
          nightUntil22: 1.25,
          nightAfter22: 1.35,
          saturday: 1.25,
          holiday: 1.3,
          overtimeNightUntil22: 1.45,
          overtimeNightAfter22: 1.5
        },
        nightWorkStart: 22,
        nightWorkEnd: 6,
        lastUpdated: new Date().toISOString(),
        source: selectedLevel === 'custom' ? 'Configurazione Welcome Modal' : 'CCNL Metalmeccanico PMI'
      };

      console.log('💰 [WelcomeModal] Contract data creato:', JSON.stringify(contractData, null, 2));

      // 🔥 CARICA LE IMPOSTAZIONI ATTUALI E AGGIORNA SOLO IL CONTRATTO
      console.log('💰 [WelcomeModal] Caricando impostazioni attuali dal database...');
      const currentSettings = await DatabaseService.getSetting('appSettings');
      console.log('💰 [WelcomeModal] Impostazioni attuali:', currentSettings ? 'TROVATE' : 'NON TROVATE');

      // Aggiorna solo il contratto nelle impostazioni esistenti
      const updatedSettings = {
        ...currentSettings,
        contract: contractData,
        travelCompensationRate: 1.0 // Aggiorna anche questo se necessario
      };

      console.log('💰 [WelcomeModal] Settings aggiornate da salvare:', {
        hasContract: !!updatedSettings.contract,
        contractKey: updatedSettings.contract?.key,
        hasTravelRate: !!updatedSettings.travelCompensationRate,
        hasNetCalculation: !!updatedSettings.netCalculation,
        hasStandbySettings: !!updatedSettings.standbySettings
      });

      // 🔥 SALVA NEL DATABASE SQLite (come fa useSettings)
      console.log('💰 [WelcomeModal] Salvando nel database SQLite...');
      await DatabaseService.setSetting('appSettings', updatedSettings);
      console.log('💰 [WelcomeModal] ✅ Salvato nel database SQLite');

      // Salva nelle chiavi corrette per useSettings
      console.log('💰 [WelcomeModal] Salvando in AsyncStorage...');
      await AsyncStorage.setItem('appSettings', JSON.stringify(updatedSettings));
      console.log('💰 [WelcomeModal] ✅ Salvato in AsyncStorage');
      
      // Mantieni anche il vecchio formato per compatibilità
      const legacyContractSettings = {
        level: selectedLevel,
        monthlySalary: monthlySalary,
        ccnlType: selectedLevel === 'custom' ? 'custom' : 'metalmeccanico',
        lastUpdated: new Date().toISOString()
      };

      console.log('💰 [WelcomeModal] Salvando in contract_settings...');
      await AsyncStorage.setItem('contract_settings', JSON.stringify(legacyContractSettings));
      console.log('💰 [WelcomeModal] ✅ Salvato in contract_settings');

      console.log('💰 [WelcomeModal] Contratto salvato in formato corretto:', contractData);
      console.log('💰 [WelcomeModal] Settings salvate:', updatedSettings);

      // Notifica il parent per sincronizzare subito le impostazioni
      if (typeof onContractSettingsChanged === 'function') {
        console.log('💰 [WelcomeModal] Chiamando callback onContractSettingsChanged...');
        onContractSettingsChanged(updatedSettings);
        console.log('💰 [WelcomeModal] ✅ Callback chiamato');
      } else {
        console.log('💰 [WelcomeModal] ⚠️ Callback onContractSettingsChanged non disponibile');
      }

      console.log('💰 [WelcomeModal] ✅ Salvataggio completato con successo');
      return true;
    } catch (error) {
      console.error('❌ [WelcomeModal] Errore salvataggio retribuzione:', error);
      Alert.alert('Errore', 'Impossibile salvare la retribuzione');
      return false;
    }
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    setIsCustomSalary(level === 'custom');
    if (level !== 'custom') {
      setCustomSalary(ccnlLevels[level].salary.toString());
    } else {
      setCustomSalary('');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    try {
      // Segna il tutorial come completato
      await AsyncStorage.setItem('welcome_tutorial_completed', 'true');
      onClose();
      
      // Naviga direttamente al TimeEntryForm
      if (onNavigateToTimeEntry) {
        setTimeout(() => {
          onNavigateToTimeEntry();
        }, 500); // Piccolo delay per permettere al modal di chiudersi
      }
    } catch (error) {
      console.error('Errore salvataggio tutorial:', error);
      onClose();
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('welcome_tutorial_completed', 'true');
      await AsyncStorage.setItem('welcome_tutorial_skipped', 'true');
      onClose();
    } catch (error) {
      console.error('Errore skip tutorial:', error);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          {/* Header con step indicator */}
          <View style={styles.header}>
            <View style={styles.stepIndicator}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: index <= currentStep
                        ? currentStepData?.color || '#4CAF50'
                        : 'rgba(255,255,255,0.3)'
                    }
                  ]}
                />
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Salta</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentWrapper}>
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {currentStepData && (
                <>
                  {/* Logo e icona */}
                  {currentStepData.showLogo ? (
                    <View style={styles.logoContainer}>
                      <View style={styles.logoIconContainer}>
                        <Image 
                          source={require('../../assets/icon.png')} 
                          style={styles.logoIconImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.logoText}>WorkT - Tracker Ore Lavoro</Text>
                    </View>
                  ) : (
                    /* Icon normale per altri step */
                    <View
                      style={[styles.iconContainer, { backgroundColor: currentStepData.color }]}
                    >
                      <MaterialCommunityIcons
                        name={currentStepData.icon}
                        size={64}
                        color="white"
                      />
                    </View>
                  )}

                  {/* Testi */}
                  <Text style={styles.title}>{currentStepData.title}</Text>
                  <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
                  <Text style={styles.description}>{currentStepData.description}</Text>

                  {/* Form per la retribuzione */}
                  {currentStepData.isFormStep && (
                    <View style={styles.formContainer}>
                      <Text style={styles.formLabel}>Seleziona il tuo livello CCNL:</Text>
                      
                      {/* Picker per livello contrattuale */}
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedLevel}
                          style={styles.picker}
                          onValueChange={(itemValue) => handleLevelChange(itemValue)}
                          itemStyle={styles.pickerItem}
                        >
                          {Object.entries(ccnlLevels).map(([key, level]) => (
                            <Picker.Item
                              key={key}
                              label={level.salary > 0 ? `${level.name} - €${level.salary.toLocaleString()}/mese` : level.name}
                              value={key}
                            />
                          ))}
                        </Picker>
                      </View>

                      {/* Input personalizzato per retribuzione */}
                      {(isCustomSalary || selectedLevel === 'custom') && (
                        <View style={styles.customSalaryContainer}>
                          <Text style={styles.formLabel}>Retribuzione mensile (€):</Text>
                          <TextInput
                            style={styles.salaryInput}
                            value={customSalary}
                            onChangeText={setCustomSalary}
                            placeholder="Es. 2800"
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                          />
                        </View>
                      )}

                      {/* Mostra retribuzione selezionata */}
                      {selectedLevel !== 'custom' && !isCustomSalary && (
                        <View style={styles.selectedSalaryContainer}>
                          <Text style={styles.selectedSalaryLabel}>Retribuzione selezionata:</Text>
                          <Text style={[styles.selectedSalaryValue, { color: currentStepData.color }]}>
                            €{getCurrentSalary()}/mese
                          </Text>
                          <TouchableOpacity
                            style={styles.customizeButton}
                            onPress={() => setIsCustomSalary(true)}
                          >
                            <Text style={styles.customizeButtonText}>Personalizza importo</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Action button se presente */}
                  {currentStepData.action && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: currentStepData.color }]}
                      onPress={currentStepData.action.onPress}
                    >
                      <MaterialCommunityIcons name="cog" size={20} color="white" />
                      <Text style={styles.actionButtonText}>
                        {currentStepData.action.text}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>

          {/* Footer con navigation */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { opacity: currentStep === 0 ? 0.3 : 1 }
              ]}
              onPress={handlePrevious}
              disabled={currentStep === 0}
            >
              <Ionicons name="chevron-back" size={24} color="#666" />
              <Text style={styles.navButtonText}>Indietro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: currentStepData.color }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Iniziamo!' : 'Avanti'}
              </Text>
              <Ionicons 
                name={currentStep === steps.length - 1 ? "add" : "chevron-forward"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: width * 0.95, // Aumentato da 0.9 a 0.95 (95% larghezza)
    maxHeight: height * 0.95, // Aumentato da 0.85 a 0.95 (95% altezza)
    minHeight: height * 0.85, // Aumentato da 0.7 a 0.85 (85% altezza)
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15, // Ridotto da 20 a 15
    paddingBottom: 8, // Ridotto da 10 a 8
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
    minHeight: 300,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18, // Ridotto da 20 a 18 per dare più spazio
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between', // Cambiato da 'center' a 'space-between' per distribuire meglio
    paddingVertical: 15, // Ridotto da 20 a 15 per recuperare spazio
    minHeight: '100%', // Assicura che occupi tutto lo spazio disponibile
  },
  iconContainer: {
    width: 100, // Ridotto da 120 a 100
    height: 100, // Ridotto da 120 a 100
    borderRadius: 50, // Ridotto da 60 a 50
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 18, // Ridotto da 24 a 18
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIconImage: {
    width: 140,
    height: 140,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#4a4a4a',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 4,
  },
  navButtonText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // 📋 Stili per il form della retribuzione
  formContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
  },
  customSalaryContainer: {
    marginTop: 16,
  },
  salaryInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    textAlign: 'center',
  },
  selectedSalaryContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedSalaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedSalaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customizeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  customizeButtonText: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default WelcomeModal;
