/**
 * 📦 Servizi Centralizzati
 * 
 * Questo file esporta tutti i servizi attivi dell'app in un unico punto.
 * Usa: import { DatabaseService, CalculationService } from '../services';
 * 
 * Regole:
 * - Esporta SOLO servizi attualmente in uso
 * - I servizi deprecati/backup sono in __archivio_test_debug/services/
 * - Per aggiungere un nuovo servizio: importalo e aggiungilo all'export
 */

// === Database ===
export { default as DatabaseService } from './DatabaseService';
export { default as DatabaseLockManager } from './DatabaseLockManager';
export { default as DatabaseHealthService } from './DatabaseHealthService';
export { default as DataUpdateService } from './DataUpdateService';

// === Calcoli ===
export { default as CalculationService } from './CalculationService';
export { default as TimeCalculator } from './TimeCalculator';
export { default as StandbyCalculator } from './StandbyCalculator';
export { default as AllowanceCalculator } from './AllowanceCalculator';
export { default as EarningsCalculator } from './EarningsCalculator';
export { default as NetEarningsCalculator } from './NetEarningsCalculator';
export { default as RealPayslipCalculator } from './RealPayslipCalculator';

// === Backup ===
export { default as BackupService } from './BackupService';
export { default as BackupCleanupService } from './BackupCleanupService';
export { default as AutoBackupService } from './AutoBackupService';
export { default as NativeBackupService } from './NativeBackupService';
export { default as NativeBackgroundBackup } from './NativeBackgroundBackup';
export { default as BackgroundBackupTask } from './BackgroundBackupTask';

// === Notifiche ===
export { default as SuperNotificationService } from './SuperNotificationService';
export { default as AlternativeNotificationService } from './AlternativeNotificationService';
export { default as EnhancedNotificationService } from './EnhancedNotificationService';
export { default as FixedNotificationService } from './FixedNotificationService';
export { default as NativeNotificationService } from './NativeNotificationService';
export { default as NotificationService } from './NotificationService';
export { default as PersistentNotificationService } from './PersistentNotificationService';
export { default as SystemNotificationPersistenceService } from './SystemNotificationPersistenceService';
export { default as BackgroundReprogramService } from './BackgroundReprogramService';
export { default as PushNotificationService } from './PushNotificationService';
export { default as TaskService } from './TaskService';

// === CCNL / Contratti ===
export { default as CCNLUpdateService } from './CCNLUpdateService';
export { default as HourlyRatesService } from './HourlyRatesService';
export { default as HolidayService } from './HolidayService';
export { default as FixedDaysService } from './FixedDaysService';

// === PDF / Stampa ===
export { default as PDFExportService } from './PDFExportService';
export { default as ComprehensivePDFService } from './ComprehensivePDFService';
export { default as MonthlyPrintService } from './MonthlyPrintService';
export { default as FormPrintService } from './FormPrintService';

// === Aggiornamenti ===
export { default as UpdateService } from './UpdateService';
export { default as ManualUpdateService } from './ManualUpdateService';
export { default as UpdateNotificationService } from './UpdateNotificationService';

// === Altro ===
export { default as VacationService } from './VacationService';
export { default as DataUpdateService } from './DataUpdateService';

// ⚠️ Servizi spostati in __archivio_test_debug/services/ (non rimuovere senza verifica):
//   - AutoBackupService_fixed.js → in archivio
//   - CalculationService.new.js → in archivio
//   - EarningsCalculator.js.backup → in archivio
//   - EarningsCalculator.new.js → in archivio
//   - PDFExportService.js.backup → in archivio
//   - PDFExportService.new.js → in archivio
//   - NetEarningsCalculator.updated.js → in archivio
//   - PDFExportServiceNew.js → in archivio
//   - MonthlyPrintService_new.js → in archivio
//   - ComprehensivePDFService_v2.js → in archivio
//   - SimplePDFService.js → in archivio
//   - JavaScriptBackupService.js → in archivio
//   - SuperBackupService.js → in archivio
//   - FixedDaysServiceSimple.js → rimosso
//   - MultiUserTaxCalculator.js → rimosso