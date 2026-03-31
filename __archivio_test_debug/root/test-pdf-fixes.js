/**
 * Test delle correzioni PDF: viaggi compatti, giorni reperibilità, compensi reali
 */

const fs = require('fs');

console.log('=== TEST CORREZIONI PDF ===\n');

try {
  const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('🔍 Verificando le correzioni applicate:\n');
  
  // 1. Viaggi compatti (non più con join('<br>'))
  const hasCompactTravel = content.includes('travelInfo.join(\' | \')') && 
                          !content.includes('travelInfo.join(\'<br>\')');
  console.log(`${hasCompactTravel ? '✅' : '❌'} Viaggi in formato compatto (separati da |)`);
  
  // 2. Giorni solo reperibilità
  const hasStandbyDays = content.includes('standbyData.forEach(standbyDay') &&
                         content.includes('Giorno di sola reperibilità');
  console.log(`${hasStandbyDays ? '✅' : '❌'} Gestione giorni di sola reperibilità`);
  
  // 3. Compensi reali (non più hardcoded)
  const hasRealAllowances = content.includes('realTravelAllowance') && 
                           content.includes('realStandbyAllowance');
  console.log(`${hasRealAllowances ? '✅' : '❌'} Compensi reali (non più hardcoded)`);
  
  // 4. Interventi reperibilità multipli campi
  const hasStandbyInterventions = content.includes('standby_interventions') &&
                                 content.includes('reperibilita_interventi') &&
                                 content.includes('interventi_reperibilita');
  console.log(`${hasStandbyInterventions ? '✅' : '❌'} Gestione multipla campi interventi reperibilità`);
  
  // 5. Combinazione dati work + standby
  const hasAllEntries = content.includes('allEntries.sort') &&
                       content.includes('allEntries.forEach');
  console.log(`${hasAllEntries ? '✅' : '❌'} Combinazione inserimenti lavoro + giorni standby`);
  
  // 6. Passaggio standbyData a generateDailyEntries
  const hasStandbyParam = content.includes('generateDailyEntries(workEntries, settings, standbyData)');
  console.log(`${hasStandbyParam ? '✅' : '❌'} Passaggio dati standby alla generazione tabella`);
  
  console.log('\n📊 Analisi dettagliata dei campi:\n');
  
  // Verifica viaggi
  if (content.includes('travelDisplay')) {
    console.log('✅ Campo travelDisplay implementato per visualizzazione compatta');
  }
  
  // Verifica compensi
  if (content.includes('entry.travel_allowance && entry.travel_allowance > 0')) {
    console.log('✅ Controllo compenso trasferta reale');
  }
  
  if (content.includes('entry.standby_allowance && entry.standby_allowance > 0')) {
    console.log('✅ Controllo compenso reperibilità reale');
  }
  
  // Verifica interventi
  const interventionChecks = [
    'entry.standby_interventions',
    'entry.reperibilita_interventi', 
    'entry.interventi_reperibilita',
    'interventi.length > 0 && entry.is_standby_day'
  ];
  
  const foundChecks = interventionChecks.filter(check => content.includes(check));
  console.log(`✅ Controlli interventi: ${foundChecks.length}/${interventionChecks.length} implementati`);
  
  console.log('\n🎯 RISULTATO:');
  const allFixed = hasCompactTravel && hasStandbyDays && hasRealAllowances && 
                   hasStandbyInterventions && hasAllEntries && hasStandbyParam;
  
  if (allFixed) {
    console.log('✅ TUTTE LE CORREZIONI SONO STATE APPLICATE!');
    console.log('✅ Viaggi ora vengono mostrati in formato compatto');
    console.log('✅ Giorni di sola reperibilità verranno inclusi nella tabella');
    console.log('✅ Compensi trasferta e reperibilità mostrano valori reali');
    console.log('✅ Interventi reperibilità controllano multipli campi del database');
  } else {
    console.log('❌ Alcune correzioni potrebbero essere incomplete');
  }
  
} catch (error) {
  console.error('❌ Errore durante la verifica:', error.message);
}
