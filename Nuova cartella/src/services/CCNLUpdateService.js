import { CCNL_CONTRACTS, CCNL_2025_2026_INCREMENTS } from '../constants';

// Applica eventuali incrementi programmati al contratto in base alla data corrente.
// - contract: oggetto contratto corrente nelle settings
// - todayISO: stringa 'YYYY-MM-DD' (facoltativa)
// Ritorna: { contract, updated } dove updated=true se ha modificato qualcosa.
export function applyScheduledCCNLIncrements(contract, todayISO, appliedMapForKey = []) {
  try {
    if (!contract || !contract.key) return { contract, updated: false };
    const increments = CCNL_2025_2026_INCREMENTS[contract.key];
    if (!increments || Object.keys(increments).length === 0) {
      return { contract, updated: false };
    }

    const today = todayISO || new Date().toISOString().slice(0, 10);
    let baseMonthly = contract.monthlySalary;

    // Nota: i valori in CCNL_CONTRACTS includono già l'incremento del 01/06/2025 per L5
    // quindi applichiamo solo le tranche con decorrenza successiva ai valori già incorporati.
    // Per sicurezza, ricalcoliamo la somma delle tranche con decorrenza <= today MA non già incluse.
    let additional = 0;
  for (const [date, amount] of Object.entries(increments)) {
      if (date <= today) {
        // 01/06/2025 è già incluso nei default di TUTTI i livelli; evita doppio conteggio
        const alreadyIncluded = date === '2025-06-01';
    const alreadyApplied = Array.isArray(appliedMapForKey) && appliedMapForKey.includes(date);
    if (!alreadyIncluded && !alreadyApplied) additional += amount;
      }
    }

    if (additional > 0) {
      const newMonthly = parseFloat((baseMonthly + additional).toFixed(2));
  const updated = {
        ...contract,
        monthlySalary: newMonthly,
        dailyRate: parseFloat((newMonthly / (contract.workingDaysPerMonth || 26)).toFixed(2)),
        hourlyRate: parseFloat((newMonthly / 173).toFixed(2)),
        lastUpdated: today,
        source: (contract.source || '') + ' + Adeguamento automatico CCNL 2025-2026',
      };
      return { contract: updated, updated: true };
    }

    return { contract, updated: false };
  } catch (e) {
    return { contract, updated: false };
  }
}

export default { applyScheduledCCNLIncrements };
