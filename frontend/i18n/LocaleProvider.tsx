'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'en' | 'fil' | 'ceb';

const DICTS: Record<Locale, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    applications: 'Applications',
    citations: 'Citations',
    settings: 'Settings',
    audit_log: 'Audit Log',
    my_work: 'My Work',
    portal_track: 'Track application',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    language: 'Language',
  },
  fil: {
    dashboard: 'Dashboard',
    applications: 'Mga Aplikasyon',
    citations: 'Mga Sitas',
    settings: 'Mga Setting',
    audit_log: 'Talaan ng Audit',
    my_work: 'Aking Trabaho',
    portal_track: 'Subaybayan ang aplikasyon',
    search: 'Maghanap',
    save: 'I-save',
    cancel: 'Kanselahin',
    language: 'Wika',
  },
  ceb: {
    dashboard: 'Dashboard',
    applications: 'Mga Aplikasyon',
    citations: 'Mga Citation',
    settings: 'Mga Setting',
    audit_log: 'Audit Log',
    my_work: 'Akong Trabaho',
    portal_track: 'Sunda ang aplikasyon',
    search: 'Pangita',
    save: 'I-save',
    cancel: 'Kansela',
    language: 'Pinulongan',
  },
};

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('pams_locale') as Locale | null;
    if (saved && DICTS[saved]) setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('pams_locale', l);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l === 'fil' ? 'fil' : l === 'ceb' ? 'ceb' : 'en';
    }
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => DICTS[locale][key] || DICTS.en[key] || key,
    }),
    [locale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      locale: 'en' as Locale,
      setLocale: (_: Locale) => {},
      t: (key: string) => DICTS.en[key] || key,
    };
  }
  return ctx;
}

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`inline-flex items-center gap-2 text-xs ${className}`}>
      <span className="opacity-70">{t('language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
      >
        <option value="en">English</option>
        <option value="fil">Filipino</option>
        <option value="ceb">Cebuano</option>
      </select>
    </label>
  );
}
