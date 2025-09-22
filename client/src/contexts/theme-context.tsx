import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
}

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const lightTheme: ThemeColors = {
  background: '#F6F6F6',
  foreground: '#000000',
  card: '#FFFFFF',
  cardForeground: '#000000',
  primary: '#A2D5C6',
  primaryForeground: '#000000',
  secondary: '#CFFFE2',
  secondaryForeground: '#000000',
  muted: '#E5E5E5',
  mutedForeground: '#666666',
  accent: '#A2D5C6',
  accentForeground: '#000000',
  border: '#D1D1D1',
};

const darkTheme: ThemeColors = {
  background: '#000000',
  foreground: '#F6F6F6',
  card: '#1A1A1A',
  cardForeground: '#F6F6F6',
  primary: '#A2D5C6',
  primaryForeground: '#000000',
  secondary: '#CFFFE2',
  secondaryForeground: '#000000',
  muted: '#2A2A2A',
  mutedForeground: '#A0A0A0',
  accent: '#CFFFE2',
  accentForeground: '#000000',
  border: '#333333',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const colors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // Apply theme class to document root for Tailwind dark mode support
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
