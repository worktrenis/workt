#!/usr/bin/env node

/**
 * 🚀 SISTEMA AUTOMAZIONE VERSIONING COMPLETO
 * 
 * Script automatico per aggiornamento versioni app con:
 * - Incremento automatico versione (patch/minor/major)
 * - Sincronizzazione tutti i file di configurazione
 * - Aggiornamento servizi interni
 * - Commit Git automatico con messaggi strutturati
 * - Tag Git con release notes
 * - Documentazione automatica
 * 
 * USO: node scripts/auto-version-update.js [patch|minor|major] [messaggio opzionale]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoVersionUpdater {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.files = {
      packageJson: path.join(this.projectRoot, 'package.json'),
      appJson: path.join(this.projectRoot, 'app.json'),
      appProdJson: path.join(this.projectRoot, 'app-production.json'),
      appInfoScreen: path.join(this.projectRoot, 'src/screens/AppInfoScreen.js'),
      updateService: path.join(this.projectRoot, 'src/services/UpdateService.js'),
      manualUpdateService: path.join(this.projectRoot, 'src/services/ManualUpdateService.js'),
      changelog: path.join(this.projectRoot, 'CHANGELOG.md')
    };
  }

  /**
   * Incrementa la versione secondo semantic versioning
   */
  incrementVersion(currentVersion, type = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Legge la versione corrente dal package.json
   */
  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(this.files.packageJson, 'utf8'));
    return packageJson.version;
  }

  /**
   * Aggiorna package.json
   */
  updatePackageJson(newVersion) {
    const packageJson = JSON.parse(fs.readFileSync(this.files.packageJson, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(this.files.packageJson, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ package.json aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna app.json
   */
  updateAppJson(newVersion) {
    const appJson = JSON.parse(fs.readFileSync(this.files.appJson, 'utf8'));
    appJson.expo.version = newVersion;
    appJson.expo.runtimeVersion = newVersion;
    fs.writeFileSync(this.files.appJson, JSON.stringify(appJson, null, 2) + '\n');
    console.log(`✅ app.json aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna app-production.json
   */
  updateAppProdJson(newVersion) {
    const appProdJson = JSON.parse(fs.readFileSync(this.files.appProdJson, 'utf8'));
    appProdJson.expo.version = newVersion;
    appProdJson.expo.runtimeVersion = newVersion;
    fs.writeFileSync(this.files.appProdJson, JSON.stringify(appProdJson, null, 2) + '\n');
    console.log(`✅ app-production.json aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna UpdateService.js
   */
  updateUpdateService(newVersion, description = 'Aggiornamento automatico sistema') {
    let content = fs.readFileSync(this.files.updateService, 'utf8');
    
    // Aggiorna currentVersion
    content = content.replace(
      /currentVersion:\s*['"`][^'"`]+['"`]/,
      `currentVersion: '${newVersion}'`
    );
    
    // Aggiorna description se presente
    content = content.replace(
      /(description:\s*['"`])[^'"`]+(['"`])/,
      `$1${description}$2`
    );
    
    fs.writeFileSync(this.files.updateService, content);
    console.log(`✅ UpdateService.js aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna ManualUpdateService.js
   */
  updateManualUpdateService(newVersion, features = []) {
    let content = fs.readFileSync(this.files.manualUpdateService, 'utf8');
    
    // Aggiorna currentVersion
    content = content.replace(
      /currentVersion:\s*['"`][^'"`]+['"`]/,
      `currentVersion: '${newVersion}'`
    );
    
    // Trova e aggiorna il database delle versioni
    const versionEntry = {
      version: newVersion,
      date: new Date().toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      features: features.length > 0 ? features : [
        'Aggiornamento automatico sistema',
        'Miglioramenti generali di stabilità',
        'Ottimizzazioni prestazioni'
      ],
      priority: 'medium',
      mandatory: false
    };
    
    // Inserisci la nuova versione nel database
    const versionDbRegex = /(const versionDatabase = \[)([\s\S]*?)(\];)/;
    const match = content.match(versionDbRegex);
    
    if (match) {
      const newEntry = `    ${JSON.stringify(versionEntry, null, 4).replace(/\n/g, '\n    ')},`;
      const updatedDb = `${match[1]}\n${newEntry}${match[2]}${match[3]}`;
      content = content.replace(versionDbRegex, updatedDb);
    }
    
    fs.writeFileSync(this.files.manualUpdateService, content);
    console.log(`✅ ManualUpdateService.js aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna AppInfoScreen.js changelog
   */
  updateAppInfoScreen(newVersion, changes = []) {
    let content = fs.readFileSync(this.files.appInfoScreen, 'utf8');
    
    const defaultChanges = [
      'Aggiornamento automatico sistema',
      'Miglioramenti generali stabilità e prestazioni',
      'Ottimizzazioni interfaccia utente',
      'Correzioni bug minori'
    ];
    
    const changelogEntry = {
      version: newVersion,
      date: new Date().toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      changes: changes.length > 0 ? changes : defaultChanges
    };
    
    // Trova e aggiorna il changelog
    const changelogRegex = /(const changelog = \[)([\s\S]*?)(\];)/;
    const match = content.match(changelogRegex);
    
    if (match) {
      const newEntry = `    ${JSON.stringify(changelogEntry, null, 4).replace(/\n/g, '\n    ')},`;
      const updatedChangelog = `${match[1]}\n${newEntry}${match[2]}${match[3]}`;
      content = content.replace(changelogRegex, updatedChangelog);
    }
    
    fs.writeFileSync(this.files.appInfoScreen, content);
    console.log(`✅ AppInfoScreen.js changelog aggiornato a v${newVersion}`);
  }

  /**
   * Aggiorna CHANGELOG.md
   */
  updateChangelog(newVersion, changes = []) {
    const date = new Date().toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    const defaultChanges = [
      '- Aggiornamento automatico sistema versioning',
      '- Miglioramenti generali stabilità e prestazioni',
      '- Ottimizzazioni interfaccia utente',
      '- Correzioni bug minori e ottimizzazioni'
    ];
    
    const changesList = changes.length > 0 ? 
      changes.map(change => `- ${change}`).join('\n') : 
      defaultChanges.join('\n');
    
    const newEntry = `## [${newVersion}] - ${date}

${changesList}

`;
    
    let content = fs.readFileSync(this.files.changelog, 'utf8');
    
    // Inserisci dopo il titolo principale
    const insertIndex = content.indexOf('\n\n') + 2;
    content = content.slice(0, insertIndex) + newEntry + content.slice(insertIndex);
    
    fs.writeFileSync(this.files.changelog, content);
    console.log(`✅ CHANGELOG.md aggiornato a v${newVersion}`);
  }

  /**
   * Esegue commit Git automatico
   */
  gitCommitAndTag(newVersion, message = '') {
    const defaultMessage = `🚀 RELEASE v${newVersion}: Aggiornamento Automatico Sistema

✅ AGGIORNATO: Tutte le versioni sincronizzate a v${newVersion}
✅ AGGIORNATO: Configurazioni app.json e package.json
✅ AGGIORNATO: Servizi interni UpdateService e ManualUpdateService  
✅ AGGIORNATO: AppInfoScreen changelog con nuove features
✅ AGGIORNATO: CHANGELOG.md con release notes complete

🎯 SISTEMA: Automazione versioning completa implementata
🎯 SYNC: Coerenza versioni garantita su tutti i componenti
🎯 DOCS: Documentazione automatica aggiornata

Release automatica generata dal sistema di versioning.${message ? '\n\nNote aggiuntive: ' + message : ''}`;

    try {
      // Add tutti i file
      execSync('git add .', { cwd: this.projectRoot });
      console.log('✅ File aggiunti a Git staging');
      
      // Commit
      execSync(`git commit -m "${defaultMessage}"`, { cwd: this.projectRoot });
      console.log('✅ Commit Git completato');
      
      // Tag
      const tagMessage = `Release v${newVersion}: Aggiornamento automatico sistema versioning completo`;
      execSync(`git tag -a v${newVersion} -m "${tagMessage}"`, { cwd: this.projectRoot });
      console.log(`✅ Tag Git v${newVersion} creato`);
      
      return true;
    } catch (error) {
      console.error('❌ Errore Git:', error.message);
      return false;
    }
  }

  /**
   * Processo principale di aggiornamento
   */
  async updateVersion(type = 'patch', customMessage = '', customChanges = []) {
    console.log('🚀 AVVIO AGGIORNAMENTO AUTOMATICO VERSIONI...\n');
    
    try {
      // 1. Ottieni versione corrente
      const currentVersion = this.getCurrentVersion();
      const newVersion = this.incrementVersion(currentVersion, type);
      
      console.log(`📊 Versione corrente: ${currentVersion}`);
      console.log(`📈 Nuova versione: ${newVersion} (${type})\n`);
      
      // 2. Aggiorna tutti i file
      console.log('📝 AGGIORNAMENTO FILE DI CONFIGURAZIONE:');
      this.updatePackageJson(newVersion);
      this.updateAppJson(newVersion);
      this.updateAppProdJson(newVersion);
      
      console.log('\n📝 AGGIORNAMENTO SERVIZI INTERNI:');
      this.updateUpdateService(newVersion, customMessage || `Release v${newVersion} automatica`);
      this.updateManualUpdateService(newVersion, customChanges);
      
      console.log('\n📝 AGGIORNAMENTO DOCUMENTAZIONE:');
      this.updateAppInfoScreen(newVersion, customChanges);
      this.updateChangelog(newVersion, customChanges);
      
      // 3. Git commit e tag
      console.log('\n📝 COMMIT GIT AUTOMATICO:');
      const gitSuccess = this.gitCommitAndTag(newVersion, customMessage);
      
      if (gitSuccess) {
        console.log(`\n🎉 AGGIORNAMENTO COMPLETATO CON SUCCESSO!`);
        console.log(`📦 Versione: ${newVersion}`);
        console.log(`🏷️  Tag: v${newVersion}`);
        console.log(`💾 Commit: Automatico con release notes complete`);
        console.log(`📚 Docs: Changelog e AppInfo aggiornati automaticamente`);
      } else {
        console.log('\n⚠️  Aggiornamento file completato, ma errore Git');
      }
      
    } catch (error) {
      console.error('\n❌ ERRORE DURANTE AGGIORNAMENTO:', error.message);
      process.exit(1);
    }
  }
}

// Esecuzione script
if (require.main === module) {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  const customMessage = args[1] || '';
  const customChanges = args.slice(2); // resto degli argomenti come changes
  
  const updater = new AutoVersionUpdater();
  updater.updateVersion(versionType, customMessage, customChanges);
}

module.exports = AutoVersionUpdater;
