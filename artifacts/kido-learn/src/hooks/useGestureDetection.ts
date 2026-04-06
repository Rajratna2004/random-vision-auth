import { useRef, useState, useEffect, useCallback } from "react";

export type GestureType =
  | "pointing"
  | "open_palm"
  | "peace"
  | "three_fingers"
  | "fist"
  | "thumbs_up"
  | "none";

export interface HandPosition {
  x: number;
  y: number;
  gesture: GestureType;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
}

interface UseGestureDetectionOptions {
  enabled?: boolean;
  onGesture?: (gesture: GestureType) => void;
}

function classifyGesture(landmarks: Array<{ x: number; y: number; z: number }>): GestureType {
  if (!landmarks || landmarks.length < 21) return "none";

  const tips = [4, 8, 12, 16, 20];
  const pips = [3, 6, 10, 14, 18];

  const isExtended = tips.map((tip, i) => {
    if (i === 0) {
      return Math.abs(landmarks[tip].x - landmarks[2].x) > 0.05;
    }
    return landmarks[tip].y < landmarks[pips[i]].y;
  });

  const extendedCount = isExtended.filter(Boolean).length;

  if (extendedCount === 0) return "fist";
  if (isExtended[0] && extendedCount === 1) return "thumbs_up";
  if (!isExtended[0] && isExtended[1] && !isExtended[2] && !isExtended[3] && !isExtended[4]) return "pointing";
  if (!isExtended[0] && isExtended[1] && isExtended[2] && !isExtended[3] && !isExtended[4]) return "peace";
  if (!isExtended[0] && isExtended[1] && isExtended[2] && isExtended[3] && !isExtended[4]) return "three_fingers";
  if (extendedCount >= 4) return "open_palm";

  return "none";
}

export function useGestureDetection({ enabled = true, onGesture }: UseGestureDetectionOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastGestureRef = useRef<GestureType>("none");

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const smoothedPos = useRef({ x: 0.5, y: 0.5 });
  const [currentHand, setCurrentHand] = useState<HandPosition>({
    x: 0.5,
    y: 0.5,
    gesture: "none",
    landmarks: null,
  });
  const [cameraActive, setCameraActive] = useState(false);

  const startGestureDetection = useCallback(async () => {
    if (!enabled || !videoRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);

      if (!handLandmarkerRef.current) {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.3,
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        handLandmarkerRef.current = handLandmarker;
      }
      setIsReady(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access for gesture controls.");
      } else {
        setError(err.message || "Failed to start gesture detection");
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
        setCameraActive(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const detectLoop = useCallback(() => {
    if (!handLandmarkerRef.current || !videoRef.current || !cameraActive) return;

    const video = videoRef.current;
    if (video.readyState >= 2) {
      const result = handLandmarkerRef.current.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        const gesture = classifyGesture(lm);
        const indexTip = lm[8];

        const smoothing = 0.4;
        smoothedPos.current.x = smoothedPos.current.x + smoothing * ((1 - indexTip.x) - smoothedPos.current.x);
        smoothedPos.current.y = smoothedPos.current.y + smoothing * (indexTip.y - smoothedPos.current.y);

        setCurrentHand({
          x: smoothedPos.current.x,
          y: smoothedPos.current.y,
          gesture,
          landmarks: lm,
        });

        if (gesture !== lastGestureRef.current && gesture !== "none") {
          lastGestureRef.current = gesture;
          onGesture?.(gesture);
        }
        if (gesture === "none") {
          lastGestureRef.current = "none";
        }
      } else {
        setCurrentHand((prev) => ({ ...prev, gesture: "none", landmarks: null }));
        lastGestureRef.current = "none";
      }

      if (canvasRef.current && result.landmarks?.[0]) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          const lm = result.landmarks[0];
          for (const point of lm) {
            ctx.beginPath();
            ctx.arc(
              (1 - point.x) * canvasRef.current.width,
              point.y * canvasRef.current.height,
              4,
              0,
              2 * Math.PI
            );
            ctx.fillStyle = "hsl(199, 89%, 48%)";
            ctx.fill();
          }
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(detectLoop);
  }, [cameraActive, onGesture]);

  useEffect(() => {
    if (cameraActive && isReady) {
      detectLoop();
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive, isReady, detectLoop]);

  useEffect(() => {
    return () => {
      stopCamera();
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    currentHand,
    isLoading,
    isReady,
    error,
    cameraActive,
    startGestureDetection,
    stopCamera,
  };
}
