import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoliageProps } from '../types';

const SPHERE_COUNT = 300; 
const CUBE_COUNT = 200;   

const COLOR_METALLIC_GOLD = new THREE.Color('#FFD700');
const COLOR_RUBY_RED = new THREE.Color('#C41E3A');
const COLOR_DIAMOND = new THREE.Color('#E0F2FE');

// Utility to generate positions (kept for code clarity in Ornaments as call count is low)
const randomInSphere = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
};

const Ornaments: React.FC<FoliageProps> = ({ progress }) => {
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  
  // Track the "physical" progress of the ornaments (for lag effect)
  const currentProgress = useRef(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate Data for Spheres
  const sphereData = useMemo(() => {
    return new Array(SPHERE_COUNT).fill(null).map((_, i) => {
      // Chaos
      const chaos = randomInSphere(20);
      
      // Tree: Spiral
      // DISTRIBUTION FIX: Uniform Surface Density
      // Linear i would cause clustering at the top. We map i to t using inverse surface area CDF.
      // t = 1 - sqrt(1 - u) where u is normalized index.
      const u = i / SPHERE_COUNT;
      const t = 1 - Math.sqrt(1 - u);

      const angle = t * Math.PI * 18 + Math.random(); // Random offset
      const height = (t * 20) - 10;
      const radius = (1 - t) * 7.5; // Slightly wider than foliage (6-7)

      const tree = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      const color = Math.random() > 0.5 ? COLOR_METALLIC_GOLD : COLOR_RUBY_RED;
      const scale = Math.random() * 0.3 + 0.2;

      return { chaos, tree, color, scale };
    });
  }, []);

  // Generate Data for Cubes
  const cubeData = useMemo(() => {
    return new Array(CUBE_COUNT).fill(null).map((_, i) => {
      const chaos = randomInSphere(15);
      
      // Tree: Scattered
      // DISTRIBUTION FIX: Use Sqrt random to push more cubes to the bottom (larger area)
      const t = 1 - Math.sqrt(Math.random());

      const angle = Math.random() * Math.PI * 2 * 10;
      const height = (t * 20) - 10;
      const radius = (1 - t) * 7.0;

      const tree = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      const color = Math.random() > 0.7 ? COLOR_METALLIC_GOLD : COLOR_DIAMOND;
      const scale = Math.random() * 0.25 + 0.15;

      return { chaos, tree, color, scale };
    });
  }, []);

  // Initialize Colors
  useLayoutEffect(() => {
    if (sphereRef.current) {
      sphereData.forEach((data, i) => {
        sphereRef.current!.setColorAt(i, data.color);
      });
      // Safety check: instanceColor might be null if not initialized yet
      if (sphereRef.current.instanceColor) {
        sphereRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (cubeRef.current) {
      cubeData.forEach((data, i) => {
        cubeRef.current!.setColorAt(i, data.color);
      });
      // Safety check
      if (cubeRef.current.instanceColor) {
        cubeRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [sphereData, cubeData]);

  useFrame((state, delta) => {
    // 1. Calculate Lagged Progress
    // We lerp the current internal progress towards the target 'progress.current'
    const target = progress.current;
    const smoothing = 2.0 * delta; // Adjust for speed of "weight"
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, target, smoothing);
    
    // 2. Update Spheres
    if (sphereRef.current) {
      sphereData.forEach((data, i) => {
        // Interpolate position
        dummy.position.lerpVectors(data.chaos, data.tree, currentProgress.current);
        
        // Add a gentle idle rotation
        dummy.rotation.set(
            state.clock.elapsedTime * 0.2 + i, 
            state.clock.elapsedTime * 0.1, 
            0
        );
        
        dummy.scale.setScalar(data.scale);
        dummy.updateMatrix();
        sphereRef.current!.setMatrixAt(i, dummy.matrix);
      });
      sphereRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Update Cubes
    if (cubeRef.current) {
      cubeData.forEach((data, i) => {
        dummy.position.lerpVectors(data.chaos, data.tree, currentProgress.current);
        
        // Cubes spin faster
        dummy.rotation.set(
            state.clock.elapsedTime * 0.5 + i, 
            state.clock.elapsedTime * 0.5 + i, 
            i
        );
        
        dummy.scale.setScalar(data.scale);
        dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Spheres (Baubles) */}
      <instancedMesh ref={sphereRef} args={[undefined, undefined, SPHERE_COUNT]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
            roughness={0.1} 
            metalness={0.9} 
            emissive={new THREE.Color('#330000')}
            emissiveIntensity={0.2}
        />
      </instancedMesh>

      {/* Cubes (Gifts/Crystals) */}
      <instancedMesh ref={cubeRef} args={[undefined, undefined, CUBE_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial 
            color="#ffffff"
            roughness={0.0}
            metalness={0.1}
            transmission={0.9} // Glass-like
            thickness={1.5}
            ior={1.5}
            clearcoat={1}
        />
      </instancedMesh>
    </group>
  );
};

export default Ornaments;