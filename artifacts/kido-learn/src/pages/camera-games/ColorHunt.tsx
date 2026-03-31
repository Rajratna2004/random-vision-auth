import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Volume2 } from "lucide-react";
import GestureOverlay from "@/components/GestureOverlay";
import { useGestureDetection } from "@/hooks/useGestureDetection";
import { playSuccess, playError, playPop, playLevelComplete, playStar } from "@/lib/sounds";
import { speak } from "@/lib/tts";

interface QuizItem {
  audio: string;
  question: string;
  options: { emoji: string; label: string }[];
  correctIdx: number;
}

const QUIZ_BANK: QuizItem[] = [
  { audio: "Which one is bigger?", question: "Which is bigger?", options: [{ emoji: "🐘", label: "Elephant" }, { emoji: "🐁", label: "Mouse" }, { emoji: "🐱", label: "Cat" }, { emoji: "🐶", label: "Dog" }], correctIdx: 0 },
  { audio: "Which animal can fly?", question: "Which can fly?", options: [{ emoji: "🐟", label: "Fish" }, { emoji: "🐦", label: "Bird" }, { emoji: "🐱", label: "Cat" }, { emoji: "🐶", label: "Dog" }], correctIdx: 1 },
  { audio: "Which one is a fruit?", question: "Which is a fruit?", options: [{ emoji: "🚗", label: "Car" }, { emoji: "📚", label: "Book" }, { emoji: "🍎", label: "Apple" }, { emoji: "⭐", label: "Star" }], correctIdx: 2 },
  { audio: "Which lives in water?", question: "Which lives in water?", options: [{ emoji: "🐟", label: "Fish" }, { emoji: "🦁", label: "Lion" }, { emoji: "🐱", label: "Cat" }, { emoji: "🐦", label: "Bird" }], correctIdx: 0 },
  { audio: "Which is the hottest?", question: "Which is hottest?", options: [{ emoji: "🧊", label: "Ice" }, { emoji: "❄️", label: "Snow" }, { emoji: "☀️", label: "Sun" }, { emoji: "🌧️", label: "Rain" }], correctIdx: 2 },
  { audio: "Which one has wheels?", question: "Which has wheels?", options: [{ emoji: "🍎", label: "Apple" }, { emoji: "🚲", label: "Bicycle" }, { emoji: "🌸", label: "Flower" }, { emoji: "🐶", label: "Dog" }], correctIdx: 1 },
  { audio: "Which is the tallest?", question: "Which is tallest?", options: [{ emoji: "🐁", label: "Mouse" }, { emoji: "🦒", label: "Giraffe" }, { emoji: "🐱", label: "Cat" }, { emoji: "🐶", label: "Dog" }], correctIdx: 1 },
  { audio: "Which do you wear?", question: "Which do you wear?", options: [{ emoji: "🍕", label: "Pizza" }, { emoji: "📖", label: "Book" }, { emoji: "👟", label: "Shoes" }, { emoji: "🌳", label: "Tree" }], correctIdx: 2 },
  { audio: "Which gives us milk?", question: "Which gives milk?", options: [{ emoji: "🐄", label: "Cow" }, { emoji: "🐟", label: "Fish" }, { emoji: "🐦", label: "Bird" }, { emoji: "🐍", label: "Snake" }], correctIdx: 0 },
  { audio: "Which is the fastest?", question: "Which is fastest?", options: [{ emoji: "🐢", label: "Turtle" }, { emoji: "🐌", label: "Snail" }, { emoji: "🐇", label: "Rabbit" }, { emoji: "🐛", label: "Bug" }], correctIdx: 2 },
];

const COLORS = ["bg-kiddo-orange", "bg-kiddo-green", "bg-kiddo-purple", "bg-kiddo-cyan"];
const TOTAL = 8;

export default function ColorHunt({ onBack }: { onBack: () => void }) {
  const [questions] = useState(() => {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, TOTAL);
  });
  const [qIdx, setQIdx] = useState(0);
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
  const quiz = questions[qIdx];

  useEffect(() => {
    if (quiz) speak(quiz.audio);
  }, [quiz]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (feedback || !quiz) return;
      setSelectedIdx(idx);
      const isCorrect = idx === quiz.correctIdx;
      if (isCorrect) {
        playSuccess(); playStar();
        setScore(s => s + 10); setStars(s => s + 1);
        setFeedback("correct"); speak("Awesome!");
      } else {
        playError(); setFeedback("wrong"); speak("Not quite! Try again!");
      }
      setTimeout(() => {
        setFeedback(null); setSelectedIdx(null);
        if (isCorrect) {
          if (qIdx + 1 >= questions.length) {
            setGameOver(true); playLevelComplete(); speak("You're so smart!");
          } else { setQIdx(n => n + 1); }
        }
      }, 1200);
    },
    [feedback, quiz, qIdx, questions.length]
  );

  useEffect(() => {
    if (!cameraActive || feedback || !quiz || currentHand.gesture !== "pointing") {
      setHoveredIdx(null); setHoverProgress(0);
      hoverStartRef.current = null; hoverIdxRef.current = null; return;
    }
    const idx = Math.max(0, Math.min(3, Math.floor(currentHand.x * 4)));
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
  }, [currentHand.x, currentHand.gesture, cameraActive, feedback, quiz, handleSelect]);

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-6xl">🎤</div>
        <h1 className="text-3xl font-display text-foreground">Quiz Master!</h1>
        <div className="flex justify-center gap-1">
          {Array.from({ length: stars }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
              <Star size={28} style={{ color: "hsl(45,100%,45%)", fill: "hsl(45,100%,60%)" }} />
            </motion.div>
          ))}
        </div>
        <p className="text-2xl font-bold text-muted-foreground">Score: {score}</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { setGameOver(false); setQIdx(0); setScore(0); setStars(0); }}
            className="kiddo-btn kiddo-gradient-sky text-white">🔄 Again</motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onBack} className="kiddo-btn bg-muted text-foreground">🏠 Games</motion.button>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="flex flex-col p-2">
      <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-3">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onBack} className="p-2 rounded-full bg-muted"><ArrowLeft size={20} /></motion.button>
        <span className="text-base font-bold text-muted-foreground">{qIdx + 1}/{questions.length}</span>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => speak(quiz.audio)} className="p-2 rounded-full bg-muted"><Volume2 size={20} /></motion.button>
      </div>

      <div className="max-w-3xl mx-auto w-full mb-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full kiddo-gradient-sunshine rounded-full" animate={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={qIdx} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center w-full">
            <h2 className="text-xl md:text-3xl font-display text-foreground mb-5">🔊 {quiz.question}</h2>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {quiz.options.map((opt, i) => {
                const isHovered = hoveredIdx === i;
                const isSelected = selectedIdx === i;
                const isCorrectAnswer = feedback === "correct" && isSelected;
                const isWrongAnswer = feedback === "wrong" && isSelected;
                return (
                  <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    onClick={() => !feedback && handleSelect(i)}
                    className={`relative kiddo-card p-4 flex flex-col items-center gap-2 text-white ${
                      isCorrectAnswer ? "bg-kiddo-green" : isWrongAnswer ? "bg-red-500" : COLORS[i]
                    }`}
                  >
                    {isHovered && !feedback && (<div className="absolute inset-0 border-4 border-white rounded-3xl" style={{ clipPath: `inset(0 ${(1 - hoverProgress) * 100}% 0 0)` }} />)}
                    <span className="text-4xl">{opt.emoji}</span>
                    <span className="text-base font-display">{opt.label}</span>
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
