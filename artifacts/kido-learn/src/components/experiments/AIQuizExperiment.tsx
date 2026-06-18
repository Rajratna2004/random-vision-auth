import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import confetti from "canvas-confetti";

type Difficulty = "easy" | "medium" | "hard";

interface AIQuizProps {
  topic: string;
  difficulty?: Difficulty;
  onClose?: () => void;
  onComplete?: (score: number, total: number) => void;
}

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  emoji: string;
  desc: string;
  color: string;
  border: string;
  badge: string;
  badgeText: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    emoji: "🌱",
    desc: "Simple questions, great for beginners. Perfect for warming up!",
    color:
      "from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100",
    border: "border-emerald-200 hover:border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    badgeText: "Beginner Friendly",
  },
  {
    value: "medium",
    label: "Medium",
    emoji: "⚡",
    desc: "A bit tricky! Tests your knowledge with more interesting questions.",
    color:
      "from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100",
    border: "border-amber-200 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    badgeText: "Some Challenge",
  },
  {
    value: "hard",
    label: "Hard",
    emoji: "🔥",
    desc: "Expert level! Only the sharpest minds can ace this. Dare to try?",
    color: "from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100",
    border: "border-rose-200 hover:border-rose-400",
    badge: "bg-rose-100 text-rose-700",
    badgeText: "Brain Buster",
  },
];

export default function AIQuizExperiment({
  topic,
  onClose,
  onComplete,
}: AIQuizProps) {
  const [step, setStep] = useState<"pick" | "quiz" | "complete">("pick");
  const [chosenDifficulty, setChosenDifficulty] = useState<Difficulty | null>(
    null,
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [quizSeed, setQuizSeed] = useState(() => Date.now());
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const {
    data: quiz,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["quiz", topic, chosenDifficulty, quizSeed],
    queryFn: () =>
      api.ai.quiz({
        topic,
        numQuestions: 5,
        difficulty: chosenDifficulty,
        seed: quizSeed,
      }),
    enabled: step === "quiz" && chosenDifficulty !== null,
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
  });

  function resetQuizState() {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setCorrectAnswers(0);
  }

  function handlePickDifficulty(d: Difficulty) {
    setChosenDifficulty(d);
    setQuizSeed(Date.now());
    resetQuizState();
    setStep("quiz");
  }

  function handleTryAgain() {
    if (chosenDifficulty) {
      setQuizSeed(Date.now());
      resetQuizState();
      setStep("quiz");
    }
  }

  function handleChangeDifficulty() {
    setChosenDifficulty(null);
    resetQuizState();
    setStep("pick");
  }

  function handleBackToLesson() {
    if (step === "quiz" && !isLoading) {
      setShowLeaveDialog(true);
    } else {
      onClose?.();
    }
  }

  function confirmLeave() {
    setShowLeaveDialog(false);
    onClose?.();
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    const questions = (quiz as any)?.questions ?? [];
    const q = questions[currentQ];
    setSelected(idx);
    if (idx === q.correctIndex) {
      setScore((s) => s + 1);
      setCorrectAnswers((c) => c + 1);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
  }

  function handleNext() {
    const questions = (quiz as any)?.questions ?? [];
    if (currentQ + 1 >= questions.length) {
      const finalScore = score;
      const total = questions.length;
      if (finalScore === total) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
      }
      setStep("complete");
      onComplete?.(finalScore, total);
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    }
  }

  const questions = (quiz as any)?.questions ?? [];
  const q = questions[currentQ];
  const diffInfo = DIFFICULTY_OPTIONS.find((d) => d.value === chosenDifficulty);

  function getCompletionEmoji() {
    if (score === questions.length) return "🏆";
    if (score >= questions.length * 0.8) return "🌟";
    if (score >= questions.length / 2) return "😊";
    return "📚";
  }

  function getCompletionMessage() {
    if (score === questions.length)
      return "Perfect score! You're an absolute genius! 🎉";
    if (score >= questions.length * 0.8)
      return "Amazing work! You really know your stuff! 🌟";
    if (score >= questions.length / 2)
      return "Great job! Keep practicing and you'll be a master! 💪";
    return "Good effort! Review the lesson and try again — you've got this! 📚";
  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">
                🤖 AI Quiz: {topic}
              </h3>
              <p className="text-white/80 text-sm">
                {chosenDifficulty
                  ? `Powered by AI • ${chosenDifficulty} difficulty`
                  : "Powered by AI • choose your difficulty"}
              </p>
            </div>
            {/* Back to Lesson button */}
            <button
              onClick={handleBackToLesson}
              className="flex items-center gap-1 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-xl text-sm font-semibold"
            >
              ← Back to Lesson
            </button>
          </div>
        </div>

        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Difficulty Picker ── */}
            {step === "pick" && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-5 py-2"
              >
                <div className="text-center space-y-1">
                  <div className="text-5xl mb-2">🧠</div>
                  <h3 className="text-xl font-extrabold">
                    Choose Your Difficulty
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    5 questions about{" "}
                    <span className="font-semibold text-indigo-600">
                      {topic}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {DIFFICULTY_OPTIONS.map((opt, i) => (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handlePickDifficulty(opt.value)}
                      className={`w-full text-left p-4 rounded-2xl border-2 bg-gradient-to-r transition-all cursor-pointer ${opt.color} ${opt.border} group`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl group-hover:scale-110 transition-transform">
                          {opt.emoji}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-base font-extrabold text-slate-800">
                              {opt.label}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.badge}`}
                            >
                              {opt.badgeText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                        <span className="text-slate-400 text-xl font-bold group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Quiz ── */}
            {step === "quiz" && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                {/* Loading */}
                {isLoading && (
                  <div className="text-center py-10 space-y-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="text-4xl inline-block"
                    >
                      🔄
                    </motion.div>
                    <p className="text-muted-foreground font-medium">
                      AI is crafting your {chosenDifficulty} quiz…
                    </p>
                    {diffInfo && (
                      <span
                        className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${diffInfo.badge}`}
                      >
                        {diffInfo.emoji} {diffInfo.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <div className="text-center py-10 space-y-4">
                    <div className="text-5xl">😕</div>
                    <div>
                      <p className="font-bold text-foreground text-base">
                        Quiz generation failed
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                        {(error as any)?.message ??
                          "Could not connect to the AI. Make sure your API server is running with a valid OPENAI_API_KEY."}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={() => refetch()}>
                        Try Again
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleChangeDifficulty}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {/* Active question */}
                {!isLoading && !isError && q && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQ}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Question {currentQ + 1} of {questions.length}
                          </span>
                          {diffInfo && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffInfo.badge}`}
                            >
                              {diffInfo.emoji} {diffInfo.label}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">
                          Score: {score}/{currentQ}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full kid-gradient rounded-full"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(currentQ / questions.length) * 100}%`,
                          }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>

                      <div className="text-lg font-semibold leading-snug">
                        {q.question}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSelect(i)}
                            disabled={selected !== null}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                              selected === null
                                ? "border-border hover:border-primary hover:bg-primary/5"
                                : i === q.correctIndex
                                  ? "border-green-400 bg-green-50 text-green-700"
                                  : selected === i
                                    ? "border-red-400 bg-red-50 text-red-700"
                                    : "border-border opacity-50"
                            }`}
                          >
                            <span className="font-bold mr-2">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>

                      {selected !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div
                            className={`p-3 rounded-xl text-sm ${
                              selected === q.correctIndex
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {selected === q.correctIndex ? "🎉 " : "❌ "}
                            {q.explanation}
                          </div>
                          <Button
                            onClick={handleNext}
                            className="w-full kid-gradient text-white"
                          >
                            {currentQ + 1 < questions.length
                              ? "Next Question →"
                              : "See Results! 🎯"}
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Quiz Complete ── */}
            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="py-2 space-y-5"
              >
                {/* Trophy / emoji */}
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 12,
                      delay: 0.1,
                    }}
                    className="text-6xl"
                  >
                    {getCompletionEmoji()}
                  </motion.div>
                  <h3 className="text-2xl font-extrabold">Quiz Complete!</h3>
                  {diffInfo && (
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${diffInfo.badge}`}
                    >
                      {diffInfo.emoji} {diffInfo.label} difficulty
                    </span>
                  )}
                </div>

                {/* Score card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-around text-center">
                    <div>
                      <div className="text-3xl font-extrabold text-indigo-600">
                        {score}/{questions.length}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        Score
                      </div>
                    </div>
                    <div className="w-px bg-indigo-100" />
                    <div>
                      <div className="text-3xl font-extrabold text-emerald-600">
                        {correctAnswers}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        Correct
                      </div>
                    </div>
                    <div className="w-px bg-indigo-100" />
                    <div>
                      <div className="text-3xl font-extrabold text-rose-500">
                        {questions.length - correctAnswers}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        Missed
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/70 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="kid-gradient h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(score / questions.length) * 100}%`,
                      }}
                      transition={{
                        duration: 0.9,
                        ease: "easeOut",
                        delay: 0.2,
                      }}
                    />
                  </div>

                  <p className="text-center text-sm font-medium text-slate-600">
                    {getCompletionMessage()}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleTryAgain}
                    className="w-full kid-gradient text-white font-bold text-base py-5"
                  >
                    🔄 Try Again
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleChangeDifficulty}
                      variant="outline"
                      className="font-semibold border-2"
                    >
                      🎯 Change Difficulty
                    </Button>
                    <Button
                      onClick={() => onClose?.()}
                      variant="outline"
                      className="font-semibold border-2"
                    >
                      📖 Back to Lesson
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ── Leave Quiz Confirmation Dialog ── */}
      <AnimatePresence>
        {showLeaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => setShowLeaveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full space-y-4 text-center"
            >
              <div className="text-5xl">🚪</div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-800">
                  Leave Quiz?
                </h3>
                <p className="text-sm text-slate-500">
                  Your current quiz progress will be lost.
                </p>
              </div>
              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => setShowLeaveDialog(false)}
                  className="w-full kid-gradient text-white font-bold py-5 text-base"
                >
                  Continue Quiz
                </Button>
                <Button
                  onClick={confirmLeave}
                  variant="outline"
                  className="w-full font-semibold border-2 text-slate-600"
                >
                  Leave Quiz
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
