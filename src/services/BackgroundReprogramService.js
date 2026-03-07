// Service: BackgroundReprogramService
// Registra un background task (expo-background-fetch + expo-task-manager)
// che tenta periodicamente di richiamare la riprogrammazione delle notifiche.

let TaskManager, BackgroundFetch, SuperNotificationService;
const TASK_NAME = 'WORKT_REPROGRAM_NOTIFS';
let isExpoGo = false;

SuperNotificationService = require('./SuperNotificationService');

try {
  const Constants = require('expo-constants').default;
  isExpoGo = Constants?.executionEnvironment === 'storeClient';
} catch (e) {
  isExpoGo = false;
}

// Metro non permette require dinamici (require(name)). Usiamo require statici
try {
  TaskManager = require('expo-task-manager');
} catch (e) {
  console.warn('⚠️ Modulo expo-task-manager non disponibile:', e.message);
  TaskManager = null;
}

if (!isExpoGo) {
  try {
    BackgroundFetch = require('expo-background-fetch');
  } catch (e) {
    console.warn('⚠️ Modulo expo-background-fetch non disponibile:', e.message);
    BackgroundFetch = null;
  }
} else {
  BackgroundFetch = null;
  console.log('ℹ️ BackgroundReprogramService: Expo Go rilevato, background task disabilitati');
}

async function defineTask() {
  if (!TaskManager || !BackgroundFetch) {
    console.log('ℹ️ BackgroundReprogramService: moduli task/background-fetch non disponibili, skip definizione task');
    return false;
  }

  try {
    if (!TaskManager.isTaskDefined || !TaskManager.isTaskDefined(TASK_NAME)) {
      // defineTask may throw if already defined; wrap defensively
      TaskManager.defineTask(TASK_NAME, async () => {
        console.log('🔁 [BackgroundTask] Trigger ricevuto: provo a riprogrammare notifiche');
        try {
          // In ambiente nativo dovremmo usare la versione stabile del servizio
          await SuperNotificationService.initialize();
          // Forza la riprogrammazione (non cancellativa se non necessario)
          const res = await SuperNotificationService.checkAndReprogramNotifications();
          console.log('🔁 [BackgroundTask] Risultato reprogram:', res);
          return BackgroundFetch.Result.NewData;
        } catch (err) {
          console.warn('⚠️ [BackgroundTask] Errore durante riprogrammazione:', err.message);
          return BackgroundFetch.Result.Failed;
        }
      });
      console.log(`✅ BackgroundReprogramService: task ${TASK_NAME} definito`);
    } else {
      console.log(`ℹ️ BackgroundReprogramService: task ${TASK_NAME} già definito`);
    }
    return true;
  } catch (err) {
    console.warn('⚠️ Errore definizione background task:', err.message);
    return false;
  }
}

async function registerTaskAsync() {
  if (!BackgroundFetch) return false;
  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (suggerimento minimale, effettivo dipende dal sistema)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log(`✅ BackgroundReprogramService: task ${TASK_NAME} registrato`);
    return true;
  } catch (err) {
    console.warn('⚠️ Errore registrazione background task:', err.message);
    return false;
  }
}

async function unregisterTaskAsync() {
  if (!BackgroundFetch) return false;
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    console.log(`🗑️ BackgroundReprogramService: task ${TASK_NAME} unregistered`);
    return true;
  } catch (err) {
    console.warn('⚠️ Errore unregister background task:', err.message);
    return false;
  }
}

async function ensureRegistered() {
  const defined = await defineTask();
  if (!defined) return false;
  return await registerTaskAsync();
}

module.exports = {
  TASK_NAME,
  defineTask,
  registerTaskAsync,
  unregisterTaskAsync,
  ensureRegistered,
};
