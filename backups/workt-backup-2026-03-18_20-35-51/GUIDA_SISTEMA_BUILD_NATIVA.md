# 📱 SISTEMA RILEVAMENTO AGGIORNAMENTI BUILD NATIVA

## Panoramica
WorkT ora distingue automaticamente tra due tipi di aggiornamenti:

### 🔄 **Aggiornamenti OTA (Over-The-Air)**
- Solo codice JavaScript/React Native
- Distribuiti tramite Expo EAS Update
- Non cambiano la build version nativa
- Gestiti dal sistema esistente UpdateService

### 📱 **Aggiornamenti Build Nativa**
- Nuova versione APK/IPA installata
- Distribuiti tramite Play Store/App Store
- Cambiano nativeBuildVersion e/o nativeApplicationVersion
- **NUOVO**: Gestiti dal sistema NativeBuildUpdateDetector

## Funzionalità del Sistema

### ✅ **Rilevamento Automatico**
```javascript
// Controllo automatico all'avvio dell'app
const result = await checkNativeBuildUpdate();

if (result.updateDetected) {
  // Popup automatico mostrato basato sul tipo di aggiornamento
  console.log('Tipo aggiornamento:', result.updateType);
}
```

### 🎯 **Tipi di Aggiornamento Rilevati**

#### 1. **Prima Installazione** (`first_install`)
- App installata per la prima volta
- Nessuna versione precedente salvata
- Popup di benvenuto con introduzione alle funzionalità

#### 2. **Aggiornamento Build Nativa** (`native_build`)
- nativeBuildVersion cambiato (es: da "10" a "11")
- Download da store ufficiale
- Popup con novità build nativa (prestazioni, compatibilità, ecc.)

#### 3. **Aggiornamento Versione App** (`app_version`)
- nativeApplicationVersion cambiato (es: da "1.2.2" a "1.3.0")
- Nuove funzionalità implementate
- Popup con changelog completo

### 📊 **Informazioni Build Raccolte**
```javascript
const buildInfo = await getBuildInfo();
// Restituisce:
{
  nativeBuildVersion: "11",
  nativeApplicationVersion: "1.3.0", 
  applicationId: "com.workt.app",
  isEmbeddedLaunch: true, // false per OTA
  updateId: null, // presente per OTA
  runtimeVersion: "1.1.0",
  createdAt: "2025-01-01T...",
  channel: "production"
}
```

## Comandi di Test Disponibili

### 🧪 **Test Base**
```javascript
// Test rilevamento completo
testNativeBuildDetection()

// Reset per nuovo test
resetForNewTest()

// Info build corrente
getBuildInfo()

// Forza popup build nativa
forceNativeBuildPopup()
```

### 🎬 **Test Scenari Completi**
```javascript
// Testa tutti gli scenari possibili
testAllUpdateScenarios()

// Comparazione OTA vs Native
testOTAvsNativeComparison()

// Reset sistema completo
resetNativeBuildSystem()
```

## Logica di Rilevamento

### 🔍 **Processo di Controllo**
1. **Carica info build corrente** da Application.nativeBuildVersion
2. **Recupera versioni precedenti** da AsyncStorage
3. **Compara le versioni** per determinare il tipo di cambiamento
4. **Mostra popup appropriato** basato sul tipo di aggiornamento
5. **Salva nuove versioni** per controlli futuri

### 🎯 **Condizioni per Popup**
```javascript
// Prima installazione
if (!lastKnownBuildVersion || !lastKnownAppVersion) {
  showPopup('first_install');
}

// Aggiornamento build nativa
else if (lastKnownBuildVersion !== currentBuildVersion) {
  showPopup('native_build');
}

// Aggiornamento versione app
else if (lastKnownAppVersion !== currentAppVersion) {
  showPopup('app_version');
}
```

## Integrazione con Sistema Esistente

### 🔄 **Coordinamento OTA + Native**
- **OTA Updates**: Gestiti da UpdateService per aggiornamenti JavaScript
- **Native Updates**: Gestiti da NativeBuildUpdateDetector per nuove build
- **Timing**: Native check prima (1.5s), OTA check dopo (3s)
- **Popup**: Solo un tipo di popup per sessione per evitare sovrapposizioni

### 📱 **Popup Personalizzati per Tipo**

#### **Prima Installazione**
```
🎉 Benvenuto in WorkT!
Grazie per aver installato WorkT v1.3.0!

📱 Build: 11
🚀 Inizia subito a tracciare le tue ore...
```

#### **Aggiornamento Build Nativa**
```
🔄 Aggiornamento Build Nativa!
WorkT è stato aggiornato tramite store ufficiale!

📱 Build: 10 → 11
🎯 NOVITÀ BUILD NATIVA:
• Prestazioni migliorate
• Correzioni compatibilità sistema
• Sistema backup perfezionato
```

#### **Aggiornamento Versione App**
```
🚀 Nuova Versione App!
WorkT è stato aggiornato alla versione 1.3.0!

📦 Versione: 1.2.2 → 1.3.0
🎯 AGGIORNAMENTO COMPLETO:
• Nuove funzionalità implementate
• Sistema PDF migliorato
```

## Vantaggi del Sistema

### ✅ **Per l'Utente**
- **Informazioni chiare** sul tipo di aggiornamento ricevuto
- **Popup personalizzati** con novità specifiche del tipo di update
- **Non confusione** tra aggiornamenti OTA e build native
- **Benvenuto appropriato** per nuove installazioni

### ✅ **Per lo Sviluppatore**
- **Tracking preciso** degli aggiornamenti nativi vs OTA
- **Testing completo** di tutti gli scenari possibili
- **Debug facilitato** con info build dettagliate
- **Coordinamento automatico** tra sistemi di aggiornamento

### ✅ **Per l'App**
- **Esperienza utente migliorata** con notifiche appropriate
- **Nessuna sovrapposizione** tra popup OTA e native
- **Gestione completa** di tutti i tipi di aggiornamento
- **Sistema robusto** con fallback e testing estensivo

## Implementazione Tecnica

### 📂 **File Coinvolti**
- `native-build-update-detector.js` - Sistema principale rilevamento
- `test-native-build-system.js` - Suite completa di test
- `App.js` - Integrazione e controllo automatico
- AsyncStorage - Persistenza versioni precedenti

### ⚙️ **Dependencies**
- `expo-application` - Info build nativa
- `expo-updates` - Info OTA e launch type
- `@react-native-async-storage/async-storage` - Storage persistente
- `react-native` Alert - Popup system

Questo sistema garantisce che ogni tipo di aggiornamento sia gestito appropriatamente con informazioni chiare e popup personalizzati per l'utente.
