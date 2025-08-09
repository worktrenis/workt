### [1.5.0] - 9 agosto 2025

- Coerenza riepilogo giornaliero vs TimeEntry
- Preferenza guadagni giorni speciali + PDF
- Allineamento netto/retribuzione su feriali
- UI Compensi Aggiuntivi + overflow

 Changelog - WorkT Tracker Ore Lavoro

## [1.4.1] - 2025-08-07

### 🔢 **CALCOLI ACCURATI - Sistema di Calcolo Preciso e Dashboard Educativo**

#### ✅ **Correzioni Critiche Calcoli**
- **RISOLTO: Esclusione giorni fissi**: I giorni marcati come ferie, malattia, permessi, riposi e festivi non vengono più conteggiati come giorni lavorati, garantendo calcoli finanziari precisi
- **RISOLTO: Errore ReferenceError dailyHours**: Eliminato errore critico che impediva il corretto funzionamento del dashboard
- **RISOLTO: Conteggio giorni lavorati**: Ora mostra "Giorni effettivamente lavorati" escludendo correttamente i giorni non produttivi
- **RISOLTO: Duplicazione ore totali**: Rimossa duplicazione dell'informazione "ore totali" dalla sezione retribuzione mensile

#### 📊 **Dashboard Educativo CCNL Completo**
- **NUOVO: Dual Display Lordo/Netto**: Visualizzazione simultanea di guadagni lordi e netti con calcoli precisi
- **NUOVO: Predizioni matematicamente accurate**: Il previsto è sempre maggiore del lavorato (26 giorni CCNL + extra accumulati vs giorni effettivi + extra)
- **NUOVO: Integrazione cash pasti**: I contributi cash pasti sono inclusi in tutti i calcoli netto per trasparenza completa
- **NUOVO: Breakdown educativo**: Spiegazione dettagliata di come vengono calcolati stipendi, maggiorazioni e indennità secondo CCNL

#### 🧮 **Sistema Calcolo Avanzato**
- **MIGLIORAMENTO: Calcoli CCNL precisi**: Base contrattuale (26 giorni) + accumulo progressivo extra reali senza proiezioni future
- **MIGLIORAMENTO: Gestione vacation days**: Logica robusta per identificare ed escludere tutti i tipi di giorni non lavorativi
- **MIGLIORAMENTO: Validazione dati**: Controlli aggiuntivi per garantire l'accuratezza di tutti i calcoli finanziari
- **MIGLIORAMENTO: Trasparenza calcoli**: Ogni importo è tracciabile e spiegato nel dettaglio

#### 🎯 **UX Migliorata**
- **Chiarezza informazioni**: Etichette precise come "Giorni effettivamente lavorati" con note esplicative
- **Comprensione calcoli**: Dashboard che educa l'utente su come funzionano i calcoli CCNL
- **Affidabilità dati**: Eliminazione di tutti gli errori che potevano compromettere la precisione dei calcoli

## [1.4.0] - 2025-08-05

### 🔔 **SISTEMA NOTIFICHE PERSISTENTI - Gestione Messaggi di Sistema**

#### 📱 **Nuovo Sistema Notifiche Completo**
- **NUOVO: Sistema notifiche persistenti**: Gestione completa messaggi di sistema con salvataggio locale
- **NUOVO: Menu "Notifiche di Sistema"**: Accesso dedicato dalla sezione Impostazioni
- **NUOVO: Badge contatore real-time**: Indicatore visivo notifiche non lette con aggiornamento automatico
- **NUOVO: Filtri avanzati**: Filtri per tipo (Info, Warning, Error, Success), priorità (High, Medium, Low) e stato
- **NUOVO: Statistiche dettagliate**: Dashboard completa con conteggi, grafici e analisi temporali
- **NUOVO: Cronologia completa**: Visualizzazione storica di tutte le notifiche con dettagli

#### 🔧 **Funzionalità Avanzate**
- **NUOVO: Export/Import notifiche**: Sistema backup e ripristino notifiche in formato JSON
- **NUOVO: Pulizia automatica**: Rimozione automatica notifiche vecchie con soglie configurabili
- **NUOVO: Context provider globale**: Gestione stato notifiche condivisa tra tutti i componenti
- **NUOVO: Hook personalizzato**: useSystemNotifications per integrazione semplificata
- **NUOVO: Badge componenti**: Versioni semplice, dettagliata e compatta per diversi layout

#### 🎨 **Miglioramenti UI/UX**
- **RIMOSSO: Pulsanti test popup**: Cleanup completo interfaccia, rimossi tutti i pulsanti di test
- **MIGLIORAMENTO: Interfaccia Impostazioni**: Menu più pulito e professionale
- **MIGLIORAMENTO: Design moderno**: Badge e componenti con design coerente al tema app
- **MIGLIORAMENTO: Navigazione ottimizzata**: Accesso rapido e intuitivo al sistema notifiche

#### ⚡ **Architettura Tecnica**
- **Sistema modulare**: Servizi, hook, context e componenti separati per manutenibilità
- **Persistenza AsyncStorage**: Salvataggio locale garantito tra sessioni app
- **Performance ottimizzate**: Aggiornamenti real-time senza impatto performance
- **Pattern React standard**: Context, hook e provider seguono best practice React Native

## [1.3.1] - 2025-08-04

### ✨ **OTTIMIZZAZIONE SISTEMA - Performance e Continuità Servizio**

#### 📊 **Sistema Backup Intelligente Perfezionato**
- **RISOLTO: Statistiche backup sempre accurate**: Sistema fallback automatico che calcola correttamente il numero di backup quando il servizio principale restituisce 0
- **Pulizia automatica ottimizzata**: Cleanup intelligente ogni 30 secondi che mantiene solo il numero configurato (3, 5 o 10) di backup più recenti
- **Monitoraggio continuo**: Sistema di verifica automatica che garantisce sempre statistiche aggiornate senza intervento manuale
- **Performance migliorate**: Ridotto overhead con controlli intelligenti e cleanup proattivo

#### 🔄 **TimeEntry Aggiornamenti Fluidi**
- **RISOLTO: Eliminato refresh doppio**: Completamente risolto il problema di doppio aggiornamento che causava schermata bianca momentanea
- **Refresh intelligente**: Sistema debounce avanzato con timeout di 300ms per aggiornamenti fluidi e naturali
- **Focus management ottimizzato**: Aggiornamento automatico solo quando necessario (dopo modifiche o 30+ secondi)
- **UI pulita**: Rimosso bottone refresh duplicato, mantenuto solo pull-to-refresh nativo per esperienza più elegante

#### 📱 **Notifiche Continue Garantite**
- **RIVOLUZIONARIO: Notifiche persistenti settimane/mesi**: Nuovo sistema AppState listener che riprogramma automaticamente le notifiche quando l'app torna in primo piano
- **Estensione programmazione massiva**: Promemoria lavoro/orari estesi da 3 a 7 giorni, promemoria reperibilità da 3 a 14 giorni
- **Riprogrammazione intelligente**: Controllo automatico ogni apertura app (dopo 1+ ora) con soglia 5 notifiche rimanenti per riprogrammazione
- **Gestione memoria ottimizzata**: Cleanup corretto dei listener AppState per prevenire memory leak e garantire performance

#### � **Miglioramenti UI/UX**
- **Picker ottimizzati**: Etichette accorciate per visualizzazione completa su tutti i dispositivi
- **Performance visual**: Eliminati tutti i refresh visibili multipli per esperienza fluida
- **Feedback utente migliorato**: Sistema di notifiche più chiaro e meno intrusivo

#### ⚡ **Continuità e Stabilità Sistema**
- **Zero interruzioni**: Backup automatici sempre funzionanti con statistiche real-time
- **Aggiornamenti seamless**: TimeEntry si aggiorna senza disturbare l'utente
- **Notifiche affidabili**: Sistema che continua a funzionare per mesi senza riconfigurazione
- **Performance complessive**: Sistema completamente ottimizzato per uso quotidiano intensivo

---

## [1.3.0] - 2025-08-04

### 🎯 **AGGIORNAMENTO CRITICO - Sistema Backup Completo e PDF Avanzato**

#### 💾 **Backup Automatico Completo Rivoluzionato**
- **NUOVO: Backup completo con tutte le impostazioni di sistema**: Include work entries, impostazioni utente, giorni reperibilità e configurazioni CCNL
- **Sistema multi-formato intelligente**: Compatibilità automatica tra backup automatici e manuali con strutture diverse
- **Ripristino universale**: Gestione automatica di formati legacy e nuovi per massima compatibilità
- **Metadati arricchiti**: Informazioni dettagliate sui dati inclusi in ogni backup per trasparenza completa

#### 📄 **Sistema Stampa PDF Professionale**
- **NUOVO: Stampa PDF perfetta con calcoli identici al form**: Risolto bug critico dove PDF mostrava calcoli diversi dal form
- **Campo reperibilità corretto**: Risolto mapping campi form.reperibilita vs form.standby per display accurato indennità
- **Switch indicator preciso**: Visualizzazione corretta "ATTIVA"/"NON ATTIVA" per reperibilità automatica e manuale
- **Layout A4 professionale**: Formattazione ottimizzata per stampa con filename personalizzato app+data

#### 🔧 **Miglioramenti Tecnici Avanzati**
- **DatabaseService.restoreFromBackup() multi-formato**: Supporto automatico per backup automatici, manuali e array diretti
- **BackupService.validateBackupFormat() intelligente**: Riconoscimento automatico tipo backup senza errori
- **Field mapping unificato**: Correzione sistematica riferimenti campi tra form e PDF template
- **Debug logging completo**: Tracciamento dettagliato backup e ripristino per troubleshooting

#### 🛠️ **Correzioni Critiche Sistema**
- **Eliminato errore "Formato backup non valido"**: Risolto problema importazione backup automatici dalla lista
- **PDF field matching perfetto**: Tutti i campi form ora corrispondono esattamente alla visualizzazione PDF
- **Backup destinazioni multiple**: Gestione robusta percorsi custom, cloud e memoria per backup automatici
- **AutoBackupService.getAllData() integration**: Utilizzo corretto metodi database per backup completo

---

## [1.2.2] - 2025-08-03

### 🚀 **AGGIORNAMENTO CRITICO - Backup Automatico App Chiusa**

#### 💾 **Sistema Backup Rivoluzionario**
- **NUOVO: Backup automatico con app completamente chiusa**: Funziona anche quando l'app non è in esecuzione (solo build native)
- **Task background automatico**: Registrazione automatica di expo-background-fetch all'avvio per persistenza backup
- **Sistema ibrido intelligente**: Native per build produzione + JavaScript fallback per Expo Dev
- **Compatibilità universale**: Rilevamento automatico ambiente di esecuzione

#### 🔧 **Integrazione Tecnica Avanzata**
- **registerBackgroundBackupTask()**: Integrato in App.js per attivazione automatica all'avvio
- **Gestione errori robusta**: Fallback automatico tra sistemi nativi e JavaScript
- **Background fetch configurato**: Intervallo ottimizzato per backup periodici senza impatto performance
- **Cross-platform support**: Android e iOS con configurazioni specifiche per ciascuna piattaforma

#### 📱 **Esperienza Utente Migliorata**
- **Backup garantito**: Sistema backup funziona sempre, anche con device spento/app chiusa
- **Notifiche informative**: Conferme backup completato in background
- **Zero configurazione**: Sistema auto-attivante senza intervento utente
- **Compatibilità preservata**: Funziona identico su Expo Go per sviluppo

#### 🛠️ **Correzioni e Ottimizzazioni**
- **Error handling avanzato**: Gestione errori specifica per ciascun ambiente
- **Logging dettagliato**: Tracciamento completo attività background task
- **Performance ottimizzate**: Registrazione task solo quando necessario
- **Memoria efficiente**: Cleanup automatico task vecchi/non necessari

---

## [1.2.1] - 2025-08-02

### 🎉 AGGIORNAMENTO MAGGIORE - Sistema Notifiche Completo

#### 🔔 **Sistema Notifiche Reperibilità Rivoluzionato**
- **UI configurazione completamente rinnovata**: Interfaccia intuitiva con time picker per configurare notifiche reperibilità
- **Notifiche multiple personalizzabili**: Supporto per più promemoria per ogni giorno di reperibilità (oggi, domani, etc.)
- **Logging dettagliato**: Visualizzazione completa di quando le notifiche vengono programmate con date e orari specifici
- **Database query ottimizzato**: Risolto accesso alle impostazioni reperibilità per programmazione automatica

#### 🛠️ **Correzioni Tecniche Critiche**
- **Fix database query**: Corretto accesso a `standbySettings` via `appSettings` invece di query diretta
- **Import/Export patterns**: Risolti conflitti tra dynamic require() e ES6 modules
- **Constructor-based imports**: Implementato pattern robusto per DatabaseService
- **Field parsing UI**: Corretta conversione formati dati per time picker

#### 🔧 **Miglioramenti Sistema Backup**
- **Backup automatico ottimizzato**: Sistema ibrido Nativo + JavaScript per massima compatibilità
- **Background tasks migliorati**: Gestione backup anche con app chiusa (build native)
- **Logging backup avanzato**: Tracciamento dettagliato operazioni backup con dimensioni e timestamp

#### 📱 **Aggiornamenti OTA e Build Native**
- **Expo Updates integrato**: Sistema aggiornamenti automatici per build native
- **Configurazione multi-ambiente**: Separazione completa tra development e production
- **Build pipeline ottimizzata**: Script automatici per bump versioni e deploy

#### 🎯 **Esperienza Utente**
- **Notifiche intelligenti**: Sistema promemoria reperibilità con anticipo configurabile
- **UI responsiva**: Interfaccia ottimizzata per Android con Material Design
- **Feedback visivo**: Indicatori chiari per stato notifiche e configurazioni attive

### 🔧 **Modifiche Tecniche Dettagliate**
- `SuperNotificationService.js`: Aggiunto `scheduleStandbyReminders()` con logging completo
- `NotificationSettingsScreen.js`: Refactor completo UI configurazione notifiche
- `DatabaseService.js`: Pattern import ottimizzato per compatibilità moduli
- `App.js`: Integrazione expo-updates per OTA automatic updates
- `eas.json`: Configurazione build native separata da development

### 📊 **Statistiche Aggiornamento**
- **375 oggetti** caricati nel repository
- **2.42 MB** di codice ottimizzato
- **15+ file core** aggiornati
- **100% compatibilità** con versioni precedenti

## [1.0.4] - 2025-01-16

### 🚀 Nuove funzionalità
- **Backup automatico in background**: ora l'app esegue backup automatici anche in background (solo build native), notificando l'utente ad ogni salvataggio.
- **Informativa privacy aggiornata**: aggiunto file INFORMATIVA_PRIVACY.md con dettagli su trattamento dati e privacy.

### 🐛 Correzioni
- **Fix calcolo MULTI_SHIFT_OPTIMIZED**: Risolto problema calcolo proporzionale per giornate parziali (6.6h ora = 90.94€ invece di 109.34€)
- **Aggiornamento daily rate CCNL**: Corretto da 107.69€ a 110.23€ per conformità METALMECCANICO_PMI_L5
- **Logica modalità viaggio**: Implementazione completa della modalità MULTI_SHIFT_OPTIMIZED con gestione eccedenze

### ✨ Miglioramenti
- **Calcolo proporzionale CCNL**: Per ore < 8h, calcolo preciso: dailyRate × (oreEffettive / 8)
- **Gestione ore eccedenti**: Per ore ≥ 8h, eccedenza pagata come compenso viaggio
- **Validazione matematica**: Verificata correttezza con formula: 110.23€ × (6.6/8) = 90.94€

### 🔧 Modifiche tecniche
- Aggiornato `CalculationService.js` con branch dedicato per MULTI_SHIFT_OPTIMIZED
- Corretti valori in `constants/index.js` per METALMECCANICO_PMI_L5
- Migliorato logging per debug modalità calcolo viaggio

## [1.0.2] - 2025-01-14
### Previous version fixes and improvements

## [1.0.1] - 2025-01-13  
### Initial release improvements

## [1.0.0] - 2025-01-12
### 🎉 Release iniziale
- Tracking ore lavoro con calcolo automatico stipendio CCNL
- Support per contratti Metalmeccanico PMI
- Gestione viaggi, reperibilità, straordinari
- Database SQLite offline-first
- Sistema backup e export
