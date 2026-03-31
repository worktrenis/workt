/**
 * 🧪 TEST SISTEMA AGGIORNAMENTO v1.3.1
 * 
 * Script per testare il sistema di aggiornamento OTA completo
 * Simula tutti gli scenari possibili di aggiornamento
 */

// ✅ USO REQUIRE INVECE DI IMPORT
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// 🎯 FUNZIONI TEST AGGIORNAMENTO
global.testUpdateSystemV131 = async () => {
  console.log('\n🧪 === TEST SISTEMA AGGIORNAMENTO v1.3.1 ===');
  
  try {
    // 1. Reset sistema aggiornamento
    await AsyncStorage.removeItem('last_known_version');
    await AsyncStorage.removeItem('update_popup_shown_v1_3_1');
    await AsyncStorage.removeItem('pending_update_info');
    console.log('✅ Reset sistema completato');
    
    // 2. Simula versione precedente
    await AsyncStorage.setItem('last_known_version', '1.2.9');
    console.log('✅ Versione precedente impostata: 1.2.9');
    
    // 3. Test rilevamento cambio versione
    console.log('\n📊 Test rilevamento cambio versione...');
    
    return {
      status: 'ready',
      message: 'Sistema pronto per test aggiornamento. Riavvia app per testare.',
      instructions: [
        '1. Chiudi e riapri l\'app',
        '2. Dovrebbe apparire popup v1.3.1',
        '3. Usa resetUpdateTestV131() per reset completo'
      ]
    };
    
  } catch (error) {
    console.error('❌ Errore test sistema:', error);
    return { status: 'error', error: error.message };
  }
};

// 🔄 RESET COMPLETO TEST
global.resetUpdateTestV131 = async () => {
  console.log('\n🔄 === RESET TEST AGGIORNAMENTO ===');
  
  try {
    await AsyncStorage.removeItem('last_known_version');
    await AsyncStorage.removeItem('update_popup_shown_v1_3_1');
    await AsyncStorage.removeItem('pending_update_info');
    await AsyncStorage.removeItem('update_check_timestamp');
    
    console.log('✅ Reset completo eseguito');
    return { status: 'success', message: 'Sistema reset completamente' };
    
  } catch (error) {
    console.error('❌ Errore reset:', error);
    return { status: 'error', error: error.message };
  }
};

// 📊 STATO SISTEMA AGGIORNAMENTO
global.checkUpdateSystemStatusV131 = async () => {
  console.log('\n📊 === STATO SISTEMA AGGIORNAMENTO ===');
  
  try {
    const lastVersion = await AsyncStorage.getItem('last_known_version');
    const popupShown = await AsyncStorage.getItem('update_popup_shown_v1_3_1');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    const status = {
      lastKnownVersion: lastVersion || 'non impostata',
      popupV131Shown: popupShown === 'true',
      pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null,
      currentAppVersion: '1.3.1'
    };
    
    console.log('📊 Stato attuale:', status);
    return status;
    
  } catch (error) {
    console.error('❌ Errore controllo stato:', error);
    return { status: 'error', error: error.message };
  }
};

// 🎭 SIMULA AGGIORNAMENTO OTA
global.simulateOTAUpdateV131 = async () => {
  console.log('\n🎭 === SIMULAZIONE AGGIORNAMENTO OTA ===');
  
  try {
    // Simula info aggiornamento in attesa
    const updateInfo = {
      previousVersion: '1.3.0',
      targetVersion: '1.3.1',
      updateTime: new Date().toISOString(),
      source: 'simulated_ota'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
    console.log('✅ Aggiornamento OTA simulato');
    console.log('📱 Riavvia app per vedere popup aggiornamento completato');
    
    return {
      status: 'success',
      message: 'OTA simulato. Riavvia app per test completo.',
      updateInfo
    };
    
  } catch (error) {
    console.error('❌ Errore simulazione:', error);
    return { status: 'error', error: error.message };
  }
};

// 🏃‍♂️ TEST RAPIDO COMPLETO
global.quickTestUpdateV131 = async () => {
  console.log('\n🏃‍♂️ === TEST RAPIDO COMPLETO ===');
  
  try {
    // Reset
    await resetUpdateTestV131();
    
    // Simula aggiornamento
    await simulateOTAUpdateV131();
    
    // Controlla stato
    const status = await checkUpdateSystemStatusV131();
    
    console.log('✅ Test rapido completato');
    console.log('📱 PROSSIMO PASSO: Riavvia app per vedere popup');
    
    return {
      status: 'success',
      message: 'Test rapido completato. Riavvia app.',
      systemStatus: status
    };
    
  } catch (error) {
    console.error('❌ Errore test rapido:', error);
    return { status: 'error', error: error.message };
  }
};

console.log('\n🧪 COMANDI TEST AGGIORNAMENTO v1.3.1 CARICATI:');
console.log('• testUpdateSystemV131() - Test completo sistema');
console.log('• resetUpdateTestV131() - Reset completo');
console.log('• checkUpdateSystemStatusV131() - Controllo stato');
console.log('• simulateOTAUpdateV131() - Simula aggiornamento OTA');
console.log('• quickTestUpdateV131() - Test rapido completo');
console.log('✅ Sistema test pronto!\n');
