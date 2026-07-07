import React, { createContext, useContext } from 'react';
import { Appearance } from 'react-native';
import { DarkColors, LightColors, type ThemeColors } from './colors';
import { useSettingsStore } from '../stores/settingsStore';

const ThemeContext = createContext<ThemeColors>(DarkColors);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const themeMode = useSettingsStore((s) => s.themeMode);

  let colors: ThemeColors;
  if (themeMode === 'light') {
    colors = LightColors;
  } else if (themeMode === 'system') {
    colors = Appearance.getColorScheme() === 'light' ? LightColors : DarkColors;
  } else {
    colors = DarkColors;
  }

  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
};

export const useThemeColors = (): ThemeColors => useContext(ThemeContext);
