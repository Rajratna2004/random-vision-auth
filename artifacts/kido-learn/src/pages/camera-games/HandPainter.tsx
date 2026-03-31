import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Check } from "lucide-react";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import GestureOverlay from "@/components/GestureOverlay";
import GestureCursor from "@/components/GestureCursor";
import GestureTutorial from "@/components/GestureTutorial";
import { playPop, playSuccess, playSwoosh } from "@/lib/sounds";

interface Region {
  id: number;
  path: string;
  targetColor: string;
  colorName: string;
  filled: boolean;
  currentColor: string;
  emoji?: string;
}

const PALETTE = ["#FF6B6B", "#FF9F43", "#FECA57", "#48DBFB", "#1DD1A1", "#5F27CD", "#A29BFE", "#fd79a8", "#FDCB6E", "#00B894"];

const SCENES: { name: string; emoji: string; regions: Omit<Region, "filled" | "currentColor">[] }[] = [
  {
    name: "Sunshine House",
    emoji: "🏠",
    regions: [
      { id: 0, path: "M50,30 L200,30 L200,120 L50,120 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 1, path: "M50,120 L200,120 L200,220 L50,220 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 2, path: "M30,30 L225,30 L125,0 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 3, path: "M95,150 L155,150 L155,220 L95,220 Z", targetColor: "#5F27CD", colorName: "Purple", emoji: "🟣" },
      { id: 4, path: "M55,50 L105,50 L105,115 L55,115 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 5, path: "M145,50 L195,50 L195,115 L145,115 Z", targetColor: "#1DD1A1", colorName: "Green", emoji: "🟢" },
    ]
  },
  {
    name: "Rainbow Fish",
    emoji: "🐟",
    regions: [
      { id: 0, path: "M80,100 Q160,40 230,100 Q160,160 80,100 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 1, path: "M30,80 L80,70 L80,130 L30,120 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 2, path: "M180,60 Q220,80 220,100 Q220,120 180,140 Q200,100 180,60 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 3, path: "M130,80 Q160,70 175,100 Q160,130 130,120 Q145,100 130,80 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 4, path: "M210,95 Q228,98 225,102 Q212,105 213,100 Z", targetColor: "#fd79a8", colorName: "Pink", emoji: "🩷" },
    ]
  },
  {
    name: "Flower Garden",
    emoji: "🌸",
    regions: [
      { id: 0, path: "M125,0 Q145,30 125,60 Q105,30 125,0 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 1, path: "M185,45 Q165,70 140,65 Q148,40 185,45 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 2, path: "M65,45 Q102,40 110,65 Q85,70 65,45 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 3, path: "M165,90 Q155,70 140,80 Q130,70 115,80 Q100,70 90,90 Q115,100 125,95 Q135,100 165,90 Z", targetColor: "#fd79a8", colorName: "Pink", emoji: "🩷" },
      { id: 4, path: "M120,90 L130,200 L125,200 L120,90 Z M115,145 Q90,155 80,175 Q115,165 115,145 Z M135,145 Q160,155 170,175 Q135,165 135,145 Z", targetColor: "#1DD1A1", colorName: "Green", emoji: "🟢" },
    ]
  }
];

const HAND_PAINTER_GESTURES = [
  { emoji: "☝️", label: "Point", description: "Select / fill region" },
  { emoji: "✌️", label: "Peace", description: "Next color in palette" },
  { emoji: "✋", label: "Open Palm", description: "Reset current region" },
];

export default function HandPainter({ onBack }: { onBack: () => void }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastGestureRef = useRef<number>(0);
  const gestureCallbackRef = useRef<((g: string) => void) | null>(null);

  const { videoRef, canvasRef, currentHand, isLoading, isReady, error, cameraActive, startGestureDetection, stopCamera } =
    useGestureDetection({ onGesture: (g) => gestureCallbackRef.current?.(g) });

  const scene = SCENES[sceneIdx];

  const initRegions = useCallback((idx: number) => {
    setRegions(SCENES[idx].regions.map(r => ({ ...r, filled: false, currentColor: "#E8E8E8" })));
    setConfetti(false);
  }, []);

  useEffect(() => { initRegions(sceneIdx); }, [sceneIdx, initRegions]);

  const fillRegion = useCallback((id: number) => {
    playPop();
    setRegions(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, currentColor: selectedColor, filled: r.currentColor === r.targetColor ? r.filled : selectedColor === r.targetColor } : r);
      if (updated.every(r => r.filled)) {
        setTimeout(() => { playSuccess(); setConfetti(true); }, 100);
      }
      return updated;
    });
  }, [selectedColor]);

  useEffect(() => {
    gestureCallbackRef.current = (g: string) => {
      const now = Date.now();
      if (now - lastGestureRef.current < 600) return;
      lastGestureRef.current = now;
      if (g === "peace") {
        playSwoosh();
        setSelectedColor(prev => {
          const idx = PALETTE.indexOf(prev);
          return PALETTE[(idx + 1) % PALETTE.length];
        });
      } else if (g === "pointing" && svgRef.current) {
        const px = currentHand.x * window.innerWidth;
        const py = currentHand.y * window.innerHeight;
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = ((px - rect.left) / rect.width) * 250;
        const svgY = ((py - rect.top) / rect.height) * 220;
        regions.forEach(region => {
          const path = document.getElementById(`region-${region.id}`);
          if (path instanceof SVGPathElement) {
            const svgEl = svgRef.current!;
            const pt = svgEl.createSVGPoint();
            pt.x = svgX; pt.y = svgY;
            try {
              if (path.isPointInFill?.(pt)) { fillRegion(region.id); }
            } catch {}
          }
        });
      }
    };
  }, [currentHand, regions, fillRegion]);

  const handleToggleCamera = async () => {
    if (cameraActive) { stopCamera(); } else { setShowTutorial(true); }
  };

  const handleTutorialDismiss = async () => {
    setShowTutorial(false);
    await startGestureDetection();
  };

  const allFilled = regions.length > 0 && regions.every(r => r.filled);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted"><ArrowLeft size={20} /></motion.button>
        <h2 className="text-xl font-display text-foreground">🎨 Hand Painter</h2>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => initRegions(sceneIdx)} className="p-2 rounded-full bg-muted"><RotateCcw size={18} /></motion.button>
      </div>

      <div className="flex justify-center gap-2 mb-3">
        {SCENES.map((s, i) => (
          <motion.button key={i} whileTap={{ scale: 0.9 }} onClick={() => setSceneIdx(i)}
            className={`kiddo-btn text-sm px-3 py-2 ${sceneIdx === i ? "kiddo-gradient-sky text-white" : "bg-muted text-foreground"}`}>
            {s.emoji} {s.name}
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-xs mx-auto border-4 border-[#0DA2E7] rounded-2xl bg-white shadow-xl overflow-hidden">
          <svg ref={svgRef} viewBox="0 0 250 220" className="w-full" style={{ display: "block" }}>
            {regions.map(region => (
              <path
                key={region.id}
                id={`region-${region.id}`}
                d={region.path}
                fill={region.currentColor}
                stroke="#555"
                strokeWidth={2}
                className="cursor-pointer hover:opacity-80"
                onClick={() => fillRegion(region.id)}
              />
            ))}
          </svg>
          <AnimatePresence>
            {confetti && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-5xl mb-2">🎉</div>
                  <h3 className="text-xl font-display text-green-600">Masterpiece!</h3>
                  <p className="text-sm text-muted-foreground mb-3">All colors matched!</p>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setSceneIdx((sceneIdx + 1) % SCENES.length)}
                    className="kiddo-btn kiddo-gradient-candy text-white text-sm">Next Scene 🎨</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 w-full max-w-xs">
          <p className="text-xs text-muted-foreground text-center mb-2 font-bold">Target Colors</p>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {regions.map(r => (
              <div key={r.id} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border-2 ${r.filled ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-gray-300 text-gray-600"}`}>
                {r.emoji} {r.colorName}
                {r.filled && <Check size={12} className="text-green-600" />}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mb-2 font-bold">Paint Color</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PALETTE.map(c => (
              <motion.button key={c} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => setSelectedColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? "border-gray-800 scale-110 ring-2 ring-ring" : "border-gray-300"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <GestureOverlay videoRef={videoRef} canvasRef={canvasRef} cameraActive={cameraActive}
        isLoading={isLoading} isReady={isReady} error={error} onToggleCamera={handleToggleCamera}
        gesture={currentHand.gesture}
      />
      <GestureCursor x={currentHand.x} y={currentHand.y} gesture={currentHand.gesture} visible={cameraActive} />

      {showTutorial && <GestureTutorial onDismiss={handleTutorialDismiss} gestures={HAND_PAINTER_GESTURES} />}
    </div>
  );
}
