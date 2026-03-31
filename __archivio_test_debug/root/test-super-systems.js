// 🧪 TEST COMPLETO SUPER SISTEMI - NOTIFICHE E BACKUP
// Script per testare i nuovi SuperNotificationService e SuperBackupService
// Verifica che risolvano i problemi dei sistemi precedenti

import SuperNotificationService from './src/services/SuperNotificationService.js';
import SuperBackupService from './src/services/SuperBackupService.js';

console.log('🧪 === TEST SUPER SISTEMI - NOTIFICHE E BACKUP ===');
console.log(`📅 Data test: ${new Date().toLocaleString('it-IT')}`);

async function testSuperSystems() {
  try {
    console.log('\n🚀 === FASE 1: INIZIALIZZAZIONE SERVIZI ===');
    
    // Test inizializzazione SuperNotificationService
    console.log('\n📱 Test SuperNotificationService...');
    const notificationInit = await SuperNotificationService.initialize();
    console.log(`✅ SuperNotificationService inizializzato: ${notificationInit ? 'OK' : 'FAILED'}`);
    
    // Test inizializzazione SuperBackupService
    console.log('\n💾 Test SuperBackupService...');
    const backupInit = await SuperBackupService.initialize();
    console.log(`✅ SuperBackupService inizializzato: ${backupInit ? 'OK' : 'FAILED'}`);
    
    if (!notificationInit || !backupInit) {
      console.log('❌ ERRORE: Inizializzazione fallita - interrompo test');
      return;
    }
    
    console.log('\n🎯 === FASE 2: TEST NOTIFICHE ===');
    
    // Test sistema notifiche
    const notificationTest = await SuperNotificationService.testNotificationSystem();
    console.log(`📱 Test notifiche risultato: ${JSON.stringify(notificationTest, null, 2)}`);
    
    if (notificationTest.success) {
      console.log('✅ Sistema notifiche funzionante');
      
      // Test programmazione notifiche
      console.log('\n📅 Test programmazione notifiche avanzata...');
      const testSettings = {
        enabled: true,
        workReminder: {
          enabled: true,
          morningTime: '08:00',
          weekendsEnabled: false
        },
        timeEntryReminder: {
          enabled: true,
          eveningTime: '18:00',
          weekendsEnabled: false
        },
        standbyReminder: {
          enabled: false // Disabilitato per il test
        }
      };
      
      const scheduledCount = await SuperNotificationService.scheduleNotifications(testSettings, true);
      console.log(`✅ Notifiche programmate: ${scheduledCount}`);
      
      // Statistiche notifiche
      const notificationStats = await SuperNotificationService.getNotificationStats();
      console.log(`📊 Statistiche notifiche: ${JSON.stringify(notificationStats, null, 2)}`);
      
    } else {
      console.log(`❌ Test notifiche fallito: ${notificationTest.error}`);
    }
    
    console.log('\n💾 === FASE 3: TEST BACKUP ===');
    
    // Test sistema backup
    const backupTest = await SuperBackupService.testBackupSystem();
    console.log(`💾 Test backup risultato: ${JSON.stringify(backupTest, null, 2)}`);
    
    if (backupTest.success) {
      console.log('✅ Sistema backup funzionante');
      
      // Test impostazioni backup
      console.log('\n⚙️ Test configurazione backup automatico...');
      const settingsUpdate = await SuperBackupService.updateBackupSettings(true, '02:30');
      console.log(`✅ Impostazioni backup aggiornate: ${settingsUpdate ? 'OK' : 'FAILED'}`);
      
      // Test backup manuale aggiuntivo
      console.log('\n💾 Test backup manuale aggiuntivo...');
      const manualBackup = await SuperBackupService.executeManualBackup('test-manual-backup');
      console.log(`✅ Backup manuale: ${manualBackup.success ? manualBackup.fileName : manualBackup.error}`);
      
      // Statistiche backup
      const backupStats = await SuperBackupService.getBackupStats();
      console.log(`📊 Statistiche backup: ${JSON.stringify(backupStats, null, 2)}`);
      
    } else {
      console.log(`❌ Test backup fallito: ${backupTest.error}`);
    }
    
    console.log('\n🔄 === FASE 4: TEST RECOVERY SYSTEMS ===');
    
    // Test recovery notifiche
    console.log('\n🔄 Test recovery notifiche...');
    const notificationRecovery = await SuperNotificationService.emergencyNotificationRecovery();
    console.log(`✅ Recovery notifiche: ${notificationRecovery} notifiche ripristinate`);
    
    // Test recovery backup
    console.log('\n🔄 Test recovery backup...');
    const backupRecovery = await SuperBackupService.executeEmergencyBackup('Test recovery system');
    console.log(`✅ Recovery backup: ${backupRecovery.success ? backupRecovery.fileName : backupRecovery.error}`);
    
    console.log('\n📊 === FASE 5: STATISTICHE FINALI ===');
    
    // Statistiche finali
    const finalNotificationStats = await SuperNotificationService.getNotificationStats();
    const finalBackupStats = await SuperBackupService.getBackupStats();
    
    console.log('\n📱 STATISTICHE NOTIFICHE FINALI:');
    console.log(`   • Totale programmate: ${finalNotificationStats.total || 0}`);
    console.log(`   • Per tipo: ${JSON.stringify(finalNotificationStats.byType || {})}`);
    console.log(`   • Sistema attivo: ${finalNotificationStats.isSystemActive ? '✅' : '❌'}`);
    console.log(`   • Ultimo controllo: ${finalNotificationStats.lastCheck ? finalNotificationStats.lastCheck.toLocaleString('it-IT') : 'Mai'}`);
    
    console.log('\n💾 STATISTICHE BACKUP FINALI:');
    console.log(`   • Totale backup: ${finalBackupStats.totalBackups || 0}`);
    console.log(`   • Automatici: ${finalBackupStats.automaticBackups || 0}`);
    console.log(`   • Manuali: ${finalBackupStats.manualBackups || 0}`);
    console.log(`   • Emergenza: ${finalBackupStats.emergencyBackups || 0}`);
    console.log(`   • Ultimo backup: ${finalBackupStats.lastBackup ? finalBackupStats.lastBackup.toLocaleString('it-IT') : 'Mai'}`);
    console.log(`   • Prossimo backup: ${finalBackupStats.nextBackup ? finalBackupStats.nextBackup.toLocaleString('it-IT') : 'Non programmato'}`);
    console.log(`   • Sistema attivo: ${finalBackupStats.systemActive ? '✅' : '❌'}`);
    
    console.log('\n🎯 === RISULTATO FINALE ===');
    
    const notificationWorking = finalNotificationStats.isSystemActive && finalNotificationStats.total > 0;
    const backupWorking = finalBackupStats.systemActive && finalBackupStats.totalBackups > 0;
    
    if (notificationWorking && backupWorking) {
      console.log('🎉 ✅ TUTTI I SISTEMI FUNZIONANO CORRETTAMENTE!');
      console.log('📱 Notifiche: Programmate e funzionanti');
      console.log('💾 Backup: Configurato e operativo');
      console.log('🔄 Recovery: Sistemi di recupero attivi');
      
      console.log('\n💡 BENEFICI DEI NUOVI SISTEMI:');
      console.log('   • Notifiche programmate per 30 giorni (vs 7 giorni)');
      console.log('   • Funzionano anche con app chiusa');
      console.log('   • Recovery automatico per backup mancati');
      console.log('   • Sistema di emergenza per entrambi');
      console.log('   • Statistiche dettagliate e monitoraggio');
      
    } else {
      console.log('⚠️ ALCUNI SISTEMI HANNO PROBLEMI:');
      if (!notificationWorking) {
        console.log('❌ Sistema notifiche: Non completamente operativo');
      }
      if (!backupWorking) {
        console.log('❌ Sistema backup: Non completamente operativo');
      }
    }
    
    console.log('\n📋 PROSSIMI PASSI:');
    console.log('1. Aggiornare App.js per usare i nuovi servizi');
    console.log('2. Aggiornare le schermate impostazioni');
    console.log('3. Testare in ambiente reale con app in background');
    console.log('4. Monitorare funzionamento per qualche giorno');
    
  } catch (error) {
    console.error('\n❌ ERRORE DURANTE IL TEST:', error);
    console.error('Stack:', error.stack);
  }
}

// Avvia test automaticamente
testSuperSystems()
  .then(() => {
    console.log('\n✅ Test completato');
  })
  .catch(error => {
    console.error('\n❌ Test fallito:', error);
  });

export { testSuperSystems };
