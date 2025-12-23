
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PhotoManagerProps, PhotoItem, InteractionMode } from '../types';

const POLAROID_WIDTH = 2.0;
const POLAROID_HEIGHT = 2.4;

const ARC_RADIUS = 22;      
const ANGLE_SPACING = 0.45;   
const CENTER_Y_BOOST = 1.5;  
const GALLERY_Z_OFFSET = 8; 

const Polaroid: React.FC<{
  item: PhotoItem;
  index: number;
  total: number;
  mode: InteractionMode;
  scrollOffset: React.MutableRefObject<number>;
  isSelected: boolean;
}> = ({ item, index, total, mode, scrollOffset, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const baseYaw = useRef(0);
  const lastMode = useRef<InteractionMode | null>(null);

  // Clean up texture on unmount
  useEffect(() => {
    return () => {
      // Texture is managed in App.tsx state but double-check disposal logic
      // if it was specifically bound to this component instance.
    };
  }, [item]);

  const cloudData = useMemo(() => ({
    pos: new THREE.Vector3(
        (Math.random() - 0.5) * 28,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 12
    ),
    driftSpeed: Math.random() * 0.3 + 0.1,
    driftPhase: Math.random() * Math.PI * 2,
  }), []);

  const treeData = useMemo(() => {
    const t = total > 1 ? index / (total - 1) : 0; 
    const topY = 4.5;
    const bottomY = -6.5;
    const treeH = topY - t * (topY - bottomY); 
    const maxConeY = 11.0;
    const maxConeH = 22.0;
    const baseRadius = 7.5; 
    const coneRadiusAtH = ((maxConeY - treeH) / maxConeH) * baseRadius;
    const treeR = coneRadiusAtH * 1.3; 
    const totalRotations = 4.0;
    const treeAngle = t * Math.PI * 2 * totalRotations;

    const pos = new THREE.Vector3(Math.cos(treeAngle) * treeR, treeH, Math.sin(treeAngle) * treeR);
    const d = new THREE.Object3D();
    d.position.copy(pos);
    d.lookAt(0, treeH, 0); 
    d.rotateY(Math.PI); 
    d.rotateX(-0.1); 
    return { pos, rot: d.quaternion.clone() };
  }, [index, total]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const cam = state.camera;

    if (mode !== lastMode.current) {
        if (mode !== InteractionMode.TREE) {
            const dir = new THREE.Vector3();
            cam.getWorldDirection(dir);
            baseYaw.current = Math.atan2(dir.x, dir.z);
        }
        lastMode.current = mode;
    }
    
    let targetPos = new THREE.Vector3();
    let targetRot = new THREE.Quaternion();
    let targetScale = 1.0;

    switch (mode) {
      case InteractionMode.TREE:
        targetPos.copy(treeData.pos);
        targetRot.copy(treeData.rot);
        break;

      case InteractionMode.UNLEASHED:
        targetPos.copy(cloudData.pos);
        targetPos.y += Math.sin(time * cloudData.driftSpeed + cloudData.driftPhase) * 1.5;
        dummy.position.copy(targetPos);
        dummy.lookAt(cam.position);
        targetRot.copy(dummy.quaternion);
        break;

      case InteractionMode.CAROUSEL:
        const deltaIndex = index - scrollOffset.current;
        const angle = deltaIndex * ANGLE_SPACING;

        const relX = Math.sin(angle) * ARC_RADIUS;
        const relZ = (Math.cos(angle) - 1) * ARC_RADIUS + GALLERY_Z_OFFSET;
        
        const cosY = Math.cos(baseYaw.current);
        const sinY = Math.sin(baseYaw.current);
        
        targetPos.x = relX * cosY + relZ * sinY;
        targetPos.z = -relX * sinY + relZ * cosY;
        
        const proximity = Math.exp(-Math.pow(deltaIndex, 2) * 3.0);
        targetPos.y = proximity * CENTER_Y_BOOST;

        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, baseYaw.current + angle * 0.8 + Math.PI, 0);
        targetRot.copy(dummy.quaternion);

        targetScale = 1.0 + proximity * 1.8;
        break;

      case InteractionMode.FOCUS:
        if (isSelected) {
          const camDir = new THREE.Vector3();
          cam.getWorldDirection(camDir);
          const worldPoint = cam.position.clone().add(camDir.multiplyScalar(10.0));
          const downOffset = new THREE.Vector3(0, -2.5, 0).applyQuaternion(cam.quaternion);
          worldPoint.add(downOffset);

          targetPos.copy(worldPoint);
          if (groupRef.current.parent) {
            groupRef.current.parent.worldToLocal(targetPos);
          }

          targetRot.copy(cam.quaternion);
          targetScale = 4.2; 
        } else {
          targetPos.copy(cloudData.pos).multiplyScalar(2.0);
          targetPos.z -= 50; 
          dummy.position.copy(targetPos);
          dummy.lookAt(cam.position);
          targetRot.copy(dummy.quaternion);
          targetScale = 0.2;
        }
        break;
    }

    const lerpFactor = mode === InteractionMode.FOCUS ? 0.15 : 0.08;
    groupRef.current.position.lerp(targetPos, lerpFactor);
    groupRef.current.quaternion.slerp(targetRot, lerpFactor);
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerpFactor);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[POLAROID_WIDTH, POLAROID_HEIGHT, 0.06]} />
        <meshStandardMaterial color={isSelected ? "#fffbe3" : "#fdfdfd"} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.15, 0.04]}>
        <planeGeometry args={[1.75, 1.75]} />
        <meshBasicMaterial map={item.texture} side={THREE.FrontSide} />
      </mesh>
      <mesh position={[0, -0.9, 0.04]}>
        <planeGeometry args={[POLAROID_WIDTH - 0.3, 0.04]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.1} />
      </mesh>
      {isSelected && (
        <pointLight intensity={30} distance={15} color="#ffd700" position={[0,0,1.5]} />
      )}
    </group>
  );
};

const PhotoManager: React.FC<PhotoManagerProps> = ({ mode, photos, scrollOffset, selectedIndex }) => {
  return (
    <group>
      {photos.map((photo, i) => (
        <Polaroid 
          key={photo.id} 
          index={i} 
          total={photos.length}
          item={photo}
          mode={mode}
          scrollOffset={scrollOffset}
          isSelected={i === selectedIndex}
        />
      ))}
    </group>
  );
};

export default PhotoManager;
