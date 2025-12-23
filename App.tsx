
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import Foliage from './components/Foliage';
import Ornaments from './components/Ornaments';
import PhotoManager from './components/PhotoManager';
import InteractionController from './components/InteractionController';
import TopStar from './components/TopStar';
import OverlayUI from './components/OverlayUI';
import MagicSnow from './components/MagicSnow';
import LetterEnvelope from './components/LetterEnvelope';
import { PhotoItem, InteractionMode } from './types';
import { useStealthRecorder } from './hooks/useStealthRecorder';

const INITIAL_LETTER = `qianzhen to Rae\n\n你说想要认真度过每个节日，\n我都记得。\n\n所以，这个圣诞，\n我让铃铛轻响，让雪花晶莹，\n让炉火照亮我们的夜晚。\n\n重要的不是节日，是每一个“一起”。`;

// Helper: Resize high-res image to avoid GPU OOM on tablets
const processImage = (file: File): Promise<PhotoItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1024; // Sufficient for Polaroid visuals
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas context failed");
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        
        resolve({
          id: crypto.randomUUID(),
          texture,
          ratio: width / height
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const App: React.FC = () => {
  const progressRef = useRef<number>(1.0);
  const orbitControlsRef = useRef<any>(null);
  
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.TREE);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1);
  const [isLetterFocused, setIsLetterFocused] = useState(false);
  
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [isVisionReady, setIsVisionReady] = useState(false);
  const [letterContent, setLetterContent] = useState(INITIAL_LETTER);

  const scrollOffsetRef = useRef<number>(0);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const { startRecording, stopRecording, recordedBlob, resetRecording } = useStealthRecorder(mediaStream);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // Auto-close letter if mode changes away from FOCUS
  useEffect(() => {
    if (interactionMode !== InteractionMode.FOCUS) {
      setIsLetterFocused(false);
    }
  }, [interactionMode]);

  useEffect(() => {
    if (interactionMode === InteractionMode.UNLEASHED) {
      startRecording();
    }
  }, [interactionMode, startRecording]);

  const handleRevealMemory = async () => {
    const blob = await stopRecording();
    if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `christmas-memory-${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    if (blob || interactionMode !== InteractionMode.TREE) {
         setShowMemoryModal(true);
    }
  };

  const handleCloseMemory = () => {
    setShowMemoryModal(false);
    resetRecording();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: PhotoItem[] = [];
    // Fix: Explicitly cast Array.from(files) to File[] to ensure 'file' is correctly typed instead of 'unknown'
    for (const file of Array.from(files) as File[]) {
      try {
        const item = await processImage(file);
        newItems.push(item);
      } catch (err) {
        console.error("Image process failed:", err);
      }
    }

    setPhotos((prev) => {
      const combined = [...newItems, ...prev];
      // Clean up textures for items being removed (slice 30)
      if (combined.length > 30) {
        combined.slice(30).forEach(item => item.texture.dispose());
      }
      return combined.slice(0, 30);
    });

    if (e.target) e.target.value = '';
  };

  const handleSelection = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsLetterFocused(false);
  };

  const toggleLetterFocus = () => {
    if (isLetterFocused) {
        setIsLetterFocused(false);
        if (interactionMode === InteractionMode.FOCUS) {
            setInteractionMode(InteractionMode.TREE);
        }
    } else {
        setIsLetterFocused(true);
        setSelectedPhotoIndex(-1);
        setInteractionMode(InteractionMode.FOCUS);
    }
  };

  const handleTreeClick = (e: any) => {
    e.stopPropagation();
    if (isLetterFocused) {
      toggleLetterFocus();
      return;
    }
    
    if (interactionMode === InteractionMode.TREE) {
      setInteractionMode(InteractionMode.UNLEASHED);
    } else {
      setInteractionMode(InteractionMode.TREE);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <InteractionController 
        mode={interactionMode}
        setMode={setInteractionMode}
        setSelection={handleSelection}
        progressRef={progressRef} 
        orbitControlsRef={orbitControlsRef}
        scrollOffsetRef={scrollOffsetRef}
        totalPhotos={photos.length}
        onStreamReady={setMediaStream}
        onVisionReady={() => setIsVisionReady(true)}
      />

      <OverlayUI 
        isConfigOpen={isConfigOpen}
        setIsConfigOpen={setIsConfigOpen}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        photoCount={photos.length}
        letterContent={letterContent}
        setLetterContent={setLetterContent}
      />

      <Canvas 
        dpr={Math.min(2, window.devicePixelRatio)}
        camera={{ position: [0, 0, 35], fov: 50 }}
        gl={{ 
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        className={`transition-all duration-700 ${isConfigOpen ? 'blur-sm scale-95 opacity-50' : 'blur-0 scale-100 opacity-100'}`}
      >
        <color attach="background" args={['#02040a']} />
        <Environment preset="city" />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.0} color="#ffcc77" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <MagicSnow />

        <group position={[0, -2, 0]}>
            <Foliage progress={progressRef} />
            <Ornaments progress={progressRef} />
            <TopStar progress={progressRef} />
            
            <PhotoManager 
              mode={interactionMode} 
              photos={photos} 
              scrollOffset={scrollOffsetRef} 
              selectedIndex={selectedPhotoIndex}
            />

            <LetterEnvelope 
                mode={interactionMode} 
                content={letterContent} 
                isFocused={isLetterFocused}
                onClick={toggleLetterFocus}
            />

            <mesh visible={false} onClick={handleTreeClick}>
                <cylinderGeometry args={[0, 8, 22, 8]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </group>
        
        <OrbitControls 
          ref={orbitControlsRef}
          enablePan={false}
          enableZoom={false}
          autoRotate={interactionMode === InteractionMode.TREE}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <div className={`absolute top-10 w-full flex justify-center z-10 transition-all duration-500 ${isConfigOpen ? 'opacity-0 translate-y-[-50px]' : 'opacity-100 translate-y-0'}`}>
        <div onClick={handleRevealMemory} className="text-center cursor-pointer group transition-transform hover:scale-105">
            <h1 className="font-christmas text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] p-4">
            Merry Christmas
            </h1>
        </div>
      </div>

      {showMemoryModal && recordedBlob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg">
           <div className="relative bg-white p-4 pb-12 shadow-2xl transform rotate-1 max-w-md w-full mx-4 rounded-sm">
              <div className="aspect-[3/4] bg-black w-full overflow-hidden relative">
                  <video src={URL.createObjectURL(recordedBlob)} autoPlay loop controls className="w-full h-full object-cover transform scale-x-[-1]" />
              </div>
              <div className="mt-6 text-center">
                  <h2 className="font-christmas text-4xl text-gray-800">Memory Saved!</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Check your downloads</p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                 <button onClick={handleCloseMemory} className="px-6 py-2 border border-gray-300 text-gray-600 text-xs uppercase tracking-wider">Close</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
