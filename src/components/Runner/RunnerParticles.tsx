import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

interface Props {
  active: boolean;
  origin?: [number, number, number];
  count?: number;
  onComplete?: () => void;
}

export const RunnerParticles = ({ active, origin = [0, 0, 0], count = 60, onComplete }: Props) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<Particle[]>([]);
  const elapsedRef = useRef(0);

  const maxParticles = count;

  const { positions, colors, sizes } = useMemo(() => {
    return {
      positions: new Float32Array(maxParticles * 3),
      colors: new Float32Array(maxParticles * 3),
      sizes: new Float32Array(maxParticles),
    };
  }, [maxParticles]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  // ⭐ Material با vertex colors و size attribute
  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return mat;
  }, []);

  // ⭐ Spawn particles when active becomes true
  useEffect(() => {
    if (!active) {
      // Reset
      particlesRef.current = [];
      elapsedRef.current = 0;
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }

    const palette = ['#22d3ee', '#a78bfa', '#f43f5e', '#fbbf24', '#22c55e', '#ffffff'];
    const particles: Particle[] = [];

    for (let i = 0; i < maxParticles; i++) {
      // Random direction (hemisphere)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 3 + Math.random() * 12;
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.cos(phi)) * speed + 2;
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      particles.push({
        position: new THREE.Vector3(origin[0], origin[1] + 1.2, origin[2]),
        velocity: new THREE.Vector3(vx, vy, vz),
        life: 1,
        maxLife: 1 + Math.random() * 0.8,
        color: new THREE.Color(palette[Math.floor(Math.random() * palette.length)]),
        size: 0.15 + Math.random() * 0.3,
      });
    }

    particlesRef.current = particles;
    elapsedRef.current = 0;

    // Set positions/colors initial
    const posArr = geometry.attributes.position.array as Float32Array;
    const colArr = geometry.attributes.color.array as Float32Array;
    const sizeArr = geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      posArr[i * 3] = p.position.x;
      posArr[i * 3 + 1] = p.position.y;
      posArr[i * 3 + 2] = p.position.z;
      colArr[i * 3] = p.color.r;
      colArr[i * 3 + 1] = p.color.g;
      colArr[i * 3 + 2] = p.color.b;
      sizeArr[i] = p.size;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    if (pointsRef.current) pointsRef.current.visible = true;
  }, [active, maxParticles, origin, geometry]);

  useFrame((_, delta) => {
    if (!pointsRef.current || particlesRef.current.length === 0) return;

    const posArr = geometry.attributes.position.array as Float32Array;
    let allDead = true;

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      if (p.life <= 0) {
        posArr[i * 3 + 1] = -100; // hide below
        continue;
      }
      allDead = false;

      p.life -= delta / p.maxLife;
      p.velocity.y -= 15 * delta; // gravity
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;

      posArr[i * 3] = p.position.x;
      posArr[i * 3 + 1] = p.position.y;
      posArr[i * 3 + 2] = p.position.z;
    }

    geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.max(0, particlesRef.current[0]?.life ?? 0);

    elapsedRef.current += delta;

    if (allDead && onComplete) {
      onComplete();
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      visible={active}
    />
  );
};