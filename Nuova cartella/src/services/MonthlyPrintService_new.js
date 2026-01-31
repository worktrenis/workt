// 📄 SERVIZIO STAMPA PDF MENSILE COMPLETA
// Stampa dettagliata di tutti gli inserimenti TimeEntry con tutte le informazioni

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency, formatDate } from '../utils';
import DatabaseService from './DatabaseService';

class MonthlyPrintService {
  
  // 📊 RECUPERA TUTTI I DATI MENSILI
  static async getAllMonthlyData(year, month, settings = null) {
    console.log(`📊 PRINT SERVICE - Recupero dati completi per ${month}/${year}`);
    
    try {
      // 1. Dati degli inserimenti dal database
      const workEntries = await DatabaseService.getWorkEntries(year, month);
      console.log(`📊 PRINT SERVICE - Trovati ${workEntries.length} inserimenti`);
      
      // 2. Impostazioni correnti (usa quelle passate o carica dal DB)
      const { DEFAULT_SETTINGS } = require('../constants');
      const currentSettings = settings || await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      console.log(`📊 PRINT SERVICE - Caricate ${Object.keys(currentSettings).length} impostazioni`);
      
      // 3. Dati standby calendar
      const standbyData = await DatabaseService.getStandbyDays(year, month);
      console.log(`📊 PRINT SERVICE - Trovati ${standbyData.length} giorni standby`);
      
      // 4. Calcoli aggregati mensili - usa calculateMonthlyStats
      const monthlyCalculations = this.calculateMonthlyStats(workEntries);
      console.log(`📊 PRINT SERVICE - Calcoli mensili completati`);
      
      return {
        workEntries: workEntries.sort((a, b) => new Date(a.date) - new Date(b.date)),
        settings: currentSettings,
        standbyData,
        monthlyCalculations,
        year,
        month
      };
      
    } catch (error) {
      console.error('❌ PRINT SERVICE - Errore recupero dati:', error);
      throw error;
    }
  }
  
  // 📊 CALCOLA TOTALI MENSILI REALI - CALCOLO SEMPLIFICATO
  static calculateMonthlyStats(workEntries) {
    console.log(`📊 PRINT SERVICE - Calcolo totali reali per ${workEntries.length} inserimenti`);
    
    let totalHours = 0;
    let ordinaryHours = 0; 
    let overtimeHours = 0;
    let totalEarnings = 0;
    let workingDays = 0;
    let travelHours = 0;
    
    const breakdown = {
      workDays: 0,
      standbyDays: 0,
      totalHoursWorked: 0,
      totalTravelHours: 0,
      averageHoursPerDay: 0
    };

    // Rate base CCNL Level 5 per calcoli di fallback
    const baseHourlyRate = 16.568;
    
    for (const entry of workEntries) {
      try {
        // Calcola ore usando i metodi interni 
        const workHours = this.calculateWorkHours(entry);
        const travel = this.calculateTravelHours(entry);
        
  // 🔧 Punto di partenza: valore DB
  let entryEarnings = parseFloat(entry.total_earnings || 0);
        
        // Preferenza: se giorno speciale senza ore e toggle OFF, forza a 0
        const isSpecialDayType = ['ferie','malattia','permesso','riposo','festivo'].includes(String(entry.day_type || '').toLowerCase());
        const showEffective = (settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false);
        if (isSpecialDayType && (workHours + travel) === 0 && !showEffective) {
          entryEarnings = 0;
        }

        if (entryEarnings === 0 && (workHours > 0 || travel > 0)) {
          console.log(`🔧 CALCOLO BASE per ${entry.date} - earnings erano 0`);
          
          // Calcolo semplificato base
          let dailyEarnings = 0;
          const totalDailyHours = workHours + travel;
          
          // Applica tariffa base a tutte le ore
          dailyEarnings = totalDailyHours * baseHourlyRate;
          
          // Bonus weekend/festivi semplificato
          const date = new Date(entry.date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isHoliday = entry.day_type === 'festivo';
          
          if (isWeekend) {
            dailyEarnings *= 1.3; // +30% weekend
          } else if (isHoliday) {
            dailyEarnings *= 1.5; // +50% festivi
          }
          
          // Aggiungi indennità se presenti
          if (entry.meal_allowance) dailyEarnings += parseFloat(entry.meal_allowance);
          if (entry.travel_allowance) dailyEarnings += parseFloat(entry.travel_allowance);
          if (entry.standby_allowance) dailyEarnings += parseFloat(entry.standby_allowance);
          
          entryEarnings = dailyEarnings;
          console.log(`🔧 CALCOLATO ${entry.date}: €${entryEarnings.toFixed(2)} (${totalDailyHours.toFixed(1)}h)`);
        }
        
        totalEarnings += entryEarnings;
        
        // 🔍 DEBUG: Log dettagliato per ogni entry
        const date = new Date(entry.date);
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isHoliday = String(entry.day_type || '').toLowerCase() === 'festivo';
        
        console.log(`📊 DEBUG ENTRY ${entry.date} (${dayName}):`, {
          workHours: workHours.toFixed(1),
          travelHours: travel.toFixed(1),
          earnings: entryEarnings.toFixed(2),
          isWeekend,
          isHoliday,
          standby: entry.is_standby_day || false,
          dayType: entry.day_type || 'normale',
          total_earnings_raw: entry.total_earnings
        });
        
        if (workHours > 0 || travel > 0) {
          workingDays++;
          breakdown.workDays++;
        }
        
        totalHours += workHours + travel;
        travelHours += travel;
        breakdown.totalHoursWorked += workHours;
        breakdown.totalTravelHours += travel;
        
        // Logica straordinari semplificata per il riepilogo
        if (workHours > 8) {
          ordinaryHours += 8;
          overtimeHours += (workHours - 8);
        } else {
          ordinaryHours += workHours;
        }
        
        // Controlla giorni reperibilità
        if (entry.is_standby_day || entry.standby_allowance > 0) {
          breakdown.standbyDays++;
        }
        
        console.log(`📊 ${entry.date}: lavoro=${workHours.toFixed(1)}h, viaggio=${travel.toFixed(1)}h, €${entryEarnings.toFixed(2)}`);
        
      } catch (error) {
        console.warn(`Errore calcolo per entry ${entry.date}:`, error);
      }
    }
    
    // Calcola medie
    breakdown.averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;
    
    const result = {
      totalHours,
      ordinaryHours,
      overtimeHours,
      totalEarnings,
      workingDays,
      travelHours,
      breakdown
    };
    
    console.log(`📊 TOTALI FINALI:`, {
      ore_totali: totalHours.toFixed(1),
      ore_ordinarie: ordinaryHours.toFixed(1), 
      ore_straordinarie: overtimeHours.toFixed(1),
      ore_viaggio: travelHours.toFixed(1),
      giorni_lavorati: workingDays,
      guadagno_totale: `€${totalEarnings.toFixed(2)}`
    });
    
    return result;
  }
  
  // 🕐 CALCOLA ORE LAVORO
  static calculateWorkHours(entry) {
    let totalHours = 0;
    
    // Primo turno
    if (entry.work_start_1 && entry.work_end_1) {
      const start = this.parseTime(entry.work_start_1);
      const end = this.parseTime(entry.work_end_1);
      if (start && end) {
        totalHours += this.getHoursDifference(start, end);
      }
    }
    
    // Secondo turno
    if (entry.work_start_2 && entry.work_end_2) {
      const start = this.parseTime(entry.work_start_2);
      const end = this.parseTime(entry.work_end_2);
      if (start && end) {
        totalHours += this.getHoursDifference(start, end);
      }
    }
    
    return totalHours;
  }
  
  // 🚗 CALCOLA ORE VIAGGIO
  static calculateTravelHours(entry) {
    let travelHours = 0;
    
    // Viaggio andata
    if (entry.departure_company && entry.arrival_site) {
      const departure = this.parseTime(entry.departure_company);
      const arrival = this.parseTime(entry.arrival_site);
      if (departure && arrival) {
        travelHours += this.getHoursDifference(departure, arrival);
      }
    }
    
    // Viaggio ritorno
    if (entry.departure_return && entry.arrival_company) {
      const departure = this.parseTime(entry.departure_return);
      const arrival = this.parseTime(entry.arrival_company);
      if (departure && arrival) {
        travelHours += this.getHoursDifference(departure, arrival);
      }
    }
    
    return travelHours;
  }
  
  // ⏰ PARSE TIME STRING
  static parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return { hours, minutes };
  }
  
  // ⏱️ CALCOLA DIFFERENZA ORE
  static getHoursDifference(start, end) {
    const startMinutes = start.hours * 60 + start.minutes;
    let endMinutes = end.hours * 60 + end.minutes;
    
    // Se l'orario di fine è prima dell'inizio, assume che sia il giorno dopo
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }
  
  // 🎨 GENERA HTML COMPLETO PER STAMPA
  static generateCompletePrintHTML(data) {
    const { workEntries, settings, standbyData, monthlyCalculations, year, month } = data;
    
    console.log(`🎨 PRINT SERVICE - Generazione HTML per ${workEntries.length} inserimenti`);
    
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Registro Mensile - ${monthNames[month - 1]} ${year}</title>
        ${this.generatePrintStyles()}
      </head>
      <body>
        ${this.generateHeader(monthNames[month - 1], year)}
        ${this.generateContractInfo(settings)}
        ${this.generateMonthlySummary(monthlyCalculations)}
        ${this.generateDailyEntries(workEntries, settings)}
        ${this.generateStandbyCalendar(standbyData)}
        ${this.generateDetailedBreakdown(monthlyCalculations)}
        ${this.generateFooter()}
      </body>
      </html>
    `;
  }
  
  // 🎨 STILI CSS PER STAMPA
  static generatePrintStyles() {
    return `
      <style>
        @page {
          size: A4;
          margin: 12mm;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
          font-size: 9px;
        }
        
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px solid #2196F3;
          padding-bottom: 15px;
        }
        
        .header h1 {
          color: #2196F3;
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        
        .header .subtitle {
          color: #666;
          margin: 8px 0;
          font-size: 14px;
        }
        
        .section {
          margin-bottom: 25px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .section-header {
          background: #2196F3;
          color: white;
          padding: 12px 15px;
          font-size: 14px;
          font-weight: bold;
          margin: 0;
        }
        
        .section-content {
          padding: 15px;
        }
        
        .contract-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .contract-item {
          text-align: center;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        
        .contract-label {
          font-size: 8px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .contract-value {
          font-size: 12px;
          color: #2196F3;
          font-weight: bold;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .summary-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        
        .summary-card.earnings {
          background: #e8f5e9;
          border-color: #4caf50;
        }
        
        .summary-card .value {
          font-size: 14px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 4px;
        }
        
        .summary-card.earnings .value {
          color: #2e7d32;
        }
        
        .summary-card .label {
          font-size: 8px;
          color: #666;
          text-transform: uppercase;
        }
        
        .entries-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }
        
        .entries-table th {
          background: #f8f9fa;
          color: #495057;
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #dee2e6;
          font-size: 8px;
        }
        
        .entries-table td {
          padding: 6px 4px;
          text-align: center;
          border: 1px solid #dee2e6;
          vertical-align: top;
        }
        
        .entries-table .date-cell {
          font-weight: bold;
          color: #2196F3;
        }
        
        .entries-table .work-day {
          background: #e3f2fd;
        }
        
        .entries-table .weekend-day {
          background: #fff3e0;
        }
        
        .entries-table .holiday-day {
          background: #fce4ec;
        }
        
        .entries-table .standby-day {
          background: #f3e5f5;
        }
        
        .entries-table .earnings-cell {
          font-weight: bold;
          color: #2e7d32;
        }
        
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .breakdown-table th {
          background: #2196F3;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
        }
        
        .breakdown-table td {
          padding: 8px;
          border: 1px solid #dee2e6;
        }
        
        .breakdown-table .category {
          font-weight: bold;
          color: #495057;
        }
        
        .breakdown-table .amount {
          text-align: right;
          font-weight: bold;
          color: #2e7d32;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #6c757d;
          font-size: 8px;
          border-top: 1px solid #dee2e6;
          padding-top: 15px;
        }
        
        .standby-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          font-size: 8px;
        }
        
        .standby-day {
          text-align: center;
          padding: 4px;
          border: 1px solid #dee2e6;
          border-radius: 3px;
        }
        
        .standby-day.active {
          background: #fff3e0;
          color: #f57c00;
          font-weight: bold;
        }
        
        .time-cell {
          font-size: 8px;
          line-height: 1.2;
        }
        
        .notes-cell {
          text-align: left;
          font-size: 7px;
          max-width: 80px;
          word-wrap: break-word;
        }
      </style>
    `;
  }
  
  // 📋 HEADER DEL DOCUMENTO
  static generateHeader(monthName, year) {
    const currentDate = new Date().toLocaleDateString('it-IT');
    
    return `
      <div class="header">
        <h1>📋 Registro Mensile Ore Lavoro</h1>
        <div class="subtitle">${monthName} ${year}</div>
        <div class="subtitle">Generato il ${currentDate}</div>
      </div>
    `;
  }
  
  // 💼 INFORMAZIONI CONTRATTO
  static generateContractInfo(settings) {
    const contract = settings.contract?.type || 'Metalmeccanico PMI';
    const level = settings.contract?.level || 'Livello 5';
    const monthlySalary = settings.contract?.monthlySalary || 2800;
    const hourlyRate = (monthlySalary / (30 * 8)).toFixed(2);
    const dailyRate = (monthlySalary / 30).toFixed(2);
    
    return `
      <div class="section">
        <div class="section-header">💼 Informazioni Contratto</div>
        <div class="section-content">
          <div class="contract-grid">
            <div class="contract-item">
              <div class="contract-label">Contratto</div>
              <div class="contract-value">${contract}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Livello</div>
              <div class="contract-value">${level}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Stipendio Mensile</div>
              <div class="contract-value">${formatCurrency(monthlySalary)}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Tariffa Oraria</div>
              <div class="contract-value">${formatCurrency(parseFloat(hourlyRate))}</div>
            </div>
          </div>
          <div class="contract-grid">
            <div class="contract-item">
              <div class="contract-label">Tariffa Giornaliera</div>
              <div class="contract-value">${formatCurrency(parseFloat(dailyRate))}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Compenso Trasferta</div>
              <div class="contract-value">${settings.travelCompensationRate || 100}%</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Buono Pasto</div>
              <div class="contract-value">${formatCurrency(settings.mealAllowances?.lunch?.voucherAmount || 7)}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Indennità Reperibilità</div>
              <div class="contract-value">${formatCurrency(settings.standbySettings?.dailyAllowance || 25)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 📊 RIEPILOGO MENSILE
  static generateMonthlySummary(calculations) {
    if (!calculations) return '';
    
    const {
      totalHours = 0,
      ordinaryHours = 0,
      overtimeHours = 0,
      totalEarnings = 0,
      workingDays = 0,
      travelHours = 0
    } = calculations;
    
    return `
      <div class="section">
        <div class="section-header">📊 Riepilogo Mensile</div>
        <div class="section-content">
          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${this.formatHours(totalHours)}</div>
              <div class="label">Ore Totali</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(ordinaryHours)}</div>
              <div class="label">Ore Ordinarie</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(overtimeHours)}</div>
              <div class="label">Ore Straordinarie</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(travelHours)}</div>
              <div class="label">Ore Viaggio</div>
            </div>
            <div class="summary-card">
              <div class="value">${workingDays}</div>
              <div class="label">Giorni Lavorati</div>
            </div>
            <div class="summary-card earnings">
              <div class="value">${formatCurrency(totalEarnings)}</div>
              <div class="label">Totale Compensi</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // 📅 INSERIMENTI GIORNALIERI DETTAGLIATI
  static generateDailyEntries(workEntries, settings) {
    if (!workEntries.length) {
      return `
        <div class="section">
          <div class="section-header">📅 Inserimenti Giornalieri</div>
          <div class="section-content">
            <p>Nessun inserimento trovato per questo mese.</p>
          </div>
        </div>
      `;
    }
    
    console.log(`📅 PRINT SERVICE - Generazione tabella per ${workEntries.length} inserimenti`);
    
    let tableRows = '';
    let printedCount = 0;
    
    workEntries.forEach((entry, index) => {
      try {
        const date = new Date(entry.date);
        const dayOfWeek = date.toLocaleDateString('it-IT', { weekday: 'short' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = entry.day_type === 'festivo';
        const isStandby = entry.is_standby_day || entry.day_type === 'reperibilita';
        
        let rowClass = '';
        if (isHoliday) rowClass = 'holiday-day';
        else if (isStandby) rowClass = 'standby-day';
        else if (isWeekend) rowClass = 'weekend-day';
        else if (entry.work_start_1 || entry.work_start_2) rowClass = 'work-day';
        
        // Parse interventi
        let interventi = [];
        try {
          interventi = entry.interventi ? JSON.parse(entry.interventi) : [];
        } catch (e) {
          console.warn('Errore parsing interventi:', e);
        }
        
        const workPeriods = [];
        if (entry.work_start_1 && entry.work_end_1) {
          workPeriods.push(`${entry.work_start_1} - ${entry.work_end_1}`);
        }
        if (entry.work_start_2 && entry.work_end_2) {
          workPeriods.push(`${entry.work_start_2} - ${entry.work_end_2}`);
        }
        
        const travelInfo = [];
        if (entry.departure_company) travelInfo.push(`P: ${entry.departure_company}`);
        if (entry.arrival_site) travelInfo.push(`A: ${entry.arrival_site}`);
        if (entry.departure_return) travelInfo.push(`R: ${entry.departure_return}`);
        if (entry.arrival_company) travelInfo.push(`F: ${entry.arrival_company}`);
        
        const mealInfo = [];
        if (entry.meal_lunch_voucher > 0) mealInfo.push(`Pranzo B: ${entry.meal_lunch_voucher}`);
        if (entry.meal_lunch_cash > 0) mealInfo.push(`Pranzo €: ${formatCurrency(entry.meal_lunch_cash)}`);
        if (entry.meal_dinner_voucher > 0) mealInfo.push(`Cena B: ${entry.meal_dinner_voucher}`);
        if (entry.meal_dinner_cash > 0) mealInfo.push(`Cena €: ${formatCurrency(entry.meal_dinner_cash)}`);
        
        const allowanceInfo = [];
        if (entry.travel_allowance > 0) allowanceInfo.push(`Traf: ${formatCurrency(entry.travel_allowance)}`);
        if (entry.standby_allowance > 0) allowanceInfo.push(`Rep: ${formatCurrency(entry.standby_allowance)}`);
        
        printedCount++;
        console.log(`📅 PRINT SERVICE - Elaborazione inserimento ${printedCount}: ${entry.date}`);
        
        tableRows += `
          <tr class="${rowClass}">
            <td class="date-cell">
              ${date.getDate()}<br>
              <small>${dayOfWeek}</small>
            </td>
            <td>${entry.site_name || '-'}</td>
            <td>${entry.vehicle_driven || '-'}<br>
                <small>${entry.vehiclePlate || entry.targa_veicolo || ''}</small>
            </td>
            <td class="time-cell">
              ${workPeriods.join('<br>')}
              ${interventi.length > 0 ? '<br><small>Interventi: ' + interventi.length + '</small>' : ''}
            </td>
            <td class="time-cell">
              ${travelInfo.join('<br>')}
            </td>
            <td>
              ${mealInfo.join('<br>')}
            </td>
            <td>
              ${allowanceInfo.join('<br>')}
            </td>
            <td class="earnings-cell">
              ${formatCurrency(entry.total_earnings || 0)}
            </td>
            <td class="notes-cell">
              ${entry.notes || ''}
            </td>
          </tr>
        `;
      } catch (error) {
        console.error(`❌ Errore elaborazione inserimento ${index}:`, error);
      }
    });
    
    console.log(`📅 PRINT SERVICE - Completata elaborazione: ${printedCount}/${workEntries.length} inserimenti`);
    
    return `
      <div class="section page-break">
        <div class="section-header">📅 Inserimenti Giornalieri Dettagliati</div>
        <div class="section-content">
          <table class="entries-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cantiere</th>
                <th>Veicolo</th>
                <th>Orari Lavoro</th>
                <th>Viaggi</th>
                <th>Pasti</th>
                <th>Indennità</th>
                <th>Totale €</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  // 📅 CALENDARIO REPERIBILITÀ
  static generateStandbyCalendar(standbyData) {
    if (!standbyData || !standbyData.length) return '';
    
    // getStandbyDays restituisce già solo i giorni con is_standby = 1
    const standbyDays = standbyData.map(day => day.date);
    
    if (standbyDays.length === 0) return '';
    
    return `
      <div class="section">
        <div class="section-header">📅 Calendario Reperibilità</div>
        <div class="section-content">
          <p>Giorni in reperibilità: ${standbyDays.length}</p>
          <div class="standby-grid">
            ${standbyDays.map(date => {
              const day = new Date(date).getDate();
              return `<div class="standby-day active">${day}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  // 📊 BREAKDOWN DETTAGLIATO
  static generateDetailedBreakdown(calculations) {
    if (!calculations || !calculations.breakdown) return '';
    
    const { breakdown } = calculations;
    
    let breakdownRows = '';
    Object.entries(breakdown).forEach(([type, data]) => {
      if (data.hours > 0 || data.earnings > 0) {
        breakdownRows += `
          <tr>
            <td class="category">${type}</td>
            <td>${this.formatHours(data.hours || 0)}</td>
            <td class="amount">${formatCurrency(data.earnings || 0)}</td>
            <td>${data.description || '-'}</td>
          </tr>
        `;
      }
    });
    
    if (!breakdownRows) return '';
    
    return `
      <div class="section page-break">
        <div class="section-header">📊 Breakdown Dettagliato Compensi</div>
        <div class="section-content">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Ore</th>
                <th>Importo</th>
                <th>Descrizione</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  // 🔻 FOOTER DEL DOCUMENTO
  static generateFooter() {
    return `
      <div class="footer">
        <p>Documento generato automaticamente da WorkTracker</p>
        <p>Per informazioni: App WorkTracker - Sistema di Tracciamento Ore Lavoro</p>
      </div>
    `;
  }
  
  // 🕐 FORMATTA ORE
  static formatHours(hours) {
    if (!hours || hours === 0) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // 📄 GENERA E CONDIVIDI PDF
  static async generateAndSharePDF(year, month) {
    try {
      console.log(`📄 PRINT SERVICE - Inizio generazione PDF per ${month}/${year}`);
      
      // 1. Recupera tutti i dati
      const data = await this.getAllMonthlyData(year, month);
      console.log(`📄 PRINT SERVICE - Dati recuperati: ${data.workEntries.length} inserimenti`);
      
      // 2. Genera HTML
      const html = this.generateCompletePrintHTML(data);
      console.log(`📄 PRINT SERVICE - HTML generato (${html.length} caratteri)`);
      
      // 3. Log di cosa verrà stampato
      this.logPrintContent(data);
      
      // 4. Genera PDF
      const monthNames = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];
      
      const fileName = `WorkTracker_${monthNames[month - 1]}_${year}.pdf`;
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        fileName
      });
      
      console.log(`📄 PRINT SERVICE - PDF generato: ${uri}`);
      
      // 5. Condividi PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Condividi Registro ${monthNames[month - 1]} ${year}`,
          UTI: 'com.adobe.pdf'
        });
        console.log(`📄 PRINT SERVICE - PDF condiviso con successo`);
      }
      
      return {
        success: true,
        uri,
        fileName,
        dataCount: data.workEntries.length
      };
      
    } catch (error) {
      console.error('❌ PRINT SERVICE - Errore generazione PDF:', error);
      throw error;
    }
  }
  
  // 📋 LOG DEL CONTENUTO STAMPATO
  static logPrintContent(data) {
    const { workEntries, settings, standbyData, monthlyCalculations, year, month } = data;
    
    console.log('\n📋 ===== LOG CONTENUTO STAMPATO =====');
    console.log(`📅 Periodo: ${month}/${year}`);
    console.log(`📊 Inserimenti totali: ${workEntries.length}`);
    
    // Log inserimenti per giorno
    workEntries.forEach((entry, index) => {
      const hasWork = entry.work_start_1 || entry.work_start_2;
      const hasTravel = entry.departure_company || entry.arrival_site;
      const hasMeals = entry.meal_lunch_voucher > 0 || entry.meal_dinner_voucher > 0 || 
                     entry.meal_lunch_cash > 0 || entry.meal_dinner_cash > 0;
      const hasAllowances = entry.travel_allowance > 0 || entry.standby_allowance > 0;
      const hasEarnings = entry.total_earnings > 0;
      
      console.log(`  ${index + 1}. ${entry.date} - ${entry.site_name || 'N/A'}`);
      console.log(`     Lavoro: ${hasWork ? '✅' : '❌'} | Viaggi: ${hasTravel ? '✅' : '❌'} | Pasti: ${hasMeals ? '✅' : '❌'} | Indennità: ${hasAllowances ? '✅' : '❌'} | Compenso: ${hasEarnings ? formatCurrency(entry.total_earnings) : '0€'}`);
      
      if (entry.notes) {
        console.log(`     Note: ${entry.notes}`);
      }
    });
    
    // Log summary
    if (monthlyCalculations) {
      console.log('\n📊 Riepilogo Mensile:');
      console.log(`   Ore Totali: ${this.formatHours(monthlyCalculations.totalHours || 0)}`);
      console.log(`   Ore Ordinarie: ${this.formatHours(monthlyCalculations.ordinaryHours || 0)}`);
      console.log(`   Ore Straordinarie: ${this.formatHours(monthlyCalculations.overtimeHours || 0)}`);
      console.log(`   Giorni Lavorati: ${monthlyCalculations.workingDays || 0}`);
      console.log(`   Compenso Totale: ${formatCurrency(monthlyCalculations.totalEarnings || 0)}`);
    }
    
    // Log settings
    console.log('\n⚙️ Impostazioni Usate:');
    console.log(`   Contratto: ${settings.contract?.type || 'N/A'}`);
    console.log(`   Livello: ${settings.contract?.level || 'N/A'}`);
    console.log(`   Stipendio Mensile: ${formatCurrency(settings.contract?.monthlySalary || 0)}`);
    console.log(`   Compenso Trasferta: ${settings.travelCompensationRate || 0}%`);
    
    // Log standby
    if (standbyData && standbyData.length > 0) {
      // getStandbyDays restituisce già solo i giorni con is_standby = 1
      const standbyDays = standbyData.length;
      console.log(`\n📅 Reperibilità: ${standbyDays} giorni`);
    }
    
    console.log('\n📋 ===== FINE LOG CONTENUTO =====\n');
  }
}

export default MonthlyPrintService;
