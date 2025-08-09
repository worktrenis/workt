/**
 * 🧹 SCRIPT DI PULIZIA MANUALE v1.3.0 → v1.3.1
 * 
 * Questo script deve essere eseguito nella console di React Native 
 * quando l'app è in esecuzione, tramite i comandi globali.
 * 
 * ISTRUZIONI:
 * 1. Avvia l'app (npm start)
 * 2. Apri la console JavaScript nel Metro bundler
 * 3. Esegui questi comandi:
 * 
 * // Per controllare lo stato attuale:
 * checkTransitionStatus()
 * 
 * // Per pulire e impostare v1.3.1:
 * cleanTransitionTo131()
 * 
 * // Per forzare il popup v1.3.1:
 * forceShowV131Popup()
 */

console.log('📋 GUIDA PULIZIA v1.3.0 → v1.3.1');
console.log('');
console.log('🔍 1. Per controllare lo stato:');
console.log('   checkTransitionStatus()');
console.log('');
console.log('🧹 2. Per pulire i dati v1.3.0:');
console.log('   cleanTransitionTo131()');
console.log('');
console.log('🚀 3. Per forzare popup v1.3.1:');
console.log('   forceShowV131Popup()');
console.log('');
console.log('💡 OPPURE tutto in uno:');
console.log('   forceShowV131Popup()');
console.log('');
console.log('⚠️ NOTA: Esegui questi comandi nella console Metro quando l\'app è in esecuzione');

module.exports = {
  help: () => {
    console.log('📋 COMANDI DISPONIBILI:');
    console.log('• checkTransitionStatus() - Controlla stato attuale');
    console.log('• cleanTransitionTo131() - Pulisce dati v1.3.0');
    console.log('• forceShowV131Popup() - Forza popup v1.3.1');
  }
};
