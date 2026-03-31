/**
 * Test per verificare il funzionamento del multi-turno
 */

import { TimeCalculator } from './src/services/TimeCalculator.js';

const timeCalculator = new TimeCalculator();

// Test case 1: Entry con turno principale + viaggi aggiuntivi
const workEntryMultiTurno = {
  date: "2025-07-13",
  siteName: "Test Multi-Turno",
  
  // Turno principale
  workStart1: "08:00",
  workEnd1: "12:00",
  workStart2: "13:00", 
  workEnd2: "17:00",
  
  // Viaggi aggiuntivi (turni extra ordinari)
  viaggi: [
    {
      departure_company: "18:00",
      arrival_site: "19:00",
      work_start_1: "19:00",
      work_end_1: "23:00",
      work_start_2: "",
      work_end_2: "",
      departure_return: "23:00",
      arrival_company: "00:00"
    },
    {
      departure_company: "01:00",
      arrival_site: "02:00", 
      work_start_1: "02:00",
      work_end_1: "06:00",
      work_start_2: "",
      work_end_2: "",
      departure_return: "06:00",
      arrival_company: "07:00"
    }
  ]
};

console.log("🧪 TEST MULTI-TURNO");
console.log("==================");

console.log("\n📊 ENTRY DI TEST:");
console.log("Turno principale: 08:00-12:00 + 13:00-17:00 (8h)");
console.log("Viaggio 1: 18:00-19:00 | 19:00-23:00 | 23:00-00:00 (4h lavoro + 2h viaggio)");
console.log("Viaggio 2: 01:00-02:00 | 02:00-06:00 | 06:00-07:00 (4h lavoro + 2h viaggio)");

const workHours = timeCalculator.calculateWorkHours(workEntryMultiTurno);
const travelHours = timeCalculator.calculateTravelHours(workEntryMultiTurno);
const breaks = timeCalculator.calculateBreaksBetweenShifts(workEntryMultiTurno);

console.log("\n🔢 RISULTATI CALCOLI:");
console.log(`Ore di lavoro totali: ${workHours}h`);
console.log(`Ore di viaggio totali: ${travelHours}h`);
console.log(`Numero di pause tra turni: ${breaks.length}`);

console.log("\n🕐 DETTAGLIO PAUSE:");
breaks.forEach((break_, index) => {
  const startTime = `${Math.floor(break_.startTime / 60).toString().padStart(2, '0')}:${(break_.startTime % 60).toString().padStart(2, '0')}`;
  const endTime = `${Math.floor(break_.endTime / 60).toString().padStart(2, '0')}:${(break_.endTime % 60).toString().padStart(2, '0')}`;
  console.log(`  Pausa ${index + 1}: ${startTime} → ${endTime} (${break_.durationHours.toFixed(2)}h) - Da ${break_.fromShift} a ${break_.toShift}`);
});

console.log("\n✅ VERIFICA ATTESA:");
console.log("- Ore lavoro: 16h (8h principale + 4h viaggio1 + 4h viaggio2)");
console.log("- Ore viaggio: 4h (2h viaggio1 + 2h viaggio2)");
console.log("- Pause: 3 (tra turni consecutivi)");

console.log("\n🏁 RISULTATO:");
if (workHours === 16 && travelHours === 4 && breaks.length === 3) {
  console.log("✅ MULTI-TURNO FUNZIONA CORRETTAMENTE!");
} else {
  console.log("❌ PROBLEMA NEL MULTI-TURNO:");
  console.log(`  Atteso: 16h lavoro, 4h viaggio, 3 pause`);
  console.log(`  Ottenuto: ${workHours}h lavoro, ${travelHours}h viaggio, ${breaks.length} pause`);
}
