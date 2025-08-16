import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { isWeekend } from '../utils';
import { isItalianHoliday } from '../constants/holidays';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
const SuperNotificationService = require('../services/SuperNotificationService');
import { useTheme } from '../contexts/ThemeContext';
import { Linking } from 'react-native';

// Configurazione locale italiana per il calendario
LocaleConfig.locales['it'] = {
  monthNames: [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
  ],
  monthNamesShort: [
    'Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'
  ],
  dayNames: [
    'Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'
  ],
  dayNamesShort: ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'],
  today: 'Oggi'
};
LocaleConfig.defaultLocale = 'it';

const StandbySettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    enabled: false,
    dailyAllowance: '',
    startHour: '18',
    endHour: '8',
    includeWeekends: true,
    includeHolidays: true,
    travelWithBonus: false, // Nuova opzione: viaggio reperibilità con maggiorazione
    // Personalizzazioni indennità CCNL
    customFeriale16: '',
    customFeriale24: '',
    customFestivo: '',
  customWeekly6Days: '',
    // Impostazioni aggiuntive
    allowanceType: '24h', // '16h' o '24h'
    saturdayAsRest: false, // se sabato è considerato giorno di riposo
  // Forfait settimanale (6 giorni)
  weeklyModeEnabled: false,
  weeklyOption: 'base', // 'base' | 'withHoliday' | 'withHolidayAndRest'
  // Dashboard
  showInterventionsCard: true,
  });
  const [standbyDays, setStandbyDays] = useState(settings.standbySettings?.standbyDays || {});
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}`;
  });
  const [tariffa24h, setTariffa24h] = useState(true); // true = 24h, false = 16h
  const [saturdayMode, setSaturdayMode] = useState('feriale'); // 'feriale' | 'feriale24' | 'festivo'
  // Ref per evitare salvataggi duplicati a raffica
  const lastEnabledRef = useRef(settings?.standbySettings?.enabled);

  // Costruisce l'oggetto standbySettings coerente con lo stato form + giorni
  const buildStandbySettings = (fd = formData, sd = standbyDays) => {
    const dailyAllowance = parseFloat(fd.dailyAllowance) || 0;
    const startHour = parseInt(fd.startHour) || 18;
    const endHour = parseInt(fd.endHour) || 8;
    return {
      enabled: fd.enabled,
      dailyAllowance,
      startHour,
      endHour,
      includeWeekends: fd.includeWeekends,
      includeHolidays: fd.includeHolidays,
      travelWithBonus: fd.travelWithBonus === true,
      standbyDays: sd,
      customFeriale16: parseFloat(fd.customFeriale16) || null,
      customFeriale24: parseFloat(fd.customFeriale24) || null,
      customFestivo: parseFloat(fd.customFestivo) || null,
      customWeekly6Days: parseFloat(fd.customWeekly6Days) || null,
      allowanceType: tariffa24h ? '24h' : '16h',
      saturdayAsRest: saturdayMode === 'festivo',
      saturdayMode,
      weeklyMode: {
        enabled: fd.weeklyModeEnabled === true,
        option: fd.weeklyOption || 'base'
      },
      showInterventionsCard: fd.showInterventionsCard === true
    };
  };

  // Indennità CCNL ufficiali per livello (Unionmeccanica Confapi, 01/06/2025)
  const { getStandbyRatesForContract } = require('../constants');
  const contractKey = settings?.contract?.key;
  const ccnlRates = getStandbyRatesForContract(contractKey);
  const IND_16H_FERIALE = ccnlRates.feriale16;
  const IND_24H_FERIALE = ccnlRates.feriale24;
  const IND_24H_FESTIVO = ccnlRates.festivo24;
  const IND_WEEKLY_6 = ccnlRates.weekly6Days;

  // Calcolo tipo giorno e tariffa
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const isTodayHoliday = isItalianHoliday(todayStr);
  const isTodaySunday = today.getDay() === 0;
  const isTodaySaturday = today.getDay() === 6;
  let tipoGiorno = 'Feriale';
  let indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  // Determina il tipo di giorno/indennità per l'anteprima
  if (isTodayHoliday || isTodaySunday || (isTodaySaturday && saturdayMode === 'festivo')) {
    tipoGiorno = isTodayHoliday ? 'Festivo' : (isTodaySunday ? 'Domenica' : 'Sabato (riposo)');
    indennita = IND_24H_FESTIVO;
  } else if (isTodaySaturday && saturdayMode === 'feriale24') {
    tipoGiorno = 'Sabato (feriale 24h)';
    indennita = IND_24H_FERIALE;
  } else if (isTodaySaturday) {
    tipoGiorno = 'Sabato (lavorativo)';
    indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  } else {
    tipoGiorno = 'Feriale';
    indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  }
  // Personalizzazione
  let customValue = '';
  if (tipoGiorno === 'Festivo' || tipoGiorno === 'Domenica' || tipoGiorno === 'Sabato (riposo)') {
    customValue = formData.customFestivo;
    if (customValue) indennita = parseFloat(customValue);
  } else {
    customValue = tariffa24h ? formData.customFeriale24 : formData.customFeriale16;
    if (customValue) indennita = parseFloat(customValue);
  }

  useEffect(() => {
    if (settings.standbySettings) {
      setFormData({
        enabled: settings.standbySettings.enabled || false,
        dailyAllowance: settings.standbySettings.dailyAllowance?.toString() || '',
        startHour: settings.standbySettings.startHour?.toString() || '18',
        endHour: settings.standbySettings.endHour?.toString() || '8',
        includeWeekends: settings.standbySettings.includeWeekends !== false,
        includeHolidays: settings.standbySettings.includeHolidays !== false,
        travelWithBonus: settings.standbySettings.travelWithBonus === true, // default false
        // Personalizzazioni indennità CCNL
        customFeriale16: settings.standbySettings.customFeriale16?.toString() || '',
        customFeriale24: settings.standbySettings.customFeriale24?.toString() || '',
        customFestivo: settings.standbySettings.customFestivo?.toString() || '',
  customWeekly6Days: settings.standbySettings.customWeekly6Days?.toString() || '',
        // Impostazioni aggiuntive
        allowanceType: settings.standbySettings.allowanceType || '24h',
        saturdayAsRest: settings.standbySettings.saturdayAsRest === true,
  weeklyModeEnabled: settings.standbySettings.weeklyMode?.enabled === true,
  weeklyOption: settings.standbySettings.weeklyMode?.option || 'base',
  showInterventionsCard: settings.standbySettings.showInterventionsCard !== false,
      });
      setStandbyDays(settings.standbySettings.standbyDays || {});
      // Aggiorna anche i toggle locali
      setTariffa24h(settings.standbySettings.allowanceType !== '16h');
      const mode = settings.standbySettings.saturdayMode 
        || ((settings.standbySettings.saturdayAsRest === true) ? 'festivo' : 'feriale');
      setSaturdayMode(mode);
    }
  }, [settings]);

  // Inizializza automaticamente le impostazioni se mancanti (prima apertura / install pulita)
  useEffect(() => {
    if (!isLoading && !settings.standbySettings) {
      (async () => {
        try {
          const init = buildStandbySettings();
          await updatePartialSettings({ standbySettings: init });
          console.log('🔄 Inizializzazione standbySettings salvata automaticamente');
        } catch (e) {
          console.warn('Impossibile inizializzare standbySettings:', e);
        }
      })();
    }
  }, [isLoading, settings.standbySettings]);

  // Auto-salvataggio quando si cambia lo switch enabled (richiesta utente)
  useEffect(() => {
    if (isLoading) return;
    if (lastEnabledRef.current !== formData.enabled) {
      lastEnabledRef.current = formData.enabled;
      (async () => {
        try {
          const data = buildStandbySettings();
          await updatePartialSettings({ standbySettings: data });
          await SuperNotificationService.scheduleNotifications(await SuperNotificationService.getSettings(), true);
          console.log('💾 Auto-salvataggio reperibilità (toggle enabled)');
        } catch (e) {
          console.error('Errore auto-salvataggio toggle reperibilità:', e);
        }
      })();
    }
  }, [formData.enabled, isLoading]);

  const handleResetToCCNL = () => {
    setFormData(prev => ({
      ...prev,
      customFeriale16: IND_16H_FERIALE.toString(),
      customFeriale24: IND_24H_FERIALE.toString(),
      customFestivo: IND_24H_FESTIVO.toString(),
    }));
    Alert.alert('Indennità CCNL', 'Tariffe ripristinate ai valori CCNL per il tuo livello.');
  };

  const InfoBox = () => (
    <View style={{
      backgroundColor: theme.name === 'dark' ? 'rgba(33,150,243,0.12)' : '#E3F2FD',
      borderColor: '#2196F3',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginTop: 12
    }}>
      <Text style={{ fontWeight: 'bold', color: theme.colors.text, marginBottom: 6 }}>Indennità di reperibilità (CCNL Unionmeccanica Confapi)</Text>
      <Text style={{ color: theme.colors.text }}>
        Feriale 16h: €{IND_16H_FERIALE.toFixed(2)} · Feriale 24h: €{IND_24H_FERIALE.toFixed(2)} · Festivo/Domenica 24h: €{IND_24H_FESTIVO.toFixed(2)}
      </Text>
      {IND_WEEKLY_6 ? (
        <View style={{ marginTop: 4 }}>
          <Text style={{ color: theme.colors.text }}>Settimana (6 giorni):</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            • 6 giorni: €{Number(IND_WEEKLY_6.six).toFixed(2)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            • 6 giorni + festivo: €{Number(IND_WEEKLY_6.sixWithHoliday).toFixed(2)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            • 6 giorni + festivo + giorno libero: €{Number(IND_WEEKLY_6.sixWithHolidayAndRest).toFixed(2)}
          </Text>
        </View>
      ) : null}
      <TouchableOpacity onPress={() => Linking.openURL('https://www.consulentidellavoro.pc.it/2025/06/20/ccnl-metalmeccanica-p-i-confapi-con-ladeguamento-ipca-nuovi-minimi-da-giugno/')} style={{ marginTop: 8 }}>
        <Text style={{ color: '#1976D2', textDecorationLine: 'underline' }}>Fonte: Consulenti del Lavoro – nuovi minimi da giugno 2025</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResetToCCNL} style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#1976D2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
        <Text style={{ color: '#fff' }}>Ripristina valori CCNL</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    // Programma notifica automatica per i giorni di reperibilità usando il nostro sistema Enhanced
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (formData.enabled && standbyDays && standbyDays[todayStr]?.selected) {
      // Usa il sistema Alert per notificare immediatamente
      Alert.alert(
        'Reperibilità',
        'Oggi sei in reperibilità. Conferma la tua disponibilità!',
        [
          {
            text: 'Annulla',
            style: 'cancel'
          },
          {
            text: 'Conferma',
            onPress: async () => {
              await AsyncStorage.setItem(`standby_confirmed_${todayStr}`, 'true');
              Alert.alert('Conferma reperibilità', 'Hai confermato la tua disponibilità per oggi.');
            }
          }
        ]
      );
    }
  }, [formData.enabled, standbyDays]);

  // Funzione per generare tutti i giorni del mese corrente
  const getAllDaysOfMonth = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${month.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`);
    }
    return days;
  };

  // Genera oggetto markedDates combinando selezione, weekend e festivi
  const getMarkedDates = () => {
    const days = getAllDaysOfMonth(currentMonth);
    const marked = { ...standbyDays };
    days.forEach(date => {
      const isSel = standbyDays[date]?.selected;
      const isWk = isWeekend(date);
      const isHol = isItalianHoliday(date);
      if (!isSel) {
        if (isHol) {
          marked[date] = {
            marked: true,
            dotColor: '#F44336',
            customStyles: { 
              container: { 
                backgroundColor: theme.name === 'dark' ? 'rgba(244, 67, 54, 0.2)' : '#FFEBEE',
                borderRadius: 6
              },
              text: {
                color: theme.colors.text
              }
            }
          };
        } else if (isWk) {
          marked[date] = {
            marked: true,
            dotColor: '#FF9800',
            customStyles: { 
              container: { 
                backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.2)' : '#FFF3E0',
                borderRadius: 6
              },
              text: {
                color: theme.colors.text
              }
            }
          };
        }
      } else {
        // Migliora visibilità: blu intenso, testo bianco, bordo spesso
        marked[date] = {
          selected: true,
          customStyles: {
            container: {
              backgroundColor: '#007AFF',
              borderWidth: 2,
              borderColor: '#007AFF',
              borderRadius: 6,
              elevation: 2,
            },
            text: {
              color: '#fff',
              fontWeight: 'bold',
            }
          }
        };
        // Se anche festivo/weekend, aggiungi alone
        if (isHol) {
          marked[date].customStyles.container.borderColor = '#F44336';
          marked[date].customStyles.container.borderWidth = 3;
        } else if (isWk) {
          marked[date].customStyles.container.borderColor = '#FF9800';
          marked[date].customStyles.container.borderWidth = 3;
        }
      }
    });
    return marked;
  };

  const handleSave = async () => {
    try {
      const dailyAllowance = parseFloat(formData.dailyAllowance) || 0;
      const startHour = parseInt(formData.startHour) || 18;
      const endHour = parseInt(formData.endHour) || 8;
      if (dailyAllowance < 0) {
        Alert.alert('Errore', "L'indennità giornaliera non può essere negativa");
        return;
      }
      if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
        Alert.alert('Errore', 'Gli orari devono essere compresi tra 0 e 23');
        return;
      }
      const updatedStandbySettings = buildStandbySettings();
      await updatePartialSettings({ standbySettings: updatedStandbySettings });
      await SuperNotificationService.scheduleNotifications(await SuperNotificationService.getSettings(), true);
      Alert.alert('Successo', 'Impostazioni reperibilità salvate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving standby settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  // (rimosso) vecchio esempio calcolo indennità giornaliera non utilizzato

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reperibilità</Text>
          <Text style={styles.headerSubtitle}>
            Configura indennità e orari di reperibilità
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.enableContainer}>
            <Text style={styles.enableLabel}>Attiva Reperibilità</Text>
            <Switch
              value={formData.enabled}
              onValueChange={(value) => setFormData(prev => ({ ...prev, enabled: value }))}
              trackColor={{ false: theme.colors.border, true: '#007AFF' }}
              thumbColor={formData.enabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          {formData.enabled && (
            <>
              <View style={styles.timeContainer}>
                <Text style={styles.sectionTitle}>Orari Reperibilità</Text>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Dalle ore</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={formData.startHour}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, startHour: value }))}
                      placeholder="18"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  
                  <Text style={styles.timeSeparator}>alle ore</Text>
                  
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>del giorno dopo</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={formData.endHour}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, endHour: value }))}
                      placeholder="8"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                
                <Text style={styles.timeHelp}>
                  Esempio: dalle 18:00 alle 08:00 del giorno dopo
                </Text>
              </View>

              <View style={styles.optionsContainer}>
                <Text style={styles.sectionTitle}>Opzioni Aggiuntive</Text>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Include fine settimana</Text>
                  <Switch
                    value={formData.includeWeekends}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, includeWeekends: value }))}
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                    thumbColor={formData.includeWeekends ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Include giorni festivi</Text>
                  <Switch
                    value={formData.includeHolidays}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, includeHolidays: value }))}
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                    thumbColor={formData.includeHolidays ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Tipo indennità CCNL</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, !tariffa24h && styles.toggleButtonActive]}
                      onPress={() => {
                        setTariffa24h(false);
                        setFormData(prev => ({ ...prev, allowanceType: '16h' }));
                      }}
                    >
                      <Text style={[styles.toggleButtonText, !tariffa24h && styles.toggleButtonTextActive]}>16h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, tariffa24h && styles.toggleButtonActive]}
                      onPress={() => {
                        setTariffa24h(true);
                        setFormData(prev => ({ ...prev, allowanceType: '24h' }));
                      }}
                    >
                      <Text style={[styles.toggleButtonText, tariffa24h && styles.toggleButtonTextActive]}>24h</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.optionRow, {flexDirection:'column', alignItems:'flex-start'}]}>
                  <Text style={styles.optionLabel}>Modalità applicazione</Text>
                  <View style={{flexDirection:'row', alignItems:'center', marginTop: 8}}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, !formData.weeklyModeEnabled && styles.toggleButtonActive]}
                      onPress={() => setFormData(prev => ({...prev, weeklyModeEnabled: false}))}
                    >
                      <Text style={[styles.toggleButtonText, !formData.weeklyModeEnabled && styles.toggleButtonTextActive]}>Giornaliera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, formData.weeklyModeEnabled && styles.toggleButtonActive]}
                      onPress={() => setFormData(prev => ({...prev, weeklyModeEnabled: true}))}
                    >
                      <Text style={[styles.toggleButtonText, formData.weeklyModeEnabled && styles.toggleButtonTextActive]}>Settimana (6 giorni)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.weeklyModeEnabled && IND_WEEKLY_6 ? (
                  <View style={[styles.optionRow, {alignItems:'flex-start'}]}>
                    <Text style={[styles.optionLabel, {marginTop:8}]}>Opzione settimana</Text>
                    <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'flex-end'}}>
                      <TouchableOpacity 
                        style={[styles.toggleButton, formData.weeklyOption==='base' && styles.toggleButtonActive]}
                        onPress={() => setFormData(prev => ({...prev, weeklyOption:'base'}))}
                      >
                        <Text style={[styles.toggleButtonText, formData.weeklyOption==='base' && styles.toggleButtonTextActive]}>6 giorni</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.toggleButton, formData.weeklyOption==='withHoliday' && styles.toggleButtonActive]}
                        onPress={() => setFormData(prev => ({...prev, weeklyOption:'withHoliday'}))}
                      >
                        <Text style={[styles.toggleButtonText, formData.weeklyOption==='withHoliday' && styles.toggleButtonTextActive]}>6 giorni + festivo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.toggleButton, formData.weeklyOption==='withHolidayAndRest' && styles.toggleButtonActive]}
                        onPress={() => setFormData(prev => ({...prev, weeklyOption:'withHolidayAndRest'}))}
                      >
                        <Text style={[styles.toggleButtonText, formData.weeklyOption==='withHolidayAndRest' && styles.toggleButtonTextActive]}>6 giorni + festivo + giorno libero</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.optionRow, {flexDirection:'column', alignItems:'flex-start'}]}>
                  <Text style={styles.optionLabel}>Sabato (reperibilità)</Text>
                  <View style={{flexDirection:'row', alignItems:'center', marginTop: 8}}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, saturdayMode==='feriale' && styles.toggleButtonActive]}
                      onPress={() => setSaturdayMode('feriale')}
                    >
                      <Text style={[styles.toggleButtonText, saturdayMode==='feriale' && styles.toggleButtonTextActive]}>Feriale</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, saturdayMode==='feriale24' && styles.toggleButtonActive]}
                      onPress={() => setSaturdayMode('feriale24')}
                    >
                      <Text style={[styles.toggleButtonText, saturdayMode==='feriale24' && styles.toggleButtonTextActive]}>Feriale 24h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, saturdayMode==='festivo' && styles.toggleButtonActive]}
                      onPress={() => setSaturdayMode('festivo')}
                    >
                      <Text style={[styles.toggleButtonText, saturdayMode==='festivo' && styles.toggleButtonTextActive]}>Festivo 24h</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Maggiorazione CCNL anche sul viaggio in reperibilità</Text>
                  <Switch
                    value={formData.travelWithBonus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, travelWithBonus: value }))}
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                    thumbColor={formData.travelWithBonus ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Calendario selezione giorni reperibilità */}
              <View style={{marginBottom:20}}>
                <Text style={styles.sectionTitle}>Calendario Giorni Reperibilità</Text>
                <Calendar
                  markedDates={getMarkedDates()}
                  onDayPress={async (day) => {
                    const newStandbyDays = { ...standbyDays };
                    if (newStandbyDays[day.dateString]) {
                      delete newStandbyDays[day.dateString];
                    } else {
                      newStandbyDays[day.dateString] = { selected: true, selectedColor: '#007AFF' };
                    }
                    
                    // Aggiorna stato locale
                    setStandbyDays(newStandbyDays);
                    
                    // Salva immediatamente in settings
                    try {
                      const updatedStandbySettings = {
                        ...settings.standbySettings,
                        standbyDays: newStandbyDays
                      };
                      
                      await updatePartialSettings({
                        standbySettings: updatedStandbySettings
                      });
                      
                      // Aggiorna notifiche SOLO tramite SuperNotificationService
                      await SuperNotificationService.scheduleNotifications(await SuperNotificationService.getSettings(), true);
                      console.log('✅ Calendario reperibilità aggiornato e notifiche sincronizzate (SuperNotificationService)');
                    } catch (error) {
                      console.error('❌ Errore salvando calendario reperibilità:', error);
                    }
                  }}
                  onMonthChange={m => {
                    setCurrentMonth(`${m.year}-${m.month.toString().padStart(2,'0')}`);
                  }}
                  enableSwipeMonths={true}
                  markingType="custom"
                  theme={{
                    backgroundColor: theme.colors.card,
                    calendarBackground: theme.colors.card,
                    textSectionTitleColor: theme.colors.text,
                    textSectionTitleDisabledColor: theme.colors.textSecondary,
                    selectedDayBackgroundColor: '#007AFF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#007AFF',
                    dayTextColor: theme.colors.text,
                    textDisabledColor: theme.colors.textSecondary,
                    dotColor: '#007AFF',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#007AFF',
                    disabledArrowColor: theme.colors.textSecondary,
                    monthTextColor: theme.colors.text,
                    indicatorColor: '#007AFF',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: 'bold',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13,
                  }}
                />
                <Text style={styles.inputHelp}>Tocca i giorni sul calendario per attivare/disattivare la reperibilità.</Text>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.infoTitle}>Come funziona</Text>
                </View>
                <Text style={styles.infoText}>
                  • L'indennità viene calcolata automaticamente in base al tipo di giorno: Feriale (16h/24h) o Festivo/Libero (24h){"\n"}
                  • Puoi personalizzare separatamente le 3 indennità: Feriale 16h, Feriale 24h, Festivo/Libero 24h (es. secondo accordi aziendali){"\n"}
                  • Il sabato può essere considerato lavorativo o giorno di riposo tramite apposito selettore; se impostato come riposo, applica la tariffa festiva/libera{"\n"}
                  • I giorni di reperibilità si selezionano dal calendario; weekend e festivi sono evidenziati automaticamente{"\n"}
                  • Gli interventi durante la reperibilità sono calcolati con le maggiorazioni CCNL (straordinario, notturno, festivo){"\n"}
                  • I viaggi in reperibilità seguono le impostazioni del contratto CCNL
                </Text>
                <View style={{
                  marginTop:10,
                  backgroundColor: theme.colors.surface,
                  borderRadius:8,
                  padding:10,
                  borderLeftWidth: 3,
                  borderLeftColor: '#FF9800'
                }}>
                  <Text style={{fontWeight:'bold',color:'#FF9800'}}>Esempi pratici:</Text>
                  <Text style={{color: theme.colors.text,marginTop:4,fontSize:13}}>
                    {`• Seleziona i giorni di reperibilità dal calendario (es: sabato e domenica)
• Imposta l'indennità giornaliera secondo il tuo CCNL (es: 15€/giorno)
• Orari tipici: dalle 18:00 alle 08:00 del giorno dopo
• Se effettui un intervento in reperibilità (es: chiamata notturna), l'app calcola automaticamente la maggiorazione notturna e l'indennità`}
                  </Text>
                  <Text style={{color: theme.colors.text,marginTop:4,fontSize:13}}>
                    {`• I giorni festivi e i weekend sono evidenziati automaticamente nel calendario`}
                  </Text>
                </View>
              </View>

              <InfoBox />

              {/* Preferenze Dashboard */}
              <View style={[styles.panel, { marginTop: 12 }]}> 
                <Text style={styles.sectionTitle}>Dashboard</Text>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>Interventi Reperibilità</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ color: theme.colors.textSecondary, flex: 1, marginRight: 12 }}>
                      Mostra la card “Interventi Reperibilità” nella Dashboard
                    </Text>
                    <Switch
                      value={formData.showInterventionsCard}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, showInterventionsCard: v }))}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Indennità Personalizzata</Text>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Feriale (16h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale16}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale16: value }))
                      }
                      placeholder={IND_16H_FERIALE.toFixed(2)}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Feriale (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale24}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale24: value }))
                      }
                      placeholder={IND_24H_FERIALE.toFixed(2)}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Festivo/Libero (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFestivo}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFestivo: value }))
                      }
                      placeholder={IND_24H_FESTIVO.toFixed(2)}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Settimana (6 giorni) – opzionale</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customWeekly6Days}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customWeekly6Days: value }))
                      }
                      placeholder={(function(){
                        if (!IND_WEEKLY_6) return '';
                        if (!formData.weeklyModeEnabled) return '';
                        const map = { base: 'six', withHoliday: 'sixWithHoliday', withHolidayAndRest: 'sixWithHolidayAndRest' };
                        const key = map[formData.weeklyOption || 'base'];
                        const val = IND_WEEKLY_6[key];
                        return typeof val === 'number' ? val.toFixed(2) : '';
                      })()}
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <Text style={styles.inputHelp}>
                  Lascia vuoto per usare il valore CCNL oppure inserisci l'importo reale della tua azienda per ciascuna tipologia di giorno.
                </Text>
              </View>
            </>
          )}
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
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  enableLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
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
    color: theme.colors.textDisabled,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    width: 60,
  },
  timeSeparator: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginHorizontal: 15,
    marginBottom: 12,
  },
  timeHelp: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.text,
  flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 4,
    backgroundColor: theme.colors.card,
  },
  toggleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: theme.colors.background,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
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
});

export default StandbySettingsScreen;
