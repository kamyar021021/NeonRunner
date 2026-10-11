import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { soundManager } from '../../utils/sound';

export const Weapon = () => {
    const { camera, scene } = useThree();
    const weaponRef = useRef<THREE.Group>(null);
    const muzzleRef = useRef<THREE.Mesh>(null);

    const recoilXRef = useRef(0);
    const recoilZRef = useRef(0);
    const recoilRotRef = useRef(0);
    const horizontalShakeRef = useRef(0);
    const muzzleFlashRef = useRef(0);

    const isFiringRef = useRef(false);
    const lastShotTimeRef = useRef(0);
    const fireRate = 0.18;

    const shoot = useGameStore((s) => s.shoot);
    const reload = useGameStore((s) => s.reload);
    const ammo = useGameStore((s) => s.ammo);
    const isReloading = useGameStore((s) => s.isReloading);
    const damageCombatant = useGameStore((s) => s.damageCombatant);
    const setAiming = useGameStore((s) => s.setAiming);
    const isAiming = useGameStore((s) => s.isAiming);
    const isGameOver = useGameStore((s) => s.isGameOver);
    const isGameStarted = useGameStore((s) => s.isGameStarted);

    const raycaster = new THREE.Raycaster();
    const timeRef = useRef(0);

    const isIgnoredObject = (obj: THREE.Object3D): boolean => {
        let current: THREE.Object3D | null = obj;
        while (current) {
            if (current.userData?.isWeapon) return true;
            if (current.userData?.isProjectile) return true;
            // فیلتر یارهای آبی
            if (current.userData?.team === 'blue') return true;
            current = current.parent;
        }
        return false;
    };

    const findCombatantId = (obj: THREE.Object3D | null): string | undefined => {
        let current: THREE.Object3D | null = obj;
        while (current) {
            if (current.userData?.combatantId) return current.userData.combatantId;
            current = current.parent;
        }
        return undefined;
    };

    const spawnBeam = (start: THREE.Vector3, end: THREE.Vector3) => {
        const dist = start.distanceTo(end);
        if (dist < 0.01) return;

        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start).normalize();

        const coreGeo = new THREE.CylinderGeometry(0.012, 0.012, dist, 6);
        const coreMat = new THREE.MeshBasicMaterial({
            color: '#ffffff', transparent: true, opacity: 1, toneMapped: false,
            blending: THREE.AdditiveBlending,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.copy(mid);
        core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        scene.add(core);

        const glowGeo = new THREE.CylinderGeometry(0.035, 0.035, dist, 6);
        const glowMat = new THREE.MeshBasicMaterial({
            color: '#60a5fa', transparent: true, opacity: 0.7, toneMapped: false,
            blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(mid);
        glow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        scene.add(glow);

        const outerGeo = new THREE.CylinderGeometry(0.08, 0.08, dist, 6);
        const outerMat = new THREE.MeshBasicMaterial({
            color: '#3b82f6', transparent: true, opacity: 0.3, toneMapped: false,
            blending: THREE.AdditiveBlending,
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        outer.position.copy(mid);
        outer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        scene.add(outer);

        const impactGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const impactMat = new THREE.MeshBasicMaterial({
            color: '#93c5fd', transparent: true, opacity: 1, toneMapped: false,
            blending: THREE.AdditiveBlending,
        });
        const impact = new THREE.Mesh(impactGeo, impactMat);
        impact.position.copy(end);
        scene.add(impact);

        const startTime = performance.now();
        const duration = 90;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = elapsed / duration;

            if (t >= 1) {
                scene.remove(core, glow, outer, impact);
                coreGeo.dispose(); coreMat.dispose();
                glowGeo.dispose(); glowMat.dispose();
                outerGeo.dispose(); outerMat.dispose();
                impactGeo.dispose(); impactMat.dispose();
                return;
            }

            coreMat.opacity = 1 - t;
            glowMat.opacity = (1 - t) * 0.7;
            outerMat.opacity = (1 - t) * 0.3;
            impactMat.opacity = (1 - t);
            impact.scale.setScalar(1 + t * 2);

            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    };

    const fireBullet = () => {
        if (isGameOver || !isGameStarted) return;

        const currentAmmo = useGameStore.getState().ammo;
        if (currentAmmo > 0) soundManager.playShoot();
        else { soundManager.playEmptyClick(); return; }

        shoot();
        recoilXRef.current += 0.008 + Math.random() * 0.004;
        recoilZRef.current += 0.012 + Math.random() * 0.006;
        recoilRotRef.current += 0.01 + Math.random() * 0.008;
        horizontalShakeRef.current += (Math.random() - 0.5) * 0.01;
        muzzleFlashRef.current = 1;

        const startPoint = new THREE.Vector3();
        if (muzzleRef.current) muzzleRef.current.getWorldPosition(startPoint);
        else startPoint.copy(camera.position);

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.far = 250;

        const allHits = raycaster.intersectObjects(scene.children, true);
        const validHits = allHits.filter((h) => !isIgnoredObject(h.object));

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        let endPoint = startPoint.clone().add(camDir.clone().multiplyScalar(250));

        if (validHits.length > 0) {
            const hit = validHits[0];
            endPoint = hit.point.clone();

            const combatantId = findCombatantId(hit.object);
            if (combatantId) {
                const target = useGameStore.getState().combatants.find((c) => c.id === combatantId);
                if (target && target.team === 'red') {
                    damageCombatant(combatantId, 45);
                    soundManager.playHit();
                    if (target.health - 45 <= 0) soundManager.playEnemyDeath();
                }
            }

            const normal = hit.face?.normal;
            if (normal && !combatantId) {
                const worldNormal = normal.clone().transformDirection(hit.object.matrixWorld);
                const splatGeo = new THREE.CircleGeometry(0.15, 16);
                const splatMat = new THREE.MeshBasicMaterial({
                    color: '#1e3a8a', transparent: true, opacity: 0.8,
                    side: THREE.DoubleSide, depthWrite: false,
                });
                const splat = new THREE.Mesh(splatGeo, splatMat);
                splat.position.copy(hit.point).add(worldNormal.multiplyScalar(0.02));
                splat.lookAt(hit.point.clone().add(worldNormal));
                scene.add(splat);
                setTimeout(() => {
                    scene.remove(splat);
                    splatGeo.dispose(); splatMat.dispose();
                }, 3000);
            }
        }

        spawnBeam(startPoint, endPoint);
    };

    useFrame((_, delta) => {
        if (!weaponRef.current) return;
        timeRef.current += delta;

        if (isFiringRef.current && !isReloading && ammo > 0 && !isGameOver && isGameStarted) {
            lastShotTimeRef.current += delta;
            if (lastShotTimeRef.current >= fireRate) {
                lastShotTimeRef.current = 0;
                fireBullet();
            }
        } else if (isFiringRef.current && (isReloading || ammo === 0 || isGameOver || !isGameStarted)) {
            isFiringRef.current = false;
        }

        recoilXRef.current = THREE.MathUtils.damp(recoilXRef.current, 0, 18, delta);
        recoilZRef.current = THREE.MathUtils.damp(recoilZRef.current, 0, 18, delta);
        recoilRotRef.current = THREE.MathUtils.damp(recoilRotRef.current, 0, 16, delta);
        horizontalShakeRef.current = THREE.MathUtils.damp(horizontalShakeRef.current, 0, 14, delta);
        muzzleFlashRef.current = THREE.MathUtils.damp(muzzleFlashRef.current, 0, 25, delta);

        const swayX = Math.sin(timeRef.current * 1.1) * 0.003;
        const swayY = Math.cos(timeRef.current * 0.9) * 0.003;
        const swayRotZ = Math.sin(timeRef.current * 0.6) * 0.008;

        const aimFactor = isAiming ? 1 : 0;
        const targetX = 0.19 * (1 - aimFactor);
        const targetY = -0.17 * (1 - aimFactor) + (-0.12) * aimFactor;
        const targetZ = -0.45 * (1 - aimFactor) + (-0.35) * aimFactor;
        const swayMult = isAiming ? 0.1 : 1;
        const shakeMult = isAiming ? 0.4 : 1;

        weaponRef.current.position.copy(camera.position);
        weaponRef.current.quaternion.copy(camera.quaternion);

        weaponRef.current.translateX(targetX + swayX * swayMult + horizontalShakeRef.current * shakeMult);
        weaponRef.current.translateY(targetY + swayY * swayMult - recoilXRef.current * shakeMult);
        weaponRef.current.translateZ(targetZ + recoilZRef.current * shakeMult);

        weaponRef.current.rotateX(recoilRotRef.current * shakeMult);
        weaponRef.current.rotateZ(swayRotZ * swayMult);

        if (muzzleRef.current) {
            const mat = muzzleRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.2 + muzzleFlashRef.current * 8;
        }
    });

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0 && !isGameOver && isGameStarted) {
                // ===== تک‌تیر: یک گلوله در هر کلیک =====
                fireBullet();
            }
            if (e.button === 2 && !isGameOver && isGameStarted) setAiming(true);
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) { isFiringRef.current = false; lastShotTimeRef.current = 0; }
            if (e.button === 2) setAiming(false);
        };
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'r' || e.key === 'R') && !isGameOver && isGameStarted) {
                isFiringRef.current = false;
                soundManager.playReload();
                reload();
            }
        };
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [reload, setAiming, isGameOver, isGameStarted]);

    const FDE = '#8b7455';
    const FDE_LIGHT = '#a08a68';
    const BLACK_POLY = '#1a1c1f';
    const STEEL = '#3a3d42';
    const STEEL_BRIGHT = '#4a4d52';
    const MATTE_BLACK = '#15171a';
    const BRONZE = '#b8894a';

    return (
        <group ref={weaponRef} rotation={[0, -Math.PI / 30, 0]} userData={{ isWeapon: true, team: 'blue' }}>

            {/* STOCK */}
            <group position={[0, -0.005, 0.28]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.032, 0.026, 0.16, 12]} />
                    <meshStandardMaterial color={BLACK_POLY} metalness={0.2} roughness={0.75} />
                </mesh>
                <mesh position={[0, 0, 0.09]}>
                    <boxGeometry args={[0.055, 0.09, 0.015]} />
                    <meshStandardMaterial color="#0f1114" roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.001, 0.001, 0.15, 6]} />
                    <meshStandardMaterial color={BRONZE} metalness={0.9} roughness={0.3} />
                </mesh>
            </group>

            {/* RECEIVER */}
            <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[0.062, 0.075, 0.28]} />
                <meshPhysicalMaterial color={FDE} metalness={0.6} roughness={0.55} clearcoat={0.2} />
            </mesh>

            <mesh position={[0, 0.045, 0.05]}>
                <boxGeometry args={[0.048, 0.012, 0.3]} />
                <meshStandardMaterial color={BLACK_POLY} metalness={0.9} roughness={0.25} />
            </mesh>
            {Array.from({ length: 12 }).map((_, i) => (
                <mesh key={i} position={[0, 0.052, -0.08 + i * 0.022]}>
                    <boxGeometry args={[0.048, 0.004, 0.008]} />
                    <meshStandardMaterial color="#0f1114" metalness={0.85} roughness={0.35} />
                </mesh>
            ))}

            <mesh position={[0.032, 0.01, 0.05]}>
                <boxGeometry args={[0.001, 0.003, 0.26]} />
                <meshStandardMaterial color={BRONZE} metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[-0.032, 0.01, 0.05]}>
                <boxGeometry args={[0.001, 0.003, 0.26]} />
                <meshStandardMaterial color={BRONZE} metalness={0.9} roughness={0.25} />
            </mesh>

            {/* HANDGUARD */}
            <mesh position={[0, 0.005, -0.25]}>
                <boxGeometry args={[0.058, 0.062, 0.32]} />
                <meshPhysicalMaterial color={FDE_LIGHT} metalness={0.55} roughness={0.6} clearcoat={0.15} />
            </mesh>

            {[-0.12, -0.18, -0.24, -0.3, -0.36].map((z, i) => (
                <mesh key={`r${i}`} position={[0.03, 0.005, z]}>
                    <boxGeometry args={[0.001, 0.028, 0.03]} />
                    <meshStandardMaterial color="#1a1712" roughness={0.95} />
                </mesh>
            ))}
            {[-0.12, -0.18, -0.24, -0.3, -0.36].map((z, i) => (
                <mesh key={`l${i}`} position={[-0.03, 0.005, z]}>
                    <boxGeometry args={[0.001, 0.028, 0.03]} />
                    <meshStandardMaterial color="#1a1712" roughness={0.95} />
                </mesh>
            ))}

            <mesh position={[0, 0.033, -0.25]}>
                <boxGeometry args={[0.059, 0.002, 0.3]} />
                <meshStandardMaterial color={BRONZE} metalness={1} roughness={0.2} />
            </mesh>

            {/* BARREL */}
            <mesh position={[0, 0.01, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.014, 0.016, 0.35, 20]} />
                <meshPhysicalMaterial color={STEEL} metalness={1} roughness={0.15} clearcoat={0.8} />
            </mesh>

            {/* MUZZLE */}
            <group position={[0, 0.01, -0.76]}>
                <mesh ref={muzzleRef} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.024, 0.022, 0.07, 16]} />
                    <meshPhysicalMaterial
                        color={STEEL_BRIGHT} emissive="#3b82f6" emissiveIntensity={0.2}
                        metalness={1} roughness={0.1} clearcoat={1}
                    />
                </mesh>
                <mesh position={[0, 0, 0.04]}>
                    <torusGeometry args={[0.023, 0.002, 8, 24]} />
                    <meshStandardMaterial color={BRONZE} metalness={1} roughness={0.15} />
                </mesh>
            </group>

            {/* SCOPE */}
            <group position={[0, 0.085, -0.08]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.021, 0.021, 0.19, 20]} />
                    <meshPhysicalMaterial color={STEEL} metalness={0.95} roughness={0.2} clearcoat={0.7} />
                </mesh>
                <mesh position={[0, 0, -0.115]}>
                    <circleGeometry args={[0.021, 20]} />
                    <meshPhysicalMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={2} metalness={1} roughness={0} />
                </mesh>
                <mesh position={[0, -0.04, -0.05]}>
                    <boxGeometry args={[0.045, 0.035, 0.022]} />
                    <meshStandardMaterial color={BLACK_POLY} metalness={0.9} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.04, 0.05]}>
                    <boxGeometry args={[0.045, 0.035, 0.022]} />
                    <meshStandardMaterial color={BLACK_POLY} metalness={0.9} roughness={0.3} />
                </mesh>
            </group>

            {/* GRIP */}
            <mesh position={[0, -0.115, 0.08]} rotation={[Math.PI / 6, 0, 0]}>
                <boxGeometry args={[0.052, 0.15, 0.06]} />
                <meshStandardMaterial color={BLACK_POLY} metalness={0.15} roughness={0.9} />
            </mesh>

            {/* TRIGGER */}
            <mesh position={[0, -0.055, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.024, 0.004, 8, 20, Math.PI]} />
                <meshStandardMaterial color={BLACK_POLY} metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.065, 0]} rotation={[Math.PI / 5, 0, 0]}>
                <boxGeometry args={[0.008, 0.03, 0.01]} />
                <meshStandardMaterial color={STEEL_BRIGHT} metalness={1} roughness={0.2} />
            </mesh>

            {/* MAGAZINE */}
            <group position={[0, -0.1, -0.12]} rotation={[Math.PI / 22, 0, 0]}>
                <mesh position={[0, -0.06, 0]}>
                    <boxGeometry args={[0.052, 0.14, 0.08]} />
                    <meshPhysicalMaterial color={MATTE_BLACK} metalness={0.3} roughness={0.8} clearcoat={0.1} />
                </mesh>
                <mesh position={[0, -0.09, 0]}>
                    <boxGeometry args={[0.053, 0.004, 0.081]} />
                    <meshStandardMaterial color={BRONZE} metalness={1} roughness={0.2} />
                </mesh>
            </group>

            {muzzleFlashRef.current > 0.05 && (
                <mesh position={[0, 0.01, -0.8]}>
                    <sphereGeometry args={[muzzleFlashRef.current * 0.1, 8, 8]} />
                    <meshBasicMaterial color="#93c5fd" transparent opacity={muzzleFlashRef.current * 0.9} toneMapped={false} blending={THREE.AdditiveBlending} />
                </mesh>
            )}

            <pointLight color="#3b82f6" intensity={0.3} distance={0.6} position={[0, 0.085, -0.08]} />
        </group>
    );
};