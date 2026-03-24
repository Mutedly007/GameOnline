'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from './i18n';

interface Settings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  lang: Language;
}

interface SettingsContextType extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setTheme: (v: 'dark' | 'light') => void;
  setLang: (v: Language) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
}

const defaultSettings: Settings = {
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'dark',
  lang: 'en',
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setSoundEnabled: () => {},
  setNotificationsEnabled: () => {},
  setTheme: () => {},
  setLang: () => {},
  showSettings: false,
  setShowSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLangState] = useState<Language>('en');
  const [showSettings, setShowSettings] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bentweld-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.soundEnabled !== undefined) setSoundEnabled(parsed.soundEnabled);
        if (parsed.notificationsEnabled !== undefined) setNotificationsEnabled(parsed.notificationsEnabled);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.lang) setLangState(parsed.lang);
      }
      // Also check old language key
      const oldLang = localStorage.getItem('bentweld-lang') as Language;
      if (oldLang && ['en', 'fr', 'ar'].includes(oldLang)) {
        setLangState(oldLang);
      }
    } catch {}
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('bentweld-settings', JSON.stringify({
        soundEnabled,
        notificationsEnabled,
        theme,
        lang,
      }));
      localStorage.setItem('bentweld-lang', lang);
    } catch {}
  }, [soundEnabled, notificationsEnabled, theme, lang]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  return (
    <SettingsContext.Provider value={{
      soundEnabled, setSoundEnabled,
      notificationsEnabled, setNotificationsEnabled,
      theme, setTheme,
      lang, setLang,
      showSettings, setShowSettings,
    }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
