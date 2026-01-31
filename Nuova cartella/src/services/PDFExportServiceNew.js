import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils';
import { CCNL_CONTRACTS } from '../constants';

class PDFExportServiceNew {
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

  // Ottieni icona per tipo giornata
  static getDayTypeIcon(dayType) {
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

  // Genera CSS per PDF
  static generatePDFStyles() {
    return `
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.2;
          color: #333;
          margin: 0;
          padding: 0;
          font-size: 9px;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 10px;
        }
        
        .header h1 {
          color: #2196F3;
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        
        .header .subtitle {
          color: #666;
          margin: 5px 0;
          font-size: 11px;
        }
        
        .work-entries-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7px;
          margin-bottom: 15px;
        }
        
        .work-entries-table th {
          background: #f5f5f5;
          color: #333;
          padding: 4px 2px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ddd;
          font-size: 6px;
          vertical-align: middle;
        }
        
        .work-entries-table td {
          padding: 3px 2px;
          border: 1px solid #ddd;
          text-align: center;
          font-size: 6px;
          vertical-align: middle;
        }
        
        .work-entries-table tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .totals-row {
          background: #e0e0e0 !important;
          font-weight: bold !important;
          font-size: 7px !important;
        }
        
        .date-col { width: 6%; }
        .site-col { width: 6%; }
        .vehicle-col { width: 5%; }
        .drive-info-col { width: 5%; }
        .shift-times-col { width: 6%; }
        .total-travel-col { width: 5%; }
        .total-work-col { width: 5%; }
        .extra-travel-col { width: 5%; }
        .overtime-col { width: 8%; }
        .travel-rate-col { width: 6%; }
        .standby-allowance-col { width: 6%; }
        .interventions-col { width: 8%; }
        .standby-earnings-col { width: 7%; }
        .total-earnings-col { width: 6%; }
        .meal-details-col { width: 8%; }
        
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 8px;
        }
      </style>
    `;
  }

  // Genera righe tabella per ogni entry
  static generateWorkEntriesRows(entries, calculationService, settings) {
    if (!entries || entries.length === 0) {
      return `
        <tr>
          <td colspan="15" style="text-align: center; padding: 20px; color: #666;">
            Nessuna registrazione trovata per questo mese
          </td>
        </tr>
      `;
    }

    // Ottieni percentuale straordinari dal contratto
    const contract = settings?.contract || CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    const overtimePercentage = Math.round((contract.overtimeRates?.day || 1.2 - 1) * 100); // Converte 1.2 -> 20%

    // Calcola totali
    let totals = {
      totalTravel: 0,
      totalWork: 0,
      extraTravel: 0,
      overtimeHours: 0,
      travelRate: 0,
      standbyAllowance: 0,
      standbyEarnings: 0,
      totalEarnings: 0,
      mealVouchers: 0,
      mealCash: 0
    };

    const rows = entries.map(entry => {
      try {
        // Debug: log dell'entry ricevuta
        console.log('🔍 PDF Service - Processing entry:', entry.date, 'has breakdown:', !!entry.breakdown);
        if (entry.breakdown) {
          console.log('🔍 PDF Service - Breakdown totalEarnings:', entry.breakdown.totalEarnings);
          console.log('🔍 PDF Service - Breakdown ordinary hours:', entry.breakdown.ordinary?.hours);
        }
        
        // Usa il breakdown già calcolato dal PDFExportScreen, altrimenti calcola nuovo
        let breakdown = entry.breakdown;
        if (!breakdown && calculationService && settings) {
          try {
            console.log('🔄 PDF Service - Calculating new breakdown for:', entry.date);
            breakdown = calculationService.calculateEarningsBreakdown(entry, settings);
          } catch (calcError) {
            console.error(`Errore calcolo per entry ${entry.date}:`, calcError);
          }
        }

        // Estrae dati per ogni colonna
        const date = PDFExportServiceNew.formatDate(entry.date);
        const dayIcon = PDFExportServiceNew.getDayTypeIcon(entry.isFixedDay ? (entry.dayType || 'riposo') : 'lavorativa');
        const site = entry.siteName || entry.site_name || '-';
        
        // Veicolo/Targa
        const vehicle = entry.vehiclePlate || entry.targa_veicolo || '-';
        
        // Info guida
        const driveInfo = entry.vehicleDriven && entry.vehicleDriven !== 'non_guidato' ? 
          (entry.vehicleDriven === 'andata_ritorno' ? 'A/R' : 
           entry.vehicleDriven === 'solo_andata' ? 'Solo A' : 'Solo R') : '-';
        
        // Orari turni
        let shiftTimes = '';
        if (entry.workStart1 && entry.workEnd1) {
          shiftTimes = `${entry.workStart1}-${entry.workEnd1}`;
          if (entry.workStart2 && entry.workEnd2) {
            shiftTimes += ` / ${entry.workStart2}-${entry.workEnd2}`;
          }
        }
        
        // Totale viaggi
        const totalTravel = PDFExportServiceNew.formatHours(
          (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0) + 
          (breakdown?.ordinary?.hours?.viaggio_extra || 0)
        );
        
        // Totale ore lavoro
        const totalWork = PDFExportServiceNew.formatHours(
          (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
          (breakdown?.ordinary?.hours?.lavoro_extra || 0)
        );
        
        // Viaggio extra
        const extraTravel = PDFExportServiceNew.formatHours(breakdown?.ordinary?.hours?.viaggio_extra || 0);
        
        // Straordinari (solo ore lavoro extra, non viaggio)
        const overtimeHours = breakdown?.ordinary?.hours?.lavoro_extra || 0;
        const overtimePercent = overtimeHours > 0 ? overtimePercentage : 0; // Usa percentuale dal contratto CCNL
        const overtime = `${PDFExportServiceNew.formatHours(overtimeHours)} (${overtimePercent}%)`;
        
        // Tariffa trasferta
        const travelRate = `€${(breakdown?.allowances?.travel || 0).toFixed(2)}`;
        
        // Indennità reperibilità
        const standbyAllowance = `€${(breakdown?.allowances?.standby || 0).toFixed(2)}`;
        
        // Orari interventi reperibilità (compreso viaggio)
        let interventions = '-';
        if (entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0) {
          interventions = entry.interventi.map(i => 
            `${i.start_time || ''}-${i.end_time || ''}`
          ).join(', ');
        }
        
        // Guadagno da reperibilità compreso di viaggio - usa il valore dal breakdown
        const standbyTotalEarnings = Number(breakdown?.standby?.totalEarnings || 0);
        const standbyEarnings = `€${standbyTotalEarnings.toFixed(2)}`;
        
        // Totale guadagno giornata
        const totalEarningsValue = Number(breakdown?.totalEarnings || 0);
        const totalEarnings = `€${totalEarningsValue.toFixed(2)}`;
        
        // Rimborso pasti - usa il valore già calcolato nel breakdown
        const mealTotalValue = Number(breakdown?.allowances?.meal || 0);
        const mealDetails = `€${mealTotalValue.toFixed(2)}`;

        // Aggiorna totali con conversioni sicure
        totals.totalTravel += (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_extra || 0);
        totals.totalWork += (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.lavoro_extra || 0);
        totals.extraTravel += breakdown?.ordinary?.hours?.viaggio_extra || 0;
        totals.overtimeHours += overtimeHours; // Solo ore lavoro extra
        totals.travelRate += Number(breakdown?.allowances?.travel || 0);
        totals.standbyAllowance += Number(breakdown?.allowances?.standby || 0);
        totals.standbyEarnings += standbyTotalEarnings; // Valore corretto dal breakdown
        totals.totalEarnings += totalEarningsValue;
        totals.mealVouchers += mealTotalValue; // Valore dal breakdown
        totals.mealCash += 0; // Non più utilizzato

        return `
          <tr>
            <td class="date-col">${date}<br><small>${dayIcon}</small></td>
            <td class="site-col">${site}</td>
            <td class="vehicle-col">${vehicle}</td>
            <td class="drive-info-col">${driveInfo}</td>
            <td class="shift-times-col">${shiftTimes}</td>
            <td class="total-travel-col">${totalTravel}</td>
            <td class="total-work-col">${totalWork}</td>
            <td class="extra-travel-col">${extraTravel}</td>
            <td class="overtime-col">${overtime}</td>
            <td class="travel-rate-col">${travelRate}</td>
            <td class="standby-allowance-col">${standbyAllowance}</td>
            <td class="interventions-col">${interventions}</td>
            <td class="standby-earnings-col">${standbyEarnings}</td>
            <td class="total-earnings-col">${totalEarnings}</td>
            <td class="meal-details-col">${mealDetails}</td>
          </tr>
        `;
      } catch (entryError) {
        console.error(`Errore processamento entry ${entry.date}:`, entryError);
        return `
          <tr>
            <td colspan="15" style="text-align: center; color: #f44336; padding: 10px;">
              Errore: ${entry.date} - ${entryError.message}
            </td>
          </tr>
        `;
      }
    });

    // Riga totali in fondo
    const overtimePercent = totals.overtimeHours > 0 ? overtimePercentage : 0;
    const totalsRow = `
      <tr class="totals-row">
        <td class="date-col"><strong>TOTALI MESE</strong></td>
        <td class="site-col">-</td>
        <td class="vehicle-col">-</td>
        <td class="drive-info-col">-</td>
        <td class="shift-times-col">-</td>
        <td class="total-travel-col"><strong>${PDFExportServiceNew.formatHours(totals.totalTravel)}</strong></td>
        <td class="total-work-col"><strong>${PDFExportServiceNew.formatHours(totals.totalWork)}</strong></td>
        <td class="extra-travel-col"><strong>${PDFExportServiceNew.formatHours(totals.extraTravel)}</strong></td>
        <td class="overtime-col"><strong>${PDFExportServiceNew.formatHours(totals.overtimeHours)} (${overtimePercent}%)</strong></td>
        <td class="travel-rate-col"><strong>€${totals.travelRate.toFixed(2)}</strong></td>
        <td class="standby-allowance-col"><strong>€${totals.standbyAllowance.toFixed(2)}</strong></td>
        <td class="interventions-col">-</td>
        <td class="standby-earnings-col"><strong>€${totals.standbyEarnings.toFixed(2)}</strong></td>
        <td class="total-earnings-col"><strong>€${totals.totalEarnings.toFixed(2)}</strong></td>
        <td class="meal-details-col"><strong>€${totals.mealVouchers.toFixed(2)}</strong></td>
      </tr>
    `;

    return rows.join('') + totalsRow;
  }

  // Genera HTML completo del PDF
  static generateHTML(monthlyData, entries, settings, monthName, year, calculationService = null) {
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Lavoro - ${monthName} ${year}</title>
        ${PDFExportServiceNew.generatePDFStyles()}
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          <h1>📋 Report Mensile Ore Lavoro - ${monthName} ${year}</h1>
          <div class="subtitle">Dettaglio completo con breakdown orari e guadagni</div>
        </div>

        <!-- TABELLA REGISTRAZIONI -->
        <table class="work-entries-table">
          <thead>
            <tr>
              <th class="date-col">Data Giorno</th>
              <th class="site-col">Sito</th>
              <th class="vehicle-col">Veicolo/Targa</th>
              <th class="drive-info-col">Info Guida</th>
              <th class="shift-times-col">Orari Turni</th>
              <th class="total-travel-col">Totale Viaggi</th>
              <th class="total-work-col">Totale Ore Lavoro</th>
              <th class="extra-travel-col">Viaggio Extra</th>
              <th class="overtime-col">Straordinari (totale ore e percentuale)</th>
              <th class="travel-rate-col">Tariffa Trasferta</th>
              <th class="standby-allowance-col">Indennità Reperibilità</th>
              <th class="interventions-col">Orari Interventi Reperibilità (compreso viaggio)</th>
              <th class="standby-earnings-col">Guadagno da Reperibilità Compreso di Viaggio</th>
              <th class="total-earnings-col">Totale Guadagno Giornata</th>
              <th class="meal-details-col">Rimborso Pasti Dettagliato Bonus e Cash</th>
            </tr>
          </thead>
          <tbody>
            ${PDFExportServiceNew.generateWorkEntriesRows(entries, calculationService, settings)}
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <p>Report generato automaticamente il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
          <p>Sistema di tracking ore lavoro - CCNL Metalmeccanico PMI</p>
        </div>
      </body>
      </html>
    `;
  }

  // Genera e esporta PDF
  static async generateAndExportPDF(monthlyData, entries, settings, monthName, year, calculationService = null) {
    try {
      console.log('🔄 Generazione PDF con nuovo servizio:', {
        monthName,
        year,
        entriesCount: entries?.length || 0
      });

      const html = PDFExportServiceNew.generateHTML(monthlyData, entries, settings, monthName, year, calculationService);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        height: 842, // A4 height
        width: 1191, // A4 landscape width
      });

      const fileName = `report_lavoro_${monthName}_${year}.pdf`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Condividi ${fileName}`,
          UTI: 'com.adobe.pdf'
        });
      }

      console.log('✅ PDF generato ed esportato con successo:', fileName);
      return { success: true, uri, fileName };
      
    } catch (error) {
      console.error('❌ Errore durante la generazione del PDF:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PDFExportServiceNew;
