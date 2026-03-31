// Integrazione base con expo-background-fetch (compatibile Expo)
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import SuperBackupService from './SuperBackupService';

const BACKGROUND_BACKUP_TASK = 'background-backup-task';

// Definisce il task in background
TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
  console.log('[NativeBackgroundBackup] Esecuzione task in background');
  try {
    await SuperBackupService.executeBackgroundBackup();
    console.log('[NativeBackgroundBackup] Backup completato');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[NativeBackgroundBackup] Errore backup:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const initNativeBackgroundBackup = async () => {
  try {
    // Registra il task di background
    await BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
      minimumInterval: 60 * 60, // 1 ora in secondi
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[NativeBackgroundBackup] Task registrato con successo');
    return true;
  } catch (error) {
    console.error('[NativeBackgroundBackup] Errore registrazione task:', error);
    return false;
  }
};

export const stopNativeBackgroundBackup = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_BACKUP_TASK);
    console.log('[NativeBackgroundBackup] Task disregistrato');
    return true;
  } catch (error) {
    console.error('[NativeBackgroundBackup] Errore disregistrazione:', error);
    return false;
  }
};
