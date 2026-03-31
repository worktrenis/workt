import { useMemo } from 'react';
import CalculationService from '../services/CalculationService';

export const useCalculationService = () => {
  return useMemo(() => {
    const service = new CalculationService();
    return {
      calculateMonthlyStandbyAllowances: (year, month, settings) => 
        service.calculateMonthlyStandbyAllowances(year, month, settings),
      calculateEarningsBreakdown: (entry, settings) => 
        service.calculateEarningsBreakdown(entry, settings),
      calculateEarningsBreakdownSync: (entry, settings) => 
        service.calculateEarningsBreakdownSync(entry, settings),
      calculateDailyEarnings: async (entry, settings) =>
        await service.calculateDailyEarnings(entry, settings),
      calculateMonthlySummary: (entries, settings) =>
        service.calculateMonthlySummary(entries, settings),
      calculateIntegratedBreakdown: (entry, settings) =>
        service.calculateIntegratedBreakdown(entry, settings),
      calculateStandbyAllowanceForDate: (date, settings) =>
        service.calculateStandbyAllowanceForDate(date, settings),
      // Aggiunta dei metodi mancanti per TimeEntryScreen
      calculateWorkHours: (entry) => service.calculateWorkHours(entry),
      calculateTravelHours: (entry) => service.calculateTravelHours(entry),
      calculateStandbyWorkHours: (entry) => service.calculateStandbyWorkHours(entry),
      calculateStandbyTravelHours: (entry) => service.calculateStandbyTravelHours(entry),
      // Aggiunta dei metodi per calcolo durata
      calculateTimeDifference: (startTime, endTime) => service.calculateTimeDifference(startTime, endTime),
      minutesToHours: (minutes) => service.minutesToHours(minutes)
    };
  }, []);
};
