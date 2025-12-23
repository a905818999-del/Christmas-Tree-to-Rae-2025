import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FoliageProps } from '../types';

// Restored to original luxury density
const PARTICLE_COUNT = 15000;

// Luxury Color Palette
const COLOR_EMERALD_DEEP = new THREE.Color('#059669');   
const COLOR_EMERALD_BRIGHT = new THREE.Color('#6EE7B7'); 
const COLOR_EMERALD_NEON = new THREE.Color('#34D399');   
const COLOR_GOLD = new THREE.Color('#FFD700');
const COLOR_GOLD_PALE = new THREE.Color('#FDE047');

// Moved Shader Definitions out, but Uniforms will be instance-specific
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
      
      // SIGNIFICANTLY INCREASED SIZE MULTIPLIER
      gl_PointSize = size * uPixelRatio * (120.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      
      // Distance fade
      float dist = length(mvPosition.xyz);
      vAlpha = smoothstep(50.0, 10.0, dist);
    }
`;

const FRAGMENT_SHADER = `
    uniform float uTime;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Center coordinates
      vec2 coord = gl_PointCoord - 0.5;
      float dist = length(coord);

      // 1. Soft Round Shape (Glow Orb)
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      if (alpha < 0.01) discard;

      // 2. Core (Hot center)
      float core = 1.0 - smoothstep(0.0, 0.1, dist);

      // 3. Determine Identity based on Color
      bool isGreen = vColor.g > vColor.r && vColor.g > vColor.b;
      
      vec3 finalColor = vec3(0.0);

      if (isGreen) {
          // --- GREEN FIREFLY LOGIC ---
          float breath = sin(uTime * 2.0 + gl_FragCoord.x * 0.13 + gl_FragCoord.y * 0.17);
          breath = 0.55 + 0.45 * breath; 
          finalColor += vColor * alpha * 0.4;
          vec3 lightColor = vec3(0.5, 1.0, 0.7);
          finalColor += lightColor * alpha * breath * 8.0 * core;

      } else {
          // --- GOLD SPARKLE LOGIC ---
          float twinkle = sin(uTime * 4.0 + gl_FragCoord.x * 0.5);
          twinkle = pow(0.5 + 0.5 * twinkle, 4.0); 
          finalColor += vColor * alpha * 0.5; 
          finalColor += vec3(1.0, 1.0, 0.8) * alpha * twinkle * 10.0 * core; 
      }

      gl_FragColor = vec4(finalColor, alpha * vAlpha);
    }
`;

const Foliage: React.FC<FoliageProps> = ({ progress }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  // Initialize Uniforms individually to avoid read-only/shared issues
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 2 }
  }), []);

  const data = useMemo(() => {
    const chaos = new Float32Array(PARTICLE_COUNT * 3);
    const tree = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    
    // Reusing a single color object to avoid Garbage Collection thrashing
    const tempColor = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 1. Optimization: Inline "randomInSphere" to avoid creating Vector3 objects
      // Chaos Position (Sphere Radius ~20)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r_chaos = Math.cbrt(Math.random()) * 20; // Radius 20
      
      chaos[i3] = r_chaos * Math.sin(phi) * Math.cos(theta);
      chaos[i3 + 1] = r_chaos * Math.sin(phi) * Math.sin(theta);
      chaos[i3 + 2] = r_chaos * Math.cos(phi);

      // 2. Tree Position
      // DISTRIBUTION FIX: 
      // Instead of linear t, we use geometric distribution to prevent clustering at the top (cone tip).
      // t = 0 (bottom), t = 1 (top)
      
      const isSpiral = Math.random() > 0.7; 
      let t;

      if (isSpiral) {
        // Surface distribution (Spiral) -> Area scales with r^2 -> use sqrt
        // Pushes more points to lower t values
        t = 1 - Math.sqrt(Math.random());
      } else {
        // Volume Fill -> Volume scales with r^3 -> use cbrt
        t = 1 - Math.cbrt(Math.random());
      }

      const height = (t * 22) - 11;
      const maxRadius = (1 - t) * 7.5; 
      
      let angle, r;

      if (isSpiral) {
        // Spiral Edge
        const spiralAngle = t * Math.PI * 20;
        angle = spiralAngle + (Math.random() - 0.5) * 1.5;
        r = maxRadius * (0.9 + Math.random() * 0.2); 
      } else {
        // Volume Fill
        angle = Math.random() * Math.PI * 2;
        r = maxRadius * Math.sqrt(0.2 + 0.8 * Math.random()); 
      }

      tree[i3] = Math.cos(angle) * r;
      tree[i3 + 1] = height;
      tree[i3 + 2] = Math.sin(angle) * r;

      // 3. Colors & Size
      if (Math.random() > 0.96) {
        // Gold Sparkles
        tempColor.lerpColors(COLOR_GOLD, COLOR_GOLD_PALE, Math.random());
        sizes[i] = Math.random() * 4.0 + 2.0; 
      } else {
        // Emerald variants
        if (!isSpiral) {
             // Inner volume
             const rand = Math.random();
             if (rand > 0.8) {
                 tempColor.lerpColors(COLOR_EMERALD_BRIGHT, COLOR_EMERALD_NEON, Math.random());
                 sizes[i] = Math.random() * 5.0 + 3.0; 
             } else {
                 tempColor.lerpColors(COLOR_EMERALD_DEEP, COLOR_EMERALD_BRIGHT, Math.random() * 0.6);
                 sizes[i] = Math.random() * 2.5 + 1.0; 
             }
        } else {
             // Surface spiral
             tempColor.lerpColors(COLOR_EMERALD_DEEP, COLOR_EMERALD_BRIGHT, 0.4 + Math.random() * 0.6);
             sizes[i] = Math.random() * 3.0 + 1.5;
        }
      }
      
      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }

    return { chaosPositions: chaos, treePositions: tree, colors, sizes };
  }, []);

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

    try {
        // --- FIX: Robust Uniform Access ---
        const material = shaderRef.current;
        // Check for uniforms existence and specific properties
        if (material && material.uniforms) {
          if (material.uniforms.uTime) {
            material.uniforms.uTime.value = state.clock.elapsedTime;
          }
          if (material.uniforms.uPixelRatio) {
            material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
          }
        }
    } catch (e) {
        // Suppress errors during frame updates (e.g. if material is being disposed)
    }

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const { chaosPositions, treePositions } = data;
    const t = progress.current;

    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
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