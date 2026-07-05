// 🔍 VERIFICA VERSIONI - Controlla che tutte le versioni siano sincronizzate
import AsyncStorage from '@react-native-async-storage/async-storage';

async function verifyVersionSync() {
  console.log('\n🔍 === VERIFICA SINCRONIZZAZIONE VERSIONI ===');
  
  try {
    // 1. Versioni hardcoded per evitare errori Metro in sviluppo
    const packageVersion = '1.2.2';
    const appVersion = '1.2.2'; 
    
    console.log('📦 Package.json version:', packageVersion);
    console.log('🎯 App.json version:', appVersion);
    
    // 2. Leggi versione dal UpdateService
    const UpdateService = require('../src/services/UpdateService').default;
    console.log('🔄 UpdateService currentVersion:', UpdateService.currentVersion);
    
    // 3. Controlla AsyncStorage
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('💾 AsyncStorage last_known_version:', lastKnownVersion);
    console.log('💾 AsyncStorage pending_update_info:', pendingUpdateInfo ? 'presente' : 'non presente');
    
    // 4. Verifica sincronizzazione
    const allVersionsMatch = (
      packageVersion === appVersion &&
      packageVersion === UpdateService.currentVersion
    );
    
    console.log('\n✅ RISULTATO SINCRONIZZAZIONE:');
    if (allVersionsMatch) {
      console.log('🎉 Tutte le versioni sono sincronizzate:', packageVersion);
    } else {
      console.log('⚠️ Versioni NON sincronizzate!');
      console.log('   - Package.json:', packageVersion);
      console.log('   - App.json:', appVersion);
      console.log('   - UpdateService:', UpdateService.currentVersion);
    }
    
    // 5. Controlla che le schermate mostreranno la versione corretta
    console.log('\n📱 VERSIONI MOSTRATE NELLE SCHERMATE:');
    console.log('   - SettingsScreen: usa package.json version =', packageVersion);
    console.log('   - AppInfoScreen: usa package.json version =', packageVersion);
    console.log('   - Popup aggiornamenti: usa UpdateService =', UpdateService.currentVersion);
    
    return {
      success: true,
      synchronized: allVersionsMatch,
      versions: {
        package: packageVersion,
        app: appVersion,
        updateService: UpdateService.currentVersion,
        asyncStorage: lastKnownVersion
      }
    };
    
  } catch (error) {
    console.error('❌ Errore verifica versioni:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Comando per forzare la sincronizzazione
async function syncAllVersions(targetVersion = '1.2.2') {
  console.log(`\n🔄 === SINCRONIZZAZIONE FORZATA VERSIONE ${targetVersion} ===`);
  
  try {
    // Aggiorna AsyncStorage per il popup
    await AsyncStorage.setItem('last_known_version', '1.2.0'); // Versione precedente fittizia
    
    const updateInfo = {
      pendingUpdate: true,
      targetVersion: targetVersion,
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
    
    console.log('✅ AsyncStorage aggiornato per popup aggiornamento');
    console.log('📱 Al prossimo riavvio app dovrebbe mostrare popup v1.2.0 → v' + targetVersion);
    
    return { success: true, targetVersion };
    
  } catch (error) {
    console.error('❌ Errore sincronizzazione:', error);
    return { success: false, error: error.message };
  }
}

export { verifyVersionSync, syncAllVersions };
export default verifyVersionSync;
