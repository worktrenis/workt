import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

const DebugEntry0407 = () => {
  const [entryData, setEntryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState(null);

  const loadEntry = async () => {
    setLoading(true);
    try {
      const dbService = new DatabaseService();
      await dbService.ensureInitialized();
      
      // Cerca l'entry per il 04/07/2025
      const entries = await dbService.getWorkEntries(2025, 7);
      const entry0407 = entries.find(entry => entry.date === '2025-07-04');
      
      if (entry0407) {
        setEntryData(entry0407);
        
        // Calcola le ore usando la stessa logica dell'app
        if (entry0407.interventi && Array.isArray(entry0407.interventi)) {
          let totalHours = 0;
          
          entry0407.interventi.forEach(intervento => {
            // Calcolo ore lavoro
            if (intervento.work_start_1 && intervento.work_end_1) {
              const start = new Date(`2000-01-01T${intervento.work_start_1}`);
              const end = new Date(`2000-01-01T${intervento.work_end_1}`);
              if (end < start) end.setDate(end.getDate() + 1);
              totalHours += (end - start) / (1000 * 60 * 60);
            }
            
            if (intervento.work_start_2 && intervento.work_end_2) {
              const start = new Date(`2000-01-01T${intervento.work_start_2}`);
              const end = new Date(`2000-01-01T${intervento.work_end_2}`);
              if (end < start) end.setDate(end.getDate() + 1);
              totalHours += (end - start) / (1000 * 60 * 60);
            }
            
            // Calcolo ore viaggio
            if (intervento.departure_company && intervento.arrival_site) {
              const start = new Date(`2000-01-01T${intervento.departure_company}`);
              const end = new Date(`2000-01-01T${intervento.arrival_site}`);
              if (end < start) end.setDate(end.getDate() + 1);
              totalHours += (end - start) / (1000 * 60 * 60);
            }
            
            if (intervento.departure_return && intervento.arrival_company) {
              const start = new Date(`2000-01-01T${intervento.departure_return}`);
              const end = new Date(`2000-01-01T${intervento.arrival_company}`);
              if (end < start) end.setDate(end.getDate() + 1);
              totalHours += (end - start) / (1000 * 60 * 60);
            }
          });
          
          setCalculatedHours(totalHours);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Entry 04/07/2025</Text>
      
      <Button title="Carica Dati" onPress={loadEntry} disabled={loading} />
      
      {loading && <Text>Caricamento...</Text>}
      
      {entryData && (
        <View style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>Dati Entry:</Text>
          <Text>ID: {entryData.id}</Text>
          <Text>Data: {entryData.date}</Text>
          <Text>Reperibilità: {entryData.isStandbyDay ? 'Sì' : 'No'}</Text>
          <Text>Note: {entryData.notes || 'Nessuna'}</Text>
          
          <Text style={styles.sectionTitle}>Interventi ({entryData.interventi?.length || 0}):</Text>
          {entryData.interventi && entryData.interventi.map((intervento, index) => (
            <View key={index} style={styles.interventoContainer}>
              <Text style={styles.interventoTitle}>Intervento {index + 1}:</Text>
              <Text>Lavoro 1: {intervento.work_start_1} - {intervento.work_end_1}</Text>
              <Text>Lavoro 2: {intervento.work_start_2} - {intervento.work_end_2}</Text>
              <Text>Viaggio A: {intervento.departure_company} - {intervento.arrival_site}</Text>
              <Text>Viaggio R: {intervento.departure_return} - {intervento.arrival_company}</Text>
            </View>
          ))}
          
          {calculatedHours !== null && (
            <View style={styles.calculationContainer}>
              <Text style={styles.sectionTitle}>Calcolo Ore:</Text>
              <Text style={styles.calculatedHours}>Totale calcolato: {calculatedHours.toFixed(2)} ore</Text>
              <Text style={styles.expected}>Atteso: 6 ore</Text>
              <Text style={styles.current}>Sistema mostra: 5 ore</Text>
            </View>
          )}
        </View>
      )}
      
      {!entryData && !loading && (
        <Text style={styles.noData}>Nessuna entry trovata per il 04/07/2025</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dataContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  interventoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  interventoTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calculationContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginTop: 15,
    borderRadius: 5,
  },
  calculatedHours: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  expected: {
    color: '#4caf50',
    marginTop: 5,
  },
  current: {
    color: '#f44336',
    marginTop: 5,
  },
  noData: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default DebugEntry0407;
