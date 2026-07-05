#!/usr/bin/env node
/**
 * 🚀 SCRIPT PUBBLICAZIONE OTA v1.4.0
 * Pubblica aggiornamento Over-The-Air per branch production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 PUBBLICAZIONE OTA v1.4.0 - Sistema Notifiche Persistenti');
console.log('===========================================================');

// Verifica che siamo nel branch corretto
try {
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📍 Branch attuale: ${currentBranch}`);
  
  if (currentBranch !== 'production') {
    console.log('⚠️ ATTENZIONE: Non sei nel branch production');
    console.log('   Continuo comunque con la pubblicazione...');
  }
} catch (error) {
  console.log('⚠️ Impossibile verificare branch Git');
}

// Verifica file di configurazione
const configFiles = [
  { file: 'app.json', key: 'expo.version' },
  { file: 'package.json', key: 'version' },
  { file: 'app.json', key: 'expo.runtimeVersion' }
];

console.log('\n📋 Verifica configurazioni versione:');
for (const config of configFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(config.file, 'utf8'));
    const version = config.key.split('.').reduce((obj, key) => obj[key], content);
    console.log(`✅ ${config.file} (${config.key}): ${version}`);
  } catch (error) {
    console.log(`❌ ${config.file}: Errore lettura`);
  }
}

// Messaggio di aggiornamento
const updateMessage = `🔔 OTA Update v1.4.0 - Sistema Notifiche Persistenti

🆕 Nuove Funzionalità:
• Sistema notifiche persistenti completo
• Menu "Notifiche di Sistema" con badge contatore
• Filtri avanzati per tipo, priorità e stato
• Statistiche dettagliate e cronologia
• Export/Import notifiche per backup
• Pulizia automatica notifiche vecchie

🎨 Miglioramenti UI:
• Rimossi pulsanti test popup
• Interfaccia più pulita e professionale
• Badge real-time per notifiche non lette

⚡ Tecnico:
• Architettura modulare con servizi/hook/context
• Performance ottimizzate
• Persistenza AsyncStorage garantita`;

console.log('\n📝 Messaggio aggiornamento:');
console.log(updateMessage);

// Comando EAS Update
const easCommand = `eas update --branch production --message "${updateMessage.replace(/"/g, '\\"')}"`;

console.log('\n🔄 Pubblicazione in corso...');
console.log(`📤 Comando: ${easCommand.substring(0, 100)}...`);

try {
  // Esegui pubblicazione OTA
  const output = execSync(easCommand, { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('\n✅ PUBBLICAZIONE OTA COMPLETATA!');
  console.log('================================');
  console.log(output);
  
  // Salva log della pubblicazione
  const logEntry = {
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    branch: 'production',
    message: updateMessage,
    success: true,
    output: output
  };
  
  try {
    const logFile = 'ota-deployment-log.json';
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    logs.unshift(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    console.log(`📄 Log salvato in: ${logFile}`);
  } catch (logError) {
    console.log('⚠️ Impossibile salvare log:', logError.message);
  }
  
  console.log('\n🎯 AGGIORNAMENTO PUBBLICATO!');
  console.log('• Gli utenti riceveranno l\'aggiornamento al prossimo avvio app');
  console.log('• Le nuove funzionalità saranno disponibili immediatamente');
  console.log('• Il sistema notifiche persistenti è ora attivo');
  
} catch (error) {
  console.log('\n❌ ERRORE PUBBLICAZIONE OTA');
  console.log('===========================');
  console.log('Errore:', error.message);
  
  // Salva log errore
  const errorLogEntry = {
    timestamp: new Date().toISOString(),
    version: '1.4.0',
    branch: 'production',
    message: updateMessage,
    success: false,
    error: error.message
  };
  
  try {
    const logFile = 'ota-deployment-log.json';
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    logs.unshift(errorLogEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (logError) {
    console.log('⚠️ Impossibile salvare log errore:', logError.message);
  }
  
  console.log('\n🔧 Possibili soluzioni:');
  console.log('• Verifica connessione internet');
  console.log('• Controlla credenziali EAS');
  console.log('• Verifica configurazione progetto');
  console.log('• Riprova il comando manualmente:');
  console.log(`  ${easCommand}`);
  
  process.exit(1);
}

console.log('\n🎉 PROCESSO COMPLETATO!');
console.log('======================');
console.log('• Versione: 1.4.0');
console.log('• Branch: production');
console.log('• Runtime: 1.4.0');
console.log('• Sistema notifiche: ✅ Attivo');
console.log('• OTA Deploy: ✅ Completato');
