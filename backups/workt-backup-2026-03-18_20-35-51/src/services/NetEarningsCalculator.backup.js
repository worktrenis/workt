/**
 * 💰 SERVIZIO CALCOLO NETTO - CCNL Metalmeccanico PMI
 * 
 * Calcola il guadagno netto con priorità ai dati reali delle buste paga.
 * Include fallback a calcoli teorici per compatibilità.
 * 
 * PRIORITÀ:
 * 1. 🎯 Dati reali da buste paga CCNL (marzo-maggio 2025)
 * 2. 📊 Calcolo teorico CCNL con trattenute standard
 * 3. 🚀 Stima rapida per performance
 * 
 * @updated: 2025-01-07 - Integrazione dati reali buste paga
 */

import { TAX_DEDUCTIONS, PAYROLL_CALCULATIONS, CCNL_CONTRACTS } from '../constants';
import { RealPayslipCalculator, realPayslipCalculator } from './RealPayslipCalculator';

export class NetEarningsCalculator {
  constructor(contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5) {
    this.contract = contract;
    this.annualSalary = contract.monthlySalary * 12; // Stipendio annuo base
  }

  /**
   * 🚀 CALCOLO RAPIDO - Ora utilizza dati reali delle buste paga
   * Priorità: dati reali > stima veloce > fallback
   * 
   * @param {number} grossAmount - Importo lordo
   * @returns {object} - { net, deductions, rate }
   */
  calculateQuickNet(grossAmount) {
    try {
      // 🎯 PRIORITÀ 1: Usa il calcolatore basato su buste paga reali
      if (realPayslipCalculator) {
        const realCalculation = realPayslipCalculator.calculateRealNet(grossAmount);
        if (realCalculation && realCalculation.method !== 'empty') {
          return {
            ...realCalculation,
            method: 'real_payslip_quick',
            priority: 1,
            dataSource: 'Buste paga CCNL'
          };
        }
      }

      // 🔄 PRIORITÀ 2: Fallback al calcolo teorico rapido
      const estimatedAnnual = grossAmount * PAYROLL_CALCULATIONS.TYPICAL_WORKDAYS_YEAR / 26;
      
      let netRate;
      if (estimatedAnnual <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.LOW) {
        netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.LOW_INCOME; // 85%
      } else if (estimatedAnnual <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.MEDIUM) {
        netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.MEDIUM_INCOME; // 75%
      } else {
        netRate = PAYROLL_CALCULATIONS.QUICK_NET_RATES.HIGH_INCOME; // 65%
      }

      const netAmount = grossAmount * netRate;
      const totalDeductions = grossAmount - netAmount;

      return {
        gross: grossAmount,
        net: netAmount,
        totalDeductions,
        deductionRate: 1 - netRate,
        method: 'theoretical_quick',
        priority: 2,
        incomeCategory: this._getIncomeCategory(estimatedAnnual)
      };
    } catch (error) {
      console.error('Errore calcolo rapido netto:', error);
      return {
        gross: grossAmount,
        net: grossAmount * 0.75, // Fallback al 75%
        totalDeductions: grossAmount * 0.25,
        deductionRate: 0.25,
        method: 'emergency_fallback',
        priority: 3,
        error: error.message
      };
    }
  }

  /**
   * 🎯 CALCOLO DETTAGLIATO - Priorità ai dati reali + breakdown teorico
   * 
   * @param {number} grossAmount - Importo lordo
   * @param {object} options - Opzioni per personalizzazione
   * @returns {object} - Breakdown completo delle trattenute
   */
  calculateDetailedNet(grossAmount, options = {}) {
    try {
      // 🎯 PRIORITÀ 1: Calcolo con dati reali e breakdown
      if (realPayslipCalculator) {
        const realCalculation = realPayslipCalculator.calculateWithBreakdown(grossAmount);
        if (realCalculation && realCalculation.method !== 'empty') {
          return {
            ...realCalculation,
            method: 'real_payslip_detailed',
            priority: 1,
            confidence: 'high'
          };
        }
      }

      // 🔄 PRIORITÀ 2: Calcolo teorico dettagliato
      const {
        regionalTaxRate = TAX_DEDUCTIONS.REGIONAL_TAX.rate,
        municipalTaxRate = TAX_DEDUCTIONS.MUNICIPAL_TAX.rate,
        includeDeductions = true
      } = options;

      // 1. 🏛️ Contributi INPS (9.19%)
      const inpsContribution = this._calculateINPS(grossAmount);

      // 2. 📊 Base imponibile per IRPEF (lordo - contributi)
      const taxableBase = grossAmount - inpsContribution;

      // 3. 💼 IRPEF con scaglioni progressivi
      const irpef = this._calculateIRPEF(taxableBase);

      // 4. 🏛️ Addizionali regionali e comunali
      const regionalTax = taxableBase * regionalTaxRate;
      const municipalTax = Math.min(taxableBase * municipalTaxRate, TAX_DEDUCTIONS.MUNICIPAL_TAX.maxAmount / 12);

      // 5. 📋 Detrazioni fiscali
      const deductions = includeDeductions ? this._calculateDeductions(grossAmount) : 0;

      // 6. 💰 Calcolo netto finale
      const totalTaxes = irpef + regionalTax + municipalTax - deductions;
      const totalDeductions = inpsContribution + Math.max(totalTaxes, 0); // Non può essere negativo
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
          deductions: deductions,
          totalTaxes: Math.max(totalTaxes, 0)
        },
        taxableBase,
        effectiveRate: totalDeductions / grossAmount,
        method: 'theoretical_detailed',
        priority: 2,
        confidence: 'medium'
      };
    } catch (error) {
      console.error('Errore calcolo dettagliato netto:', error);
      // Fallback al calcolo rapido
      return this.calculateQuickNet(grossAmount);
    }
  }

  /**
   * 📊 CALCOLO MENSILE - Per stipendi mensili completi
   * Ottimizzato per calcoli su base mensile con tredicesima/quattordicesima
   * 
   * @param {number} monthlyGross - Lordo mensile
   * @param {boolean} includeBonuses - Include tredicesima/quattordicesima
   * @returns {object} - Calcolo mensile dettagliato
   */
  calculateMonthlyNet(monthlyGross, includeBonuses = false) {
    try {
      // Calcolo base mensile
      const baseCalculation = this.calculateDetailedNet(monthlyGross);

      // Se richiesto, include le mensilità aggiuntive
      if (includeBonuses) {
        const yearlyGross = monthlyGross * 14; // 12 + tredicesima + quattordicesima
        const yearlyNet = this.calculateDetailedNet(yearlyGross / 12); // Media mensile
        
        return {
          ...baseCalculation,
          bonuses: {
            thirteenthMonth: yearlyNet.net,
            fourteenthMonth: yearlyNet.net,
            totalYearlyNet: yearlyNet.net * 14
          },
          method: 'monthly_with_bonuses'
        };
      }

      return {
        ...baseCalculation,
        method: 'monthly'
      };
    } catch (error) {
      console.error('Errore calcolo mensile netto:', error);
      return this.calculateQuickNet(monthlyGross);
    }
  }

  // 🔧 METODI PRIVATI PER CALCOLI SPECIFICI

  _calculateINPS(grossAmount) {
    // Contributi INPS: 9.19% del lordo
    // Massimale contributivo applicato su base annua
    const maxMonthlyBase = TAX_DEDUCTIONS.INPS_EMPLOYEE.maxAnnualBase / 12;
    const contributionBase = Math.min(grossAmount, maxMonthlyBase);
    return contributionBase * TAX_DEDUCTIONS.INPS_EMPLOYEE.rate;
  }

  _calculateIRPEF(taxableAmount) {
    // IRPEF a scaglioni progressivi
    let totalIrpef = 0;
    let remainingAmount = taxableAmount;

    for (const bracket of TAX_DEDUCTIONS.IRPEF.brackets) {
      if (remainingAmount <= 0) break;

      const bracketMax = bracket.max === Infinity ? remainingAmount : Math.min(bracket.max - bracket.min, remainingAmount);
      const bracketAmount = Math.min(remainingAmount, bracketMax);
      
      totalIrpef += bracketAmount * bracket.rate;
      remainingAmount -= bracketAmount;
    }

    return totalIrpef;
  }

  _calculateDeductions(grossAmount) {
    // Detrazioni fiscali standard per lavoro dipendente
    const workDeduction = Math.min(
      TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.maxAmount / 12,
      (TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.maxAmount * 
       Math.max(0, TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.threshold - grossAmount * 12) / 
       TAX_DEDUCTIONS.DEDUCTIONS.workEmployee.threshold) / 12
    );
    
    const personalDeduction = TAX_DEDUCTIONS.DEDUCTIONS.personalDeduction / 12;
    
    return workDeduction + personalDeduction;
  }

  _getIncomeCategory(annualIncome) {
    if (annualIncome <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.LOW) {
      return 'low'; // Reddito basso
    } else if (annualIncome <= PAYROLL_CALCULATIONS.INCOME_THRESHOLDS.MEDIUM) {
      return 'medium'; // Reddito medio
    } else {
      return 'high'; // Reddito alto
    }
  }

  /**
   * 🏷️ METODI DI UTILITÀ PUBBLICA
   */

  // Formatta importi in euro
  formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0,00 €';
    return `${amount.toFixed(2).replace('.', ',')} €`;
  }

  // Calcola la percentuale di trattenute
  getDeductionPercentage(gross, net) {
    if (gross === 0) return 0;
    return ((gross - net) / gross * 100);
  }

  // Confronta diverse tipologie di calcolo
  compareCalculationMethods(grossAmount) {
    const quick = this.calculateQuickNet(grossAmount);
    const detailed = this.calculateDetailedNet(grossAmount);
    
    return {
      quick,
      detailed,
      difference: {
        amount: detailed.net - quick.net,
        percentage: ((detailed.net - quick.net) / quick.net * 100)
      }
    };
  }
}

// 🎯 ISTANZA DEFAULT PER L'APP
export const netCalculator = new NetEarningsCalculator();

// 🚀 FUNZIONI DI CONVENIENCE PER USO RAPIDO
export const calculateQuickNet = (gross) => netCalculator.calculateQuickNet(gross);
export const calculateDetailedNet = (gross, options) => netCalculator.calculateDetailedNet(gross, options);
export const calculateMonthlyNet = (monthlyGross, includeBonuses) => netCalculator.calculateMonthlyNet(monthlyGross, includeBonuses);

export default NetEarningsCalculator;
