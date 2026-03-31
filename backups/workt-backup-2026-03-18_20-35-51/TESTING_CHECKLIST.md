# 📱 Checklist Test Completa - Work Hours Tracker v1.0.4

## 🎯 Obiettivo
Testare completamente l'APK prima di aggiungere AdMob e pubblicare su Play Store.

## 📋 Test di Base (Fondamentali)

### ✅ **1. Installazione e Primo Avvio**
- [ ] APK si installa senza errori
- [ ] App si avvia senza crash
- [ ] Splash screen appare correttamente
- [ ] Nuova icona "W" è visibile nel launcher
- [ ] Permessi richiesti sono appropriati
- [ ] Prima configurazione completata

### ✅ **2. Dashboard Principale**
- [ ] Dashboard si carica velocemente
- [ ] Statistiche mensili mostrate correttamente
- [ ] Ore lavorate, straordinari, guadagni visualizzati
- [ ] Navigazione tra mesi funziona
- [ ] Grafici/chart si renderizzano bene
- [ ] Pull-to-refresh funziona

### ✅ **3. Inserimento Ore (Time Entry)**
- [ ] Schermata si apre correttamente
- [ ] Date picker funziona
- [ ] Time picker per inizio/fine funziona
- [ ] Pausa pranzo si calcola automaticamente
- [ ] Dropdown tipo lavoro (normale/straordinario) funziona
- [ ] Campo note accetta testo
- [ ] Salvataggio dati funziona
- [ ] Modifica entry esistente funziona
- [ ] Eliminazione entry funziona

## 🔧 Test Funzioni Avanzate

### ✅ **4. Calcoli CCNL**
- [ ] **Turno Normale** (es. 8:00-17:00):
  - [ ] Ore base calcolate correttamente
  - [ ] Pausa pranzo sottratta
  - [ ] Guadagno base corretto (€16.15/ora Level 5)
  
- [ ] **Straordinari Giorno** (es. 17:00-19:00):
  - [ ] Ore straordinario calcolate (+20%)
  - [ ] Guadagno maggiorato €19.38/ora
  
- [ ] **Straordinari Notte** (dopo 22:00):
  - [ ] Prima di 22:00: +25% = €20.19/ora
  - [ ] Dopo 22:00: +35% = €21.80/ora

### ✅ **5. Multi-turni**
- [ ] Inserimento due turni stesso giorno
- [ ] Calcolo ore totali corretto
- [ ] Calcolo notturno su entrambi i turni
- [ ] Somma guadagni multipli corretta

### ✅ **6. Reperibilità**
- [ ] Inserimento ore reperibilità
- [ ] Calcolo compenso reperibilità
- [ ] Integrazione con ore normali
- [ ] Export PDF include reperibilità

### ✅ **7. Trasferte e Viaggi**
- [ ] Inserimento ore viaggio
- [ ] Calcolo compenso viaggio (100% orario)
- [ ] Km inserimento e calcolo rimborsi
- [ ] Pernottamenti e indennità
- [ ] Hotel e pasti in trasferta

## 📄 Test Export e Backup

### ✅ **8. Export PDF (CRITICO)**
- [ ] **Genera PDF mensile** - Controlla che contenga:
  - [ ] Intestazione corretta con mese/anno
  - [ ] **Colonna straordinari**: Solo ore LAVORO (non viaggio)
  - [ ] **Colonna reperibilità**: Euro (non NaN)
  - [ ] **Colonna rimborso pasti**: Euro (non "bonus 1 / cash 0")
  - [ ] Totali calcolati correttamente
  - [ ] Tutte le 15 colonne presenti
  - [ ] Formato leggibile e professionale
  
- [ ] **Condivisione PDF**:
  - [ ] PDF si apre correttamente
  - [ ] Condivisione via email funziona
  - [ ] Condivisione via WhatsApp funziona
  - [ ] Salvataggio su device funziona

### ✅ **9. Backup e Sincronizzazione**
- [ ] Backup locale funziona
- [ ] Ripristino backup funziona
- [ ] Dati non vengono persi
- [ ] Export dati CSV/Excel funziona
- [ ] Import dati da backup precedente

## ⚙️ Test Impostazioni

### ✅ **10. Settings Screen**
- [ ] Tutte le schermate impostazioni si aprono
- [ ] **Contratto CCNL**: Modifica livello/stipendio
- [ ] **Reperibilità**: Configurazione tariffe
- [ ] **Trasferte**: Impostazioni viaggio
- [ ] **Pasti**: Configurazione rimborsi
- [ ] **Backup**: Funzioni import/export
- [ ] **Info**: Versione app, about

### ✅ **11. Multi-utente**
- [ ] Creazione nuovo profilo utente
- [ ] Switch tra utenti funziona
- [ ] Dati separati per utente
- [ ] Impostazioni indipendenti

## 🚀 Test Performance

### ✅ **12. Velocità e Stabilità**
- [ ] App si avvia in < 3 secondi
- [ ] Navigazione fluida tra schermate
- [ ] Calcoli si completano rapidamente
- [ ] Nessun lag durante inserimento dati
- [ ] Memoria utilizzata ragionevole
- [ ] Batteria non si scarica eccessivamente

### ✅ **13. Test Stress**
- [ ] Inserimento 50+ entry stesso mese
- [ ] Generazione PDF con molti dati
- [ ] App non crasha con dati intensivi
- [ ] Database mantiene performance

## 📱 Test Compatibilità

### ✅ **14. Orientamento e UI**
- [ ] Portrait mode perfetto
- [ ] Landscape mode (se supportato)
- [ ] Keyboard non copre campi input
- [ ] Scroll funziona su schermate lunghe
- [ ] Font leggibili su tutti i device

### ✅ **15. Versioni Android**
- [ ] Android 8+ funziona correttamente
- [ ] Permessi gestiti correttamente
- [ ] Storage access funziona
- [ ] Sharing intents funzionano

## 🐛 Test Edge Cases

### ✅ **16. Scenari Limite**
- [ ] **Dati vuoti**: App gestisce mesi senza entry
- [ ] **Date future**: Blocca/avverte inserimento date future
- [ ] **Ore negative**: Validazione input orari
- [ ] **Turni sovrapposti**: Gestione conflitti orari
- [ ] **Mezzanotte**: Turni che attraversano mezzanotte

### ✅ **17. Recupero Errori**
- [ ] App si riavvia dopo crash
- [ ] Dati non vengono persi dopo crash
- [ ] Connessione internet intermittente gestita
- [ ] Storage pieno gestito correttamente

## 📊 Test Scenari Reali

### ✅ **18. Scenario Settimana Tipo**
Simula una settimana di lavoro reale:

**Lunedì**: 8:00-17:00 (normale)
- [ ] Insert, calcolo, visualizzazione OK

**Martedì**: 8:00-19:00 (2h straordinari)  
- [ ] Straordinari calcolati correttamente

**Mercoledì**: 22:00-06:00 (turno notte)
- [ ] Notturno calcolato, attraversamento mezzanotte OK

**Giovedì**: Reperibilità 18:00-08:00
- [ ] Reperibilità + turno normale calcolato

**Venerdì**: Trasferta con viaggio
- [ ] Ore viaggio + ore lavoro + rimborsi

**Weekend**: Straordinari festivi
- [ ] Maggiorazioni weekend se applicabili

### ✅ **19. Export Finale**
- [ ] PDF settimana completa generato
- [ ] Tutti i calcoli corretti nel PDF
- [ ] Totali mensili coerenti
- [ ] Condivisione PDF funziona

## ✅ **20. Test di Accettazione Finale**

**L'app è pronta per la monetizzazione se:**
- [ ] ✅ Nessun crash durante test completo
- [ ] ✅ Tutti i calcoli CCNL corretti
- [ ] ✅ PDF export perfetto (straordinari, reperibilità, pasti)
- [ ] ✅ Performance accettabili
- [ ] ✅ UI/UX soddisfacente
- [ ] ✅ Backup/restore funzionanti
- [ ] ✅ Multi-utente stabile

---

## 🎯 **Prossimi Step Basati sui Risultati**

### **Se test > 95% OK** ✅
→ Procedi con integrazione AdMob
→ Prepara pubblicazione Play Store
→ Implementa monetizzazione

### **Se test 80-95% OK** ⚠️
→ Fix bug critici trovati
→ Nuovo test cycle
→ Ottimizzazioni performance

### **Se test < 80% OK** ❌
→ Major bug fixing
→ Revisione architettura se necessario
→ Test approfonditi prima di monetizzare

---

**Data Test**: _______________
**Versione Testata**: 1.0.4
**Device Test**: _______________
**Android Version**: _______________
**Tester**: _______________
