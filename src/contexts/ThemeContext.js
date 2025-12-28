import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar, Appearance, Platform } from 'react-native';

// Definizione dei temi
export const lightTheme = {
  name: 'light',
  colors: {
    // Colori di base
    primary: '#2196F3',
    primaryDark: '#1976D2',
    primaryLight: '#64B5F6',
    secondary: '#4CAF50',
    secondaryDark: '#388E3C',
    accent: '#FF9800',
    
    // Sfondi
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    
    // Testo
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#BDBDBD',
    
    // Bordi e divisori
    border: '#E0E0E0',
    divider: '#EEEEEE',
    
    // Stati
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Specifici per l'app
    income: '#4CAF50',
    expense: '#F44336',
    travel: '#FF9800',
    overtime: '#9C27B0',
    standby: '#607D8B',
    
    // Componenti specifici
    statusBarStyle: 'dark-content',
    statusBarBackground: '#f5f5f5',
    
    // Sfumature per le card
    cardShadow: '#000000',
    cardElevation: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }
  }
};

export const darkTheme = {
  name: 'dark',
  colors: {
    // Colori di base (adattati per dark mode)
    primary: '#64B5F6',
    primaryDark: '#42A5F5',
    primaryLight: '#90CAF9',
    secondary: '#81C784',
    secondaryDark: '#66BB6A',
    accent: '#FFB74D',
    
    // Sfondi
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    
    // Testo
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textDisabled: '#666666',
    
    // Bordi e divisori
    border: '#333333',
    divider: '#2A2A2A',
    
    // Stati (più visibili nel dark)
    success: '#81C784',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    
    // Specifici per l'app
    income: '#81C784',
    expense: '#EF5350',
    travel: '#FFB74D',
    overtime: '#BA68C8',
    standby: '#78909C',
    
    // Componenti specifici
    statusBarStyle: 'light-content',
    statusBarBackground: '#121212',
    
    // Sfumature per le card
    cardShadow: '#000000',
    cardElevation: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }
  }
};

// Contesto del tema
const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Hook per usare il tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback di emergenza: ritorna un tema di default
    console.warn('useTheme usato fuori da ThemeProvider, usando tema di default');
    return {
      theme: lightTheme,
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
      isLoading: false
    };
  }
  
  // Assicurati che theme esista sempre
  if (!context.theme) {
    return {
      ...context,
      theme: lightTheme
    };
  }
  
  return context;
};

// Provider del tema
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoTheme, setAutoTheme] = useState(false);
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', 'auto-time', 'auto-system'

  // Carica il tema salvato all'avvio
  useEffect(() => {
    loadTheme();
  }, []);

  // Aggiorna la StatusBar quando cambia il tema
  useEffect(() => {
    const currentTheme = isDark ? darkTheme : lightTheme;
    StatusBar.setBarStyle(currentTheme.colors.statusBarStyle);
    // StatusBar.setBackgroundColor rimosso per compatibilità edge-to-edge
  }, [isDark]);

  // Aggiorna la Navigation Bar Android quando cambia il tema
  useEffect(() => {
    const applyAndroidNavigationBar = async () => {
      if (Platform.OS !== 'android') return;
      const currentTheme = isDark ? darkTheme : lightTheme;

      try {
        const navModule = await import('expo-navigation-bar');
        const NavigationBar = navModule?.default || navModule;

        // Tema chiaro -> icone scure, Tema scuro -> icone chiare
        await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        await NavigationBar.setBackgroundColorAsync(currentTheme.colors.background);
      } catch (error) {
        console.log('⚠️ NavigationBar non disponibile:', error?.message);
      }
    };

    applyAndroidNavigationBar();
  }, [isDark]);

  // Funzione per determinare se è ora del tema scuro (basato su orario)
  const shouldBeDarkByTime = () => {
    const hour = new Date().getHours();
    // Tema scuro dalle 19:00 alle 07:00
    return hour >= 19 || hour < 7;
  };

  // Funzione per determinare il tema basato sulla modalità
  const shouldBeDark = useCallback(() => {
    switch (themeMode) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'auto-time':
        return shouldBeDarkByTime();
      case 'auto-system':
        return Appearance.getColorScheme() === 'dark';
      default:
        return false;
    }
  }, [themeMode]);

  // Aggiorna il tema automaticamente
  const updateAutoTheme = useCallback(() => {
    if (themeMode === 'auto-time' || themeMode === 'auto-system') {
      const newIsDark = shouldBeDark();
      if (newIsDark !== isDark) {
        setIsDark(newIsDark);
        // Non salviamo il tema quando è automatico, solo la modalità
      }
    }
  }, [themeMode, isDark, shouldBeDark]);

  // Listener per le modifiche delle impostazioni di sistema
  useEffect(() => {
    if (themeMode === 'auto-system') {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDark(colorScheme === 'dark');
      });
      return () => subscription?.remove();
    }
  }, [themeMode]);

  // Timer per controllare il tema automatico basato su orario ogni minuto
  useEffect(() => {
    if (themeMode === 'auto-time') {
      const interval = setInterval(updateAutoTheme, 60000); // Controlla ogni minuto
      return () => clearInterval(interval);
    }
  }, [themeMode, updateAutoTheme]);

  const loadTheme = async () => {
    try {
      const [savedTheme, savedThemeMode] = await Promise.all([
        AsyncStorage.getItem('@app_theme'),
        AsyncStorage.getItem('@app_theme_mode')
      ]);
      
      const mode = savedThemeMode || 'light';
      setThemeMode(mode);
      
      // Imposta autoTheme per compatibilità con l'interfaccia esistente
      setAutoTheme(mode === 'auto-time' || mode === 'auto-system');
      
      // Determina il tema corrente basato sulla modalità
      const currentShouldBeDark = (() => {
        switch (mode) {
          case 'dark':
            return true;
          case 'light':
            return false;
          case 'auto-time':
            return shouldBeDarkByTime();
          case 'auto-system':
            return Appearance.getColorScheme() === 'dark';
          default:
            return savedTheme === 'dark';
        }
      })();
      
      setIsDark(currentShouldBeDark);
    } catch (error) {
      console.error('Errore nel caricamento tema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (themeName) => {
    try {
      await AsyncStorage.setItem('@app_theme', themeName);
    } catch (error) {
      console.error('Errore nel salvataggio tema:', error);
    }
  };

  const saveThemeMode = async (mode) => {
    try {
      await AsyncStorage.setItem('@app_theme_mode', mode);
      setThemeMode(mode);
      setAutoTheme(mode === 'auto-time' || mode === 'auto-system');
      
      // Applica immediatamente il tema corretto
      const currentShouldBeDark = (() => {
        switch (mode) {
          case 'dark':
            return true;
          case 'light':
            return false;
          case 'auto-time':
            return shouldBeDarkByTime();
          case 'auto-system':
            return Appearance.getColorScheme() === 'dark';
          default:
            return false;
        }
      })();
      
      setIsDark(currentShouldBeDark);
      await saveTheme(currentShouldBeDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Errore nel salvataggio modalità tema:', error);
    }
  };

  const saveAutoTheme = async (isAuto) => {
    // Manteniamo questa funzione per compatibilità, ma ora usiamo saveThemeMode
    const mode = isAuto ? 'auto-time' : (isDark ? 'dark' : 'light');
    await saveThemeMode(mode);
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    saveThemeMode(newMode);
  };

  const setTheme = (themeName) => {
    saveThemeMode(themeName);
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Durante il caricamento, fornisci comunque un tema di default invece di null
  const currentTheme = isLoading ? lightTheme : theme;

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: currentTheme, 
        isDark, 
        autoTheme,
        themeMode,
        toggleTheme, 
        setTheme,
        saveAutoTheme,
        saveThemeMode,
        isLoading 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Utilità per creare stili che dipendono dal tema
export const createThemedStyles = (styleFunction) => {
  return (theme) => styleFunction(theme);
};

// Hook per creare stili dinamici
export const useThemedStyles = (styleFunction) => {
  const { theme } = useTheme();
  return styleFunction(theme);
};

export default ThemeContext;
