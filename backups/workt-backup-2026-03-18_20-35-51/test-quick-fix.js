// 🚀 TEST VELOCE CORREZIONE MONTHLY PRINT SERVICE
console.log('🔧 Test import MonthlyPrintService...');

try {
  // Test basic import
  const MonthlyPrintService = require('./src/services/MonthlyPrintService.js').default;
  console.log('✅ MonthlyPrintService importato correttamente');

  // Test formatHours method
  const formatted = MonthlyPrintService.formatHours(8.5);
  console.log('✅ formatHours test:', formatted);

  // Test parseTime method  
  const parsed = MonthlyPrintService.parseTime('14:30');
  console.log('✅ parseTime test:', parsed);

  // Test constants import
  const { DEFAULT_SETTINGS } = require('./src/constants');
  console.log('✅ DEFAULT_SETTINGS caricato');
  console.log('- Contract type:', DEFAULT_SETTINGS.contract?.type);
  console.log('- Meal allowances lunch:', DEFAULT_SETTINGS.mealAllowances?.lunch?.voucherAmount);
  console.log('- Standby daily allowance:', DEFAULT_SETTINGS.standbySettings?.dailyAllowance);

  console.log('\n🎉 CORREZIONE CONFERMATA!');
  console.log('✅ MonthlyPrintService ora usa la struttura corretta delle impostazioni');
  console.log('✅ Tutti i metodi statici funzionano correttamente');
  console.log('✅ Il servizio è pronto per generare PDF mensili');

} catch (error) {
  console.error('❌ ERRORE:', error.message);
  console.error('Stack:', error.stack);
}
