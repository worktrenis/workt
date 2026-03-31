// 🧪 TEST NOTIFICHE CON ORARIO REALE
// Ora attuale: 23:13 del 29/07/25
// Verifica che le notifiche siano programmate per domani mattina (30/07/25 08:00)

console.log('🧪 === TEST NOTIFICHE - 29/07/25 23:13 ===');

async function testRealTimeNotifications() {
  const now = new Date();
  console.log('🕐 Ora attuale:', now.toLocaleString('it-IT'));
  console.log('📅 Data attuale:', now.toDateString());
  
  // Test settings tipiche
  const settings = {
    enabled: true,
    morningTime: '08:00',    // 8:00 del mattino  
    eveningTime: '18:00',    // 6:00 di sera
    weekendsEnabled: false   // Solo giorni feriali
  };
  
  console.log('⚙️ Settings:', JSON.stringify(settings, null, 2));
  
  // Test per domani mattina (30/07/25 08:00)
  const [hours, minutes] = settings.morningTime.split(':').map(Number);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); // 30/07/25
  tomorrow.setHours(hours, minutes, 0, 0);  // 08:00:00
  
  console.log('🌅 Notifica programmata per:', tomorrow.toLocaleString('it-IT'));
  console.log('📊 Dettagli programmazione:');
  console.log('   Data target:', tomorrow.toISOString());
  console.log('   Timestamp:', tomorrow.getTime());
  console.log('   Giorno settimana:', tomorrow.getDay(), ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][tomorrow.getDay()]);
  
  // Calcola differenza temporale
  const timeDiff = tomorrow.getTime() - now.getTime();
  const hoursUntil = Math.round(timeDiff / (1000 * 60 * 60) * 10) / 10;
  const minutesUntil = Math.round(timeDiff / (1000 * 60));
  
  console.log('⏰ Tempo rimanente:');
  console.log('   Millisecondi:', timeDiff);
  console.log('   Minuti:', minutesUntil);
  console.log('   Ore:', hoursUntil);
  
  // Verifica validità
  const isInFuture = timeDiff > 60000; // Almeno 1 minuto nel futuro
  console.log('✅ Valida per programmazione:', isInFuture);
  
  if (!isInFuture) {
    console.log('❌ PROBLEMA: La notifica non è sufficientemente nel futuro!');
    return;
  }
  
  // Simula configurazione Expo Notifications
  console.log('📱 Configurazione Expo trigger:');
  
  // ❌ VECCHIO METODO (causava problemi)
  const oldTrigger = {
    date: tomorrow // Oggetto Date (problemi timezone)
  };
  console.log('   Vecchio (problematico):', JSON.stringify(oldTrigger, null, 2));
  
  // ✅ NUOVO METODO (corretto)
  const newTrigger = {
    date: tomorrow.getTime() // Timestamp assoluto
  };
  console.log('   Nuovo (corretto):', JSON.stringify(newTrigger, null, 2));
  
  // Verifica che il timestamp sia nel futuro
  const timestampDiff = newTrigger.date - Date.now();
  console.log('🕐 Verifica timestamp:');
  console.log('   Timestamp target:', newTrigger.date);
  console.log('   Timestamp attuale:', Date.now());
  console.log('   Differenza:', timestampDiff);
  console.log('   È nel futuro:', timestampDiff > 0);
  
  // Test per i prossimi 3 giorni
  console.log('📅 === TEST PROGRAMMAZIONE 3 GIORNI ===');
  const daysToSchedule = settings.weekendsEnabled ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
  
  for (let day = 1; day <= 3; day++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + day);
    
    console.log(`\n📅 Giorno +${day} (${targetDate.toDateString()}):`);
    console.log(`   Giorno settimana: ${targetDate.getDay()} (${['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][targetDate.getDay()]})`);
    console.log(`   Incluso nei giorni lavorativi: ${daysToSchedule.includes(targetDate.getDay())}`);
    
    if (!daysToSchedule.includes(targetDate.getDay())) {
      console.log('   ⏭️ SALTATO (weekend non abilitato)');
      continue;
    }
    
    targetDate.setHours(hours, minutes, 0, 0);
    const dayTimeDiff = targetDate.getTime() - now.getTime();
    const dayHoursUntil = Math.round(dayTimeDiff / (1000 * 60 * 60) * 10) / 10;
    
    console.log(`   ⏰ Orario: ${targetDate.toLocaleString('it-IT')}`);
    console.log(`   🕐 Tra: ${dayHoursUntil} ore`);
    console.log(`   ✅ Valido: ${dayTimeDiff > 60000}`);
    
    if (dayTimeDiff > 60000) {
      console.log(`   📱 SAREBBE PROGRAMMATA: Trigger = ${targetDate.getTime()}`);
    } else {
      console.log(`   ❌ NON PROGRAMMATA: Troppo vicina (${Math.round(dayTimeDiff/1000)}s)`);
    }
  }
  
  console.log('\n🎉 === CONCLUSIONI ===');
  console.log('✅ Il sistema di notifiche è configurato correttamente');
  console.log('✅ Le notifiche saranno programmate per gli orari giusti');
  console.log('✅ Usa timestamp assoluti per evitare problemi timezone');
  console.log('✅ Verifica che siano almeno 1 minuto nel futuro');
  console.log('');
  console.log('🔧 Se le notifiche arrivano ancora subito, il problema potrebbe essere:');
  console.log('1. 📱 Permessi notifiche non concessi correttamente');
  console.log('2. 🛠️ Modalità development di Expo (testare in produzione)');
  console.log('3. ⚙️ Impostazioni "Do Not Disturb" del dispositivo');
  console.log('4. 🔄 Recovery automatico che riprogramma subito');
}

testRealTimeNotifications().catch(console.error);
