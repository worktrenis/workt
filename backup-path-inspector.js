// 📍 BACKUP PATH INSPECTOR - Visualizza percorsi e dettagli backup
import AutoBackupService from './src/services/AutoBackupService';
import * as FileSystem from 'expo-file-system';

/**
 * Mostra tutti i backup con percorsi dettagliati
 */
export const inspectAllBackups = async () => {
  try {
    console.log('🔍 ISPEZIONE COMPLETA BACKUP...');
    console.log('===============================');
    
    // 1. Mostra percorsi disponibili
    await AutoBackupService.showAllBackupPaths();
    
    // 2. Lista backup con dettagli percorso
    console.log('\n📋 LISTA BACKUP CON PERCORSI:');
    const backups = await AutoBackupService.getAutoBackupsList();
    
    if (backups.length === 0) {
      console.log('❌ Nessun backup trovato');
      return;
    }
    
    for (let i = 0; i < backups.length; i++) {
      const backup = backups[i];
      console.log(`\n📁 BACKUP ${i + 1}:`);
      console.log(`   Nome: ${backup.name}`);
      console.log(`   Tipo: ${backup.type === 'auto' ? '🤖 Automatico' : '👤 Manuale'}`);
      console.log(`   Data: ${backup.date.toLocaleString('it-IT')}`);
      console.log(`   Dimensione: ${Math.round(backup.size / 1024)} KB`);
      console.log(`   Percorso: ${backup.filePath}`);
      
      if (backup.destination) {
        console.log(`   Destinazione: ${backup.destinationLabel || backup.destination}`);
        console.log(`   Cartella: ${backup.destinationPath || 'Non specificata'}`);
      }
    }
    
    console.log('\n===============================');
    return backups;
  } catch (error) {
    console.error('❌ Errore ispezione backup:', error);
    return null;
  }
};

/**
 * Trova backup per nome e mostra dettagli
 */
export const findBackupByName = async (searchName) => {
  try {
    console.log(`🔍 RICERCA BACKUP: "${searchName}"`);
    
    const backups = await AutoBackupService.getAutoBackupsList();
    const found = backups.filter(b => 
      b.name.toLowerCase().includes(searchName.toLowerCase())
    );
    
    if (found.length === 0) {
      console.log('❌ Nessun backup trovato con quel nome');
      return null;
    }
    
    console.log(`✅ Trovati ${found.length} backup:`);
    for (const backup of found) {
      console.log(`\n📄 ${backup.name}`);
      console.log(`   Percorso: ${backup.filePath}`);
      console.log(`   Data: ${backup.date.toLocaleString('it-IT')}`);
      
      // Mostra dettagli completi del primo risultato
      if (backup === found[0]) {
        await AutoBackupService.showBackupDetails(backup.filePath);
      }
    }
    
    return found;
  } catch (error) {
    console.error('❌ Errore ricerca backup:', error);
    return null;
  }
};

/**
 * Verifica integrità percorsi backup
 */
export const verifyBackupPaths = async () => {
  try {
    console.log('🔍 VERIFICA INTEGRITÀ PERCORSI...');
    console.log('================================');
    
    const destinations = await AutoBackupService.getAvailableDestinations();
    let totalBackups = 0;
    
    for (const dest of destinations) {
      console.log(`\n📂 ${dest.label} (${dest.key})`);
      console.log(`   Percorso: ${dest.path}`);
      
      try {
        const dirInfo = await FileSystem.getInfoAsync(dest.path);
        
        if (dirInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(dest.path);
          const backupFiles = files.filter(f => f.endsWith('.json'));
          
          console.log(`   ✅ Accessibile - ${backupFiles.length} backup trovati`);
          totalBackups += backupFiles.length;
          
          // Mostra i primi 3 backup
          if (backupFiles.length > 0) {
            console.log(`   📄 Backup recenti:`);
            for (let i = 0; i < Math.min(3, backupFiles.length); i++) {
              const fileName = backupFiles[i];
              const filePath = `${dest.path}${fileName}`;
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              console.log(`     • ${fileName} (${Math.round(fileInfo.size / 1024)} KB)`);
            }
            if (backupFiles.length > 3) {
              console.log(`     ... e altri ${backupFiles.length - 3} backup`);
            }
          }
        } else {
          console.log(`   ❌ Cartella non esistente`);
        }
      } catch (accessError) {
        console.log(`   ⚠️ Errore accesso: ${accessError.message}`);
      }
    }
    
    console.log(`\n📊 RIEPILOGO: ${totalBackups} backup totali trovati`);
    console.log('================================');
    
    return { totalBackups, destinations };
  } catch (error) {
    console.error('❌ Errore verifica percorsi:', error);
    return null;
  }
};

/**
 * Mostra ultimo backup con tutti i dettagli
 */
export const showLatestBackup = async () => {
  try {
    console.log('📋 ULTIMO BACKUP DETTAGLIATO...');
    
    const backups = await AutoBackupService.getAutoBackupsList();
    
    if (backups.length === 0) {
      console.log('❌ Nessun backup trovato');
      return null;
    }
    
    const latest = backups[0]; // Già ordinati per data
    console.log(`\n🎯 BACKUP PIÙ RECENTE:`);
    console.log(`   Nome: ${latest.name}`);
    console.log(`   Tipo: ${latest.type === 'auto' ? '🤖 Automatico' : '👤 Manuale'}`);
    console.log(`   Data: ${latest.date.toLocaleString('it-IT')}`);
    console.log(`   Percorso: ${latest.filePath}`);
    
    // Mostra dettagli completi
    await AutoBackupService.showBackupDetails(latest.filePath);
    
    return latest;
  } catch (error) {
    console.error('❌ Errore visualizzazione ultimo backup:', error);
    return null;
  }
};

/**
 * Copia percorso backup negli appunti (simulazione)
 */
export const copyBackupPath = async (backupName) => {
  try {
    const backups = await AutoBackupService.getAutoBackupsList();
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      console.log(`❌ Backup "${backupName}" non trovato`);
      return null;
    }
    
    console.log(`📋 PERCORSO COPIATO:`);
    console.log(`${backup.filePath}`);
    console.log(`\n💡 Puoi usare questo percorso per condividere o ispezionare il backup`);
    
    return backup.filePath;
  } catch (error) {
    console.error('❌ Errore copia percorso:', error);
    return null;
  }
};

// Esponi le funzioni globalmente
if (typeof global !== 'undefined') {
  global.inspectAllBackups = inspectAllBackups;
  global.findBackupByName = findBackupByName;
  global.verifyBackupPaths = verifyBackupPaths;
  global.showLatestBackup = showLatestBackup;
  global.copyBackupPath = copyBackupPath;
}

console.log('📍 BACKUP PATH INSPECTOR: Comandi disponibili:');
console.log('- inspectAllBackups()');
console.log('- findBackupByName("nome")');
console.log('- verifyBackupPaths()');
console.log('- showLatestBackup()');
console.log('- copyBackupPath("nomeBackup")');

export default {
  inspectAllBackups,
  findBackupByName,
  verifyBackupPaths,
  showLatestBackup,
  copyBackupPath
};
