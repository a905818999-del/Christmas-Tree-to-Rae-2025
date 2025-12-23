import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Reduced count to prevent clutter
const PARTICLE_COUNT = 1500;
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
    
    // --- 1. Infinite Fall Animation ---
    float fallOffset = uTime * aSpeed;
    float y = mod(pos.y - fallOffset + uHeight * 0.5, uHeight) - uHeight * 0.5;
    pos.y = y;
    
    // --- 2. Turbulence / Spiral Motion ---
    float turbulenceX = sin(uTime * 0.5 + pos.y * 0.2 + aRandom * 100.0);
    float turbulenceZ = cos(uTime * 0.3 + pos.y * 0.15 + aRandom * 100.0);
    
    pos.x += turbulenceX * 1.0; 
    pos.z += turbulenceZ * 1.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = aScale * (250.0 / -mvPosition.z);
    
    float dist = length(mvPosition.xyz);
    vAlpha = smoothstep(5.0, 15.0, dist) * smoothstep(60.0, 40.0, dist);
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

    float angle = atan(uv.y, uv.x);
    float shapeWeight = pow(0.5 + 0.5 * cos(angle * 6.0), 8.0);
    
    float core = smoothstep(0.05, 0.0, dist);
    float rays = smoothstep(0.5, 0.0, dist) * shapeWeight * 0.5;
    float glow = exp(-dist * 10.0) * 0.2;
    
    float alpha = core + rays + glow;
    
    float pulse = sin(uTime * (3.0 + vRandom) + vRandom * 100.0);
    float twinkle = 0.5 + 1.0 * (0.5 + 0.5 * pulse);
    
    gl_FragColor = vec4(vColor, alpha * vAlpha * 0.8 * twinkle);
  }
`;

const MagicSnow: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: AREA_HEIGHT }
  }), []);

  const { positions, colors, randoms, scales, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);
    const scales = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    const color1 = new THREE.Color('#E0F2FE');
    const color2 = new THREE.Color('#FFF7ED');
    const tempColor = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * AREA_WIDTH;
      positions[i * 3 + 1] = (Math.random() - 0.5) * AREA_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * AREA_DEPTH;

      tempColor.lerpColors(color1, color2, Math.random());
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      randoms[i] = Math.random();
      scales[i] = Math.random() * 3.0 + 1.5; 
      speeds[i] = 1.0 + Math.random() * 2.0;
    }

    return { positions, colors, randoms, scales, speeds };
  }, []);

  useFrame((state) => {
    // 安全访问 Uniforms，防止 "Cannot read properties of undefined (reading 'value')"
    if (material.current && material.current.uniforms && material.current.uniforms.uTime) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={randoms.length} array={randoms} itemSize={1} />
        <bufferAttribute attach="attributes-aScale" count={scales.length} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aSpeed" count={speeds.length} array={speeds} itemSize={1} />
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