'use client';

import { useSettings } from '@/lib/SettingsContext';
import { t, Language } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

export default function SettingsModal() {
  const {
    soundEnabled, setSoundEnabled,
    notificationsEnabled, setNotificationsEnabled,
    theme, setTheme,
    lang, setLang,
    showSettings, setShowSettings,
  } = useSettings();

  if (!showSettings) return null;

  const playClick = () => {
    if (soundEnabled) sounds.click();
  };

  const langOptions: { value: Language; label: string }[] = [
    { value: 'en', label: '🇬🇧 English' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'ar', label: '🇹🇳 العربية' },
  ];

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-modal slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ {t(lang, 'settings' as any) || 'Settings'}</h2>
          <button className="settings-close" onClick={() => setShowSettings(false)}>✕</button>
        </div>

        <div className="settings-body">
          {/* Language */}
          <div className="settings-section">
            <div className="settings-label">{t(lang, 'language')}</div>
            <div className="lang-selector" style={{ marginBottom: 0 }}>
              {langOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`lang-btn ${lang === opt.value ? 'active' : ''}`}
                  onClick={() => { setLang(opt.value); playClick(); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="settings-section">
            <div className="settings-label">🎨 {lang === 'fr' ? 'Thème' : lang === 'ar' ? 'المظهر' : 'Theme'}</div>
            <div className="settings-toggle-group">
              <button
                className={`toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { setTheme('dark'); playClick(); }}
              >
                🌙 {lang === 'fr' ? 'Sombre' : lang === 'ar' ? 'داكن' : 'Dark'}
              </button>
              <button
                className={`toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { setTheme('light'); playClick(); }}
              >
                ☀️ {lang === 'fr' ? 'Clair' : lang === 'ar' ? 'فاتح' : 'Light'}
              </button>
            </div>
          </div>

          {/* Sound Effects */}
          <div className="settings-section">
            <div className="settings-row">
              <div className="settings-label">🔊 {lang === 'fr' ? 'Effets sonores' : lang === 'ar' ? 'المؤثرات الصوتية' : 'Sound Effects'}</div>
              <button
                className={`switch-btn ${soundEnabled ? 'on' : ''}`}
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) sounds.click();
                }}
              >
                <div className="switch-thumb" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-section">
            <div className="settings-row">
              <div className="settings-label">🔔 {lang === 'fr' ? 'Notifications' : lang === 'ar' ? 'الإشعارات' : 'Notifications'}</div>
              <button
                className={`switch-btn ${notificationsEnabled ? 'on' : ''}`}
                onClick={() => { setNotificationsEnabled(!notificationsEnabled); playClick(); }}
              >
                <div className="switch-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
