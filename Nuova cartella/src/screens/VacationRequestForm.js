import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Switch,
  Platform,
} from 'react-native';
import { StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme, lightTheme } from '../contexts/ThemeContext';
import VacationService from '../services/VacationService';
import { formatDate } from '../utils';

// Componenti moderni identici al TimeEntryForm
const ModernCard = ({ children, style, theme }) => {
  const safeTheme = theme || lightTheme;
  return (
    <View style={[createStyles(safeTheme).modernCard, style]}>
      {children}
    </View>
  );
};

const SectionHeader = ({ title, icon, iconColor = '#666', onPress, expandable = false, expanded = false, theme }) => {
  const safeTheme = theme || lightTheme;
  return (
    <TouchableOpacity
      style={createStyles(safeTheme).sectionHeader}
      onPress={onPress}
      activeOpacity={expandable ? 0.7 : 1}
      disabled={!expandable}
    >
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={createStyles(safeTheme).sectionTitle}>{title}</Text>
      {expandable && (
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={safeTheme.colors.textSecondary} 
        />
      )}
    </TouchableOpacity>
  );
};

const InputRow = ({ label, children, required = false, theme }) => {
  const safeTheme = theme || lightTheme;
  return (
    <View style={createStyles(safeTheme).inputRow}>
      <Text style={createStyles(safeTheme).inputLabel}>
        {label}
        {required && <Text style={createStyles(safeTheme).requiredMark}> *</Text>}
      </Text>
      {children}
    </View>
  );
};

// NOTE: ModernSwitch e InfoBadge spostati dentro il componente principale

const requestTypes = [
  { label: 'Ferie', value: 'vacation', color: '#4CAF50', icon: 'beach' },
  { label: 'Permesso', value: 'permit', color: '#FF9800', icon: 'clock-outline' },
  { label: 'Malattia', value: 'sick', color: '#f44336', icon: 'medical-bag' },
  { label: 'Congedo', value: 'leave', color: '#9C27B0', icon: 'account-clock' },
];

const priorityLevels = [
  { label: 'Normale', value: 'normal', color: '#2196F3' },
  { label: 'Urgente', value: 'urgent', color: '#FF5722' },
  { label: 'Molto urgente', value: 'critical', color: '#f44336' },
];

const VacationRequestForm = ({ route, navigation }) => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  const styles = createStyles(theme);
  const ModernSwitch = ({ label, value, onValueChange, description }) => (
    <View style={styles.switchRow}>
      <View style={styles.switchContent}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description && <Text style={styles.switchDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
        thumbColor={value ? '#4CAF50' : '#f4f3f4'}
      />
    </View>
  );
  const InfoBadge = ({ label, value, color = '#4CAF50', backgroundColor = '#E8F5E9' }) => (
    <View style={[styles.infoBadge, { backgroundColor }]}>
      <Text style={[styles.infoBadgeLabel, { color }]}>{label}</Text>
      {value && <Text style={[styles.infoBadgeValue, { color }]}>{value}</Text>}
    </View>
  );
  const today = new Date();
  const [form, setForm] = useState({
    type: 'vacation',
    startDate: formatDate(today),
    endDate: formatDate(today),
    hours: '',
    reason: '',
    notes: '',
    priority: 'normal',
    halfDay: false,
    morningOnly: false,
    afternoonOnly: false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState(null);
  const [datePickerMode, setDatePickerMode] = useState('date');
  const [remainingDays, setRemainingDays] = useState({ vacation: 0, permits: 0 });
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculatedWorkingDays, setCalculatedWorkingDays] = useState(0);

  // Estrai parametri per modalità modifica
  const isEdit = route?.params?.isEdit;
  const requestToEdit = route?.params?.request;
  const requestId = requestToEdit?.id;

  // Carica dati in modalità modifica
  useEffect(() => {
    if (isEdit && requestToEdit) {
      setForm({
        type: requestToEdit.type || 'vacation',
        startDate: requestToEdit.startDate ? formatDate(new Date(requestToEdit.startDate)) : formatDate(today),
        endDate: requestToEdit.endDate ? formatDate(new Date(requestToEdit.endDate)) : formatDate(today),
        hours: requestToEdit.hours?.toString() || '',
        reason: requestToEdit.reason || '',
        notes: requestToEdit.notes || '',
        priority: requestToEdit.priority || 'normal',
        halfDay: requestToEdit.halfDay || false,
        morningOnly: requestToEdit.morningOnly || false,
        afternoonOnly: requestToEdit.afternoonOnly || false,
      });
    }
  }, [isEdit, requestToEdit]);

  // Carica giorni residui
  useEffect(() => {
    loadRemainingDays();
  }, []);

  // Calcola giorni quando cambiano le date
  useEffect(() => {
    if (form.startDate && form.endDate && form.type === 'vacation') {
      calculateDays();
    }
  }, [form.startDate, form.endDate, form.type, form.halfDay]);

  const loadRemainingDays = async () => {
    const remaining = await VacationService.calculateRemainingDays();
    setRemainingDays(remaining);
  };

  const calculateDays = () => {
    if (!form.startDate || !form.endDate) return;
    
    const start = new Date(form.startDate.split('/').reverse().join('-'));
    const end = new Date(form.endDate.split('/').reverse().join('-'));
    
    const totalDays = VacationService.calculateDaysBetween(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    
    const workingDays = VacationService.calculateWorkingDays(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
    
    setCalculatedDays(form.halfDay ? totalDays * 0.5 : totalDays);
    setCalculatedWorkingDays(form.halfDay ? workingDays * 0.5 : workingDays);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      if (dateField === 'startDate') {
        setForm({ ...form, startDate: formattedDate });
      } else if (dateField === 'endDate') {
        setForm({ ...form, endDate: formattedDate });
      }
    }
    setDateField(null);
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    try {
      // Prepara i dati per il salvataggio
      const requestData = {
        ...form,
        startDate: form.startDate.split('/').reverse().join('-'),
        endDate: form.type === 'vacation' ? form.endDate.split('/').reverse().join('-') : form.startDate.split('/').reverse().join('-'),
        hours: form.type === 'permit' ? parseFloat(form.hours) || 0 : 0,
      };

      // Valida la richiesta
      const validation = await VacationService.validateRequest(requestData);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        Alert.alert('Errore', firstError);
        return;
      }

      // Salva o aggiorna
      if (isEdit) {
        await VacationService.updateVacationRequest(requestId, requestData);
        Alert.alert('Successo', 'Richiesta aggiornata con successo!');
      } else {
        await VacationService.addVacationRequest(requestData);
        Alert.alert('Successo', 'Richiesta inviata con successo!');
      }

      // Naviga di ritorno alla schermata VacationManagement con refresh
      navigation.navigate('VacationManagement', { refresh: true });
    } catch (error) {
      console.error('Errore salvataggio richiesta:', error);
      Alert.alert('Errore', 'Errore durante il salvataggio della richiesta');
    }
  };

  const handleDelete = async () => {
    if (!requestId) return;
    
    Alert.alert(
      'Conferma eliminazione',
      'Sei sicuro di voler eliminare questa richiesta? L\'operazione non è reversibile.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await VacationService.deleteVacationRequest(requestId);
              Alert.alert('Eliminata', 'Richiesta eliminata con successo.');
              navigation.navigate('VacationManagement', { refresh: true });
            } catch (error) {
              Alert.alert('Errore', 'Errore durante l\'eliminazione della richiesta.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={theme.dark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.background} 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifica Richiesta' : 'Nuova Richiesta'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Giorni Residui Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader 
            title="Giorni Disponibili" 
            icon="calendar-check" 
            iconColor="#4CAF50" 
            theme={theme}
          />
          
          <View style={styles.remainingDaysContainer}>
            <InfoBadge 
              label="Ferie residue"
              value={`${remainingDays.vacation} giorni`}
              color="#4CAF50"
              backgroundColor="#E8F5E9"
            />
            <InfoBadge 
              label="Permessi residui"
              value={`${remainingDays.permits} ore`}
              color="#FF9800"
              backgroundColor="#FFF3E0"
            />
          </View>
        </ModernCard>

        {/* Tipo Richiesta Card */}
        <ModernCard style={styles.cardSpacing} theme={theme}>
          <SectionHeader 
            title="Tipo Richiesta" 
            icon="clipboard-list" 
            iconColor="#2196F3" 
            theme={theme}
          />
          
          <View style={styles.typeContainer}>
            {requestTypes.map(type => {
              const isSelected = form.type === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    isSelected && { backgroundColor: type.color, borderColor: type.color }
                  ]}
                  onPress={() => handleChange('type', type.value)}
                >
                  <MaterialCommunityIcons 
                    name={type.icon} 
                    size={16} 
                    color={isSelected ? 'white' : type.color} 
                  />
                  <Text style={[
                    styles.typeChipText,
                    isSelected && { color: 'white', fontWeight: '600' }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ModernCard>

        {/* Date Card */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Date" 
            icon="calendar-range" 
            iconColor="#FF9800" 
          />
          
          <InputRow label="Data inizio" required>
            <TouchableOpacity 
              style={styles.dateInputField}
              onPress={() => { setDateField('startDate'); setShowDatePicker(true); setDatePickerMode('date'); }}
            >
              <MaterialCommunityIcons name="calendar-outline" size={20} color="#2196F3" />
              <Text style={styles.dateText}>{form.startDate}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </InputRow>

          {form.type === 'vacation' && (
            <InputRow label="Data fine" required>
              <TouchableOpacity 
                style={styles.dateInputField}
                onPress={() => { setDateField('endDate'); setShowDatePicker(true); setDatePickerMode('date'); }}
              >
                <MaterialCommunityIcons name="calendar-outline" size={20} color="#2196F3" />
                <Text style={styles.dateText}>{form.endDate}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </InputRow>
          )}

          {form.type === 'vacation' && (
            <ModernSwitch
              label="Mezza giornata"
              value={form.halfDay}
              onValueChange={(value) => handleChange('halfDay', value)}
              description="Richiesta per mezza giornata"
            />
          )}

          {form.type === 'permit' && (
            <InputRow label="Ore permesso" required>
              <TextInput
                style={styles.modernInput}
                value={form.hours}
                onChangeText={v => handleChange('hours', v)}
                placeholder="es. 2, 4, 8"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </InputRow>
          )}

          {/* Calcolo giorni per ferie */}
          {form.type === 'vacation' && calculatedDays > 0 && (
            <View style={styles.calculationInfo}>
              <MaterialCommunityIcons name="calculator" size={16} color="#2196F3" />
              <Text style={styles.calculationText}>
                Totale: {calculatedDays} giorni ({calculatedWorkingDays} giorni lavorativi)
              </Text>
            </View>
          )}
        </ModernCard>

        {/* Dettagli Card */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Dettagli" 
            icon="text-box" 
            iconColor="#9C27B0" 
          />
          
          <InputRow label="Motivo" required>
            <TextInput
              style={styles.modernInput}
              value={form.reason}
              onChangeText={v => handleChange('reason', v)}
              placeholder="Motivo della richiesta"
              placeholderTextColor="#999"
            />
          </InputRow>

          <InputRow label="Priorità">
            <View style={styles.priorityContainer}>
              {priorityLevels.map(priority => {
                const isSelected = form.priority === priority.value;
                return (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.priorityChip,
                      isSelected && { backgroundColor: priority.color, borderColor: priority.color }
                    ]}
                    onPress={() => handleChange('priority', priority.value)}
                  >
                    <Text style={[
                      styles.priorityChipText,
                      isSelected && { color: 'white', fontWeight: '600' }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </InputRow>

          <InputRow label="Note aggiuntive">
            <TextInput
              style={styles.notesInput}
              value={form.notes}
              onChangeText={v => handleChange('notes', v)}
              placeholder="Note aggiuntive (opzionale)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </InputRow>
        </ModernCard>
      </ScrollView>

      {/* Pulsanti Fluttuanti */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Annulla</Text>
        </TouchableOpacity>
        
        {isEdit && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="delete" size={24} color="white" />
            <Text style={styles.floatingButtonText}>Elimina</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.floatingButton, styles.saveButton]}
          onPress={handleSave}
        >
          <MaterialCommunityIcons name="content-save" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Salva</Text>
        </TouchableOpacity>
      </View>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode={datePickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

// Stili identici al TimeEntryForm
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requiredMark: {
    color: '#f44336',
  },
  modernInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    gap: 6,
    minWidth: 80,
  },
  typeChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  priorityChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchContent: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
  },
  remainingDaysContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBadge: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  infoBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBadgeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  calculationText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  floatingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default VacationRequestForm;
