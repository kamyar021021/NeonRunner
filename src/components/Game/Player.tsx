import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

export const Player = () => {
  const { camera } = useThree() as { camera: THREE.PerspectiveCamera };
  const rigidBodyRef = useRef<any>(null);
  
  const keysRef = useRef({
    forward: false, backward: false, left: false, right: false, jump: false, sprint: false,
  });

  const isAiming = useGameStore((s) => s.isAiming);
  const isGameOver = useGameStore((s) => s.isGameOver);

  const walkSpeed = 8;
  const sprintSpeed = 14;
  const jumpForce = 6;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = keysRef.current;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': k.forward = true; break;
        case 'KeyS': case 'ArrowDown': k.backward = true; break;
        case 'KeyA': case 'ArrowLeft': k.left = true; break;
        case 'KeyD': case 'ArrowRight': k.right = true; break;
        case 'Space': k.jump = true; break;
        case 'ShiftLeft': case 'ShiftRight': k.sprint = true; break;
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = keysRef.current;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': k.forward = false; break;
        case 'KeyS': case 'ArrowDown': k.backward = false; break;
        case 'KeyA': case 'ArrowLeft': k.left = false; break;
        case 'KeyD': case 'ArrowRight': k.right = false; break;
        case 'Space': k.jump = false; break;
        case 'ShiftLeft': case 'ShiftRight': k.sprint = false; break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, delta) => {
    if (!rigidBodyRef.current || isGameOver) return;
    
    const keys = keysRef.current;
    
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();
    
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();
    
    const moveDir = new THREE.Vector3();
    if (keys.forward) moveDir.add(camForward);
    if (keys.backward) moveDir.sub(camForward);
    if (keys.right) moveDir.add(camRight);
    if (keys.left) moveDir.sub(camRight);
    
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const currentSpeed = keys.sprint ? sprintSpeed : walkSpeed;
      moveDir.multiplyScalar(currentSpeed);
    }
    
    const currentVel = rigidBodyRef.current.linvel();
    rigidBodyRef.current.setLinvel({
      x: moveDir.x, y: currentVel.y, z: moveDir.z,
    }, true);

    if (keys.jump && Math.abs(currentVel.y) < 0.5) {
      rigidBodyRef.current.setLinvel({
        x: currentVel.x, y: jumpForce, z: currentVel.z,
      }, true);
    }

    const pos = rigidBodyRef.current.translation();
    
    if (pos.y < -10) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 14 }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    const bobAmount = keys.sprint && moveDir.lengthSq() > 0 
      ? Math.sin(Date.now() * 0.015) * 0.05 : 0;
    
    camera.position.set(pos.x, pos.y + 1.5 + bobAmount, pos.z);

    const targetFov = isAiming ? 35 : 75;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 12);
    camera.updateProjectionMatrix();
  });

  return (
    <>
      <PointerLockControls />
      <RigidBody 
        ref={rigidBodyRef} 
        colliders={false} 
        mass={1} 
        type="dynamic" 
        position={[0, 3, 14]}
        enabledRotations={[false, false, false]}
        friction={0.5}
        linearDamping={0.5}
      >
        <CapsuleCollider args={[0.5, 0.5]} />
      </RigidBody>
    </>
  );
};