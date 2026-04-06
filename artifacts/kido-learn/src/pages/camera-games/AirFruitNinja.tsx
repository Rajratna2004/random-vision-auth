import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useGestureDetection } from "@/hooks/useGestureDetection";

const FRUITS = [
  { emoji: "🍉", pts: 1 }, { emoji: "🍎", pts: 1 }, { emoji: "🍊", pts: 1 },
  { emoji: "🍋", pts: 2 }, { emoji: "🍇", pts: 2 }, { emoji: "🍓", pts: 2 },
  { emoji: "🥝", pts: 3 }, { emoji: "🍑", pts: 1 }, { emoji: "🍍", pts: 3 },
];

interface FruitObj {
  id: number;
  emoji: string;
  pts: number;
  x: number;   // 0-1 normalized
  y: number;
  vy: number;
  vx: number;
  isBomb: boolean;
  sliced: boolean;
}

interface Trail { x: number; y: number; t: number }
interface Burst { id: number; x: number; y: number; emoji: string; t: number; pts: number }

let fruitId = 0;

export default function AirFruitNinja({ onBack }: { onBack: () => void }) {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef = useRef<HTMLVideoElement>(null);
  const fruitsRef = useRef<FruitObj[]>([]);
  const trailRef = useRef<Trail[]>([]);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const animRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const activeRef = useRef(false);
  const burstsRef = useRef<Burst[]>([]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [showBursts, setShowBursts] = useState<Burst[]>([]);

  const { videoRef, canvasRef: gestureCanvasRef, currentHand, isLoading, error, cameraActive, startGestureDetection } =
    useGestureDetection({ enabled: true });

  // Mirror video stream to display element
  useEffect(() => {
    if (cameraActive && videoRef.current?.srcObject && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = videoRef.current.srcObject;
      videoDisplayRef.current.play().catch(() => {});
    } else if (!cameraActive && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = null;
    }
  }, [cameraActive, videoRef]);

  const spawnFruit = (W: number) => {
    const isBomb = Math.random() < 0.1;
    const type = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    fruitsRef.current.push({
      id: fruitId++,
      emoji: isBomb ? "💣" : type.emoji,
      pts: type.pts,
      x: 0.1 + Math.random() * 0.8,
      y: 1.1,
      vy: -(0.016 + Math.random() * 0.01),
      vx: (Math.random() - 0.5) * 0.005,
      isBomb,
      sliced: false,
    });
  };

  const checkSlice = useCallback((x1: number, y1: number, x2: number, y2: number, W: number, H: number) => {
    const dx = x2 - x1; const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 12) return;
    const now = Date.now();
    fruitsRef.current.forEach(f => {
      if (f.sliced) return;
      const fx = f.x * W; const fy = f.y * H;
      const t = Math.max(0, Math.min(1, ((fx - x1) * dx + (fy - y1) * dy) / (dx * dx + dy * dy)));
      const cx = x1 + t * dx; const cy = y1 + t * dy;
      if (Math.sqrt((cx - fx) ** 2 + (cy - fy) ** 2) < 34) {
        f.sliced = true;
        if (f.isBomb) {
          activeRef.current = false;
          setGameState("over");
        } else {
          const cb = Math.min(comboRef.current + 1, 9);
          comboRef.current = cb;
          setCombo(cb);
          clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => { comboRef.current = 0; setCombo(0); }, 1500);
          const gained = f.pts + (cb > 1 ? cb - 1 : 0);
          scoreRef.current += gained;
          setScore(scoreRef.current);
          const burst: Burst = { id: now + Math.random(), x: fx, y: fy, emoji: f.emoji, t: now, pts: gained };
          burstsRef.current.push(burst);
          setShowBursts(prev => [...prev.slice(-6), burst]);
          setTimeout(() => setShowBursts(prev => prev.filter(b => b.id !== burst.id)), 700);
        }
      }
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let last = 0;

    const loop = (now: number) => {
      if (!activeRef.current) return;
      const W = canvas.width; const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Spawn
      if (now - lastSpawnRef.current > 1100) {
        spawnFruit(W);
        if (Math.random() < 0.45) spawnFruit(W);
        lastSpawnRef.current = now;
      }

      // Update & draw fruits
      ctx.font = "38px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fruitsRef.current = fruitsRef.current.filter(f => {
        if (f.sliced) return false;
        f.y += f.vy;
        f.x += f.vx;
        f.vy += 0.0007;
        if (f.y > 1.15) {
          if (!f.isBomb) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0) { activeRef.current = false; setGameState("over"); }
          }
          return false;
        }
        ctx.fillText(f.emoji, f.x * W, f.y * H);
        return true;
      });

      // Blade trail
      const now2 = performance.now();
      trailRef.current = trailRef.current.filter(p => now2 - p.t < 280);
      if (trailRef.current.length > 1) {
        for (let i = 1; i < trailRef.current.length; i++) {
          const p0 = trailRef.current[i - 1]; const p1 = trailRef.current[i];
          const age = (now2 - p1.t) / 280;
          const alpha = 1 - age;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
          ctx.lineWidth = 5 * (1 - age * 0.5);
          ctx.lineCap = "round";
          ctx.shadowColor = "#0DA2E7";
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState]);

  // Hand tracking
  useEffect(() => {
    if (!cameraActive || gameState !== "playing") return;
    const canvas = gameCanvasRef.current;
    if (!canvas) return;
    const W = canvas.width; const H = canvas.height;
    const hx = currentHand.x * W;
    const hy = currentHand.y * H;
    trailRef.current.push({ x: hx, y: hy, t: performance.now() });
    if (prevPosRef.current) {
      checkSlice(prevPosRef.current.x * W, prevPosRef.current.y * H, hx, hy, W, H);
    }
    prevPosRef.current = { x: currentHand.x, y: currentHand.y };
  }, [currentHand, cameraActive, gameState, checkSlice]);

  const startGame = () => {
    fruitsRef.current = [];
    trailRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    lastSpawnRef.current = 0;
    burstsRef.current = [];
    setScore(0); setLives(3); setCombo(0); setShowBursts([]);
    activeRef.current = true;
    setGameState("playing");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-display font-bold">🍉 Air Fruit Ninja</h2>
        {gameState === "playing" && (
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="text-primary">⭐ {score}</span>
            <span className="text-red-500">{"❤️".repeat(Math.max(0, lives))}</span>
          </div>
        )}
        {gameState !== "playing" && <div />}
      </div>

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl">🍉</div>
          <h3 className="text-2xl font-bold">Air Fruit Ninja!</h3>
          <p className="text-muted-foreground">Slice fruits with your hand! Avoid 💣 bombs!</p>
          <div className="text-sm text-muted-foreground space-y-1 bg-secondary/50 rounded-xl p-3 inline-block text-left">
            <p>🖐️ Move your hand fast to slice fruits</p>
            <p>💣 Slicing a bomb = instant game over</p>
            <p>💔 Missing 3 fruits = game over</p>
            <p>🔥 Slice multiple in a row for combo bonus!</p>
          </div>
          {!cameraActive ? (
            <div className="pt-2">
              <Button onClick={startGestureDetection} className="kid-gradient text-white font-bold px-8" disabled={isLoading}>
                {isLoading ? "Starting camera…" : "Start Camera 📷"}
              </Button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          ) : (
            <Button onClick={startGame} className="kid-gradient text-white font-bold px-8 text-lg">
              Play! 🚀
            </Button>
          )}
        </div>
      )}

      {/* Game / Over screen */}
      {(gameState === "playing" || gameState === "over") && (
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
          <video ref={videoDisplayRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-55" autoPlay playsInline muted />
          <canvas ref={gameCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full" />
          {/* Hand landmark skeleton overlay */}
          <canvas ref={gestureCanvasRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />

          {/* Combo badge */}
          {combo > 1 && gameState === "playing" && (
            <motion.div
              key={combo}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-extrabold px-4 py-1 rounded-full text-sm"
            >
              🔥 x{combo} Combo!
            </motion.div>
          )}

          {/* Burst effects */}
          <AnimatePresence>
            {showBursts.map(b => (
              <motion.div
                key={b.id}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -40, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute pointer-events-none text-white font-extrabold text-sm"
                style={{ left: `${(b.x / 640) * 100}%`, top: `${(b.y / 480) * 100}%` }}
              >
                +{b.pts} {b.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Game Over overlay */}
          {gameState === "over" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 text-white"
            >
              <div className="text-6xl">💥</div>
              <h3 className="text-3xl font-extrabold">Game Over!</h3>
              <div className="text-5xl font-extrabold text-yellow-400">{score} pts</div>
              <p>{score >= 25 ? "Ninja Master! 🏆" : score >= 12 ? "Nice slicing! 🌟" : "Keep practicing! 💪"}</p>
              <div className="flex gap-3 pt-2">
                <Button onClick={startGame} className="kid-gradient text-white font-bold">Play Again!</Button>
                <Button variant="outline" onClick={onBack} className="text-white border-white hover:bg-white/20">Back</Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Hidden video for gesture detection */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
    </div>
  );
}
