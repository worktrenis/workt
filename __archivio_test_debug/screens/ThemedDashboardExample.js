import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Componente di esempio per dimostrare il dark mode
const ThemedDashboardExample = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [stats] = useState({
    todayHours: 8.5,
    todayEarnings: 137.28,
    monthHours: 174.5,
    monthEarnings: 2842.67,
    overtime: 12.5,
    travel: 8.0
  });

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2).replace('.', ',')}`;
  };

  const StatsCard = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity
      style={[
        styles.statsCard,
        {
          backgroundColor: theme.colors.card,
          ...theme.colors.cardElevation
        }
      ]}
      onPress={onPress}
    >
      <View style={[styles.statsIconContainer, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="white" />
      </View>
      <View style={styles.statsContent}>
        <Text style={[styles.statsTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
        <Text style={[styles.statsValue, { color: theme.colors.text }]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.statsSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={[
        styles.quickAction,
        {
          backgroundColor: theme.colors.card,
          ...theme.colors.cardElevation
        }
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color="white" />
      </View>
      <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.colors.statusBarStyle}
        backgroundColor={theme.colors.statusBarBackground}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header con toggle tema */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Dashboard
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Demo Dark Mode
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: theme.colors.surface }]}
            onPress={toggleTheme}
          >
            <MaterialCommunityIcons
              name={isDark ? 'weather-sunny' : 'weather-night'}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Statistiche principali */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📊 Oggi
          </Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Ore Lavorate"
              value={formatHours(stats.todayHours)}
              subtitle="8h standard"
              icon="clock"
              color={theme.colors.primary}
            />
            <StatsCard
              title="Guadagno"
              value={formatCurrency(stats.todayEarnings)}
              subtitle="Lordo"
              icon="currency-eur"
              color={theme.colors.income}
            />
          </View>
        </View>

        {/* Statistiche mensili */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📅 Questo Mese
          </Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Ore Totali"
              value={formatHours(stats.monthHours)}
              subtitle="208h standard"
              icon="calendar-clock"
              color={theme.colors.secondary}
            />
            <StatsCard
              title="Guadagno Mensile"
              value={formatCurrency(stats.monthEarnings)}
              subtitle="€2.800 obiettivo"
              icon="cash-multiple"
              color={theme.colors.income}
            />
          </View>
        </View>

        {/* Breakdown ore speciali */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            ⚡ Ore Speciali
          </Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Straordinari"
              value={formatHours(stats.overtime)}
              subtitle="+20% tariffa"
              icon="clock-fast"
              color={theme.colors.overtime}
            />
            <StatsCard
              title="Viaggio"
              value={formatHours(stats.travel)}
              subtitle="100% tariffa"
              icon="car"
              color={theme.colors.travel}
            />
          </View>
        </View>

        {/* Azioni rapide */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🚀 Azioni Rapide
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="Nuovo Orario"
              icon="plus-circle"
              color={theme.colors.primary}
              onPress={() => navigation.navigate('TimeEntry')}
            />
            <QuickAction
              title="Impostazioni"
              icon="cog"
              color={theme.colors.accent}
              onPress={() => navigation.navigate('Settings')}
            />
            <QuickAction
              title="Tema"
              icon="palette"
              color={theme.colors.secondary}
              onPress={() => navigation.navigate('ThemeSettings')}
            />
            <QuickAction
              title="Backup"
              icon="cloud-upload"
              color={theme.colors.info}
              onPress={() => navigation.navigate('Backup')}
            />
          </View>
        </View>

        {/* Card informativa sul tema */}
        <View style={[styles.themeInfoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons
            name={isDark ? 'weather-night' : 'weather-sunny'}
            size={32}
            color={theme.colors.primary}
          />
          <View style={styles.themeInfoContent}>
            <Text style={[styles.themeInfoTitle, { color: theme.colors.text }]}>
              {isDark ? '🌙 Tema Scuro Attivo' : '☀️ Tema Chiaro Attivo'}
            </Text>
            <Text style={[styles.themeInfoText, { color: theme.colors.textSecondary }]}>
              {isDark
                ? 'Il tema scuro riduce l\'affaticamento degli occhi in condizioni di scarsa illuminazione.'
                : 'Il tema chiaro è ottimale per l\'uso durante il giorno con buona illuminazione.'
              }
            </Text>
            <TouchableOpacity
              style={[styles.themeInfoButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('ThemeSettings')}
            >
              <Text style={styles.themeInfoButtonText}>
                Personalizza Tema
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    margin: 16,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 11,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 48) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  themeInfoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  themeInfoContent: {
    flex: 1,
    marginLeft: 16,
  },
  themeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  themeInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  themeInfoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  themeInfoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ThemedDashboardExample;
