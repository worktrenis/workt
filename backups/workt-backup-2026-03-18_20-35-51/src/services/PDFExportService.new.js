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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  // Formatta il giorno della settimana
  formatDayOfWeek(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days[new Date(date).getDay()];
  }

  // Genera CSS ottimizzato per la stampa
  generatePDFStyles() {
    return `
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.3;
          color: #333;
          margin: 0;
          padding: 0;
          font-size: 10px;
          background: white;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 15px;
        }
        
        .header h1 {
          color: #2196F3;
          margin: 0;
          font-size: 20px;
          font-weight: bold;
        }
        
        .header .subtitle {
          color: #666;
          margin: 5px 0;
          font-size: 12px;
        }
        
        .header .date-range {
          color: #2196F3;
          font-weight: bold;
          font-size: 14px;
        }
        
        .contract-info {
          background: #f0f8ff;
          border: 1px solid #2196F3;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 15px;
          font-size: 9px;
        }
        
        .contract-info h3 {
          margin: 0 0 8px 0;
          color: #2196F3;
          font-size: 11px;
        }
        
        .contract-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        
        .contract-item {
          text-align: center;
        }
        
        .contract-label {
          font-weight: bold;
          color: #666;
        }
        
        .contract-value {
          color: #2196F3;
          font-weight: bold;
        }
        
        .summary-section {
          margin-bottom: 20px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 15px;
        }
        
        .summary-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          font-size: 9px;
        }
        
        .summary-card .value {
          font-size: 12px;
          font-weight: bold;
          color: #2196F3;
          margin: 2px 0;
        }
        
        .summary-card .label {
          font-size: 8px;
          color: #666;
          text-transform: uppercase;
        }
        
        .earnings-card {
          background: #e8f5e9;
          border: 1px solid #4caf50;
        }
        
        .earnings-card .value {
          color: #2e7d32;
        }
        
        .work-entries-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          background: #2196F3;
          color: white;
          padding: 8px 12px;
          margin: 0 0 10px 0;
          font-size: 12px;
          font-weight: bold;
          border-radius: 4px;
        }
        
        .work-entries-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
          margin-bottom: 15px;
        }
        
        .work-entries-table th {
          background: #f5f5f5;
          color: #333;
          padding: 6px 3px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 7px;
        }
        
        .work-entries-table td {
          padding: 4px 3px;
          border: 1px solid #ddd;
          text-align: center;
          font-size: 7px;
        }
        
        .work-entries-table tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .date-col { width: 10%; }
        .site-col { width: 12%; }
        .hours-col { width: 8%; }
        .travel-col { width: 8%; }
        .standby-col { width: 8%; }
        .meal-col { width: 8%; }
        .allowance-col { width: 8%; }
        .overtime-col { width: 8%; }
        .earnings-col { width: 10%; }
        .notes-col { width: 20%; }
        
        .breakdown-section {
          background: #fff9e6;
          border: 1px solid #ff9800;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .breakdown-title {
          color: #e65100;
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          font-size: 9px;
        }
        
        .breakdown-item {
          background: white;
          padding: 8px;
          border-radius: 4px;
          border-left: 3px solid #ff9800;
        }
        
        .breakdown-label {
          font-weight: bold;
          color: #666;
          margin-bottom: 4px;
        }
        
        .breakdown-value {
          color: #e65100;
          font-weight: bold;
        }
        
        .breakdown-hours {
          color: #2196F3;
          font-size: 8px;
        }
        
        .totals-section {
          background: #e8f5e9;
          border: 2px solid #4caf50;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
          page-break-inside: avoid;
        }
        
        .totals-title {
          color: #2e7d32;
          font-size: 14px;
          font-weight: bold;
          margin: 0 0 12px 0;
          text-align: center;
        }
        
        .totals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        
        .total-item {
          text-align: center;
          background: white;
          padding: 10px;
          border-radius: 6px;
        }
        
        .total-value {
          font-size: 16px;
          font-weight: bold;
          color: #2e7d32;
        }
        
        .total-label {
          font-size: 9px;
          color: #666;
          margin-top: 4px;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 8px;
        }
        
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
        }
        
        .signature-box {
          text-align: center;
          border-top: 1px solid #333;
          padding-top: 5px;
          font-size: 9px;
        }
        
        @media print {
          .page-break {
            page-break-before: always;
          }
          
          .no-break {
            page-break-inside: avoid;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    `;
  }

  // Genera riga tabella per ogni entry
  generateWorkEntriesRows(entries, calculationService, settings) {
    if (!entries || entries.length === 0) {
      return `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: #666;">
            Nessuna registrazione trovata per questo mese
          </td>
        </tr>
      `;
    }

    return entries.map(entry => {
      try {
        console.log(`🔄 PDFExportService: Processando entry ${entry.date}`, {
          entryId: entry.id,
          date: entry.date,
          hasCalculationService: !!calculationService,
          hasSettings: !!settings
        });

        let breakdown = null;
        let workHours = 0;
        let travelHours = 0;
        let standbyWorkHours = 0;
        let standbyTravelHours = 0;
        let totalStandbyHours = 0;

        if (calculationService && settings) {
          try {
            breakdown = calculationService.calculateEarningsBreakdown(entry, settings);
            workHours = calculationService.calculateWorkHours(entry) || 0;
            travelHours = calculationService.calculateTravelHours(entry) || 0;
            standbyWorkHours = calculationService.calculateStandbyWorkHours(entry) || 0;
            standbyTravelHours = calculationService.calculateStandbyTravelHours(entry) || 0;
            totalStandbyHours = standbyWorkHours + standbyTravelHours;
          } catch (calcError) {
            console.error(`❌ Errore calcolo per entry ${entry.date}:`, calcError);
          }
        }

        const totalHours = workHours + travelHours;
        const totalEarnings = breakdown?.totalEarnings || 0;
        
        // Determina tipo giornata
        const dayType = entry.isFixedDay ? (entry.dayType || 'riposo') : 'lavorativa';
        const dayTypeIcon = this.getDayTypeIcon(dayType);
        
        // Calcola straordinario
        const overtimeHours = Math.max(0, totalHours - 8);
        
        // Indennità e rimborsi
        const mealAllowance = (entry.mealLunchVoucher || 0) + (entry.mealDinnerVoucher || 0);
        const mealCash = (entry.mealLunchCash || 0) + (entry.mealDinnerCash || 0);
        const travelAllowance = entry.travelAllowance || 0;
        const standbyAllowance = breakdown?.allowances?.standby || 0;
        
        // Note dettagliate
        const notes = this.generateEntryNotes(entry, breakdown);

        return `
          <tr>
            <td class="date-col">
              ${this.formatDate(entry.date)}<br>
              <small style="color: #666;">${dayTypeIcon} ${this.formatDayOfWeek(entry.date)}</small>
            </td>
            <td class="site-col">${entry.siteName || entry.site_name || '-'}</td>
            <td class="hours-col">
              <strong>${this.formatHours(workHours)}</strong>
              ${entry.workStart1 && entry.workEnd1 ? `<br><small>${entry.workStart1}-${entry.workEnd1}</small>` : ''}
              ${entry.workStart2 && entry.workEnd2 ? `<br><small>${entry.workStart2}-${entry.workEnd2}</small>` : ''}
            </td>
            <td class="travel-col">
              <strong>${this.formatHours(travelHours)}</strong>
              ${entry.departureCompany && entry.arrivalSite ? `<br><small>A: ${entry.departureCompany}→${entry.arrivalSite}</small>` : ''}
              ${entry.departureReturn && entry.arrivalCompany ? `<br><small>R: ${entry.departureReturn}→${entry.arrivalCompany}</small>` : ''}
            </td>
            <td class="standby-col">
              ${totalStandbyHours > 0 ? `<strong>${this.formatHours(totalStandbyHours)}</strong>` : '-'}
              ${standbyWorkHours > 0 ? `<br><small>L: ${this.formatHours(standbyWorkHours)}</small>` : ''}
              ${standbyTravelHours > 0 ? `<br><small>V: ${this.formatHours(standbyTravelHours)}</small>` : ''}
            </td>
            <td class="meal-col">
              ${mealAllowance > 0 ? `${mealAllowance} buoni` : ''}
              ${mealCash > 0 ? `<br>€${mealCash.toFixed(2)}` : ''}
              ${mealAllowance === 0 && mealCash === 0 ? '-' : ''}
            </td>
            <td class="allowance-col">
              ${travelAllowance > 0 ? 'Trasferta' : ''}
              ${standbyAllowance > 0 ? `<br>Rep: €${standbyAllowance.toFixed(2)}` : ''}
              ${travelAllowance === 0 && standbyAllowance === 0 ? '-' : ''}
            </td>
            <td class="overtime-col">
              ${overtimeHours > 0 ? `<strong style="color: #f44336;">${this.formatHours(overtimeHours)}</strong>` : '-'}
            </td>
            <td class="earnings-col">
              <strong style="color: #2e7d32;">€${totalEarnings.toFixed(2)}</strong>
            </td>
            <td class="notes-col">${notes}</td>
          </tr>
        `;
      } catch (entryError) {
        console.error(`❌ Errore processamento entry ${entry.date}:`, entryError);
        return `
          <tr>
            <td colspan="10" style="text-align: center; color: #f44336; padding: 10px;">
              Errore: ${entry.date} - ${entryError.message}
            </td>
          </tr>
        `;
      }
    }).join('');
  }

  // Genera note dettagliate per entry
  generateEntryNotes(entry, breakdown) {
    const notes = [];
    
    // Veicolo utilizzato
    if (entry.vehicleDriven && entry.vehicleDriven !== 'non_guidato') {
      const vehicleText = entry.vehicleDriven === 'andata_ritorno' ? 'A/R' : 
                         entry.vehicleDriven === 'solo_andata' ? 'Solo A' : 'Solo R';
      notes.push(`🚗 ${vehicleText}`);
    }
    
    // Targa veicolo
    if (entry.vehiclePlate || entry.targa_veicolo) {
      notes.push(`Targa: ${entry.vehiclePlate || entry.targa_veicolo}`);
    }
    
    // Reperibilità
    if (entry.isStandbyDay || entry.standbyAllowance > 0) {
      notes.push(`📱 Reperibilità`);
    }
    
    // Completamento giornata
    if (entry.completamentoGiornata && entry.completamentoGiornata !== 'nessuno') {
      const completamento = {
        'ferie': '🏖️ Ferie',
        'permesso': '🕐 Permesso', 
        'malattia': '🤒 Malattia',
        'riposo': '😴 Riposo'
      };
      notes.push(`Completato con: ${completamento[entry.completamentoGiornata] || entry.completamentoGiornata}`);
    }
    
    // Note personali
    if (entry.note && entry.note.trim()) {
      notes.push(`💬 ${entry.note.trim()}`);
    }
    
    // Breakdown dettagliato se disponibile
    if (breakdown && breakdown.details) {
      if (breakdown.details.isSaturday) notes.push('📅 Sabato');
      if (breakdown.details.isSunday) notes.push('📅 Domenica');
      if (breakdown.details.isHoliday) notes.push('🎉 Festivo');
      if (breakdown.details.isPartialDay) notes.push('⏰ Giornata parziale');
    }
    
    return notes.length > 0 ? notes.join('<br>') : '-';
  }

  // Ottieni icona per tipo giornata
  getDayTypeIcon(dayType) {
    const icons = {
      'lavorativa': '💼',
      'ferie': '🏖️',
      'permesso': '🕐',
      'malattia': '🤒',
      'riposo': '😴',
      'festivo': '🎉'
    };
    return icons[dayType] || '💼';
  }

  // Genera sezione breakdown dettagliato
  generateDetailedBreakdown(monthlyData) {
    const breakdown = monthlyData.breakdown || {};
    
    return `
      <div class="breakdown-section">
        <h3 class="breakdown-title">📊 Analisi Dettagliata Ore e Guadagni</h3>
        
        <div class="breakdown-grid">
          <div class="breakdown-item">
            <div class="breakdown-label">Ore Lavorative</div>
            <div class="breakdown-value">€${(breakdown.ordinary?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Ordinarie: ${this.formatHours(breakdown.ordinary?.hours?.lavoro_giornaliera || 0)}<br>
              Festive: ${this.formatHours(breakdown.ordinary?.hours?.lavoro_festivo || 0)}<br>
              Sabato: ${this.formatHours(breakdown.ordinary?.hours?.lavoro_sabato || 0)}
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Ore Viaggio</div>
            <div class="breakdown-value">€${(breakdown.travel?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Ordinarie: ${this.formatHours(breakdown.travel?.hours?.viaggio_giornaliera || 0)}<br>
              Extra: ${this.formatHours(breakdown.travel?.hours?.viaggio_extra || 0)}<br>
              Notturne: ${this.formatHours(breakdown.travel?.hours?.viaggio_notturno || 0)}
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Straordinari</div>
            <div class="breakdown-value">€${(breakdown.overtime?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Diurno: ${this.formatHours(breakdown.overtime?.hours?.diurno || 0)}<br>
              Serale: ${this.formatHours(breakdown.overtime?.hours?.serale || 0)}<br>
              Notturno: ${this.formatHours(breakdown.overtime?.hours?.notturno || 0)}
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Reperibilità</div>
            <div class="breakdown-value">€${(breakdown.standby?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Lavoro: ${this.formatHours(breakdown.standby?.workHours?.total || 0)}<br>
              Viaggio: ${this.formatHours(breakdown.standby?.travelHours?.total || 0)}<br>
              Indennità: €${(breakdown.standby?.allowance || 0).toFixed(2)}
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Indennità Trasferta</div>
            <div class="breakdown-value">€${(breakdown.allowances?.travel || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Giorni: ${breakdown.travelDays || 0}<br>
              Percentuale: ${((breakdown.travelPercentage || 1) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Rimborsi Pasti</div>
            <div class="breakdown-value">€${(breakdown.allowances?.meal || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Buoni: ${breakdown.mealVouchers || 0}<br>
              Contanti: €${(breakdown.mealCash || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Genera HTML completo del PDF
  generateHTML(monthlyData, entries, settings, monthName, year) {
    const contract = settings?.contract || this.contractInfo;
    
    console.log('🔄 PDFExportService: Generazione HTML con dati:', {
      monthlyData: !!monthlyData,
      entriesCount: entries?.length,
      contractHourlyRate: contract?.hourlyRate,
      monthName,
      year
    });

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Lavoro - ${monthName} ${year}</title>
        ${this.generatePDFStyles()}
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          <h1>📋 Report Mensile Ore Lavoro</h1>
          <div class="subtitle">CCNL Metalmeccanico PMI - Livello 5 (Operaio Qualificato)</div>
          <div class="date-range">${monthName} ${year}</div>
        </div>

        <!-- INFORMAZIONI CONTRATTO -->
        <div class="contract-info no-break">
          <h3>📄 Informazioni Contratto CCNL</h3>
          <div class="contract-grid">
            <div class="contract-item">
              <div class="contract-label">Retribuzione Mensile</div>
              <div class="contract-value">€${contract.monthlySalary?.toFixed(2) || '2800.00'}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Retribuzione Giornaliera</div>
              <div class="contract-value">€${contract.dailyRate?.toFixed(2) || '107.69'}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Retribuzione Oraria</div>
              <div class="contract-value">€${contract.hourlyRate?.toFixed(2) || '16.15'}</div>
            </div>
            <div class="contract-item">
              <div class="contract-label">Livello CCNL</div>
              <div class="contract-value">Livello 5</div>
            </div>
          </div>
        </div>

        <!-- RIEPILOGO MENSILE -->
        <div class="summary-section no-break">
          <h2 class="section-title">📊 Riepilogo Mensile</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${monthlyData.workDays || 0}</div>
              <div class="label">Giorni Lavorati</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(monthlyData.totalWorkHours || 0)}</div>
              <div class="label">Ore Lavoro</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(monthlyData.totalTravelHours || 0)}</div>
              <div class="label">Ore Viaggio</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(monthlyData.totalOvertimeHours || 0)}</div>
              <div class="label">Ore Straordinario</div>
            </div>
            <div class="summary-card">
              <div class="value">${this.formatHours(monthlyData.totalStandbyHours || 0)}</div>
              <div class="label">Ore Reperibilità</div>
            </div>
            <div class="summary-card earnings-card">
              <div class="value">€${(monthlyData.totalEarnings || 0).toFixed(2)}</div>
              <div class="label">Guadagno Totale</div>
            </div>
          </div>
        </div>

        <!-- BREAKDOWN DETTAGLIATO -->
        ${this.generateDetailedBreakdown(monthlyData)}

        <!-- TABELLA REGISTRAZIONI -->
        <div class="work-entries-section">
          <h2 class="section-title">📅 Dettaglio Registrazioni Giornaliere</h2>
          
          <table class="work-entries-table">
            <thead>
              <tr>
                <th class="date-col">Data</th>
                <th class="site-col">Cantiere</th>
                <th class="hours-col">Ore<br>Lavoro</th>
                <th class="travel-col">Ore<br>Viaggio</th>
                <th class="standby-col">Ore<br>Reperibilità</th>
                <th class="meal-col">Rimborsi<br>Pasti</th>
                <th class="allowance-col">Indennità</th>
                <th class="overtime-col">Straordinario</th>
                <th class="earnings-col">Guadagno<br>Giornaliero</th>
                <th class="notes-col">Note e Dettagli</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateWorkEntriesRows(entries, null, settings)}
            </tbody>
          </table>
        </div>

        <!-- TOTALI FINALI -->
        <div class="totals-section no-break">
          <h3 class="totals-title">💰 Riepilogo Finale ${monthName} ${year}</h3>
          <div class="totals-grid">
            <div class="total-item">
              <div class="total-value">${this.formatHours((monthlyData.totalWorkHours || 0) + (monthlyData.totalTravelHours || 0))}</div>
              <div class="total-label">ORE TOTALI</div>
            </div>
            <div class="total-item">
              <div class="total-value">${monthlyData.workDays || 0}</div>
              <div class="total-label">GIORNI LAVORATI</div>
            </div>
            <div class="total-item">
              <div class="total-value">€${((monthlyData.totalEarnings || 0) - (monthlyData.totalAllowances || 0)).toFixed(2)}</div>
              <div class="total-label">RETRIBUZIONE LAVORO</div>
            </div>
            <div class="total-item">
              <div class="total-value">€${(monthlyData.totalEarnings || 0).toFixed(2)}</div>
              <div class="total-label">TOTALE LORDO</div>
            </div>
          </div>
        </div>

        <!-- FOOTER E FIRME -->
        <div class="footer">
          <p>Report generato automaticamente il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
          <p>Calcolato secondo CCNL Metalmeccanico PMI - Sistema di tracking ore lavoro</p>
          
          <div class="signature-section">
            <div class="signature-box">
              Data e Firma del Dipendente
            </div>
            <div class="signature-box">
              Data e Firma del Responsabile
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Metodo pubblico per generare PDF
  static async generatePDF(monthlyData, entries, settings, month, year) {
    console.log('🔄 PDFExportService: Inizio generazione PDF con dati:', {
      monthlyDataKeys: Object.keys(monthlyData || {}),
      entriesCount: entries?.length || 0,
      month,
      year,
      settings: !!settings
    });

    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    try {
      const service = new PDFExportService();
      const html = service.generateHTML(monthlyData, entries, settings, monthNames[month - 1], year);
      
      console.log('✅ PDFExportService: HTML generato con successo');
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595, // A4 width in points
        height: 842, // A4 height in points
        margins: {
          left: 30,
          top: 30,
          right: 30,
          bottom: 30,
        }
      });
      
      console.log('✅ PDFExportService: PDF creato con successo:', uri);
      return uri;
    } catch (error) {
      console.error('❌ PDFExportService: Errore durante la generazione PDF:', error);
      throw error;
    }
  }

  // Condividi PDF
  static async sharePDF(uri) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
        return true;
      } else {
        console.log('📱 Sharing non disponibile su questa piattaforma');
        return false;
      }
    } catch (error) {
      console.error('❌ Errore condivisione PDF:', error);
      throw error;
    }
  }
}

export default PDFExportService;
