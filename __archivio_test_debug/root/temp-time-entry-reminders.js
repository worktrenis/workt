  // Programma promemoria per inserimento orari
  async scheduleTimeEntryReminders(settings) {
    if (!settings || settings.enabled !== true) {
      console.log('ℹ️ Promemoria inserimento orari disabilitati, non programmati');
      return 0;
    }
    
    try {
      // Controlla che eveningTime sia definito e valido
      if (!settings.eveningTime || typeof settings.eveningTime !== 'string') {
        console.error('❌ Impostazione orario sera non valida per promemoria inserimento orari');
        return 0;
      }
      
      const timeParts = settings.eveningTime.split(':');
      if (timeParts.length !== 2) {
        console.error('❌ Formato orario non valido:', settings.eveningTime);
        return 0;
      }
      
      const [hours, minutes] = timeParts;
      let scheduledCount = 0;
      
      // Programma solo per i prossimi 7 giorni
      const daysToSchedule = settings.weekendsEnabled === true ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      const now = new Date();
      
      for (let day = 0; day <= 7; day++) {
        try {
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() + day);
          
          // Controlla se è il giorno giusto della settimana
          if (!daysToSchedule.includes(targetDate.getDay())) continue;
          
          targetDate.setHours(parseInt(hours) || 18, parseInt(minutes) || 0, 0, 0);
          
          // Solo se nel futuro
          if (targetDate <= now) continue;
          
          await this.scheduleNotification(
            '⏰ Promemoria Inserimento Orari',
            'Ricordati di inserire le ore di lavoro di oggi prima di andare a casa.',
            targetDate.getTime(),
            { type: 'time_entry_reminder', date: targetDate.toISOString().split('T')[0] }
          );
          
          scheduledCount++;
        } catch (dayError) {
          console.error(`❌ Errore programmazione promemoria inserimento orari per giorno ${day}:`, dayError);
          // Continua con gli altri giorni anche se uno fallisce
        }
      }
      
      return scheduledCount;
    } catch (error) {
      console.error('❌ Errore generale in scheduleTimeEntryReminders:', error);
      return 0;
    }
  }
