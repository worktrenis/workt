import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

/**
 * 🏷️ FILIGRANA MODALITÀ DEVELOPMENT
 * 
 * Componente che mostra informazioni sulla build solo in modalità sviluppo
 */
const DevelopmentWatermark = () => {
  // Mostra solo in modalità sviluppo
  if (!__DEV__) {
    return null;
  }

  // Determina il tipo di build
  const getBuildInfo = () => {
    const isExpoGo = Constants.appOwnership === 'expo';
    const isStandalone = Constants.appOwnership === 'standalone';
    const isDevBuild = __DEV__;
    
    let buildType = 'UNKNOWN';
    let color = '#FF6B6B';
    
    if (isExpoGo) {
      buildType = 'EXPO GO DEV';
      color = '#4ECDC4';
    } else if (isStandalone && isDevBuild) {
      buildType = 'NATIVE DEV';
      color = '#45B7D1';
    } else if (isStandalone) {
      buildType = 'NATIVE PROD';
      color = '#96CEB4';
    }
    
    return { buildType, color };
  };

  const { buildType, color } = getBuildInfo();
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || Constants.manifest?.runtimeVersion || 'N/A';
  const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || 'N/A';

  return (
    <View style={styles.watermarkContainer} pointerEvents="none">
      <View style={[styles.watermarkBadge, { backgroundColor: color }]}>
        <Text style={styles.buildTypeText}>{buildType}</Text>
        <Text style={styles.versionText}>v{appVersion}</Text>
        <Text style={styles.runtimeText}>RT {runtimeVersion}</Text>
      </View>
      
      {/* Indicatore angolo */}
      <View style={[styles.cornerIndicator, { borderTopColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  watermarkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  buildTypeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  versionText: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  runtimeText: {
    color: 'white',
    fontSize: 7,
    textAlign: 'center',
    opacity: 0.8,
  },
  cornerIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderLeftWidth: 15,
    borderLeftColor: 'transparent',
    opacity: 0.7,
  },
});

export default DevelopmentWatermark;
