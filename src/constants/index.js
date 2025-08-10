// CCNL Contract Constants and Calculations

export const CCNL_CONTRACTS = {
  METALMECCANICO_PMI_L1: {
    name: 'CCNL Metalmeccanico PMI - Livello 1',
    code: 'METAL_PMI_L1',
  monthlySalary: 1587.26,
  dailyRate: 61.05, // 1587.26 / 26
  hourlyRate: 9.18, // 1587.26 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L2: {
    name: 'CCNL Metalmeccanico PMI - Livello 2',
    code: 'METAL_PMI_L2',
  monthlySalary: 1752.96,
  dailyRate: 67.42, // 1752.96 / 26
  hourlyRate: 10.13, // 1752.96 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L3: {
    name: 'CCNL Metalmeccanico PMI - Livello 3',
    code: 'METAL_PMI_L3',
  monthlySalary: 1944.96,
  dailyRate: 74.81, // 1944.96 / 26
  hourlyRate: 11.24, // 1944.96 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L4: {
    name: 'CCNL Metalmeccanico PMI - Livello 4',
    code: 'METAL_PMI_L4',
  monthlySalary: 2029.28,
  dailyRate: 78.05, // 2029.28 / 26
  hourlyRate: 11.73, // 2029.28 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
    lastUpdated: '2025-06-01',
    source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L5: {
    name: 'CCNL Metalmeccanico PMI - Livello 5',
    code: 'METAL_PMI_L5',
  monthlySalary: 2173.77,
  dailyRate: 83.61, // 2173.77 / 26
  hourlyRate: 12.57, // 2173.77 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L6: {
    name: 'CCNL Metalmeccanico PMI - Livello 6',
    code: 'METAL_PMI_L6',
    monthlySalary: 2330.66,
    dailyRate: 89.64, // 2330.66 / 26
    hourlyRate: 13.47, // 2330.66 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L7: {
    name: 'CCNL Metalmeccanico PMI - Livello 7',
    code: 'METAL_PMI_L7',
  monthlySalary: 2500.42,
  dailyRate: 96.17, // 2500.42 / 26
  hourlyRate: 14.45, // 2500.42 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L8: {
    name: 'CCNL Metalmeccanico PMI - Livello 8',
    code: 'METAL_PMI_L8',
  monthlySalary: 2719.17,
  dailyRate: 104.58, // 2719.17 / 26
  hourlyRate: 15.72, // 2719.17 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
  METALMECCANICO_PMI_L9: {
    name: 'CCNL Metalmeccanico PMI - Livello 9',
    code: 'METAL_PMI_L9',
  monthlySalary: 3023.98,
  dailyRate: 116.31, // 3023.98 / 26
  hourlyRate: 17.47, // 3023.98 / 173
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: { 
      day: 1.2, 
      nightUntil22: 1.25, 
      nightAfter22: 1.35, 
      saturday: 1.25, 
      holiday: 1.3,
      // Maggiorazioni personalizzate per straordinario
      overtimeNightUntil22: 1.45, // Straordinario serale (20:00-22:00) +45%
      overtimeNightAfter22: 1.5   // Straordinario notturno (dopo le 22) +50%
    },
    nightWorkStart: 22, nightWorkEnd: 6,
  lastUpdated: '2025-06-01',
  source: 'Unionmeccanica Confapi – Minimi giugno 2025 (IPCA)'
  },
};

// Tranche di adeguamento CCNL 2025-2026 (fonte FIM-CISL, FIOM-CGIL)
// Valori noti: riferiti al 5° livello (L5). Altri livelli verranno aggiunti quando disponibili.
export const CCNL_2025_2026_INCREMENTS = {
  METALMECCANICO_PMI_L1: {
    '2025-06-01': 20.37,
    // Importi successivi non ancora ufficializzati per L1 nella fonte usata
  },
  METALMECCANICO_PMI_L2: {
    '2025-06-01': 22.50,
  },
  METALMECCANICO_PMI_L3: {
    '2025-06-01': 24.96,
  },
  METALMECCANICO_PMI_L4: {
    '2025-06-01': 26.04,
  },
  METALMECCANICO_PMI_L5: {
    // 01/06/2025: +27,90€ (già incluso nei valori di default presenti in CCNL_CONTRACTS)
    '2025-06-01': 27.90,
    // 01/09/2025: +22,10€
    '2025-09-01': 22.10,
    // 01/06/2026: +50,00€
    '2026-06-01': 50.00,
  },
  METALMECCANICO_PMI_L6: {
    '2025-06-01': 29.91,
  },
  METALMECCANICO_PMI_L7: {
    '2025-06-01': 32.09,
  },
  METALMECCANICO_PMI_L8: {
    '2025-06-01': 34.90,
  },
  METALMECCANICO_PMI_L9: {
    '2025-06-01': 38.81,
  },
};

export const DEFAULT_SETTINGS = {
  contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L5,
  travelCompensationRate: 1.0, // 100% of hourly rate
  // 🔄 NUOVE LOGICHE VIAGGIO
  travelHoursSetting: 'TRAVEL_RATE_EXCESS', // 'TRAVEL_RATE_EXCESS', 'TRAVEL_RATE_ALL', 'OVERTIME_EXCESS'
  multiShiftTravelAsWork: false, // Viaggi multi-turno come ore lavoro
  // 👁️ Preferenze di visualizzazione
  // true: mostra la retribuzione giornaliera effettiva anche nei giorni speciali senza ore di lavoro
  // false: lascia vuoto l'importo nei giorni speciali senza ore di lavoro (ferie, malattia, permesso, riposo, festivo)
  showEffectiveEarningsOnSpecialNoWorkDays: true,
  standbySettings: {
    enabled: false,
    dailyAllowance: 0,
    startHour: 18,
    endHour: 8,
    includeWeekends: true,
    includeHolidays: true,
    standbyDays: {},
  },
  travelAllowance: {
    enabled: false,
    dailyAmount: 0,
    autoActivate: false,
  },
  mealAllowances: {
    lunch: {
      voucherAmount: 0,
      cashAmount: 0,
      autoActivate: true,
    },
    dinner: {
      voucherAmount: 0,
      cashAmount: 0,
      autoActivate: false,
    },
  },
  // 💰 Impostazioni per calcolo netto stipendio
  netCalculation: {
    method: 'irpef', // 'irpef' (aliquote reali) o 'custom' (percentuale manuale)
    customDeductionRate: 32, // Percentuale trattenute personalizzata (default più realistico)
    useActualAmount: false, // Se true, calcola sulla cifra presente, se false usa stima annuale
  },
  // Adeguamenti automatici CCNL (tranche 2025-2026)
  autoUpdateCCNLIncrements: true,
  ccnlAppliedIncrements: {}, // Esempio: { METALMECCANICO_PMI_L5: ['2025-09-01'] }
};

// Indennità di reperibilità CCNL Unionmeccanica Confapi (decorrenza 01/06/2025)
// Valori per gruppo livello: importi in euro
// Campi usati dall'app: feriale16 (16h feriale), feriale24 (24h feriale), festivo24 (24h festivo/domenica)
export const CCNL_STANDBY_RATES = {
  // Nota: weekly6Days è opzionale (forfait settimana 6 giorni) e sarà valorizzato quando i dati ufficiali sono confermati
  GROUP_L1_3: { feriale16: 5.76, feriale24: 8.67, festivo24: 9.36, weekly6Days: null },
  GROUP_L4_5: { feriale16: 6.87, feriale24: 10.77, festivo24: 11.56, weekly6Days: null },
  GROUP_SUPER_5: { feriale16: 7.89, feriale24: 12.98, festivo24: 13.66, weekly6Days: null }, // livelli 6-9
};

// Helper per ottenere le indennità di reperibilità in base al livello dal contract key
export function getStandbyRatesForContract(contractKey) {
  try {
    if (typeof contractKey !== 'string') {
      return CCNL_STANDBY_RATES.GROUP_L4_5;
    }
    // Estrae il livello dal key es. METALMECCANICO_PMI_L5 -> 5
    const match = contractKey.match(/_L(\d)$/);
    const level = match ? parseInt(match[1], 10) : 5;
    if (level <= 3) return CCNL_STANDBY_RATES.GROUP_L1_3;
    if (level === 4 || level === 5) return CCNL_STANDBY_RATES.GROUP_L4_5;
    return CCNL_STANDBY_RATES.GROUP_SUPER_5; // 6-9
  } catch {
    return CCNL_STANDBY_RATES.GROUP_L4_5;
  }
}

// Calculation utilities
export const calculateOvertimeRate = (hour, contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5) => {
  // CCNL Metalmeccanico PMI - Fasce orarie straordinari:
  // Notturno (22:00-06:00): +35%
  if (hour >= 22 || hour < 6) {
    return contract.hourlyRate * contract.overtimeRates.nightAfter22;
  }
  // Serale (20:00-22:00): +25%
  else if (hour >= 20 && hour < 22) {
    return contract.hourlyRate * contract.overtimeRates.nightUntil22;
  }
  // Diurno (06:00-20:00): +20%
  return contract.hourlyRate * contract.overtimeRates.day;
};

export const isNightWork = (hour) => {
  return hour >= 22 || hour < 6;
};

export const getWorkDayHours = () => 8; // Standard work day hours

// 🔄 NUOVE LOGICHE VIAGGIO - Sistema pulito e chiaro
export const TRAVEL_HOURS_SETTINGS = {
  TRAVEL_RATE_EXCESS: 'TRAVEL_RATE_EXCESS', // LOGICA 1: Ore viaggio eccedenti le 8h con tariffa viaggio
  TRAVEL_RATE_ALL: 'TRAVEL_RATE_ALL', // LOGICA 2: Tutte le ore viaggio sempre con tariffa viaggio
  OVERTIME_EXCESS: 'OVERTIME_EXCESS', // LOGICA 3: Ore viaggio eccedenti le 8h come straordinari
};

export const TRAVEL_HOURS_DESCRIPTIONS = {
  [TRAVEL_HOURS_SETTINGS.TRAVEL_RATE_EXCESS]: '🚗 Viaggio eccedente con tariffa viaggio (CONSIGLIATA)',
  [TRAVEL_HOURS_SETTINGS.TRAVEL_RATE_ALL]: '🛣️ Viaggio sempre con tariffa viaggio',
  [TRAVEL_HOURS_SETTINGS.OVERTIME_EXCESS]: '⏰ Viaggio eccedente come straordinario',
};

export const WORK_TYPES = {
  REGULAR: 'regular',
  OVERTIME: 'overtime',
  TRAVEL: 'travel',
  STANDBY: 'standby',
};

export const MEAL_TIMES = {
  LUNCH_START: 12,
  LUNCH_END: 14,
  DINNER_START: 19,
  DINNER_END: 21,
};

export const DATABASE_TABLES = {
  WORK_ENTRIES: 'work_entries',
  STANDBY_CALENDAR: 'standby_calendar',
  SETTINGS: 'settings',
  BACKUPS: 'backups',
};

// Contract validation and calculation utilities
export const validateContractData = (contract) => {
  const calculatedDaily = contract.monthlySalary / contract.workingDaysPerMonth;
  const calculatedHourly = calculatedDaily / contract.workingHoursPerDay;
  
  return {
    isValid: {
      dailyRate: Math.abs(contract.dailyRate - calculatedDaily) < 0.01,
      hourlyRate: Math.abs(contract.hourlyRate - calculatedHourly) < 0.01,
    },
    calculated: {
      dailyRate: calculatedDaily,
      hourlyRate: calculatedHourly,
    },
    differences: {
      dailyRate: contract.dailyRate - calculatedDaily,
      hourlyRate: contract.hourlyRate - calculatedHourly,
    }
  };
};

// Calculate exact CCNL level based on hourly rate
export const determineContractLevel = (hourlyRate) => {
  // Tariffe CCNL Metalmeccanico PMI 2025 - NUMERAZIONE CRESCENTE
  // NOTA: Livelli numerici più alti = posizioni superiori e migliore retribuzione
  const levels = {
    'Livello 1 (Base)': { min: 12.50, max: 13.99, description: 'Livello base e manovali' },
    'Livello 2 (Apprendisti)': { min: 14.00, max: 15.19, description: 'Apprendisti e operai generici' },
    'Livello 3 (Operai)': { min: 15.20, max: 15.99, description: 'IL TUO LIVELLO DI PARTENZA - Operai comuni' },
    'Livello 4 (Operai Esperti)': { min: 16.00, max: 16.79, description: 'Operai con esperienza' },
    'Livello 5 (Operai Qualificati)': { min: 16.00, max: 17.49, description: 'IL TUO LIVELLO ATTUALE - Operai qualificati specializzati 🌟' },
    'Livello 6 (Tecnici)': { min: 17.50, max: 19.99, description: 'PROSSIMO OBIETTIVO - Tecnici specializzati' },
    'Livello 7 (Specialisti)': { min: 20.00, max: 24.99, description: 'Specialisti e quadri intermedi' },
    'Livello 8 (Dirigenti)': { min: 25.00, max: 35.00, description: 'Dirigenti e quadri superiori' },
  };
  
  for (const [level, data] of Object.entries(levels)) {
    if (hourlyRate >= data.min && hourlyRate <= data.max) {
      return {
        level: level.split(' ')[1], // Estrae solo "5" da "Livello 5"
        fullLevel: level,
        confidence: 'alta',
        description: data.description,
        progression: level.includes('IL TUO LIVELLO ATTUALE') ? 'POSIZIONE ATTUALE' : 
                   level.includes('PARTENZA') ? 'LIVELLO PRECEDENTE' :
                   level.includes('PROSSIMO') ? 'PROSSIMO AVANZAMENTO' : 'ALTRO LIVELLO',
        note: `Tariffa €${hourlyRate} - ${data.description}`
      };
    }
  }
  
  return {
    level: 'Non determinato',
    confidence: 'bassa',
    note: `Tariffa oraria €${hourlyRate} non corrisponde ai livelli standard CCNL`
  };
};

// Career progression analysis
export const analyzeCareerProgression = (contract) => {
  const currentHourlyRate = contract.hourlyRate;
  // SISTEMA CRESCENTE: Livelli numerici più alti = posizioni migliori
  const levels = {
    1: { rate: 13.25, title: 'Manovale/Base', description: 'Livello di ingresso' },
    2: { rate: 14.60, title: 'Apprendista/Operaio Generico', description: 'Primo livello operativo' },
    3: { rate: 15.60, title: 'Operaio Comune', description: 'IL TUO LIVELLO DI PARTENZA - Operaio con esperienza base' },
    4: { rate: 16.20, title: 'Operaio Esperto', description: 'Operaio con maggiore esperienza' },
    5: { rate: 16.15, title: 'Operaio Qualificato Specializzato', description: 'TUA POSIZIONE ATTUALE - Operaio altamente qualificato 🌟' },
    6: { rate: 18.00, title: 'Tecnico Specializzato', description: 'PROSSIMO OBIETTIVO - Tecnico qualificato' },
    7: { rate: 22.50, title: 'Specialista/Quadro Intermedio', description: 'Responsabilità tecniche avanzate' },
    8: { rate: 28.00, title: 'Dirigente/Quadro Senior', description: 'Livello dirigenziale' }
  };
  
  const progression = {
    current: {
      level: 5,
      title: levels[5].title,
      rate: currentHourlyRate,
      description: 'La tua posizione attuale - hai raggiunto un livello qualificato!'
    },
    previous: {
      level: 3,
      title: levels[3].title,
      rate: levels[3].rate,
      description: 'Il tuo livello di partenza - ottima crescita!'
    },
    next: {
      level: 6,
      title: levels[6].title,
      targetRate: levels[6].rate,
      potentialIncrease: levels[6].rate - currentHourlyRate,
      description: 'Prossimo livello di avanzamento - diventerai tecnico!'
    },
    achievement: '🎉 CONGRATULAZIONI! Progressione da Livello 3 a Livello 5 = +2 LIVELLI!',
    levelsAdvanced: 2, // Da 3 a 5
    monthlyIncreaseNext: ((levels[6].rate - currentHourlyRate) * 8 * 26).toFixed(2),
    careerGrowth: 'Eccellente progressione di carriera - da Operaio Comune a Operaio Qualificato Specializzato'
  };
  
  return progression;
};

// Display career information
export const getCareerInfo = () => {
  const contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  const progression = analyzeCareerProgression(contract);
  
  return {
    contract,
    progression,    summary: {
      currentLevel: '5 - Operaio Qualificato Specializzato',
      startedAt: 'Livello 3 - Operaio Comune',
      achievement: '🏆 Avanzamento di +2 livelli nella gerarchia CCNL (3→5)',
      nextGoal: 'Livello 6 - Tecnico Specializzato',
      experienceLevel: 'Qualificato/Specializzato - Ottima progressione!'
    }
  };
};

// Verify contract with payslip data
export const verifyWithPayslip = () => {
  const contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  const validation = validateContractData(contract);
  const levelCheck = determineContractLevel(contract.hourlyRate);
  
  console.log('=== VERIFICA CONTRATTO CCNL ===');
  console.log(`Fonte: ${contract.source}`);
  console.log(`Retribuzione mensile: €${contract.monthlySalary}`);
  console.log(`Retribuzione oraria: €${contract.hourlyRate}`);
  console.log(`Livello determinato: ${levelCheck.level} (${levelCheck.confidence} confidenza)`);
  console.log(`Note: ${levelCheck.note}`);
  
  return {
    contract,
    validation,
    levelCheck
  };
};

// 💰 TRATTENUTE FISCALI E CONTRIBUTIVE - CCNL METALMECCANICO
export const TAX_DEDUCTIONS = {
  // 🏛️ Contributi Previdenziali INPS (a carico del lavoratore)
  INPS_EMPLOYEE: {
    rate: 0.0919, // 9.19% - Aliquota contributiva dipendente
    description: 'Contributi previdenziali INPS a carico del lavoratore',
    maxAnnualBase: 118000, // Massimale contributivo annuo 2025
  },
  
  // 🏥 Contributi Assicurativi INAIL (non a carico del lavoratore)
  // INAIL è a carico del datore di lavoro, non viene trattenuto
  
  // 💼 Trattenute Fiscali IRPEF
  IRPEF: {
    // Scaglioni IRPEF 2025
    brackets: [
      { min: 0, max: 28000, rate: 0.23 }, // 23% fino a 28.000€
      { min: 28000, max: 50000, rate: 0.35 }, // 35% da 28.001€ a 50.000€
      { min: 50000, max: Infinity, rate: 0.43 } // 43% oltre 50.000€
    ],
    description: 'Imposta sul reddito delle persone fisiche',
  },
  
  // 🏛️ Addizionali Regionali e Comunali
  REGIONAL_TAX: {
    rate: 0.0173, // 1.73% media nazionale (varia per regione)
    description: 'Addizionale regionale IRPEF',
    variable: true, // Varia per regione
  },
  
  MUNICIPAL_TAX: {
    rate: 0.008, // 0.8% media nazionale (varia per comune)
    description: 'Addizionale comunale IRPEF', 
    variable: true, // Varia per comune
    maxAmount: 800, // Massimo annuo per alcune fasce
  },
  
  // 📋 Detrazioni Fiscali Standard
  DEDUCTIONS: {
    workEmployee: {
      maxAmount: 1880, // Detrazione lavoro dipendente max
      threshold: 15000, // Soglia di applicazione
      description: 'Detrazione lavoro dipendente'
    },
    personalDeduction: 1990, // Detrazione personale base
  }
};

// 🧮 UTILITÀ PER CALCOLO NETTO
export const PAYROLL_CALCULATIONS = {
  // Coefficienti rapidi per stima (approssimativa)
  QUICK_NET_RATES: {
    LOW_INCOME: 0.85, // < 25.000€ annui ~ 85% netto
    MEDIUM_INCOME: 0.75, // 25-40.000€ annui ~ 75% netto  
    HIGH_INCOME: 0.65, // > 40.000€ annui ~ 65% netto
  },
  
  // Soglie di reddito per classificazione
  INCOME_THRESHOLDS: {
    LOW: 25000,
    MEDIUM: 40000,
  },
  
  // Mesi di riferimento per calcolo annuale
  MONTHS_IN_YEAR: 12,
  TYPICAL_WORKDAYS_YEAR: 312, // 26 giorni * 12 mesi
};
