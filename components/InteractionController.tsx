
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { InteractionControllerProps, InteractionMode } from '../types';
import * as THREE from 'three';

const InteractionController: React.FC<InteractionControllerProps> = ({ 
  mode, 
  setMode, 
  setSelection,
  progressRef, 
  scrollOffsetRef,
  totalPhotos,
  onStreamReady,
  onVisionReady
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetProgress = useRef(1.0);
  
  const [status, setStatus] = useState<string>("Initializing...");
  const [handPose, setHandPose] = useState<"OPEN" | "CLOSED" | "PINCH" | "NONE">("NONE");
  const [handCoords, setHandCoords] = useState<{x: number, y: number}>({x: 0.5, y: 0.5});
  
  // --- THREAD-SAFE CONTROL REFS ---
  const modeRef = useRef(mode);
  const totalPhotosRef = useRef(totalPhotos);
  const lastStateChangeTime = useRef(0);
  const targetScrollIndex = useRef(0);
  
  // Consistency Counters to prevent jitter/flicker
  const poseCount = useRef<{pose: string, count: number}>({ pose: "NONE", count: 0 });
  const REQUIRED_FRAMES = 12; // Frames required to confirm a gesture

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { totalPhotosRef.current = totalPhotos; }, [totalPhotos]);

  useEffect(() => {
    targetProgress.current = mode === InteractionMode.TREE ? 1.0 : 0.0;
  }, [mode]);

  // Helper to trigger mode change safely
  const triggerModeChange = (newMode: InteractionMode) => {
    const now = performance.now();
    if (newMode === modeRef.current) return;
    if (now - lastStateChangeTime.current < 1000) return; // Strict 1s cooldown

    console.log(`[Interaction] Transition: ${modeRef.current} -> ${newMode}`);
    modeRef.current = newMode;
    lastStateChangeTime.current = now;
    setMode(newMode);
    
    // Reset consistency on change
    poseCount.current = { pose: "NONE", count: 0 };
  };

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let activeStream: MediaStream | null = null;

    const initAI = async () => {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 640, height: 480 }
        });
        activeStream = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            onStreamReady(stream);
        }
        return landmarker;
    };

    const predictWebcam = async () => {
      if (!handLandmarker || !videoRef.current) return;
      const now = performance.now();
      
      try {
        if (videoRef.current.currentTime > 0 && !videoRef.current.paused && !videoRef.current.ended) {
            const result = handLandmarker.detectForVideo(videoRef.current, now);
            
            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];
                const wrist = landmarks[0]; 
                const thumbTip = landmarks[4];
                const indexTip = landmarks[8];
                
                // Low-pass filter for coordinates to reduce UI churn
                const hX = 1.0 - wrist.x;
                const hY = wrist.y;
                setHandCoords(p => (Math.abs(p.x - hX) > 0.02 || Math.abs(p.y - hY) > 0.02) ? {x: hX, y: hY} : p);

                // --- GESTURE DETECTION ---
                const tips = [4, 8, 12, 16, 20];
                let distSum = 0;
                tips.forEach(i => distSum += Math.sqrt(Math.pow(landmarks[i].x - wrist.x, 2) + Math.pow(landmarks[i].y - wrist.y, 2)));
                const avgDist = distSum / 5;
                const pDist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));

                let rawPose: "OPEN" | "CLOSED" | "PINCH" = "OPEN";
                if (avgDist < 0.17) rawPose = "CLOSED"; 
                else if (pDist < 0.045) rawPose = "PINCH";

                // --- CONSISTENCY CHECK ---
                if (poseCount.current.pose === rawPose) {
                    poseCount.current.count++;
                } else {
                    poseCount.current = { pose: rawPose, count: 1 };
                }

                // Update UI state only after confirmation
                if (poseCount.current.count === 3) setHandPose(rawPose);

                // --- STATE MACHINE LOGIC ---
                const confirmed = poseCount.current.count >= REQUIRED_FRAMES;
                const currentMode = modeRef.current;
                const total = totalPhotosRef.current;
                const isLocked = (now - lastStateChangeTime.current) < 1000;

                if (confirmed && !isLocked) {
                    const pose = poseCount.current.pose;

                    if (currentMode === InteractionMode.FOCUS && pose === "OPEN") {
                        // EXIT FOCUS -> CAROUSEL
                        triggerModeChange(InteractionMode.CAROUSEL);
                    } 
                    else if (currentMode === InteractionMode.CAROUSEL && pose === "PINCH") {
                        // ENTER FOCUS
                        const snappedIndex = Math.round(scrollOffsetRef.current);
                        if (snappedIndex >= 0 && snappedIndex < total) {
                            setSelection(snappedIndex);
                            triggerModeChange(InteractionMode.FOCUS);
                        }
                    }
                    else if (currentMode === InteractionMode.TREE && pose === "OPEN") {
                        // START
                        triggerModeChange(InteractionMode.UNLEASHED);
                    }
                    else if (pose === "CLOSED" && currentMode !== InteractionMode.TREE) {
                        // RESET
                        triggerModeChange(InteractionMode.TREE);
                    }
                    else if (currentMode === InteractionMode.UNLEASHED && total > 0 && pose === "OPEN") {
                        // AUTO-BROWSE
                        triggerModeChange(InteractionMode.CAROUSEL);
                    }
                }

                // --- CONTINUOUS TASKS ---
                // Scrolling: Only allow if in carousel, hand is open, and NOT during a transition freeze
                if (currentMode === InteractionMode.CAROUSEL && poseCount.current.pose === "OPEN" && !isLocked) {
                    const margin = 0.1;
                    const normalizedX = Math.max(0, Math.min(1, (hX - margin) / (1 - 2 * margin)));
                    targetScrollIndex.current = normalizedX * (total - 1);
                    scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, targetScrollIndex.current, 0.1);
                }

                // Snap logic if no active scrolling
                if (currentMode === InteractionMode.CAROUSEL && poseCount.current.pose !== "OPEN") {
                    scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, Math.round(scrollOffsetRef.current), 0.1);
                }

            } else {
                poseCount.current = { pose: "NONE", count: 0 };
                setHandPose("NONE");
                if (modeRef.current === InteractionMode.CAROUSEL) {
                  scrollOffsetRef.current = THREE.MathUtils.lerp(scrollOffsetRef.current, Math.round(scrollOffsetRef.current), 0.05);
                }
            }
        }
      } catch (err) { /* Frame drop */ }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    initAI().then(landmarker => {
        handLandmarker = landmarker;
        setStatus("Active");
        onVisionReady?.();
        predictWebcam();
    }).catch(() => setStatus("Error"));

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      handLandmarker?.close();
    };
  }, []);

  useEffect(() => {
    let animId: number;
    const loop = () => {
        progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress.current, 0.05);
        animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [progressRef]);

  return (
    <div className="absolute top-4 left-4 z-[90] flex flex-col items-start gap-3 pointer-events-none select-none">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-[9px] text-white/60 font-mono uppercase tracking-[0.3em] font-bold">{status}</span>
        </div>

        {handPose !== 'NONE' && (
            <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 px-4 py-2 rounded-sm">
                <span className="text-[10px] text-yellow-500 font-serif-display font-bold uppercase tracking-widest">{handPose}</span>
            </div>
        )}

        <div className="relative border border-white/5 rounded-sm overflow-hidden bg-black shadow-2xl">
            <video ref={videoRef} id="video-preview" autoPlay playsInline muted className="w-24 h-18 object-cover" />
            {status === 'Active' && handPose !== 'NONE' && (
              <div 
                className="absolute w-2 h-2 bg-white rounded-full blur-[1px] shadow-[0_0_8px_#fff] transition-all duration-75"
                style={{ left: `${handCoords.x * 100}%`, top: `${handCoords.y * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
            )}
        </div>
        
        <div className="text-[8px] text-white/30 uppercase tracking-widest italic leading-relaxed max-w-[120px]">
           {mode === InteractionMode.FOCUS ? "Hold Palm Open to Exit" : "Pinch to Select"}
        </div>
    </div>
  );
};

export default InteractionController;
