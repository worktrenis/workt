import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Constants from 'expo-constants';

/**
 * 🎭 BANNER MODALITÀ DEVELOPMENT
 * 
 * Banner animato che mostra chiaramente la modalità di sviluppo
 */
const DevelopmentBanner = () => {
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Mostra solo in modalità sviluppo
  if (!__DEV__) {
    return null;
  }

  useEffect(() => {
    // Animazione fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Determina il tipo di build e colori
  const getBuildInfo = () => {
    const isExpoGo = Constants.appOwnership === 'expo';
    const isStandalone = Constants.appOwnership === 'standalone';
    
    if (isExpoGo) {
      return {
        title: '🚀 EXPO GO DEVELOPMENT',
        subtitle: 'Modalità sviluppo con hot reload',
        backgroundColor: '#4ECDC4',
        textColor: '#FFFFFF'
      };
    } else if (isStandalone) {
      return {
        title: '📱 NATIVE DEVELOPMENT BUILD',
        subtitle: 'Build nativa in modalità sviluppo',
        backgroundColor: '#45B7D1',
        textColor: '#FFFFFF'
      };
    } else {
      return {
        title: '🔧 DEVELOPMENT MODE',
        subtitle: 'Modalità sviluppo attiva',
        backgroundColor: '#FF6B6B',
        textColor: '#FFFFFF'
      };
    }
  };

  const buildInfo = getBuildInfo();
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || Constants.manifest?.runtimeVersion || 'N/A';
  const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || 'N/A';

  return (
    <Animated.View 
      style={[
        styles.bannerContainer, 
        { 
          backgroundColor: buildInfo.backgroundColor,
          opacity: fadeAnim 
        }
      ]}
      pointerEvents="none"
    >
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerTitle, { color: buildInfo.textColor }]}>
          {buildInfo.title}
        </Text>
        <Text style={[styles.bannerSubtitle, { color: buildInfo.textColor }]}>
          {buildInfo.subtitle}
        </Text>
        <Text style={[styles.bannerVersion, { color: buildInfo.textColor }]}>
          App v{appVersion} • Runtime {runtimeVersion}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    elevation: 9998,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 2,
  },
  bannerVersion: {
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default DevelopmentBanner;
