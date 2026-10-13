import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gameRef, useRunnerStore } from '../../store/useRunnerStore';
import { soundManager } from '../../utils/sound';

export const RunnerPlayer = () => {
  const { camera } = useThree();
  const timeRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useRunnerStore.getState();
      if (!state.isGameStarted || state.isGameOver || state.isPaused) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        state.moveLane(-1);
        soundManager.playLaneChange();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault();
        state.moveLane(1);
        soundManager.playLaneChange();
      }
    };

    let startX = 0, startY = 0, startT = 0;
    let isTouchOnButton = false;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      isTouchOnButton = !!target.closest('button');
      if (isTouchOnButton) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = performance.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isTouchOnButton) {
        isTouchOnButton = false;
        return;
      }
      const state = useRunnerStore.getState();
      if (!state.isGameStarted || state.isGameOver || state.isPaused) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = performance.now() - startT;
      if (dt > 500) return;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx > 0) {
          state.moveLane(1);
          soundManager.playLaneChange();
        } else {
          state.moveLane(-1);
          soundManager.playLaneChange();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  useFrame((_, delta) => {
    const state = useRunnerStore.getState();
    if (!state.isGameStarted || state.isPaused) return;

    timeRef.current += delta;

    // ⭐ بعد از مرگ، هیچی رو دست نزن (CameraShake مسئولشه)
    if (state.isGameOver) return;

    // حرکت بین لاین‌ها
    gameRef.playerX = THREE.MathUtils.damp(gameRef.playerX, gameRef.targetX, 20, delta);

    const bob = Math.sin(timeRef.current * 12) * 0.03;

    const cam = camera as any;
    // محدود کردن موقعیت دوربین
    const targetCamX = THREE.MathUtils.clamp(gameRef.playerX, -4, 4);
    const targetCamY = THREE.MathUtils.clamp(1.7 + bob, 1.4, 2.0);
    
    cam.position.set(targetCamX, targetCamY, 0);
    cam.lookAt(gameRef.playerX * 0.3, 0.3, -12);

    const tilt = (gameRef.targetX - gameRef.playerX) * -0.06;
    if (cam.rotation) cam.rotation.z = tilt;
  });

  return null;
};