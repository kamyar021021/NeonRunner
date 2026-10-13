import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gameRef, useRunnerStore } from '../../store/useRunnerStore';

const SEGMENT = 6;
const NUM = 10;
const TOTAL = NUM * SEGMENT;
const WIDTH = 7.5;

export const RunnerTrack = () => {
  const isGameStarted = useRunnerStore((s) => s.isGameStarted);
  const isGameOver = useRunnerStore((s) => s.isGameOver);

  const pillarRefs = useRef<(THREE.Group | null)[]>([]);
  const transverseRefs = useRef<(THREE.Mesh | null)[]>([]);

  const pillarZ = useRef<number[]>(Array.from({ length: NUM }, (_, i) => -i * SEGMENT + 5));
  const transZ = useRef<number[]>(Array.from({ length: NUM }, (_, i) => -i * SEGMENT + 5));

  const transverseGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WIDTH + 2, 0.08);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((_, delta) => {
    if (!isGameStarted || isGameOver) return;
    const move = gameRef.speed * delta;

    for (let i = 0; i < NUM; i++) {
      let z = pillarZ.current[i] + move;
      if (z > 10) z -= TOTAL;
      pillarZ.current[i] = z;
      const p = pillarRefs.current[i];
      if (p) p.position.z = z;
    }
    for (let i = 0; i < NUM; i++) {
      let z = transZ.current[i] + move;
      if (z > 10) z -= TOTAL;
      transZ.current[i] = z;
      const t = transverseRefs.current[i];
      if (t) t.position.z = z;
    }
  });

  return (
    <group>
      {/* کف */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -30]}>
        <planeGeometry args={[WIDTH + 4, 150]} />
        <meshStandardMaterial color="#0a0118" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* خطوط طولی لاین‌ها */}
      {[-3.75, -1, 1, 3.75].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -30]}>
          <planeGeometry args={[0.06, 150]} />
          <meshBasicMaterial
            color={i === 0 || i === 3 ? '#7c3aed' : '#22d3ee'}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* خطوط عرضی */}
      {Array.from({ length: NUM }).map((_, i) => (
        <mesh
          key={`t-${i}`}
          ref={(el) => { transverseRefs.current[i] = el; }}
          geometry={transverseGeo}
          position={[0, 0.02, -i * SEGMENT + 5]}
        >
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ستون‌ها */}
      {Array.from({ length: NUM }).map((_, i) => {
        const color = i % 2 === 0 ? '#a78bfa' : '#22d3ee';
        return (
          <group
            key={`p-${i}`}
            ref={(el) => { pillarRefs.current[i] = el; }}
            position={[0, 0, -i * SEGMENT + 5]}
          >
            {/* چپ */}
            <mesh position={[-(WIDTH / 2 + 1.2), 2.5, 0]}>
              <boxGeometry args={[0.3, 5, 0.3]} />
              <meshStandardMaterial color="#0a0118" emissive={color} emissiveIntensity={0.8} metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[-(WIDTH / 2 + 1.2), 2.5, 0.16]}>
              <planeGeometry args={[0.18, 4.5]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            {/* راست */}
            <mesh position={[(WIDTH / 2 + 1.2), 2.5, 0]}>
              <boxGeometry args={[0.3, 5, 0.3]} />
              <meshStandardMaterial color="#0a0118" emissive={color} emissiveIntensity={0.8} metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[(WIDTH / 2 + 1.2), 2.5, 0.16]}>
              <planeGeometry args={[0.18, 4.5]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};