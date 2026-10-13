import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RunnerPlayer } from './RunnerPlayer';
import { RunnerObstacles } from './RunnerObstacles';
import { RunnerTrack } from './RunnerTrack';
import { RunnerSky } from './RunnerSky';
import { RunnerHUD } from './RunnerHUD';
import { RunnerParticles } from './RunnerParticles';
import { gameRef, useRunnerStore } from '../../store/useRunnerStore';
import { soundManager } from '../../utils/sound';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
};

// ⭐ Pause فقط وقتی کاربر Pause زده (نه game over)
const PauseController = () => {
  const { clock } = useThree();
  const isPaused = useRunnerStore((s) => s.isPaused);

  useEffect(() => {
    if (isPaused) {
      clock.stop();
      clock.getDelta();
    } else {
      clock.start();
      clock.getDelta();
    }
  }, [isPaused, clock]);

  return null;
};

// ⭐ ذخیره‌ی موقعیت پایه‌ی دوربین (قبل از crash)
const CameraBaseTracker = () => {
  const { camera } = useThree();

  useFrame(() => {
    const state = useRunnerStore.getState();
    if (!state.isGameOver && state.isGameStarted) {
      const cam = camera as any;
      cam.userData = cam.userData || {};
      cam.userData.basePos = {
        x: cam.position.x,
        y: cam.position.y,
        z: cam.position.z,
      };
    }
  });

  return null;
};

// ⭐ Camera Shake — فقط 0.8 ثانیه بعد از crash، محدود
const CameraShake = () => {
  const { camera } = useThree();

  useFrame(() => {
    const state = useRunnerStore.getState();
    if (!state.isGameOver) return;

    const elapsed = (performance.now() - state.crashTime) / 1000;
    if (elapsed > 0.8) return;

    const intensity = 0.4 * (1 - elapsed / 0.8);
    const cam = camera as any;

    if (cam.userData?.basePos) {
      const base = cam.userData.basePos;
      cam.position.set(
        base.x + (Math.random() - 0.5) * intensity,
        base.y + (Math.random() - 0.5) * intensity,
        base.z
      );
    }
  });

  return null;
};

// ⭐ دوربین توی منو آروم تکون می‌خوره
const MenuCameraIdle = () => {
  const { camera } = useThree();
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    const state = useRunnerStore.getState();
    if (state.isGameStarted) return;

    timeRef.current += delta;
    const t = timeRef.current;
    const cam = camera as any;

    cam.position.set(
      Math.sin(t * 0.3) * 0.8,
      1.7 + Math.sin(t * 0.5) * 0.05,
      0
    );
    cam.lookAt(Math.sin(t * 0.2) * 1.5, 0.3, -12);
    if (cam.rotation) cam.rotation.z = 0;
  });

  return null;
};

const DynamicFog = () => {
  const { scene } = useThree();
  const fogRef = useRef<THREE.Fog | null>(null);

  useFrame(() => {
    const state = useRunnerStore.getState();
    if (!state.isGameStarted || state.isGameOver || state.isPaused) {
      if (!fogRef.current) {
        fogRef.current = new THREE.Fog('#050114', 30, 70);
        scene.fog = fogRef.current;
      }
      return;
    }

    const speedFactor = Math.max(0, gameRef.speed - 14) / 86;
    const fogNear = 30 + speedFactor * 45;
    const fogFar = 70 + speedFactor * 90;

    if (!fogRef.current) {
      fogRef.current = new THREE.Fog('#050114', fogNear, fogFar);
      scene.fog = fogRef.current;
    } else {
      fogRef.current.near = THREE.MathUtils.lerp(fogRef.current.near, fogNear, 0.05);
      fogRef.current.far = THREE.MathUtils.lerp(fogRef.current.far, fogFar, 0.05);
    }
  });

  return null;
};

// ⭐ افکت‌های Crash — تدریجاً محو می‌شن
const CrashEffects = () => {
  const [intensity, setIntensity] = useState(0);

  useFrame(() => {
    const state = useRunnerStore.getState();
    if (!state.isGameOver) {
      if (intensity !== 0) setIntensity(0);
      return;
    }

    const elapsed = (performance.now() - state.crashTime) / 1000;
    if (elapsed > 1.2) {
      if (intensity !== 0) setIntensity(0);
      return;
    }

    let v: number;
    if (elapsed < 0.15) {
      v = elapsed / 0.15;
    } else {
      v = Math.max(0, 1 - (elapsed - 0.15) / 1.05);
    }

    if (Math.abs(v - intensity) > 0.02) {
      setIntensity(v);
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.0 + intensity * 3}
        luminanceThreshold={Math.max(0.1, 0.35 - intensity * 0.15)}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.5 + intensity * 0.5}
      />
      {intensity > 0.02 && (
        <ChromaticAberration
          offset={[0.003 * intensity, 0.003 * intensity] as any}
          radialModulation={false}
          modulationOffset={0}
        />
      )}
      <Vignette eskil={false} offset={0.2} darkness={0.75 + intensity * 0.2} />
    </EffectComposer>
  );
};

export const RunnerScene = () => {
  const isGameOver = useRunnerStore((s) => s.isGameOver);
  const [particlesActive, setParticlesActive] = useState(false);
  const [mobile] = useState(isMobileDevice());

  useEffect(() => {
    if (isGameOver) {
      setParticlesActive(true);
      soundManager.playCrash();
      if ('vibrate' in navigator) {
        try { (navigator as any).vibrate([100, 50, 100]); } catch {}
      }
      setTimeout(() => setParticlesActive(false), 2500);
    }
  }, [isGameOver]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#050114', overflow: 'hidden', touchAction: 'none' }}>
      <Canvas
        camera={{
          fov: mobile ? 85 : 75,
          position: [0, 1.7, 0],
          near: 0.1,
          far: mobile ? 200 : 250
        }}
        dpr={mobile ? [1, 1] : [1, 1.25]}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
      >
        <color attach="background" args={['#050114']} />
        <fog attach="fog" args={['#050114', 30, 70]} />

        <ambientLight intensity={0.7} />

        <group position={[0, 4, 3]}>
          <pointLight intensity={2.5} color="#22d3ee" distance={25} decay={2} />
        </group>
        <group position={[0, 6, -15]}>
          <pointLight intensity={1.5} color="#a78bfa" distance={40} decay={2} />
        </group>

        <PauseController />
        <CameraBaseTracker />
        <CameraShake />
        <MenuCameraIdle />
        <DynamicFog />

        <RunnerSky />
        <RunnerTrack />
        <RunnerObstacles />
        <RunnerPlayer />

        <RunnerParticles
          active={particlesActive}
          origin={[gameRef.playerX, 0, 0]}
          count={mobile ? 50 : 80}
        />

        <CrashEffects />
      </Canvas>

      <RunnerHUD />
    </div>
  );
};