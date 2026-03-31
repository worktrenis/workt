import DatabaseService from './DatabaseService';

/**
 * Servizio per la gestione dei giorni fissi (ferie, malattia, permessi, ecc.)
 */
class FixedDaysService {

  static formatLocalDateYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  /**
   * Ottieni un riepilogo dei giorni fissi per un periodo
   * @param {Date} startDate - Data inizio periodo  
   * @param {Date} endDate - Data fine periodo
   * @param {Object} settings - Impostazioni contratto per calcolo retribuzione
   * @returns {Object} Riepilogo formattato per la Dashboard
   */
  static async getFixedDaysSummary(startDate, endDate, settings = null) {
    try {
      // ⚠️ Evita toISOString(): usa UTC e può spostare di 1 giorno il range (Capodanno / fine mese)
      const startDateStr = FixedDaysService.formatLocalDateYmd(startDate);
      const endDateStr = FixedDaysService.formatLocalDateYmd(endDate);
      
      console.log('📊 FixedDaysService: Caricamento giorni fissi per periodo', { startDateStr, endDateStr });
      
      // Ottieni tutte le entries per il periodo
      const entries = await DatabaseService.getWorkEntriesByDateRange(startDateStr, endDateStr);
      
      // Filtra solo le entries che sono giorni fissi
      const fixedDayEntries = entries.filter(entry => 
        entry.is_fixed_day === 1 || 
        entry.isFixedDay === 1 ||
        ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(entry.day_type || entry.dayType)
      );
      
      console.log('📊 FixedDaysService: Entries giorni fissi trovate:', fixedDayEntries.length);
      
      // Inizializza contatori
      const summary = {
        totalDays: 0,
        totalEarnings: 0,
        vacation: { days: 0, earnings: 0 },
        sick: { days: 0, earnings: 0 },
        permit: { days: 0, earnings: 0 },
        compensatory: { days: 0, earnings: 0 },
        holiday: { days: 0, earnings: 0 }
      };
      
      // Elabora ogni entry
      const showEffective = settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false;
      const dailyRate = settings?.contract?.dailyRate || (settings?.contract?.monthlySalary && settings?.contract?.workingDaysPerMonth ? (settings.contract.monthlySalary / settings.contract.workingDaysPerMonth) : undefined) || 107.69;

      fixedDayEntries.forEach(entry => {
        const dayType = entry.day_type || entry.dayType || 'ferie';
        // Per giorni fissi, usa total_earnings se disponibile e consentito, altrimenti calcola il giornaliero standard
        let earnings = parseFloat(entry.total_earnings || 0);

        // Se l'utente NON vuole vedere il guadagno dei giorni speciali, forza 0 e usa placeholder in UI (la UI gestisce stringhe)
        const isFixedType = (entry.is_fixed_day === 1 || entry.isFixedDay === 1 || ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType));
        if (!showEffective && isFixedType) {
          earnings = 0; // La card mostrerà "—" grazie al controllo tipo stringa nella UI
        } else {
          // Se total_earnings è 0 ma è un giorno fisso, usa la retribuzione giornaliera configurata
          if (earnings === 0 && isFixedType) {
            earnings = dailyRate;
          }
          // Correzione festivo: se il tipo è festivo e c'è una retribuzione base salvata errata, sovrascrivi con dailyRate
          if (dayType === 'festivo' && (!Number.isFinite(earnings) || earnings <= 0)) {
            earnings = dailyRate;
          }
        }
        
        summary.totalDays++;
        summary.totalEarnings += earnings;
        
        switch (dayType) {
          case 'ferie':
            summary.vacation.days++;
            summary.vacation.earnings += earnings;
            break;
          case 'malattia':
            summary.sick.days++;
            summary.sick.earnings += earnings;
            break;
          case 'permesso':
            summary.permit.days++;
            summary.permit.earnings += earnings;
            break;
          case 'riposo':
            summary.compensatory.days++;
            summary.compensatory.earnings += earnings;
            break;
          case 'festivo':
            summary.holiday.days++;
            summary.holiday.earnings += earnings;
            break;
        }
      });
      
      console.log('📊 FixedDaysService: Summary calcolato:', summary);
      // Se non si mostra l'effettivo, la UI deve visualizzare vuoto; per coerenza, convertiamo a stringa vuota i campi earnings dei fissi
      if (!showEffective) {
        const placeholder = '';
        const convert = (v) => ({ days: v.days, earnings: placeholder });
        return {
          totalDays: summary.totalDays,
          totalEarnings: 0,
          vacation: convert(summary.vacation),
          sick: convert(summary.sick),
          permit: convert(summary.permit),
          compensatory: convert(summary.compensatory),
          holiday: convert(summary.holiday)
        };
      }

      return summary;
      
    } catch (error) {
      console.error('❌ FixedDaysService: Errore nel calcolo summary giorni fissi:', error);
      return {
        totalDays: 0,
        totalEarnings: 0,
        vacation: { days: 0, earnings: 0 },
        sick: { days: 0, earnings: 0 },
        permit: { days: 0, earnings: 0 },
        compensatory: { days: 0, earnings: 0 },
        holiday: { days: 0, earnings: 0 }
      };
    }
  }

  /**
   * Ottieni le statistiche del completamento giornata per un periodo
   * @param {Date} startDate - Data inizio periodo  
   * @param {Date} endDate - Data fine periodo
   * @returns {Object} Statistiche completamento giornata
   */
  static async getCompletionStats(startDate, endDate) {
    try {
      // ⚠️ Evita toISOString(): usa UTC e può spostare di 1 giorno il range (include 31/12 ed esclude 31/01)
      const startDateStr = FixedDaysService.formatLocalDateYmd(startDate);
      const endDateStr = FixedDaysService.formatLocalDateYmd(endDate);
      
      console.log('� COMPLETION STATS: FUNZIONE CHIAMATA!', { startDateStr, endDateStr });
      console.log('�📊 FixedDaysService: Caricamento stats completamento per periodo', { startDateStr, endDateStr });
      
      // Ottieni tutte le entries per il periodo
      const entries = await DatabaseService.getWorkEntriesByDateRange(startDateStr, endDateStr);

      const normalizeCompletion = (raw) => {
        const normalized = String(raw ?? 'nessuno').trim().toLowerCase();
        // Valori ammessi nel form "Completamento giornata"
        const allowed = new Set(['nessuno', 'ferie', 'permesso', 'malattia', 'riposo']);
        return allowed.has(normalized) ? normalized : 'nessuno';
      };
      
      // Filtra le entries di completamento (campo completamento_giornata) e i giorni fissi (ferie/malattia/permesso/riposo/festivo)
      const fixedTypes = new Set(['ferie', 'malattia', 'permesso', 'riposo', 'festivo']);
      const completionEntries = entries.filter(entry => {
        const completionRaw = entry.completamento_giornata ?? entry.completamentoGiornata;
        const completion = normalizeCompletion(completionRaw);
        const dayType = String(entry.day_type || entry.dayType || '').trim().toLowerCase();
        const isFixedDay = fixedTypes.has(dayType);
        return completion !== 'nessuno' || isFixedDay;
      });
      
      console.log('📊 FixedDaysService: Entries con completamento o giorni fissi trovate:', completionEntries.length);
      
      // Debug: mostra tutte le entries in complementation set per capire il dettaglio
      completionEntries.forEach((entry, index) => {
        const completionRaw = entry.completamento_giornata ?? entry.completamentoGiornata;
        const completion = normalizeCompletion(completionRaw);
        const dayType = String(entry.day_type || entry.dayType || '').trim().toLowerCase();
        console.log(
          `📋 Entry #${index + 1}: date=${entry.date}, completionRaw="${completionRaw}", completion="${completion}", dayType="${dayType}", isFixedDay=${fixedTypes.has(dayType)}`
        );
      });
      
      // Inizializza contatori in formato compatibile con Dashboard
      const stats = {
        totalEntries: 0,
        totalCompletionHours: 0,
        byType: {},
        details: [], // Nuovo: lista dettagliata
        totalCompletionDays: 0, // Nuovo: giorni interi
        totalCompletionExtraHours: 0 // Nuovo: ore residue
      };

      // Elabora ogni entry con il nuovo formato
      // Nuova logica: somma tutte le ore di completamento per tipo, poi calcola giorni+ore
      const byTypeHours = {};
      completionEntries.forEach(entry => {
        let completion = normalizeCompletion(entry.completamento_giornata ?? entry.completamentoGiornata);
        const dayType = String(entry.day_type || entry.dayType || '').trim().toLowerCase();
        if (completion === 'nessuno' && ['ferie','malattia','permesso','riposo','festivo'].includes(dayType)) {
          completion = dayType;
        }
        const totalWorkHours = FixedDaysService.calculateTotalWorkHours(entry);
        let completionHours = 0;
        if (totalWorkHours === 0) {
          completionHours = 8;
        } else {
          completionHours = Math.max(0, 8 - totalWorkHours);
        }
        // LOG DEBUG: mostra dettaglio entry
        console.log(
          `[DEBUG COMPLETION] Data: ${entry.date}, Tipo: ${completion}, dayType: ${dayType}, Ore lavorate: ${totalWorkHours}, Ore completamento calcolate: ${completionHours}`
        );
        if (completionHours > 0) {
          stats.totalEntries++;
          stats.totalCompletionHours += completionHours;
          if (!byTypeHours[completion]) byTypeHours[completion] = 0;
          byTypeHours[completion] += completionHours;
          stats.details.push({ date: entry.date, type: completion, hours: completionHours });
        }
      });

      // Calcola giorni interi + ore residue totali
      stats.totalCompletionDays = Math.floor(stats.totalCompletionHours / 8);
      stats.totalCompletionExtraHours = +(stats.totalCompletionHours % 8).toFixed(2);

      // Calcola breakdown per tipo (giorni+ore per ogni tipo)
      stats.byType = {};
      Object.entries(byTypeHours).forEach(([tipo, ore]) => {
        stats.byType[tipo] = {
          count: Math.floor(ore / 8),
          totalHours: +ore.toFixed(2),
          extraHours: +(ore % 8).toFixed(2)
        };
      });

      console.log('📊 FixedDaysService: Stats completamento calcolate:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ FixedDaysService: Errore nel calcolo stats completamento:', error);
      return {
        totalEntries: 0,
        totalCompletionHours: 0,
        byType: {}
      };
    }
  }

  /**
   * Calcola le ore totali di lavoro per una entry
   * @param {Object} entry - Entry dal database
   * @returns {number} Ore totali di lavoro
   */
  static calculateTotalWorkHours(entry) {
    try {
      let totalHours = 0;
      // Ottieni la travelHoursSetting dalla variabile globale (workaround)
      let travelHoursSetting = 'TRAVEL_RATE_EXCESS';
      if (typeof global !== 'undefined' && global.dashboardTravelHoursSetting) {
        travelHoursSetting = global.dashboardTravelHoursSetting;
      }

      const getField = (obj, camel, snake) => (obj?.[camel] ?? obj?.[snake] ?? '');

      const addTravelSegment = (segment) => {
        if (!segment) return 0;
        const departureCompany = getField(segment, 'departureCompany', 'departure_company');
        const arrivalSite = getField(segment, 'arrivalSite', 'arrival_site');
        const departureReturn = getField(segment, 'departureReturn', 'departure_return');
        const arrivalCompany = getField(segment, 'arrivalCompany', 'arrival_company');

        let travelSegmentHours = 0;
        if (departureCompany && arrivalSite) {
          travelSegmentHours += FixedDaysService.calculateHoursDifference(departureCompany, arrivalSite);
        }
        if (departureReturn && arrivalCompany) {
          travelSegmentHours += FixedDaysService.calculateHoursDifference(departureReturn, arrivalCompany);
        }

        return travelSegmentHours;
      };

      // Ore turno principale
      if (entry.work_start_1 && entry.work_end_1) {
        totalHours += FixedDaysService.calculateHoursDifference(entry.work_start_1, entry.work_end_1);
      }
      if (entry.work_start_2 && entry.work_end_2) {
        totalHours += FixedDaysService.calculateHoursDifference(entry.work_start_2, entry.work_end_2);
      }

      // Aggiungi ore viaggio per il primo segmento (andata/ritorno primario)
      totalHours += addTravelSegment(entry);

      // Ore da turni aggiuntivi (viaggi - se presenti nel JSON)
      if (entry.viaggi) {
        try {
          const viaggi = typeof entry.viaggi === 'string' ? JSON.parse(entry.viaggi) : entry.viaggi;
          if (Array.isArray(viaggi)) {
            viaggi.forEach(viaggio => {
              if (viaggio.work_start_1 && viaggio.work_end_1) {
                totalHours += FixedDaysService.calculateHoursDifference(viaggio.work_start_1, viaggio.work_end_1);
              }
              if (viaggio.work_start_2 && viaggio.work_end_2) {
                totalHours += FixedDaysService.calculateHoursDifference(viaggio.work_start_2, viaggio.work_end_2);
              }
              totalHours += addTravelSegment(viaggio);
            });
          }
        } catch (e) {
          console.warn('Errore nel parsing viaggi per calcolo ore:', e);
        }
      }

      // Ore da interventi reperibilità (se presenti nel JSON)
      if (entry.interventi) {
        try {
          const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
          if (Array.isArray(interventi)) {
            interventi.forEach(intervento => {
              if (intervento.work_start_1 && intervento.work_end_1) {
                totalHours += FixedDaysService.calculateHoursDifference(intervento.work_start_1, intervento.work_end_1);
              }
              if (intervento.work_start_2 && intervento.work_end_2) {
                totalHours += FixedDaysService.calculateHoursDifference(intervento.work_start_2, intervento.work_end_2);
              }
              totalHours += addTravelSegment(intervento);
            });
          }
        } catch (e) {
          console.warn('Errore nel parsing interventi per calcolo ore:', e);
        }
      }

      console.log(`🔍 FIXEDDAYS DEBUG - Entry ${entry.date}: calcolate ${totalHours}h (lavoro: ${entry.work_start_1}-${entry.work_end_1}, ${entry.work_start_2}-${entry.work_end_2})`);
      return totalHours;
    } catch (error) {
      console.error('Errore nel calcolo ore lavoro:', error);
      return 0;
    }
  }

  /**
   * Calcola la differenza in ore tra due orari
   * @param {string} startTime - Orario inizio (formato HH:mm)
   * @param {string} endTime - Orario fine (formato HH:mm)
   * @returns {number} Differenza in ore decimali
   */
  static calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      const startDecimal = startHours + startMinutes / 60;
      let endDecimal = endHours + endMinutes / 60;
      
      // Gestisce il caso di lavoro notturno (fine giorno successivo)
      if (endDecimal < startDecimal) {
        endDecimal += 24;
      }
      
      return Math.max(0, endDecimal - startDecimal);
      
    } catch (error) {
      console.error('Errore nel calcolo differenza ore:', error);
      return 0;
    }
  }
}

export default FixedDaysService;