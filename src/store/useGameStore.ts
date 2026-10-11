import { create } from 'zustand';

export type Team = 'blue' | 'red';

export interface Combatant {
  id: string;
  team: Team;
  position: [number, number, number];
  health: number;
  maxHealth: number;
  damage: number;
}

export interface Projectile {
  id: string;
  team: Team;
  position: [number, number, number];
  direction: [number, number, number];
  speed: number;
  damage: number;
  life: number;
}

interface GameState {
  health: number;
  maxHealth: number;
  score: number;
  highScore: number;
  wave: number;
  combatants: Combatant[];
  projectiles: Projectile[];
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  isAiming: boolean;
  isGameOver: boolean;
  isGameStarted: boolean;
  soundEnabled: boolean;
  lastDamageTime: number;
  blueTeamAlive: number;
  redTeamAlive: number;
  
  shoot: () => void;
  reload: () => void;
  takeDamage: (n: number) => void;
  setAiming: (a: boolean) => void;
  damageCombatant: (id: string, amount: number) => void;
  spawnCombatant: (team: Team, position: [number, number, number]) => void;
  spawnProjectile: (p: Omit<Projectile, 'id'>) => void;
  removeProjectile: (id: string) => void;
  startBattle: () => void;
  startGame: () => void;
  resetGame: () => void;
  toggleSound: () => void;
}

const genId = () => Math.random().toString(36).substring(2, 11);
const loadHighScore = (): number => {
  try { return parseInt(localStorage.getItem('inkbound_highscore') || '0', 10); }
  catch { return 0; }
};

// ============================================================
// موقعیت‌های تیمی
// ============================================================
// تیم آبی در z=+18، تیم قرمز در z=-18
// فاصله: ۳۶ واحد
const BLUE_Z = 18;
const RED_Z = -18;
const TEAM_Y = 0;

export const combatantPositions = new Map<string, { x: number; y: number; z: number }>();

export const useGameStore = create<GameState>((set, get) => ({
  health: 100,
  maxHealth: 100,
  score: 0,
  highScore: loadHighScore(),
  wave: 0,
  combatants: [],
  projectiles: [],
  ammo: 30,
  maxAmmo: 30,
  isReloading: false,
  isAiming: false,
  isGameOver: false,
  isGameStarted: false,
  soundEnabled: true,
  lastDamageTime: 0,
  blueTeamAlive: 0,
  redTeamAlive: 0,

  shoot: () => {
    const { ammo, isReloading, reload, isGameOver } = get();
    if (isReloading || isGameOver) return;
    if (ammo > 0) set((s) => ({ ammo: s.ammo - 1 }));
    else reload();
  },

  reload: () => {
    const { isReloading, ammo, maxAmmo, isGameOver } = get();
    if (isReloading || ammo === maxAmmo || isGameOver) return;
    set({ isReloading: true });
    setTimeout(() => set({ ammo: maxAmmo, isReloading: false }), 1500);
  },

  takeDamage: (n) => {
    const state = get();
    if (state.isGameOver || !state.isGameStarted) return;
    const now = Date.now();
    if (now - state.lastDamageTime < 250) return;
    const newHealth = Math.max(0, state.health - n);
    set({ health: newHealth, lastDamageTime: now });
    if (newHealth <= 0) {
      const newHighScore = Math.max(state.highScore, state.score);
      try { localStorage.setItem('inkbound_highscore', newHighScore.toString()); } catch {}
      set({ isGameOver: true, combatants: [], projectiles: [], highScore: newHighScore });
    }
  },

  setAiming: (a) => set({ isAiming: a }),

  spawnCombatant: (team, position) => {
    const health = 100;
    const damage = 15;
    set((s) => {
      const newCombatants = [...s.combatants, {
        id: genId(), team, position, health, maxHealth: health, damage,
      }];
      return {
        combatants: newCombatants,
        blueTeamAlive: newCombatants.filter((c) => c.team === 'blue').length,
        redTeamAlive: newCombatants.filter((c) => c.team === 'red').length,
      };
    });
  },

  damageCombatant: (id, amount) => {
    const combatant = get().combatants.find((c) => c.id === id);
    if (!combatant) return;
    const newHealth = combatant.health - amount;
    
    if (newHealth <= 0) {
      set((s) => {
        const filtered = s.combatants.filter((c) => c.id !== id);
        return {
          combatants: filtered,
          score: combatant.team === 'red' ? s.score + 100 : s.score,
          blueTeamAlive: filtered.filter((c) => c.team === 'blue').length,
          redTeamAlive: filtered.filter((c) => c.team === 'red').length,
        };
      });
    } else {
      set((s) => ({
        combatants: s.combatants.map((c) => c.id === id ? { ...c, health: newHealth } : c),
      }));
    }
  },

  spawnProjectile: (p) => {
    set((s) => {
      const newProjectiles = [...s.projectiles, { ...p, id: genId() }];
      if (newProjectiles.length > 80) return { projectiles: newProjectiles.slice(-80) };
      return { projectiles: newProjectiles };
    });
  },

  removeProjectile: (id) => {
    set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== id) }));
  },

  startBattle: () => {
    set({ combatants: [], projectiles: [], wave: 1 });
    
    // ۵ یار آبی - ستون‌های در z=+18
    for (let i = 0; i < 5; i++) {
      const x = -16 + i * 8; // -16, -8, 0, 8, 16
      get().spawnCombatant('blue', [x, TEAM_Y, BLUE_Z]);
    }
    
    // ۵ دشمن قرمز - ستون‌های در z=-18
    for (let i = 0; i < 5; i++) {
      const x = -16 + i * 8;
      get().spawnCombatant('red', [x, TEAM_Y, RED_Z]);
    }
  },

  startGame: () => {
    set({
      isGameStarted: true, isGameOver: false, health: 100, score: 0,
      wave: 0, combatants: [], projectiles: [], ammo: 30, isReloading: false,
    });
    get().startBattle();
  },

  resetGame: () => {
    set({
      health: 100, score: 0, wave: 0, combatants: [], projectiles: [],
      ammo: 30, isReloading: false, isAiming: false, isGameOver: false,
      isGameStarted: true, lastDamageTime: 0,
    });
    get().startBattle();
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));