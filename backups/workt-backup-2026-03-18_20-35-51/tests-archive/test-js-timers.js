// 🧪 Test semplice JavaScript Timers - Eseguibile con Node.js
// Verifica se i timer JavaScript funzionano correttamente

console.log('🧪 === TEST JAVASCRIPT TIMERS (Node.js) ===');
console.log(`📅 Ora inizio: ${new Date().toISOString()}`);

async function testJavaScriptTimers() {
  const results = [];
  
  console.log('\n🚀 Avvio test timer JavaScript...');
  
  // Test 1: Timer breve (1 secondo)
  console.log('⏰ Test 1: Timer 1 secondo...');
  const test1 = await new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const duration = Date.now() - start;
      const accuracy = Math.abs(duration - 1000);
      const result = {
        test: 'Timer 1 secondo',
        target: 1000,
        actual: duration,
        accuracy: accuracy,
        success: accuracy < 100
      };
      console.log(`   ✅ Completato in ${duration}ms (diff: ${accuracy}ms)`);
      resolve(result);
    }, 1000);
  });
  results.push(test1);

  // Test 2: Timer medio (3 secondi)
  console.log('⏰ Test 2: Timer 3 secondi...');
  const test2 = await new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const duration = Date.now() - start;
      const accuracy = Math.abs(duration - 3000);
      const result = {
        test: 'Timer 3 secondi',
        target: 3000,
        actual: duration,
        accuracy: accuracy,
        success: accuracy < 150
      };
      console.log(`   ✅ Completato in ${duration}ms (diff: ${accuracy}ms)`);
      resolve(result);
    }, 3000);
  });
  results.push(test2);

  // Test 3: Timer lungo (5 secondi)
  console.log('⏰ Test 3: Timer 5 secondi...');
  const test3 = await new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const duration = Date.now() - start;
      const accuracy = Math.abs(duration - 5000);
      const result = {
        test: 'Timer 5 secondi',
        target: 5000,
        actual: duration,
        accuracy: accuracy,
        success: accuracy < 200
      };
      console.log(`   ✅ Completato in ${duration}ms (diff: ${accuracy}ms)`);
      resolve(result);
    }, 5000);
  });
  results.push(test3);

  // Analisi risultati
  console.log('\n📊 === ANALISI RISULTATI ===');
  
  const allPassed = results.every(r => r.success);
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  
  console.log(`✅ Tutti i test passati: ${allPassed ? 'SÌ' : 'NO'}`);
  console.log(`🎯 Precisione media: ${avgAccuracy.toFixed(1)}ms`);
  
  const reliability = avgAccuracy < 50 ? 'OTTIMA' : 
                     avgAccuracy < 100 ? 'ALTA' : 
                     avgAccuracy < 200 ? 'MEDIA' : 'BASSA';
  
  console.log(`🔧 Affidabilità: ${reliability}`);
  
  // Risultati dettagliati
  console.log('\n📋 DETTAGLI:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${result.test}: ${result.actual}ms (${result.accuracy}ms diff)`);
  });

  // Raccomandazione finale
  console.log('\n🎯 === RACCOMANDAZIONE ===');
  if (allPassed && avgAccuracy < 100) {
    console.log('🟢 JavaScript Timers funzionano PERFETTAMENTE');
    console.log('   ✅ Raccomandazione: Usa JavaScript Timers per notifiche precise');
  } else if (allPassed) {
    console.log('🟡 JavaScript Timers funzionano BENE');
    console.log('   ⚠️ Raccomandazione: JavaScript Timers utilizzabili ma non perfetti');
  } else {
    console.log('🔴 JavaScript Timers hanno PROBLEMI');
    console.log('   ❌ Raccomandazione: Evita JavaScript Timers, usa alternative');
  }

  console.log(`\n📅 Ora fine: ${new Date().toISOString()}`);
  
  return {
    allPassed,
    averageAccuracy: avgAccuracy,
    reliability,
    results
  };
}

// Test timer multipli simultanei
async function testMultipleTimers() {
  console.log('\n🔀 === TEST TIMER MULTIPLI ===');
  
  const promises = [];
  const startTime = Date.now();
  
  // Avvia 5 timer simultanei con delay diversi
  for (let i = 1; i <= 5; i++) {
    const delay = i * 1000; // 1s, 2s, 3s, 4s, 5s
    
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        const actualTime = Date.now() - startTime;
        const expectedTime = delay;
        const accuracy = Math.abs(actualTime - expectedTime);
        
        console.log(`   Timer ${i}: ${actualTime}ms (target: ${expectedTime}ms, diff: ${accuracy}ms)`);
        
        resolve({
          timerId: i,
          expected: expectedTime,
          actual: actualTime,
          accuracy: accuracy
        });
      }, delay);
    });
    
    promises.push(promise);
  }
  
  console.log('⏰ Avviati 5 timer simultanei...');
  const results = await Promise.all(promises);
  
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const maxAccuracy = Math.max(...results.map(r => r.accuracy));
  
  console.log(`📊 Precisione media timer multipli: ${avgAccuracy.toFixed(1)}ms`);
  console.log(`📊 Precisione peggiore: ${maxAccuracy}ms`);
  console.log(`✅ Timer multipli funzionano: ${maxAccuracy < 300 ? 'SÌ' : 'NO'}`);
  
  return results;
}

// Esegui test
async function runAllTests() {
  try {
    console.log('🚀 Avvio test completi JavaScript Timers...\n');
    
    // Test base
    const basicResults = await testJavaScriptTimers();
    
    // Test timer multipli
    const multipleResults = await testMultipleTimers();
    
    console.log('\n🎉 === TEST COMPLETATI ===');
    console.log(`✅ Timer base: ${basicResults.allPassed ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Timer multipli: ${multipleResults.every(r => r.accuracy < 300) ? 'PASS' : 'FAIL'}`);
    
    const overallSuccess = basicResults.allPassed && multipleResults.every(r => r.accuracy < 300);
    console.log(`\n🎯 VERDETTO FINALE: JavaScript Timers ${overallSuccess ? '✅ FUNZIONANO' : '❌ NON FUNZIONANO'}`);
    
    return {
      success: overallSuccess,
      basicTest: basicResults,
      multipleTest: multipleResults
    };
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
    return { success: false, error: error.message };
  }
}

// Avvia i test
runAllTests();
