
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // Actual theme applied (light or dark)
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  effectiveTheme: 'light', // Default to light to avoid issues before client hydration
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme', // Generic storage key
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialState.theme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(initialState.effectiveTheme);

  const applyTheme = useCallback((currentTheme: Theme) => {
    let newEffectiveTheme: 'light' | 'dark';
    if (currentTheme === 'system') {
      newEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      newEffectiveTheme = currentTheme;
    }

    setEffectiveTheme(newEffectiveTheme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newEffectiveTheme);
  }, []);

  useEffect(() => {
    // This effect runs only on the client, after hydration.
    let storedTheme: Theme;
    try {
      storedTheme = (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    } catch (e) {
      console.error('Error reading theme from localStorage', e);
      storedTheme = defaultTheme;
    }
    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, [storageKey, defaultTheme, applyTheme]);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (e) {
      console.error('Error saving theme to localStorage', e);
    }
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    // Listen for system theme changes only if current theme is 'system'
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system'); // Re-apply system theme which re-evaluates media query
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
