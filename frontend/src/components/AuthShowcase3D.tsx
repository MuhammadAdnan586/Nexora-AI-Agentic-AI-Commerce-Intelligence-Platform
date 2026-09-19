"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingShape({
  position,
  geometry,
  color,
  speed = 1,
}: {
  position: [number, number, number];
  geometry: "icosahedron" | "torusKnot" | "box" | "octahedron";
  color: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.3;
      meshRef.current.rotation.x = Math.sin(t * 0.4) * 0.15;
      meshRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.15;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.2;
      wireRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.15;
    }
  });

  const geo = useMemo(() => {
    switch (geometry) {
      case "icosahedron":
        return <icosahedronGeometry args={[0.75, 1]} />;
      case "torusKnot":
        return <torusKnotGeometry args={[0.42, 0.14, 100, 16]} />;
      case "box":
        return <boxGeometry args={[0.9, 1.15, 0.9]} />;
      case "octahedron":
        return <octahedronGeometry args={[0.6, 0]} />;
    }
  }, [geometry]);

  const wireGeo = useMemo(() => {
    switch (geometry) {
      case "icosahedron":
        return <icosahedronGeometry args={[0.82, 1]} />;
      case "torusKnot":
        return <torusKnotGeometry args={[0.48, 0.16, 100, 16]} />;
      case "box":
        return <boxGeometry args={[0.98, 1.23, 0.98]} />;
      case "octahedron":
        return <octahedronGeometry args={[0.68, 0]} />;
    }
  }, [geometry]);

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        {geo}
        <meshStandardMaterial color="#0c1420" metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={wireRef}>
        {wireGeo}
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Scene() {
  const particlesRef = useRef<THREE.Points>(null);

  const particlePositions = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <>
      <FloatingShape position={[-2.6, -0.4, 0]} geometry="icosahedron" color="#4FE3F2" speed={1} />
      <FloatingShape position={[0, 0.6, -0.5]} geometry="torusKnot" color="#8B6BF0" speed={1.3} />
      <FloatingShape position={[2.4, -0.6, 0.3]} geometry="box" color="#4FE3F2" speed={0.8} />
      <FloatingShape position={[1, 1.8, -1]} geometry="octahedron" color="#8B6BF0" speed={1.6} />

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
        <pointsMaterial color="#9fe9f2" size={0.02} transparent opacity={0.5} />
      </points>

      <ambientLight color="#223344" intensity={0.9} />
      <pointLight color="#4FE3F2" position={[-3, 2, 3]} intensity={2.4} distance={14} />
      <pointLight color="#8B6BF0" position={[3, -1, 2]} intensity={2.2} distance={14} />
    </>
  );
}

export default function AuthShowcase3D() {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}