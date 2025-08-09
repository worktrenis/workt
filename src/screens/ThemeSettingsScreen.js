import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../hooks';

const { width } = Dimensions.get('window');

const ThemeSettingsScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme, setTheme, autoTheme, saveAutoTheme, themeMode, saveThemeMode } = useTheme();
  const styles = createStyles(theme);
  const { settings, updatePartialSettings } = useSettings();

  const themeOptions = [
    {
      id: 'light',
      name: 'Tema Chiaro',
      description: 'Interfaccia chiara, ideale per l\'uso diurno',
      icon: 'weather-sunny',
      colors: ['#FFFFFF', '#F5F5F5', '#2196F3'],
      preview: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#212121',
        primary: '#2196F3'
      }
    },
    {
      id: 'dark',
      name: 'Tema Scuro',
      description: 'Interfaccia scura, riduce l\'affaticamento degli occhi',
      icon: 'weather-night',
      colors: ['#121212', '#1E1E1E', '#64B5F6'],
      preview: {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        primary: '#64B5F6'
      }
    },
    {
      id: 'auto-time',
      name: 'Automatico - Orario',
      description: 'Cambia in base all\'orario: scuro 19-07, chiaro 07-19',
      icon: 'clock-outline',
      colors: ['#FFF3E0', '#E1F5FE', '#FF9800'],
      preview: {
        background: '#FFF3E0',
        surface: '#E1F5FE',
        text: '#212121',
        primary: '#FF9800'
      }
    },
    {
      id: 'auto-system',
      name: 'Automatico - Sistema',
      description: 'Segue le impostazioni di sistema del dispositivo',
      icon: 'cellphone-cog',
      colors: ['#E8F5E8', '#F3E5F5', '#4CAF50'],
      preview: {
        background: '#E8F5E8',
        surface: '#F3E5F5',
        text: '#212121',
        primary: '#4CAF50'
      }
    }
  ];

  const handleThemeChange = (themeId) => {
    saveThemeMode(themeId);
    
    // Mostra feedback specifico per ogni modalità
    const messages = {
      'light': '☀️ Tema chiaro applicato!',
      'dark': '� Tema scuro applicato!',
      'auto-time': '🕐 Tema automatico orario attivato!\nScuro: 19:00-07:00 | Chiaro: 07:00-19:00',
      'auto-system': '📱 Tema automatico sistema attivato!\nSeguirà le impostazioni del dispositivo'
    };
    
    Alert.alert(
      '🎨 Tema Impostato',
      messages[themeId] || 'Tema applicato con successo!',
      [{ text: 'Perfetto!' }]
    );
  };

  const ThemePreviewCard = ({ themeOption, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.themeCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
      onPress={() => handleThemeChange(themeOption.id)}
    >
      <View style={styles.themeCardHeader}>
        <MaterialCommunityIcons 
          name={themeOption.icon} 
          size={24} 
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
          {themeOption.name}
        </Text>
        {isSelected && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.primary} 
          />
        )}
      </View>
      
      <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
        {themeOption.description}
      </Text>
      
      {/* Anteprima del tema */}
      <View style={styles.themePreview}>
        <View style={[
          styles.previewContainer,
          { backgroundColor: themeOption.preview.background }
        ]}>
          <View style={[
            styles.previewHeader,
            { backgroundColor: themeOption.preview.primary }
          ]}>
            <View style={styles.previewHeaderContent} />
          </View>
          <View style={[
            styles.previewCard,
            { backgroundColor: themeOption.preview.surface }
          ]}>
            <View style={[
              styles.previewText,
              { backgroundColor: themeOption.preview.text }
            ]} />
            <View style={[
              styles.previewText,
              { 
                backgroundColor: themeOption.preview.text,
                width: '70%',
                marginTop: 4
              }
            ]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.colors.statusBarStyle} 
        backgroundColor={theme.colors.statusBarBackground} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons name="palette" size={32} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Tema e Aspetto
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Personalizza l'aspetto dell'app secondo le tue preferenze
          </Text>
        </View>

        {/* Interruttore rapido */}
        <View style={[styles.quickToggleCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.quickToggleContent}>
            <MaterialCommunityIcons 
              name={isDark ? "weather-night" : "weather-sunny"} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.quickToggleText}>
              <Text style={[styles.quickToggleTitle, { color: theme.colors.text }]}>
                {isDark ? 'Tema Scuro Attivo' : 'Tema Chiaro Attivo'}
              </Text>
              <Text style={[styles.quickToggleSubtitle, { color: theme.colors.textSecondary }]}>
                Tocca per cambiare tema rapidamente
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={isDark ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Selezione temi */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Scegli Tema
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Seleziona il tema che preferisci per l'interfaccia dell'app
          </Text>
          
          <View style={styles.themesContainer}>
            {themeOptions.map((themeOption) => (
              <ThemePreviewCard
                key={themeOption.id}
                themeOption={themeOption}
                isSelected={themeMode === themeOption.id}
              />
            ))}
          </View>
        </View>

        {/* Preferenze di visualizzazione */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferenze di Visualizzazione</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Controlla come mostrare gli importi nelle giornate speciali senza ore di lavoro
          </Text>
          <View style={styles.quickToggleContent}>
            <MaterialCommunityIcons 
              name="cash-multiple" 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.quickToggleText}>
              <Text style={[styles.quickToggleTitle, { color: theme.colors.text }]}>
                Mostra retribuzione nei giorni speciali senza ore
              </Text>
              <Text style={[styles.quickToggleSubtitle, { color: theme.colors.textSecondary }]}>
                Ferie, malattia, permesso, riposo compensativo, festivo
              </Text>
            </View>
            <Switch
              value={settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false}
              onValueChange={(value) => updatePartialSettings({ showEffectiveEarningsOnSpecialNoWorkDays: value })}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={(settings?.showEffectiveEarningsOnSpecialNoWorkDays !== false) ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Stato Corrente */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Stato Corrente
          </Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons 
                name={isDark ? "weather-night" : "weather-sunny"} 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                Tema attivo: {isDark ? 'Scuro 🌙' : 'Chiaro ☀️'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <MaterialCommunityIcons 
                name="cog-outline" 
                size={20} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                Modalità: {(() => {
                  switch(themeMode) {
                    case 'light': return 'Chiaro fisso';
                    case 'dark': return 'Scuro fisso';
                    case 'auto-time': return 'Automatico orario';
                    case 'auto-system': return 'Automatico sistema';
                    default: return 'Sconosciuta';
                  }
                })()}
              </Text>
            </View>
            
            {(themeMode === 'auto-time' || themeMode === 'auto-system') && (
              <View style={styles.statusRow}>
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  {themeMode === 'auto-time' 
                    ? `Ora corrente: ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`
                    : 'Segue impostazioni dispositivo'
                  }
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Alert.alert(
                '🔄 Reset Tema',
                'Vuoi ripristinare il tema predefinito (chiaro)?',
                [
                  { text: 'Annulla', style: 'cancel' },
                  { 
                    text: 'Ripristina', 
                    onPress: () => saveThemeMode('light'),
                    style: 'destructive'
                  }
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="restore" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>
              Ripristina Tema Predefinito
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="information" size={24} color={theme.colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              💡 Suggerimento
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Il tema scuro può ridurre l'affaticamento degli occhi durante l'uso prolungato, 
              specialmente in condizioni di scarsa illuminazione.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    ...theme.colors.cardElevation,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickToggleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...theme.colors.cardElevation,
  },
  quickToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickToggleText: {
    flex: 1,
    marginLeft: 16,
  },
  quickToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickToggleSubtitle: {
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.colors.cardElevation,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  themesContainer: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  themeDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  themePreview: {
    alignItems: 'center',
  },
  previewContainer: {
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewHeader: {
    height: 20,
    width: '100%',
  },
  previewHeaderContent: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    margin: 8,
    borderRadius: 2,
  },
  previewCard: {
    flex: 1,
    margin: 8,
    borderRadius: 4,
    padding: 8,
  },
  previewText: {
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusContainer: {
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  resetButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ThemeSettingsScreen;
