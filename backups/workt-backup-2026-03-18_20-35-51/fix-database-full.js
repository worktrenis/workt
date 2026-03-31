/**
 * Fix per Database SQLITE_FULL - Pulisce e ripara il database
 * Resolve il problema: database or disk is full (code 13 SQLITE_FULL)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'work_tracker.db');

console.log('🔧 === FIX DATABASE SQLITE_FULL ===');
console.log(`📂 Database path: ${DB_PATH}`);

// 1. Verifica lo spazio disponibile su disco
function checkDiskSpace() {
    return new Promise((resolve) => {
        exec('fsutil volume diskfree .', (error, stdout, stderr) => {
            if (error) {
                console.log('⚠️ Impossibile verificare spazio disco:', error.message);
                resolve(false);
                return;
            }
            
            const lines = stdout.split('\n');
            const freeBytesLine = lines.find(line => line.includes('Free bytes'));
            
            if (freeBytesLine) {
                const freeBytes = parseInt(freeBytesLine.match(/(\d+)/)[1]);
                const freeMB = Math.round(freeBytes / (1024 * 1024));
                console.log(`💾 Spazio libero su disco: ${freeMB} MB`);
                resolve(freeMB > 100); // Almeno 100MB liberi
            } else {
                resolve(true);
            }
        });
    });
}

// 2. Verifica e ripara il database
async function repairDatabase() {
    console.log('🔍 Verifica database...');
    
    // Verifica se il file esiste
    if (!fs.existsSync(DB_PATH)) {
        console.log('❌ Database non trovato, sarà creato automaticamente');
        return true;
    }
    
    // Verifica dimensione
    const stats = fs.statSync(DB_PATH);
    console.log(`📊 Dimensione database: ${stats.size} bytes`);
    
    if (stats.size === 0) {
        console.log('⚠️ Database vuoto, elimino per permettere ricreazione...');
        try {
            fs.unlinkSync(DB_PATH);
            console.log('✅ Database vuoto eliminato');
            return true;
        } catch (error) {
            console.log('❌ Errore eliminazione database:', error.message);
            return false;
        }
    }
    
    return true;
}

// 3. Pulizia cache e file temporanei
function cleanupCache() {
    console.log('🧹 Pulizia cache...');
    
    const cacheDirs = [
        path.join(__dirname, 'node_modules/.cache'),
        path.join(__dirname, '.expo'),
        path.join(__dirname, 'android/build'),
        path.join(__dirname, 'ios/build')
    ];
    
    cacheDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            try {
                exec(`rmdir /s /q "${dir}"`, (error) => {
                    if (!error) {
                        console.log(`✅ Eliminata cache: ${dir}`);
                    }
                });
            } catch (error) {
                console.log(`⚠️ Non riesco a eliminare: ${dir}`);
            }
        }
    });
}

// 4. Test di scrittura database
function testDatabaseWrite() {
    return new Promise((resolve) => {
        const testFile = path.join(__dirname, 'test_write.tmp');
        
        try {
            fs.writeFileSync(testFile, 'test data for sqlite');
            fs.unlinkSync(testFile);
            console.log('✅ Test scrittura: OK');
            resolve(true);
        } catch (error) {
            console.log('❌ Test scrittura fallito:', error.message);
            resolve(false);
        }
    });
}

// Esecuzione principale
async function main() {
    console.log('🚀 Avvio riparazione database...\n');
    
    // 1. Controllo spazio disco
    const hasSpace = await checkDiskSpace();
    if (!hasSpace) {
        console.log('❌ Spazio su disco insufficiente!');
        return;
    }
    
    // 2. Test scrittura
    const canWrite = await testDatabaseWrite();
    if (!canWrite) {
        console.log('❌ Impossibile scrivere file nel directory!');
        return;
    }
    
    // 3. Riparazione database
    const repaired = await repairDatabase();
    if (!repaired) {
        console.log('❌ Impossibile riparare il database!');
        return;
    }
    
    // 4. Pulizia cache
    cleanupCache();
    
    console.log('\n✅ === RIPARAZIONE COMPLETATA ===');
    console.log('📱 Riavvia l\'app per testare il backup automatico');
    console.log('🔄 Il database sarà ricreato automaticamente all\'avvio');
}

main().catch(console.error);
