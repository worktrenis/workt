// 🔧 FIX TEMPORANEO PER DEBUG INTERVENTI BACKUP/RESTORE
// Da applicare manualmente nel DatabaseService.js

/*
SOSTITUIRE la sezione per il ripristino work entries (linea ~993) con:

      for (const entry of data.workEntries || []) {
        // DEBUG: Log dell'entry originale
        if (entry.date === '2025-07-24') {
          console.log('DEBUG RIPRISTINO 2025-07-24:', {
            interventiRaw: entry.interventi,
            interventiType: typeof entry.interventi,
            hasInterventi: !!entry.interventi
          });
        }
        
        // Normalizza l'entry per gestire snake_case/camelCase e parsing array/string
        const normalized = createWorkEntryFromData(entry);
        
        // PULIZIA INTERVENTI: Verifica e correggi dati corrotti
        if (normalized.interventi) {
          if (typeof normalized.interventi === 'string') {
            try {
              normalized.interventi = JSON.parse(normalized.interventi);
            } catch (error) {
              console.warn(`RESTORE: Dati interventi corrotti per ${normalized.date}, resetto a array vuoto`);
              console.warn('Dati originali:', normalized.interventi);
              normalized.interventi = [];
            }
          }
          if (!Array.isArray(normalized.interventi)) {
            console.warn(`RESTORE: Interventi non è un array per ${normalized.date}, resetto`);
            normalized.interventi = [];
          }
        } else {
          normalized.interventi = [];
        }
        
        // DEBUG: Log post-normalizzazione
        if (entry.date === '2025-07-24') {
          console.log('DEBUG DOPO NORMALIZZAZIONE 2025-07-24:', {
            interventi: normalized.interventi,
            interventiLength: normalized.interventi.length,
            interventiType: typeof normalized.interventi
          });
        }
        
        // Log dettagliato solo per entry con interventi
        if (normalized.interventi && normalized.interventi.length > 0) {
          console.log(`RESTORE INTERVENTI: Entry ${normalized.date} con ${normalized.interventi.length} interventi:`, 
            normalized.interventi.map(i => `${i.start_time}-${i.end_time}`).join(', ')
          );
        }
        
        await this.insertWorkEntry(normalized);
      }
*/
