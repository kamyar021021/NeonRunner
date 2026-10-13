import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameRef, useRunnerStore } from '../../store/useRunnerStore';

export const RunnerSky = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 100;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 25 + 5;
      pos[i * 3 + 2] = -Math.random() * 100;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const state = useRunnerStore.getState();
    if (!state.isGameStarted || state.isGameOver || state.isPaused) return;

    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    const move = gameRef.speed * delta * 0.25;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 2] += move;
      if (pos[i * 3 + 2] > 15) {
        pos[i * 3 + 2] = -100;
        pos[i * 3] = (Math.random() - 0.5) * 60;
        pos[i * 3 + 1] = Math.random() * 25 + 5;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        color="#a78bfa"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};