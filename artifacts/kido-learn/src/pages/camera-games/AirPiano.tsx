import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useGestureDetection } from "@/hooks/useGestureDetection";

// Piano notes: C4 to C5 (one octave + a few)
const KEYS = [
  { note: "C4",  freq: 261.63, label: "C",  isBlack: false, color: "from-red-400 to-red-500" },
  { note: "D4",  freq: 293.66, label: "D",  isBlack: false, color: "from-orange-400 to-orange-500" },
  { note: "E4",  freq: 329.63, label: "E",  isBlack: false, color: "from-yellow-400 to-yellow-500" },
  { note: "F4",  freq: 349.23, label: "F",  isBlack: false, color: "from-green-400 to-green-500" },
  { note: "G4",  freq: 392.00, label: "G",  isBlack: false, color: "from-teal-400 to-teal-500" },
  { note: "A4",  freq: 440.00, label: "A",  isBlack: false, color: "from-blue-400 to-blue-500" },
  { note: "B4",  freq: 493.88, label: "B",  isBlack: false, color: "from-indigo-400 to-indigo-500" },
  { note: "C5",  freq: 523.25, label: "C",  isBlack: false, color: "from-purple-400 to-purple-500" },
];

const NOTE_NAMES = ["C4","D4","E4","F4","G4","A4","B4","C5"];

function playNote(freq: number, audioCtx: AudioContext) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.2);
}

export default function AirPiano({ onBack }: { onBack: () => void }) {
  const videoDisplayRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevYRef = useRef<number | null>(null);
  const lastKeyRef = useRef<number>(-1);
  const lastPlayRef = useRef<Record<number, number>>({});
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  const [playing, setPlaying] = useState<string[]>([]);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [mode, setMode] = useState<"free" | "memory">("free");

  // Memory mode
  const [memPattern, setMemPattern] = useState<number[]>([]);
  const [memInput, setMemInput] = useState<number[]>([]);
  const [memState, setMemState] = useState<"showing" | "input" | "success" | "fail">("showing");
  const [memStep, setMemStep] = useState(0);
  const [memRound, setMemRound] = useState(1);

  const { videoRef, currentHand, isLoading, error, cameraActive, startGestureDetection } =
    useGestureDetection({ enabled: true });

  useEffect(() => {
    if (cameraActive && videoRef.current?.srcObject && videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = videoRef.current.srcObject;
      videoDisplayRef.current.play().catch(() => {});
    }
  }, [cameraActive, videoRef]);

  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }

  function triggerKey(idx: number) {
    if (idx < 0 || idx >= KEYS.length) return;
    const now = Date.now();
    if (now - (lastPlayRef.current[idx] ?? 0) < 300) return; // debounce
    lastPlayRef.current[idx] = now;
    playNote(KEYS[idx].freq, getAudioCtx());
    setPressedKey(idx);
    setPlaying(prev => [NOTE_NAMES[idx], ...prev].slice(0, 8));
    setTimeout(() => setPressedKey(null), 300);

    if (mode === "memory" && memState === "input") {
      const next = [...memInput, idx];
      setMemInput(next);
      if (next[next.length - 1] !== memPattern[next.length - 1]) {
        setMemState("fail");
      } else if (next.length === memPattern.length) {
        setMemState("success");
      }
    }
  }

  // Map x position to key index
  function xToKey(x: number): number {
    return Math.floor(x * KEYS.length);
  }

  // Track hand and detect tap (downward flick)
  useEffect(() => {
    if (!cameraActive) return;
    const hy = currentHand.y;
    const hx = currentHand.x;
    const keyIdx = Math.max(0, Math.min(KEYS.length - 1, xToKey(hx)));
    lastKeyRef.current = keyIdx;

    if (prevYRef.current !== null) {
      const deltaY = hy - prevYRef.current;
      // Tap = quick downward movement (positive deltaY) and hand is in lower half
      if (deltaY > 0.025 && hy > 0.45) {
        triggerKey(keyIdx);
      }
    }
    prevYRef.current = hy;
  }, [currentHand, cameraActive, mode, memState, memInput, memPattern]);

  // Memory mode: generate and show pattern
  function startMemory(round: number) {
    const len = round + 2;
    const pattern = Array.from({ length: len }, () => Math.floor(Math.random() * KEYS.length));
    setMemPattern(pattern);
    setMemInput([]);
    setMemState("showing");
    setMemStep(0);
    setMemRound(round);
    let i = 0;
    const interval = setInterval(() => {
      if (i < pattern.length) {
        playNote(KEYS[pattern[i]].freq, getAudioCtx());
        setPressedKey(pattern[i]);
        setTimeout(() => setPressedKey(null), 350);
        setMemStep(i + 1);
        i++;
      } else {
        clearInterval(interval);
        setMemState("input");
      }
    }, 700);
  }

  const handleStartCamera = async () => {
    await startGestureDetection();
    setCameraStarted(true);
    getAudioCtx();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-display font-bold">🎹 Air Piano</h2>
        <div className="flex gap-1">
          {["free","memory"].map(m => (
            <button key={m} onClick={() => setMode(m as any)}
              className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${mode === m ? "kid-gradient text-white" : "bg-secondary text-muted-foreground"}`}>
              {m === "free" ? "🎵 Free" : "🧠 Memory"}
            </button>
          ))}
        </div>
      </div>

      {!cameraStarted && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl">🎹</div>
          <h3 className="text-2xl font-bold">Air Piano!</h3>
          <p className="text-muted-foreground">Play music with your hand in the air!</p>
          <div className="text-sm text-muted-foreground space-y-1 bg-secondary/50 rounded-xl p-3 inline-block text-left">
            <p>☝️ Move your finger over the keys</p>
            <p>👇 Flick your hand DOWN to press a key</p>
            <p>🧠 Memory mode: repeat the pattern!</p>
          </div>
          <Button onClick={handleStartCamera} className="kid-gradient text-white font-bold px-8" disabled={isLoading}>
            {isLoading ? "Starting camera…" : "Start Camera 📷"}
          </Button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {cameraStarted && (
        <div className="space-y-3">
          {/* Camera + piano overlay */}
          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
            <video ref={videoDisplayRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60" autoPlay playsInline muted />

            {/* Piano keys overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 flex h-[28%]">
              {KEYS.map((key, i) => (
                <motion.button
                  key={i}
                  animate={{ scale: pressedKey === i ? 0.93 : 1 }}
                  className={`flex-1 border border-white/30 flex flex-col items-center justify-end pb-1 text-white font-extrabold text-xs rounded-t-sm transition-all ${
                    pressedKey === i
                      ? `bg-gradient-to-b ${key.color} shadow-lg`
                      : "bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  }`}
                  onClick={() => { getAudioCtx(); triggerKey(i); }}
                >
                  {pressedKey === i && <span className="text-lg">✨</span>}
                  <span>{key.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Finger cursor */}
            {cameraActive && (
              <div
                className="absolute w-6 h-6 rounded-full border-4 border-white bg-white/30 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
                style={{ left: `${currentHand.x * 100}%`, top: `${currentHand.y * 100}%` }}
              />
            )}

            {/* Memory mode overlay */}
            {mode === "memory" && memState !== "showing" && memState !== "input" && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 text-white">
                {memState === "success" ? (
                  <>
                    <div className="text-5xl">🎉</div>
                    <h3 className="text-2xl font-bold">Perfect!</h3>
                    <Button onClick={() => startMemory(memRound + 1)} className="kid-gradient text-white font-bold">
                      Next Round ({memRound + 1}) 🚀
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl">😅</div>
                    <h3 className="text-2xl font-bold">Wrong note!</h3>
                    <Button onClick={() => startMemory(1)} className="kid-gradient text-white font-bold">Try Again!</Button>
                  </>
                )}
              </div>
            )}

            {/* Memory showing indicator */}
            {mode === "memory" && memState === "showing" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-4 py-1 rounded-full text-sm">
                🎵 Watch the pattern… ({memStep}/{memPattern.length})
              </div>
            )}
            {mode === "memory" && memState === "input" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-400 text-green-900 font-bold px-4 py-1 rounded-full text-sm">
                🎹 Your turn! ({memInput.length}/{memPattern.length})
              </div>
            )}
          </div>

          {/* Controls */}
          {mode === "free" && (
            <div className="flex items-center gap-3 justify-between px-1">
              <div className="flex gap-1 flex-wrap">
                <AnimatePresence>
                  {playing.map((n, i) => (
                    <motion.span key={`${n}-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {n}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground">Flick hand ↓ over a key to play</p>
            </div>
          )}
          {mode === "memory" && memState === "showing" && memPattern.length === 0 && (
            <div className="text-center">
              <Button onClick={() => startMemory(1)} className="kid-gradient text-white font-bold px-8">
                Start Memory Mode 🧠
              </Button>
            </div>
          )}
        </div>
      )}

      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
    </div>
  );
}
