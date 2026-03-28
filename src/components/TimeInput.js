import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

const formatTime = (date) => {
  if (!(date instanceof Date)) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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

export default function TimeInput({ value, onChange, placeholder = 'HH:mm', style, inputStyle, editable = true, isEditing: externalIsEditing = false, onEditingChange }) {
  const [isEditing, setIsEditing] = useState(externalIsEditing);
  const [inputDigits, setInputDigits] = useState('');
  const [timeValue, setTimeValue] = useState(() => parseTime(value));

  useEffect(() => {
    setTimeValue(parseTime(value));
  }, [value]);

  // Sincronizza con prop esterna se fornita
  useEffect(() => {
    setIsEditing(externalIsEditing);
  }, [externalIsEditing]);

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
    setIsEditing(false);
    setInputDigits('');
  };

  const displayValue = timeValue ? formatTime(timeValue) : placeholder;

  if (isEditing) {
    return (
      <View style={[styles.editingContainer, style]}>
        <Text style={styles.editingDisplay}>{formatDigits(inputDigits)}</Text>
        <TextInput
          autoFocus
          value={inputDigits}
          onChangeText={(t) => setInputDigits(t.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
          style={styles.textInput}
          placeholder="HHmm"
          maxLength={4}
          onSubmitEditing={handleConfirm}
        />
        <View style={styles.editingButtons}>
          <TouchableOpacity
            style={[styles.confirmButton, !isValidDigits(inputDigits) && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={!isValidDigits(inputDigits)}
          >
            <Ionicons name="checkmark" size={20} color={isValidDigits(inputDigits) ? '#fff' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setIsEditing(false);
              setInputDigits('');
            }}
          >
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        if (!editable) return;
        setInputDigits(timeValue ? formatTime(timeValue).replace(':', '') : '');
        setIsEditing(true);
      }}
      style={[styles.button, editable ? styles.buttonActive : styles.buttonDisabled, inputStyle]}
    >
      <Text style={[styles.buttonText, editable ? styles.textActive : styles.textDisabled]}>
        {displayValue}
      </Text>
      <Ionicons name="pencil" size={16} color={editable ? '#666' : '#999'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 90,
  },
  buttonActive: {
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  textActive: {
    color: '#000',
  },
  textDisabled: {
    color: '#999',
  },
  editingContainer: {
    borderWidth: 2,
    borderColor: '#1e88e5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    gap: 10,
  },
  editingDisplay: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  editingButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  confirmButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#d0d0d0',
  },
});
