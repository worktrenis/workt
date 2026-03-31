/**
 * 🏦 SISTEMA MULTIUTENTE DI CALCOLO FISCALE PERSONALIZZATO
 * 
 * Sistema avanzato per calcolo trattenute fiscali personalizzate per ogni utente,
 * supportando diversi profili fiscali, contratti CCNL e situazioni familiari.
 * 
 * CARATTERISTICHE:
 * - 👥 Multi-utente con profili personalizzati
 * - 🎯 Scaglioni IRPEF 2025 reali
 * - 📊 Calcolo basato su dati reali + algoritmi adattivi
 * - 🔧 Configurazione per diversi CCNL
 * - 🏠 Considerazione situazione familiare
 * - 🌍 Addizionali regionali/comunali personalizzabili
 * 
 * @author: Sistema Multi-Utente Work Hours Tracker
 * @date: 2025-01-07
 */

// 🏛️ DATI FISCALI UFFICIALI ITALIA 2025
export const OFFICIAL_TAX_DATA_2025 = {
  // Scaglioni IRPEF ufficiali 2025
  IRPEF_BRACKETS: [
    { min: 0, max: 28000, rate: 0.23, description: '23% fino a €28.000' },
    { min: 28000, max: 50000, rate: 0.35, description: '35% da €28.001 a €50.000' },
    { min: 50000, max: Infinity, rate: 0.43, description: '43% oltre €50.000' }
  ],
  
  // Contributi previdenziali standard
  INPS_EMPLOYEE_RATE: 0.0919, // 9.19%
  INPS_MAX_ANNUAL_BASE: 118000, // Massimale contributivo 2025
  
  // Addizionali medie nazionali (personalizzabili per regione/comune)
  REGIONAL_TAX_RATES: {
    DEFAULT: 0.0173, // 1.73% media nazionale
    LOMBARDIA: 0.0173,
    VENETO: 0.0173,
    EMILIA_ROMAGNA: 0.0173,
    // Aggiungere altre regioni secondo necessità
  },
  
  MUNICIPAL_TAX_RATES: {
    DEFAULT: 0.008, // 0.8% media nazionale  
    MAX_ANNUAL: 800, // Massimo annuo per alcune fasce
    // Personalizzabile per comune
  },
  
  // Detrazioni fiscali standard
  DEDUCTIONS: {
    WORK_EMPLOYEE: {
      MAX_ANNUAL: 1880,
      THRESHOLD: 15000
    },
    PERSONAL: 1990,
    FAMILY_DEPENDENT: 800, // Per familiari a carico
    SPOUSE: 690 // Detrazione coniuge
  }
};

// 👤 PROFILI UTENTE PERSONALIZZATI
export class UserFiscalProfile {
  constructor(userData = {}) {
    this.userId = userData.userId || 'default';
    this.personalInfo = {
      name: userData.name || 'Utente',
      taxCode: userData.taxCode || '',
      birthYear: userData.birthYear || 1990,
      region: userData.region || 'DEFAULT',
      municipality: userData.municipality || 'DEFAULT'
    };
    
    // 💼 Dati contrattuali
    this.contractInfo = {
      ccnl: userData.ccnl || 'METALMECCANICO_PMI_L5',
      level: userData.level || 5,
      monthlySalary: userData.monthlySalary || 2800.00,
      hireDateYear: userData.hireDateYear || 2024
    };
    
    // 👨‍👩‍👧‍👦 Situazione familiare
    this.familyInfo = {
      maritalStatus: userData.maritalStatus || 'single', // single, married, divorced
      dependents: userData.dependents || 0,
      spouseWorking: userData.spouseWorking || false,
      spouseIncome: userData.spouseIncome || 0
    };
    
    // 🎯 Dati storici personalizzati (se disponibili)
    this.historicalData = userData.historicalData || {
      hasRealPayslips: false,
      payslipData: [],
      averageDeductionRate: null,
      customBreakdown: null
    };
    
    // 🔧 Preferenze fiscali personalizzate
    this.fiscalPreferences = {
      regionalTaxRate: this._getRegionalTaxRate(),
      municipalTaxRate: this._getMunicipalTaxRate(),
      useHistoricalData: userData.useHistoricalData || false,
      accuracyLevel: userData.accuracyLevel || 'high' // high, medium, fast
    };
  }
  
  // 🌍 Calcola aliquota regionale personalizzata
  _getRegionalTaxRate() {
    return OFFICIAL_TAX_DATA_2025.REGIONAL_TAX_RATES[this.personalInfo.region] || 
           OFFICIAL_TAX_DATA_2025.REGIONAL_TAX_RATES.DEFAULT;
  }
  
  // 🏘️ Calcola aliquota comunale personalizzata  
  _getMunicipalTaxRate() {
    // In futuro si può implementare un database comuni
    return OFFICIAL_TAX_DATA_2025.MUNICIPAL_TAX_RATES.DEFAULT;
  }
  
  // 📊 Aggiorna con dati reali buste paga
  updateWithRealPayslipData(payslipData) {
    this.historicalData.hasRealPayslips = true;
    this.historicalData.payslipData = payslipData;
    
    // Calcola tasso medio di detrazione dai dati reali
    if (payslipData.length > 0) {
      const totalGross = payslipData.reduce((sum, p) => sum + p.gross, 0);
      const totalNet = payslipData.reduce((sum, p) => sum + p.net, 0);
      this.historicalData.averageDeductionRate = (totalGross - totalNet) / totalGross;
    }
    
    this.fiscalPreferences.useHistoricalData = true;
  }
  
  // 📋 Salva profilo per persistenza
  toJSON() {
    return {
      userId: this.userId,
      personalInfo: this.personalInfo,
      contractInfo: this.contractInfo,
      familyInfo: this.familyInfo,
      historicalData: this.historicalData,
      fiscalPreferences: this.fiscalPreferences,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // 📥 Carica profilo da dati salvati
  static fromJSON(data) {
    return new UserFiscalProfile(data);
  }
}

// 💰 CALCOLATORE FISCALE MULTIUTENTE AVANZATO
export class MultiUserTaxCalculator {
  constructor() {
    this.userProfiles = new Map(); // Gestione profili utente
    this.defaultProfile = new UserFiscalProfile(); // Profilo di default
  }
  
  // 👤 Gestione profili utente
  addUserProfile(userProfile) {
    this.userProfiles.set(userProfile.userId, userProfile);
  }
  
  getUserProfile(userId) {
    return this.userProfiles.get(userId) || this.defaultProfile;
  }
  
  /**
   * 🎯 CALCOLO NETTO PERSONALIZZATO PRINCIPALE
   * 
   * @param {number} grossAmount - Importo lordo
   * @param {string} userId - ID utente (opzionale)
   * @param {object} options - Opzioni aggiuntive
   * @returns {object} - Calcolo completo personalizzato
   */
  calculatePersonalizedNet(grossAmount, userId = 'default', options = {}) {
    const userProfile = this.getUserProfile(userId);
    
    try {
      // 🎯 Priorità 1: Dati reali se disponibili
      if (userProfile.historicalData.hasRealPayslips && userProfile.fiscalPreferences.useHistoricalData) {
        return this._calculateFromRealData(grossAmount, userProfile);
      }
      
      // 📊 Priorità 2: Calcolo teorico personalizzato
      return this._calculateTheoreticalPersonalized(grossAmount, userProfile, options);
      
    } catch (error) {
      console.error(`Errore calcolo per utente ${userId}:`, error);
      return this._getFallbackCalculation(grossAmount, userProfile);
    }
  }
  
  /**
   * 📊 CALCOLO DA DATI REALI PERSONALIZZATI
   */
  _calculateFromRealData(grossAmount, userProfile) {
    const historicalRate = userProfile.historicalData.averageDeductionRate;
    const netAmount = grossAmount * (1 - historicalRate);
    const totalDeductions = grossAmount - netAmount;
    
    return {
      gross: grossAmount,
      net: netAmount,
      totalDeductions,
      deductionRate: historicalRate,
      method: 'real_personalized',
      userProfile: userProfile.personalInfo.name,
      confidence: 'very_high',
      dataSource: `${userProfile.historicalData.payslipData.length} buste paga reali`
    };
  }
  
  /**
   * 🧮 CALCOLO TEORICO PERSONALIZZATO CON SCAGLIONI REALI
   */
  _calculateTheoreticalPersonalized(grossAmount, userProfile, options = {}) {
    // 1. 🏛️ Contributi INPS personalizzati
    const inpsContribution = this._calculatePersonalizedINPS(grossAmount, userProfile);
    
    // 2. 📊 Base imponibile IRPEF
    const taxableBase = grossAmount - inpsContribution;
    
    // 3. 💼 IRPEF con scaglioni 2025 reali
    const irpef = this._calculatePersonalizedIRPEF(taxableBase, userProfile);
    
    // 4. 🌍 Addizionali personalizzate per regione/comune
    const regionalTax = taxableBase * userProfile.fiscalPreferences.regionalTaxRate;
    const municipalTax = Math.min(
      taxableBase * userProfile.fiscalPreferences.municipalTaxRate,
      OFFICIAL_TAX_DATA_2025.MUNICIPAL_TAX_RATES.MAX_ANNUAL / 12
    );
    
    // 5. 👨‍👩‍👧‍👦 Detrazioni personalizzate per situazione familiare
    const deductions = this._calculatePersonalizedDeductions(grossAmount, userProfile);
    
    // 6. 💰 Calcolo finale
    const totalTaxes = irpef + regionalTax + municipalTax - deductions;
    const totalDeductions = inpsContribution + Math.max(totalTaxes, 0);
    const netAmount = grossAmount - totalDeductions;
    
    return {
      gross: grossAmount,
      net: netAmount,
      totalDeductions,
      breakdown: {
        inpsContribution,
        irpef,
        regionalTax,
        municipalTax,
        deductions,
        totalTaxes: Math.max(totalTaxes, 0)
      },
      personalizedFactors: {
        region: userProfile.personalInfo.region,
        familyDeductions: deductions,
        ccnl: userProfile.contractInfo.ccnl,
        dependents: userProfile.familyInfo.dependents
      },
      taxableBase,
      effectiveRate: totalDeductions / grossAmount,
      method: 'theoretical_personalized',
      userProfile: userProfile.personalInfo.name,
      confidence: 'high'
    };
  }
  
  /**
   * 🏛️ INPS personalizzato per CCNL
   */
  _calculatePersonalizedINPS(grossAmount, userProfile) {
    const maxMonthlyBase = OFFICIAL_TAX_DATA_2025.INPS_MAX_ANNUAL_BASE / 12;
    const contributionBase = Math.min(grossAmount, maxMonthlyBase);
    
    // Possibilità di personalizzare per CCNL diversi
    let inpsRate = OFFICIAL_TAX_DATA_2025.INPS_EMPLOYEE_RATE;
    
    // Esempio: rate diverse per CCNL diversi (da implementare se necessario)
    // if (userProfile.contractInfo.ccnl === 'COMMERCIO') {
    //   inpsRate = 0.0919; // Stesso rate o diverso
    // }
    
    return contributionBase * inpsRate;
  }
  
  /**
   * 💼 IRPEF personalizzata con scaglioni 2025 reali
   */
  _calculatePersonalizedIRPEF(taxableAmount, userProfile) {
    let totalIrpef = 0;
    let remainingAmount = taxableAmount;
    
    // Applica scaglioni IRPEF 2025 ufficiali
    for (const bracket of OFFICIAL_TAX_DATA_2025.IRPEF_BRACKETS) {
      if (remainingAmount <= 0) break;
      
      const bracketAmount = bracket.max === Infinity ? 
        remainingAmount : 
        Math.min(bracket.max - bracket.min, remainingAmount);
        
      const taxableInBracket = Math.min(remainingAmount, bracketAmount);
      totalIrpef += taxableInBracket * bracket.rate;
      remainingAmount -= taxableInBracket;
    }
    
    return totalIrpef;
  }
  
  /**
   * 👨‍👩‍👧‍👦 Detrazioni personalizzate per situazione familiare
   */
  _calculatePersonalizedDeductions(grossAmount, userProfile) {
    let totalDeductions = 0;
    
    // Detrazione lavoro dipendente
    const workDeduction = Math.min(
      OFFICIAL_TAX_DATA_2025.DEDUCTIONS.WORK_EMPLOYEE.MAX_ANNUAL / 12,
      (OFFICIAL_TAX_DATA_2025.DEDUCTIONS.WORK_EMPLOYEE.MAX_ANNUAL * 
       Math.max(0, OFFICIAL_TAX_DATA_2025.DEDUCTIONS.WORK_EMPLOYEE.THRESHOLD - grossAmount * 12) / 
       OFFICIAL_TAX_DATA_2025.DEDUCTIONS.WORK_EMPLOYEE.THRESHOLD) / 12
    );
    
    // Detrazione personale
    const personalDeduction = OFFICIAL_TAX_DATA_2025.DEDUCTIONS.PERSONAL / 12;
    
    // Detrazione per familiari a carico
    const dependentsDeduction = userProfile.familyInfo.dependents * 
      (OFFICIAL_TAX_DATA_2025.DEDUCTIONS.FAMILY_DEPENDENT / 12);
    
    // Detrazione coniuge (se applicabile)
    let spouseDeduction = 0;
    if (userProfile.familyInfo.maritalStatus === 'married' && 
        !userProfile.familyInfo.spouseWorking) {
      spouseDeduction = OFFICIAL_TAX_DATA_2025.DEDUCTIONS.SPOUSE / 12;
    }
    
    totalDeductions = workDeduction + personalDeduction + dependentsDeduction + spouseDeduction;
    
    return totalDeductions;
  }
  
  /**
   * 🚨 Calcolo di emergenza
   */
  _getFallbackCalculation(grossAmount, userProfile) {
    // Usa un tasso di detrazione conservativo basato sulla fascia di reddito
    const annualEstimate = grossAmount * 12;
    let fallbackRate;
    
    if (annualEstimate <= 28000) {
      fallbackRate = 0.25; // 25% per redditi bassi
    } else if (annualEstimate <= 50000) {
      fallbackRate = 0.30; // 30% per redditi medi
    } else {
      fallbackRate = 0.35; // 35% per redditi alti
    }
    
    const netAmount = grossAmount * (1 - fallbackRate);
    const totalDeductions = grossAmount - netAmount;
    
    return {
      gross: grossAmount,
      net: netAmount,
      totalDeductions,
      deductionRate: fallbackRate,
      method: 'fallback_personalized',
      userProfile: userProfile.personalInfo.name,
      confidence: 'low',
      note: 'Calcolo di emergenza'
    };
  }
  
  /**
   * 📊 ANALISI COMPARATIVA TRA METODI
   */
  compareCalculationMethods(grossAmount, userId = 'default') {
    const userProfile = this.getUserProfile(userId);
    
    const real = userProfile.historicalData.hasRealPayslips ? 
      this._calculateFromRealData(grossAmount, userProfile) : null;
    const theoretical = this._calculateTheoreticalPersonalized(grossAmount, userProfile);
    const fallback = this._getFallbackCalculation(grossAmount, userProfile);
    
    return {
      user: userProfile.personalInfo.name,
      realData: real,
      theoretical,
      fallback,
      recommendation: real ? 'real' : 'theoretical',
      differences: real ? {
        realVsTheoretical: real.net - theoretical.net,
        accuracy: Math.abs(real.net - theoretical.net) / real.net * 100
      } : null
    };
  }
  
  /**
   * 📋 REPORT COMPLETO UTENTE
   */
  generateUserReport(userId) {
    const userProfile = this.getUserProfile(userId);
    
    return {
      userInfo: userProfile.personalInfo,
      contractInfo: userProfile.contractInfo,
      familyInfo: userProfile.familyInfo,
      fiscalSetup: {
        regionalTaxRate: `${(userProfile.fiscalPreferences.regionalTaxRate * 100).toFixed(2)}%`,
        municipalTaxRate: `${(userProfile.fiscalPreferences.municipalTaxRate * 100).toFixed(2)}%`,
        hasRealData: userProfile.historicalData.hasRealPayslips,
        dataQuality: userProfile.fiscalPreferences.accuracyLevel
      },
      estimatedAnnualDeductionRate: this._estimateAnnualDeductionRate(userProfile),
      recommendations: this._generateRecommendations(userProfile)
    };
  }
  
  _estimateAnnualDeductionRate(userProfile) {
    if (userProfile.historicalData.hasRealPayslips) {
      return `${(userProfile.historicalData.averageDeductionRate * 100).toFixed(2)}% (da dati reali)`;
    }
    
    // Stima basata su contratto e situazione familiare
    const baseRate = userProfile.contractInfo.monthlySalary * 12 <= 35000 ? 0.25 : 0.30;
    const familyBonus = userProfile.familyInfo.dependents * 0.01; // 1% per figlio
    const finalRate = Math.max(0.20, baseRate - familyBonus);
    
    return `${(finalRate * 100).toFixed(2)}% (stimato)`;
  }
  
  _generateRecommendations(userProfile) {
    const recommendations = [];
    
    if (!userProfile.historicalData.hasRealPayslips) {
      recommendations.push('💡 Aggiungi le tue buste paga reali per calcoli più precisi');
    }
    
    if (userProfile.familyInfo.dependents > 0 && userProfile.familyInfo.maritalStatus === 'single') {
      recommendations.push('👨‍👩‍👧‍👦 Verifica le detrazioni per familiari a carico');
    }
    
    if (userProfile.personalInfo.region === 'DEFAULT') {
      recommendations.push('🌍 Imposta la tua regione per addizionali precise');
    }
    
    return recommendations;
  }
}

// 🎯 ISTANZA GLOBALE MULTIUTENTE
export const multiUserTaxCalculator = new MultiUserTaxCalculator();

// 🚀 FUNZIONI DI CONVENIENCE
export const calculatePersonalizedNet = (gross, userId, options) => 
  multiUserTaxCalculator.calculatePersonalizedNet(gross, userId, options);

export const addUserProfile = (userProfile) => 
  multiUserTaxCalculator.addUserProfile(userProfile);

export const getUserTaxReport = (userId) => 
  multiUserTaxCalculator.generateUserReport(userId);

export { UserFiscalProfile, OFFICIAL_TAX_DATA_2025 };

export default MultiUserTaxCalculator;
