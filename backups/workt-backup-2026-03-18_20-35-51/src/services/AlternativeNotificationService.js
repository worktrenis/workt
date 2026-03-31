import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// SISTEMA ALTERNATIVO CHE NON USA EXPO NOTIFICATIONS PER IL TIMING
// Usa timer interni e mostra alert/modal quando necessario
class AlternativeNotificationService {
  constructor() {
    this.activeTimers = new Map();
    this.pendingNotifications = new Map();
    this.isAppActive = true;
    this.setupAppStateHandling();
  }

  setupAppStateHandling() {
    // In un'app reale, dovresti usare AppState per gestire quando l'app va in background
    console.log('🔄 Sistema alternativo inizializzato - NON usa Expo per timing');
  }

  // Test del sistema alternativo
  async testAlternativeSystem() {
    try {
      console.log('🧪 === TEST SISTEMA ALTERNATIVO (NO EXPO) ===');
      
      // Cancella timer esistenti
      this.clearAllTimers();
      
      // Programma notifica con timer JavaScript
      const notificationId = `alt_test_${Date.now()}`;
      const delaySeconds = 30;
      
      console.log(`⏰ Programmando notifica con TIMER JAVASCRIPT per ${delaySeconds} secondi`);
      console.log(`📅 Notifica programmata per: ${new Date(Date.now() + delaySeconds * 1000).toISOString()}`);
      
      const timer = setTimeout(() => {
        this.showAlternativeNotification(
          '🧪 Test Sistema Alternativo',
          `Questa notifica è arrivata dopo ${delaySeconds} secondi usando timer JavaScript!`,
          { type: 'alternative_test' }
        );
        this.activeTimers.delete(notificationId);
      }, delaySeconds * 1000);
      
      this.activeTimers.set(notificationId, {
        timer,
        scheduledFor: new Date(Date.now() + delaySeconds * 1000),
        title: '🧪 Test Sistema Alternativo',
        type: 'alternative_test'
      });
      
      console.log(`✅ Timer JavaScript attivato per ID: ${notificationId}`);
      console.log(`⏱️ ATTENDI ${delaySeconds} SECONDI - Dovrebbe apparire un Alert!`);
      
      return { success: true, notificationId, method: 'javascript_timer' };
      
    } catch (error) {
      console.error('❌ Errore test sistema alternativo:', error);
      return { success: false, reason: error.message };
    }
  }

  // Mostra notifica alternativa (Alert o Modal)
  showAlternativeNotification(title, body, data = {}) {
    const now = new Date();
    console.log(`🔔 NOTIFICA ALTERNATIVA MOSTRATA alle ${now.toLocaleTimeString('it-IT')}`);
    console.log(`   Titolo: ${title}`);
    console.log(`   Messaggio: ${body}`);
    console.log(`   Dati: ${JSON.stringify(data)}`);
    
    // Mostra Alert nativo (sempre funziona)
    Alert.alert(
      title,
      body,
      [
        { 
          text: 'OK', 
          onPress: () => {
            console.log('👆 Notifica alternativa confermata dall\'utente');
            this.handleNotificationAction(data);
          }
        }
      ],
      { cancelable: true }
    );
    
    // Salva nel log per tracking
    this.logNotificationDelivery(title, body, data);
  }

  // Gestisce azioni delle notifiche alternative
  handleNotificationAction(data) {
    switch (data?.type) {
      case 'work_reminder':
        console.log('🔄 Azione: Naviga a inserimento orari');
        break;
      case 'time_entry_reminder':
        console.log('🔄 Azione: Naviga a form orari');
        break;
      case 'standby_reminder':
        console.log('🔄 Azione: Naviga a reperibilità');
        break;
      case 'daily_summary':
        console.log('🔄 Azione: Naviga a dashboard');
        break;
      default:
        console.log('🔄 Azione: Nessuna azione specifica');
    }
  }

  // Programma promemoria lavoro con sistema alternativo
  async scheduleAlternativeWorkReminders(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.morningTime.split(':');
    let scheduledCount = 0;
    
    // Programma solo per i prossimi 7 giorni (sistema alternativo più leggero)
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const now = new Date();
    
    for (let day = 1; day <= 7; day++) {
      for (const dayOfWeek of daysToSchedule) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + day);
        
        // Controlla se è il giorno giusto della settimana
        if (targetDate.getDay() !== dayOfWeek) continue;
        
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Solo se nel futuro
        if (targetDate <= now) continue;
        
        const delayMs = targetDate.getTime() - now.getTime();
        const notificationId = `work_reminder_${targetDate.getTime()}`;
        
        const timer = setTimeout(() => {
          this.showAlternativeNotification(
            '🌅 Promemoria Lavoro',
            'Ricordati di registrare gli orari di lavoro di oggi.',
            { type: 'work_reminder', date: targetDate.toISOString().split('T')[0] }
          );
          this.activeTimers.delete(notificationId);
        }, delayMs);
        
        this.activeTimers.set(notificationId, {
          timer,
          scheduledFor: targetDate,
          title: '🌅 Promemoria Lavoro',
          type: 'work_reminder'
        });
        
        scheduledCount++;
        console.log(`  ✅ Timer lavoro attivato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
      }
    }
    
    return scheduledCount;
  }

  // Programma promemoria inserimento orari
  async scheduleAlternativeTimeEntryReminders(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.time.split(':');
    let scheduledCount = 0;
    
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const now = new Date();
    
    for (let day = 1; day <= 7; day++) {
      for (const dayOfWeek of daysToSchedule) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + day);
        
        if (targetDate.getDay() !== dayOfWeek) continue;
        
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (targetDate <= now) continue;
        
        const delayMs = targetDate.getTime() - now.getTime();
        const notificationId = `time_entry_reminder_${targetDate.getTime()}`;
        
        const timer = setTimeout(() => {
          this.showAlternativeNotification(
            '📝 Inserimento Orari',
            'Hai inserito gli orari di lavoro di oggi?',
            { type: 'time_entry_reminder', date: targetDate.toISOString().split('T')[0] }
          );
          this.activeTimers.delete(notificationId);
        }, delayMs);
        
        this.activeTimers.set(notificationId, {
          timer,
          scheduledFor: targetDate,
          title: '📝 Inserimento Orari',
          type: 'time_entry_reminder'
        });
        
        scheduledCount++;
        console.log(`  ✅ Timer inserimento attivato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
      }
    }
    
    return scheduledCount;
  }

  // Programma sistema completo alternativo
  async scheduleAlternativeNotifications(settings = null) {
    try {
      console.log('🔄 === SISTEMA ALTERNATIVO: Programmazione timer JavaScript ===');
      
      if (!settings) {
        // Carica settings dalle impostazioni esistenti
        try {
          const stored = await AsyncStorage.getItem('notification_settings');
          if (stored) {
            settings = JSON.parse(stored);
          } else {
            console.log('⚠️ Nessuna settings trovata, usando default');
            settings = { enabled: false };
          }
        } catch (error) {
          console.log('⚠️ Errore caricamento settings, usando default');
          settings = { enabled: false };
        }
      }
      
      if (!settings.enabled) {
        console.log('❌ Sistema alternativo: notifiche disabilitate');
        return { success: false, reason: 'Notifiche disabilitate' };
      }
      
      // Cancella timer esistenti
      this.clearAllTimers();
      
      let totalScheduled = 0;
      
      // Programma promemoria lavoro
      if (settings.workReminders?.enabled) {
        console.log('⏰ Programmando promemoria lavoro con timer JavaScript...');
        const workCount = await this.scheduleAlternativeWorkReminders(settings.workReminders);
        totalScheduled += workCount;
        console.log(`✅ ${workCount} timer lavoro attivati`);
      }
      
      // Programma promemoria inserimento
      if (settings.timeEntryReminders?.enabled) {
        console.log('📝 Programmando promemoria inserimento con timer JavaScript...');
        const entryCount = await this.scheduleAlternativeTimeEntryReminders(settings.timeEntryReminders);
        totalScheduled += entryCount;
        console.log(`✅ ${entryCount} timer inserimento attivati`);
      }
      
      console.log(`🎯 Sistema alternativo completato: ${totalScheduled} timer attivi`);
      console.log(`📋 Timer attivi: ${Array.from(this.activeTimers.keys()).length}`);
      
      return { 
        success: true, 
        totalScheduled, 
        method: 'javascript_timers',
        activeTimers: this.activeTimers.size 
      };
      
    } catch (error) {
      console.error('❌ Errore sistema alternativo:', error);
      return { success: false, reason: error.message };
    }
  }

  // Cancella tutti i timer
  clearAllTimers() {
    console.log(`🗑️ Cancellando ${this.activeTimers.size} timer attivi...`);
    
    for (const [id, timerData] of this.activeTimers) {
      clearTimeout(timerData.timer);
      console.log(`  🗑️ Timer cancellato: ${id}`);
    }
    
    this.activeTimers.clear();
    console.log('✅ Tutti i timer cancellati');
  }

  // Ottieni statistiche timer attivi
  getActiveTimersStats() {
    const stats = {
      total: this.activeTimers.size,
      byType: {},
      nextNotification: null
    };
    
    let earliest = null;
    
    for (const [id, timerData] of this.activeTimers) {
      const type = timerData.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      if (!earliest || timerData.scheduledFor < earliest) {
        earliest = timerData.scheduledFor;
        stats.nextNotification = {
          id,
          scheduledFor: timerData.scheduledFor,
          title: timerData.title,
          type: timerData.type
        };
      }
    }
    
    return stats;
  }

  // Log delle notifiche consegnate
  async logNotificationDelivery(title, body, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        title,
        body,
        data,
        method: 'alternative_system'
      };
      
      const logKey = 'alternative_notification_log';
      const existingLogStr = await AsyncStorage.getItem(logKey);
      let existingLog = [];
      
      if (existingLogStr) {
        existingLog = JSON.parse(existingLogStr);
      }
      
      existingLog.push(logEntry);
      
      // Mantieni solo gli ultimi 50 log
      if (existingLog.length > 50) {
        existingLog = existingLog.slice(-50);
      }
      
      await AsyncStorage.setItem(logKey, JSON.stringify(existingLog));
      
    } catch (error) {
      console.warn('⚠️ Errore salvataggio log notifica:', error);
    }
  }

  // Ottieni log delle notifiche
  async getNotificationLog() {
    try {
      const logStr = await AsyncStorage.getItem('alternative_notification_log');
      return logStr ? JSON.parse(logStr) : [];
    } catch (error) {
      console.warn('⚠️ Errore caricamento log notifiche:', error);
      return [];
    }
  }

  // Test con intervalli multipli
  async testMultipleIntervals() {
    try {
      console.log('🧪 === TEST INTERVALLI MULTIPLI (JAVASCRIPT TIMER) ===');
      
      this.clearAllTimers();
      
      const tests = [
        { name: '10 secondi', delay: 10 },
        { name: '30 secondi', delay: 30 },
        { name: '60 secondi', delay: 60 }
      ];
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const notificationId = `multi_test_${i}_${Date.now()}`;
        
        console.log(`🧪 Programmando test ${i + 1}: ${test.name}`);
        
        const timer = setTimeout(() => {
          this.showAlternativeNotification(
            `🧪 Test ${i + 1}: ${test.name}`,
            `Questo timer JavaScript è scattato dopo ${test.delay} secondi!`,
            { type: 'multiple_test', testIndex: i, delay: test.delay }
          );
          this.activeTimers.delete(notificationId);
        }, test.delay * 1000);
        
        this.activeTimers.set(notificationId, {
          timer,
          scheduledFor: new Date(Date.now() + test.delay * 1000),
          title: `Test ${test.name}`,
          type: 'multiple_test'
        });
      }
      
      console.log(`✅ ${tests.length} timer di test attivati`);
      console.log('⏱️ OSSERVA: I 3 Alert dovrebbero apparire a 10s, 30s e 60s!');
      
      return { success: true, testsScheduled: tests.length };
      
    } catch (error) {
      console.error('❌ Errore test intervalli multipli:', error);
      return { success: false, reason: error.message };
    }
  }

  // Programma riepilogo giornaliero con JavaScript Timer
  async scheduleAlternativeDailySummary(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.time.split(':');
    let scheduledCount = 0;
    
    const now = new Date();
    
    // Programma per i prossimi 7 giorni (sistema alternativo più leggero)
    for (let day = 1; day <= 7; day++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + day);
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Verifica che la data sia nel futuro
      if (targetDate <= now) continue;
      
      const delayMs = targetDate.getTime() - now.getTime();
      const notificationId = `daily_summary_${targetDate.getTime()}`;
      
      const timer = setTimeout(() => {
        this.showAlternativeNotification(
          '📊 Riepilogo Giornaliero',
          'Controlla il tuo riepilogo guadagni di oggi.',
          { type: 'daily_summary', date: targetDate.toISOString().split('T')[0] }
        );
        this.activeTimers.delete(notificationId);
      }, delayMs);
      
      this.activeTimers.set(notificationId, {
        timer,
        scheduledFor: targetDate,
        title: '📊 Riepilogo Giornaliero',
        type: 'daily_summary'
      });
      
      scheduledCount++;
      console.log(`  ✅ Timer riepilogo attivato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
    }
    
    return scheduledCount;
  }

  // Programma promemoria reperibilità con JavaScript Timer
  async scheduleAlternativeStandbyReminders(standbyDates, settings) {
    console.log('📞 === PROGRAMMAZIONE REPERIBILITÀ JAVASCRIPT ===');
    console.log(`📅 Date reperibilità ricevute: ${standbyDates.length}`);
    
    if (!settings.enabled) {
      console.log('📞 Promemoria reperibilità disabilitati');
      return 0;
    }

    const activeNotifications = settings.notifications?.filter(n => n.enabled) || [];
    
    if (activeNotifications.length === 0) {
      console.log('📞 Nessun promemoria reperibilità attivo');
      return 0;
    }

    let scheduledCount = 0;
    const now = new Date();

    for (const dateStr of standbyDates) {
      const standbyDate = new Date(dateStr + 'T00:00:00');
      
      // Formatta la data per i messaggi
      const standbyDateFormatted = standbyDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      console.log(`📞 Programmando promemoria per ${standbyDateFormatted} (${dateStr})`);

      for (const notification of activeNotifications) {
        const [hours, minutes] = notification.time.split(':');
        const reminderDate = new Date(standbyDate);
        reminderDate.setDate(reminderDate.getDate() - notification.daysInAdvance);
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Solo se la data del promemoria è nel futuro
        if (reminderDate > now) {
          const delayMs = reminderDate.getTime() - now.getTime();
          
          const title = this.getStandbyReminderTitle(notification.daysInAdvance);
          const body = this.getStandbyReminderBody(notification.daysInAdvance, standbyDateFormatted, notification.message);
          
          const notificationId = `standby_reminder_${dateStr}_${notification.daysInAdvance}`;
          
          console.log(`📞 Timer reperibilità: ${title} per ${reminderDate.toISOString()}`);
          console.log(`📞 Delay: ${Math.round(delayMs / (1000 * 60))} minuti`);
          
          const timer = setTimeout(() => {
            this.showAlternativeNotification(
              title,
              body,
              { 
                type: 'standby_reminder',
                standbyDate: dateStr,
                daysInAdvance: notification.daysInAdvance
              }
            );
            this.activeTimers.delete(notificationId);
          }, delayMs);
          
          this.activeTimers.set(notificationId, {
            timer,
            scheduledFor: reminderDate,
            title: title,
            type: 'standby_reminder'
          });
          
          scheduledCount++;
          console.log(`  ✅ Timer reperibilità attivato: ${title} per ${reminderDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
        } else {
          console.log(`  ⏭️ Saltato promemoria nel passato: ${reminderDate.toISOString()}`);
        }
      }
    }

    console.log(`✅ Programmati ${scheduledCount} timer JavaScript per reperibilità`);
    return scheduledCount;
  }

  // Helper per generare titoli dinamici reperibilità
  getStandbyReminderTitle(daysInAdvance) {
    switch (daysInAdvance) {
      case 0:
        return '📞 Reperibilità OGGI';
      case 1:
        return '📞 Reperibilità DOMANI';
      case 2:
        return '📞 Reperibilità tra 2 giorni';
      default:
        return `📞 Reperibilità tra ${daysInAdvance} giorni`;
    }
  }

  // Helper per generare messaggi dinamici reperibilità
  getStandbyReminderBody(daysInAdvance, dateFormatted, customMessage) {
    if (customMessage) {
      return customMessage;
    }

    switch (daysInAdvance) {
      case 0:
        return `Oggi (${dateFormatted}) sei in reperibilità. Tieni il telefono sempre a portata di mano!`;
      case 1:
        return `Domani (${dateFormatted}) sei in reperibilità. Assicurati di essere disponibile!`;
      case 2:
        return `Dopodomani (${dateFormatted}) sarai in reperibilità. Preparati per essere disponibile!`;
      default:
        return `Il ${dateFormatted} sarai in reperibilità. Non dimenticartelo!`;
    }
  }
}

export default AlternativeNotificationService;
