import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore, combatantPositions } from '../../store/useGameStore';
import type { Combatant as CombatantType, Team } from '../../store/useGameStore';
import { soundManager } from '../../utils/sound';

interface CombatantProps {
  combatant: CombatantType;
}

const MUZZLE_Y = 1.5;

// ===== اندام بین دو نقطه =====
const Limb = ({
  start, end, radius, color, combatantId,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color: string;
  combatantId: string;
}) => {
  const data = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().add(e).multiplyScalar(0.5);
    const dir = e.clone().sub(s);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { position: mid, quaternion: q, length: len };
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <mesh position={data.position} quaternion={data.quaternion} castShadow userData={{ combatantId }}>
      <capsuleGeometry args={[radius, Math.max(0.01, data.length - radius * 2), 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
};

export const Combatant = ({ combatant }: CombatantProps) => {
  const bodyRef = useRef<any>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);
  
  const spawnProjectile = useGameStore((s) => s.spawnProjectile);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  
  const lastShotTimeRef = useRef(Math.random() * 1.5);
  const ammoRef = useRef(20);
  const reloadTimerRef = useRef(0);
  const isReloadingRef = useRef(false);
  const muzzleFlashTimerRef = useRef(0);
  const timeRef = useRef(Math.random() * 10);
  
  // ===== AI Movement State =====
  const moveDirRef = useRef(Math.random() < 0.5 ? 1 : -1); // چپ یا راست
  const moveTimerRef = useRef(1 + Math.random() * 2); // زمان تغییر جهت
  const walkPhaseRef = useRef(0); // فاز انیمیشن راه رفتن
  const homePositionRef = useRef<[number, number, number]>([...combatant.position]);

  const isRed = combatant.team === 'red';
  const oppositeTeam: Team = isRed ? 'blue' : 'red';

  useFrame((_, delta) => {
    if (!bodyRef.current || isGameOver || !isGameStarted) return;
    timeRef.current += delta;
    muzzleFlashTimerRef.current = Math.max(0, muzzleFlashTimerRef.current - delta);
    reloadTimerRef.current -= delta;
    moveTimerRef.current -= delta;
    const now = performance.now() / 1000;
    
    const pos = bodyRef.current.translation();
    combatantPositions.set(combatant.id, { x: pos.x, y: pos.y, z: pos.z });

    // ===== Reload =====
    if (isReloadingRef.current && reloadTimerRef.current <= 0) {
      isReloadingRef.current = false;
      ammoRef.current = 20;
    }

    // ===== یافتن نزدیک‌ترین دشمن =====
    const enemies = useGameStore.getState().combatants.filter((c) => c.team === oppositeTeam);
    let nearestEnemyPos: { x: number; y: number; z: number } | null = null;
    let nearestDist = 999;
    
    for (const e of enemies) {
      const ep = combatantPositions.get(e.id);
      if (!ep) continue;
      const dx = ep.x - pos.x;
      const dz = ep.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemyPos = ep;
      }
    }

    if (!nearestEnemyPos) return;

    // ===== چرخش رو به دشمن =====
    const dx = nearestEnemyPos.x - pos.x;
    const dz = nearestEnemyPos.z - pos.z;
    const faceY = Math.atan2(dx, dz);
    const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceY);
    const curRot = bodyRef.current.rotation();
    const curQ = new THREE.Quaternion(curRot.x, curRot.y, curRot.z, curRot.w);
    curQ.slerp(targetQuat, delta * 8);
    bodyRef.current.setNextKinematicRotation(curQ);

    // ===== حرکت جانبی (Strafe) با تشخیص جهت عمود بر دشمن =====
    // تغییر جهت هر ۱-۳ ثانیه
    if (moveTimerRef.current <= 0) {
      // 30% احتمال ایستادن
      const r = Math.random();
      if (r < 0.3) {
        moveDirRef.current = 0;
      } else {
        moveDirRef.current = Math.random() < 0.5 ? 1 : -1;
      }
      moveTimerRef.current = 1 + Math.random() * 2;
    }

    // محاسبه جهت عمود بر دشمن
    const perpX = -Math.sin(faceY);
    const perpZ = -Math.cos(faceY);
    // یا بهتر: عمود در فضای صفحه
    const forwardX = Math.sin(faceY);
    const forwardZ = Math.cos(faceY);
    const rightX = forwardZ; // عمود
    const rightZ = -forwardX;

    const moveSpeed = 2.5;
    const vx = rightX * moveSpeed * moveDirRef.current;
    const vz = rightZ * moveSpeed * moveDirRef.current;

    // ===== محدودیت در محدوده (بین z=8 تا z=25 برای آبی) =====
    const homeX = homePositionRef.current[0];
    const homeZ = homePositionRef.current[2];
    const distFromHomeX = pos.x - homeX;
    const distFromHomeZ = pos.z - homeZ;
    const distFromHome = Math.sqrt(distFromHomeX * distFromHomeX + distFromHomeZ * distFromHomeZ);
    
    let finalVx = vx;
    let finalVz = vz;
    
    // اگر از خانه دور شد، برگرد
    if (distFromHome > 4) {
      finalVx = -distFromHomeX * 1.5;
      finalVz = -distFromHomeZ * 1.5;
    }

    const newX = pos.x + finalVx * delta;
    const newZ = pos.z + finalVz * delta;
    
    bodyRef.current.setNextKinematicTranslation({ x: newX, y: pos.y, z: newZ });

    // ===== انیمیشن راه رفتن =====
    const isMoving = Math.abs(moveDirRef.current) > 0.5;
    
    if (isMoving) {
      walkPhaseRef.current += delta * 7;
    } else {
      // برگشت آرام به حالت ایستاده
      walkPhaseRef.current = THREE.MathUtils.lerp(walkPhaseRef.current, 0, delta * 5);
    }
    
    const walkCycle = Math.sin(walkPhaseRef.current);
    const walkCycle2 = Math.sin(walkPhaseRef.current + Math.PI);
    
    // پای چپ و راست
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = walkCycle * 0.6;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = walkCycle2 * 0.6;
    }
    
    // دست چپ swing خیلی کم (چون تفنگ گرفته)
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = walkCycle2 * 0.1 - 0.1;
    }
    
    // دست راست swing خیلی کم (چون روی ماشه)
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = walkCycle * 0.05;
    }

    // ===== bob بدن هنگام راه رفتن =====
    const bob = isMoving ? Math.abs(Math.sin(walkPhaseRef.current)) * 0.04 : 0;
    if (bodyGroupRef.current) {
      bodyGroupRef.current.position.y = bob;
    }

    // ===== سر - تنفس + نگاه به اطراف =====
    if (headRef.current) {
      const breathe = Math.sin(timeRef.current * 1.5) * 0.008;
      const lookAround = Math.sin(timeRef.current * 0.5) * 0.08;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, lookAround, delta * 2);
      headRef.current.position.y = 1.72 + breathe;
    }

    // ===== شلیک =====
    const shotCooldown = 0.6 + Math.random() * 0.4;
    
    if (!isReloadingRef.current && now - lastShotTimeRef.current > shotCooldown) {
      lastShotTimeRef.current = now;
      ammoRef.current--;
      muzzleFlashTimerRef.current = 0.08;
      soundManager.playEnemyShoot();

      const forwardX2 = Math.sin(faceY);
      const forwardZ2 = Math.cos(faceY);
      const muzzleX = newX + forwardX2 * 0.9;
      const muzzleY = MUZZLE_Y;
      const muzzleZ = newZ + forwardZ2 * 0.9;

      const aimX = nearestEnemyPos.x - muzzleX;
      const aimY = 0;
      const aimZ = nearestEnemyPos.z - muzzleZ;
      const len = Math.sqrt(aimX * aimX + aimY * aimY + aimZ * aimZ);
      
      const spread = 0.01;
      const dirX = aimX / len + (Math.random() - 0.5) * spread;
      const dirY = aimY / len + (Math.random() - 0.5) * spread * 0.3;
      const dirZ = aimZ / len + (Math.random() - 0.5) * spread;
      const finalLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

      spawnProjectile({
        team: combatant.team,
        position: [muzzleX, muzzleY, muzzleZ],
        direction: [dirX / finalLen, dirY / finalLen, dirZ / finalLen],
        speed: 50,
        damage: combatant.damage,
        life: 4.0,
      });

      if (ammoRef.current <= 0) {
        isReloadingRef.current = true;
        reloadTimerRef.current = 2.0;
      }
    }

    if (muzzleRef.current) {
      muzzleRef.current.visible = muzzleFlashTimerRef.current > 0;
    }
  });

  const teamColor = isRed ? '#dc2626' : '#2563eb';
  const teamBright = isRed ? '#fca5a5' : '#93c5fd';
  const uniformMain = isRed ? '#7f1d1d' : '#1e40af';
  const uniformLight = isRed ? '#991b1b' : '#1d4ed8';
  const vestColor = '#0a0c10';
  const skinColor = '#d4a373';
  const helmetColor = '#0a0c10';
  const balaclavaColor = '#050608';
  
  const healthRatio = combatant.health / combatant.maxHealth;

  const HIP_Y = 0.95;
  const CHEST_Y = 1.28;
  const SHOULDER_Y = 1.45;
  const HEAD_Y = 1.72;

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      type="kinematicPosition"
      position={[combatant.position[0], combatant.position[1], combatant.position[2]]}
    >
      <CapsuleCollider args={[0.85, 0.15]} position={[0, 1.0, 0]} />

      {/* ============ bodyGroup: برای bob هنگام راه رفتن ============ */}
      <group ref={bodyGroupRef}>

        {/* ============ پای چپ (با انیمیشن) ============ */}
        <group ref={leftLegRef} position={[-0.11, HIP_Y, 0]}>
          {/* ران */}
          <mesh position={[0, -0.22, 0]} castShadow userData={{ combatantId: combatant.id }}>
            <capsuleGeometry args={[0.095, 0.35, 6, 12]} />
            <meshStandardMaterial color={uniformMain} roughness={0.85} />
          </mesh>
          {/* ساق */}
          <mesh position={[0, -0.68, 0.01]} castShadow userData={{ combatantId: combatant.id }}>
            <capsuleGeometry args={[0.075, 0.4, 6, 12]} />
            <meshStandardMaterial color={uniformMain} roughness={0.85} />
          </mesh>
          {/* پوتین */}
          <mesh position={[0, -0.92, 0.07]} castShadow userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.15, 0.1, 0.26]} />
            <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.8} />
          </mesh>
        </group>

        {/* ============ پای راست ============ */}
        <group ref={rightLegRef} position={[0.11, HIP_Y, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow userData={{ combatantId: combatant.id }}>
            <capsuleGeometry args={[0.095, 0.35, 6, 12]} />
            <meshStandardMaterial color={uniformMain} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.68, 0.01]} castShadow userData={{ combatantId: combatant.id }}>
            <capsuleGeometry args={[0.075, 0.4, 6, 12]} />
            <meshStandardMaterial color={uniformMain} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.92, 0.07]} castShadow userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.15, 0.1, 0.26]} />
            <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.8} />
          </mesh>
        </group>

        {/* ============ لگن و کمر (ثابت) ============ */}
        <mesh position={[0, HIP_Y, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.36, 0.15, 0.24]} />
          <meshStandardMaterial color={uniformMain} roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.05, 0]} userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.38, 0.08, 0.26]} />
          <meshStandardMaterial color="#0a0c10" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.36, 0.12, 0.24]} />
          <meshStandardMaterial color={uniformMain} roughness={0.85} />
        </mesh>

        {/* ============ سینه (ثابت) ============ */}
        <mesh position={[0, CHEST_Y, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.46, 0.42, 0.26]} />
          <meshStandardMaterial color={uniformMain} roughness={0.75} metalness={0.1} />
        </mesh>
        <mesh position={[0, CHEST_Y + 0.02, 0.14]} userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.42, 0.42, 0.03]} />
          <meshStandardMaterial color={vestColor} metalness={0.3} roughness={0.85} />
        </mesh>
        <mesh position={[0, CHEST_Y + 0.02, -0.14]} userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.42, 0.42, 0.03]} />
          <meshStandardMaterial color={vestColor} metalness={0.3} roughness={0.85} />
        </mesh>
        <mesh position={[0, CHEST_Y + 0.19, 0.155]} userData={{ combatantId: combatant.id }}>
          <boxGeometry args={[0.28, 0.025, 0.005]} />
          <meshStandardMaterial color={teamBright} emissive={teamBright} emissiveIntensity={2} toneMapped={false} />
        </mesh>

        {/* شانه‌ها */}
        <mesh position={[-0.28, SHOULDER_Y, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial color={uniformLight} roughness={0.85} />
        </mesh>
        <mesh position={[0.28, SHOULDER_Y, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial color={uniformLight} roughness={0.85} />
        </mesh>

        {/* گردن */}
        <mesh position={[0, 1.55, 0]} castShadow userData={{ combatantId: combatant.id }}>
          <cylinderGeometry args={[0.09, 0.11, 0.12, 10]} />
          <meshStandardMaterial color={uniformMain} roughness={0.85} />
        </mesh>

        {/* ============ سر (با انیمیشن) ============ */}
        <group ref={headRef} position={[0, HEAD_Y, 0]}>
          <mesh castShadow userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.16, 18, 18]} />
            <meshStandardMaterial color={balaclavaColor} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.06, -0.01]} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.18, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
            <meshStandardMaterial color={helmetColor} metalness={0.4} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.07, 0.05]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.16, 0.02, 0.005]} />
            <meshStandardMaterial color={teamBright} emissive={teamBright} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.02, 0.14]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.22, 0.08, 0.04]} />
            <meshStandardMaterial color={skinColor} roughness={0.9} />
          </mesh>
          <mesh position={[-0.06, 0.02, 0.16]} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.16]} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <mesh position={[-0.06, 0.02, 0.18]} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[0.06, 0.02, 0.18]} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.013, 8, 8]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>

        {/* ============ دست راست (روی ماشه) ============ */}
        <group ref={rightArmRef} position={[0.28, SHOULDER_Y, 0]}>
          <Limb start={[0, 0, 0]} end={[-0.09, -0.35, 0.07]} radius={0.09} color={uniformMain} combatantId={combatant.id} />
          <Limb start={[-0.09, -0.35, 0.07]} end={[-0.16, -0.63, 0.13]} radius={0.075} color={uniformLight} combatantId={combatant.id} />
          <mesh position={[-0.16, -0.63, 0.13]} castShadow userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color={vestColor} metalness={0.2} roughness={0.85} />
          </mesh>
        </group>

        {/* ============ دست چپ (روی Handguard) ============ */}
        <group ref={leftArmRef} position={[-0.28, SHOULDER_Y, 0]}>
          <Limb start={[0, 0, 0]} end={[0.11, -0.25, 0.27]} radius={0.09} color={uniformMain} combatantId={combatant.id} />
          <Limb start={[0.11, -0.25, 0.27]} end={[0.21, -0.50, 0.51]} radius={0.075} color={uniformLight} combatantId={combatant.id} />
          <mesh position={[0.21, -0.50, 0.51]} castShadow userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color={vestColor} metalness={0.2} roughness={0.85} />
          </mesh>
        </group>

        {/* ============ تفنگ ============ */}
        <group position={[0.12, 1.4, 0.35]}>
          <mesh castShadow userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.07, 0.1, 0.55]} />
            <meshStandardMaterial color="#1a1c1f" metalness={0.9} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.06, 0]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.045, 0.012, 0.52]} />
            <meshStandardMaterial color="#0a0c10" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.15, -0.05]} rotation={[0.2, 0, 0]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.055, 0.18, 0.1]} />
            <meshStandardMaterial color="#0f1114" metalness={0.7} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.28]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.065, 0.08, 0.24]} />
            <meshStandardMaterial color="#0f1114" metalness={0.85} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.01, 0.63]} rotation={[Math.PI / 2, 0, 0]} userData={{ combatantId: combatant.id }}>
            <cylinderGeometry args={[0.018, 0.022, 0.35, 12]} />
            <meshStandardMaterial color="#050608" metalness={0.98} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.01, 0.83]} rotation={[Math.PI / 2, 0, 0]} userData={{ combatantId: combatant.id }}>
            <cylinderGeometry args={[0.03, 0.028, 0.05, 12]} />
            <meshStandardMaterial color="#0a0c10" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0.038, 0, -0.05]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.002, 0.04, 0.5]} />
            <meshStandardMaterial color={teamColor} emissive={teamColor} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          <mesh position={[-0.038, 0, -0.05]} userData={{ combatantId: combatant.id }}>
            <boxGeometry args={[0.002, 0.04, 0.5]} />
            <meshStandardMaterial color={teamColor} emissive={teamColor} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          <mesh ref={muzzleRef} position={[0, 0.01, 0.9]} visible={false} userData={{ combatantId: combatant.id }}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color={isRed ? '#ff5252' : '#93c5fd'} transparent opacity={0.95} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      </group>

      {/* نوار سلامت (خارج از bodyGroup) */}
      <group position={[0, 2.15, 0]}>
        <mesh>
          <planeGeometry args={[0.7, 0.08]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.35 + healthRatio * 0.35, 0, 0.001]}>
          <planeGeometry args={[healthRatio * 0.7, 0.08]} />
          <meshBasicMaterial
            color={healthRatio > 0.5 ? (isRed ? '#ef4444' : '#3b82f6') : healthRatio > 0.25 ? '#f59e0b' : '#dc2626'}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};