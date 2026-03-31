  async scheduleWorkReminders(settings) {
    if (!settings || settings.enabled !== true) {
      console.log('ℹ️ Promemoria lavoro disabilitati, non programmati');
      return 0;
    }
    
    try {
      // Controlla che morningTime sia definito e valido
      if (!settings.morningTime || typeof settings.morningTime !== 'string') {
        console.error('❌ Impostazione orario mattina non valida per promemoria lavoro');
        return 0;
      }
      
      const timeParts = settings.morningTime.split(':');
      if (timeParts.length !== 2) {
        console.error('❌ Formato orario non valido:', settings.morningTime);
        return 0;
      }
      
      const [hours, minutes] = timeParts;
      let scheduledCount = 0;
      
      // Programma solo per i prossimi 7 giorni
      const daysToSchedule = settings.weekendsEnabled === true ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      const now = new Date();
      
      for (let day = 1; day <= 7; day++) {
        try {
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() + day);
          
          // Controlla se è il giorno giusto della settimana
          if (!daysToSchedule.includes(targetDate.getDay())) continue;
          
          targetDate.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
          
          // Solo se nel futuro
          if (targetDate <= now) continue;
          
          await this.scheduleNotification(
            '📝 Promemoria Lavoro',
            'Ricordati di registrare gli orari di lavoro di oggi.',
            targetDate.getTime(),
            { type: 'work_reminder', date: targetDate.toISOString().split('T')[0] }
          );
          
          scheduledCount++;
        } catch (dayError) {
          console.error(`❌ Errore programmazione promemoria per giorno ${day}:`, dayError);
          // Continua con gli altri giorni anche se uno fallisce
        }
      }
      
      return scheduledCount;
    } catch (error) {
      console.error('❌ Errore programmazione promemoria lavoro:', error);
      return 0;
    }
  }
