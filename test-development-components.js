/**
 * 🎭 TESTER COMPONENTI DEVELOPMENT
 * 
 * Comandi per testare e verificare i componenti di sviluppo
 */

// 🔍 CONTROLLA INFO BUILD CORRENTE
global.checkBuildInfo = () => {
  console.log('\n🔍 === INFO BUILD CORRENTE ===');
  
  const Constants = require('expo-constants').default;
  
  const buildInfo = {
    __DEV__: __DEV__,
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    isDevice: Constants.isDevice,
    platform: require('react-native').Platform.OS,
    appVersion: Constants.expoConfig?.version || Constants.manifest?.version,
    runtimeVersion: Constants.expoConfig?.runtimeVersion || Constants.manifest?.runtimeVersion,
    buildVersion: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode
  };
  
  console.log('📊 BUILD INFO:');
  Object.entries(buildInfo).forEach(([key, value]) => {
    console.log(`• ${key}: ${value}`);
  });
  
  // Determina tipo build
  let buildType = 'UNKNOWN';
  if (buildInfo.appOwnership === 'expo') {
    buildType = 'EXPO GO DEVELOPMENT';
  } else if (buildInfo.appOwnership === 'standalone' && buildInfo.__DEV__) {
    buildType = 'NATIVE DEVELOPMENT BUILD';
  } else if (buildInfo.appOwnership === 'standalone') {
    buildType = 'NATIVE PRODUCTION BUILD';
  }
  
  console.log(`\n🎯 TIPO BUILD: ${buildType}`);
  
  return {
    ...buildInfo,
    buildType
  };
};

// 🎨 TESTA COMPONENTI DEVELOPMENT VISIVAMENTE
global.testDevelopmentComponents = () => {
  console.log('\n🎨 === TEST COMPONENTI DEVELOPMENT ===');
  
  const buildInfo = global.checkBuildInfo();
  
  console.log('✅ COMPONENTI DEVELOPMENT:');
  console.log('• DevelopmentWatermark: Badge angolo superiore destro');
  console.log('• DevelopmentBanner: Banner inferiore animato');
  
  if (!buildInfo.__DEV__) {
    console.log('⚠️ ATTENZIONE: __DEV__ = false');
    console.log('• I componenti development NON saranno visibili');
    console.log('• Solo build di produzione/release nascondono i componenti');
  } else {
    console.log('✅ __DEV__ = true - Componenti visibili');
    
    console.log('\n🎯 COSA DOVRESTI VEDERE:');
    
    if (buildInfo.appOwnership === 'expo') {
      console.log('• Badge EXPO GO DEV (colore turchese)');
      console.log('• Banner "🚀 EXPO GO DEVELOPMENT"');
      console.log('• Informazioni versione e runtime');
    } else if (buildInfo.appOwnership === 'standalone') {
      console.log('• Badge NATIVE DEV (colore blu)');
      console.log('• Banner "📱 NATIVE DEVELOPMENT BUILD"');
      console.log('• Informazioni build nativa');
    }
  }
  
  return {
    buildType: buildInfo.buildType,
    componentsVisible: buildInfo.__DEV__,
    expectedBadgeColor: buildInfo.appOwnership === 'expo' ? 'turchese' : 'blu',
    expectedTitle: buildInfo.buildType
  };
};

// 🔄 SIMULA CAMBIO MODALITÀ (per test)
global.simulateBuildModeSwitch = () => {
  console.log('\n🔄 === SIMULAZIONE CAMBIO MODALITÀ ===');
  
  const currentInfo = global.checkBuildInfo();
  
  console.log('📋 MODALITÀ CORRENTE:', currentInfo.buildType);
  console.log('\n🎯 PER TESTARE DIVERSE MODALITÀ:');
  console.log('');
  console.log('1️⃣ EXPO GO DEVELOPMENT:');
  console.log('   • Avvia con: expo start');
  console.log('   • Apri con Expo Go app');
  console.log('   • Badge: EXPO GO DEV (turchese)');
  console.log('');
  console.log('2️⃣ NATIVE DEVELOPMENT:');
  console.log('   • Build: eas build --profile development');
  console.log('   • Installa APK/IPA con __DEV__ = true');
  console.log('   • Badge: NATIVE DEV (blu)');
  console.log('');
  console.log('3️⃣ NATIVE PRODUCTION:');
  console.log('   • Build: eas build --profile production');
  console.log('   • Installa APK/IPA con __DEV__ = false');
  console.log('   • Badge: NON VISIBILE (production)');
  
  return {
    current: currentInfo.buildType,
    instructions: 'Vedi console per istruzioni cambio modalità'
  };
};

console.log('\n🎭 COMANDI TESTER DEVELOPMENT CARICATI:');
console.log('• checkBuildInfo() - Info build corrente');
console.log('• testDevelopmentComponents() - Test componenti visivi');
console.log('• simulateBuildModeSwitch() - Istruzioni cambio modalità');
console.log('✅ Tester development pronto!\n');
