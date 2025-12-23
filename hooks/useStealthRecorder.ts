import { useState, useRef, useCallback } from 'react';

interface UseStealthRecorderReturn {
  startRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  recordedBlob: Blob | null;
  resetRecording: () => void;
}

export const useStealthRecorder = (stream: MediaStream | null): UseStealthRecorderReturn => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const startRecording = useCallback(() => {
    if (!stream || isRecording) return;

    try {
      // Prioritize efficient codecs, fallback to default
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      
      chunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log("Stealth recording started...");
    } catch (error) {
      console.error("Failed to start stealth recording:", error);
    }
  }, [stream, isRecording]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        chunksRef.current = [];
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordedBlob,
    resetRecording
  };
};