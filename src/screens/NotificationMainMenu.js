import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Redirect diretto a NotificationSettings.
// In passato questo era un menu intermedio; ora c'e' una sola schermata.
const NotificationMainMenu = ({ navigation }) => {
  useEffect(() => {
    navigation.replace('NotificationSettings');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
};

export default NotificationMainMenu;
