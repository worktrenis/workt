// Test rapido per multi-turni
import { TimeCalculator } from './src/services/TimeCalculator.js';

const calc = new TimeCalculator();

// Test con più turni nella stessa giornata
const testEntry = {
  // Turno principale
  workStart1: '08:00',
  workEnd1: '12:00',
  
  // Turni aggiuntivi
  viaggi: [
    {
      work_start_1: '14:00',
      work_end_1: '18:00',
      departure_company: '13:30',
      arrival_site: '13:45'
    },
    {
      work_start_1: '20:00', 
      work_end_1: '22:00'
    }
  ]
};

console.log('=== TEST MULTI-TURNI ===');
console.log('Ore lavoro totali:', calc.calculateWorkHours(testEntry), 'h');
console.log('Ore viaggio totali:', calc.calculateTravelHours(testEntry), 'h');
console.log('Pause tra turni:', calc.calculateBreaksBetweenShifts(testEntry));
