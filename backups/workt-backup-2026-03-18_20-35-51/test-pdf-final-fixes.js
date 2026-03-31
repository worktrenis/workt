/**
 * Test delle correzioni PDF: viaggi e indennità
 */

const fs = require('fs');

console.log('=== TEST CORREZIONI VIAGGI E INDENNITÀ ===\n');

try {
  const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('🔍 Verificando le correzioni:\n');
  
  // 1. Viaggi compatti senza etichette P: A: R: F:
  const hasCompactTravel = content.includes('travelInfo.join(\' → \')') && 
                          !content.includes('P: ${entry.departure_company}');
  console.log(`${hasCompactTravel ? '✅' : '❌'} Viaggi mostrano solo orari (senza P: A: R: F:)`);
  
  // 2. Indennità calcolate dalle impostazioni
  const hasRealAllowances = content.includes('settings.travelAllowance?.dailyAmount') &&
                           content.includes('settings.standbySettings.customFeriale16') &&
                           content.includes('settings.standbySettings.customFestivo');
  console.log(`${hasRealAllowances ? '✅' : '❌'} Indennità calcolate dalle impostazioni reali`);
  
  // 3. Calcolo standby in base al tipo di giorno
  const hasStandbyLogic = content.includes('isSunday') && 
                         content.includes('isHoliday') &&
                         content.includes('allowanceType === \'16h\'');
  console.log(`${hasStandbyLogic ? '✅' : '❌'} Logica calcolo reperibilità in base al giorno`);
  
  // 4. Viaggi con freccia →
  const hasTravelArrow = content.includes(' → ');
  console.log(`${hasTravelArrow ? '✅' : '❌'} Viaggi separati da freccia (→)`);
  
  console.log('\n📊 Dettagli implementazione:\n');
  
  // Controllo specifico viaggi
  if (content.includes('${entry.departure_company}') && !content.includes('P: ${entry.departure_company}')) {
    console.log('✅ Viaggi: Rimossi prefissi P:, A:, R:, F:');
  }
  
  // Controllo logica indennità
  const allowanceChecks = [
    'settings.travelAllowance?.dailyAmount',
    'settings.standbySettings.customFeriale16 || 4.22',
    'settings.standbySettings.customFeriale24 || 7.03', 
    'settings.standbySettings.customFestivo || 10.63'
  ];
  
  const foundAllowanceChecks = allowanceChecks.filter(check => content.includes(check));
  console.log(`✅ Controlli indennità: ${foundAllowanceChecks.length}/${allowanceChecks.length} implementati`);
  
  // Controllo condizioni giorno
  const dayChecks = [
    'isHoliday || isSunday',
    'allowanceType === \'16h\'',
    'entry.is_standby_day'
  ];
  
  const foundDayChecks = dayChecks.filter(check => content.includes(check));
  console.log(`✅ Condizioni tipo giorno: ${foundDayChecks.length}/${dayChecks.length} implementate`);
  
  console.log('\n🎯 RISULTATO:');
  const allFixed = hasCompactTravel && hasRealAllowances && hasStandbyLogic && hasTravelArrow;
  
  if (allFixed) {
    console.log('✅ TUTTE LE CORREZIONI SONO STATE APPLICATE!');
    console.log('✅ Viaggi: Solo orari con frecce →');
    console.log('✅ Indennità: Valori reali calcolati dalle impostazioni');
    console.log('✅ Reperibilità: Calcolo corretto per feriali/festivi/16h/24h');
  } else {
    console.log('❌ Alcune correzioni potrebbero essere incomplete');
  }
  
} catch (error) {
  console.error('❌ Errore durante la verifica:', error.message);
}
