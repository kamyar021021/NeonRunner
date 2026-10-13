import { create } from 'zustand';
import { loadUnlocked, saveUnlocked, loadRunCount, saveRunCount } from '../utils/achievements';

export const gameRef = {
  speed: 14,
  baseSpeed: 14,
  maxSpeed: 100,
  distance: 0,
  playerX: 0,
  targetX: 0,
  shake: 0,
  lastMoveTime: 0,
};

interface State {
  score: number;
  highScore: number;
  speedDisplay: number;
  isGameStarted: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  currentLane: number;
  roundId: number;
  runCount: number;
  totalDistance: number;
  crashTime: number;

  soundEnabled: boolean;
  vibrationEnabled: boolean;

  unlockedAchievements: string[];
  newlyUnlocked: string[];

  updateStats: (score: number, speed: number) => void;
  moveLane: (dir: -1 | 1) => void;
  togglePause: () => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  unlockAchievement: (id: string) => void;
  clearNewlyUnlocked: () => void;
  exitToMenu: () => void;
  startGame: () => void;
  gameOver: () => void;
}

const loadHighScore = () => {
  try { return parseInt(localStorage.getItem('runner_high') || '0', 10); }
  catch { return 0; }
};

const loadSetting = (key: string, fallback: boolean): boolean => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  } catch { return fallback; }
};

const saveSetting = (key: string, value: boolean) => {
  try { localStorage.setItem(key, value.toString()); } catch {}
};

const LANES = [-2, 0, 2];

export const useRunnerStore = create<State>((set, get) => ({
  score: 0,
  highScore: loadHighScore(),
  speedDisplay: 14,
  isGameStarted: false,
  isGameOver: false,
  isPaused: false,
  currentLane: 1,
  roundId: 0,
  runCount: loadRunCount(),
  totalDistance: 0,
  crashTime: 0,

  soundEnabled: loadSetting('runner_sound', true),
  vibrationEnabled: loadSetting('runner_vibration', true),

  unlockedAchievements: loadUnlocked(),
  newlyUnlocked: [],

  updateStats: (score, speed) => set({ score, speedDisplay: speed }),

  moveLane: (dir) => {
    const state = get();
    if (!state.isGameStarted || state.isGameOver || state.isPaused) return;

    const now = performance.now();
    if (now - gameRef.lastMoveTime < 130) return;
    gameRef.lastMoveTime = now;

    const newLane = Math.max(0, Math.min(2, state.currentLane + dir));
    if (newLane === state.currentLane) return;
    gameRef.targetX = LANES[newLane];
    set({ currentLane: newLane });
  },

  togglePause: () => {
    const s = get();
    if (!s.isGameStarted || s.isGameOver) return;
    set({ isPaused: !s.isPaused });
  },

  toggleSound: () => {
    const newVal = !get().soundEnabled;
    saveSetting('runner_sound', newVal);
    set({ soundEnabled: newVal });
  },

  toggleVibration: () => {
    const newVal = !get().vibrationEnabled;
    saveSetting('runner_vibration', newVal);
    set({ vibrationEnabled: newVal });
  },

  unlockAchievement: (id) => {
    const s = get();
    if (s.unlockedAchievements.includes(id)) return;
    const updated = [...s.unlockedAchievements, id];
    saveUnlocked(updated);
    set({
      unlockedAchievements: updated,
      newlyUnlocked: [...s.newlyUnlocked, id],
    });
  },

  clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),

  exitToMenu: () => {
    gameRef.speed = 14;
    gameRef.distance = 0;
    gameRef.playerX = 0;
    gameRef.targetX = 0;
    gameRef.shake = 0;
    gameRef.lastMoveTime = 0;
    set({
      isGameStarted: false,
      isGameOver: false,
      isPaused: false,
      score: 0,
      speedDisplay: 14,
      currentLane: 1,
      newlyUnlocked: [],
      crashTime: 0,
    });
  },

  startGame: () => {
    gameRef.speed = 14;
    gameRef.distance = 0;
    gameRef.playerX = 0;
    gameRef.targetX = 0;
    gameRef.shake = 0;
    gameRef.lastMoveTime = 0;
    set((s) => ({
      score: 0,
      speedDisplay: 14,
      isGameStarted: true,
      isGameOver: false,
      isPaused: false,
      currentLane: 1,
      roundId: s.roundId + 1,
      newlyUnlocked: [],
      crashTime: 0,
    }));
  },

  gameOver: () => {
    const s = get();
    const newHigh = Math.max(s.score, s.highScore);
    try { localStorage.setItem('runner_high', newHigh.toString()); } catch {}

    const newRunCount = s.runCount + 1;
    saveRunCount(newRunCount);

    const unlock = s.unlockAchievement;
    unlock('first_run');
    if (gameRef.speed >= 50) unlock('speed_50');
    if (gameRef.speed >= 80) unlock('speed_80');
    if (s.score >= 500) unlock('dist_500');
    if (s.score >= 1000) unlock('dist_1000');
    if (s.score >= 2000) unlock('dist_2000');
    if (s.score >= 5000) unlock('dist_5000');
    if (newRunCount >= 10) unlock('runs_10');
    if (newRunCount >= 50) unlock('runs_50');

    gameRef.shake = 1.2;
    set({
      isGameOver: true,
      isPaused: false,
      highScore: newHigh,
      runCount: newRunCount,
      crashTime: performance.now(),
    });
  },
}));