// Test per analizzare i dati della card Lavoro Ordinario nel DashboardScreen
console.log('🔍 TEST: Analisi card Lavoro Ordinario nel DashboardScreen');

console.log('📋 QUELLO CHE DOVREBBE ESSERE MOSTRATO NELLA CARD:');
console.log('1. ✅ Giorni lavorativi totali');
console.log('2. ✅ Ore totali (lavoro + viaggio)');
console.log('3. ✅ Retribuzione giornaliera CCNL base');
console.log('4. ✅ Straordinari lavoro (+20%)');
console.log('5. ✅ Viaggio extra');
console.log('6. ✅ Maggiorazioni weekend/festivi');
console.log('7. ✅ Totale Lavoro Ordinario');

console.log('\n🤔 POSSIBILI INFORMAZIONI MANCANTI/NON VISIBILI:');
console.log('- Suddivisione ore normali vs straordinarie');
console.log('- Percentuale straordinari');
console.log('- Dettaglio calcolo CCNL');
console.log('- Ore viaggio incluse nel CCNL vs extra');
console.log('- Informazioni su ore notturne');

console.log('\n📱 SOLUZIONE: Aprire l\'app e controllare nei log del console "🔧 DASHBOARD ORDINARY CARD"');
console.log('💡 I log ti diranno esattamente quali dati sono disponibili e cosa viene mostrato');

console.log('\nℹ️  Se vedi che la card mostra solo alcune informazioni:');
console.log('   1. Controlla se i dati nel monthlyAggregated.ordinary sono completi');
console.log('   2. Verifica se le condizioni (es. ordinary.hours.lavoro_extra > 0) sono soddisfatte');
console.log('   3. Assicurati che i calcoli nel calculateMonthlyAggregation siano corretti');

console.log('\n🔧 Test completato - ora controlla l\'app!');
