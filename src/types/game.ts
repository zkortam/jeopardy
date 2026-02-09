export interface Team {
  id: string;
  name: string;
  score: number;
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  value: number;
  answered: boolean;
}

export interface Category {
  id: string;
  name: string;
  questions: Question[];
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

export interface BuzzerPress {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  timestamp: number;
}

export interface GameState {
  teams: Team[];
  categories: Category[];
  currentQuestion: Question | null;
  currentTeam: Team | null;
  timer: number;
  timerActive: boolean;
  gamePhase: 'setup' | 'playing' | 'team-select' | 'answer' | 'steal' | 'finished';
  selectedQuestion: { categoryId: string; questionId: string } | null;
  stealTeam: Team | null;
  selectedTeam: Team | null;
  currentTeamIndex: number;
  answerRevealed: boolean;
  roomCode: string | null;
  buzzerEnabled: boolean;
  buzzerPress: BuzzerPress | null;
  players: Player[];
}
