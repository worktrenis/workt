import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VacationService from '../services/VacationService';
import { useTheme, lightTheme } from '../contexts/ThemeContext';

// Componenti riutilizzati dal TimeEntryForm per mantenere coerenza visiva
const ModernCard = ({ children, style, theme }) => {
  const safeTheme = theme || lightTheme; // fallback
  return (
    <View style={[createStyles(safeTheme).modernCard, style]}>
      {children}
    </View>
  );
};

const SectionHeader = ({ title, icon, iconColor, theme }) => {
  const safeTheme = theme || lightTheme;
  return (
    <View style={createStyles(safeTheme).sectionHeader}>
      <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      <Text style={createStyles(safeTheme).sectionHeaderTitle}>{title}</Text>
    </View>
  );
};

const InputRow = ({ label, children, icon, required = false, theme }) => {
  const safeTheme = theme || lightTheme;
  return (
    <View style={createStyles(safeTheme).inputRow}>
      <View style={createStyles(safeTheme).inputLabelContainer}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={safeTheme.colors.textSecondary} style={createStyles(safeTheme).inputIcon} />}
        <Text style={createStyles(safeTheme).inputLabel}>
          {label} {required && <Text style={createStyles(safeTheme).requiredMark}>*</Text>}
        </Text>
      </View>
      <View style={createStyles(safeTheme).inputContainer}>
        {children}
      </View>
    </View>
  );
};

const VacationSettingsScreen = ({ navigation }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  const styles = createStyles(theme);
  const [settings, setSettings] = useState({
    ferieResAnniPrec: 0,
    ferieMaturatiMensili: 0,
    permROAResAnniPrec: 0,
    permROAMaturatiMensili: 0,
    permFestResAnniPrec: 0,
    permFestMaturatiMensili: 0,
    currentYear: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-01-01`,
    permitBankEnabled: false,
    sickLeaveEnabled: false,
    autoApprovalEnabled: false,
    autoCompileTimeEntry: false,
    countSaturdayAsWorkday: false,
    countSundayAsWorkday: false,
    countHolidaysAsWorkday: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // Usa il nuovo metodo che verifica e corregge le impostazioni
      const [currentSettings, remainingData] = await Promise.all([
        VacationService.getVacationSettings(),
        VacationService.calculateRemainingDays(),
      ]);
      if (currentSettings) {
        setSettings({
          ferieResAnniPrec: parseFloat(currentSettings.ferieResAnniPrec) || 0,
          ferieMaturatiMensili: parseFloat(currentSettings.ferieMaturatiMensili ?? currentSettings.ferieMaturateAdOggi) || 0,
          permROAResAnniPrec: parseFloat(currentSettings.permROAResAnniPrec) || 0,
          permROAMaturatiMensili: parseFloat(currentSettings.permROAMaturatiMensili ?? currentSettings.permROAMaturateAdOggi) || 0,
          permFestResAnniPrec: parseFloat(currentSettings.permFestResAnniPrec) || 0,
          permFestMaturatiMensili: parseFloat(currentSettings.permFestMaturatiMensili ?? currentSettings.permFestMaturateAdOggi) || 0,
          currentYear: currentSettings.currentYear || new Date().getFullYear(),
          startDate: currentSettings.startDate || `${new Date().getFullYear()}-01-01`,
          permitBankEnabled: currentSettings.permitBankEnabled === true,
          sickLeaveEnabled: currentSettings.sickLeaveEnabled === true,
          autoApprovalEnabled: currentSettings.autoApprovalEnabled === true,
          autoCompileTimeEntry: currentSettings.autoCompileTimeEntry === true,
          countSaturdayAsWorkday: currentSettings.countSaturdayAsWorkday === true,
          countSundayAsWorkday: currentSettings.countSundayAsWorkday === true,
          countHolidaysAsWorkday: currentSettings.countHolidaysAsWorkday === true,
        });
      }
      if (remainingData) setRemaining(remainingData);
    } catch (error) {
      console.error('Errore caricamento impostazioni ferie:', error);
      Alert.alert('Errore', 'Impossibile caricare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const floatFields = ['ferieResAnniPrec', 'ferieMaturatiMensili', 'permROAResAnniPrec', 'permROAMaturatiMensili', 'permFestResAnniPrec', 'permFestMaturatiMensili'];
    const intFields = ['currentYear'];
    let processedValue = value;
    if (floatFields.includes(field)) {
      // Accetta sia virgola che punto come separatore decimale; mantieni stringa durante digitazione
      processedValue = value.replace(',', '.');
    } else if (intFields.includes(field)) {
      processedValue = parseInt(value) || 0;
    }
    
    setSettings(prev => ({
      ...prev,
      [field]: processedValue
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Converte i campi stringa in float prima del salvataggio
      const floatFields = ['ferieResAnniPrec', 'ferieMaturatiMensili', 'permROAResAnniPrec', 'permROAMaturatiMensili', 'permFestResAnniPrec', 'permFestMaturatiMensili'];
      const converted = { ...settings };
      for (const f of floatFields) {
        converted[f] = parseFloat(String(converted[f]).replace(',', '.')) || 0;
      }

      // Validazione: nessun campo ore può essere negativo
      const oreFields = floatFields;
      for (const f of oreFields) {
        if ((converted[f] || 0) < 0) {
          Alert.alert('Errore', 'I valori delle ore non possono essere negativi');
          return;
        }
      }

      const success = await VacationService.setSettings(converted);
      if (success) {
        setSettings(converted);
        setHasChanges(false);
        Alert.alert('Successo', 'Impostazioni salvate correttamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni');
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      Alert.alert('Errore', 'Errore durante il salvataggio');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Ripristina impostazioni',
      'Vuoi ripristinare le impostazioni predefinite secondo il CCNL Metalmeccanico?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina',
          style: 'destructive',
          onPress: () => {
            setSettings({
              ferieResAnniPrec: 0,
              ferieMaturatiMensili: 0,
              permROAResAnniPrec: 0,
              permROAMaturatiMensili: 0,
              permFestResAnniPrec: 0,
              permFestMaturatiMensili: 0,
              currentYear: new Date().getFullYear(),
              startDate: `${new Date().getFullYear()}-01-01`,
              permitBankEnabled: false,
              sickLeaveEnabled: false,
              autoApprovalEnabled: false,
              autoCompileTimeEntry: false,
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  // Funzione per approvare automaticamente tutte le richieste in attesa
  const handleAutoApproveAll = async () => {
    try {
      if (!settings.autoApprovalEnabled) {
        Alert.alert(
          'Auto-approvazione disattivata',
          'Per utilizzare questa funzione, devi prima attivare l\'auto-approvazione nelle impostazioni.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Approva tutte le richieste',
        'Vuoi approvare automaticamente tutte le richieste di ferie/permessi attualmente in attesa?',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Approva tutto',
            style: 'default',
            onPress: async () => {
              try {
                const result = await VacationService.autoApproveAllPendingRequests();
                
                if (result.approved > 0) {
                  Alert.alert(
                    'Successo',
                    `Approvate automaticamente ${result.approved} richieste in attesa.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Informazione', 
                    result.message || 'Nessuna richiesta da approvare.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('Errore approvazione automatica:', error);
                Alert.alert('Errore', 'Impossibile approvare le richieste');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Errore gestione auto-approvazione:', error);
      Alert.alert('Errore', 'Errore durante l\'operazione');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar 
        barStyle={theme.dark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (hasChanges) {
              Alert.alert(
                'Modifiche non salvate',
                'Hai modifiche non salvate. Vuoi uscire senza salvare?',
                [
                  { text: 'Rimani', style: 'cancel' },
                  { text: 'Esci senza salvare', style: 'destructive', onPress: () => navigation.goBack() }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurazione Ferie e Permessi</Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetToDefaults}
        >
          <MaterialCommunityIcons name="restore" size={20} color="#FF9800" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ferie Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader
            title="Ferie (Ore)"
            icon="beach"
            iconColor="#4CAF50"
            theme={theme}
          />
          <Text style={styles.sectionDescription}>
            Inserisci i valori dalla tua busta paga. Il residuo si aggiorna automaticamente.
          </Text>

          <InputRow label="Res. anni precedenti (ore)" icon="calendar-import" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.ferieResAnniPrec.toString()}
              onChangeText={v => handleInputChange('ferieResAnniPrec', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <InputRow label="Ore per mese (da contratto)" icon="calendar-plus" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.ferieMaturatiMensili.toString()}
              onChangeText={v => handleInputChange('ferieMaturatiMensili', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="calculator" size={16} color="#388e3c" />
            <Text style={styles.infoText}>
              {`Maturate automaticamente (mese ${new Date().getMonth() + 1}): ${((parseFloat(settings.ferieMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore\nDisponibili ad oggi (res. + maturate): ${((parseFloat(settings.ferieResAnniPrec) || 0) + (parseFloat(settings.ferieMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore`}
            </Text>
          </View>
        </ModernCard>

        {/* Permessi ROA Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader
            title="Permessi Riduzione Orario (Ore)"
            icon="account-clock"
            iconColor="#2196F3"
            theme={theme}
          />
          <Text style={styles.sectionDescription}>
            Inserisci i valori dalla tua busta paga. Il residuo si aggiorna automaticamente.
          </Text>

          <InputRow label="Res. anni precedenti (ore)" icon="calendar-import" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.permROAResAnniPrec.toString()}
              onChangeText={v => handleInputChange('permROAResAnniPrec', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <InputRow label="Ore per mese (da contratto)" icon="calendar-plus" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.permROAMaturatiMensili.toString()}
              onChangeText={v => handleInputChange('permROAMaturatiMensili', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="calculator" size={16} color="#1976d2" />
            <Text style={styles.infoText}>
              {`Maturate automaticamente (mese ${new Date().getMonth() + 1}): ${((parseFloat(settings.permROAMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore\nDisponibili ad oggi (res. + maturate): ${((parseFloat(settings.permROAResAnniPrec) || 0) + (parseFloat(settings.permROAMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore`}
            </Text>
          </View>
        </ModernCard>

        {/* Permessi Ex Festività Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader
            title="Permessi Ex Festività (Ore)"
            icon="star-circle-outline"
            iconColor="#FF9800"
            theme={theme}
          />
          <Text style={styles.sectionDescription}>
            Inserisci i valori dalla tua busta paga. Il residuo si aggiorna automaticamente.
          </Text>

          <InputRow label="Res. anni precedenti (ore)" icon="calendar-import" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.permFestResAnniPrec.toString()}
              onChangeText={v => handleInputChange('permFestResAnniPrec', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <InputRow label="Ore per mese (da contratto)" icon="calendar-plus" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.permFestMaturatiMensili.toString()}
              onChangeText={v => handleInputChange('permFestMaturatiMensili', v)}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </InputRow>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="calculator" size={16} color="#f57c00" />
            <Text style={styles.infoText}>
              {`Maturate automaticamente (mese ${new Date().getMonth() + 1}): ${((parseFloat(settings.permFestMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore\nDisponibili ad oggi (res. + maturate): ${((parseFloat(settings.permFestResAnniPrec) || 0) + (parseFloat(settings.permFestMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore`}
            </Text>
          </View>
        </ModernCard>

        {/* Conteggio Giorni Ferie Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader
            title="Conteggio Giorni Ferie"
            icon="calendar-week"
            iconColor="#2196F3"
            theme={theme}
          />
          <Text style={styles.sectionDescription}>
            Configura quali giorni vengono sottratti dal saldo ferie quando inserisci una richiesta
          </Text>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="calendar-weekend" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Sabato è lavorativo</Text>
                <Text style={styles.switchDescription}>Il sabato consuma un giorno di ferie</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.countSaturdayAsWorkday && styles.switchActive]}
                onPress={() => handleInputChange('countSaturdayAsWorkday', !settings.countSaturdayAsWorkday)}
              >
                <View style={[styles.switchThumb, settings.countSaturdayAsWorkday && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="calendar-weekend-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Domenica è lavorativa</Text>
                <Text style={styles.switchDescription}>La domenica consuma un giorno di ferie</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.countSundayAsWorkday && styles.switchActive]}
                onPress={() => handleInputChange('countSundayAsWorkday', !settings.countSundayAsWorkday)}
              >
                <View style={[styles.switchThumb, settings.countSundayAsWorkday && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="star-circle-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Festivi sono lavorativi</Text>
                <Text style={styles.switchDescription}>I giorni festivi nazionali consumano ferie</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.countHolidaysAsWorkday && styles.switchActive]}
                onPress={() => handleInputChange('countHolidaysAsWorkday', !settings.countHolidaysAsWorkday)}
              >
                <View style={[styles.switchThumb, settings.countHolidaysAsWorkday && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={16} color="#1976d2" />
            <Text style={styles.infoText}>
              {`Impostazione attuale: ${[
                !settings.countSaturdayAsWorkday && 'sabato',
                !settings.countSundayAsWorkday && 'domenica',
                !settings.countHolidaysAsWorkday && 'festivi'
              ].filter(Boolean).join(', ') || 'nessuna esclusione'} non conteggiati come giorni di ferie`}
            </Text>
          </View>
        </ModernCard>

        {/* Altre Configurazioni Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader 
            title="Altre Configurazioni" 
            icon="cog" 
            iconColor="#9C27B0" 
            theme={theme}
          />

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Auto-approvazione</Text>
                <Text style={styles.switchDescription}>Approva automaticamente le richieste (uso personale)</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.autoApprovalEnabled && styles.switchActive]}
                onPress={() => {
                  handleInputChange('autoApprovalEnabled', !settings.autoApprovalEnabled);
                }}
              >
                <View style={[styles.switchThumb, settings.autoApprovalEnabled && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="calendar-edit" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Auto-compilazione inserimenti</Text>
                <Text style={styles.switchDescription}>Compila automaticamente ferie/malattia/riposo nel form</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.autoCompileTimeEntry && styles.switchActive]}
                onPress={() => {
                  handleInputChange('autoCompileTimeEntry', !settings.autoCompileTimeEntry);
                }}
              >
                <View style={[styles.switchThumb, settings.autoCompileTimeEntry && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialCommunityIcons name="medical-bag" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.switchLabel}>Gestione malattie</Text>
                <Text style={styles.switchDescription}>Abilita tracking giorni di malattia</Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.sickLeaveEnabled && styles.switchActive]}
                onPress={() => {
                  handleInputChange('sickLeaveEnabled', !settings.sickLeaveEnabled);
                }}
              >
                <View style={[styles.switchThumb, settings.sickLeaveEnabled && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <InputRow label="Data inizio anno lavorativo" icon="calendar-start" theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.startDate}
              onChangeText={v => handleInputChange('startDate', v)}
              placeholder="2025-01-01"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </InputRow>
        </ModernCard>

        {/* Azioni Auto-approvazione */}
        {settings.autoApprovalEnabled && (
          <ModernCard style={styles.cardSpacing} theme={theme}>
            <SectionHeader 
              title="Azioni Auto-approvazione" 
              icon="check-circle-outline" 
              iconColor="#4CAF50" 
              theme={theme}
            />
            
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAutoApproveAll}
              >
                <MaterialCommunityIcons name="check-all" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Approva tutte le richieste in attesa</Text>
              </TouchableOpacity>
              <Text style={styles.actionButtonDescription}>
                Approva automaticamente tutte le richieste di ferie/permessi attualmente in attesa
              </Text>
            </View>
          </ModernCard>
        )}

        {/* Riepilogo Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader
            title="Riepilogo Configurazione"
            icon="file-document-outline"
            iconColor="#607D8B"
            theme={theme}
          />

          <InputRow label="Anno di competenza" icon="calendar-today" required theme={theme}>
            <TextInput
              style={styles.modernInput}
              value={settings.currentYear.toString()}
              onChangeText={v => handleInputChange('currentYear', v)}
              placeholder={new Date().getFullYear().toString()}
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </InputRow>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mese attuale:</Text>
              <Text style={styles.summaryValue}>{new Date().getMonth() + 1} / 12</Text>
            </View>
            {/* Ferie */}
            <View style={[styles.summaryRow, { marginTop: 6 }]}>
              <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>Ferie maturate ad oggi:</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {((parseFloat(settings.ferieResAnniPrec) || 0) + (parseFloat(settings.ferieMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore
              </Text>
            </View>
            {remaining && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#888' }]}>  Godute:</Text>
                <Text style={[styles.summaryValue, { color: '#888' }]}>−{(remaining.usedVacation || 0).toFixed(2)} ore</Text>
              </View>
            )}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#4CAF5033', marginTop: 2, paddingTop: 3 }]}>
              <Text style={[styles.summaryLabel, { color: '#4CAF50', fontWeight: '700' }]}>Ferie residue:</Text>
              <Text style={[styles.summaryValue, { color: remaining ? (remaining.vacation >= 0 ? '#4CAF50' : '#FF5252') : '#4CAF50', fontWeight: '700' }]}>
                {remaining
                  ? `${(remaining.vacation || 0).toFixed(2)} ore`
                  : `${((parseFloat(settings.ferieResAnniPrec) || 0) + (parseFloat(settings.ferieMaturatiMensili) || 0) * (new Date().getMonth() + 1)).toFixed(2)} ore`}
              </Text>
            </View>

            {/* Permessi */}
            <View style={[styles.summaryRow, { marginTop: 10 }]}>
              <Text style={[styles.summaryLabel, { color: '#2196F3' }]}>Permessi maturati ad oggi:</Text>
              <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                {(
                  (parseFloat(settings.permROAResAnniPrec) || 0) + (parseFloat(settings.permROAMaturatiMensili) || 0) * (new Date().getMonth() + 1) +
                  (parseFloat(settings.permFestResAnniPrec) || 0) + (parseFloat(settings.permFestMaturatiMensili) || 0) * (new Date().getMonth() + 1)
                ).toFixed(2)} ore
              </Text>
            </View>
            {remaining && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#888' }]}>  Goduti:</Text>
                <Text style={[styles.summaryValue, { color: '#888' }]}>−{(remaining.usedPermits || 0).toFixed(2)} ore</Text>
              </View>
            )}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#2196F333', marginTop: 2, paddingTop: 3 }]}>
              <Text style={[styles.summaryLabel, { color: '#2196F3', fontWeight: '700' }]}>Permessi residui:</Text>
              <Text style={[styles.summaryValue, { color: remaining ? (remaining.permits >= 0 ? '#2196F3' : '#FF5252') : '#2196F3', fontWeight: '700' }]}>
                {remaining
                  ? `${(remaining.permits || 0).toFixed(2)} ore`
                  : `${(
                      (parseFloat(settings.permROAResAnniPrec) || 0) + (parseFloat(settings.permROAMaturatiMensili) || 0) * (new Date().getMonth() + 1) +
                      (parseFloat(settings.permFestResAnniPrec) || 0) + (parseFloat(settings.permFestMaturatiMensili) || 0) * (new Date().getMonth() + 1)
                    ).toFixed(2)} ore`}
              </Text>
            </View>
          </View>
        </ModernCard>
      </ScrollView>

      {/* Pulsanti Fluttuanti */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.cancelButton]}
          onPress={() => {
            if (hasChanges) {
              Alert.alert(
                'Modifiche non salvate',
                'Hai modifiche non salvate. Vuoi uscire senza salvare?',
                [
                  { text: 'Rimani', style: 'cancel' },
                  { text: 'Esci senza salvare', style: 'destructive', onPress: () => navigation.goBack() }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Annulla</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.floatingButton, 
            styles.saveButton,
            !hasChanges && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <MaterialCommunityIcons name="content-save" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Salva</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
  },
  resetButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.dark ? 'rgba(255, 152, 0, 0.15)' : '#fff3e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  modernCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  requiredMark: {
    color: '#f44336',
  },
  inputContainer: {
    flex: 1,
  },
  modernInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(33, 150, 243, 0.15)' : '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
  },
  switchContainer: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: 8,
    marginRight: 8,
  },
  switchDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  summaryContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        paddingBottom: 34, // Safe area per iPhone
      },
    }),
  },
  floatingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Stili per il pulsante di auto-approvazione
  actionButtonContainer: {
    paddingVertical: 16,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VacationSettingsScreen;
