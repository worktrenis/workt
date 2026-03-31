import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import BackupService from './BackupService';

const AUTO_BACKUP_TASK_NAME = 'auto-backup-task';

// 1. Definisci l'attività di background
TaskManager.defineTask(AUTO_BACKUP_TASK_NAME, async () => {
  try {
    console.log('Running auto backup task...');
    const backupService = new BackupService();
    const result = await backupService.autoBackup();
    console.log('Auto backup task completed:', result);

    // Invia notifica locale con data, ora e nome file
    if (result && result.fileName) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('it-IT');
      const timeStr = now.toLocaleTimeString('it-IT');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Backup automatico completato',
          body: `File: ${result.fileName}\nData: ${dateStr} Ore: ${timeStr}`,
          sound: true,
        },
        trigger: null, // immediata
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Auto backup task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Funzione per registrare l'attività di background
export async function registerAutoBackupTask() {
  try {
    await BackgroundFetch.registerTaskAsync(AUTO_BACKUP_TASK_NAME, {
      minimumInterval: 60 * 60 * 24, // Esegui ogni 24 ore
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Auto backup task registered');
  } catch (error) {
    console.error('Failed to register auto backup task', error);
  }
}

// 3. Funzione per annullare la registrazione dell'attività
export async function unregisterAutoBackupTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(AUTO_BACKUP_TASK_NAME);
    console.log('Auto backup task unregistered');
  } catch (error) {
    console.error('Failed to unregister auto backup task', error);
  }
}

export default {
  registerAutoBackupTask,
  unregisterAutoBackupTask,
  AUTO_BACKUP_TASK_NAME,
};
