/**
 * 💰 CALCOLATORE NETTO STIPENDIO
 * 
 * Calcola il netto dello stipendio usando:
 * 1. Aliquote IRPEF ufficiali 2025 + contributi INPS + addizionali
 * 2. Percentuale personalizzata configurabile dall'utente
 * 
 * @author: Sistema calcolo IRPEF italiano
 * @date: 2025-01-07
 */

export class RealPayslipCalculator {
  constructor(customSettings = null) {
    // 🎯 Impostazioni personalizzate (se fornite)
    this.customSettings = customSettings;
    
    // 📊 Aliquote IRPEF 2025 (scaglioni ufficiali)
    this.irpefBrackets = [
      { min: 0, max: 28000, rate: 0.23 },        // 23% fino a €28.000
      { min: 28000, max: 50000, rate: 0.35 },    // 35% da €28.000 a €50.000
      { min: 50000, max: Infinity, rate: 0.43 }  // 43% oltre €50.000
    ];
    
    // 🏛️ Contributi previdenziali dipendente
    this.socialContributions = {
      inpsEmployee: 0.0919, // 9.19% INPS dipendente
      unemployment: 0.0068, // 0.68% disoccupazione
      total: 0.0987 // 9.87% totale contributi
    };
    
    // 🏢 Addizionali regionali e comunali (medie nazionali)
    this.additionalTaxes = {
      regional: 0.0173,     // 1.73% addizionale regionale media
      municipal: 0.008,     // 0.8% addizionale comunale media
      total: 0.0253        // 2.53% totale addizionali
    };
    
    // 💸 Detrazioni standard (dipendente tipo)
    this.standardDeductions = {
      work: 1880,          // Detrazione lavoro dipendente base
      personal: 1955,      // Detrazione personale base (se reddito < €15.000)
      familyDeductions: 0  // Da configurare se necessario
    };
  }

  /**
   * 🎯 CALCOLO NETTO PRINCIPALE
   * Determina il metodo di calcolo in base alle impostazioni
   */
  calculateNet(grossAmount) {
    const settings = this.customSettings || this._getDefaultSettings();
    
    switch (settings.method) {
      case 'irpef':
        return this._calculateWithIRPEF(grossAmount);
      case 'custom':
        return this._calculateWithCustomPercentage(grossAmount, settings.customDeductionRate);
      default:
        return this._calculateWithIRPEF(grossAmount);
    }
  }

  /**
   * 📊 CALCOLO CON ALIQUOTE IRPEF UFFICIALI
   */
  _calculateWithIRPEF(grossAmount) {
    // Calcolo annuale per determinare la fascia IRPEF corretta
    const annualGross = grossAmount * 12;
    
    // 1. Calcolo IRPEF
    const irpefAmount = this._calculateIRPEF(annualGross) / 12;
    
    // 2. Contributi previdenziali
    const socialContributionsAmount = grossAmount * this.socialContributions.total;
    
    // 3. Addizionali regionali e comunali
    const additionalTaxesAmount = grossAmount * this.additionalTaxes.total;
    
    // 4. Totale trattenute
    const totalDeductions = irpefAmount + socialContributionsAmount + additionalTaxesAmount;
    
    // 5. Netto
    const netAmount = grossAmount - totalDeductions;
    
    return {
      gross: grossAmount,
      net: Math.max(0, netAmount),
      totalDeductions: totalDeductions,
      deductionRate: totalDeductions / grossAmount,
      breakdown: {
        irpef: irpefAmount,
        socialContributions: socialContributionsAmount,
        additionalTaxes: additionalTaxesAmount,
        other: 0
      }
    };
  }

  /**
   * 🎯 CALCOLO CON PERCENTUALE PERSONALIZZATA
   */
  _calculateWithCustomPercentage(grossAmount, customPercentage = 25) {
    const deductionRate = customPercentage / 100;
    const totalDeductions = grossAmount * deductionRate;
    const netAmount = grossAmount - totalDeductions;
    
    return {
      gross: grossAmount,
      net: Math.max(0, netAmount),
      totalDeductions: totalDeductions,
      deductionRate: deductionRate,
      breakdown: {
        custom: totalDeductions,
        irpef: 0,
        socialContributions: 0,
        additionalTaxes: 0,
        other: 0
      }
    };
  }

  /**
   * 📋 CALCOLO IRPEF A SCAGLIONI
   */
  _calculateIRPEF(annualIncome) {
    let totalIRPEF = 0;
    let remainingIncome = annualIncome;
    
    for (const bracket of this.irpefBrackets) {
      if (remainingIncome <= 0) break;
      
      const taxableInThisBracket = Math.min(
        remainingIncome, 
        bracket.max - bracket.min
      );
      
      const taxInThisBracket = taxableInThisBracket * bracket.rate;
      totalIRPEF += taxInThisBracket;
      
      remainingIncome -= taxableInThisBracket;
    }
    
    // Applica detrazioni standard
    const deductions = this._calculateDeductions(annualIncome);
    
    return Math.max(0, totalIRPEF - deductions);
  }

  /**
   * 💸 CALCOLO DETRAZIONI
   */
  _calculateDeductions(annualIncome) {
    let totalDeductions = this.standardDeductions.work;
    
    // Detrazione personale (decresce con il reddito)
    if (annualIncome <= 15000) {
      totalDeductions += this.standardDeductions.personal;
    } else if (annualIncome <= 28000) {
      // Detrazione decrescente
      const reduction = (annualIncome - 15000) / 13000;
      totalDeductions += this.standardDeductions.personal * (1 - reduction);
    }
    
    return totalDeductions;
  }

  /**
   * ⚙️ IMPOSTAZIONI DEFAULT
   */
  _getDefaultSettings() {
    return {
      method: 'irpef',
      customDeductionRate: 25
    };
  }

  /**
   * 📊 METODI DI UTILITÀ PER LA DASHBOARD
   */
  static calculateNetFromGross(grossAmount, settings = null) {
    const calculator = new RealPayslipCalculator(settings);
    return calculator.calculateNet(grossAmount);
  }

  static calculateGrossFromNet(netAmount, settings = null) {
    const calculator = new RealPayslipCalculator(settings);
    
    // Algoritmo iterativo per trovare il lordo che produce il netto desiderato
    let grossEstimate = netAmount * 1.35; // Stima iniziale
    let iterations = 0;
    const maxIterations = 50;
    const tolerance = 0.01;
    
    while (iterations < maxIterations) {
      const result = calculator.calculateNet(grossEstimate);
      const netDifference = result.net - netAmount;
      
      if (Math.abs(netDifference) <= tolerance) {
        return grossEstimate;
      }
      
      // Aggiusta la stima
      grossEstimate -= netDifference;
      iterations++;
    }
    
    return grossEstimate;
  }

  /**
   * 📈 CALCOLO PERCENTUALE TRATTENUTE
   */
  static getDeductionRate(grossAmount, settings = null) {
    const result = RealPayslipCalculator.calculateNetFromGross(grossAmount, settings);
    return result.deductionRate;
  }

  /**
   * 🔍 DETTAGLIO TRATTENUTE
   */
  static getDeductionBreakdown(grossAmount, settings = null) {
    const result = RealPayslipCalculator.calculateNetFromGross(grossAmount, settings);
    return result.breakdown;
  }
}

export default RealPayslipCalculator;
