import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateNotificationService from './UpdateNotificationService';
import SystemNotificationPersistence from './SystemNotificationPersistenceService';

class ManualUpdateService {
  constructor() {
  this.currentVersion = '1.1.0';
    this.isChecking = false;
    this.isUpdating = false;
    
    // Database versioni con changelog
    this.versionDatabase = {
      '1.4.0': {
        versionName: '1.4.0',
        versionCode: 140,
        releaseDate: '2025-08-05',
        changelog: [
          '🔔 Sistema notifiche persistenti completo',
          '📱 Menu "Notifiche di Sistema" con badge',
          '🔍 Filtri avanzati e statistiche dettagliate',
          '💾 Export/Import notifiche e backup',
          '🧹 Cleanup UI - rimossi pulsanti test',
          '⚡ Performance migliorate e modulari'
        ],
        isForced: false,
        minRequiredVersion: '1.0.0'
      },
      '1.3.1': {
        versionName: '1.3.1',
        versionCode: 131,
        releaseDate: '2024-01-15',
        changelog: [
          '🔧 Correzioni sistema di calcolo TimeEntry',
          '🔄 Eliminazione inconsistenze di calcolo',
          '📊 Sistema auto-retry per calcoli falliti',
          '🎯 Indicatori visivi per errori di calcolo',
          '🧹 Pulizia sistema notifiche duplicate'
        ],
        isForced: false,
        minRequiredVersion: '1.0.0'
      },
      '1.3.2': {
        versionName: '1.3.2',
        versionCode: 132,
        releaseDate: '2024-01-20',
        changelog: [
          '🚀 Sistema aggiornamenti OTA completamente manuale',
          '📱 Notifiche per aggiornamenti disponibili',
          '⚙️ Popup di conferma prima dell\'aggiornamento',
          '📝 Cronologia aggiornamenti nelle impostazioni',
          '🎯 Controllo versioni migliorato'
        ],
        isForced: false,
        minRequiredVersion: '1.3.0'
      }
    };
  }

  /**
   * Controlla aggiornamenti all'avvio dell'app (notifica ma non aggiorna)
   */
  async checkForUpdatesAtStartup() {
    // Evita controlli troppo frequenti all'avvio
    const lastCheckKey = 'last_startup_update_check';
    const lastCheck = await AsyncStorage.getItem(lastCheckKey);
    const now = Date.now();
    
    // Controlla solo se sono passate almeno 2 ore dall'ultimo controllo
    if (lastCheck && (now - parseInt(lastCheck)) < 2 * 60 * 60 * 1000) {
      console.log('🔄 [ManualUpdate] Controllo avvio saltato (troppo recente)');
      return { hasUpdate: false, reason: 'too_recent' };
    }

    if (this.isChecking) {
      console.log('🔄 Controllo aggiornamenti già in corso');
      return { hasUpdate: false, reason: 'already_checking' };
    }

    if (__DEV__) {
      // Disabilita simulazione aggiornamenti in sviluppo per ridurre il rumore
      console.log('🔄 [ManualUpdate] Simulazione aggiornamenti disabilitata in DEV');
      return { hasUpdate: false, reason: 'dev_simulation_disabled' };
    }

    try {
      this.isChecking = true;
      console.log('🔍 [ManualUpdate] Controllo aggiornamenti all\'avvio...');

      const update = await Updates.checkForUpdateAsync();
      
      // Salva timestamp del controllo
      await AsyncStorage.setItem(lastCheckKey, now.toString());
      
      if (update.isAvailable) {
        const updateInfo = this.extractUpdateInfo(update);
        console.log('✅ [ManualUpdate] Aggiornamento disponibile all\'avvio:', updateInfo);
        
        // Invia notifica discreta
        await UpdateNotificationService.notifyUpdateAvailable(updateInfo);
        
        return {
          hasUpdate: true,
          updateInfo,
          action: 'notification_sent',
          context: 'startup'
        };
      } else {
        console.log('ℹ️ [ManualUpdate] Nessun aggiornamento disponibile all\'avvio');
        return {
          hasUpdate: false,
          reason: 'no_update_available',
          context: 'startup'
        };
      }
    } catch (error) {
      console.error('❌ [ManualUpdate] Errore controllo aggiornamenti all\'avvio:', error);
      return {
        hasUpdate: false,
        error: error.message,
        reason: 'check_failed',
        context: 'startup'
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Controlla aggiornamenti disponibili (SOLO su richiesta manuale)
   */
  async checkForUpdatesManually() {
    if (this.isChecking) {
      console.log('🔄 Controllo aggiornamenti già in corso');
      return { hasUpdate: false, reason: 'already_checking' };
    }

    if (__DEV__) {
      return this.simulateUpdateCheckInDev();
    }

    try {
      this.isChecking = true;
      console.log('🔍 [ManualUpdate] Controllo aggiornamenti manuale...');

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        const updateInfo = this.extractUpdateInfo(update);
        console.log('✅ [ManualUpdate] Aggiornamento disponibile:', updateInfo);
        
        // 🔔 Aggiungi notifica di sistema per aggiornamento disponibile
        await this.addSystemNotification({
          type: 'info',
          title: '🚀 Aggiornamento Disponibile',
          message: `Versione ${updateInfo.newVersion} disponibile. ${updateInfo.changelog?.[0] || 'Nuove funzionalità e correzioni.'}`,
          category: 'update',
          priority: 'high',
          persistent: true,
          metadata: {
            newVersion: updateInfo.newVersion,
            currentVersion: this.currentVersion,
            changelog: updateInfo.changelog,
            releaseDate: updateInfo.releaseDate,
            timestamp: new Date().toISOString()
          }
        });
        
        // Invia notifica invece di aggiornare automaticamente
        await UpdateNotificationService.notifyUpdateAvailable(updateInfo);
        
        return {
          hasUpdate: true,
          updateInfo,
          action: 'notification_sent'
        };
      } else {
        console.log('ℹ️ [ManualUpdate] Nessun aggiornamento disponibile');
        return {
          hasUpdate: false,
          reason: 'no_update_available'
        };
      }
    } catch (error) {
      console.error('❌ [ManualUpdate] Errore controllo aggiornamenti:', error);
      return {
        hasUpdate: false,
        error: error.message,
        reason: 'check_failed'
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Ottiene informazioni su aggiornamenti pendenti
   */
  async getPendingUpdates() {
    if (__DEV__) {
      // In development, simula un aggiornamento pendente
      return [{
        versionName: '1.3.2',
        versionCode: 132,
        releaseDate: '2024-01-20',
        changelog: this.versionDatabase['1.3.2'].changelog,
        currentVersion: this.currentVersion,
        simulatedInDev: true
      }];
    }

    return await UpdateNotificationService.getPendingUpdates();
  }

  /**
   * Esegue l'aggiornamento con conferma utente
   */
  async performUpdate(updateInfo, userConfirmed = false) {
    if (!userConfirmed) {
      throw new Error('Aggiornamento richiede conferma utente');
    }

    if (this.isUpdating) {
      throw new Error('Aggiornamento già in corso');
    }

    if (__DEV__) {
      return this.simulateUpdateInDev(updateInfo);
    }

    try {
      this.isUpdating = true;
      console.log('⬇️ [ManualUpdate] Inizio download aggiornamento...');

      // Salva info pre-aggiornamento
      await this.savePreUpdateInfo(updateInfo);

      // Fetch dell'aggiornamento
      const result = await Updates.fetchUpdateAsync();
      console.log('✅ [ManualUpdate] Download completato:', result);

      // Salva nella cronologia prima del riavvio
      await this.saveToUpdateHistory(updateInfo, 'completed');

      // Pulisci notifiche
      await UpdateNotificationService.clearUpdateNotification(updateInfo.versionName);

      // Applica aggiornamento (riavvia app)
      console.log('🔄 [ManualUpdate] Applicazione aggiornamento e riavvio...');
      await Updates.reloadAsync();

      return {
        success: true,
        action: 'app_restarted'
      };
    } catch (error) {
      console.error('❌ [ManualUpdate] Errore durante aggiornamento:', error);
      
      // Salva errore nella cronologia
      await this.saveToUpdateHistory(updateInfo, 'failed', error.message);
      
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Simula controllo aggiornamenti all'avvio in development
   */
  async simulateStartupUpdateCheckInDev() {
    console.log('🧪 [ManualUpdate] Simulazione controllo avvio (DEV)');
    
    // Simula 80% di probabilità che ci sia un aggiornamento disponibile
    const hasUpdate = Math.random() > 0.2;
    
    if (!hasUpdate) {
      console.log('🧪 [ManualUpdate] Simulazione: nessun aggiornamento disponibile');
      return {
        hasUpdate: false,
        reason: 'no_update_available',
        context: 'startup',
        simulated: true
      };
    }
    
    // Simula che è disponibile la v1.3.2
    const updateInfo = {
      versionName: '1.3.2',
      versionCode: 132,
      currentVersion: this.currentVersion,
      ...this.versionDatabase['1.3.2'],
      simulatedInDev: true
    };

    await UpdateNotificationService.notifyUpdateAvailable(updateInfo);
    
    return {
      hasUpdate: true,
      updateInfo,
      action: 'notification_sent',
      context: 'startup',
      simulated: true
    };
  }

  /**
   * Simula controllo aggiornamenti in development
   */
  async simulateUpdateCheckInDev() {
    console.log('🧪 [ManualUpdate] Simulazione controllo aggiornamenti (DEV)');
    
    // Simula che è disponibile la v1.3.2
    const updateInfo = {
      versionName: '1.3.2',
      versionCode: 132,
      currentVersion: this.currentVersion,
      ...this.versionDatabase['1.3.2'],
      simulatedInDev: true
    };

    await UpdateNotificationService.notifyUpdateAvailable(updateInfo);
    
    return {
      hasUpdate: true,
      updateInfo,
      action: 'notification_sent',
      simulated: true
    };
  }

  /**
   * Simula aggiornamento in development
   */
  async simulateUpdateInDev(updateInfo) {
    console.log('🧪 [ManualUpdate] Simulazione aggiornamento (DEV):', updateInfo);
    
    // Simula tempo di download
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Aggiorna versione corrente
    this.currentVersion = updateInfo.versionName;
    await AsyncStorage.setItem('app_version_current', this.currentVersion);
    
    // Salva nella cronologia
    await this.saveToUpdateHistory(updateInfo, 'completed');
    
    // Pulisci notifiche
    await UpdateNotificationService.clearUpdateNotification(updateInfo.versionName);
    
    console.log('✅ [ManualUpdate] Simulazione completata, versione aggiornata a:', this.currentVersion);
    
    return {
      success: true,
      action: 'simulated_update',
      newVersion: this.currentVersion
    };
  }

  /**
   * Estrae informazioni dall'update Expo
   */
  extractUpdateInfo(update) {
    const manifest = update.manifest || {};
    const version = manifest.version || manifest.runtimeVersion || 'Unknown';
    
    // Cerca nel database versioni
    const versionInfo = this.versionDatabase[version] || {
      versionName: version,
      versionCode: parseInt(version.replace(/\./g, '')) || 999,
      releaseDate: new Date().toISOString().split('T')[0],
      changelog: ['Aggiornamento disponibile'],
      isForced: false
    };

    return {
      ...versionInfo,
      currentVersion: this.currentVersion,
      updateManifest: manifest
    };
  }

  /**
   * Salva informazioni pre-aggiornamento
   */
  async savePreUpdateInfo(updateInfo) {
    try {
      const preUpdateData = {
        pendingUpdate: true,
        targetVersion: updateInfo.versionName,
        currentVersion: this.currentVersion,
        updateTime: new Date().toISOString(),
        userInitiated: true
      };
      
      await AsyncStorage.setItem('pending_manual_update', JSON.stringify(preUpdateData));
      console.log('💾 [ManualUpdate] Info pre-aggiornamento salvate');
    } catch (error) {
      console.error('❌ Errore salvataggio info pre-aggiornamento:', error);
    }
  }

  /**
   * Salva nella cronologia aggiornamenti
   */
  async saveToUpdateHistory(updateInfo, status, errorMessage = null) {
    try {
      const historyKey = 'app_update_history';
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      const historyEntry = {
        id: Date.now().toString(),
        versionName: updateInfo.versionName,
        versionCode: updateInfo.versionCode,
        previousVersion: this.currentVersion,
        status, // 'completed', 'failed', 'cancelled'
        timestamp: new Date().toISOString(),
        changelog: updateInfo.changelog || [],
        errorMessage,
        userInitiated: true
      };
      
      history.unshift(historyEntry); // Aggiungi in cima
      
      // Mantieni solo gli ultimi 20 aggiornamenti
      if (history.length > 20) {
        history.splice(20);
      }
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      console.log('📝 [ManualUpdate] Salvato in cronologia:', historyEntry);
    } catch (error) {
      console.error('❌ Errore salvataggio cronologia:', error);
    }
  }

  /**
   * Ottiene la cronologia aggiornamenti
   */
  async getUpdateHistory() {
    try {
      const historyKey = 'app_update_history';
      const historyData = await AsyncStorage.getItem(historyKey);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('❌ Errore recupero cronologia:', error);
      return [];
    }
  }

  /**
   * Ottiene la versione corrente
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Verifica se ci sono aggiornamenti pendenti all'avvio
   */
  async checkPostUpdateStatus() {
    try {
      const pendingData = await AsyncStorage.getItem('pending_manual_update');
      if (pendingData) {
        const updateData = JSON.parse(pendingData);
        console.log('🔍 [ManualUpdate] Controllo post-aggiornamento:', updateData);
        
        // Rimuovi il flag di aggiornamento pendente
        await AsyncStorage.removeItem('pending_manual_update');
        
        // Se la versione corrente è cambiata, l'aggiornamento è riuscito
        if (updateData.targetVersion === this.currentVersion) {
          console.log('✅ [ManualUpdate] Aggiornamento completato con successo');
          return {
            wasUpdated: true,
            fromVersion: updateData.currentVersion,
            toVersion: this.currentVersion,
            updateTime: updateData.updateTime
          };
        }
      }
      
      return { wasUpdated: false };
    } catch (error) {
      console.error('❌ Errore controllo post-aggiornamento:', error);
      return { wasUpdated: false };
    }
  }

  // 🔔 METODO HELPER PER NOTIFICHE DI SISTEMA
  async addSystemNotification(notification) {
    try {
      await SystemNotificationPersistence.initialize();
      await SystemNotificationPersistence.addNotification(notification);
      console.log(`📱 Notifica sistema aggiunta: ${notification.title}`);
    } catch (error) {
      console.error('❌ Errore creazione notifica sistema:', error);
    }
  }
}

export default new ManualUpdateService();
