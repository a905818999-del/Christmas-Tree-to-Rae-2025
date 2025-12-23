
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoliageProps } from '../types';

interface ExtendedFoliageProps extends FoliageProps {
  isMobile?: boolean;
}

const VERTEX_SHADER = `
    uniform float uTime;
    uniform float uPixelRatio;
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * uPixelRatio * (120.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      float dist = length(mvPosition.xyz);
      vAlpha = smoothstep(50.0, 10.0, dist);
    }
`;

const FRAGMENT_SHADER = `
    uniform float uTime;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec2 coord = gl_PointCoord - 0.5;
      float dist = length(coord);
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      if (alpha < 0.01) discard;
      float core = 1.0 - smoothstep(0.0, 0.1, dist);
      bool isGreen = vColor.g > vColor.r && vColor.g > vColor.b;
      vec3 finalColor = vec3(0.0);
      if (isGreen) {
          float breath = sin(uTime * 2.0 + gl_FragCoord.x * 0.13 + gl_FragCoord.y * 0.17);
          breath = 0.55 + 0.45 * breath; 
          finalColor += vColor * alpha * 0.4;
          finalColor += vec3(0.5, 1.0, 0.7) * alpha * breath * 8.0 * core;
      } else {
          float twinkle = sin(uTime * 4.0 + gl_FragCoord.x * 0.5);
          twinkle = pow(0.5 + 0.5 * twinkle, 4.0); 
          finalColor += vColor * alpha * 0.5; 
          finalColor += vec3(1.0, 1.0, 0.8) * alpha * twinkle * 10.0 * core; 
      }
      gl_FragColor = vec4(finalColor, alpha * vAlpha);
    }
`;

const Foliage: React.FC<ExtendedFoliageProps> = ({ progress, isMobile }) => {
  const count = isMobile ? 6000 : 15000;
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: 1.0 }
  }), []);

  const data = useMemo(() => {
    const chaos = new Float32Array(count * 3);
    const tree = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const u = Math.random(); const v = Math.random();
      const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
      const r_chaos = Math.cbrt(Math.random()) * 20;
      chaos[i3] = r_chaos * Math.sin(phi) * Math.cos(theta);
      chaos[i3 + 1] = r_chaos * Math.sin(phi) * Math.sin(theta);
      chaos[i3 + 2] = r_chaos * Math.cos(phi);

      const isSpiral = Math.random() > 0.7; 
      let t = isSpiral ? 1 - Math.sqrt(Math.random()) : 1 - Math.cbrt(Math.random());
      const height = (t * 22) - 11;
      const maxRadius = (1 - t) * 7.5; 
      let angle = isSpiral ? (t * Math.PI * 20) + (Math.random() - 0.5) * 1.5 : Math.random() * Math.PI * 2;
      let r = isSpiral ? maxRadius * (0.9 + Math.random() * 0.2) : maxRadius * Math.sqrt(0.2 + 0.8 * Math.random());
      tree[i3] = Math.cos(angle) * r;
      tree[i3 + 1] = height;
      tree[i3 + 2] = Math.sin(angle) * r;

      if (Math.random() > 0.96) {
        tempColor.set('#FFD700').lerp(new THREE.Color('#FDE047'), Math.random());
        sizes[i] = Math.random() * 4.0 + 2.0; 
      } else {
        tempColor.set('#059669').lerp(new THREE.Color('#6EE7B7'), Math.random());
        sizes[i] = Math.random() * 3.0 + 1.0;
      }
      colors[i3] = tempColor.r; colors[i3+1] = tempColor.g; colors[i3+2] = tempColor.b;
    }
    return { chaosPositions: chaos, treePositions: tree, colors, sizes };
  }, [count]);

  useLayoutEffect(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(data.chaosPositions.slice(), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
    }
  }, [data]);

  useFrame((state) => {
    if (!pointsRef.current || !shaderRef.current) return;
    const material = shaderRef.current;
    if (material.uniforms) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const { chaosPositions, treePositions } = data;
    const t = progress.current;
    for (let i = 0; i < count * 3; i++) {
      positions[i] = chaosPositions[i] + (treePositions[i] - chaosPositions[i]) * t;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <shaderMaterial
        ref={shaderRef}
        attach="material"
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;
