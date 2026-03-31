/**
 * Test generazione PDF completa - verifica che tutte le sezioni siano presenti
 */

console.log('🔍 Test generazione PDF completa...\n');

// Simula la generazione di un PDF per verificare che tutte le sezioni siano incluse
const mockData = {
  workEntries: [
    {
      id: 1,
      date: '2025-07-01',
      site_name: 'Cantiere Test',
      work_start_1: '08:00',
      work_end_1: '17:00',
      vehicle_driven: 'Fiat Ducato',
      departure_company: '08:00',
      arrival_site: '08:30',
      departure_return: '17:00',
      arrival_company: '17:30',
      travel_allowance: 50.00,
      standby_allowance: 0,
      meal_lunch_voucher: 1,
      total_earnings: 180.50,
      notes: 'Test inserimento',
      is_standby_day: false,
      day_type: 'feriale'
    }
  ],
  settings: {
    contract: {
      type: 'CCNL Metalmeccanico',
      level: 5,
      monthlySalary: 2800
    },
    travelAllowance: { dailyAmount: 50 },
    mealAllowances: {
      lunch: { voucherAmount: 8, cashAmount: 0 }
    },
    standbySettings: {
      allowanceType: '16h',
      customFeriale16: 4.22,
      customFestivo: 10.63
    }
  },
  standbyData: [
    {
      date: '2025-07-02',
      is_standby: true,
      allowance: 4.22,
      day_type: 'feriale',
      interventions: 0
    }
  ],
  monthlyCalculations: {
    totalHours: 10.5,
    ordinaryHours: 8,
    overtimeHours: 2.5,
    totalEarnings: 230.72,
    workingDays: 1,
    travelHours: 1
  },
  year: 2025,
  month: 7
};

try {
  // Simula la chiamata al MonthlyPrintService
  const fs = require('fs');
  const serviceContent = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('📋 Verificando le sezioni del PDF:\n');
  
  // Controlla che tutti i metodi di generazione esistano
  const sections = [
    { name: 'generateHeader', desc: 'Intestazione PDF' },
    { name: 'generateContractInfo', desc: 'Informazioni contrattuali' },
    { name: 'generateMonthlySummary', desc: 'Riepilogo mensile' },
    { name: 'generateDailyEntries', desc: 'Tabella inserimenti dettagliati' },
    { name: 'generateStandbyCalendar', desc: 'Calendario reperibilità' },
    { name: 'generateDetailedBreakdown', desc: 'Breakdown compensi' },
    { name: 'generateFooter', desc: 'Footer documento' }
  ];
  
  sections.forEach(section => {
    const found = serviceContent.includes(`static ${section.name}(`);
    console.log(`${found ? '✅' : '❌'} ${section.desc} (${section.name})`);
  });
  
  console.log('\n📄 Verificando chiamate nel generateCompletePrintHTML:\n');
  
  const htmlGenerationCalls = [
    'generateHeader(monthNames[month - 1], year)',
    'generateContractInfo(settings)', 
    'generateMonthlySummary(monthlyCalculations)',
    'generateDailyEntries(workEntries, settings, standbyData)',
    'generateStandbyCalendar(standbyData)',
    'generateDetailedBreakdown(monthlyCalculations)',
    'generateFooter()'
  ];
  
  htmlGenerationCalls.forEach(call => {
    const found = serviceContent.includes(call);
    console.log(`${found ? '✅' : '❌'} ${call}`);
  });
  
  console.log('\n🔍 Verificando struttura generateDailyEntries:\n');
  
  // Verifica che generateDailyEntries generi la tabella
  const tableChecks = [
    'entries-table',
    '<thead>',
    '<tbody>',
    'Data</th>',
    'Cantiere</th>', 
    'Veicolo</th>',
    'Orari Lavoro</th>',
    'Viaggi</th>',
    'Trasferta €</th>',
    'Reperibilità €</th>',
    'Interventi Rep.</th>',
    'Totale €</th>',
    'Pasti</th>',
    'Note</th>'
  ];
  
  tableChecks.forEach(check => {
    const found = serviceContent.includes(check);
    console.log(`${found ? '✅' : '❌'} Tabella: ${check}`);
  });
  
  console.log('\n🎯 RISULTATO:\n');
  
  const allSectionsPresent = sections.every(s => serviceContent.includes(`static ${s.name}(`));
  const allCallsPresent = htmlGenerationCalls.every(call => serviceContent.includes(call));
  const tableStructureOK = tableChecks.every(check => serviceContent.includes(check));
  
  if (allSectionsPresent && allCallsPresent && tableStructureOK) {
    console.log('✅ TUTTE LE SEZIONI SONO PRESENTI E CONFIGURATE CORRETTAMENTE!');
    console.log('✅ La tabella degli inserimenti dovrebbe essere generata');
    console.log('✅ Il PDF dovrebbe contenere tutte le sezioni richieste');
  } else {
    console.log('❌ Alcune sezioni potrebbero mancare o non essere chiamate correttamente');
    if (!allSectionsPresent) console.log('   → Controllo presenza metodi sezioni');
    if (!allCallsPresent) console.log('   → Controllo chiamate in generateCompletePrintHTML');
    if (!tableStructureOK) console.log('   → Controllo struttura tabella inserimenti');
  }
  
} catch (error) {
  console.error('❌ Errore durante la verifica:', error.message);
}
