'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'default' | 'purple' | 'evening' | 'peacock';

export interface ThemeConfig {
  id: Theme;
  name: string;
  description: string;
  swatches: string[];
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Slate & Teal',
    description: 'Classic professional look with deep slate and teal accents',
    swatches: ['#0f172a', '#1e293b', '#334155', '#0d9488', '#14b8a6'],
  },
  {
    id: 'purple',
    name: 'Purple Blend',
    description: 'Rich purple tones for a bold, vibrant interface',
    swatches: ['#2B103C', '#3D2A5D', '#572866', '#8F529B', '#AC91C0'],
  },
  {
    id: 'evening',
    name: 'Evening Mix',
    description: 'Deep navy blues with soft lavender highlights',
    swatches: ['#0E0D15', '#182346', '#3D5387', '#7C83AD', '#BFA9BA'],
  },
  {
    id: 'peacock',
    name: 'Peacock Feather',
    description: 'Vivid blue-green gradient inspired by peacock plumage',
    swatches: ['#4D52B4', '#4E9CE8', '#70D6C5', '#CAE5BC', '#E1EDD4'],
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('default');

  useEffect(() => {
    const stored = localStorage.getItem('pams-theme') as Theme;
    if (stored && THEMES.some(t => t.id === stored)) {
      applyTheme(stored);
      setThemeState(stored);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('pams-theme', newTheme);
    applyTheme(newTheme);
  };

  const themeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
