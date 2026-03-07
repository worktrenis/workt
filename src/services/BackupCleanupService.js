import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAllBackupsFromAsyncStorage() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const backupKeys = allKeys.filter(
      key => key.startsWith('backup_') || key.startsWith('manual_backup_')
    );
    const extraKeys = ['javascript_backups', 'last_backup_date'];
    const keysToRemove = [...backupKeys, ...extraKeys];

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`🗑️ Backup eliminati da AsyncStorage: ${keysToRemove.length}`);
    } else {
      console.log('ℹ️ Nessun backup trovato in AsyncStorage da eliminare');
    }

    try {
      const BackupService = require('./BackupService').default;
      if (BackupService?.jsBackupService?.stopAutoBackup) {
        await BackupService.jsBackupService.stopAutoBackup();
        console.log('🛑 Timer backup automatico JS fermato');
      }
    } catch (e) {
      console.warn('⚠️ Impossibile fermare timer JS:', e.message);
    }

    return keysToRemove.length;
  } catch (err) {
    console.warn('❌ Errore durante la pulizia dei backup in AsyncStorage:', err.message);
    return 0;
  }
}
