import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Volume2 } from "lucide-react";
import GestureOverlay from "@/components/GestureOverlay";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { playSuccess, playError, playPop, playLevelComplete, playStar } from "@/lib/sounds";
import { speak } from "@/lib/tts";

const OBJECTS = [
  { emoji: "🍎", name: "apples" },
  { emoji: "🐱", name: "cats" },
  { emoji: "⭐", name: "stars" },
  { emoji: "🌸", name: "flowers" },
  { emoji: "🐟", name: "fish" },
  { emoji: "🎈", name: "balloons" },
  { emoji: "🍌", name: "bananas" },
  { emoji: "🦋", name: "butterflies" },
];

const COLORS = ["bg-kiddo-orange", "bg-kiddo-green", "bg-kiddo-purple", "bg-kiddo-cyan"];

interface CountProblem {
  object: typeof OBJECTS[0];
  count: number;
  options: number[];
}

function generateProblem(): CountProblem {
  const object = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
  const count = Math.floor(Math.random() * 8) + 2;
  const options = new Set<number>([count]);
  while (options.size < 4) {
    let opt = count + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3 + 1);
    if (opt < 1) opt = count + Math.floor(Math.random() * 3 + 1);
    if (opt !== count) options.add(opt);
  }
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return { object, count, options: shuffled };
}

const TOTAL = 8;

export default function FingerCount({ onBack }: { onBack: () => void }) {
  const [problem, setProblem] = useState<CountProblem>(generateProblem);
  const [qNum, setQNum] = useState(1);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoverProgress, setHoverProgress] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const hoverStartRef = useRef<number | null>(null);
  const hoverIdxRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const animRef = useRef(0);

  const gestureDetection = useGestureDetection({ enabled: true });
  const { currentHand, cameraActive } = gestureDetection;

  useEffect(() => {
    speak(`How many ${problem.object.name}?`);
  }, [problem]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (feedback) return;
      setSelectedIdx(idx);
      const isCorrect = problem.options[idx] === problem.count;
      if (isCorrect) {
        playSuccess(); playStar();
        setScore(s => s + 10);
        setStars(s => s + 1);
        setFeedback("correct");
        speak("Well done!");
      } else {
        playError();
        setFeedback("wrong");
        speak("Count again!");
      }
      setTimeout(() => {
        setFeedback(null);
        setSelectedIdx(null);
        if (isCorrect) {
          if (qNum >= TOTAL) {
            setGameOver(true);
            playLevelComplete();
            speak("You're a counting star!");
          } else {
            setQNum(n => n + 1);
            setProblem(generateProblem());
          }
        }
      }, 1200);
    },
    [feedback, problem, qNum]
  );

  useEffect(() => {
    if (!cameraActive || feedback || currentHand.gesture !== "pointing") {
      setHoveredIdx(null); setHoverProgress(0);
      hoverStartRef.current = null; hoverIdxRef.current = null; return;
    }
    const idx = Math.max(0, Math.min(3, Math.floor(currentHand.x * 4)));
    if (idx !== hoverIdxRef.current) {
      hoverIdxRef.current = idx;
      hoverStartRef.current = performance.now();
      confirmedRef.current = false;
      setHoverProgress(0);
      playPop();
    }
    setHoveredIdx(idx);
    const tick = () => {
      if (!hoverStartRef.current || confirmedRef.current) return;
      const p = Math.min(1, (performance.now() - hoverStartRef.current) / 1500);
      setHoverProgress(p);
      if (p >= 1) { confirmedRef.current = true; handleSelect(hoverIdxRef.current!); return; }
      animRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [currentHand.x, currentHand.gesture, cameraActive, feedback, handleSelect]);

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-display text-foreground">Super Counter!</h1>
        <div className="flex justify-center gap-1">
          {Array.from({ length: stars }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
              <Star size={28} className="text-kiddo-yellow fill-kiddo-yellow" style={{ color: "hsl(45,100%,45%)", fill: "hsl(45,100%,60%)" }} />
            </motion.div>
          ))}
        </div>
        <p className="text-2xl font-bold text-muted-foreground">Score: {score}</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { setGameOver(false); setQNum(1); setScore(0); setStars(0); setProblem(generateProblem()); }}
            className="kiddo-btn kiddo-gradient-sky text-white">🔄 Again</motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onBack} className="kiddo-btn bg-muted text-foreground">🏠 Games</motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-2">
      <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-3">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted"><ArrowLeft size={20} /></motion.button>
        <span className="text-base font-bold text-muted-foreground">{qNum}/{TOTAL}</span>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => speak(`How many ${problem.object.name}?`)} className="p-2 rounded-full bg-muted"><Volume2 size={20} /></motion.button>
      </div>

      <div className="max-w-3xl mx-auto w-full mb-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full kiddo-gradient-forest rounded-full" animate={{ width: `${(qNum / TOTAL) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={qNum} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center w-full">
            <h2 className="text-xl md:text-2xl font-display text-foreground mb-4">
              How many {problem.object.emoji}?
            </h2>
            <div className="flex flex-wrap justify-center gap-2 mb-5 max-w-sm mx-auto">
              {Array.from({ length: problem.count }).map((_, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.06, type: "spring" }} className="text-3xl md:text-4xl">
                  {problem.object.emoji}
                </motion.span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {problem.options.map((opt, i) => {
                const isHovered = hoveredIdx === i;
                const isSelected = selectedIdx === i;
                const isCorrectAnswer = feedback === "correct" && isSelected;
                const isWrongAnswer = feedback === "wrong" && isSelected;
                return (
                  <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    onClick={() => !feedback && handleSelect(i)}
                    className={`relative kiddo-card p-3 md:p-5 text-2xl font-display text-white ${
                      isCorrectAnswer ? "bg-kiddo-green" : isWrongAnswer ? "bg-red-500" : COLORS[i]
                    }`}
                  >
                    {isHovered && !feedback && (
                      <div className="absolute inset-0 border-4 border-white rounded-3xl" style={{ clipPath: `inset(0 ${(1 - hoverProgress) * 100}% 0 0)` }} />
                    )}
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <GestureOverlay
        videoRef={gestureDetection.videoRef}
        canvasRef={gestureDetection.canvasRef}
        cameraActive={gestureDetection.cameraActive}
        isLoading={gestureDetection.isLoading}
        isReady={gestureDetection.isReady}
        error={gestureDetection.error}
        onToggleCamera={() => gestureDetection.cameraActive ? gestureDetection.stopCamera() : gestureDetection.startGestureDetection()}
        gesture={gestureDetection.currentHand.gesture}
      />
    </div>
  );
}
