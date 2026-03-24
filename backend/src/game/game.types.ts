export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  isConnected: boolean;
}

export interface Answer {
  playerId: string;
  playerName: string;
  categories: {
    bent: string;      // Girl name
    weld: string;      // Boy name
    job: string;       // Job
    famous: string;    // Famous person
    vegetable: string; // Vegetable
    jamad: string;     // Object
  };
}

export interface VoteResult {
  playerId: string;
  category: string;
  votedInvalid: string[]; // playerIds who voted invalid
}

export interface RoundResult {
  letter: string;
  answers: Answer[];
  scores: Record<string, number>; // playerId -> round score
}

export interface GameState {
  roomCode: string;
  players: Player[];
  currentLetter: string;
  currentRound: number;
  totalRounds: number;
  timerDuration: number;
  timerRemaining: number;
  timerInterval: NodeJS.Timeout | null;
  gamePhase: 'lobby' | 'playing' | 'reviewing' | 'results' | 'finished';
  answers: Answer[];
  votes: VoteResult[];
  roundResults: RoundResult[];
  cumulativeScores: Record<string, number>; // playerId -> total score
  hostId: string;
  maxPlayers: number;
}

export const CATEGORIES = [
  { key: 'bent', label: 'Bent (Girl Name)', labelAr: 'بنت' },
  { key: 'weld', label: 'Weld (Boy Name)', labelAr: 'ولد' },
  { key: 'job', label: 'Job', labelAr: 'خدمة' },
  { key: 'famous', label: 'Famous Person', labelAr: 'مشهور' },
  { key: 'vegetable', label: 'Vegetable', labelAr: 'خضرة' },
  { key: 'jamad', label: 'Object (Jamad)', labelAr: 'جماد' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export const AVAILABLE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S',
  'T', 'U', 'V', 'W', 'Y'
];
