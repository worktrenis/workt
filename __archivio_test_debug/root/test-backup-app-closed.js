// 🧪 TEST BACKUP NATIVO CON APP CHIUSA
// Questo script testa se il backup automatico funziona veramente con app chiusa

import NativeBackupService from './src/services/NativeBackupService';

export const testNativeBackupWithAppClosed = async () => {
  console.log('🧪 ========================================');
  console.log('🧪 TEST BACKUP NATIVO CON APP CHIUSA');
  console.log('🧪 ========================================');
  
  try {
    // Inizializza il servizio se necessario
    if (!NativeBackupService.isNativeReady) {
      console.log('🔄 Inizializzazione NativeBackupService...');
      await NativeBackupService.initialize();
    }
    
    if (!NativeBackupService.isNativeReady) {
      console.error('❌ NativeBackupService non disponibile - test impossibile');
      console.log('💡 Il test funziona solo con build nativa (non Expo Go)');
      return false;
    }
    
    // Esegui il test
    const result = await NativeBackupService.testBackupWithAppClosed();
    
    if (result) {
      console.log('🎯 ========================================');
      console.log('🎯 TEST AVVIATO CON SUCCESSO!');
      console.log('🎯 ========================================');
      console.log('📱 ADESSO:');
      console.log('📱 1. Vai alla home del telefono');
      console.log('📱 2. Swipe up e chiudi COMPLETAMENTE l\'app');
      console.log('📱 3. Spegni lo schermo');
      console.log('📱 4. Aspetta 2 minuti per la notifica');
      console.log('📱 5. Tocca la notifica quando arriva');
      console.log('📱 6. Verifica se il backup è stato creato');
      console.log('🎯 ========================================');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Errore test backup app chiusa:', error);
    return false;
  }
};

// Per uso rapido dalla console
global.testAppClosed = testNativeBackupWithAppClosed;

console.log('🧪 Test backup nativo caricato!');
console.log('🧪 Uso: testAppClosed() dalla console Metro');
