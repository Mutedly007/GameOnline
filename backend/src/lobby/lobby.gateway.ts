import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LobbyGateway.name);

  constructor(private readonly lobbyService: LobbyService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const result = this.lobbyService.leaveLobby(client.id);
    if (result) {
      const { lobby, roomCode, playerName } = result;
      const connectedPlayers = lobby.players.filter((p) => p.isConnected);
      const isInGame = ['playing', 'reviewing', 'results'].includes(lobby.gamePhase);

      // Always notify remaining players who left
      this.server.to(roomCode).emit('playerLeft', {
        playerName,
        lobby: this.lobbyService.getPublicState(lobby),
      });

      // If only 1 player left during a game, end the game
      if (isInGame && connectedPlayers.length <= 1) {
        if (lobby.timerInterval) {
          clearInterval(lobby.timerInterval);
          lobby.timerInterval = null;
        }
        lobby.gamePhase = 'finished';
        this.server.to(roomCode).emit('gameFinished', {
          lobby: this.lobbyService.getPublicState(lobby),
        });
        this.logger.log(`Game ${roomCode} ended: only 1 player remaining after ${playerName} left`);
      }
    }
  }

  @SubscribeMessage('createLobby')
  handleCreateLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerName: string; timerDuration?: number; totalRounds?: number; maxPlayers?: number },
  ) {
    const lobby = this.lobbyService.createLobby(
      data.playerName,
      client.id,
      data.timerDuration || 60,
      data.totalRounds || 5,
      data.maxPlayers || 10,
    );
    client.join(lobby.roomCode);
    client.emit('lobbyCreated', this.lobbyService.getPublicState(lobby));
    this.logger.log(`Lobby created: ${lobby.roomCode}`);
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerName: string },
  ) {
    const lobby = this.lobbyService.joinLobby(data.roomCode, data.playerName, client.id);

    if (!lobby) {
      client.emit('error', { message: 'Room not found, game already started, or lobby is full' });
      return;
    }

    client.join(lobby.roomCode);
    const publicState = this.lobbyService.getPublicState(lobby);
    client.emit('lobbyJoined', publicState);
    this.server.to(lobby.roomCode).emit('playerJoined', publicState);
    this.logger.log(`${data.playerName} joined ${data.roomCode}`);
  }

  @SubscribeMessage('startGame')
  handleStartGame(@ConnectedSocket() client: Socket) {
    const lobby = this.lobbyService.findLobbyBySocket(client.id);
    if (!lobby || lobby.hostId !== client.id) {
      client.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    const connectedPlayers = lobby.players.filter((p) => p.isConnected);
    if (connectedPlayers.length < 2) {
      client.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    const allReady = connectedPlayers.every((p) => p.isReady);
    if (!allReady) {
      client.emit('error', { message: 'All players must be ready' });
      return;
    }

    const updatedLobby = this.lobbyService.startNextRound(lobby.roomCode);
    if (!updatedLobby) return;

    const publicState = this.lobbyService.getPublicState(updatedLobby);
    this.server.to(lobby.roomCode).emit('gameStarted', publicState);

    // Start server-controlled timer
    this.startTimer(lobby.roomCode);
  }

  @SubscribeMessage('toggleReady')
  handleToggleReady(@ConnectedSocket() client: Socket) {
    const lobby = this.lobbyService.findLobbyBySocket(client.id);
    if (!lobby || lobby.gamePhase !== 'lobby') return;

    const player = lobby.players.find((p) => p.socketId === client.id);
    if (!player) return;

    player.isReady = !player.isReady;
    this.server.to(lobby.roomCode).emit('lobbyState', this.lobbyService.getPublicState(lobby));
  }

  @SubscribeMessage('updateAvatar')
  handleUpdateAvatar(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { skinColor?: number; hat?: number; top?: number; glasses?: number; mustache?: number },
  ) {
    const lobby = this.lobbyService.findLobbyBySocket(client.id);
    if (!lobby || lobby.gamePhase !== 'lobby') return;

    const player = lobby.players.find((p) => p.socketId === client.id);
    if (!player) return;

    if (data.skinColor !== undefined) player.avatar.skinColor = data.skinColor;
    if (data.hat !== undefined) player.avatar.hat = data.hat;
    if (data.top !== undefined) player.avatar.top = data.top;
    if (data.glasses !== undefined) player.avatar.glasses = data.glasses;
    if (data.mustache !== undefined) player.avatar.mustache = data.mustache;

    this.server.to(lobby.roomCode).emit('lobbyState', this.lobbyService.getPublicState(lobby));
  }

  private startTimer(roomCode: string) {
    const lobby = this.lobbyService.getLobby(roomCode);
    if (!lobby) return;

    if (lobby.timerInterval) {
      clearInterval(lobby.timerInterval);
    }

    // Delay timer start by 4s to allow 3-2-1-GO countdown animation
    setTimeout(() => {
      const currentLobby = this.lobbyService.getLobby(roomCode);
      if (!currentLobby || currentLobby.gamePhase !== 'playing') return;

      currentLobby.timerInterval = setInterval(() => {
        currentLobby.timerRemaining--;
        this.server.to(roomCode).emit('timerUpdate', {
          remaining: currentLobby.timerRemaining,
        });

        if (currentLobby.timerRemaining <= 0) {
          clearInterval(currentLobby.timerInterval!);
          currentLobby.timerInterval = null;

          // Tell all clients to submit their current answers NOW
          this.server.to(roomCode).emit('forceSubmit');

          // Wait 1s for clients to send their answers, then fill empty for stragglers
          setTimeout(() => {
            const lobbyNow = this.lobbyService.getLobby(roomCode);
            if (!lobbyNow || lobbyNow.gamePhase !== 'playing') return;

            const connectedPlayers = lobbyNow.players.filter((p) => p.isConnected);
            for (const player of connectedPlayers) {
              const hasSubmitted = lobbyNow.answers.some((a) => a.playerId === player.socketId);
              if (!hasSubmitted) {
                lobbyNow.answers.push({
                  playerId: player.socketId,
                  playerName: player.name,
                  categories: { girl: '', boy: '', animal: '', plant: '', object: '', country: '', job: '', famous: '' } as any,
                });
              }
            }

            lobbyNow.gamePhase = 'reviewing';
            this.server.to(roomCode).emit('endRound', {
              lobby: this.lobbyService.getPublicState(lobbyNow),
            });
          }, 1000);
        }
      }, 1000);
    }, 4000);
  }

  @SubscribeMessage('submitAnswers')
  handleSubmitAnswers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; categories: Record<string, string> },
  ) {
    const lobby = this.lobbyService.getLobby(data.roomCode);
    if (!lobby) return;

    const player = lobby.players.find((p) => p.socketId === client.id);
    if (!player) return;

    this.lobbyService.submitAnswers(data.roomCode, {
      playerId: client.id,
      playerName: player.name,
      categories: data.categories as any,
    });

    // Notify others that this player submitted
    this.server.to(data.roomCode).emit('playerSubmitted', {
      playerId: client.id,
      playerName: player.name,
      totalSubmitted: lobby.answers.length,
      totalPlayers: lobby.players.filter((p) => p.isConnected).length,
    });

    // If this is the first submission, and there are more than 1 player, force everyone else to submit
    const connectedPlayers = lobby.players.filter((p) => p.isConnected).length;
    if (lobby.answers.length === 1 && connectedPlayers > 1) {
      this.server.to(data.roomCode).emit('forceSubmit');
    }

    // If all players submitted, end round early
    if (lobby.answers.length >= connectedPlayers) {
      if (lobby.timerInterval) {
        clearInterval(lobby.timerInterval);
        lobby.timerInterval = null;
      }
      lobby.gamePhase = 'reviewing';
      this.server.to(data.roomCode).emit('endRound', {
        lobby: this.lobbyService.getPublicState(lobby),
      });
    }
  }

  @SubscribeMessage('voteAnswer')
  handleVoteAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; targetPlayerId: string; category: string },
  ) {
    const lobby = this.lobbyService.addVote(
      data.roomCode,
      data.targetPlayerId,
      data.category,
      client.id,
    );

    if (lobby) {
      this.server.to(data.roomCode).emit('voteUpdated', {
        lobby: this.lobbyService.getPublicState(lobby),
      });
    }
  }

  @SubscribeMessage('finishVoting')
  handleFinishVoting(@ConnectedSocket() client: Socket) {
    const lobby = this.lobbyService.findLobbyBySocket(client.id);
    if (!lobby || lobby.hostId !== client.id) return;

    const updated = this.lobbyService.finishRound(lobby.roomCode);
    if (updated) {
      this.server.to(lobby.roomCode).emit('roundResults', {
        lobby: this.lobbyService.getPublicState(updated),
      });
    }
  }

  @SubscribeMessage('nextRound')
  handleNextRound(@ConnectedSocket() client: Socket) {
    const lobby = this.lobbyService.findLobbyBySocket(client.id);
    if (!lobby || lobby.hostId !== client.id) return;

    const updated = this.lobbyService.startNextRound(lobby.roomCode);
    if (!updated) return;

    if (updated.gamePhase === 'finished') {
      this.server.to(lobby.roomCode).emit('gameFinished', {
        lobby: this.lobbyService.getPublicState(updated),
      });
    } else {
      this.server.to(lobby.roomCode).emit('gameStarted', {
        ...this.lobbyService.getPublicState(updated),
      });
      this.startTimer(lobby.roomCode);
    }
  }

  @SubscribeMessage('getLobbyState')
  handleGetLobbyState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string },
  ) {
    const lobby = this.lobbyService.getLobby(data.roomCode);
    if (lobby) {
      client.emit('lobbyState', this.lobbyService.getPublicState(lobby));
    } else {
      client.emit('error', { message: 'Room not found' });
    }
  }
}
