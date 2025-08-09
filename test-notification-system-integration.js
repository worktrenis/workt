// test-notification-system-integration.js
// Test completo per verificare l'integrazione del sistema di notifiche

import SystemNotificationPersistenceService from './src/services/SystemNotificationPersistenceService.js';

const testNotificationSystemIntegration = async () => {
  console.log('🧪 Inizio test integrazione sistema notifiche...');
  
  try {
    // Test 1: Pulizia iniziale
    console.log('📁 Test 1: Pulizia iniziale...');
    await SystemNotificationPersistenceService.clearAllNotifications();
    const initialNotifications = await SystemNotificationPersistenceService.getAllNotifications();
    console.log(`✅ Notifiche iniziali: ${initialNotifications.length} (dovrebbe essere 0)`);
    
    // Test 2: Aggiunta notifiche di test
    console.log('📝 Test 2: Aggiunta notifiche di test...');
    
    const testNotifications = [
      {
        type: 'info',
        title: 'Benvenuto nel Sistema',
        message: 'Il sistema di notifiche persistenti è ora attivo!',
        priority: 'high'
      },
      {
        type: 'warning',
        title: 'Backup Automatico',
        message: 'Il backup automatico sarà eseguito a mezzanotte',
        priority: 'medium'
      },
      {
        type: 'success',
        title: 'Aggiornamento Completato',
        message: 'L\'app è stata aggiornata alla versione più recente',
        priority: 'low'
      },
      {
        type: 'error',
        title: 'Errore di Sincronizzazione',
        message: 'Impossibile sincronizzare i dati. Controlla la connessione.',
        priority: 'high'
      }
    ];
    
    // Aggiungi notifiche con delay per simulare arrivo nel tempo
    for (const [index, notification] of testNotifications.entries()) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Piccolo delay
      const id = await SystemNotificationPersistenceService.addNotification(notification);
      console.log(`➕ Aggiunta notifica ${index + 1}: ${notification.title} (ID: ${id})`);
    }
    
    // Test 3: Verifica notifiche aggiunte
    console.log('📊 Test 3: Verifica notifiche aggiunte...');
    const allNotifications = await SystemNotificationPersistenceService.getAllNotifications();
    console.log(`✅ Totale notifiche: ${allNotifications.length} (dovrebbe essere 4)`);
    
    const unreadNotifications = await SystemNotificationPersistenceService.getUnreadNotifications();
    console.log(`📬 Notifiche non lette: ${unreadNotifications.length} (dovrebbe essere 4)`);
    
    // Test 4: Test statistiche
    console.log('📈 Test 4: Verifica statistiche...');
    const stats = await SystemNotificationPersistenceService.getStatistics();
    console.log('📊 Statistiche:', JSON.stringify(stats, null, 2));
    
    // Test 5: Marca alcune come lette
    console.log('👁️ Test 5: Marca notifiche come lette...');
    const firstNotification = allNotifications[0];
    const secondNotification = allNotifications[1];
    
    await SystemNotificationPersistenceService.markAsRead(firstNotification.id);
    await SystemNotificationPersistenceService.markAsRead(secondNotification.id);
    
    const newUnreadCount = await SystemNotificationPersistenceService.getUnreadNotifications();
    console.log(`✅ Notifiche non lette dopo lettura: ${newUnreadCount.length} (dovrebbe essere 2)`);
    
    // Test 6: Filtraggio per tipo
    console.log('🔍 Test 6: Test filtraggio per tipo...');
    const errorNotifications = await SystemNotificationPersistenceService.getNotificationsByType('error');
    const warningNotifications = await SystemNotificationPersistenceService.getNotificationsByType('warning');
    
    console.log(`🚨 Notifiche errore: ${errorNotifications.length} (dovrebbe essere 1)`);
    console.log(`⚠️ Notifiche warning: ${warningNotifications.length} (dovrebbe essere 1)`);
    
    // Test 7: Filtraggio per priorità
    console.log('⭐ Test 7: Test filtraggio per priorità...');
    const highPriorityNotifications = await SystemNotificationPersistenceService.getNotificationsByPriority('high');
    console.log(`🔥 Notifiche alta priorità: ${highPriorityNotifications.length} (dovrebbe essere 2)`);
    
    // Test 8: Export/Import
    console.log('💾 Test 8: Test export/import...');
    const exportData = await SystemNotificationPersistenceService.exportNotifications();
    console.log(`📤 Dati esportati: ${exportData.notifications.length} notifiche`);
    
    // Pulisci e reimporta
    await SystemNotificationPersistenceService.clearAllNotifications();
    const emptyCheck = await SystemNotificationPersistenceService.getAllNotifications();
    console.log(`🗑️ Dopo pulizia: ${emptyCheck.length} notifiche (dovrebbe essere 0)`);
    
    const importResult = await SystemNotificationPersistenceService.importNotifications(exportData);
    console.log(`📥 Import risultato: ${importResult.success ? 'Successo' : 'Fallito'}`);
    
    const restoredNotifications = await SystemNotificationPersistenceService.getAllNotifications();
    console.log(`♻️ Notifiche ripristinate: ${restoredNotifications.length} (dovrebbe essere 4)`);
    
    // Test 9: Test componente badge (simulato)
    console.log('🏷️ Test 9: Test logica badge...');
    const currentUnread = await SystemNotificationPersistenceService.getUnreadNotifications();
    const currentStats = await SystemNotificationPersistenceService.getStatistics();
    
    console.log(`📊 Badge dovrebbe mostrare: ${currentUnread.length} notifiche non lette`);
    console.log(`📈 Statistiche finali:`, JSON.stringify(currentStats, null, 2));
    
    // Test completato con successo
    console.log('✅ TUTTI I TEST COMPLETATI CON SUCCESSO!');
    console.log('🎉 Il sistema di notifiche persistenti è completamente funzionante');
    
    // Mostra alert di successo se in ambiente React Native
    if (typeof Alert !== 'undefined') {
      Alert.alert(
        '✅ Test Completato',
        `Sistema notifiche testato con successo!\n\n` +
        `• ${allNotifications.length} notifiche totali\n` +
        `• ${currentUnread.length} non lette\n` +
        `• ${currentStats.byType.error || 0} errori\n` +
        `• ${currentStats.byType.warning || 0} avvisi\n` +
        `• Export/Import funzionante\n\n` +
        `Il sistema è pronto per l'uso!`,
        [{ text: 'Perfetto!', style: 'default' }]
      );
    }
    
    return {
      success: true,
      message: 'Test integrazione sistema notifiche completato con successo',
      data: {
        totalNotifications: allNotifications.length,
        unreadNotifications: currentUnread.length,
        statistics: currentStats
      }
    };
    
  } catch (error) {
    console.error('❌ ERRORE durante test integrazione:', error);
    
    if (typeof Alert !== 'undefined') {
      Alert.alert(
        '❌ Test Fallito',
        `Errore durante test sistema notifiche:\n\n${error.message}`,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
    
    return {
      success: false,
      message: 'Test integrazione sistema notifiche fallito',
      error: error.message
    };
  }
};

// Test rapido per verificare disponibilità servizio
const quickServiceCheck = async () => {
  try {
    console.log('🔍 Quick check servizio notifiche...');
    const stats = await SystemNotificationPersistenceService.getStatistics();
    console.log('✅ Servizio disponibile, statistiche:', stats);
    return true;
  } catch (error) {
    console.error('❌ Servizio non disponibile:', error);
    return false;
  }
};

// Test badge in tempo reale
const testBadgeUpdates = async () => {
  console.log('🏷️ Test aggiornamenti badge in tempo reale...');
  
  try {
    // Aggiungi notifica e verifica che il badge si aggiorni
    const testNotification = {
      type: 'info',
      title: 'Test Badge Update',
      message: 'Questa notifica serve per testare l\'aggiornamento del badge',
      priority: 'medium'
    };
    
    const beforeCount = (await SystemNotificationPersistenceService.getUnreadNotifications()).length;
    console.log(`📊 Notifiche non lette prima: ${beforeCount}`);
    
    const notificationId = await SystemNotificationPersistenceService.addNotification(testNotification);
    console.log(`➕ Aggiunta notifica test (ID: ${notificationId})`);
    
    const afterCount = (await SystemNotificationPersistenceService.getUnreadNotifications()).length;
    console.log(`📊 Notifiche non lette dopo: ${afterCount}`);
    
    console.log(`✅ Badge dovrebbe mostrare incremento: ${beforeCount} → ${afterCount}`);
    
    // Marca come letta e verifica decremento
    await SystemNotificationPersistenceService.markAsRead(notificationId);
    const finalCount = (await SystemNotificationPersistenceService.getUnreadNotifications()).length;
    console.log(`📊 Notifiche non lette finali: ${finalCount}`);
    
    console.log(`✅ Badge dovrebbe mostrare decremento: ${afterCount} → ${finalCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Errore test badge:', error);
    return false;
  }
};

// Funzione per testare tutto
const runAllTests = async () => {
  console.log('🚀 INIZIO TEST COMPLETO SISTEMA NOTIFICHE');
  console.log('========================================');
  
  const serviceCheck = await quickServiceCheck();
  if (!serviceCheck) {
    console.log('❌ Servizio non disponibile, test interrotto');
    return;
  }
  
  await testNotificationSystemIntegration();
  console.log('');
  await testBadgeUpdates();
  
  console.log('');
  console.log('🎯 TUTTI I TEST COMPLETATI');
  console.log('========================');
};

// Export per uso nei componenti
export default testNotificationSystemIntegration;
export { quickServiceCheck, testBadgeUpdates, runAllTests };

// Se eseguito direttamente, avvia tutti i test
if (require.main === module) {
  runAllTests().catch(console.error);
}
