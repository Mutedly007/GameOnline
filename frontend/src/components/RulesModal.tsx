'use client';

import { useSettings } from '@/lib/SettingsContext';
import { t } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

interface RulesModalProps {
  showRules: boolean;
  setShowRules: (show: boolean) => void;
}

export default function RulesModal({ showRules, setShowRules }: RulesModalProps) {
  const { lang, soundEnabled } = useSettings();

  if (!showRules) return null;

  const playClick = () => {
    if (soundEnabled) sounds.click();
  };

  return (
    <div className="settings-overlay" onClick={() => setShowRules(false)}>
      <div className="settings-modal slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>📖 {t(lang, 'rules')}</h2>
          <button className="settings-close" onClick={() => { setShowRules(false); playClick(); }}>✕</button>
        </div>

        <div className="settings-body">
          <div className="rules-content">
            <h3>{t(lang, 'howToPlay')}</h3>
            <p>{t(lang, 'rulesText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}