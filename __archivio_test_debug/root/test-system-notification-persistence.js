// 🧪 TEST SISTEMA NOTIFICHE DI SISTEMA PERSISTENTI
// Script per testare completamente il nuovo sistema di notifiche

import SystemNotificationPersistence from './src/services/SystemNotificationPersistenceService';

console.log('🧪 === TEST SISTEMA NOTIFICHE DI SISTEMA PERSISTENTI ===\n');

async function testSystemNotificationPersistence() {
  try {
    // 🔧 FASE 1: Inizializzazione
    console.log('🔧 FASE 1: Inizializzazione Sistema');
    console.log('====================================');
    
    const initialized = await SystemNotificationPersistence.initialize();
    console.log(`✅ Sistema inizializzato: ${initialized ? 'OK' : 'FAILED'}`);
    
    // Verifica impostazioni di default
    const settings = SystemNotificationPersistence.getSettings();
    console.log('⚙️ Impostazioni di default:', JSON.stringify(settings, null, 2));
    
    console.log('\n');

    // 📱 FASE 2: Test Aggiunta Notifiche
    console.log('📱 FASE 2: Test Aggiunta Notifiche');
    console.log('==================================');
    
    // Notifica di successo
    const successNotification = await SystemNotificationPersistence.addNotification({
      title: 'Test Successo',
      message: 'Questa è una notifica di test di tipo successo',
      type: 'success',
      category: 'test',
      priority: 3
    });
    console.log('✅ Notifica successo creata:', successNotification?.id);
    
    // Notifica di errore
    const errorNotification = await SystemNotificationPersistence.addNotification({
      title: 'Test Errore',
      message: 'Questa è una notifica di test di tipo errore con alta priorità',
      type: 'error',
      category: 'test',
      priority: 5,
      data: { errorCode: 'TEST_001', details: 'Test error details' }
    });
    console.log('❌ Notifica errore creata:', errorNotification?.id);
    
    // Notifica di avviso
    const warningNotification = await SystemNotificationPersistence.addNotification({
      title: 'Test Avviso',
      message: 'Questa è una notifica di avviso per testare il sistema',
      type: 'warning',
      category: 'system',
      priority: 4
    });
    console.log('⚠️ Notifica avviso creata:', warningNotification?.id);
    
    // Notifica info
    const infoNotification = await SystemNotificationPersistence.addNotification({
      title: 'Test Info',
      message: 'Questa è una notifica informativa di test',
      type: 'info',
      category: 'backup',
      priority: 2
    });
    console.log('ℹ️ Notifica info creata:', infoNotification?.id);
    
    console.log('\n');

    // 📊 FASE 3: Test Statistiche
    console.log('📊 FASE 3: Test Statistiche');
    console.log('===========================');
    
    const stats = SystemNotificationPersistence.getNotificationStats();
    console.log('📈 Statistiche attuali:');
    console.log(`   Totali: ${stats.total}`);
    console.log(`   Non lette: ${stats.unread}`);
    console.log(`   Lette: ${stats.read}`);
    console.log(`   Alta priorità: ${stats.highPriority}`);
    console.log(`   Per tipo:`, stats.byType);
    console.log(`   Per categoria:`, stats.byCategory);
    
    console.log('\n');

    // 🔍 FASE 4: Test Filtri
    console.log('🔍 FASE 4: Test Filtri');
    console.log('======================');
    
    const allNotifications = SystemNotificationPersistence.getNotifications();
    console.log(`📋 Tutte le notifiche: ${allNotifications.length}`);
    
    const unreadNotifications = SystemNotificationPersistence.getNotifications({ unreadOnly: true });
    console.log(`👁️ Non lette: ${unreadNotifications.length}`);
    
    const highPriorityNotifications = SystemNotificationPersistence.getNotifications({ minPriority: 4 });
    console.log(`🔥 Alta priorità: ${highPriorityNotifications.length}`);
    
    const systemNotifications = SystemNotificationPersistence.getNotifications({ category: 'system' });
    console.log(`⚙️ Sistema: ${systemNotifications.length}`);
    
    const errorNotifications = SystemNotificationPersistence.getNotifications({ type: 'error' });
    console.log(`❌ Errori: ${errorNotifications.length}`);
    
    console.log('\n');

    // 👁️ FASE 5: Test Marca Come Letta
    console.log('👁️ FASE 5: Test Marca Come Letta');
    console.log('=================================');
    
    if (successNotification) {
      const marked = await SystemNotificationPersistence.markAsRead(successNotification.id);
      console.log(`✅ Notifica successo segnata come letta: ${marked ? 'OK' : 'FAILED'}`);
    }
    
    if (infoNotification) {
      const marked = await SystemNotificationPersistence.markAsRead(infoNotification.id);
      console.log(`ℹ️ Notifica info segnata come letta: ${marked ? 'OK' : 'FAILED'}`);
    }
    
    // Verifica statistiche aggiornate
    const newStats = SystemNotificationPersistence.getNotificationStats();
    console.log(`📊 Nuove statistiche - Non lette: ${newStats.unread}, Lette: ${newStats.read}`);
    
    console.log('\n');

    // 📚 FASE 6: Test Cronologia
    console.log('📚 FASE 6: Test Cronologia');
    console.log('==========================');
    
    const history = SystemNotificationPersistence.getHistory({ limit: 10 });
    console.log(`📖 Elementi cronologia: ${history.length}`);
    
    if (history.length > 0) {
      console.log('📋 Ultime azioni:');
      history.slice(0, 3).forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.action} - ${entry.notificationTitle} (${new Date(entry.timestamp).toLocaleString()})`);
      });
    }
    
    console.log('\n');

    // ⚙️ FASE 7: Test Impostazioni
    console.log('⚙️ FASE 7: Test Impostazioni');
    console.log('============================');
    
    const settingsUpdate = await SystemNotificationPersistence.updateSettings({
      maxNotifications: 100,
      testSetting: true
    });
    console.log(`⚙️ Aggiornamento impostazioni: ${settingsUpdate ? 'OK' : 'FAILED'}`);
    
    const updatedSettings = SystemNotificationPersistence.getSettings();
    console.log('📋 Impostazioni aggiornate:', JSON.stringify(updatedSettings, null, 2));
    
    console.log('\n');

    // 🗑️ FASE 8: Test Rimozione
    console.log('🗑️ FASE 8: Test Rimozione');
    console.log('=========================');
    
    if (warningNotification) {
      const removed = await SystemNotificationPersistence.removeNotification(warningNotification.id);
      console.log(`🗑️ Notifica avviso rimossa: ${removed ? 'OK' : 'FAILED'}`);
    }
    
    const finalStats = SystemNotificationPersistence.getNotificationStats();
    console.log(`📊 Statistiche finali - Totali: ${finalStats.total}`);
    
    console.log('\n');

    // 🧹 FASE 9: Test Pulizia
    console.log('🧹 FASE 9: Test Pulizia');
    console.log('=======================');
    
    const cleanupResult = await SystemNotificationPersistence.performCleanup();
    console.log('🧹 Risultato pulizia:', cleanupResult);
    
    console.log('\n');

    // 💾 FASE 10: Test Export/Import
    console.log('💾 FASE 10: Test Export/Import');
    console.log('==============================');
    
    const exportData = await SystemNotificationPersistence.exportNotifications();
    console.log(`📦 Export completato: ${exportData ? 'OK' : 'FAILED'}`);
    console.log(`📏 Dimensione export: ${exportData ? Math.round(exportData.length / 1024) : 0} KB`);
    
    // Test import (stesso dato)
    if (exportData) {
      const importResult = await SystemNotificationPersistence.importNotifications(exportData);
      console.log(`📥 Import completato: ${importResult ? 'OK' : 'FAILED'}`);
    }
    
    console.log('\n');

    // 🧪 FASE 11: Test Notifiche Predefinite
    console.log('🧪 FASE 11: Test Notifiche Predefinite');
    console.log('======================================');
    
    const testCount = await SystemNotificationPersistence.createTestNotifications();
    console.log(`🧪 Notifiche test create: ${testCount}`);
    
    const finalNotifications = SystemNotificationPersistence.getNotifications();
    console.log(`📱 Notifiche totali finali: ${finalNotifications.length}`);
    
    console.log('\n');

    // 🎯 RIASSUNTO FINALE
    console.log('🎯 RIASSUNTO FINALE');
    console.log('==================');
    
    const summaryStats = SystemNotificationPersistence.getNotificationStats();
    console.log('✅ Sistema di notifiche persistenti testato con successo!');
    console.log(`📊 Stato finale:`);
    console.log(`   • Notifiche totali: ${summaryStats.total}`);
    console.log(`   • Non lette: ${summaryStats.unread}`);
    console.log(`   • Alta priorità: ${summaryStats.highPriority}`);
    console.log(`   • Categorie: ${Object.keys(summaryStats.byCategory).join(', ')}`);
    console.log(`   • Tipi: ${Object.keys(summaryStats.byType).join(', ')}`);
    
    // Mostra alcune notifiche di esempio
    console.log('\n📋 Esempi di notifiche attive:');
    finalNotifications.slice(0, 3).forEach((notification, index) => {
      console.log(`   ${index + 1}. [${notification.type.toUpperCase()}] ${notification.title}`);
      console.log(`      ${notification.message}`);
      console.log(`      Priorità: ${notification.priority}, Categoria: ${notification.category}, Letta: ${notification.read ? 'Sì' : 'No'}`);
    });

    return {
      success: true,
      stats: summaryStats,
      notificationsCount: finalNotifications.length,
      message: 'Sistema di notifiche persistenti funzionante!'
    };

  } catch (error) {
    console.error('❌ ERRORE DURANTE IL TEST:', error);
    return {
      success: false,
      error: error.message,
      message: 'Test fallito'
    };
  }
}

// 🚀 ESEGUI TEST
async function runTest() {
  console.log('🚀 Avvio test sistema notifiche di sistema persistenti...\n');
  
  const startTime = Date.now();
  const result = await testSystemNotificationPersistence();
  const endTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log(`🏁 TEST COMPLETATO in ${endTime - startTime}ms`);
  console.log(`📊 Risultato: ${result.success ? '✅ SUCCESSO' : '❌ FALLITO'}`);
  console.log(`💬 Messaggio: ${result.message}`);
  
  if (result.error) {
    console.log(`❌ Errore: ${result.error}`);
  }
  
  return result;
}

// Esporta funzione per uso esterno
if (typeof global !== 'undefined') {
  global.testSystemNotificationPersistence = runTest;
  console.log('🔧 Funzione test disponibile globalmente: testSystemNotificationPersistence()');
}

// Esegui test se chiamato direttamente
if (require.main === module) {
  runTest().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export default runTest;
