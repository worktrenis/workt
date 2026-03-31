import React, { useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Componente per animazioni di pressione
export const PressableAnimated = ({ children, onPress, style, ...props }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Componente per fade in delle card
export const FadeInCard = ({ children, delay = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Componente per loading skeleton delle card
export const CardSkeleton = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={{
        backgroundColor: '#f0f0f0',
        borderRadius: 16,
        margin: 4,
        padding: 16,
        opacity,
      }}
    >
      <Animated.View
        style={{
          height: 20,
          backgroundColor: '#e0e0e0',
          borderRadius: 4,
          marginBottom: 12,
        }}
      />
      <Animated.View
        style={{
          height: 60,
          backgroundColor: '#e0e0e0',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      <Animated.View
        style={{
          height: 40,
          backgroundColor: '#e0e0e0',
          borderRadius: 6,
        }}
      />
    </Animated.View>
  );
};

// Componente EnhancedTimeSlot per visualizzare slot temporali dettagliati
export const EnhancedTimeSlot = ({ icon, label, timeInfo, color, importance = 'medium' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0.8)).current;

  if (!timeInfo || (!timeInfo.start && !timeInfo.end)) return null;

  const handlePress = () => {
    setIsExpanded(!isExpanded);
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isExpanded ? 1 : 1.02,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.timing(opacityValue, {
        toValue: isExpanded ? 0.8 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getBorderWidth = () => {
    switch (importance) {
      case 'high': return 2;
      case 'medium': return 1;
      case 'low': return 0.5;
      default: return 1;
    }
  };

  return (
    <Animated.View style={[
      enhancedTimeSlotStyles.container,
      { 
        borderLeftColor: color,
        borderLeftWidth: getBorderWidth(),
        transform: [{ scale: scaleValue }],
        opacity: opacityValue
      }
    ]}>
      <TouchableOpacity onPress={handlePress} style={enhancedTimeSlotStyles.header}>
        <View style={enhancedTimeSlotStyles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
        </View>
        <View style={enhancedTimeSlotStyles.timeInfo}>
          <Text style={enhancedTimeSlotStyles.label}>{label}</Text>
          <View style={enhancedTimeSlotStyles.timeDetails}>
            <Text style={enhancedTimeSlotStyles.timeRange}>
              {timeInfo.start} - {timeInfo.end}
            </Text>
            {timeInfo.duration && (
              <Text style={[enhancedTimeSlotStyles.duration, { color }]}>
                {timeInfo.duration}h
              </Text>
            )}
          </View>
        </View>
        {timeInfo.context && (
          <Text style={enhancedTimeSlotStyles.context}>{timeInfo.context}</Text>
        )}
      </TouchableOpacity>
      
      {isExpanded && (
        <Animated.View style={enhancedTimeSlotStyles.expandedContent}>
          <Text style={enhancedTimeSlotStyles.expandedText}>
            Durata: {timeInfo.duration}h • Importanza: {importance}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Componente QuickStat per statistiche rapide
export const QuickStat = ({ icon, label, value, color, isHighlight = false }) => {
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlight) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isHighlight, pulseValue]);

  return (
    <Animated.View style={[
      quickStatStyles.container,
      isHighlight && quickStatStyles.highlighted,
      { transform: [{ scale: pulseValue }] }
    ]}>
      <View style={[quickStatStyles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
      </View>
      <View style={quickStatStyles.textContainer}>
        <Text style={quickStatStyles.label}>{label}</Text>
        <Text style={[quickStatStyles.value, { color }]}>{value}</Text>
      </View>
    </Animated.View>
  );
};

// Stili per EnhancedTimeSlot
const enhancedTimeSlotStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  timeInfo: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRange: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  duration: {
    fontSize: 12,
    fontWeight: '700',
  },
  context: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  expandedText: {
    fontSize: 11,
    color: '#666',
  },
});

// Stili per QuickStat
const quickStatStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    marginBottom: 4,
    minWidth: 80,
  },
  highlighted: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
});
