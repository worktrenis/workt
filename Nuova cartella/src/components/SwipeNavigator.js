import React, { useRef, useEffect } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';

import DashboardScreen from '../screens/DashboardScreen';
import TimeEntryScreen from '../screens/TimeEntryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const TopTab = createMaterialTopTabNavigator();
const BottomTab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Configurazione delle pagine principali
const MAIN_SCREENS = [
  {
    name: 'Dashboard',
    component: DashboardScreen,
    title: 'Dashboard',
    iconFocused: 'stats-chart',
    iconOutlined: 'stats-chart-outline'
  },
  {
    name: 'TimeEntry',
    component: TimeEntryScreen,
    title: 'Inserimento Orario',
    iconFocused: 'time',
    iconOutlined: 'time-outline'
  },
  {
    name: 'Settings',
    component: SettingsScreen,
    title: 'Impostazioni',
    iconFocused: 'settings',
    iconOutlined: 'settings-outline'
  }
];

// Navigator swipe invisibile (solo per la gestione dello swipe)
function SwipeNavigator({ navigation, state }) {
  const pagerRef = useRef(null);

  // Sincronizza la pagina corrente con la navigazione
  useEffect(() => {
    if (pagerRef.current && state.index !== undefined) {
      pagerRef.current.setPage(state.index);
    }
  }, [state.index]);

  const handlePageSelected = (e) => {
    const pageIndex = e.nativeEvent.position;
    const routeName = MAIN_SCREENS[pageIndex]?.name;
    
    if (routeName && navigation.getState().index !== pageIndex) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={state.index || 0}
        onPageSelected={handlePageSelected}
        scrollEnabled={true}
      >
        {MAIN_SCREENS.map((screen, index) => (
          <View key={screen.name} style={styles.page}>
            <screen.component navigation={navigation} />
          </View>
        ))}
      </PagerView>
    </View>
  );
}

// Navigator principale con tab in basso + swipe
function SwipeableTabNavigator() {
  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const screen = MAIN_SCREENS.find(s => s.name === route.name);
          const iconName = focused ? screen?.iconFocused : screen?.iconOutlined;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: styles.tabBar,
      })}
    >
      {MAIN_SCREENS.map((screen) => (
        <BottomTab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={{ title: screen.title }}
        />
      ))}
    </BottomTab.Navigator>
  );
}

// Alternative: Navigator con swipe integrato usando Material Top Tabs nascosti
function HybridSwipeNavigator() {
  return (
    <View style={styles.container}>
      <TopTab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
          tabBarShowLabel: true,
          tabBarShowIcon: true,
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: styles.tabBar,
          tabBarIndicatorStyle: { backgroundColor: '#2196F3' },
          swipeEnabled: true, // Abilita swipe
          animationEnabled: true,
        }}
      >
        {MAIN_SCREENS.map((screen) => (
          <TopTab.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{
              title: screen.title,
              tabBarIcon: ({ focused, color }) => {
                const iconName = focused ? screen.iconFocused : screen.iconOutlined;
                return <Ionicons name={iconName} size={24} color={color} />;
              },
            }}
          />
        ))}
      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: width,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 60,
    paddingBottom: 5,
  },
});

export default HybridSwipeNavigator;
export { SwipeableTabNavigator, SwipeNavigator };
