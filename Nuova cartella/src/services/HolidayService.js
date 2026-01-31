/**
 * Servizio per la gestione dei giorni festivi italiani
 * Include festività fisse e mobili secondo il calendario italiano
 */

class HolidayService {
  constructor() {
    // Festività fisse italiane
    this.fixedHolidays = {
      '01-01': 'Capodanno',
      '01-06': 'Epifania',
      '04-25': 'Festa della Liberazione',
      '05-01': 'Festa del Lavoro',
      '06-02': 'Festa della Repubblica',
      '08-15': 'Ferragosto',
      '11-01': 'Ognissanti',
      '12-08': 'Immacolata Concezione',
      '12-25': 'Natale',
      '12-26': 'Santo Stefano'
    };
  }

  /**
   * Calcola la data della Pasqua per un dato anno
   * Algoritmo di Gauss per il calcolo della Pasqua
   */
  calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
  }

  /**
   * Calcola le festività mobili per un dato anno
   */
  getMobileHolidays(year) {
    const easter = this.calculateEaster(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    return {
      [`${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`]: 'Pasqua',
      [`${String(easterMonday.getMonth() + 1).padStart(2, '0')}-${String(easterMonday.getDate()).padStart(2, '0')}`]: 'Lunedì dell\'Angelo'
    };
  }

  /**
   * Verifica se una data è un giorno festivo
   * @param {string|Date} date - Data da verificare (formato yyyy-mm-dd o oggetto Date)
   * @returns {object|null} - Oggetto con info del festivo o null se non è festivo
   */
  isHoliday(date) {
    let dateObj;
    
    if (typeof date === 'string') {
      if (date.includes('/')) {
        // Formato dd/MM/yyyy
        const [day, month, year] = date.split('/');
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Formato yyyy-mm-dd
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }

    const year = dateObj.getFullYear();
    const monthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    // Verifica festività fisse
    if (this.fixedHolidays[monthDay]) {
      return {
        name: this.fixedHolidays[monthDay],
        type: 'fixed',
        date: dateObj
      };
    }

    // Verifica festività mobili
    const mobileHolidays = this.getMobileHolidays(year);
    if (mobileHolidays[monthDay]) {
      return {
        name: mobileHolidays[monthDay],
        type: 'mobile',
        date: dateObj
      };
    }

    return null;
  }

  /**
   * Verifica se una data è un giorno festivo feriale (non domenica)
   * @param {string|Date} date - Data da verificare
   * @returns {object|null} - Info del festivo se è feriale, null altrimenti
   */
  isWeekdayHoliday(date) {
    let dateObj;
    
    if (typeof date === 'string') {
      if (date.includes('/')) {
        // Formato dd/MM/yyyy
        const [day, month, year] = date.split('/');
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Formato yyyy-mm-dd
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }

    // Non considerare le domeniche come festivi feriali
    if (dateObj.getDay() === 0) {
      return null;
    }

    return this.isHoliday(dateObj);
  }

  /**
   * Ottieni tutti i giorni festivi per un anno
   * @param {number} year - Anno
   * @returns {array} - Array di oggetti con date e nomi dei festivi
   */
  getYearHolidays(year) {
    const holidays = [];
    
    // Aggiungi festività fisse
    Object.entries(this.fixedHolidays).forEach(([monthDay, name]) => {
      const [month, day] = monthDay.split('-');
      const date = new Date(year, parseInt(month) - 1, parseInt(day));
      holidays.push({
        date: date,
        name: name,
        type: 'fixed',
        monthDay: monthDay
      });
    });

    // Aggiungi festività mobili
    const mobileHolidays = this.getMobileHolidays(year);
    Object.entries(mobileHolidays).forEach(([monthDay, name]) => {
      const [month, day] = monthDay.split('-');
      const date = new Date(year, parseInt(month) - 1, parseInt(day));
      holidays.push({
        date: date,
        name: name,
        type: 'mobile',
        monthDay: monthDay
      });
    });

    // Ordina per data
    holidays.sort((a, b) => a.date - b.date);
    
    return holidays;
  }

  /**
   * Ottieni solo i giorni festivi feriali per un anno (esclude domeniche)
   * @param {number} year - Anno
   * @returns {array} - Array di festivi feriali
   */
  getWeekdayHolidays(year) {
    return this.getYearHolidays(year).filter(holiday => holiday.date.getDay() !== 0);
  }

  /**
   * Calcola la retribuzione CCNL per un giorno festivo feriale
   * @param {object} settings - Impostazioni contratto
   * @returns {number} - Retribuzione giornaliera
   */
  calculateHolidayPay(settings) {
    // Per i giorni festivi feriali si applica la retribuzione giornaliera normale.
    // Coerenza con il resto dell'app: se dailyRate non è presente, deriva da monthlySalary.
    const contract = settings?.contract || {};

    const explicitDailyRate = Number(contract.dailyRate);
    if (Number.isFinite(explicitDailyRate) && explicitDailyRate > 0) {
      return explicitDailyRate;
    }

    const monthlySalary = Number(contract.monthlySalary);
    const workingDaysPerMonthRaw = Number(contract.workingDaysPerMonth);
    const workingDaysPerMonth = Number.isFinite(workingDaysPerMonthRaw) && workingDaysPerMonthRaw > 0
      ? workingDaysPerMonthRaw
      : 26;

    if (Number.isFinite(monthlySalary) && monthlySalary > 0) {
      return monthlySalary / workingDaysPerMonth;
    }

    return 109.19;
  }

  /**
   * Formatta la data per la visualizzazione
   * @param {Date} date - Data da formattare
   * @returns {string} - Data formattata
   */
  formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Verifica se un mese ha giorni festivi feriali
   * @param {number} year - Anno
   * @param {number} month - Mese (0-11)
   * @returns {array} - Array di giorni festivi feriali nel mese
   */
  getMonthWeekdayHolidays(year, month) {
    const weekdayHolidays = this.getWeekdayHolidays(year);
    return weekdayHolidays.filter(holiday => holiday.date.getMonth() === month);
  }
}

export default new HolidayService();
