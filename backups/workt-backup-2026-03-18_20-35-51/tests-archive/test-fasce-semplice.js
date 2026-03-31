// Test semplice per la funzione calculateHourlyRatesByTimeSlots

// Simula la funzione (copiando il codice)
function calculateHourlyRatesByTimeSlots(startTime, endTime, baseRate, contract, isOvertime = false, isHoliday = false, isSunday = false) {
  const timeSlots = [];
  
  // Converti orari in minuti per calcoli più precisi
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Gestisci il caso di attraversamento della mezzanotte
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Aggiungi 24 ore
  }
  
  // Fasce orarie CCNL (in minuti)
  const CCNL_TIME_SLOTS = [
    { start: 6 * 60, end: 20 * 60, name: 'diurno', multiplier: isOvertime ? (contract?.overtimeRates?.day || 1.2) : 1.0 },
    { start: 20 * 60, end: 22 * 60, name: 'serale', multiplier: isOvertime ? (contract?.overtimeRates?.nightUntil22 || 1.25) : 1.0 },
    { start: 22 * 60, end: 24 * 60, name: 'notturno', multiplier: isOvertime ? (contract?.overtimeRates?.nightAfter22 || 1.35) : (contract?.overtimeRates?.nightUntil22 || 1.25) },
    { start: 0, end: 6 * 60, name: 'notturno', multiplier: isOvertime ? (contract?.overtimeRates?.nightAfter22 || 1.35) : (contract?.overtimeRates?.nightUntil22 || 1.25) }
  ];
  
  // Applica maggiorazioni festive/domenicali se necessario
  const holidayMultiplier = isHoliday || isSunday ? (contract?.overtimeRates?.holiday || 1.3) : 1.0;
  
  let totalEarnings = 0;
  let totalHours = 0;
  
  // Calcola le intersezioni con ogni fascia oraria
  for (const slot of CCNL_TIME_SLOTS) {
    let slotStart = slot.start;
    let slotEnd = slot.end;
    
    // Per le fasce che attraversano la mezzanotte, calcola anche il giorno successivo
    const slotsToCheck = [{ start: slotStart, end: slotEnd }];
    
    // Se il lavoro attraversa la mezzanotte, aggiungi le fasce del giorno successivo
    if (endMinutes > 24 * 60) {
      slotsToCheck.push({ start: slotStart + 24 * 60, end: slotEnd + 24 * 60 });
    }
    
    for (const currentSlot of slotsToCheck) {
      // Calcola l'intersezione
      const intersectionStart = Math.max(startMinutes, currentSlot.start);
      const intersectionEnd = Math.min(endMinutes, currentSlot.end);
      
      if (intersectionStart < intersectionEnd) {
        const slotMinutes = intersectionEnd - intersectionStart;
        const slotHours = slotMinutes / 60;
        
        // Applica maggiorazione festiva se necessario
        const finalMultiplier = Math.max(slot.multiplier, holidayMultiplier);
        const slotRate = baseRate * finalMultiplier;
        const slotEarnings = slotHours * slotRate;
        
        timeSlots.push({
          name: slot.name,
          hours: slotHours,
          rate: slotRate,
          earnings: slotEarnings,
          multiplier: finalMultiplier
        });
        
        totalEarnings += slotEarnings;
        totalHours += slotHours;
      }
    }
  }
  
  return { timeSlots, totalEarnings, totalHours };
}

// Test
const contract = {
  hourlyRate: 16.15,
  overtimeRates: {
    day: 1.2,
    nightUntil22: 1.25,
    nightAfter22: 1.35,
    holiday: 1.3
  }
};

console.log('\n=== TEST 1: 20:00-02:00 (straordinario) ===');
const test1 = calculateHourlyRatesByTimeSlots('20:00', '02:00', 16.15, contract, true, false, false);
console.log('Risultato:', test1);

console.log('\n=== TEST 2: 19:00-05:00 (straordinario) ===');
const test2 = calculateHourlyRatesByTimeSlots('19:00', '05:00', 16.15, contract, true, false, false);
console.log('Risultato:', test2);

// Calcolo manuale per confronto
console.log('\n=== CALCOLO MANUALE TEST 1 ===');
console.log('20:00-22:00: 2h × 16.15 × 1.25 = ', 2 * 16.15 * 1.25);
console.log('22:00-02:00: 4h × 16.15 × 1.35 = ', 4 * 16.15 * 1.35);
console.log('Totale atteso: ', (2 * 16.15 * 1.25) + (4 * 16.15 * 1.35));

console.log('\n=== CALCOLO MANUALE TEST 2 ===');
console.log('19:00-20:00: 1h × 16.15 × 1.2 = ', 1 * 16.15 * 1.2);
console.log('20:00-22:00: 2h × 16.15 × 1.25 = ', 2 * 16.15 * 1.25);
console.log('22:00-05:00: 7h × 16.15 × 1.35 = ', 7 * 16.15 * 1.35);
console.log('Totale atteso: ', (1 * 16.15 * 1.2) + (2 * 16.15 * 1.25) + (7 * 16.15 * 1.35));
