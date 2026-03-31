// Test per verificare che i calcoli funzionino correttamente
const { CalculationService } = require('./src/services/CalculationService');

const calculationService = new CalculationService();

// Test workEntry di esempio
const testWorkEntry = {
  date: "2025-07-15",
  siteName: "",
  vehicleDriven: "andata_ritorno",
  departureCompany: "07:30",
  arrivalSite: "08:00",
  workStart1: "08:00",
  workEnd1: "12:00",
  workStart2: "",
  workEnd2: "",
  departureReturn: "",
  arrivalCompany: "",
  interventi: [],
  mealLunchVoucher: 0,
  mealLunchCash: 0,
  mealDinnerVoucher: 0,
  mealDinnerCash: 0,
  travelAllowance: 1,
  travelAllowancePercent: 1,
  trasfertaManualOverride: false,
  isStandbyDay: 0,
  standbyAllowance: 0,
  completamentoGiornata: "nessuno",
  dayType: "lavorativa",
  isFixedDay: false,
  fixedEarnings: 0
};

// Test settings di esempio
const testSettings = {
  contract: {
    monthlySalary: 2800.00,
    hourlyRate: 16.15
  },
  travelSettings: {
    travelCompensationRate: 1,
    travelHoursSetting: "AS_WORK"
  },
  standbySettings: {
    enabled: true,
    standbyDays: {}
  }
};

try {
  console.log("Testing calculateDailyEarnings...");
  const result = calculationService.calculateDailyEarnings(testWorkEntry, testSettings);
  
  console.log("Risultato calcolo:", {
    total: result.total,
    breakdown: result.breakdown
  });
  
  if (result.breakdown && result.breakdown.ordinary && result.breakdown.standby) {
    console.log("✅ Struttura breakdown corretta");
    console.log("Ordinary hours:", result.breakdown.ordinary.hours);
    console.log("Standby structure:", {
      workHours: result.breakdown.standby.workHours,
      travelHours: result.breakdown.standby.travelHours,
      totalEarnings: result.breakdown.standby.totalEarnings
    });
  } else {
    console.log("❌ Struttura breakdown mancante o incorretta");
  }
  
} catch (error) {
  console.error("❌ Errore durante il test:", error.message);
  console.error(error.stack);
}
