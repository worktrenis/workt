import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { formatCurrency, formatDate } from '../utils';

/**
 * Servizio PDF COMPLETO che replica esattamente tutto il TimeEntryForm
 * Include tutti i dettagli, breakdown e calcoli mostrati nel form
 */
class ComprehensivePDFService {
  
  /**
   * Formatta le ore in formato HH:MM
   */
  static formatHours(hours) {
    if (!hours || hours === 0) return '0:00';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Formatta la valuta
   */
  static formatCurrency(amount) {
    if (!amount) return '0,00';
    return amount.toFixed(2).replace('.', ',');
  }

  /**
   * Formatta la data in italiano
   */
  static formatDateIT(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      // Se è nel formato dd/MM/yyyy lo convertiamo
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('it-IT', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      // Altrimenti proviamo a fare il parse diretto
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Genera gli stili CSS completi per il PDF
   */
  static generateStyles() {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.4;
          color: #333;
          background: #f8f9fa;
          padding: 0;
        }
        
        .header {
          background: linear-gradient(135deg, #1976d2, #42a5f5);
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .period {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .generated {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .summary-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin: 0 15px 20px 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .summary-title {
          font-size: 18px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 15px;
          text-align: center;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        
        .summary-item {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .summary-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #1976d2;
          margin-bottom: 4px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }
        
        .entries-section {
          margin: 0 15px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 15px;
          padding: 0 5px;
        }
        
        .entry-card {
          background: white;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #4caf50;
          overflow: hidden;
        }
        
        .entry-header {
          background: #f8f9fa;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e9ecef;
        }
        
        .entry-date {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }
        
        .entry-type {
          font-size: 12px;
          color: #666;
          background: #e3f2fd;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }
        
        .entry-total {
          text-align: right;
          font-size: 14px;
          font-weight: 600;
          color: #4caf50;
        }
        
        .entry-content {
          padding: 20px;
        }
        
        .entry-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
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
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .detail-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          flex: 1;
        }
        
        .detail-value {
          font-size: 12px;
          color: #333;
          font-weight: 600;
          text-align: right;
          flex: 1;
        }
        
        .breakdown-section {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #e9ecef;
        }
        
        .breakdown-title {
          font-size: 14px;
          font-weight: 600;
          color: #1976d2;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .total-summary {
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
        }
        
        .total-icon {
          font-size: 24px;
          margin-right: 15px;
        }
        
        .total-content {
          flex: 1;
        }
        
        .total-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .total-amount {
          font-size: 20px;
          font-weight: 700;
          color: #4caf50;
          margin-bottom: 2px;
        }
        
        .total-hours {
          font-size: 11px;
          color: #666;
        }
        
        .breakdown-item {
          background: #fafafa;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          border-left: 3px solid #2196f3;
        }
        
        .breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .breakdown-label {
          font-size: 12px;
          color: #333;
          font-weight: 500;
          flex: 1;
        }
        
        .breakdown-value {
          font-size: 12px;
          color: #1976d2;
          font-weight: 600;
          text-align: right;
          min-width: 60px;
        }
        
        .breakdown-detail {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
          font-style: italic;
        }
        
        .breakdown-subitem {
          background: #ffffff;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 8px 0;
          border-left: 2px solid #4caf50;
          margin-left: 15px;
        }
        
        .fascia-color {
          width: 12px;
          height: 12px;
          border-radius: 6px;
          margin-right: 8px;
          display: inline-block;
        }
        
        .fascia-calc {
          font-family: 'Courier New', monospace;
          background: #f0f8ff;
          padding: 4px 8px;
          border-radius: 4px;
          margin-top: 4px;
        }
        
        .breakdown-total-row {
          background: #e8f5e8;
          border-radius: 6px;
          padding: 10px;
          margin-top: 12px;
          border: 1px solid #4caf50;
        }
        
        .breakdown-total {
          font-size: 13px;
          font-weight: 700;
          color: #4caf50;
        }
        
        .multi-fascia {
          border-left-color: #2196f3;
        }
        
        .daily-rate {
          border-left-color: #ff9800;
        }
        
        .prime-ore {
          background: #f0f8ff;
          border-left-color: #1976d2;
        }
        
        .prime-hours {
          color: #1976d2;
          font-weight: bold;
        }
        
        .supplement-title {
          margin: 12px 10px 8px 10px;
          font-weight: 600;
          color: #333;
        }
        
        .supplement-item {
          border-left-color: #ff9800;
        }
        
        .supplement-total {
          background: #f0f8ff;
          border-left-color: #1976d2;
        }
        
        .supplement-amount {
          color: #1976d2;
          font-weight: bold;
        }
        
        .overtime-title {
          margin: 12px 10px 8px 10px;
          font-weight: 600;
          color: #333;
        }
        
        .overtime-item {
          border-left-color: #9c27b0;
        }
        
        .sub-breakdown {
          margin-top: 6px;
          margin-left: 20px;
        }
        
        .breakdown-sub-detail {
          font-size: 10px;
          color: #666;
          margin: 2px 0;
          padding: 2px 6px;
          background: #f8f9fa;
          border-radius: 3px;
        }
        
        .ordinary-breakdown {
          border-left-color: #4caf50;
        }
        
        .standby-breakdown {
          border-left-color: #ff9800;
        }
        
        .travel-breakdown {
          border-left-color: #2196f3;
        }
        
        .meals-breakdown {
          border-left-color: #9c27b0;
        }
        
        .breakdown-category {
          font-weight: 600;
          color: #333;
          margin: 8px 0 4px 0;
          padding: 8px 12px;
          background: #f0f0f0;
          border-radius: 6px;
        }
        
        .breakdown-empty {
          text-align: center;
          color: #999;
          font-style: italic;
          padding: 20px;
        }
        
        .footer {
          margin-top: 30px;
          padding: 20px;
          border-top: 2px solid #e9ecef;
          text-align: center;
          font-size: 10px;
          color: #999;
          background: #f8f9fa;
        }
        
        .no-entries {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
          background: white;
          border-radius: 12px;
          margin: 0 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
   * Genera il breakdown dettagliato degli earnings per una voce - COMPLETO COME NEL TIMEENTRYFORM
   */
  static generateEarningsBreakdown(breakdown, entry) {
    if (!breakdown) {
      return '<div class="breakdown-section"><p class="breakdown-empty">Nessun calcolo disponibile</p></div>';
    }

    let html = '<div class="breakdown-section">';
    html += '<h4 class="breakdown-title">📊 Riepilogo Guadagni</h4>';

    // Totale principale (come nel TimeEntryForm)
    const totalAmount = breakdown.total || 0;
    const totalHours = breakdown.totalHours || 0;
    html += `
      <div class="total-summary">
        <div class="total-icon">💰</div>
        <div class="total-content">
          <div class="total-label">Totale Giornata</div>
          <div class="total-amount">€${this.formatCurrency(totalAmount)}</div>
          <div class="total-hours">⏱️ ${this.formatHours(totalHours)} ore totali</div>
        </div>
      </div>
    `;

    // 🕐 Sistema Multi-Fascia (se attivo)
    if (breakdown?.details?.hourlyRatesMethod === 'hourly_rates_service' && breakdown?.details?.hourlyRatesBreakdown) {
      html += `
        <div class="breakdown-item multi-fascia">
          <div class="breakdown-row">
            <span class="breakdown-label"><strong>🕐 Sistema Multi-Fascia Attivo</strong></span>
            <span class="breakdown-value">CCNL</span>
          </div>
          <div class="breakdown-detail">Calcolo automatico basato su fasce orarie personalizzate secondo CCNL</div>
          
          <!-- Prime 8 ore cronologiche -->
          <div class="breakdown-subitem prime-ore">
            <div class="breakdown-row">
              <span class="breakdown-label"><strong>Prime 8 ore cronologiche</strong></span>
              <span class="breakdown-value prime-hours">${this.formatHours(Math.min(8, (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0)))}</span>
            </div>
            <div class="breakdown-detail">
              ${(() => {
                let details = [];
                if (breakdown.ordinary?.hours?.lavoro_giornaliera > 0) {
                  details.push(`Lavoro ${this.formatHours(breakdown.ordinary.hours.lavoro_giornaliera)}`);
                }
                if (breakdown.ordinary?.hours?.viaggio_giornaliera > 0) {
                  details.push(`Viaggio ${this.formatHours(breakdown.ordinary.hours.viaggio_giornaliera)}`);
                }
                return details.length > 0 ? details.join(' + ') : 'Prime 8 ore lavorative';
              })()}
            </div>
          </div>

          <!-- Dettaglio fasce orarie -->
          ${breakdown.details.hourlyRatesBreakdown.map((fascia, index) => `
            <div class="breakdown-subitem fascia-item">
              <div class="breakdown-row">
                <div style="display: flex; align-items: center; flex: 1;">
                  <div class="fascia-color" style="background-color: ${fascia.color || '#2196F3'};"></div>
                  <span class="breakdown-label">${fascia.name} ${fascia.periodLabel ? `(${fascia.periodLabel})` : ''}</span>
                </div>
                <span class="breakdown-value">${this.formatHours(fascia.hours)}</span>
              </div>
              <div class="breakdown-detail fascia-calc">
                €${(fascia.hourlyRate || 0).toFixed(2).replace('.', ',')} x ${this.formatHours(fascia.hours)} = €${(fascia.earnings || 0).toFixed(2).replace('.', ',')}
                ${fascia.rate !== 1.0 ? ` (${Math.round((fascia.rate - 1) * 100)}% maggiorazione)` : ''}
              </div>
            </div>
          `).join('')}
          
          <div class="breakdown-total-row">
            <span class="breakdown-label">Totale Multi-Fascia</span>
            <span class="breakdown-total">€${this.formatCurrency(breakdown?.ordinary?.total || 0)}</span>
          </div>
        </div>
      `;
    }

    // 📊 Breakdown tariffa giornaliera (se metodo DAILY_RATE_WITH_SUPPLEMENTS attivo)
    if (breakdown?.details?.calculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS' && breakdown?.details?.dailyRateBreakdown) {
      const drb = breakdown.details.dailyRateBreakdown;
      html += `
        <div class="breakdown-item daily-rate">
          <div class="breakdown-row">
            <span class="breakdown-label"><strong>📊 Tariffa Giornaliera + Maggiorazioni CCNL</strong></span>
            <span class="breakdown-value">${drb.isWeekday ? 'Feriale' : 'Festivo'}</span>
          </div>
          <div class="breakdown-detail">
            ${drb.isWeekday ? 
              'Conforme CCNL: tariffa giornaliera + supplementi per fasce nelle prime 8h' :
              'Giorni festivi: calcolo orario con maggiorazioni speciali'
            }
          </div>
          
          ${drb.isWeekday && drb.dailyRate > 0 ? `
            <!-- Tariffa giornaliera base -->
            <div class="breakdown-subitem daily-base">
              <div class="breakdown-row">
                <span class="breakdown-label">Tariffa Giornaliera Base (prime 8h)</span>
                <span class="breakdown-value">€${drb.dailyRate.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="breakdown-detail">
                ${(() => {
                  let details = [];
                  if (breakdown.ordinary?.hours?.lavoro_giornaliera > 0) {
                    details.push(`Lavoro ${this.formatHours(breakdown.ordinary.hours.lavoro_giornaliera)}`);
                  }
                  if (breakdown.ordinary?.hours?.viaggio_giornaliera > 0) {
                    details.push(`Viaggio ${this.formatHours(breakdown.ordinary.hours.viaggio_giornaliera)}`);
                  }
                  return details.length > 0 ? details.join(' + ') : 'Prime 8 ore lavorative';
                })()}
              </div>
            </div>
          ` : ''}
          
          ${drb.regularBreakdown && drb.regularBreakdown.length > 0 && drb.supplements > 0 ? `
            <!-- Supplementi prime 8 ore -->
            <div class="breakdown-supplements">
              <div class="breakdown-label supplement-title"><strong>Supplementi Prime 8 Ore per Fascia:</strong></div>
              ${drb.regularBreakdown.map((regular, index) => `
                <div class="breakdown-subitem supplement-item">
                  <div class="breakdown-row">
                    <div style="display: flex; align-items: center; flex: 1;">
                      <div class="fascia-color" style="background-color: ${regular.period && regular.period.includes('Notturno') ? '#9C27B0' : 
                                     regular.period && regular.period.includes('Serale') ? '#FF9800' : '#4CAF50'};"></div>
                      <span class="breakdown-label">${regular.timeRange || regular.period || 'Periodo di lavoro'}</span>
                    </div>
                    <span class="breakdown-value">${this.formatHours(regular.totalHours || regular.hours)}</span>
                  </div>
                  
                  ${regular.breakdown && regular.breakdown.length > 0 ? `
                    <div class="sub-breakdown">
                      ${regular.breakdown.map(subItem => `
                        <div class="breakdown-sub-detail">
                          ${subItem.type}: ${this.formatHours(subItem.hours)} ${subItem.rate > 0 ? 
                            `(+${Math.round(subItem.rate * 100)}%) = €${subItem.amount.toFixed(2).replace('.', ',')}` :
                            '(nessun supplemento)'
                          }
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="breakdown-detail">
                      ${regular.timeRange || regular.period} • ${regular.supplementAmount > 0 ? 
                        `Supplemento: €${regular.supplementAmount.toFixed(2).replace('.', ',')} (+${Math.round(regular.supplement * 100)}%)` :
                        'Nessun supplemento (fascia diurna)'
                      }
                    </div>
                  `}
                </div>
              `).join('')}
              
              ${drb.supplements > 0 ? `
                <div class="breakdown-subitem supplement-total">
                  <div class="breakdown-row">
                    <span class="breakdown-label"><strong>Totale Supplementi Prime 8h</strong></span>
                    <span class="breakdown-value supplement-amount">+€${drb.supplements.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="breakdown-detail">Supplementi aggiuntivi alle prime 8 ore lavorative</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${drb.overtimeBreakdown && drb.overtimeBreakdown.length > 0 && drb.overtimeHours > 0 ? `
            <!-- Straordinari oltre 8h -->
            <div class="breakdown-overtime">
              <div class="breakdown-label overtime-title"><strong>Straordinari (oltre 8h) per Fascia:</strong></div>
              ${drb.overtimeBreakdown.map((overtime, index) => `
                <div class="breakdown-subitem overtime-item">
                  <div class="breakdown-row">
                    <div style="display: flex; align-items: center; flex: 1;">
                      <div class="fascia-color" style="background-color: ${overtime.period && overtime.period.includes('Notturno') ? '#9C27B0' : 
                                     overtime.period && overtime.period.includes('Serale') ? '#FF9800' : '#4CAF50'};"></div>
                      <span class="breakdown-label">${overtime.timeRange || overtime.period || 'Periodo straordinario'}</span>
                    </div>
                    <span class="breakdown-value">${this.formatHours(
                      overtime.breakdown 
                        ? overtime.breakdown.reduce((sum, item) => sum + (item.hours || 0), 0)
                        : overtime.hours
                    )}</span>
                  </div>
                  ${overtime.breakdown ? `
                    <div class="sub-breakdown">
                      ${overtime.breakdown.map(subItem => `
                        <div class="breakdown-sub-detail">
                          ${subItem.type}: ${this.formatHours(subItem.hours)} 
                          (+${Math.round(subItem.rate * 100)}%) = €${subItem.amount.toFixed(2).replace('.', ',')}
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="breakdown-detail">
                      €${(overtime.hourlyRate || 0).toFixed(2).replace('.', ',')} x ${this.formatHours(overtime.hours)} 
                      (+${Math.round(((overtime.rate || 1) - 1) * 100)}%) = €${(overtime.earnings || 0).toFixed(2).replace('.', ',')}
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    // Breakdown per categoria (lavoro ordinario, reperibilità, viaggio, pasti)
    if (breakdown.ordinary) {
      html += this.generateOrdinaryBreakdown(breakdown.ordinary);
    }

    if (breakdown.standby) {
      html += this.generateStandbyBreakdown(breakdown.standby);
    }

    if (breakdown.travel) {
      html += this.generateTravelBreakdown(breakdown.travel);
    }

    if (breakdown.meals) {
      html += this.generateMealsBreakdown(breakdown.meals);
    }

    html += '</div>';
    return html;
  }

  /**
   * Genera il breakdown per lavoro ordinario
   */
  static generateOrdinaryBreakdown(ordinary) {
    if (!ordinary || (!ordinary.hours && !ordinary.earnings)) return '';

    let html = '<div class="breakdown-item ordinary-breakdown">';
    html += '<div class="breakdown-category">💼 Lavoro Ordinario</div>';

    if (ordinary.hours) {
      Object.entries(ordinary.hours).forEach(([key, value]) => {
        if (value > 0) {
          const earnings = ordinary.earnings?.[key] || 0;
          html += `
            <div class="breakdown-row">
              <span class="breakdown-label">${this.getBreakdownLabel(key)}</span>
              <span class="breakdown-value">${this.formatHours(value)} - €${this.formatCurrency(earnings)}</span>
            </div>
          `;
        }
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Genera il breakdown per reperibilità
   */
  static generateStandbyBreakdown(standby) {
    if (!standby || (!standby.hours && !standby.earnings)) return '';

    let html = '<div class="breakdown-item standby-breakdown">';
    html += '<div class="breakdown-category">📞 Reperibilità</div>';

    if (standby.workHours) {
      Object.entries(standby.workHours).forEach(([key, value]) => {
        if (value > 0) {
          const earnings = standby.workEarnings?.[key] || 0;
          html += `
            <div class="breakdown-row">
              <span class="breakdown-label">Lavoro ${this.getBreakdownLabel(key)}</span>
              <span class="breakdown-value">${this.formatHours(value)} - €${this.formatCurrency(earnings)}</span>
            </div>
          `;
        }
      });
    }

    if (standby.standbyHours) {
      Object.entries(standby.standbyHours).forEach(([key, value]) => {
        if (value > 0) {
          const earnings = standby.standbyEarnings?.[key] || 0;
          html += `
            <div class="breakdown-row">
              <span class="breakdown-label">Reperibilità ${this.getBreakdownLabel(key)}</span>
              <span class="breakdown-value">${this.formatHours(value)} - €${this.formatCurrency(earnings)}</span>
            </div>
          `;
        }
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Genera il breakdown per viaggio
   */
  static generateTravelBreakdown(travel) {
    if (!travel || (!travel.hours && !travel.earnings)) return '';

    let html = '<div class="breakdown-item travel-breakdown">';
    html += '<div class="breakdown-category">🚗 Viaggio</div>';

    if (travel.hours) {
      Object.entries(travel.hours).forEach(([key, value]) => {
        if (value > 0) {
          const earnings = travel.earnings?.[key] || 0;
          html += `
            <div class="breakdown-row">
              <span class="breakdown-label">${this.getBreakdownLabel(key)}</span>
              <span class="breakdown-value">${this.formatHours(value)} - €${this.formatCurrency(earnings)}</span>
            </div>
          `;
        }
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * Genera il breakdown per pasti
   */
  static generateMealsBreakdown(meals) {
    if (!meals || (!meals.vouchers && !meals.cash)) return '';

    let html = '<div class="breakdown-item meals-breakdown">';
    html += '<div class="breakdown-category">🍽️ Pasti</div>';

    if (meals.vouchers > 0) {
      html += `
        <div class="breakdown-row">
          <span class="breakdown-label">Buoni Pasto</span>
          <span class="breakdown-value">${meals.vouchers} buoni - €${this.formatCurrency(meals.vouchersValue || 0)}</span>
        </div>
      `;
    }

    if (meals.cash > 0) {
      html += `
        <div class="breakdown-row">
          <span class="breakdown-label">Rimborso Pasti</span>
          <span class="breakdown-value">€${this.formatCurrency(meals.cash)}</span>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Ottiene l'etichetta per il breakdown
   */
  static getBreakdownLabel(key) {
    const labels = {
      lavoro_ordinario: 'Lavoro Ordinario',
      lavoro_giornaliera: 'Lavoro Giornaliero',
      lavoro_extra: 'Straordinari Lavoro',
      viaggio_ordinario: 'Viaggio Ordinario', 
      viaggio_giornaliera: 'Viaggio Giornaliero',
      viaggio_extra: 'Straordinari Viaggio',
      reperibilita: 'Reperibilità',
      ordinary: 'Ordinario',
      evening: 'Serale',
      night: 'Notturno',
      saturday: 'Sabato',
      holiday: 'Festivo',
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
        <div class="summary-title">📊 Riepilogo Mensile</div>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-value">${this.formatHours(totalHours)}</span>
            <span class="summary-label">Ore Totali</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">€${this.formatCurrency(totalEarnings)}</span>
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
   * Genera una singola card per registrazione - COMPLETA CON TUTTI I DETTAGLI
   */
  static generateEntryCard(entry) {
    const date = this.formatDateIT(entry.date);
    const dayType = this.getDayType(entry);
    
    // 🔧 CORREZIONE: Usa sempre i valori già calcolati dalla dashboard
    // Il PDF deve mostrare esattamente gli stessi valori del dashboard
    const displayEarnings = entry.earnings || entry.total_earnings || 0;
    const workHours = parseFloat(entry.workHours || entry.work_hours || 0);
    const travelHours = parseFloat(entry.travelHours || entry.travel_hours || 0);
    const totalHours = workHours + travelHours;
    
    console.log(`📄 PDF Card ${entry.date}: ore=${totalHours}h (lavoro:${workHours}h, viaggio:${travelHours}h), guadagni=€${parseFloat(displayEarnings).toFixed(2)}`);

    return `
      <div class="entry-card">
        <div class="entry-header">
          <div>
            <div class="entry-date">${date}</div>
            <div class="entry-type">${dayType}</div>
          </div>
          <div class="entry-total">
            ${this.formatHours(totalHours)} | €${this.formatCurrency(parseFloat(displayEarnings))}
          </div>
        </div>
        ${this.generateEntryContent(entry)}
      </div>
    `;
  }

  /**
   * Genera il contenuto dettagliato per una registrazione - INCLUDE TUTTO DAL TIMEENTRYFORM
   */
  static generateEntryContent(entry) {
    // 🔧 CORREZIONE: Usa i valori già calcolati dalla dashboard
    const workHours = parseFloat(entry.workHours || entry.work_hours || 0);
    const travelHours = parseFloat(entry.travelHours || entry.travel_hours || 0);
    const totalHours = workHours + travelHours;

    return `
      <div class="entry-content">
        <div class="entry-grid">
          <div class="entry-column">
            <div class="detail-row">
              <span class="detail-label">📅 Data:</span>
              <span class="detail-value">${entry.date || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🚗 Veicolo:</span>
              <span class="detail-value">${this.getVehicleLabel(entry.veicolo)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🚗 Targa:</span>
              <span class="detail-value">${entry.targa_veicolo || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🏢 Cantiere:</span>
              <span class="detail-value">${entry.site_name || 'N/A'}</span>
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
              <span class="detail-value">${entry.reperibilita ? 'Attiva' : 'Non attiva'}</span>
            </div>
          </div>
          
          <div class="entry-column">
            <div class="detail-row">
              <span class="detail-label">🍽️ Pranzo:</span>
              <span class="detail-value">${entry.pranzo ? 'Sì' : 'No'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🍽️ Cena:</span>
              <span class="detail-value">${entry.cena ? 'Sì' : 'No'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">✈️ Trasferta:</span>
              <span class="detail-value">${entry.trasferta ? 'Sì' : 'No'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🔧 Completamento:</span>
              <span class="detail-value">${this.getCompletamentoLabel(entry.completamentoGiornata)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💰 Guadagno Totale:</span>
              <span class="detail-value">€${this.formatCurrency(entry.total_earnings || 0)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">⏰ Ore Totali:</span>
              <span class="detail-value">${this.formatHours(totalHours)}</span>
            </div>
          </div>
        </div>
        
        ${entry.notes ? `
          <div class="detail-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
            <span class="detail-label">📝 Note:</span>
            <span class="detail-value">${entry.notes}</span>
          </div>
        ` : ''}
        
        ${this.generateEarningsBreakdown(entry.breakdown, entry)}
      </div>
    `;
  }

  /**
   * Ottiene l'etichetta per il veicolo
   */
  static getVehicleLabel(veicolo) {
    const labels = {
      'andata_ritorno': '🚗 Andata e Ritorno',
      'solo_andata': '🚗 Solo Andata',
      'solo_ritorno': '🚗 Solo Ritorno',
      'non_guidato': '🚌 Non Guidato'
    };
    return labels[veicolo] || veicolo || 'N/A';
  }

  /**
   * Ottiene l'etichetta per il completamento giornata
   */
  static getCompletamentoLabel(completamento) {
    const labels = {
      'nessuno': 'Nessuno',
      'lavaggio': '🧽 Lavaggio',
      'spogliatoio': '👔 Spogliatoio',
      'inventario': '📋 Inventario',
      'altro': '⚙️ Altro'
    };
    return labels[completamento] || completamento || 'Nessuno';
  }

  /**
   * Determina il tipo di giorno
   */
  static getDayType(entry) {
    if (entry.dayType === 'festivo' || entry.is_holiday) return '🎉 Giorno Festivo';
    if (entry.dayType === 'ferie') return '🏖️ Ferie';
    if (entry.dayType === 'malattia') return '🏥 Malattia';
    if (entry.dayType === 'permesso') return '📋 Permesso';
    if (entry.dayType === 'riposo') return '😴 Riposo Compensativo';
    
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) return '☀️ Domenica';
    if (dayOfWeek === 6) return '🏖️ Sabato';
    return '📅 Giorno Ordinario';
  }

  /**
   * Genera il PDF completo
   */
  static async generateMonthlyReport(workEntries, monthlyData, month, year) {
    try {
      console.log('📄 COMPREHENSIVE PDF SERVICE v2 - Generazione report mensile iniziata');
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
            <div class="section-title">📋 Registrazioni del Mese (${sortedEntries.length}) - Con Breakdown Completo</div>
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
          <title>Report Mensile Completo - ${monthName}</title>
          ${this.generateStyles()}
        </head>
        <body>
          <div class="header">
            <h1>📊 WorkT - Report Mensile COMPLETO</h1>
            <div class="period">${monthName}</div>
            <div class="generated">Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</div>
          </div>
          
          ${this.generateSummarySection(monthlyData)}
          ${entriesHTML}
          
          <div class="footer">
            <p><strong>Report COMPLETO generato da WorkT - Tracker Ore Lavoro v1.1.0</strong></p>
            <p>Calcoli conformi al CCNL Metalmeccanico PMI - Include TUTTI i dettagli del TimeEntryForm</p>
            <p>Sistema Multi-Fascia, Tariffe Giornaliere, Supplementi, Straordinari e Breakdown dettagliato</p>
          </div>
        </body>
        </html>
      `;

      console.log('📄 COMPREHENSIVE PDF SERVICE v2 - HTML generato, avvio stampa...');

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

      console.log('✅ COMPREHENSIVE PDF SERVICE v2 - PDF generato con successo:', uri);

      // Condividi il PDF
      if (await Sharing.isAvailableAsync()) {
        const fileName = `WorkT_Report_COMPLETO_${year}_${month.toString().padStart(2, '0')}.pdf`;
        
        // Copia il file con un nome più descrittivo
        const newUri = FileSystem.documentDirectory + fileName;
        await FileSystem.copyAsync({
          from: uri,
          to: newUri
        });

        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Report Mensile COMPLETO ${monthName}`,
          UTI: 'com.adobe.pdf'
        });

        console.log('✅ COMPREHENSIVE PDF SERVICE v2 - PDF condiviso con successo');
        return { success: true, uri: newUri };
      } else {
        console.log('⚠️ COMPREHENSIVE PDF SERVICE v2 - Sharing non disponibile');
        return { success: true, uri, message: 'PDF generato ma sharing non disponibile' };
      }

    } catch (error) {
      console.error('❌ COMPREHENSIVE PDF SERVICE v2 - Errore generazione PDF:', error);
      throw new Error(`Errore nella generazione del PDF: ${error.message}`);
    }
  }
}

export default ComprehensivePDFService;
