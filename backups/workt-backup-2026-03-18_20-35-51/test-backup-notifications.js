// 🧪 TEST NOTIFICHE BACKUP - Script per testare il controllo delle notifiche
import AutoBackupService from './src/services/AutoBackupService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Test completo delle notifiche backup
 */
export const testBackupNotificationControl = async () => {
  try {
    console.log('🧪 TEST: Controllo notifiche backup...');
    
    // 1. Stato attuale
    const currentSettings = await AutoBackupService.getAutoBackupSettings();
    console.log('📋 Impostazioni attuali:', currentSettings);
    
    // 2. Test con notifiche abilitate
    console.log('\n📢 TEST: Notifiche ABILITATE');
    await AsyncStorage.setItem('auto_backup_show_notification', 'true');
    const testEnabled = await AutoBackupService.testBackupNotifications();
    console.log('Risultato test abilitato:', testEnabled);
    
    // 3. Test con notifiche disabilitate
    setTimeout(async () => {
      console.log('\n🔇 TEST: Notifiche DISABILITATE');
      await AsyncStorage.setItem('auto_backup_show_notification', 'false');
      const testDisabled = await AutoBackupService.testBackupNotifications();
      console.log('Risultato test disabilitato:', testDisabled);
    }, 3000);
    
    // 4. Test toggle
    setTimeout(async () => {
      console.log('\n🔄 TEST: Toggle notifiche');
      const toggle1 = await AutoBackupService.toggleBackupNotifications();
      console.log('Toggle 1:', toggle1);
      
      setTimeout(async () => {
        const toggle2 = await AutoBackupService.toggleBackupNotifications();
        console.log('Toggle 2:', toggle2);
      }, 2000);
    }, 6000);
    
    return true;
  } catch (error) {
    console.error('❌ TEST: Errore controllo notifiche:', error);
    return false;
  }
};

/**
 * Simula backup con diversi stati notifiche
 */
export const testBackupWithDifferentNotificationStates = async () => {
  try {
    console.log('🎬 TEST: Backup con stati notifica diversi...');
    
    // Backup con notifiche abilitate
    console.log('\n📢 SCENARIO 1: Backup con notifiche abilitate');
    await AsyncStorage.setItem('auto_backup_show_notification', 'true');
    await AsyncStorage.setItem('auto_backup_on_save_enabled', 'true');
    
    const backup1 = await AutoBackupService.performAutoBackupIfEnabled();
    console.log('Backup con notifiche:', backup1);
    
    // Backup con notifiche disabilitate
    setTimeout(async () => {
      console.log('\n🔇 SCENARIO 2: Backup con notifiche disabilitate');
      await AsyncStorage.setItem('auto_backup_show_notification', 'false');
      
      const backup2 = await AutoBackupService.performAutoBackupIfEnabled();
      console.log('Backup senza notifiche:', backup2);
    }, 4000);
    
    return true;
  } catch (error) {
    console.error('❌ TEST: Errore scenari backup:', error);
    return false;
  }
};

/**
 * Verifica stato notifiche backup
 */
export const checkBackupNotificationStatus = async () => {
  try {
    console.log('🔍 VERIFICA: Stato notifiche backup...');
    
    const showNotification = await AsyncStorage.getItem('auto_backup_show_notification');
    const autoBackupEnabled = await AsyncStorage.getItem('auto_backup_on_save_enabled');
    const settings = await AutoBackupService.getAutoBackupSettings();
    
    const status = {
      showNotification: showNotification,
      showNotificationBool: showNotification !== 'false',
      autoBackupEnabled: autoBackupEnabled,
      autoBackupEnabledBool: autoBackupEnabled === 'true',
      settingsObject: settings
    };
    
    console.log('📊 STATO COMPLETO NOTIFICHE:', status);
    
    // Riassunto chiaro
    if (status.autoBackupEnabledBool) {
      if (status.showNotificationBool) {
        console.log('✅ BACKUP AUTOMATICO: ATTIVO con NOTIFICHE');
      } else {
        console.log('🔇 BACKUP AUTOMATICO: ATTIVO senza notifiche');
      }
    } else {
      console.log('❌ BACKUP AUTOMATICO: DISATTIVATO');
    }
    
    return status;
  } catch (error) {
    console.error('❌ VERIFICA: Errore controllo stato:', error);
    return null;
  }
};

/**
 * Reset notifiche per test puliti
 */
export const resetNotificationTestState = async () => {
  try {
    console.log('🔄 RESET: Stato notifiche per test...');
    
    // Ripristina impostazioni di default
    await AsyncStorage.setItem('auto_backup_show_notification', 'true');
    await AsyncStorage.setItem('auto_backup_on_save_enabled', 'true');
    
    console.log('✅ RESET: Notifiche ripristinate a stato default (abilitate)');
    return true;
  } catch (error) {
    console.error('❌ RESET: Errore ripristino:', error);
    return false;
  }
};

// Esponi le funzioni globalmente
if (typeof global !== 'undefined') {
  global.testBackupNotificationControl = testBackupNotificationControl;
  global.testBackupWithDifferentNotificationStates = testBackupWithDifferentNotificationStates;
  global.checkBackupNotificationStatus = checkBackupNotificationStatus;
  global.resetNotificationTestState = resetNotificationTestState;
  
  // Aggiungi anche i metodi del servizio per accesso diretto
  global.testBackupNotifications = () => AutoBackupService.testBackupNotifications();
  global.toggleBackupNotifications = () => AutoBackupService.toggleBackupNotifications();
  
  // 📍 NUOVI COMANDI PERCORSI: Accesso diretto ai percorsi backup
  global.showAllBackupPaths = () => AutoBackupService.showAllBackupPaths();
  global.showBackupDetails = (path) => AutoBackupService.showBackupDetails(path);
}

console.log('🧪 TEST NOTIFICHE BACKUP: Comandi disponibili:');
console.log('- testBackupNotificationControl()');
console.log('- testBackupWithDifferentNotificationStates()');
console.log('- checkBackupNotificationStatus()');
console.log('- resetNotificationTestState()');
console.log('- testBackupNotifications()');
console.log('- toggleBackupNotifications()');
console.log('📍 PERCORSI BACKUP:');
console.log('- showAllBackupPaths()');
console.log('- showBackupDetails(percorsoFile)');

export default {
  testBackupNotificationControl,
  testBackupWithDifferentNotificationStates,
  checkBackupNotificationStatus,
  resetNotificationTestState
};
