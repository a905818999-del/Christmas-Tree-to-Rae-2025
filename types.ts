import * as THREE from 'three';
import React from 'react';

export enum InteractionMode {
  TREE = 'TREE',
  UNLEASHED = 'UNLEASHED',
  CAROUSEL = 'CAROUSEL',
  FOCUS = 'FOCUS',
  LETTER = 'LETTER',
}

export interface ParticleData {
  chaosPositions: Float32Array;
  treePositions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

export interface FoliageProps {
  progress: React.MutableRefObject<number>;
}

export interface PhotoItem {
  id: string;
  texture: THREE.Texture;
  ratio: number;
}

export interface PhotoManagerProps {
  mode: InteractionMode;
  photos: PhotoItem[];
  scrollOffset: React.MutableRefObject<number>;
  selectedIndex: number;
}

export interface InteractionControllerProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  setSelection: (index: number) => void;
  progressRef: React.MutableRefObject<number>;
  orbitControlsRef: React.MutableRefObject<any>;
  scrollOffsetRef: React.MutableRefObject<number>;
  totalPhotos: number;
  onStreamReady: (stream: MediaStream) => void;
  onVisionReady?: () => void;
}