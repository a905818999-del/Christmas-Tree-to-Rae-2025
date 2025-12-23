
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const AREA_WIDTH = 45;
const AREA_HEIGHT = 45;
const AREA_DEPTH = 45;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uHeight;
  attribute float aRandom;
  attribute float aScale;
  attribute float aSpeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRandom;

  void main() {
    vColor = aColor;
    vRandom = aRandom;
    vec3 pos = position;
    float fallOffset = uTime * aSpeed;
    float y = mod(pos.y - fallOffset + uHeight * 0.5, uHeight) - uHeight * 0.5;
    pos.y = y;
    pos.x += sin(uTime * 0.5 + pos.y * 0.2 + aRandom * 10.0);
    pos.z += cos(uTime * 0.3 + pos.y * 0.15 + aRandom * 10.0);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aScale * (200.0 / -mvPosition.z);
    vAlpha = smoothstep(60.0, 30.0, length(mvPosition.xyz));
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRandom;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist);
    float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + vRandom * 10.0);
    gl_FragColor = vec4(vColor, alpha * vAlpha * pulse);
  }
`;

const MagicSnow: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const count = isMobile ? 500 : 1500;
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: AREA_HEIGHT }
  }), []);

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    const scal = new Float32Array(count);
    const spd = new Float32Array(count);
    const c1 = new THREE.Color('#E0F2FE');
    const c2 = new THREE.Color('#FFF7ED');
    const temp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      pos[i*3] = (Math.random()-0.5)*AREA_WIDTH;
      pos[i*3+1] = (Math.random()-0.5)*AREA_HEIGHT;
      pos[i*3+2] = (Math.random()-0.5)*AREA_DEPTH;
      temp.lerpColors(c1, c2, Math.random());
      col[i*3]=temp.r; col[i*3+1]=temp.g; col[i*3+2]=temp.b;
      rand[i] = Math.random();
      scal[i] = Math.random() * 3.0 + 1.0; 
      spd[i] = 1.0 + Math.random() * 2.0;
    }
    return { pos, col, rand, scal, spd };
  }, [count]);

  useFrame((state) => {
    if (material.current && material.current.uniforms) {
        material.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={count} array={data.col} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={data.rand} itemSize={1} />
        <bufferAttribute attach="attributes-aScale" count={count} array={data.scal} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={data.spd} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default MagicSnow;
