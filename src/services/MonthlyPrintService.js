// 📄 SERVIZIO STAMPA PDF MENSILE COMPLETA
// Stampa dettagliata di tutti gli inserimenti TimeEntry con tutte le informazioni

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCurrency, formatDate } from '../utils';
import DatabaseService from './DatabaseService';
import CalculationService from './CalculationService';

class MonthlyPrintService {
  
  // 🔧 HELPER: Calcola trasferta esattamente come dashboard per giorni specifici
  static calculateTravelAllowanceFromSettings(entry, settings) {
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    
    if (!travelAllowanceEnabled || travelAllowanceAmount <= 0) {
      return 0;
    }
    
    // Gestione delle opzioni: supporta sia il nuovo formato selectedOptions che il vecchio formato option
    const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
    
    // Determina il metodo di calcolo dall'array di opzioni selezionate
    let calculationMethod = 'HALF_ALLOWANCE_HALF_DAY'; // Default
    if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
      calculationMethod = 'PROPORTIONAL_CCNL';
    } else if (selectedOptions.includes('FULL_ALLOWANCE_HALF_DAY')) {
      calculationMethod = 'FULL_ALLOWANCE_HALF_DAY';
    }
    
    const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
    let travelAllowancePercent = 1.0;
    if (typeof entry.travel_allowance_percent === 'number') {
      travelAllowancePercent = entry.travel_allowance_percent;
    }
    
    // Calcola ore lavoro e viaggio
    const workHours = this.calculateWorkHours(entry);
    const travelHours = this.calculateTravelHours(entry);
    const totalWorked = workHours + travelHours;
    
    // Verifica giorni speciali
    const date = new Date(entry.date);
    const isSunday = date.getDay() === 0;
    const isHoliday = entry.day_type === 'festivo';
    const manualOverride = entry.trasferta_manual_override || false;
    
    let attiva = false;
    
    // Determina l'attivazione basandosi sulle opzioni selezionate (LOGICA DASHBOARD ESATTA)
    if (selectedOptions.includes('ALWAYS')) {
      attiva = true;
    } else if (selectedOptions.includes('FULL_DAY_ONLY')) {
      attiva = totalWorked >= 8;
    } else if (selectedOptions.includes('WITH_TRAVEL')) {
      attiva = travelHours > 0;
    } else {
      // Default per calcoli proporzionali o con mezza giornata
      attiva = totalWorked > 0;
    }
    
    // Applica l'indennità se le condizioni sono soddisfatte
    if (attiva && (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride)) {
      let baseTravelAllowance = travelAllowanceAmount;
      
      // LOGICA DASHBOARD ESATTA
      if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
        const standardWorkDay = 8;
        const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
        baseTravelAllowance = travelAllowanceAmount * proportionalRate;
        travelAllowancePercent = 1.0; // CCNL ignora il percent del form
      } else if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY') && totalWorked < 8) {
        baseTravelAllowance = travelAllowanceAmount / 2;
      }
      
      const finalAmount = baseTravelAllowance * travelAllowancePercent;
      console.log(`📊 PDF Helper: Trasferta per ${entry.date}: €${finalAmount.toFixed(2)} (metodo: ${calculationMethod}, ore: ${totalWorked}h, percent: ${travelAllowancePercent})`);
      return finalAmount;
    }
    
    return 0;
  }
  
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
      
      // 3. Dati standby calendar - LOGICA SEMPLIFICATA SENZA IMPORT
      const standbyData = this.getStandbyDaysFromSettings(year, month, currentSettings);
      console.log(`📊 PRINT SERVICE - Trovati ${standbyData.length} giorni standby (da impostazioni)`);
      
      // DEBUG: Log dettagliato dei giorni standby
      if (standbyData && standbyData.length > 0) {
        console.log(`📅 DEBUG STANDBY - Dettagli giorni standby (da impostazioni):`);
        standbyData.forEach((day, index) => {
          console.log(`  ${index + 1}. ${day.date} - allowance: ${day.allowance} - type: ${day.dayType}`);
        });
      } else {
        console.log(`📅 DEBUG STANDBY - NESSUN GIORNO STANDBY TROVATO per ${month}/${year} (controlla Impostazioni → Reperibilità)`);
      }
      
      // 4. Calcoli aggregati mensili - usa calculateMonthlyStats (METODO DASHBOARD)
      const monthlyCalculations = await this.calculateMonthlyStats(workEntries, currentSettings);
      console.log(`📊 PRINT SERVICE - Calcoli mensili completati (metodo dashboard)`);
      
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
  
  // 📊 CALCOLA TOTALI MENSILI REALI - USA STESSO METODO DASHBOARD
  static async calculateMonthlyStats(workEntries, settings = null) {
    console.log(`📊 PRINT SERVICE - Calcolo totali reali per ${workEntries.length} inserimenti (metodo dashboard)`);
    
    // Carica impostazioni se non fornite
    const { DEFAULT_SETTINGS } = require('../constants');
    const currentSettings = settings || await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
    
    let totalHours = 0;
    let ordinaryHours = 0; 
    let overtimeHours = 0;
    let totalEarnings = 0;
    let totalTravelAllowance = 0;
    let workingDays = 0;
    let travelHours = 0;
    
    const breakdown = {
      workDays: 0,
      standbyDays: 0,
      totalHoursWorked: 0,
      totalTravelHours: 0,
      totalTravelAllowance: 0,
      averageHoursPerDay: 0
    };

    // Crea istanza del CalculationService (come fa la dashboard)
    const calculationService = new CalculationService();
    
    for (const entry of workEntries) {
      try {
        // Calcola ore usando i metodi interni 
        const workHours = this.calculateWorkHours(entry);
        const travel = this.calculateTravelHours(entry);
        
        // ✅ USA LO STESSO METODO DELLA DASHBOARD
        const dashboardCalculation = await calculationService.calculateDailyEarnings(entry, currentSettings);
        
        console.log(`� Dashboard calculation per ${entry.date}:`, {
          total: dashboardCalculation.total,
          travelAllowance: dashboardCalculation.travelAllowance,
          standbyAllowance: dashboardCalculation.standbyAllowance
        });
        
        // Usa i risultati del calcolo dashboard
        const entryEarnings = dashboardCalculation.total || 0;
        const entryTravelAllowance = dashboardCalculation.travelAllowance || 0;
        
        totalEarnings += entryEarnings;
        totalTravelAllowance += entryTravelAllowance;
        
        // 🔍 DEBUG: Log dettagliato per ogni entry
        const date = new Date(entry.date);
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = entry.day_type === 'festivo';
        
        console.log(`📊 DEBUG ENTRY ${entry.date} (${dayName}):`, {
          workHours: workHours.toFixed(1),
          travelHours: travel.toFixed(1),
          earnings: entryEarnings.toFixed(2),
          travelAllowance: entryTravelAllowance.toFixed(2),
          isWeekend,
          isHoliday,
          standby: entry.is_standby_day || false,
          dayType: entry.day_type || 'normale'
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
  static async generateCompletePrintHTML(data) {
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
  ${this.generateExtraEarningsSection(monthlyCalculations, settings, workEntries)}
        ${await this.generateDailyEntries(workEntries, settings, standbyData)}
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

        /* 🎯 NUOVI STILI PER GIORNI SPECIALI E REPERIBILITÀ */
        .summary-section {
          margin-top: 15px;
          margin-bottom: 15px;
        }

        .summary-section h4 {
          font-size: 11px;
          color: #495057;
          margin: 0 0 8px 0;
          font-weight: bold;
        }

        .special-days-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .special-day-item {
          background: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 4px;
          padding: 6px;
          text-align: center;
          font-size: 8px;
        }

        .day-count {
          display: block;
          font-size: 12px;
          font-weight: bold;
          color: #f57c00;
        }

        .day-label {
          display: block;
          color: #666;
          margin-top: 2px;
        }

        .standby-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .standby-item {
          background: #e3f2fd;
          border: 1px solid #64b5f6;
          border-radius: 4px;
          padding: 6px;
          text-align: center;
          font-size: 8px;
        }

        .standby-count {
          display: block;
          font-size: 12px;
          font-weight: bold;
          color: #1976d2;
        }

        .standby-label {
          display: block;
          color: #666;
          margin-top: 2px;
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
        
        .entries-table th:nth-child(1) { width: 8%; } /* Data */
        .entries-table th:nth-child(2) { width: 10%; } /* Cantiere - ridotta */
        .entries-table th:nth-child(3) { width: 8%; } /* Veicolo */
        .entries-table th:nth-child(4) { width: 15%; } /* Orari Lavoro - allargata per totale ore */
        .entries-table th:nth-child(5) { width: 15%; } /* Viaggi - allargata */
        .entries-table th:nth-child(6) { width: 8%; } /* Trasferta */
        .entries-table th:nth-child(7) { width: 8%; } /* Reperibilità */
        .entries-table th:nth-child(8) { width: 12%; } /* Interventi Rep. - allargata per 2 orari per riga */
        .entries-table th:nth-child(9) { width: 10%; } /* Totale € */
        .entries-table th:nth-child(10) { width: 10%; } /* Pasti */
        .entries-table th:nth-child(11) { width: 13%; } /* Note */
        
        .entries-table td {
          padding: 6px 4px;
          text-align: center;
          border: 1px solid #dee2e6;
          vertical-align: top;
          max-height: 24px;
          overflow: hidden;
          font-size: 7px;
          line-height: 1.1;
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

  // 🗓️ Calcola i giorni feriali effettivamente lavorati (lun–ven, esclusi festivi)
  static computeWeekdaysWorked(workEntries) {
    try {
      const seen = new Set();
      let count = 0;
      for (const entry of workEntries || []) {
        if (!entry?.date) continue;
        const d = new Date(entry.date);
        const dow = d.getDay(); // 0=dom, 6=sab
        const isWeekday = dow >= 1 && dow <= 5;
        const isHoliday = entry.day_type === 'festivo';
        if (!isWeekday || isHoliday) continue;

        // Considera lavorato se ci sono ore lavoro o viaggio (>0)
        const workH = this.calculateWorkHours(entry);
        const travelH = this.calculateTravelHours(entry);
        const worked = (workH + travelH) > 0;

        if (worked) {
          const key = entry.date;
          if (!seen.has(key)) {
            seen.add(key);
            count += 1;
          }
        }
      }
      console.log(`📅 PDF: Giorni feriali lavorati (lun–ven, esclusi festivi) = ${count}`);
      return count;
    } catch (e) {
      console.warn('⚠️ computeWeekdaysWorked errore:', e);
      return 0;
    }
  }

  // ➕ Sezione “Compensi Aggiuntivi” (totale meno base CCNL solo feriali lavorati)
  static generateExtraEarningsSection(calculations, settings, workEntries) {
    try {
      if (!calculations || !settings) return '';
      const contract = settings.contract || {};
      const monthlySalary = parseFloat(contract.monthlySalary) || 2800;
      const dailyRate = parseFloat(contract.dailyRate) || (monthlySalary / 26);
      const totalEarnings = parseFloat(calculations.totalEarnings || 0);
      const weekdaysWorked = this.computeWeekdaysWorked(workEntries);
      const baseEarnings = weekdaysWorked * dailyRate;
      const extra = totalEarnings - baseEarnings;

      console.log('📄 PDF Extra (nuovo):', {
        weekdaysWorked,
        dailyRate,
        baseEarnings,
        totalEarnings,
        extra
      });

      return `
        <div class="section">
          <div class="section-header">💶 Compensi Aggiuntivi (Base CCNL esclusa solo feriali)</div>
          <div class="section-content">
            <div class="summary-grid" style="grid-template-columns: repeat(4, 1fr);">
              <div class="summary-card">
                <div class="value">${weekdaysWorked}</div>
                <div class="label">Gg feriali lavorati</div>
              </div>
              <div class="summary-card">
                <div class="value">${formatCurrency(dailyRate)}</div>
                <div class="label">Tariffa giornaliera</div>
              </div>
              <div class="summary-card">
                <div class="value">${formatCurrency(baseEarnings)}</div>
                <div class="label">Base CCNL esclusa</div>
              </div>
              <div class="summary-card earnings">
                <div class="value">${formatCurrency(extra)}</div>
                <div class="label">Totale Extra</div>
              </div>
            </div>
            <div style="font-size:8px;color:#666;margin-top:6px;">
              Nota: la base CCNL è sottratta solo per i giorni lavorativi feriali (lun–ven) con ore di lavoro/viaggio, esclusi i festivi.
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      console.warn('⚠️ generateExtraEarningsSection errore:', e);
      return '';
    }
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
    const contractData = settings.contract || {};
    const contract = contractData.name || 'Metalmeccanico PMI';
    const level = contractData.code ? contractData.code.replace('METAL_PMI_', 'Livello ') : 'Livello 5';
    const monthlySalary = contractData.monthlySalary || 2800;
    const hourlyRate = contractData.hourlyRate || (monthlySalary / (26 * 8));
    const dailyRate = contractData.dailyRate || (monthlySalary / 26);
    
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
              <div class="contract-value">${formatCurrency(hourlyRate)}</div>
            </div>
          </div>
          <div class="contract-grid">
            <div class="contract-item">
              <div class="contract-label">Tariffa Giornaliera</div>
              <div class="contract-value">${formatCurrency(dailyRate)}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Compenso Trasferta</div>
              <div class="contract-value">${formatCurrency(settings.travelAllowance?.dailyAmount || 0)}/giorno</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Buono Pasto</div>
              <div class="contract-value">
                B:${settings.mealAllowances?.lunch?.voucherAmount || 0} 
                €:${formatCurrency(settings.mealAllowances?.lunch?.cashAmount || 0)}
              </div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Reperibilità Feriale</div>
              <div class="contract-value">
                ${(() => {
                  const { getStandbyRatesForContract } = require('../constants');
                  const key = settings?.contract?.key;
                  const rates = getStandbyRatesForContract(key);
                  const v16 = settings.standbySettings?.customFeriale16 || rates.feriale16;
                  const v24 = settings.standbySettings?.customFeriale24 || rates.feriale24;
                  return settings.standbySettings?.allowanceType === '16h' 
                    ? `€${v16} (16h)`
                    : `€${v24} (24h)`;
                })()}
              </div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Reperibilità Festivo</div>
              <div class="contract-value">
                ${(() => {
                  const { getStandbyRatesForContract } = require('../constants');
                  const key = settings?.contract?.key;
                  const rates = getStandbyRatesForContract(key);
                  const vf = settings.standbySettings?.customFestivo || rates.festivo24;
                  return `€${vf} (24h)`;
                })()}
              </div>
            </div>
            ${(() => {
              const weekly = settings.standbySettings?.weeklyMode;
              const { getStandbyRatesForContract } = require('../constants');
              const key = settings?.contract?.key; const rates = getStandbyRatesForContract(key);
              if (!weekly || !weekly.enabled || !rates.weekly6Days) return '';
              const labelMap = {
                base: '6 giorni',
                withHoliday: '6 giorni + festivo',
                withHolidayAndRest: '6 giorni + festivo + giorno libero'
              };
              const keyMap = { base: 'six', withHoliday: 'sixWithHoliday', withHolidayAndRest: 'sixWithHolidayAndRest' };
              const label = labelMap[weekly.option || 'base'];
              const amount = rates.weekly6Days[keyMap[weekly.option || 'base']];
              return `
                <div class="contract-item">
                  <div class="contract-label">Forfait settimana (6 giorni)</div>
                  <div class="contract-value">€${amount} – ${label}</div>
                </div>
              `;
            })()}
            ${(() => {
              // Se è valorizzato un importo personalizzato per il forfait settimanale, mostrane l'override accanto all'opzione scelta
              const weekly = settings.standbySettings?.weeklyMode;
              const customW = settings.standbySettings?.customWeekly6Days;
              if (!weekly || !weekly.enabled || !customW) return '';
              const labelMap = {
                base: '6 giorni',
                withHoliday: '6 giorni + festivo',
                withHolidayAndRest: '6 giorni + festivo + giorno libero'
              };
              const label = labelMap[weekly.option || 'base'];
              return `
                <div class="contract-item">
                  <div class="contract-label">Forfait settimana personalizzato</div>
                  <div class="contract-value">€${customW} – ${label}</div>
                </div>
              `;
            })()}
          </div>
        </div>
      </div>
    `;
  }
  
  // 📊 RIEPILOGO MENSILE
  static generateMonthlySummary(calculations) {
    console.log(`📊 PDF SUMMARY - Input calculations:`, {
      totalHours: calculations?.totalHours,
      totalEarnings: calculations?.totalEarnings,
      workingDays: calculations?.workingDays,
      ordinaryHours: calculations?.ordinaryHours,
      overtimeHours: calculations?.overtimeHours
    });

    if (!calculations) return '';
    
    const {
      totalHours = 0,
      ordinaryHours = 0,
      overtimeHours = 0,
      totalEarnings = 0,
      workingDays = 0,
      travelHours = 0,
      specialDays = {},
      standbyInfo = {}
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

          <!-- 🎯 NUOVA SEZIONE: GIORNI SPECIALI -->
          ${(specialDays.saturday > 0 || specialDays.sunday > 0 || specialDays.holiday > 0) ? `
          <div class="summary-section">
            <h4>📅 Giorni Non Ordinari</h4>
            <div class="special-days-grid">
              ${specialDays.saturday > 0 ? `
              <div class="special-day-item">
                <span class="day-count">${specialDays.saturday}</span>
                <span class="day-label">Sabato</span>
              </div>` : ''}
              ${specialDays.sunday > 0 ? `
              <div class="special-day-item">
                <span class="day-count">${specialDays.sunday}</span>
                <span class="day-label">Domenica</span>
              </div>` : ''}
              ${specialDays.holiday > 0 ? `
              <div class="special-day-item">
                <span class="day-count">${specialDays.holiday}</span>
                <span class="day-label">Festivi</span>
              </div>` : ''}
            </div>
          </div>` : ''}

          <!-- 🎯 NUOVA SEZIONE: SOLO INTERVENTI REPERIBILITÀ -->
          ${standbyInfo.interventions > 0 ? `
          <div class="summary-section">
            <h4>� Interventi Reperibilità</h4>
            <div class="standby-info">
              <div class="standby-item">
                <span class="standby-count">${standbyInfo.interventions}</span>
                <span class="standby-label">Totale Interventi</span>
              </div>
              <div class="standby-item">
                <span class="standby-count">${formatCurrency(standbyInfo.totalEarnings || 0)}</span>
                <span class="standby-label">Compenso Reperibilità</span>
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  }
  
  // Helper per calcolare differenza oraria
  static calculateTimeDifferenceInHours(startTime, endTime) {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      let end = new Date(`2000-01-01T${endTime}`);
      
      // Se l'orario di fine è minore dell'orario di inizio, attraversa la mezzanotte
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      return (end - start) / (1000 * 60 * 60);
    } catch (e) {
      return 0;
    }
  }
  
  // 📅 INSERIMENTI GIORNALIERI DETTAGLIATI - CON CALCOLI INTEGRATI E GIORNI REPERIBILITÀ
  static async generateDailyEntries(workEntries, settings, standbyData = null) {
    console.log(`📅 PRINT SERVICE - Generazione tabella per ${workEntries.length} inserimenti`);
    
    // Combina inserimenti di lavoro con giorni di sola reperibilità
    const allEntries = [...workEntries];
    
    // Aggiungi giorni di sola reperibilità (giorni da CalculationService ma non in work_entries)
    if (standbyData && standbyData.length > 0) {
      console.log(`📅 PRINT SERVICE - Processando ${standbyData.length} giorni standby (da impostazioni)`);
      const workDates = new Set(workEntries.map(entry => entry.date));
      console.log(`📅 PRINT SERVICE - Date lavoro esistenti: ${Array.from(workDates).join(', ')}`);
      
      let standbyOnlyCount = 0;
      standbyData.forEach(standbyDay => {
        console.log(`📅 PRINT SERVICE - Controllo standby ${standbyDay.date}, allowance statico: ${standbyDay.allowance}`);
        
        if (!workDates.has(standbyDay.date) && standbyDay.allowance > 0) {
          console.log(`📅 PRINT SERVICE - Aggiungendo giorno di sola reperibilità: ${standbyDay.date}`);
          standbyOnlyCount++;
          
          // Calcola l'indennità corretta dinamicamente (feriale/festivo)
          const calculationService = new CalculationService();
          const correctAllowance = calculationService.calculateStandbyAllowanceForDate(standbyDay.date, settings);
          console.log(`📅 PRINT SERVICE - Indennità corretta per ${standbyDay.date}: €${correctAllowance} (era €${standbyDay.allowance})`);
          
          // Crea un'entry virtuale per il giorno di sola reperibilità
          allEntries.push({
            date: standbyDay.date,
            site_name: 'Reperibilità',
            vehicle_driven: '-',
            work_start_1: null,
            work_end_1: null,
            work_start_2: null,
            work_end_2: null,
            departure_company: null,
            arrival_site: null,
            departure_return: null,
            arrival_company: null,
            travel_allowance: 0,
            standby_allowance: correctAllowance,
            meal_lunch_voucher: 0,
            meal_lunch_cash: 0,
            meal_dinner_voucher: 0,
            meal_dinner_cash: 0,
            is_standby_day: true,
            day_type: standbyDay.dayType || 'feriale',
            total_earnings: correctAllowance,
            notes: 'Giorno di sola reperibilità',
            standby_interventions: standbyDay.interventions || 0,
            interventi: null
          });
        }
      });
      
      console.log(`📅 PRINT SERVICE - Aggiunti ${standbyOnlyCount} giorni di sola reperibilità`);
    }
    
    // Ordina tutti gli inserimenti per data
    allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Helper function per convertire time string a minuti
    const timeToMinutes = (timeString) => {
      if (!timeString) return 0;
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    if (!allEntries.length) {
      return `
        <div class="section">
          <div class="section-header">📅 Inserimenti Giornalieri</div>
          <div class="section-content">
            <p>Nessun inserimento trovato per questo mese.</p>
          </div>
        </div>
      `;
    }
    
    let tableRows = '';
    let printedCount = 0;
    const baseHourlyRate = 16.568; // Rate CCNL Level 5
    
    // 📊 INIZIALIZZA ACCUMULATORI PER TOTALI (somma valori mostrati nelle righe)
    let totalWorkHours = 0;
    let totalTravelHours = 0;
    let totalTravelAllowance = 0;
    let totalStandbyAllowance = 0;
    let totalEarnings = 0;
    let totalVouchers = 0;
    let totalCash = 0;
    let totalStandbyInterventions = 0;
    
    allEntries.forEach((entry, index) => {
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
        
        // 🔧 CORREZIONE: USA I VALORI GIÀ CALCOLATI DALLA DASHBOARD
        console.log(`🔧 PDF DISPLAY - DEBUG ENTRY STRUCTURE for ${entry.date}:`, {
          hasViaggi: !!entry.viaggi,
          viaggiLength: entry.viaggi ? entry.viaggi.length : 'N/A',
          viaggiType: typeof entry.viaggi,
          hasWorkStart1: !!entry.work_start_1,
          hasWorkEnd1: !!entry.work_end_1,
          hasDepartureCompany: !!entry.departure_company,
          hasArrivalSite: !!entry.arrival_site,
          keys: Object.keys(entry).filter(k => k.includes('viaggio') || k.includes('work') || k.includes('departure') || k.includes('arrival'))
        });
        
        // 🔥 IMPORTANTE: Parsa i viaggi se sono in formato JSON stringa
        let processedEntry = { ...entry };
        if (typeof entry.viaggi === 'string' && entry.viaggi.length > 0) {
          try {
            processedEntry.viaggi = JSON.parse(entry.viaggi);
            console.log(`🔧 PDF DISPLAY - Viaggi parsati per ${entry.date}:`, processedEntry.viaggi);
          } catch (e) {
            console.warn(`🔧 PDF DISPLAY - Errore parsing viaggi per ${entry.date}:`, e);
            processedEntry.viaggi = [];
          }
        } else if (!Array.isArray(entry.viaggi)) {
          processedEntry.viaggi = [];
        }

        // 🚀 CORREZIONE CRITICA: Se viaggi è vuoto ma abbiamo dati turno principale, 
        // ricostruisci il viaggio principale dai campi diretti
        if ((!processedEntry.viaggi || processedEntry.viaggi.length === 0) && 
            (entry.departure_company || entry.arrival_site || entry.work_start_1)) {
          console.log(`🔧 PDF DISPLAY - Ricostruendo viaggio principale per ${entry.date} da campi diretti`);
          processedEntry.viaggi = [{
            departure_company: entry.departure_company || '',
            arrival_site: entry.arrival_site || '',
            work_start_1: entry.work_start_1 || '',
            work_end_1: entry.work_end_1 || '',
            work_start_2: entry.work_start_2 || '',
            work_end_2: entry.work_end_2 || '',
            departure_return: entry.departure_return || '',
            arrival_company: entry.arrival_company || ''
          }];
          console.log(`🔧 PDF DISPLAY - Viaggio ricostruito per ${entry.date}:`, processedEntry.viaggi[0]);
        }
        
        const workHours = this.calculateWorkHours(processedEntry);
        const travel = this.calculateTravelHours(processedEntry);
        
        // 🎯 USA DIRETTAMENTE I VALORI DASHBOARD CALCOLATI NELLA FASE PRECEDENTE
        // (già disponibili in calculatedData dalla funzione chiamante)
        let displayEarnings = parseFloat(entry.total_earnings || 0);
        console.log(`🎯 PDF DISPLAY - Usando total_earnings per ${entry.date}: €${displayEarnings.toFixed(2)}`);
        
        // Se è un giorno di sola reperibilità
        if (displayEarnings === 0 && entry.standby_allowance > 0) {
          displayEarnings = parseFloat(entry.standby_allowance);
          console.log(`🔧 PDF DISPLAY - Reperibilità per ${entry.date}: €${displayEarnings.toFixed(2)}`);
        }
        
        // Parse interventi
        let interventi = [];
        try {
          interventi = entry.interventi ? JSON.parse(entry.interventi) : [];
        } catch (e) {
          console.warn('Errore parsing interventi:', e);
        }
        
        // Orari di lavoro - MOSTRA TUTTI I TURNI (1,2,3,4...)
        const workPeriods = [];
        let entryWorkHours = 0;
        
        // Turni principali (T1, T2)
        if (entry.work_start_1 && entry.work_end_1) {
          const duration1 = this.calculateTimeDifferenceInHours(entry.work_start_1, entry.work_end_1);
          workPeriods.push(`Turno 1: ${entry.work_start_1}-${entry.work_end_1} (${duration1.toFixed(1)}h)`);
          entryWorkHours += duration1;
        }
        if (entry.work_start_2 && entry.work_end_2) {
          const duration2 = this.calculateTimeDifferenceInHours(entry.work_start_2, entry.work_end_2);
          workPeriods.push(`Turno 2: ${entry.work_start_2}-${entry.work_end_2} (${duration2.toFixed(1)}h)`);
          entryWorkHours += duration2;
        }
        
        // 🔥 TURNI AGGIUNTIVI DAL CAMPO VIAGGI (Turno 3, 4, 5...)
        let viaggi = [];
        try {
          viaggi = entry.viaggi ? JSON.parse(entry.viaggi) : [];
        } catch (e) {
          console.warn('Errore parsing viaggi per turni aggiuntivi:', e);
        }
        
        if (viaggi.length > 0) {
          console.log(`📋 ${entry.date}: Trovati ${viaggi.length} turni aggiuntivi`);
          
          let turnoNumber = 3; // Inizia dal turno 3
          viaggi.forEach((viaggio, index) => {
            // Primo slot del viaggio
            if (viaggio.work_start_1 && viaggio.work_end_1) {
              const duration = this.calculateTimeDifferenceInHours(viaggio.work_start_1, viaggio.work_end_1);
              workPeriods.push(`Turno ${turnoNumber++}: ${viaggio.work_start_1}-${viaggio.work_end_1} (${duration.toFixed(1)}h)`);
              entryWorkHours += duration;
            }
            // Secondo slot del viaggio
            if (viaggio.work_start_2 && viaggio.work_end_2) {
              const duration = this.calculateTimeDifferenceInHours(viaggio.work_start_2, viaggio.work_end_2);
              workPeriods.push(`Turno ${turnoNumber++}: ${viaggio.work_start_2}-${viaggio.work_end_2} (${duration.toFixed(1)}h)`);
              entryWorkHours += duration;
            }
          });
        }
        
        // Aggiungi totale se ci sono turni
        if (workPeriods.length > 0) {
          workPeriods.push(`<strong>Totale Ore Lavoro: ${entryWorkHours.toFixed(1)}h</strong>`);
        }
        
        const workHoursDisplay = workPeriods.length > 0 ? workPeriods.join('<br>') : '-';
        
        // Viaggi - MOSTRA TUTTI I VIAGGI (Andata, Viaggio 2-Andata, etc.)
        const travelPeriods = [];
        let entryTravelHours = 0;
        
        // Viaggi principali
        if (entry.departure_company && entry.arrival_site) {
          const duration1 = this.calculateTimeDifferenceInHours(entry.departure_company, entry.arrival_site);
          travelPeriods.push(`Andata: ${entry.departure_company}-${entry.arrival_site} (${duration1.toFixed(1)}h)`);
          entryTravelHours += duration1;
        }
        if (entry.departure_return && entry.arrival_company) {
          const duration2 = this.calculateTimeDifferenceInHours(entry.departure_return, entry.arrival_company);
          travelPeriods.push(`Ritorno: ${entry.departure_return}-${entry.arrival_company} (${duration2.toFixed(1)}h)`);
          entryTravelHours += duration2;
        }
        
        // 🔥 VIAGGI AGGIUNTIVI DAL CAMPO VIAGGI (Viaggio 2, 3, 4...)
        if (viaggi.length > 0) {
          viaggi.forEach((viaggio, index) => {
            const viaggioNumber = index + 2; // Viaggio 2, 3, 4...
            
            // Andata del viaggio aggiuntivo
            if (viaggio.departure_company && viaggio.arrival_site) {
              const duration = this.calculateTimeDifferenceInHours(viaggio.departure_company, viaggio.arrival_site);
              travelPeriods.push(`Viaggio ${viaggioNumber} - Andata: ${viaggio.departure_company}-${viaggio.arrival_site} (${duration.toFixed(1)}h)`);
              entryTravelHours += duration;
            }
            // Ritorno del viaggio aggiuntivo
            if (viaggio.departure_return && viaggio.arrival_company) {
              const duration = this.calculateTimeDifferenceInHours(viaggio.departure_return, viaggio.arrival_company);
              travelPeriods.push(`Viaggio ${viaggioNumber} - Ritorno: ${viaggio.departure_return}-${viaggio.arrival_company} (${duration.toFixed(1)}h)`);
              entryTravelHours += duration;
            }
          });
        }
        
        // Aggiungi totale se ci sono viaggi
        if (travelPeriods.length > 0) {
          travelPeriods.push(`<strong>Totale Viaggio: ${entryTravelHours.toFixed(1)}h</strong>`);
        }
        
        const travelDisplay = travelPeriods.length > 0 ? travelPeriods.join('<br>') : '-';
        
        // Pasti - FORMATO COME TIMEENTRYSCREEN CON VALORI REALI
        const mealInfo = [];
        
        // Pranzo - usa i nomi corretti dal database
        if (entry.meal_lunch_voucher > 0 || entry.meal_lunch_cash > 0) {
          if (entry.meal_lunch_cash > 0) {
            // Valore cash specifico
            mealInfo.push(`Pranzo: ${formatCurrency(entry.meal_lunch_cash)} (€)`);
          } else {
            // Valore buono dalle impostazioni
            const lunchVoucherAmount = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;
            const lunchCashAmount = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;
            
            if (lunchVoucherAmount > 0 && lunchCashAmount > 0) {
              mealInfo.push(`Pranzo: ${formatCurrency(lunchVoucherAmount)} (B) + ${formatCurrency(lunchCashAmount)} (€)`);
            } else if (lunchVoucherAmount > 0) {
              mealInfo.push(`Pranzo: ${formatCurrency(lunchVoucherAmount)} (B)`);
            } else if (lunchCashAmount > 0) {
              mealInfo.push(`Pranzo: ${formatCurrency(lunchCashAmount)} (€)`);
            }
          }
        }
        
        // Cena - usa i nomi corretti dal database  
        if (entry.meal_dinner_voucher > 0 || entry.meal_dinner_cash > 0) {
          if (entry.meal_dinner_cash > 0) {
            // Valore cash specifico
            mealInfo.push(`Cena: ${formatCurrency(entry.meal_dinner_cash)} (€)`);
          } else {
            // Valore buono dalle impostazioni
            const dinnerVoucherAmount = parseFloat(settings?.mealAllowances?.dinner?.voucherAmount) || 0;
            const dinnerCashAmount = parseFloat(settings?.mealAllowances?.dinner?.cashAmount) || 0;
            
            if (dinnerVoucherAmount > 0 && dinnerCashAmount > 0) {
              mealInfo.push(`Cena: ${formatCurrency(dinnerVoucherAmount)} (B) + ${formatCurrency(dinnerCashAmount)} (€)`);
            } else if (dinnerVoucherAmount > 0) {
              mealInfo.push(`Cena: ${formatCurrency(dinnerVoucherAmount)} (B)`);
            } else if (dinnerCashAmount > 0) {
              mealInfo.push(`Cena: ${formatCurrency(dinnerCashAmount)} (€)`);
            }
          }
        }
        
        // Calcola totali pasti per visualizzazione dettagliata
        const entryVouchersTotal = (entry.meal_lunch_voucher || 0) + (entry.meal_dinner_voucher || 0);
        const entryCashTotal = (entry.meal_lunch_cash || 0) + (entry.meal_dinner_cash || 0);
        const mealSummary = [];
        if (entryVouchersTotal > 0) mealSummary.push(`B: ${entryVouchersTotal}`);
        if (entryCashTotal > 0) mealSummary.push(`€: ${formatCurrency(entryCashTotal)}`);
        
        // Separazione trasferta e reperibilità - USA LOGICA DASHBOARD DIRETTA
        let realTravelAllowance = '-';
        let realStandbyAllowance = '-';
        
        // ✅ CALCOLA INDENNITÀ TRASFERTA - RICONOSCIMENTO CORRETTO CON PERCENTUALE
        const travelAllowanceSettings = settings.travelAllowance || {};
        const travelAllowanceEnabled = travelAllowanceSettings.enabled;
        const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
        
        // 🎯 PERCENTUALE TRASFERTA: usa il valore esatto dal form (può essere 50%, 75%, etc.)
        let travelAllowancePercent = entry.travel_allowance_percent || 1.0;
        
        // 🔧 RICONOSCIMENTO TRASFERTA: 
        // - travel_allowance === 1 → trasferta attivata manualmente nel form
        // - travel_allowance > 1 → importo specifico inserito manualmente
        // - travel_allowance === 0 o undefined → non attiva
        const hasManualTravelAllowance = entry.travel_allowance && entry.travel_allowance >= 1;
        const isManualActivation = entry.travel_allowance === 1;
        const isSpecificAmount = entry.travel_allowance > 1;
        
        console.log(`📋 ${entry.date}: travel_allowance=${entry.travel_allowance}, percent=${Math.round(travelAllowancePercent*100)}%, manual=${hasManualTravelAllowance}`);
        
        if (isSpecificAmount) {
          // Importo specifico inserito manualmente - applica comunque la percentuale
          const finalAmount = entry.travel_allowance * travelAllowancePercent;
          realTravelAllowance = formatCurrency(finalAmount);
          console.log(`💰 ${entry.date}: Trasferta specifica €${entry.travel_allowance} × ${Math.round(travelAllowancePercent*100)}% = €${finalAmount.toFixed(2)}`);
        } else if (isManualActivation && travelAllowanceEnabled && travelAllowanceAmount > 0) {
          // Trasferta attivata manualmente - calcola con settings E percentuale esatta
          // 🔧 USA ORE TOTALI CORRETTE (include multiturni)
          const totalWorked = entryWorkHours + entryTravelHours;
          const dateObj = new Date(entry.date);  
          const isSpecialDay = dateObj.getDay() === 0 || dateObj.getDay() === 6 || entry.day_type === 'festivo';
          const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
          const manualOverride = entry.trasferta_manual_override || false;
          
          console.log(`🔍 ${entry.date}: Ore totali corrette - Lavoro: ${totalWorkHours}h, Viaggio: ${totalTravelHours}h, Totale: ${totalWorked}h`);
          
          // Verifica se può essere applicata
          if (!(isSpecialDay) || applyOnSpecialDays || manualOverride) {
            // Gestione opzioni di calcolo (LOGICA DASHBOARD UNIFICATA)
            const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
            
            let baseTravelAllowance = travelAllowanceAmount;
            
            console.log(`🔍 ${entry.date}: Opzioni CCNL attive: ${selectedOptions.join(', ')}`);
            
            // Calcolo proporzionale CCNL se selezionato
            if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
              const standardWorkDay = 8;
              const proportionalRate = Math.min(totalWorked / standardWorkDay, 1);
              baseTravelAllowance = travelAllowanceAmount * proportionalRate;
              console.log(`🔍 ${entry.date}: PROPORTIONAL_CCNL - ${totalWorked}h / ${standardWorkDay}h = ${(proportionalRate*100).toFixed(1)}% → €${baseTravelAllowance.toFixed(2)}`);
            } else if (selectedOptions.includes('HALF_ALLOWANCE_HALF_DAY') && totalWorked < 8) {
              baseTravelAllowance = travelAllowanceAmount * 0.5;
              console.log(`🔍 ${entry.date}: HALF_ALLOWANCE_HALF_DAY - ${totalWorked}h < 8h → 50% → €${baseTravelAllowance.toFixed(2)}`);
            }
            
            // 🎯 APPLICA LA PERCENTUALE ESATTA DAL FORM (TUTTI I GIORNI, inclusi 08-09/07)
            const finalTravelAllowance = baseTravelAllowance * travelAllowancePercent;
            
            if (finalTravelAllowance > 0) {
              realTravelAllowance = formatCurrency(finalTravelAllowance);
              console.log(`📊 ${entry.date}: Trasferta €${travelAllowanceAmount} → €${baseTravelAllowance.toFixed(2)} (CCNL) × ${Math.round(travelAllowancePercent*100)}% = €${finalTravelAllowance.toFixed(2)}`);
            }
          } else {
            console.log(`⚠️ ${entry.date}: Trasferta non applicabile (giorno speciale senza override)`);
          }
        } else {
          console.log(`ℹ️ ${entry.date}: Nessuna trasferta (enabled=${travelAllowanceEnabled}, manual=${hasManualTravelAllowance})`);
        }
        
        // Calcola indennità reperibilità reale
        if (entry.is_standby_day || entry.standby_allowance > 0) {
          if (settings.standbySettings && settings.standbySettings.enabled) {
            const dateObj = new Date(entry.date);
            const isSunday = dateObj.getDay() === 0;
            const isSaturday = dateObj.getDay() === 6;
            const isHoliday = entry.day_type === 'festivo';
            const allowanceType = settings.standbySettings.allowanceType || '24h';
            
            // Tariffe CCNL per livello
            const { getStandbyRatesForContract } = require('../constants');
            const cKey = settings?.contract?.key;
            const rates = getStandbyRatesForContract(cKey);
            const saturdayMode = settings.standbySettings.saturdayMode || (settings.standbySettings.saturdayAsRest ? 'festivo' : 'feriale');

            let standbyAmount = 0;
            if (isHoliday || isSunday || (isSaturday && saturdayMode === 'festivo')) {
              standbyAmount = parseFloat(settings.standbySettings.customFestivo || rates.festivo24);
            } else if (isSaturday && saturdayMode === 'feriale24') {
              standbyAmount = parseFloat(settings.standbySettings.customFeriale24 || rates.feriale24);
            } else if (allowanceType === '16h') {
              standbyAmount = parseFloat(settings.standbySettings.customFeriale16 || rates.feriale16);
            } else {
              standbyAmount = parseFloat(settings.standbySettings.customFeriale24 || rates.feriale24);
            }
            realStandbyAllowance = formatCurrency(standbyAmount);
          } else if (entry.standby_allowance > 0) {
            realStandbyAllowance = formatCurrency(entry.standby_allowance);
          }
        }
        
        // Interventi reperibilità - MOSTRA ORARI PRECISI DAGLI INTERVENTI
        let standbyInterventions = '-';
        
        if (entry.is_standby_day || entry.standby_allowance > 0) {
          // Parse interventi JSON se esiste
          let parsedInterventi = [];
          try {
            parsedInterventi = entry.interventi ? JSON.parse(entry.interventi) : [];
          } catch (e) {
            parsedInterventi = Array.isArray(entry.interventi) ? entry.interventi : [];
          }
          
          if (parsedInterventi.length > 0) {
            const allInterventionTimes = [];
            
            // Per ogni intervento, raccogli tutti gli orari
            parsedInterventi.forEach((intervento, index) => {
              const interventionTimes = [];
              
              // Viaggio andata
              if (intervento.departure_company && intervento.arrival_site) {
                interventionTimes.push(`${intervento.departure_company}-${intervento.arrival_site}`);
              }
              
              // Lavoro turno 1
              if (intervento.work_start_1 && intervento.work_end_1) {
                interventionTimes.push(`${intervento.work_start_1}-${intervento.work_end_1}`);
              }
              
              // Lavoro turno 2
              if (intervento.work_start_2 && intervento.work_end_2) {
                interventionTimes.push(`${intervento.work_start_2}-${intervento.work_end_2}`);
              }
              
              // Viaggio ritorno
              if (intervento.departure_return && intervento.arrival_company) {
                interventionTimes.push(`${intervento.departure_return}-${intervento.arrival_company}`);
              }
              
              if (interventionTimes.length > 0) {
                // Formatta con max 2 orari per riga
                const formattedTimes = [];
                for (let i = 0; i < interventionTimes.length; i += 2) {
                  const line = interventionTimes.slice(i, i + 2).join(' | ');
                  formattedTimes.push(line);
                }
                allInterventionTimes.push(`Int.${index + 1}:\n${formattedTimes.join('\n')}`);
              }
            });
            
            if (allInterventionTimes.length > 0) {
              standbyInterventions = allInterventionTimes.join('\n---\n');
            } else {
              standbyInterventions = `${parsedInterventi.length} int.`;
            }
          } else {
            // Se non ci sono interventi ma è standby
            standbyInterventions = 'Standby';
          }
        }
        
        printedCount++;
        console.log(`📅 PRINT SERVICE - Elaborazione inserimento ${printedCount}: ${entry.date} - €${displayEarnings.toFixed(2)}`);
        
        // 📊 ACCUMULA VALORI PER TOTALI (usa valori che saranno mostrati nella riga)
        totalWorkHours += parseFloat(entryWorkHours || 0);
        totalTravelHours += parseFloat(entryTravelHours || 0);
        
        // Converte stringhe formattate a numeri per accumulo
        const travelAllowanceNum = realTravelAllowance === '-' ? 0 : parseFloat(realTravelAllowance.replace(',', '.')) || 0;
        const standbyAllowanceNum = realStandbyAllowance === '-' ? 0 : parseFloat(realStandbyAllowance.replace(',', '.')) || 0;
        
        totalTravelAllowance += travelAllowanceNum;
        totalStandbyAllowance += standbyAllowanceNum;
        totalEarnings += parseFloat(displayEarnings || 0);
        
        // Accumula ORE TOTALI interventi reperibilità
        if (entry.is_standby_day || entry.standby_allowance > 0) {
          let parsedInterventi = [];
          try {
            parsedInterventi = entry.interventi ? JSON.parse(entry.interventi) : [];
          } catch (e) {
            parsedInterventi = Array.isArray(entry.interventi) ? entry.interventi : [];
          }
          
          // Calcola ore totali di lavoro degli interventi
          let interventionWorkHours = 0;
          parsedInterventi.forEach(intervento => {
            // Turno 1
            if (intervento.work_start_1 && intervento.work_end_1) {
              const start1 = timeToMinutes(intervento.work_start_1);
              const end1 = timeToMinutes(intervento.work_end_1);
              let duration1 = end1 - start1;
              if (duration1 < 0) duration1 += 24 * 60; // Next day
              interventionWorkHours += duration1 / 60;
            }
            
            // Turno 2
            if (intervento.work_start_2 && intervento.work_end_2) {
              const start2 = timeToMinutes(intervento.work_start_2);
              const end2 = timeToMinutes(intervento.work_end_2);
              let duration2 = end2 - start2;
              if (duration2 < 0) duration2 += 24 * 60; // Next day
              interventionWorkHours += duration2 / 60;
            }
          });
          
          totalStandbyInterventions += interventionWorkHours;
        }
        
        // Accumula pasti (calcola i valori che saranno mostrati)
        let entryVouchers = 0;
        let entryCash = 0;
        
        // Pranzo
        if (entry.meal_lunch_voucher > 0 || entry.meal_lunch_cash > 0) {
          if (entry.meal_lunch_cash > 0) {
            entryCash += entry.meal_lunch_cash;
          } else {
            const lunchVoucherAmount = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;
            const lunchCashAmount = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;
            entryVouchers += lunchVoucherAmount;
            entryCash += lunchCashAmount;
          }
        }
        
        // Cena
        if (entry.meal_dinner_voucher > 0 || entry.meal_dinner_cash > 0) {
          if (entry.meal_dinner_cash > 0) {
            entryCash += entry.meal_dinner_cash;
          } else {
            const dinnerVoucherAmount = parseFloat(settings?.mealAllowances?.dinner?.voucherAmount) || 0;
            const dinnerCashAmount = parseFloat(settings?.mealAllowances?.dinner?.cashAmount) || 0;
            entryVouchers += dinnerVoucherAmount;
            entryCash += dinnerCashAmount;
          }
        }
        
        totalVouchers += entryVouchers;
        totalCash += entryCash;
        
        console.log(`📊 ${entry.date}: Accumulato - Lavoro: ${entryWorkHours}h, Viaggio: ${entryTravelHours}h, Trasferta: €${travelAllowanceNum}, Guadagni: €${displayEarnings}`);
        
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
              ${workHoursDisplay}
              ${interventi.length > 0 ? '<br><small>Interventi: ' + interventi.length + '</small>' : ''}
            </td>
            <td class="time-cell">
              ${travelDisplay}
            </td>
            <td>
              ${realTravelAllowance}
            </td>
            <td>
              ${realStandbyAllowance}
            </td>
            <td>
              ${standbyInterventions}
            </td>
            <td class="earnings-cell">
              ${formatCurrency(displayEarnings)}
            </td>
            <td>
              ${mealInfo.join('<br>')}
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
    
    console.log(`📅 PRINT SERVICE - Completata elaborazione: ${printedCount}/${allEntries.length} inserimenti (${allEntries.length - workEntries.length} giorni reperibilità aggiunti)`);
    
    // 📊 TOTALI GIÀ CALCOLATI DURANTE IL LOOP (somma dei valori mostrati nelle righe)
    console.log(`📊 TOTALI FINALI ACCUMULATI:`, {
      ore_lavoro: totalWorkHours.toFixed(1),
      ore_viaggio: totalTravelHours.toFixed(1),
      trasferta: totalTravelAllowance.toFixed(2),
      reperibilità: totalStandbyAllowance.toFixed(2),
      guadagni: totalEarnings.toFixed(2),
      buoni: totalVouchers.toFixed(2),
      contanti: totalCash.toFixed(2),
      ore_interventi: totalStandbyInterventions.toFixed(1)
    });
    
    // Riga totali
    const totalsRow = `
      <tr style="background-color: #f5f5f5; font-weight: bold; border-top: 2px solid #333;">
        <td colspan="3" style="text-align: center; font-weight: bold;">TOTALI</td>
        <td><strong>Tot: ${totalWorkHours.toFixed(1)}h</strong></td>
        <td><strong>Tot: ${totalTravelHours.toFixed(1)}h</strong></td>
        <td>${formatCurrency(totalTravelAllowance)}</td>
        <td>${formatCurrency(totalStandbyAllowance)}</td>
        <td><strong>${totalStandbyInterventions.toFixed(1)}h</strong></td>
        <td class="earnings-cell">${formatCurrency(totalEarnings)}</td>
        <td>${formatCurrency(totalVouchers + totalCash)}</td>
        <td>-</td>
      </tr>
    `;
    
    return `
      <div class="section">
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
                <th>Trasferta €</th>
                <th>Reperibilità €</th>
                <th>Interventi Rep.</th>
                <th>Totale €</th>
                <th>Pasti</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              ${totalsRow}
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
  static async generateAndSharePDF(year, month, dashboardData = null) {
    try {
      console.log(`📄 PRINT SERVICE - Inizio generazione PDF per ${month}/${year}`);
      if (dashboardData) {
        console.log(`📄 PRINT SERVICE - Ricevuti dati dashboard:`, {
          dailyBreakdowns: Object.keys(dashboardData.dailyBreakdowns || {}).length,
          monthlyTotals: dashboardData.monthlyTotals ? '✅' : '❌'
        });
      }
      
      // 1. Recupera tutti i dati
      const data = await this.getAllMonthlyData(year, month);
      console.log(`📄 PRINT SERVICE - Dati recuperati: ${data.workEntries.length} inserimenti`);
      
      // 🎯 APPLICA I VALORI DASHBOARD AI WORK ENTRIES
      if (dashboardData?.dailyBreakdowns) {
        console.log(`🔍 DEBUG - Esempio dati dashboard:`, Object.keys(dashboardData.dailyBreakdowns).slice(0, 2).map(date => ({
          date,
          data: dashboardData.dailyBreakdowns[date]
        })));
        
        data.workEntries.forEach(entry => {
          const dashboardValue = dashboardData.dailyBreakdowns[entry.date];
          if (dashboardValue) {
            console.log(`🔍 DEBUG - Struttura dati per ${entry.date}:`, dashboardValue);
            
            // Prova diversi campi possibili
            const possibleEarnings = dashboardValue.earnings || 
                                   dashboardValue.total || 
                                   dashboardValue.totalEarnings ||
                                   parseFloat(dashboardValue.toString());
            
            if (possibleEarnings && possibleEarnings > 0) {
              entry.total_earnings = possibleEarnings;
              console.log(`📄 PRINT SERVICE - Aggiornato ${entry.date}: €${possibleEarnings} (da ${typeof dashboardValue})`);
            } else {
              console.log(`⚠️ PRINT SERVICE - Nessun valore valido per ${entry.date}:`, dashboardValue);
            }
          }
        });
      }

      // 🎯 USA I TOTALI MENSILI DALLA DASHBOARD SE DISPONIBILI
      if (dashboardData?.monthlyTotals) {
        console.log(`📊 PRINT SERVICE - Struttura completa monthlyTotals:`, JSON.stringify(dashboardData.monthlyTotals, null, 2));
        
        // Calcola le ore dalle strutture della dashboard
        const ordinaryHours = (dashboardData.monthlyTotals.ordinary?.hours?.lavoro_giornaliera || 0) + 
                             (dashboardData.monthlyTotals.ordinary?.hours?.viaggio_giornaliera || 0);
        
        // ⚠️ CORREZIONE: Straordinari = lavoro extra + giorni non ordinari (sabato/domenica/festivi)
        const specialDaysHours = (dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.saturday?.hours || 0) +
                                (dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.sunday?.hours || 0) +
                                (dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.holiday?.hours || 0);
        
        const overtimeHours = (dashboardData.monthlyTotals.ordinary?.hours?.lavoro_extra || 0) + specialDaysHours;
        
        const totalHours = ordinaryHours + overtimeHours;
        const travelHours = (dashboardData.monthlyTotals.ordinary?.hours?.viaggio_giornaliera || 0) + 
                           (dashboardData.monthlyTotals.ordinary?.hours?.viaggio_extra || 0);
        
        console.log(`📊 PRINT SERVICE - Ore calcolate (corrette + giorni speciali):`, {
          ordinaryHours: ordinaryHours,
          overtimeHours: `${overtimeHours} (${dashboardData.monthlyTotals.ordinary?.hours?.lavoro_extra || 0} lavoro extra + ${specialDaysHours} giorni speciali)`,
          specialDaysBreakdown: {
            saturday: dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.saturday?.hours || 0,
            sunday: dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.sunday?.hours || 0,
            holiday: dashboardData.monthlyTotals.analytics?.specialDaysBreakdown?.holiday?.hours || 0,
            total: specialDaysHours
          },
          totalHours: totalHours,
          travelHours: travelHours
        });

        // 🔍 DEBUG: Controlliamo i dati per giorni speciali
        console.log(`📊 PRINT SERVICE - Dati giorni speciali:`, {
          breakdown: dashboardData.monthlyTotals.breakdown,
          analytics: dashboardData.monthlyTotals.analytics,
          specialDays: dashboardData.monthlyTotals.specialDays
        });
        
        data.monthlyCalculations = {
          totalEarnings: dashboardData.monthlyTotals.totalEarnings || 0,
          workingDays: dashboardData.monthlyTotals.daysWorked || 0,
          totalHours: totalHours,
          ordinaryHours: ordinaryHours,
          overtimeHours: overtimeHours,
          travelHours: travelHours,
          ordinaryEarnings: dashboardData.monthlyTotals.ordinary?.total || 0,
          overtimeEarnings: dashboardData.monthlyTotals.ordinary?.earnings?.lavoro_extra || 0,
          travelAllowance: dashboardData.monthlyTotals.travel?.totalAllowance || 0,
          standbyAllowance: dashboardData.monthlyTotals.standby?.totalEarnings || 0,
          // 🎯 AGGIORNA DATI GIORNI SPECIALI E SOLO INTERVENTI
          specialDays: {
            saturday: dashboardData.monthlyTotals.analytics?.saturdayWorkDays || 0,
            sunday: dashboardData.monthlyTotals.analytics?.sundayWorkDays || 0,
            holiday: dashboardData.monthlyTotals.analytics?.holidayWorkDays || 0
          },
          standbyInfo: {
            interventions: dashboardData.monthlyTotals.breakdown?.standbyInterventions || 0,
            totalEarnings: dashboardData.monthlyTotals.standby?.totalEarnings || 0
          }
        };
        
        // 🔍 DEBUG: Log dei giorni speciali calcolati per il PDF
        console.log('🔍 PDF DEBUG - Dashboard analytics giorni speciali:', {
          saturdayWorkDays: dashboardData.monthlyTotals.analytics?.saturdayWorkDays,
          sundayWorkDays: dashboardData.monthlyTotals.analytics?.sundayWorkDays,
          holidayWorkDays: dashboardData.monthlyTotals.analytics?.holidayWorkDays
        });
        console.log('🔍 PDF DEBUG - SpecialDays calcolati per PDF:', data.specialDays);
        console.log('🔍 PDF DEBUG - StandbyInfo calcolati per PDF:', data.standbyInfo);
      }

      // 2. Genera HTML (METODO DASHBOARD)
      const html = await this.generateCompletePrintHTML(data);
      console.log(`📄 PRINT SERVICE - HTML generato con metodo dashboard (${html.length} caratteri)`);
      
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
        base64: false
      });
      
      console.log(`📄 PRINT SERVICE - PDF generato temporaneo: ${uri}`);
      
      // Copia il file con il nome corretto
      const finalUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: uri,
        to: finalUri
      });
      
      console.log(`📄 PRINT SERVICE - PDF rinominato: ${finalUri}`);
      
      // 5. Condividi PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Condividi Registro ${monthNames[month - 1]} ${year}`,
          UTI: 'com.adobe.pdf'
        });
        console.log(`📄 PRINT SERVICE - PDF condiviso con successo`);
      }
      
      return {
        success: true,
        uri: finalUri,
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
  
  // 📅 RECUPERA GIORNI STANDBY DALLE IMPOSTAZIONI (SENZA IMPORT COMPLESSO)
  static getStandbyDaysFromSettings(year, month, settings) {
    if (!settings?.standbySettings?.enabled) return [];
    
    const results = [];
    const standbyDays = settings.standbySettings.standbyDays || {};
    const date = new Date(year, month - 1, 1); // Mese è 1-based
    const lastDay = new Date(year, month, 0).getDate();
    
  // Tariffe CCNL per livello
  const { getStandbyRatesForContract } = require('../constants');
  const key = settings?.contract?.key;
  const rates = getStandbyRatesForContract(key);
  const IND_16H_FERIALE = rates.feriale16;
  const IND_24H_FERIALE = rates.feriale24;
  const IND_24H_FESTIVO = rates.festivo24;
    
    // Personalizzazioni
  const customFeriale16 = settings.standbySettings.customFeriale16 || IND_16H_FERIALE;
  const customFeriale24 = settings.standbySettings.customFeriale24 || IND_24H_FERIALE;
  const customFestivo = settings.standbySettings.customFestivo || IND_24H_FESTIVO;
    const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  const saturdayMode = settings.standbySettings.saturdayMode || (saturdayAsRest ? 'festivo' : 'feriale');
    
    for (let day = 1; day <= lastDay; day++) {
      date.setDate(day);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Controlla se il giorno è selezionato nelle impostazioni
      const dayConfig = standbyDays[dateStr];
      if (dayConfig && dayConfig.selected === true) {
        // Determina il tipo di giorno
        const dayOfWeek = date.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        
        // Calcola indennità
        let allowance;
        let dayType;
        
        if (isSunday || (isSaturday && saturdayMode === 'festivo')) {
          allowance = customFestivo;
          dayType = 'festivo';
        } else if (isSaturday && saturdayMode === 'feriale24') {
          allowance = customFeriale24;
          dayType = 'feriale';
        } else if (allowanceType === '16h') {
          allowance = customFeriale16;
          dayType = 'feriale';
        } else {
          allowance = customFeriale24;
          dayType = 'feriale';
        }
        
        results.push({
          date: dateStr,
          allowance: allowance,
          type: 'standby',
          dayType: dayType
        });
      }
    }
    
    return results;
  }
}

export default MonthlyPrintService;
