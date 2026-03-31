import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Palette, RotateCcw } from "lucide-react";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import GestureOverlay from "@/components/GestureOverlay";
import GestureCursor from "@/components/GestureCursor";
import GestureTutorial from "@/components/GestureTutorial";
import { playSwoosh, playClear } from "@/lib/sounds";

const COLORS = [
  "hsl(0, 80%, 55%)",
  "hsl(25, 95%, 55%)",
  "hsl(45, 100%, 50%)",
  "hsl(145, 63%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(270, 60%, 55%)",
  "hsl(340, 82%, 55%)",
  "hsl(0, 0%, 10%)",
];

const SIZES = [4, 8, 14, 22];

const DRAWING_GESTURES = [
  { emoji: "☝️", label: "Point", description: "Draw in the air" },
  { emoji: "✌️", label: "Peace", description: "Change color" },
  { emoji: "✋", label: "Open Palm", description: "Clear canvas" },
  { emoji: "✊", label: "Fist", description: "Pause drawing" },
];

export default function AirDraw({ onBack }: { onBack: () => void }) {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef = useRef<HTMLVideoElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[4]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const gestureCallbackRef = useRef<((g: string) => void) | null>(null);
  const {
    videoRef, canvasRef: gestureCanvasRef, currentHand, isLoading, isReady,
    error, cameraActive, startGestureDetection, stopCamera,
  } = useGestureDetection({ onGesture: (g) => gestureCallbackRef.current?.(g) });

  useEffect(() => {
    if (cameraActive && videoRef.current?.srcObject && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = videoRef.current.srcObject;
      videoDisplayRef.current.play().catch(() => {});
    } else if (!cameraActive && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = null;
    }
  }, [cameraActive, videoRef]);

  useEffect(() => {
    if (!cameraActive || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (currentHand.gesture === "pointing" && currentHand.landmarks) {
      const x = Math.max(0, Math.min(currentHand.x * canvas.width, canvas.width));
      const y = Math.max(0, Math.min(currentHand.y * canvas.height, canvas.height));
      if (lastPos.current) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.stroke();
      }
      lastPos.current = { x, y };
    } else {
      lastPos.current = null;
    }
  }, [currentHand, cameraActive, color, brushSize]);

  useEffect(() => {
    gestureCallbackRef.current = (g: string) => {
      if (g === "peace") {
        playSwoosh();
        setColor(prev => {
          const idx = COLORS.indexOf(prev);
          return COLORS[(idx + 1) % COLORS.length];
        });
      } else if (g === "open_palm") {
        playClear();
        const canvas = drawCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, []);

  const handleToggleCamera = async () => {
    if (cameraActive) { stopCamera(); } else { setShowTutorial(true); }
  };

  const handleTutorialDismiss = async () => {
    setShowTutorial(false);
    await startGestureDetection();
  };

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (cameraActive) return;
    setIsDrawing(true);
    lastPos.current = getPos(e);
  }, [getPos, cameraActive]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || cameraActive) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color; ctx.lineWidth = brushSize;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing, color, brushSize, getPos, cameraActive]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      if (cameraActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [cameraActive]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      if (!cameraActive) {
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [cameraActive]);

  return (
    <div className="flex flex-col" ref={containerRef} style={{ minHeight: 400 }}>
      <div className="flex items-center gap-3 p-3 relative z-10">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted/80 backdrop-blur-sm">
          <ArrowLeft size={20} />
        </motion.button>
        <h2 className="text-xl font-display text-foreground">🎨 {cameraActive ? "Air Canvas" : "Drawing Canvas"}</h2>
        {cameraActive && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
            ☝️ Draw • ✌️ Color • ✋ Clear • ✊ Pause
          </span>
        )}
      </div>

      <div className="flex-1 mx-3 mb-3 rounded-2xl overflow-hidden border-4 border-[#0DA2E7] shadow-lg relative bg-black" style={{ minHeight: 320 }}>
        {cameraActive && (
          <video ref={videoDisplayRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} playsInline muted />
        )}

        <canvas
          ref={drawCanvasRef}
          className={`absolute inset-0 w-full h-full touch-none ${cameraActive ? "cursor-none" : "cursor-crosshair bg-white"}`}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />

        {cameraActive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 z-10">
            <div className="w-5 h-5 rounded-full border-2 border-gray-400" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-gray-700">Brush</span>
          </div>
        )}
      </div>

      {!cameraActive && (
        <div className="p-3 flex flex-wrap items-center justify-center gap-2 bg-card rounded-t-2xl shadow-lg">
          <div className="flex gap-1.5 items-center">
            <Palette size={18} className="text-muted-foreground" />
            {COLORS.map(c => (
              <motion.button key={c} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-gray-800 scale-110 ring-2 ring-ring" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1.5 items-center ml-3">
            {SIZES.map(s => (
              <motion.button key={s} whileTap={{ scale: 0.8 }} onClick={() => setBrushSize(s)}
                className={`rounded-full bg-gray-800 transition-all ${brushSize === s ? "ring-2 ring-primary" : ""}`}
                style={{ width: s + 10, height: s + 10 }}
              />
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={clearCanvas}
            className="ml-3 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold">
            <RotateCcw size={14} className="inline mr-1" /> Clear
          </motion.button>
        </div>
      )}

      <GestureOverlay videoRef={videoRef} canvasRef={gestureCanvasRef} cameraActive={cameraActive}
        isLoading={isLoading} isReady={isReady} error={error} onToggleCamera={handleToggleCamera}
        gesture={currentHand.gesture}
      />
      <GestureCursor x={currentHand.x} y={currentHand.y} gesture={currentHand.gesture} visible={cameraActive} />

      {showTutorial && <GestureTutorial onDismiss={handleTutorialDismiss} gestures={DRAWING_GESTURES} />}
    </div>
  );
}
