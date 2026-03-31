// Elenco festivi nazionali italiani (fissi e mobili)
// Formato: 'MM-DD' per fissi, 'YYYY-MM-DD' per mobili

export const FIXED_HOLIDAYS = [
  '01-01', // Capodanno
  '01-06', // Epifania
  '04-25', // Liberazione
  '05-01', // Festa del Lavoro
  '06-02', // Festa della Repubblica
  '08-15', // Ferragosto
  '11-01', // Ognissanti
  '12-08', // Immacolata Concezione
  '12-25', // Natale
  '12-26', // Santo Stefano
];

// Funzione per calcolare Pasqua e Pasquetta (Lunedì dell'Angelo)
export function getEasterHolidays(year) {
  // Algoritmo di Meeus/Jones/Butcher
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  const easter = new Date(year, month - 1, day);
  const pasquetta = new Date(easter);
  pasquetta.setDate(easter.getDate() + 1);
  return [
    easter.toISOString().slice(0, 10),
    pasquetta.toISOString().slice(0, 10),
  ];
}

// Funzione per verificare se una data è festiva
export function isItalianHoliday(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const mmdd = d.toISOString().slice(5, 10);
  if (FIXED_HOLIDAYS.includes(mmdd)) return true;
  const year = d.getFullYear();
  const [easter, pasquetta] = getEasterHolidays(year);
  const iso = d.toISOString().slice(0, 10);
  return iso === easter || iso === pasquetta;
}
