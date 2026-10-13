import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameRef, useRunnerStore } from '../../store/useRunnerStore';
import { soundManager } from '../../utils/sound';

const LANES = [-2, 0, 2];
const DESPAWN_Z = 6;
const MAX = 100;
const CLEAR_WINDOW = 0.8;
const INITIAL_DELAY_DISTANCE = 20;

const getSpawnZ = (): number => {
  return -45 - Math.max(0, gameRef.speed - 14) * 0.6;
};

const COLORS = ['#22d3ee', '#a78bfa', '#f43f5e', '#22c55e', '#fbbf24'];

interface PoolItem {
  active: boolean;
  x: number;
  z: number;
  color: string;
  passed: boolean;
}

export const RunnerObstacles = () => {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const pool = useRef<PoolItem[]>(
    Array.from({ length: MAX }, () => ({
      active: false, x: 0, z: -45, color: '#22d3ee', passed: false,
    }))
  );

  const lastFreeLaneRef = useRef(1);
  const patternsCountRef = useRef(0);

  const roundId = useRunnerStore((s) => s.roundId);
  const isGameStarted = useRunnerStore((s) => s.isGameStarted);
  const isGameOver = useRunnerStore((s) => s.isGameOver);

  useEffect(() => {
    if (!isGameStarted || isGameOver) return;
    for (let i = 0; i < MAX; i++) {
      pool.current[i] = {
        active: false, x: 0, z: -45, color: '#22d3ee', passed: false,
      };
      const g = refs.current[i] as any;
      if (g) g.visible = false;
    }
    lastFreeLaneRef.current = 1;
    patternsCountRef.current = 0;
  }, [roundId, isGameStarted, isGameOver]);

  const spawnAt = (laneIdx: number, zOffset: number) => {
    const idx = pool.current.findIndex((o) => !o.active);
    if (idx < 0) return;
    const o = pool.current[idx];
    o.active = true;
    o.x = LANES[laneIdx];
    o.z = getSpawnZ() + zOffset;
    o.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    o.passed = false;
  };

  const getDifficulty = (): number => {
    const d = gameRef.distance;
    if (d < 100) return (d / 100) * 1.5;
    if (d < 300) return 1.5 + ((d - 100) / 200) * 2;
    if (d < 600) return 3.5 + ((d - 300) / 300) * 2;
    if (d < 1000) return 5.5 + ((d - 600) / 400) * 2;
    return Math.min(10, 7.5 + ((d - 1000) / 800) * 2.5);
  };

  const pickNextFreeLane = (currentFree: number): number => {
    const options: number[] = [];
    for (let l = 0; l < 3; l++) {
      const dist = Math.abs(l - currentFree);
      if (dist >= 1 && dist <= 2) {
        if (dist === 1) options.push(l, l, l);
        else options.push(l);
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  };

  const generatePack = (difficulty: number) => {
    patternsCountRef.current++;

    const minRows = 2 + Math.floor(difficulty * 0.15);
    const maxRows = 4 + Math.floor(difficulty * 0.35);
    const rowCount = minRows + Math.floor(Math.random() * (maxRows - minRows + 1));

    const baseRowGap = 8 + gameRef.speed * 0.15 + Math.random() * 3;

    let freeLane = Math.floor(Math.random() * 3);
    const singleChance = Math.max(0.06, 0.3 - difficulty * 0.02);

    let currentZ = 0;
    for (let i = 0; i < rowCount; i++) {
      if (i > 0) {
        const isBigGap = Math.random() < 0.22;
        const gapMultiplier = isBigGap
          ? 1.5 + Math.random() * 0.5
          : 0.9 + Math.random() * 0.3;
        currentZ -= baseRowGap * gapMultiplier;
      }

      const obstaclesInRow = Math.random() < singleChance ? 1 : 2;

      if (obstaclesInRow === 1) {
        const blocked = Math.floor(Math.random() * 3);
        spawnAt(blocked, currentZ);
        if (Math.random() < 0.5) {
          freeLane = pickNextFreeLane(freeLane);
        }
      } else {
        const lanes = [0, 1, 2].filter((l) => l !== freeLane);
        if (Math.random() < 0.5) lanes.reverse();
        for (const l of lanes) {
          spawnAt(l, currentZ);
        }
        if (i < rowCount - 1) {
          freeLane = pickNextFreeLane(freeLane);
        }
      }
    }

    lastFreeLaneRef.current = freeLane;
  };

  useFrame((_, delta) => {
    const state = useRunnerStore.getState();
    if (!state.isGameStarted || state.isGameOver || state.isPaused) return;

    const move = gameRef.speed * delta;
    const spawnZ = getSpawnZ();

    let deepestZ = 0;
    let hasActive = false;

    for (let i = 0; i < MAX; i++) {
      const o = pool.current[i];
      const g = refs.current[i] as any;
      if (!o.active) {
        if (g) g.visible = false;
        continue;
      }
      hasActive = true;

      o.z += move;
      if (o.z < deepestZ) deepestZ = o.z;

      if (!o.passed && o.z > -CLEAR_WINDOW && o.z < CLEAR_WINDOW) {
        const dx = Math.abs(o.x - gameRef.playerX);
        if (dx < 0.9) {
          state.gameOver();
          return;
        }
        o.passed = true;
        soundManager.playPass();
      }

      if (o.z > DESPAWN_Z) {
        o.active = false;
        if (g) g.visible = false;
        continue;
      }

      if (g) {
        g.visible = true;
        g.position.set(o.x, 0, o.z);
        const body = g.children[0] as any;
        if (body?.material) body.material.emissive.set(o.color);
        const edges = g.children[1] as any;
        if (edges?.material) edges.material.color.set(o.color);
        const glow = g.children[2] as any;
        if (glow?.material) glow.material.color.set(o.color);
        const front = g.children[3] as any;
        if (front?.material) front.material.color.set(o.color);
      }
    }

    if (gameRef.distance < INITIAL_DELAY_DISTANCE) return;

    const packGapBase = 12 + gameRef.speed * 0.2 + Math.random() * 6;
    const packGap = packGapBase;

    const canSpawn = !hasActive || deepestZ > spawnZ + packGap;

    if (canSpawn) {
      generatePack(getDifficulty());
    }
  });

  return (
    <group>
      {Array.from({ length: MAX }).map((_, i) => (
        <group
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[1.5, 2.5, 1.5]} />
            <meshStandardMaterial
              color="#0a0118"
              emissive="#22d3ee"
              emissiveIntensity={0.7}
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1.5, 2.5, 1.5)]} />
            <lineBasicMaterial color="#22d3ee" toneMapped={false} />
          </lineSegments>
          <mesh scale={1.15}>
            <boxGeometry args={[1.5, 2.5, 1.5]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.15}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 1.25, 0.76]}>
            <planeGeometry args={[1.35, 2.2]} />
            <meshBasicMaterial
              color="#22d3ee"
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};