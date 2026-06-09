import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  cyber: {
    name: 'Cyber Blue',
    nameRu: 'Синяя',
    '--accent': '#38bdf8',
    '--accent-rgb': '56, 189, 248',
    '--accent-secondary': '#818cf8',
    '--accent-secondary-rgb': '129, 140, 248',
    '--bg-primary': '#020617',
    '--bg-secondary': '#0f172a',
    '--bg-card': 'rgba(15, 23, 42, 0.4)',
    '--border': 'rgba(255, 255, 255, 0.05)',
    '--text-muted': '#64748b',
    '--glow': '0 0 30px rgba(56, 189, 248, 0.3)',
    preview: ['#38bdf8', '#818cf8', '#020617'],
  },
  pink: {
    name: 'Rose Pink',
    nameRu: 'Розовая',
    '--accent': '#f472b6',
    '--accent-rgb': '244, 114, 182',
    '--accent-secondary': '#c084fc',
    '--accent-secondary-rgb': '192, 132, 252',
    '--bg-primary': '#0d0514',
    '--bg-secondary': '#1a0a20',
    '--bg-card': 'rgba(26, 10, 32, 0.6)',
    '--border': 'rgba(244, 114, 182, 0.15)',
    '--text-muted': '#9d7aa5',
    '--glow': '0 0 30px rgba(244, 114, 182, 0.35)',
    preview: ['#f472b6', '#c084fc', '#0d0514'],
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('smartTransitTheme') || 'cyber');

  useEffect(() => {
    const vars = themes[theme];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => {
      if (key.startsWith('--')) root.style.setProperty(key, val);
    });
    localStorage.setItem('smartTransitTheme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
