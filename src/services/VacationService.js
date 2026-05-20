import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class VacationService {
  constructor() {
    this.STORAGE_KEY = 'vacation_data';
    this.SETTINGS_KEY = 'vacation_settings';
  }

  // Inizializza il servizio con dati di default
  async initialize() {
    try {
      const settings = await this.getSettings();
      if (!settings) {
        await this.setSettings({
          ferieResAnniPrec: 0,
          ferieMaturatiMensili: 0,
          permROAResAnniPrec: 0,
          permROAMaturatiMensili: 0,
          permFestResAnniPrec: 0,
          permFestMaturatiMensili: 0,
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          autoApprovalEnabled: false,
          autoCompileTimeEntry: false,
        });
      }
    } catch (error) {
      console.error('Errore inizializzazione VacationService:', error);
    }
  }

  // Gestione impostazioni ferie/permessi
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(this.SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Errore caricamento impostazioni ferie:', error);
      return null;
    }
  }

  async setSettings(settings) {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Errore salvataggio impostazioni ferie:', error);
      return false;
    }
  }

  // Gestione richieste ferie/permessi
  async getVacationRequests() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Errore caricamento richieste ferie:', error);
      return [];
    }
  }

  async addVacationRequest(request) {
    try {
      const requests = await this.getVacationRequests();
      let settings = await this.getSettings();
      
      // Se le impostazioni non esistono, creale con valori di default
      if (!settings) {
        // console.log('⚠️ Impostazioni ferie non trovate, creo impostazioni di default');
        settings = {
          ferieResAnniPrec: 0,
          ferieMaturatiMensili: 0,
          permROAResAnniPrec: 0,
          permROAMaturatiMensili: 0,
          permFestResAnniPrec: 0,
          permFestMaturatiMensili: 0,
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          autoApprovalEnabled: false,
          autoCompileEnabled: false
        };
        await this.setSettings(settings);
      }
      
      // Determina lo status in base alle impostazioni di auto-approvazione
      const status = settings?.autoApprovalEnabled === true ? 'approved' : 'pending';
      
      const newRequest = {
        id: Date.now().toString(),
        ...request,
        createdAt: new Date().toISOString(),
        status: status,
        approvedAt: status === 'approved' ? new Date().toISOString() : null,
      };
      
      // console.log('🔍 VacationService.addVacationRequest:', {
      //   settingsExist: !!settings,
      //   autoApprovalEnabled: settings?.autoApprovalEnabled,
      //   autoApprovalType: typeof settings?.autoApprovalEnabled,
      //   requestStatus: status,
      //   newRequestId: newRequest.id
      // });
      
      requests.push(newRequest);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
      return newRequest;
    } catch (error) {
      console.error('Errore aggiunta richiesta ferie:', error);
      return null;
    }
  }

  // Nuovo metodo per verificare e correggere le impostazioni
  async getVacationSettings() {
    try {
      let settings = await this.getSettings();
      
      // Se le impostazioni non esistono, crea con valori a zero (l'utente deve inserire manualmente)
      if (!settings) {
        const defaultSettings = {
          ferieResAnniPrec: 0,
          ferieMaturatiMensili: 0,
          permROAResAnniPrec: 0,
          permROAMaturatiMensili: 0,
          permFestResAnniPrec: 0,
          permFestMaturatiMensili: 0,
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          autoApprovalEnabled: false,
          autoCompileEnabled: false,
          permitBankEnabled: false,
          sickLeaveEnabled: false,
          autoCompileTimeEntry: false,
          countSaturdayAsWorkday: false,
          countSundayAsWorkday: false,
          countHolidaysAsWorkday: false,
        };
        await this.setSettings(defaultSettings);
        settings = defaultSettings;
      }

      // Migrazione da vecchi formati (giorni o ore annuali) al nuovo formato ad accumulo mensile
      if (settings.ferieMaturatiMensili === undefined) {
        const migrated = {
          ...settings,
          ferieResAnniPrec: parseFloat(settings.carryOverHours ?? (settings.carryOverDays || 0) * 8) || 0,
          ferieMaturatiMensili: parseFloat(settings.ferieMaturateAdOggi) || 0,
          permROAResAnniPrec: 0,
          permROAMaturatiMensili: parseFloat(settings.permROAMaturateAdOggi) || 0,
          permFestResAnniPrec: 0,
          permFestMaturatiMensili: parseFloat(settings.permFestMaturateAdOggi) || 0,
        };
        delete migrated.annualVacationDays;
        delete migrated.annualVacationHours;
        delete migrated.carryOverDays;
        delete migrated.carryOverHours;
        delete migrated.maxCarryOverDays;
        delete migrated.maxCarryOverHours;
        delete migrated.permitsPerMonth;
        await this.setSettings(migrated);
        settings = migrated;
      }

      return settings;
    } catch (error) {
      console.error('Errore verifica impostazioni ferie:', error);
      return null;
    }
  }

  // Metodo per approvare automaticamente richieste in attesa (utility)
  async autoApproveAllPendingRequests() {
    try {
      const settings = await this.getVacationSettings();
      
      if (settings?.autoApprovalEnabled !== true) {
        // console.log('⚠️ Auto-approvazione non attiva, non procedo');
        return { approved: 0, message: 'Auto-approvazione non attivata' };
      }
      
      const requests = await this.getVacationRequests();
      const pendingRequests = requests.filter(req => req.status === 'pending');
      
      if (pendingRequests.length === 0) {
        return { approved: 0, message: 'Nessuna richiesta in attesa' };
      }
      
      // console.log(`🔄 Approvo automaticamente ${pendingRequests.length} richieste in attesa`);
      
      pendingRequests.forEach(req => {
        req.status = 'approved';
        req.approvedAt = new Date().toISOString();
        // console.log(`✅ Approvata automaticamente richiesta ${req.id} (${req.type})`);
      });
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
      
      return { 
        approved: pendingRequests.length, 
        message: `Approvate automaticamente ${pendingRequests.length} richieste` 
      };
    } catch (error) {
      console.error('Errore approvazione automatica:', error);
      return { approved: 0, message: 'Errore durante l\'approvazione automatica' };
    }
  }

  async updateVacationRequest(id, updates) {
    try {
      const requests = await this.getVacationRequests();
      const index = requests.findIndex(req => req.id === id);
      if (index !== -1) {
        requests[index] = { ...requests[index], ...updates };
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
        return requests[index];
      }
      return null;
    } catch (error) {
      console.error('Errore aggiornamento richiesta ferie:', error);
      return null;
    }
  }

  async deleteVacationRequest(id) {
    try {
      const requests = await this.getVacationRequests();
      const filtered = requests.filter(req => req.id !== id);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Errore eliminazione richiesta ferie:', error);
      return false;
    }
  }

  // Alias per compatibilità con VacationManagementScreen
  async getAllRequests() {
    return await this.getVacationRequests();
  }

  async deleteRequest(id) {
    return await this.deleteVacationRequest(id);
  }

  // Ottieni riepilogo annuale per dashboard
  async getVacationSummary() {
    try {
      const remaining = await this.calculateRemainingDays();
      const settings = await this.getSettings();
      
      if (!settings) {
        return {
          availableVacationDays: 0,
          usedVacationDays: 0,
          availablePersonalDays: 0,
          usedPersonalDays: 0,
          totalVacationDays: 0,
          totalPersonalDays: 0
        };
      }

      return {
        availableVacationDays: remaining.vacation || 0,
        usedVacationDays: remaining.usedVacation || 0,
        availablePersonalDays: remaining.permits || 0,
        usedPersonalDays: remaining.usedPermits || 0,
        totalVacationDays: remaining.totalVacation || 0,
        totalPersonalDays: remaining.totalPermits || 0
      };
    } catch (error) {
      console.error('Errore calcolo riepilogo ferie:', error);
      return {
        availableVacationDays: 0,
        usedVacationDays: 0,
        availablePersonalDays: 0,
        usedPersonalDays: 0,
        totalVacationDays: 0,
        totalPersonalDays: 0
      };
    }
  }

  // Verifica se una data è coperta da richieste approvate
  async getApprovedRequestForDate(date) {
    try {
      const requests = await this.getVacationRequests();
      const dateObj = new Date(date);
      
      // Cerca richieste approvate che coprono questa data
      const matchingRequest = requests.find(request => {
        if (request.status !== 'approved') return false;
        
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate || request.startDate);
        
        return dateObj >= startDate && dateObj <= endDate;
      });
      
      return matchingRequest || null;
    } catch (error) {
      console.error('Errore verifica richiesta per data:', error);
      return null;
    }
  }

  // Calcoli giorni residui — legge dal database SQLite (inserimenti reali)
  async calculateRemainingDays() {
    try {
      const settings = await this.getSettings();
      if (!settings) return { vacation: 0, permits: 0 };

      const today = new Date();
      const currentYear = today.getFullYear();
      const monthsElapsed = today.getMonth() + 1;
      const dailyHours = 8; // ore giornaliere standard

      // Leggi tutti gli inserimenti dell'anno corrente dal DB
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      let entries = [];
      try {
        entries = await DatabaseService.getWorkEntriesByDateRange(startDate, endDate);
      } catch (e) {
        console.warn('VacationService: impossibile leggere DB, uso richieste formali', e);
      }

      // Helper: calcola ore lavorate (lavoro + viaggio) dalle fasce orarie salvate nel DB
      const computeWorkedHours = (entry) => {
        const parseMin = (t) => {
          if (!t) return null;
          const parts = String(t).split(':');
          if (parts.length < 2) return null;
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        };
        let total = 0;
        // Ore lavoro
        const s1 = parseMin(entry.work_start_1), e1 = parseMin(entry.work_end_1);
        if (s1 !== null && e1 !== null && e1 > s1) total += (e1 - s1) / 60;
        const s2 = parseMin(entry.work_start_2), e2 = parseMin(entry.work_end_2);
        if (s2 !== null && e2 !== null && e2 > s2) total += (e2 - s2) / 60;
        // Ore viaggio (andata + ritorno)
        const dc = parseMin(entry.departure_company), as_ = parseMin(entry.arrival_site);
        if (dc !== null && as_ !== null && as_ > dc) total += (as_ - dc) / 60;
        const dr = parseMin(entry.departure_return), ac = parseMin(entry.arrival_company);
        if (dr !== null && ac !== null && ac > dr) total += (ac - dr) / 60;
        return total;
      };

      // Conta le ore ferie e permesso dagli inserimenti del DB
      // - day_type = 'ferie'/'permesso' → giornata intera (dailyHours)
      // - day_type = 'lavorativa' + completamento_giornata = 'ferie'/'permesso' → ore mancanti a completare la giornata
      // - Rispetta le impostazioni countSaturdayAsWorkday / countSundayAsWorkday / countHolidaysAsWorkday
      const countSat = settings.countSaturdayAsWorkday === true;
      const countSun = settings.countSundayAsWorkday === true;
      const countHol = settings.countHolidaysAsWorkday === true;

      const shouldCountDay = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d)) return true; // se la data non è valida, conta comunque
        const dow = d.getDay(); // 0=Dom, 6=Sab
        if (dow === 6 && !countSat) return false;
        if (dow === 0 && !countSun) return false;
        if (this.isHoliday(d) && !countHol) return false;
        return true;
      };

      let usedVacationHours = 0;
      let usedPermitHours = 0;
      for (const entry of entries) {
        const dayType = entry.day_type || entry.dayType || '';
        const completamento = entry.completamento_giornata || entry.completamentoGiornata || '';
        const isCountable = shouldCountDay(entry.date);
        if (dayType === 'ferie') {
          if (isCountable) usedVacationHours += dailyHours;
        } else if (dayType === 'permesso') {
          if (isCountable) usedPermitHours += dailyHours;
        } else if (dayType === 'lavorativa' || dayType === '') {
          const workedH = computeWorkedHours(entry);
          const missingH = Math.max(0, dailyHours - workedH);
          if (completamento === 'ferie' && missingH > 0 && isCountable) {
            usedVacationHours += missingH;
          } else if (completamento === 'permesso' && missingH > 0 && isCountable) {
            usedPermitHours += missingH;
          }
        }
      }

      // Ore maturate automaticamente in base ai mesi trascorsi
      const ferieMaturateAdOggi = (settings.ferieMaturatiMensili || 0) * monthsElapsed;
      const permROAMaturateAdOggi = (settings.permROAMaturatiMensili || 0) * monthsElapsed;
      const permFestMaturateAdOggi = (settings.permFestMaturatiMensili || 0) * monthsElapsed;

      const totalFerieOre = (settings.ferieResAnniPrec || 0) + ferieMaturateAdOggi;
      const totalPermOre = (settings.permROAResAnniPrec || 0) + permROAMaturateAdOggi
                         + (settings.permFestResAnniPrec || 0) + permFestMaturateAdOggi;

      return {
        vacation: totalFerieOre - usedVacationHours,
        permits: totalPermOre - usedPermitHours,
        usedVacation: usedVacationHours,
        usedPermits: usedPermitHours,
        totalVacation: totalFerieOre,
        totalPermits: totalPermOre,
      };
    } catch (error) {
      console.error('Errore calcolo giorni residui:', error);
      return { vacation: 0, permits: 0 };
    }
  }

  // Utility per calcolare giorni tra due date
  calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere entrambi i giorni
  }

  // Verifica se una data è un giorno festivo
  isHoliday(date) {
    try {
      const { isItalianHoliday } = require('../constants/holidays');
      return isItalianHoliday(new Date(date));
    } catch (error) {
      return false;
    }
  }

  // Calcola giorni lavorativi tra due date (escludendo weekend e festivi)
  calculateWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !this.isHoliday(d)) {
        workingDays++;
      }
    }
    
    return workingDays;
  }

  // Calcola giorni ferie tra due date rispettando le impostazioni (Sab/Dom/Festivi includibili)
  calculateVacationDays(startDate, endDate, settings = {}) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay(); // 0=Dom, 6=Sab
      if (dow === 6 && !settings.countSaturdayAsWorkday) continue;
      if (dow === 0 && !settings.countSundayAsWorkday) continue;
      if (this.isHoliday(d) && !settings.countHolidaysAsWorkday) continue;
      count++;
    }

    return count;
  }

  // Valida una richiesta di ferie/permesso
  async validateRequest(request) {
    const errors = {};
    
    if (!request.type) {
      errors.type = 'Tipo richiesta obbligatorio';
    }
    
    if (!request.startDate) {
      errors.startDate = 'Data inizio obbligatoria';
    }
    
    if (request.type === 'vacation' && !request.endDate) {
      errors.endDate = 'Data fine obbligatoria per le ferie';
    }
    
    if (request.type === 'permit' && !request.hours) {
      errors.hours = 'Ore permesso obbligatorie';
    }
    
    if (request.startDate && request.endDate && new Date(request.startDate) > new Date(request.endDate)) {
      errors.dateRange = 'Data inizio non può essere successiva alla data fine';
    }
    
    // Verifica giorni disponibili
    const remaining = await this.calculateRemainingDays();
    if (request.type === 'vacation') {
      const requestedDays = this.calculateDaysBetween(request.startDate, request.endDate || request.startDate);
      if (requestedDays > remaining.vacation) {
        errors.insufficientDays = `Giorni ferie insufficienti. Disponibili: ${remaining.vacation}, Richiesti: ${requestedDays}`;
      }
    } else if (request.type === 'permit') {
      if (request.hours > remaining.permits) {
        errors.insufficientHours = `Ore permesso insufficienti. Disponibili: ${remaining.permits}, Richieste: ${request.hours}`;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export default new VacationService();
