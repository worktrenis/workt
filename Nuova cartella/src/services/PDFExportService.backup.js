import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils';
import { CCNL_CONTRACTS } from '../constants';

class PDFExportService {
  constructor() {
    this.contractInfo = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  }

  // Formatta le ore in formato H:MM
  formatHours(hours) {
    if (!hours) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }

  // Formatta la data in italiano
  formatDate(date) {
    return new Date(date).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Genera CSS per il PDF
  generatePDFStyles() {
    return `
      <style>
        @page {
          margin: 20px;
        }
        
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          width: 572px; /* A4 width minus margins */
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 20px;
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
        
        .header .date-range {
          color: #2196F3;
          font-weight: bold;
          font-size: 16px;
        }
        
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }
        
        .info-box {
          flex: 1;
          margin: 0 10px;
        }
        
        .info-box h3 {
          margin: 0 0 10px 0;
          color: #2196F3;
          font-size: 14px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 5px;
        }
        
        .info-item {
          margin: 5px 0;
          font-size: 11px;
        }
        
        .info-label {
          font-weight: bold;
          color: #555;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .summary-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card .icon {
          font-size: 20px;
          margin-bottom: 8px;
          display: block;
        }
        
        .summary-card .value {
          font-size: 18px;
          font-weight: bold;
          color: #2196F3;
          margin: 5px 0;
        }
        
        .summary-card .label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .work-entries-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .work-entries-table th {
          background: #2196F3;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
          font-size: 11px;
        }
        
        .work-entries-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 10px;
        }
        
        .work-entries-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .work-entries-table tr:hover {
          background: #e3f2fd;
        }
        
        .earnings-breakdown {
          background: #e8f5e9;
          border: 1px solid #4caf50;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .earnings-breakdown h3 {
          color: #2e7d32;
          margin: 0 0 15px 0;
          font-size: 16px;
        }
        
        .earnings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        
        .earning-item {
          background: white;
          padding: 10px;
          border-radius: 6px;
          border-left: 4px solid #4caf50;
        }
        
        .earning-item .amount {
          font-size: 14px;
          font-weight: bold;
          color: #2e7d32;
        }
        
        .earning-item .description {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 10px;
        }
        
        .total-row {
          background: #e3f2fd !important;
          font-weight: bold;
          border-top: 2px solid #2196F3 !important;
        }
        
        .total-row td {
          color: #1976d2;
          font-weight: bold;
        }
        
        .type-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .type-regular { background: #e8f5e9; color: #2e7d32; }
        .type-overtime { background: #f3e5f5; color: #7b1fa2; }
        .type-travel { background: #fff3e0; color: #ef6c00; }
        .type-standby { background: #e0f2f1; color: #00695c; }
        .type-vacation { background: #e3f2fd; color: #1976d2; }
        
        .detailed-breakdown {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .detailed-breakdown h3 {
          color: #1976d2;
          margin: 0 0 15px 0;
          font-size: 16px;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 8px;
        }
        
        .breakdown-section {
          margin-bottom: 15px;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #2196F3;
        }
        
        .breakdown-title {
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 8px;
          font-size: 12px;
        }
        
        .breakdown-item {
          margin: 5px 0;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
        }
        
        .breakdown-label {
          color: #555;
        }
        
        .breakdown-value {
          font-weight: bold;
          color: #2e7d32;
        }
        
        @media print {
          body { margin: 0; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
          .earnings-grid { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    `;
  }

  // Genera il contenuto HTML per il PDF
  generateMonthlyReportHTML(workEntries, summaryData, reportMonth, reportYear) {
    const monthName = new Date(reportYear, reportMonth - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const generationDate = new Date().toLocaleDateString('it-IT');
    
    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Ore Lavoro - ${monthName}</title>
        ${this.generatePDFStyles()}
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <h1>📊 Report Ore di Lavoro</h1>
          <div class="subtitle">CCNL Metalmeccanico PMI - Livello 5</div>
          <div class="date-range">${monthName}</div>
          <div style="font-size: 11px; color: #666; margin-top: 10px;">
            Generato il ${generationDate}
          </div>
        </div>

        <!-- Informazioni contratto e dipendente -->
        <div class="info-section">
          <div class="info-box">
            <h3>💼 Informazioni Contratto</h3>
            <div class="info-item">
              <span class="info-label">Contratto:</span> ${this.contractInfo.name}
            </div>
            <div class="info-item">
              <span class="info-label">Livello:</span> ${this.contractInfo.code}
            </div>
            <div class="info-item">
              <span class="info-label">Qualifica:</span> ${this.contractInfo.contractDetails.qualification}
            </div>
            <div class="info-item">
              <span class="info-label">Esperienza:</span> ${this.contractInfo.contractDetails.experienceLevel}
            </div>
          </div>
          
          <div class="info-box">
            <h3>💰 Tariffe Orarie</h3>
            <div class="info-item">
              <span class="info-label">Base:</span> €${this.contractInfo.hourlyRate.toFixed(2)}
            </div>
            <div class="info-item">
              <span class="info-label">Straord. Diurno:</span> €${(this.contractInfo.hourlyRate * this.contractInfo.overtimeRates.day).toFixed(2)} (+20%)
            </div>
            <div class="info-item">
              <span class="info-label">Straord. Serale:</span> €${(this.contractInfo.hourlyRate * this.contractInfo.overtimeRates.nightUntil22).toFixed(2)} (+25%)
            </div>
            <div class="info-item">
              <span class="info-label">Straord. Notturno:</span> €${(this.contractInfo.hourlyRate * this.contractInfo.overtimeRates.nightAfter22).toFixed(2)} (+35%)
            </div>
          </div>
          
          <div class="info-box">
            <h3>📈 Progressione Carriera</h3>
            <div class="info-item">
              <span class="info-label">Livello Precedente:</span> 3 - Operaio Comune
            </div>
            <div class="info-item">
              <span class="info-label">Livello Attuale:</span> 5 - Operaio Qualificato
            </div>
            <div class="info-item">
              <span class="info-label">Prossimo Obiettivo:</span> 6 - Tecnico Specializzato
            </div>
            <div class="info-item">
              <span class="info-label">Avanzamento:</span> +2 Livelli 🎉
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="icon">⏰</div>
            <div class="value">${this.formatHours(summaryData.totalHours || 0)}</div>
            <div class="label">Ore Totali</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">🏗️</div>
            <div class="value">${this.formatHours(summaryData.workHours || 0)}</div>
            <div class="label">Ore Lavoro</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">🚗</div>
            <div class="value">${this.formatHours(summaryData.travelHours || 0)}</div>
            <div class="label">Ore Viaggio</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">⚡</div>
            <div class="value">${this.formatHours(summaryData.overtimeHours || 0)}</div>
            <div class="label">Straordinari</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">�</div>
            <div class="value">${summaryData.standbyDays || 0}</div>
            <div class="label">Giorni Reperibilità</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">💰</div>
            <div class="value">${formatCurrency(summaryData.totalEarnings || 0)}</div>
            <div class="label">Totale Lordo</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">🧾</div>
            <div class="value">${formatCurrency(summaryData.netTotalEarnings || 0)}</div>
            <div class="label">Stima Netto</div>
          </div>
          
          <div class="summary-card">
            <div class="icon">📅</div>
            <div class="value">${(summaryData.regularDays || 0) + (summaryData.weekendHolidayDays || 0)}</div>
            <div class="label">Giorni Lavorati</div>
          </div>
        </div>

        <!-- Breakdown Guadagni -->
        <div class="earnings-breakdown">
          <h3>💵 Breakdown Guadagni</h3>
          <div class="earnings-grid">
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.regularPay || 0)}</div>
              <div class="description">Ore Ordinarie (${this.formatHours(summaryData.workHours || 0)})</div>
            </div>
            
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.overtimePay || 0)}</div>
              <div class="description">Straordinari (${this.formatHours(summaryData.overtimeHours || 0)})</div>
            </div>
            
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.travelPay || 0)}</div>
              <div class="description">Viaggi (${this.formatHours(summaryData.travelHours || 0)})</div>
            </div>
            
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.standbyPay || 0)}</div>
              <div class="description">Reperibilità (${summaryData.standbyDays || 0} giorni)</div>
            </div>
            
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.allowances || 0)}</div>
              <div class="description">Indennità e Rimborsi</div>
            </div>
            
            <div class="earning-item">
              <div class="amount">${formatCurrency(summaryData.totalEarnings || 0)}</div>
              <div class="description"><strong>TOTALE LORDO</strong></div>
            </div>
          </div>
        </div>

        <!-- Breakdown Dettagliato -->
        <div class="detailed-breakdown">
          <h3>📊 Analisi Dettagliata Mensile</h3>
          
          <div class="breakdown-section">
            <div class="breakdown-title">⏰ Distribuzione Ore</div>
            <div class="breakdown-item">
              <span class="breakdown-label">Ore di lavoro effettive:</span>
              <span class="breakdown-value">${this.formatHours(summaryData.workHours || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Ore di viaggio:</span>
              <span class="breakdown-value">${this.formatHours(summaryData.travelHours || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Ore di reperibilità (lavoro):</span>
              <span class="breakdown-value">${this.formatHours(summaryData.standbyWorkHours || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Ore di reperibilità (viaggio):</span>
              <span class="breakdown-value">${this.formatHours(summaryData.standbyTravelHours || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">TOTALE ORE MENSILI:</span>
              <span class="breakdown-value">${this.formatHours(summaryData.totalHours || 0)}</span>
            </div>
          </div>
          
          <div class="breakdown-section">
            <div class="breakdown-title">💰 Composizione Retribuzione</div>
            <div class="breakdown-item">
              <span class="breakdown-label">Retribuzione ordinaria:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.regularPay || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Maggiorazioni straordinari:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.overtimePay || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Compensi viaggio:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.travelPay || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Compensi reperibilità:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.standbyPay || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Indennità trasferta:</span>
              <span class="breakdown-value">${formatCurrency((summaryData.allowances || 0) - (summaryData.mealAllowances || 0))}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Rimborsi pasti:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.mealAllowances || 0)}</span>
            </div>
          </div>
          
          <div class="breakdown-section">
            <div class="breakdown-title">📅 Statistiche Giornaliere</div>
            <div class="breakdown-item">
              <span class="breakdown-label">Giorni lavorativi normali:</span>
              <span class="breakdown-value">${summaryData.regularDays || 0}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Weekend/festivi lavorati:</span>
              <span class="breakdown-value">${summaryData.weekendHolidayDays || 0}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Giorni con reperibilità:</span>
              <span class="breakdown-value">${summaryData.standbyDays || 0}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Giorni con trasferta:</span>
              <span class="breakdown-value">${summaryData.travelAllowanceDays || 0}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Pasti rimborsati:</span>
              <span class="breakdown-value">${(summaryData.lunchCount || 0) + (summaryData.dinnerCount || 0)} (${summaryData.lunchCount || 0} pranzi + ${summaryData.dinnerCount || 0} cene)</span>
            </div>
          </div>
          
          ${summaryData.netCalculations ? `
          <div class="breakdown-section">
            <div class="breakdown-title">🧾 Calcolo Retribuzione Netta</div>
            <div class="breakdown-item">
              <span class="breakdown-label">Lordo mensile:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.grossTotalEarnings || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Contributi INPS (${(summaryData.netCalculations.chosen.effectiveRate * 100).toFixed(1)}%):</span>
              <span class="breakdown-value">-${formatCurrency(summaryData.totalDeductions || 0)}</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">NETTO STIMATO:</span>
              <span class="breakdown-value">${formatCurrency(summaryData.netTotalEarnings || 0)}</span>
            </div>
            <div style="font-size: 10px; color: #666; margin-top: 8px;">
              * Calcolo indicativo basato su aliquote ${summaryData.netCalculations.chosen.method}. 
              Per importi precisi consultare busta paga ufficiale.
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Tabella dettagliata ore -->
        <table class="work-entries-table">
          <thead>
            <tr>
              <th style="width: 60px;">Data</th>
              <th style="width: 80px;">Tipo Giornata</th>
              <th style="width: 120px;">Orari Lavoro/Viaggio</th>
              <th style="width: 50px;">Ore Tot.</th>
              <th style="width: 50px;">Lavoro</th>
              <th style="width: 50px;">Viaggio</th>
              <th style="width: 50px;">Ordinarie</th>
              <th style="width: 50px;">Straord.</th>
              <th style="width: 50px;">Reperibilità</th>
              <th style="width: 80px;">Indennità</th>
              <th style="width: 70px;">Guadagno</th>
            </tr>
          </thead>
          <tbody>
            ${this.generateWorkEntriesRows(workEntries)}
            <tr class="total-row">
              <td colspan="3"><strong>TOTALE MESE</strong></td>
              <td><strong>${this.formatHours(summaryData.totalHours || 0)}</strong></td>
              <td><strong>${this.formatHours(summaryData.workHours || 0)}</strong></td>
              <td><strong>${this.formatHours(summaryData.travelHours || 0)}</strong></td>
              <td><strong>${this.formatHours(summaryData.regularHours || 0)}</strong></td>
              <td><strong>${this.formatHours(summaryData.overtimeHours || 0)}</strong></td>
              <td><strong>${this.formatHours(summaryData.standbyWorkHours + summaryData.standbyTravelHours || 0)}</strong></td>
              <td><strong>${formatCurrency(summaryData.allowances || 0)}</strong></td>
              <td><strong>${formatCurrency(summaryData.totalEarnings || 0)}</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div>📱 WorkTracker - App per il tracciamento ore di lavoro</div>
          <div>Generato automaticamente il ${generationDate}</div>
          <div style="margin-top: 10px; font-size: 9px;">
            I calcoli sono basati sul CCNL Metalmeccanico PMI - Le informazioni potrebbero richiedere verifica con busta paga ufficiale
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  // Genera le righe della tabella ore dettagliate come nel TimeEntryForm
  generateWorkEntriesRows(workEntries) {
    console.log('🔍 PDF Debug - generateWorkEntriesRows called with:', workEntries?.length, 'entries');
    
    if (!workEntries || workEntries.length === 0) {
      console.log('⚠️ PDF Debug - No work entries found');
      return '<tr><td colspan="11" style="text-align: center; color: #666;">Nessuna registrazione trovata per questo periodo</td></tr>';
    }

    return workEntries.map((entry, index) => {
      console.log(`🔍 PDF Debug - Processing entry ${index}:`, {
        date: entry.date,
        workHours: entry.workHours,
        travelHours: entry.travelHours,
        totalEarnings: entry.totalEarnings,
        earnings: entry.earnings,
        dayType: entry.dayType
      });
      
      try {
      // Determina il tipo di giornata
      let dayTypeInfo = '';
      if (entry.isStandbyDay && entry.workHours === 0) {
        dayTypeInfo = '<span class="type-badge type-standby">Solo Reperibilità</span>';
      } else if (entry.isStandbyDay && entry.workHours > 0) {
        dayTypeInfo = '<span class="type-badge type-standby">Lavoro + Reperibilità</span>';
      } else if (entry.dayType === 'festivo' || entry.dayType === 'ferie') {
        dayTypeInfo = `<span class="type-badge type-vacation">${entry.dayType.charAt(0).toUpperCase() + entry.dayType.slice(1)}</span>`;
      } else if (entry.workHours > 8) {
        dayTypeInfo = '<span class="type-badge type-overtime">Con Straordinari</span>';
      } else {
        dayTypeInfo = '<span class="type-badge type-regular">Standard</span>';
      }

      // Calcola dettagli ore
      const workHours = entry.workHours || 0;
      const travelHours = entry.travelHours || 0;
      const standbyWorkHours = entry.standbyWorkHours || 0;
      const standbyTravelHours = entry.standbyTravelHours || 0;
      const totalDailyHours = workHours + travelHours + standbyWorkHours + standbyTravelHours;

      // Determina ore ordinarie vs straordinarie
      const regularHours = Math.min(workHours + travelHours, 8);
      const overtimeHours = Math.max(0, (workHours + travelHours) - 8);

      // Formatta gli orari di lavoro principali
      const workSchedule = this.formatWorkSchedule(entry);
      
      return `
        <tr>
          <td style="font-weight: bold;">${this.formatDateShort(entry.date)}</td>
          <td>${dayTypeInfo}</td>
          <td style="font-size: 10px;">${workSchedule}</td>
          <td style="text-align: center; font-weight: bold;">${this.formatHours(totalDailyHours)}</td>
          <td style="text-align: center; color: #2196F3;">${this.formatHours(workHours)}</td>
          <td style="text-align: center; color: #FF9800;">${this.formatHours(travelHours)}</td>
          <td style="text-align: center; color: #4CAF50;">${this.formatHours(regularHours)}</td>
          <td style="text-align: center; color: #F44336;">${this.formatHours(overtimeHours)}</td>
          <td style="text-align: center; color: #9C27B0;">${this.formatHours(standbyWorkHours + standbyTravelHours)}</td>
          <td style="font-size: 10px;">${this.formatAllowances(entry)}</td>
          <td style="text-align: right; font-weight: bold; color: #2E7D32;">${formatCurrency(entry.totalEarnings || entry.earnings || 0)}</td>
        </tr>
      `;
      } catch (error) {
        console.error(`❌ PDF Debug - Error processing entry ${index}:`, error);
        return `<tr><td colspan="11" style="text-align: center; color: #f44336;">Errore entry ${entry.date}</td></tr>`;
      }
    }).join('');
  }

  // Formatta gli orari di lavoro in modo compatto
  formatWorkSchedule(entry) {
    const schedules = [];
    
    if (entry.workStart1 && entry.workEnd1) {
      schedules.push(`${entry.workStart1}-${entry.workEnd1}`);
    }
    
    if (entry.workStart2 && entry.workEnd2) {
      schedules.push(`${entry.workStart2}-${entry.workEnd2}`);
    }

    if (entry.departureCompany && entry.arrivalSite) {
      schedules.push(`🚗 ${entry.departureCompany}-${entry.arrivalSite}`);
    }

    if (entry.departureReturn && entry.arrivalCompany) {
      schedules.push(`🏠 ${entry.departureReturn}-${entry.arrivalCompany}`);
    }

    return schedules.length > 0 ? schedules.join('<br>') : '-';
  }

  // Formatta le indennità e rimborsi
  formatAllowances(entry) {
    const allowances = [];
    
    if (entry.standbyAllowance > 0) {
      allowances.push(`💰 Rep: ${formatCurrency(entry.standbyAllowance)}`);
    }
    
    if (entry.travelAllowance > 0) {
      allowances.push(`🛣️ Trasf: ${formatCurrency(entry.travelAllowance)}`);
    }
    
    if (entry.mealVoucherAmount > 0) {
      allowances.push(`🍽️ Buoni: ${formatCurrency(entry.mealVoucherAmount)}`);
    }
    
    if (entry.mealCashAmount > 0) {
      allowances.push(`💵 Pasti: ${formatCurrency(entry.mealCashAmount)}`);
    }
    
    return allowances.length > 0 ? allowances.join('<br>') : '-';
  }

  // Formatta data breve
  formatDateShort(date) {
    const d = new Date(date);
    const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' });
    const dayNum = d.getDate();
    return `${dayName}<br>${dayNum}`;
  }

  // Converte il tipo di lavoro in nome leggibile
  getWorkTypeDisplayName(type) {
    const types = {
      regular: 'Standard',
      overtime: 'Straordinario',
      travel: 'Viaggio',
      standby: 'Reperibilità',
      vacation: 'Ferie',
      sick: 'Malattia'
    };
    return types[type] || 'Standard';
  }

  // Genera PDF del report mensile
  async generateMonthlyPDF(workEntries, summaryData, reportMonth, reportYear) {
    try {
      console.log('📄 Generazione PDF report mensile...');
      console.log('🔍 PDF Debug - workEntries:', workEntries?.length, 'entries');
      console.log('🔍 PDF Debug - summaryData:', summaryData);
      
      const html = this.generateMonthlyReportHTML(workEntries, summaryData, reportMonth, reportYear);
      console.log('✅ PDF Debug - HTML generato, lunghezza:', html.length);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      console.log('✅ PDF generato:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Errore generazione PDF:', error);
      throw error;
    }
  }

  // Condivide il PDF generato
  async sharePDF(uri, filename) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Condividi Report Ore di Lavoro',
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ PDF condiviso con successo');
        return true;
      } else {
        console.log('❌ Condivisione non disponibile su questo dispositivo');
        return false;
      }
    } catch (error) {
      console.error('❌ Errore condivisione PDF:', error);
      throw error;
    }
  }

  // Funzione principale per esportare report
  async exportMonthlyReport(workEntries, summaryData, reportMonth, reportYear) {
    try {
      const monthName = new Date(reportYear, reportMonth - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      const filename = `Report_Ore_${monthName.replace(' ', '_')}.pdf`;
      
      console.log(`📊 Esportazione report: ${filename}`);
      
      // Genera il PDF
      const pdfUri = await this.generateMonthlyPDF(workEntries, summaryData, reportMonth, reportYear);
      
      // Condivide il PDF
      const shared = await this.sharePDF(pdfUri, filename);
      
      return {
        success: true,
        uri: pdfUri,
        filename,
        shared
      };
    } catch (error) {
      console.error('❌ Errore esportazione report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new PDFExportService();
