// 🧪 TEST NOTIFICHE - Script per verificare il fix
import NotificationService from './src/services/NotificationService';

const testNotifications = async () => {
  console.log('🧪 === TEST SISTEMA NOTIFICHE ===');
  
  try {
    // 1. DEBUG completo
    console.log('\n🔧 1. DEBUG STATO ATTUALE:');
    const debug = await NotificationService.debugNotifications();
    
    // 2. Pulizia completa
    console.log('\n🧹 2. PULIZIA COMPLETA:');
    const cleaned = await NotificationService.cleanupAllNotifications();
    console.log(`Pulizia ${cleaned ? 'RIUSCITA' : 'FALLITA'}`);
    
    // 3. Verifica pulizia
    console.log('\n🔍 3. VERIFICA PULIZIA:');
    const afterCleanup = await NotificationService.debugNotifications();
    
    // 4. Programmazione forzata (test)
    console.log('\n🎯 4. PROGRAMMAZIONE FORZATA (TEST):');
    await NotificationService.forceScheduleNotifications();
    
    // 5. Verifica finale
    console.log('\n✅ 5. VERIFICA FINALE:');
    const final = await NotificationService.debugNotifications();
    
    console.log('🧪 TEST COMPLETATO!');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
};

// Eseguire questo test nell'app:
// import('./test-notifications-fix.js').then(test => test.testNotifications());

export { testNotifications };
