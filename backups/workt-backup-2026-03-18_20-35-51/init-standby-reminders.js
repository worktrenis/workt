// Script per inizializzare correttamente i promemoria di reperibilità
import AsyncStorage from '@react-native-async-storage/async-storage';

export const initializeStandbyReminders = async () => {
  try {
    console.log('🔧 === INIZIALIZZAZIONE PROMEMORIA REPERIBILITÀ ===');
    
    // Leggi le impostazioni attuali
    const notificationData = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
    let settings = {};
    
    if (notificationData) {
      settings = JSON.parse(notificationData);
      console.log('📱 Impostazioni attuali trovate');
    } else {
      console.log('📱 Nessuna impostazione trovata, creo nuove');
    }
    
    // Controlla se esistono già promemoria di reperibilità
    let standbyReminders = settings.standbyReminders || settings.standbyReminder;
    
    if (!standbyReminders) {
      console.log('🆕 Creo nuovi promemoria di reperibilità');
      standbyReminders = {
        enabled: false,
        notifications: []
      };
    }
    
    // Se non ci sono notifiche o sono vuote, aggiungi quelle di default
    if (!standbyReminders.notifications || standbyReminders.notifications.length === 0) {
      console.log('🔧 Aggiungo notifiche di default');
      standbyReminders.notifications = [
        {
          daysInAdvance: 0,
          enabled: true,
          time: '07:30',
          message: 'Turno di reperibilità oggi'
        },
        {
          daysInAdvance: 1,
          enabled: true, 
          time: '20:00',
          message: 'Turno di reperibilità domani'
        }
      ];
    } else {
      console.log(`📋 Trovate ${standbyReminders.notifications.length} notifiche esistenti`);
      
      // Verifica e correggi eventuali errori nelle notifiche esistenti
      standbyReminders.notifications = standbyReminders.notifications.map((notif, index) => {
        let correctedNotif = { ...notif };
        
        // Correggi typo messsage -> message
        if (correctedNotif.messsage && !correctedNotif.message) {
          correctedNotif.message = correctedNotif.messsage;
          delete correctedNotif.messsage;
          console.log(`✅ Corretto typo in notifica ${index}`);
        }
        
        // Assicurati che abbia tutti i campi necessari
        if (!correctedNotif.time || typeof correctedNotif.time !== 'string') {
          correctedNotif.time = '08:00';
          console.log(`✅ Corretto tempo in notifica ${index}`);
        }
        
        if (typeof correctedNotif.enabled !== 'boolean') {
          correctedNotif.enabled = true;
          console.log(`✅ Corretto enabled in notifica ${index}`);
        }
        
        if (typeof correctedNotif.daysInAdvance !== 'number') {
          correctedNotif.daysInAdvance = index;
          console.log(`✅ Corretto daysInAdvance in notifica ${index}`);
        }
        
        if (!correctedNotif.message || typeof correctedNotif.message !== 'string') {
          correctedNotif.message = index === 0 ? 'Turno di reperibilità oggi' : 'Turno di reperibilità domani';
          console.log(`✅ Corretto message in notifica ${index}`);
        }
        
        return correctedNotif;
      });
    }
    
    // Aggiorna le impostazioni
    settings.standbyReminders = standbyReminders;
    settings.standbyReminder = standbyReminders; // Mantieni entrambi per compatibilità
    
    // Salva le impostazioni corrette
    await AsyncStorage.setItem('NOTIFICATION_SETTINGS', JSON.stringify(settings));
    
    console.log('✅ Promemoria di reperibilità inizializzati correttamente');
    console.log('📋 Notifiche configurate:', standbyReminders.notifications.length);
    
    return standbyReminders;
    
  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione promemoria reperibilità:', error);
    return {
      enabled: false,
      notifications: [
        {
          daysInAdvance: 0,
          enabled: true,
          time: '07:30',
          message: 'Turno di reperibilità oggi'
        },
        {
          daysInAdvance: 1,
          enabled: true,
          time: '20:00', 
          message: 'Turno di reperibilità domani'
        }
      ]
    };
  }
};

// Funzione per verificare lo stato attuale
export const checkStandbyRemindersStatus = async () => {
  try {
    const notificationData = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
    if (notificationData) {
      const settings = JSON.parse(notificationData);
      const standbyReminders = settings.standbyReminders || settings.standbyReminder;
      
      console.log('🔍 === STATUS PROMEMORIA REPERIBILITÀ ===');
      console.log('Abilitati:', standbyReminders?.enabled ? 'SÌ' : 'NO');
      console.log('Numero notifiche:', standbyReminders?.notifications?.length || 0);
      
      if (standbyReminders?.notifications?.length > 0) {
        standbyReminders.notifications.forEach((notif, index) => {
          console.log(`Notifica ${index + 1}:`, {
            giorni: notif.daysInAdvance,
            orario: notif.time,
            attiva: notif.enabled,
            messaggio: notif.message
          });
        });
      }
      
      return standbyReminders;
    } else {
      console.log('❌ Nessuna impostazione notifiche trovata');
      return null;
    }
  } catch (error) {
    console.error('❌ Errore nel controllo status:', error);
    return null;
  }
};
