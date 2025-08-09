import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatDate, formatTime, formatCurrency, getDayName, formatSafeHours } from '../utils';
import { createWorkEntryFromData } from '../utils/earningsHelper';

class SimplePDFService {
  static formatHours(hours) {
    if (!hours) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }

  static formatDate(date) {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
  }

  static generateStyles() {
    return `
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #2196F3;
        }
        
        .header h1 {
          font-size: 24px;
          color: #2196F3;
          margin-bottom: 10px;
        }
        
        .header .subtitle {
          font-size: 14px;
          color: #666;
        }
        
        .entry-card {
          margin-bottom: 25px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .entry-header {
          padding: 15px;
          background: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .entry-date {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        
        .entry-type {
          color: #666;
          font-size: 14px;
        }
        
        .entry-content {
          padding: 15px;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        
        .info-label {
          color: #666;
          font-weight: 500;
        }
        
        .info-value {
          color: #333;
          font-weight: bold;
        }
        
        .earnings-summary {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .earnings-total {
          font-size: 18px;
          font-weight: bold;
          color: #1976d2;
          text-align: center;
          margin-bottom: 10px;
        }
        
        .earnings-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        
        .earnings-component {
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 4px;
        }
        
        .component-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .component-value {
          font-weight: bold;
          color: #333;
        }
        
        .hours-breakdown {
          background: #f0f7ff;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .hours-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          padding: 4px 0;
        }
        
        .hours-label {
          color: #555;
        }
        
        .hours-value {
          font-weight: bold;
          color: #333;
        }
        
        .summary-section {
          margin-top: 40px;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .summary-title {
          font-size: 18px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
          padding: 15px;
          background: white;
          border-radius: 6px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .summary-value {
          font-size: 16px;
          font-weight: bold;
          color: #333;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 11px;
        }
        
        .no-entries {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }
      </style>
    `;
  }

  static generateEntryHTML(entry, calculationService, settings) {
    console.log('🔍 SimplePDF DEBUG - calculationService:', typeof calculationService);
    console.log('🔍 SimplePDF DEBUG - calculateEarningsBreakdown disponibile:', typeof calculationService?.calculateEarningsBreakdown);
    
    const workEntry = createWorkEntryFromData(entry, calculationService);
    let breakdown = null;

    try {
      if (calculationService && typeof calculationService.calculateEarningsBreakdown === 'function') {
        breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
        console.log('✅ SimplePDF DEBUG - Breakdown calcolato con successo per', entry.date);
      } else {
        console.error('❌ SimplePDF DEBUG - calculateEarningsBreakdown non è una funzione:', calculationService);
        // Fallback senza breakdown
        breakdown = {
          totalEarnings: entry.totalEarnings || 0,
          ordinary: { total: 0, hours: {}, earnings: {} },
          standby: { totalEarnings: 0, workHours: {}, travelHours: {} },
          allowances: { standby: 0, travel: 0, meal: 0 }
        };
      }
    } catch (error) {
      console.error(`Errore calcolo breakdown per ${entry.date}:`, error);
      // Fallback senza breakdown
      breakdown = {
        totalEarnings: entry.totalEarnings || 0,
        ordinary: { total: 0, hours: {}, earnings: {} },
        standby: { totalEarnings: 0, workHours: {}, travelHours: {} },
        allowances: { standby: 0, travel: 0, meal: 0 }
      };
    }

    const date = this.formatDate(entry.date);
    const dayTypeInfo = this.getDayTypeInfo(entry.day_type);
    const siteName = entry.site_name || 'Non specificato';

    // Calcolo ore lavoro totali usando calculationService se disponibile
    let totalWorkHours = 0;
    let totalTravelHours = 0;
    
    if (calculationService && calculationService.calculateWorkHours) {
      totalWorkHours = calculationService.calculateWorkHours(workEntry) || 0;
    }
    if (calculationService && calculationService.calculateTravelHours) {
      totalTravelHours = calculationService.calculateTravelHours(workEntry) || 0;
    }

    // Componenti guadagno
    const earningsComponents = [];
    if (breakdown) {
      if (breakdown.ordinary?.total > 0) {
        earningsComponents.push({ label: 'Ordinario', value: breakdown.ordinary.total, color: '#2196F3' });
      }
      if (breakdown.standby?.totalEarnings > 0) {
        const interventions = breakdown.standby.totalEarnings - (breakdown.standby.dailyIndemnity || 0);
        if (interventions > 0) {
          earningsComponents.push({ label: 'Interventi', value: interventions, color: '#FF9800' });
        }
      }
      if (breakdown.allowances?.standby > 0) {
        earningsComponents.push({ label: 'Ind. Reperibilità', value: breakdown.allowances.standby, color: '#4CAF50' });
      }
      if (breakdown.allowances?.travel > 0) {
        earningsComponents.push({ label: 'Ind. Trasferta', value: breakdown.allowances.travel, color: '#9C27B0' });
      }
      if (breakdown.allowances?.meal > 0) {
        earningsComponents.push({ label: 'Pasti', value: breakdown.allowances.meal, color: '#FF9800' });
      }
    }

    return `
      <div class="entry-card">
        <div class="entry-header">
          <div class="entry-date">${date}</div>
          <div class="entry-type" style="display: flex; align-items: center; gap: 10px;">
            ${dayTypeInfo.label !== 'Lavoro' ? `<span style="background: ${dayTypeInfo.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${dayTypeInfo.label}</span>` : ''}
            <span>${siteName}</span>
            <span style="font-weight: bold; color: #1976d2;">${formatCurrency(breakdown?.totalEarnings || 0)}</span>
          </div>
        </div>
        
        <div class="entry-content">
          ${this.generateWorkInfoSection(entry, workEntry)}
          ${this.generateWorkHoursSection(entry, workEntry, calculationService, totalWorkHours)}
          ${this.generateTravelSection(entry, workEntry, calculationService, totalTravelHours)}
          ${breakdown ? this.generateHoursBreakdownHTML(breakdown) : ''}
          ${breakdown ? this.generateEarningsHTML(breakdown, earningsComponents) : ''}
        </div>
      </div>
    `;
  }

  static getDayTypeInfo(dayType) {
    const dayTypeLabels = {
      lavorativa: { label: 'Lavoro', color: '#2196F3' },
      ferie: { label: 'Ferie', color: '#43a047' },
      permesso: { label: 'Permesso', color: '#ef6c00' },
      malattia: { label: 'Malattia', color: '#d32f2f' },
      riposo: { label: 'Riposo compensativo', color: '#757575' },
      festivo: { label: 'Festivo', color: '#9c27b0' },
    };
    return dayTypeLabels[dayType] || dayTypeLabels.lavorativa;
  }

  static generateWorkInfoSection(entry, workEntry) {
    if (!entry.site_name && !entry.vehicle_driven && !entry.targa_veicolo && !entry.vehiclePlate) {
      return '';
    }

    let infoHTML = '';
    if (entry.site_name) {
      infoHTML += `<div class="info-item"><span class="info-label">Sito:</span><span class="info-value">${entry.site_name}</span></div>`;
    }
    if (entry.vehicle_driven) {
      const vehicleLabel = entry.vehicle_driven === 'andata_ritorno' ? 'Andata/Ritorno' : entry.vehicle_driven;
      infoHTML += `<div class="info-item"><span class="info-label">Veicolo:</span><span class="info-value">${vehicleLabel}</span></div>`;
    }
    if (entry.targa_veicolo || entry.vehiclePlate) {
      infoHTML += `<div class="info-item"><span class="info-label">Targa Veicolo:</span><span class="info-value">${entry.targa_veicolo || entry.vehiclePlate}</span></div>`;
    }

    return `
      <div class="section">
        <div class="section-title">� Informazioni Lavoro</div>
        <div class="info-grid">
          ${infoHTML}
        </div>
      </div>
    `;
  }

  static generateWorkHoursSection(entry, workEntry, calculationService, totalWorkHours) {
    let hoursHTML = '';
    
    // Turno 1
    if (workEntry.workStart1 && workEntry.workEnd1) {
      const duration1 = this.calculateDuration(workEntry.workStart1, workEntry.workEnd1);
      hoursHTML += `
        <div class="info-item">
          <span class="info-label">Turno 1:</span>
          <span class="info-value">${workEntry.workStart1} - ${workEntry.workEnd1} (${this.formatHours(duration1)})</span>
        </div>
      `;
    }

    // Turno 2
    if (workEntry.workStart2 && workEntry.workEnd2) {
      const duration2 = this.calculateDuration(workEntry.workStart2, workEntry.workEnd2);
      hoursHTML += `
        <div class="info-item">
          <span class="info-label">Turno 2:</span>
          <span class="info-value">${workEntry.workStart2} - ${workEntry.workEnd2} (${this.formatHours(duration2)})</span>
        </div>
      `;
    }

    // Turni aggiuntivi dai viaggi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      let turnoNumber = 3;
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          const duration = this.calculateDuration(viaggio.work_start_1, viaggio.work_end_1);
          hoursHTML += `
            <div class="info-item">
              <span class="info-label">Turno ${turnoNumber++}:</span>
              <span class="info-value">${viaggio.work_start_1} - ${viaggio.work_end_1} (${this.formatHours(duration)})</span>
            </div>
          `;
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          const duration = this.calculateDuration(viaggio.work_start_2, viaggio.work_end_2);
          hoursHTML += `
            <div class="info-item">
              <span class="info-label">Turno ${turnoNumber++}:</span>
              <span class="info-value">${viaggio.work_start_2} - ${viaggio.work_end_2} (${this.formatHours(duration)})</span>
            </div>
          `;
        }
      });
    }

    // Totale ore lavoro
    if (totalWorkHours > 0) {
      hoursHTML += `
        <div class="info-item" style="border-top: 1px solid #e0e0e0; margin-top: 8px; padding-top: 8px;">
          <span class="info-label" style="font-weight: bold;">Totale Ore Lavoro:</span>
          <span class="info-value" style="font-weight: bold; color: #2196F3;">${this.formatHours(totalWorkHours)}</span>
        </div>
      `;
    }

    if (!hoursHTML) return '';

    return `
      <div class="section">
        <div class="section-title">🕒 Orari Turni</div>
        <div class="info-grid">
          ${hoursHTML}
        </div>
      </div>
    `;
  }

  static generateTravelSection(entry, workEntry, calculationService, totalTravelHours) {
    if (!workEntry.departureCompany && !workEntry.departureReturn && 
        (!workEntry.viaggi || !Array.isArray(workEntry.viaggi) || workEntry.viaggi.length === 0)) {
      return '';
    }

    let travelHTML = '';

    // Viaggio andata
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      let andataDuration = '';
      if (calculationService && calculationService.calculateTimeDifference && calculationService.minutesToHours) {
        try {
          const andataMinutes = calculationService.calculateTimeDifference(
            workEntry.departureCompany, 
            workEntry.arrivalSite
          );
          andataDuration = ` (${this.formatHours(calculationService.minutesToHours(andataMinutes))})`;
        } catch (error) {
          console.error('Errore calcolo durata andata:', error);
        }
      }
      travelHTML += `
        <div class="info-item">
          <span class="info-label">Andata:</span>
          <span class="info-value">${workEntry.departureCompany} - ${workEntry.arrivalSite}${andataDuration}</span>
        </div>
      `;
    }

    // Viaggio ritorno
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      let ritornoDuration = '';
      if (calculationService && calculationService.calculateTimeDifference && calculationService.minutesToHours) {
        try {
          const ritornoMinutes = calculationService.calculateTimeDifference(
            workEntry.departureReturn,
            workEntry.arrivalCompany
          );
          ritornoDuration = ` (${this.formatHours(calculationService.minutesToHours(ritornoMinutes))})`;
        } catch (error) {
          console.error('Errore calcolo durata ritorno:', error);
        }
      }
      travelHTML += `
        <div class="info-item">
          <span class="info-label">Ritorno:</span>
          <span class="info-value">${workEntry.departureReturn} - ${workEntry.arrivalCompany}${ritornoDuration}</span>
        </div>
      `;
    }

    // Viaggi aggiuntivi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        // Andata viaggio aggiuntivo
        if (viaggio.departure_company && viaggio.arrival_site) {
          travelHTML += `
            <div class="info-item">
              <span class="info-label">Viaggio ${index + 2} Andata:</span>
              <span class="info-value">${viaggio.departure_company} - ${viaggio.arrival_site}</span>
            </div>
          `;
        }
        // Ritorno viaggio aggiuntivo
        if (viaggio.departure_return && viaggio.arrival_company) {
          travelHTML += `
            <div class="info-item">
              <span class="info-label">Viaggio ${index + 2} Ritorno:</span>
              <span class="info-value">${viaggio.departure_return} - ${viaggio.arrival_company}</span>
            </div>
          `;
        }
      });
    }

    // Totale ore viaggi
    if (totalTravelHours > 0) {
      travelHTML += `
        <div class="info-item" style="border-top: 1px solid #e0e0e0; margin-top: 8px; padding-top: 8px;">
          <span class="info-label" style="font-weight: bold;">Totale Ore Viaggio:</span>
          <span class="info-value" style="font-weight: bold; color: #FF9800;">${this.formatHours(totalTravelHours)}</span>
        </div>
      `;
    }

    if (!travelHTML) return '';

    return `
      <div class="section">
        <div class="section-title">🚗 Viaggi</div>
        <div class="info-grid">
          ${travelHTML}
        </div>
      </div>
    `;
  }

  static calculateDuration(startTime, endTime) {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      let end = new Date(`2000-01-01T${endTime}`);
      
      // Se l'orario di fine è minore dell'orario di inizio, attraversa la mezzanotte
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      return (end - start) / (1000 * 60 * 60); // Durata in ore
    } catch (error) {
      console.error('Errore calcolo durata:', error);
      return 0;
    }
  }

  static generateHoursBreakdownHTML(breakdown) {
    if (!breakdown.ordinary && !breakdown.standby) return '';

    let html = `
      <div class="section">
        <div class="section-title">⏰ Dettaglio Ore</div>
        <div class="hours-breakdown">
    `;

    // Ore ordinarie
    if (breakdown.ordinary?.hours) {
      if (breakdown.ordinary.hours.lavoro_giornaliera > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Lavoro giornaliero:</span>
            <span class="hours-value">${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}</span>
          </div>
        `;
      }
      if (breakdown.ordinary.hours.viaggio_giornaliera > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Viaggio giornaliero:</span>
            <span class="hours-value">${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}</span>
          </div>
        `;
      }
      if (breakdown.ordinary.hours.lavoro_extra > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Lavoro straordinario:</span>
            <span class="hours-value">${formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}</span>
          </div>
        `;
      }
      if (breakdown.ordinary.hours.viaggio_extra > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Viaggio straordinario:</span>
            <span class="hours-value">${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}</span>
          </div>
        `;
      }
    }

    // Ore reperibilità
    if (breakdown.standby?.workHours) {
      const standbyWork = Object.values(breakdown.standby.workHours).reduce((a, b) => a + b, 0);
      if (standbyWork > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Interventi reperibilità:</span>
            <span class="hours-value">${formatSafeHours(standbyWork)}</span>
          </div>
        `;
      }
    }

    if (breakdown.standby?.travelHours) {
      const standbyTravel = Object.values(breakdown.standby.travelHours).reduce((a, b) => a + b, 0);
      if (standbyTravel > 0) {
        html += `
          <div class="hours-row">
            <span class="hours-label">Viaggi reperibilità:</span>
            <span class="hours-value">${formatSafeHours(standbyTravel)}</span>
          </div>
        `;
      }
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  static generateEarningsHTML(breakdown, components) {
    if (!breakdown.totalEarnings && components.length === 0) return '';

    let componentsHTML = '';
    components.forEach(comp => {
      componentsHTML += `
        <div class="earnings-component">
          <div class="component-label">${comp.label}</div>
          <div class="component-value">${formatCurrency(comp.value)}</div>
        </div>
      `;
    });

    return `
      <div class="earnings-summary">
        <div class="earnings-total">
          Totale: ${formatCurrency(breakdown.totalEarnings || 0)}
        </div>
        ${componentsHTML ? `<div class="earnings-breakdown">${componentsHTML}</div>` : ''}
      </div>
    `;
  }

  static generateMonthSummaryHTML(entries, calculationService, settings) {
    console.log('🔍 SimplePDF SUMMARY DEBUG - calculationService:', typeof calculationService);
    
    let totalEarnings = 0;
    let totalHours = 0;
    let workDays = 0;
    let totalAllowances = 0;

    entries.forEach(entry => {
      const workEntry = createWorkEntryFromData(entry);
      try {
        if (calculationService && typeof calculationService.calculateEarningsBreakdown === 'function') {
          const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
          if (breakdown) {
            totalEarnings += breakdown.totalEarnings || 0;
            totalAllowances += (breakdown.allowances?.travel || 0) + 
                             (breakdown.allowances?.meal || 0) + 
                             (breakdown.allowances?.standby || 0);
            
            const dayHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) +
                            (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) +
                            (breakdown.ordinary?.hours?.lavoro_extra || 0) +
                            (breakdown.ordinary?.hours?.viaggio_extra || 0) +
                            Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                            Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
            
            totalHours += dayHours;
            if (dayHours > 0) workDays++;
          }
        } else {
          console.error('❌ SimplePDF SUMMARY DEBUG - calculateEarningsBreakdown non disponibile');
        }
      } catch (error) {
        console.error(`Errore calcolo per ${entry.date}:`, error);
      }
    });

    return `
      <div class="summary-section">
        <div class="summary-title">📊 Riepilogo Mensile</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Giorni Lavorati</div>
            <div class="summary-value">${workDays}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Ore Totali</div>
            <div class="summary-value">${this.formatHours(totalHours)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Indennità</div>
            <div class="summary-value">${formatCurrency(totalAllowances)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Totale Lordo</div>
            <div class="summary-value">${formatCurrency(totalEarnings)}</div>
          </div>
        </div>
      </div>
    `;
  }

  static async generateHTML(entries, calculationService, settings, monthName, year) {
    // Raggruppa le entries per settimana per un layout più compatto
    const tableHTML = await this.generateTableHTML(entries, calculationService, settings, monthName, year);
    const summaryHTML = entries.length > 0 ? 
      this.generateMonthSummaryHTML(entries, calculationService, settings) : '';

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Lavoro - ${monthName} ${year}</title>
        ${this.generateCompactStyles()}
      </head>
      <body>
        <div class="header">
          <h1>📋 Report Lavoro - ${monthName} ${year}</h1>
          <div class="subtitle">Dettaglio mensile in formato tabellare</div>
        </div>

        ${summaryHTML}
        
        <div class="table-container">
          ${tableHTML}
        </div>

        <div class="footer">
          <p>Report generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
          <p>Sistema di tracking ore lavoro - CCNL Metalmeccanico PMI</p>
        </div>
      </body>
      </html>
    `;
  }

  static async generateTableHTML(entries, calculationService, settings, monthName, year) {
    if (entries.length === 0) {
      return '<div class="no-entries">Nessuna registrazione trovata per questo mese</div>';
    }

    // Filtra entries per il mese selezionato
    const monthIndex = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                       'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'].indexOf(monthName);
    
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === monthIndex && entryDate.getFullYear() === year;
    });
    
    console.log(`🔍 Filtrate ${filteredEntries.length} entries per ${monthName} ${year} da ${entries.length} totali`);
    
    if (filteredEntries.length === 0) {
      console.log(`⚠️ Nessuna entry trovata per ${monthName} ${year}`);
      return '<div class="no-entries">Nessuna registrazione trovata per questo mese</div>';
    }

    // Ottieni tutti i giorni di reperibilità dal calendario delle impostazioni
    const standbyDays = this.getStandbyOnlyDays(settings, filteredEntries, monthIndex, year);
    
    // Combina entries esistenti con giorni di sola reperibilità
    const allEntries = [...filteredEntries, ...standbyDays];
    
    // Ordina tutte le entries per data
    const sortedEntries = [...allEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let tableHTML = `
      <table class="work-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Giorno</th>
            <th>Sito</th>
            <th>Orari Lavoro</th>
            <th>Orari Viaggio</th>
            <th>Ore Tot.</th>
            <th>Ordinario</th>
            <th>Trasferta</th>
            <th>Pasti</th>
            <th>Reperibilità</th>
            <th>Totale €</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const entry of sortedEntries) {
      const workEntry = createWorkEntryFromData(entry, calculationService);
      let breakdown = null;
      
      console.log(`🔍 SimplePDF DEBUG - Processing entry ${entry.date}:`, {
        date: entry.date,
        siteName: entry.site_name,
        totalEarnings: entry.totalEarnings
      });
      
      try {
        if (calculationService && typeof calculationService.calculateEarningsBreakdown === 'function') {
          breakdown = await calculationService.calculateEarningsBreakdown(workEntry, settings);
          console.log(`✅ SimplePDF TABLE DEBUG - Breakdown per ${entry.date}:`, {
            totalEarnings: breakdown?.totalEarnings || 0,
            allowances: breakdown?.allowances || {},
            ordinary: breakdown?.ordinary || {}
          });
        } else {
          console.error('❌ SimplePDF TABLE DEBUG - calculateEarningsBreakdown non disponibile');
        }
      } catch (error) {
        console.error(`Errore calcolo breakdown per ${entry.date}:`, error);
      }

      const date = new Date(entry.date);
      const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      
      // Gestione speciale per giorni di sola reperibilità
      if (entry.isStandbyOnly) {
        let standbyAllowance = 0;
        if (breakdown?.allowances?.standby) {
          standbyAllowance = breakdown.allowances.standby;
        } else if (settings?.standbySettings?.dailyAllowance) {
          // Fallback per calcolo manuale indennità reperibilità
          standbyAllowance = settings.standbySettings.dailyAllowance;
        }

        const dayTypeInfo = { label: 'Reperibilità', color: '#9C27B0' };
        
        tableHTML += `
          <tr class="standby-only-day">
            <td class="date-cell">${dateStr}</td>
            <td class="day-cell">
              ${dayName}
              <br><span class="day-type" style="background: ${dayTypeInfo.color}">${dayTypeInfo.label}</span>
            </td>
            <td class="site-cell">Reperibilità</td>
            <td class="schedule-cell">-</td>
            <td class="travel-cell">-</td>
            <td class="hours-cell">0:00</td>
            <td class="earnings-cell">€0,00</td>
            <td class="travel-allowance-cell">€0,00</td>
            <td class="meal-allowance-cell">€0,00</td>
            <td class="standby-allowance-cell">${formatCurrency(standbyAllowance)}</td>
            <td class="total-cell">${formatCurrency(standbyAllowance)}</td>
          </tr>
        `;
        return; // Skip normale processing per giorni standby-only
      }

      // Calcolo orari e ore per giorni normali
      const workSchedule = this.formatWorkSchedule(workEntry);
      const travelSchedule = this.formatTravelSchedule(workEntry);
      
      let totalHours = 0;
      let totalWorkHours = 0;
      let totalTravelHours = 0;
      
      if (calculationService) {
        if (calculationService.calculateWorkHours) {
          totalWorkHours = calculationService.calculateWorkHours(workEntry) || 0;
        }
        if (calculationService.calculateTravelHours) {
          totalTravelHours = calculationService.calculateTravelHours(workEntry) || 0;
        }
        totalHours = totalWorkHours + totalTravelHours;
      }

      // Calcolo guadagni - SISTEMATO per usare il breakdown corretto
      let ordinaryEarnings = 0;
      let travelAllowance = 0;
      let mealAllowance = 0;
      let standbyAllowance = 0;
      let totalEarnings = 0;

  if (breakdown) {
        // Guadagni ordinari + straordinari + reperibilità
        ordinaryEarnings = (breakdown.ordinary?.total || 0) + (breakdown.standby?.totalEarnings || 0);
        
        // Debug per capire la struttura
        console.log(`🔧 SimplePDF DEBUG ${entry.date} - Raw breakdown:`, JSON.stringify(breakdown, null, 2));
        console.log(`🔧 SimplePDF DEBUG ${entry.date} - Allowances structure:`, breakdown.allowances);
        
        // Indennità separate - con fallback per strutture diverse
        if (breakdown.allowances) {
          // Verifica se è la struttura normale
          if (typeof breakdown.allowances.travel !== 'undefined') {
            travelAllowance = breakdown.allowances.travel || 0;
            mealAllowance = breakdown.allowances.meal || 0;
            standbyAllowance = breakdown.allowances.standby || 0;
          } else if (breakdown.allowances._j) {
            // Struttura alternativa con _j
            travelAllowance = breakdown.allowances._j.travel || 0;
            mealAllowance = breakdown.allowances._j.meal || 0;
            standbyAllowance = breakdown.allowances._j.standby || 0;
          }
        }
        
  // Totale finale (già calcolato con la preferenza dentro CalculationService)
  totalEarnings = breakdown.totalEarnings || 0;
        
        console.log(`� SimplePDF ENTRY ${entry.date} - ALLOWANCES DEBUG:`, {
          travelAllowance,
          mealAllowance,
          standbyAllowance,
          ordinaryEarnings,
          totalEarnings
        });
      } else {
        // Fallback se non c'è breakdown: rispetta la preferenza su giorni speciali senza ore
        totalEarnings = entry.totalEarnings || 0;
        const workHours = calculationService?.calculateWorkHours?.(workEntry) || 0;
        const travelHours = calculationService?.calculateTravelHours?.(workEntry) || 0;
        const isSpecialDayType = ['ferie','malattia','permesso','riposo','festivo'].includes(String(entry.day_type || '').toLowerCase());
        const showEffective = (settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false);
        if (isSpecialDayType && (workHours + travelHours) === 0 && !showEffective) {
          totalEarnings = 0;
        }
        console.log(`⚠️ SimplePDF FALLBACK ${entry.date} - No breakdown, using entry.totalEarnings (after pref):`, totalEarnings);
      }

      // Tipo giornata
      const dayTypeInfo = this.getDayTypeInfo(entry.day_type);
      const dayTypeClass = entry.day_type !== 'lavorativa' ? 'special-day' : '';

      tableHTML += `
        <tr class="${dayTypeClass}">
          <td class="date-cell">${dateStr}</td>
          <td class="day-cell">
            ${dayName}
            ${dayTypeInfo.label !== 'Lavoro' ? `<br><span class="day-type" style="background: ${dayTypeInfo.color}">${dayTypeInfo.label}</span>` : ''}
          </td>
          <td class="site-cell">${entry.site_name || '-'}</td>
          <td class="schedule-cell">${workSchedule}</td>
          <td class="travel-cell">${travelSchedule}</td>
          <td class="hours-cell">${this.formatHours(totalHours)}</td>
          <td class="earnings-cell">${formatCurrency(ordinaryEarnings)}</td>
          <td class="travel-allowance-cell">${formatCurrency(travelAllowance)}</td>
          <td class="meal-allowance-cell">${formatCurrency(mealAllowance)}</td>
          <td class="standby-allowance-cell">${formatCurrency(standbyAllowance)}</td>
          <td class="total-cell">${formatCurrency(totalEarnings)}</td>
        </tr>
      `;
    }

    tableHTML += `
        </tbody>
      </table>
    `;

    return tableHTML;
  }

  static formatWorkSchedule(workEntry) {
    const schedules = [];
    
    if (workEntry.workStart1 && workEntry.workEnd1) {
      schedules.push(`${workEntry.workStart1}-${workEntry.workEnd1}`);
    }
    
    if (workEntry.workStart2 && workEntry.workEnd2) {
      schedules.push(`${workEntry.workStart2}-${workEntry.workEnd2}`);
    }

    // Turni aggiuntivi dai viaggi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          schedules.push(`${viaggio.work_start_1}-${viaggio.work_end_1}`);
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          schedules.push(`${viaggio.work_start_2}-${viaggio.work_end_2}`);
        }
      });
    }

    return schedules.length > 0 ? schedules.join(', ') : '-';
  }

  static formatTravelSchedule(workEntry) {
    const travels = [];
    
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      travels.push(`A: ${workEntry.departureCompany}-${workEntry.arrivalSite}`);
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      travels.push(`R: ${workEntry.departureReturn}-${workEntry.arrivalCompany}`);
    }

    // Viaggi aggiuntivi
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.departure_company && viaggio.arrival_site) {
          travels.push(`A${index + 2}: ${viaggio.departure_company}-${viaggio.arrival_site}`);
        }
        if (viaggio.departure_return && viaggio.arrival_company) {
          travels.push(`R${index + 2}: ${viaggio.departure_return}-${viaggio.arrival_company}`);
        }
      });
    }

    return travels.length > 0 ? travels.join(', ') : '-';
  }

  static generateCompactStyles() {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #333;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          padding: 10px;
          border-bottom: 2px solid #1976d2;
        }
        
        .header h1 {
          font-size: 18px;
          color: #1976d2;
          margin-bottom: 3px;
        }
        
        .subtitle {
          font-size: 12px;
          color: #666;
        }
        
        .table-container {
          margin: 10px 0;
        }
        
        .work-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 15px;
        }
        
        .work-table th,
        .work-table td {
          border: 1px solid #ddd;
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
        }
        
        .work-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          font-size: 11px;
          text-align: center;
          white-space: nowrap;
        }
        
        .date-cell {
          width: 8%;
          font-weight: bold;
          text-align: center;
        }
        
        .day-cell {
          width: 10%;
          text-align: center;
        }
        
        .site-cell {
          width: 12%;
          max-width: 80px;
          word-wrap: break-word;
        }
        
        .schedule-cell,
        .travel-cell {
          width: 18%;
          font-size: 9px;
          line-height: 1.2;
        }
        
        .hours-cell {
          width: 8%;
          text-align: center;
          font-weight: bold;
        }
        
        .earnings-cell,
        .travel-allowance-cell,
        .meal-allowance-cell,
        .standby-allowance-cell,
        .total-cell {
          width: 9%;
          text-align: right;
          font-weight: bold;
        }
        
        .total-cell {
          background-color: #f0f8ff;
          color: #1976d2;
        }
        
        .special-day {
          background-color: #fff3cd;
        }
        
        .standby-only-day {
          background-color: #e8f5e8;
          font-style: italic;
        }
        
        .day-type {
          font-size: 8px;
          color: white;
          padding: 1px 4px;
          border-radius: 8px;
          display: inline-block;
          margin-top: 2px;
        }
        
        .summary-section {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 12px;
          margin: 15px 0;
        }
        
        .summary-title {
          font-size: 14px;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        
        .summary-item {
          text-align: center;
          padding: 6px;
          background: white;
          border-radius: 4px;
        }
        
        .summary-label {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }
        
        .summary-value {
          font-size: 13px;
          font-weight: bold;
          color: #1976d2;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          border-top: 1px solid #ddd;
          font-size: 9px;
          color: #666;
        }
        
        .no-entries {
          text-align: center;
          padding: 30px;
          color: #666;
          font-style: italic;
        }
        
        @media print {
          body { margin: 0; }
          .work-table { font-size: 9px; }
          .work-table th, .work-table td { padding: 2px 4px; }
        }
      </style>
    `;
  }

  static async generateAndExportPDF(entries, month, year, settings, calculationService) {
    try {
      const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                         'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
      const monthName = monthNames[month - 1];
      
      console.log('🔄 Generazione PDF semplificato per:', monthName, year);
      console.log('🔄 Entries da processare:', entries.length);

      const html = await this.generateHTML(entries, calculationService, settings, monthName, year);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        height: 842, // A4 height
        width: 595,  // A4 width
      });

      const fileName = `report_lavoro_${monthName}_${year}.pdf`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Condividi ${fileName}`,
          UTI: 'com.adobe.pdf'
        });
      }

      console.log('✅ PDF semplificato generato ed esportato:', fileName);
      return { success: true, uri, fileName };
      
    } catch (error) {
      console.error('❌ Errore generazione PDF semplificato:', error);
      return { success: false, error: error.message };
    }
  }

  static formatHours(hours) {
    if (!hours && hours !== 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  static getStandbyOnlyDays(settings, existingEntries, monthIndex, year) {
    const standbyOnlyDays = [];
    
    if (!settings?.standbySettings?.enabled || !settings.standbySettings.standbyDays) {
      return standbyOnlyDays;
    }

    const standbyDays = settings.standbySettings.standbyDays;
    const existingDates = new Set(existingEntries.map(entry => entry.date));

    // Itera su tutti i giorni di reperibilità configurati
    Object.keys(standbyDays).forEach(dateStr => {
      if (standbyDays[dateStr]?.selected === true && !existingDates.has(dateStr)) {
        // Controlla se il giorno appartiene al mese/anno selezionato
        const standbyDate = new Date(dateStr);
        if (standbyDate.getMonth() === monthIndex && standbyDate.getFullYear() === year) {
          // Crea un entry fittizio per il giorno di sola reperibilità
          standbyOnlyDays.push({
            id: `standby_${dateStr}`,
            date: dateStr,
            day_type: 'lavorativa',
            site_name: 'Reperibilità',
            work_start_time: null,
            work_end_time: null,
            work_start_time_2: null,
            work_end_time_2: null,
            departure_company: null,
            arrival_site: null,
            departure_return: null,
            arrival_company: null,
            isStandbyDay: true,
            isStandbyOnly: true, // Flag per identificare giorni di sola reperibilità
            totalEarnings: 0,
            viaggi: []
          });
        }
      }
    });

    console.log(`📋 SimplePDF DEBUG - Trovati ${standbyOnlyDays.length} giorni di sola reperibilità`);
    return standbyOnlyDays;
  }
}

export default SimplePDFService;
