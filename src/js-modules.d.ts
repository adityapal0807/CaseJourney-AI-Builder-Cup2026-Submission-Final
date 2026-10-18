// Allow importing .jsx and .js files from .tsx files without declaration errors
declare module '*.jsx' {
  const component: React.ComponentType<Record<string, unknown>>;
  export default component;
  // Allow named exports too
  export const showAchievement: (a: unknown) => void;
}

declare module '*.js' {
  const value: unknown;
  export default value;
  // Common named exports
  export const CASES: unknown[];
  export const TRENDING_NEWS: unknown[];
  export const SCORE_STANDARD: Record<string, number>;
  export const calcFinalScore: (scores: Record<string, number>) => number;
  export const calcEloChange: (score: number) => number;
  export const getRank: (elo: number) => { label: string; color: string; badge: string };
  export const ACHIEVEMENTS: unknown[];
  export const getElo: () => number;
  export const setElo: (elo: number) => void;
  export const getStats: () => Record<string, number>;
  export const getLastFiveAverageScores: () => Record<string, number>;
  export const saveSession: (s: unknown) => void;
  export const incrementStreak: () => number;
  export const unlockAchievement: (id: string) => boolean;
  export const getAchievements: () => string[];
  export const useGameState: () => Record<string, unknown>;
  export const useClaude: () => { callClaude: (opts: unknown) => void };
  export const useVoice: (opts: unknown) => Record<string, unknown>;
  // Mind map exports
  export const CASE_MINDMAPS: Record<string, unknown>;
  export const buildUserPath: (caseId: string, turns: unknown[]) => string[];
  export const saveMindMapAttempt: (caseId: string, visitedNodes: string[], score: number) => void;
  export const getBestAttempt: (caseId: string) => { visitedNodes: string[]; score: number } | null;
}
