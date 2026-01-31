import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableAnimated, FadeInCard } from '../components/AnimatedComponents';
import { useTheme } from '../contexts/ThemeContext';
import { CompactSystemNotificationBadge } from '../components/SystemNotificationBadge';

const { width } = Dimensions.get('window');

// Componente per gli elementi del menu notifiche
const NotificationMenuItem = ({ item, onPress, index, theme }) => {
  return (
    <FadeInCard delay={index * 100} style={[styles.menuItem, { backgroundColor: theme.colors.card }]}>
      <PressableAnimated onPress={onPress} style={styles.menuPressable}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon} size={28} color="white" />
        </View>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{item.title}</Text>
            {item.showNotificationBadge && (
              <CompactSystemNotificationBadge />
            )}
          </View>
          <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>
            {item.subtitle}
          </Text>
        </View>
        <View style={styles.chevronContainer}>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.textSecondary} 
          />
        </View>
      </PressableAnimated>
    </FadeInCard>
  );
};

const NotificationMainMenu = ({ navigation }) => {
  const { theme } = useTheme();

  // 🔔 MENU ITEMS DELLE NOTIFICHE
  const notificationMenuItems = [
    {
      title: 'Notifiche Lavoro',
      subtitle: 'Promemoria e avvisi automatici per le ore lavorative',
      icon: 'bell-ring',
      screen: 'NotificationSettings',
      color: '#FF5722'
    }
  ];

  const handleMenuPress = (screen) => {
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={28} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Gestione Notifiche
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sezione introduttiva */}
        <View style={[styles.introSection, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons 
            name="bell-ring-outline" 
            size={48} 
            color={theme.colors.primary} 
            style={styles.introIcon}
          />
          <Text style={[styles.introTitle, { color: theme.colors.text }]}>
            Centro Notifiche
          </Text>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            Gestisci tutte le impostazioni relative alle notifiche dell'app
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {notificationMenuItems.map((item, index) => (
            <NotificationMenuItem
              key={index}
              item={item}
              index={index}
              theme={theme}
              onPress={() => handleMenuPress(item.screen)}
            />
          ))}
        </View>

        {/* Footer con informazioni */}
        <View style={[styles.footerInfo, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons 
            name="information-outline" 
            size={20} 
            color={theme.colors.primary} 
            style={styles.infoIcon}
          />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Le notifiche ti aiutano a rimanere aggiornato sul tuo lavoro e sugli eventi importanti dell'app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  backButton: {
    padding: 8,
    marginRight: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1
  },
  headerSpacer: {
    width: 44
  },
  scrollView: {
    flex: 1
  },
  introSection: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  introIcon: {
    marginBottom: 12
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  introText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22
  },
  menuSection: {
    paddingHorizontal: 20
  },
  menuItem: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  menuPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  menuContent: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8
  },
  menuSubtitle: {
    fontSize: 14,
    lineHeight: 20
  },
  chevronContainer: {
    padding: 4
  },
  footerInfo: {
    margin: 20,
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  }
});

export default NotificationMainMenu;
