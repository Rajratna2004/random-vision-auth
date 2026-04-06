import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useGestureDetection } from "@/hooks/useGestureDetection";

interface PathPoint { x: number; y: number }

type ShapeType = "circle" | "zigzag" | "star" | "line" | "unknown";
type SpellType = "shield" | "fire" | "sparkle" | "wind" | null;

const SPELLS: Record<Exclude<SpellType, null>, { emoji: string; name: string; desc: string; color: string }> = {
  shield:  { emoji: "🛡️", name: "Shield Spell!",   desc: "Draw a CIRCLE to cast",  color: "from-blue-400 to-blue-600" },
  fire:    { emoji: "🔥", name: "Fire Spell!",     desc: "Draw a ZIGZAG to cast",  color: "from-red-400 to-orange-500" },
  sparkle: { emoji: "⭐", name: "Star Spell!",     desc: "Draw a STAR to cast",    color: "from-yellow-400 to-yellow-600" },
  wind:    { emoji: "💨", name: "Wind Spell!",     desc: "Draw a LINE to cast",    color: "from-teal-400 to-green-500" },
};

function classifyShape(pts: PathPoint[]): ShapeType {
  if (pts.length < 12) return "unknown";

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX, spanY = maxY - minY;

  if (spanX < 0.05 && spanY < 0.05) return "unknown";

  // Check if it's mostly a horizontal/vertical line
  const aspect = Math.max(spanX, spanY) / (Math.min(spanX, spanY) + 0.001);
  if (aspect > 5) return "line";

  // Direction changes for zigzag detection
  let dirChanges = 0;
  let prevDirX = 0;
  for (let i = 2; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    if (Math.abs(dx) > 0.01) {
      const dir = dx > 0 ? 1 : -1;
      if (prevDirX !== 0 && dir !== prevDirX) dirChanges++;
      prevDirX = dir;
    }
  }
  if (dirChanges >= 3) return "zigzag";

  // Circle detection: start and end are close, path is roundish
  const start = pts[0], end = pts[pts.length - 1];
  const closeDist = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
  const cx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const cy = ys.reduce((s, y) => s + y, 0) / ys.length;
  const avgRadius = pts.reduce((s, p) => s + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2), 0) / pts.length;
  const radVariance = pts.reduce((s, p) => {
    const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    return s + Math.abs(r - avgRadius);
  }, 0) / pts.length;

  if (closeDist < 0.15 && radVariance < 0.06 && avgRadius > 0.05) return "circle";

  // Star: high radius variance with many direction changes
  if (dirChanges >= 2 && radVariance > 0.04) return "star";

  return "unknown";
}

const SHAPE_TO_SPELL: Record<ShapeType, SpellType> = {
  circle:  "shield",
  zigzag:  "fire",
  star:    "sparkle",
  line:    "wind",
  unknown: null,
};

const CHALLENGES = [
  { shape: "circle" as ShapeType, spell: "shield" as SpellType,  hint: "Draw a big CIRCLE ⭕" },
  { shape: "zigzag" as ShapeType, spell: "fire" as SpellType,    hint: "Draw a ZIGZAG ⚡" },
  { shape: "star"   as ShapeType, spell: "sparkle" as SpellType, hint: "Draw a STAR shape ⭐" },
  { shape: "line"   as ShapeType, spell: "wind" as SpellType,    hint: "Draw a straight LINE →" },
];

export default function MagicSpell({ onBack }: { onBack: () => void }) {
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef = useRef<HTMLVideoElement>(null);
  const pathRef = useRef<PathPoint[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isDrawingRef = useRef(false);
  const [mode, setMode] = useState<"free" | "challenge">("free");
  const [spell, setSpell] = useState<SpellType>(null);
  const [detectedShape, setDetectedShape] = useState<ShapeType | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeResult, setChallengeResult] = useState<"success" | "fail" | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  const { videoRef, currentHand, isLoading, error, cameraActive, startGestureDetection } =
    useGestureDetection({ enabled: true });

  useEffect(() => {
    if (cameraActive && videoRef.current?.srcObject && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = videoRef.current.srcObject;
      videoDisplayRef.current.play().catch(() => {});
    }
  }, [cameraActive, videoRef]);

  const clearTrail = useCallback(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawTrail = useCallback((pts: PathPoint[]) => {
    const canvas = trailCanvasRef.current;
    if (!canvas || pts.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      const r = Math.round(128 + 127 * Math.sin(t * Math.PI));
      const g = Math.round(50 + 205 * t);
      const b = Math.round(231 - 100 * t);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x * W, pts[i - 1].y * H);
      ctx.lineTo(pts[i].x * W, pts[i].y * H);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#0DA2E7";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, []);

  const triggerSpell = useCallback((s: ShapeType) => {
    const spellType = SHAPE_TO_SPELL[s];
    setDetectedShape(s);
    setSpell(spellType);

    if (spellType) {
      const spellInfo = SPELLS[spellType];
      // Spawn particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        emoji: spellInfo.emoji,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 2000);

      if (mode === "challenge") {
        const challenge = CHALLENGES[challengeIdx % CHALLENGES.length];
        if (spellType === challenge.spell) {
          setScore(sc => sc + 10);
          setChallengeResult("success");
        } else {
          setChallengeResult("fail");
        }
      }
    }

    setTimeout(() => {
      setSpell(null);
      setDetectedShape(null);
      setChallengeResult(null);
      clearTrail();
      pathRef.current = [];
    }, 2500);
  }, [mode, challengeIdx, clearTrail]);

  // Track hand - pointing gesture draws, otherwise idle
  useEffect(() => {
    if (!cameraActive || spell !== null) return;

    const { x, y, gesture } = currentHand;
    if (gesture === "pointing") {
      isDrawingRef.current = true;
      pathRef.current.push({ x, y });
      drawTrail(pathRef.current);

      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (pathRef.current.length >= 12) {
          const shape = classifyShape(pathRef.current);
          triggerSpell(shape);
        } else {
          clearTrail();
          pathRef.current = [];
        }
        isDrawingRef.current = false;
      }, 600);
    } else if (isDrawingRef.current && gesture !== "pointing") {
      // Stopped pointing
      isDrawingRef.current = false;
    }
  }, [currentHand, cameraActive, spell, drawTrail, triggerSpell, clearTrail]);

  const nextChallenge = () => {
    setChallengeIdx(i => i + 1);
    setChallengeResult(null);
    clearTrail();
    pathRef.current = [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-display font-bold">🧙 Magic Spell</h2>
        <div className="flex gap-1">
          {(["free", "challenge"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${mode === m ? "kid-gradient text-white" : "bg-secondary text-muted-foreground"}`}>
              {m === "free" ? "🎨 Free" : "⚔️ Challenge"}
            </button>
          ))}
        </div>
      </div>

      {!cameraStarted && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl">🧙</div>
          <h3 className="text-2xl font-bold">Magic Spell!</h3>
          <p className="text-muted-foreground">Draw shapes in the air to cast spells!</p>
          <div className="text-sm text-muted-foreground space-y-1 bg-secondary/50 rounded-xl p-3 inline-block text-left">
            <p>☝️ Point your finger to draw</p>
            <p>⭕ Circle → 🛡️ Shield Spell</p>
            <p>⚡ Zigzag → 🔥 Fire Spell</p>
            <p>⭐ Star shape → ⭐ Star Spell</p>
            <p>→ Straight line → 💨 Wind Spell</p>
          </div>
          <Button onClick={async () => { await startGestureDetection(); setCameraStarted(true); }}
            className="kid-gradient text-white font-bold px-8" disabled={isLoading}>
            {isLoading ? "Starting camera…" : "Start Camera 📷"}
          </Button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {cameraStarted && (
        <div className="space-y-3">
          {/* Challenge prompt */}
          {mode === "challenge" && !spell && (
            <div className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-2">
              <span className="font-bold text-sm">Round {challengeIdx + 1}:</span>
              <span className="font-bold text-primary">{CHALLENGES[challengeIdx % CHALLENGES.length].hint}</span>
              <span className="text-sm font-bold text-yellow-600">⭐ {score}</span>
            </div>
          )}

          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
            <video ref={videoDisplayRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-55" autoPlay playsInline muted />
            <canvas ref={trailCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full" />

            {/* Finger cursor */}
            {cameraActive && currentHand.gesture === "pointing" && (
              <div
                className="absolute w-5 h-5 rounded-full bg-white/80 pointer-events-none -translate-x-1/2 -translate-y-1/2 ring-2 ring-[#0DA2E7]"
                style={{ left: `${currentHand.x * 100}%`, top: `${currentHand.y * 100}%` }}
              />
            )}

            {/* Hint when not drawing */}
            {cameraActive && currentHand.gesture !== "pointing" && !spell && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full font-bold">
                ☝️ Point your finger to draw a spell
              </div>
            )}

            {/* Spell result overlay */}
            <AnimatePresence>
              {spell && SPELLS[spell] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.3 }}
                  className={`absolute inset-0 bg-gradient-to-br ${SPELLS[spell].color} bg-opacity-80 flex flex-col items-center justify-center gap-2`}
                >
                  <motion.div className="text-7xl" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ repeat: 3, duration: 0.4 }}>
                    {SPELLS[spell].emoji}
                  </motion.div>
                  <h3 className="text-3xl font-extrabold text-white drop-shadow">{SPELLS[spell].name}</h3>
                  {mode === "challenge" && challengeResult === "success" && (
                    <span className="bg-white text-green-600 font-extrabold px-4 py-1 rounded-full">+10 points! 🎉</span>
                  )}
                  {mode === "challenge" && challengeResult === "fail" && (
                    <span className="bg-white text-red-600 font-extrabold px-4 py-1 rounded-full">Wrong shape! Try again</span>
                  )}
                </motion.div>
              )}
              {detectedShape === "unknown" && !spell && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white"
                >
                  <div className="text-4xl">🤔</div>
                  <p className="font-bold">Shape not recognized — try again!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Particles */}
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 0 }}
                animate={{ opacity: 0, scale: 2, y: -60 }}
                transition={{ duration: 1.5 }}
                className="absolute text-2xl pointer-events-none"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {p.emoji}
              </motion.div>
            ))}
          </div>

          {/* Next challenge button */}
          {mode === "challenge" && (challengeResult === "success" || challengeResult === "fail") && (
            <div className="text-center">
              <Button onClick={nextChallenge} className="kid-gradient text-white font-bold px-8">
                Next Shape! ➡️
              </Button>
            </div>
          )}

          {/* Spell legend */}
          {mode === "free" && (
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {Object.entries(SPELLS).map(([key, s]) => (
                <div key={key} className={`bg-gradient-to-br ${s.color} rounded-xl p-2 text-white font-bold`}>
                  <div className="text-xl">{s.emoji}</div>
                  <div className="truncate">{s.name.replace("!", "")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
    </div>
  );
}
