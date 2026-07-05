/**
 * INTELLIGENT BACKUP SERVICE V3
 * 
 * Sistema ibrido intelligente che garantisce backup affidabile:
 * 1. Backup automatico quando app è aperta/background
 * 2. Notifiche push per ricordare all'utente
 * 3. Backup automatico all'apertura dell'app
 * 4. Persistenza dello stato backup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import SuperBackupService from './src/services/SuperBackupService';

class IntelligentBackupService {
  constructor() {
    this.lastBackupCheck = null;
    this.backupDue = false;
    this.appStateSubscription = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🧠 IntelligentBackupService: DISABILITATO - Non inizializza più');
      console.log('🔇 Sistema backup silenzioso ora gestito da AutoBackupService');
      this.isInitialized = true;
      return; // Non fa più nulla
      
    } catch (error) {
      console.error('❌ IntelligentBackupService: Errore inizializzazione:', error);
    }
  }

  // Carica stato backup persistente
  async loadBackupState() {
    try {
      const savedState = await AsyncStorage.getItem('intelligent_backup_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.lastBackupCheck = state.lastBackupCheck ? new Date(state.lastBackupCheck) : null;
        this.backupDue = state.backupDue || false;
        console.log('🧠 Stato backup caricato:', { 
          lastBackupCheck: this.lastBackupCheck, 
          backupDue: this.backupDue 
        });
      }
    } catch (error) {
      console.log('⚠️ Impossibile caricare stato backup:', error);
    }
  }

  // Salva stato backup persistente
  async saveBackupState() {
    try {
      const state = {
        lastBackupCheck: this.lastBackupCheck?.toISOString(),
        backupDue: this.backupDue,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('intelligent_backup_state', JSON.stringify(state));
    } catch (error) {
      console.log('⚠️ Impossibile salvare stato backup:', error);
    }
  }

  // Controlla se backup è necessario
  async isBackupNeeded() {
    try {
      // Verifica impostazioni backup automatico
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      if (enabled !== 'true') {
        console.log('🧠 Backup automatico disabilitato');
        return false;
      }

      const backupTime = await AsyncStorage.getItem('auto_backup_time');
      if (!backupTime) {
        console.log('🧠 Orario backup non configurato');
        return false;
      }

      const lastBackupDate = await AsyncStorage.getItem('last_auto_backup_date');
      const today = new Date().toDateString();
      
      if (lastBackupDate === today) {
        console.log('🧠 Backup già eseguito oggi');
        return false;
      }

      // Controlla se è passato l'orario del backup
      const now = new Date();
      const [hours, minutes] = backupTime.split(':');
      const backupDateTime = new Date();
      backupDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (now >= backupDateTime) {
        console.log('🧠 Backup necessario - orario superato:', backupTime);
        return true;
      }

      console.log('🧠 Backup non ancora necessario - orario:', backupTime);
      return false;
    } catch (error) {
      console.error('❌ Errore controllo backup necessario:', error);
      return false;
    }
  }

  // Esegue backup intelligente
  async performIntelligentBackup() {
    try {
      console.log('🧠 Avvio backup intelligente...');
      
      const isNeeded = await this.isBackupNeeded();
      if (!isNeeded) {
        console.log('🧠 Backup non necessario');
        return { success: true, message: 'Backup non necessario' };
      }

      // Esegue backup con SuperBackupService
      const result = await SuperBackupService.performAutomaticBackup();
      
      if (result.success) {
        // Aggiorna stato
        this.backupDue = false;
        await this.saveBackupState();
        
        console.log('✅ Backup intelligente completato silenziosamente:', result.message);
      } else {
        console.log('❌ Backup intelligente fallito:', result.message);
      }

      return result;
    } catch (error) {
      console.error('❌ Errore backup intelligente:', error);
      return { success: false, message: error.message };
    }
  }

  // Gestisce cambio stato app
  async handleAppStateChange(nextAppState) {
    console.log('🧠 App state change:', nextAppState);
    
    if (nextAppState === 'active') {
      // App tornata attiva - controlla backup
      await this.checkBackupOnStart();
    } else if (nextAppState === 'background') {
      // App in background - prova backup silenzioso (NESSUNA NOTIFICA)
      await this.tryBackgroundBackup();
    }
  }

  // Controllo backup all'apertura
  async checkBackupOnStart() {
    try {
      console.log('🧠 Controllo backup all\'apertura...');
      
      const isNeeded = await this.isBackupNeeded();
      if (isNeeded) {
        this.backupDue = true;
        await this.saveBackupState();
        
        // Prova backup immediato SILENZIOSO
        setTimeout(async () => {
          const result = await this.performIntelligentBackup();
          if (result.success) {
            console.log('✅ Backup eseguito silenziosamente all\'apertura');
          } else {
            console.log('⚠️ Backup all\'apertura fallito, riproverò in background');
          }
        }, 3000); // Attende 3 secondi per inizializzazione completa
      }
    } catch (error) {
      console.error('❌ Errore controllo backup apertura:', error);
    }
  }

  // Backup silenzioso in background (NESSUNA NOTIFICA)
  async tryBackgroundBackup() {
    try {
      if (!this.backupDue) return;
      
      console.log('🧠 Tentativo backup silenzioso in background...');
      
      // Aspetta un po' per stabilizzare lo stato background
      setTimeout(async () => {
        const result = await this.performIntelligentBackup();
        if (result.success) {
          console.log('✅ Backup completato silenziosamente in background');
        } else {
          console.log('⚠️ Backup background fallito, riproverò alla prossima apertura');
        }
      }, 5000); // 5 secondi di attesa
      
    } catch (error) {
      console.error('❌ Errore backup background:', error);
    }
  }

  // Test immediato backup intelligente
  async testIntelligentBackup() {
    console.log('🧪 TEST: Backup intelligente...');
    
    // Forza backup necessario
    this.backupDue = true;
    await this.saveBackupState();
    
    const result = await this.performIntelligentBackup();
    console.log('🧪 TEST Result:', result);
    return result;
  }

  // Test sistema completo SILENZIOSO
  async testCompleteSystem() {
    console.log('🧪 TEST: Sistema completo silenzioso...');
    
    try {
      // 1. Simula backup necessario
      await AsyncStorage.setItem('auto_backup_enabled', 'true');
      await AsyncStorage.setItem('auto_backup_time', '00:00'); // Orario passato
      await AsyncStorage.removeItem('last_auto_backup_date'); // Forza backup necessario
      
      // 2. Controlla se backup è necessario
      const isNeeded = await this.isBackupNeeded();
      console.log('🧪 Backup necessario:', isNeeded);
      
      // 3. Esegue backup
      if (isNeeded) {
        const result = await this.performIntelligentBackup();
        console.log('🧪 Backup eseguito:', result);
      }
      
      // 4. NON pianifica alcuna notifica
      console.log('🧪 Sistema configurato per backup silenzioso');
      
      return { success: true, message: 'Test completo silenzioso eseguito' };
    } catch (error) {
      console.error('🧪 Errore test completo:', error);
      return { success: false, message: error.message };
    }
  }

  // Abilita comandi globali per test
  enableGlobalCommands() {
    if (typeof global !== 'undefined') {
      global.testIntelligentBackup = this.testIntelligentBackup.bind(this);
      global.testSilentBackupSystem = this.testCompleteSystem.bind(this);
      global.checkBackupStatus = async () => {
        const isNeeded = await this.isBackupNeeded();
        console.log('🧠 Status backup:', {
          needed: isNeeded,
          backupDue: this.backupDue,
          lastCheck: this.lastBackupCheck
        });
        return { needed: isNeeded, backupDue: this.backupDue };
      };
      
      console.log('🧪 Comandi backup silenzioso disponibili globalmente:');
      console.log('- testIntelligentBackup(): Test backup intelligente');
      console.log('- testSilentBackupSystem(): Test sistema silenzioso');
      console.log('- checkBackupStatus(): Verifica stato backup');
    }
  }

  // Cleanup
  destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.isInitialized = false;
  }
}

// Singleton
const intelligentBackupService = new IntelligentBackupService();

export default intelligentBackupService;
