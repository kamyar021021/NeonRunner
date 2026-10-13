export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_run',   title: 'FIRST RUN',    description: 'Complete your first run',        icon: '🚀' },
  { id: 'speed_50',    title: 'SPEED DEMON',  description: 'Reach speed 50',                icon: '⚡' },
  { id: 'speed_80',    title: 'HYPERDRIVE',   description: 'Reach speed 80',                icon: '🌀' },
  { id: 'dist_500',    title: 'WARM UP',      description: 'Reach 500 meters',              icon: '🏃' },
  { id: 'dist_1000',   title: 'PRO RUNNER',   description: 'Reach 1000 meters',             icon: '🔥' },
  { id: 'dist_2000',   title: 'MARATHON',     description: 'Reach 2000 meters',             icon: '💪' },
  { id: 'dist_5000',   title: 'LEGEND',       description: 'Reach 5000 meters',             icon: '👑' },
  { id: 'runs_10',     title: 'PERSISTENT',   description: 'Play 10 runs',                  icon: '🎯' },
  { id: 'runs_50',     title: 'DEDICATED',    description: 'Play 50 runs',                  icon: '💎' },
];

export const MILESTONES = [500, 1000, 2000, 3000, 5000, 10000];

export const getAchievement = (id: string): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);

export const loadUnlocked = (): string[] => {
  try {
    const raw = localStorage.getItem('runner_achievements');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveUnlocked = (list: string[]) => {
  try { localStorage.setItem('runner_achievements', JSON.stringify(list)); }
  catch {}
};

export const loadRunCount = (): number => {
  try { return parseInt(localStorage.getItem('runner_runs') || '0', 10); }
  catch { return 0; }
};

export const saveRunCount = (n: number) => {
  try { localStorage.setItem('runner_runs', n.toString()); }
  catch {}
};