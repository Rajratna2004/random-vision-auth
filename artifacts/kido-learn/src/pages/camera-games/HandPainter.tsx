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

const PALETTE = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#48DBFB",
  "#1DD1A1", "#5F27CD", "#A29BFE", "#fd79a8",
  "#FDCB6E", "#00B894", "#2ecc71", "#e17055",
  "#FFFFFF", "#888888",
];

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
      { id: 0, path: "M60,100 Q130,40 200,100 Q130,160 60,100 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 1, path: "M20,65 L60,80 L60,120 L20,135 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 2, path: "M200,100 Q220,75 240,100 Q220,125 200,100 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 3, path: "M110,72 Q140,55 165,72 Q140,90 110,72 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 4, path: "M170,88 Q185,75 200,88 Q185,101 170,88 Z", targetColor: "#fd79a8", colorName: "Pink", emoji: "🩷" },
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
  },
  {
    name: "Space Rocket",
    emoji: "🚀",
    regions: [
      { id: 0, path: "M125,10 Q145,40 145,90 L105,90 Q105,40 125,10 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 1, path: "M105,90 L145,90 L145,170 L105,170 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 2, path: "M105,170 L145,170 L155,200 L95,200 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 3, path: "M145,100 L165,130 L145,140 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 4, path: "M105,100 L85,130 L105,140 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 5, path: "M110,105 Q125,95 140,105 Q140,130 125,135 Q110,130 110,105 Z", targetColor: "#A29BFE", colorName: "Purple", emoji: "🟣" },
    ]
  },
  {
    name: "Boat & Sky",
    emoji: "⛵",
    regions: [
      { id: 0, path: "M0,0 L250,0 L250,145 L0,145 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 1, path: "M0,145 L250,145 L250,220 L0,220 Z", targetColor: "#1DD1A1", colorName: "Green", emoji: "🟢" },
      { id: 2, path: "M195,10 C208,10 220,22 220,35 C220,48 208,60 195,60 C182,60 170,48 170,35 C170,22 182,10 195,10 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 3, path: "M20,20 Q35,5 55,12 Q70,2 88,12 Q105,5 112,20 Q100,32 65,27 Q40,35 20,20 Z", targetColor: "#FFFFFF", colorName: "White", emoji: "⬜" },
      { id: 4, path: "M45,145 Q125,132 205,145 L190,178 L60,178 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 5, path: "M125,55 L125,145 L75,138 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 6, path: "M125,55 L125,145 L180,138 Z", targetColor: "#A29BFE", colorName: "Purple", emoji: "🟣" },
    ]
  },
  {
    name: "Cute Robot",
    emoji: "🤖",
    regions: [
      { id: 0, path: "M70,40 L180,40 L180,120 L70,120 Z", targetColor: "#48DBFB", colorName: "Blue", emoji: "🔵" },
      { id: 1, path: "M85,120 L165,120 L165,200 L85,200 Z", targetColor: "#A29BFE", colorName: "Purple", emoji: "🟣" },
      { id: 2, path: "M110,45 L140,45 L140,35 L125,25 L110,35 Z", targetColor: "#FF6B6B", colorName: "Red", emoji: "🔴" },
      { id: 3, path: "M85,55 L110,55 L110,85 L85,85 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 4, path: "M140,55 L165,55 L165,85 L140,85 Z", targetColor: "#FECA57", colorName: "Yellow", emoji: "🟡" },
      { id: 5, path: "M95,95 L155,95 L155,115 L95,115 Z", targetColor: "#1DD1A1", colorName: "Green", emoji: "🟢" },
      { id: 6, path: "M65,125 L85,125 L85,175 L65,175 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
      { id: 7, path: "M165,125 L185,125 L185,175 L165,175 Z", targetColor: "#FF9F43", colorName: "Orange", emoji: "🟠" },
    ]
  },
];

const HAND_PAINTER_GESTURES = [
  { emoji: "☝️", label: "Point", description: "Fill region with selected color" },
  { emoji: "✌️", label: "Peace ✌️", description: "Cycle to next color in palette" },
  { emoji: "✋", label: "Open Palm", description: "Reset the region you're hovering over" },
];

export default function HandPainter({ onBack }: { onBack: () => void }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [lastGestureName, setLastGestureName] = useState<string>("");
  const svgRef = useRef<SVGSVGElement>(null);
  const lastGestureRef = useRef<number>(0);
  const lastPeaceRef = useRef<number>(0);
  const gestureCallbackRef = useRef<((g: string) => void) | null>(null);

  const { videoRef, canvasRef, currentHand, isLoading, isReady, error, cameraActive, startGestureDetection, stopCamera } =
    useGestureDetection({ onGesture: (g) => gestureCallbackRef.current?.(g) });

  const scene = SCENES[sceneIdx];

  const initRegions = useCallback((idx: number) => {
    setRegions(SCENES[idx].regions.map(r => ({ ...r, filled: false, currentColor: "#E8E8E8" })));
    setConfetti(false);
  }, []);

  useEffect(() => { initRegions(sceneIdx); }, [sceneIdx, initRegions]);

  const fillRegion = useCallback((id: number, color: string) => {
    playPop();
    setRegions(prev => {
      const updated = prev.map(r =>
        r.id === id
          ? { ...r, currentColor: color, filled: color === r.targetColor }
          : r
      );
      if (updated.every(r => r.filled)) {
        setTimeout(() => { playSuccess(); setConfetti(true); }, 100);
      }
      return updated;
    });
  }, []);

  const resetRegion = useCallback((id: number) => {
    playSwoosh();
    setRegions(prev => prev.map(r => r.id === id ? { ...r, currentColor: "#E8E8E8", filled: false } : r));
  }, []);

  const getRegionUnderCursor = useCallback((handX: number, handY: number): number | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((handX * window.innerWidth - rect.left) / rect.width) * 250;
    const svgY = ((handY * window.innerHeight - rect.top) / rect.height) * 220;

    // Check the exact point AND nearby points in a radius to handle small regions
    const probeRadius = 12;
    const probeOffsets = [
      [0, 0],
      [probeRadius, 0], [-probeRadius, 0],
      [0, probeRadius], [0, -probeRadius],
      [probeRadius * 0.7, probeRadius * 0.7],
      [-probeRadius * 0.7, probeRadius * 0.7],
      [probeRadius * 0.7, -probeRadius * 0.7],
      [-probeRadius * 0.7, -probeRadius * 0.7],
    ];

    for (const region of regions) {
      const path = document.getElementById(`region-${region.id}`);
      if (path instanceof SVGPathElement) {
        for (const [dx, dy] of probeOffsets) {
          const pt = svgRef.current.createSVGPoint();
          pt.x = svgX + dx;
          pt.y = svgY + dy;
          try {
            if (path.isPointInFill?.(pt)) return region.id;
          } catch {}
        }
      }
    }
    return null;
  }, [regions]);

  useEffect(() => {
    gestureCallbackRef.current = (g: string) => {
      const now = Date.now();

      if (g === "peace") {
        if (now - lastPeaceRef.current < 800) return;
        lastPeaceRef.current = now;
        playSwoosh();
        setLastGestureName("✌️ Color changed!");
        setSelectedColor(prev => {
          const idx = PALETTE.indexOf(prev);
          return PALETTE[(idx + 1) % PALETTE.length];
        });
        return;
      }

      if (now - lastGestureRef.current < 500) return;
      lastGestureRef.current = now;

      if (g === "pointing") {
        const regionId = getRegionUnderCursor(currentHand.x, currentHand.y);
        if (regionId !== null) {
          fillRegion(regionId, selectedColor);
          setLastGestureName("☝️ Filled!");
        }
      } else if (g === "open_palm") {
        const regionId = getRegionUnderCursor(currentHand.x, currentHand.y);
        if (regionId !== null) {
          resetRegion(regionId);
          setLastGestureName("✋ Reset region!");
        } else {
          initRegions(sceneIdx);
          setLastGestureName("✋ Reset all!");
        }
      }
    };
  }, [currentHand, selectedColor, fillRegion, resetRegion, getRegionUnderCursor, sceneIdx, initRegions]);

  const handleToggleCamera = async () => {
    if (cameraActive) { stopCamera(); } else { setShowTutorial(true); }
  };

  const handleTutorialDismiss = async () => {
    setShowTutorial(false);
    await startGestureDetection();
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted"><ArrowLeft size={20} /></motion.button>
        <h2 className="text-xl font-display text-foreground">🎨 Hand Painter</h2>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => initRegions(sceneIdx)} className="p-2 rounded-full bg-muted"><RotateCcw size={18} /></motion.button>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap justify-center">
        {SCENES.map((s, i) => (
          <motion.button key={i} whileTap={{ scale: 0.9 }} onClick={() => setSceneIdx(i)}
            className={`text-sm px-2 py-1 rounded-xl font-bold border-2 transition-all ${sceneIdx === i ? "border-[#0DA2E7] bg-[#0DA2E7] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-[#0DA2E7]"}`}>
            {s.emoji} {s.name}
          </motion.button>
        ))}
      </div>

      {lastGestureName && (
        <motion.div
          key={lastGestureName + Date.now()}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="text-center text-xs font-bold text-[#0DA2E7] mb-2"
          onAnimationComplete={() => setTimeout(() => setLastGestureName(""), 1500)}
        >
          {lastGestureName}
        </motion.div>
      )}

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
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => fillRegion(region.id, selectedColor)}
                onContextMenu={(e) => { e.preventDefault(); resetRegion(region.id); }}
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
                  <p className="text-sm text-muted-foreground mb-3">All colors matched perfectly!</p>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setSceneIdx((sceneIdx + 1) % SCENES.length)}
                    className="px-4 py-2 rounded-xl bg-[#0DA2E7] text-white font-bold text-sm">Next Scene 🎨</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 w-full max-w-xs">
          <p className="text-xs text-muted-foreground text-center mb-2 font-bold">Target Colors</p>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {regions.filter((r, i, arr) => arr.findIndex(x => x.colorName === r.colorName) === i).map(r => (
              <div key={r.id} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border-2 ${
                regions.filter(x => x.colorName === r.colorName).every(x => x.filled)
                  ? "bg-green-100 border-green-400 text-green-700"
                  : "bg-white border-gray-300 text-gray-600"}`}>
                {r.emoji} {r.colorName}
                {regions.filter(x => x.colorName === r.colorName).every(x => x.filled) && <Check size={12} className="text-green-600" />}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground font-bold">Paint Color</p>
            <p className="text-xs text-[#0DA2E7] font-bold">✌️ Peace = next color</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PALETTE.map(c => (
              <motion.button key={c} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => setSelectedColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? "border-gray-800 scale-110 ring-2 ring-[#0DA2E7]" : c === "#FFFFFF" ? "border-gray-400" : "border-gray-300"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="mt-3 p-2 bg-blue-50 rounded-xl text-xs text-center text-blue-700 font-medium">
            <span className="font-bold">Tip:</span> ☝️ Point to fill · ✌️ Peace to change color · ✋ Palm to reset region · Right-click any region to reset it
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
