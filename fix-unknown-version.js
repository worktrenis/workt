/**
 * Script di emergenza per rimuovere i dati vecchi con 'unknown'
 * da AsyncStorage e permettere il test immediato
 * 
 * INSERISCI QUESTO CODICE TEMPORANEAMENTE IN App.js DOPO IL useEffect
 * E RIAVVIA L'APP PER PULIRE I DATI CORROTTI
 */

// ===== CODICE DA AGGIUNGERE TEMPORANEAMENTE IN App.js =====
/*

import AsyncStorage from '@react-native-async-storage/async-storage';

// Aggiungi questo useEffect dopo quello esistente (intorno alla riga 50-60)
useEffect(() => {
  const cleanOldUpdateData = async () => {
    try {
      const pendingUpdate = await AsyncStorage.getItem('pending_update_info');
      if (pendingUpdate) {
        const data = JSON.parse(pendingUpdate);
        console.log('🔍 Controllo dati update:', data);
        
        if (data.targetVersion === 'unknown') {
          console.log('🧹 Rimuovo dati corrotti con "unknown"');
          await AsyncStorage.removeItem('pending_update_info');
          alert('✅ Dati vecchi rimossi! Riavvia l\'app per testare.');
        }
      }
    } catch (error) {
      console.error('Errore pulizia:', error);
    }
  };
  
  cleanOldUpdateData();
}, []);

*/

// ===== ALTERNATIVA: ESEGUI QUESTO NEL DEBUGGER CONSOLE =====
/*

// Copia e incolla questo nel debugger console (Chrome DevTools)
AsyncStorage.removeItem('pending_update_info')
  .then(() => console.log('✅ Dati rimossi'))
  .catch(e => console.error('❌ Errore:', e));

*/

console.log(`
╔═══════════════════════════════════════════════════════════╗
║   🔧 FIX VERSION "UNKNOWN" - ISTRUZIONI                   ║
╠═══════════════════════════════════════════════════════════╣
║                                                             ║
║  METODO 1: Pubblica OTA e attendi aggiornamento            ║
║  ─────────────────────────────────────────────────────    ║
║  La correzione è già nel codice (v1.0.40).                 ║
║  Al prossimo aggiornamento vedrai la versione corretta.    ║
║                                                             ║
║  METODO 2: Pulizia manuale immediata (per test)            ║
║  ─────────────────────────────────────────────────────    ║
║  1. Apri Chrome DevTools (Cmd+D → Debug)                   ║
║  2. Vai nella Console                                       ║
║  3. Esegui:                                                 ║
║     AsyncStorage.removeItem('pending_update_info')         ║
║  4. Riavvia l'app (Cmd+R)                                   ║
║                                                             ║
║  METODO 3: Aggiungi codice temporaneo in App.js            ║
║  ─────────────────────────────────────────────────────    ║
║  Vedi il codice commentato sopra in questo file.           ║
║                                                             ║
╚═══════════════════════════════════════════════════════════╝
`);
