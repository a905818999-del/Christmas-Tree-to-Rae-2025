import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoliageProps } from '../types';

const TopStar: React.FC<FoliageProps> = ({ progress }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // The star sits at the top of the tree
  const TREE_TOP_Y = 11.5;

  // Create 3D Star Shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.0;
    const innerRadius = 0.4;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 2,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center(); // Center the pivot
    return geom;
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !lightRef.current) return;

    const t = progress.current;
    const time = state.clock.elapsedTime;
    
    // Position Logic (Chaos to Tree)
    const chaosX = Math.sin(time) * 5;
    const chaosY = 15 + Math.cos(time * 0.5) * 5;
    const chaosZ = Math.cos(time) * 5;

    const targetX = 0;
    const targetY = TREE_TOP_Y;
    const targetZ = 0;

    meshRef.current.position.x = THREE.MathUtils.lerp(chaosX, targetX, t);
    meshRef.current.position.y = THREE.MathUtils.lerp(chaosY, targetY, t);
    meshRef.current.position.z = THREE.MathUtils.lerp(chaosZ, targetZ, t);

    // Rotation (Slower spin for elegance)
    meshRef.current.rotation.y += 0.005; 
    // Gentle wobble
    meshRef.current.rotation.z = Math.sin(time * 2) * 0.05;

    // --- Dynamic Magical Pulse ---
    // 1. Primary Breath (Slow, deep pulse)
    const breath = Math.sin(time * 1.5) * 0.5 + 0.5; // Normalizes to 0..1
    
    // 2. Secondary Shimmer (Faster, slightly irregular)
    const shimmer = Math.sin(time * 5.0 + Math.cos(time * 1.5)) * 0.15;

    // Combine intensities
    // Base intensity of 1.5, plus up to 1.5 from breath, plus shimmer
    const intensity = 1.5 + (breath * 1.5) + shimmer;

    // Apply to PointLight (scaled up for reach)
    lightRef.current.intensity = intensity * 2.5 * t; 
    
    // Apply to Emissive Material
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    if (material) {
        material.emissiveIntensity = intensity * t;
    }
    
    // Scale up when forming tree - Reduced max size to 0.8
    const scale = THREE.MathUtils.lerp(0.1, 0.8, t); 
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={starGeometry}>
        <meshStandardMaterial 
          color="#FFB300" 
          emissive="#FFB300"
          emissiveIntensity={2}
          toneMapped={false}
          roughness={0.2}
          metalness={1.0}
        />
      </mesh>
      <pointLight 
        ref={lightRef} 
        color="#FFCC00" 
        distance={35} 
        decay={2} 
      />
    </group>
  );
};

export default TopStar;