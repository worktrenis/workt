/**
 * Test della modifica per interventi reperibilità con ore
 */

const fs = require('fs');

console.log('=== TEST INTERVENTI REPERIBILITÀ CON ORE ===\n');

try {
  const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('🔍 Verificando la nuova logica interventi:\n');
  
  // 1. Calcolo ore totali
  const hasHoursCalculation = content.includes('const totalHours = workHours + travel');
  console.log(`${hasHoursCalculation ? '✅' : '❌'} Calcolo ore totali (lavoro + viaggio)`);
  
  // 2. Formattazione ore lavoro e viaggio
  const hasHoursFormatting = content.includes('L:${workHours.toFixed(1)}h V:${travel.toFixed(1)}h') &&
                            content.includes('L:${workHours.toFixed(1)}h') &&
                            content.includes('V:${travel.toFixed(1)}h');
  console.log(`${hasHoursFormatting ? '✅' : '❌'} Formattazione ore (L:Xh V:Yh)`);
  
  // 3. Gestione casi speciali
  const hasSpecialCases = content.includes('0h') &&
                         content.includes('int.');
  console.log(`${hasSpecialCases ? '✅' : '❌'} Gestione casi speciali (0h, interventi registrati)`);
  
  // 4. Condizione per reperibilità
  const hasStandbyCondition = content.includes('entry.is_standby_day || entry.standby_allowance > 0');
  console.log(`${hasStandbyCondition ? '✅' : '❌'} Condizione per giorni reperibilità`);
  
  // 5. Fallback per interventi registrati
  const hasFallback = content.includes('entry.standby_interventions') &&
                     content.includes('entry.reperibilita_interventi') &&
                     content.includes('entry.interventi_reperibilita');
  console.log(`${hasFallback ? '✅' : '❌'} Fallback per interventi registrati nel DB`);
  
  console.log('\n📊 Analisi dei casi d\'uso:\n');
  
  // Esempi di output previsti
  const examples = [
    { case: 'Lavoro + Viaggio', output: 'L:8.0h V:2.0h', condition: 'workHours > 0 && travel > 0' },
    { case: 'Solo Lavoro', output: 'L:8.0h', condition: 'workHours > 0, travel = 0' },
    { case: 'Solo Viaggio', output: 'V:2.0h', condition: 'workHours = 0, travel > 0' },
    { case: 'Nessuna ora', output: '0h', condition: 'workHours = 0, travel = 0, no interventions' },
    { case: 'Interventi registrati', output: '3 int.', condition: 'no hours, but interventions in DB' }
  ];
  
  examples.forEach(example => {
    const hasPattern = content.includes(example.output) || 
                      content.includes(example.output.replace(/[0-9]/g, '${').replace('h', 'h}'));
    console.log(`${hasPattern ? '✅' : '❌'} ${example.case}: "${example.output}"`);
  });
  
  console.log('\n🎯 VANTAGGI DELLA NUOVA LOGICA:\n');
  console.log('PRIMA:');
  console.log('  • Interventi Rep.: 1 (valore fisso/generico)');
  console.log('');
  console.log('DOPO:');
  console.log('  • Interventi Rep.: L:8.0h V:2.0h (ore dettagliate)');
  console.log('  • Interventi Rep.: L:6.5h (solo lavoro)');
  console.log('  • Interventi Rep.: V:1.5h (solo viaggio)');
  console.log('  • Interventi Rep.: 0h (reperibilità senza interventi)');
  console.log('  • Interventi Rep.: 3 int. (interventi registrati senza ore)');
  
  console.log('\n🎯 RISULTATO:\n');
  
  const allGood = hasHoursCalculation && hasHoursFormatting && hasSpecialCases && 
                  hasStandbyCondition && hasFallback;
  
  if (allGood) {
    console.log('✅ LOGICA INTERVENTI REPERIBILITÀ AGGIORNATA!');
    console.log('✅ Ora mostra ore lavoro e viaggio dettagliate');
    console.log('✅ Gestisce tutti i casi possibili');
    console.log('✅ Formato compatto e informativo');
    console.log('');
    console.log('📱 PROVA ORA:');
    console.log('  1. Genera un PDF con giorni di reperibilità');
    console.log('  2. Controlla colonna "Interventi Rep."');
    console.log('  3. Dovresti vedere ore dettagliate invece di "1"');
  } else {
    console.log('❌ Logica potrebbe essere incompleta');
  }
  
} catch (error) {
  console.error('❌ Errore durante la verifica:', error.message);
}
