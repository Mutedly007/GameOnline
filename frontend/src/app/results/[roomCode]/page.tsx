'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { LobbyState, CATEGORIES, CategoryKey } from '@/lib/types';
import { useSettings } from '@/lib/SettingsContext';
import { t, getCategoryLabel } from '@/lib/i18n';
import { sounds } from '@/lib/sounds';

export default function ResultsPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();
  const socket = getSocket();
  const { lang, soundEnabled, setShowSettings } = useSettings();
  const playClick = () => { if (soundEnabled) sounds.click(); };

  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [tab, setTab] = useState<'answers' | 'scores'>('answers');

  const isHost = lobby?.hostId === socket.id;

  const handleUpdate = useCallback((data: LobbyState | { lobby: LobbyState }) => {
    const state = 'lobby' in data ? data.lobby : data;
    setLobby(state);
  }, []);

  useEffect(() => {
    socket.emit('getLobbyState', { roomCode });

    socket.on('lobbyState', handleUpdate);
    socket.on('endRound', handleUpdate);
    socket.on('voteUpdated', handleUpdate);
    socket.on('roundResults', handleUpdate);
    socket.on('gameStarted', () => router.push(`/game/${roomCode}`));
    socket.on('gameFinished', (data: LobbyState | { lobby: LobbyState }) => {
      handleUpdate(data);
      if (soundEnabled) sounds.victory();
    });

    return () => {
      socket.off('lobbyState');
      socket.off('endRound');
      socket.off('voteUpdated');
      socket.off('roundResults');
      socket.off('gameStarted');
      socket.off('gameFinished');
    };
  }, [roomCode, socket, router, handleUpdate]);

  const handleVote = (targetPlayerId: string, category: string) => {
    socket.emit('voteAnswer', { roomCode, targetPlayerId, category });
  };

  const handleFinishVoting = () => {
    socket.emit('finishVoting');
  };

  const handleNextRound = () => {
    socket.emit('nextRound');
  };

  const handlePlayAgain = () => {
    router.push('/');
  };

  if (!lobby) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">{t(lang, 'loadingResults')}</p>
      </div>
    );
  }

  // Game finished
  if (lobby.gamePhase === 'finished') {
    const sorted = Object.entries(lobby.cumulativeScores)
      .sort(([, a], [, b]) => b - a);
    const winnerId = sorted[0]?.[0];
    const winner = lobby.players.find((p) => p.id === winnerId);

    return (
      <div className="container fade-in">
        <div className="top-nav">
          <button className="nav-back" onClick={() => { playClick(); router.push('/'); }}>← {lang === 'fr' ? 'Accueil' : lang === 'ar' ? 'الرئيسية' : 'Home'}</button>
          <button className="nav-settings" onClick={() => { playClick(); setShowSettings(true); }}>⚙️</button>
        </div>

        <div className="finished-overlay">
          <div className="trophy">🏆</div>
          <h2>{t(lang, 'gameOver')}</h2>
          {winner && <div className="winner-name">{winner.name} {t(lang, 'wins')}</div>}
        </div>

        {/* Podium */}
        {sorted.length > 0 && (
          <div className="podium-container">
            {sorted[1] && (
              <div className="podium-place rank-2">
                <div className="podium-name">{lobby.players.find(p => p.id === sorted[1]?.[0])?.name}</div>
                <div className="podium-score">{sorted[1]?.[1]}pts</div>
                <div className="podium-bar">2</div>
              </div>
            )}
            {sorted[0] && (
              <div className="podium-place rank-1">
                <div className="podium-name">{lobby.players.find(p => p.id === sorted[0]?.[0])?.name}</div>
                <div className="podium-score">{sorted[0]?.[1]}pts</div>
                <div className="podium-bar">1</div>
              </div>
            )}
            {sorted[2] && (
              <div className="podium-place rank-3">
                <div className="podium-name">{lobby.players.find(p => p.id === sorted[2]?.[0])?.name}</div>
                <div className="podium-score">{sorted[2]?.[1]}pts</div>
                <div className="podium-bar">3</div>
              </div>
            )}
          </div>
        )}

        <div className="section-header">
          <h2>{t(lang, 'finalScores')}</h2>
        </div>

        <div className="scoreboard">
          {sorted.map(([playerId, score], i) => {
            const player = lobby.players.find((p) => p.id === playerId);
            return (
              <div key={playerId} className={`score-row ${i < 3 ? `rank-${i + 1}` : ''}`}>
                <div className="score-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <span className="score-name">{player?.name || 'Unknown'}</span>
                <span className="score-points">{score}pts</span>
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary mt-24" onClick={handlePlayAgain}>
          {t(lang, 'playAgain')}
        </button>
      </div>
    );
  }

  // Reviewing phase - show answers and voting
  const isReviewing = lobby.gamePhase === 'reviewing';
  const isResults = lobby.gamePhase === 'results';

  // Get last round results if available
  const lastRound = lobby.roundResults.length > 0
    ? lobby.roundResults[lobby.roundResults.length - 1]
    : null;

  const currentAnswers = isReviewing ? lobby.answers : (lastRound?.answers || []);
  const roundScores = lastRound?.scores || {};

  const sorted = Object.entries(lobby.cumulativeScores)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="container fade-in">
      <div className="top-nav">
        <button className="nav-back" onClick={() => { playClick(); router.push('/'); }}>← {lang === 'fr' ? 'Accueil' : lang === 'ar' ? 'الرئيسية' : 'Home'}</button>
        <button className="nav-settings" onClick={() => { playClick(); setShowSettings(true); }}>⚙️</button>
      </div>

      <div className="round-info">
        <span>{t(lang, 'round')}</span>
        <strong>{lobby.currentRound} / {lobby.totalRounds}</strong>
        <span>·</span>
        <span>{t(lang, 'letter')}: <strong>{lobby.currentLetter}</strong></span>
      </div>

      {/* Tabs */}
      <div className="tab-group">
        <button
          className={`tab-btn ${tab === 'answers' ? 'active' : ''}`}
          onClick={() => setTab('answers')}
        >
          {isReviewing ? t(lang, 'review') : t(lang, 'answers')}
        </button>
        <button
          className={`tab-btn ${tab === 'scores' ? 'active' : ''}`}
          onClick={() => setTab('scores')}
        >
          {t(lang, 'scores')}
        </button>
      </div>

      {tab === 'answers' && (
        <div>
          {currentAnswers.map((answer) => {
            const playerRoundScore = roundScores[answer.playerId];
            return (
              <div key={answer.playerId} className="review-card slide-in">
                <div className="review-card-header">
                  <div className="player-avatar">
                    {answer.playerName.charAt(0).toUpperCase()}
                  </div>
                  <h3>{answer.playerName}</h3>
                  {playerRoundScore !== undefined && (
                    <span className="score-points" style={{ marginLeft: 'auto' }}>
                      +{playerRoundScore}pts
                    </span>
                  )}
                </div>

                <div className="review-answers">
                  {CATEGORIES.map((cat) => {
                    const value = answer.categories[cat.key as CategoryKey] || '';
                    const startsWithLetter = value.trim().toUpperCase().startsWith(lobby.currentLetter);
                    const isEmpty = !value.trim();

                    // Check if this answer is a duplicate
                    const duplicates = currentAnswers.filter(
                      (a) => a.categories[cat.key as CategoryKey]?.trim().toLowerCase() === value.trim().toLowerCase()
                        && value.trim() !== ''
                    ).length;

                    // Check if host rejected this answer
                    const voteEntry = lobby.votes.find(
                      (v) => v.playerId === answer.playerId && v.category === cat.key
                    );
                    const hostRejected = voteEntry?.votedInvalid.includes(lobby.hostId) || false;

                    let statusClass = '';
                    if (hostRejected) statusClass = 'answer-invalid';
                    else if (isEmpty || !startsWithLetter) statusClass = 'answer-invalid';
                    else if (duplicates > 1) statusClass = 'answer-duplicate';
                    else statusClass = 'answer-valid';

                    return (
                      <div key={cat.key} className="review-row">
                        <div>
                          <div className="review-category">{cat.emoji} {getCategoryLabel(lang, cat.key)}</div>
                          <div className={`review-answer ${statusClass}`}>
                            {value || '—'}
                          </div>
                        </div>
                        {isReviewing && isHost && (
                          <button
                            className={`vote-btn ${hostRejected ? 'voted' : 'approved'}`}
                            onClick={() => handleVote(answer.playerId, cat.key)}
                          >
                            {hostRejected ? '❌' : '✅'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {isHost && isReviewing && (
            <button className="btn btn-success mt-16" onClick={handleFinishVoting}>
              {t(lang, 'finishVoting')}
            </button>
          )}

          {isHost && isResults && (
            <button className="btn btn-primary mt-16" onClick={handleNextRound}>
              {lobby.currentRound >= lobby.totalRounds ? t(lang, 'finishGame') : t(lang, 'nextRound')}
            </button>
          )}

          {!isHost && (
            <p className="text-center text-muted text-sm mt-16">
              {isReviewing
                ? t(lang, 'voteHint')
                : t(lang, 'waitingHost')
              }
            </p>
          )}
        </div>
      )}

      {tab === 'scores' && (
        <div className="scoreboard">
          {sorted.map(([playerId, score], i) => {
            const player = lobby.players.find((p) => p.id === playerId);
            const roundScore = roundScores[playerId];
            return (
              <div key={playerId} className={`score-row ${i < 3 ? `rank-${i + 1}` : ''}`}>
                <div className="score-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <span className="score-name">{player?.name || 'Unknown'}</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="score-points">{score}pts</div>
                  {roundScore !== undefined && (
                    <div className="text-xs" style={{ color: 'var(--success)' }}>
                      +{roundScore} {t(lang, 'thisRound')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
