// Test rapido del nuovo servizio PDF
import React from 'react';
import { Alert } from 'react-native';
import ComprehensivePDFService from '../services/ComprehensivePDFService';

export const testPDFService = async () => {
  try {
    console.log('🧪 TEST PDF - Iniziando test del servizio PDF...');

    // Dati di test
    const testEntries = [
      {
        id: 1,
        date: '2025-07-27',
        start_time: '08:00',
        end_time: '17:00',
        work_hours: 8,
        travel_hours: 1,
        standby_hours: 0,
        client: 'Test Cliente SRL',
        activity: 'Installazione sistema',
        location: 'Milano, Via Roma 123',
        km_traveled: 50,
        total_earnings: 350.50,
        notes: 'Lavoro completato con successo',
        breakdown: {
          hours: {
            lavoro_ordinario: 8,
            viaggio_ordinario: 1,
          },
          earnings: {
            lavoro_ordinario: 250.00,
            viaggio_ordinario: 100.50,
          }
        }
      }
    ];

    const testMonthlyData = {
      totalHours: 9,
      totalEarnings: 350.50,
      daysWorked: 1,
      ordinary: {
        hours: {
          lavoro_ordinario: 8,
          viaggio_ordinario: 1,
          lavoro_extra: 0,
          viaggio_extra: 0,
        }
      }
    };

    console.log('🧪 TEST PDF - Generando PDF di test...');
    const result = await ComprehensivePDFService.generateMonthlyReport(
      testEntries,
      testMonthlyData,
      7, // luglio
      2025
    );

    if (result.success) {
      console.log('✅ TEST PDF - Test completato con successo!');
      Alert.alert(
        '✅ Test PDF Riuscito',
        'Il nuovo servizio PDF funziona correttamente! Il PDF è stato generato e salvato.',
        [{ text: 'Ottimo!' }]
      );
      return true;
    } else {
      throw new Error('Test fallito: ' + result.message);
    }

  } catch (error) {
    console.error('❌ TEST PDF - Errore durante il test:', error);
    Alert.alert(
      '❌ Test PDF Fallito',
      `Errore durante il test del servizio PDF: ${error.message}`,
      [{ text: 'OK' }]
    );
    return false;
  }
};

export default testPDFService;
