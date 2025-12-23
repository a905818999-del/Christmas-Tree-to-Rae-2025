
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { InteractionControllerProps, InteractionMode } from '../types';
import * as THREE from 'three';

const InteractionController: React.FC<InteractionControllerProps> = ({ 
  mode, setMode, setSelection, progressRef, scrollOffsetRef, totalPhotos, onStreamReady, onVisionReady
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetProgress = useRef(1.0);
  const [status, setStatus] = useState<string>("Initializing...");
  const [handPose, setHandPose] = useState<"OPEN" | "CLOSED" | "PINCH" | "NONE">("NONE");
  const [handCoords, setHandCoords] = useState<{x: number, y: number}>({x: 0.5, y: 0.5});
  const [isAiSkipped, setIsAiSkipped] = useState(false);

  const modeRef = useRef(mode);
  const totalPhotosRef = useRef(totalPhotos);
  const lastStateChangeTime = useRef(0);
  const poseCount = useRef({ pose: "NONE", count: 0 });
  const REQUIRED_FRAMES = 12;

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { totalPhotosRef.current = totalPhotos; }, [totalPhotos]);
  useEffect(() => { targetProgress.current = mode === InteractionMode.TREE ? 1.0 : 0.0; }, [mode]);

  const triggerModeChange = (newMode: InteractionMode) => {
    const now = performance.now();
    if (newMode === modeRef.current || now - lastStateChangeTime.current < 1000) return;
    modeRef.current = newMode;
    lastStateChangeTime.current = now;
    setMode(newMode);
    poseCount.current = { pose: "NONE", count: 0 };
  };

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    // Timeout for AI loading
    const timeoutId = setTimeout(() => {
      if (status === "Initializing...") {
        setStatus("Touch Mode");
        setIsAiSkipped(true);
      }
    }, 8000);

    const initAI = async () => {
        try {
          const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
          const landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              // Use CPU on potentially weak tablets to avoid WebGL context loss
              delegate: /iPad|iPhone|Android/i.test(navigator.userAgent) ? "CPU" : "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
          });
          
          if (!isMounted) return;

          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
          });
          activeStream = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              onStreamReady(stream);
          }
          clearTimeout(timeoutId);
          return landmarker;
        } catch (e) {
          console.warn("AI Init failed, falling back to touch", e);
          setStatus("Touch Mode");
          setIsAiSkipped(true);
          return null;
        }
    };

    const predictWebcam = async () => {
      if (!handLandmarker || !videoRef.current) return;
      const now = performance.now();
      try {
        if (videoRef.current.currentTime > 0 && !videoRef.current.paused) {
            const result = handLandmarker.detectForVideo(videoRef.current, now);
            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];
                const wrist = landmarks[0]; 
                const hX = 1.0 - wrist.x; const hY = wrist.y;
                setHandCoords(p => (Math.abs(p.x - hX) > 0.02 || Math.abs(p.y - hY) > 0.02) ? {x: hX, y: hY} : p);

                const tips = [4, 8, 12, 16, 20];
                let distSum = 0; tips.forEach(i => distSum += Math.sqrt(Math.pow(landmarks[i].x - wrist.x, 2) + Math.pow(landmarks[i].y - wrist.y, 2)));
                const avgDist = distSum / 5;
                const pDist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2));

                let rawPose: any = "OPEN";
                if (avgDist < 0.17) rawPose = "CLOSED"; else if (pDist < 0.045) rawPose = "PINCH";
                if (poseCount.current.pose === rawPose) poseCount.current.count++; else poseCount.current = { pose: rawPose, count: 1 };
                if (poseCount.current.count === 3) setHandPose(rawPose);

                const confirmed = poseCount.current.count >= REQUIRED_FRAMES;
                const isLocked = (now - lastStateChangeTime.current) < 1000;
                if (confirmed && !isLocked) {
                    const pose = poseCount.current.pose;
                    if (modeRef.current === InteractionMode.FOCUS && pose === "OPEN") triggerModeChange(InteractionMode.CAROUSEL);
                    else if (modeRef.current === InteractionMode.CAROUSEL && pose === "PINCH") {
                        const idx = Math.round(scrollOffsetRef.current);
                        if (idx >= 0 && idx < totalPhotosRef.current) { setSelection(idx); triggerModeChange(InteractionMode.FOCUS); }
                    }
                    else if (modeRef.current === InteractionMode.TREE && pose === "OPEN") triggerModeChange(InteractionMode.UNLEASHED);
                    else if (pose === "CLOSED" && modeRef.current !== InteractionMode.TREE) triggerModeChange(InteractionMode.TREE);
                    else if (modeRef.current === InteractionMode.UNLEASHED && totalPhotosRef.current > 0 && pose === "OPEN") triggerModeChange(InteractionMode.CAROUSEL);
                }
                if (modeRef.current === InteractionMode.CAROUSEL && poseCount.current.pose === "OPEN" && !isLocked) {
                    scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, hX * (totalPhotosRef.current - 1), 0.1);
                }
            } else {
                poseCount.current = { pose: "NONE", count: 0 }; setHandPose("NONE");
                if (modeRef.current === InteractionMode.CAROUSEL) scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, Math.round(scrollOffsetRef.current), 0.05);
            }
        }
      } catch (err) {}
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    initAI().then(landmarker => {
        if (!landmarker) return;
        handLandmarker = landmarker;
        setStatus("Active");
        onVisionReady?.();
        predictWebcam();
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      handLandmarker?.close();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let animId: number;
    const loop = () => { progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress.current, 0.05); animId = requestAnimationFrame(loop); };
    loop(); return () => cancelAnimationFrame(animId);
  }, [progressRef]);

  return (
    <div className="absolute top-4 left-4 z-[90] flex flex-col items-start gap-3 pointer-events-none select-none">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-400' : status === 'Touch Mode' ? 'bg-blue-400' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-[9px] text-white/60 font-mono uppercase tracking-[0.3em] font-bold">{status}</span>
        </div>

        {!isAiSkipped && (
          <div className="relative border border-white/5 rounded-sm overflow-hidden bg-black shadow-2xl">
              <video ref={videoRef} id="video-preview" autoPlay playsInline muted className="w-24 h-18 object-cover opacity-30" />
              {status === 'Active' && handPose !== 'NONE' && (
                <div className="absolute w-2 h-2 bg-white rounded-full blur-[1px] shadow-[0_0_8px_#fff]" style={{ left: `${handCoords.x * 100}%`, top: `${handCoords.y * 100}%`, transform: 'translate(-50%, -50%)' }} />
              )}
          </div>
        )}
        
        <div className="text-[8px] text-white/40 uppercase tracking-widest leading-relaxed max-w-[140px]">
           {status === 'Active' ? (mode === InteractionMode.FOCUS ? "Open Palm to Exit" : "Pinch to Select") : "Click tree to interact"}
        </div>
    </div>
  );
};

export default InteractionController;
