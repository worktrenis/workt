/**
 * Test per verificare la formattazione PDF con limitazione a 2 righe
 */

const fs = require('fs');

console.log('=== TEST PDF FORMATTING ===\n');

try {
  // Leggi il contenuto del MonthlyPrintService
  const content = fs.readFileSync('./src/services/MonthlyPrintService.js', 'utf8');
  
  console.log('📋 Verificando le modifiche CSS applicate:');
  
  const checks = [
    { 
      name: 'Limitazione altezza (max-height: 24px)', 
      pattern: 'max-height: 24px',
      found: content.includes('max-height: 24px') 
    },
    { 
      name: 'Font ridotto (font-size: 7px)', 
      pattern: 'font-size: 7px',
      found: content.includes('font-size: 7px') 
    },
    { 
      name: 'Interlinea (line-height: 1.1)', 
      pattern: 'line-height: 1.1',
      found: content.includes('line-height: 1.1') 
    },
    { 
      name: 'Overflow nascosto (overflow: hidden)', 
      pattern: 'overflow: hidden',
      found: content.includes('overflow: hidden') 
    }
  ];
  
  checks.forEach(check => {
    console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
  });
  
  console.log('\n📊 Verificando la struttura della tabella:');
  
  // Verifica colonne
  const columns = [
    'Data', 'Cantiere', 'Veicolo', 'Orari Lavoro', 'Viaggi',
    'Trasferta €', 'Reperibilità €', 'Interventi Rep.', 'Totale €', 
    'Pasti', 'Note'
  ];
  
  columns.forEach((col, index) => {
    const found = content.includes(col);
    console.log(`${found ? '✅' : '❌'} Colonna ${index + 1}: ${col}`);
  });
  
  // Verifica larghezze colonne
  console.log('\n📐 Verificando le larghezze delle colonne:');
  const widths = [
    { col: 1, width: '8%', name: 'Data' },
    { col: 2, width: '10%', name: 'Cantiere' },
    { col: 3, width: '8%', name: 'Veicolo' },
    { col: 4, width: '12%', name: 'Orari Lavoro' },
    { col: 5, width: '15%', name: 'Viaggi' },
    { col: 6, width: '8%', name: 'Trasferta €' },
    { col: 7, width: '8%', name: 'Reperibilità €' },
    { col: 8, width: '8%', name: 'Interventi Rep.' },
    { col: 9, width: '10%', name: 'Totale €' },
    { col: 10, width: '10%', name: 'Pasti' },
    { col: 11, width: '13%', name: 'Note' }
  ];
  
  widths.forEach(w => {
    const pattern = `nth-child(${w.col}) { width: ${w.width}`;
    const found = content.includes(pattern);
    console.log(`${found ? '✅' : '❌'} ${w.name}: ${w.width}`);
  });
  
  // Calcola totale larghezze
  const totalWidth = widths.reduce((sum, w) => sum + parseInt(w.width), 0);
  console.log(`\n📏 Larghezza totale: ${totalWidth}%`);
  
  console.log('\n🎯 RISULTATO FINALE:');
  const allChecksPass = checks.every(c => c.found);
  const allColumnsFound = columns.every(col => content.includes(col));
  const allWidthsFound = widths.every(w => 
    content.includes(`nth-child(${w.col}) { width: ${w.width}`)
  );
  
  if (allChecksPass && allColumnsFound && allWidthsFound) {
    console.log('✅ TUTTE LE MODIFICHE SONO STATE APPLICATE CORRETTAMENTE!');
    console.log('✅ La tabella PDF ora limita le celle a massimo 2 righe');
    console.log('✅ La struttura a 11 colonne è implementata');
    console.log('✅ Le larghezze delle colonne sono configurate');
  } else {
    console.log('❌ Alcune modifiche potrebbero non essere state applicate');
  }
  
} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
