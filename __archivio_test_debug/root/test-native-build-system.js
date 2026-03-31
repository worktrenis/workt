// 🧪 TEST SISTEMA BUILD NATIVA - Script per testare rilevamento aggiornamenti nativi
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

/**
 * Test completo del sistema di rilevamento build nativa
 */
export const testNativeBuildDetection = async () => {
  try {
    console.log('🧪 TEST: Sistema rilevamento build nativa...');
    
    // 1. Mostra informazioni build corrente
    console.log('📋 BUILD INFO CORRENTE:');
    const buildInfo = await global.getBuildInfo();
    console.log(buildInfo);
    
    // 2. Simula prima installazione
    console.log('\n🔄 TEST: Simulazione prima installazione...');
    await AsyncStorage.removeItem('last_known_build_version');
    await AsyncStorage.removeItem('last_known_app_version');
    
    setTimeout(async () => {
      const result1 = await global.checkNativeBuildUpdate();
      console.log('✅ Risultato prima installazione:', result1);
    }, 2000);
    
    // 3. Simula aggiornamento build nativa
    setTimeout(async () => {
      console.log('\n🔄 TEST: Simulazione aggiornamento build nativa...');
      await AsyncStorage.setItem('last_known_build_version', '10'); // Build precedente
      await AsyncStorage.setItem('last_known_app_version', '1.2.2'); // Versione precedente
      
      setTimeout(async () => {
        const result2 = await global.checkNativeBuildUpdate();
        console.log('✅ Risultato aggiornamento build:', result2);
      }, 1000);
    }, 4000);
    
    // 4. Test popup forzato
    setTimeout(() => {
      console.log('\n🎯 TEST: Popup forzato build nativa...');
      global.forceNativeBuildPopup();
    }, 6000);
    
    return true;
  } catch (error) {
    console.error('❌ TEST: Errore sistema build nativa:', error);
    return false;
  }
};

/**
 * Reset completo per nuovi test
 */
export const resetForNewTest = async () => {
  try {
    console.log('🔄 RESET: Preparazione per nuovo test...');
    
    await global.resetNativeBuildSystem();
    await AsyncStorage.removeItem('v1_3_0_popup_shown');
    
    console.log('✅ RESET: Sistema pronto per nuovo test');
    return true;
  } catch (error) {
    console.error('❌ RESET: Errore preparazione test:', error);
    return false;
  }
};

/**
 * Simula diversi scenari di aggiornamento
 */
export const testAllUpdateScenarios = async () => {
  try {
    console.log('🎬 TEST: Tutti gli scenari di aggiornamento...');
    
    // Scenario 1: Prima installazione
    await resetForNewTest();
    console.log('\n📱 SCENARIO 1: Prima installazione');
    await AsyncStorage.removeItem('last_known_build_version');
    await AsyncStorage.removeItem('last_known_app_version');
    
    setTimeout(async () => {
      await global.checkNativeBuildUpdate();
    }, 1000);
    
    // Scenario 2: Aggiornamento build nativa (Play Store/App Store)
    setTimeout(async () => {
      console.log('\n📱 SCENARIO 2: Aggiornamento build nativa');
      await AsyncStorage.setItem('last_known_build_version', '10');
      await AsyncStorage.setItem('last_known_app_version', '1.2.2');
      
      setTimeout(async () => {
        await global.checkNativeBuildUpdate();
      }, 1000);
    }, 3000);
    
    // Scenario 3: Aggiornamento versione app
    setTimeout(async () => {
      console.log('\n📱 SCENARIO 3: Aggiornamento versione app');
      const currentBuild = Application.nativeBuildVersion;
      await AsyncStorage.setItem('last_known_build_version', currentBuild);
      await AsyncStorage.setItem('last_known_app_version', '1.2.0');
      
      setTimeout(async () => {
        await global.checkNativeBuildUpdate();
      }, 1000);
    }, 6000);
    
    console.log('🎬 TEST: Tutti gli scenari avviati!');
    return true;
  } catch (error) {
    console.error('❌ TEST: Errore scenari:', error);
    return false;
  }
};

/**
 * Test comparazione con sistema OTA esistente
 */
export const testOTAvsNativeComparison = async () => {
  try {
    console.log('⚖️ TEST: Comparazione OTA vs Native...');
    
    // Info OTA
    console.log('\n🔄 SISTEMA OTA:');
    console.log('- UpdateId:', Updates.updateId);
    console.log('- RuntimeVersion:', Updates.runtimeVersion);
    console.log('- isEmbeddedLaunch:', Updates.isEmbeddedLaunch);
    console.log('- Channel:', Updates.channel);
    
    // Info Build Nativa
    console.log('\n📱 SISTEMA BUILD NATIVA:');
    console.log('- nativeBuildVersion:', Application.nativeBuildVersion);
    console.log('- nativeApplicationVersion:', Application.nativeApplicationVersion);
    console.log('- applicationId:', Application.applicationId);
    
    // Test detection logic
    const buildInfo = await global.getBuildInfo();
    console.log('\n🔍 BUILD INFO COMPLETA:', buildInfo);
    
    return true;
  } catch (error) {
    console.error('❌ TEST: Errore comparazione:', error);
    return false;
  }
};

// Esponi le funzioni globalmente
if (typeof global !== 'undefined') {
  global.testNativeBuildDetection = testNativeBuildDetection;
  global.resetForNewTest = resetForNewTest;
  global.testAllUpdateScenarios = testAllUpdateScenarios;
  global.testOTAvsNativeComparison = testOTAvsNativeComparison;
}

console.log('🧪 TEST BUILD NATIVA: Comandi disponibili:');
console.log('- testNativeBuildDetection()');
console.log('- resetForNewTest()');
console.log('- testAllUpdateScenarios()');
console.log('- testOTAvsNativeComparison()');

export default {
  testNativeBuildDetection,
  resetForNewTest,
  testAllUpdateScenarios,
  testOTAvsNativeComparison
};
