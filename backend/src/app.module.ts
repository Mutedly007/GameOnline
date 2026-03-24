import { Module } from '@nestjs/common';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [LobbyModule, GameModule],
})
export class AppModule {}
