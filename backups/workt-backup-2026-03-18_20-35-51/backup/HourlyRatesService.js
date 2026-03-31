// 🕐 HOURLY RATES SERVICE
// Gestisce le impostazioni delle fasce orarie e il calcolo delle maggiorazioni

import AsyncStorage from '@react-native-async-storage/async-storage';

class HourlyRatesService {
  constructor() {
    this.cache = {
      method: null,
      timeSlots: null,
      overtimeSettings: null,
      enableTimeBasedRates: null,
      lastUpdate: 0
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
  }

  // ✅ CARICA IMPOSTAZIONI (con cache)
  async getSettings() {
    const now = Date.now();
    
    // Usa cache se valida
    if (
      this.cache.method !== null && 
      this.cache.timeSlots !== null && 
      (now - this.cache.lastUpdate) < this.cacheTimeout
    ) {
      return {
        method: this.cache.method,
        timeSlots: this.cache.timeSlots,
        overtimeSettings: this.cache.overtimeSettings,
        enableTimeBasedRates: this.cache.enableTimeBasedRates
      };
    }

    try {
      // Carica da storage
      const [methodData, timeSlotsData, overtimeData, timeBasedData] = await Promise.all([
        AsyncStorage.getItem('hourly_calculation_method'),
        AsyncStorage.getItem('custom_time_slots'),
        AsyncStorage.getItem('overtime_settings'),
        AsyncStorage.getItem('enable_time_based_rates')
      ]);

      const method = methodData || 'hourly_priority';
      const timeSlots = timeSlotsData ? JSON.parse(timeSlotsData) : this.getDefaultTimeSlots();
      const overtimeSettings = overtimeData ? JSON.parse(overtimeData) : this.getDefaultOvertimeSettings();
      const enableTimeBasedRates = timeBasedData ? JSON.parse(timeBasedData) : true;

      // Aggiorna cache
      this.cache = {
        method,
        timeSlots,
        overtimeSettings,
        enableTimeBasedRates,
        lastUpdate: now
      };

      return {
        method,
        timeSlots,
        overtimeSettings,
        enableTimeBasedRates
      };
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni fasce orarie:', error);
      return {
        method: 'hourly_priority',
        timeSlots: this.getDefaultTimeSlots(),
        overtimeSettings: this.getDefaultOvertimeSettings(),
        enableTimeBasedRates: true
      };
    }
  }

  // ✅ SALVA IMPOSTAZIONI
  async saveSettings(settings) {
    try {
      const { method, timeSlots, overtimeSettings, enableTimeBasedRates } = settings;
      
      await Promise.all([
        AsyncStorage.setItem('hourly_calculation_method', method),
        AsyncStorage.setItem('custom_time_slots', JSON.stringify(timeSlots)),
        AsyncStorage.setItem('overtime_settings', JSON.stringify(overtimeSettings)),
        AsyncStorage.setItem('enable_time_based_rates', JSON.stringify(enableTimeBasedRates))
      ]);

      // Aggiorna cache
      this.cache = {
        method,
        timeSlots,
        overtimeSettings,
        enableTimeBasedRates,
        lastUpdate: Date.now()
      };

      console.log('✅ Impostazioni fasce orarie salvate');
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni fasce orarie:', error);
      return false;
    }
  }

  // ✅ IMPOSTAZIONI PREDEFINITE
  getDefaultTimeSlots() {
    return [
      { 
        id: 'day', 
        name: 'Lavoro Diurno', 
        start: '06:00', 
        end: '20:00', 
        rate: 1.0, 
        color: '#2196F3' 
      },
      { 
        id: 'evening', 
        name: 'Lavoro Notturno fino alle 22h', 
        start: '20:00', 
        end: '22:00', 
        rate: 1.25, 
        color: '#FF9800' 
      },
      { 
        id: 'night', 
        name: 'Lavoro Notturno oltre le 22h', 
        start: '22:00', 
        end: '06:00', 
        rate: 1.35, 
        color: '#9C27B0' 
      }
    ];
  }

  getDefaultOvertimeSettings() {
    return {
      enabled: true,
      dailyThreshold: 8,
      weeklyThreshold: 40,
      overtimeRate: 1.2,
      overtimeNightRate: 1.5,
      combineMaggiorazioni: true
    };
  }

  // ✅ CALCOLA MAGGIORAZIONI PER FASCIA ORARIA (METODO LEGACY)
  async calculateHourlyRatesLegacy(startTime, endTime, workDate, baseHourlyRate) {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enableTimeBasedRates || settings.method === 'daily_priority') {
        // Usa metodo legacy (semplificato)
        return this.calculateLegacyRates(startTime, endTime, baseHourlyRate);
      }

      // Usa nuovo metodo basato su fasce orarie
      return this.calculateTimeSlotRates(startTime, endTime, workDate, baseHourlyRate, settings.timeSlots);
    } catch (error) {
      console.error('❌ Errore calcolo fasce orarie:', error);
      return this.calculateLegacyRates(startTime, endTime, baseHourlyRate);
    }
  }

  // ✅ CALCOLO FASCE ORARIE CON MAGGIORAZIONI CUMULATIVE CCNL
  calculateTimeSlotRatesWithDayBonus(startTime, endTime, workDate, baseHourlyRate, timeSlots, dayMultiplier, dayType) {
    console.log(`[HourlyRatesService] 🔧 DEBUG CCNL Input:`, {
      startTime, endTime, baseHourlyRate, dayMultiplier, dayType,
      timeSlotsCount: timeSlots?.length || 0,
      timeSlots: timeSlots
    });
    
    const result = {
      totalHours: 0,
      normalHours: 0,
      nightHours: 0,
      overtimeHours: 0,
      breakdown: [],
      totalEarnings: 0,
      dayType: dayType,
      dayMultiplier: dayMultiplier
    };

    // Converte orari in minuti per facilità di calcolo
    const startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    
    // Gestisci turni che finiscono il giorno dopo
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Aggiungi 24 ore
    }

    const totalMinutes = endMinutes - startMinutes;
    result.totalHours = totalMinutes / 60;

    console.log(`[HourlyRatesService] 🔧 DEBUG CCNL Calcolo:`, {
      startMinutes, endMinutes, totalMinutes, totalHours: result.totalHours
    });

    console.log(`[HourlyRatesService] CCNL Cumulo: ${dayType} (base +${Math.round((dayMultiplier-1)*100)}%) + fasce orarie`);

    // Verifica se abbiamo fasce orarie
    if (!timeSlots || timeSlots.length === 0) {
      console.log(`[HourlyRatesService] ❌ ERRORE: Nessuna fascia oraria disponibile!`);
      return result;
    }

    // Calcola per ogni fascia oraria con cumulo additivo CCNL
    for (const slot of timeSlots) {
      console.log(`[HourlyRatesService] 🔧 DEBUG Slot:`, slot);
      
      const slotStart = this.timeToMinutes(slot.start);
      let slotEnd = this.timeToMinutes(slot.end);
      
      // Gestisci fasce che attraversano mezzanotte
      if (slotEnd <= slotStart) {
        slotEnd += 24 * 60;
      }

      console.log(`[HourlyRatesService] 🔧 DEBUG Slot minuti:`, {
        slotName: slot.name,
        slotStart, slotEnd,
        workStart: startMinutes, workEnd: endMinutes
      });

      // Calcola sovrapposizione con il turno di lavoro
      const overlapStart = Math.max(startMinutes, slotStart);
      const overlapEnd = Math.min(endMinutes, slotEnd);
      
      console.log(`[HourlyRatesService] 🔧 DEBUG Overlap:`, {
        overlapStart, overlapEnd,
        potentialOverlap: overlapEnd - overlapStart
      });
      
      // Gestisci anche il caso di turni che vanno oltre le 24h
      let overlapMinutes = 0;
      if (overlapEnd > overlapStart) {
        overlapMinutes = overlapEnd - overlapStart;
      }
      
      // Se il turno supera le 24h, controlla anche il giorno successivo
      if (endMinutes > 24 * 60) {
        const nextDayOverlapStart = Math.max(startMinutes - 24 * 60, slotStart);
        const nextDayOverlapEnd = Math.min(endMinutes - 24 * 60, slotEnd);
        if (nextDayOverlapEnd > nextDayOverlapStart) {
          overlapMinutes += nextDayOverlapEnd - nextDayOverlapStart;
        }
      }
      
      // ⭐ CORREZIONE SPECIALE: LAVORO NOTTURNO PRE-ALBA (00:00-06:00)
      // Se il lavoro è tra 00:00-06:00 e la fascia è notturna (22:00-06:00)
      if (overlapMinutes === 0 && startMinutes < 6 * 60 && slotStart >= 22 * 60) {
        // Controlla se il lavoro rientra nella parte pre-alba della fascia notturna
        const nightEndMinutes = 6 * 60; // 06:00
        const workEndInNight = Math.min(endMinutes, nightEndMinutes);
        
        if (workEndInNight > startMinutes) {
          overlapMinutes = workEndInNight - startMinutes;
          console.log(`[HourlyRatesService] 🌙 CORREZIONE NOTTURNO PRE-ALBA: ${startMinutes}-${workEndInNight} = ${overlapMinutes} minuti per fascia ${slot.name}`);
        }
      }

      if (overlapMinutes > 0) {
        const hoursInSlot = overlapMinutes / 60;
        
        // ⭐ CUMULO ADDITIVO CCNL: dayMultiplier + timeSlotMultiplier - 1.0 
        // Esempio: Sabato (+25%) + Notturno (+35%) = 1.25 + 1.35 - 1.0 = 1.60 (+60%)
        const combinedMultiplier = dayMultiplier + slot.rate - 1.0;
        const finalHourlyRate = baseHourlyRate * combinedMultiplier;
        const slotEarnings = hoursInSlot * finalHourlyRate;

        console.log(`[HourlyRatesService] ${slot.name}: ${hoursInSlot.toFixed(2)}h × €${baseHourlyRate} × ${combinedMultiplier.toFixed(2)} = €${slotEarnings.toFixed(2)}`);
        console.log(`[HourlyRatesService]   ↳ Breakdown: ${dayType} +${Math.round((dayMultiplier-1)*100)}% + ${slot.name} +${Math.round((slot.rate-1)*100)}% = +${Math.round((combinedMultiplier-1)*100)}%`);

        // Migliora le etichette per distinguere viaggio andata/ritorno
        let labelName;
        if (dayType.includes('viaggio')) {
          if (slot.rate === 1.0) {
            // Fascia normale
            labelName = dayType.includes('(') ? 
              dayType.replace(/[()]/g, '') + ' diurno' : 
              'Viaggio diurno';
          } else {
            // Fascia con maggiorazione (es. notturno)
            const slotDescription = slot.name.includes('oltre') ? 'notturno (+35%)' : 
                                  slot.name.includes('22h') ? 'notturno (+25%)' : 
                                  slot.name.toLowerCase();
            labelName = dayType.includes('(') ? 
              dayType.replace(/[()]/g, '') + ' ' + slotDescription : 
              'Viaggio ' + slotDescription;
          }
        } else {
          labelName = `${slot.name} (${dayType})`;
        }

        result.breakdown.push({
          name: labelName,
          hours: hoursInSlot,
          rate: combinedMultiplier,
          hourlyRate: finalHourlyRate,
          earnings: slotEarnings,
          color: slot.color,
          dayBonus: Math.round((dayMultiplier-1)*100),
          timeBonus: Math.round((slot.rate-1)*100),
          totalBonus: Math.round((combinedMultiplier-1)*100)
        });

        result.totalEarnings += slotEarnings;

        // Categorizza le ore
        if (slot.rate === 1.0) {
          result.normalHours += hoursInSlot;
        } else {
          result.nightHours += hoursInSlot;
        }
      }
    }

    console.log(`[HourlyRatesService] Totale CCNL: ${result.totalHours}h = €${result.totalEarnings.toFixed(2)}`);
    return result;
  }

  // ✅ CALCOLO FASCE ORARIE AVANZATO
  calculateTimeSlotRates(startTime, endTime, workDate, baseHourlyRate, timeSlots) {
    const result = {
      totalHours: 0,
      normalHours: 0,
      nightHours: 0,
      overtimeHours: 0,
      breakdown: [],
      totalEarnings: 0
    };

    // Converte orari in minuti per facilità di calcolo
    const startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    
    // Gestisci turni che finiscono il giorno dopo
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Aggiungi 24 ore
    }

    const totalMinutes = endMinutes - startMinutes;
    result.totalHours = totalMinutes / 60;

    // Calcola per ogni fascia oraria
    for (const slot of timeSlots) {
      const slotStart = this.timeToMinutes(slot.start);
      let slotEnd = this.timeToMinutes(slot.end);
      
      // Gestisci fasce che attraversano mezzanotte
      if (slotEnd <= slotStart) {
        slotEnd += 24 * 60;
      }

      // Calcola sovrapposizione con il turno di lavoro
      const overlapStart = Math.max(startMinutes, slotStart);
      const overlapEnd = Math.min(endMinutes, slotEnd);
      
      // Gestisci anche il caso di turni che vanno oltre le 24h
      let overlapMinutes = 0;
      if (overlapEnd > overlapStart) {
        overlapMinutes = overlapEnd - overlapStart;
      }

      // Se il turno supera le 24h, controlla anche il giorno successivo
      if (endMinutes > 24 * 60) {
        const nextDayOverlapStart = Math.max(startMinutes - 24 * 60, slotStart);
        const nextDayOverlapEnd = Math.min(endMinutes - 24 * 60, slotEnd);
        if (nextDayOverlapEnd > nextDayOverlapStart) {
          overlapMinutes += nextDayOverlapEnd - nextDayOverlapStart;
        }
      }

      if (overlapMinutes > 0) {
        const hoursInSlot = overlapMinutes / 60;
        const slotEarnings = hoursInSlot * baseHourlyRate * slot.rate;

        result.breakdown.push({
          name: slot.name,
          hours: hoursInSlot,
          rate: slot.rate,
          hourlyRate: baseHourlyRate * slot.rate,
          earnings: slotEarnings,
          color: slot.color
        });

        result.totalEarnings += slotEarnings;

        // Categorizza le ore
        if (slot.rate === 1.0) {
          result.normalHours += hoursInSlot;
        } else {
          result.nightHours += hoursInSlot;
        }
      }
    }

    return result;
  }

  // ✅ CALCOLO LEGACY (metodo tradizionale)
  calculateLegacyRates(startTime, endTime, baseHourlyRate) {
    const startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const totalHours = totalMinutes / 60;

    // Calcolo semplificato: prime 8 ore normali, resto straordinario
    const normalHours = Math.min(totalHours, 8);
    const overtimeHours = Math.max(totalHours - 8, 0);

    const normalEarnings = normalHours * baseHourlyRate;
    const overtimeEarnings = overtimeHours * baseHourlyRate * 1.2; // 20% maggiorazione

    return {
      totalHours,
      normalHours,
      nightHours: 0,
      overtimeHours,
      breakdown: [
        {
          name: 'Ore Normali',
          hours: normalHours,
          rate: 1.0,
          hourlyRate: baseHourlyRate,
          earnings: normalEarnings,
          color: '#2196F3'
        },
        ...(overtimeHours > 0 ? [{
          name: 'Straordinario',
          hours: overtimeHours,
          rate: 1.2,
          hourlyRate: baseHourlyRate * 1.2,
          earnings: overtimeEarnings,
          color: '#FF9800'
        }] : [])
      ],
      totalEarnings: normalEarnings + overtimeEarnings
    };
  }

  // ✅ UTILITY: Converte orario in minuti
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // ✅ UTILITY: Converte minuti in orario
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // ✅ INVALIDATE CACHE
  invalidateCache() {
    this.cache = {
      method: null,
      timeSlots: null,
      overtimeSettings: null,
      enableTimeBasedRates: null,
      lastUpdate: 0
    };
  }

  // ✅ CHECK SE IL SISTEMA È ABILITATO (per CalculationService)
  async isHourlyRatesEnabled() {
    try {
      const settings = await this.getSettings();
      return settings.enableTimeBasedRates && settings.method === 'hourly_priority';
    } catch (error) {
      console.error('❌ Errore verifica abilitazione fasce orarie:', error);
      return false;
    }
  }

  // ✅ CALCOLA RETRIBUZIONE ORARIA (interfaccia per CalculationService)
  async calculateHourlyRates(startTime, endTime, baseRate, contract, isHoliday = false, isSunday = false, isSaturday = false) {
    try {
      console.log(`[HourlyRatesService] Calcolo per ${startTime}-${endTime}, tariffa base: €${baseRate}`);
      console.log(`[HourlyRatesService] Giorni speciali: Sabato=${isSaturday}, Domenica=${isSunday}, Festivo=${isHoliday}`);
      
      const settings = await this.getSettings();
      if (!settings.enableTimeBasedRates) {
        return this.calculateLegacyRates(startTime, endTime, baseRate);
      }

      // Determina la maggiorazione per il tipo di giorno (CCNL compliant)
      let dayMultiplier = 1.0; // Feriale base
      let dayType = 'Feriale';
      
      if (isSaturday) {
        dayMultiplier = 1.25; // +25% sabato
        dayType = 'Sabato';
      } else if (isSunday || isHoliday) {
        dayMultiplier = 1.30; // +30% domenica/festivi  
        dayType = isHoliday ? 'Festivo' : 'Domenica';
      }
      
      console.log(`[HourlyRatesService] Giorno: ${dayType}, Maggiorazione base: +${Math.round((dayMultiplier-1)*100)}%`);

      // Calcola il turno usando le fasce orarie personalizzate con maggiorazioni cumulative CCNL
      const workDate = new Date().toISOString().split('T')[0];
      const calculation = this.calculateTimeSlotRatesWithDayBonus(startTime, endTime, workDate, baseRate, settings.timeSlots, dayMultiplier, dayType);
      
      // Applica logica straordinario se abilitata
      let regularPay = 0;
      let regularHours = 0;
      let overtimePay = 0;
      let overtimeHours = 0;
      
      if (settings.overtimeSettings.enabled && calculation.totalHours > settings.overtimeSettings.dailyThreshold) {
        // Ore straordinarie
        overtimeHours = calculation.totalHours - settings.overtimeSettings.dailyThreshold;
        regularHours = settings.overtimeSettings.dailyThreshold;
        
        // Calcola retribuzione proporzionale
        const totalEarnings = calculation.totalEarnings;
        const earningsPerHour = totalEarnings / calculation.totalHours;
        
        regularPay = regularHours * earningsPerHour;
        overtimePay = overtimeHours * earningsPerHour * settings.overtimeSettings.overtimeRate;
        
        console.log(`[HourlyRatesService] Applicato straordinario: ${regularHours}h normali + ${overtimeHours}h straordinario`);
      } else {
        // Tutte ore normali
        regularPay = calculation.totalEarnings;
        regularHours = calculation.totalHours;
        overtimePay = 0;
        overtimeHours = 0;
      }
      
      const result = {
        regularPay,
        regularHours,
        overtimePay,
        overtimeHours,
        totalEarnings: regularPay + overtimePay,
        totalHours: calculation.totalHours,
        breakdown: calculation.breakdown,
        method: 'hourly_rates_service_ccnl_compliant',
        dayType: dayType,
        dayMultiplier: dayMultiplier,
        settings: {
          method: settings.method,
          enableTimeBasedRates: settings.enableTimeBasedRates,
          overtimeEnabled: settings.overtimeSettings.enabled
        }
      };
      
      console.log(`[HourlyRatesService] Risultato finale CCNL compliant:`, result);
      return result;
      
    } catch (error) {
      console.error('❌ Errore calcolo HourlyRatesService:', error);
      // Fallback al metodo legacy
      return this.calculateLegacyRates(startTime, endTime, baseRate);
    }
  }

  // ✅ GET SISTEMA STATUS
  async getSystemStatus() {
    const settings = await this.getSettings();
    return {
      isActive: settings.enableTimeBasedRates,
      method: settings.method,
      timeSlotsCount: settings.timeSlots.length,
      overtimeEnabled: settings.overtimeSettings.enabled,
      version: '1.0.0'
    };
  }
}

export default new HourlyRatesService();
