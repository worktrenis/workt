/**
 * 🧮 Calcolatore statistiche AI Assistant
 * 
 * Helper separato per mantenere AIAssistantService.js snello.
 * Fornisce metodi per aggregare breakdown giornalieri e calcolare
 * statistiche mensili, usando lo stesso motore di calcolo di Dashboard.
 */

import { createWorkEntryFromData } from '../utils/earningsHelper';

export class AICalculationHelper {
  constructor(calculationService) {
    this.calculationService = calculationService;
  }

  /**
   * Calcola le ore totali lavorate per un array di work entries
   */
  calculateTotalHours(workEntries) {
    if (!workEntries || workEntries.length === 0) return 0;
    return workEntries.reduce((sum, entry) => {
      const parsedEntry = createWorkEntryFromData(entry);
      return sum + this.calculationService.calculateWorkHours(parsedEntry);
    }, 0);
  }

  /**
   * Aggrega i breakdown giornalieri in statistiche mensili.
   * Usa i breakdown già calcolati (entry.breakdown) oppure li calcola.
   * 
   * @param {Array} workEntries - Entry con o senza breakdown pre-calcolato
   * @param {object} settings - Impostazioni utente
   * @returns {object} Statistiche aggregate
   */
  async aggregateMonthlyStats(workEntries, settings) {
    let totalOrdinary = 0;
    let totalOvertime = 0;
    let totalTravel = 0;
    let totalStandby = 0;
    let totalMeals = 0;
    let totalHours = 0;
    let totalEarnings = 0;

    for (const entry of workEntries) {
      let breakdown = entry.breakdown;

      // Se il breakdown non è ancora calcolato, calcolalo ora
      if (!breakdown) {
        const parsedEntry = createWorkEntryFromData(entry);
        breakdown = await this.calculationService.calculateEarningsBreakdown(parsedEntry, settings);
      }

      if (breakdown) {
        totalOrdinary += breakdown.ordinary?.total || 0;
        totalOvertime += (breakdown.ordinary?.earnings?.lavoro_extra || 0) + 
                         (breakdown.ordinary?.earnings?.viaggio_extra || 0);
        totalTravel += breakdown.allowances?.travel || 0;

        if (breakdown.standby && breakdown.standby.totalEarnings) {
          totalStandby += breakdown.standby.totalEarnings;
        } else {
          totalStandby += breakdown.allowances?.standby || 0;
        }

        totalMeals += breakdown.allowances?.meal || 0;
        totalEarnings += breakdown.totalEarnings || 0;
      }

      totalHours += this.calculationService.calculateWorkHours(
        createWorkEntryFromData(entry)
      );
    }

    return {
      totalOrdinary,
      totalOvertime,
      totalTravel,
      totalStandby,
      totalMeals,
      totalHours,
      totalEarnings,
      totalExtra: totalOvertime + totalTravel + totalStandby + totalMeals,
      daysWorked: workEntries.length,
      averageHoursPerDay: workEntries.length > 0 ? totalHours / workEntries.length : 0,
      averageEarningsPerDay: workEntries.length > 0 ? totalEarnings / workEntries.length : 0,
      daysWithOvertime: workEntries.filter(e => {
        const h = this.calculationService.calculateWorkHours(createWorkEntryFromData(e));
        return h > 8;
      }).length,
      holidays: workEntries.filter(e => {
        const pt = createWorkEntryFromData(e);
        return pt.dayType === 'festivo' || pt.dayType === 'domenica';
      }).length,
      standbyDays: workEntries.filter(e => {
        const pt = createWorkEntryFromData(e);
        return pt.isStandbyDay;
      }).length
    };
  }

  /**
   * Carica le entries dal database e calcola i breakdown
   * @param {Function} getWorkEntries - Funzione per caricare entries dal DB
   * @param {object} settings - Impostazioni utente
   * @returns {Promise<Array>} Work entries con breakdown calcolati
   */
  async loadEntriesWithBreakdowns(getWorkEntries, settings) {
    let entries = await getWorkEntries();

    // Parsa tutte le entries con createWorkEntryFromData
    entries = entries.map(entry => {
      const parsed = createWorkEntryFromData(entry);
      parsed.id = entry.id;
      parsed.date = entry.date;
      return parsed;
    });

    // Calcola breakdown per ogni entry
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        const breakdown = await this.calculationService.calculateEarningsBreakdown(entry, settings);
        entry.breakdown = breakdown;
        entry.breakdownTotal = breakdown.totalEarnings || 0;
      } catch (e) {
        console.warn(`Errore calcolo breakdown per ${entry.date}:`, e.message);
        entry.breakdown = null;
        entry.breakdownTotal = 0;
      }
    }

    return entries;
  }
}

export default AICalculationHelper;