import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';
import { CCNL_CONTRACTS } from '../constants';
import { formatCurrency } from '../utils';
import { FIXED_HOLIDAYS, getEasterHolidays, isItalianHoliday } from '../constants/holidays';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Picker } from '@react-native-picker/picker';

const CONTRACT_OPTIONS = [
  { key: 'METALMECCANICO_PMI_L1', label: 'Metalmeccanico PMI Livello 1', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L1 },
  { key: 'METALMECCANICO_PMI_L2', label: 'Metalmeccanico PMI Livello 2', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L2 },
  { key: 'METALMECCANICO_PMI_L3', label: 'Metalmeccanico PMI Livello 3 (Operaio Comune)', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L3 },
  { key: 'METALMECCANICO_PMI_L4', label: 'Metalmeccanico PMI Livello 4 (Operaio Specializzato)', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L4 },
  { key: 'METALMECCANICO_PMI_L5', label: 'Metalmeccanico PMI Livello 5 (Operaio Qualificato)', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L5 },
  { key: 'METALMECCANICO_PMI_L6', label: 'Metalmeccanico PMI Livello 6 (Tecnico)', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L6 },
  { key: 'METALMECCANICO_PMI_L7', label: 'Metalmeccanico PMI Livello 7', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L7 },
  { key: 'METALMECCANICO_PMI_L8', label: 'Metalmeccanico PMI Livello 8', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L8 },
  { key: 'METALMECCANICO_PMI_L9', label: 'Metalmeccanico PMI Livello 9', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L9 },
];

// URL di esempio per download contratti CCNL
const DEFAULT_CONTRACT_URLS = [
  // Vuoto: nessun URL fasullo, l'utente può aggiungere i propri
];

const ContractSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const styles = createStyles(theme);
  
  const [formData, setFormData] = useState({
    monthlySalary: '',
    travelCompensationRate: '',
    customRatesEnabled: false, // Nuova opzione per tariffe personalizzate
    customDailyRate: '',
    customHourlyRate: '',
  });
  const [calculatedRates, setCalculatedRates] = useState(null);

  // Mostra elenco festivi nazionali
  const [holidays, setHolidays] = useState([]);
  useEffect(() => {
    const year = new Date().getFullYear();
    const easter = getEasterHolidays(year);
    setHolidays([
      ...FIXED_HOLIDAYS.map(d => `${year}-${d}`),
      ...easter
    ]);
  }, []);

  const [selectedContractKey, setSelectedContractKey] = useState(settings.contract?.key || 'METALMECCANICO_PMI_L5');
  const [contractError, setContractError] = useState(null);
  const [showHolidays, setShowHolidays] = useState(false);

  // Funzione di normalizzazione salary
  const getSafeSalary = (salary) => {
    const parsed = typeof salary === 'string' ? parseFloat(salary) : salary;
    return (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0)
      ? parsed
      : CCNL_CONTRACTS.METALMECCANICO_PMI_L5.monthlySalary;
  };

  // Sincronizza selectedContractKey con le impostazioni del contratto SOLO quando cambiano le impostazioni
  // Evita di sovrascrivere la selezione locale dell'utente prima del salvataggio
  useEffect(() => {
    if (settings.contract?.key) {
      setSelectedContractKey(settings.contract.key);
    }
  }, [settings.contract?.key]);

  // In fase di inizializzazione, normalizza sempre e fallback sicuro
  useEffect(() => {
    let contract = settings.contract;
    if (!validateContract(contract)) {
      setContractError('Contratto CCNL non valido o corrotto. Verrà usato il contratto di default.');
      contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    } else {
      setContractError(null);
    }
    const salary = getSafeSalary(contract.monthlySalary);
    
    // Controllo se l'utente ha tariffe personalizzate
    const hasCustomRates = contract.customRatesEnabled === true;
    
    setFormData({
      monthlySalary: salary.toString(),
      travelCompensationRate: (settings.travelCompensationRate * 100).toString(),
      saturdayBonus: contract.overtimeRates?.saturday ? ((contract.overtimeRates.saturday * 100 - 100).toString()) : '25',
      customRatesEnabled: hasCustomRates,
      customDailyRate: hasCustomRates && contract.customDailyRate ? contract.customDailyRate.toString() : '',
      customHourlyRate: hasCustomRates && contract.customHourlyRate ? contract.customHourlyRate.toString() : '',
    });
    calculateRates(salary);
  }, [settings]);
  const calculateRates = (monthlySalary, useCustomRates = formData.customRatesEnabled, customDaily = formData.customDailyRate, customHourly = formData.customHourlyRate) => {
    const monthly = parseFloat(monthlySalary);
    if (isNaN(monthly) || monthly <= 0) {
      setCalculatedRates(null);
      return;
    }

    // Usa tariffe personalizzate se abilitato, altrimenti calcola da CCNL
    let dailyRate, hourlyRate;
    
    if (useCustomRates) {
      const customDailyParsed = parseFloat(customDaily);
      const customHourlyParsed = parseFloat(customHourly);
      
      dailyRate = !isNaN(customDailyParsed) && customDailyParsed > 0 ? customDailyParsed : monthly / 26;
      hourlyRate = !isNaN(customHourlyParsed) && customHourlyParsed > 0 ? customHourlyParsed : monthly / 173;
    } else {
      // Calcoli CCNL ufficiali
      dailyRate = monthly / 26; // 26 giorni lavorativi standard
      hourlyRate = monthly / 173; // 173 ore mensili CCNL Metalmeccanico
    }

    // Assicurati di avere bonusRates validi con migrazione
    let safeBonusRates = { ...bonusRates };
    
    // Migrazione straordinario notturno
    if (safeBonusRates.overtimeNight !== undefined && 
        (safeBonusRates.overtimeNightUntil22 === undefined || safeBonusRates.overtimeNightAfter22 === undefined)) {
      safeBonusRates.overtimeNightUntil22 = 25; // CCNL corretto: +25%
      safeBonusRates.overtimeNightAfter22 = 35;  // CCNL corretto: +35%
      delete safeBonusRates.overtimeNight;
    }
    
    // Migrazione ordinario notturno
    if (safeBonusRates.ordinaryNight !== undefined && 
        (safeBonusRates.ordinaryNightUntil22 === undefined || safeBonusRates.ordinaryNightAfter22 === undefined)) {
      safeBonusRates.ordinaryNightUntil22 = 15; // CCNL corretto: +15%
      safeBonusRates.ordinaryNightAfter22 = 25;  // CCNL corretto: +25%
      delete safeBonusRates.ordinaryNight;
    }

    // Calcola le maggiorazioni basate sulla tariffa oraria (personalizzata o CCNL)
    const overtimeDay = hourlyRate * (1 + safeBonusRates.overtimeDay / 100); // Straordinario diurno
    const overtimeNightUntil22 = hourlyRate * (1 + safeBonusRates.overtimeNightUntil22 / 100); // Straordinario serale (20:00-22:00)
    const overtimeNightAfter22 = hourlyRate * (1 + safeBonusRates.overtimeNightAfter22 / 100); // Straordinario notturno (dopo le 22:00)
    const overtimeHoliday = hourlyRate * (1 + safeBonusRates.overtimeHoliday / 100); // Straordinario festivo
    const overtimeSunday = hourlyRate * (1 + safeBonusRates.overtimeSunday / 100); // Straordinario domenicale
    const ordinaryNightUntil22 = hourlyRate * (1 + safeBonusRates.ordinaryNightUntil22 / 100); // Lavoro ordinario serale (20:00-22:00)
    const ordinaryNightAfter22 = hourlyRate * (1 + safeBonusRates.ordinaryNightAfter22 / 100); // Lavoro ordinario notturno (dopo le 22:00)
    const ordinaryHoliday = hourlyRate * (1 + safeBonusRates.ordinaryHoliday / 100); // Lavoro ordinario festivo
    const ordinarySunday = hourlyRate * (1 + safeBonusRates.ordinarySunday / 100); // Lavoro ordinario domenicale
    const ordinaryNightHoliday = hourlyRate * (1 + safeBonusRates.ordinaryNightHoliday / 100); // Lavoro ordinario notturno festivo
    
    // Calcoli per maggiorazioni composte reperibilità - CORRETTI SECONDO CCNL
    // Le maggiorazioni CCNL si SOMMANO, non si moltiplicano
    const standbyOrdinarySaturdayNight = hourlyRate * (1 + 25/100 + safeBonusRates.ordinaryNightAfter22 / 100); // Sabato (25%) + notturno
    const standbyOvertimeSaturdayNight = hourlyRate * (1 + 25/100 + safeBonusRates.overtimeNightAfter22 / 100); // Sabato (25%) + notturno straord
    const standbyOrdinaryHolidayNight = hourlyRate * (1 + safeBonusRates.ordinaryNightAfter22 / 100 + safeBonusRates.ordinaryHoliday / 100); // Notturno + festivo (SOMMA)
    const standbyOvertimeHolidayNight = hourlyRate * (1 + safeBonusRates.overtimeNightAfter22 / 100 + safeBonusRates.overtimeHoliday / 100); // Notturno straord + festivo (SOMMA)

    setCalculatedRates({
      monthlySalary: monthly,
      dailyRate,
      officialHourlyRate: hourlyRate, // Rinominato per chiarezza
      isCustomRates: useCustomRates,
      overtimeDay,
      overtimeNightUntil22,
      overtimeNightAfter22,
      overtimeHoliday,
      overtimeSunday,
      ordinaryNightUntil22,
      ordinaryNightAfter22,
      ordinaryHoliday,
      ordinarySunday,
      ordinaryNightHoliday,
      standbyOrdinarySaturdayNight,
      standbyOvertimeSaturdayNight,
      standbyOrdinaryHolidayNight,
      standbyOvertimeHolidayNight,
    });
  };

  const handleMonthlySalaryChange = (value) => {
    const salary = getSafeSalary(value);
    setFormData(prev => ({ ...prev, monthlySalary: value }));
    calculateRates(salary, formData.customRatesEnabled, formData.customDailyRate, formData.customHourlyRate);
  };

  const handleSave = async () => {
    try {
      const monthlySalary = getSafeSalary(formData.monthlySalary);
      const travelRate = parseFloat(formData.travelCompensationRate) / 100;
      const saturdayBonus = typeof formData.saturdayBonus === 'string' ? parseFloat(formData.saturdayBonus.replace(',', '.')) : 25;

      if (isNaN(monthlySalary) || monthlySalary <= 0) {
        Alert.alert('Errore', 'Inserisci una retribuzione mensile valida');
        return;
      }
      if (isNaN(travelRate) || travelRate < 0 || travelRate > 2) {
        Alert.alert('Errore', 'Inserisci una percentuale di retribuzione viaggio valida (0-200)');
        return;
      }
      if (isNaN(saturdayBonus) || saturdayBonus < 0 || saturdayBonus > 100) {
        Alert.alert('Errore', 'Inserisci una maggiorazione sabato valida (0-100%)');
        return;
      }

      // Validazione tariffe personalizzate
      if (formData.customRatesEnabled) {
        const customDaily = parseFloat(formData.customDailyRate);
        const customHourly = parseFloat(formData.customHourlyRate);
        
        if (isNaN(customDaily) || customDaily <= 0) {
          Alert.alert('Errore', 'Inserisci una tariffa giornaliera personalizzata valida');
          return;
        }
        if (isNaN(customHourly) || customHourly <= 0) {
          Alert.alert('Errore', 'Inserisci una tariffa oraria personalizzata valida');
          return;
        }
      }

      // Prendi il template del contratto base
      const selectedContractTemplate = CONTRACT_OPTIONS.find(opt => opt.key === selectedContractKey)?.contract || CCNL_CONTRACTS.METALMECCANICO_PMI_L5;

      // Crea l'oggetto contratto aggiornato con i dati del form e i tassi calcolati
      const updatedContract = {
        ...selectedContractTemplate,
        key: selectedContractKey,
        monthlySalary: monthlySalary,
        dailyRate: calculatedRates?.dailyRate || (monthlySalary / 26),
        hourlyRate: calculatedRates?.officialHourlyRate || (monthlySalary / 173),
        // Aggiungi supporto per tariffe personalizzate
        customRatesEnabled: formData.customRatesEnabled,
        customDailyRate: formData.customRatesEnabled ? parseFloat(formData.customDailyRate) : undefined,
        customHourlyRate: formData.customRatesEnabled ? parseFloat(formData.customHourlyRate) : undefined,
        overtimeRates: {
          ...selectedContractTemplate.overtimeRates,
          saturday: 1 + (isNaN(saturdayBonus) ? 0.25 : saturdayBonus / 100),
          // Aggiungi le percentuali personalizzate di straordinario e ordinario notturno
          overtimeNightUntil22: 1 + (bonusRates.overtimeNightUntil22 / 100),
          overtimeNightAfter22: 1 + (bonusRates.overtimeNightAfter22 / 100),
          ordinaryNightUntil22: 1 + (bonusRates.ordinaryNightUntil22 / 100),
          ordinaryNightAfter22: 1 + (bonusRates.ordinaryNightAfter22 / 100),
        },
        bonusRates: bonusRates,
      };

      await updatePartialSettings({
        contract: updatedContract,
        travelCompensationRate: travelRate,
      });

      Alert.alert('Successo', 'Impostazioni contratto salvate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving contract settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  // Personalizzazione maggiorazioni CCNL
  const [showBonusSettings, setShowBonusSettings] = useState(false);
  
  // Valori default CCNL per confronto
  const defaultBonusRates = {
    overtimeDay: 20,
    overtimeNightUntil22: 45, // Straordinario serale (20:00-22:00) +45%
    overtimeNightAfter22: 50,  // Straordinario notturno (dopo le 22:00) +50%
    overtimeHoliday: 50,
    overtimeSunday: 50,
    ordinaryNightUntil22: 25,  // Ordinario serale (20:00-22:00) +25%
    ordinaryNightAfter22: 35,  // Ordinario notturno (dopo le 22:00) +35%
    ordinaryHoliday: 30,
    ordinarySunday: 30,
    ordinaryNightHoliday: 55, // Corretto: notturno (35%) + festivo (30%) = +65% ma massimo +55%
    saturdayBonus: 25
  };
  
  const [bonusRates, setBonusRates] = useState(defaultBonusRates);
  useEffect(() => {
    if (settings.contract?.bonusRates) {
      // MIGRAZIONE: Se esistono i vecchi campi, trasformali nei nuovi
      let migratedBonusRates = { ...settings.contract.bonusRates };
      
      // Migrazione straordinario notturno
      if (migratedBonusRates.overtimeNight !== undefined && 
          (migratedBonusRates.overtimeNightUntil22 === undefined || 
           migratedBonusRates.overtimeNightAfter22 === undefined)) {
        // Migra il vecchio valore ai due nuovi campi
        migratedBonusRates.overtimeNightUntil22 = 45; // CCNL corretto: +45%
        migratedBonusRates.overtimeNightAfter22 = 50;  // CCNL corretto: +50%
        // Rimuovi il vecchio campo
        delete migratedBonusRates.overtimeNight;
        
        console.log('🔄 MIGRAZIONE: Convertito overtimeNight ai nuovi campi');
      }
      
      // Migrazione ordinario notturno
      if (migratedBonusRates.ordinaryNight !== undefined && 
          (migratedBonusRates.ordinaryNightUntil22 === undefined || 
           migratedBonusRates.ordinaryNightAfter22 === undefined)) {
        // Migra il vecchio valore ai due nuovi campi
        migratedBonusRates.ordinaryNightUntil22 = 25; // CCNL corretto: +25%
        migratedBonusRates.ordinaryNightAfter22 = 35;  // CCNL corretto: +35%
        // Rimuovi il vecchio campo
        delete migratedBonusRates.ordinaryNight;
        
        console.log('🔄 MIGRAZIONE: Convertito ordinaryNight ai nuovi campi');
      }
      
      console.log('🔄 MIGRAZIONE: bonusRates finali:', migratedBonusRates);
      setBonusRates(migratedBonusRates);
    }
  }, [settings]);

  const [customContracts, setCustomContracts] = useState([]);
  const [urlInput, setUrlInput] = useState('');

  // Funzione di validazione contratto aggiornata e più difensiva
  const validateContract = (contract) => {
    if (!contract || typeof contract !== 'object') return false;
    // Accetta sia number che stringa numerica
    const salary = contract.hasOwnProperty('monthlySalary') ? (typeof contract.monthlySalary === 'string' ? parseFloat(contract.monthlySalary) : contract.monthlySalary) : undefined;
    if (typeof salary !== 'number' || isNaN(salary) || salary <= 0) return false;
    if (!contract.overtimeRates || typeof contract.overtimeRates !== 'object') return false;
    return true;
  };

  // Funzione per importare contratto da file locale
  const handleImportContractFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.type === 'success') {
        const content = await FileSystem.readAsStringAsync(result.uri);
        const contract = JSON.parse(content);
        if (!validateContract(contract)) {
          Alert.alert('Errore', 'Il contratto importato non è valido. Verifica che tutti i campi obbligatori siano presenti (es. retribuzione mensile, maggiorazioni, ecc.).');
          return;
        }
        setCustomContracts(prev => [...prev, contract]);
        Alert.alert('Contratto importato', 'Il nuovo contratto è stato aggiunto!');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile importare il contratto.');
    }
  };
  // Funzione per importare contratto da URL
  const handleImportContractFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download fallito');
      const contract = await response.json();
      if (!validateContract(contract)) {
        Alert.alert('Errore', 'Il contratto scaricato non è valido. Verifica che tutti i campi obbligatori siano presenti (es. retribuzione mensile, maggiorazioni, ecc.).');
        return;
      }
      setCustomContracts(prev => [...prev, contract]);
      Alert.alert('Contratto importato', 'Il nuovo contratto è stato aggiunto!');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile scaricare il contratto da URL.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (contractError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:32}}>
          <Text style={{color: theme.colors.error, fontWeight:'bold',fontSize:18,marginBottom:12}}>ERRORE CONTRATTO</Text>
          <Text style={{color: theme.colors.text, fontSize:16,textAlign:'center'}}>{contractError}</Text>
          <Text style={{color: theme.colors.textSecondary, fontSize:14,marginTop:16}}>Prova a reimpostare le impostazioni o a importare un contratto valido.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contratto CCNL</Text>
          <Text style={styles.headerSubtitle}>
            Configura la retribuzione e le tariffe automatiche
          </Text>
        </View>

        {/* Miglioro la visuale della selezione contratto */}
        <View style={{backgroundColor: theme.colors.card, borderRadius:12,padding:18,margin:15,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:4,elevation:2}}>
          <Text style={{fontWeight:'bold',fontSize:17,marginBottom:8,color: theme.colors.text, paddingLeft:2}}>Tipo di contratto</Text>
          <View style={{borderWidth:1,borderColor: theme.colors.border, borderRadius:8,backgroundColor: theme.colors.background, marginBottom:16,overflow:'hidden',minHeight:56,justifyContent:'center',paddingVertical:2}}>
            <Picker
              selectedValue={selectedContractKey}
              mode="dialog"
              onValueChange={(itemValue) => {
                const opt = CONTRACT_OPTIONS.find(opt => opt.key === itemValue);
                const salary = getSafeSalary(opt?.contract?.monthlySalary);
                setSelectedContractKey(itemValue);
                setFormData(prev => ({ ...prev, monthlySalary: salary.toString() }));
                calculateRates(salary);
              }}
              style={{
                height: 52, 
                width: '100%', 
                color: theme.colors.text,
                backgroundColor: theme.colors.background
              }}
              itemStyle={{
                fontSize: 17, 
                color: theme.colors.text,
                backgroundColor: theme.colors.background
              }}
              dropdownIconColor={theme.colors.text}
              numberOfLines={1}
            >
              {CONTRACT_OPTIONS.map(opt => (
                <Picker.Item 
                  key={opt.key} 
                  label={opt.label.length > 32 ? opt.label.slice(0,32)+'…' : opt.label} 
                  value={opt.key}
                  color={theme.colors.text}
                  style={{backgroundColor: theme.colors.background}}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Retribuzione Mensile *
              <Text style={{fontWeight:'normal',color: theme.colors.primary}}>  ({CONTRACT_OPTIONS.find(opt=>opt.key===selectedContractKey)?.label})</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.monthlySalary}
                onChangeText={handleMonthlySalaryChange}
                placeholder=""
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.inputSuffix}>€</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Retribuzione Viaggio</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.travelCompensationRate}
                onChangeText={(value) => setFormData(prev => ({ ...prev, travelCompensationRate: value }))}
                placeholder="100"
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
            <Text style={styles.inputHelp}>
              Percentuale della retribuzione oraria per le ore di viaggio
            </Text>
          </View>

          {/* Sezione Tariffe Personalizzate */}
          <View style={[styles.inputGroup, { backgroundColor: formData.customRatesEnabled ? theme.colors.primaryLight : 'transparent', padding: formData.customRatesEnabled ? 15 : 0, borderRadius: 8, borderWidth: formData.customRatesEnabled ? 1 : 0, borderColor: theme.colors.primary }]}>
            <TouchableOpacity 
              style={styles.toggleContainer}
              onPress={() => {
                const newEnabled = !formData.customRatesEnabled;
                setFormData(prev => ({ ...prev, customRatesEnabled: newEnabled }));
                // Ricalcola quando si cambia modalità
                const salary = getSafeSalary(formData.monthlySalary);
                calculateRates(salary, newEnabled, formData.customDailyRate, formData.customHourlyRate);
              }}
            >
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Tariffe Personalizzate</Text>
                  <Text style={styles.toggleHelp}>
                    Sovrascrivi i calcoli CCNL standard con tariffe personalizzate
                  </Text>
                </View>
                <View style={[styles.toggle, formData.customRatesEnabled && styles.toggleActive]}>
                  <View style={[styles.toggleKnob, formData.customRatesEnabled && styles.toggleKnobActive]} />
                </View>
              </View>
            </TouchableOpacity>

            {formData.customRatesEnabled && (
              <>
                <View style={[styles.inputGroup, { marginTop: 15 }]}>
                  <Text style={styles.inputLabel}>Tariffa Giornaliera Personalizzata *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customDailyRate}
                      onChangeText={(value) => {
                        setFormData(prev => ({ ...prev, customDailyRate: value }));
                        const salary = getSafeSalary(formData.monthlySalary);
                        calculateRates(salary, true, value, formData.customHourlyRate);
                      }}
                      placeholder="110.23"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                  <Text style={styles.inputHelp}>
                    Tariffa fissa giornaliera invece del calcolo CCNL (mensile/26)
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tariffa Oraria Personalizzata *</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customHourlyRate}
                      onChangeText={(value) => {
                        setFormData(prev => ({ ...prev, customHourlyRate: value }));
                        const salary = getSafeSalary(formData.monthlySalary);
                        calculateRates(salary, true, formData.customDailyRate, value);
                      }}
                      placeholder="16.15"
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                  <Text style={styles.inputHelp}>
                    Tariffa oraria base per calcolo straordinari e maggiorazioni
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Tariffe CCNL calcolate e difensive */}
        {calculatedRates && typeof calculatedRates.monthlySalary === 'number' && !isNaN(calculatedRates.monthlySalary) ? (
          <View style={styles.calculatedRatesContainer}>
            <Text style={styles.sectionTitle}>
              {calculatedRates.isCustomRates ? 'Dettaglio Tariffe Personalizzate' : 'Dettaglio Tariffe CCNL'}
              {calculatedRates.isCustomRates && <Text style={{ color: theme.colors.primary, fontSize: 14 }}> 🎯</Text>}
            </Text>
            <View style={styles.rateCard}>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Retribuzione Mensile</Text>
                <Text style={styles.rateValue}>{formatCurrency(calculatedRates.monthlySalary)}</Text>
              </View>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Retribuzione Giornaliera</Text>
                <Text style={[styles.rateValue, calculatedRates.isCustomRates && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  {formatCurrency(calculatedRates.dailyRate)}
                </Text>
              </View>
              {!calculatedRates.isCustomRates && (
                <Text style={{fontSize:12, color: theme.colors.textSecondary, marginBottom:8, marginLeft:4}}>
                  Calcolo: mensile / 26 = {formatCurrency(calculatedRates.monthlySalary)} / 26 = {formatCurrency(calculatedRates.dailyRate)}
                </Text>
              )}
              <View style={styles.rateRow}>
                <Text style={[styles.rateLabel, {color: calculatedRates.isCustomRates ? theme.colors.primary : theme.colors.primary}]}>
                  Retribuzione Oraria {calculatedRates.isCustomRates ? 'Personalizzata' : 'CCNL'}
                </Text>
                <Text style={[styles.rateValue, { color: theme.colors.primary, fontWeight: calculatedRates.isCustomRates ? 'bold' : 'normal' }]}>
                  {formatCurrency(calculatedRates.officialHourlyRate)}
                </Text>
              </View>
              {!calculatedRates.isCustomRates && (
                <Text style={{fontSize:12, color: theme.colors.primary, marginBottom:8, marginLeft:4}}>
                  Calcolo: mensile / 173 = {formatCurrency(calculatedRates.monthlySalary)} / 173 = {formatCurrency(calculatedRates.officialHourlyRate)}
                </Text>
              )}
              {calculatedRates.isCustomRates && (
                <Text style={{fontSize:12, color: theme.colors.primary, marginBottom:8, marginLeft:4, fontWeight: 'bold'}}>
                  ⚙️ Tariffe personalizzate attive - Le maggiorazioni sono calcolate su questi valori
                </Text>
              )}
              
              {/* Riepilogo maggiorazioni personalizzate attive */}
              <View style={{marginTop:10, backgroundColor: theme.colors.info + '15', borderRadius:8, padding:10}}>
                <View style={{flexDirection:'row', alignItems:'center', marginBottom:6}}>
                  <Text style={{fontWeight:'bold', fontSize:14, color: theme.colors.text}}>📊 Riepilogo Maggiorazioni Attive</Text>
                  <View style={{marginLeft:8, backgroundColor: theme.colors.success + '20', paddingHorizontal:6, paddingVertical:2, borderRadius:4}}>
                    <Text style={{fontSize:10, color: theme.colors.success, fontWeight:'bold'}}>
                      {Object.keys(bonusRates).some(key => bonusRates[key] !== defaultBonusRates[key]) ? 'PERSONALIZZATE' : 'STANDARD CCNL'}
                    </Text>
                  </View>
                </View>
                <Text style={{fontSize:12, color: theme.colors.textSecondary, marginBottom:6}}>
                  Le percentuali attualmente configurate per il calcolo degli stipendi:
                </Text>
                <View style={{flexDirection:'row', flexWrap:'wrap'}}>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Straord. diurno: +{bonusRates.overtimeDay}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Straord. serale: +{bonusRates.overtimeNightUntil22}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Straord. notturno: +{bonusRates.overtimeNightAfter22}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Ord. serale: +{bonusRates.ordinaryNightUntil22}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Ord. notturno: +{bonusRates.ordinaryNightAfter22}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Sabato: +{bonusRates.saturdayBonus || 25}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Festivo: +{bonusRates.ordinaryHoliday}%
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.text, marginRight:12, marginBottom:2}}>
                    • Domenicale: +{bonusRates.ordinarySunday}%
                  </Text>
                </View>
                <Text style={{fontSize:11, color: theme.colors.warning, marginTop:4, fontStyle:'italic'}}>
                  💡 Puoi modificare questi valori in fondo alla pagina con "Personalizza maggiorazioni CCNL"
                </Text>
                
                {/* Esempi pratici di calcolo */}
                <View style={{marginTop:8, borderTopWidth:1, borderTopColor: theme.colors.border, paddingTop:8}}>
                  <Text style={{fontSize:12, fontWeight:'bold', color: theme.colors.text, marginBottom:4}}>🧮 Esempi di Calcolo:</Text>
                  <Text style={{fontSize:11, color: theme.colors.textSecondary}}>
                    • 1h straordinario diurno = {formatCurrency(calculatedRates.officialHourlyRate)} × {(1 + bonusRates.overtimeDay/100).toFixed(2)} = {formatCurrency(calculatedRates.overtimeDay)}
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.textSecondary}}>
                    • 1h straordinario notturno = {formatCurrency(calculatedRates.officialHourlyRate)} × {(1 + bonusRates.overtimeNightAfter22/100).toFixed(2)} = {formatCurrency(calculatedRates.overtimeNightAfter22)}
                  </Text>
                  <Text style={{fontSize:11, color: theme.colors.textSecondary}}>
                    • 1h sabato ordinario = {formatCurrency(calculatedRates.officialHourlyRate)} × {(1 + (bonusRates.saturdayBonus || 25)/100).toFixed(2)} = {formatCurrency(calculatedRates.officialHourlyRate * (1 + (bonusRates.saturdayBonus || 25)/100))}
                  </Text>
                </View>
              </View>
              
              <View style={{marginTop:10}}>
                <Text style={{fontWeight:'bold', fontSize:15, marginBottom:4, color: theme.colors.text}}>Tabella Maggiorazioni CCNL</Text>
                <View style={{borderWidth:1, borderColor: theme.colors.border, borderRadius:8, marginBottom:8}}>
                  {/* Tabella maggiorazioni, sempre difensiva */}
                  {['overtimeDay','overtimeNightUntil22','overtimeNightAfter22','overtimeHoliday','overtimeSunday','ordinaryNightUntil22','ordinaryNightAfter22','ordinaryHoliday','ordinarySunday','ordinaryNightHoliday'].every(k => typeof calculatedRates[k] === 'number') ? (
                    <>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.info + '20'}}>
                        <Text style={{flex:2, fontWeight:'bold', color: theme.colors.text}}>Tipo</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right', color: theme.colors.text}}>Maggiorazione</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right', color: theme.colors.text}}>Valore</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Straordinario diurno</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.overtimeDay}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.overtimeDay)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Straordinario serale (20:00-22:00)</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.overtimeNightUntil22}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.overtimeNightUntil22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Straordinario notturno (dopo le 22:00)</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.overtimeNightAfter22}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.overtimeNightAfter22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Ordinario serale (20:00-22:00)</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.ordinaryNightUntil22}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.ordinaryNightUntil22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Ordinario notturno (dopo le 22:00)</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.ordinaryNightAfter22}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.ordinaryNightAfter22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Straordinario festivo</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.overtimeHoliday}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.overtimeHoliday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Straordinario domenicale</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.overtimeSunday}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.overtimeSunday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Lavoro sabato</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.saturdayBonus || 25}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.officialHourlyRate * (1 + (bonusRates.saturdayBonus || 25) / 100))}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Lavoro ordinario festivo</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.ordinaryHoliday}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.ordinaryHoliday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Lavoro ordinario domenicale</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.ordinarySunday}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.ordinarySunday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Ordinario festivo notturno</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>+{bonusRates.ordinaryNightHoliday}%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.ordinaryNightHoliday)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{padding:8}}>
                      <Text style={{color: theme.colors.error}}>Dati maggiorazioni non disponibili o corrotti.</Text>
                    </View>
                  )}
                </View>
                
                {/* Nota personalizzazione maggiorazioni */}
                <View style={{marginTop: 8, backgroundColor: theme.colors.warning + '20', borderRadius: 8, padding: 8}}>
                  <Text style={{fontSize: 12, color: theme.colors.text, fontWeight: 'bold'}}>⚠️ Nota Personalizzazione:</Text>
                  <Text style={{fontSize: 12, color: theme.colors.text}}>
                    Le percentuali mostrate potrebbero non rispecchiare al 100% il tuo contratto specifico. 
                    Se necessario, puoi personalizzarle utilizzando il pulsante "Personalizza maggiorazioni CCNL" in fondo alla pagina.
                  </Text>
                </View>
                
                {/* Tabella maggiorazioni composte reperibilità */}
                <Text style={{fontWeight:'bold', fontSize:15, marginBottom:4, marginTop:12, color: theme.colors.text}}>Maggiorazioni Composte Reperibilità</Text>
                <View style={{borderWidth:1, borderColor: theme.colors.border, borderRadius:8, marginBottom:8}}>
                  {['standbyOrdinarySaturdayNight','standbyOvertimeSaturdayNight','standbyOrdinaryHolidayNight','standbyOvertimeHolidayNight'].every(k => typeof calculatedRates[k] === 'number') ? (
                    <>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.warning + '20'}}>
                        <Text style={{flex:2, fontWeight:'bold', color: theme.colors.text}}>Tipo Combinato</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right', color: theme.colors.text}}>Calcolo</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right', color: theme.colors.text}}>Valore</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Sabato notturno ordinario</Text>
                        <Text style={{flex:1, textAlign:'right', fontSize:12, color: theme.colors.text}}>+25% + +25% = +50%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.standbyOrdinarySaturdayNight)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Sabato notturno straordinario</Text>
                        <Text style={{flex:1, textAlign:'right', fontSize:12, color: theme.colors.text}}>+25% + +35% = +60%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.standbyOvertimeSaturdayNight)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Festivo notturno ordinario</Text>
                        <Text style={{flex:1, textAlign:'right', fontSize:12, color: theme.colors.text}}>+25% + +30% = +55%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.standbyOrdinaryHolidayNight)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor: theme.colors.surface}}>
                        <Text style={{flex:2, color: theme.colors.text}}>Festivo notturno straordinario</Text>
                        <Text style={{flex:1, textAlign:'right', fontSize:12, color: theme.colors.text}}>+35% + +30% = +65%</Text>
                        <Text style={{flex:1, textAlign:'right', color: theme.colors.text}}>{formatCurrency(calculatedRates.standbyOvertimeHolidayNight)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{padding:8}}>
                      <Text style={{color: theme.colors.error}}>Dati maggiorazioni composte non disponibili.</Text>
                    </View>
                  )}
                </View>
                
                <View style={{marginTop: 8, backgroundColor: theme.colors.warning + '20', borderRadius: 8, padding: 8}}>
                  <Text style={{fontSize: 12, color: theme.colors.warning, fontWeight: 'bold'}}>ℹ️ Maggiorazioni Composte:</Text>
                  <Text style={{fontSize: 12, color: theme.colors.warning}}>
                    Le maggiorazioni composte si applicano durante la reperibilità quando si combinano più fattori (es. sabato + notte). Il calcolo dipende se il lavoro supera le 8h giornaliere (straordinario) o meno (ordinario).
                  </Text>
                </View>
              </View>
              <View style={{marginTop: 10, backgroundColor: theme.colors.info + '20', borderRadius: 8, padding: 10}}>
                <Text style={{fontSize: 13, color: theme.colors.text, fontWeight: 'bold'}}>Nota CCNL:</Text>
                <Text style={{fontSize: 13, color: theme.colors.text}}>
                  Le maggiorazioni CCNL Metalmeccanico PMI sono: straordinario diurno +20%, notturno +25%/+35%, sabato +25%, festivo +30%. Per la reperibilità si applicano maggiorazioni composte sommando i fattori (es. sabato + notte = +50%). La retribuzione oraria ufficiale si calcola come mensile diviso 173 ore (fonte: CCNL Metalmeccanico).
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{margin:15,backgroundColor: theme.colors.error + '20',borderRadius:8,padding:16}}>
            <Text style={{color: theme.colors.error,fontWeight:'bold'}}>Dati contratto non validi o incompleti. Impossibile calcolare le tariffe CCNL.</Text>
            <Text style={{color: theme.colors.text,marginTop:8}}>Verifica la retribuzione mensile e riprova.</Text>
          </View>
        )}

        {/* Festivi nazionali in menu a parte */}
        <TouchableOpacity onPress={()=>setShowHolidays(v=>!v)} style={{marginTop:16,alignSelf:'flex-start'}}>
          <Text style={{fontWeight:'bold',color: theme.colors.primary}}>Mostra/chiudi festività nazionali riconosciute automaticamente</Text>
        </TouchableOpacity>
        {showHolidays && (
          <View style={{marginTop:8,backgroundColor: theme.colors.surface,borderRadius:8,padding:12}}>
            {holidays.map(h => <Text key={h} style={{fontSize:13, color: theme.colors.text}}>{h}</Text>)}
          </View>
        )}

        {/* Personalizzazione maggiorazioni CCNL */}
        <TouchableOpacity onPress={()=>setShowBonusSettings(v=>!v)} style={{marginVertical:12,alignSelf:'flex-end'}}>
          <Text style={{color: theme.colors.primary,fontWeight:'bold'}}>Personalizza maggiorazioni CCNL</Text>
        </TouchableOpacity>
        {showBonusSettings && (
          <View style={{backgroundColor: theme.colors.surface,padding:10,borderRadius:8,marginBottom:12}}>
            <Text style={{fontSize:13,color: theme.colors.textSecondary,marginBottom:8,fontStyle:'italic'}}>
              Configura le maggiorazioni CCNL. La maggiorazione del sabato attualmente è impostata al 25% secondo CCNL Metalmeccanico.
            </Text>
            {/* Campo maggiorazione sabato */}
            <View key="saturday" style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
              <Text style={{flex:2,fontWeight:'bold',color: theme.colors.primary}}>Maggiorazione Sabato</Text>
              <TextInput
                style={{flex:1,borderWidth:1,borderColor: theme.colors.border,borderRadius:4,padding:4,marginLeft:8, backgroundColor: theme.colors.background, color: theme.colors.text}}
                value={formData.saturdayBonus}
                keyboardType="numeric"
                onChangeText={v=>setFormData(prev=>({...prev, saturdayBonus: v}))}
              />
              <Text style={{marginLeft:4}}>%</Text>
            </View>
            {Object.entries(bonusRates).map(([key, value]) => (
              <View key={key} style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
                <Text style={{flex:2}}>{
                  key === 'overtimeDay' ? 'Straordinario diurno'
                  : key === 'overtimeNightUntil22' ? 'Straordinario serale (20:00-22:00)'
                  : key === 'overtimeNightAfter22' ? 'Straordinario notturno (dopo le 22:00)'
                  : key === 'overtimeHoliday' ? 'Straordinario festivo'
                  : key === 'overtimeSunday' ? 'Straordinario domenicale'
                  : key === 'ordinaryNightUntil22' ? 'Ordinario serale (20:00-22:00)'
                  : key === 'ordinaryNightAfter22' ? 'Ordinario notturno (dopo le 22:00)'
                  : key === 'ordinaryHoliday' ? 'Ordinario festivo'
                  : key === 'ordinarySunday' ? 'Ordinario domenicale'
                  : key === 'ordinaryNightHoliday' ? 'Ordinario notturno festivo'
                  : key
                }</Text>
                <TextInput
                  style={{flex:1,borderWidth:1,borderColor: theme.colors.border,borderRadius:4,padding:4,marginLeft:8, backgroundColor: theme.colors.background, color: theme.colors.text}}
                  value={value.toString()}
                  keyboardType="numeric"
                  onChangeText={v=>setBonusRates(prev=>({...prev,[key]:parseFloat(v)||0}))}
                />
                <Text style={{marginLeft:4, color: theme.colors.text}}>%</Text>
              </View>
            ))}
            <TouchableOpacity style={{marginTop:8,backgroundColor: theme.colors.primary,padding:8,borderRadius:6,alignSelf:'flex-end'}} onPress={async()=>{
              // Aggiorna anche la maggiorazione sabato nel contratto
              const saturdayBonus = typeof formData.saturdayBonus === 'string' ? parseFloat(formData.saturdayBonus.replace(',', '.')) : 25;
              await updatePartialSettings({ 
                contract: { 
                  ...settings.contract, 
                  bonusRates,
                  overtimeRates: { 
                    ...settings.contract.overtimeRates, 
                    saturday: 1 + (isNaN(saturdayBonus) ? 0.25 : saturdayBonus / 100),
                    // Aggiorna le percentuali personalizzate di straordinario e ordinario notturno
                    overtimeNightUntil22: 1 + (bonusRates.overtimeNightUntil22 / 100),
                    overtimeNightAfter22: 1 + (bonusRates.overtimeNightAfter22 / 100),
                    ordinaryNightUntil22: 1 + (bonusRates.ordinaryNightUntil22 / 100),
                    ordinaryNightAfter22: 1 + (bonusRates.ordinaryNightAfter22 / 100),
                  } 
                } 
              });
              setShowBonusSettings(false);
              Alert.alert('Salvato','Maggiorazioni personalizzate salvate!');
            }}>
              <Text style={{color:'white',fontWeight:'bold'}}>Salva maggiorazioni</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Importazione contratti */}
        <View style={{marginVertical:12}}>
          <TouchableOpacity onPress={handleImportContractFromFile} style={{backgroundColor: theme.colors.info + '20',padding:10,borderRadius:6,marginBottom:8}}>
            <Text style={{color: theme.colors.primary,fontWeight:'bold'}}>Importa contratto da file</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            <TextInput
              placeholder="Incolla URL contratto JSON"
              style={{flex:1,borderWidth:1,borderColor: theme.colors.border,borderRadius:4,padding:6,marginRight:8, backgroundColor: theme.colors.background, color: theme.colors.text}}
              onChangeText={setUrlInput}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TouchableOpacity onPress={()=>handleImportContractFromUrl(urlInput)} style={{backgroundColor: theme.colors.primary,padding:10,borderRadius:6}}>
              <Text style={{color:'white',fontWeight:'bold'}}>Scarica da URL</Text>
            </TouchableOpacity>
          </View>
          {DEFAULT_CONTRACT_URLS.length > 0 && (
            <View style={{marginBottom:8}}>
              <Text style={{fontSize:13, color: theme.colors.textSecondary, marginBottom:4}}>Oppure scegli un URL predefinito:</Text>
              {DEFAULT_CONTRACT_URLS.map(opt => (
                <TouchableOpacity key={opt.url} onPress={() => { setUrlInput(opt.url); handleImportContractFromUrl(opt.url); }} style={{backgroundColor: theme.colors.info + '20',padding:8,borderRadius:6,marginBottom:4}}>
                  <Text style={{color: theme.colors.primary}}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !calculatedRates && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!calculatedRates}
        >
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
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
    lineHeight: 22,
  },
  contractInfo: {
    backgroundColor: theme.colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 10,
  },
  contractDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: theme.colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputSuffix: {
    paddingRight: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  inputHelp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  calculatedRatesContainer: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
  },
  rateCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rateLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  overtimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // Stili per il toggle delle tariffe personalizzate
  toggleContainer: {
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 15,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  toggleHelp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    backgroundColor: theme.colors.border,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    backgroundColor: 'white',
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
});

export default ContractSettingsScreen;
