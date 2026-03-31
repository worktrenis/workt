// 📱 ENHANCED UPDATE INFO - Informazioni aggiornamenti migliorate per utenti
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { version as appVersion } from './package.json';

const getEnhancedUpdateInfo = async () => {
  try {
    // Leggi informazioni versione - usa import statico invece di require dinamico
    const currentVersion = appVersion || '1.0.0';
    const appName = 'WorkT';
    
    // Controlla stato aggiornamenti
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const lastUpdateCheck = await AsyncStorage.getItem('last_update_check');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    // Informazioni sistema
    const isDev = __DEV__;
    const isEmbedded = Updates.isEmbeddedLaunch;
    const updateId = Updates.updateId;
    const runtimeVersion = Updates.runtimeVersion;
    
    return {
      current: {
        version: currentVersion,
        appName: appName,
        isDevelopment: isDev,
        isEmbeddedBuild: isEmbedded,
        updateId: updateId ? updateId.substring(0, 8) + '...' : 'N/A',
        runtimeVersion
      },
      history: {
        lastKnownVersion,
        lastUpdateCheck: lastUpdateCheck ? new Date(lastUpdateCheck).toLocaleDateString('it-IT') : 'Mai',
        hasPendingUpdate: !!pendingUpdate
      }
    };
  } catch (error) {
    console.error('Errore lettura info aggiornamenti:', error);
    return null;
  }
};

const showEnhancedUpdateInfo = async () => {
  const info = await getEnhancedUpdateInfo();
  
  if (!info) {
    Alert.alert('Errore', 'Impossibile leggere le informazioni di aggiornamento.');
    return;
  }
  
  const { current, history } = info;
  
  let message = `📱 Versione Corrente: ${current.version}\n`;
  message += `🏷️ App: ${current.appName}\n\n`;
  
  if (current.isDevelopment) {
    message += `🚧 MODALITÀ SVILUPPO\n`;
    message += `• Gli aggiornamenti OTA non sono disponibili\n`;
    message += `• Usa "Ricarica" per aggiornare durante sviluppo\n`;
    message += `• I popup di aggiornamento sono simulati\n\n`;
    message += `🔧 Build Info:\n`;
    message += `• Tipo: ${current.isEmbeddedBuild ? 'Build locale' : 'OTA'}\n`;
    message += `• Update ID: ${current.updateId}\n`;
    message += `• Runtime: ${current.runtimeVersion}\n\n`;
    message += `🧪 Comandi Test Disponibili:\n`;
    message += `• Popup aggiornamento simulato\n`;
    message += `• Verifica sincronizzazione versioni\n`;
    message += `• Test sistema backup`;
  } else {
    message += `📦 BUILD PRODUCTION\n`;
    message += `• Aggiornamenti automatici attivi\n`;
    message += `• Controllo in background ogni avvio\n`;
    message += `• Popup informativi per nuove versioni\n\n`;
    message += `📊 Cronologia:\n`;
    message += `• Ultima versione nota: ${history.lastKnownVersion || 'N/A'}\n`;
    message += `• Ultimo controllo: ${history.lastUpdateCheck}\n`;
    message += `• Aggiornamento in sospeso: ${history.hasPendingUpdate ? 'Sì' : 'No'}\n\n`;
    message += `🔧 Build Info:\n`;
    message += `• Tipo: ${current.isEmbeddedBuild ? 'Build nativa' : 'OTA Update'}\n`;
    message += `• Update ID: ${current.updateId}\n`;
    message += `• Runtime: ${current.runtimeVersion}`;
  }
  
  const buttons = [];
  
  if (current.isDevelopment) {
    buttons.push({
      text: '🧪 Test Popup',
      onPress: () => {
        try {
          global.showPopupNow?.();
        } catch (error) {
          Alert.alert('Errore', 'Comando di test non disponibile');
        }
      }
    });
  }
  
  buttons.push({
    text: current.isDevelopment ? 'Chiudi' : 'OK',
    style: 'cancel'
  });
  
  Alert.alert(
    '📱 Informazioni Aggiornamenti',
    message,
    buttons
  );
  
  // Salva timestamp ultimo controllo
  await AsyncStorage.setItem('last_update_check', new Date().toISOString());
};

export { getEnhancedUpdateInfo, showEnhancedUpdateInfo };
export default showEnhancedUpdateInfo;
