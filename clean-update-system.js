/**
 * 🧹 PULIZIA SISTEMA AGGIORNAMENTI
 * 
 * Reset completo del sistema popup versioni per evitare miscugli v1.3.0/v1.3.1
 */

// 🧹 RESET COMPLETO SISTEMA AGGIORNAMENTI
global.resetUpdateSystemComplete = async () => {
  console.log('\n🧹 === RESET COMPLETO SISTEMA AGGIORNAMENTI ===');
  
  try {
    const { AsyncStorage } = require('@react-native-async-storage/async-storage');
    
    const keysToReset = [
      'pending_update_info',
      'last_known_version',
      'update_popup_shown_v1_3_0', 
      'update_popup_shown_v1_3_1',
      'force_update_notification_shown',
      'app_version_check_timestamp',
      'last_update_check'
    ];
    
    console.log('🔄 Resetting chiavi sistema aggiornamento...');
    
    for (const key of keysToReset) {
      await AsyncStorage.removeItem(key);
      console.log(`✅ Rimossa: ${key}`);
    }
    
    // Imposta versione corrente
    await AsyncStorage.setItem('last_known_version', '1.3.1');
    console.log('✅ Impostata versione corrente: 1.3.1');
    
    console.log('\n🎯 SISTEMA PULITO - STATO:');
    console.log('• Tutte le chiavi popup reset');
    console.log('• Versione corrente: 1.3.1'); 
    console.log('• Sistema pronto per funzionamento normale');
    console.log('• No popup confusione v1.3.0/v1.3.1');
    
    return {
      status: 'success',
      keysReset: keysToReset.length,
      currentVersion: '1.3.1'
    };
    
  } catch (error) {
    console.error('❌ Errore reset sistema:', error);
    return { status: 'error', error: error.message };
  }
};

// 📊 VERIFICA STATO SISTEMA AGGIORNAMENTI
global.checkUpdateSystemStatus = async () => {
  console.log('\n📊 === STATO SISTEMA AGGIORNAMENTI ===');
  
  try {
    const { AsyncStorage } = require('@react-native-async-storage/async-storage');
    
    const checks = {
      lastKnownVersion: await AsyncStorage.getItem('last_known_version'),
      pendingUpdate: await AsyncStorage.getItem('pending_update_info'),
      popupV130Shown: await AsyncStorage.getItem('update_popup_shown_v1_3_0'),
      popupV131Shown: await AsyncStorage.getItem('update_popup_shown_v1_3_1'),
      forceUpdateShown: await AsyncStorage.getItem('force_update_notification_shown')
    };
    
    console.log('🔍 STATO ATTUALE:');
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`• ${key}: ${value || 'NULL'}`);
    });
    
    return checks;
    
  } catch (error) {
    console.error('❌ Errore verifica stato:', error);
    return { error: error.message };
  }
};

// 🎯 IMPOSTA VERSIONE CORRENTE PULITA
global.setCleanVersion131 = async () => {
  console.log('\n🎯 === IMPOSTA VERSIONE CORRENTE PULITA ===');
  
  try {
    const { AsyncStorage } = require('@react-native-async-storage/async-storage');
    
    // Pulisci popup duplicati
    await AsyncStorage.removeItem('update_popup_shown_v1_3_0');
    await AsyncStorage.removeItem('pending_update_info');
    
    // Imposta versione corrente
    await AsyncStorage.setItem('last_known_version', '1.3.1');
    
    // Marca popup v1.3.1 come già mostrato per evitare duplicati
    await AsyncStorage.setItem('update_popup_shown_v1_3_1', 'true');
    
    console.log('✅ CONFIGURAZIONE PULITA:');
    console.log('• Versione corrente: 1.3.1');
    console.log('• Popup v1.3.0: rimosso');
    console.log('• Popup v1.3.1: marcato come mostrato');
    console.log('• Sistema pronto per normale funzionamento');
    
    return {
      status: 'success',
      currentVersion: '1.3.1',
      popupPrevention: 'active'
    };
    
  } catch (error) {
    console.error('❌ Errore impostazione versione:', error);
    return { status: 'error', error: error.message };
  }
};

// 🔄 RIAVVIA SERVIZIO AGGIORNAMENTI PULITO
global.restartUpdateService = async () => {
  console.log('\n🔄 === RIAVVIO SERVIZIO AGGIORNAMENTI ===');
  
  try {
    // Reset completo
    await global.resetUpdateSystemComplete();
    
    // Imposta versione pulita
    await global.setCleanVersion131();
    
    console.log('🎉 SERVIZIO AGGIORNAMENTI RIAVVIATO');
    console.log('• Sistema completamente pulito');
    console.log('• Versione 1.3.1 impostata');
    console.log('• Prevenzione popup duplicati attiva');
    console.log('• Pronto per funzionamento normale');
    
    return {
      status: 'success',
      action: 'complete_restart',
      version: '1.3.1'
    };
    
  } catch (error) {
    console.error('❌ Errore riavvio servizio:', error);
    return { status: 'error', error: error.message };
  }
};

console.log('\n🧹 COMANDI PULIZIA SISTEMA CARICATI:');
console.log('• resetUpdateSystemComplete() - Reset completo tutte le chiavi');
console.log('• checkUpdateSystemStatus() - Verifica stato attuale');
console.log('• setCleanVersion131() - Imposta versione 1.3.1 pulita');
console.log('• restartUpdateService() - Riavvio completo servizio');
console.log('✅ Sistema pulizia pronto!\n');
