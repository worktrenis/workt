// 🔧 RESET VERSION SYSTEM - Forza il reset del sistema versioni per popup aggiornamento
import AsyncStorage from '@react-native-async-storage/async-storage';

async function resetVersionSystem() {
  console.log('\n🔧 === RESET VERSION SYSTEM ===');
  
  try {
    // 1. Leggi stato attuale
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('📊 STATO ATTUALE:');
    console.log('   last_known_version:', lastKnownVersion);
    console.log('   pending_update_info:', pendingUpdateInfo);
    
    // 2. Reset per simulare aggiornamento da 1.2.0 → 1.2.2
    console.log('\n🔄 RESET IN CORSO...');
    
    // Imposta versione precedente come 1.2.0
    await AsyncStorage.setItem('last_known_version', '1.2.0');
    console.log('✅ Impostato last_known_version = 1.2.0');
    
    // Crea pending update info per simulare aggiornamento completato
    const pendingUpdate = {
      pendingUpdate: true,
      targetVersion: '1.2.2',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(pendingUpdate));
    console.log('✅ Creato pending_update_info per v1.2.2');
    
    console.log('\n🎯 SETUP COMPLETATO!');
    console.log('📱 Al prossimo riavvio/apertura app dovrebbe apparire:');
    console.log('   🎉 "Aggiornamento Completato!"');
    console.log('   📝 "Da versione 1.2.0 → 1.2.2"');
    
    return {
      success: true,
      message: 'Reset completato - riavvia app per vedere popup'
    };
    
  } catch (error) {
    console.error('❌ Errore durante reset:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Funzione per controllare lo stato dopo reset
async function checkVersionState() {
  console.log('\n📊 === CONTROLLO STATO VERSIONI ===');
  
  try {
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('💾 last_known_version:', lastKnownVersion);
    console.log('💾 pending_update_info:', pendingUpdateInfo ? JSON.parse(pendingUpdateInfo) : null);
    
    // Versioni hardcoded per evitare errori Metro
    const packageVersion = '1.2.2';
    const appVersion = '1.2.2';
    
    console.log('📦 Package.json version:', packageVersion);
    console.log('🎯 App.json version:', appVersion);
    
  } catch (error) {
    console.error('❌ Errore controllo stato:', error);
  }
}

// Funzione per pulizia completa
async function clearAllVersionData() {
  console.log('\n🧹 === PULIZIA COMPLETA DATI VERSIONI ===');
  
  try {
    await AsyncStorage.removeItem('last_known_version');
    await AsyncStorage.removeItem('pending_update_info');
    console.log('✅ Tutti i dati versioni rimossi');
    
    return { success: true, message: 'Pulizia completata' };
  } catch (error) {
    console.error('❌ Errore pulizia:', error);
    return { success: false, error: error.message };
  }
}

export { resetVersionSystem, checkVersionState, clearAllVersionData };
export default resetVersionSystem;
