import * as SQLite from 'expo-sqlite';
import { DATABASE_TABLES } from '../constants';
import { executeDbOperation, withLockHandling } from './DatabaseLockManager';
import DataUpdateService from './DataUpdateService';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.maxRetries = 3;
  }

  async ensureInitialized() {
    if (this.isInitialized && this.db) {
      try {
        // Liveness check: Esegue una query leggera per verificare che la connessione sia ancora attiva.
        await this.db.getFirstAsync('SELECT 1');
        return; // La connessione è valida.
      } catch (error) {
        console.warn(`Controllo di vitalità del database fallito: ${error.message}. Reinicializzazione forzata.`);
        
        const oldDb = this.db; // Mantiene un riferimento al db potenzialmente corrotto
        this.isInitialized = false;
        this.db = null;
        this.initializationPromise = null; // Resetta il promise per permettere una nuova inizializzazione.
        
        // Tenta di chiudere la vecchia connessione in modo sicuro.
        if (oldDb) {
            try {
                await oldDb.closeAsync();
                console.log('Vecchia connessione DB chiusa dopo fallimento del controllo di vitalità.');
            } catch (closeError) {
                console.error('Impossibile chiudere la vecchia connessione al database:', closeError);
            }
        }
        // Prosegue con la logica di reinizializzazione sottostante.
      }
    }

    // Anti-race condition: solo il primo chiamante crea il promise, gli altri lo attendono.
    if (!this.initializationPromise) {
      console.log('Avvio di una nuova inizializzazione del database.');
      this.initializationPromise = this.initDatabase().catch(err => {
          // Se initDatabase fallisce in modo definitivo, resetta il promise.
          // Questo permette al prossimo tentativo di riprovare da capo.
          this.initializationPromise = null;
          // Propaga l'errore per notificare il chiamante.
          return Promise.reject(err);
      });
    } else {
      console.log('In attesa di una inizializzazione del database già in corso...');
    }

    return this.initializationPromise;
  }

  async initDatabase() {
    let attempts = 0;
    const maxAttempts = 3;
    let db = null; // Definisci db qui per poterlo usare nel blocco catch

    while (attempts < maxAttempts) {
      try {
        console.log(`Tentativo di inizializzazione DB ${attempts + 1}/${maxAttempts}`);
        
        db = await SQLite.openDatabaseAsync('worktracker.db');
        console.log('Oggetto database aperto:', db ? 'OK' : 'null');

        // Test and setup tables on the new connection before making it "live"
        await this.testDatabaseConnection(db);
        console.log('Test di connessione al database superato.');

        await this.createTables(db);
        console.log('Tabelle create/verificate.');
        
        // If successful, update the service state
        this.db = db;
        this.isInitialized = true;
        console.log('Database inizializzato con successo.');
        return; // Successo, esce dal ciclo e risolve il promise.
        
      } catch (error) {
        attempts++;
        console.error(`Tentativo di inizializzazione DB ${attempts} fallito:`, error);

        // Se l'apertura ha restituito un oggetto db ma le operazioni successive sono fallite,
        // la connessione potrebbe essere corrotta. Tentiamo di chiuderla esplicitamente.
        if (db) {
          try {
            console.log('Tentativo di chiudere la connessione al database potenzialmente corrotta...');
            await db.closeAsync();
            console.log('Connessione al database corrotta chiusa con successo.');
          } catch (closeError) {
            console.error('Impossibile chiudere la connessione al database corrotta:', closeError);
          } finally {
            db = null; // Assicurati che non venga riutilizzato.
          }
        }
        
        if (attempts >= maxAttempts) {
          // Dopo tutti i tentativi, lancia l'errore finale.
          throw new Error(`Inizializzazione DB fallita dopo ${maxAttempts} tentativi: ${error.message}`);
        }

        const delay = 1000 * Math.pow(2, attempts - 1); // Backoff esponenziale
        console.log(`In attesa di ${delay}ms prima del prossimo tentativo...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async testDatabaseConnection(dbInstance) {
    const db = dbInstance || this.db;
    try {
      // Simple test query
      await db.getFirstAsync('SELECT 1');
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }
  async createTables(dbInstance) {
    const db = dbInstance || this.db;
    try {
      // Work entries table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.WORK_ENTRIES} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          site_name TEXT,
          vehicle_driven TEXT,
          departure_company TEXT,
          arrival_site TEXT,
          work_start_1 TEXT,
          work_end_1 TEXT,
          work_start_2 TEXT,
          work_end_2 TEXT,
          departure_return TEXT,
          arrival_company TEXT,
          interventi TEXT DEFAULT '[]',
          meal_lunch_voucher REAL DEFAULT 0,
          meal_lunch_cash REAL DEFAULT 0,
          meal_dinner_voucher REAL DEFAULT 0,
          meal_dinner_cash REAL DEFAULT 0,
          travel_allowance REAL DEFAULT 0,
          standby_allowance REAL DEFAULT 0,
          is_standby_day INTEGER DEFAULT 0,
          total_earnings REAL DEFAULT 0,
          notes TEXT,
          day_type TEXT DEFAULT 'lavorativa',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Funzione helper per verificare l'esistenza di una colonna
      const columnExists = async (tableName, columnName) => {
        const columns = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
        return columns.some(col => col.name === columnName);
      };

      // Migrazione robusta: aggiungi colonna day_type se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'day_type')) {
        console.log(`Migrazione: la colonna 'day_type' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN day_type TEXT DEFAULT 'lavorativa'`);
        console.log("Migrazione 'day_type' completata.");
      }

      // Migrazione robusta: aggiungi colonna interventi se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'interventi')) {
        console.log(`Migrazione: la colonna 'interventi' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN interventi TEXT DEFAULT '[]'`);
        console.log("Migrazione 'interventi' completata.");
      }

      // Migrazione robusta: aggiungi colonna travel_allowance_percent se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'travel_allowance_percent')) {
        console.log(`Migrazione: la colonna 'travel_allowance_percent' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN travel_allowance_percent REAL DEFAULT 1.0`);
        console.log("Migrazione 'travel_allowance_percent' completata.");
      }

      // Migrazione robusta: aggiungi colonna vehiclePlate se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'vehiclePlate')) {
        console.log(`Migrazione: la colonna 'vehiclePlate' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN vehiclePlate TEXT DEFAULT ''`);
        console.log("Migrazione 'vehiclePlate' completata.");
      }

      // Migrazione robusta: aggiungi colonna targa_veicolo se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'targa_veicolo')) {
        console.log(`Migrazione: la colonna 'targa_veicolo' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN targa_veicolo TEXT DEFAULT ''`);
        console.log("Migrazione 'targa_veicolo' completata.");
      }

      // Migrazione robusta: aggiungi colonna trasferta_manual_override se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'trasferta_manual_override')) {
        console.log(`Migrazione: la colonna 'trasferta_manual_override' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN trasferta_manual_override INTEGER DEFAULT 0`);
        console.log("Migrazione 'trasferta_manual_override' completata.");
      }

      // Migrazione robusta: aggiungi colonna completamento_giornata se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'completamento_giornata')) {
        console.log(`Migrazione: la colonna 'completamento_giornata' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN completamento_giornata TEXT DEFAULT 'nessuno'`);
        console.log("Migrazione 'completamento_giornata' completata.");
      }

      // Migrazione robusta: aggiungi colonna viaggi per multi-turno se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'viaggi')) {
        console.log(`Migrazione: la colonna 'viaggi' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN viaggi TEXT DEFAULT '[]'`);
        console.log("Migrazione 'viaggi' completata per supporto multi-turno.");
      }

      // Migrazione robusta: aggiungi colonna is_fixed_day per giorni fissi se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'is_fixed_day')) {
        console.log(`Migrazione: la colonna 'is_fixed_day' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN is_fixed_day INTEGER DEFAULT 0`);
        console.log("Migrazione 'is_fixed_day' completata per supporto giorni fissi (ferie, permessi, malattia).");
      }

      // Migrazione robusta: aggiungi colonna fixed_earnings per guadagni fissi se manca
      if (!await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'fixed_earnings')) {
        console.log(`Migrazione: la colonna 'fixed_earnings' non esiste nella tabella ${DATABASE_TABLES.WORK_ENTRIES}. Aggiungo...`);
        await db.execAsync(`ALTER TABLE ${DATABASE_TABLES.WORK_ENTRIES} ADD COLUMN fixed_earnings REAL DEFAULT 0`);
        console.log("Migrazione 'fixed_earnings' completata per supporto guadagni fissi.");
      }

      // ✅ PULIZIA AUTOMATICA: Rimuovi voci duplicate vuote create da ripristini backup falliti
      console.log('🔍 Verifica voci duplicate vuote...');
      const duplicateEntries = await db.getAllAsync(`
        SELECT date, COUNT(*) as count 
        FROM ${DATABASE_TABLES.WORK_ENTRIES} 
        WHERE total_earnings = 0 
          AND (work_start_1 = '' OR work_start_1 IS NULL)
          AND (work_end_1 = '' OR work_end_1 IS NULL)
          AND (site_name = '' OR site_name IS NULL)
        GROUP BY date 
        HAVING count > 1
      `);
      
      if (duplicateEntries.length > 0) {
        console.log(`🗑️ Trovate ${duplicateEntries.length} date con voci duplicate vuote, pulizia in corso...`);
        
        for (const duplicate of duplicateEntries) {
          // Mantieni solo la voce più recente per ogni data
          await db.runAsync(`
            DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES} 
            WHERE date = ? 
              AND total_earnings = 0 
              AND (work_start_1 = '' OR work_start_1 IS NULL)
              AND (work_end_1 = '' OR work_end_1 IS NULL)
              AND (site_name = '' OR site_name IS NULL)
              AND id NOT IN (
                SELECT MAX(id) FROM ${DATABASE_TABLES.WORK_ENTRIES} 
                WHERE date = ? 
                  AND total_earnings = 0 
                  AND (work_start_1 = '' OR work_start_1 IS NULL)
                  AND (work_end_1 = '' OR work_end_1 IS NULL)
                  AND (site_name = '' OR site_name IS NULL)
              )
          `, [duplicate.date, duplicate.date]);
          
          console.log(`✅ Pulite voci duplicate per data ${duplicate.date}`);
        }
        console.log('✅ Pulizia voci duplicate completata');
      } else {
        console.log('✅ Nessuna voce duplicata vuota trovata');
      }

      // NOTA: Le vecchie colonne standby_* non vengono rimosse per retrocompatibilità,
      // ma non verranno più popolate dalle nuove versioni dell'app.

      // Standby calendar table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.STANDBY_CALENDAR} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          is_standby INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Settings table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.SETTINGS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Backups table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${DATABASE_TABLES.BACKUPS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          backup_name TEXT NOT NULL,
          backup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          backup_type TEXT NOT NULL,  -- 'local' or 'cloud'
          file_path TEXT,
          status TEXT DEFAULT 'completed',
          notes TEXT
        );
      `);
    } catch (error) {
      throw new Error(`Failed to create tables: ${error.message}`);
    }
  }

  async safeExecute(operation, operationName = 'Database operation') {
    let attempts = 0;
    const maxAttempts = this.maxRetries || 3;

    while (attempts < maxAttempts) {
      try {
        await this.ensureInitialized();
        
        if (!this.db) {
          throw new Error('La connessione al database non è disponibile dopo l\'inizializzazione.');
        }
        
        return await operation();

      } catch (error) {
        attempts++;
        const errorMessage = `${operationName} fallito (tentativo ${attempts}/${maxAttempts}): ${error.message}`;
        console.error(errorMessage, error);

        const isCriticalDbError = 
          error.message.includes('database') || 
          error.message.includes('sqlite') || 
          error.message.includes('null') || 
          error.message.includes('closed') ||
          error.message.includes('database is locked') || // 🔒 Lock specifico
          error.message.includes('finalizeAsync has been rejected') || // 🔒 Lock Expo SQLite
          (error.cause && typeof error.cause.message === 'string' && error.cause.message.includes('code 14')); // SQLITE_CANTOPEN

        if (isCriticalDbError) {
          console.log(`🔒 Errore database/lock rilevato. Tentativo di recupero n. ${attempts}.`);
          
          // Per errori di lock, attendiamo più a lungo prima del retry
          const isLockError = error.message.includes('locked') || 
                             error.message.includes('finalizeAsync has been rejected');
          
          if (isLockError) {
            console.log(`🔄 Database lock rilevato, attesa prolungata...`);
            // Attesa più lunga per i lock (fino a 5 secondi)
            const lockDelay = 1000 + (attempts * 1500);
            await new Promise(resolve => setTimeout(resolve, lockDelay));
          } else {
            // NON chiudere esplicitamente la connessione qui per altri errori critici
            this.isInitialized = false;
            this.db = null;
            this.initializationPromise = null;
            
            const delay = 1000 * Math.pow(2, attempts - 1);
            console.log(`In attesa di ${delay}ms prima del prossimo tentativo...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          if (attempts >= maxAttempts) {
            const finalErrorMsg = `${operationName} fallito definitivamente dopo ${maxAttempts} tentativi. Ultimo errore: ${error.message}`;
            console.error(finalErrorMsg);
            throw new Error(finalErrorMsg);
          }
          
        } else {
          // Not a critical DB error, propagate immediately.
          throw new Error(errorMessage);
        }
      }
    }
  }

  // Work entry methods
  async insertWorkEntry(workEntry) {
    return await this.safeExecute(async () => {
      const {
        date, siteName, vehicleDriven, departureCompany, arrivalSite,
        workStart1, workEnd1, workStart2, workEnd2, departureReturn, arrivalCompany,
        interventi, // Nuovo campo array
        mealLunchVoucher, mealLunchCash, mealDinnerVoucher, mealDinnerCash,
        travelAllowance, travelAllowancePercent, trasfertaManualOverride, // Aggiunto flag manual override
        standbyAllowance, isStandbyDay, totalEarnings, notes, dayType,
        targaVeicolo, completamentoGiornata, // nuovo campo
        isFixedDay, fixedEarnings // nuovi campi per giorni fissi
      } = workEntry;

      // Verifica l'esistenza delle nuove colonne
      const columnExists = async (tableName, columnName) => {
        const columns = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
        return columns.some(col => col.name === columnName);
      };

      // Crea un array di colonne e valori base
      let columns = [
        "date", "site_name", "vehicle_driven", "departure_company", "arrival_site",
        "work_start_1", "work_end_1", "work_start_2", "work_end_2",
        "departure_return", "arrival_company",
        "interventi",
        "meal_lunch_voucher", "meal_lunch_cash", "meal_dinner_voucher", "meal_dinner_cash",
        "travel_allowance", "standby_allowance", "is_standby_day", "total_earnings", "notes", "day_type"
      ];
      let placeholders = new Array(columns.length).fill('?');
      let values = [
        date, siteName || '', vehicleDriven || '', departureCompany || '', arrivalSite || '',
        workStart1 || '', workEnd1 || '', workStart2 || '', workEnd2 || '',
        departureReturn || '', arrivalCompany || '',
        JSON.stringify(interventi || []),
        mealLunchVoucher || 0, mealLunchCash || 0, mealDinnerVoucher || 0, mealDinnerCash || 0,
        travelAllowance || 0, standbyAllowance || 0, isStandbyDay || 0, totalEarnings || 0,
        notes || '', dayType || 'lavorativa'
      ];

      // Aggiungi la colonna targa_veicolo solo se esiste
      const hasTargaVeicolo = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'targa_veicolo');
      if (hasTargaVeicolo) {
        columns.push("targa_veicolo");
        placeholders.push("?");
        values.push(targaVeicolo || '');
        console.log("Utilizzo colonna targa_veicolo nell'inserimento");
      }

      // Aggiungi le colonne nuove solo se esistono
      const hasTravelAllowancePercent = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'travel_allowance_percent');
      if (hasTravelAllowancePercent) {
        columns.push("travel_allowance_percent");
        placeholders.push('?');
        values.push(travelAllowancePercent || 1.0);
        console.log("Utilizzo colonna travel_allowance_percent nell'inserimento");
      }

      const hasTrasfertaManualOverride = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'trasferta_manual_override');
      if (hasTrasfertaManualOverride) {
        columns.push("trasferta_manual_override");
        placeholders.push('?');
        values.push(trasfertaManualOverride ? 1 : 0);
        console.log("Utilizzo colonna trasferta_manual_override nell'inserimento");
      }

      // Aggiungi le colonne per giorni fissi se esistono
      const hasIsFixedDay = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'is_fixed_day');
      if (hasIsFixedDay) {
        columns.push("is_fixed_day");
        placeholders.push('?');
        values.push(isFixedDay ? 1 : 0);
        console.log("Utilizzo colonna is_fixed_day nell'inserimento");
      }

      const hasFixedEarnings = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'fixed_earnings');
      if (hasFixedEarnings) {
        columns.push("fixed_earnings");
        placeholders.push('?');
        values.push(fixedEarnings || 0);
        console.log("Utilizzo colonna fixed_earnings nell'inserimento");
      }

      // Aggiungi la colonna completamento_giornata se esiste
      const hasCompletamentoGiornata = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'completamento_giornata');
      if (hasCompletamentoGiornata) {
        columns.push("completamento_giornata");
        placeholders.push('?');
        values.push(workEntry.completamentoGiornata || 'nessuno');
        console.log("Utilizzo colonna completamento_giornata nell'inserimento");
      }

      // 🚀 MULTI-TURNO: Aggiungi la colonna viaggi se esiste
      const hasViaggi = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'viaggi');
      if (hasViaggi) {
        columns.push("viaggi");
        placeholders.push('?');
        const viaggiJson = JSON.stringify(workEntry.viaggi || []);
        values.push(viaggiJson);
        console.log("🔥 SALVATAGGIO DB INSERT: Utilizzo colonna viaggi nell'inserimento.", {
          viaggiCount: workEntry.viaggi?.length || 0,
          viaggiArray: workEntry.viaggi,
          viaggiJson: viaggiJson,
          siteName: workEntry.siteName
        });
      }

      // Crea la query dinamica
      const query = `
        INSERT INTO ${DATABASE_TABLES.WORK_ENTRIES} (
          ${columns.join(', ')}
        ) VALUES (${placeholders.join(', ')})
      `;

      console.log(`Query di inserimento dinamica con ${columns.length} colonne`);
      const result = await this.db.runAsync(query, values);
      
      // Calcola anno e mese dalla data per la notifica
      const year = workEntry.date ? new Date(workEntry.date).getFullYear() : new Date().getFullYear();
      const month = workEntry.date ? new Date(workEntry.date).getMonth() + 1 : new Date().getMonth() + 1;
      
      // Notifica l'aggiornamento dei work entries
      DataUpdateService.notifyWorkEntriesUpdated('insert', {
        id: result.lastInsertRowId,
        date: workEntry.date,
        year,
        month
      });
      
      return result;
    }, 'Insert work entry');
  }

  async getWorkEntries(year, month) {
    await this.ensureInitialized();
    
    try {
      // FIX: Calcolo corretto delle date evitando problemi di timezone
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate(); // Ottiene il numero di giorni nel mese
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      
      // DEBUG: Log per debugging del bug giorni lavorati
      console.log(`🔍 DatabaseService.getWorkEntries - year: ${year}, month: ${month}`);
      console.log(`🔍 DatabaseService.getWorkEntries - startDate: ${startDate}, endDate: ${endDate}`);
      console.log(`🔍 DatabaseService.getWorkEntries - FIXED: Calcolo diretto senza timezone issues`);
      
      const query = 
        `SELECT * FROM work_entries 
         WHERE date >= ? AND date <= ? 
         ORDER BY date DESC`;
      
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      
      console.log(`🔍 DatabaseService.getWorkEntries - result: ${result ? result.length : 0} entries`);
      if (result && result.length > 0) {
        console.log('🔍 DatabaseService.getWorkEntries - Dates trovate:');
        result.forEach((entry, idx) => {
          console.log(`   ${idx + 1}. ${entry.date} (ID: ${entry.id})`);
        });
      }
      
      return result || [];
    } catch (error) {
      console.error('Error getting work entries:', error);
      throw error;
    }
  }
  
  async getWorkEntriesByDateRange(startDate, endDate) {
    await this.ensureInitialized();
    
    try {
      console.log(`🔍 DatabaseService.getWorkEntriesByDateRange - startDate: ${startDate}, endDate: ${endDate}`);
      
      const query = 
        `SELECT * FROM work_entries 
         WHERE date >= ? AND date <= ? 
         ORDER BY date DESC`;
      
      const result = await this.db.getAllAsync(query, [startDate, endDate]);
      
      console.log(`🔍 DatabaseService.getWorkEntriesByDateRange - result: ${result ? result.length : 0} entries`);
      
      return result || [];
    } catch (error) {
      console.error('Error getting work entries by date range:', error);
      throw error;
    }
  }

  async getWorkEntriesMultiMonth(year, month) {
    return await this.safeExecute(async () => {
      // Calcola il mese precedente e l'anno corrispondente
      let prevMonth = month - 1;
      let prevYear = year;
      
      // Gestisce il cambio di anno
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      
      // Formatta il mese corrente e il mese precedente
      const currentYearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      const prevYearMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
      
      // Query per selezionare gli inserimenti di entrambi i mesi
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        WHERE strftime('%Y-%m', date) = ? OR strftime('%Y-%m', date) = ?
        ORDER BY date DESC
      `, [currentYearMonth, prevYearMonth]);

      // Normalizza tutte le entry
      if (result && result.length > 0) {
        return result.map(entry => this.normalizeWorkEntry(entry));
      }
      
      return result || [];
    }, 'Get work entries multi month');
  }
  
  // Get all work entries regardless of month (for showing complete history)
  async getAllWorkEntries() {
    return await this.safeExecute(async () => {
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        ORDER BY date DESC
      `);

      // Normalizza tutte le entry
      if (result && result.length > 0) {
        return result.map(entry => this.normalizeWorkEntry(entry));
      }
      
      return result || [];
    }, 'Get all work entries');
  }

  async getWorkEntryById(id) {
    return await this.safeExecute(async () => {
      const result = await this.db.getFirstAsync(`
        SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}
        WHERE id = ?
      `, [id]);
      
      if (result) {
        // Usa il metodo di normalizzazione
        const normalizedEntry = this.normalizeWorkEntry(result);
        
        // Aggiungi log per debug
        console.log("Normalizzazione entry ID " + id + ":", {
          trasfertaManualOverride: normalizedEntry.trasfertaManualOverride,
          travelAllowancePercent: normalizedEntry.travelAllowancePercent
        });
        
        return normalizedEntry;
      }
      
      return result;
    }, 'Get work entry by ID');
  }

  async updateWorkEntry(id, workEntry) {
    return await this.safeExecute(async () => {
      const {
        date, siteName, vehicleDriven, departureCompany, arrivalSite,
        workStart1, workEnd1, workStart2, workEnd2, departureReturn, arrivalCompany,
        interventi,
        mealLunchVoucher, mealLunchCash, mealDinnerVoucher, mealDinnerCash,
        travelAllowance, travelAllowancePercent, trasfertaManualOverride,
        standbyAllowance, isStandbyDay, totalEarnings, notes, dayType,
        targaVeicolo, completamentoGiornata,
        isFixedDay, fixedEarnings // nuovi campi per giorni fissi
      } = workEntry;

      // Verifica prima l'esistenza delle nuove colonne
      const columnExists = async (tableName, columnName) => {
        const columns = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
        return columns.some(col => col.name === columnName);
      };

      // Verifica l'esistenza delle nuove colonne e crea una query dinamica
      let updateColumns = [
        "date = ?",
        "site_name = ?",
        "vehicle_driven = ?",
        "departure_company = ?",
        "arrival_site = ?",
        "work_start_1 = ?",
        "work_end_1 = ?",
        "work_start_2 = ?",
        "work_end_2 = ?",
        "departure_return = ?",
        "arrival_company = ?",
        "interventi = ?",
        "meal_lunch_voucher = ?",
        "meal_lunch_cash = ?",
        "meal_dinner_voucher = ?",
        "meal_dinner_cash = ?",
        "travel_allowance = ?",
        "standby_allowance = ?",
        "is_standby_day = ?",
        "total_earnings = ?",
        "notes = ?",
        "day_type = ?"
      ];

      let updateParams = [
        date, 
        siteName || '', 
        vehicleDriven || '', 
        departureCompany || '', 
        arrivalSite || '',
        workStart1 || '', 
        workEnd1 || '', 
        workStart2 || '', 
        workEnd2 || '',
        departureReturn || '', 
        arrivalCompany || '',
        JSON.stringify(interventi || []),
        mealLunchVoucher || 0, 
        mealLunchCash || 0, 
        mealDinnerVoucher || 0, 
        mealDinnerCash || 0,
        travelAllowance || 0,
        standbyAllowance || 0, 
        isStandbyDay || 0, 
        totalEarnings || 0, 
        notes || '',
        dayType || 'lavorativa'
      ];

      // Aggiungi la colonna targa_veicolo solo se esiste
      const hasTargaVeicolo = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'targa_veicolo');
      if (hasTargaVeicolo) {
        updateColumns.push("targa_veicolo = ?");
        updateParams.push(targaVeicolo || '');
        console.log("Utilizzo colonna targa_veicolo nell'aggiornamento");
      }

      // Aggiungi le colonne nuove solo se esistono
      const hasTravelAllowancePercent = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'travel_allowance_percent');
      if (hasTravelAllowancePercent) {
        updateColumns.push("travel_allowance_percent = ?");
        updateParams.push(travelAllowancePercent || 1.0);
        console.log("Utilizzo colonna travel_allowance_percent nell'aggiornamento");
      }

      const hasTrasfertaManualOverride = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'trasferta_manual_override');
      if (hasTrasfertaManualOverride) {
        updateColumns.push("trasferta_manual_override = ?");
        updateParams.push(trasfertaManualOverride ? 1 : 0);
        console.log("Utilizzo colonna trasferta_manual_override nell'aggiornamento");
      }

      // Aggiungi le colonne per giorni fissi se esistono
      const hasIsFixedDay = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'is_fixed_day');
      if (hasIsFixedDay) {
        updateColumns.push("is_fixed_day = ?");
        updateParams.push(isFixedDay ? 1 : 0);
        console.log("Utilizzo colonna is_fixed_day nell'aggiornamento");
      }

      const hasFixedEarnings = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'fixed_earnings');
      if (hasFixedEarnings) {
        updateColumns.push("fixed_earnings = ?");
        updateParams.push(fixedEarnings || 0);
        console.log("Utilizzo colonna fixed_earnings nell'aggiornamento");
      }

      // Aggiungi la colonna completamento_giornata se esiste
      const hasCompletamentoGiornata = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'completamento_giornata');
      if (hasCompletamentoGiornata) {
        updateColumns.push("completamento_giornata = ?");
        updateParams.push(workEntry.completamentoGiornata || 'nessuno');
        console.log("Utilizzo colonna completamento_giornata nell'aggiornamento");
      }

      // 🚀 MULTI-TURNO: Aggiungi la colonna viaggi se esiste
      const hasViaggi = await columnExists(DATABASE_TABLES.WORK_ENTRIES, 'viaggi');
      if (hasViaggi) {
        updateColumns.push("viaggi = ?");
        const viaggiJson = JSON.stringify(workEntry.viaggi || []);
        updateParams.push(viaggiJson);
        console.log("🔥 SALVATAGGIO DB UPDATE: Utilizzo colonna viaggi nell'aggiornamento.", {
          viaggiCount: workEntry.viaggi?.length || 0,
          viaggiArray: workEntry.viaggi,
          viaggiJson: viaggiJson,
          entryId: id,
          siteName: workEntry.siteName
        });
      }

      // Aggiungi l'ID alla fine dei parametri
      updateParams.push(id);

      // Crea la query dinamica
      const query = `
        UPDATE ${DATABASE_TABLES.WORK_ENTRIES} SET
          ${updateColumns.join(', ')}
        WHERE id = ?
      `;

      console.log(`Query di aggiornamento dinamica con ${updateColumns.length} colonne`);
      await this.db.runAsync(query, updateParams);
      
      // Calcola anno e mese dalla data per la notifica
      const year = date ? parseInt(date.split('-')[0]) : new Date().getFullYear();
      const month = date ? parseInt(date.split('-')[1]) : new Date().getMonth() + 1;
      
      // Notifica l'aggiornamento dei dati
      DataUpdateService.notifyWorkEntriesUpdated('update', { id, date, year, month });
      
      return id;
    }, 'Update work entry');
  }

  async deleteWorkEntry(id) {
    return await this.safeExecute(async () => {
      // Prima di cancellare, ottengo i dati per la notifica
      const entryData = await this.db.getFirstAsync(`
        SELECT date FROM ${DATABASE_TABLES.WORK_ENTRIES} WHERE id = ?
      `, [id]);
      
      const date = entryData?.date;
      const year = date ? parseInt(date.split('-')[0]) : new Date().getFullYear();
      const month = date ? parseInt(date.split('-')[1]) : new Date().getMonth() + 1;
      
      await this.db.runAsync(`
        DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES} WHERE id = ?
      `, [id]);
      
      // Notifica la cancellazione dei dati
      if (date) {
        DataUpdateService.notifyWorkEntriesUpdated('delete', { id, date, year, month });
      }
    }, 'Delete work entry');
  }
  // Standby calendar methods
  /**
   * Imposta un giorno come giorno di reperibilità
   * @param {string} date - La data in formato ISO (YYYY-MM-DD)
   * @param {boolean} isStandby - Se il giorno è di reperibilità o meno
   * @returns {Promise<void>}
   */
  async setStandbyDay(date, isStandby) {
    return await this.safeExecute(async () => {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO ${DATABASE_TABLES.STANDBY_CALENDAR} (date, is_standby)
        VALUES (?, ?)
      `, [date, isStandby ? 1 : 0]);
    }, 'Set standby day');
  }
  
  /**
   * Ottiene i giorni di reperibilità per un mese specifico
   * @param {number} year - L'anno
   * @param {number} month - Il mese (1-12)
   * @returns {Promise<Array>} I giorni di reperibilità per il mese specificato
   */
  async getStandbyDays(year, month) {
    return await this.safeExecute(async () => {
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}
        WHERE strftime('%Y-%m', date) = ? AND is_standby = 1
      `, [`${year}-${month.toString().padStart(2, '0')}`]);
      return result || [];
    }, 'Get standby days');
  }
  
  /**
   * Verifica se un giorno specifico è di reperibilità
   * @param {string} date - La data in formato ISO (YYYY-MM-DD)
   * @returns {Promise<boolean>} True se il giorno è di reperibilità, false altrimenti
   */
  async isStandbyDay(date) {
    return await this.safeExecute(async () => {
      const result = await this.db.getFirstAsync(`
        SELECT is_standby FROM ${DATABASE_TABLES.STANDBY_CALENDAR}
        WHERE date = ?
      `, [date]);
      return result ? result.is_standby === 1 : false;
    }, 'Check if standby day');
  }
  
  /**
   * Imposta reperibilità per un intervallo di date
   * @param {string} startDate - La data di inizio in formato ISO (YYYY-MM-DD)
   * @param {string} endDate - La data di fine in formato ISO (YYYY-MM-DD)
   * @param {boolean} isStandby - Se i giorni sono di reperibilità o meno
   * @returns {Promise<number>} Il numero di giorni impostati
   */
  async setStandbyRange(startDate, endDate, isStandby) {
    return await this.safeExecute(async () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Date non valide');
      }
      
      let current = new Date(start);
      let count = 0;
      
      // Usa una transazione per eseguire tutto in batch
      await this.db.withTransactionAsync(async () => {
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          await this.db.runAsync(`
            INSERT OR REPLACE INTO ${DATABASE_TABLES.STANDBY_CALENDAR} (date, is_standby)
            VALUES (?, ?)
          `, [dateStr, isStandby ? 1 : 0]);
          
          current.setDate(current.getDate() + 1);
          count++;
        }
      });
      
      return count;
    }, 'Set standby range');
  }  /**
   * Ottiene i giorni di reperibilità per i prossimi 7 giorni
   * @returns {Promise<Array>} I giorni di reperibilità per i prossimi 7 giorni
   */
  async getStandbyScheduleForNext7Days() {
    return await this.safeExecute(async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const todayStr = today.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      const result = await this.db.getAllAsync(`
        SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}
        WHERE date >= ? AND date <= ? AND is_standby = 1
        ORDER BY date ASC
      `, [todayStr, nextWeekStr]);
      
      // Trasforma i dati nel formato atteso dal service di notifica
      return (result || []).map(record => {
        const date = new Date(record.date);
        
        // Crea oggetto con startDate alle 20:00 e endDate alle 8:00 del giorno dopo
        const startDate = new Date(date);
        startDate.setHours(20, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(8, 0, 0, 0);
        
        return {
          id: `standby-${record.date}`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          date: record.date,
          isStandby: record.is_standby === 1
        };
      });
    }, 'Get standby schedule for next 7 days');
  }
  
  /**
   * Genera dati di esempio per la reperibilità
   * Utile per testare il sistema di notifiche
   * @param {boolean} clearExisting - Se cancellare i dati esistenti
   * @returns {Promise<Array>} I giorni di reperibilità creati
   */
  async generateSampleStandbyData(clearExisting = false) {
    return await this.safeExecute(async () => {
      // Opzionalmente cancella i dati esistenti
      if (clearExisting) {
        await this.db.runAsync(`DELETE FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      }
      
      const today = new Date();
      const createdDays = [];
      
      // Usa una transazione per eseguire tutto in batch
      await this.db.withTransactionAsync(async () => {
        // Crea reperibilità per oggi e tra 2 giorni
        const dates = [
          today,
          new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
        ];
        
        for (const date of dates) {
          const dateStr = date.toISOString().split('T')[0];
          await this.db.runAsync(`
            INSERT OR REPLACE INTO ${DATABASE_TABLES.STANDBY_CALENDAR} (date, is_standby)
            VALUES (?, ?)
          `, [dateStr, 1]);
          
          createdDays.push(dateStr);
        }
      });
      
      console.log(`✅ Creati ${createdDays.length} giorni di reperibilità di esempio: ${createdDays.join(', ')}`);
      return createdDays;
    }, 'Generate sample standby data');
  }
  
  /**
   * Ottiene le impostazioni di reperibilità
   * @returns {Promise<Object>} Le impostazioni di reperibilità
   */
  async getStandbySettings() {
    return await this.safeExecute(async () => {
      // Prima cerca impostazioni specifiche per la reperibilità
      let settings = await this.getSetting('standbySettings', null);
      
      // Se non esistono impostazioni specifiche, recupera dalle impostazioni generali
      if (!settings) {
        const appSettings = await this.getSetting('appSettings', {});
        settings = {
          compensoReperibilita: appSettings.standbyAllowance || 0,
          orarioInizio: '20:00',
          orarioFine: '08:00',
          notificaAnticipo: 60, // minuti prima
          notificationsEnabled: true // Per compatibilità con scheduleStandbyReminders
        };
      } else if (settings.notificationsEnabled === undefined) {
        // Assicurati che l'impostazione notificationsEnabled sia presente
        settings.notificationsEnabled = true;
      }
      
      return settings;
    }, 'Get standby settings');
  }

  // Settings methods
  async setSetting(key, value) {
    return await executeDbOperation(async () => {
      return await this.safeExecute(async () => {
        // Usa una transazione per evitare lock
        await this.db.withTransactionAsync(async () => {
          await this.db.runAsync(`
            INSERT OR REPLACE INTO ${DATABASE_TABLES.SETTINGS} (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
          `, [key, JSON.stringify(value)]);
        });
      }, 'Set setting');
    });
  }

  async getSetting(key, defaultValue = null) {
    return await executeDbOperation(async () => {
      return await this.safeExecute(async () => {
        const result = await this.db.getFirstAsync(`
          SELECT value FROM ${DATABASE_TABLES.SETTINGS} WHERE key = ?
        `, [key]);
        const settingValue = result ? JSON.parse(result.value) : defaultValue;
        
        // Log per debugging contratto dopo ripristino
        if (key === 'appSettings' && settingValue?.contract) {
          console.log(`🔍 getSetting appSettings: Contract found`, {
            name: settingValue.contract.name,
            dailyRate: settingValue.contract.dailyRate,
            hourlyRate: settingValue.contract.hourlyRate,
            timestamp: new Date().toISOString()
          });
        }
        
        return settingValue;
      }, 'Get setting');
    });
  }  // Backup methods
  async getAllData() {
    return await this.safeExecute(async () => {
      // Usa getAllWorkEntries che normalizza i dati invece di query raw
      const rawWorkEntries = await this.getAllWorkEntries();
      
      // 🚀 CRITICAL FIX: Parse entries usando createWorkEntryFromData come fa PDFExportScreen
      // Importa la funzione per trasformare dati grezzi in workEntry completi
      const { createWorkEntryFromData } = require('../utils/earningsHelper');
      
      // Trasforma ogni entry grezza in workEntry completo
      const processedWorkEntries = rawWorkEntries.map(entry => {
        const processed = createWorkEntryFromData(entry);
        
        // 🔥 DEBUG MULTI-TURNO: Log specifico per viaggi durante export
        if (processed.viaggi && processed.viaggi.length > 0) {
          console.log(`📤 EXPORT: Entry ${processed.date} con multi-turno:`, {
            viaggiCount: processed.viaggi.length,
            workStart1: processed.workStart1,
            workEnd1: processed.workEnd1,
            workStart2: processed.workStart2,
            workEnd2: processed.workEnd2,
            viaggi: processed.viaggi
          });
        }
        
        return processed;
      });
      
      const standbyDays = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      const settings = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.SETTINGS}`);
      
      // Conta le entry con interventi per il debug
      const entriesWithInterventi = processedWorkEntries.filter(entry => 
        entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
      );
      
      // 🔍 DEBUG: Log dei dati estratti
      console.log('🔍 getAllData() - Work entries processati:', {
        rawCount: rawWorkEntries?.length || 0,
        processedCount: processedWorkEntries?.length || 0,
        entriesWithInterventi: entriesWithInterventi.length,
        totalInterventi: entriesWithInterventi.reduce((sum, entry) => sum + entry.interventi.length, 0),
        sample: processedWorkEntries?.[0] ? {
          id: processedWorkEntries[0].id,
          date: processedWorkEntries[0].date,
          siteName: processedWorkEntries[0].siteName,
          hasInterventi: !!processedWorkEntries[0].interventi,
          interventiLength: Array.isArray(processedWorkEntries[0].interventi) ? processedWorkEntries[0].interventi.length : 'not array',
          hasWorkTimes: !!(processedWorkEntries[0].workStart1 && processedWorkEntries[0].workEnd1)
        } : 'no entries',
        interventiDetails: entriesWithInterventi.length > 0 ? {
          datesWithInterventi: entriesWithInterventi.map(e => `${e.date}(${e.interventi.length})`).join(', ')
        } : 'none'
      });
      
      // 🚨 BACKUP INTERVENTI: Log dettagliato per debug backup
      if (entriesWithInterventi.length > 0) {
        console.log(`🚨 BACKUP INTERVENTI: Trovate ${entriesWithInterventi.length} entry con interventi da includere nel backup`);
        entriesWithInterventi.forEach((entry, index) => {
          console.log(`🚨 BACKUP INTERVENTI: ${index + 1}. Data: ${entry.date}, Interventi: ${entry.interventi.length}`);
          entry.interventi.forEach((intervento, i) => {
            console.log(`🚨 BACKUP INTERVENTI:    - Intervento ${i + 1}: ${intervento.start_time} - ${intervento.end_time}`);
          });
        });
      } else {
        console.log('🚨 BACKUP INTERVENTI: Nessun intervento trovato da includere nel backup');
      }
      
      return {
        workEntries: processedWorkEntries || [],
        standbyDays: standbyDays || [],
        settings: settings || [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    }, 'Get all data for backup');
  }

  async restoreData(data) {
    return await this.safeExecute(async () => {
      console.log('🔄 RESTORE: Inizio ripristino dati...');
      console.log('🔄 RESTORE: Work entries da ripristinare:', data.workEntries?.length || 0);

      // Importa la funzione di normalizzazione robusta
      const { createWorkEntryFromData } = require('../utils/earningsHelper');

      // Clear existing data
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES}`);
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      await this.db.execAsync(`DELETE FROM ${DATABASE_TABLES.SETTINGS}`);

      // Restore work entries
      console.log(`🔄 RESTORE: Inizio ripristino ${data.workEntries?.length || 0} work entries...`);
      
      // Conta gli interventi nel backup prima del ripristino
      const entriesWithInterventiInBackup = (data.workEntries || []).filter(entry => 
        entry.interventi && (
          (Array.isArray(entry.interventi) && entry.interventi.length > 0) ||
          (typeof entry.interventi === 'string' && entry.interventi !== '[]')
        )
      );
      
      console.log(`� RESTORE INTERVENTI: Nel backup ci sono ${entriesWithInterventiInBackup.length} entry con interventi`);
      if (entriesWithInterventiInBackup.length > 0) {
        console.log(`� RESTORE INTERVENTI: Date con interventi: ${entriesWithInterventiInBackup.map(e => e.date).join(', ')}`);
        
        // Log dettagliato del primo intervento per debug
        const firstEntryWithInterventi = entriesWithInterventiInBackup[0];
        console.log(`🚨 RESTORE INTERVENTI: Esempio entry con interventi:`, {
          date: firstEntryWithInterventi.date,
          interventiType: typeof firstEntryWithInterventi.interventi,
          interventiValue: firstEntryWithInterventi.interventi,
          interventiCount: Array.isArray(firstEntryWithInterventi.interventi) ? firstEntryWithInterventi.interventi.length : 'not array'
        });
      }
      
      for (const entry of data.workEntries || []) {
        // Normalizza l'entry per gestire snake_case/camelCase e parsing array/string
        const normalized = createWorkEntryFromData(entry);
        
        // Log dettagliato solo per entry con interventi
        if (normalized.interventi && normalized.interventi.length > 0) {
          console.log(`� RESTORE INTERVENTI: Entry ${normalized.date} con ${normalized.interventi.length} interventi:`, 
            normalized.interventi.map(i => `${i.start_time}-${i.end_time}`).join(', ')
          );
        }
        
        await this.insertWorkEntry(normalized);
      }

      // Restore standby days
      for (const day of data.standbyDays || []) {
        await this.setStandbyDay(day.date, day.is_standby);
      }

      // Restore settings
      console.log(`🔄 RESTORE: Inizio ripristino ${data.settings?.length || 0} settings...`);
      for (const setting of data.settings || []) {
        try {
          const parsedValue = JSON.parse(setting.value);
          console.log(`🔄 RESTORE: Setting "${setting.key}" - Size: ${JSON.stringify(parsedValue).length} chars`);
          
          // Log speciale per appSettings
          if (setting.key === 'appSettings') {
            console.log(`🔄 RESTORE: appSettings contract info:`, {
              hasContract: !!parsedValue.contract,
              contractName: parsedValue.contract?.name,
              dailyRate: parsedValue.contract?.dailyRate,
              hourlyRate: parsedValue.contract?.hourlyRate,
              monthlySalary: parsedValue.contract?.monthlySalary
            });
          }
          
          await this.setSetting(setting.key, parsedValue);
          console.log(`✅ RESTORE: Setting "${setting.key}" ripristinato`);
        } catch (error) {
          console.error(`❌ RESTORE: Error ripristinando setting "${setting.key}":`, error);
        }
      }

      console.log('🔄 RESTORE: Ripristino completato con successo');
      
      // 🚨 VERIFICA INTERVENTI: Controllo post-ripristino che gli interventi siano stati salvati
      console.log('🚨 VERIFICA INTERVENTI: Controllo post-ripristino...');
      const restoredEntries = await this.getAllWorkEntries();
      const restoredEntriesWithInterventi = restoredEntries.filter(entry => {
        const normalized = createWorkEntryFromData(entry);
        return normalized.interventi && Array.isArray(normalized.interventi) && normalized.interventi.length > 0;
      });
      
      console.log(`🚨 VERIFICA INTERVENTI: Dopo ripristino, trovate ${restoredEntriesWithInterventi.length} entry con interventi nel database`);
      
      if (restoredEntriesWithInterventi.length > 0) {
        restoredEntriesWithInterventi.forEach((entry, index) => {
          const normalized = createWorkEntryFromData(entry);
          console.log(`🚨 VERIFICA INTERVENTI: ${index + 1}. Data: ${normalized.date}, Interventi: ${normalized.interventi.length}`);
        });
      } else if (entriesWithInterventiInBackup.length > 0) {
        console.log('❌ VERIFICA INTERVENTI: PROBLEMA! Interventi erano nel backup ma non sono stati ripristinati!');
      }
      
      // Verifica che le impostazioni siano state ripristinate correttamente
      console.log('🔍 RESTORE: Verifica post-ripristino...');
      const verifyAppSettings = await this.getSetting('appSettings');
      console.log('🔍 RESTORE: AppSettings dopo ripristino:', {
        exists: !!verifyAppSettings,
        hasContract: !!verifyAppSettings?.contract,
        contractName: verifyAppSettings?.contract?.name,
        dailyRate: verifyAppSettings?.contract?.dailyRate,
        hourlyRate: verifyAppSettings?.contract?.hourlyRate
      });
    }, 'Restore data');
  }

  async recordBackup(backupInfo) {
    return await this.safeExecute(async () => {
      const { backup_name, backup_type, file_path, status, notes } = backupInfo;
      await this.db.runAsync(`
        INSERT INTO ${DATABASE_TABLES.BACKUPS} (backup_name, backup_type, file_path, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [
        backup_name,
        backup_type,
        file_path || null,
        status || 'completed',
        notes || null
      ]);
    }, 'Record backup');
  }

  // Ottieni tutti i backup registrati nel database
  async getAllBackupsFromDb() {
    await this.ensureInitialized();
    const rows = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.BACKUPS} ORDER BY backup_date DESC`);
    return rows.map(row => ({
      id: row.id,
      fileName: row.backup_name,
      filePath: row.file_path,
      backupType: row.backup_type,
      status: row.status,
      notes: row.notes,
      created: row.backup_date,
    }));
  }

  // 🗑️ Rimuovi tutti i record backup dal database
  async clearAllBackupRecords() {
    return this.executeInTransaction(async () => {
      await this.ensureInitialized();
      
      // Prima conta quanti record ci sono
      const countResult = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${DATABASE_TABLES.BACKUPS}`);
      const totalCount = countResult.count;
      
      // Cancella tutti i record
      const result = await this.db.runAsync(`DELETE FROM ${DATABASE_TABLES.BACKUPS}`);
      
      console.log(`🗄️ Rimossi ${totalCount} record backup dal database`);
      return totalCount;
    }, 'Clear all backup records');
  }

  // Health monitoring methods
  async isDatabaseHealthy() {
    try {
      // Check if database connection exists
      if (!this.db || !this.isInitialized) {
        return false;
      }
      
      // Perform a simple test query
      await this.db.getFirstAsync('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close() {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.isInitialized = false;
        console.log('Database connection closed');
      }
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }

  async getConnectionStatus() {
    return {
      isConnected: this.db !== null,
      isInitialized: this.isInitialized,
      hasError: false
    };
  }

  // Helper function to normalize entry fields from DB to camelCase
  normalizeEntry(entry) {
    if (entry.targa_veicolo !== undefined) entry.targaVeicolo = entry.targa_veicolo;
    // Parse interventi JSON if exists
    try {
      entry.interventi = entry.interventi ? JSON.parse(entry.interventi) : [];
    } catch (e) {
      console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}:`, entry.interventi);
      entry.interventi = [];
    }
    
    // 🚀 MULTI-TURNO: Parse viaggi JSON if exists  
    try {
      const viaggiField = entry.viaggi;
      console.log("🔥 NORMALIZZAZIONE DB: Analizzando campo viaggi dal database:", {
        entryId: entry.id,
        viaggiRaw: viaggiField,
        viaggiType: typeof viaggiField,
        viaggiLength: viaggiField?.length,
        isString: typeof viaggiField === 'string',
        isArray: Array.isArray(viaggiField)
      });
      
      entry.viaggi = entry.viaggi ? JSON.parse(entry.viaggi) : [];
      console.log("🔥 NORMALIZZAZIONE DB: Risultato parsing viaggi:", {
        entryId: entry.id,
        parsedViaggi: entry.viaggi,
        parsedCount: entry.viaggi.length,
        isArrayAfterParsing: Array.isArray(entry.viaggi)
      });
    } catch (e) {
      console.warn(`🔥 NORMALIZZAZIONE DB: Impossibile parsare JSON per viaggi per l'entry id ${entry.id}:`, {
        viaggiRaw: entry.viaggi,
        error: e.message
      });
      entry.viaggi = [];
    }
    
    // Normalize snake_case to camelCase for React
    if (entry.site_name) entry.siteName = entry.site_name;
    if (entry.vehicle_driven) entry.vehicleDriven = entry.vehicle_driven;
    if (entry.departure_company) entry.departureCompany = entry.departure_company;
    if (entry.arrival_site) entry.arrivalSite = entry.arrival_site;
    if (entry.work_start_1) entry.workStart1 = entry.work_start_1;
    if (entry.work_end_1) entry.workEnd1 = entry.work_end_1;
    if (entry.work_start_2) entry.workStart2 = entry.work_start_2;
    if (entry.work_end_2) entry.workEnd2 = entry.work_end_2;
    if (entry.departure_return) entry.departureReturn = entry.departure_return;
    if (entry.arrival_company) entry.arrivalCompany = entry.arrival_company;
    if (entry.meal_lunch_voucher) entry.mealLunchVoucher = entry.meal_lunch_voucher;
    if (entry.meal_lunch_cash) entry.mealLunchCash = entry.meal_lunch_cash;
    if (entry.meal_dinner_voucher) entry.mealDinnerVoucher = entry.meal_dinner_voucher;
    if (entry.meal_dinner_cash) entry.mealDinnerCash = entry.meal_dinner_cash;
    if (entry.travel_allowance) entry.travelAllowance = entry.travel_allowance;
    if (entry.travel_allowance_percent) entry.travelAllowancePercent = entry.travel_allowance_percent;
    if (entry.standby_allowance) entry.standbyAllowance = entry.standby_allowance;
    if (entry.is_standby_day) entry.isStandbyDay = entry.is_standby_day;
    if (entry.total_earnings) entry.totalEarnings = entry.total_earnings;
    if (entry.day_type) entry.dayType = entry.day_type;
    
    // Handle trasferta_manual_override field - normalize to boolean
    if (entry.trasferta_manual_override !== undefined) {
      entry.trasfertaManualOverride = entry.trasferta_manual_override === 1 || 
                                     entry.trasferta_manual_override === true;
    }
    
    return entry;
  }
  
  // Helper per normalizzare i campi di una entry dal formato DB al formato app
  normalizeWorkEntry(entry) {
      entry.targaVeicolo = entry.targa_veicolo;
    if (!entry) return null;
    
    try {
      // Converte interventi in array se presente
      if (entry.interventi) {
        try {
          entry.interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
        } catch (e) {
          console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}:`, entry.interventi);
          entry.interventi = [];
        }
      } else {
        entry.interventi = [];
      }
      
      // Normalizzazione per i nomi di campo in camelCase
      entry.travelAllowance = entry.travel_allowance;
      entry.travelAllowancePercent = entry.travel_allowance_percent !== undefined ? entry.travel_allowance_percent : 1.0;
      entry.trasfertaManualOverride = entry.trasferta_manual_override === 1;
      entry.mealLunchVoucher = entry.meal_lunch_voucher;
      entry.mealLunchCash = entry.meal_lunch_cash;
      entry.mealDinnerVoucher = entry.meal_dinner_voucher;
      entry.mealDinnerCash = entry.meal_dinner_cash;
      entry.isStandbyDay = entry.is_standby_day;
      entry.standbyAllowance = entry.standby_allowance;
      entry.siteName = entry.site_name;
      entry.vehicleDriven = entry.vehicle_driven;
      entry.departureCompany = entry.departure_company;
      entry.arrivalSite = entry.arrival_site;
      entry.workStart1 = entry.work_start_1;
      entry.workEnd1 = entry.work_end_1;
      entry.workStart2 = entry.work_start_2;
      entry.workEnd2 = entry.work_end_2;
      entry.departureReturn = entry.departure_return;
      entry.arrivalCompany = entry.arrival_company;
      entry.dayType = entry.day_type;
      
      return entry;
    } catch (error) {
      console.error('Errore durante la normalizzazione della entry:', error);
      return entry; // Ritorna l'entry originale in caso di errore
    }
  }

  // Get work entries with normalized fields
  async getWorkEntriesWithNormalized(year, month) {
    const entries = await this.getWorkEntries(year, month);
    return entries.map(entry => this.normalizeEntry(entry));
  }
  
  // Get all work entries with normalized fields
  async getAllWorkEntriesWithNormalized() {
    const entries = await this.getAllWorkEntries();
    return entries.map(entry => this.normalizeEntry(entry));
  }

  // Sincronizza le impostazioni di reperibilità da AsyncStorage al database SQLite
  async syncStandbySettingsToDatabase() {
    try {
      await this.ensureInitialized();
      
      // Importa AsyncStorage qui per evitare problemi di dipendenze circolari
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      console.log('📞 SYNC: Inizio sincronizzazione settings reperibilità...');
      
      // Leggi le settings da AsyncStorage
      const settingsStr = await AsyncStorage.getItem('settings');
      if (!settingsStr) {
        console.log('📞 SYNC: Nessuna settings trovata in AsyncStorage');
        return;
      }
      
      const settings = JSON.parse(settingsStr);
      const standbyDays = settings?.standbySettings?.standbyDays || {};
      const activeDates = Object.keys(standbyDays).filter(dateStr => {
        const dayData = standbyDays[dateStr];
        return dayData?.selected === true;
      });
      
      console.log(`📞 SYNC: Trovate ${activeDates.length} date attive nelle settings`);
      
      if (activeDates.length === 0) {
        console.log('📞 SYNC: Nessuna data attiva da sincronizzare');
        return;
      }
      
      // Per ogni data attiva, assicurati che sia presente nel database
      let syncCount = 0;
      for (const dateStr of activeDates) {
        try {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          
          // Controlla se la data esiste già nel database
          const existing = await executeDbOperation(async () => {
            return await this.db.getFirstAsync(
              `SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR} WHERE year = ? AND month = ? AND day = ?`,
              [year, month, day]
            );
          });
          
          if (!existing) {
            // Inserisci la data nel database
            await executeDbOperation(async () => {
              await this.db.runAsync(
                `INSERT INTO ${DATABASE_TABLES.STANDBY_CALENDAR} (year, month, day, date, is_standby) VALUES (?, ?, ?, ?, ?)`,
                [year, month, day, dateStr, 1]
              );
            });
            
            syncCount++;
            console.log(`📞 SYNC: Aggiunta data ${dateStr} al database`);
          }
        } catch (dateError) {
          console.warn(`📞 SYNC: Errore sincronizzazione data ${dateStr}:`, dateError);
        }
      }
      
      console.log(`📞 SYNC: Sincronizzazione completata. ${syncCount} nuove date aggiunte al database`);
      console.log(`📞 SYNC: ${syncCount} date sincronizzate dal settings al database`);
      
      return syncCount;
      
    } catch (error) {
      console.error('❌ Errore sincronizzazione settings reperibilità:', error);
      return 0;
    }
  }

  // Funzione helper per forzare la sincronizzazione e aggiornare le notifiche
  async forceSyncStandbyAndUpdateNotifications() {
    try {
      console.log('🔄 FORCE SYNC: Avvio sincronizzazione forzata...');
      
      // Sincronizza le settings al database
      const syncCount = await this.syncStandbySettingsToDatabase();
      
      // Se sono state sincronizzate nuove date, aggiorna le notifiche
      if (syncCount > 0) {
        console.log('📞 FORCE SYNC: Aggiornamento notifiche dopo sincronizzazione...');
        
        // Importa NotificationService dinamicamente per evitare dipendenze circolari
        const { default: NotificationService } = await import('./FixedNotificationService');
        await NotificationService.updateStandbyNotifications();
        
        console.log('✅ FORCE SYNC: Sincronizzazione e aggiornamento notifiche completati');
      } else {
        console.log('📞 FORCE SYNC: Nessuna nuova data da sincronizzare');
      }
      
      return syncCount;
      
    } catch (error) {
      console.error('❌ Errore sincronizzazione forzata:', error);
      return 0;
    }
  }

  // 🔍 DEBUG: Funzione per verificare il contenuto del database
  async debugDatabaseContent() {
    return await this.safeExecute(async () => {
      const workEntries = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.WORK_ENTRIES}`);
      const standbyDays = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
      const settings = await this.db.getAllAsync(`SELECT * FROM ${DATABASE_TABLES.SETTINGS}`);
      
      console.log('🔍 DEBUG DATABASE CONTENT:');
      console.log(`Work Entries: ${workEntries.length} records`);
      console.log(`Standby Days: ${standbyDays.length} records`);
      console.log(`Settings: ${settings.length} records`);
      
      if (workEntries.length > 0) {
        console.log('Sample work entries:', workEntries.slice(0, 3));
      }
      
      return {
        workEntries,
        standbyDays,
        settings,
        counts: {
          workEntries: workEntries.length,
          standbyDays: standbyDays.length,
          settings: settings.length
        }
      };
    }, 'Debug database content');
  }

  // 🔄 RIPRISTINO DA BACKUP: Importa dati da backup JavaScript
  async restoreFromBackup(backupData) {
    console.log('🔄 DatabaseService.restoreFromBackup: Avvio ripristino...');
    
    try {
      // Validazione dati backup
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Dati backup non validi');
      }

      // ✅ SUPPORTO MULTI-FORMATO: Gestisce backup automatici e manuali
      let workEntries = [];
      let standbyDays = [];
      let settings = [];

      // Controlla se è un backup automatico (formato nuovo)
      if (backupData.interventi && backupData.metadata) {
        console.log('📦 Rilevato backup automatico con formato nuovo');
        workEntries = backupData.interventi || [];
        standbyDays = backupData.standbyDays || [];
        settings = backupData.settings || [];
      }
      // Controlla se è un backup manuale (formato legacy)
      else if (backupData.workEntries || backupData.data) {
        console.log('📦 Rilevato backup manuale con formato legacy');
        const data = backupData.data || backupData;
        workEntries = data.workEntries || [];
        standbyDays = data.standbyDays || [];
        settings = data.settings || [];
      }
      // Controlla se è un array diretto di interventi
      else if (Array.isArray(backupData)) {
        console.log('📦 Rilevato backup come array diretto di interventi');
        workEntries = backupData;
      }
      // Controlla se ha direttamente le proprietà
      else {
        console.log('📦 Tentativo estrazione diretta delle proprietà');
        workEntries = backupData.workEntries || backupData.interventi || [];
        standbyDays = backupData.standbyDays || [];
        settings = backupData.settings || [];
      }
      
      console.log(`📊 Ripristino: ${workEntries.length} work entries, ${standbyDays.length} standby days, ${settings.length} settings`);

      await this.safeExecute(async () => {
        // Inizia una transazione per garantire atomicità
        await this.db.withTransactionAsync(async () => {
          
          // 1. ✅ PULIZIA COMPLETA: Cancella tutti i dati esistenti prima del ripristino
          console.log('🗑️ Cancellazione dati esistenti per ripristino completo...');
          
          await this.db.runAsync(`DELETE FROM ${DATABASE_TABLES.WORK_ENTRIES}`);
          console.log('✅ Tabella work_entries svuotata');
          
          await this.db.runAsync(`DELETE FROM ${DATABASE_TABLES.STANDBY_CALENDAR}`);
          console.log('✅ Tabella standby_calendar svuotata');
          
          await this.db.runAsync(`DELETE FROM ${DATABASE_TABLES.SETTINGS}`);
          console.log('✅ Tabella settings svuotata');
          
          // 2. Ripristina work_entries
          if (workEntries.length > 0) {
            console.log(`📝 Ripristino ${workEntries.length} work entries...`);
            
            for (const entry of workEntries) {
              // Prepara i dati per l'inserimento
              // ✅ CORREZIONE RIPRISTINO BACKUP: Preserva total_earnings per backup vecchi
              const hasNewColumns = entry.hasOwnProperty('is_fixed_day') || entry.hasOwnProperty('fixed_earnings');
              
              // ✅ SUPPORTO DOPPIO FORMATO: Gestisce sia camelCase che snake_case
              const insertData = {
                date: entry.date,
                site_name: entry.site_name || entry.siteName || '',
                vehicle_driven: entry.vehicle_driven || entry.vehicleDriven || 'non_guidato',
                departure_company: entry.departure_company || entry.departureCompany || '',
                arrival_site: entry.arrival_site || entry.arrivalSite || '',
                work_start_1: entry.work_start_1 || entry.workStart1 || '',
                work_end_1: entry.work_end_1 || entry.workEnd1 || '',
                work_start_2: entry.work_start_2 || entry.workStart2 || '',
                work_end_2: entry.work_end_2 || entry.workEnd2 || '',
                departure_return: entry.departure_return || entry.departureReturn || '',
                arrival_company: entry.arrival_company || entry.arrivalCompany || '',
                meal_lunch_voucher: entry.meal_lunch_voucher || entry.mealLunchVoucher || 0,
                meal_lunch_cash: entry.meal_lunch_cash || entry.mealLunchCash || 0,
                meal_dinner_voucher: entry.meal_dinner_voucher || entry.mealDinnerVoucher || 0,
                meal_dinner_cash: entry.meal_dinner_cash || entry.mealDinnerCash || 0,
                travel_allowance: entry.travel_allowance || entry.travelAllowance || 0,
                standby_allowance: entry.standby_allowance || entry.standbyAllowance || 0,
                is_standby_day: entry.is_standby_day || (entry.isStandbyDay ? 1 : 0) || 0,
                total_earnings: entry.total_earnings || entry.totalEarnings || 0,
                notes: entry.notes || '',
                day_type: entry.day_type || entry.dayType || 'lavorativa',
                interventi: (() => {
                  if (entry.interventi) {
                    if (Array.isArray(entry.interventi)) {
                      return JSON.stringify(entry.interventi);
                    } else if (typeof entry.interventi === 'string') {
                      return entry.interventi; // Assume it's already a valid JSON string
                    }
                  }
                  return '[]';
                })(),
                travel_allowance_percent: entry.travel_allowance_percent || entry.travelAllowancePercent || 1,
                trasferta_manual_override: entry.trasferta_manual_override || (entry.trasfertaManualOverride ? 1 : 0) || 0,
                targa_veicolo: entry.targa_veicolo || entry.targaVeicolo || '',
                vehiclePlate: entry.vehiclePlate || entry.vehiclePlate || '',
                completamento_giornata: entry.completamento_giornata || entry.completamentoGiornata || 'nessuno',
                // ✅ SMART RESTORE: Se il backup è vecchio e ha total_earnings > 0, non è un giorno fisso
                is_fixed_day: hasNewColumns ? (entry.is_fixed_day || (entry.isFixedDay ? 1 : 0) || 0) : 0,
                fixed_earnings: hasNewColumns ? (entry.fixed_earnings || entry.fixedEarnings || 0) : 0,
                // 🔥 MULTI-TURNO FIX: Gestione corretta viaggi nel ripristino
                viaggi: (() => {
                  if (entry.viaggi) {
                    if (Array.isArray(entry.viaggi)) {
                      console.log(`🔄 RIPRISTINO: Entry ${entry.date} - viaggi già array:`, entry.viaggi.length, 'elementi');
                      return JSON.stringify(entry.viaggi);
                    } else if (typeof entry.viaggi === 'string') {
                      console.log(`🔄 RIPRISTINO: Entry ${entry.date} - viaggi stringa JSON:`, entry.viaggi.substring(0, 100));
                      return entry.viaggi;
                    }
                  }
                  console.log(`🔄 RIPRISTINO: Entry ${entry.date} - viaggi vuoti o non validi`);
                  return '[]';
                })()
              };
              
              console.log(`🔄 Ripristino entry ${entry.date}: total_earnings=${insertData.total_earnings}, is_fixed_day=${insertData.is_fixed_day}, hasNewColumns=${hasNewColumns}`);
              
              // 🔥 DEBUG MULTI-TURNO: Log dettagliato per ripristino viaggi
              if (insertData.viaggi && insertData.viaggi !== '[]') {
                try {
                  const viaggiParsed = JSON.parse(insertData.viaggi);
                  console.log(`🔄 RIPRISTINO: Entry ${entry.date} - DEBUG viaggi:`, {
                    originalViaggi: entry.viaggi,
                    processedViaggi: insertData.viaggi,
                    viaggiParsed: viaggiParsed,
                    viaggiCount: viaggiParsed.length,
                    work_start_1: insertData.work_start_1,
                    work_end_1: insertData.work_end_1,
                    work_start_2: insertData.work_start_2,
                    work_end_2: insertData.work_end_2
                  });
                } catch (e) {
                  console.warn(`🔄 RIPRISTINO: Errore parsing viaggi per ${entry.date}:`, e);
                }
              }

              // ✅ RIPRISTINO ROBUSTO: Verifica colonne disponibili dinamicamente
              const columnExists = async (tableName, columnName) => {
                const columns = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
                return columns.some(col => col.name === columnName);
              };

              // Costruisci query dinamicamente basandoti sulle colonne disponibili
              const baseColumns = [
                'date', 'site_name', 'vehicle_driven', 'departure_company', 'arrival_site',
                'work_start_1', 'work_end_1', 'work_start_2', 'work_end_2',
                'departure_return', 'arrival_company', 'meal_lunch_voucher', 'meal_lunch_cash',
                'meal_dinner_voucher', 'meal_dinner_cash', 'travel_allowance', 'standby_allowance',
                'is_standby_day', 'total_earnings', 'notes'
              ];
              
              const baseValues = [
                insertData.date, insertData.site_name, insertData.vehicle_driven,
                insertData.departure_company, insertData.arrival_site,
                insertData.work_start_1, insertData.work_end_1,
                insertData.work_start_2, insertData.work_end_2,
                insertData.departure_return, insertData.arrival_company,
                insertData.meal_lunch_voucher, insertData.meal_lunch_cash,
                insertData.meal_dinner_voucher, insertData.meal_dinner_cash,
                insertData.travel_allowance, insertData.standby_allowance,
                insertData.is_standby_day, insertData.total_earnings,
                insertData.notes
              ];

              // Aggiungi colonne opzionali se esistono
              const optionalColumns = [
                { name: 'day_type', value: insertData.day_type },
                { name: 'interventi', value: insertData.interventi },
                { name: 'travel_allowance_percent', value: insertData.travel_allowance_percent },
                { name: 'trasferta_manual_override', value: insertData.trasferta_manual_override },
                { name: 'targa_veicolo', value: insertData.targa_veicolo },
                { name: 'vehiclePlate', value: insertData.vehiclePlate },
                { name: 'completamento_giornata', value: insertData.completamento_giornata },
                { name: 'is_fixed_day', value: insertData.is_fixed_day },
                { name: 'fixed_earnings', value: insertData.fixed_earnings },
                { name: 'viaggi', value: insertData.viaggi }
              ];

              const finalColumns = [...baseColumns];
              const finalValues = [...baseValues];

              for (const col of optionalColumns) {
                if (await columnExists(DATABASE_TABLES.WORK_ENTRIES, col.name)) {
                  finalColumns.push(col.name);
                  finalValues.push(col.value);
                }
              }

              const placeholders = finalColumns.map(() => '?').join(', ');

              // ✅ INSERIMENTO PULITO: Usa INSERT semplice dopo pulizia tabelle
              await this.db.runAsync(`
                INSERT INTO ${DATABASE_TABLES.WORK_ENTRIES} (
                  ${finalColumns.join(', ')}
                ) VALUES (${placeholders})
              `, finalValues);
            }
          }

          // 3. Ripristina standby_calendar
          if (standbyDays.length > 0) {
            console.log(`📅 Ripristino ${standbyDays.length} standby days...`);
            
            for (const standby of standbyDays) {
              // ✅ FIX: Utilizza il metodo `setStandbyDay` esistente per garantire un ripristino corretto
              // e disaccoppiare la logica di ripristino dalla struttura esatta della tabella.
              await this.setStandbyDay(standby.date, standby.is_standby);
            }
          }

          // 4. Ripristina settings
          if (settings.length > 0) {
            console.log(`⚙️ Ripristino ${settings.length} impostazioni...`);
            
            for (const setting of settings) {
              await this.db.runAsync(`
                INSERT INTO ${DATABASE_TABLES.SETTINGS} (
                  key, value, created_at, updated_at
                ) VALUES (?, ?, ?, ?)
              `, [
                setting.key,
                setting.value,
                setting.created_at || new Date().toISOString(),
                new Date().toISOString()
              ]);
            }
          }

          console.log('✅ Transazione ripristino completata');
        });

        console.log('✅ DatabaseService.restoreFromBackup: Ripristino completato con successo');
        
        // � NOTIFICA GLOBALE: Notifica a tutta l'app che i dati sono cambiati
        console.log('🚀 RESTORE: Invio notifica di aggiornamento globale...');
        DataUpdateService.notifyWorkEntriesUpdated('restore', { year: null, month: null });

        // �🚨 FORCE RELOAD: Notifica il sistema di ricaricare le impostazioni
        console.log('🔄 RESTORE: Forzando ricaricamento impostazioni...');
        try {
          // Verifica che le impostazioni siano state ripristinate
          const verifyAppSettings = await this.getSetting('appSettings');
          console.log('🔍 RESTORE: Verifica post-ripristino:', {
            exists: !!verifyAppSettings,
            hasContract: !!verifyAppSettings?.contract,
            contractName: verifyAppSettings?.contract?.name,
            dailyRate: verifyAppSettings?.contract?.dailyRate,
            hourlyRate: verifyAppSettings?.contract?.hourlyRate
          });
          
          // Se non esistono le appSettings, potrebbe essere un backup vecchio
          if (!verifyAppSettings) {
            console.log('⚠️ RESTORE: AppSettings non trovate, backup potrebbe essere vecchio');
          }
        } catch (error) {
          console.error('❌ RESTORE: Errore verifica post-ripristino:', error);
        }
        
        return true;

      }, 'Restore from backup');

    } catch (error) {
      console.error('❌ DatabaseService.restoreFromBackup: Errore durante il ripristino:', error);
      throw error;
    }
  }

  // 🧹 FUNZIONI DI OTTIMIZZAZIONE DATABASE
  
  /**
   * Ottimizza il database con VACUUM per liberare spazio
   */
  async vacuum() {
    try {
      console.log('🧹 Avvio VACUUM database...');
      await this.ensureInitialized();
      
      const startTime = Date.now();
      await this.db.runAsync('VACUUM');
      const endTime = Date.now();
      
      console.log(`✅ VACUUM completato in ${endTime - startTime}ms`);
      return true;
    } catch (error) {
      console.error('❌ Errore durante VACUUM:', error);
      throw error;
    }
  }

  /**
   * Ricostruisce gli indici del database per migliorare le performance
   */
  async reindex() {
    try {
      console.log('🔧 Avvio REINDEX database...');
      await this.ensureInitialized();
      
      const startTime = Date.now();
      await this.db.runAsync('REINDEX');
      const endTime = Date.now();
      
      console.log(`✅ REINDEX completato in ${endTime - startTime}ms`);
      return true;
    } catch (error) {
      console.error('❌ Errore durante REINDEX:', error);
      throw error;
    }
  }

  /**
   * Pulisce log e dati vecchi per liberare spazio
   */
  async cleanupOldData(daysToKeep = 30) {
    try {
      console.log(`🗑️ Pulizia dati più vecchi di ${daysToKeep} giorni...`);
      await this.ensureInitialized();
      
      // Pulisci eventuali log vecchi (se esistono)
      try {
        const logResult = await this.db.runAsync(
          'DELETE FROM logs WHERE created_at < date("now", "-" || ? || " days")',
          [daysToKeep]
        );
        console.log(`🗑️ Rimossi ${logResult.changes} log vecchi`);
      } catch (error) {
        // Tabella logs potrebbe non esistere
        console.log('ℹ️ Tabella logs non presente o già pulita');
      }
      
      // Pulisci backup vecchi dal database (se esistono)
      try {
        const backupResult = await this.db.runAsync(
          'DELETE FROM backups WHERE created_at < date("now", "-7 days")'
        );
        console.log(`🗑️ Rimossi ${backupResult.changes} backup vecchi`);
      } catch (error) {
        // Tabella backups potrebbe non esistere
        console.log('ℹ️ Tabella backups non presente o già pulita');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore durante pulizia dati vecchi:', error);
      throw error;
    }
  }

  /**
   * Ottimizzazione completa del database
   */
  async optimizeDatabase() {
    try {
      console.log('🚀 Avvio ottimizzazione completa database...');
      const startTime = Date.now();
      
      // 1. Pulisci dati vecchi
      await this.cleanupOldData();
      
      // 2. Ricostruisci indici
      await this.reindex();
      
      // 3. Compatta database
      await this.vacuum();
      
      const endTime = Date.now();
      console.log(`✅ Ottimizzazione database completata in ${endTime - startTime}ms`);
      
      return true;
    } catch (error) {
      console.error('❌ Errore durante ottimizzazione database:', error);
      throw error;
    }
  }

  /**
   * Verifica la salute del database e statistiche di utilizzo
   */
  async getDatabaseStats() {
    try {
      await this.ensureInitialized();
      
      // Ottieni statistiche principali
      const stats = {
        tables: {},
        totalSize: 0,
        freeSpace: 0
      };
      
      // Conta record per ogni tabella principale
      const mainTables = ['work_entries', 'settings', 'standby_calendar'];
      
      for (const table of mainTables) {
        try {
          const result = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
          stats.tables[table] = result?.count || 0;
        } catch (error) {
          stats.tables[table] = 'N/A';
        }
      }
      
      // Ottieni informazioni spazio database
      try {
        const pragmaInfo = await this.db.getAllAsync('PRAGMA database_list');
        console.log('📊 Info database:', pragmaInfo);
      } catch (error) {
        console.log('ℹ️ Impossibile ottenere info spazio database');
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Errore recupero statistiche database:', error);
      throw error;
    }
  }
}

// Crea e esporta una singola istanza (Singleton Pattern)
const DatabaseServiceInstance = new DatabaseService();
export default DatabaseServiceInstance;
