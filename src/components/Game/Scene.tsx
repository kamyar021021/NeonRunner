import { useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Player } from './Player';
import { Weapon } from './Weapon';
import { Combatant } from './Combatant';
import { EnemyProjectileSystem } from './EnemyProjectileSystem';
import { HUD } from '../UI/HUD';
import { useGameStore } from '../../store/useGameStore';
import { soundManager } from '../../utils/sound';

// ===== کیسه شنی کوتاه (۱.۲ ارتفاع) =====
const Sandbag = ({ position }: { position: [number, number, number] }) => (
  <RigidBody type="fixed" colliders={false} position={position} userData={{ isObstacle: true }}>
    <CuboidCollider args={[1, 0.6, 0.6]} />
    <mesh castShadow receiveShadow userData={{ isObstacle: true }}>
      <boxGeometry args={[2, 1.2, 1.2]} />
      <meshStandardMaterial color="#a89468" roughness={0.95} />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 1.2, 1.2)]} />
        <lineBasicMaterial color="#5a4a2a" />
      </lineSegments>
    </mesh>
  </RigidBody>
);

export const Scene = () => {
  const combatants = useGameStore((s) => s.combatants);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  useEffect(() => {
    if (isGameOver) soundManager.playGameOver();
  }, [isGameOver]);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  return (
    <Canvas shadows camera={{ fov: 75, position: [0, 2, 24] }}>
      <ambientLight intensity={1.3} />
      <directionalLight position={[20, 40, 15]} intensity={1.8} castShadow />
      <fog attach="fog" args={['#f4f1ea', 60, 150]} />

      <Physics gravity={[0, -9.81, 0]}>
        {isGameStarted && !isGameOver && <Player />}
        {isGameStarted && !isGameOver && <Weapon />}

        {combatants.map((c) => (
          <Combatant key={c.id} combatant={c} />
        ))}

        <EnemyProjectileSystem />

        {/* زمین */}
        <RigidBody type="fixed" colliders={false} userData={{ isGround: true }}>
          <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.1, 0]} />
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} userData={{ isGround: true }}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#fdfbf7" />
          </mesh>
          <gridHelper args={[200, 200, '#1e3a8a', '#93c5fd']} position={[0, 0.01, 0]} />
        </RigidBody>

        {/* خط میانی */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.3]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.5} />
        </mesh>

        {/* ============ سنگر آبی (z=+10) ============ */}
        {Array.from({ length: 23 }).map((_, i) => (
          <Sandbag key={`bw-${i}`} position={[-22 + i * 2, 0.6, 10]} />
        ))}

        {/* ============ سنگر قرمز (z=-10) ============ */}
        {Array.from({ length: 23 }).map((_, i) => (
          <Sandbag key={`rw-${i}`} position={[-22 + i * 2, 0.6, -10]} />
        ))}

        {/* خط دید رنگی - برای تمایز */}
        <mesh position={[0, 0.03, 12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.15]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0.03, -12]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 0.15]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
        </mesh>

      </Physics>
    </Canvas>
  );
};

export const SceneOverlay = () => {
  return <HUD />;
};