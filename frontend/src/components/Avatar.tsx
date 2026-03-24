'use client';

import { AvatarConfig } from '@/lib/types';

// Avatar item options
export const SKIN_COLORS = ['#f4c794', '#e8b56d', '#c68642', '#8d5524', '#5c3317'];
export const HATS = ['', '🎩', '🧢', '👑', '🎓', '⛑️'];
export const TOPS = ['👕', '👔', '🥋', '🧥', '👘', '🦺'];
export const GLASSES_LIST = ['', '🤓', '😎', '🥽', '🧐'];
export const MUSTACHES = ['', '🥸', '👨', '🧔'];

interface AvatarDisplayProps {
  avatar: AvatarConfig;
  size?: number;
  name?: string;
}

export function AvatarDisplay({ avatar, size = 48, name }: AvatarDisplayProps) {
  const skinColor = SKIN_COLORS[avatar.skinColor] || SKIN_COLORS[0];
  const hat = HATS[avatar.hat] || '';
  const top = TOPS[avatar.top] || TOPS[0];
  const glasses = GLASSES_LIST[avatar.glasses] || '';
  const mustache = MUSTACHES[avatar.mustache] || '';

  return (
    <div className="avatar-display" style={{ width: size, height: size }}>
      <div className="avatar-body" style={{ backgroundColor: skinColor, width: size, height: size }}>
        {name && <span className="avatar-initial">{name.charAt(0).toUpperCase()}</span>}
        {hat && <span className="avatar-hat">{hat}</span>}
        {glasses && <span className="avatar-glasses">{glasses}</span>}
        {mustache && <span className="avatar-mustache">{mustache}</span>}
      </div>
      {top && <span className="avatar-top">{top}</span>}
    </div>
  );
}

interface AvatarCustomizerProps {
  avatar: AvatarConfig;
  onChange: (update: Partial<AvatarConfig>) => void;
}

export function AvatarCustomizer({ avatar, onChange }: AvatarCustomizerProps) {
  return (
    <div className="avatar-customizer slide-in">
      <div className="customizer-preview">
        <AvatarDisplay avatar={avatar} size={80} />
      </div>

      <div className="customizer-rows">
        {/* Skin Color */}
        <div className="customizer-row">
          <span className="customizer-label">🎨</span>
          <div className="customizer-options">
            {SKIN_COLORS.map((color, i) => (
              <button
                key={i}
                className={`color-btn ${avatar.skinColor === i ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ skinColor: i })}
              />
            ))}
          </div>
        </div>

        {/* Hat */}
        <div className="customizer-row">
          <span className="customizer-label">🎩</span>
          <div className="customizer-options">
            {HATS.map((h, i) => (
              <button
                key={i}
                className={`item-btn ${avatar.hat === i ? 'active' : ''}`}
                onClick={() => onChange({ hat: i })}
              >
                {h || '✖️'}
              </button>
            ))}
          </div>
        </div>

        {/* Top */}
        <div className="customizer-row">
          <span className="customizer-label">👕</span>
          <div className="customizer-options">
            {TOPS.map((t, i) => (
              <button
                key={i}
                className={`item-btn ${avatar.top === i ? 'active' : ''}`}
                onClick={() => onChange({ top: i })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Glasses */}
        <div className="customizer-row">
          <span className="customizer-label">👓</span>
          <div className="customizer-options">
            {GLASSES_LIST.map((g, i) => (
              <button
                key={i}
                className={`item-btn ${avatar.glasses === i ? 'active' : ''}`}
                onClick={() => onChange({ glasses: i })}
              >
                {g || '✖️'}
              </button>
            ))}
          </div>
        </div>

        {/* Mustache */}
        <div className="customizer-row">
          <span className="customizer-label">🥸</span>
          <div className="customizer-options">
            {MUSTACHES.map((m, i) => (
              <button
                key={i}
                className={`item-btn ${avatar.mustache === i ? 'active' : ''}`}
                onClick={() => onChange({ mustache: i })}
              >
                {m || '✖️'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
