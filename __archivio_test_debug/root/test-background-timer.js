// Test per verificare se BackgroundTimer funziona
import BackgroundTimer from 'react-native-background-timer';

console.log('🧪 Test BackgroundTimer inizio...');

// Test 1: Timer normale
const normalTimer = setTimeout(() => {
  console.log('✅ Timer normale funziona');
}, 2000);

// Test 2: Background Timer
try {
  const backgroundTimer = BackgroundTimer.setTimeout(() => {
    console.log('✅ BackgroundTimer funziona!');
  }, 3000);
  
  console.log(`🔄 BackgroundTimer creato con ID: ${backgroundTimer}`);
} catch (error) {
  console.error('❌ Errore BackgroundTimer:', error);
}

// Test 3: Verifica se la libreria è disponibile
console.log('📦 BackgroundTimer object:', typeof BackgroundTimer);
console.log('📦 BackgroundTimer.setTimeout:', typeof BackgroundTimer.setTimeout);

export default function testBackgroundTimer() {
  console.log('🧪 Test BackgroundTimer eseguito');
}
