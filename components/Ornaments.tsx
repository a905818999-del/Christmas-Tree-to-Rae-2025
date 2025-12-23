
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoliageProps } from '../types';

interface ExtendedOrnamentsProps extends FoliageProps {
  isMobile: boolean;
}

const Ornaments: React.FC<ExtendedOrnamentsProps> = ({ progress, isMobile }) => {
  const S_COUNT = isMobile ? 120 : 300; 
  const C_COUNT = isMobile ? 80 : 200;   
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  const currentProgress = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const sphereData = useMemo(() => {
    return new Array(S_COUNT).fill(null).map((_, i) => {
      const u = i / S_COUNT; const t = 1 - Math.sqrt(1 - u);
      const angle = t * Math.PI * 18 + Math.random();
      const height = (t * 20) - 10; const radius = (1 - t) * 7.5;
      return { 
        chaos: new THREE.Vector3().setFromSphericalCoords(Math.random()*20, Math.random()*Math.PI, Math.random()*Math.PI*2),
        tree: new THREE.Vector3(Math.cos(angle)*radius, height, Math.sin(angle)*radius),
        color: Math.random() > 0.5 ? new THREE.Color('#FFD700') : new THREE.Color('#C41E3A'),
        scale: Math.random() * 0.3 + 0.2
      };
    });
  }, [S_COUNT]);

  const cubeData = useMemo(() => {
    return new Array(C_COUNT).fill(null).map(() => {
      const t = 1 - Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 20;
      const height = (t * 20) - 10; const radius = (1 - t) * 7.0;
      return {
        chaos: new THREE.Vector3().setFromSphericalCoords(Math.random()*15, Math.random()*Math.PI, Math.random()*Math.PI*2),
        tree: new THREE.Vector3(Math.cos(angle)*radius, height, Math.sin(angle)*radius),
        color: Math.random() > 0.7 ? new THREE.Color('#FFD700') : new THREE.Color('#E0F2FE'),
        scale: Math.random() * 0.25 + 0.15
      };
    });
  }, [C_COUNT]);

  useLayoutEffect(() => {
    if (sphereRef.current) {
        sphereData.forEach((d, i) => sphereRef.current!.setColorAt(i, d.color));
        if (sphereRef.current.instanceColor) sphereRef.current.instanceColor.needsUpdate = true;
    }
    if (cubeRef.current) {
        cubeData.forEach((d, i) => cubeRef.current!.setColorAt(i, d.color));
        if (cubeRef.current.instanceColor) cubeRef.current.instanceColor.needsUpdate = true;
    }
  }, [sphereData, cubeData]);

  useFrame((state, delta) => {
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, progress.current, 2.0 * delta);
    if (sphereRef.current) {
      sphereData.forEach((data, i) => {
        dummy.position.lerpVectors(data.chaos, data.tree, currentProgress.current);
        dummy.rotation.set(state.clock.elapsedTime * 0.2 + i, state.clock.elapsedTime * 0.1, 0);
        dummy.scale.setScalar(data.scale); dummy.updateMatrix();
        sphereRef.current!.setMatrixAt(i, dummy.matrix);
      });
      sphereRef.current.instanceMatrix.needsUpdate = true;
    }
    if (cubeRef.current) {
      cubeData.forEach((data, i) => {
        dummy.position.lerpVectors(data.chaos, data.tree, currentProgress.current);
        dummy.rotation.set(state.clock.elapsedTime * 0.5 + i, state.clock.elapsedTime * 0.5 + i, i);
        dummy.scale.setScalar(data.scale); dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={sphereRef} args={[undefined, undefined, S_COUNT]}>
        <sphereGeometry args={[1, isMobile ? 8 : 12, isMobile ? 8 : 12]} />
        <meshStandardMaterial roughness={0.1} metalness={0.9} />
      </instancedMesh>
      <instancedMesh ref={cubeRef} args={[undefined, undefined, C_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial roughness={0.0} transmission={0.9} />
      </instancedMesh>
    </group>
  );
};

export default Ornaments;
