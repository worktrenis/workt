// 🚀 FORZA NOTIFICA AGGIORNAMENTO v1.3.1 - Script per simulare aggiornamento completato
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { Alert } = require('react-native');

/**
 * Forza la visualizzazione del popup di aggiornamento v1.3.1
 */
const forceUpdateNotificationV131 = async () => {
  try {
    console.log('🚀 FORZANDO POPUP AGGIORNAMENTO v1.3.1...');
    
    // 1. Imposta versione precedente a 1.3.0
    await AsyncStorage.setItem('last_known_version', '1.3.0');
    
    // 2. Simula pending update da 1.3.0 → 1.3.1
    const updateInfo = {
      pendingUpdate: true,
      targetVersion: '1.3.1',
      updateTime: new Date().toISOString(),
      previousVersion: '1.3.0'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
    
    console.log('✅ Dati aggiornamento preparati:', updateInfo);
    
    // 3. Mostra immediatamente il popup
    Alert.alert(
      '🔄 Aggiornamento Sistema!',
      `WorkT è stato aggiornato alla versione 1.3.1!\n\n🎯 MIGLIORAMENTI PRINCIPALI:\n• ✅ Statistiche backup corrette (conteggio reale)\n• 🔄 TimeEntry si aggiorna automaticamente\n• 📱 Notifiche continue anche ad app chiusa\n• 🧹 Pulizia automatica backup in eccesso\n• ⚡ Performance e stabilità migliorate\n\n✅ Sistema completamente ottimizzato!`,
      [
        {
          text: 'Perfetto! 🎉',
          style: 'default',
          onPress: () => {
            console.log('✅ Utente ha confermato aggiornamento v1.3.1');
          }
        }
      ],
      { 
        cancelable: false,
        userInterfaceStyle: 'light'
      }
    );
    
    // 4. Aggiorna versione corrente a 1.3.1
    await AsyncStorage.setItem('last_known_version', '1.3.1');
    
    // 5. Segna popup v1.3.1 come mostrato
    await AsyncStorage.setItem('update_popup_shown_v1_3_1', 'true');
    
    console.log('✅ Popup aggiornamento v1.3.1 forzato completato');
    
    return { success: true, version: '1.3.1' };
    
  } catch (error) {
    console.error('❌ Errore forzatura popup v1.3.1:', error);
    Alert.alert('Errore', 'Impossibile forzare popup aggiornamento');
    return { success: false, error: error.message };
  }
};

/**
 * Controlla lo stato dell'aggiornamento v1.3.1
 */
export const checkUpdateStatusV131 = async () => {
  try {
    const lastVersion = await AsyncStorage.getItem('last_known_version');
    const popupShown = await AsyncStorage.getItem('update_popup_shown_v1_3_1');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    console.log('📋 STATO AGGIORNAMENTO v1.3.1:');
    console.log('- Ultima versione nota:', lastVersion);
    console.log('- Popup v1.3.1 mostrato:', popupShown);
    console.log('- Aggiornamento pendente:', pendingUpdate);
    
    return {
      currentVersion: lastVersion,
      popupShown: popupShown === 'true',
      pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null
    };
    
  } catch (error) {
    console.error('❌ Errore controllo stato v1.3.1:', error);
    return { error: error.message };
  }
};

/**
 * Reset del sistema di aggiornamento per v1.3.1
 */
export const resetUpdateSystemV131 = async () => {
  try {
    console.log('🔧 RESET SISTEMA AGGIORNAMENTO v1.3.1...');
    
    // Reset completo per testare di nuovo
    await AsyncStorage.removeItem('last_known_version');
    await AsyncStorage.removeItem('update_popup_shown_v1_3_1');
    await AsyncStorage.removeItem('pending_update_info');
    await AsyncStorage.removeItem('update_notification_data');
    
    console.log('✅ Sistema aggiornamento v1.3.1 resettato');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Errore reset sistema v1.3.1:', error);
    return { success: false, error: error.message };
  }
};

// 🎯 Auto-caricamento comandi globali per test
if (typeof global !== 'undefined') {
  global.forceUpdateNotificationV131 = forceUpdateNotificationV131;
  global.checkUpdateStatusV131 = checkUpdateStatusV131;
  global.resetUpdateSystemV131 = resetUpdateSystemV131;
  
  console.log('🎯 Notifiche aggiornamento v1.3.1 caricate!');
  console.log('🎯 Comandi: forceUpdateNotificationV131(), checkUpdateStatusV131(), resetUpdateSystemV131()');
}
