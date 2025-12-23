import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionMode } from '../types';

interface ElkProps {
  position: [number, number, number];
  rotation: [number, number, number];
  mode: InteractionMode;
  delay: number;
}

// --- CONSTANT GEOMETRY DATA ---
// Define the skeleton points for the Constellation Deer
const JOINTS = [
  // Body (Spine)
  new THREE.Vector3(-0.8, 1.2, 0),   // 0: Tail/Hip Base
  new THREE.Vector3(0.8, 1.2, 0),    // 1: Neck Base / Shoulder
  
  // Neck & Head
  new THREE.Vector3(1.2, 2.0, 0),    // 2: Head Base (Ear level)
  new THREE.Vector3(1.5, 1.8, 0),    // 3: Nose
  
  // Antlers (Branching from Head Base)
  new THREE.Vector3(1.3, 2.4, 0.3),  // 4: Antler Left Tip
  new THREE.Vector3(1.3, 2.4, -0.3), // 5: Antler Right Tip
  
  // Legs (Front) - Slightly offset X/Z for stance
  new THREE.Vector3(0.8, 0, 0.3),    // 6: Front Left Foot
  new THREE.Vector3(0.8, 0, -0.3),   // 7: Front Right Foot
  
  // Legs (Back)
  new THREE.Vector3(-0.8, 0, 0.3),   // 8: Back Left Foot
  new THREE.Vector3(-0.8, 0, -0.3),  // 9: Back Right Foot
  
  // Knees/Joints for visual detail (Midpoints)
  new THREE.Vector3(0.8, 0.6, 0.15),  // 10: FL Knee
  new THREE.Vector3(0.8, 0.6, -0.15), // 11: FR Knee
  new THREE.Vector3(-0.8, 0.7, 0.2),  // 12: BL Knee (Hock)
  new THREE.Vector3(-0.8, 0.7, -0.2), // 13: BR Knee (Hock)
];

// Define which points connect to form lines
// Indices correspond to the JOINTS array above
const CONNECTIONS = [
  [0, 1], // Spine
  [1, 2], // Neck
  [2, 3], // Face
  [2, 4], // Antler L
  [2, 5], // Antler R
  
  // Front Left Leg
  [1, 10], [10, 6], 
  // Front Right Leg
  [1, 11], [11, 7],
  
  // Back Left Leg
  [0, 12], [12, 8],
  // Back Right Leg
  [0, 13], [13, 9],
];

const ConstellationDeer: React.FC = () => {
  const heartRef = useRef<THREE.Mesh>(null);
  
  // Create Line Geometry
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    CONNECTIONS.forEach(([startIdx, endIdx]) => {
      points.push(JOINTS[startIdx]);
      points.push(JOINTS[endIdx]);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    // Animate Heartbeat
    if (heartRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      heartRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* 1. The Skeleton Lines */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#FFD700" linewidth={2} />
      </lineSegments>

      {/* 2. The Joint Stars (Glowing Spheres at vertices) */}
      {JOINTS.map((pos, i) => (
        // Using array [x,y,z] instead of Vector3 object to avoid "read only property" errors in R3F
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#FFF" emissive="#FFF" emissiveIntensity={2} />
        </mesh>
      ))}

      {/* 3. The Neon Heart */}
      <mesh ref={heartRef} position={[0.2, 1.1, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
            color="#FF0000" 
            emissive="#FF0000" 
            emissiveIntensity={3} 
            toneMapped={false} 
        />
        <pointLight color="#FF0000" distance={2} intensity={2} decay={2} />
      </mesh>
    </group>
  );
};

const NeonElk: React.FC<ElkProps> = ({ position, rotation, mode, delay }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation State
  const animationTime = useRef(0);
  const isJumping = useRef(false);

  // Trigger Jump
  useEffect(() => {
    if (mode === InteractionMode.UNLEASHED) {
      setTimeout(() => {
        isJumping.current = true;
        animationTime.current = 0;
      }, delay * 1000);
    } else if (mode === InteractionMode.TREE) {
      // Reset
      isJumping.current = false;
      animationTime.current = 0;
      if (groupRef.current) {
        groupRef.current.position.set(...position);
        groupRef.current.scale.set(1, 1, 1);
        groupRef.current.rotation.set(...rotation);
      }
    }
  }, [mode, delay, position, rotation]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Idle Animation (Gentle floating/breathing)
    if (!isJumping.current && mode === InteractionMode.TREE) {
      const float = Math.sin(state.clock.elapsedTime * 2 + delay) * 0.05;
      groupRef.current.position.y = position[1] + float;
      return;
    }

    // Jump Animation Sequence (Parabolic Arc)
    if (isJumping.current) {
      animationTime.current += delta;
      const t = animationTime.current;

      if (t < 0.2) {
        // Crouch (Anticipation)
        const crouch = t / 0.2;
        groupRef.current.scale.y = 1.0 - crouch * 0.3;
        groupRef.current.position.y = position[1] - crouch * 0.5;
      } else if (t < 1.8) {
        // Fly
        // Reset scale
        groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1.0, 0.1);
        
        const flyT = (t - 0.2) / 1.6; // Normalized 0-1 for flight duration
        const easeFly = flyT * (2 - flyT); // Ease Out Quad

        // Move Up + Forward
        groupRef.current.position.y = THREE.MathUtils.lerp(position[1], position[1] + 25, easeFly);
        groupRef.current.translateZ(delta * 18); // Move "forward" in local space
        
        // Pitch rotation for jump arc
        const targetPitch = -Math.PI / 3; // Tilt up
        groupRef.current.rotation.x = THREE.MathUtils.lerp(rotation[0], targetPitch, flyT * 0.5);

      } else {
        // Vanish
        groupRef.current.scale.setScalar(0);
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[1.8, 1.8, 1.8]}>
      <ConstellationDeer />
      {/* Ground Reflection Light */}
      <pointLight 
        distance={4} 
        intensity={0.5} 
        color="#FFD700" 
        position={[0, 0.5, 0]} 
      />
    </group>
  );
};

const GoldenElkGroup: React.FC<{ mode: InteractionMode }> = ({ mode }) => {
  const elks = useMemo(() => {
    const count = 4;
    const items = [];
    
    // Position them outside the tree radius
    const minRadius = 12.0; 
    
    for (let i = 0; i < count; i++) {
      const angleStep = (Math.PI * 2) / count;
      const angle = angleStep * i + 0.75; // Offset start
      const radius = minRadius + Math.random() * 1.5;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -11.0; // Floor Level

      // Rotate to face tangent (walking around tree circle)
      const rotY = -angle; 

      items.push({
        id: i,
        pos: [x, y, z] as [number, number, number],
        rot: [0, rotY, 0] as [number, number, number],
        delay: Math.random() * 0.4
      });
    }
    return items;
  }, []);

  return (
    <group>
      {elks.map((elk) => (
        <NeonElk 
          key={elk.id}
          position={elk.pos}
          rotation={elk.rot}
          mode={mode}
          delay={elk.delay}
        />
      ))}
    </group>
  );
};

export default GoldenElkGroup;