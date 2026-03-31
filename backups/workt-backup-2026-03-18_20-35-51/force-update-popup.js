import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Forza il popup di aggiornamento direttamente
 */
export const forceUpdatePopup = async () => {
  try {
    console.log('🔧 FORCE UPDATE POPUP: Inizio forzatura popup...');
    
    // Step 1: Cancella la versione salvata per simulare un aggiornamento
    await AsyncStorage.removeItem('last_known_version');
    console.log('✅ Versione AsyncStorage cancellata');
    
    // Step 2: Mostra direttamente il popup
    Alert.alert(
      '🚀 Aggiornamento Completato!',
      'WorkT è stato aggiornato alla versione 1.2.2.\n\n' +
      '✨ Novità:\n' +
      '• Sistema notifiche migliorato\n' +
      '• Correzioni sistema di backup\n' +
      '• Ottimizzazioni performance\n' +
      '• Bug fixes e stabilità',
      [
        {
          text: 'Perfetto! ✨',
          onPress: () => {
            console.log('✅ Popup aggiornamento mostrato con successo!');
          }
        }
      ]
    );
    
    // Step 3: Salva la nuova versione
    await AsyncStorage.setItem('last_known_version', '1.2.2');
    console.log('✅ Nuova versione 1.2.2 salvata');
    
    console.log('🎉 FORCE UPDATE POPUP: Completato!');
    return true;
    
  } catch (error) {
    console.error('❌ FORCE UPDATE POPUP: Errore:', error);
    Alert.alert('Errore', 'Impossibile mostrare il popup di aggiornamento');
    return false;
  }
};

/**
 * Verifica lo stato attuale delle versioni
 */
export const checkCurrentVersionState = async () => {
  try {
    const storedVersion = await AsyncStorage.getItem('last_known_version');
    const pendingInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('📊 VERSION STATE CHECK:');
    console.log('- AsyncStorage version:', storedVersion);
    console.log('- Pending update info:', pendingInfo);
    console.log('- Current app version: 1.2.2');
    
    return {
      storedVersion,
      pendingInfo,
      currentVersion: '1.2.2'
    };
  } catch (error) {
    console.error('❌ Version state check error:', error);
    return null;
  }
};

export default forceUpdatePopup;
