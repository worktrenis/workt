import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FadeInCard } from '../components/AnimatedComponents';
import { useTheme } from '../contexts/ThemeContext';

// Importa la versione dell'app dal package.json
import { version } from '../../package.json';
import { expo } from '../../app.json';

const AppInfoScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const changelog = [
  {
    "version": "1.1.0",
    "date": "9 agosto 2025",
    "changes": [
      "Coerenza riepilogo giornaliero vs TimeEntry",
      "Preferenza guadagni giorni speciali + PDF",
      "Allineamento netto/retribuzione su feriali",
      "UI Compensi Aggiuntivi + overflow"
    ]
  },
    {
      version: '1.4.1',
      date: '7 Agosto 2025',
      changes: [
        'RISOLTO CRITICO: Esclusione giorni fissi (ferie, malattia, permessi) dal conteggio lavorativo',
        'RISOLTO: Errore ReferenceError dailyHours che impediva funzionamento dashboard',
        'RISOLTO: Conteggio preciso "Giorni effettivamente lavorati" vs giorni CCNL',
        'RISOLTO: Duplicazione informazione "ore totali" nella retribuzione mensile',
        'NUOVO: Dual Display Lordo/Netto con calcoli matematicamente accurati',
        'NUOVO: Predizioni corrette (26 giorni CCNL + extra vs giorni effettivi + extra)',
        'NUOVO: Integrazione cash pasti in tutti i calcoli netto per trasparenza',
        'NUOVO: Dashboard educativo CCNL con breakdown dettagliato calcoli',
        'MIGLIORAMENTO: Sistema calcolo CCNL preciso senza proiezioni future',
        'MIGLIORAMENTO: Gestione robusta vacation days e validazione dati',
        'UX: Etichette precise e note esplicative per comprensione calcoli',
        'TECNICO: Runtime version aggiornato per coerenza versioning'
      ]
    },
    {
      version: '1.4.0',
      date: '5 Agosto 2025',
      changes: [
        'NUOVO: Sistema notifiche persistenti per gestione messaggi di sistema',
        'NUOVO: Menu "Notifiche di Sistema" con badge contatore non lette',
        'NUOVO: Filtri avanzati per tipo, priorità e stato delle notifiche',
        'NUOVO: Statistiche dettagliate e cronologia notifiche completa',
        'NUOVO: Export/Import notifiche per backup e ripristino',
        'NUOVO: Pulizia automatica notifiche vecchie configurabile',
        'NUOVO: Context provider globale per gestione notifiche real-time',
        'NUOVO: Hook useSystemNotifications per integrazione componenti',
        'NUOVO: Badge compatti con aggiornamento automatico',
        'RIMOSSO: Pulsanti test popup da interfaccia utente (cleanup UI)',
        'MIGLIORAMENTO: Interfaccia Impostazioni più pulita e professionale',
        'TECNICO: Sistema modulare con servizi, hook, context e componenti'
      ]
    },
    {
      version: '1.3.1',
      date: '4 Agosto 2025',
      changes: [
        'OTTIMIZZAZIONE: Statistiche backup sempre accurate con sistema fallback automatico',
        'RISOLTO: TimeEntry eliminato refresh doppio e schermata bianca momentanea',
        'RIVOLUZIONARIO: Notifiche continue per settimane/mesi con AppState listener',
        'INTELLIGENTE: Pulizia automatica backup in eccesso ogni 30 secondi',
        'PERFORMANCE: Sistema debounce avanzato per aggiornamenti fluidi',
        'ESTESO: Promemoria lavoro 7 giorni, reperibilità 14 giorni (vs 3 precedenti)',
        'AUTOMATICO: Riprogrammazione notifiche ogni apertura app (soglia 1+ ora)',
        'UI/UX: Picker ottimizzati, rimosso bottone refresh duplicato',
        'MEMORIA: Gestione corretta listener AppState per prevenire memory leak'
      ]
    },
    {
      version: '1.3.0',
      date: '4 Agosto 2025',
      changes: [
        'CRITICO: Backup completo con tutte le impostazioni di sistema incluse',
        'NUOVO: Sistema backup multi-formato (automatico/manuale/array) universale',
        'NUOVO: Ripristino intelligente con compatibilità backup legacy',
        'PERFETTO: Stampa PDF identica ai calcoli del form (bug critico risolto)',
        'CORRETTO: Campo reperibilità mapping form.reperibilita vs form.standby',
        'CORRETTO: Visualizzazione "ATTIVA"/"NON ATTIVA" per reperibilità automatica',
        'MIGLIORATO: Metadati backup arricchiti con dettaglio dati inclusi',
        'MIGLIORATO: DatabaseService.restoreFromBackup() multi-formato avanzato',
        'TECNICO: AutoBackupService.performAutoBackup() include settings/standby/workEntries'
      ]
    },
    {
      version: '1.2.2',
      date: '3 Agosto 2025',
      changes: [
        'NUOVO: Backup automatico funziona anche con app completamente chiusa (build native)',
        'NUOVO: Task background registrato automaticamente all\'avvio per backup persistente',
        'NUOVO: Sistema ibrido Native + JavaScript per massima compatibilità',
        'MIGLIORAMENTO: Integrazione registerBackgroundBackupTask() in App.js',
        'MIGLIORAMENTO: Gestione errori avanzata per registrazione task background',
        'MIGLIORAMENTO: Rilevamento automatico ambiente (build native vs Expo Dev)',
        'FIX: Fallback automatico per ambiente Expo Dev (solo app aperta)',
        'TECNICO: Background fetch per Android/iOS con expo-background-fetch',
        'TECNICO: Compatibilità garantita sia per build native che Expo Go'
      ]
    },
    {
      version: '1.2.1',
      date: '2 Agosto 2025',
      changes: [
        'Miglioramento: Sistema notifiche backup enhanced con controlli anti-spam',
        'Fix: Risolti problemi timing e duplicazione notifiche backup',
        'Miglioramento: Gestione backup automatico più stabile e affidabile',
        'Aggiornamento: Documentazione sistema notifiche e backup'
      ]
    },
    {
      version: '1.2.0',
      date: '2 Agosto 2025',
      changes: [
        'Nuovo: Sistema notifiche backup automatico avanzato',
        'Nuovo: Backup programmato ogni 3 giorni con notifiche informative',
        'Miglioramento: UpdateService per gestione aggiornamenti OTA',
        'Miglioramento: Sistema notifiche più robusto e configurabile',
        'Fix: Ottimizzazioni performance e stabilità generale'
      ]
    },
    {
      version: '1.0.4',
      date: '1 Agosto 2025',
      changes: [
        'Nuovo: backup automatico in background (solo build native) con notifica locale',
        'Aggiunta informativa privacy dettagliata (vedi link sotto)',
        'Aggiornamento documentazione e schermata info app',
        'Miglioramenti minori interfaccia e stabilità'
      ]
    },
    {
      version: '',
      date: '27 Luglio 2025',
      changes: [
        'Miglioramenti alla dashboard con giorni non ordinari',
        'Separazione giorni lavorativi per tipologia (sabato, domenica, festivi)',
        'Aggiornamento interfaccia menu impostazioni',
        'Rimozione voci di test e debug dal menu',
        'Miglioramenti alla visualizzazione delle card giornaliere',
        'Aggiornamento informazioni app con logo e versione corretti'
      ]
    },
    {
      version: '1.0.0',
      date: 'Luglio 2025',
      changes: [
        'Prima release stabile dell\'app',
        'Implementazione completa del calcolo CCNL Metalmeccanico PMI',
        'Sistema di tracciamento ore con maggiorazioni automatiche',
        'Gestione reperibilità e indennità trasferta',
        'Calcolo automatico rimborsi pasti',
        'Dashboard completa con breakdown dettagliati',
        'Sistema di backup e ripristino dati',
        'Notifiche e promemoria configurabili'
      ]
    }
  ];

  const features = [
    {
      icon: 'clock-time-eight',
      title: 'Tracciamento Ore Preciso',
      description: 'Registra orari di lavoro, viaggi e pause con precisione al minuto'
    },
    {
      icon: 'calculator-variant',
      title: 'Calcoli CCNL Conformi',
      description: 'Calcoli automatici secondo CCNL Metalmeccanico PMI con maggiorazioni corrette'
    },
    {
      icon: 'phone-in-talk',
      title: 'Gestione Reperibilità',
      description: 'Calendario reperibilità con indennità automatiche e notifiche'
    },
    {
      icon: 'car-clock',
      title: 'Ore di Viaggio',
      description: 'Calcolo automatico ore viaggio con tariffe configurabili'
    },
    {
      icon: 'food-fork-drink',
      title: 'Rimborsi Pasti',
      description: 'Gestione automatica buoni pasto e rimborsi in contanti'
    },
    {
      icon: 'chart-line',
      title: 'Dashboard Avanzata',
      description: 'Analisi dettagliate con breakdown ore, guadagni e pattern lavorativi'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Info App</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header App Info */}
        <FadeInCard style={[styles.appHeaderCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.appIconLarge}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.appIconLargeImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}> 
            {expo.name}
          </Text>
          <Text style={[styles.appVersion, { color: theme.colors.primary }]}>
            Versione {version} 
          </Text>
          {/* Mostra la versione solo nella sezione info, non accanto al nome app */}
          <Text style={[styles.appDescription, { color: theme.colors.textSecondary }]}> 
            App professionale per il tracking delle ore di lavoro con calcoli automatici 
            conformi al CCNL Metalmeccanico PMI. Calcoli e maggiorazioni sono personalizzabili 
            per ogni utente e contratto. Gestione completa di orari, viaggi, reperibilità, indennità, 
            backup automatici (anche in background su build native) e dashboard avanzate per l'analisi dei dati.
          </Text>
        </FadeInCard>

        {/* Caratteristiche Principali */}
        <FadeInCard delay={100} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Caratteristiche Principali
          </Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialCommunityIcons name={feature.icon} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </FadeInCard>

        {/* Cronologia Aggiornamenti */}
        <FadeInCard delay={200} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cronologia Aggiornamenti
          </Text>
          {changelog.map((release, index) => (
            <View key={index} style={styles.changelogItem}>
              <View style={styles.changelogHeader}>
                {release.version ? (
                  <Text style={[styles.changelogVersion, { color: theme.colors.primary }]}> 
                    v{release.version}
                  </Text>
                ) : null}
                <Text style={[styles.changelogDate, { color: theme.colors.textSecondary }]}> 
                  {release.date}
                </Text>
              </View>
              <View style={styles.changelogChanges}>
                {release.changes.map((change, changeIndex) => (
                  <View key={changeIndex} style={styles.changeItem}>
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={16} 
                      color={theme.colors.success} 
                      style={styles.changeIcon}
                    />
                    <Text style={[styles.changeText, { color: theme.colors.textSecondary }]}>
                      {change}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </FadeInCard>

        {/* Disclaimer legale */}
        <FadeInCard delay={300} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> 
            Disclaimer & Privacy
          </Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary, fontWeight: 'bold' }]}> 
            I calcoli forniti dall'app sono indicativi e non sostituiscono la busta paga ufficiale. Verifica sempre con il tuo consulente del lavoro o ufficio paghe. L'app non si assume responsabilità per errori di calcolo o interpretazione contrattuale.
          </Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}> 
            Privacy: tutti i dati restano sul dispositivo. Il backup automatico in background (solo build native) non invia mai dati a server esterni. Consulta l'informativa privacy completa qui sotto.
          </Text>
          <TouchableOpacity
            style={{marginTop: 16, alignSelf: 'flex-start'}}
            onPress={() => Linking.openURL('https://github.com/worktrenis/workt/blob/main/INFORMATIVA_PRIVACY.md')}
          >
            <Text style={{color: theme.colors.primary, textDecorationLine: 'underline', fontWeight: '600'}}>
              Leggi l'informativa privacy completa
            </Text>
          </TouchableOpacity>
          <View style={styles.contactSection}> 
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}> 
              Sviluppato da
            </Text>
            <Text style={[styles.contactText, { color: theme.colors.textSecondary }]}> 
              Team WorkT | Contatti privacy: 
              <Text 
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL('mailto:workt.info@gmail.com')}
              >
                workt.info@gmail.com
              </Text>
            </Text>
          </View>
        </FadeInCard>

        {/* FAQ */}
        <FadeInCard delay={350} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> 
            Domande frequenti (FAQ)
          </Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary, fontWeight: 'bold' }]}>Privacy & Dati</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>I miei dati vengono inviati a server esterni?</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>No, tutti i dati restano sul dispositivo salvo backup cloud (se attivato in futuro).</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>Posso cancellare o esportare i miei dati?</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>Sì, tramite le funzioni di backup e ripristino puoi esportare, cancellare o ripristinare tutti i dati.</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary, fontWeight: 'bold' }]}>Calcoli & Responsabilità</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>I calcoli sono validi per la busta paga?</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>No, sono solo indicativi. Fai sempre riferimento alla busta paga ufficiale e al tuo consulente del lavoro.</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary, fontWeight: 'bold' }]}>Single utente</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>L'app è attualmente single utente: ogni installazione è indipendente e i dati sono personali e separati.</Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>Il supporto multiutente potrà essere aggiunto in futuro e sarà descritto nella privacy e nella FAQ.</Text>
        </FadeInCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appHeaderCard: {
    marginTop: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appIconLarge: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconLargeImage: {
    width: 150,
    height: 150,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  changelogItem: {
    marginBottom: 20,
  },
  changelogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changelogVersion: {
    fontSize: 18,
    fontWeight: '700',
  },
  changelogDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  changelogChanges: {
    paddingLeft: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  changeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  changeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  legalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
  },
});

export default AppInfoScreen;
