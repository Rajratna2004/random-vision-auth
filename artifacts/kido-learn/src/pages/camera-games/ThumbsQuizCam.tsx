import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Volume2 } from "lucide-react";
import GestureOverlay from "@/components/GestureOverlay";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { playSuccess, playError, playPop, playLevelComplete, playStar } from "@/lib/sounds";
import { speak } from "@/lib/tts";

type Difficulty = "easy" | "medium" | "hard";

interface Problem {
  question: string;
  options: number[];
  correct: number;
}

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateOptions(correct: number, min: number, max: number): number[] {
  const options = new Set<number>([correct]);
  while (options.size < 4) {
    let opt = correct + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 4 + 1);
    if (opt < min) opt = min + Math.floor(Math.random() * 3);
    if (opt > max) opt = max - Math.floor(Math.random() * 3);
    if (opt !== correct) options.add(opt);
  }
  return [...options].sort(() => Math.random() - 0.5);
}

function generateProblem(difficulty: Difficulty): Problem {
  if (difficulty === "easy") {
    const a = rand(1, 5), b = rand(1, 5);
    const answer = a + b;
    return { question: `${a} + ${b} = ?`, options: generateOptions(answer, 1, 10), correct: answer };
  } else if (difficulty === "medium") {
    const isAdd = Math.random() > 0.4;
    if (isAdd) {
      const a = rand(3, 12), b = rand(1, 8);
      const answer = a + b;
      return { question: `${a} + ${b} = ?`, options: generateOptions(answer, 2, 20), correct: answer };
    } else {
      const b = rand(1, 6), a = rand(b + 1, 12);
      const answer = a - b;
      return { question: `${a} - ${b} = ?`, options: generateOptions(answer, 0, 15), correct: answer };
    }
  } else {
    const type = rand(0, 2);
    if (type === 0) {
      const a = rand(5, 20), b = rand(3, 10);
      return { question: `${a} - ${b} = ?`, options: generateOptions(a - b, 0, 20), correct: a - b };
    } else if (type === 1) {
      const a = rand(10, 30), b = rand(5, 15);
      return { question: `${a} + ${b} = ?`, options: generateOptions(a + b, 10, 50), correct: a + b };
    } else {
      const answer = rand(1, 10), blank = rand(1, answer), other = answer - blank;
      return { question: `${other} + _ = ${answer}`, options: generateOptions(blank, 1, 10), correct: blank };
    }
  }
}

const COLORS = ["bg-kiddo-orange", "bg-kiddo-green", "bg-kiddo-purple", "bg-kiddo-cyan"];
const TOTAL_QUESTIONS = 10;

export default function ThumbsQuizCam({ onBack }: { onBack: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [questionNum, setQuestionNum] = useState(0);
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

  const gestureDetection = useGestureDetection({ enabled: !!difficulty });
  const { currentHand, cameraActive } = gestureDetection;

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setQuestionNum(1);
    setScore(0); setStars(0);
    setGameOver(false);
    const p = generateProblem(diff);
    setProblem(p);
    speak(p.question.replace("_", "blank"));
  };

  const handleSelect = useCallback(
    (idx: number) => {
      if (!problem || feedback) return;
      setSelectedIdx(idx);
      const isCorrect = problem.options[idx] === problem.correct;
      if (isCorrect) {
        playSuccess(); playStar();
        setScore(s => s + 10); setStars(s => s + 1);
        setFeedback("correct"); speak("Great job!");
      } else {
        playError(); setFeedback("wrong"); speak("Try again!");
      }
      setTimeout(() => {
        setFeedback(null); setSelectedIdx(null);
        if (isCorrect) {
          if (questionNum >= TOTAL_QUESTIONS) {
            setGameOver(true); playLevelComplete(); speak("Amazing! You finished!");
          } else {
            setQuestionNum(n => n + 1);
            const p = generateProblem(difficulty!);
            setProblem(p);
            setTimeout(() => speak(p.question.replace("_", "blank")), 300);
          }
        }
      }, 1200);
    },
    [problem, feedback, questionNum, difficulty]
  );

  useEffect(() => {
    if (!cameraActive || !problem || feedback || currentHand.gesture === "none") {
      setHoveredIdx(null); setHoverProgress(0);
      hoverStartRef.current = null; hoverIdxRef.current = null;
      return () => {};
    }
    if (currentHand.gesture === "pointing") {
      const idx = Math.max(0, Math.min(problem.options.length - 1, Math.floor(currentHand.x * problem.options.length)));
      if (idx !== hoverIdxRef.current) {
        hoverIdxRef.current = idx; hoverStartRef.current = performance.now();
        confirmedRef.current = false; setHoverProgress(0); playPop();
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
    }
    return () => {};
  }, [currentHand.x, currentHand.gesture, cameraActive, feedback, problem, handleSelect]);

  if (!difficulty) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-5">
        <div className="text-6xl">🧮</div>
        <h2 className="text-2xl font-display text-foreground">Math Quiz</h2>
        <p className="text-muted-foreground text-sm">Point at the correct answer with your finger!</p>
        <div className="flex gap-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <motion.button key={d} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => startGame(d)}
              className={`kiddo-btn text-white ${d === "easy" ? "bg-kiddo-green" : d === "medium" ? "kiddo-gradient-sunshine" : "bg-kiddo-purple"}`}>
              {d === "easy" ? "🟢 Easy" : d === "medium" ? "🟡 Medium" : "🔴 Hard"}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-5xl">{stars >= 8 ? "🏆" : stars >= 5 ? "🌟" : "📚"}</div>
        <h1 className="text-3xl font-display">Amazing!</h1>
        <p className="text-xl font-bold text-primary">{score} pts • {stars}/{TOTAL_QUESTIONS} ⭐</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { setGameOver(false); startGame(difficulty!); }}
            className="kiddo-btn kiddo-gradient-sky text-white">🔄 Again</motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onBack} className="kiddo-btn bg-muted text-foreground">🏠 Games</motion.button>
        </div>
      </div>
    );
  }

  if (!problem) return null;

  return (
    <div className="flex flex-col p-2">
      <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-3">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted"><ArrowLeft size={20} /></motion.button>
        <span className="text-base font-bold text-muted-foreground">{questionNum}/{TOTAL_QUESTIONS}</span>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => speak(problem.question.replace("_", "blank"))} className="p-2 rounded-full bg-muted"><Volume2 size={20} /></motion.button>
      </div>

      <div className="max-w-3xl mx-auto w-full mb-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full kiddo-gradient-sky rounded-full" animate={{ width: `${(questionNum / TOTAL_QUESTIONS) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col items-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={questionNum} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center w-full">
            <div className="p-5 rounded-2xl bg-card border-2 border-border mb-4">
              <p className="text-3xl md:text-4xl font-display text-foreground">{problem.question}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {problem.options.map((opt, i) => {
                const isHovered = hoveredIdx === i;
                const isSelected = selectedIdx === i;
                return (
                  <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    onClick={() => !feedback && handleSelect(i)}
                    className={`relative kiddo-card p-4 text-2xl font-display text-white ${
                      feedback === "correct" && isSelected ? "bg-kiddo-green"
                      : feedback === "wrong" && isSelected ? "bg-red-500" : COLORS[i]
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

      <GestureOverlay videoRef={gestureDetection.videoRef} canvasRef={gestureDetection.canvasRef}
        cameraActive={gestureDetection.cameraActive} isLoading={gestureDetection.isLoading}
        isReady={gestureDetection.isReady} error={gestureDetection.error}
        onToggleCamera={() => gestureDetection.cameraActive ? gestureDetection.stopCamera() : gestureDetection.startGestureDetection()}
        gesture={gestureDetection.currentHand.gesture}
      />
    </div>
  );
}
