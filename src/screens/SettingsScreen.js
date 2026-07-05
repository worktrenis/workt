import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableAnimated, FadeInCard } from '../components/AnimatedComponents';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import UpdateService from '../services/UpdateService';
import { CompactSystemNotificationBadge } from '../components/SystemNotificationBadge';

// Importa la versione dell'app dal package.json
import { version } from '../../package.json';
import { expo } from '../../app.json';

const { width } = Dimensions.get('window');

// Componente moderno per gli elementi delle impostazioni
const ModernSettingItem = ({ item, onPress, index, theme, isLoading = false }) => {
  return (
    <FadeInCard delay={index * 100} style={[styles.modernSettingItem, { backgroundColor: theme.colors.card }]}>
      <PressableAnimated onPress={onPress} style={styles.settingPressable} disabled={isLoading}>
        <View style={[styles.modernIconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon} size={28} color="white" />
        </View>
        <View style={styles.modernSettingContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.modernSettingTitle, { color: theme.colors.text }]}>{item.title}</Text>
            {item.showNotificationBadge && (
              <CompactSystemNotificationBadge />
            )}
          </View>
          <Text style={[styles.modernSettingSubtitle, { color: theme.colors.textSecondary }]}>
            {isLoading ? 'Controllo aggiornamenti...' : item.subtitle}
          </Text>
        </View>
        <View style={styles.chevronContainer}>
          {isLoading ? (
            <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
              <MaterialCommunityIcons name="loading" size={24} color={theme.colors.primary} />
            </Animated.View>
          ) : (
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textDisabled} />
          )}
        </View>
      </PressableAnimated>
    </FadeInCard>
  );
};

// Header moderno con gradiente
const ModernHeader = ({ theme }) => (
  <FadeInCard style={[styles.modernHeader, { backgroundColor: theme.colors.card }]}>
    <View style={styles.headerContent}>
      <View style={[styles.headerIcon, { backgroundColor: theme.dark ? (theme.colors.primary + '25') : '#e3f2fd' }]}>
        <MaterialCommunityIcons name="cog" size={32} color={theme.colors.primary} />
      </View>
      <Text style={[styles.modernHeaderTitle, { color: theme.colors.text }]}>Impostazioni</Text>
      <Text style={[styles.modernHeaderSubtitle, { color: theme.colors.textSecondary }]}>
        Configura i parametri per il calcolo automatico delle retribuzioni
      </Text>
    </View>
  </FadeInCard>
);

const SettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // 🔄 AGGIORNAMENTO AUTOMATICO: Controlla aggiornamenti quando la pagina viene focalizzata
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 SETTINGS - Screen focalizzato, controllo aggiornamenti silenzioso...');
      // Controllo silenzioso aggiornamenti in background
      UpdateService.checkForUpdates().catch(err => {
        console.log('🔄 SETTINGS - Controllo aggiornamenti silenzioso fallito (normale):', err.message);
      });
    }, [])
  );

  // Gestisce il controllo aggiornamenti
  const handleCheckUpdates = async () => {
    if (isCheckingUpdates) return;
    
    setIsCheckingUpdates(true);
    try {
      // Usa la funzione migliorata per informazioni dettagliate
      const showEnhancedUpdateInfo = require('../../enhanced-update-info').default;
      await showEnhancedUpdateInfo();
      
      // Se non siamo in sviluppo, prova anche il controllo reale
      if (!__DEV__) {
        setTimeout(async () => {
          try {
            const hasUpdate = await UpdateService.checkManually();
            // Il controllo viene gestito internamente dal service
          } catch (error) {
            console.log('Controllo aggiornamenti in background fallito:', error);
          }
        }, 1000);
      }
    } catch (error) {
      Alert.alert(
        'Errore Controllo Aggiornamenti',
        'Impossibile controllare gli aggiornamenti. Verifica la connessione internet e riprova.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Gestisce l'azione dei menu
  const handleMenuPress = (item) => {
    if (item.action === 'checkUpdates') {
      handleCheckUpdates();
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const settingsOptions = [
    {
      title: 'Contratto CCNL',
      subtitle: 'Configurazione retribuzioni e tariffe',
      icon: 'file-document-edit',
      screen: 'ContractSettings',
      color: '#2196F3'
    },
    {
      title: 'Calcolo Netto',
      subtitle: 'Trattenute fiscali e calcolo netto',
      icon: 'calculator-variant',
      screen: 'NetCalculationSettings',
      color: '#1a73e8'
    },
    {
      title: 'Fasce Orarie Avanzate',
      subtitle: 'Configurazione fasce orarie e maggiorazioni',
      icon: 'clock-time-eight',
      screen: 'HourlyRatesSettings',
      color: '#00BCD4'
    },
    {
      title: 'Metodo di Calcolo',
      subtitle: 'CCNL conforme vs. tariffe orarie pure',
      icon: 'function-variant',
      screen: 'CalculationMethodSettings',
      color: '#795548'
    },
    {
      title: 'Assistente AI',
      subtitle: 'Domande su CCNL, tariffe e uso dell\'app',
      icon: 'robot',
      screen: 'AIAssistant',
      color: '#3F51B5'
    },
    {
      title: 'Ore di Viaggio',
      subtitle: 'Modalità di calcolo ore viaggio',
      icon: 'car-clock',
      screen: 'TravelSettings',
      color: '#FF9800'
    },
    {
      title: 'Reperibilità',
      subtitle: 'Indennità e calendario reperibilità',
      icon: 'phone-in-talk',
      screen: 'StandbySettings',
      color: '#9C27B0'
    },
    {
      title: 'Indennità Trasferta',
      subtitle: 'Contributi giornalieri trasferta',
      icon: 'briefcase-variant',
      screen: 'TravelAllowanceSettings',
      color: '#607D8B'
    },
    {
      title: 'Rimborsi Pasti',
      subtitle: 'Buoni pasto e rimborsi',
      icon: 'food-fork-drink',
      screen: 'MealSettings',
      color: '#4CAF50'
    },
    {
      title: 'Ferie e Permessi',
      subtitle: 'Gestione richieste ferie e permessi',
      icon: 'calendar-account',
      screen: 'VacationManagement',
      color: '#E91E63'
    },
    {
      title: 'Notifiche',
      subtitle: 'Gestione completa di tutte le notifiche',
      icon: 'bell-ring',
      screen: 'NotificationSettings',
      color: '#FF5722',
      showNotificationBadge: true
    },
    {
      title: 'Tema e Aspetto',
      subtitle: 'Dark mode e personalizzazione interfaccia',
      icon: 'theme-light-dark',
      screen: 'ThemeSettings',
      color: '#673AB7'
    },
    {
      title: 'Backup e Ripristino',
      subtitle: 'Salvataggio e ripristino dati',
      icon: 'cloud-sync',
      screen: 'Backup',
      color: '#F44336'
    },
    {
      title: 'Aggiornamenti App',
      subtitle: 'Controlla e gestisci aggiornamenti disponibili',
      icon: 'update',
      screen: 'AppUpdate',
      color: '#4CAF50'
    }
  ];

  return (
    <SafeAreaView style={[styles.modernContainer, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <ScrollView style={styles.modernScrollView} showsVerticalScrollIndicator={false}>
        <ModernHeader theme={theme} />

        <View style={styles.modernSettingsContainer}>
          {settingsOptions.map((item, index) => (
            <ModernSettingItem
              key={item.screen || item.action}
              item={item}
              index={index}
              theme={theme}
              onPress={() => handleMenuPress(item)}
              isLoading={item.action === 'checkUpdates' && isCheckingUpdates}
            />
          ))}
        </View>

        <FadeInCard delay={700} style={[styles.modernFooter, { backgroundColor: theme.colors.card }]}>
          <View style={styles.footerContent}>
            <View style={styles.appInfoSection}>
              <View style={styles.appIcon}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.appIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.appTextInfo}>
                <Text style={[styles.modernFooterText, { color: theme.colors.text }]}>
                  {expo.name} v{version}
                </Text>
                <Text style={[styles.modernFooterSubtext, { color: theme.colors.textSecondary }]}>
                  Tracking ore lavoro con calcoli CCNL conformi e personalizzabili
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.infoButton, { backgroundColor: theme.colors.primary + '15' }]}
              onPress={() => navigation.navigate('AppInfo')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
              <Text style={[styles.infoButtonText, { color: theme.colors.primary }]}>
                Info e Aggiornamenti
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    paddingTop: 8, // Aggiunge spazio sotto la status bar
  },
  modernScrollView: {
    flex: 1,
  },
  modernHeader: {
    margin: 16,
    marginTop: 8, // Riduce il margine superiore per evitare sovrapposizioni
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernHeaderSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  modernSettingsContainer: {
    paddingHorizontal: 16,
  },
  modernSettingItem: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modernSettingContent: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modernSettingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modernSettingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chevronContainer: {
    padding: 4,
  },
  modernFooter: {
    margin: 16,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  footerContent: {
    padding: 24,
  },
  appInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIcon: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appIconImage: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  appTextInfo: {
    flex: 1,
  },
  modernFooterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modernFooterSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Stili legacy mantenuti per compatibilità (se necessari)
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  settingsContainer: {
    padding: 15,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default SettingsScreen;
