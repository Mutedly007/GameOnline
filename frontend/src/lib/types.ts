export const CATEGORIES = [
  { key: 'bent', label: 'Bent', sublabel: 'Girl Name', emoji: '👧', labelAr: 'بنت' },
  { key: 'weld', label: 'Weld', sublabel: 'Boy Name', emoji: '👦', labelAr: 'ولد' },
  { key: 'job', label: 'Job', sublabel: 'Profession', emoji: '💼', labelAr: 'خدمة' },
  { key: 'famous', label: 'Famous', sublabel: 'Famous Person', emoji: '⭐', labelAr: 'مشهور' },
  { key: 'vegetable', label: 'Vegetable', sublabel: 'Vegetable/Fruit', emoji: '🥬', labelAr: 'خضرة' },
  { key: 'jamad', label: 'Jamad', sublabel: 'Object', emoji: '🪨', labelAr: 'جماد' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export interface LobbyState {
  roomCode: string;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    isConnected: boolean;
  }[];
  currentLetter: string;
  currentRound: number;
  totalRounds: number;
  timerDuration: number;
  timerRemaining: number;
  gamePhase: 'lobby' | 'playing' | 'reviewing' | 'results' | 'finished';
  answers: {
    playerId: string;
    playerName: string;
    categories: Record<CategoryKey, string>;
  }[];
  votes: {
    playerId: string;
    category: string;
    votedInvalid: string[];
  }[];
  roundResults: {
    letter: string;
    answers: {
      playerId: string;
      playerName: string;
      categories: Record<CategoryKey, string>;
    }[];
    scores: Record<string, number>;
  }[];
  cumulativeScores: Record<string, number>;
  hostId: string;
  maxPlayers: number;
}
