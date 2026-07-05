/**
 * 🧪 TEST DEBUG - AIAssistantService Context Loading
 * 
 * Questo script testa come il servizio AI carica il contesto e verifica
 * se carica i valori reali dalle impostazioni o usa i valori di default.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './src/services/DatabaseService';
import AIAssistantService from './src/services/AIAssistantService';
import { CCNL_CONTRACTS, DEFAULT_SETTINGS } from './src/constants';

// 🔍 SIMULAZIONE SCENARIO 1: Nessuna impostazione salvata
async function testScenario1_NoSettings() {
  console.log('\n\n=== 🔍 SCENARIO 1: Nessuna impostazione salvata ===\n');
  
  // Pulisci AsyncStorage
  await AsyncStorage.removeItem('settings');
  
  // Carica contesto
  const context = await AIAssistantService.loadContext(true);
  
  console.log('📊 Context caricato:');
  console.log('  Settings:', context.settings);
  console.log('  Expected (DEFAULT):', DEFAULT_SETTINGS.contract);
  
  // Fai una domanda
  const response = await AIAssistantService.ask('Qual è la mia tariffa oraria?', context);
  console.log('\n💬 Domanda: "Qual è la mia tariffa oraria?"');
  console.log('📝 Risposta:', response.text.substring(0, 300) + '...');
  
  // Verifica se ritorna il default
  const isDefault = response.text.includes('€12.57');
  console.log(`\n✅ Ritorna valore di default (L5 €12.57): ${isDefault ? 'SÌ' : 'NO'}`);
}

// 🔍 SIMULAZIONE SCENARIO 2: Impostazione salvata diversa (L7)
async function testScenario2_CustomSettings() {
  console.log('\n\n=== 🔍 SCENARIO 2: Impostazione salvata (CCNL L7) ===\n');
  
  // Salva impostazioni con L7
  const customSettings = {
    ...DEFAULT_SETTINGS,
    contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L7
  };
  
  await AsyncStorage.setItem('settings', JSON.stringify(customSettings));
  console.log('📝 Impostazioni salvate con L7 (€14.45/h)');
  
  // Carica contesto
  const context = await AIAssistantService.loadContext(true);
  
  console.log('\n📊 Context caricato:');
  console.log('  Settings contract name:', context.settings?.contract?.name);
  console.log('  Settings hourlyRate:', context.settings?.contract?.hourlyRate);
  console.log('  Expected (L7):', CCNL_CONTRACTS.METALMECCANICO_PMI_L7.hourlyRate);
  
  // Fai una domanda
  const response = await AIAssistantService.ask('Qual è la mia tariffa oraria?', context);
  console.log('\n💬 Domanda: "Qual è la mia tariffa oraria?"');
  console.log('📝 Risposta:', response.text.substring(0, 300) + '...');
  
  // Verifica se ritorna il valore corretto (L7)
  const isCorrect = response.text.includes('€14.45');
  console.log(`\n✅ Ritorna valore corretto (L7 €14.45): ${isCorrect ? 'SÌ' : 'NO'}`);
  
  if (!isCorrect) {
    console.log('❌ PROBLEMA: Non sta leggendo le impostazioni salvate!');
  }
}

// 🔍 SIMULAZIONE SCENARIO 3: Cache stantio
async function testScenario3_CacheStale() {
  console.log('\n\n=== 🔍 SCENARIO 3: Test cache stantio ===\n');
  
  // Salva L7
  const settings_L7 = {
    ...DEFAULT_SETTINGS,
    contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L7
  };
  await AsyncStorage.setItem('settings', JSON.stringify(settings_L7));
  
  // Carica contesto (cache)
  AIAssistantService.invalidateContextCache();
  const context1 = await AIAssistantService.loadContext();
  console.log('📊 Context 1 caricato (L7):', context1.settings?.contract?.hourlyRate);
  
  // Cambia impostazione a L9
  const settings_L9 = {
    ...DEFAULT_SETTINGS,
    contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L9
  };
  await AsyncStorage.setItem('settings', JSON.stringify(settings_L9));
  console.log('📝 Impostazioni cambiate a L9 (€17.47/h)');
  
  // Carica contesto SENZA forceRefresh (dovrebbe usare cache)
  const context2 = await AIAssistantService.loadContext(false);
  console.log('📊 Context 2 caricato (cache, NO forceRefresh):', context2.settings?.contract?.hourlyRate);
  
  // Carica contesto CON forceRefresh
  const context3 = await AIAssistantService.loadContext(true);
  console.log('📊 Context 3 caricato (forceRefresh=true):', context3.settings?.contract?.hourlyRate);
  
  if (context2.settings?.contract?.hourlyRate === '17.47') {
    console.log('⚠️ PROBLEMA: Cache scaduto ma comunque ha ricaricato i nuovi dati');
  } else if (context3.settings?.contract?.hourlyRate !== '17.47') {
    console.log('❌ PROBLEMA: Anche con forceRefresh non sta leggendo i nuovi dati!');
  } else {
    console.log('✅ Cache funziona correttamente');
  }
}

// 🔍 SIMULAZIONE SCENARIO 4: Integrazione SettingsScreen
async function testScenario4_SettingsIntegration() {
  console.log('\n\n=== 🔍 SCENARIO 4: Integrazione con SettingsScreen ===\n');
  
  // Simula salvataggio da SettingsScreen con contract completo
  const settingsFromScreen = {
    ...DEFAULT_SETTINGS,
    contract: {
      ...CCNL_CONTRACTS.METALMECCANICO_PMI_L4,
      monthlySalary: 2100, // Personalizzato
      hourlyRate: 12.14,   // Personalizzato
    },
    calculationMethod: 'PURE_HOURLY_WITH_MULTIPLIERS',
    mixedCalculationEnabled: false,
    enableTimeBasedRates: true,
  };
  
  await AsyncStorage.setItem('settings', JSON.stringify(settingsFromScreen));
  console.log('📝 Impostazioni salvate con parametri personalizzati');
  console.log('   Mensile personalizzato: €2100');
  console.log('   Orario personalizzato: €12.14');
  console.log('   Metodo: Tariffe Orarie Pure');
  
  // Carica contesto
  AIAssistantService.invalidateContextCache();
  const context = await AIAssistantService.loadContext(true);
  
  console.log('\n📊 Context caricato:');
  console.log('  Stipendio mensile:', context.settings?.contract?.monthlySalary);
  console.log('  Tariffa oraria:', context.settings?.contract?.hourlyRate);
  console.log('  Metodo calcolo:', context.settings?.calculationMethod);
  
  // Fai domande
  const q1 = await AIAssistantService.ask('Qual è il mio stipendio?', context);
  const q2 = await AIAssistantService.ask('Come funziona il metodo di calcolo?', context);
  
  console.log('\n💬 Domanda 1: "Qual è il mio stipendio?"');
  console.log('Menzione di €2100:', q1.text.includes('€2,100') ? '✅ SÌ' : '❌ NO');
  
  console.log('\n💬 Domanda 2: "Come funziona il metodo di calcolo?"');
  console.log('Menzione di "Tariffe Orarie Pure":', q2.text.includes('Tariffe Orarie Pure') ? '✅ SÌ' : '❌ NO');
}

// 🚀 RUN ALL TESTS
export const runAllAIContextTests = async () => {
  console.log('🧪🧪🧪 INIZIO TEST AI CONTEXT LOADING 🧪🧪🧪');
  
  try {
    await testScenario1_NoSettings();
    await testScenario2_CustomSettings();
    await testScenario3_CacheStale();
    await testScenario4_SettingsIntegration();
    
    console.log('\n\n✅ TUTTI I TEST COMPLETATI');
  } catch (error) {
    console.error('❌ ERRORE DURANTE I TEST:', error);
  }
};

// Export per uso globale
global.runAllAIContextTests = runAllAIContextTests;
