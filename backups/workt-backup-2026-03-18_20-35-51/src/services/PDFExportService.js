import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils';
import { CCNL_CONTRACTS } from '../constants';

class PDFExportService {
  // Genera una tabella HTML con il breakdown mensile dettagliato
  static generateDetailedBreakdown(monthlyData) {
    if (!monthlyData || !monthlyData.breakdown) return '';
    let html = '<h3>Dettaglio Breakdown</h3><table><tr><th>Tipo</th><th>Ore</th><th>Compenso</th></tr>';
    for (const [type, value] of Object.entries(monthlyData.breakdown)) {
      html += `<tr><td>${type}</td><td>${value.hours || '-'}</td><td>${value.earnings ? value.earnings.toFixed(2) : '-'}</td></tr>`;
    }
    html += '</table>';
    return html;
  }

  // Formatta le ore in formato H:MM
  static formatHours(hours) {
    if (!hours) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }

  // Formatta la data in italiano
  static formatDate(date) {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  // Formatta il giorno della settimana
  static formatDayOfWeek(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days[new Date(date).getDay()];
  }

  // Genera CSS ottimizzato per la stampa
  static generatePDFStyles() {
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
  static generateWorkEntriesRows(entries, calculationService, settings) {
    console.log('🔍 PDF DEBUG - generateWorkEntriesRows chiamato con:', {
      entriesCount: entries?.length || 0,
      hasCalculationService: !!calculationService,
      hasSettings: !!settings,
      firstEntry: entries?.[0] ? {
        date: entries[0].date,
        workStart: entries[0].workStart,
        workEnd: entries[0].workEnd,
        hasWorkHours: 'workHours' in entries[0],
        hasTravelHours: 'travelHours' in entries[0]
      } : 'NO_ENTRIES'
    });

    if (!entries || entries.length === 0) {
      console.log('⚠️ PDF DEBUG - Nessuna entry trovata');
      return `
        <tr>
          <td colspan="10" style="text-align: center; padding: 20px; color: #666;">
            Nessuna registrazione trovata per questo mese
          </td>
        </tr>
      `;
    }

    // Calcolo totali colonne
    let totals = {
      workHours: 0,
      travelHours: 0,
      standbyHours: 0,
      mealVouchers: 0,
      mealCash: 0,
      travelAllowance: 0,
      standbyAllowance: 0,
      overtimeHours: 0,
      nightHours: 0,
      earnings: 0,
      standbyEarnings: 0,
      standbyTravelEarnings: 0,
      totalDayEarnings: 0
    };

    const rows = entries.map(entry => {
      try {
        console.log(`🔄 PDFExportService: Processando entry ${entry.date}`, {
          entryId: entry.id,
          date: entry.date,
          hasCalculationService: !!calculationService,
          hasSettings: !!settings
        });

        // Visualizzazione coerente con Dashboard/TimeEntryForm
        // Ore lavoro ordinarie
        let workHours = typeof entry.workHours !== 'undefined' ? entry.workHours : 0;
        // Ore viaggio ordinarie
        let travelHours = typeof entry.travelHours !== 'undefined' ? entry.travelHours : 0;
        // Ore straordinarie (solo lavoro extra)
        let overtimeHours = typeof entry.overtimeHours !== 'undefined' ? entry.overtimeHours : 0;
        // Ore viaggio extra
        let extraTravelHours = typeof entry.extraTravelHours !== 'undefined' ? entry.extraTravelHours : 0;
        // Ore notturne
        let nightHours = typeof entry.nightHours !== 'undefined' ? entry.nightHours : 0;
        // Guadagni
        let regularEarnings = typeof entry.regularEarnings !== 'undefined' ? entry.regularEarnings : 0;
        let overtimeEarnings = typeof entry.overtimeEarnings !== 'undefined' ? entry.overtimeEarnings : 0;
        let travelEarnings = typeof entry.travelEarnings !== 'undefined' ? entry.travelEarnings : 0;
        let extraTravelEarnings = typeof entry.extraTravelEarnings !== 'undefined' ? entry.extraTravelEarnings : 0;

        // Se abbiamo calculationService, usa i calcoli dinamici (altrimenti usa i dati pre-calcolati)
        if (calculationService && settings) {
          try {
            breakdown = calculationService.calculateEarningsBreakdown(entry, settings);
            workHours = calculationService.calculateWorkHours(entry) || 0;
            travelHours = calculationService.calculateTravelHours(entry) || 0;
            standbyWorkHours = calculationService.calculateStandbyWorkHours(entry) || 0;
            standbyTravelHours = calculationService.calculateStandbyTravelHours(entry) || 0;
            totalStandbyHours = standbyWorkHours + standbyTravelHours;
            totalEarnings = breakdown?.totalEarnings || 0;
            
            console.log(`🔍 PDF DEBUG - Entry ${entry.date} calcolata:`, {
              workHours,
              travelHours,
              totalEarnings: totalEarnings.toFixed(2),
              breakdown: breakdown ? 'OK' : 'NULL'
            });
          } catch (calcError) {
            console.error(`❌ Errore calcolo per entry ${entry.date}:`, calcError);
          }
        } else {
          console.log(`🔍 PDF DEBUG - Entry ${entry.date} dati preesistenti:`, {
            workHours,
            travelHours,
            totalEarnings: totalEarnings.toFixed(2),
            noCalculationService: !calculationService,
            noSettings: !settings
          });
        }

        // Aggiorna totali
        totals.workHours += workHours;
        totals.travelHours += travelHours;
        totals.standbyHours += totalStandbyHours;
        totals.earnings += totalEarnings;
        totals.overtimeHours += overtimeHours > 0 ? overtimeHours : Math.max(0, (workHours + travelHours) - 8);
        totals.nightHours += nightHours;
        totals.mealVouchers += (entry.mealLunchVoucher || 0) + (entry.mealDinnerVoucher || 0);
        totals.mealCash += (entry.mealLunchCash || 0) + (entry.mealDinnerCash || 0);
        totals.travelAllowance += entry.travelAllowance || 0;
        totals.standbyAllowance += (breakdown?.allowances?.standby || entry.standbyAllowance || 0);

        const totalHours = workHours + travelHours;
        // Determina tipo giornata
        const dayType = entry.isFixedDay ? (entry.dayType || 'riposo') : 'lavorativa';
        const dayTypeIcon = PDFExportService.getDayTypeIcon(dayType);
        // Usa le ore straordinario pre-calcolate o calcola se non disponibili
        const calculatedOvertimeHours = overtimeHours > 0 ? overtimeHours : Math.max(0, totalHours - 8);
        // Indennità e rimborsi
        const mealAllowance = (entry.mealLunchVoucher || 0) + (entry.mealDinnerVoucher || 0);
        const mealCash = (entry.mealLunchCash || 0) + (entry.mealDinnerCash || 0);
        const travelAllowance = entry.travelAllowance || 0;
        const standbyAllowance = breakdown?.allowances?.standby || entry.standbyAllowance || 0;
        // Note dettagliate
        const notes = PDFExportService.generateEntryNotes(entry, breakdown);

        // Breakdown dettagliato in una sola colonna, stile TimeEntryForm
        let breakdownHtml = '';
        if (breakdown) {
          breakdownHtml = `
            <tr class="breakdown-row">
              <td colspan="10" style="background:#fff9e6; border-top:1px solid #ff9800; padding:8px; text-align:left; font-size:8px;">
                <div><b>Ordinario:</b> ${PDFExportService.formatHours(breakdown.ordinary?.hours?.lavoro_giornaliera || 0)}h lavoro, ${PDFExportService.formatHours(breakdown.ordinary?.hours?.viaggio_giornaliera || 0)}h viaggio</div>
                <div><b>Straordinario:</b> ${PDFExportService.formatHours(breakdown.ordinary?.hours?.lavoro_extra || 0)}h lavoro, ${PDFExportService.formatHours(breakdown.ordinary?.hours?.viaggio_extra || 0)}h viaggio</div>
                <div><b>Reperibilità:</b> ${PDFExportService.formatHours(breakdown.standby?.workHours?.ordinary || 0)}h diurno, ${PDFExportService.formatHours(breakdown.standby?.workHours?.evening || 0)}h serale, ${PDFExportService.formatHours(breakdown.standby?.workHours?.night || 0)}h notte</div>
                <div><b>Pasti:</b> Buoni €${(breakdown.allowances?.meal || 0).toFixed(2)}</div>
                <div><b>Indennità Trasferta:</b> €${(breakdown.allowances?.travel || 0).toFixed(2)}</div>
                <div><b>Indennità Reperibilità:</b> €${(breakdown.allowances?.standby || 0).toFixed(2)}</div>
                <div><b>Guadagno Giornaliero:</b> €${(breakdown.totalEarnings || 0).toFixed(2)}</div>
                ${breakdown.details?.isPartialDay ? `<div><b>Completamento:</b> ${breakdown.details.completamentoTipo} (${PDFExportService.formatHours(breakdown.details.missingHours || 0)} mancanti)</div>` : ''}
              </td>
            </tr>
          `;
        }
        // Dati sicuri per la riga
        const workHoursRegular = (entry.breakdown?.ordinary?.hours?.lavoro_giornaliera || 0);
        const travelHoursRegular = (entry.breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
        const workHoursExtra = (entry.breakdown?.ordinary?.hours?.lavoro_extra || 0);
        const travelHoursExtra = (entry.breakdown?.ordinary?.hours?.viaggio_extra || 0);
        const standbyHoursOrdinary = (entry.breakdown?.standby?.workHours?.ordinary || 0);
        const standbyHoursNight = (entry.breakdown?.standby?.workHours?.night || 0);
        const mealAllowanceValue = Number(entry.breakdown?.allowances?.meal || 0);
        const travelAllowanceValue = Number(entry.breakdown?.allowances?.travel || 0);
        const standbyAllowanceValue = Number(entry.breakdown?.allowances?.standby || 0);
        const totalEarningsValue = Number(entry.breakdown?.totalEarnings || 0);

        return `
          <tr>
            <td class="date-col">
              ${PDFExportService.formatDate(entry.date)}<br>
              <small style="color: #666;">${PDFExportService.getDayTypeIcon(entry.isFixedDay ? (entry.dayType || 'riposo') : 'lavorativa')} ${PDFExportService.formatDayOfWeek(entry.date)}</small>
            </td>
            <td class="site-col">${entry.siteName || entry.site_name || '-'}</td>
            <td class="hours-col">${PDFExportService.formatHours(workHoursRegular)}</td>
            <td class="travel-col">${PDFExportService.formatHours(travelHoursRegular)}</td>
            <td class="overtime-col">${PDFExportService.formatHours(workHoursExtra)}</td>
            <td class="extra-travel-col">${PDFExportService.formatHours(travelHoursExtra)}</td>
            <td class="standby-col">${PDFExportService.formatHours(standbyHoursOrdinary)}</td>
            <td class="night-col">${PDFExportService.formatHours(standbyHoursNight)}</td>
            <td class="meal-col">€${mealAllowanceValue.toFixed(2)}</td>
            <td class="travel-allowance-col">€${travelAllowanceValue.toFixed(2)}</td>
            <td class="standby-allowance-col">€${standbyAllowanceValue.toFixed(2)}</td>
            <td class="earnings-col">€${totalEarningsValue.toFixed(2)}</td>
          </tr>
          ${breakdownHtml}
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
    });

    // Totali mensili in fondo
    const totalsRow = `
      <tr style="background:#e0e0e0;font-weight:bold;">
        <td class="date-col">Totale mese</td>
        <td class="site-col">-</td>
        <td class="hours-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.ordinary?.hours?.lavoro_giornaliera || 0), 0))}</td>
        <td class="travel-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.ordinary?.hours?.viaggio_giornaliera || 0), 0))}</td>
        <td class="overtime-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.ordinary?.hours?.lavoro_extra || 0), 0))}</td>
        <td class="extra-travel-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.ordinary?.hours?.viaggio_extra || 0), 0))}</td>
        <td class="standby-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.standby?.workHours?.ordinary || 0), 0))}</td>
        <td class="night-col">${PDFExportService.formatHours(entries.reduce((sum, e) => sum + (e.breakdown?.standby?.workHours?.night || 0), 0))}</td>
        <td class="meal-col">€${entries.reduce((sum, e) => sum + (e.breakdown?.allowances?.meal || 0), 0).toFixed(2)}</td>
        <td class="travel-allowance-col">€${entries.reduce((sum, e) => sum + (e.breakdown?.allowances?.travel || 0), 0).toFixed(2)}</td>
        <td class="standby-allowance-col">€${entries.reduce((sum, e) => sum + (e.breakdown?.allowances?.standby || 0), 0).toFixed(2)}</td>
        <td class="earnings-col">€${entries.reduce((sum, e) => sum + (e.breakdown?.totalEarnings || 0), 0).toFixed(2)}</td>
      </tr>
    `;

    return rows.join('') + totalsRow;
  }

  // Genera note dettagliate per entry
  static generateEntryNotes(entry, breakdown) {
    const notes = [];
    
    // Orari di lavoro dettagliati
    if (entry.workStart1 && entry.workEnd1) {
      notes.push(`🕐 Turno 1: ${entry.workStart1}-${entry.workEnd1}`);
    }
    if (entry.workStart2 && entry.workEnd2) {
      notes.push(`🕐 Turno 2: ${entry.workStart2}-${entry.workEnd2}`);
    }
    
    // Viaggi dettagliati con orari
    if (entry.departureCompany && entry.arrivalSite) {
      notes.push(`🚗 Andata: ${entry.departureCompany} → ${entry.arrivalSite}`);
    }
    if (entry.departureReturn && entry.arrivalCompany) {
      notes.push(`🏠 Ritorno: ${entry.departureReturn} → ${entry.arrivalCompany}`);
    }
    
    // Informazioni veicolo
    if (entry.vehicleDriven && entry.vehicleDriven !== 'non_guidato') {
      const vehicleText = entry.vehicleDriven === 'andata_ritorno' ? 'Andata/Ritorno' : 
                         entry.vehicleDriven === 'solo_andata' ? 'Solo Andata' : 'Solo Ritorno';
      notes.push(`� Veicolo: ${vehicleText}`);
    const rows = entries.map(entry => {
      try {
        // ...existing code...
        // Guadagno da reperibilità compreso viaggio
        const standbyEarnings = (entry.breakdown?.standby?.total || 0) + (entry.breakdown?.standby?.travelEarnings || 0);
        // Totale guadagno giornata
        const totalDayEarnings = entry.breakdown?.totalEarnings || 0;
        // Rimborso pasti dettagliato bonus e cash
        const mealVoucher = (entry.mealLunchVoucher || 0) + (entry.mealDinnerVoucher || 0);
        const mealCash = (entry.mealLunchCash || 0) + (entry.mealDinnerCash || 0);

        return `
          <tr>
            <td class="date-col">
              ${PDFExportService.formatDate(entry.date)}<br>
              <small style="color: #666;">${PDFExportService.getDayTypeIcon(entry.isFixedDay ? (entry.dayType || 'riposo') : 'lavorativa')} ${PDFExportService.formatDayOfWeek(entry.date)}</small>
            </td>
            <td class="site-col">${entry.siteName || entry.site_name || '-'}</td>
            <td class="hours-col">${PDFExportService.formatHours(entry.breakdown?.ordinary?.hours?.lavoro_giornaliera || 0)}</td>
            <td class="travel-col">${PDFExportService.formatHours(entry.breakdown?.ordinary?.hours?.viaggio_giornaliera || 0)}</td>
            <td class="overtime-col">${PDFExportService.formatHours(entry.breakdown?.ordinary?.hours?.lavoro_extra || 0)}</td>
            <td class="extra-travel-col">${PDFExportService.formatHours(entry.breakdown?.ordinary?.hours?.viaggio_extra || 0)}</td>
            <td class="standby-col">${PDFExportService.formatHours(entry.breakdown?.standby?.workHours?.ordinary || 0)}</td>
            <td class="night-col">${PDFExportService.formatHours(entry.breakdown?.standby?.workHours?.night || 0)}</td>
            <td class="meal-col">€${(entry.breakdown?.allowances?.meal || 0).toFixed(2)}</td>
            <td class="travel-allowance-col">€${(entry.breakdown?.allowances?.travel || 0).toFixed(2)}</td>
            <td class="standby-allowance-col">€${(entry.breakdown?.allowances?.standby || 0).toFixed(2)}</td>
            <td class="earnings-col">€${(entry.breakdown?.totalEarnings || 0).toFixed(2)}</td>
            <td class="standby-earnings-col">€${standbyEarnings.toFixed(2)}</td>
            <td class="total-day-earnings-col">€${totalDayEarnings.toFixed(2)}</td>
            <td class="meal-detail-col">Bonus: ${mealVoucher} / Cash: €${mealCash.toFixed(2)}</td>
          </tr>
        `;
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Straordinari</div>
            <div class="breakdown-value">€${(breakdown.overtime?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Diurno: ${PDFExportService.formatHours(breakdown.overtime?.hours?.diurno || 0)}<br>
              Serale: ${PDFExportService.formatHours(breakdown.overtime?.hours?.serale || 0)}<br>
              Notturno: ${PDFExportService.formatHours(breakdown.overtime?.hours?.notturno || 0)}
            </div>
          </div>
          
          <div class="breakdown-item">
            <div class="breakdown-label">Reperibilità</div>
            <div class="breakdown-value">€${(breakdown.standby?.total || 0).toFixed(2)}</div>
            <div class="breakdown-hours">
              Lavoro: ${PDFExportService.formatHours(breakdown.standby?.workHours?.total || 0)}<br>
              Viaggio: ${PDFExportService.formatHours(breakdown.standby?.travelHours?.total || 0)}<br>
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
  generateHTML(monthlyData, entries, settings, monthName, year, calculationService = null) {
    const contract = settings?.contract || CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    
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
        ${PDFExportService.generatePDFStyles()}
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
              <div class="value">${PDFExportService.formatHours(monthlyData.totalWorkHours || 0)}</div>
              <div class="label">Ore Lavoro</div>
            </div>
            <div class="summary-card">
              <div class="value">${PDFExportService.formatHours(monthlyData.totalTravelHours || 0)}</div>
              <div class="label">Ore Viaggio</div>
            </div>
            <div class="summary-card">
              <div class="value">${PDFExportService.formatHours(monthlyData.totalOvertimeHours || 0)}</div>
              <div class="label">Ore Straordinario</div>
            </div>
            <div class="summary-card">
              <div class="value">${PDFExportService.formatHours(monthlyData.totalStandbyHours || 0)}</div>
              <div class="label">Ore Reperibilità</div>
            </div>
            <div class="summary-card earnings-card">
              <div class="value">€${(monthlyData.totalEarnings || 0).toFixed(2)}</div>
              <div class="label">Guadagno Totale</div>
            </div>
          </div>
        </div>

        <!-- BREAKDOWN DETTAGLIATO -->
        ${PDFExportService.generateDetailedBreakdown(monthlyData)}

        <!-- TABELLA REGISTRAZIONI -->
        <div class="work-entries-section">
          <h2 class="section-title">📅 Dettaglio Registrazioni Giornaliere</h2>
          
          <table class="work-entries-table">
            <thead>
              <tr>
                <th class="date-col">Data</th>
                <th class="site-col">Cantiere</th>
                <th class="vehicle-col">Veicolo/Targa</th>
                <th class="driveinfo-col">Info Guida</th>
                <th class="shifts-col">Orari Turni</th>
                <th class="totalviaggi-col">Totale Viaggi</th>
                <th class="totallavoro-col">Totale Ore Lavoro</th>
                <th class="viaggioextra-col">Viaggio Extra</th>
                <th class="overtime-col">Straordinari</th>
                <th class="travel-rate-col">Tariffa Trasferta</th>
                <th class="standby-allowance-col">Indennità Reperibilità</th>
                <th class="interventions-col">Orari Interventi Reperibilità</th>
              </tr>
            </thead>
            <tbody>
              ${PDFExportService.generateWorkEntriesRows(entries, calculationService, settings)}
            </tbody>
          </table>
        </div>

        <!-- TOTALI FINALI -->
        <div class="totals-section no-break">
          <h3 class="totals-title">💰 Riepilogo Finale ${monthName} ${year}</h3>
          <div class="totals-grid">
            <div class="total-item">
              <div class="total-value">${PDFExportService.formatHours((monthlyData.totalWorkHours || 0) + (monthlyData.totalTravelHours || 0))}</div>
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
  static async generatePDF(monthlyData, entries, settings, month, year, calculationService = null) {
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
      const html = service.generateHTML(monthlyData, entries, settings, monthNames[month - 1], year, calculationService);
      
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

  // Metodo compatibile con PDFExportScreen
  static async exportMonthlyReport(entries, monthlyStats, month, year, calculationService = null, settings = null) {
    try {
      console.log('🔄 PDFExportService.exportMonthlyReport chiamato con:', {
        entriesCount: entries?.length || 0,
        monthlyStats: !!monthlyStats,
        month,
        year,
        hasCalculationService: !!calculationService,
        hasSettings: !!settings
      });

      // Converti i dati nel formato atteso dal nuovo generatePDF
      const monthlyData = {
        workDays: monthlyStats?.workDays || 0,
        totalWorkHours: monthlyStats?.totalWorkHours || 0,
        totalTravelHours: monthlyStats?.totalTravelHours || 0,
        totalOvertimeHours: monthlyStats?.totalOvertimeHours || 0,
        totalStandbyHours: monthlyStats?.totalStandbyHours || 0,
        totalEarnings: monthlyStats?.totalEarnings || 0,
        totalAllowances: monthlyStats?.totalAllowances || 0,
        breakdown: monthlyStats?.breakdown || {}
      };

      // Usa le impostazioni passate o quelle di default
      const finalSettings = settings || {
        contract: {
          monthlySalary: 2800.00,
          dailyRate: 107.69,
          hourlyRate: 16.15,
          overtimeRates: {
            day: 1.2,
            nightUntil22: 1.25,
            nightAfter22: 1.35,
            saturday: 1.25,
            holiday: 1.3
          }
        }
      };

      // Usa il metodo statico corretto
      const uri = await PDFExportService.generatePDF(monthlyData, entries, finalSettings, month, year, calculationService);
      
      // Prova a condividere il PDF
      let shared = false;
      try {
        shared = await PDFExportService.sharePDF(uri);
      } catch (shareError) {
        console.warn('⚠️ Condivisione PDF fallita:', shareError);
      }

      return {
        success: true,
        uri,
        filename: `Report_${month}_${year}.pdf`,
        shared
      };
    } catch (error) {
      console.error('❌ Errore in exportMonthlyReport:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default PDFExportService;
