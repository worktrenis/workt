// Test semplice per verificare se CalculationService può essere importato
console.log('🧪 TEST: Import CalculationService in React Native');

try {
  const CalculationService = require('./src/services/CalculationService.js');
  console.log('✅ Import CommonJS successful:', !!CalculationService.default);
  
  if (CalculationService.default) {
    const service = new CalculationService.default();
    console.log('✅ Istanziazione successful:', !!service);
    console.log('✅ Metodi disponibili:', Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(name => name !== 'constructor').slice(0, 5));
  }
} catch (error) {
  console.error('❌ Errore import CommonJS:', error.message);
}

console.log('\n🔄 RISULTATO: Il problema è probabilmente risolto. Riavvia Expo per testare.');
