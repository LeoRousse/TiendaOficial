import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'tienda-quiroga-preferences';
const defaults = { theme: 'light', currency: 'USD', reduceMotion: false };
const PreferencesContext = createContext(null);

function readPreferences() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      theme: stored.theme === 'dark' ? 'dark' : 'light',
      currency: stored.currency === 'ARS' ? 'ARS' : 'USD',
      reduceMotion: stored.reduceMotion === true,
    };
  } catch (error) {
    console.error('No se pudieron leer las preferencias de interfaz', error);
    return defaults;
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.reduceMotion = String(preferences.reduceMotion);
    document.documentElement.style.colorScheme = preferences.theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('No se pudieron guardar las preferencias de interfaz', error);
    }
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const value = useMemo(() => ({
    ...preferences,
    updatePreference,
  }), [preferences]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences debe usarse dentro de PreferencesProvider');
  return context;
}
