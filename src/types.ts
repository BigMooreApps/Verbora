export interface TenseSentence {
  tenseId: string;
  tenseNameEN: string;
  tenseNameES: string;
  sentence: string;
  translation: string;
  pronunciationTip?: string;
  sentenceI?: string;
  translationI?: string;
  sentenceAll?: string;
  translationAll?: string;
}

export interface VerbExercise {
  id: string;
  verbEN: string;
  verbES: string;
  difficulty: "Básico" | "Intermedio" | "Avanzado";
  sentences: TenseSentence[];
  isCustom?: boolean;
}

export interface DetailWord {
  word: string;
  matched: boolean;
  comment?: string;
}

export interface PronunciationResult {
  accuracyScore: number;
  feedback: string;
  phoneticGuide: string;
  details: DetailWord[];
}

export interface UserStats {
  streak: number;
  xp: number;
  totalAttempts: number;
  successfulAttempts: number;
  lastAttemptDate?: string;
}
