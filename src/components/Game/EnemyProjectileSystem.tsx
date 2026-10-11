import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, combatantPositions } from '../../store/useGameStore';
import type { Projectile } from '../../store/useGameStore';

const Laser = ({ projectile }: { projectile: Projectile }) => {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...projectile.position));
  const dirRef = useRef(new THREE.Vector3(...projectile.direction).normalize());
  const lifeRef = useRef(projectile.life);
  const damageCombatant = useGameStore((s) => s.damageCombatant);
  const removeProjectile = useGameStore((s) => s.removeProjectile);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isGameStarted = useGameStore((s) => s.isGameStarted);

  const color = projectile.team === 'red' ? '#ff1744' : '#3b82f6';
  const glowColor = projectile.team === 'red' ? '#ff5252' : '#60a5fa';

  useFrame((_, delta) => {
    if (!groupRef.current || isGameOver || !isGameStarted) return;
    
    const step = projectile.speed * delta;
    const prevPos = posRef.current.clone();
    const nextPos = prevPos.clone().addScaledVector(dirRef.current, step);
    
    // ===== برخورد با دشمن (Swept Sphere) =====
    // ⭐ فقط کامبتانت‌های تیم مقابل
    const segment = nextPos.clone().sub(prevPos);
    const segLength = segment.length();
    
    if (segLength > 0.001) {
      const segDir = segment.clone().normalize();
      const enemies = useGameStore.getState().combatants.filter(
        (c) => c.team !== projectile.team
      );
      
      for (const enemy of enemies) {
        const ep = combatantPositions.get(enemy.id);
        if (!ep) continue;
        
        // ⭐ مرکز بدن دشمن در ارتفاع 1.1 (وسط سینه + شکم)
        const center = new THREE.Vector3(ep.x, 1.1, ep.z);
        
        // نزدیک‌ترین نقطه روی خط به مرکز دشمن
        const toCenter = center.clone().sub(prevPos);
        const proj = toCenter.dot(segDir);
        
        if (proj < 0 || proj > segLength) continue;
        
        const closest = prevPos.clone().addScaledVector(segDir, proj);
        const dist = closest.distanceTo(center);
        
        // ⭐ شعاع برخورد ۰.۸ (کپسول بدن انسان)
        if (dist < 0.8) {
          damageCombatant(enemy.id, projectile.damage);
          removeProjectile(projectile.id);
          return;
        }
      }
    }

    // ===== حرکت =====
    posRef.current.copy(nextPos);
    groupRef.current.position.copy(posRef.current);
    
    const lookTarget = posRef.current.clone().add(dirRef.current);
    groupRef.current.lookAt(lookTarget);

    // ===== عمر =====
    lifeRef.current -= delta;
    if (lifeRef.current <= 0 || posRef.current.y < 0.05) {
      removeProjectile(projectile.id);
      return;
    }
  });

  return (
    <group ref={groupRef} userData={{ isProjectile: true }}>
      {/* هسته */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* هاله */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={2.2}>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.4}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* سر روشن */}
      <mesh position={[0, 0, -0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.5]} scale={2}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.5}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export const EnemyProjectileSystem = () => {
  const projectiles = useGameStore((s) => s.projectiles);
  const visible = projectiles.slice(-60);
  return (
    <>
      {visible.map((p) => (
        <Laser key={p.id} projectile={p} />
      ))}
    </>
  );
};