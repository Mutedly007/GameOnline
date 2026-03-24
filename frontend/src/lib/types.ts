export const CATEGORIES = [
  { key: 'girl', label: 'Girl', sublabel: 'Girl Name', emoji: '👧', labelAr: 'بنت' },
  { key: 'boy', label: 'Boy', sublabel: 'Boy Name', emoji: '👦', labelAr: 'ولد' },
  { key: 'animal', label: 'Animal', sublabel: 'Animal', emoji: '🐾', labelAr: 'حيوان' },
  { key: 'plant', label: 'Plant', sublabel: 'Plant', emoji: '🌿', labelAr: 'نبات' },
  { key: 'object', label: 'Object', sublabel: 'Object', emoji: '🪨', labelAr: 'جماد' },
  { key: 'country', label: 'Country', sublabel: 'Country', emoji: '🌍', labelAr: 'بلاد' },
  { key: 'job', label: 'Job', sublabel: 'Profession', emoji: '💼', labelAr: 'خدمة' },
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
