// 🚀 FORZA NOTIFICA AGGIORNAMENTO v1.3.0 - Script per simulare aggiornamento completato
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Forza la visualizzazione del popup di aggiornamento v1.3.0
 */
export const forceUpdateNotificationV130 = async () => {
  try {
    console.log('🚀 FORZANDO POPUP AGGIORNAMENTO v1.3.0...');
    
    // 1. Imposta versione precedente a 1.2.2
    await AsyncStorage.setItem('last_known_version', '1.2.2');
    
    // 2. Simula pending update da 1.2.2 → 1.3.0
    const updateInfo = {
      pendingUpdate: true,
      targetVersion: '1.3.0',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.2'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
    
    console.log('✅ Dati aggiornamento preparati:', updateInfo);
    
    // 3. Mostra immediatamente il popup
    Alert.alert(
      '🎉 Aggiornamento Completato!',
      `WorkT è stato aggiornato alla versione 1.3.0!\n\n🎯 NOVITÀ PRINCIPALI:\n• Backup completo con tutte le impostazioni\n• Sistema PDF perfetto e identico al form\n• Ripristino intelligente multi-formato\n• Campo reperibilità corretto\n\n✅ L'app è ora pronta con tutti i miglioramenti.`,
      [
        {
          text: 'Fantastico! 🚀',
          style: 'default',
          onPress: async () => {
            // Aggiorna versione corrente per evitare loop
            await AsyncStorage.setItem('last_known_version', '1.3.0');
            await AsyncStorage.removeItem('pending_update_info');
            // 🎯 MARCA POPUP COME MOSTRATO
            await AsyncStorage.setItem('v1_3_0_popup_shown', 'true');
            console.log('✅ Popup confermato, versione aggiornata a 1.3.0, popup marcato come mostrato');
          },
        },
      ],
      { cancelable: false }
    );
    
    return true;
  } catch (error) {
    console.error('❌ Errore forzatura popup aggiornamento:', error);
    return false;
  }
};

/**
 * Controlla stato aggiornamenti attuali
 */
export const checkUpdateStatus = async () => {
  try {
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    console.log('📋 STATO AGGIORNAMENTI:');
    console.log('• Ultima versione nota:', lastKnownVersion);
    console.log('• Update pending:', pendingUpdate ? JSON.parse(pendingUpdate) : 'Nessuno');
    
    return {
      lastKnownVersion,
      pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null
    };
  } catch (error) {
    console.error('❌ Errore controllo stato:', error);
    return null;
  }
};

/**
 * Reset completo sistema aggiornamenti
 */
export const resetUpdateSystem = async () => {
  try {
    await AsyncStorage.removeItem('last_known_version');
    await AsyncStorage.removeItem('pending_update_info');
    await AsyncStorage.removeItem('v1_3_0_popup_shown');
    console.log('🔄 Sistema aggiornamenti resettato completamente (incluso flag popup v1.3.0)');
    return true;
  } catch (error) {
    console.error('❌ Errore reset sistema:', error);
    return false;
  }
};

/**
 * Forza il reset solo del flag popup v1.3.0 (per testing)
 */
export const resetV130PopupFlag = async () => {
  try {
    await AsyncStorage.removeItem('v1_3_0_popup_shown');
    console.log('🔄 Flag popup v1.3.0 resettato - popup si mostrerà al prossimo avvio');
    return true;
  } catch (error) {
    console.error('❌ Errore reset flag popup:', error);
    return false;
  }
};

// Esponi le funzioni globalmente
if (typeof global !== 'undefined') {
  global.forceUpdateNotificationV130 = forceUpdateNotificationV130;
  global.checkUpdateStatus = checkUpdateStatus;
  global.resetUpdateSystem = resetUpdateSystem;
  global.resetV130PopupFlag = resetV130PopupFlag;
}
