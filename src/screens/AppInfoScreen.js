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
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

const AppInfoScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const appName = Constants.expoConfig?.name || 'WorkT';
  const appVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || '—';
  const nativeBuildVersion = Application.nativeBuildVersion || '—';
  const runtimeVersion = Updates.runtimeVersion || '—';
  const updateChannel = Updates.channel || Constants.expoConfig?.updates?.requestHeaders?.['expo-channel-name'] || '—';

  const changelog = [
    {
      version: '1.0.44',
      date: '31 gennaio 2026',
      changes: [
        'Fix mese: parsing ISO locale (1° del mese nel mese corretto)'
      ]
    },
    {
      version: '1.0.44',
      date: '31 gennaio 2026',
      changes: [
        'Fix date fuso orario: date-only locale (no UTC shift)'
      ]
    },
    {
      version: '1.0.44',
      date: '27 gennaio 2026',
      changes: [
        'Fix notifiche: stop doppio scheduler, trigger weekly/daily Android, dedup e UI orario'
      ]
    },
    {
      version: '1.0.44',
      date: '27 gennaio 2026',
      changes: [
        'Popup versioni: usa runningVersion/lastKnownVersion per evitare numeri uguali'
      ]
    },
    {
      version: '1.0.43',
      date: '27 gennaio 2026',
      changes: [
        'Fix definitivo versioni popup: salva runningVersion all\'avvio'
      ]
    },
    {
      version: '1.0.42',
      date: '26 gennaio 2026',
      changes: [
        'Fix versioni uguali nel popup: cattura previousVersion prima del download'
      ]
    },
    {
      version: '1.0.41',
      date: '26 gennaio 2026',
      changes: [
        'Sanifica versione unknown nel popup aggiornamento completato'
      ]
    },
    {
      version: '1.0.40',
      date: '26 gennaio 2026',
      changes: [
        'Fix visualizzazione versione in popup aggiornamento - usa package.json'
      ]
    },
    {
      version: '1.0.39',
      date: '26 gennaio 2026',
      changes: [
        'Correzioni post-baseline'
      ]
    },
    {
      version: '1.0.38',
      date: '24 gennaio 2026',
      changes: [
        'Fix affidabilità notifiche (trigger ripetitivi)'
      ]
    },
    {
      version: '1.0.37',
      date: '24 gennaio 2026',
      changes: [
        'UI cantieri: card compatta, dettagli veicolo a scomparsa',
        'TimeEntryScreen no duplicati',
        'fix pausa cena su viaggio'
      ]
    },
    {
      version: '1.0.36',
      date: '17 gennaio 2026',
      changes: [
        'Fix backup JSON parsing e migrate FileSystem API to legacy SDK 54'
      ]
    },
    {
      version: '1.0.35',
      date: '01 gennaio 2026',
      changes: [
        'Chore: riduzione log Dashboard (solo __DEV__)'
      ]
    },
    {
      version: '1.0.34',
      date: '01 gennaio 2026',
      changes: [
        'HOTFIX Dashboard: cambio mese senza refresh (queue calcolo + stop duplicate loadData)'
      ]
    },
    {
      version: '1.0.33',
      date: '01 gennaio 2026',
      changes: [
        'HOTFIX Dashboard: fix riepilogo mese-mese (race condition load/aggregation)'
      ]
    },
    {
      version: '1.0.32',
      date: '01 gennaio 2026',
      changes: [
        'HOTFIX Dashboard: cash standard scala residuo anno prec.',
        'riordino card',
        'Totale Netto Stimato in cima'
      ]
    },
    {
      version: '1.0.31',
      date: '01 gennaio 2026',
      changes: [
        'HOTFIX: evita wipe impostazioni (updatePartialSettings) + restore backup ripristina settings'
      ]
    },
    {
      version: '1.0.30',
      date: '01 gennaio 2026',
      changes: [
        'Dashboard: rollover cash standard (reset anno corrente) + card anno precedente + residuo complessivo'
      ]
    },
    {
      version: '1.0.29',
      date: '01 gennaio 2026',
      changes: [
        'Dashboard: rollover annuale rimborso pasti (cash standard) + residuo anno precedente'
      ]
    },
    {
      version: '1.0.28',
      date: '01 gennaio 2026',
      changes: [
        'Fix completamento Dashboard: range date (timezone)'
      ]
    },
    {
      version: '1.0.27',
      date: '01 gennaio 2026',
      changes: [
        'Fix giorni in completamento (no falsi positivi)'
      ]
    },
    {
      version: '1.0.26',
      date: '01 gennaio 2026',
      changes: [
        'Fix Dashboard mese vuoto + fix nota CCNL form (Capodanno)'
      ]
    },
    {
      version: '1.0.25',
      date: '01 gennaio 2026',
      changes: [
        'Fix riepilogo form: anti-stale breakdown CCNL'
      ]
    },
    {
      version: '1.0.24',
      date: '31 dicembre 2025',
      changes: [
        'Fix pasti auto (pranzo/cena) tutti i turni + Rimborso cash standard: inserimenti incrementali + modifica/elimina'
      ]
    },
    {
      version: '1.0.23',
      date: '31 dicembre 2025',
      changes: [
        'Multi-cantiere + fix regola ore viaggio'
      ]
    },
    {
      version: '1.0.22',
      date: '28 dicembre 2025',
      changes: [
        'Hotfix crash avvio: navigation bar opzionale'
      ]
    },
    {
      version: '1.0.21',
      date: '28 dicembre 2025',
      changes: [
        'Fix navigation bar Android tema chiaro'
      ]
    },
    {
      version: '1.0.20',
      date: '28 dicembre 2025',
      changes: [
        'Fix ripristino backup: expo-file-system/legacy'
      ]
    },
    {
      version: '1.0.19',
      date: '28 dicembre 2025',
      changes: [
        'Fix ripristino backup: expo-file-system/legacy'
      ]
    },
    {
      version: '1.0.18',
      date: '28 dicembre 2025',
      changes: [
        'Fix SAF Android: usa expo-file-system/legacy'
      ]
    },
    {
      version: '1.0.17',
      date: '28 dicembre 2025',
      changes: [
        'Fix backup manuale Android: cartella obbligatoria + alert'
      ]
    },
    {
      version: '1.0.16',
      date: '28 dicembre 2025',
      changes: [
        'Correzioni post-baseline'
      ]
    },
    {
      version: '1.0.15',
      date: '21 dicembre 2025',
      changes: [
        'Correzioni post-baseline'
      ]
    },
    {
      version: '1.0.14',
      date: '21 dicembre 2025',
      changes: [
        'Fix calcolo',
        'Migliorie UI'
      ]
    },
    {
      version: '1.0.14',
      date: '21 dicembre 2025',
      changes: [
        'Correzioni post-baseline'
      ]
    },
    {
      version: '1.0.13',
      date: '21 dicembre 2025',
      changes: [
        'Correzioni post-baseline'
      ]
    },
    {
      version: '1.0.12',
      date: '21 dicembre 2025',
      changes: [
        'Trasferta: riepiloghi allineati al calcolo reale (mezza/intera coerente)',
        'TimeEntryForm: aggiunto totale ore giornata (lavoro + viaggio) nel riepilogo',
        'Correzioni e stabilità generale'
      ]
    },
    {
      version: '1.0.11',
      date: '11 settembre 2025',
      changes: [
        'correzioni post-baseline'
      ]
    },
    {
      version: '1.0.10',
      date: '11 settembre 2025',
      changes: [
        'Aggiornamento v1.0.10'
      ]
    },
    {
      version: '1.0.9',
      date: '11 settembre 2025',
      changes: [
        'Aggiornamento v1.0.9'
      ]
    },
    {
      version: '1.0.8',
      date: '30 agosto 2025',
      changes: [
        'Fix errore salary undefined in WelcomeModal',
        'WelcomeModal sincronizzata con livelli e retribuzioni CCNL ufficiali',
        'Migliorata coerenza dati tra onboarding e impostazioni contratto',
        'Fix minori UI e localizzazione'
      ]
    },
    {
      version: '1.0.7',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.7'
      ]
    },
    {
      version: '1.0.6',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.6'
      ]
    },
    {
      version: '1.0.5',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.5'
      ]
    },
    {
      version: '1.0.4',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.4'
      ]
    },
    {
      version: '1.0.3',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.3'
      ]
    },
    {
      version: '1.0.2',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.2'
      ]
    },
    {
      version: '1.0.1',
      date: '16 agosto 2025',
      changes: [
        'Aggiornamento v1.0.1'
      ]
    },
    {
      version: '1.0.0',
      date: '14 agosto 2025',
      changes: [
        'Release nativa baseline: impostazioni di base e stabilità',
        'Inizio nuova cronologia aggiornamenti (OTA per versioni successive)'
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
            {appName}
          </Text>
          <Text style={[styles.appVersion, { color: theme.colors.primary }]}>
            Versione {appVersion}
          </Text>
          <Text style={[styles.appDescription, { color: theme.colors.textSecondary, marginTop: 6 }]}>
            Build {nativeBuildVersion} • Runtime {runtimeVersion} • Canale {updateChannel}
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
