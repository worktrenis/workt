// 🚀 NOTIFICATIONSERVICE SOLO JAVASCRIPT
// Sistema completamente convertito da Expo a JavaScript Timer

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import { Platform, Alert } from 'react-native';
import AlternativeNotificationService from './AlternativeNotificationService';

class NotificationService {
  constructor() {
    this.schedulingInProgress = false;
    this.lastScheduleTime = 0;
    
    // 🚀 SISTEMA JAVASCRIPT PURO
    this.alternativeService = new AlternativeNotificationService();
    this.useAlternativeSystem = true; // Sempre true
    this.expoDisabled = true; // Expo completamente disabilitato
    
    console.log('🚀 NotificationService inizializzato con SOLO JAVASCRIPT TIMERS');
    console.log('✅ Expo Notifications COMPLETAMENTE RIMOSSO');
  }

  // ✅ SISTEMA JAVASCRIPT: Nessun permesso richiesto
  async requestPermissions() {
    console.log('✅ Sistema JavaScript: Alert React Native sempre disponibile');
    return true;
  }

  async hasPermissions() {
    console.log('✅ Sistema JavaScript: Alert React Native sempre disponibile');
    return true;
  }

  // Carica le impostazioni notifiche
  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Errore nel caricamento impostazioni notifiche:', error);
      return this.getDefaultSettings();
    }
  }

  // Impostazioni predefinite
  getDefaultSettings() {
    return {
      enabled: false,
      workReminders: {
        enabled: false,
        morningTime: '08:00',
        eveningTime: '17:00',
        weekendsEnabled: false
      },
      timeEntryReminders: {
        enabled: false,
        time: '18:00',
        weekendsEnabled: false
      },
      standbyReminders: {
        enabled: false,
        notifications: [
          {
            enabled: true,
            daysInAdvance: 1,
            time: '20:00',
            message: 'Domani sei in reperibilità. Assicurati di essere disponibile!'
          },
          {
            enabled: false,
            daysInAdvance: 0,
            time: '08:00',
            message: 'Oggi sei in reperibilità. Tieni il telefono sempre a portata di mano!'
          },
          {
            enabled: false,
            daysInAdvance: 2,
            time: '19:00',
            message: 'Tra 2 giorni sarai in reperibilità. Preparati per essere disponibile!'
          }
        ]
      },
      vacationReminders: {
        enabled: false,
        time: '09:00',
        daysInAdvance: 7
      },
      overtimeAlerts: {
        enabled: false,
        hoursThreshold: 8.5
      },
      dailySummary: {
        enabled: false,
        time: '19:00'
      }
    };
  }

  // Salva le impostazioni
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Errore nel salvataggio impostazioni notifiche:', error);
      return false;
    }
  }

  // 🚀 SEMPRE JavaScript (Expo completamente rimosso)
  shouldUseAlternativeSystem() {
    return true;
  }

  isExpoDisabled() {
    return true;
  }

  // 🚀 PROGRAMMAZIONE SOLO JAVASCRIPT TIMERS
  async scheduleNotifications(settings = null) {
    try {
      const now = Date.now();
      if (this.schedulingInProgress) {
        console.log('📱 Programmazione notifiche già in corso, saltando...');
        return;
      }
      
      // Throttling 30 minuti
      if (now - this.lastScheduleTime < 1800000) { 
        const remainingTime = Math.round((1800000 - (now - this.lastScheduleTime)) / 60000);
        console.log(`📱 Notifiche programmate di recente, prossima programmazione tra ${remainingTime} minuti`);
        return;
      }

      this.schedulingInProgress = true;
      this.lastScheduleTime = now;

      console.log('🚀 === PROGRAMMAZIONE SOLO JAVASCRIPT TIMERS ===');

      if (!settings) {
        settings = await this.getSettings();
      }

      // Cancella timer JavaScript esistenti
      console.log('🗑️ Cancellazione timer JavaScript esistenti...');
      this.alternativeService.clearAllTimers();

      if (!settings.enabled) {
        console.log('📱 ❌ Notifiche disabilitate nelle impostazioni');
        return;
      }

      let totalScheduled = 0;
      
      // Promemoria lavoro
      if (settings.workReminders?.enabled) {
        console.log('📱 ⏰ Programmando promemoria lavoro con JavaScript...');
        const workCount = await this.alternativeService.scheduleAlternativeWorkReminders(settings.workReminders);
        totalScheduled += workCount;
        console.log(`✅ ${workCount} timer JavaScript lavoro attivati`);
      }
      
      // Promemoria inserimento
      if (settings.timeEntryReminders?.enabled) {
        console.log('📱 ✍️ Programmando promemoria inserimento con JavaScript...');
        const entryCount = await this.alternativeService.scheduleAlternativeTimeEntryReminders(settings.timeEntryReminders);
        totalScheduled += entryCount;
        console.log(`✅ ${entryCount} timer JavaScript inserimento attivati`);
      }
      
      // Riepilogo giornaliero
      if (settings.dailySummary?.enabled) {
        console.log('📱 📊 Programmando riepilogo giornaliero con JavaScript...');
        const summaryCount = await this.alternativeService.scheduleAlternativeDailySummary(settings.dailySummary);
        totalScheduled += summaryCount;
        console.log(`✅ ${summaryCount} timer JavaScript riepilogo attivati`);
      }
      
      // Promemoria reperibilità
      if (settings.standbyReminders?.enabled) {
        console.log('📱 📞 Programmando promemoria reperibilità con JavaScript...');
        
        try {
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 2);
          const standbyDates = await this.getStandbyDatesFromSettings(new Date(), endDate);
          
          if (standbyDates.length > 0) {
            const standbyCount = await this.alternativeService.scheduleAlternativeStandbyReminders(standbyDates, settings.standbyReminders);
            totalScheduled += standbyCount;
            console.log(`✅ ${standbyCount} timer JavaScript reperibilità attivati`);
          } else {
            console.log('📞 Nessuna data di reperibilità trovata');
          }
        } catch (error) {
          console.error('❌ Errore programmazione reperibilità JavaScript:', error);
        }
      }

      // Verifica finale
      const alternativeStats = this.alternativeService.getActiveTimersStats();
      
      console.log(`✅ 🎯 Programmazione completata (SOLO JAVASCRIPT)!`);
      console.log(`   🚀 Timer JavaScript TOTALI: ${alternativeStats.total}`);
      
      if (alternativeStats.total > 0) {
        console.log('🚀 TIMER JAVASCRIPT ATTIVI:');
        console.log(`   Totale: ${alternativeStats.total}`);
        console.log(`   Per tipo:`, alternativeStats.byType);
        if (alternativeStats.nextNotification) {
          console.log(`   Prossimo: ${alternativeStats.nextNotification.title} alle ${alternativeStats.nextNotification.scheduledFor.toLocaleString('it-IT')}`);
        }
      } else {
        console.log('⚠️ ATTENZIONE: Nessun timer JavaScript attivo!');
      }

    } catch (error) {
      console.error('❌ Errore nella programmazione notifiche:', error);
    } finally {
      this.schedulingInProgress = false;
    }
  }

  // Alert straordinario JavaScript
  async checkOvertimeAlert(workHours, settings = null) {
    try {
      if (!settings) {
        settings = await this.getSettings();
      }

      if (!settings.enabled || !settings.overtimeAlerts?.enabled) {
        console.log('⚠️ Controllo straordinario: notifiche disabilitate');
        return;
      }

      const threshold = settings.overtimeAlerts.hoursThreshold || 8.5;
      if (workHours <= threshold) {
        console.log(`⚠️ Controllo straordinario: ${workHours.toFixed(1)}h <= ${threshold}h (soglia non superata)`);
        return;
      }

      // Throttling 1 ora
      const lastOvertimeKey = 'last_overtime_notification';
      const lastOvertimeStr = await AsyncStorage.getItem(lastOvertimeKey);
      const now = Date.now();
      
      if (lastOvertimeStr) {
        const lastOvertime = parseInt(lastOvertimeStr);
        const timeDiff = now - lastOvertime;
        const minInterval = 3600000; // 1 ora
        
        if (timeDiff < minInterval) {
          const remainingMinutes = Math.round((minInterval - timeDiff) / 60000);
          console.log(`⚠️ Notifica straordinario già inviata di recente, prossima tra ${remainingMinutes} minuti`);
          return;
        }
      }

      // Alert JavaScript immediato
      const alertTitle = '⚠️ Straordinario Rilevato';
      const alertBody = `Hai superato le ${threshold} ore giornaliere (${workHours.toFixed(1)}h totali). Ottimo lavoro!`;
      
      Alert.alert(
        alertTitle,
        alertBody,
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('👆 Notifica straordinario confermata dall\'utente');
            }
          }
        ],
        { cancelable: true }
      );
      
      console.log(`✅ Alert straordinario JavaScript mostrato: ${workHours.toFixed(1)}h > ${threshold}h`);

      // Salva timestamp
      await AsyncStorage.setItem(lastOvertimeKey, now.toString());
      
    } catch (error) {
      console.error('❌ Errore nel controllo notifica straordinario:', error);
    }
  }

  // Test notifica JavaScript
  async sendTestNotification() {
    console.log('🧪 Test notifica JavaScript...');
    
    Alert.alert(
      '🔔 Test Notifica JavaScript',
      'Il sistema JavaScript funziona correttamente!',
      [
        { 
          text: 'OK', 
          onPress: () => {
            console.log('✅ Test notifica JavaScript confermato');
          }
        }
      ],
      { cancelable: true }
    );
    
    console.log('✅ Test notifica JavaScript completato');
  }

  // Cancella timer JavaScript
  async cancelAllNotifications() {
    console.log('🗑️ Cancellazione timer JavaScript...');
    
    if (this.alternativeService) {
      this.alternativeService.clearAllTimers();
      console.log('✅ Tutti i timer JavaScript cancellati');
    }
    
    console.log('✅ Pulizia completa: Solo JavaScript Timers');
  }

  // Ottieni statistiche timer
  async getScheduledNotifications() {
    if (this.alternativeService) {
      const stats = this.alternativeService.getActiveTimersStats();
      console.log('📅 Timer JavaScript attivi:', stats.total);
      return { 
        count: stats.total, 
        stats: stats,
        type: 'javascript_timers_only'
      };
    }
    
    console.log('📅 Nessun sistema JavaScript disponibile');
    return { count: 0, stats: {}, type: 'none' };
  }

  // Date reperibilità dalle settings
  async getStandbyDatesFromSettings(startDate, endDate) {
    try {
      const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
      const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
      
      console.log(`📞 DEBUG: Cercando date reperibilità tra ${startStr} e ${endStr}`);
      
      const standbyDates = [];
      
      // Leggi dalle settings
      try {
        const settingsStr = await AsyncStorage.getItem('settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const standbyDaysFromSettings = settings?.standbySettings?.standbyDays || {};
          
          console.log(`📞 DEBUG: Trovate ${Object.keys(standbyDaysFromSettings).length} date nelle settings`);
          
          Object.keys(standbyDaysFromSettings).forEach(dateStr => {
            const dayData = standbyDaysFromSettings[dateStr];
            if (dayData?.selected === true) {
              const checkDate = new Date(dateStr);
              const start = new Date(startStr);
              const end = new Date(endStr);
              
              if (checkDate >= start && checkDate <= end) {
                standbyDates.push(dateStr);
                console.log(`📞 DEBUG: Aggiunta data reperibilità dalle settings: ${dateStr}`);
              }
            }
          });
        }
      } catch (settingsError) {
        console.warn('📞 Errore lettura settings per reperibilità:', settingsError);
      }
      
      // Leggi dal database
      try {
        const databaseService = DatabaseService;
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        let iterationCount = 0;
        const maxIterations = 24;
        
        while (currentMonth <= endMonth && iterationCount < maxIterations) {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1;
          
          console.log(`📞 DEBUG: Verificando mese ${year}-${month.toString().padStart(2, '0')} nel database`);
          
          const monthStandbyDays = await databaseService.getStandbyDays(year, month);
          console.log(`📞 DEBUG: Trovati ${monthStandbyDays.length} giorni di reperibilità nel database mese ${year}-${month}`);
          
          for (const standbyDay of monthStandbyDays) {
            const standbyDate = new Date(standbyDay.date);
            
            if (standbyDate >= start && standbyDate <= end && !standbyDates.includes(standbyDay.date)) {
              standbyDates.push(standbyDay.date);
              console.log(`📞 DEBUG: Aggiunta data reperibilità dal database: ${standbyDay.date}`);
            }
          }
          
          currentMonth.setMonth(currentMonth.getMonth() + 1);
          iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
          console.warn('⚠️ AVVISO: Interrotto loop per protezione anti-infinito');
        }
      } catch (dbError) {
        console.warn('📞 Errore lettura database per reperibilità:', dbError);
      }
      
      const uniqueDates = [...new Set(standbyDates)].sort();
      
      console.log(`📞 Trovate ${uniqueDates.length} date di reperibilità totali tra ${startStr} e ${endStr}`);
      console.log(`📞 Date trovate:`, uniqueDates);
      
      return uniqueDates;
      
    } catch (error) {
      console.error('❌ Errore nel caricamento date reperibilità:', error);
      return [];
    }
  }

  // Statistiche notifiche
  async getNotificationStats() {
    const scheduled = await this.getScheduledNotifications();
    const settings = await this.getSettings();
    
    return {
      totalScheduled: scheduled.count,
      enabled: settings.enabled,
      activeReminders: [
        settings.workReminders.enabled && 'Promemoria lavoro',
        settings.timeEntryReminders.enabled && 'Inserimento orari',
        settings.dailySummary.enabled && 'Riepilogo giornaliero',
        settings.overtimeAlerts.enabled && 'Avvisi straordinario'
      ].filter(Boolean)
    };
  }

  // Placeholder per compatibilità
  async updateStandbyNotifications() {
    console.log('📞 updateStandbyNotifications: usando scheduleNotifications principale');
    const settings = await this.getSettings();
    await this.scheduleNotifications(settings);
  }

  setUseAlternativeSystem(enabled) {
    console.log(`🔄 Sistema alternativo sempre attivo (JavaScript only)`);
  }

  async debugNotifications() {
    console.log('🔧 === DEBUG NOTIFICHE JAVASCRIPT ===');
    
    const stats = this.alternativeService.getActiveTimersStats();
    const settings = await this.getSettings();
    
    console.log(`🔧 Timer JavaScript attivi: ${stats.total}`);
    console.log(`🔧 Notifiche abilitate: ${settings.enabled}`);
    console.log(`🔧 Sistema: Solo JavaScript Timers`);
    
    return {
      scheduledCount: stats.total,
      settings: settings,
      system: 'javascript_only'
    };
  }
}

export default new NotificationService();
