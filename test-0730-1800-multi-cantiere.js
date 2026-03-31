const CalculationService = require('./src/services/CalculationService');

(async () => {
  const calc = new CalculationService();

  const workEntry = {
    date: '2025-08-18',
    workStart1: '08:00',
    workEnd1: '12:00',
    workStart2: '13:00',
    workEnd2: '17:30',
    departureCompany: '06:30',
    arrivalSite: '08:00',
    departureReturn: '17:30',
    arrivalCompany: '18:00',
    travelAllowance: 1,
    travelAllowancePercent: 1,
    isStandbyDay: 0,
    multiShiftTravelAsWork: true
  };

  const settings = {
    contract: {
      hourlyRate: 16.41,
      dailyRate: 111.12,
      overtimeRates: {
        day: 1.2,
        nightUntil22: 1.25,
        nightAfter22: 1.35,
        saturday:1.25,
        holiday:1.3
      }
    },
    travelHoursSetting: 'TRAVEL_RATE_EXCESS',
    travelCompensationRate: 1.0,
    multiShiftTravelAsWork: true,
    standbySettings: { enabled: false },
    travelAllowance: { enabled: true, dailyAmount: 15, selectedOptions: ['HALF_ALLOWANCE_HALF_DAY']},
    mealAllowances: { lunch: { voucherAmount: 5.29 }, dinner: { voucherAmount: 5.29 } }
  };

  try {
    const breakdown = await calc.calculateEarningsBreakdown(workEntry, settings);
    console.log('Result totalHours:', breakdown.totalHours);
    console.log('Result details totalHours:', breakdown.details.totalHours);
    console.log('Ordinary hours object:', breakdown.ordinary?.hours);
    console.log('Breakdown overtimeHours:', breakdown.details?.extraHours || breakdown.breakdown?.overtimeHours);
    console.log('Complete result:', JSON.stringify(breakdown, null, 2));
  } catch (err) {
    console.error('ERRORE in test-case:', err);
  }
})();