// 🔔 COMPONENTE BADGE NOTIFICHE SISTEMA
// Badge per mostrare il numero di notifiche non lette

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import useSystemNotifications from '../hooks/useSystemNotifications';

const SystemNotificationBadge = ({ 
  onPress, 
  style,
  showIcon = true,
  showCount = true,
  showHighPriority = true,
  iconSize = 24,
  badgeSize = 'normal', // 'small', 'normal', 'large'
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  animateOnUpdate = true
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, badgeSize, position);
  
  const {
    stats,
    loading,
    error
  } = useSystemNotifications({
    autoRefresh: true,
    refreshInterval: 15000, // Aggiorna ogni 15 secondi
    enableRealTimeUpdates: false // Solo lettura per il badge
  });

  // Calcola contatori
  const unreadCount = stats.unread || 0;
  const highPriorityCount = stats.highPriority || 0;
  const totalCount = stats.total || 0;

  // Non mostrare se non ci sono notifiche o se c'è un errore
  if (loading || error || (unreadCount === 0 && !showIcon)) {
    return null;
  }

  // Determina quale contatore mostrare
  let displayCount = 0;
  let badgeColor = theme.colors.primary;
  let badgeText = '';

  if (showHighPriority && highPriorityCount > 0) {
    displayCount = highPriorityCount;
    badgeColor = '#F44336'; // Rosso per alta priorità
    badgeText = highPriorityCount > 99 ? '99+' : highPriorityCount.toString();
  } else if (showCount && unreadCount > 0) {
    displayCount = unreadCount;
    badgeColor = '#2196F3'; // Blu per non lette
    badgeText = unreadCount > 99 ? '99+' : unreadCount.toString();
  }

  const handlePress = () => {
    if (onPress) {
      onPress({
        unreadCount,
        highPriorityCount,
        totalCount,
        stats
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {/* Icona */}
      {showIcon && (
        <MaterialCommunityIcons
          name={unreadCount > 0 ? "bell" : "bell-outline"}
          size={iconSize}
          color={unreadCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
        />
      )}
      
      {/* Badge contatore */}
      {displayCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
      
      {/* Indicatore alta priorità aggiuntivo */}
      {showHighPriority && highPriorityCount > 0 && showCount && unreadCount > highPriorityCount && (
        <View style={styles.priorityIndicator}>
          <MaterialCommunityIcons
            name="alert"
            size={12}
            color="#F44336"
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

// 🎨 STILI
const createStyles = (theme, badgeSize, position) => {
  // Dimensioni badge basate sulla taglia
  const badgeSizes = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 10,
      paddingHorizontal: 4
    },
    normal: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 12,
      paddingHorizontal: 6
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      fontSize: 14,
      paddingHorizontal: 8
    }
  };

  // Posizione badge
  const badgePositions = {
    'top-right': { top: -8, right: -8 },
    'top-left': { top: -8, left: -8 },
    'bottom-right': { bottom: -8, right: -8 },
    'bottom-left': { bottom: -8, left: -8 }
  };

  const badgeStyle = badgeSizes[badgeSize] || badgeSizes.normal;
  const badgePosition = badgePositions[position] || badgePositions['top-right'];

  return StyleSheet.create({
    container: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      ...badgePosition,
      ...badgeStyle,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    badgeText: {
      color: 'white',
      fontSize: badgeStyle.fontSize,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    priorityIndicator: {
      position: 'absolute',
      top: -4,
      left: -4,
      backgroundColor: '#F44336',
      borderRadius: 8,
      padding: 2,
      borderWidth: 1,
      borderColor: theme.colors.background,
    }
  });
};

// 📊 COMPONENTE BADGE DETTAGLIATO
export const DetailedSystemNotificationBadge = ({ 
  onPress, 
  style,
  showLabels = true,
  horizontal = false 
}) => {
  const { theme } = useTheme();
  const styles = createDetailedStyles(theme, horizontal);
  
  const { stats, loading } = useSystemNotifications({
    autoRefresh: true,
    refreshInterval: 15000
  });

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  const unreadCount = stats.unread || 0;
  const highPriorityCount = stats.highPriority || 0;
  const totalCount = stats.total || 0;

  const handlePress = () => {
    if (onPress) {
      onPress({ unreadCount, highPriorityCount, totalCount, stats });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {/* Icona principale */}
      <MaterialCommunityIcons
        name="bell"
        size={24}
        color={unreadCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
      />
      
      {/* Contatori */}
      <View style={styles.countersContainer}>
        {/* Totali */}
        <View style={styles.counterItem}>
          <Text style={styles.counterNumber}>{totalCount}</Text>
          {showLabels && <Text style={styles.counterLabel}>Totali</Text>}
        </View>
        
        {/* Non lette */}
        {unreadCount > 0 && (
          <View style={[styles.counterItem, styles.unreadCounter]}>
            <Text style={[styles.counterNumber, styles.unreadNumber]}>{unreadCount}</Text>
            {showLabels && <Text style={styles.counterLabel}>Non Lette</Text>}
          </View>
        )}
        
        {/* Alta priorità */}
        {highPriorityCount > 0 && (
          <View style={[styles.counterItem, styles.priorityCounter]}>
            <Text style={[styles.counterNumber, styles.priorityNumber]}>{highPriorityCount}</Text>
            {showLabels && <Text style={styles.counterLabel}>Priorità</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createDetailedStyles = (theme, horizontal) => StyleSheet.create({
  container: {
    flexDirection: horizontal ? 'row' : 'column',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  countersContainer: {
    flexDirection: horizontal ? 'row' : 'column',
    marginTop: horizontal ? 0 : 8,
    marginLeft: horizontal ? 12 : 0,
  },
  counterItem: {
    alignItems: 'center',
    marginHorizontal: horizontal ? 8 : 0,
    marginVertical: horizontal ? 0 : 2,
  },
  counterNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  counterLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unreadCounter: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadNumber: {
    color: 'white',
  },
  priorityCounter: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityNumber: {
    color: 'white',
  }
});

// 🔥 COMPONENTE BADGE COMPATTO
export const CompactSystemNotificationBadge = ({ onPress, style }) => {
  const { theme } = useTheme();
  const { stats } = useSystemNotifications({
    autoRefresh: true,
    refreshInterval: 20000
  });

  const unreadCount = stats.unread || 0;
  const highPriorityCount = stats.highPriority || 0;

  if (unreadCount === 0 && highPriorityCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: highPriorityCount > 0 ? '#F44336' : '#2196F3',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 24,
        },
        style
      ]}
      onPress={() => onPress && onPress({ unreadCount, highPriorityCount })}
      activeOpacity={0.7}
    >
      {highPriorityCount > 0 && (
        <MaterialCommunityIcons
          name="alert"
          size={12}
          color="white"
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={{
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
      }}>
        {highPriorityCount > 0 ? highPriorityCount : unreadCount}
      </Text>
    </TouchableOpacity>
  );
};

export default SystemNotificationBadge;
