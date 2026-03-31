import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Componente per visualizzare le icone dei tipi di giorni fissi
 */
const TypeIcon = ({ type, size = 16, color = '#666' }) => {
  const getIconName = (dayType) => {
    switch (dayType) {
      case 'ferie':
        return 'beach';
      case 'malattia':
        return 'medical-bag';
      case 'permesso':
        return 'calendar-clock';
      case 'riposo':
        return 'clock-time-eight';
      case 'festivo':
        return 'calendar-star';
      case 'straordinario':
        return 'clock-fast';
      default:
        return 'calendar-outline';
    }
  };

  return (
    <MaterialCommunityIcons
      name={getIconName(type)}
      size={size}
      color={color}
    />
  );
};

export default TypeIcon;
