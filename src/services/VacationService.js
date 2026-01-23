import AsyncStorage from '@react-native-async-storage/async-storage';

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
          annualVacationDays: 26, // Giorni ferie annuali secondo CCNL
          carryOverDays: 0, // Giorni residui anno precedente
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          permitsPerMonth: 8, // Ore permessi mensili
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
          annualVacationDays: 26,
          carryOverDays: 0,
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          permitsPerMonth: 8,
          autoApprovalEnabled: false, // Default: disattivato per sicurezza
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
      
      // Se le impostazioni non esistono o sono incomplete, creale/aggiornale
      if (!settings || settings.autoApprovalEnabled === undefined) {
        // console.log('🔧 Aggiorno impostazioni ferie con campi mancanti');
        
        const defaultSettings = {
          annualVacationDays: 26,
          carryOverDays: 0,
          currentYear: new Date().getFullYear(),
          startDate: `${new Date().getFullYear()}-01-01`,
          permitsPerMonth: 8,
          autoApprovalEnabled: false,
          autoCompileEnabled: false,
          // Mantieni le impostazioni esistenti se presenti
          ...(settings || {})
        };
        
        await this.setSettings(defaultSettings);
        settings = defaultSettings;
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
        availablePersonalDays: Math.floor((remaining.permits || 0) / 8), // Converti ore in giorni
        usedPersonalDays: Math.floor((remaining.usedPermits || 0) / 8),
        totalVacationDays: remaining.totalVacation || 0,
        totalPersonalDays: Math.floor((remaining.totalPermits || 0) / 8)
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

  // Calcoli giorni residui
  async calculateRemainingDays() {
    try {
      const settings = await this.getSettings();
      const requests = await this.getVacationRequests();
      
      if (!settings) return { vacation: 0, permits: 0 };

      const currentYear = new Date().getFullYear();
      const approvedRequests = requests.filter(
        req => req.status === 'approved' && 
               new Date(req.startDate).getFullYear() === currentYear
      );

      const usedVacationDays = approvedRequests
        .filter(req => req.type === 'vacation')
        .reduce((total, req) => total + this.calculateDaysBetween(req.startDate, req.endDate), 0);

      const usedPermitHours = approvedRequests
        .filter(req => req.type === 'permit')
        .reduce((total, req) => total + (req.hours || 0), 0);

      const totalVacationDays = settings.annualVacationDays + (settings.carryOverDays || 0);
      const totalPermitHours = settings.permitsPerMonth * 12;

      return {
        vacation: Math.max(0, totalVacationDays - usedVacationDays),
        permits: Math.max(0, totalPermitHours - usedPermitHours),
        usedVacation: usedVacationDays,
        usedPermits: usedPermitHours,
        totalVacation: totalVacationDays,
        totalPermits: totalPermitHours
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
