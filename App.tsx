
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

const processImage = (file: File): Promise<PhotoItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 移动端降低纹理分辨率以节省显存
        const MAX_DIM = 640; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas context failed");
        ctx.drawImage(img, 0, 0, width, height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false; 
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        img.src = ''; // 清理引用
        resolve({ id: crypto.randomUUID(), texture, ratio: width / height });
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
  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

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

  // 延后初始化 AI 的标志
  const [allowAI, setAllowAI] = useState(false);

  useEffect(() => {
    if (interactionMode !== InteractionMode.FOCUS) setIsLetterFocused(false);
  }, [interactionMode]);

  useEffect(() => {
    if (interactionMode === InteractionMode.UNLEASHED) startRecording();
  }, [interactionMode, startRecording]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: PhotoItem[] = [];
    for (const file of Array.from(files) as File[]) {
      try { const item = await processImage(file); newItems.push(item); } catch (err) { console.error(err); }
    }
    setPhotos((prev) => {
      const combined = [...newItems, ...prev];
      if (combined.length > 15) { // 移动端限制照片数量防止 OOM
        combined.slice(15).forEach(item => item.texture.dispose());
      }
      return combined.slice(0, 15);
    });
    if (e.target) e.target.value = '';
  };

  const handleStart = useCallback(() => {
    setIsConfigOpen(false);
    // 关键：UI 关闭后，等待 3D 场景渲染稳定再启动 AI
    setTimeout(() => {
      setAllowAI(true);
    }, 1500);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#02040a] overflow-hidden">
      {allowAI && (
        <InteractionController 
          mode={interactionMode}
          setMode={setInteractionMode}
          setSelection={(idx) => { setSelectedPhotoIndex(idx); setIsLetterFocused(false); }}
          progressRef={progressRef} 
          orbitControlsRef={orbitControlsRef}
          scrollOffsetRef={scrollOffsetRef}
          totalPhotos={photos.length}
          onStreamReady={setMediaStream}
          onVisionReady={() => setIsVisionReady(true)}
        />
      )}

      <OverlayUI 
        isConfigOpen={isConfigOpen}
        setIsConfigOpen={handleStart}
        onFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        photoCount={photos.length}
        letterContent={letterContent}
        setLetterContent={setLetterContent}
      />

      <Canvas 
        dpr={isMobile ? 1 : Math.min(1.5, window.devicePixelRatio)}
        camera={{ position: [0, 0, 35], fov: 50 }}
        gl={{ 
          antialias: false, 
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          alpha: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#02040a');
        }}
        className={`transition-all duration-1000 ${isConfigOpen ? 'opacity-40 blur-md' : 'opacity-100 blur-0'}`}
      >
        <Environment preset="city" />
        <ambientLight intensity={0.2} />
        <Stars radius={100} depth={50} count={isMobile ? 1000 : 4000} factor={4} saturation={0} fade speed={0.5} />
        <MagicSnow isMobile={isMobile} />

        <group position={[0, -2, 0]}>
            <Foliage progress={progressRef} isMobile={isMobile} />
            <Ornaments progress={progressRef} isMobile={isMobile} />
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
                onClick={() => {
                   if (isLetterFocused) {
                      setIsLetterFocused(false);
                      if (interactionMode === InteractionMode.FOCUS) setInteractionMode(InteractionMode.TREE);
                   } else {
                      setIsLetterFocused(true);
                      setSelectedPhotoIndex(-1);
                      setInteractionMode(InteractionMode.FOCUS);
                   }
                }}
            />

            <mesh visible={false} onClick={(e) => {
                e.stopPropagation();
                if (isLetterFocused) return;
                setInteractionMode(prev => prev === InteractionMode.TREE ? InteractionMode.UNLEASHED : InteractionMode.TREE);
            }}>
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

      <div className={`absolute top-10 w-full flex justify-center z-10 pointer-events-none transition-all duration-1000 ${isConfigOpen ? 'opacity-0 -translate-y-10' : 'opacity-100 translate-y-0'}`}>
        <div onClick={async () => {
            const blob = await stopRecording();
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `christmas.webm`;
                a.click(); URL.revokeObjectURL(url);
            }
            setShowMemoryModal(true);
        }} className="text-center cursor-pointer group pointer-events-auto active:scale-95 transition-transform">
            <h1 className="font-christmas text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] p-4">
              Merry Christmas
            </h1>
        </div>
      </div>

      {showMemoryModal && recordedBlob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
           <div className="relative bg-white p-2 shadow-2xl max-w-sm w-full rounded-sm">
              <video src={URL.createObjectURL(recordedBlob)} autoPlay loop controls className="w-full aspect-[3/4] object-cover bg-black" />
              <div className="p-4 text-center">
                  <button onClick={() => { setShowMemoryModal(false); resetRecording(); }} className="px-10 py-2 bg-black text-white text-[10px] uppercase tracking-widest font-bold">Close</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
