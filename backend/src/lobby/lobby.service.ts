import { Injectable, Logger } from '@nestjs/common';
import { GameState, Player, Answer, VoteResult } from '../game/game.types';
import { GameService } from '../game/game.service';

@Injectable()
export class LobbyService {
  private readonly logger = new Logger(LobbyService.name);
  private lobbies: Map<string, GameState> = new Map();

  constructor(private readonly gameService: GameService) {}

  createLobby(hostName: string, hostSocketId: string, timerDuration = 60, totalRounds = 5, maxPlayers = 10): GameState {
    let roomCode: string;
    do {
      roomCode = this.gameService.generateRoomCode();
    } while (this.lobbies.has(roomCode));

    const host: Player = {
      id: hostSocketId,
      name: hostName,
      socketId: hostSocketId,
      isHost: true,
      isConnected: true,
      isReady: true,
      avatar: { skinColor: 0, hat: 0, top: 0, glasses: 0, mustache: 0 },
    };

    const gameState: GameState = {
      roomCode,
      players: [host],
      currentLetter: '',
      currentRound: 0,
      totalRounds,
      timerDuration,
      timerRemaining: 0,
      timerInterval: null,
      gamePhase: 'lobby',
      answers: [],
      votes: [],
      roundResults: [],
      cumulativeScores: { [hostSocketId]: 0 },
      hostId: hostSocketId,
      maxPlayers,
    };

    this.lobbies.set(roomCode, gameState);
    this.logger.log(`Lobby ${roomCode} created by ${hostName}`);
    return gameState;
  }

  joinLobby(roomCode: string, playerName: string, socketId: string): GameState | null {
    const lobby = this.lobbies.get(roomCode.toUpperCase());
    if (!lobby) return null;

    // Check if player is reconnecting
    const existing = lobby.players.find((p) => p.name === playerName);
    if (existing) {
      const oldSocketId = existing.socketId;
      existing.socketId = socketId;
      existing.id = socketId;
      existing.isConnected = true;

      // Update hostId if this reconnecting player is the host
      if (existing.isHost || lobby.hostId === oldSocketId) {
        lobby.hostId = socketId;
      }

      // Transfer cumulative score to new socketId
      if (oldSocketId !== socketId && lobby.cumulativeScores[oldSocketId] !== undefined) {
        lobby.cumulativeScores[socketId] = lobby.cumulativeScores[oldSocketId];
        delete lobby.cumulativeScores[oldSocketId];
      }

      return lobby;
    }

    if (lobby.gamePhase !== 'lobby') return null;

    // Check if lobby is full
    const connectedCount = lobby.players.filter((p) => p.isConnected).length;
    if (connectedCount >= (lobby.maxPlayers || 10)) return null;

    const player: Player = {
      id: socketId,
      name: playerName,
      socketId,
      isHost: false,
      isConnected: true,
      isReady: false,
      avatar: { skinColor: 0, hat: 0, top: 0, glasses: 0, mustache: 0 },
    };

    lobby.players.push(player);
    lobby.cumulativeScores[socketId] = 0;
    this.logger.log(`${playerName} joined lobby ${roomCode}`);
    return lobby;
  }

  leaveLobby(socketId: string): { roomCode: string; playerName: string; lobby: GameState } | null {
    for (const [roomCode, lobby] of this.lobbies.entries()) {
      const player = lobby.players.find((p) => p.socketId === socketId);
      if (player) {
        player.isConnected = false;

        // If host left and game is in lobby, remove the lobby
        if (player.isHost && lobby.gamePhase === 'lobby') {
          this.clearLobby(roomCode);
          return { roomCode, playerName: player.name, lobby };
        }

        // If all players disconnected, clean up
        if (lobby.players.every((p) => !p.isConnected)) {
          this.clearLobby(roomCode);
        }

        return { roomCode, playerName: player.name, lobby };
      }
    }
    return null;
  }

  getLobby(roomCode: string): GameState | null {
    return this.lobbies.get(roomCode.toUpperCase()) || null;
  }

  findLobbyBySocket(socketId: string): GameState | null {
    for (const lobby of this.lobbies.values()) {
      if (lobby.players.some((p) => p.socketId === socketId)) {
        return lobby;
      }
    }
    return null;
  }

  submitAnswers(roomCode: string, answer: Answer): GameState | null {
    const lobby = this.lobbies.get(roomCode);
    if (!lobby || lobby.gamePhase !== 'playing') return null;

    // Replace existing answer from same player
    const existingIdx = lobby.answers.findIndex((a) => a.playerId === answer.playerId);
    if (existingIdx >= 0) {
      lobby.answers[existingIdx] = answer;
    } else {
      lobby.answers.push(answer);
    }

    return lobby;
  }

  addVote(
    roomCode: string,
    targetPlayerId: string,
    category: string,
    voterId: string,
  ): GameState | null {
    const lobby = this.lobbies.get(roomCode);
    if (!lobby || lobby.gamePhase !== 'reviewing') return null;

    let voteEntry = lobby.votes.find(
      (v) => v.playerId === targetPlayerId && v.category === category,
    );

    if (!voteEntry) {
      voteEntry = { playerId: targetPlayerId, category, votedInvalid: [] };
      lobby.votes.push(voteEntry);
    }

    // Toggle vote
    const idx = voteEntry.votedInvalid.indexOf(voterId);
    if (idx >= 0) {
      voteEntry.votedInvalid.splice(idx, 1);
    } else {
      voteEntry.votedInvalid.push(voterId);
    }

    return lobby;
  }

  finishRound(roomCode: string): GameState | null {
    const lobby = this.lobbies.get(roomCode);
    if (!lobby) return null;

    const roundScores = this.gameService.calculateScores(
      lobby.answers,
      lobby.votes,
      lobby.currentLetter,
      lobby.hostId,
    );

    // Add to cumulative scores
    for (const [playerId, score] of Object.entries(roundScores)) {
      lobby.cumulativeScores[playerId] = (lobby.cumulativeScores[playerId] || 0) + score;
    }

    lobby.roundResults.push({
      letter: lobby.currentLetter,
      answers: [...lobby.answers],
      scores: roundScores,
    });

    lobby.gamePhase = 'results';
    return lobby;
  }

  startNextRound(roomCode: string): GameState | null {
    const lobby = this.lobbies.get(roomCode);
    if (!lobby) return null;

    if (lobby.currentRound >= lobby.totalRounds) {
      lobby.gamePhase = 'finished';
      return lobby;
    }

    lobby.currentRound++;
    lobby.currentLetter = this.gameService.generateLetter(roomCode);
    lobby.answers = [];
    lobby.votes = [];
    lobby.gamePhase = 'letterPreview';
    lobby.timerRemaining = lobby.timerDuration;

    return lobby;
  }

  clearLobby(roomCode: string): void {
    const lobby = this.lobbies.get(roomCode);
    if (lobby?.timerInterval) {
      clearInterval(lobby.timerInterval);
    }
    this.gameService.clearRoom(roomCode);
    this.lobbies.delete(roomCode);
    this.logger.log(`Lobby ${roomCode} cleared`);
  }

  getPublicState(lobby: GameState) {
    return {
      roomCode: lobby.roomCode,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isConnected: p.isConnected,
        isReady: p.isReady,
        avatar: p.avatar,
      })),
      currentLetter: lobby.currentLetter,
      currentRound: lobby.currentRound,
      totalRounds: lobby.totalRounds,
      timerDuration: lobby.timerDuration,
      timerRemaining: lobby.timerRemaining,
      gamePhase: lobby.gamePhase,
      answers: lobby.gamePhase === 'reviewing' || lobby.gamePhase === 'results' ? lobby.answers : [],
      votes: lobby.votes,
      roundResults: lobby.roundResults,
      cumulativeScores: lobby.cumulativeScores,
      hostId: lobby.hostId,
      maxPlayers: lobby.maxPlayers,
    };
  }
}
