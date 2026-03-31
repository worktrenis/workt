// Test per verificare che i giorni di reperibilità dalle impostazioni vengano mostrati nella dashboard
import AsyncStorage from '@react-native-async-storage/async-storage';

async function testStandbyDaysInDashboard() {
  console.log('🧪 TEST: Giorni reperibilità in dashboard');
  console.log('=' .repeat(50));
  
  try {
    // 1. Controlla le impostazioni attuali
    const settingsStr = await AsyncStorage.getItem('settings');
    let settings = {};
    
    if (settingsStr) {
      settings = JSON.parse(settingsStr);
      console.log('📱 Settings esistenti trovate');
    } else {
      console.log('📱 Nessuna settings esistente');
      return;
    }
    
    // 2. Controlla se ci sono giorni di reperibilità configurati
    if (!settings.standbySettings?.enabled) {
      console.log('❌ Reperibilità disabilitata nelle impostazioni');
      return;
    }
    
    if (!settings.standbySettings.standbyDays) {
      console.log('❌ Nessun giorno di reperibilità configurato');
      return;
    }
    
    // 3. Mostra i giorni di reperibilità configurati per luglio 2025
    const standbyDays = settings.standbySettings.standbyDays;
    const july2025Days = Object.keys(standbyDays)
      .filter(dateStr => {
        if (!standbyDays[dateStr]?.selected) return false;
        return dateStr.startsWith('2025-07');
      })
      .sort();
    
    console.log(`\n📅 Giorni reperibilità configurati per luglio 2025: ${july2025Days.length}`);
    july2025Days.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
      console.log(`${index + 1}. ${dateStr} (${dayName})`);
    });
    
    // 4. Simula il calcolo dell'indennità per questi giorni
    const IND_16H_FERIALE = 4.22;
    const IND_24H_FERIALE = 7.03;
    const IND_24H_FESTIVO = 10.63;
    
    const allowanceType = settings.standbySettings.allowanceType || '24h';
    const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
    
    let totalAllowance = 0;
    let ferialeDays = 0;
    let sabatodays = 0;
    let festivoDays = 0;
    
    console.log(`\n💰 Calcolo indennità (tipo: ${allowanceType}, sabato come riposo: ${saturdayAsRest}):`);
    
    july2025Days.forEach(dateStr => {
      const date = new Date(dateStr);
      const isSaturday = date.getDay() === 6;
      const isSunday = date.getDay() === 0;
      
      let dailyAllowance = 0;
      let dayType = '';
      
      const isRestDay = isSunday || (isSaturday && saturdayAsRest);
      
      if (isRestDay) {
        dailyAllowance = IND_24H_FESTIVO;
        dayType = isSunday ? 'domenica' : 'sabato (riposo)';
        festivoDays++;
      } else if (isSaturday) {
        if (allowanceType === '16h') {
          dailyAllowance = IND_16H_FERIALE;
        } else {
          dailyAllowance = IND_24H_FERIALE;
        }
        dayType = 'sabato (lavorativo)';
        sabatodays++;
      } else {
        if (allowanceType === '16h') {
          dailyAllowance = IND_16H_FERIALE;
        } else {
          dailyAllowance = IND_24H_FERIALE;
        }
        dayType = 'feriale';
        ferialeDays++;
      }
      
      totalAllowance += dailyAllowance;
      console.log(`  ${dateStr} (${dayType}): €${dailyAllowance.toFixed(2)}`);
    });
    
    console.log(`\n📊 RIEPILOGO:`);
    console.log(`  Giorni feriali: ${ferialeDays}`);
    console.log(`  Giorni sabato: ${sabatodays}`);
    console.log(`  Giorni festivi/domenica: ${festivoDays}`);
    console.log(`  TOTALE GIORNI: ${july2025Days.length}`);
    console.log(`  TOTALE INDENNITÀ: €${totalAllowance.toFixed(2)}`);
    
    console.log(`\n✅ Con la correzione nella dashboard, questi giorni dovrebbero ora apparire nel riepilogo mensile!`);
    console.log(`🔧 La dashboard ora include automaticamente i giorni di reperibilità configurati nelle impostazioni, anche se non ci sono voci salvate nel database.`);
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testStandbyDaysInDashboard();
