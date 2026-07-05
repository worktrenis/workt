const mod = require('./src/services/CalculationService');
const CalculationService = mod.default || mod;

(async () => {
  const svc = new CalculationService();
  const settings = {
    contract: {
      key: 'METALMECCANICO_PMI_L5',
      hourlyRate: 16.41,
      monthlySalary: 2800,
      workingDaysPerMonth: 26,
      overtimeRates: {
        day: 1.2,
        nightUntil22: 1.25,
        nightAfter22: 1.35,
        holiday: 1.3,
        nightHoliday: 1.5,
      },
    },
    standbySettings: {
      enabled: true,
      allowanceType: '24h',
      saturdayAsRest: true,
      saturdayMode: 'festivo',
      customFestivo: 10.63,
      standbyDays: {
        '2026-01-06': { selected: true },
      },
    },
  };

  const workEntry = {
    date: '2026-01-06',
    dayType: 'festivo',
    isFixedDay: true,
    isStandbyDay: 1,
    standbyAllowance: 1,
    interventi: [],
    viaggi: [],
  };

  const b = await svc.calculateEarningsBreakdown(workEntry, settings);
  console.log(
    JSON.stringify(
      {
        totalEarnings: b.totalEarnings,
        standbyAllowance: (b.allowances && b.allowances.standby) || 0,
        isFixedDay: b.details && b.details.isFixedDay,
        dayType: b.details && b.details.dayType,
      },
      null,
      2
    )
  );
})();
