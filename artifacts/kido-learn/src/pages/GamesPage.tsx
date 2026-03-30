import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

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
    { letters: ["C", "A", "T", "R", "S"], words: ["CAT", "CAR", "RAT", "RATS", "CATS", "STAR", "CART", "CARS"] },
    { letters: ["S", "T", "O", "P", "E"], words: ["STOP", "TOPS", "POET", "POTS", "STEP", "SPOT", "TOES", "POSE"] },
    { letters: ["L", "O", "V", "E", "R"], words: ["LOVE", "OVER", "ROLE", "LORE", "ROVE", "LOVER", "LOVER"] },
    { letters: ["B", "A", "N", "G", "S"], words: ["BANG", "NABS", "BAGS", "SANG", "BANS", "SNAG", "BANGS"] },
    { letters: ["H", "A", "P", "Y", "S"], words: ["HAPPY", "PAYS", "HAPS", "YAPS", "ASHY", "HASP"] },
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

  const [challenge] = useState(() => {
    const w = words[Math.floor(Math.random() * words.length)];
    return {
      ...w,
      blanks: w.word.split("").map((l, i) => (Math.random() > 0.5 && i !== 0 ? "_" : l)),
    };
  });

  const [inputs, setInputs] = useState<string[]>(
    challenge.blanks.map(b => b === "_" ? "" : b)
  );
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const blankIndices = challenge.blanks.reduce<number[]>((acc, b, i) => b === "_" ? [...acc, i] : acc, []);

  function handleInput(i: number, val: string) {
    if (checked && correct) return;
    const newInputs = [...inputs];
    newInputs[i] = val.toUpperCase().slice(-1);
    setInputs(newInputs);
    setChecked(false);
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
        <div />
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
              key={i}
              maxLength={1}
              value={inputs[i] || ""}
              onChange={e => handleInput(i, e.target.value)}
              className={`w-10 h-10 text-center text-xl font-bold border-2 rounded-lg uppercase focus:outline-none ${
                checked ? inputs[i] === challenge.word[i] ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"
                : "border-primary focus:ring-2 focus:ring-primary"
              }`}
            />
          ) : (
            <div key={i} className="w-10 h-10 flex items-center justify-center text-xl font-bold bg-secondary rounded-lg">
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
          <Button onClick={onBack} className="kid-gradient text-white font-bold">Back to Games</Button>
        </div>
      )}
    </div>
  );
}

/* ─────────── CAMERA HELPER HOOK ─────────── */
function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => setError(true));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { videoRef, ready, error };
}

async function detectHandViaFlask(video: HTMLVideoElement): Promise<{
  gesture: string;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  handDetected: boolean;
}> {
  const cv = document.createElement("canvas");
  cv.width = 320; cv.height = 240;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(video, 0, 0, 320, 240);
  const frame = cv.toDataURL("image/jpeg", 0.7);
  try {
    const res = await fetch("/api/hands/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: frame }),
      signal: AbortSignal.timeout(4000),
    });
    return res.json();
  } catch {
    return { gesture: "idle", landmarks: null, handDetected: false };
  }
}

/* ─────────── FINGER COUNTING CAMERA GAME ─────────── */
function FingerCountingCameraGame({ onBack }: { onBack: () => void }) {
  const { videoRef, ready, error } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(() => 1 + Math.floor(Math.random() * 5));
  const [detected, setDetected] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const ROUNDS = 5;
  const fingerEmojis = ["", "☝️", "✌️", "🤟", "🖖", "🖐️"];

  function countFingers(landmarks: Array<{ x: number; y: number }>): number {
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
    const thumbUp = landmarks[4].y < landmarks[3].y || Math.abs(landmarks[4].x - landmarks[3].x) > 0.04;
    let count = thumbUp ? 1 : 0;
    for (const [tip, pip] of fingers) if (landmarks[tip].y < landmarks[pip].y) count++;
    return count;
  }

  async function scanFingers() {
    if (!videoRef.current || scanning || done) return;
    setScanning(true);
    setFeedback(null);
    setDetected(null);

    const result = await detectHandViaFlask(videoRef.current);
    setScanning(false);
    const count = result.landmarks ? countFingers(result.landmarks) : -1;
    setDetected(count);
    const isCorrect = count === target;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      setScore(s => s + 1);
      setTimeout(nextRound, 1200);
    }
  }

  function nextRound() {
    const next = round + 1;
    if (next >= ROUNDS) { setDone(true); if (score + 1 >= 4) fireConfetti(); return; }
    setRound(next);
    setTarget(1 + Math.floor(Math.random() * 5));
    setDetected(null);
    setFeedback(null);
  }

  if (error) return (
    <div className="text-center space-y-4 py-6">
      <div className="text-5xl">📷</div>
      <p className="text-muted-foreground">Camera not available in this browser.</p>
      <Button variant="outline" onClick={onBack}>← Back to Games</Button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
      <div className="text-6xl">{score >= 4 ? "🏆" : score >= 2 ? "🌟" : "💪"}</div>
      <h3 className="text-2xl font-bold">Game Over!</h3>
      <p className="text-4xl font-extrabold text-primary">{score}/{ROUNDS}</p>
      <p className="text-muted-foreground">{score >= 4 ? "Finger counting master!" : score >= 2 ? "Great effort!" : "Keep practicing!"}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setRound(0); setScore(0); setTarget(1 + Math.floor(Math.random() * 5)); setDone(false); setFeedback(null); setDetected(null); }} className="kid-gradient text-white font-bold">
          Play Again!
        </Button>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">✋ Finger Counting</h2>
        <Badge className="bg-purple-100 text-purple-700">{score}/{ROUNDS}</Badge>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div className="kid-gradient h-2 rounded-full transition-all" style={{ width: `${(round / ROUNDS) * 100}%` }} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-muted-foreground text-sm">Round {round + 1} of {ROUNDS}</p>
        <p className="text-xl font-bold">Hold up <span className="text-primary font-extrabold text-4xl">{target}</span> finger{target !== 1 ? "s" : ""}!</p>
        <div className="text-5xl">{fingerEmojis[target]}</div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <canvas ref={canvasRef} className="hidden" />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white font-bold animate-pulse">Counting fingers...</p>
          </div>
        )}
        {!ready && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">Starting camera...</div>}
      </div>

      {feedback && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-center font-bold text-lg ${feedback === "correct" ? "text-green-600" : "text-red-500"}`}>
          {feedback === "correct"
            ? `✅ ${detected} finger${detected !== 1 ? "s" : ""}! Correct! 🎉`
            : detected === -1 ? "🤔 No hand seen — try again!" : `❌ I see ${detected} finger${detected !== 1 ? "s" : ""} — need ${target}!`}
        </motion.div>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={scanFingers} disabled={!ready || scanning} className="kid-gradient text-white font-bold px-8">
          {scanning ? "🔍 Counting..." : "✋ Scan My Hand!"}
        </Button>
        {feedback === "wrong" && (
          <Button variant="outline" size="sm" onClick={nextRound}>Skip →</Button>
        )}
      </div>
    </div>
  );
}

/* ─────────── COLOR HUNT CAMERA GAME ─────────── */
function ColorHuntCameraGame({ onBack }: { onBack: () => void }) {
  const { videoRef, ready, error } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colorTargets = [
    { name: "Red", hex: "#ef4444", emoji: "🔴", hRange: [0, 20], hRange2: [340, 360], sMin: 70, vMin: 70 },
    { name: "Blue", hex: "#3b82f6", emoji: "🔵", hRange: [200, 255], sMin: 55, vMin: 55 },
    { name: "Green", hex: "#22c55e", emoji: "🟢", hRange: [85, 155], sMin: 55, vMin: 55 },
    { name: "Yellow", hex: "#eab308", emoji: "🟡", hRange: [42, 72], sMin: 65, vMin: 75 },
    { name: "Orange", hex: "#f97316", emoji: "🟠", hRange: [20, 42], sMin: 65, vMin: 75 },
    { name: "Purple", hex: "#a855f7", emoji: "🟣", hRange: [255, 300], sMin: 40, vMin: 40 },
  ];

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [order] = useState(() => [...colorTargets].sort(() => Math.random() - 0.5));
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const ROUNDS = 5;
  const target = order[round % order.length];

  function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = max === 0 ? 0 : (d / max) * 100, v = max * 100;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = h * 60; if (h < 0) h += 360;
    }
    return { h, s, v };
  }

  function detectColor() {
    if (!videoRef.current || !canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 80, 60);
    const data = ctx.getImageData(25, 15, 30, 30).data;
    const counts: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 4) {
      const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      for (const col of colorTargets) {
        const inRange = (col.hRange2
          ? (h >= col.hRange[0] && h <= col.hRange[1]) || (h >= col.hRange2[0] && h <= col.hRange2[1])
          : h >= col.hRange[0] && h <= col.hRange[1]);
        if (inRange && s >= col.sMin && v >= col.vMin) {
          counts[col.name] = (counts[col.name] ?? 0) + 1;
        }
      }
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 4 ? best[0] : null;
  }

  function scan() {
    if (scanning || done) return;
    setScanning(true);
    setFeedback(null);
    setTimeout(() => {
      const result = detectColor();
      setDetected(result);
      setScanning(false);
      const isCorrect = result === target.name;
      setFeedback(isCorrect ? "correct" : "wrong");
      if (isCorrect) {
        setScore(s => s + 1);
        setTimeout(() => {
          if (round + 1 >= ROUNDS) { setDone(true); fireConfetti(); }
          else { setRound(r => r + 1); setDetected(null); setFeedback(null); }
        }, 1200);
      }
    }, 800);
  }

  if (error) return (
    <div className="text-center space-y-4 py-6">
      <div className="text-5xl">📷</div>
      <p className="text-muted-foreground">Camera not available.</p>
      <Button variant="outline" onClick={onBack}>← Back</Button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
      <div className="text-6xl">{score >= 4 ? "🏆" : "🌟"}</div>
      <h3 className="text-2xl font-bold">Color Hunt Complete!</h3>
      <p className="text-4xl font-extrabold text-primary">{score}/{ROUNDS}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setRound(0); setScore(0); setDone(false); setFeedback(null); setDetected(null); }} className="kid-gradient text-white font-bold">Play Again!</Button>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🎨 Color Hunt</h2>
        <Badge className="bg-pink-100 text-pink-700">{score}/{ROUNDS}</Badge>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div className="kid-gradient h-2 rounded-full transition-all" style={{ width: `${(round / ROUNDS) * 100}%` }} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Round {round + 1} of {ROUNDS} — Find something this color:</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="w-14 h-14 rounded-full shadow-lg border-4 border-white" style={{ background: target.hex }} />
          <span className="text-3xl font-extrabold" style={{ color: target.hex }}>{target.name}</span>
          <span className="text-4xl">{target.emoji}</span>
        </div>
        <p className="text-xs text-muted-foreground">Hold a {target.name.toLowerCase()} object inside the white box!</p>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} width={80} height={60} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-20 h-20 border-4 rounded-xl transition-all ${
            scanning ? "border-yellow-400 animate-pulse"
            : feedback === "correct" ? "border-green-400"
            : feedback === "wrong" ? "border-red-400"
            : "border-white/70"}`} />
        </div>
        {!ready && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">Starting camera...</div>}
      </div>

      {feedback && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center font-bold text-lg ${feedback === "correct" ? "text-green-600" : "text-red-500"}`}>
          {feedback === "correct"
            ? `✅ ${detected}! That's correct! 🎉`
            : `❌ I see ${detected ?? "no color"} — show me ${target.name}!`}
        </motion.div>
      )}

      <div className="flex gap-2 justify-center">
        <Button onClick={scan} disabled={!ready || scanning} className="kid-gradient text-white font-bold px-8">
          {scanning ? "🔍 Detecting..." : "📷 Scan Color!"}
        </Button>
        {feedback === "wrong" && (
          <Button variant="outline" size="sm" onClick={() => { if (round + 1 >= ROUNDS) { setDone(true); } else { setRound(r => r + 1); setFeedback(null); setDetected(null); } }}>Skip →</Button>
        )}
      </div>
    </div>
  );
}

/* ─────────── THUMBS QUIZ CAMERA GAME ─────────── */
function ThumbsQuizGame({ onBack }: { onBack: () => void }) {
  const { videoRef, ready, error } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const questions = [
    { q: "The Sun is a star.", ans: true },
    { q: "Fish can breathe on land.", ans: false },
    { q: "2 + 2 = 4", ans: true },
    { q: "The Moon is bigger than the Earth.", ans: false },
    { q: "Dogs are mammals.", ans: true },
    { q: "Penguins can fly.", ans: false },
    { q: "Ice is frozen water.", ans: true },
    { q: "Spiders have 6 legs.", ans: false },
    { q: "Plants make food from sunlight.", ans: true },
    { q: "Elephants are the smallest mammals.", ans: false },
    { q: "The alphabet has 26 letters.", ans: true },
    { q: "Sharks are a type of bird.", ans: false },
  ];

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [order] = useState(() => [...questions].sort(() => Math.random() - 0.5).slice(0, 6));
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ gesture: string; correct: boolean } | null>(null);
  const [done, setDone] = useState(false);
  const q = order[round];

  function detectThumb(landmarks: Array<{ x: number; y: number }>): "up" | "down" | "unknown" {
    const diff = landmarks[4].y - landmarks[2].y;
    if (diff < -0.05) return "up";
    if (diff > 0.05) return "down";
    return "unknown";
  }

  async function scan() {
    if (!videoRef.current || scanning || done) return;
    setScanning(true);
    setFeedback(null);

    const result = await detectHandViaFlask(videoRef.current);
    setScanning(false);
    if (!result.landmarks) { setFeedback({ gesture: "no hand", correct: false }); return; }
    const gesture = detectThumb(result.landmarks);
    if (gesture === "unknown") { setFeedback({ gesture: "unclear", correct: false }); return; }
    const answer = gesture === "up";
    const correct = answer === q.ans;
    setFeedback({ gesture: gesture === "up" ? "👍 Thumbs Up!" : "👎 Thumbs Down!", correct });
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      if (round + 1 >= order.length) { setDone(true); if (score + (correct ? 1 : 0) >= 4) fireConfetti(); }
      else { setRound(r => r + 1); setFeedback(null); }
    }, 1200);
  }

  if (error) return (
    <div className="text-center space-y-4 py-6">
      <div className="text-5xl">📷</div>
      <p className="text-muted-foreground">Camera not available.</p>
      <Button variant="outline" onClick={onBack}>← Back</Button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
      <div className="text-6xl">{score >= 5 ? "🏆" : score >= 3 ? "🌟" : "💪"}</div>
      <h3 className="text-2xl font-bold">Quiz Done!</h3>
      <p className="text-4xl font-extrabold text-primary">{score}/{order.length}</p>
      <p className="text-muted-foreground">{score >= 5 ? "Genius! Perfect score!" : score >= 3 ? "Well done!" : "Keep learning!"}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setRound(0); setScore(0); setDone(false); setFeedback(null); }} className="kid-gradient text-white font-bold">Play Again!</Button>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">👍 Thumbs Quiz</h2>
        <Badge className="bg-green-100 text-green-700">{score}/{order.length}</Badge>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div className="kid-gradient h-2 rounded-full transition-all" style={{ width: `${(round / order.length) * 100}%` }} />
      </div>

      <motion.div
        key={round}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl border-2 border-border bg-card text-center"
      >
        <p className="text-sm text-muted-foreground mb-2">True or False?</p>
        <p className="text-xl font-bold">{q.q}</p>
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <div className="text-5xl">👍</div>
            <p className="text-sm font-semibold text-green-600">Thumbs Up = TRUE</p>
          </div>
          <div className="text-center">
            <div className="text-5xl">👎</div>
            <p className="text-sm font-semibold text-red-500">Thumbs Down = FALSE</p>
          </div>
        </div>
      </motion.div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <canvas ref={canvasRef} className="hidden" />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white font-bold animate-pulse">Reading gesture...</p>
          </div>
        )}
        {!ready && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">Starting camera...</div>}
      </div>

      {feedback && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center font-bold text-lg ${feedback.correct ? "text-green-600" : "text-red-500"}`}>
          {feedback.gesture === "no hand" ? "🤔 No hand detected — try again!"
           : feedback.gesture === "unclear" ? "🤚 Hold thumb clearly up or down!"
           : feedback.correct ? `✅ ${feedback.gesture} — Correct! 🎉`
           : `❌ ${feedback.gesture} — Wrong! Answer was ${q.ans ? "TRUE 👍" : "FALSE 👎"}`}
        </motion.div>
      )}

      <div className="flex justify-center">
        <Button onClick={scan} disabled={!ready || scanning} className="kid-gradient text-white font-bold px-8">
          {scanning ? "🔍 Reading..." : "📷 Show My Answer!"}
        </Button>
      </div>
    </div>
  );
}

/* ─────────── AIR DRAW GAME ─────────── */
const AIR_DRAW_PALETTE = ["#FF6B6B","#FF8E53","#FFD200","#4CAF50","#0DA2E7","#9B59B6","#FF4E91","#1B1B1B"];

const AD_GESTURES = [
  { emoji: "☝️", name: "Point",      desc: "Draw in the air",  bg: "bg-blue-50",   text: "text-blue-600"  },
  { emoji: "✌️", name: "Peace",      desc: "Change color",     bg: "bg-purple-50", text: "text-purple-600" },
  { emoji: "🖐️", name: "Open Palm",  desc: "Clear canvas",     bg: "bg-red-50",    text: "text-red-600"   },
  { emoji: "✊", name: "Fist",       desc: "Pause drawing",    bg: "bg-green-50",  text: "text-green-600" },
];

function AirDrawGame({ onBack }: { onBack: () => void }) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const drawRef      = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const lastPt       = useRef<{ x: number; y: number } | null>(null);
  const sizeRef      = useRef(8);
  const colorIdxRef  = useRef(0);
  const lastColorRef = useRef(0);
  const lastClearRef = useRef(0);
  const isFetchRef   = useRef(false);

  const [showGuide, setShowGuide] = useState(true);
  const [colorIdx,  setColorIdx]  = useState(0);
  const [mode,      setMode]      = useState<string>("idle");
  const [handOk,    setHandOk]    = useState(false);
  const [camReady,  setCamReady]  = useState(false);
  const [camError,  setCamError]  = useState(false);

  useEffect(() => {
    if (showGuide) return;
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamReady(true);
      })
      .catch(() => setCamError(true));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [showGuide]);

  useEffect(() => {
    if (!camReady) return;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = 320; captureCanvas.height = 240;
    const captureCtx = captureCanvas.getContext("2d")!;
    let active = true;

    const interval = setInterval(async () => {
      if (!active || isFetchRef.current || !videoRef.current) return;
      const vid = videoRef.current;
      if (vid.readyState < 2) return;
      captureCtx.drawImage(vid, 0, 0, 320, 240);
      const frame = captureCanvas.toDataURL("image/jpeg", 0.7);
      isFetchRef.current = true;
      try {
        const res = await fetch("/api/hands/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
          signal: AbortSignal.timeout(2500),
        });
        const data = await res.json();
        if (!active) return;
        const canvas = drawRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        setHandOk(!!data.handDetected);
        if (!data.handDetected || !data.landmarks) { lastPt.current = null; setMode("idle"); return; }

        const lms   = data.landmarks;
        const tip   = lms[8];
        const cx    = (1 - tip.x) * canvas.width;
        const cy    = tip.y * canvas.height;
        const curColor = AIR_DRAW_PALETTE[colorIdxRef.current];
        const gesture  = detectDrawGesture(lms);
        setMode(gesture);

        if (gesture === "draw") {
          if (lastPt.current) {
            ctx.beginPath();
            ctx.moveTo(lastPt.current.x, lastPt.current.y);
            ctx.lineTo(cx, cy);
            ctx.strokeStyle = curColor;
            ctx.lineWidth   = sizeRef.current;
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.globalCompositeOperation = "source-over";
            ctx.stroke();
          }
          lastPt.current = { x: cx, y: cy };
        } else if (gesture === "color-next") {
          const now = Date.now();
          if (now - lastColorRef.current > 900) {
            lastColorRef.current = now;
            const next = (colorIdxRef.current + 1) % AIR_DRAW_PALETTE.length;
            colorIdxRef.current = next;
            setColorIdx(next);
          }
          lastPt.current = null;
        } else if (gesture === "clear") {
          const now = Date.now();
          if (now - lastClearRef.current > 1800) {
            lastClearRef.current = now;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          lastPt.current = null;
        } else {
          lastPt.current = null;
        }
      } catch { /* ignore network errors */ }
      finally { isFetchRef.current = false; }
    }, 60);

    return () => { active = false; clearInterval(interval); };
  }, [camReady]);

  const MODE_LABELS: Record<string, string> = {
    draw: "✏️ Drawing", "color-next": "🎨 Changing Color…",
    clear: "🗑️ Clearing…", eraser: "⏸️ Paused", penup: "⏸️ Paused",
  };
  const MODE_BG: Record<string, string> = {
    draw: AIR_DRAW_PALETTE[colorIdx], "color-next": "#9B59B6",
    clear: "#ff4757", eraser: "#888", penup: "#ffa500",
  };

  /* ── Gesture Guide Popup ── */
  if (showGuide) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">✍️ Air Draw</h2>
        <div className="w-16" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-3xl shadow-xl p-6 mx-auto max-w-sm"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
      >
        <button
          onClick={() => setShowGuide(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition-colors"
        >
          ×
        </button>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">✋</div>
          <h3 className="font-heading text-2xl font-bold text-gray-800">Hand Gestures</h3>
          <p className="text-muted-foreground text-sm mt-1">Use these hand signs to control the game!</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {AD_GESTURES.map((g) => (
            <div key={g.name} className={`${g.bg} rounded-2xl p-4 flex flex-col items-center text-center gap-1`}>
              <div className="text-4xl mb-1">{g.emoji}</div>
              <div className={`font-bold text-sm ${g.text}`}>{g.name}</div>
              <div className="text-xs text-gray-500">{g.desc}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowGuide(false)}
          className="w-full kid-gradient text-white font-bold py-3.5 rounded-2xl text-base hover:opacity-90 transition-all shadow-md"
        >
          Got it! Let's go! 🚀
        </button>
      </motion.div>
    </div>
  );

  if (camError) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">✍️ Air Draw</h2>
        <div className="w-16" />
      </div>
      <div className="text-center space-y-4 py-12">
        <div className="text-5xl">📷</div>
        <p className="text-muted-foreground">Camera not available. Please allow camera access and try again.</p>
        <Button variant="outline" onClick={() => { setCamError(false); setShowGuide(true); }}>← Back to Guide</Button>
      </div>
    </div>
  );

  /* ── Main Game ── */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">✍️ Air Draw</h2>
        <button
          onClick={() => setShowGuide(true)}
          className="text-xs px-3 py-1.5 rounded-full bg-[#0DA2E7]/10 text-[#0DA2E7] font-bold hover:bg-[#0DA2E7]/20 transition-colors"
        >
          ? Guide
        </button>
      </div>

      <div className="flex justify-center min-h-[26px]">
        {mode !== "idle" && (
          <motion.span key={mode} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold px-4 py-1 rounded-full text-white shadow-sm"
            style={{ background: MODE_BG[mode] ?? "#888" }}>
            {MODE_LABELS[mode] ?? ""}
          </motion.span>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black mx-auto shadow-xl"
           style={{ maxWidth: 540, aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <canvas ref={drawRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />
        {!camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}
        {camReady && !handOk && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full font-medium">
            ✋ Show your hand to start drawing
          </div>
        )}
        <div className="gesture-hud">
          {AD_GESTURES.map((g, i) => {
            const keys = ["draw", "color-next", "clear", "eraser"];
            return (
              <div key={g.name} className={`gesture-hud-item ${mode === keys[i] ? "active-gesture" : ""}`}>
                <span>{g.emoji}</span>
                <span>{g.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <span className="text-[11px] text-muted-foreground font-semibold mr-1">✌️ Cycle color:</span>
        {AIR_DRAW_PALETTE.map((c, i) => (
          <button key={c}
            className={`rounded-full border-2 transition-all duration-150 ${i === colorIdx ? "scale-125 border-white shadow-md" : "border-transparent opacity-60 hover:opacity-100 hover:scale-110"}`}
            style={{ width: 26, height: 26, background: c, outline: c === "#1B1B1B" && i !== colorIdx ? "1px solid #d1d5db" : "none" }}
            onClick={() => { colorIdxRef.current = i; setColorIdx(i); }}
            title={`Color ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────── COLOR FILL GAME ─────────── */
const CF_SHAPES_LIST = [
  { id: 0, cx: 107, cy: 120, r: 72, color: "#FF6B6B", emoji: "🌸" },
  { id: 1, cx: 320, cy: 120, r: 72, color: "#0DA2E7", emoji: "⭐" },
  { id: 2, cx: 533, cy: 120, r: 72, color: "#4CAF50", emoji: "🌿" },
  { id: 3, cx: 107, cy: 360, r: 72, color: "#FFD200", emoji: "☀️" },
  { id: 4, cx: 320, cy: 360, r: 72, color: "#FF4E91", emoji: "❤️" },
  { id: 5, cx: 533, cy: 360, r: 72, color: "#9B59B6", emoji: "🔮" },
];
const CF_DWELL_MS = 1800;

const HP_PALETTE = ["#FF4757","#FF7F50","#FFD700","#2ECC71","#0DA2E7","#7B5EA7","#FF69B4","#1a1a2e","#ffffff"];
const HP_PALETTE_NAMES = ["Red","Orange","Yellow","Green","Blue","Purple","Pink","Black","White"];

function detectDrawGesture(lms: any[]): "draw"|"eraser"|"penup"|"color-next"|"clear"|"idle" {
  const up = [
    lms[8].y  < lms[6].y,
    lms[12].y < lms[10].y,
    lms[16].y < lms[14].y,
    lms[20].y < lms[18].y,
  ];
  const thumbUp = lms[4].y < lms[2].y;
  const pinch   = Math.hypot(lms[8].x - lms[4].x, lms[8].y - lms[4].y) < 0.065;
  const upCount = up.filter(Boolean).length;
  if (pinch)                                                         return "penup";
  if (upCount === 0 && !thumbUp)                                     return "eraser";
  if (upCount >= 4)                                                  return "clear";
  if (up[0] && up[1] && !up[2] && !up[3] && !thumbUp)               return "color-next";
  if (up[0] && !up[1] && !up[2] && !up[3] && !thumbUp)              return "draw";
  return "idle";
}

function ColorFillGame({ onBack }: { onBack: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const drawRef    = useRef<HTMLCanvasElement>(null);
  const uiRef      = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const lastPt     = useRef<{ x: number; y: number } | null>(null);
  const lastColorRef = useRef<number>(0);
  const lastClearRef = useRef<number>(0);
  const colorIdxRef  = useRef<number>(0);
  const isFetchRef   = useRef(false);

  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [mode,     setMode]     = useState<string>("idle");
  const [handOk,   setHandOk]   = useState(false);

  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamReady(true);
      })
      .catch(() => setCamError(true));
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!camReady) return;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = 320; captureCanvas.height = 240;
    const captureCtx = captureCanvas.getContext("2d")!;
    let active = true;

    const interval = setInterval(async () => {
      if (!active || isFetchRef.current || !videoRef.current) return;
      const vid = videoRef.current;
      if (vid.readyState < 2) return;
      captureCtx.drawImage(vid, 0, 0, 320, 240);
      const frame = captureCanvas.toDataURL("image/jpeg", 0.7);
      isFetchRef.current = true;
      try {
        const res = await fetch("/api/hands/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
          signal: AbortSignal.timeout(2500),
        });
        const data = await res.json();
        if (!active) return;
        const ui   = uiRef.current;
        const draw = drawRef.current;
        if (!ui || !draw) return;
        const uiCtx   = ui.getContext("2d");
        const drawCtx = draw.getContext("2d");
        if (!uiCtx || !drawCtx) return;
        uiCtx.clearRect(0, 0, ui.width, ui.height);
        setHandOk(!!data.handDetected);
        if (!data.handDetected || !data.landmarks) { lastPt.current = null; setMode("idle"); return; }

        const lms = data.landmarks;
        const gesture = detectDrawGesture(lms);
        setMode(gesture);
        const tip = lms[8];
        const cx  = (1 - tip.x) * ui.width;
        const cy  = tip.y * ui.height;
        const curColor = HP_PALETTE[colorIdxRef.current];

        if (gesture === "penup") {
          lastPt.current = null;
        } else if (gesture === "eraser") {
          drawCtx.save();
          drawCtx.globalCompositeOperation = "destination-out";
          drawCtx.beginPath(); drawCtx.arc(cx, cy, 32, 0, Math.PI * 2); drawCtx.fill();
          drawCtx.restore();
          lastPt.current = { x: cx, y: cy };
        } else if (gesture === "clear") {
          const now = Date.now();
          if (now - lastClearRef.current > 1800) {
            lastClearRef.current = now;
            drawCtx.clearRect(0, 0, draw.width, draw.height);
          }
          lastPt.current = null;
        } else if (gesture === "color-next") {
          const now = Date.now();
          if (now - lastColorRef.current > 900) {
            lastColorRef.current = now;
            const next = (colorIdxRef.current + 1) % HP_PALETTE.length;
            colorIdxRef.current = next; setColorIdx(next);
          }
          lastPt.current = null;
        } else if (gesture === "draw") {
          if (lastPt.current) {
            drawCtx.beginPath();
            drawCtx.moveTo(lastPt.current.x, lastPt.current.y);
            drawCtx.lineTo(cx, cy);
            drawCtx.strokeStyle = curColor; drawCtx.lineWidth = 10;
            drawCtx.lineCap = "round"; drawCtx.lineJoin = "round";
            drawCtx.globalCompositeOperation = "source-over";
            drawCtx.stroke();
          }
          lastPt.current = { x: cx, y: cy };
        } else {
          lastPt.current = null;
        }

        const CURSOR_COLOR: Record<string, string> = {
          draw: curColor, eraser: "rgba(200,200,200,0.85)", penup: "#ffa500",
          "color-next": "#ffd700", clear: "#ff4757", idle: "rgba(255,255,255,0.5)",
        };
        const CURSOR_R: Record<string, number> = { eraser: 32, draw: 9, penup: 9, "color-next": 12, clear: 14, idle: 7 };
        const cr = CURSOR_R[gesture] ?? 7;
        const cc = CURSOR_COLOR[gesture] ?? "rgba(255,255,255,0.5)";
        uiCtx.beginPath(); uiCtx.arc(cx, cy, cr + 5, 0, Math.PI * 2);
        uiCtx.fillStyle = "rgba(255,255,255,0.18)"; uiCtx.fill();
        uiCtx.beginPath(); uiCtx.arc(cx, cy, cr, 0, Math.PI * 2);
        uiCtx.fillStyle = cc; uiCtx.fill();
        uiCtx.strokeStyle = "rgba(255,255,255,0.75)"; uiCtx.lineWidth = 2; uiCtx.stroke();
        uiCtx.beginPath(); uiCtx.arc(cx, cy, 3, 0, Math.PI * 2);
        uiCtx.fillStyle = "#fff"; uiCtx.fill();
      } catch { /* ignore */ }
      finally { isFetchRef.current = false; }
    }, 60);

    return () => { active = false; clearInterval(interval); };
  }, [camReady]);

  const MODE_LABELS: Record<string, string> = {
    draw: "✏️ Drawing", eraser: "🧹 Erasing", clear: "🗑️ Clearing…",
    penup: "✋ Pen Up", "color-next": "🎨 Changing Color…",
  };
  const MODE_BG: Record<string, string> = {
    draw: HP_PALETTE[colorIdx], eraser: "#888", clear: "#ff4757",
    penup: "#ffa500", "color-next": "#f59e0b",
  };

  const HUD_ITEMS = [
    { emoji: "☝️", label: "Draw",    key: "draw" },
    { emoji: "✌️", label: "Color",   key: "color-next" },
    { emoji: "🖐️", label: "Clear",   key: "clear" },
    { emoji: "🤏", label: "Pen Up",  key: "penup" },
    { emoji: "✊", label: "Erase",   key: "eraser" },
  ];

  if (camError) return (
    <div className="text-center space-y-4 py-8">
      <div className="text-5xl">📷</div>
      <p className="text-muted-foreground">Camera not available.</p>
      <Button variant="outline" onClick={onBack}>← Back to Games</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🎨 Hand Painter</h2>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-white shadow ring-2 ring-[#0DA2E7]/30 transition-all duration-200"
               style={{ background: HP_PALETTE[colorIdx] }} />
          <span className="text-xs font-bold text-muted-foreground">{HP_PALETTE_NAMES[colorIdx]}</span>
        </div>
      </div>

      <div className="flex justify-center min-h-[28px]">
        {mode !== "idle" && (
          <motion.span key={mode} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold px-4 py-1 rounded-full text-white shadow-sm"
            style={{ background: MODE_BG[mode] ?? "#888" }}>
            {MODE_LABELS[mode] ?? ""}
          </motion.span>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black mx-auto shadow-xl"
           style={{ maxWidth: 540, aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <canvas ref={drawRef} width={640} height={480}
                className="absolute inset-0 w-full h-full pointer-events-none" />
        <canvas ref={uiRef}   width={640} height={480}
                className="absolute inset-0 w-full h-full pointer-events-none" />

        {!camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}
        {camReady && !handOk && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full whitespace-nowrap font-medium">
            ✋ Show your hand to start painting
          </div>
        )}

        <div className="gesture-hud">
          {HUD_ITEMS.map(g => (
            <div key={g.key} className={`gesture-hud-item ${mode === g.key ? "active-gesture" : ""}`}>
              <span>{g.emoji}</span>
              <span>{g.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <span className="text-[11px] text-muted-foreground font-semibold mr-1">Tap or ✌️ to change:</span>
        {HP_PALETTE.map((c, i) => (
          <button key={c}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-1 ${i === colorIdx ? "scale-125 border-white shadow-md" : "border-transparent opacity-60 hover:opacity-90 hover:scale-110"}`}
            style={{ background: c }}
            onClick={() => { colorIdxRef.current = i; setColorIdx(i); }}
            title={HP_PALETTE_NAMES[i]}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────── GESTURE MATCH GAME ─────────── */
const GM_GESTURES = [
  { id: "fist",     emoji: "✊", name: "Fist",       desc: "Close all fingers tightly into a fist" },
  { id: "open",     emoji: "🖐️", name: "Open Hand",  desc: "Spread all five fingers wide open" },
  { id: "peace",    emoji: "✌️", name: "Peace",      desc: "Index and middle fingers up, rest down" },
  { id: "thumbsup", emoji: "👍", name: "Thumbs Up",  desc: "Only your thumb pointing up" },
  { id: "point",    emoji: "☝️", name: "Pointing",   desc: "Only your index finger pointing up" },
  { id: "rock",     emoji: "🤘", name: "Rock On",    desc: "Index and pinky up, middle and ring down" },
] as const;
type GestureId = typeof GM_GESTURES[number]["id"];

function classifyGesture(lms: any[]): GestureId | null {
  const up = [
    lms[8].y < lms[6].y,
    lms[12].y < lms[10].y,
    lms[16].y < lms[14].y,
    lms[20].y < lms[18].y,
  ];
  const thumbUp = lms[4].y < lms[2].y;
  const n = up.filter(Boolean).length;
  if (n === 0 && !thumbUp) return "fist";
  if (n >= 4)              return "open";
  if (up[0] && !up[1] && !up[2] && !up[3] && !thumbUp) return "point";
  if (up[0] && up[1]  && !up[2] && !up[3] && !thumbUp) return "peace";
  if (!up[0] && !up[1] && !up[2] && !up[3] && thumbUp) return "thumbsup";
  if (up[0] && !up[1] && !up[2] && up[3])              return "rock";
  return null;
}

function GestureMatchGame({ onBack }: { onBack: () => void }) {
  const { videoRef, ready, error } = useCamera();
  const dwellRef = useRef<{ gesture: GestureId; startTime: number } | null>(null);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const isFetchRef = useRef(false);

  const ROUNDS = 6;
  const [round,     setRound]     = useState(0);
  const [score,     setScore]     = useState(0);
  const [done,      setDone]      = useState(false);
  const [detected,  setDetected]  = useState<GestureId | null>(null);
  const [dwellPct,  setDwellPct]  = useState(0);
  const [targets]   = useState<GestureId[]>(() => {
    const arr = GM_GESTURES.map(g => g.id) as GestureId[];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  });

  const target    = targets[Math.min(round, ROUNDS - 1)];
  const targetDef = GM_GESTURES.find(g => g.id === target)!;
  const detDef    = GM_GESTURES.find(g => g.id === detected);

  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    if (!ready) return;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = 320; captureCanvas.height = 240;
    const captureCtx = captureCanvas.getContext("2d")!;
    let active = true;

    const interval = setInterval(async () => {
      if (!active || isFetchRef.current || !videoRef.current) return;
      const vid = videoRef.current;
      if (vid.readyState < 2) return;
      captureCtx.drawImage(vid, 0, 0, 320, 240);
      const frame = captureCanvas.toDataURL("image/jpeg", 0.7);
      isFetchRef.current = true;
      try {
        const res = await fetch("/api/hands/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
          signal: AbortSignal.timeout(2500),
        });
        const data = await res.json();
        if (!active) return;
        if (!data.handDetected || !data.landmarks) {
          setDetected(null); dwellRef.current = null; setDwellPct(0); return;
        }
        const gesture = classifyGesture(data.landmarks);
        setDetected(gesture);
        const cur = targets[roundRef.current] ?? targets[0];
        if (gesture === cur) {
          if (!dwellRef.current || dwellRef.current.gesture !== gesture) dwellRef.current = { gesture, startTime: Date.now() };
          const pct = Math.min((Date.now() - dwellRef.current.startTime) / 1500 * 100, 100);
          setDwellPct(pct);
          if (pct >= 100) {
            dwellRef.current = null; setDwellPct(0);
            const nr = roundRef.current + 1;
            const ns = scoreRef.current + 1;
            if (nr >= ROUNDS) { setScore(ns); setRound(nr); setDone(true); if (ns >= ROUNDS - 1) fireConfetti(); }
            else              { setScore(ns); setRound(nr); }
          }
        } else { dwellRef.current = null; setDwellPct(0); }
      } catch { /* ignore */ }
      finally { isFetchRef.current = false; }
    }, 80);

    return () => { active = false; clearInterval(interval); };
  }, [ready]);

  if (error) return (
    <div className="text-center space-y-4 py-8">
      <div className="text-5xl">📷</div>
      <p className="text-muted-foreground">Camera not available.</p>
      <Button variant="outline" onClick={onBack}>← Back</Button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
      <div className="text-6xl">{score >= 5 ? "🏆" : score >= 3 ? "⭐" : "💪"}</div>
      <h3 className="text-2xl font-bold">Gesture Master!</h3>
      <p className="text-5xl font-extrabold text-primary">{score}/{ROUNDS}</p>
      <p className="text-muted-foreground">{score >= 5 ? "Perfect! You're a hand gesture pro!" : score >= 3 ? "Great job!" : "Keep practicing!"}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setRound(0); setScore(0); setDone(false); setDwellPct(0); setDetected(null); dwellRef.current = null; roundRef.current = 0; scoreRef.current = 0; }} className="kid-gradient text-white font-bold">
          Play Again!
        </Button>
        <Button variant="outline" onClick={onBack}>← Back</Button>
      </div>
    </motion.div>
  );

  const CIRC = 2 * Math.PI * 44;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-extrabold">🖐️ Gesture Match</h2>
        <Badge className="bg-purple-100 text-purple-700 font-bold">{score}/{ROUNDS}</Badge>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div className="kid-gradient h-2 rounded-full transition-all" style={{ width: `${(round / ROUNDS) * 100}%` }} />
      </div>

      {/* Layout: video left, target right */}
      <div className="flex gap-4 items-center flex-wrap justify-center">
        {/* Video */}
        <div className="relative rounded-xl overflow-hidden bg-black flex-shrink-0" style={{ width: 260, aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
          <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${detected ? "bg-green-500/90 text-white" : "bg-black/60 text-white"}`}>
            {detected ? `${detDef?.emoji ?? "?"} ${detDef?.name ?? "..."}` : "✋ Show your hand"}
          </div>
        </div>

        {/* Target gesture with SVG dwell ring */}
        <div className="flex flex-col items-center gap-2 text-center flex-1 min-w-[160px]">
          <p className="text-sm text-muted-foreground font-semibold">Make this gesture:</p>
          <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
            <svg width="110" height="110" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="55" cy="55" r="48" fill="none" stroke="#e5e7eb" strokeWidth="7" />
              <circle cx="55" cy="55" r="48" fill="none" stroke="#0DA2E7" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - dwellPct / 100)}`}
                style={{ transition: "stroke-dashoffset 0.05s linear" }} />
            </svg>
            <div className="text-6xl z-10 select-none">{targetDef?.emoji}</div>
          </div>
          <p className="font-extrabold text-lg leading-tight">{targetDef?.name}</p>
          <p className="text-xs text-muted-foreground max-w-[180px] leading-snug">{targetDef?.desc}</p>
          {dwellPct > 5 && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 rounded-full bg-gray-200 w-28 overflow-hidden">
                <div className="h-2 rounded-full kid-gradient transition-all" style={{ width: `${dwellPct}%` }} />
              </div>
              <span className="text-xs text-primary font-bold">{Math.round(dwellPct)}%</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Round {round + 1} of {ROUNDS} · Hold the correct gesture for <strong>1.5 seconds</strong> to score!
      </p>
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
  { id: "finger-counting-cam", title: "Finger Count",   emoji: "✋", desc: "Hold up the right number of fingers!",              color: "from-[#5B2D8E] to-[#9B59B6]",   badge: "📷 Camera" },
  { id: "color-hunt-cam",      title: "Color Hunt",      emoji: "🎨", desc: "Find objects matching the shown color!",             color: "from-[#FF4E91] to-[#FF8E53]",   badge: "📷 Camera" },
  { id: "thumbs-quiz-cam",     title: "Thumbs Quiz",     emoji: "👍", desc: "Answer questions with thumbs up/down!",              color: "from-[#0DA2E7] to-[#26d0ce]",   badge: "📷 Camera" },
  { id: "air-draw",            title: "Air Draw",        emoji: "✍️", desc: "Draw with your finger in the air! Pinch to lift pen.", color: "from-[#FF6B6B] to-[#FF8E53]", badge: "📷 Camera" },
  { id: "color-fill",          title: "Hand Painter",    emoji: "🎨", desc: "Use hand gestures to draw, erase, and change colors!", color: "from-[#4CAF50] to-[#0DA2E7]",   badge: "📷 Camera" },
  { id: "gesture-match",       title: "Gesture Match",   emoji: "🖐️", desc: "Match the hand gesture on screen — hold to score!", color: "from-[#9B59B6] to-[#8E44AD]",   badge: "📷 Camera" },
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
                  {activeGame === "finger-counting-cam" && <FingerCountingCameraGame onBack={goBack} />}
                  {activeGame === "color-hunt-cam"      && <ColorHuntCameraGame onBack={goBack} />}
                  {activeGame === "thumbs-quiz-cam"     && <ThumbsQuizGame onBack={goBack} />}
                  {activeGame === "air-draw"            && <AirDrawGame onBack={goBack} />}
                  {activeGame === "color-fill"          && <ColorFillGame onBack={goBack} />}
                  {activeGame === "gesture-match"       && <GestureMatchGame onBack={goBack} />}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
