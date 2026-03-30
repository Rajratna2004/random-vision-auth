import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import confetti from "canvas-confetti";

interface AIQuizProps {
  topic: string;
  difficulty?: "easy" | "medium" | "hard";
}

export default function AIQuizExperiment({ topic, difficulty = "easy" }: AIQuizProps) {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const { data: quiz, isLoading, refetch } = useQuery({
    queryKey: ["quiz", topic, difficulty],
    queryFn: () => api.ai.quiz({ topic, numQuestions: 5, difficulty }),
    enabled: started,
    staleTime: 0,
  });

  function handleStart() {
    setStarted(true);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  function handleNewQuiz() {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    refetch();
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    const questions = (quiz as any)?.questions ?? [];
    const q = questions[currentQ];
    setSelected(idx);
    if (idx === q.correctIndex) {
      setScore((s) => s + 1);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
  }

  function handleNext() {
    const questions = (quiz as any)?.questions ?? [];
    if (currentQ + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    }
  }

  const questions = (quiz as any)?.questions ?? [];
  const q = questions[currentQ];

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3">
        <h3 className="text-white font-bold text-lg">🤖 AI Quiz: {topic}</h3>
        <p className="text-white/80 text-sm">Powered by AI • {difficulty} difficulty</p>
      </div>
      <CardContent className="p-6">
        {!started && (
          <div className="text-center space-y-4 py-4">
            <div className="text-6xl">🧠</div>
            <h3 className="text-xl font-bold">Ready for an AI-powered quiz?</h3>
            <p className="text-muted-foreground">5 questions about {topic}</p>
            <Button onClick={handleStart} className="kid-gradient text-white font-bold px-8">
              Start Quiz! 🚀
            </Button>
          </div>
        )}

        {started && isLoading && (
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl animate-spin">🔄</div>
            <p className="text-muted-foreground">AI is creating your quiz...</p>
          </div>
        )}

        {started && !isLoading && !done && q && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {currentQ + 1} of {questions.length}</span>
                <span>Score: {score}/{currentQ}</span>
              </div>
              <div className="text-lg font-semibold">{q.question}</div>
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
                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                ))}
              </div>
              {selected !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className={`p-3 rounded-xl text-sm ${selected === q.correctIndex ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {selected === q.correctIndex ? "🎉 " : "❌ "}{q.explanation}
                  </div>
                  <Button onClick={handleNext} className="w-full kid-gradient text-white">
                    {currentQ + 1 < questions.length ? "Next Question →" : "See Results!"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 py-4"
          >
            <div className="text-5xl">
              {score === questions.length ? "🏆" : score >= questions.length / 2 ? "🌟" : "📚"}
            </div>
            <h3 className="text-2xl font-bold">
              {score}/{questions.length} Correct!
            </h3>
            <p className="text-muted-foreground">
              {score === questions.length
                ? "Perfect score! You're a genius!"
                : score >= questions.length / 2
                ? "Great job! Keep practicing!"
                : "Keep learning, you're getting there!"}
            </p>
            <div className="w-full bg-secondary rounded-full h-4">
              <div
                className="kid-gradient h-4 rounded-full transition-all"
                style={{ width: `${(score / questions.length) * 100}%` }}
              />
            </div>
            <Button onClick={handleNewQuiz} className="kid-gradient text-white font-bold">
              🎲 Try Another Quiz!
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
