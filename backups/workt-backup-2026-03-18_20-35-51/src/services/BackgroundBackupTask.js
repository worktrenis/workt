import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import SuperBackupService from './SuperBackupService';

const BACKUP_TASK = 'background-backup-task';

TaskManager.defineTask(BACKUP_TASK, async () => {
  try {
    console.log('🔄 [BackgroundFetch] === INIZIO ESECUZIONE BACKGROUND TASK ===');
    console.log('🔄 [BackgroundFetch] Timestamp:', new Date().toISOString());
    console.log('🔄 [BackgroundFetch] Task name:', BACKUP_TASK);
    
    // Verifica che SuperBackupService sia disponibile
    if (!SuperBackupService) {
      console.error('❌ [BackgroundFetch] SuperBackupService non disponibile');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    console.log('🔄 [BackgroundFetch] SuperBackupService disponibile, iniziando backup...');
    
    // Per app chiusa, usa un metodo di backup più diretto che bypassa i controlli anti-spam
    const result = await SuperBackupService.executeBackgroundBackup();
    
    console.log('🔄 [BackgroundFetch] Risultato backup:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ [BackgroundFetch] Backup automatico completato in background');
      console.log('✅ [BackgroundFetch] File:', result.fileName);
      
      // Notifica locale di conferma
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Backup automatico completato',
            body: `Backup eseguito in background: ${result.fileName}`,
            data: { type: 'backup_success', fileName: result.fileName },
            sound: false,
          },
          trigger: null,
        });
        console.log('✅ [BackgroundFetch] Notifica di conferma programmata');
      } catch (notifError) {
        console.warn('⚠️ [BackgroundFetch] Errore programmazione notifica:', notifError);
      }
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.warn('⚠️ [BackgroundFetch] Backup non eseguito:', result.reason || result.error);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (e) {
    console.error('❌ [BackgroundFetch] Errore backup automatico:', e);
    console.error('❌ [BackgroundFetch] Stack trace:', e.stack);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  } finally {
    console.log('🔄 [BackgroundFetch] === FINE ESECUZIONE BACKGROUND TASK ===');
  }
});

export async function registerBackgroundBackupTask() {
  try {
    // Verifica se BackgroundFetch è disponibile
    if (!BackgroundFetch || !BackgroundFetch.getStatusAsync) {
      console.log('⚠️ [BackgroundFetch] Modulo non disponibile - saltando registrazione');
      return false;
    }
    
    let status;
    try {
      status = await BackgroundFetch.getStatusAsync();
    } catch (statusError) {
      console.log('⚠️ [BackgroundFetch] Impossibile verificare status:', statusError.message);
      return false;
    }
    
    // Verifica se le costanti di status esistono prima di usarle
    if (BackgroundFetch.Status && (status === BackgroundFetch.Status.Restricted || status === BackgroundFetch.Status.Denied)) {
      console.warn('❌ [BackgroundFetch] Permessi background negati');
      return false;
    }
    
    await BackgroundFetch.registerTaskAsync(BACKUP_TASK, {
      minimumInterval: 60 * 60 * 24, // 24 ore (in secondi) - più conservativo per iOS
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('✅ [BackgroundFetch] Task backup automatico registrato con intervallo 24h');
    
    // Debug: verifica se il task è stato registrato correttamente
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK);
      console.log(`🔍 [BackgroundFetch] Task registrato: ${isTaskRegistered}`);
    } catch (e) {
      console.warn('⚠️ [BackgroundFetch] Impossibile verificare registrazione task:', e.message);
    }
    
    return true;
  } catch (e) {
    console.error('❌ [BackgroundFetch] Errore registrazione task:', e);
    return false;
  }
}

export async function testBackgroundBackupTask() {
  try {
    console.log('🧪 === TEST BACKGROUND BACKUP TASK ===');
    
    // Verifica se il task è registrato
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK);
    console.log(`🔍 Task registrato: ${isRegistered}`);
    
    if (!isRegistered) {
      console.log('❌ Task non registrato, tentando registrazione...');
      const registered = await registerBackgroundBackupTask();
      console.log(`🔄 Registrazione: ${registered ? 'OK' : 'FAILED'}`);
    }
    
    // Verifica status BackgroundFetch
    const status = await BackgroundFetch.getStatusAsync();
    console.log(`📱 BackgroundFetch status: ${status}`);
    
    // Test diretto del metodo di backup
    console.log('🧪 Test esecuzione backup background...');
    const result = await SuperBackupService.executeBackgroundBackup();
    console.log('🧪 Risultato test:', result);
    
    return {
      taskRegistered: isRegistered,
      backgroundStatus: status,
      testResult: result
    };
    
  } catch (error) {
    console.error('❌ Errore test background task:', error);
    return { error: error.message };
  }
}

// Aggiungi comando globale per test
if (typeof global !== 'undefined') {
  global.testBackgroundBackup = testBackgroundBackupTask;
}
