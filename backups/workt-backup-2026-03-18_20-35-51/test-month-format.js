// Test per verificare il problema del mese nella dashboard
const formatMonthYear = (date) => {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Test con varie date
const testDates = [
  new Date(2025, 0, 15), // Gennaio
  new Date(2025, 5, 15), // Giugno  
  new Date(2025, 6, 15), // Luglio
  new Date(2025, 7, 15), // Agosto
  new Date(2025, 11, 15), // Dicembre
];

console.log('Test formatMonthYear:');
testDates.forEach(date => {
  console.log(`${date.toISOString()} -> ${formatMonthYear(date)}`);
});
