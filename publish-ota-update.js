// 🚀 SCRIPT PUBBLICAZIONE AGGIORNAMENTO OTA CON AUTO-UPDATE DOCUMENTAZIONE
// Uso: node publish-ota-update.js [messaggio]
// Esempio: node publish-ota-update.js "Backup automatico app chiusa"

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Aggiorna changelog in AppInfoScreen.js
 */
function updateAppInfoChangelog(version, message) {
  const filePath = './src/screens/AppInfoScreen.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Evita inserimento duplicato se la versione è già presente in cima
  const alreadyHasTop = new RegExp(`version['\"]:\\s*['\"]${version}['\"]`).test(content)
                      || new RegExp(`\\{\\s*\\"version\\":\\s*\\"${version}\\"`).test(content);
  if (alreadyHasTop) {
    console.log(`ℹ️ Changelog già contiene v${version}, skip inserimento`);
    return;
  }
  
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const newChangelogEntry = `    {
      version: '${version}',
      date: '${today}',
      changes: [
        '${message}',
        'Aggiornamento automatico versione e documentazione',
        'Sincronizzazione informazioni app con release OTA',
        'Sistema auto-update changelog implementato'
      ]
    },`;
  
  // Trova la posizione dopo "const changelog = [" e inserisci la nuova entry
  const changelogStart = content.indexOf('const changelog = [');
  if (changelogStart !== -1) {
    const insertPosition = content.indexOf('\n', changelogStart) + 1;
    content = content.slice(0, insertPosition) + newChangelogEntry + '\n' + content.slice(insertPosition);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ AppInfoScreen.js aggiornato con changelog v${version}`);
  } else {
    console.warn('⚠️ Non trovato changelog in AppInfoScreen.js');
  }
}

async function publishOTAUpdate() {
  try {
    console.log('🚀 ========================================');
    console.log('🚀 PUBBLICAZIONE AGGIORNAMENTO OTA');
    console.log('🚀 ========================================');
    
    // Leggi versione corrente
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
    
    console.log(`📦 Versione corrente: ${packageJson.version}`);
    console.log(`📱 App versione: ${appJson.expo.version}`);
    
    // Verifica che le versioni siano sincronizzate
    if (packageJson.version !== appJson.expo.version) {
      console.error('❌ ERRORE: Versioni non sincronizzate!');
      console.error(`📦 package.json: ${packageJson.version}`);
      console.error(`📱 app.json: ${appJson.expo.version}`);
      process.exit(1);
    }
    
    // Messaggio di rilascio
    const releaseMessage = process.argv[2] || `Aggiornamento v${packageJson.version} - Miglioramenti sistema backup e notifiche`;
    
    console.log(`📝 Messaggio rilascio: "${releaseMessage}"`);
    
    // Aggiorna changelog in AppInfoScreen
    console.log('📋 Aggiornamento changelog...');
    updateAppInfoChangelog(packageJson.version, releaseMessage);
    
    // Commit le modifiche al changelog se necessario
    try {
      execSync('git add src/screens/AppInfoScreen.js', { stdio: 'pipe' });
      execSync(`git commit -m "📋 AUTO-UPDATE: Changelog v${packageJson.version}"`, { stdio: 'pipe' });
      console.log('✅ Changelog committato automaticamente');
    } catch (e) {
      console.log('ℹ️ Nessuna modifica changelog da committare');
    }
    
    console.log('');
    console.log('⬆️ Pubblicazione in corso...');
    
    // Esegui comando EAS update
  const command = `${easCmd} update --branch production --message "${releaseMessage}"`;
    console.log(`🔧 Comando: ${command}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
      
      console.log('');
      console.log('✅ ========================================');
      console.log('✅ AGGIORNAMENTO OTA PUBBLICATO CON SUCCESSO!');
      console.log('✅ ========================================');
      console.log(`🎯 Versione: ${packageJson.version}`);
      console.log(`📝 Messaggio: ${releaseMessage}`);
      console.log('📱 Gli utenti riceveranno l\'aggiornamento automaticamente');
      console.log('');
      console.log('🧪 Per testare:');
      console.log('🧪 1. Apri l\'app su un dispositivo con build nativa');
      console.log('🧪 2. Aspetta qualche minuto per la propagazione');
      console.log('🧪 3. Riavvia l\'app o usa checkForUpdates() nella console');
      
    } catch (error) {
      console.error('❌ Errore durante pubblicazione:', error.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Errore script:', error.message);
    process.exit(1);
  }
}

// Verifica che EAS CLI sia disponibile (globale o via npx)
let easCmd = 'eas';
try {
  execSync('eas --version', { encoding: 'utf8' });
} catch (error) {
  try {
    execSync('npx eas --version', { encoding: 'utf8' });
    easCmd = 'npx eas';
  } catch (e) {
    console.error('❌ ERRORE: EAS CLI non disponibile!');
    console.error('💡 Installa con: npm install -g @expo/eas-cli oppure usa npx @expo/eas-cli');
    process.exit(1);
  }
}

publishOTAUpdate();
