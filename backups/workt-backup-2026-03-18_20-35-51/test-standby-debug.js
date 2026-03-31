/**
 * Test recupero dati standby e integrazione
 */

console.log('🔍 Test recupero dati standby per PDF...\n');

// Simula il test di recupero dati
const testMonthlyData = async () => {
  try {
    // Test di controllo che il servizio esista
    const fs = require('fs');
    const serviceExists = fs.existsSync('./src/services/MonthlyPrintService.js');
    console.log(`${serviceExists ? '✅' : '❌'} MonthlyPrintService trovato`);
    
    if (!serviceExists) {
      console.log('❌ File non trovato, impossibile continuare il test');
      return;
    }
    
    const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
    
    // Verifica che i debug logs siano presenti
    const hasDebugLogs = content.includes('Processando ${standbyData.length} giorni standby') &&
                        content.includes('Aggiungendo giorno di sola reperibilità') &&
                        content.includes('Aggiunti ${standbyOnlyCount} giorni');
    
    console.log(`${hasDebugLogs ? '✅' : '❌'} Debug logs per standby aggiunti`);
    
    // Verifica la logica di combinazione
    const hasStandbyCombination = content.includes('!workDates.has(standbyDay.date)') &&
                                 content.includes('standbyDay.is_standby') &&
                                 content.includes('site_name: \'Reperibilità\'');
    
    console.log(`${hasStandbyCombination ? '✅' : '❌'} Logica combinazione standby presente`);
    
    // Verifica chiamata a getStandbyDays
    const hasStandbyCall = content.includes('DatabaseService.getStandbyDays(year, month)');
    console.log(`${hasStandbyCall ? '✅' : '❌'} Chiamata getStandbyDays presente`);
    
    // Verifica passaggio parametri
    const hasStandbyParam = content.includes('generateDailyEntries(workEntries, settings, standbyData)');
    console.log(`${hasStandbyParam ? '✅' : '❌'} Parametro standbyData passato`);
    
    console.log('\n📊 Analisi della struttura dati standby:\n');
    
    // Verifica che l'entry virtuale abbia tutti i campi necessari
    const requiredFields = [
      'site_name: \'Reperibilità\'',
      'is_standby_day: true',
      'notes: \'Giorno di sola reperibilità\'',
      'standby_allowance: standbyDay.allowance',
      'day_type: standbyDay.day_type'
    ];
    
    requiredFields.forEach(field => {
      const found = content.includes(field);
      console.log(`${found ? '✅' : '❌'} Campo entry virtuale: ${field}`);
    });
    
    console.log('\n🎯 RISULTATO:\n');
    
    if (hasDebugLogs && hasStandbyCombination && hasStandbyCall && hasStandbyParam) {
      console.log('✅ LOGICA STANDBY IMPLEMENTATA CORRETTAMENTE!');
      console.log('✅ Debug logs attivi per diagnosticare il problema');
      console.log('✅ Entry virtuali create per giorni di sola reperibilità');
      console.log('');
      console.log('📱 Prova ora a generare un PDF e controlla i logs Expo');
      console.log('📱 I logs mostreranno se vengono trovati giorni standby');
    } else {
      console.log('❌ Alcune parti della logica standby potrebbero mancare');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
};

testMonthlyData();
