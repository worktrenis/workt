import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatDate, formatTime, formatCurrency, getDayName } from '../utils';

class ComprehensivePDFService {
  /**
   * Formatta le ore in formato leggibile
   */
  static formatHours(hours) {
    if (!hours && hours !== 0) return '0:00';
    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Formatta la data in italiano
   */
  static formatDateIT(date) {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
  }

  /**
   * Genera gli stili CSS per il PDF
   */
  static generateStyles() {
    return `
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
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
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #1976D2;
        }
        
        .header h1 {
          font-size: 22px;
          color: #1976D2;
          margin-bottom: 8px;
          font-weight: 700;
        }
        
        .header .period {
          font-size: 16px;
          color: #666;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .header .generated {
          font-size: 10px;
          color: #999;
        }
        
        .summary-section {
          margin-bottom: 25px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .summary-title {
          font-size: 14px;
          font-weight: 600;
          color: #1976D2;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        
        .summary-item {
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 6px;
          border: 1px solid #dee2e6;
        }
        
        .summary-value {
          font-size: 16px;
          font-weight: 700;
          color: #1976D2;
          display: block;
        }
        
        .summary-label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-top: 2px;
        }
        
        .entries-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1976D2;
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e9ecef;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .entry-card {
          margin-bottom: 15px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          page-break-inside: avoid;
        }
        
        .entry-header {
          padding: 12px 15px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .entry-date {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }
        
        .entry-type {
          color: #666;
          font-size: 11px;
          font-weight: 500;
        }
        
        .entry-total {
          font-size: 12px;
          font-weight: 600;
          color: #1976D2;
        }
        
        .entry-content {
          padding: 15px;
        }
        
        .entry-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .entry-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px dotted #e9ecef;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-size: 10px;
          color: #666;
          font-weight: 500;
        }
        
        .detail-value {
          font-size: 11px;
          color: #333;
          font-weight: 600;
        }
        
        .breakdown-section {
          margin-top: 15px;
          padding-top: 12px;
          border-top: 2px solid #f8f9fa;
        }
        
        .breakdown-title {
          font-size: 12px;
          font-weight: 600;
          color: #1976D2;
          margin-bottom: 8px;
        }
        
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .breakdown-item {
          padding: 6px 8px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
          text-align: center;
        }
        
        .breakdown-item-title {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          margin-bottom: 2px;
        }
        
        .breakdown-item-value {
          font-size: 11px;
          font-weight: 600;
          color: #333;
        }
        
        .breakdown-item-earnings {
          font-size: 10px;
          color: #28a745;
          font-weight: 500;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e9ecef;
          text-align: center;
          font-size: 10px;
          color: #999;
        }
        
        .no-entries {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        
        @media print {
          .entry-card {
            page-break-inside: avoid;
          }
          .summary-section {
            page-break-after: avoid;
          }
        }
      </style>
    `;
  }

  /**
   * Genera il riepilogo mensile
   */
  static generateSummarySection(monthlyData) {
    const totalHours = monthlyData.totalHours || 0;
    const totalEarnings = monthlyData.totalEarnings || 0;
    const daysWorked = monthlyData.daysWorked || 0;
    const overtimeHours = (monthlyData.ordinary?.hours?.lavoro_extra || 0) + 
                         (monthlyData.ordinary?.hours?.viaggio_extra || 0);

    return `
      <div class="summary-section">
        <div class="summary-title">Riepilogo Mensile</div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-value">${this.formatHours(totalHours)}</span>
            <span class="summary-label">Ore Totali</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${formatCurrency(totalEarnings)}</span>
            <span class="summary-label">Guadagno Lordo</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${daysWorked}</span>
            <span class="summary-label">Giorni Lavorati</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">${this.formatHours(overtimeHours)}</span>
            <span class="summary-label">Straordinari</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera il breakdown dettagliato per una registrazione
   */
  static generateBreakdownSection(breakdown) {
    if (!breakdown || typeof breakdown !== 'object') {
      return '';
    }

    let breakdownItems = '';

    // Breakdown ore
    if (breakdown.hours) {
      Object.entries(breakdown.hours).forEach(([key, value]) => {
        if (value > 0) {
          const label = this.getBreakdownLabel(key);
          breakdownItems += `
            <div class="breakdown-item">
              <div class="breakdown-item-title">${label}</div>
              <div class="breakdown-item-value">${this.formatHours(value)}</div>
            </div>
          `;
        }
      });
    }

    // Breakdown guadagni
    if (breakdown.earnings) {
      Object.entries(breakdown.earnings).forEach(([key, value]) => {
        if (value > 0) {
          const label = this.getBreakdownLabel(key);
          breakdownItems += `
            <div class="breakdown-item">
              <div class="breakdown-item-title">${label}</div>
              <div class="breakdown-item-earnings">${formatCurrency(value)}</div>
            </div>
          `;
        }
      });
    }

    if (!breakdownItems) {
      return '';
    }

    return `
      <div class="breakdown-section">
        <div class="breakdown-title">📊 Breakdown Dettagliato</div>
        <div class="breakdown-grid">
          ${breakdownItems}
        </div>
      </div>
    `;
  }

  /**
   * Ottiene l'etichetta per il breakdown
   */
  static getBreakdownLabel(key) {
    const labels = {
      lavoro_ordinario: 'Lavoro Ordinario',
      lavoro_extra: 'Straordinari Lavoro',
      viaggio_ordinario: 'Viaggio Ordinario',
      viaggio_extra: 'Straordinari Viaggio',
      reperibilita: 'Reperibilità',
      indennita_trasferta: 'Indennità Trasferta',
      rimborso_km: 'Rimborso KM',
      buoni_pasto: 'Buoni Pasto',
      rimborsi_vari: 'Rimborsi Vari',
      maggiorazione_notturna: 'Maggiorazione Notturna',
      maggiorazione_festiva: 'Maggiorazione Festiva',
      maggiorazione_domenicale: 'Maggiorazione Domenicale'
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Genera il contenuto dettagliato per una registrazione
   */
  static generateEntryContent(entry) {
    return `
      <div class="entry-content">
        <div class="entry-grid">
          <div class="entry-column">
            <div class="detail-row">
              <span class="detail-label">🕐 Ora Inizio:</span>
              <span class="detail-value">${entry.start_time || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🕐 Ora Fine:</span>
              <span class="detail-value">${entry.end_time || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">⏱️ Ore Lavoro:</span>
              <span class="detail-value">${this.formatHours(entry.work_hours || 0)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🚗 Ore Viaggio:</span>
              <span class="detail-value">${this.formatHours(entry.travel_hours || 0)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📞 Reperibilità:</span>
              <span class="detail-value">${this.formatHours(entry.standby_hours || 0)}</span>
            </div>
          </div>
          
          <div class="entry-column">
            <div class="detail-row">
              <span class="detail-label">🏢 Cliente/Cantiere:</span>
              <span class="detail-value">${entry.client || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🔧 Attività:</span>
              <span class="detail-value">${entry.activity || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📍 Luogo:</span>
              <span class="detail-value">${entry.location || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🚗 KM Percorsi:</span>
              <span class="detail-value">${entry.km_traveled || 0} km</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💰 Guadagno:</span>
              <span class="detail-value">${formatCurrency(entry.total_earnings || 0)}</span>
            </div>
          </div>
        </div>
        
        ${entry.notes ? `
          <div class="detail-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e9ecef;">
            <span class="detail-label">📝 Note:</span>
            <span class="detail-value">${entry.notes}</span>
          </div>
        ` : ''}
        
        ${this.generateBreakdownSection(entry.breakdown)}
      </div>
    `;
  }

  /**
   * Genera una singola card per registrazione
   */
  static generateEntryCard(entry) {
    const date = this.formatDateIT(entry.date);
    const dayType = this.getDayType(entry);
    const totalHours = (entry.work_hours || 0) + (entry.travel_hours || 0) + (entry.standby_hours || 0);

    return `
      <div class="entry-card">
        <div class="entry-header">
          <div>
            <div class="entry-date">${date}</div>
            <div class="entry-type">${dayType}</div>
          </div>
          <div class="entry-total">
            ${this.formatHours(totalHours)} | ${formatCurrency(entry.total_earnings || 0)}
          </div>
        </div>
        ${this.generateEntryContent(entry)}
      </div>
    `;
  }

  /**
   * Determina il tipo di giorno
   */
  static getDayType(entry) {
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    
    if (entry.is_holiday) return '🎉 Giorno Festivo';
    if (dayOfWeek === 0) return '☀️ Domenica';
    if (dayOfWeek === 6) return '🏖️ Sabato';
    return '📅 Giorno Ordinario';
  }

  /**
   * Genera il PDF completo
   */
  static async generateMonthlyReport(workEntries, monthlyData, month, year) {
    try {
      console.log('📄 PDF SERVICE - Generazione report mensile iniziata');
      console.log(`📊 Dati: ${workEntries.length} registrazioni, mese ${month}/${year}`);

      const monthName = new Date(year, month - 1).toLocaleDateString('it-IT', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Ordina le registrazioni per data
      const sortedEntries = workEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      let entriesHTML = '';
      if (sortedEntries.length === 0) {
        entriesHTML = `
          <div class="no-entries">
            <h3>📅 Nessuna registrazione trovata</h3>
            <p>Non ci sono registrazioni per il mese di ${monthName}</p>
          </div>
        `;
      } else {
        entriesHTML = `
          <div class="entries-section">
            <div class="section-title">📋 Registrazioni del Mese (${sortedEntries.length})</div>
            ${sortedEntries.map(entry => this.generateEntryCard(entry)).join('')}
          </div>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Report Mensile - ${monthName}</title>
          ${this.generateStyles()}
        </head>
        <body>
          <div class="header">
            <h1>📊 WorkT - Report Mensile</h1>
            <div class="period">${monthName}</div>
            <div class="generated">Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</div>
          </div>
          
          ${this.generateSummarySection(monthlyData)}
          ${entriesHTML}
          
          <div class="footer">
            <p>Report generato da WorkT - Tracker Ore Lavoro v1.1.0</p>
            <p>Calcoli conformi al CCNL Metalmeccanico PMI</p>
          </div>
        </body>
        </html>
      `;

      console.log('📄 PDF SERVICE - HTML generato, avvio stampa...');

      // Genera il PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595,  // A4 width in points
        height: 842, // A4 height in points
        margin: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        }
      });

      console.log('✅ PDF SERVICE - PDF generato con successo:', uri);

      // Condividi il PDF
      if (await Sharing.isAvailableAsync()) {
        const fileName = `WorkT_Report_${year}_${month.toString().padStart(2, '0')}.pdf`;
        
        // Copia il file con un nome più descrittivo
        const newUri = FileSystem.documentDirectory + fileName;
        await FileSystem.copyAsync({
          from: uri,
          to: newUri
        });

        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Report Mensile ${monthName}`,
          UTI: 'com.adobe.pdf'
        });

        console.log('✅ PDF SERVICE - PDF condiviso con successo');
        return { success: true, uri: newUri };
      } else {
        console.log('⚠️ PDF SERVICE - Sharing non disponibile');
        return { success: true, uri, message: 'PDF generato ma sharing non disponibile' };
      }

    } catch (error) {
      console.error('❌ PDF SERVICE - Errore generazione PDF:', error);
      throw new Error(`Errore nella generazione del PDF: ${error.message}`);
    }
  }
}

export default ComprehensivePDFService;
