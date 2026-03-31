import { useState, useEffect } from 'react';
import VacationService from '../services/VacationService';

// Hook per gestire l'auto-compilazione di ferie/malattia/riposo nel TimeEntryForm
export const useVacationAutoCompile = (date, dayType, settings) => {
  const [vacationRequest, setVacationRequest] = useState(null);
  const [isVacationDay, setIsVacationDay] = useState(false);
  const [autoCompileData, setAutoCompileData] = useState(null);

  useEffect(() => {
    checkForVacationRequest();
  }, [date, dayType]);

  const checkForVacationRequest = async () => {
    try {
      // Verifica se l'auto-compilazione è abilitata
      const vacationSettings = await VacationService.getSettings();
      if (!vacationSettings?.autoCompileTimeEntry) {
        setAutoCompileData(null);
        setIsVacationDay(false);
        return;
      }

      // Se il tipo giornata è ferie, malattia o riposo, prepara i dati auto-compilazione
      if (['ferie', 'malattia', 'riposo'].includes(dayType)) {
        const compileData = generateAutoCompileData(dayType, vacationSettings);
        setAutoCompileData(compileData);
        setIsVacationDay(true);
        
        // Verifica se esiste una richiesta approvata per questa data
        if (date) {
          const dateStr = convertDateFormat(date); // dd/MM/yyyy -> yyyy-MM-dd
          const request = await VacationService.getApprovedRequestForDate(dateStr);
          setVacationRequest(request);
        }
      } else {
        setAutoCompileData(null);
        setIsVacationDay(false);
        setVacationRequest(null);
      }
    } catch (error) {
      console.error('Errore controllo richiesta ferie:', error);
      setAutoCompileData(null);
      setIsVacationDay(false);
    }
  };

  const convertDateFormat = (dateStr) => {
    // Converte da dd/MM/yyyy a yyyy-MM-dd
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const generateAutoCompileData = (dayType, vacationSettings) => {
    // Calcola la retribuzione giornaliera secondo CCNL
    const ccnlDailyRate = settings?.contract?.dailyRate || 107.69; // CCNL Metalmeccanico PMI Level 5

    const baseData = {
      // Campi sempre compilati per giorni non lavorativi
      veicolo: 'non_guidato',
      targa_veicolo: '',
      viaggi: [{
        departure_company: '',
        arrival_site: '',
        work_start_1: '',
        work_end_1: '',
        work_start_2: '',
        work_end_2: '',
        departure_return: '',
        arrival_company: '',
      }],
      interventi: [],
      pasti: { pranzo: false, cena: false },
      trasferta: false,
      reperibilita: false,
      completamentoGiornata: 'nessuno',
      // Note automatiche
      note: `Giornata di ${getDayTypeLabel(dayType)} - Retribuzione secondo CCNL (€${ccnlDailyRate.toFixed(2)})`,
      // Calcolo retribuzione fissa
      fixedEarnings: ccnlDailyRate,
      isFixedDay: true,
      dayType: dayType
    };

    return baseData;
  };

  const getDayTypeLabel = (dayType) => {
    switch (dayType) {
      case 'ferie': return 'ferie';
      case 'malattia': return 'malattia';
      case 'riposo': return 'riposo compensativo';
      default: return dayType;
    }
  };

  const shouldAutoCompile = () => {
    return isVacationDay && autoCompileData && settings?.autoCompileTimeEntry;
  };

  const getAutoCompileMessage = () => {
    if (!isVacationDay) return null;
    
    const dayLabel = getDayTypeLabel(dayType);
    
    if (vacationRequest) {
      return `📅 Richiesta di ${dayLabel} approvata per questa data. Compilazione automatica attiva.`;
    } else {
      return `📅 Giornata di ${dayLabel} rilevata. Compilazione automatica attiva secondo CCNL.`;
    }
  };

  return {
    isVacationDay,
    vacationRequest,
    autoCompileData,
    shouldAutoCompile: shouldAutoCompile(),
    autoCompileMessage: getAutoCompileMessage(),
    checkForVacationRequest,
  };
};
