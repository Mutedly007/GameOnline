'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getSocket } from '@/lib/socket';
import { LobbyState } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { t } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, soundEnabled, setShowSettings } = useSettings();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [totalRounds, setTotalRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);

  const playClick = () => { if (soundEnabled) sounds.click(); };

  useEffect(() => {
    const room = searchParams.get('room');
    if (room) {
      setRoomCode(room);
      setMode('join');
    }
  }, [searchParams]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('lobbyCreated', (lobby: LobbyState) => {
      setLoading(false);
      router.push(`/lobby/${lobby.roomCode}`);
    });

    socket.on('lobbyJoined', (lobby: LobbyState) => {
      setLoading(false);
      router.push(`/lobby/${lobby.roomCode}`);
    });

    socket.on('error', (data: { message: string }) => {
      setLoading(false);
      setError(data.message);
      if (soundEnabled) sounds.error();
    });

    return () => {
      socket.off('lobbyCreated');
      socket.off('lobbyJoined');
      socket.off('error');
    };
  }, [router, soundEnabled]);

  const handleCreate = () => {
    if (!playerName.trim()) {
      setError(t(lang, 'enterNameError'));
      if (soundEnabled) sounds.error();
      return;
    }
    setError('');
    setLoading(true);
    playClick();
    const socket = getSocket();
    socket.emit('createLobby', { playerName: playerName.trim(), timerDuration, totalRounds, maxPlayers });
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError(t(lang, 'enterNameError'));
      if (soundEnabled) sounds.error();
      return;
    }
    if (!roomCode.trim()) {
      setError(t(lang, 'enterCodeError'));
      if (soundEnabled) sounds.error();
      return;
    }
    setError('');
    setLoading(true);
    playClick();
    const socket = getSocket();
    socket.emit('joinLobby', { roomCode: roomCode.trim().toUpperCase(), playerName: playerName.trim() });
  };

  return (
    <div className="container">
      <div style={{ paddingTop: '40px' }}>
        {/* Settings Button */}
        <button className="settings-gear" onClick={() => { setShowSettings(true); playClick(); }}>
          ⚙️
        </button>

        <div className="logo">
          <h1>{t(lang, 'title')}</h1>
          <p className="subtitle">{t(lang, 'subtitle')}</p>
        </div>

        <p className="text-center text-sm text-muted mb-16" style={{ marginTop: '8px' }}>
          {t(lang, 'tagline')}
        </p>

        {error && <div className="error-msg">{error}</div>}

        {mode === 'menu' && (
          <div className="slide-in" style={{ marginTop: '32px' }}>
            <div className="input-group">
              <label>{t(lang, 'yourName')}</label>
              <input
                className="input"
                type="text"
                placeholder={t(lang, 'enterName')}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={() => { setMode('create'); playClick(); }}>
                {t(lang, 'createGame')}
              </button>
              <button className="btn btn-secondary" onClick={() => { setMode('join'); playClick(); }}>
                {t(lang, 'joinGame')}
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="slide-in" style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label>{t(lang, 'yourName')}</label>
              <input
                className="input"
                type="text"
                placeholder={t(lang, 'enterName')}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="input-group">
              <label>{t(lang, 'timer')}</label>
              <input className="input" type="number" min={30} max={180} value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))} />
            </div>

            <div className="input-group">
              <label>{t(lang, 'rounds')}</label>
              <input className="input" type="number" min={1} max={15} value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))} />
            </div>

            <div className="input-group">
              <label>{t(lang, 'maxPlayers')}</label>
              <input className="input" type="number" min={2} max={20} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
            </div>

            <button className="btn btn-primary mt-16" onClick={handleCreate} disabled={loading}>
              {loading ? t(lang, 'creating') : t(lang, 'createLobby')}
            </button>
            <button className="btn btn-secondary mt-8" onClick={() => { setMode('menu'); playClick(); }}>
              {t(lang, 'back')}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="slide-in" style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label>{t(lang, 'yourName')}</label>
              <input
                className="input"
                type="text"
                placeholder={t(lang, 'enterName')}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="input-group">
              <label>{t(lang, 'roomCode')}</label>
              <input
                className="input"
                type="text"
                placeholder={t(lang, 'enterCode')}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={5}
                style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <button className="btn btn-success mt-16" onClick={handleJoin} disabled={loading}>
              {loading ? t(lang, 'joining') : t(lang, 'joinLobby')}
            </button>
            <button className="btn btn-secondary mt-8" onClick={() => { setMode('menu'); playClick(); }}>
              {t(lang, 'back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container"><div className="logo"><h1>Bent w Weld</h1></div></div>}>
      <HomeContent />
    </Suspense>
  );
}
