// 🚀 QUICK FIX - Reset immediato per popup aggiornamento v1.2.2
import AsyncStorage from '@react-native-async-storage/async-storage';

const quickFixUpdatePopup = async () => {
  console.log('\n🚀 === QUICK FIX POPUP AGGIORNAMENTO ===');
  
  try {
    // 1. Controlla stato attuale
    const current = await AsyncStorage.getItem('last_known_version');
    console.log('💾 Versione attuale in storage:', current);
    
    // 2. Reset per simulare aggiornamento 1.2.0 → 1.2.2
    await AsyncStorage.setItem('last_known_version', '1.2.0');
    console.log('✅ Impostato last_known_version = "1.2.0"');
    
    // 3. Crea pending update per v1.2.2
    const updateInfo = {
      pendingUpdate: true,
      targetVersion: '1.2.2',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
    console.log('✅ Creato pending update per v1.2.2');
    
    console.log('\n🎯 DONE! Ora:');
    console.log('1. Chiudi completamente l\'app');
    console.log('2. Riaprila');
    console.log('3. Dovrebbe apparire popup "Aggiornamento Completato!"');
    
    return { success: true, message: 'Reset completato' };
    
  } catch (error) {
    console.error('❌ Errore quick fix:', error);
    return { success: false, error: error.message };
  }
};

// Comando per mostrare popup immediato senza reset
const showPopupNow = () => {
  const UpdateService = require('./src/services/UpdateService').default;
  return UpdateService.forceShowCurrentUpdateMessage();
};

// Comando per controllare stato AsyncStorage
const checkStorageState = async () => {
  try {
    const lastVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
    
    console.log('\n📊 STATO ASYNCSTORAGE:');
    console.log('last_known_version:', lastVersion);
    console.log('pending_update_info:', pendingUpdate ? JSON.parse(pendingUpdate) : null);
    
    return { lastVersion, pendingUpdate };
  } catch (error) {
    console.error('❌ Errore controllo storage:', error);
    return { error: error.message };
  }
};

export { quickFixUpdatePopup, showPopupNow, checkStorageState };
export default quickFixUpdatePopup;
