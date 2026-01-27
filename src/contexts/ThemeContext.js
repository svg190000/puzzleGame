import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DEFAULT_THEME_KEY } from '../constants/colors';

const ThemeContext = createContext(null);

const STORAGE_KEY = '@puzzle_theme_key';

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(DEFAULT_THEME_KEY);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && THEMES[stored]) {
        setThemeKeyState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemeKey = (key) => {
    if (!THEMES[key]) return;
    setThemeKeyState(key);
    AsyncStorage.setItem(STORAGE_KEY, key);
  };

  const theme = THEMES[themeKey] ?? THEMES[DEFAULT_THEME_KEY];

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setThemeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
