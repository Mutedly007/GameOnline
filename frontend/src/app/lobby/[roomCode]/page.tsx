'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { getSocket } from '@/lib/socket';
import { LobbyState } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { t } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

export default function LobbyPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();
  const { lang, soundEnabled, setShowSettings } = useSettings();
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const socket = getSocket();
  const isHost = lobby?.hostId === socket.id;
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${roomCode}`
    : '';
  const myPlayer = lobby?.players.find((p) => p.id === socket.id);
  const amReady = myPlayer?.isReady || false;

  // Get player name from sessionStorage (set when creating/joining)
  const getPlayerName = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('playerName') || '';
    }
    return '';
  };

  const playClick = () => { if (soundEnabled) sounds.click(); };

  const handleLobbyUpdate = useCallback((data: LobbyState) => {
    setLobby(data);
    setError(''); // Clear stale errors on any lobby state update
  }, []);

  useEffect(() => {
    const playerName = getPlayerName();
    socket.emit('getLobbyState', { roomCode, playerName });

    socket.on('lobbyState', handleLobbyUpdate);
    socket.on('playerJoined', (data: LobbyState) => {
      handleLobbyUpdate(data);
      if (soundEnabled) sounds.click();
    });
    socket.on('playerLeft', (data: { lobby: LobbyState }) => setLobby(data.lobby));
    socket.on('gameStarted', () => {
      router.push(`/game/${roomCode}`);
    });
    socket.on('letterPreview', () => {
      router.push(`/game/${roomCode}`);
    });
    socket.on('error', (data: { message: string }) => setError(data.message));

    socket.on('playerKicked', () => {
      playClick();
      setError(lang === 'fr' ? 'Vous avez été expulsé du lobby!' : lang === 'ar' ? 'تم طردك من الغرفة!' : 'You were kicked from the lobby!');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    });

    // Re-request lobby state on socket reconnect so we rejoin the room
    const handleReconnect = () => {
      const name = getPlayerName();
      socket.emit('getLobbyState', { roomCode, playerName: name });
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('lobbyState');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('gameStarted');
      socket.off('letterPreview');
      socket.off('error');
      socket.off('playerKicked');
      socket.off('connect', handleReconnect);
    };
  }, [roomCode, socket, router, handleLobbyUpdate, soundEnabled]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const startGame = () => {
    setError(''); // Clear previous error before attempting
    playClick();
    socket.emit('startGame');
  };

  const toggleReady = () => {
    setError('');
    playClick();
    socket.emit('toggleReady');
  };

  const kickPlayer = (playerId: string) => {
    setError('');
    playClick();
    socket.emit('kickPlayer', { playerId });
  };

  if (!lobby) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">{t(lang, 'connectingLobby')}</p>
      </div>
    );
  }

  const connectedPlayers = lobby.players.filter((p) => p.isConnected);
  const allReady = connectedPlayers.every((p) => p.isReady);
  const readyCount = connectedPlayers.filter((p) => p.isReady).length;

  return (
    <div className="container fade-in">
      <div className="top-nav">
        <button className="nav-back" onClick={() => { playClick(); router.push('/'); }}>← {lang === 'fr' ? 'Accueil' : lang === 'ar' ? 'الرئيسية' : 'Home'}</button>
        <button className="nav-settings" onClick={() => { playClick(); setShowSettings(true); }}>⚙️</button>
      </div>

      <div className="status-bar">
        <div className="status-dot"></div>
        <span className="status-text">{t(lang, 'waitingForPlayers')}</span>
      </div>

      <div className="room-code-display">
        <p className="text-sm text-muted mb-8">{t(lang, 'roomCodeLabel')}</p>
        <div className="room-code">{roomCode}</div>
      </div>

      <div className="qr-container">
        <QRCodeSVG value={joinUrl} size={140} bgColor="#ffffff" fgColor="#0a0a1a" level="M" includeMargin={false} />
        <p>{t(lang, 'scanToJoin')}</p>
      </div>

      <div className="share-link" onClick={copyLink}>
        <span>{joinUrl}</span>
        <span className="copy-icon">{copied ? '✅' : '📋'}</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="section-header" style={{ marginTop: '16px' }}>
        <h2>{t(lang, 'players')}</h2>
        <span className="count">{readyCount}/{connectedPlayers.length} {lang === 'fr' ? 'prêts' : lang === 'ar' ? 'جاهزون' : 'ready'}</span>
      </div>

      <ul className="player-list">
        {connectedPlayers.map((player) => (
          <li key={player.id} className="player-item">
            <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
            <span className="player-name">{player.name}</span>
            {player.isHost && <span className="player-badge badge-host">{t(lang, 'host')}</span>}
            {player.id === socket.id && <span className="player-badge badge-you">{t(lang, 'you')}</span>}
            <span className={`ready-badge ${player.isReady ? 'ready-yes' : 'ready-no'}`}>
              {player.isReady
                ? (lang === 'fr' ? 'Prêt' : lang === 'ar' ? 'جاهز' : 'Ready')
                : (lang === 'fr' ? 'Pas prêt' : lang === 'ar' ? 'غير جاهز' : 'Not ready')}
            </span>
            {isHost && player.id !== socket.id && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => kickPlayer(player.id)}
                style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                title={t(lang, 'kickPlayer')}
              >
                🚪 {t(lang, 'kick')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Big clear Ready / Not Ready toggle */}
      <div style={{ marginTop: '20px' }}>
        <button
          className={`btn ready-toggle-btn ${amReady ? 'ready-toggle-on' : 'ready-toggle-off'}`}
          onClick={toggleReady}
        >
          {amReady
            ? (lang === 'fr' ? '🟢 Vous êtes PRÊT — Appuyez pour annuler' : lang === 'ar' ? '🟢 أنت جاهز — اضغط للإلغاء' : '🟢 You are READY — Tap to unready')
            : (lang === 'fr' ? '🔴 Appuyez quand vous êtes PRÊT' : lang === 'ar' ? '🔴 اضغط عندما تكون جاهزًا' : '🔴 Tap when you are READY')}
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        {isHost ? (
          <button className="btn btn-primary" onClick={startGame} disabled={!allReady || connectedPlayers.length < 2}>
            {t(lang, 'startGame')} ({connectedPlayers.length}/{lobby.maxPlayers})
          </button>
        ) : (
          <p className="text-center text-muted text-sm">{t(lang, 'waitingForHost')}</p>
        )}
      </div>

      {isHost && !allReady && connectedPlayers.length >= 2 && (
        <p className="text-center text-xs text-muted mt-8">
          ⏳ {lang === 'fr' ? 'En attente que tous soient prêts...' : lang === 'ar' ? 'في انتظار استعداد الجميع...' : 'Waiting for all players to be ready...'}
        </p>
      )}

      <div style={{ marginTop: '12px' }}>
        <p className="text-center text-xs text-muted">
          ⏱ {lobby.timerDuration}s {t(lang, 'perRound')} · {lobby.totalRounds} {t(lang, 'roundsLabel')}
        </p>
      </div>
    </div>
  );
}
