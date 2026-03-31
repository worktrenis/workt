import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils';

class FormPrintService {
  static async generateFormPDF(formData, calculationResults) {
    try {
      console.log('📄 FORM PRINT - Generazione PDF form in corso...');
      
      // Formattiamo i dati per la stampa
      const formattedData = this.formatFormData(formData, calculationResults);
      
      // Generiamo l'HTML per il PDF
      const htmlContent = this.generateFormHTML(formattedData);
      
      // Creiamo il PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // Generiamo nome file
      let dateStr;
      try {
        const date = formData.date || new Date();
        // Se è già una stringa in formato YYYY-MM-DD, usala direttamente
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateStr = date;
        } else {
          // Altrimenti prova a parsarla come Date
          dateStr = new Date(date).toISOString().split('T')[0];
        }
      } catch (dateError) {
        console.warn('❌ FORM PRINT - Errore parsing data, usando data corrente:', dateError);
        dateStr = new Date().toISOString().split('T')[0];
      }
      const fileName = `Inserimento_${dateStr}.pdf`;
      
      // Condividiamo il PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Stampa Inserimento - ${dateStr}`,
          UTI: 'public.pdf'
        });
      }
      
      console.log('📄 FORM PRINT - PDF generato e condiviso con successo');
      
      return {
        success: true,
        fileName,
        uri
      };
      
    } catch (error) {
      console.error('❌ FORM PRINT - Errore generazione PDF:', error);
      throw error;
    }
  }
  
  static formatFormData(formData, calculationResults) {
    const {
      date,
      ordinario,
      straordinario,
      viaggio,
      trasferta,
      standby,
      // Multi-turno
      turni = [],
      // Dettagli
      note,
      targa,
      // Calcoli
      totaleOre,
      importoGiornaliero
    } = formData;
    
    return {
      // Data e info generali
      data: new Date(date || new Date()).toLocaleDateString('it-IT'),
      giorno: new Date(date || new Date()).toLocaleDateString('it-IT', { 
        weekday: 'long' 
      }),
      
      // Ore di lavoro
      ordinario: {
        dalle: ordinario?.dalle || '',
        alle: ordinario?.alle || '',
        ore: ordinario?.ore || 0
      },
      
      straordinario: {
        dalle: straordinario?.dalle || '',
        alle: straordinario?.alle || '',
        ore: straordinario?.ore || 0
      },
      
      viaggio: {
        dalle: viaggio?.dalle || '',
        alle: viaggio?.alle || '',
        ore: viaggio?.ore || 0
      },
      
      trasferta: {
        attiva: !!trasferta?.attiva,
        importo: trasferta?.importo || 0
      },
      
      standby: {
        attivo: !!standby?.attivo,
        dalle: standby?.dalle || '',
        alle: standby?.alle || '',
        ore: standby?.ore || 0
      },
      
      // Multi-turno
      turni: turni.map(turno => ({
        tipo: turno.tipo || '',
        dalle: turno.dalle || '',
        alle: turno.alle || '',
        ore: turno.ore || 0
      })),
      
      // Dettagli
      note: note || '',
      targa: targa || '',
      
      // Totali
      totaleOre: totaleOre || 0,
      importoGiornaliero: importoGiornaliero || 0,
      
      // Calcoli dettagliati (se disponibili)
      calcoli: calculationResults || {}
    };
  }
  
  static generateFormHTML(data) {
    const hasTurni = data.turni && data.turni.length > 0;
    const hasStandby = data.standby.attivo;
    const hasTrasferta = data.trasferta.attiva;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Inserimento Ore di Lavoro - ${data.data}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
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
            margin: 0;
            color: #2196F3;
            font-size: 24px;
            font-weight: bold;
          }
          
          .header .subtitle {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
          }
          
          .info-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2196F3;
          }
          
          .info-card h3 {
            margin: 0 0 10px 0;
            color: #2196F3;
            font-size: 14px;
            font-weight: bold;
          }
          
          .time-section {
            margin-bottom: 20px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .time-section-header {
            background: #f5f5f5;
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
            font-weight: bold;
            color: #333;
          }
          
          .time-section-content {
            padding: 15px;
          }
          
          .time-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
          }
          
          .time-row:last-child {
            margin-bottom: 0;
          }
          
          .time-field {
            text-align: center;
          }
          
          .time-field label {
            display: block;
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
            font-size: 11px;
          }
          
          .time-field .value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
          }
          
          .turni-section {
            margin-bottom: 20px;
          }
          
          .turno-item {
            background: #fff3e0;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 6px;
            border-left: 3px solid #ff9800;
          }
          
          .totali-section {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 2px solid #4caf50;
          }
          
          .totali-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .totale-item {
            text-align: center;
          }
          
          .totale-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .totale-item .value {
            font-size: 18px;
            font-weight: bold;
            color: #4caf50;
          }
          
          .note-section {
            margin-top: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #9c27b0;
          }
          
          .note-section h3 {
            margin: 0 0 10px 0;
            color: #9c27b0;
            font-size: 14px;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 10px;
          }
          
          @media print {
            body { margin: 0; padding: 15px; }
            .time-section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <h1>📋 Inserimento Ore di Lavoro</h1>
          <div class="subtitle">${data.data} - ${data.giorno}</div>
        </div>
        
        <!-- Informazioni generali -->
        <div class="info-grid">
          <div class="info-card">
            <h3>📅 Data</h3>
            <div>${data.data} (${data.giorno})</div>
          </div>
          ${data.targa ? `
          <div class="info-card">
            <h3>🚗 Targa</h3>
            <div>${data.targa}</div>
          </div>
          ` : ''}
        </div>
        
        <!-- Ore ordinarie -->
        ${data.ordinario.ore > 0 ? `
        <div class="time-section">
          <div class="time-section-header">🕐 Ore Ordinarie</div>
          <div class="time-section-content">
            <div class="time-row">
              <div class="time-field">
                <label>Dalle</label>
                <div class="value">${data.ordinario.dalle}</div>
              </div>
              <div class="time-field">
                <label>Alle</label>
                <div class="value">${data.ordinario.alle}</div>
              </div>
              <div class="time-field">
                <label>Ore</label>
                <div class="value">${data.ordinario.ore.toFixed(2)}h</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Ore straordinarie -->
        ${data.straordinario.ore > 0 ? `
        <div class="time-section">
          <div class="time-section-header">⏰ Ore Straordinarie</div>
          <div class="time-section-content">
            <div class="time-row">
              <div class="time-field">
                <label>Dalle</label>
                <div class="value">${data.straordinario.dalle}</div>
              </div>
              <div class="time-field">
                <label>Alle</label>
                <div class="value">${data.straordinario.alle}</div>
              </div>
              <div class="time-field">
                <label>Ore</label>
                <div class="value">${data.straordinario.ore.toFixed(2)}h</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Ore viaggio -->
        ${data.viaggio.ore > 0 ? `
        <div class="time-section">
          <div class="time-section-header">🚗 Ore Viaggio</div>
          <div class="time-section-content">
            <div class="time-row">
              <div class="time-field">
                <label>Dalle</label>
                <div class="value">${data.viaggio.dalle}</div>
              </div>
              <div class="time-field">
                <label>Alle</label>
                <div class="value">${data.viaggio.alle}</div>
              </div>
              <div class="time-field">
                <label>Ore</label>
                <div class="value">${data.viaggio.ore.toFixed(2)}h</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Multi-turno -->
        ${hasTurni ? `
        <div class="time-section">
          <div class="time-section-header">⚡ Turni Aggiuntivi</div>
          <div class="time-section-content">
            ${data.turni.map((turno, index) => `
              <div class="turno-item">
                <strong>Turno ${index + 1}</strong> - ${turno.tipo}<br>
                ${turno.dalle} → ${turno.alle} (${turno.ore.toFixed(2)}h)
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Standby -->
        ${hasStandby ? `
        <div class="time-section">
          <div class="time-section-header">📞 Standby</div>
          <div class="time-section-content">
            <div class="time-row">
              <div class="time-field">
                <label>Dalle</label>
                <div class="value">${data.standby.dalle}</div>
              </div>
              <div class="time-field">
                <label>Alle</label>
                <div class="value">${data.standby.alle}</div>
              </div>
              <div class="time-field">
                <label>Ore</label>
                <div class="value">${data.standby.ore.toFixed(2)}h</div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Trasferta -->
        ${hasTrasferta ? `
        <div class="time-section">
          <div class="time-section-header">✈️ Trasferta</div>
          <div class="time-section-content">
            <div style="text-align: center;">
              <strong>Importo: ${formatCurrency(data.trasferta.importo)}</strong>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Totali -->
        <div class="totali-section">
          <div class="totali-grid">
            <div class="totale-item">
              <div class="label">Totale Ore</div>
              <div class="value">${data.totaleOre.toFixed(2)}h</div>
            </div>
            <div class="totale-item">
              <div class="label">Importo Giornaliero</div>
              <div class="value">${formatCurrency(data.importoGiornaliero)}</div>
            </div>
          </div>
        </div>
        
        <!-- Note -->
        ${data.note ? `
        <div class="note-section">
          <h3>📝 Note</h3>
          <div>${data.note}</div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
          Generato il ${new Date().toLocaleString('it-IT')} - WorkTracker App
        </div>
      </body>
      </html>
    `;
  }
}

export default FormPrintService;
