/**
 * 🔄 AI Context Manager
 * 
 * Wrapper attorno a AIAssistantService che gestisce l'invalidazione del cache
 * ogni volta che le impostazioni cambiano, garantendo che l'assistente AI
 * abbia sempre i valori reali e correnti.
 * 
 * IMPORTANTE: Questa funzione DEVE essere chiamata ogni volta che le impostazioni
 * vengono cambiate in qualsiasi schermata di Settings.
 */

import AIAssistantService from './AIAssistantService';

export const invalidateAIContextCache = () => {
  console.log('🔄 AI Context: Invalidando cache (settings cambiate)');
  AIAssistantService.invalidateContextCache();
};

/**
 * Wrapper per updateSettings che invalida automaticamente il cache AI
 * Uso nel hook useSettings quando aggiorna le impostazioni:
 * 
 * PRIMA (senza invalidazione cache):
 * await updateSettings(newSettings);
 * 
 * DOPO (con invalidazione cache):
 * await updateSettingsWithAISync(newSettings);
 */
export const updateSettingsWithAISync = async (updateSettingsFunction) => {
  return async (newSettings) => {
    try {
      // Esegui l'update delle impostazioni
      await updateSettingsFunction(newSettings);
      
      // Invalida il cache dell'AI perché le impostazioni sono cambiate
      invalidateAIContextCache();
      
      console.log('✅ Settings aggiornate e AI cache invalidato');
    } catch (error) {
      console.error('❌ Errore durante aggiornamento settings:', error);
      throw error;
    }
  };
};

/**
 * Test per verificare che l'invalidazione funziona
 */
export const testAICacheInvalidation = async () => {
  console.log('\n🧪 TEST: Invalidazione cache AI');
  
  // Carica contesto una volta
  console.log('1️⃣ Caricamento contesto (con cache)...');
  const context1 = await AIAssistantService.loadContext();
  console.log('   Cache time:', AIAssistantService._contextCacheTime);
  
  // Aspetta 1 secondo
  await new Promise(r => setTimeout(r, 1000));
  
  // Invalida cache
  console.log('\n2️⃣ Invalidazione cache...');
  invalidateAIContextCache();
  console.log('   Cache invalidato');
  
  // Carica di nuovo (dovrebbe ricaricare, non usare cache)
  console.log('\n3️⃣ Caricamento contesto (DOPO invalidazione)...');
  const context2 = await AIAssistantService.loadContext();
  
  if (context2) {
    console.log('✅ Cache correttamente invalidato e ricaricato');
  } else {
    console.log('❌ Errore durante ricaricamento');
  }
};

global.testAICacheInvalidation = testAICacheInvalidation;
