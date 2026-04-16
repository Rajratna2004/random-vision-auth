import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

/* ─────────────────────────── Types ─────────────────────────── */
interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

type Direction = "up" | "down" | "left" | "right";
type GameStatus = "menu" | "playing" | "won" | "paused";

/* ────────────────────────── Themes ─────────────────────────── */
const THEMES = [
  { wall: "#1a237e", path: "#e8eaf6", ball: "#f44336", end: "#4caf50", fog: "rgba(232,234,246,0.92)" },
  { wall: "#004d40", path: "#e0f7fa", ball: "#ff5722", end: "#ffd600", fog: "rgba(224,247,250,0.92)" },
  { wall: "#4a148c", path: "#fce4ec", ball: "#00bcd4", end: "#ff9800", fog: "rgba(252,228,236,0.92)" },
  { wall: "#bf360c", path: "#fff8e1", ball: "#3f51b5", end: "#4caf50", fog: "rgba(255,248,225,0.92)" },
  { wall: "#0d47a1", path: "#e3f2fd", ball: "#e91e63", end: "#4caf50", fog: "rgba(227,242,253,0.92)" },
  { wall: "#1b5e20", path: "#f1f8e9", ball: "#ff5722", end: "#03a9f4", fog: "rgba(241,248,233,0.92)" },
  { wall: "#311b92", path: "#ede7f6", ball: "#ff6f00", end: "#76ff03", fog: "rgba(237,231,246,0.92)" },
];

/* ─────────────────── Maze generation (DFS) ─────────────────── */
function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r, col: c,
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    }))
  );

  const stack: Cell[] = [];
  grid[0][0].visited = true;
  stack.push(grid[0][0]);

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const { row: r, col: c } = curr;

    const neighbors: { cell: Cell; dir: Direction }[] = [];
    if (r > 0 && !grid[r - 1][c].visited)       neighbors.push({ cell: grid[r - 1][c], dir: "up" });
    if (c < cols - 1 && !grid[r][c + 1].visited) neighbors.push({ cell: grid[r][c + 1], dir: "right" });
    if (r < rows - 1 && !grid[r + 1][c].visited) neighbors.push({ cell: grid[r + 1][c], dir: "down" });
    if (c > 0 && !grid[r][c - 1].visited)        neighbors.push({ cell: grid[r][c - 1], dir: "left" });

    if (neighbors.length > 0) {
      const { cell: next, dir } = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (dir === "up")    { curr.walls.top    = false; next.walls.bottom = false; }
      if (dir === "right") { curr.walls.right  = false; next.walls.left   = false; }
      if (dir === "down")  { curr.walls.bottom = false; next.walls.top    = false; }
      if (dir === "left")  { curr.walls.left   = false; next.walls.right  = false; }
      next.visited = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  return grid;
}

/* ─────────────── Level configuration ───────────────────────── */
function getLevelConfig(lv: number) {
  if (lv === 1) return { rows: 11, cols: 11, label: "Easy",   speed: 5 };
  if (lv === 2) return { rows: 15, cols: 15, label: "Medium", speed: 4 };
  return             { rows: 19, cols: 19, label: "Hard",   speed: 3 };
}

const GESTURE_TIPS = [
  { emoji: "☝️", label: "Point", description: "Aim finger to steer the ball" },
  { emoji: "✊", label: "Fist",  description: "Pause / Resume" },
  { emoji: "✌️", label: "Peace", description: "Restart level" },
];

/* ══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function MazeNavigator({ onBack }: { onBack: () => void }) {
  /* ── State ─────────────────────────────────── */
  const [level,       setLevel]       = useState(1);
  const [status,      setStatus]      = useState<GameStatus>("menu");
  const [steps,       setSteps]       = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [fogMode,     setFogMode]     = useState(false);
  const [showCam,     setShowCam]     = useState(true);
  const [gesture,     setGesture]     = useState<string>("none");

  /* ── Refs ──────────────────────────────────── */
  const mazeCanvasRef   = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef = useRef<HTMLVideoElement>(null);

  const mazeRef    = useRef<Cell[][] | null>(null);
  const themeRef   = useRef(THEMES[0]);
  const statusRef  = useRef<GameStatus>("menu");
  const fogRef     = useRef(false);
  const animRef    = useRef<number>(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const cellSizeRef = useRef(30);
  const speedRef    = useRef(5);

  /* ball state in ref to avoid re-renders inside loop */
  const ball = useRef({
    row: 0, col: 0,
    px: 0, py: 0,
    targetRow: 0, targetCol: 0,
    moving: false,
  });
  const dirRef  = useRef<Direction | null>(null);
  const stepsCountRef = useRef(0);

  /* ── Gesture detection ─────────────────────── */
  const gestureCallbackRef = useRef<((g: string) => void) | null>(null);
  const {
    videoRef, canvasRef: gestureCanvasRef,
    currentHand, isLoading, isReady, error,
    cameraActive, startGestureDetection, stopCamera,
  } = useGestureDetection({ onGesture: (g) => gestureCallbackRef.current?.(g) });

  /* ── Mirror camera to visible video ────────── */
  useEffect(() => {
    if (cameraActive && videoRef.current?.srcObject && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = videoRef.current.srcObject;
      videoDisplayRef.current.play().catch(() => {});
    } else if (!cameraActive && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = null;
    }
  }, [cameraActive]);

  /* ── Keyboard controls ─────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (statusRef.current !== "playing") {
        if (e.key === "Escape") { statusRef.current = "menu"; setStatus("menu"); }
        return;
      }
      if (e.key === "ArrowUp"    || e.key === "w") { e.preventDefault(); dirRef.current = "up";    }
      if (e.key === "ArrowDown"  || e.key === "s") { e.preventDefault(); dirRef.current = "down";  }
      if (e.key === "ArrowLeft"  || e.key === "a") { e.preventDefault(); dirRef.current = "left";  }
      if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); dirRef.current = "right"; }
      if (e.key === "Escape") { togglePause(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Map hand position → direction ─────────── */
  useEffect(() => {
    if (!currentHand || statusRef.current !== "playing") return;

    const { gesture: g, landmarks } = currentHand;
    setGesture(g);

    if (g === "fist") {
      togglePause();
      return;
    }
    if (g === "peace") {
      handleRestart();
      return;
    }

    if (g === "pointing" && landmarks && landmarks[8]) {
      // Index fingertip position (normalized 0–1, mirrored: x=0 is right)
      const fx = 1 - landmarks[8].x; // un-mirror
      const fy = landmarks[8].y;
      const cx = 0.5, cy = 0.5;
      const dx = fx - cx;
      const dy = fy - cy;

      if (Math.abs(dx) > 0.12 || Math.abs(dy) > 0.12) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dirRef.current = dx > 0 ? "right" : "left";
        } else {
          dirRef.current = dy > 0 ? "down" : "up";
        }
      }
    }
  }, [currentHand]);

  /* ── Gesture event callback ─────────────────── */
  gestureCallbackRef.current = (g) => {
    setGesture(g);
  };

  /* ── Draw maze ──────────────────────────────── */
  function drawMaze(ctx: CanvasRenderingContext2D) {
    const maze = mazeRef.current;
    if (!maze) return;
    const theme = themeRef.current;
    const cs = cellSizeRef.current;
    const rows = maze.length;
    const cols = maze[0].length;
    const bx = ball.current.px;
    const by = ball.current.py;

    /* background */
    ctx.fillStyle = theme.path;
    ctx.fillRect(0, 0, cols * cs, rows * cs);

    /* end cell highlight */
    ctx.fillStyle = "#c8e6c9";
    ctx.fillRect((cols - 1) * cs + 1, (rows - 1) * cs + 1, cs - 2, cs - 2);

    /* walls */
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = Math.max(2, cs * 0.08);
    ctx.lineCap = "square";

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = maze[r][c];
        const x = c * cs, y = r * cs;
        ctx.beginPath();
        if (cell.walls.top)    { ctx.moveTo(x,      y);      ctx.lineTo(x + cs, y);      }
        if (cell.walls.right)  { ctx.moveTo(x + cs, y);      ctx.lineTo(x + cs, y + cs); }
        if (cell.walls.bottom) { ctx.moveTo(x,      y + cs); ctx.lineTo(x + cs, y + cs); }
        if (cell.walls.left)   { ctx.moveTo(x,      y);      ctx.lineTo(x,      y + cs); }
        ctx.stroke();
      }
    }

    /* end flag emoji */
    ctx.font = `${cs * 0.6}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏁", (cols - 0.5) * cs, (rows - 0.5) * cs);

    /* ball */
    const br = cs * 0.34;
    const grad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.08, bx, by, br);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(1, theme.ball);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    /* ── Fog of war ─────────────────────────── */
    if (fogRef.current) {
      ctx.save();
      const fogRadius = cs * 2.5;
      const fog = ctx.createRadialGradient(bx, by, fogRadius * 0.6, bx, by, fogRadius);
      fog.addColorStop(0, "transparent");
      fog.addColorStop(1, theme.fog);

      // Fill full canvas with fog color, then cut out visible circle
      ctx.fillStyle = theme.fog;
      ctx.fillRect(0, 0, cols * cs, rows * cs);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(bx, by, fogRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Attempt ball move ─────────────────────── */
  function tryMove(dir: Direction | null) {
    if (!dir || ball.current.moving) return;
    const maze = mazeRef.current;
    if (!maze) return;

    const { row: r, col: c } = ball.current;
    const cell = maze[r][c];

    let nr = r, nc = c;
    if (dir === "up"    && !cell.walls.top)    nr--;
    else if (dir === "down"  && !cell.walls.bottom) nr++;
    else if (dir === "left"  && !cell.walls.left)   nc--;
    else if (dir === "right" && !cell.walls.right)  nc++;
    else return;

    const rows = maze.length, cols = maze[0].length;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;

    ball.current.targetRow = nr;
    ball.current.targetCol = nc;
    ball.current.moving = true;
    stepsCountRef.current++;
    setSteps(s => s + 1);
  }

  /* ── Game loop ─────────────────────────────── */
  const gameLoop = useCallback(() => {
    const canvas = mazeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cs = cellSizeRef.current;
    const speed = speedRef.current;

    if (ball.current.moving) {
      const tx = ball.current.targetCol * cs + cs / 2;
      const ty = ball.current.targetRow * cs + cs / 2;
      const dx = tx - ball.current.px;
      const dy = ty - ball.current.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= speed) {
        ball.current.px = tx;
        ball.current.py = ty;
        ball.current.row = ball.current.targetRow;
        ball.current.col = ball.current.targetCol;
        ball.current.moving = false;

        const maze = mazeRef.current;
        if (maze && ball.current.row === maze.length - 1 && ball.current.col === maze[0].length - 1) {
          statusRef.current = "won";
          setStatus("won");
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
          drawMaze(ctx);
          return;
        }
        tryMove(dirRef.current);
      } else {
        ball.current.px += (dx / dist) * speed;
        ball.current.py += (dy / dist) * speed;
      }
    } else {
      tryMove(dirRef.current);
    }

    drawMaze(ctx);

    if (statusRef.current === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);

  /* ── Start a level ─────────────────────────── */
  function startLevel(lv: number) {
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const cfg = getLevelConfig(lv);
    const maze = generateMaze(cfg.rows, cfg.cols);
    mazeRef.current = maze;
    themeRef.current = THEMES[Math.floor(Math.random() * THEMES.length)];
    speedRef.current = cfg.speed;

    const canvas = mazeCanvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const maxW = parent ? Math.min(parent.clientWidth - 8, 520) : 460;
    const maxH = 460;
    const cs = Math.floor(Math.min(maxW / cfg.cols, maxH / cfg.rows));
    cellSizeRef.current = cs;

    canvas.width  = cfg.cols * cs;
    canvas.height = cfg.rows * cs;

    ball.current = { row: 0, col: 0, px: cs / 2, py: cs / 2, targetRow: 0, targetCol: 0, moving: false };
    dirRef.current = null;
    stepsCountRef.current = 0;
    setSteps(0);
    setElapsed(0);

    statusRef.current = "playing";
    setStatus("playing");

    animRef.current = requestAnimationFrame(gameLoop);

    timerRef.current = setInterval(() => {
      if (statusRef.current === "playing") setElapsed(e => e + 1);
    }, 1000);
  }

  function togglePause() {
    if (statusRef.current === "playing") {
      statusRef.current = "paused";
      setStatus("paused");
      cancelAnimationFrame(animRef.current);
    } else if (statusRef.current === "paused") {
      statusRef.current = "playing";
      setStatus("playing");
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }

  function handleRestart() {
    startLevel(level);
  }

  function handleNextLevel() {
    const next = level < 3 ? level + 1 : 1;
    setLevel(next);
    startLevel(next);
  }

  /* ── Cleanup on unmount ─────────────────────── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      stopCamera();
    };
  }, []);

  /* ── Fog mode sync ─────────────────────────── */
  useEffect(() => { fogRef.current = fogMode; }, [fogMode]);

  /* ── Format time ────────────────────────────── */
  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const cfg = getLevelConfig(level);

  /* ══════════════════ RENDER ════════════════════ */
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onBack(); }}>← Back</Button>
        <h2 className="text-xl font-extrabold flex items-center gap-2">🌀 Maze Navigator</h2>
        <div className="flex gap-2">
          {status === "playing" && (
            <>
              <Badge variant="outline">⏱ {fmt(elapsed)}</Badge>
              <Badge variant="outline">👣 {steps}</Badge>
            </>
          )}
          <Badge className="bg-[#0DA2E7] text-white">Lvl {level} · {cfg.label}</Badge>
        </div>
      </div>

      {/* ── MENU ── */}
      <AnimatePresence mode="wait">
        {status === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="text-center py-8 space-y-6"
          >
            <div className="text-7xl">🌀</div>
            <h3 className="text-3xl font-extrabold">Maze Navigator!</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Navigate the ball through a freshly-generated maze using hand gestures or arrow keys.
              Every level is a brand-new maze!
            </p>

            {/* Gesture tips */}
            <div className="flex justify-center gap-4 flex-wrap">
              {GESTURE_TIPS.map(t => (
                <div key={t.label} className="bg-secondary rounded-2xl px-4 py-3 text-center w-28">
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="font-bold text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              ))}
            </div>

            {/* Level selection */}
            <div className="space-y-2">
              <p className="font-semibold text-sm">Choose level:</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {([1, 2, 3] as const).map(lv => {
                  const c = getLevelConfig(lv);
                  return (
                    <Button
                      key={lv}
                      variant={level === lv ? "default" : "outline"}
                      className={level === lv ? "kid-gradient text-white" : ""}
                      onClick={() => setLevel(lv)}
                    >
                      {lv === 1 ? "🟢" : lv === 2 ? "🟡" : "🔴"} {c.label} ({c.rows}×{c.cols})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Options */}
            <div className="flex justify-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={fogMode} onChange={e => setFogMode(e.target.checked)} className="w-4 h-4" />
                🌫️ Fog of War
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showCam} onChange={e => setShowCam(e.target.checked)} className="w-4 h-4" />
                📷 Camera Overlay
              </label>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => { startGestureDetection(); startLevel(level); }}
                className="kid-gradient text-white font-bold px-10 text-lg"
              >
                🚀 Start with Camera
              </Button>
              <Button variant="outline" onClick={() => startLevel(level)}>
                ⌨️ Keyboard Only
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── WON ── */}
        {status === "won" && (
          <motion.div
            key="won"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-5"
          >
            <div className="text-7xl">🏆</div>
            <h3 className="text-3xl font-extrabold text-green-600">Maze Solved!</h3>
            <div className="flex gap-6 justify-center text-lg font-semibold">
              <span>⏱ {fmt(elapsed)}</span>
              <span>👣 {steps} steps</span>
              <span>⭐ Level {level}</span>
            </div>
            <p className="text-muted-foreground">
              {steps <= cfg.rows * 2 ? "🧠 Perfect path! You're amazing!" : steps <= cfg.rows * 4 ? "🌟 Great navigation!" : "Good job! Try a shorter path!"}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={handleNextLevel} className="kid-gradient text-white font-bold px-8">
                {level < 3 ? "Next Level →" : "🔁 Play Again (Lv 1)"}
              </Button>
              <Button variant="outline" onClick={handleRestart}>🔄 Same Maze</Button>
              <Button variant="outline" onClick={() => { stopCamera(); setStatus("menu"); statusRef.current = "menu"; }}>
                🏠 Menu
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLAYING / PAUSED ── */}
      {(status === "playing" || status === "paused") && (
        <div className="space-y-3">
          {/* Controls row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={togglePause}>
              {status === "paused" ? "▶ Resume" : "⏸ Pause"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRestart}>🔄 Restart</Button>
            <Button variant="outline" size="sm" onClick={() => setFogMode(f => !f)}>
              {fogMode ? "🔆 Clear" : "🌫️ Fog"}
            </Button>
            {cameraActive && (
              <Badge className="ml-auto bg-green-100 text-green-700 text-xs">
                📷 {gesture !== "none" ? gesture.replace("_", " ") : "no gesture"}
              </Badge>
            )}
          </div>

          {/* Main layout: maze + camera */}
          <div className="flex gap-3 items-start flex-wrap">
            {/* Maze canvas wrapper */}
            <div className="relative flex-1 min-w-0">
              <canvas
                ref={mazeCanvasRef}
                className="rounded-2xl shadow-lg border-2 border-border block max-w-full"
                style={{ imageRendering: "pixelated" }}
              />
              {/* D-pad overlay for touch */}
              <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-1 opacity-60 hover:opacity-90 transition-opacity select-none">
                {([
                  [null,   "up",    null   ],
                  ["left", null,    "right"],
                  [null,   "down",  null   ],
                ] as (Direction | null)[][]).map((row, ri) =>
                  row.map((dir, ci) =>
                    dir ? (
                      <button
                        key={`${ri}-${ci}`}
                        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dirRef.current = dir; }}
                        onPointerUp={() => { dirRef.current = null; }}
                        className="w-9 h-9 rounded-lg bg-black/40 text-white text-lg font-bold flex items-center justify-center hover:bg-black/60 active:bg-black/80"
                      >
                        {dir === "up" ? "▲" : dir === "down" ? "▼" : dir === "left" ? "◀" : "▶"}
                      </button>
                    ) : (
                      <div key={`${ri}-${ci}`} className="w-9 h-9" />
                    )
                  )
                )}
              </div>

              {/* Pause overlay */}
              {status === "paused" && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <div className="text-white text-center space-y-3">
                    <div className="text-5xl">⏸</div>
                    <p className="text-xl font-bold">Paused</p>
                    <Button onClick={togglePause} className="kid-gradient text-white">▶ Resume</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera panel */}
            {showCam && (
              <div className="flex flex-col gap-2 w-40 shrink-0">
                <div className="relative rounded-xl overflow-hidden bg-black border-2 border-border aspect-video w-full">
                  <video
                    ref={videoDisplayRef}
                    autoPlay playsInline muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs text-center p-2">
                      No camera
                    </div>
                  )}
                  <canvas ref={gestureCanvasRef} className="hidden" />
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-white text-xs text-center p-1">Loading AI…</div>
                    </div>
                  )}
                </div>
                {/* Gesture indicator */}
                <div className="text-center space-y-1">
                  <div className="text-2xl">
                    {gesture === "pointing"   ? "☝️"
                   : gesture === "fist"       ? "✊"
                   : gesture === "peace"      ? "✌️"
                   : gesture === "thumbs_up"  ? "👍"
                   : gesture === "open_palm"  ? "✋"
                   : "🤚"}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {gesture === "pointing"  ? "Steering"
                   : gesture === "fist"      ? "Pause"
                   : gesture === "peace"     ? "Restart"
                   : gesture !== "none"      ? gesture.replace("_", " ")
                   : "Show hand"}
                  </p>
                </div>
                {/* Quick tip */}
                <div className="text-xs text-muted-foreground bg-secondary rounded-xl p-2 text-center space-y-1">
                  <p>☝️ Point to steer</p>
                  <p>✊ Pause/Resume</p>
                  <p>✌️ Restart</p>
                  <p className="pt-1 border-t border-border">⌨️ Arrow keys also work</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
