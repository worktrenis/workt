// 🧹 PULIZIA TRANSIZIONE v1.3.0 → v1.3.1
// Script per pulire i dati della vecchia versione e impostare correttamente la nuova

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const cleanTransitionTo131 = async () => {
  try {
    console.log('🧹 INIZIANDO PULIZIA TRANSIZIONE v1.3.0 → v1.3.1...');
    
    // 1. Rimuovi tutti i flag della v1.3.0
    await AsyncStorage.removeItem('v1_3_0_popup_shown');
    await AsyncStorage.removeItem('update_popup_shown_v1_3_0');
    console.log('✅ Flag v1.3.0 rimossi');
    
    // 2. Imposta la versione corrente a 1.3.1
    await AsyncStorage.setItem('last_known_version', '1.3.1');
    console.log('✅ Versione impostata a 1.3.1');
    
    // 3. Rimuovi eventuali pending update vecchi
    await AsyncStorage.removeItem('pending_update_info');
    console.log('✅ Pending updates rimossi');
    
    // 4. Assicurati che il popup v1.3.1 non sia marcato come già mostrato
    // così verrà mostrato al prossimo avvio
    await AsyncStorage.removeItem('update_popup_shown_v1_3_1');
    console.log('✅ Flag popup v1.3.1 resettato');
    
    console.log('🎉 PULIZIA COMPLETATA! Al prossimo avvio verrà mostrato il popup v1.3.1');
    
    return true;
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    return false;
  }
};

const checkTransitionStatus = async () => {
  try {
    console.log('📊 STATUS TRANSIZIONE v1.3.0 → v1.3.1:');
    
    const currentVersion = await AsyncStorage.getItem('last_known_version');
    const oldFlag130 = await AsyncStorage.getItem('v1_3_0_popup_shown');
    const oldPopup130 = await AsyncStorage.getItem('update_popup_shown_v1_3_0');
    const newFlag131 = await AsyncStorage.getItem('update_popup_shown_v1_3_1');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    console.log('• Versione corrente:', currentVersion);
    console.log('• Flag v1.3.0 (v1_3_0_popup_shown):', oldFlag130);
    console.log('• Flag v1.3.0 (update_popup_shown_v1_3_0):', oldPopup130);
    console.log('• Flag v1.3.1 (update_popup_shown_v1_3_1):', newFlag131);
    console.log('• Pending update:', pendingUpdate);
    
    const needsCleaning = oldFlag130 || oldPopup130 || currentVersion !== '1.3.1';
    console.log('• Necessita pulizia:', needsCleaning ? 'SÌ' : 'NO');
    
    return {
      currentVersion,
      oldFlag130,
      oldPopup130,
      newFlag131,
      pendingUpdate,
      needsCleaning
    };
  } catch (error) {
    console.error('❌ Errore controllo status:', error);
    return null;
  }
};

const forceShowV131Popup = async () => {
  try {
    console.log('🚀 FORZANDO POPUP v1.3.1...');
    
    // Pulisci prima
    await cleanTransitionTo131();
    
    // Poi forza il popup
    if (global.forceUpdateNotificationV131) {
      global.forceUpdateNotificationV131();
      console.log('✅ Popup v1.3.1 forzato!');
    } else {
      console.log('⚠️ Funzione forceUpdateNotificationV131 non disponibile');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Errore forzatura popup:', error);
    return false;
  }
};

// Rendi le funzioni globalmente accessibili
if (typeof global !== 'undefined') {
  global.cleanTransitionTo131 = cleanTransitionTo131;
  global.checkTransitionStatus = checkTransitionStatus;
  global.forceShowV131Popup = forceShowV131Popup;
}

module.exports = {
  cleanTransitionTo131,
  checkTransitionStatus,
  forceShowV131Popup
};
