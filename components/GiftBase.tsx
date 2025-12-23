import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionMode } from '../types';

interface GiftBaseProps {
  mode: InteractionMode;
}

// Luxurious Gift Palette
const COLORS = ['#D32F2F', '#1976D2', '#388E3C', '#FBC02D', '#7B1FA2'];
const RIBBONS = ['#FFD700', '#FFFFFF'];

// Single Detailed Gift Component
const DetailedGift: React.FC<{
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  color: string;
  ribbonColor: string;
  mode: InteractionMode;
  idx: number;
}> = ({ position, rotation, scale, color, ribbonColor, mode, idx }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation state
  const randomPhase = useMemo(() => Math.random() * Math.PI * 2, []);
  const velocity = useMemo(() => new THREE.Vector3((Math.random()-0.5)*0.1, Math.random()*0.2, (Math.random()-0.5)*0.1), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    if (mode === InteractionMode.UNLEASHED) {
      // Float away
      groupRef.current.position.add(velocity);
      groupRef.current.rotation.x += 0.01;
      groupRef.current.rotation.y += 0.01;
    } else {
      // Idle on ground
      groupRef.current.position.copy(position);
      groupRef.current.rotation.copy(rotation);
      
      // Gentle Bob if desired, or just static
      // groupRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime + randomPhase) * 0.1;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
       {/* Main Box - Replaced RoundedBox with standard BoxGeometry due to library constraints */}
       <mesh>
         <boxGeometry args={[1, 1, 1]} />
         <meshStandardMaterial 
            color={color} 
            roughness={0.3} 
            metalness={0.1} 
         />
       </mesh>

       {/* Ribbon Vertical */}
       <mesh position={[0, 0, 0]} scale={[1.02, 1.02, 0.2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={ribbonColor} metalness={0.6} roughness={0.2} />
       </mesh>
       {/* Ribbon Horizontal */}
       <mesh position={[0, 0, 0]} scale={[0.2, 1.02, 1.02]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={ribbonColor} metalness={0.6} roughness={0.2} />
       </mesh>

       {/* Bow (Two Torus loops + Center) */}
       <group position={[0, 0.5, 0]}>
          {/* Knot */}
          <mesh position={[0, 0, 0]}>
             <sphereGeometry args={[0.15]} />
             <meshStandardMaterial color={ribbonColor} metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Left Loop */}
          <mesh position={[-0.2, 0.1, 0]} rotation={[0, 0, Math.PI / 3]}>
             <torusGeometry args={[0.2, 0.08, 8, 20]} />
             <meshStandardMaterial color={ribbonColor} metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Right Loop */}
          <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, -Math.PI / 3]}>
             <torusGeometry args={[0.2, 0.08, 8, 20]} />
             <meshStandardMaterial color={ribbonColor} metalness={0.6} roughness={0.2} />
          </mesh>
       </group>
    </group>
  );
};

const GiftBase: React.FC<GiftBaseProps> = ({ mode }) => {
  const gifts = useMemo(() => {
    const count = 25;
    return new Array(count).fill(null).map((_, i) => {
      // Radius: 8 to 11 (Outside tree base which is ~7.5)
      const angle = Math.random() * Math.PI * 2;
      const radius = 8.0 + Math.random() * 3.5;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Stack some on top of others logic (simplified random Y)
      const isStacked = Math.random() > 0.7;
      const y = -11.0 + (isStacked ? 0.8 : 0.4); 

      return {
        id: i,
        pos: new THREE.Vector3(x, y, z),
        rot: new THREE.Euler(0, Math.random() * Math.PI, 0),
        scale: 0.8 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        ribbon: RIBBONS[Math.floor(Math.random() * RIBBONS.length)]
      };
    });
  }, []);

  return (
    <group>
      {gifts.map((g) => (
        <DetailedGift 
          key={g.id}
          idx={g.id}
          position={g.pos}
          rotation={g.rot}
          scale={g.scale}
          color={g.color}
          ribbonColor={g.ribbon}
          mode={mode}
        />
      ))}
    </group>
  );
};

export default GiftBase;