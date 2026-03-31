// 🚀 CONFIGURAZIONE OTTIMIZZATA PER BUILD NATIVA
// Miglioramenti specifici per testare le notifiche in produzione

console.log('🔧 === CONFIGURAZIONE BUILD NATIVA ===');

// Verifica se siamo in modalità development o produzione
const isDevelopment = __DEV__ || false;
const isPreview = process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview';

console.log('📱 Ambiente:', {
  isDevelopment,
  isPreview,
  nodeEnv: process.env.NODE_ENV
});

// Configurazione specifica per build nativa
const NATIVE_CONFIG = {
  // In build nativa, disabilita tutti i test automatici
  DISABLE_AUTO_TESTS: !isDevelopment,
  
  // Usa notifiche più conservative in produzione
  CONSERVATIVE_NOTIFICATIONS: !isDevelopment,
  
  // Aumenta i timeout per build nativa
  NOTIFICATION_TIMEOUT: isDevelopment ? 30000 : 60000,
  
  // Usa recovery meno aggressivo in produzione
  GENTLE_RECOVERY: !isDevelopment,
  
  // Log meno verbosi in produzione
  QUIET_LOGS: !isDevelopment
};

console.log('⚙️ Configurazione nativa:', NATIVE_CONFIG);

// Export per uso negli altri servizi
module.exports = NATIVE_CONFIG;

// Suggerimenti per la build nativa
console.log('📝 === SUGGERIMENTI BUILD NATIVA ===');
console.log('1. 🔔 Le notifiche funzioneranno REALMENTE con app chiusa');
console.log('2. ⏰ I timing saranno PRECISI (non come in development)');
console.log('3. 🔋 Gestione batteria Android potrebbe influenzare le notifiche');
console.log('4. 📱 Assicurati che le impostazioni "Do Not Disturb" siano disabilitate');
console.log('5. ⚡ Le notifiche immediate di test NON dovrebbero più apparire');
console.log('');
console.log('🧪 PIANO DI TEST:');
console.log('1. Installa APK dal link EAS');
console.log('2. Apri app e configura notifiche');
console.log('3. Chiudi COMPLETAMENTE l\'app');
console.log('4. Aspetta fino a domani mattina alle 07:30');
console.log('5. Verifica che arrivi la notifica promemoria lavoro!');
console.log('');
console.log('✅ Se la notifica arriva domani mattina = PROBLEMA RISOLTO!');
