// CCNL Contract Constants and Calculations

export const CCNL_CONTRACTS = {
  METALMECCANICO_PMI_L1: {
    name: 'CCNL Metalmeccanico PMI - Livello 1',
    code: 'METAL_PMI_L1',
    monthlySalary: 1417.36,
    dailyRate: 54.52, // 1417.36 / 26
    hourlyRate: 8.19, // 1417.36 / 173
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 1'
  },
  METALMECCANICO_PMI_L2: {
    name: 'CCNL Metalmeccanico PMI - Livello 2',
    code: 'METAL_PMI_L2',
    monthlySalary: 1565.32,
    dailyRate: 60.20,
    hourlyRate: 9.05,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 2'
  },
  METALMECCANICO_PMI_L3: {
    name: 'CCNL Metalmeccanico PMI - Livello 3',
    code: 'METAL_PMI_L3',
    monthlySalary: 1736.76,
    dailyRate: 66.80,
    hourlyRate: 10.04,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 3'
  },
  METALMECCANICO_PMI_L4: {
    name: 'CCNL Metalmeccanico PMI - Livello 4',
    code: 'METAL_PMI_L4',
    monthlySalary: 1812.06,
    dailyRate: 69.70,
    hourlyRate: 10.48,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 4'
  },
  METALMECCANICO_PMI_L5: {
    name: 'CCNL Metalmeccanico PMI - Livello 5',
    code: 'METAL_PMI_L5',
    monthlySalary: 1941.07,
    dailyRate: 74.66,
    hourlyRate: 11.22,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 5'
  },
  METALMECCANICO_PMI_L6: {
    name: 'CCNL Metalmeccanico PMI - Livello 6',
    code: 'METAL_PMI_L6',
    monthlySalary: 2081.18,
    dailyRate: 80.05,
    hourlyRate: 12.03,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 6'
  },
  METALMECCANICO_PMI_L7: {
    name: 'CCNL Metalmeccanico PMI - Livello 7',
    code: 'METAL_PMI_L7',
    monthlySalary: 2232.77,
    dailyRate: 85.88,
    hourlyRate: 12.90,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 7'
  },
  METALMECCANICO_PMI_L8: {
    name: 'CCNL Metalmeccanico PMI - Livello 8',
    code: 'METAL_PMI_L8',
    monthlySalary: 2428.09,
    dailyRate: 93.39,
    hourlyRate: 14.04,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 8'
  },
  METALMECCANICO_PMI_L9: {
    name: 'CCNL Metalmeccanico PMI - Livello 9',
    code: 'METAL_PMI_L9',
    monthlySalary: 2700.29,
    dailyRate: 103.86,
    hourlyRate: 15.61,
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
    lastUpdated: '2025-07-23',
    source: 'CCNL Metalmeccanico PMI - Livello 9'
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
};

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
