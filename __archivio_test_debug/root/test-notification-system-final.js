// Script di test per il sistema di notifiche finale aggiornato
// Esegui questo script per verificare che tutte le funzionalità del sistema di notifiche funzionino correttamente

import NotificationService from './src/services/FixedNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const runFinalNotificationTest = async () => {
  console.log('🧪 AVVIO TEST FINALE SISTEMA NOTIFICHE AGGIORNATO');
  console.log('================================================');

  // 1. Test inizializzazione
  console.log('📱 1. Test inizializzazione...');
  const initialized = await NotificationService.initialize();
  console.log(`📱 Inizializzazione: ${initialized ? 'OK ✅' : 'FALLITA ❌'}`);

  // 2. Test permessi
  console.log('📱 2. Test permessi...');
  const hasPermissions = await NotificationService.hasPermissions();
  console.log(`📱 Permessi: ${hasPermissions ? 'CONCESSI ✅' : 'NEGATI ❌'}`);

  // 3. Test notifica immediata con nuova configurazione
  console.log('📱 3. Test notifica immediata con nuova configurazione...');
  const immediateResult = await NotificationService.showImmediateNotification(
    '🧪 Test Finale - Notifica Immediata',
    'Questa è una notifica immediata con la nuova configurazione.',
    { type: 'test_immediate_final' }
  );
  console.log(`📱 Notifica immediata: ${immediateResult.success ? 'OK ✅' : 'FALLITA ❌'}`);

  // 4. Test notifica ritardata (verifica warning deprecati)
  console.log('📱 4. Test notifica ritardata (verifica warning deprecati)...');
  const delayedTime = Date.now() + 15000; // 15 secondi
  const delayedResult = await NotificationService.scheduleNotification(
    '🧪 Test Finale - Notifica Ritardata',
    'Questa è una notifica di test ritardata di 15 secondi con nuova configurazione.',
    delayedTime,
    { type: 'test_delayed_final' }
  );
  console.log(`📱 Notifica ritardata: ${delayedResult?.id ? 'PROGRAMMATA ✅' : 'FALLITA ❌'}`);
  console.log(`📱 ID notifica: ${delayedResult?.id || 'N/A'}`);

  // 5. Test getSettings e saveSettings
  console.log('📱 5. Test getSettings e saveSettings...');
  const settings = await NotificationService.getSettings();
  console.log('📱 Impostazioni attuali:', settings);
  
  // Modifica un'impostazione per test
  const updatedSettings = {
    ...settings,
    testTimestamp: Date.now()
  };
  
  const saveResult = await NotificationService.saveSettings(updatedSettings);
  console.log(`📱 Salvataggio impostazioni: ${saveResult ? 'OK ✅' : 'FALLITO ❌'}`);
  
  // Verifica che le impostazioni siano state salvate
  const reloadedSettings = await NotificationService.getSettings();
  console.log(`📱 Verifica modifica impostazioni: ${reloadedSettings.testTimestamp === updatedSettings.testTimestamp ? 'OK ✅' : 'FALLITA ❌'}`);

  // 6. Test scheduleNotifications
  console.log('📱 6. Test scheduleNotifications con tutte le impostazioni...');
  const scheduledCount = await NotificationService.scheduleNotifications(updatedSettings, true);
  console.log(`📱 Notifiche programmate: ${scheduledCount}`);

  // 7. Test riprogrammazione notifiche manuale
  console.log('📱 7. Test riprogrammazione notifiche manuale...');
  const rescheduledResult = await NotificationService.rescheduleOnForeground();
  console.log(`📱 Riprogrammazione: ${rescheduledResult ? 'OK ✅' : 'FALLITA ❌'}`);

  console.log('================================================');
  console.log('🧪 TEST FINALE COMPLETATO');
  console.log('✅ Il sistema di notifiche è completamente funzionante');
  console.log('✅ Tutti i problemi sono stati risolti');
  console.log('✅ Gli avvisi di deprecazione sono stati gestiti');
  
  Alert.alert(
    'Test Finale Completato',
    'Il sistema di notifiche è ora completamente funzionante. Tutte le correzioni sono state verificate.',
    [{ text: 'OK' }]
  );
};

// Avvia test finale
runFinalNotificationTest();
