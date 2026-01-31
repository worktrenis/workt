import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

const normalize = (v) => {
  if (!v) return '';
  // remove non digits
  const digits = v.replace(/[^0-9]/g, '');
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ':' + digits.slice(2, 4);
};

export default function TimeInput({ value, onChange, placeholder = 'HH:mm', style, inputStyle, editable = true }) {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  const handleChange = (t) => {
    const n = normalize(t);
    setText(n);
    // if complete, call onChange with Date or string
    if (n && n.length === 5 && onChange) {
      // validate HH:mm
      const [hh, mm] = n.split(':').map(Number);
      if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
        onChange(n);
      } else {
        onChange(n); // still propagate to allow UI validation
      }
    } else if (onChange) {
      onChange(n);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder={placeholder}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
        maxLength={5}
        editable={editable}
        style={[styles.input, inputStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: 16,
    textAlign: 'center',
  },
});
