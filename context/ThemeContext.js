import React, { createContext, useContext, useState, useEffect } from "react";
import * as FileSystem from "expo-file-system/legacy";

const ThemeContext = createContext();

const SETTINGS_FILE = `${FileSystem.documentDirectory}bellaplus_settings.json`;

// ─────────────────────────────────────────────
// PALETA "VIDA PARK"
// ─────────────────────────────────────────────

const COLORS = {
  azulVidaPark: "#202040",
  rosaVidaPark: "#E84890",
  branco: "#F8F8F8",
  rosaClaro: "#F7A8C8",
  azulSuave: "#34345C",
  rosaEscuro: "#C93678",
  textoSecundario: "#6B6B85",
  textoMutado: "#B3B3C6",
  bordaClara: "#EDEDF2",
};

// ─────────────────────────────────────────────
// TEMA CLARO
// ─────────────────────────────────────────────

const lightTheme = {
  dark: false,

  // Fundo geral
  background: COLORS.branco,

  // Cards, inputs e superfícies
  surface: "#FFFFFF",

  // Texto principal
  text: COLORS.azulVidaPark,

  // Textos secundários
  textSecondary: COLORS.textoSecundario,

  // Textos mais apagados
  textMuted: COLORS.textoMutado,

  // Cor principal
  primary: COLORS.azulVidaPark,

  // Cor de destaque
  accent: COLORS.rosaVidaPark,

  // Bordas
  border: COLORS.bordaClara,

  // Sombra
  cardShadow: "#000000",

  // Cores extras
  pink: COLORS.rosaVidaPark,
  lightPink: COLORS.rosaClaro,
  darkPink: COLORS.rosaEscuro,
  softBlue: COLORS.azulSuave,
};

// ─────────────────────────────────────────────
// TEMA ESCURO
// ─────────────────────────────────────────────

const darkTheme = {
  dark: true,

  // Fundo geral
  background: COLORS.azulVidaPark,

  // Cards
  surface: COLORS.azulSuave,

  // Texto principal
  text: COLORS.branco,

  // Texto secundário
  textSecondary: COLORS.rosaClaro,

  // Texto apagado
  textMuted: COLORS.textoMutado,

  // Cor principal
  primary: COLORS.rosaClaro,

  // Destaques
  accent: COLORS.rosaVidaPark,

  // Bordas
  border: "#4A4A70",

  // Sombra
  cardShadow: "#000000",

  // Cores extras
  pink: COLORS.rosaVidaPark,
  lightPink: COLORS.rosaClaro,
  darkPink: COLORS.rosaEscuro,
  softBlue: COLORS.azulSuave,
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

      await FileSystem.writeAsStringAsync(
        SETTINGS_FILE,
        JSON.stringify(settings)
      );
    } catch (e) {
      console.log("Erro ao salvar tema:", e);
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        loadTheme,
        COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}