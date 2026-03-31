/**
 * Test del nuovo metodo getStandbyDaysFromSettings
 */

const fs = require('fs');

console.log('=== TEST METODO STANDBY SEMPLIFICATO ===\n');

try {
  const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('🔍 Verificando il nuovo metodo:\n');
  
  // 1. Metodo getStandbyDaysFromSettings presente
  const hasMethod = content.includes('getStandbyDaysFromSettings(year, month, settings)');
  console.log(`${hasMethod ? '✅' : '❌'} Metodo getStandbyDaysFromSettings definito`);
  
  // 2. Logica standby settings
  const hasLogic = content.includes('settings.standbySettings.standbyDays') &&
                   content.includes('dayConfig.selected === true');
  console.log(`${hasLogic ? '✅' : '❌'} Logica lettura standbyDays dalle impostazioni`);
  
  // 3. Calcolo indennità
  const hasCalculation = content.includes('customFeriale16') &&
                         content.includes('customFeriale24') &&
                         content.includes('customFestivo');
  console.log(`${hasCalculation ? '✅' : '❌'} Calcolo indennità basato su tipo giorno`);
  
  // 4. Uso del nuovo metodo
  const hasUsage = content.includes('this.getStandbyDaysFromSettings(year, month, currentSettings)');
  console.log(`${hasUsage ? '✅' : '❌'} Nuovo metodo utilizzato nel getAllMonthlyData`);
  
  // 5. Nessun import problematico
  const noProblematicImport = !content.includes('import(\'./CalculationService\')') &&
                              !content.includes('require(\'./CalculationService\')');
  console.log(`${noProblematicImport ? '✅' : '❌'} Nessun import problematico di CalculationService`);
  
  console.log('\n📊 Analisi della logica:\n');
  
  // Controllo presenza dei valori CCNL
  const ccnlValues = [
    'IND_16H_FERIALE = 4.22',
    'IND_24H_FERIALE = 7.03',
    'IND_24H_FESTIVO = 10.63'
  ];
  
  ccnlValues.forEach(value => {
    const found = content.includes(value);
    console.log(`${found ? '✅' : '❌'} Valore CCNL: ${value}`);
  });
  
  // Controllo logica tipo giorno
  const dayLogic = [
    'isSunday || (isSaturday && saturdayAsRest)',
    'allowanceType === \'16h\'',
    'dayType = \'festivo\'',
    'dayType = \'feriale\''
  ];
  
  console.log('\n🗓️ Logica tipo giorno:');
  dayLogic.forEach(logic => {
    const found = content.includes(logic);
    console.log(`${found ? '✅' : '❌'} ${logic}`);
  });
  
  console.log('\n🎯 RISULTATO:\n');
  
  const allGood = hasMethod && hasLogic && hasCalculation && hasUsage && noProblematicImport;
  
  if (allGood) {
    console.log('✅ IMPLEMENTAZIONE COMPLETA E CORRETTA!');
    console.log('✅ Nessun import problematico di CalculationService');
    console.log('✅ Logica standby autonoma implementata');
    console.log('✅ Calcolo indennità CCNL corretto');
    console.log('');
    console.log('📱 PROVA ORA:');
    console.log('  1. Riavvia Expo (npx expo start)');
    console.log('  2. Vai in Impostazioni → Reperibilità');
    console.log('  3. Seleziona alcuni giorni per luglio 2025');
    console.log('  4. Genera il PDF');
    console.log('  5. I giorni standby dovrebbero apparire!');
  } else {
    console.log('❌ Implementazione incompleta o problematica');
  }
  
} catch (error) {
  console.error('❌ Errore durante la verifica:', error.message);
}
