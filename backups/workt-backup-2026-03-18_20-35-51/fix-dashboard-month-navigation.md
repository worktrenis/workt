// Patch per DashboardScreen.js - Risolve bug navigazione mesi
// 
// PROBLEMA:
// 1. Il titolo della card rimane "Luglio 2025" anche navigando tra mesi
// 2. I dati mostrati sono sempre di luglio quando si va avanti nei mesi
//
// SOLUZIONE:
// Aggiungere un useEffect che ricarica i dati quando cambia selectedDate

// Aggiungere questo useEffect dopo il debug useEffect esistente (linea ~126):

useEffect(() => {
  console.log('🔄 Dashboard: Ricarico dati per nuovo mese:', formatMonthYear(selectedDate));
  loadData();
}, [selectedDate]);

// Questo assicura che quando selectedDate cambia (tramite goToPreviousMonth/goToNextMonth),
// i dati vengano ricaricati dal database per il mese corretto.
