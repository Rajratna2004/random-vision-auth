import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

/* ─────────────── Types ─────────────────────────────────────── */
interface Cell {
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}
type Dir = "up" | "down" | "left" | "right";
type Status = "menu" | "playing" | "paused" | "won";

/* ─────────────── Themes ─────────────────────────────────────── */
const THEMES = [
  { wall: "#1a237e", path: "#e8eaf6", ball: "#f44336", end: "#4caf50", fog: "rgba(232,234,246,0.95)" },
  { wall: "#004d40", path: "#e0f7fa", ball: "#ff5722", end: "#ffd600", fog: "rgba(224,247,250,0.95)" },
  { wall: "#4a148c", path: "#fce4ec", ball: "#00bcd4", end: "#ff9800", fog: "rgba(252,228,236,0.95)" },
  { wall: "#0d47a1", path: "#e3f2fd", ball: "#e91e63", end: "#4caf50", fog: "rgba(227,242,253,0.95)" },
  { wall: "#1b5e20", path: "#f1f8e9", ball: "#ff5722", end: "#03a9f4", fog: "rgba(241,248,233,0.95)" },
  { wall: "#311b92", path: "#ede7f6", ball: "#ff6f00", end: "#76ff03", fog: "rgba(237,231,246,0.95)" },
];

/* ─────────────── Level config ───────────────────────────────── */
type LvlCfg = { rows: number; cols: number; cs: number; label: string; speed: number };
function lvlCfg(lv: number): LvlCfg {
  if (lv === 1) return { rows: 11, cols: 11, cs: 34, label: "Easy",   speed: 5 };
  if (lv === 2) return { rows: 15, cols: 15, cs: 28, label: "Medium", speed: 4 };
  return             { rows: 19, cols: 19, cs: 22, label: "Hard",   speed: 3 };
}

/* ─────────────── Maze generation (DFS) ─────────────────────── */
function makeMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ walls: { top: true, right: true, bottom: true, left: true } }))
  );
  const vis = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [[0, 0]];
  vis[0][0] = true;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nbrs: { nr: number; nc: number; d: Dir }[] = [];
    if (r > 0      && !vis[r-1][c]) nbrs.push({ nr:r-1, nc:c,   d:"up"    });
    if (c < cols-1 && !vis[r][c+1]) nbrs.push({ nr:r,   nc:c+1, d:"right" });
    if (r < rows-1 && !vis[r+1][c]) nbrs.push({ nr:r+1, nc:c,   d:"down"  });
    if (c > 0      && !vis[r][c-1]) nbrs.push({ nr:r,   nc:c-1, d:"left"  });

    if (!nbrs.length) { stack.pop(); continue; }

    const { nr, nc, d } = nbrs[Math.floor(Math.random() * nbrs.length)];
    if (d==="up")    { grid[r][c].walls.top    = false; grid[nr][nc].walls.bottom = false; }
    if (d==="right") { grid[r][c].walls.right  = false; grid[nr][nc].walls.left   = false; }
    if (d==="down")  { grid[r][c].walls.bottom = false; grid[nr][nc].walls.top    = false; }
    if (d==="left")  { grid[r][c].walls.left   = false; grid[nr][nc].walls.right  = false; }
    vis[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return grid;
}

/* ══════════════════════════════════════════════════════════════ */
export default function MazeNavigator({ onBack }: { onBack: () => void }) {
  /* ── React state ───────────────────────────── */
  const [status,  setStatus]  = useState<Status>("menu");
  const [level,   setLevel]   = useState(1);
  const [steps,   setSteps]   = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fog,     setFog]     = useState(false);
  const [showCam, setShowCam] = useState(true);
  const [gesture, setGesture] = useState("none");
  const [gameKey, setGameKey] = useState(0); // bump → restart canvas setup

  /* ── Game data refs (stable, no re-render) ─── */
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const videoDRef   = useRef<HTMLVideoElement>(null);
  const mazeRef     = useRef<Cell[][] | null>(null);
  const themeRef    = useRef(THEMES[0]);
  const cfgRef      = useRef<LvlCfg>(lvlCfg(1));
  const statusRef   = useRef<Status>("menu");
  const fogRef      = useRef(false);
  const animRef     = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirRef      = useRef<Dir | null>(null);
  const ballRef     = useRef({ r:0, c:0, px:0, py:0, tr:0, tc:0, moving:false });

  /* ── Gesture detection ─────────────────────── */
  const gcbRef = useRef<((g:string)=>void)|null>(null);
  const {
    videoRef, canvasRef: gCvRef,
    currentHand, isLoading, cameraActive,
    startGestureDetection, stopCamera,
  } = useGestureDetection({ onGesture: (g) => gcbRef.current?.(g) });
  gcbRef.current = (g) => setGesture(g);

  /* ── Camera stream mirror ──────────────────── */
  /* Depends on both cameraActive AND status so it re-runs when the
     video element mounts (status → "playing") even if cameraActive
     was already true from a previous startGestureDetection() call */
  useEffect(() => {
    const vd = videoDRef.current;
    if (!cameraActive || !vd) return;
    const tryAttach = () => {
      const vs = videoRef.current;
      if (vs?.srcObject) { vd.srcObject = vs.srcObject; vd.play().catch(() => {}); }
    };
    tryAttach();
    const t1 = setTimeout(tryAttach, 300);
    const t2 = setTimeout(tryAttach, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [cameraActive, status]);

  /* ── Keyboard ──────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (statusRef.current === "paused" && e.key === "Escape") { doPause(); return; }
      if (statusRef.current !== "playing") return;
      if (e.key==="ArrowUp"   ||e.key==="w") { e.preventDefault(); dirRef.current="up";    }
      if (e.key==="ArrowDown" ||e.key==="s") { e.preventDefault(); dirRef.current="down";  }
      if (e.key==="ArrowLeft" ||e.key==="a") { e.preventDefault(); dirRef.current="left";  }
      if (e.key==="ArrowRight"||e.key==="d") { e.preventDefault(); dirRef.current="right"; }
      if (e.key==="Escape") doPause();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── Hand tracking → direction ─────────────── */
  useEffect(() => {
    if (!currentHand) return;
    const { gesture:g, landmarks } = currentHand;
    setGesture(g);
    if (statusRef.current !== "playing") return;
    if (g==="fist")  { doPause();   return; }
    if (g==="peace") { doRestart(); return; }
    if (g==="pointing" && landmarks?.[8]) {
      const dx = (1-landmarks[8].x) - 0.5, dy = landmarks[8].y - 0.5;
      if (Math.abs(dx)>0.1 || Math.abs(dy)>0.1)
        dirRef.current = Math.abs(dx)>=Math.abs(dy) ? (dx>0?"right":"left") : (dy>0?"down":"up");
    }
  }, [currentHand]);

  /* ── Fog sync ──────────────────────────────── */
  useEffect(() => { fogRef.current = fog; }, [fog]);

  /* ── Cleanup on unmount ────────────────────── */
  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    stopCamera();
  }, []);

  /* ─────────────── DRAW ──────────────────────── */
  function drawFrame(ctx: CanvasRenderingContext2D) {
    const maze = mazeRef.current; if (!maze) return;
    const { wall, path, ball: ballColor, end: endColor, fog: fogColor } = themeRef.current;
    const { rows, cols, cs } = cfgRef.current;
    const { px, py } = ballRef.current;

    ctx.fillStyle = path;
    ctx.fillRect(0, 0, cols*cs, rows*cs);

    ctx.fillStyle = "#c8e6c9";
    ctx.fillRect((cols-1)*cs+1, (rows-1)*cs+1, cs-2, cs-2);

    ctx.strokeStyle = wall;
    ctx.lineWidth = Math.max(2, cs*0.1);
    ctx.lineCap = "square";
    ctx.beginPath();
    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        const w = maze[r][c].walls;
        const x=c*cs, y=r*cs;
        if (w.top)    { ctx.moveTo(x,    y);    ctx.lineTo(x+cs, y);    }
        if (w.right)  { ctx.moveTo(x+cs, y);    ctx.lineTo(x+cs, y+cs); }
        if (w.bottom) { ctx.moveTo(x,    y+cs); ctx.lineTo(x+cs, y+cs); }
        if (w.left)   { ctx.moveTo(x,    y);    ctx.lineTo(x,    y+cs); }
      }
    }
    ctx.stroke();

    ctx.font = `${cs*0.6}px sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🏁", (cols-0.5)*cs, (rows-0.5)*cs);

    const br = cs*0.35;
    const grad = ctx.createRadialGradient(px-br*0.3, py-br*0.3, br*0.1, px, py, br);
    grad.addColorStop(0, "#fff"); grad.addColorStop(1, ballColor);
    ctx.beginPath(); ctx.arc(px, py, br, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=1; ctx.stroke();

    if (fogRef.current) {
      ctx.save();
      ctx.fillStyle = fogColor; ctx.fillRect(0, 0, cols*cs, rows*cs);
      ctx.globalCompositeOperation="destination-out";
      ctx.beginPath(); ctx.arc(px, py, cs*2.8, 0, Math.PI*2);
      ctx.fillStyle="rgba(0,0,0,1)"; ctx.fill();
      ctx.restore();
    }
  }

  /* ─────────────── MOVE ──────────────────────── */
  function tryMove(dir: Dir|null) {
    if (!dir || ballRef.current.moving || !mazeRef.current) return;
    const { r, c } = ballRef.current;
    const w = mazeRef.current[r][c].walls;
    let nr=r, nc=c;
    if      (dir==="up"   && !w.top)    nr--;
    else if (dir==="down" && !w.bottom) nr++;
    else if (dir==="left" && !w.left)   nc--;
    else if (dir==="right"&& !w.right)  nc++;
    else return;
    const { rows, cols } = cfgRef.current;
    if (nr<0||nr>=rows||nc<0||nc>=cols) return;
    ballRef.current.tr=nr; ballRef.current.tc=nc; ballRef.current.moving=true;
    setSteps(s=>s+1);
  }

  /* ─────────────── GAME LOOP ─────────────────── */
  const loop = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const { cs, rows, cols } = cfgRef.current;
    const speed = cfgRef.current.speed;

    if (ballRef.current.moving) {
      const tx = ballRef.current.tc*cs+cs/2;
      const ty = ballRef.current.tr*cs+cs/2;
      const dx = tx-ballRef.current.px, dy = ty-ballRef.current.py;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist<=speed) {
        ballRef.current.px=tx; ballRef.current.py=ty;
        ballRef.current.r=ballRef.current.tr; ballRef.current.c=ballRef.current.tc;
        ballRef.current.moving=false;
        if (ballRef.current.r===rows-1 && ballRef.current.c===cols-1) {
          statusRef.current="won"; setStatus("won");
          drawFrame(ctx);
          confetti({ particleCount:200, spread:120, origin:{y:0.5} });
          return;
        }
        tryMove(dirRef.current);
      } else {
        ballRef.current.px+=dx/dist*speed;
        ballRef.current.py+=dy/dist*speed;
      }
    } else {
      tryMove(dirRef.current);
    }
    drawFrame(ctx);
    if (statusRef.current==="playing") animRef.current=requestAnimationFrame(loop);
  }, []);

  /* ─────────────── CANVAS SETUP after render ── */
  /* Runs after every gameKey/status change — canvas is guaranteed mounted */
  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas || !mazeRef.current) return;

    const { cols, rows, cs } = cfgRef.current;
    canvas.width  = cols * cs;
    canvas.height = rows * cs;

    cancelAnimationFrame(animRef.current);
    const ctx = canvas.getContext("2d");
    if (ctx) { drawFrame(ctx); }
    animRef.current = requestAnimationFrame(loop);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (statusRef.current==="playing") setElapsed(e=>e+1);
    }, 1000);

    return () => {
      cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  /* ─────────────── START ─────────────────────── */
  function startLevel(lv: number, withCamera: boolean) {
    const cfg = lvlCfg(lv);
    cfgRef.current = cfg;
    mazeRef.current = makeMaze(cfg.rows, cfg.cols);
    themeRef.current = THEMES[Math.floor(Math.random()*THEMES.length)];
    ballRef.current = { r:0, c:0, px:cfg.cs/2, py:cfg.cs/2, tr:0, tc:0, moving:false };
    dirRef.current = null;
    setSteps(0); setElapsed(0);
    statusRef.current = "playing";
    setStatus("playing");
    setGameKey(k => k+1);           // guarantees useEffect fires even if status was already "playing"
    if (withCamera && !cameraActive) startGestureDetection();
  }

  function doPause() {
    if (statusRef.current==="playing") {
      cancelAnimationFrame(animRef.current);
      statusRef.current="paused"; setStatus("paused");
    } else if (statusRef.current==="paused") {
      statusRef.current="playing"; setStatus("playing");
      animRef.current=requestAnimationFrame(loop);
    }
  }

  function doRestart() { startLevel(level, false); }

  function fmt(s:number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

  const cfg = lvlCfg(level);

  /* ══════════════ RENDER ════════════════════ */
  return (
    <div className="space-y-3">
      {/* Hidden video for MediaPipe — must always be mounted so
          videoRef.current is non-null when startGestureDetection() is called */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onBack(); }}>← Back</Button>
        <h2 className="text-xl font-extrabold">🌀 Maze Navigator</h2>
        <div className="flex gap-2">
          {(status==="playing"||status==="paused") && (
            <><Badge variant="outline">⏱ {fmt(elapsed)}</Badge><Badge variant="outline">👣 {steps}</Badge></>
          )}
          <Badge className="bg-[#0DA2E7] text-white">Lv {level} · {cfg.label}</Badge>
        </div>
      </div>

      {/* ── MENU ── */}
      {status==="menu" && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-center py-6 space-y-5">
          <div className="text-6xl">🌀</div>
          <h3 className="text-3xl font-extrabold">Maze Navigator!</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Steer through a brand-new random maze each time. Use hand gestures or arrow keys.
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

          <div className="flex gap-2 justify-center flex-wrap">
            {[1,2,3].map(lv => {
              const c=lvlCfg(lv);
              return (
                <Button key={lv} size="sm"
                  variant={level===lv?"default":"outline"}
                  className={level===lv?"kid-gradient text-white":""}
                  onClick={()=>setLevel(lv)}>
                  {lv===1?"🟢":lv===2?"🟡":"🔴"} {c.label} {c.rows}×{c.cols}
                </Button>
              );
            })}
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fog} onChange={e=>setFog(e.target.checked)} className="w-4 h-4 accent-[#0DA2E7]"/>
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
      {status==="won" && (
        <motion.div initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} className="text-center py-8 space-y-5">
          <div className="text-7xl">🏆</div>
          <h3 className="text-3xl font-extrabold text-green-600">Maze Solved!</h3>
          <div className="flex gap-5 justify-center text-lg font-semibold">
            <span>⏱ {fmt(elapsed)}</span><span>👣 {steps} steps</span>
          </div>
          <p className="text-muted-foreground">
            {steps<=cfg.rows*2?"🧠 Perfect! Genius!":steps<=cfg.rows*4?"🌟 Great job!":"Nice! Try fewer steps!"}
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

      {/* ── PLAYING / PAUSED ── */}
      {(status==="playing"||status==="paused") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={doPause}>
              {status==="paused"?"▶ Resume":"⏸ Pause"}
            </Button>
            <Button variant="outline" size="sm" onClick={doRestart}>🔄 Restart</Button>
            <Button variant="outline" size="sm" onClick={()=>setFog(f=>!f)}>
              {fog?"🔆 Clear":"🌫️ Fog"}
            </Button>
            {!cameraActive && (
              <Button variant="outline" size="sm" onClick={()=>startGestureDetection()}>
                📷 Camera
              </Button>
            )}
            {cameraActive && (
              <Badge className="ml-auto bg-green-100 text-green-700 text-xs">
                📷 {gesture!=="none"?gesture.replace("_"," "):"—"}
              </Badge>
            )}
          </div>

          <div className="flex gap-3 items-start flex-wrap">
            {/* Canvas */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded-2xl shadow-lg border-2 border-border block"
                style={{ imageRendering:"pixelated" }}
              />

              {/* Touch D-pad */}
              <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-1 select-none opacity-60 hover:opacity-95 transition-opacity">
                {([
                  [null,   "up",   null   ],
                  ["left", null,   "right"],
                  [null,   "down", null   ],
                ] as (Dir|null)[][]).map((row,ri)=>
                  row.map((d,ci)=> d ? (
                    <button key={`${ri}-${ci}`}
                      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);dirRef.current=d;}}
                      onPointerUp={()=>{dirRef.current=null;}}
                      className="w-9 h-9 rounded-lg bg-black/45 text-white text-base font-bold flex items-center justify-center active:bg-black/75">
                      {d==="up"?"▲":d==="down"?"▼":d==="left"?"◀":"▶"}
                    </button>
                  ) : <div key={`${ri}-${ci}`} className="w-9 h-9"/>)
                )}
              </div>

              {status==="paused" && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <div className="text-white text-center space-y-3">
                    <div className="text-5xl">⏸</div>
                    <p className="text-xl font-bold">Paused</p>
                    <Button onClick={doPause} className="kid-gradient text-white">▶ Resume</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera panel */}
            {showCam && (
              <div className="flex flex-col gap-2 w-36 shrink-0">
                <div className="relative rounded-xl overflow-hidden bg-black border-2 border-border" style={{aspectRatio:"4/3"}}>
                  <video ref={videoDRef} autoPlay playsInline muted
                    className="w-full h-full object-cover scale-x-[-1]"/>
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xs text-center p-2">
                      No camera
                    </div>
                  )}
                  <canvas ref={gCvRef} className="hidden"/>
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <span className="text-white text-xs">Loading AI…</span>
                    </div>
                  )}
                </div>
                <div className="text-center space-y-0.5">
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
                  <p>☝️ Point → steer</p><p>✊ Fist → pause</p><p>✌️ Peace → restart</p>
                  <p className="pt-1 border-t border-border mt-1">⌨️ Arrows work too</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
