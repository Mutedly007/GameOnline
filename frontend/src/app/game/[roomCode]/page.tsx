'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { LobbyState, CATEGORIES } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { t, getCategoryLabel } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

export default function GamePage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();
  const socket = getSocket();
  const { lang, soundEnabled } = useSettings();

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [timer, setTimer] = useState(60);
  const [answers, setAnswers] = useState<Record<string, string>>({
    girl: '', boy: '', animal: '', plant: '', object: '', country: '', job: '', famous: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [letterPreview, setLetterPreview] = useState<LobbyState | null>(null);
  const [disbandedMsg, setDisbandedMsg] = useState('');
  const [spinningLetter, setSpinningLetter] = useState('');
  const [spinDone, setSpinDone] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const answersRef = useRef(answers);
  const submittedRef = useRef(submitted);
  const disbandedRef = useRef(disbandedMsg);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { disbandedRef.current = disbandedMsg; }, [disbandedMsg]);

  const isHost = lobby?.hostId === socket.id || letterPreview?.hostId === socket.id;

  // Countdown with sounds
  useEffect(() => {
    if (countdown === null) {
      inputRefs.current[CATEGORIES[0].key]?.focus();
      return;
    }
    if (countdown > 0) {
      if (soundEnabled) sounds.countdownTick();
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      if (soundEnabled) sounds.countdownGo();
      const t = setTimeout(() => setCountdown(null), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown, soundEnabled]);

  const [leaveNotice, setLeaveNotice] = useState('');

  // Slot-machine letter spin animation
  const ALL_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY';
  useEffect(() => {
    if (!letterPreview) return;

    const target = letterPreview.currentLetter;
    setSpinDone(false);
    setSpinningLetter('');

    // Schedule ~20 rapid cycles that decelerate
    const totalSteps = 20;
    let step = 0;
    let timeout: NodeJS.Timeout;

    const spin = () => {
      step++;
      if (step >= totalSteps) {
        // Final — land on the real letter
        setSpinningLetter(target);
        setSpinDone(true);
        return;
      }
      // Pick a random letter (avoid showing the target too early)
      let randLetter = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
      if (step < totalSteps - 3 && randLetter === target) {
        randLetter = ALL_LETTERS[(ALL_LETTERS.indexOf(randLetter) + 1) % ALL_LETTERS.length];
      }
      setSpinningLetter(randLetter);

      // Decelerate: start at 50ms, end at ~200ms
      const delay = 50 + Math.pow(step / totalSteps, 2) * 200;
      timeout = setTimeout(spin, delay);
    };

    // Start after a tiny delay
    timeout = setTimeout(spin, 100);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterPreview?.currentLetter, letterPreview?.currentRound]);

  const handleEndRound = useCallback((data: { lobby: LobbyState }) => {
    setLobby(data.lobby);
    if (soundEnabled) sounds.roundEnd();
    router.push(`/results/${roomCode}`);
  }, [router, roomCode, soundEnabled]);

  useEffect(() => {
    const playerName = typeof window !== 'undefined' ? sessionStorage.getItem('playerName') || '' : '';
    socket.emit('getLobbyState', { roomCode, playerName });

    socket.on('lobbyState', (data: LobbyState) => {
      setLobby(data);
      setTimer(data.timerRemaining);
      // If we reconnect into a letterPreview phase, show it
      if (data.gamePhase === 'letterPreview') {
        setLetterPreview(data);
      }
    });

    // Letter preview — show letter with skip/confirm options
    socket.on('letterPreview', (data: LobbyState) => {
      setLobby(data);
      setLetterPreview(data);
      setSubmitted(false);
      setAnswers({ girl: '', boy: '', animal: '', plant: '', object: '', country: '', job: '', famous: '' });
      if (soundEnabled) sounds.click();
    });

    socket.on('gameStarted', (data: LobbyState) => {
      setLobby(data);
      setLetterPreview(null); // Hide preview
      setTimer(data.timerRemaining);
      setSubmitted(false);
      setAnswers({ girl: '', boy: '', animal: '', plant: '', object: '', country: '', job: '', famous: '' });
      setCountdown(3);
    });

    socket.on('timerUpdate', (data: { remaining: number }) => {
      setTimer(data.remaining);
      if (data.remaining <= 5 && data.remaining > 0 && soundEnabled) sounds.timerWarning();
    });

    socket.on('playerSubmitted', (data: { totalSubmitted: number; totalPlayers: number }) => {
      setSubmittedCount(data.totalSubmitted);
      setTotalPlayers(data.totalPlayers);
    });

    socket.on('endRound', handleEndRound);

    socket.on('forceSubmit', () => {
      if (!submittedRef.current) {
        socket.emit('submitAnswers', { roomCode, categories: answersRef.current });
        setSubmitted(true);
      }
    });

    socket.on('playerLeft', (data: { playerName: string; lobby: LobbyState }) => {
      setLobby(data.lobby);
      const msg = `${data.playerName} ${lang === 'fr' ? 'a quitté la partie' : lang === 'ar' ? 'غادر اللعبة' : 'left the game'}`;
      setLeaveNotice(msg);

      // If game finished because player left, show disbanded screen
      if (data.lobby.gamePhase === 'finished') {
        setDisbandedMsg(msg);
        if (soundEnabled) sounds.error();
        // Redirect to home after a delay
        setTimeout(() => {
          router.push('/');
        }, 4000);
      } else {
        setTimeout(() => setLeaveNotice(''), 4000);
      }
    });

    socket.on('gameFinished', (data: { lobby: LobbyState }) => {
      setLobby(data.lobby);
      // Only redirect if not already showing disbanded screen
      if (!disbandedRef.current) {
        router.push(`/results/${roomCode}`);
      }
    });

    return () => {
      socket.off('lobbyState');
      socket.off('letterPreview');
      socket.off('gameStarted');
      socket.off('timerUpdate');
      socket.off('playerSubmitted');
      socket.off('endRound');
      socket.off('forceSubmit');
      socket.off('playerLeft');
      socket.off('gameFinished');
    };
  }, [roomCode, socket, handleEndRound, soundEnabled, lang]);

  const handleSubmit = () => {
    if (submitted) return;
    const allFilled = Object.values(answers).every((v) => v.trim() !== '');
    if (!allFilled) {
      setSubmitError(lang === 'fr' ? 'Remplissez tous les champs !' : lang === 'ar' ? 'املأ جميع الحقول!' : 'Fill in all fields!');
      if (soundEnabled) sounds.error();
      return;
    }
    setSubmitError('');
    if (soundEnabled) sounds.submit();
    socket.emit('submitAnswers', { roomCode, categories: answers });
    setSubmitted(true);
  };

  const handleInputChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (submitError) setSubmitError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      const cats = CATEGORIES.map((c) => c.key);
      if (index < cats.length - 1) inputRefs.current[cats[index + 1]]?.focus();
      else handleSubmit();
    }
  };

  const handleSkipLetter = () => {
    if (soundEnabled) sounds.click();
    socket.emit('skipLetter');
  };

  const handleConfirmLetter = () => {
    if (soundEnabled) sounds.click();
    socket.emit('confirmLetter');
  };

  const circumference = 2 * Math.PI * 52;
  const timerDuration = lobby?.timerDuration || 60;
  const progress = (timer / timerDuration) * circumference;
  const isUrgent = timer <= 10;

  // ── Game Disbanded Screen ──
  if (disbandedMsg) {
    return (
      <div className="container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🚪</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
          {lang === 'fr' ? 'Partie annulée' : lang === 'ar' ? 'اللعبة ألغيت' : 'Game Disbanded'}
        </h2>
        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>
          {disbandedMsg}
        </p>
        <p className="text-muted text-sm">
          {lang === 'fr' ? 'Retour à l\'accueil...' : lang === 'ar' ? 'العودة إلى الصفحة الرئيسية...' : 'Returning to home...'}
        </p>
        <button className="btn btn-primary mt-24" onClick={() => router.push('/')}>
          {lang === 'fr' ? 'Accueil' : lang === 'ar' ? 'الرئيسية' : 'Go Home'}
        </button>
      </div>
    );
  }

  // ── Letter Preview Screen ──
  if (letterPreview) {
    return (
      <div className="container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="round-info">
          <span>{t(lang, 'round')}</span>
          <strong>{letterPreview.currentRound || 1} / {letterPreview.totalRounds || 5}</strong>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
            {spinDone
              ? (lang === 'fr' ? 'La lettre de ce tour est...' : lang === 'ar' ? 'حرف هذه الجولة هو...' : 'This round\'s letter is...')
              : (lang === 'fr' ? 'Choix de la lettre...' : lang === 'ar' ? 'اختيار الحرف...' : 'Picking a letter...')}
          </p>
        </div>

        <div className="letter-display" style={{ margin: '24px 0' }}>
          <div
            className={`letter-badge ${spinDone ? 'pop-in' : ''}`}
            style={{
              fontSize: '4rem',
              width: '120px',
              height: '120px',
              lineHeight: '120px',
              transition: spinDone ? 'transform 0.3s ease' : 'none',
              transform: spinDone ? 'scale(1.15)' : 'scale(1)',
              opacity: spinningLetter ? 1 : 0.3,
            }}
          >
            {spinningLetter || '?'}
          </div>
        </div>

        {/* Players list */}
        <div style={{ width: '100%', maxWidth: '360px', margin: '16px auto' }}>
          <div className="section-header">
            <h2 style={{ fontSize: '1rem' }}>
              {lang === 'fr' ? 'Joueurs' : lang === 'ar' ? 'اللاعبون' : 'Players'}
            </h2>
          </div>
          <ul className="player-list" style={{ marginBottom: '16px' }}>
            {letterPreview.players.filter(p => p.isConnected).map((player) => (
              <li key={player.id} className="player-item" style={{ padding: '8px 12px' }}>
                <div className="player-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="player-name" style={{ fontSize: '0.9rem' }}>{player.name}</span>
                {player.isHost && <span className="player-badge badge-host">{t(lang, 'host')}</span>}
                {player.id === socket.id && <span className="player-badge badge-you">{t(lang, 'you')}</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost && spinDone ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }} className="fade-in">
            <button className="btn btn-primary" onClick={handleConfirmLetter} style={{ fontSize: '1.1rem', padding: '14px 24px' }}>
              ✅ {lang === 'fr' ? 'Jouer avec cette lettre' : lang === 'ar' ? 'العب بهذا الحرف' : 'Play with this letter'}
            </button>
            <button className="btn btn-secondary" onClick={handleSkipLetter} style={{ fontSize: '1rem' }}>
              🔄 {lang === 'fr' ? 'Changer la lettre' : lang === 'ar' ? 'غيّر الحرف' : 'Skip — different letter'}
            </button>
          </div>
        ) : (
          spinDone ? (
            <div className="text-center fade-in" style={{ marginTop: '12px' }}>
              <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                ⏳ {lang === 'fr' ? 'L\'hôte choisit la lettre...' : lang === 'ar' ? 'المضيف يختار الحرف...' : 'Host is choosing the letter...'}
              </p>
            </div>
          ) : null
        )}
      </div>

    );
  }


  return (
    <div className="container fade-in">
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-number pop-in" key={countdown}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {leaveNotice && (
        <div className="toast-notice">
          🚪 {leaveNotice}
        </div>
      )}

      <div className="round-info">
        <span>{t(lang, 'round')}</span>
        <strong>{lobby?.currentRound || 1} / {lobby?.totalRounds || 5}</strong>
      </div>

      <div className="letter-display">
        <div className="letter-badge">{lobby?.currentLetter || '?'}</div>
      </div>

      <div className="timer-container">
        <div className="timer-circle">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isUrgent ? '#ef4444' : '#7c5cff'} />
                <stop offset="100%" stopColor={isUrgent ? '#dc2626' : '#f472b6'} />
              </linearGradient>
            </defs>
            <circle className="track" cx="60" cy="60" r="52" />
            <circle className="progress" cx="60" cy="60" r="52" strokeDasharray={circumference} strokeDashoffset={circumference - progress} />
          </svg>
          <div className={`timer-value ${isUrgent ? 'urgent' : ''}`}>{timer}</div>
        </div>
      </div>

      {submittedCount > 0 && (
        <div className="text-center mb-16">
          <span className="submitted-count">✅ {submittedCount}/{totalPlayers} {t(lang, 'submitted')}</span>
        </div>
      )}

      {!submitted ? (
        <>
          <div className="category-grid">
            {CATEGORIES.map((cat, index) => (
              <div key={cat.key} className="category-item slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="category-icon">{cat.emoji}</div>
                <div className="category-input">
                  <div className="category-label">{getCategoryLabel(lang, cat.key)}</div>
                  <input
                    ref={(el) => { inputRefs.current[cat.key] = el; }}
                    className="input"
                    type="text"
                    placeholder={`${getCategoryLabel(lang, cat.key)}...`}
                    value={answers[cat.key]}
                    onChange={(e) => handleInputChange(cat.key, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    autoComplete="off"
                    autoCapitalize="words"
                  />
                </div>
              </div>
            ))}
          </div>
          {submitError && <div className="error-msg mt-8">{submitError}</div>}
          <button className="btn btn-success mt-24" onClick={handleSubmit}>{t(lang, 'submitAnswers')}</button>
          <button className="btn btn-secondary mt-8" onClick={() => { if (soundEnabled) sounds.click(); router.push('/'); }}>
            🚪 {lang === 'fr' ? 'Quitter la partie' : lang === 'ar' ? 'مغادرة اللعبة' : 'Leave Game'}
          </button>
        </>
      ) : (
        <div className="text-center mt-24 slide-in">
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
          <h3 className="fw-700">{t(lang, 'answersSubmitted')}</h3>
          <p className="text-sm text-muted mt-8">{t(lang, 'waitingOthers')}</p>
        </div>
      )}
    </div>
  );
}

