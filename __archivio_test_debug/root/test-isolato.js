console.log('🧪 Test isolato import...');

try {
  console.log('Test 1: AsyncStorage...');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  console.log('✅ AsyncStorage OK');
} catch (e) {
  console.log('❌ AsyncStorage error:', e.message);
}

try {
  console.log('Test 2: Notifications...');
  const Notifications = require('expo-notifications');
  console.log('✅ Notifications OK');
} catch (e) {
  console.log('❌ Notifications error:', e.message);
}

try {
  console.log('Test 3: React Native...');
  const { Platform, Alert, AppState } = require('react-native');
  console.log('✅ React Native OK');
} catch (e) {
  console.log('❌ React Native error:', e.message);
}

try {
  console.log('Test 4: Classe base...');
  
  class TestService {
    constructor() {
      this.initialized = false;
      console.log('Test service created');
    }
    
    async getDatabaseService() {
      if (!this.databaseService) {
        try {
          this.databaseService = require('./DatabaseService.js');
        } catch (error) {
          console.warn('⚠️ DatabaseService non disponibile:', error.message);
          this.databaseService = null;
        }
      }
      return this.databaseService;
    }
  }
  
  const testService = new TestService();
  console.log('✅ Test service OK');
} catch (e) {
  console.log('❌ Test service error:', e.message);
}

console.log('✅ Test isolato completato');
