// 🧹 PULIZIA DATABASE - Risolve errore SQLITE_FULL
// Script per pulire il database e recuperare spazio

console.log('🧹 PULIZIA DATABASE - Risoluzione SQLITE_FULL');
console.log('='.repeat(50));

console.log('\n❌ **PROBLEMA IDENTIFICATO**');
console.log('Errore: database or disk is full (code 13 SQLITE_FULL)');
console.log('🔍 Il database SQLite ha raggiunto il limite massimo di spazio');
console.log('💡 È necessario liberare spazio per continuare a funzionare');

console.log('\n🚨 **SOLUZIONE IMMEDIATA**');
console.log('1. 📱 Chiudi completamente l\'app (forza chiusura)');
console.log('2. 🔄 Riavvia l\'app');
console.log('3. 🧹 Vai in: Impostazioni → Backup → Pulisci backup vecchi');
console.log('4. ⚙️ Vai in: Impostazioni → Database → Ottimizza database');

console.log('\n🗑️ **PULIZIA MANUALE DATI**');
console.log('Se il problema persiste, pulisci manualmente:');
console.log('');
console.log('**AsyncStorage** (backup vecchi):');
console.log('- manual_backup_* (backup manuali vecchi)');
console.log('- auto_backup_* (backup automatici vecchi)');
console.log('- emergency_backup_* (backup emergenza)');
console.log('- backup_chunk_* (chunks backup interrotti)');
console.log('');
console.log('**Database SQLite**:');
console.log('- VACUUM; (compatta database)');
console.log('- DELETE FROM logs WHERE date < "2025-06-01";');
console.log('- REINDEX; (ricostruisce indici)');

console.log('\n🔧 **COMANDI DATABASE**');
console.log('Esegui nell\'app (console developer):');
console.log('');
console.log('// Vacuum database');
console.log('DatabaseService.vacuum()');
console.log('');
console.log('// Pulisci log vecchi');
console.log('DatabaseService.query("DELETE FROM logs WHERE created_at < date(\\"now\\", \\"-30 days\\")");');
console.log('');
console.log('// Ottimizza database');
console.log('DatabaseService.query("REINDEX");');

console.log('\n⚠️ **SE NULLA FUNZIONA**');
console.log('**Reset database** (PERDI TUTTI I DATI):');
console.log('1. Esporta prima tutti gli orari importanti');
console.log('2. Impostazioni → Database → Reset completo');
console.log('3. Riavvia app e riconfigura impostazioni');

console.log('\n🛡️ **PREVENZIONE FUTURA**');
console.log('- ✅ Attiva pulizia automatica backup (max 3 file)');
console.log('- ✅ Esegui VACUUM settimanale automatico');
console.log('- ✅ Limita dimensione backup a 5MB');
console.log('- ✅ Pulisci log automaticamente dopo 30 giorni');

console.log('\n💾 **BACKUP SICUREZZA**');
console.log('Prima di qualsiasi operazione:');
console.log('1. 📤 Esporta dati → File esterno');
console.log('2. 📝 Annota impostazioni principali');
console.log('3. 📸 Screenshot configurazioni CCNL');

console.log('\n' + '='.repeat(50));
console.log('🎯 **AZIONE RICHIESTA**: Riavvia app e ottimizza database');
console.log('⚡ **URGENTE**: Il database deve essere pulito subito');
console.log('🔄 **DOPO PULIZIA**: Riprova backup automatico');
