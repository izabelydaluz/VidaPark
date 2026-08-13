import React, { createContext, useContext, useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";

const ThemeContext = createContext();

const SETTINGS_FILE = `${FileSystem.documentDirectory}bellaplus_settings.json`;

const lightTheme = {
  dark: false,
  background: "#fff7fa",
  surface: "#fff",
  text: "#333",
  textSecondary: "#777",
  textMuted: "#999",
  primary: "#8b3151",
  accent: "#e58aaa",
  border: "#f0f0f0",
  cardShadow: "#000",
};

const darkTheme = {
  dark: true,
  background: "#1a0a10",
  surface: "#2d1120",
  text: "#f0e0e8",
  textSecondary: "#c0a0b0",
  textMuted: "#907080",
  primary: "#e58aaa",
  accent: "#8b3151",
  border: "#3d1c2e",
  cardShadow: "#000",
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
      if (info.exists) {
        const data = await FileSystem.readAsStringAsync(SETTINGS_FILE);
        const settings = JSON.parse(data);
        if (settings.darkMode) {
          setTheme(darkTheme);
        } else {
          setTheme(lightTheme);
        }
      }
    } catch (e) {
      console.log("Erro ao carregar tema:", e);
    }
  }

  async function toggleTheme() {
    const newTheme = theme.dark ? lightTheme : darkTheme;
    setTheme(newTheme);
    try {
      const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
      let settings = { darkMode: false };
      if (info.exists) {
        const data = await FileSystem.readAsStringAsync(SETTINGS_FILE);
        settings = JSON.parse(data);
      }
      settings.darkMode = newTheme.dark;
      await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
    } catch (e) {
      console.log("Erro ao salvar tema:", e);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
