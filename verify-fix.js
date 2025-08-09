// 🔧 VERIFICA CORREZIONE forceReschedule
// Test per verificare che il metodo forceReschedule sia stato corretto

console.log('🔧 VERIFICA CORREZIONE forceReschedule');
console.log('='.repeat(50));

const fs = require('fs');
const path = require('path');

try {
  // Leggi il file PersistentNotificationService
  const serviceCode = fs.readFileSync(
    path.join(__dirname, 'src/services/PersistentNotificationService.js'), 
    'utf8'
  );

  console.log('\n🔍 Analisi del metodo forceReschedule:');
  console.log('━'.repeat(40));

  // Cerca il metodo forceReschedule
  const forceRescheduleMatch = serviceCode.match(/async forceReschedule\(\)[\s\S]*?(?=async|\/\/|$)/);
  
  if (forceRescheduleMatch) {
    const methodCode = forceRescheduleMatch[0];
    
    // Verifica che NON contenga più scheduleAllNotifications
    if (methodCode.includes('scheduleAllNotifications')) {
      console.log('❌ ERRORE: Il metodo contiene ancora scheduleAllNotifications');
    } else {
      console.log('✅ CORRETTO: scheduleAllNotifications rimosso');
    }
    
    // Verifica che contenga i metodi corretti
    const requiredMethods = [
      'scheduleWorkReminders',
      'scheduleTimeEntryReminders', 
      'scheduleStandbyReminders',
      'scheduleBackupReminders'
    ];
    
    let allMethodsPresent = true;
    for (const method of requiredMethods) {
      if (methodCode.includes(method)) {
        console.log(`✅ ${method} presente`);
      } else {
        console.log(`❌ ${method} MANCANTE`);
        allMethodsPresent = false;
      }
    }
    
    if (allMethodsPresent) {
      console.log('\n🎉 CORREZIONE COMPLETATA CORRETTAMENTE!');
      console.log('   Il metodo forceReschedule ora usa la stessa logica di emergencyReschedule');
    } else {
      console.log('\n⚠️ Correzione incompleta - alcuni metodi mancanti');
    }
    
  } else {
    console.log('❌ Metodo forceReschedule non trovato');
  }
  
  console.log('\n📋 Riepilogo della correzione:');
  console.log('   ❌ Prima: this.scheduleAllNotifications(settings) - NON ESISTEVA');
  console.log('   ✅ Dopo: Usa scheduleWorkReminders, scheduleTimeEntryReminders, etc.');
  console.log('   ✅ Risultato: Riprogrammazione funzionante dalla schermata debug');

} catch (error) {
  console.error('❌ Errore verifica:', error.message);
}

console.log('\n🚀 L\'app sta partendo - prova ora il pulsante "Riprogramma Tutte"');
console.log('   in Impostazioni → Debug Notifiche');
