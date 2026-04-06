import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";
import AirDraw from "./camera-games/AirDraw";
import HandPainter from "./camera-games/HandPainter";
import AirFruitNinja from "./camera-games/AirFruitNinja";
import AirPiano from "./camera-games/AirPiano";
import MagicSpell from "./camera-games/MagicSpell";

function fireConfetti() {
  confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
}

/* ─────────── MATH SPEED ROUND ─────────── */
function MathSpeedGame({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: "+", ans: 0, options: [] as number[] });
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("mathSpeedHS") || "0"));

  function makeProblem() {
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 1 + Math.floor(Math.random() * 10);
    let b = 1 + Math.floor(Math.random() * 10);
    if (op === "-" && b > a) [a, b] = [b, a];
    const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const w = ans + Math.floor(Math.random() * 8) - 4;
      if (w !== ans && w >= 0) wrongs.add(w);
    }
    const options = [ans, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
    return { a, b, op, ans, options };
  }

  function start() {
    setStarted(true);
    setDone(false);
    setScore(0);
    setTimeLeft(30);
    setProblem(makeProblem());
  }

  useEffect(() => {
    if (!started || done) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, done]);

  useEffect(() => {
    if (done && score > 0) {
      fireConfetti();
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("mathSpeedHS", String(score));
      }
    }
  }, [done]);

  function handleAnswer(opt: number) {
    if (!started || done) return;
    if (opt === problem.ans) {
      setFeedback("correct");
      setScore(s => s + 1);
    } else {
      setFeedback("wrong");
    }
    setTimeout(() => {
      setFeedback(null);
      setProblem(makeProblem());
    }, 300);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">⚡ Math Speed Round</h2>
        <Badge className="bg-yellow-100 text-yellow-700">🏆 Best: {highScore}</Badge>
      </div>

      {!started && !done && (
        <div className="text-center py-10 space-y-4">
          <div className="text-6xl">⚡</div>
          <h3 className="text-2xl font-bold">Math Speed Round!</h3>
          <p className="text-muted-foreground">Answer as many math questions as you can in 30 seconds!</p>
          <Button onClick={start} className="kid-gradient text-white font-bold px-10 text-lg">
            Start! 🚀
          </Button>
        </div>
      )}

      {started && !done && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="text-2xl font-bold text-primary">Score: {score}</div>
            <div className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
              ⏱ {timeLeft}s
            </div>
          </div>

          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 10 ? "bg-red-400" : "kid-gradient"}`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${problem.a}${problem.b}${problem.op}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-center p-6 rounded-2xl border-2 transition-all ${
                feedback === "correct" ? "border-green-400 bg-green-50"
                : feedback === "wrong" ? "border-red-400 bg-red-50"
                : "border-border bg-card"
              }`}
            >
              <div className="text-5xl font-extrabold mb-6">
                {problem.a} {problem.op} {problem.b} = ?
              </div>
              <div className="grid grid-cols-2 gap-3">
                {problem.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="py-4 text-2xl font-bold rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white hover:scale-105 hover:shadow-lg transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {feedback && (
            <div className={`text-center font-bold text-lg ${feedback === "correct" ? "text-green-600" : "text-red-500"}`}>
              {feedback === "correct" ? "✅ Correct!" : "❌ Wrong!"}
            </div>
          )}
        </div>
      )}

      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-5"
        >
          <div className="text-7xl">{score >= 15 ? "🏆" : score >= 8 ? "🌟" : "📚"}</div>
          <h3 className="text-3xl font-extrabold">Time's Up!</h3>
          <div className="text-5xl font-bold text-primary">{score}</div>
          <p className="text-muted-foreground text-lg">
            {score >= 15 ? "Incredible! Math genius! 🧠"
              : score >= 8 ? "Great job! Keep practicing! 💪"
              : "Good effort! Try again! 🎯"}
          </p>
          {score > highScore - (score > 0 ? 0 : 1) && score === highScore && score > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1">🏆 New High Score!</Badge>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={start} className="kid-gradient text-white font-bold px-8">
              Play Again! 🚀
            </Button>
            <Button variant="outline" onClick={onBack}>Back to Games</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────── MEMORY MATCH ─────────── */
function MemoryMatchGame({ onBack }: { onBack: () => void }) {
  const emojiPool = ["🍎", "🚀", "🌈", "🦋", "⚡", "🎯", "🌸", "🎵", "🐬", "🦁"];
  const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [gridSize, setGridSize] = useState<4 | 6 | 8>(4);

  function initGame(size: typeof gridSize) {
    setGridSize(size);
    const emojis = emojiPool.slice(0, size);
    const deck = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(deck);
    setSelected([]);
    setMoves(0);
    setMatches(0);
    setDone(false);
    setStarted(true);
  }

  function handleFlip(id: number) {
    if (selected.length === 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newSelected = [...selected, id];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSelected;
      if (newCards[a].emoji === newCards[b].emoji) {
        const matched = newCards.map(c =>
          c.id === a || c.id === b ? { ...c, matched: true } : c
        );
        setCards(matched);
        setSelected([]);
        const newMatches = matches + 1;
        setMatches(newMatches);
        if (newMatches === gridSize) {
          setDone(true);
          fireConfetti();
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
        }, 900);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🃏 Memory Match</h2>
        {started && <Badge className="bg-blue-100 text-blue-700">Moves: {moves}</Badge>}
      </div>

      {!started && (
        <div className="text-center py-8 space-y-5">
          <div className="text-6xl">🃏</div>
          <h3 className="text-2xl font-bold">Memory Match!</h3>
          <p className="text-muted-foreground">Flip cards to find matching pairs!</p>
          <div className="space-y-2">
            <p className="font-medium">Choose difficulty:</p>
            <div className="flex gap-3 justify-center">
              {([4, 6, 8] as const).map(s => (
                <Button key={s} onClick={() => initGame(s)} variant="outline" className="px-6">
                  {s === 4 ? "🟢 Easy (8 cards)" : s === 6 ? "🟡 Medium (12 cards)" : "🔴 Hard (16 cards)"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {started && !done && (
        <div className={`grid gap-3 ${gridSize <= 4 ? "grid-cols-4" : gridSize <= 6 ? "grid-cols-4" : "grid-cols-4"}`}>
          {cards.map(card => (
            <motion.button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              className={`aspect-square rounded-xl text-3xl flex items-center justify-center font-bold transition-all border-2 ${
                card.matched ? "bg-green-100 border-green-400 cursor-default"
                : card.flipped ? "bg-primary/10 border-primary"
                : "kid-gradient border-transparent text-transparent hover:scale-105"
              }`}
              animate={{ rotateY: card.flipped || card.matched ? 0 : 180 }}
            >
              {card.flipped || card.matched ? card.emoji : "?"}
            </motion.button>
          ))}
        </div>
      )}

      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-4"
        >
          <div className="text-6xl">🎉</div>
          <h3 className="text-2xl font-bold">You matched them all!</h3>
          <p className="text-muted-foreground">Completed in <strong>{moves}</strong> moves</p>
          <p>{moves <= gridSize + 2 ? "🏆 Amazing! Perfect memory!" : moves <= gridSize * 2 ? "🌟 Great job!" : "Well done! Practice makes perfect!"}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => initGame(gridSize)} className="kid-gradient text-white font-bold">Play Again!</Button>
            <Button variant="outline" onClick={onBack}>Back to Games</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────── WORD BUILDER ─────────── */
function WordBuilderGame({ onBack }: { onBack: () => void }) {
  const challenges = [
    { letters: ["C", "A", "T", "R", "S"], words: ["ARC", "ART", "CAR", "CAT", "RAT", "SAT", "TAR", "ARCS", "ARTS", "CARS", "CART", "CAST", "CATS", "RATS", "SCAR", "STAR", "TARS", "CARTS"] },
    { letters: ["S", "T", "O", "P", "E"], words: ["OPT", "POT", "SET", "TOP", "TOE", "PET", "SOT", "OPTS", "POTS", "POET", "POSE", "POST", "SPOT", "STEP", "STOP", "TOES", "TOPS", "PESTO", "POETS", "STOPE", "TOPES"] },
    { letters: ["L", "O", "V", "E", "R"], words: ["ORE", "ROE", "OLE", "LOVE", "LORE", "OVER", "ROLE", "ROVE", "VOLE", "LOVER"] },
    { letters: ["B", "A", "N", "G", "S"], words: ["BAG", "BAN", "GAB", "GAS", "NAB", "NAG", "SAG", "BAGS", "BANG", "BANS", "GABS", "NABS", "NAGS", "SANG", "SNAG", "BANGS"] },
    { letters: ["H", "A", "P", "Y", "S"], words: ["HAP", "HAS", "HAY", "PAY", "SAP", "SAY", "SPA", "YAP", "ASHY", "HASP", "HAPS", "HAYS", "PAYS", "SPAY", "YAPS"] },
  ];

  const [challenge] = useState(() => challenges[Math.floor(Math.random() * challenges.length)]);
  const [built, setBuilt] = useState<string[]>([]); // letters clicked in order
  const [found, setFound] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);

  const current = built.join("");

  function addLetter(letter: string, idx: number) {
    if (built.filter((_, i) => i === idx).length > 0) return; // already used at this pos
    setBuilt([...built, letter]);
  }

  function removeLast() {
    setBuilt(built.slice(0, -1));
  }

  function checkWord() {
    const word = current;
    if (word.length < 2) { setMessage("Need at least 2 letters!"); return; }
    if (found.includes(word)) { setMessage("Already found that one! 😊"); return; }
    if (challenge.words.includes(word)) {
      const newFound = [...found, word];
      setFound(newFound);
      setScore(s => s + word.length);
      setMessage(`✅ "${word}" — +${word.length} points!`);
      setBuilt([]);
      if (newFound.length >= 5) fireConfetti();
    } else {
      setMessage(`❌ "${word}" is not a word here. Try again!`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">📝 Word Builder</h2>
        <Badge className="bg-green-100 text-green-700">Score: {score}</Badge>
      </div>

      <p className="text-sm text-muted-foreground text-center">Make words using these letters! (find {Math.min(5, challenge.words.length)} words to win)</p>

      {/* Available letters */}
      <div className="flex gap-2 justify-center flex-wrap">
        {challenge.letters.map((letter, i) => (
          <button
            key={i}
            onClick={() => setBuilt([...built, letter])}
            className="w-12 h-12 rounded-xl text-2xl font-bold bg-gradient-to-br from-purple-500 to-cyan-500 text-white hover:scale-110 transition-all shadow"
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Word being built */}
      <div className="flex items-center gap-2 justify-center">
        <div className="min-w-32 h-12 border-2 border-primary rounded-xl px-4 flex items-center justify-center text-xl font-bold text-primary">
          {current || <span className="text-muted-foreground text-sm">tap letters above</span>}
        </div>
        <Button size="sm" variant="outline" onClick={removeLast} disabled={built.length === 0}>⌫</Button>
        <Button size="sm" className="kid-gradient text-white" onClick={checkWord} disabled={built.length < 2}>Check!</Button>
      </div>

      {message && (
        <motion.div key={message} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center font-semibold text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
          {message}
        </motion.div>
      )}

      {/* Found words */}
      <div>
        <p className="text-sm font-semibold mb-2">Found words ({found.length}):</p>
        <div className="flex flex-wrap gap-2">
          {found.map(w => (
            <span key={w} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">✅ {w}</span>
          ))}
          {Array.from({ length: Math.max(0, 5 - found.length) }).map((_, i) => (
            <span key={i} className="px-3 py-1 bg-secondary rounded-full text-sm text-muted-foreground">_ _ _</span>
          ))}
        </div>
      </div>

      {found.length >= 5 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-3">
          <div className="text-4xl">🎉</div>
          <p className="text-xl font-bold text-green-600">Word Master! Score: {score}</p>
          <Button onClick={onBack} className="kid-gradient text-white font-bold">Back to Games</Button>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────── QUIZ RACE ─────────── */
function QuizRaceGame({ onBack }: { onBack: () => void }) {
  const questions = [
    { q: "What planet is closest to the Sun?", options: ["Mercury", "Venus", "Earth", "Mars"], ans: 0 },
    { q: "How many legs does a spider have?", options: ["6", "8", "10", "12"], ans: 1 },
    { q: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Rome"], ans: 2 },
    { q: "Which animal is the fastest?", options: ["Lion", "Cheetah", "Horse", "Eagle"], ans: 1 },
    { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], ans: 2 },
    { q: "What gas do plants breathe in?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], ans: 2 },
    { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], ans: 1 },
    { q: "What is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], ans: 3 },
    { q: "Which is NOT a primary color?", options: ["Red", "Green", "Blue", "Yellow"], ans: 3 },
    { q: "What is 7 × 8?", options: ["54", "56", "58", "60"], ans: 1 },
    { q: "How many bones are in the human body?", options: ["106", "206", "306", "406"], ans: 1 },
    { q: "What is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], ans: 2 },
  ];

  const [shuffled] = useState(() => [...questions].sort(() => Math.random() - 0.5).slice(0, 8));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);

  const q = shuffled[idx];

  useEffect(() => {
    if (!started || done || selected !== null) return;
    if (timeLeft <= 0) {
      handleSelect(-1); // time out
      return;
    }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [started, done, timeLeft, selected]);

  function handleSelect(opt: number) {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === q.ans;
    if (correct) {
      setScore(s => s + 10 + timeLeft); // time bonus!
      setStreak(s => s + 1);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (idx + 1 >= shuffled.length) {
        setDone(true);
        if (score + (correct ? 10 + timeLeft : 0) > shuffled.length * 10) fireConfetti();
      } else {
        setIdx(i => i + 1);
        setSelected(null);
        setTimeLeft(15);
      }
    }, 1200);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🏁 Quiz Race</h2>
        {started && <Badge className="bg-purple-100 text-purple-700">Score: {score}</Badge>}
      </div>

      {!started && !done && (
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl">🏁</div>
          <h3 className="text-2xl font-bold">Quiz Race!</h3>
          <p className="text-muted-foreground">Answer fast for bonus points! You have 15 seconds per question.</p>
          <Button onClick={() => setStarted(true)} className="kid-gradient text-white font-bold px-10 text-lg">
            Ready? Go! 🚀
          </Button>
        </div>
      )}

      {started && !done && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Q {idx + 1}/{shuffled.length}</span>
            {streak >= 2 && <span className="text-orange-500 font-bold">🔥 {streak} streak!</span>}
            <span className={`font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"}`}>⏱ {timeLeft}s</span>
          </div>

          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 5 ? "bg-red-400" : "kid-gradient"}`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="p-5 rounded-2xl bg-card border-2 border-border"
            >
              <p className="text-lg font-bold mb-5">{q.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={selected !== null}
                    className={`p-3 rounded-xl text-left font-medium transition-all border-2 ${
                      selected === null
                        ? "border-border hover:border-primary hover:bg-primary/5"
                        : i === q.ans
                        ? "border-green-400 bg-green-50 text-green-700 font-bold"
                        : selected === i
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-border opacity-50"
                    }`}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {done && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
          <div className="text-6xl">{score >= 100 ? "🏆" : score >= 60 ? "🌟" : "📚"}</div>
          <h3 className="text-2xl font-bold">Quiz Complete!</h3>
          <div className="text-5xl font-extrabold text-primary">{score} pts</div>
          <p className="text-muted-foreground">{score >= 100 ? "Outstanding! You're a quiz champion!" : score >= 60 ? "Great work! Keep learning!" : "Good try! Study more and beat your score!"}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setIdx(0); setScore(0); setSelected(null); setDone(false); setStarted(true); setTimeLeft(15); setStreak(0); }} className="kid-gradient text-white font-bold">
              Play Again!
            </Button>
            <Button variant="outline" onClick={onBack}>Back to Games</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────── SPELL IT RIGHT ─────────── */
function SpellItGame({ onBack }: { onBack: () => void }) {
  const words = [
    { word: "ELEPHANT", hint: "A big grey animal with a trunk 🐘" },
    { word: "RAINBOW", hint: "Colors in the sky after rain 🌈" },
    { word: "BUTTERFLY", hint: "A colorful flying insect 🦋" },
    { word: "MOUNTAIN", hint: "A very tall hill 🏔️" },
    { word: "OCEAN", hint: "A huge body of salt water 🌊" },
    { word: "PLANET", hint: "Earth, Mars, Venus are all... 🪐" },
    { word: "FLOWER", hint: "Plants grow these — roses, tulips 🌸" },
    { word: "LIBRARY", hint: "A place full of books 📚" },
    { word: "KITCHEN", hint: "Where food is cooked 🍳" },
    { word: "TRIANGLE", hint: "A shape with 3 sides 🔺" },
  ];

  function makeChallenge(excludeWord?: string) {
    let w = words[Math.floor(Math.random() * words.length)];
    if (excludeWord && words.length > 1) {
      let attempts = 0;
      while (w.word === excludeWord && attempts < 10) {
        w = words[Math.floor(Math.random() * words.length)];
        attempts++;
      }
    }
    return {
      ...w,
      blanks: w.word.split("").map((l, i) => (Math.random() > 0.5 && i !== 0 ? "_" : l)),
    };
  }

  const [challenge, setChallenge] = useState(() => makeChallenge());
  const [inputs, setInputs] = useState<string[]>(
    challenge.blanks.map(b => b === "_" ? "" : b)
  );
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const blankIndices = challenge.blanks.reduce<number[]>((acc, b, i) => b === "_" ? [...acc, i] : acc, []);

  function tryAnother() {
    const next = makeChallenge(challenge.word);
    setChallenge(next);
    setInputs(next.blanks.map(b => b === "_" ? "" : b));
    setChecked(false);
    setCorrect(false);
    inputRefs.current = [];
  }

  function handleInput(i: number, val: string) {
    if (checked && correct) return;
    const newInputs = [...inputs];
    newInputs[i] = val.toUpperCase().slice(-1);
    setInputs(newInputs);
    setChecked(false);

    if (val) {
      const currentPos = blankIndices.indexOf(i);
      const nextBlank = blankIndices[currentPos + 1];
      if (nextBlank !== undefined && inputRefs.current[nextBlank]) {
        inputRefs.current[nextBlank]?.focus();
      }
    }
  }

  function handleCheck() {
    const word = inputs.join("");
    const isCorrect = word === challenge.word;
    setChecked(true);
    setCorrect(isCorrect);
    if (isCorrect) fireConfetti();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🔤 Spell It Right</h2>
        <Button variant="outline" size="sm" onClick={tryAnother}>🔄 Try Another</Button>
      </div>

      <div className="text-center space-y-2">
        <div className="text-4xl">{challenge.hint.split(" ").pop()}</div>
        <p className="text-muted-foreground text-sm">{challenge.hint}</p>
        <p className="font-semibold">Fill in the missing letters!</p>
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {challenge.blanks.map((b, i) => (
          b === "_" ? (
            <input
              key={`${challenge.word}-${i}`}
              ref={el => { inputRefs.current[i] = el; }}
              maxLength={1}
              value={inputs[i] || ""}
              onChange={e => handleInput(i, e.target.value)}
              className={`w-10 h-10 text-center text-xl font-bold border-2 rounded-lg uppercase focus:outline-none ${
                checked ? inputs[i] === challenge.word[i] ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"
                : "border-primary focus:ring-2 focus:ring-primary"
              }`}
            />
          ) : (
            <div key={`${challenge.word}-${i}`} className="w-10 h-10 flex items-center justify-center text-xl font-bold bg-secondary rounded-lg">
              {b}
            </div>
          )
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={handleCheck} className="kid-gradient text-white font-bold px-8" disabled={blankIndices.some(i => !inputs[i])}>
          Check Spelling!
        </Button>
      </div>

      {checked && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center font-bold text-xl ${correct ? "text-green-600" : "text-red-500"}`}>
          {correct ? `🎉 Correct! It's "${challenge.word}"!` : "❌ Not quite — check the letters in red!"}
        </motion.div>
      )}

      {checked && correct && (
        <div className="flex justify-center gap-3">
          <Button onClick={tryAnother} className="kid-gradient text-white font-bold">Try Another Word!</Button>
          <Button variant="outline" onClick={onBack}>Back to Games</Button>
        </div>
      )}
    </div>
  );
}

/* ─────────── GAMES HUB ─────────── */
const BRAIN_GAMES = [
  { id: "math-speed",   title: "Math Speed Round", emoji: "⚡", desc: "Answer math questions as fast as you can!",   color: "from-[#FF6B6B] to-[#FF8E53]",   badge: "Math" },
  { id: "memory-match", title: "Memory Match",      emoji: "🃏", desc: "Flip cards and find matching pairs!",          color: "from-[#9B59B6] to-[#8E44AD]",   badge: "Memory" },
  { id: "quiz-race",    title: "Quiz Race",          emoji: "🏁", desc: "Race against time on fun trivia questions!",   color: "from-[#4CAF50] to-[#45B649]",   badge: "Trivia" },
  { id: "word-builder", title: "Word Builder",       emoji: "📝", desc: "Rearrange letters to build real words!",       color: "from-[#F7971E] to-[#FFD200]",   badge: "English" },
  { id: "spell-it",     title: "Spell It Right",     emoji: "🔤", desc: "Fill in the missing letters to spell words!", color: "from-[#FF4E91] to-[#FF6B6B]",   badge: "Spelling" },
];

const CAMERA_GAMES = [
  { id: "air-draw",       title: "Air Draw",        emoji: "✍️", desc: "Draw with your finger in the air! Pinch to lift pen.",          color: "from-[#FF6B6B] to-[#FF8E53]", badge: "📷 Camera" },
  { id: "color-fill",     title: "Hand Painter",     emoji: "🎨", desc: "Use hand gestures to draw, erase, and change colors!",          color: "from-[#4CAF50] to-[#0DA2E7]", badge: "📷 Camera" },
  { id: "air-fruit-ninja",title: "Air Fruit Ninja",  emoji: "🍉", desc: "Slice fruits with your hand! Avoid bombs to survive!",           color: "from-[#FF4E91] to-[#FF6B6B]", badge: "📷 Camera" },
  { id: "air-piano",      title: "Air Piano",         emoji: "🎹", desc: "Play piano in the air! Flick your finger down on a key.",       color: "from-[#9B59B6] to-[#0DA2E7]", badge: "📷 Camera" },
  { id: "magic-spell",    title: "Magic Spell",       emoji: "🧙", desc: "Draw shapes in the air to cast magic spells!",                  color: "from-[#5B2D8E] to-[#FF4E91]", badge: "📷 Camera" },
];

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  function goBack() { setActiveGame(null); }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {!activeGame && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-heading text-5xl text-gray-700 mb-1">🎮 Learning Games</h1>
              <p className="text-gray-400 font-bold">Play games and learn at the same time!</p>
            </div>

            {/* Brain Games */}
            <div className="space-y-3">
              <h2 className="font-heading text-2xl text-gray-600 flex items-center gap-2">🧠 Brain Games</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {BRAIN_GAMES.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveGame(game.id)}
                    className="cursor-pointer"
                  >
                    <div className={`bg-gradient-to-br ${game.color} rounded-3xl p-5 shadow-lg flex flex-col items-center text-center gap-2`}>
                      <div className="text-4xl drop-shadow-md">{game.emoji}</div>
                      <h3 className="font-heading text-white text-base leading-tight drop-shadow">{game.title}</h3>
                      <p className="text-white/80 text-xs font-semibold line-clamp-2">{game.desc}</p>
                      <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{game.badge}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Camera Games */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-heading text-2xl text-gray-600">📷 Camera Games</h2>
                <span className="text-xs bg-[#0DA2E7]/10 text-[#0DA2E7] font-bold px-3 py-1 rounded-full border border-[#0DA2E7]/20">🤖 AI Hand Tracking</span>
              </div>
              <p className="text-sm text-gray-400 font-semibold">Your camera + AI hand tracking powers these games — allow camera access when asked.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {CAMERA_GAMES.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveGame(game.id)}
                    className="cursor-pointer"
                  >
                    <div className={`bg-gradient-to-br ${game.color} rounded-3xl p-5 shadow-lg flex flex-col items-center text-center gap-2`}>
                      <div className="text-4xl drop-shadow-md">{game.emoji}</div>
                      <h3 className="font-heading text-white text-base leading-tight drop-shadow">{game.title}</h3>
                      <p className="text-white/80 text-xs font-semibold">{game.desc}</p>
                      <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{game.badge}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeGame && (
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <AnimatePresence mode="wait">
                <motion.div key={activeGame} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {activeGame === "math-speed"          && <MathSpeedGame onBack={goBack} />}
                  {activeGame === "memory-match"        && <MemoryMatchGame onBack={goBack} />}
                  {activeGame === "quiz-race"           && <QuizRaceGame onBack={goBack} />}
                  {activeGame === "word-builder"        && <WordBuilderGame onBack={goBack} />}
                  {activeGame === "spell-it"            && <SpellItGame onBack={goBack} />}
                  {activeGame === "air-draw"        && <AirDraw onBack={goBack} />}
                  {activeGame === "color-fill"      && <HandPainter onBack={goBack} />}
                  {activeGame === "air-fruit-ninja" && <AirFruitNinja onBack={goBack} />}
                  {activeGame === "air-piano"       && <AirPiano onBack={goBack} />}
                  {activeGame === "magic-spell"     && <MagicSpell onBack={goBack} />}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
