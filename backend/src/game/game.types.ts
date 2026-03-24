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
    girl: string;      // Girl name
    boy: string;       // Boy name
    animal: string;    // Animal
    plant: string;     // Plant
    object: string;    // Object
    country: string;   // Country
    job: string;       // Job
    famous: string;    // Famous person
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
  { key: 'girl', label: 'Girl Name', labelAr: 'بنت' },
  { key: 'boy', label: 'Boy Name', labelAr: 'ولد' },
  { key: 'animal', label: 'Animal', labelAr: 'حيوان' },
  { key: 'plant', label: 'Plant', labelAr: 'نبات' },
  { key: 'object', label: 'Object', labelAr: 'جماد' },
  { key: 'country', label: 'Country', labelAr: 'بلاد' },
  { key: 'job', label: 'Job', labelAr: 'خدمة' },
  { key: 'famous', label: 'Famous Person', labelAr: 'مشهور' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];

export const AVAILABLE_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S',
  'T', 'U', 'V', 'W', 'Y'
];
