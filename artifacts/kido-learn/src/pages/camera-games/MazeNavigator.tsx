import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

/* ─────────────────────────── Types ─────────────────────────── */
interface Cell {
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

type Direction = "up" | "down" | "left" | "right";
type GameStatus = "menu" | "playing" | "won" | "paused";

/* ────────────────────────── Themes ─────────────────────────── */
const THEMES = [
  { wall: "#1a237e", path: "#e8eaf6", ball: "#f44336", end: "#4caf50", fog: "rgba(232,234,246,0.95)" },
  { wall: "#004d40", path: "#e0f7fa", ball: "#ff5722", end: "#ffd600", fog: "rgba(224,247,250,0.95)" },
  { wall: "#4a148c", path: "#fce4ec", ball: "#00bcd4", end: "#ff9800", fog: "rgba(252,228,236,0.95)" },
  { wall: "#0d47a1", path: "#e3f2fd", ball: "#e91e63", end: "#4caf50", fog: "rgba(227,242,253,0.95)" },
  { wall: "#1b5e20", path: "#f1f8e9", ball: "#ff5722", end: "#03a9f4", fog: "rgba(241,248,233,0.95)" },
  { wall: "#311b92", path: "#ede7f6", ball: "#ff6f00", end: "#76ff03", fog: "rgba(237,231,246,0.95)" },
];

/* ─────────────────── Level config (fixed cell sizes) ────────── */
function getLevelConfig(lv: number) {
  if (lv === 1) return { rows: 11, cols: 11, cellSize: 34, label: "Easy",   speed: 5 };
  if (lv === 2) return { rows: 15, cols: 15, cellSize: 28, label: "Medium", speed: 4 };
  return             { rows: 19, cols: 19, cellSize: 22, label: "Hard",   speed: 3 };
}

/* ─────────────────── Maze generation (DFS) ─────────────────── */
function generateMaze(rows: number, cols: number): Cell[][] {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: { top: true, right: true, bottom: true, left: true },
    }))
  );

  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: { nr: number; nc: number; dir: Direction }[] = [];
    if (r > 0       && !visited[r-1][c]) neighbors.push({ nr: r-1, nc: c, dir: "up"    });
    if (c < cols-1  && !visited[r][c+1]) neighbors.push({ nr: r,   nc: c+1, dir: "right" });
    if (r < rows-1  && !visited[r+1][c]) neighbors.push({ nr: r+1, nc: c, dir: "down"  });
    if (c > 0       && !visited[r][c-1]) neighbors.push({ nr: r,   nc: c-1, dir: "left"  });

    if (!neighbors.length) { stack.pop(); continue; }

    const { nr, nc, dir } = neighbors[Math.floor(Math.random() * neighbors.length)];
    if (dir === "up")    { grid[r][c].walls.top    = false; grid[nr][nc].walls.bottom = false; }
    if (dir === "right") { grid[r][c].walls.right  = false; grid[nr][nc].walls.left   = false; }
    if (dir === "down")  { grid[r][c].walls.bottom = false; grid[nr][nc].walls.top    = false; }
    if (dir === "left")  { grid[r][c].walls.left   = false; grid[nr][nc].walls.right  = false; }
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return grid;
}

/* ══════════════════════════════════════════════════════════════ */
export default function MazeNavigator({ onBack }: { onBack: () => void }) {
  const [level,   setLevel]   = useState(1);
  const [status,  setStatus]  = useState<GameStatus>("menu");
  const [steps,   setSteps]   = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fogMode, setFogMode] = useState(false);
  const [showCam, setShowCam] = useState(true);
  const [gesture, setGesture] = useState("none");

  const mazeCanvasRef   = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef = useRef<HTMLVideoElement>(null);

  /* all game state in refs to avoid stale closures */
  const mazeRef    = useRef<Cell[][] | null>(null);
  const themeRef   = useRef(THEMES[0]);
  const statusRef  = useRef<GameStatus>("menu");
  const fogRef     = useRef(false);
  const animRef    = useRef<number>(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelCfgRef = useRef(getLevelConfig(1));

  const ball = useRef({ r: 0, c: 0, px: 0, py: 0, tr: 0, tc: 0, moving: false });
  const dirRef = useRef<Direction | null>(null);

  /* ── gesture hook ─────────────────────────── */
  const cbRef = useRef<((g: string) => void) | null>(null);
  const {
    videoRef, canvasRef: gCanvasRef,
    currentHand, isLoading, cameraActive,
    startGestureDetection, stopCamera,
  } = useGestureDetection({ onGesture: (g) => cbRef.current?.(g) });
  cbRef.current = (g) => setGesture(g);

  /* mirror camera stream */
  useEffect(() => {
    const vd = videoDisplayRef.current;
    const vs = videoRef.current;
    if (cameraActive && vs?.srcObject && vd) {
      vd.srcObject = vs.srcObject;
      vd.play().catch(() => {});
    } else if (!cameraActive && vd) {
      vd.srcObject = null;
    }
  }, [cameraActive]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = statusRef.current;
      if (s !== "playing" && s !== "paused") return;
      if (e.key === "ArrowUp"    || e.key === "w") { e.preventDefault(); dirRef.current = "up";    }
      if (e.key === "ArrowDown"  || e.key === "s") { e.preventDefault(); dirRef.current = "down";  }
      if (e.key === "ArrowLeft"  || e.key === "a") { e.preventDefault(); dirRef.current = "left";  }
      if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); dirRef.current = "right"; }
      if (e.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* hand → direction */
  useEffect(() => {
    if (!currentHand || statusRef.current !== "playing") return;
    const { gesture: g, landmarks } = currentHand;
    setGesture(g);
    if (g === "fist")  { togglePause();   return; }
    if (g === "peace") { doRestart();     return; }
    if (g === "pointing" && landmarks?.[8]) {
      const fx = 1 - landmarks[8].x, fy = landmarks[8].y;
      const dx = fx - 0.5, dy = fy - 0.5;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        dirRef.current = Math.abs(dx) >= Math.abs(dy)
          ? (dx > 0 ? "right" : "left")
          : (dy > 0 ? "down"  : "up");
      }
    }
  }, [currentHand]);

  /* fog sync */
  useEffect(() => { fogRef.current = fogMode; }, [fogMode]);

  /* cleanup */
  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopCamera();
  }, []);

  /* ─── draw ───────────────────────────────── */
  function draw(ctx: CanvasRenderingContext2D) {
    const maze = mazeRef.current; if (!maze) return;
    const theme = themeRef.current;
    const { rows, cols, cellSize: cs } = levelCfgRef.current;
    const { px, py } = ball.current;

    ctx.fillStyle = theme.path;
    ctx.fillRect(0, 0, cols*cs, rows*cs);

    ctx.fillStyle = "#c8e6c9";
    ctx.fillRect((cols-1)*cs+1, (rows-1)*cs+1, cs-2, cs-2);

    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = Math.max(2, cs * 0.1);
    ctx.lineCap = "square";
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const { walls } = maze[r][c];
        const x = c*cs, y = r*cs;
        if (walls.top)    { ctx.moveTo(x,    y);    ctx.lineTo(x+cs, y);    }
        if (walls.right)  { ctx.moveTo(x+cs, y);    ctx.lineTo(x+cs, y+cs); }
        if (walls.bottom) { ctx.moveTo(x,    y+cs); ctx.lineTo(x+cs, y+cs); }
        if (walls.left)   { ctx.moveTo(x,    y);    ctx.lineTo(x,    y+cs); }
      }
    }
    ctx.stroke();

    ctx.font = `${cs*0.6}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏁", (cols-0.5)*cs, (rows-0.5)*cs);

    const br = cs * 0.35;
    const g = ctx.createRadialGradient(px-br*0.3, py-br*0.3, br*0.1, px, py, br);
    g.addColorStop(0, "#fff"); g.addColorStop(1, theme.ball);
    ctx.beginPath(); ctx.arc(px, py, br, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; ctx.stroke();

    if (fogRef.current) {
      const fr = cs * 2.8;
      ctx.save();
      ctx.fillStyle = theme.fog; ctx.fillRect(0, 0, cols*cs, rows*cs);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(px, py, fr, 0, Math.PI*2);
      ctx.fillStyle = "rgba(0,0,0,1)"; ctx.fill();
      ctx.restore();
    }
  }

  /* ─── move ball ──────────────────────────── */
  function tryMove(dir: Direction | null) {
    if (!dir || ball.current.moving || !mazeRef.current) return;
    const { r, c } = ball.current;
    const { walls } = mazeRef.current[r][c];
    let nr = r, nc = c;
    if      (dir === "up"    && !walls.top)    nr--;
    else if (dir === "down"  && !walls.bottom) nr++;
    else if (dir === "left"  && !walls.left)   nc--;
    else if (dir === "right" && !walls.right)  nc++;
    else return;
    const { rows, cols } = levelCfgRef.current;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
    ball.current.tr = nr; ball.current.tc = nc; ball.current.moving = true;
    setSteps(s => s + 1);
  }

  /* ─── game loop ──────────────────────────── */
  const loop = useCallback(() => {
    const canvas = mazeCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const { cellSize: cs, rows, cols } = levelCfgRef.current;
    const speed = 5;

    if (ball.current.moving) {
      const tx = ball.current.tc * cs + cs/2;
      const ty = ball.current.tr * cs + cs/2;
      const dx = tx - ball.current.px, dy = ty - ball.current.py;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= speed) {
        ball.current.px = tx; ball.current.py = ty;
        ball.current.r = ball.current.tr; ball.current.c = ball.current.tc;
        ball.current.moving = false;
        if (ball.current.r === rows-1 && ball.current.c === cols-1) {
          statusRef.current = "won"; setStatus("won");
          draw(ctx);
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
          return;
        }
        tryMove(dirRef.current);
      } else {
        ball.current.px += (dx/dist) * speed;
        ball.current.py += (dy/dist) * speed;
      }
    } else {
      tryMove(dirRef.current);
    }
    draw(ctx);
    if (statusRef.current === "playing") animRef.current = requestAnimationFrame(loop);
  }, []);

  /* ─── start ──────────────────────────────── */
  function startLevel(lv: number, withCamera: boolean) {
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const cfg = getLevelConfig(lv);
    levelCfgRef.current = cfg;
    mazeRef.current = generateMaze(cfg.rows, cfg.cols);
    themeRef.current = THEMES[Math.floor(Math.random() * THEMES.length)];

    const cs = cfg.cellSize;
    ball.current = { r: 0, c: 0, px: cs/2, py: cs/2, tr: 0, tc: 0, moving: false };
    dirRef.current = null;
    setSteps(0); setElapsed(0);

    /* size canvas directly — no layout reads needed */
    const canvas = mazeCanvasRef.current;
    if (canvas) {
      canvas.width  = cfg.cols * cs;
      canvas.height = cfg.rows * cs;
    }

    statusRef.current = "playing";
    setStatus("playing");
    if (withCamera && !cameraActive) startGestureDetection();

    /* draw first frame + start loop after React paint */
    requestAnimationFrame(() => {
      const c = mazeCanvasRef.current; if (!c) return;
      c.width  = cfg.cols * cs;
      c.height = cfg.rows * cs;
      const ctx = c.getContext("2d"); if (!ctx) return;
      draw(ctx);
      animRef.current = requestAnimationFrame(loop);
    });

    timerRef.current = setInterval(() => {
      if (statusRef.current === "playing") setElapsed(e => e+1);
    }, 1000);
  }

  function togglePause() {
    if (statusRef.current === "playing") {
      statusRef.current = "paused"; setStatus("paused");
      cancelAnimationFrame(animRef.current);
    } else if (statusRef.current === "paused") {
      statusRef.current = "playing"; setStatus("playing");
      animRef.current = requestAnimationFrame(loop);
    }
  }

  function doRestart() { startLevel(levelCfgRef.current.rows === 11 ? 1 : levelCfgRef.current.rows === 15 ? 2 : 3, false); }

  function fmt(s: number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

  const cfg = getLevelConfig(level);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onBack(); }}>← Back</Button>
        <h2 className="text-xl font-extrabold">🌀 Maze Navigator</h2>
        <div className="flex gap-2">
          {(status === "playing" || status === "paused") && (
            <><Badge variant="outline">⏱ {fmt(elapsed)}</Badge><Badge variant="outline">👣 {steps}</Badge></>
          )}
          <Badge className="bg-[#0DA2E7] text-white">Lv {level} · {cfg.label}</Badge>
        </div>
      </div>

      {/* ── MENU ── */}
      {status === "menu" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 space-y-5">
          <div className="text-6xl">🌀</div>
          <h3 className="text-3xl font-extrabold">Maze Navigator!</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Steer the ball through a brand-new random maze every time. Use hand gestures or arrow keys.
          </p>

          <div className="flex justify-center gap-3 flex-wrap">
            {[{e:"☝️",l:"Point",d:"Steer"},{e:"✊",l:"Fist",d:"Pause"},{e:"✌️",l:"Peace",d:"Restart"}].map(t=>(
              <div key={t.l} className="bg-secondary rounded-2xl px-3 py-2 text-center w-24">
                <div className="text-2xl">{t.e}</div>
                <div className="font-bold text-xs">{t.l}</div>
                <div className="text-xs text-muted-foreground">{t.d}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            {([1,2,3] as const).map(lv => {
              const c = getLevelConfig(lv);
              return (
                <Button key={lv} size="sm"
                  variant={level===lv?"default":"outline"}
                  className={level===lv?"kid-gradient text-white":""}
                  onClick={()=>setLevel(lv)}>
                  {lv===1?"🟢":lv===2?"🟡":"🔴"} {c.label} ({c.rows}×{c.cols})
                </Button>
              );
            })}
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fogMode} onChange={e=>setFogMode(e.target.checked)} className="w-4 h-4 accent-[#0DA2E7]"/>
              🌫️ Fog of War
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showCam} onChange={e=>setShowCam(e.target.checked)} className="w-4 h-4 accent-[#0DA2E7]"/>
              📷 Camera
            </label>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={()=>startLevel(level,true)} className="kid-gradient text-white font-bold px-8 text-base">
              🚀 Start with Camera
            </Button>
            <Button variant="outline" onClick={()=>startLevel(level,false)}>
              ⌨️ Keyboard Only
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── WIN ── */}
      {status === "won" && (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-5">
          <div className="text-7xl">🏆</div>
          <h3 className="text-3xl font-extrabold text-green-600">Maze Solved!</h3>
          <div className="flex gap-5 justify-center text-lg font-semibold">
            <span>⏱ {fmt(elapsed)}</span><span>👣 {steps} steps</span>
          </div>
          <p className="text-muted-foreground">
            {steps<=cfg.rows*2?"🧠 Perfect! Genius navigator!":steps<=cfg.rows*4?"🌟 Great job!":"Nice! Try a shorter path!"}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={()=>{const n=level<3?level+1:1;setLevel(n);startLevel(n,false);}}
              className="kid-gradient text-white font-bold px-8">
              {level<3?"Next Level →":"🔁 Play Again"}
            </Button>
            <Button variant="outline" onClick={()=>startLevel(level,false)}>🔄 Replay</Button>
            <Button variant="outline" onClick={()=>{stopCamera();statusRef.current="menu";setStatus("menu");}}>
              🏠 Menu
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── PLAYING / PAUSED ── (canvas always stays mounted once game starts) */}
      <div className={status==="playing"||status==="paused" ? "space-y-3" : "hidden"}>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={togglePause}>
            {status==="paused"?"▶ Resume":"⏸ Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={doRestart}>🔄 Restart</Button>
          <Button variant="outline" size="sm" onClick={()=>setFogMode(f=>!f)}>
            {fogMode?"🔆 Clear":"🌫️ Fog"}
          </Button>
          {cameraActive && (
            <Badge className="ml-auto bg-green-100 text-green-700 text-xs">
              📷 {gesture!=="none"?gesture.replace("_"," "):"—"}
            </Badge>
          )}
        </div>

        <div className="flex gap-3 items-start flex-wrap">
          {/* Maze canvas — always mounted so ref is always valid */}
          <div className="relative">
            <canvas
              ref={mazeCanvasRef}
              className="rounded-2xl shadow-lg border-2 border-border block"
              style={{ imageRendering: "pixelated" }}
            />

            {/* Touch D-pad */}
            <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-1 select-none"
              style={{ opacity: 0.65 }}>
              {([
                [null,   "up",    null  ],
                ["left", null,    "right"],
                [null,   "down",  null  ],
              ] as (Direction|null)[][]).map((row,ri)=>
                row.map((dir,ci)=> dir ? (
                  <button key={`${ri}-${ci}`}
                    onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);dirRef.current=dir;}}
                    onPointerUp={()=>{dirRef.current=null;}}
                    className="w-9 h-9 rounded-lg bg-black/45 text-white text-base font-bold flex items-center justify-center active:bg-black/75">
                    {dir==="up"?"▲":dir==="down"?"▼":dir==="left"?"◀":"▶"}
                  </button>
                ) : <div key={`${ri}-${ci}`} className="w-9 h-9"/>)
              )}
            </div>

            {status==="paused" && (
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
            <div className="flex flex-col gap-2 w-36 shrink-0">
              <div className="relative rounded-xl overflow-hidden bg-black border-2 border-border aspect-video w-full">
                <video ref={videoDisplayRef} autoPlay playsInline muted
                  className="w-full h-full object-cover scale-x-[-1]"/>
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs text-center p-2">
                    No camera
                  </div>
                )}
                <canvas ref={gCanvasRef} className="hidden"/>
                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="text-white text-xs">Loading AI…</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="text-3xl">
                  {gesture==="pointing"?"☝️":gesture==="fist"?"✊":gesture==="peace"?"✌️":
                   gesture==="thumbs_up"?"👍":gesture==="open_palm"?"✋":"🤚"}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {gesture==="pointing"?"Steering":gesture==="fist"?"Pause":gesture==="peace"?"Restart":
                   gesture!=="none"?gesture.replace("_"," "):"Show hand"}
                </p>
              </div>

              <div className="text-xs text-muted-foreground bg-secondary rounded-xl p-2 text-center leading-5">
                <p>☝️ Point → steer</p>
                <p>✊ Fist → pause</p>
                <p>✌️ Peace → restart</p>
                <p className="pt-1 border-t border-border mt-1">⌨️ Arrows work too</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
