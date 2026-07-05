// 🔍 DEBUG VERSIONI SEMPLIFICATO - Senza import problematici
import AsyncStorage from '@react-native-async-storage/async-storage';

async function simpleVersionDebug() {
  console.log('\n📊 === DEBUG VERSIONI SEMPLIFICATO ===');
  
  try {
    // 1. Controlla AsyncStorage
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('💾 AsyncStorage last_known_version:', lastKnownVersion);
    console.log('💾 AsyncStorage pending_update_info:', pendingUpdateInfo);
    
    // 2. Versioni hardcoded (leggere manualmente dai file)
    const currentVersion = '1.2.2';
    console.log('📝 Versione corrente:', currentVersion);
    
    // 3. Setup per popup aggiornamento
    console.log('\n🔧 SETUP POPUP AGGIORNAMENTO:');
    await AsyncStorage.setItem('last_known_version', '1.2.0');
    
    const testUpdateInfo = {
      pendingUpdate: true,
      targetVersion: '1.2.2',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(testUpdateInfo));
    
    console.log('✅ Impostato last_known_version = 1.2.0');
    console.log('✅ Creato pending_update_info per v1.2.2');
    console.log('📱 Riavvia l\'app per vedere il popup!');
    
    return { success: true, message: 'Setup completato' };
    
  } catch (error) {
    console.error('❌ Errore debug versioni:', error);
    return { success: false, error: error.message };
  }
}

export default simpleVersionDebug;
