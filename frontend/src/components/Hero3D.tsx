"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function RotatingCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particlePositions = useMemo(() => {
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.8 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouseX = state.mouse.x;
    const mouseY = state.mouse.y;

    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.35 + mouseX * 0.5;
      coreRef.current.rotation.x = t * 0.12 + mouseY * 0.3;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.25;
      wireRef.current.rotation.x = t * 0.08;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.2;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.16;
    if (particlesRef.current) particlesRef.current.rotation.y = t * 0.06;
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial
          color="#0e1420"
          metalness={0.6}
          roughness={0.25}
          emissive="#0b1a22"
          emissiveIntensity={0.6}
        />
      </mesh>

      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.65, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.35} />
      </mesh>

      <mesh ref={ring1Ref} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[2.3, 0.01, 8, 100]} />
        <meshBasicMaterial color="#6d5ef5" transparent opacity={0.5} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 1.7, 0, 0]} scale={1.25}>
        <torusGeometry args={[2.3, 0.01, 8, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#8fe9f5" size={0.02} transparent opacity={0.6} />
      </points>

      <ambientLight color="#223344" intensity={1.2} />
      <pointLight color="#22d3ee" position={[-2.5, 1.5, 3]} intensity={3.2} distance={12} />
      <pointLight color="#6d5ef5" position={[3, -1.5, 2]} intensity={2.6} distance={12} />
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <RotatingCore />
      </Canvas>
    </div>
  );
}