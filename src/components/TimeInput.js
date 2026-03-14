import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

const formatTime = (date) => {
  if (!(date instanceof Date)) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const TIME_INPUT_MODE_KEY = '@workt:timeInputMode';

const TIME_INPUT_MODES = {
  KEYPAD: 'keypad',
  PICKER: 'picker',
  TEXT: 'text',
};

const parseTime = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};

export default function TimeInput({ value, onChange, placeholder = 'HH:mm', style, inputStyle, editable = true }) {
  const [showPicker, setShowPicker] = useState(false);
  const [timeValue, setTimeValue] = useState(() => parseTime(value));
  const [mode, setMode] = useState(TIME_INPUT_MODES.KEYPAD);
  const [modeSelectVisible, setModeSelectVisible] = useState(false);

  useEffect(() => {
    setTimeValue(parseTime(value));
  }, [value]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TIME_INPUT_MODE_KEY);
        if (stored && Object.values(TIME_INPUT_MODES).includes(stored)) {
          setMode(stored);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const persistMode = async (newMode) => {
    try {
      await AsyncStorage.setItem(TIME_INPUT_MODE_KEY, newMode);
    } catch (e) {
      // ignore
    }
  };

  const [inputDigits, setInputDigits] = useState('');

  const formatDigits = (digits) => {
    if (!digits) return placeholder;
    const padded = digits.padEnd(4, '_');
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
  };

  const isValidDigits = (digits) => {
    if (!digits || digits.length < 3) return false;
    const hh = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2, 4));
    return hh >= 0 && hh < 24 && mm >= 0 && mm < 60 && digits.length === 4;
  };

  const handleConfirm = () => {
    if (!isValidDigits(inputDigits)) return;
    const formatted = `${inputDigits.slice(0, 2)}:${inputDigits.slice(2, 4)}`;
    onChange && onChange(formatted);
    setTimeValue(parseTime(formatted));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setInputDigits(timeValue ? formatTime(timeValue).replace(':', '') : '');
  };

  const addDigit = (digit) => {
    if (inputDigits.length >= 4) return;
    setInputDigits(prev => prev + digit);
  };

  const removeDigit = () => {
    setInputDigits(prev => prev.slice(0, -1));
  };

  const displayValue = timeValue ? formatTime(timeValue) : placeholder;

  const handleModeSelection = (newMode) => {
    setMode(newMode);
    persistMode(newMode);
    setModeSelectVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!editable) return;
          setInputDigits(timeValue ? formatTime(timeValue).replace(':', '') : '');
          setShowPicker(true);
        }}
        onLongPress={() => {
          if (!editable) return;
          setModeSelectVisible(true);
        }}
        style={[styles.button, editable ? styles.buttonActive : styles.buttonDisabled, inputStyle]}
      >
        <View style={styles.displayRow}>
            <Text style={[styles.text, editable ? styles.textActive : styles.textDisabled]}>
              {displayValue}
            </Text>
            <Text style={styles.modeTag}>
              {mode === TIME_INPUT_MODES.KEYPAD ? 'Tastierino' : mode === TIME_INPUT_MODES.PICKER ? 'Selettore' : 'Testo'}
            </Text>
          </View>
      </TouchableOpacity>

      {modeSelectVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setModeSelectVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModeSelectVisible(false)}
          >
            <View style={styles.modeSelectorContainer}>
              <Text style={styles.modeSelectorHeader}>Modalità inserimento</Text>
              {Object.entries(TIME_INPUT_MODES).map(([key, value]) => (
                <TouchableOpacity
                  key={value}
                  style={styles.modeOption}
                  onPress={() => handleModeSelection(value)}
                >
                  <Text style={[styles.modeOptionText, mode === value && styles.modeOptionTextSelected]}>
                    {value === TIME_INPUT_MODES.KEYPAD ? 'Tastierino' : value === TIME_INPUT_MODES.PICKER ? 'Selettore' : 'Testo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showPicker && (
        <Modal transparent animationType="fade" onRequestClose={handleCancel}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCancel}>
            <View style={styles.pickerContainer}>
              <Text style={styles.keyboardHeader}>Inserisci orario</Text>

              {mode === TIME_INPUT_MODES.KEYPAD && (
                <>
                  <Text style={styles.keyboardDisplay}>{formatDigits(inputDigits)}</Text>
                  <View style={styles.keypadRow}>
                    {['1', '2', '3'].map(d => (
                      <TouchableOpacity key={d} style={styles.key} onPress={() => addDigit(d)}>
                        <Text style={styles.keyText}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.keypadRow}>
                    {['4', '5', '6'].map(d => (
                      <TouchableOpacity key={d} style={styles.key} onPress={() => addDigit(d)}>
                        <Text style={styles.keyText}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.keypadRow}>
                    {['7', '8', '9'].map(d => (
                      <TouchableOpacity key={d} style={styles.key} onPress={() => addDigit(d)}>
                        <Text style={styles.keyText}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.keypadRow}>
                    <TouchableOpacity style={styles.key} onPress={removeDigit}>
                      <Text style={styles.keyText}>←</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.key} onPress={() => addDigit('0')}>
                      <Text style={styles.keyText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.key, isValidDigits(inputDigits) ? styles.keyConfirm : styles.keyDisabled]}
                      onPress={handleConfirm}
                      disabled={!isValidDigits(inputDigits)}
                    >
                      <Text style={[styles.keyText, isValidDigits(inputDigits) ? styles.keyTextConfirm : styles.keyTextDisabled]}>
                        OK
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {mode === TIME_INPUT_MODES.PICKER && (
                <DateTimePicker
                  value={timeValue || new Date()}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, selected) => {
                    if (Platform.OS === 'android') {
                      setShowPicker(false);
                    }
                    if (selected) {
                      const formatted = formatTime(selected);
                      onChange && onChange(formatted);
                      setTimeValue(selected);
                    }
                  }}
                />
              )}

              {mode === TIME_INPUT_MODES.TEXT && (
                <>
                  <TextInput
                    value={inputDigits}
                    onChangeText={(t) => setInputDigits(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                    style={styles.textInput}
                    placeholder="HHmm"
                    maxLength={4}
                  />
                  <TouchableOpacity
                    style={[styles.key, isValidDigits(inputDigits) ? styles.keyConfirm : styles.keyDisabled]}
                    onPress={handleConfirm}
                    disabled={!isValidDigits(inputDigits)}
                  >
                    <Text style={[styles.keyText, isValidDigits(inputDigits) ? styles.keyTextConfirm : styles.keyTextDisabled]}>
                      OK
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Annulla</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
  },
  button: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  buttonActive: {
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
  },
  textActive: {
    color: '#000',
  },
  textDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  keyboardHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  keyboardDisplay: {
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  key: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  keyConfirm: {
    backgroundColor: '#4CAF50',
  },
  keyDisabled: {
    backgroundColor: '#d0d0d0',
  },
  keyTextConfirm: {
    color: '#fff',
  },
  keyTextDisabled: {
    color: '#888',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  modeTag: {
    fontSize: 12,
    color: '#666',
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modeSelectorContainer: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modeSelectorHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modeOption: {
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modeOptionText: {
    fontSize: 15,
    color: '#333',
  },
  modeOptionTextSelected: {
    fontWeight: '700',
    color: '#1e88e5',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 14,
  },
  cancelText: {
    color: '#f44336',
    fontWeight: '600',
  },
});
