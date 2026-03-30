import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import confetti from "canvas-confetti";

interface ExperimentProps {
  subject: string;
  lessonTitle: string;
  lessonOrder: number;
}

interface Experiment {
  id: string;
  title: string;
  component: React.FC<{ onComplete: () => void; lessonTitle?: string }>;
}

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}

/* ─────────────── NUMBER LINE / MATH ─────────────── */
function NumberLineExperiment({ onComplete, lessonTitle = "" }: { onComplete: () => void; lessonTitle?: string }) {
  const allProblems = [
    // Addition
    { a: 3,  b: 5,  op: "+" as const }, { a: 6,  b: 7,  op: "+" as const },
    { a: 4,  b: 9,  op: "+" as const }, { a: 2,  b: 11, op: "+" as const },
    { a: 9,  b: 6,  op: "+" as const }, { a: 5,  b: 8,  op: "+" as const },
    { a: 7,  b: 7,  op: "+" as const }, { a: 13, b: 4,  op: "+" as const },
    // Subtraction
    { a: 8,  b: 4,  op: "-" as const }, { a: 12, b: 5,  op: "-" as const },
    { a: 15, b: 7,  op: "-" as const }, { a: 20, b: 8,  op: "-" as const },
    { a: 14, b: 6,  op: "-" as const }, { a: 18, b: 9,  op: "-" as const },
    { a: 11, b: 4,  op: "-" as const }, { a: 16, b: 7,  op: "-" as const },
    // Multiplication
    { a: 3,  b: 4,  op: "×" as const }, { a: 5,  b: 3,  op: "×" as const },
    { a: 6,  b: 2,  op: "×" as const }, { a: 4,  b: 4,  op: "×" as const },
    { a: 7,  b: 3,  op: "×" as const }, { a: 8,  b: 2,  op: "×" as const },
  ];

  const lc = lessonTitle.toLowerCase();
  const problems = lc.includes("addition") || lc.includes("adding") || lc.includes("add ")
    ? allProblems.filter(p => p.op === "+")
    : lc.includes("subtraction") || lc.includes("subtract") || lc.includes("minus") || lc.includes("taking away")
    ? allProblems.filter(p => p.op === "-")
    : lc.includes("multipli") || lc.includes("times table") || lc.includes("multiply")
    ? allProblems.filter(p => p.op === "×")
    : allProblems;

  const [problem] = useState(() => problems[Math.floor(Math.random() * problems.length)]);
  const answer = problem.op === "+" ? problem.a + problem.b
    : problem.op === "-" ? problem.a - problem.b
    : problem.a * problem.b;
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);

  const [options] = useState(() => {
    const offsets = [-3, -1, 1, 2].sort(() => Math.random() - 0.5);
    const pool = new Set([answer, ...offsets.map(o => answer + o)]);
    while (pool.size < 4) pool.add(answer + Math.floor(Math.random() * 6) - 3);
    return Array.from(pool).slice(0, 4).sort(() => Math.random() - 0.5);
  });

  function handleSelect(n: number) {
    if (done) return;
    setSelected(n);
    if (n === answer) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setShake(true);
      setTimeout(() => { setShake(false); setSelected(null); }, 800);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">
        What is {problem.a} {problem.op} {problem.b}?
      </div>
      <motion.div className="flex gap-3 justify-center flex-wrap"
        animate={shake ? { x: [-6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrect = isSelected && opt === answer;
          const isWrong = isSelected && opt !== answer;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={done}
              className={`w-16 h-16 text-2xl font-bold rounded-xl transition-all ${
                isCorrect ? "bg-green-500 text-white scale-110 shadow-lg shadow-green-200"
                : isWrong ? "bg-red-400 text-white scale-90"
                : "bg-gradient-to-br from-purple-500 to-cyan-500 text-white hover:scale-105 hover:shadow-lg"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </motion.div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 Correct! Great math skills!</div>}
      {shake && <div className="text-red-500 font-semibold text-sm">Not quite — try again! 💪</div>}
    </div>
  );
}

/* ─────────────── SHAPE / COLOR ─────────────── */
function ShapeColorExperiment({ onComplete }: { onComplete: () => void }) {
  const items = [
    { shape: "🔴", name: "Red Circle" }, { shape: "🔵", name: "Blue Circle" },
    { shape: "🟡", name: "Yellow Circle" }, { shape: "🟢", name: "Green Circle" },
    { shape: "🟠", name: "Orange Circle" }, { shape: "🟣", name: "Purple Circle" },
    { shape: "⬛", name: "Black Square" }, { shape: "⬜", name: "White Square" },
  ];
  const [pool] = useState(() => items.sort(() => Math.random() - 0.5).slice(0, 6));
  const [target] = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [wrongClicks, setWrongClicks] = useState<string[]>([]);

  function handleSelect(name: string) {
    if (done) return;
    setSelected(name);
    if (name === target.name) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setWrongClicks(prev => [...prev, name]);
      setTimeout(() => setSelected(null), 600);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">Tap the <span className="text-primary">{target.name}</span>!</div>
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {pool.map((item) => {
          const isWrong = wrongClicks.includes(item.name) && item.name !== target.name;
          return (
            <button
              key={item.name}
              onClick={() => handleSelect(item.name)}
              className={`text-6xl p-3 rounded-2xl transition-all ${
                selected === item.name && item.name === target.name
                  ? "bg-green-100 scale-110 ring-4 ring-green-400"
                  : isWrong
                  ? "bg-red-100 opacity-40 scale-90"
                  : "hover:bg-secondary hover:scale-105"
              }`}
            >
              {item.shape}
            </button>
          );
        })}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 You found it!</div>}
    </div>
  );
}

/* ─────────────── WORD MATCH / OPPOSITES ─────────────── */
function WordMatchExperiment({ onComplete }: { onComplete: () => void }) {
  const pairs = [
    { word: "Big", opposite: "Small" }, { word: "Hot", opposite: "Cold" },
    { word: "Fast", opposite: "Slow" }, { word: "Happy", opposite: "Sad" },
    { word: "Day", opposite: "Night" }, { word: "Up", opposite: "Down" },
    { word: "Old", opposite: "Young" }, { word: "Empty", opposite: "Full" },
    { word: "Loud", opposite: "Quiet" }, { word: "Hard", opposite: "Soft" },
    { word: "Clean", opposite: "Dirty" }, { word: "Open", opposite: "Closed" },
  ];
  const [pair] = useState(() => pairs[Math.floor(Math.random() * pairs.length)]);
  const [options] = useState(() => {
    const wrongs = pairs.filter((p) => p !== pair).map((p) => p.opposite);
    return [pair.opposite, ...wrongs.sort(() => Math.random() - 0.5).slice(0, 3)]
      .sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [wrongAns, setWrongAns] = useState<string | null>(null);

  function handleSelect(opt: string) {
    if (done) return;
    setSelected(opt);
    if (opt === pair.opposite) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setWrongAns(opt);
      setTimeout(() => { setSelected(null); setWrongAns(null); }, 800);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">
        What is the opposite of <span className="text-primary">"{pair.word}"</span>?
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={done}
            className={`h-14 text-lg font-semibold rounded-xl transition-all ${
              done && opt === pair.opposite
                ? "bg-green-500 text-white scale-105"
                : wrongAns === opt
                ? "bg-red-400 text-white scale-95"
                : "bg-gradient-to-br from-purple-500 to-cyan-500 text-white hover:scale-105 hover:shadow-lg"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 That's right!</div>}
      {wrongAns && <div className="text-red-500 font-semibold text-sm">❌ Not quite — think of the opposite! 🤔</div>}
    </div>
  );
}

/* ─────────────── NUMBER PATTERN (MATH-SPECIFIC) ─────────────── */
function MathPatternExperiment({ onComplete }: { onComplete: () => void }) {
  const sequences = [
    { seq: [2, 4, 6, 8], next: 10, rule: "counting by 2s", distractors: [9, 11, 12] },
    { seq: [5, 10, 15, 20], next: 25, rule: "counting by 5s", distractors: [22, 24, 30] },
    { seq: [1, 3, 5, 7], next: 9, rule: "odd numbers", distractors: [8, 10, 11] },
    { seq: [10, 20, 30, 40], next: 50, rule: "counting by 10s", distractors: [45, 55, 60] },
    { seq: [3, 6, 9, 12], next: 15, rule: "multiples of 3", distractors: [13, 14, 16] },
    { seq: [1, 4, 9, 16], next: 25, rule: "perfect squares", distractors: [20, 22, 30] },
    { seq: [20, 18, 16, 14], next: 12, rule: "counting down by 2", distractors: [10, 11, 13] },
    { seq: [100, 90, 80, 70], next: 60, rule: "counting down by 10", distractors: [55, 65, 75] },
    { seq: [2, 4, 8, 16], next: 32, rule: "doubling", distractors: [20, 24, 30] },
    { seq: [1, 2, 4, 7], next: 11, rule: "adding 1, 2, 3…", distractors: [9, 10, 12] },
    { seq: [50, 45, 40, 35], next: 30, rule: "counting down by 5", distractors: [28, 32, 25] },
    { seq: [4, 8, 12, 16], next: 20, rule: "multiples of 4", distractors: [18, 19, 22] },
  ];

  const [seq] = useState(() => sequences[Math.floor(Math.random() * sequences.length)]);
  const [options] = useState(() =>
    [seq.next, ...seq.distractors].sort(() => Math.random() - 0.5)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [wrongPick, setWrongPick] = useState<number | null>(null);

  function handleSelect(opt: number) {
    if (done) return;
    setSelected(opt);
    if (opt === seq.next) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setWrongPick(opt);
      setTimeout(() => { setSelected(null); setWrongPick(null); }, 800);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">What number comes next?</div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {seq.seq.map((num, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.15, type: "spring" }}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-2xl font-extrabold flex items-center justify-center shadow-md"
          >
            {num}
          </motion.div>
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: seq.seq.length * 0.15 }}
          className="w-14 h-14 rounded-xl border-2 border-dashed border-primary text-primary text-2xl font-extrabold flex items-center justify-center"
        >
          ?
        </motion.div>
      </div>
      <p className="text-sm text-muted-foreground">Hint: {seq.rule}</p>
      <div className="flex gap-4 justify-center flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={done}
            className={`w-16 h-16 text-2xl font-bold rounded-xl transition-all border-2 ${
              done && opt === seq.next
                ? "bg-green-100 ring-4 ring-green-400 scale-110 border-green-400 text-green-700"
                : wrongPick === opt
                ? "bg-red-100 scale-90 border-red-400 text-red-600"
                : "border-border hover:bg-secondary hover:scale-105"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 Correct! Pattern complete!</div>}
      {wrongPick && <div className="text-red-500 font-semibold text-sm">❌ Not quite — look at the rule: {seq.rule}! 🔍</div>}
    </div>
  );
}

/* ─────────────── PATTERN COMPLETE (Emoji — for non-math subjects) ─────────────── */
function PatternCompleteExperiment({ onComplete }: { onComplete: () => void }) {
  const patterns = [
    { seq: ["🌟", "🌙", "🌟", "🌙"], next: "🌟", distractors: ["🌙", "⭐", "☀️"] },
    { seq: ["🍎", "🍊", "🍎", "🍊"], next: "🍎", distractors: ["🍊", "🍋", "🍇"] },
    { seq: ["🐱", "🐶", "🐱", "🐶"], next: "🐱", distractors: ["🐶", "🐭", "🐸"] },
    { seq: ["🌈", "⭐", "🌈", "⭐"], next: "🌈", distractors: ["⭐", "🌙", "🔥"] },
    { seq: ["🎵", "🎶", "🎵", "🎶"], next: "🎵", distractors: ["🎶", "🎸", "🎺"] },
    { seq: ["🦋", "🌸", "🦋", "🌸"], next: "🦋", distractors: ["🌸", "🌺", "🌻"] },
    { seq: ["🐠", "🐙", "🐠", "🐙"], next: "🐠", distractors: ["🐙", "🦈", "🐬"] },
  ];
  const [pattern] = useState(() => patterns[Math.floor(Math.random() * patterns.length)]);
  const [options] = useState(() => [pattern.next, ...pattern.distractors].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  function handleSelect(opt: string) {
    if (done) return;
    setSelected(opt);
    if (opt === pattern.next) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setWrongPick(opt);
      setTimeout(() => { setSelected(null); setWrongPick(null); }, 800);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">What comes next?</div>
      <div className="flex items-center justify-center gap-3 text-5xl">
        {pattern.seq.map((item, i) => (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15 }}>
            {item}
          </motion.span>
        ))}
        <span className="text-muted-foreground font-bold text-3xl border-b-2 border-dashed border-primary px-2">?</span>
      </div>
      <div className="flex gap-4 justify-center flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className={`text-4xl p-3 rounded-2xl transition-all border-2 ${
              done && opt === pattern.next
                ? "bg-green-100 ring-4 ring-green-400 scale-110 border-green-400"
                : wrongPick === opt
                ? "bg-red-100 scale-90 border-red-400"
                : "border-border hover:bg-secondary hover:scale-105"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 You completed the pattern!</div>}
      {wrongPick && <div className="text-red-500 font-semibold text-sm">❌ Hmm, look at the pattern again! 🔍</div>}
    </div>
  );
}

/* ─────────────── SORTING (FIXED with correct/wrong per item) ─────────────── */
function SortingExperiment({ onComplete }: { onComplete: () => void }) {
  const challenges = [
    {
      items: ["Cat", "Apple", "Banana", "Dog"],
      categories: { "🐾 Animals": ["Cat", "Dog"], "🍎 Fruits": ["Apple", "Banana"] }
    },
    {
      items: ["Rain", "Sun", "Fish", "Bird"],
      categories: { "🌤 Weather": ["Rain", "Sun"], "🐾 Animals": ["Fish", "Bird"] }
    },
    {
      items: ["Circle", "Car", "Bus", "Square"],
      categories: { "🔷 Shapes": ["Circle", "Square"], "🚗 Vehicles": ["Car", "Bus"] }
    },
    {
      items: ["2", "5", "Red", "Blue"],
      categories: { "🔢 Numbers": ["2", "5"], "🎨 Colors": ["Red", "Blue"] }
    },
    {
      items: ["Rose", "Oak", "Tulip", "Pine"],
      categories: { "🌸 Flowers": ["Rose", "Tulip"], "🌲 Trees": ["Oak", "Pine"] }
    },
    {
      items: ["Shark", "Eagle", "Tuna", "Hawk"],
      categories: { "🐦 Birds": ["Eagle", "Hawk"], "🐟 Fish": ["Shark", "Tuna"] }
    },
  ];

  const [challenge] = useState(() => challenges[Math.floor(Math.random() * challenges.length)]);
  const [shuffled] = useState(() => [...challenge.items].sort(() => Math.random() - 0.5));
  // placed: { item -> category }
  const [placed, setPlaced] = useState<Record<string, string>>({});
  // feedback: { item -> 'correct' | 'wrong' }
  const [feedback, setFeedback] = useState<Record<string, "correct" | "wrong">>({});
  const [done, setDone] = useState(false);

  function handlePlace(item: string, category: string) {
    if (done || placed[item]) return;

    const catItems = challenge.categories[category as keyof typeof challenge.categories];
    const isCorrect = Array.isArray(catItems) && catItems.includes(item);

    const newPlaced = { ...placed, [item]: category };
    const newFeedback = { ...feedback, [item]: isCorrect ? "correct" : "wrong" };

    if (!isCorrect) {
      // Show red flash, then remove after delay
      setFeedback(newFeedback);
      setTimeout(() => {
        setFeedback(prev => { const n = { ...prev }; delete n[item]; return n; });
      }, 900);
      return;
    }

    setPlaced(newPlaced);
    setFeedback(newFeedback);

    // Check if all correctly placed
    const allCorrect = Object.keys(challenge.categories).every(cat => {
      const expected = (challenge.categories as any)[cat] as string[];
      return expected.every(i => newPlaced[i] === cat);
    });

    if (allCorrect) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  const unplaced = shuffled.filter(i => !placed[i]);

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-center">Sort these into the right groups!</div>

      {/* Items to place */}
      <div className="flex flex-wrap gap-2 justify-center min-h-10">
        {unplaced.map((item) => {
          const isWrong = feedback[item] === "wrong";
          return (
            <motion.div
              key={item}
              animate={isWrong ? { x: [-6, 6, -4, 4, 0], backgroundColor: ["#f87171", "#f87171"] } : {}}
              transition={{ duration: 0.4 }}
              className={`px-4 py-2 rounded-full text-sm font-bold cursor-default transition-all ${
                isWrong ? "bg-red-400 text-white" : "bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
              }`}
            >
              {item}
            </motion.div>
          );
        })}
        {unplaced.length === 0 && !done && (
          <div className="text-muted-foreground text-sm italic">All items placed!</div>
        )}
      </div>

      {/* Category drop zones */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(challenge.categories).map(([cat, expected]) => {
          const placedHere = Object.entries(placed).filter(([, c]) => c === cat).map(([i]) => i);
          return (
            <div key={cat} className="border-2 border-dashed border-primary/40 rounded-xl p-3 min-h-24">
              <div className="text-sm font-bold text-primary mb-2">{cat}</div>
              {/* Already placed items */}
              <div className="flex flex-wrap gap-1 mb-2">
                {placedHere.map(item => (
                  <span key={item} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                    ✅ {item}
                  </span>
                ))}
              </div>
              {/* Buttons for each unplaced item */}
              <div className="flex flex-wrap gap-1">
                {unplaced.map((item) => (
                  <button
                    key={item}
                    onClick={() => handlePlace(item, cat)}
                    className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-green-600 font-bold text-xl text-center"
        >
          🎉 Perfectly sorted! Amazing work!
        </motion.div>
      )}
    </div>
  );
}

/* ─────────────── QUICK MEMORY ─────────────── */
function QuickMemoryExperiment({ onComplete }: { onComplete: () => void }) {
  const emojis = ["🍎", "🌟", "🎈", "🐱", "🌈", "🎵", "🦋", "🌸", "⚡", "🎯", "🍕", "🚀", "🌺", "🎪", "🐬"];
  const [seqLen] = useState(() => 3 + Math.floor(Math.random() * 2));
  const [sequence] = useState(() => [...emojis].sort(() => Math.random() - 0.5).slice(0, seqLen));
  const [phase, setPhase] = useState<"show" | "recall">("show");
  const [choices] = useState(() => {
    const wrongs = emojis.filter((e) => !sequence.includes(e)).slice(0, seqLen + 2);
    return [...sequence, ...wrongs].sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("recall"), 2800);
    return () => clearTimeout(t);
  }, []);

  function handleSelect(emoji: string) {
    if (done || phase === "show" || selected.includes(emoji)) return;
    if (!sequence.includes(emoji)) {
      setWrongPicks(prev => [...prev, emoji]);
      setTimeout(() => setWrongPicks(prev => prev.filter(e => e !== emoji)), 700);
      return;
    }
    const next = [...selected, emoji];
    setSelected(next);
    if (next.length === sequence.length) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-5">
      {phase === "show" ? (
        <>
          <div className="text-xl font-bold">🧠 Remember these!</div>
          <div className="flex gap-4 justify-center text-5xl">
            {sequence.map((e, i) => (
              <motion.span key={i} initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.2, type: "spring" }}>
                {e}
              </motion.span>
            ))}
          </div>
          <div className="text-muted-foreground text-sm">Memorize them! They disappear soon...</div>
        </>
      ) : (
        <>
          <div className="text-xl font-bold">Which ones did you see? (Pick {sequence.length})</div>
          <div className="grid grid-cols-3 gap-3">
            {choices.map((emoji) => {
              const isSelected = selected.includes(emoji);
              const isWrong = wrongPicks.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className={`text-4xl p-3 rounded-2xl transition-all border-2 ${
                    isSelected
                      ? "bg-green-100 ring-2 ring-green-400 border-green-400 scale-110"
                      : isWrong
                      ? "bg-red-100 border-red-400 scale-90"
                      : "border-border hover:bg-secondary hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <div className="text-sm text-muted-foreground">
            Selected {selected.length}/{sequence.length}
          </div>
          {done && <div className="text-green-600 font-bold text-xl">🎉 Amazing memory!</div>}
        </>
      )}
    </div>
  );
}

/* ─────────────── COUNTING ─────────────── */
function CountingExperiment({ onComplete }: { onComplete: () => void }) {
  const emojis = ["⭐", "🍎", "🐱", "🌸", "🎯", "🦋", "⚡", "🎈", "🌺", "🍕"];
  const [emoji] = useState(() => emojis[Math.floor(Math.random() * emojis.length)]);
  const [count] = useState(() => 2 + Math.floor(Math.random() * 8));
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  function handleCheck() {
    const isCorrect = parseInt(answer) === count;
    setChecked(true);
    setCorrect(isCorrect);
    if (isCorrect) {
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setAttempts(a => a + 1);
    }
  }

  function handleRetry() {
    setChecked(false);
    setAnswer("");
  }

  return (
    <div className="text-center space-y-5">
      <div className="text-xl font-bold">How many {emoji} do you see?</div>
      <div className="flex flex-wrap gap-2 justify-center text-4xl max-w-xs mx-auto">
        {Array.from({ length: count }).map((_, i) => (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.07, type: "spring" }}>
            {emoji}
          </motion.span>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-20 h-12 text-2xl font-bold text-center border-2 rounded-xl border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={checked && correct}
          min={0}
          max={20}
          onKeyDown={e => e.key === "Enter" && answer && handleCheck()}
        />
        <Button onClick={handleCheck} className="kid-gradient text-white font-bold" disabled={(checked && correct) || !answer}>
          Check!
        </Button>
      </div>
      {checked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`font-bold text-xl ${correct ? "text-green-600" : "text-red-500"}`}
        >
          {correct ? "🎉 Correct! Well counted!" : `❌ Not quite! Count again carefully.${attempts >= 2 ? ` (Hint: ${count})` : ""}`}
        </motion.div>
      )}
      {checked && !correct && (
        <Button size="sm" variant="outline" onClick={handleRetry}>Try Again 🔄</Button>
      )}
    </div>
  );
}

/* ─────────────── ANAGRAM ─────────────── */
function AnagramExperiment({ onComplete }: { onComplete: () => void }) {
  const words = [
    { scrambled: "TAC", word: "CAT" }, { scrambled: "OGD", word: "DOG" },
    { scrambled: "NUS", word: "SUN" }, { scrambled: "UFN", word: "FUN" },
    { scrambled: "GBI", word: "BIG" }, { scrambled: "NUR", word: "RUN" },
    { scrambled: "YSK", word: "SKY" }, { scrambled: "KAPPLE", word: "APPLE" },
    { scrambled: "RTSEE", word: "TREES" }, { scrambled: "SATRS", word: "STARS" },
    { scrambled: "AOCEN", word: "OCEAN" }, { scrambled: "WOEFLR", word: "FLOWER" },
    { scrambled: "TOBOT", word: "ROBOT" },
  ];
  const [challenge] = useState(() => words[Math.floor(Math.random() * words.length)]);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  function handleCheck() {
    const isCorrect = answer.toUpperCase().trim() === challenge.word;
    setChecked(true);
    setCorrect(isCorrect);
    if (isCorrect) {
      fireConfetti();
      setTimeout(onComplete, 1500);
    } else {
      setAttempts(a => a + 1);
    }
  }

  return (
    <div className="text-center space-y-5">
      <div className="text-xl font-bold">Unscramble this word!</div>
      <div className="flex gap-2 justify-center">
        {challenge.scrambled.split("").map((letter, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 text-white rounded-lg flex items-center justify-center text-xl font-bold"
          >
            {letter}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase())}
          className="border-2 rounded-xl border-primary text-center text-xl font-bold p-2 w-36 focus:outline-none uppercase"
          placeholder="???"
          disabled={checked && correct}
          onKeyDown={(e) => e.key === "Enter" && answer && handleCheck()}
          maxLength={challenge.word.length + 1}
        />
        <Button onClick={handleCheck} className="kid-gradient text-white font-bold" disabled={!answer || (checked && correct)}>
          Check!
        </Button>
      </div>
      {checked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-bold text-xl ${correct ? "text-green-600" : "text-red-500"}`}
        >
          {correct
            ? "🎉 You unscrambled it!"
            : `❌ Not quite! ${attempts >= 2 ? `It's "${challenge.word}"` : `${challenge.word.length} letters total`}`}
        </motion.div>
      )}
      {checked && !correct && (
        <Button size="sm" variant="outline" onClick={() => { setChecked(false); setAnswer(""); }}>Try Again 🔄</Button>
      )}
    </div>
  );
}

/* ─────────────── WEBCAM COLOR DETECTION ─────────────── */
function WebcamColorExperiment({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const colors = [
    { name: "Red", emoji: "🔴", hRange: [0, 25], hRange2: [335, 360], sMin: 80, vMin: 80, hex: "#ef4444" },
    { name: "Blue", emoji: "🔵", hRange: [200, 260], sMin: 60, vMin: 60, hex: "#3b82f6" },
    { name: "Green", emoji: "🟢", hRange: [80, 160], sMin: 60, vMin: 60, hex: "#22c55e" },
    { name: "Yellow", emoji: "🟡", hRange: [40, 75], sMin: 70, vMin: 80, hex: "#eab308" },
    { name: "Orange", emoji: "🟠", hRange: [25, 45], sMin: 70, vMin: 80, hex: "#f97316" },
  ];

  const [target] = useState(() => colors[Math.floor(Math.random() * colors.length)]);
  const [detected, setDetected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setCameraReady(true);
    } catch {
      setCameraError(true);
    }
  }

  function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
    }
    return { h, s: s * 100, v: v * 100 };
  }

  function detectColor() {
    if (!videoRef.current || !canvasRef.current || done) return;
    setScanning(true);
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 80, 60);
    const data = ctx.getImageData(30, 20, 20, 20).data;

    const counts: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 4) {
      const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      for (const col of colors) {
        const inRange = (col.hRange2
          ? (h >= col.hRange[0] && h <= col.hRange[1]) || (h >= col.hRange2[0] && h <= col.hRange2[1])
          : h >= col.hRange[0] && h <= col.hRange[1]);
        if (inRange && s >= col.sMin && v >= col.vMin) {
          counts[col.name] = (counts[col.name] ?? 0) + 1;
        }
      }
    }

    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    setTimeout(() => {
      setScanning(false);
      const detectedColor = best && best[1] > 5 ? best[0] : null;
      setDetected(detectedColor);
      setAttempts(a => a + 1);
      if (detectedColor === target.name) {
        setDone(true);
        fireConfetti();
        setTimeout(onComplete, 2000);
      }
    }, 800);
  }

  if (cameraError) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-4xl">📷</div>
        <p className="text-muted-foreground">Camera not available. Try another experiment!</p>
        <Button onClick={onComplete} variant="outline">Skip this one</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-xl font-bold">
        Show <span style={{ color: target.hex }} className="font-extrabold text-2xl">{target.name}</span> {target.emoji} to the camera!
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} width={80} height={60} className="hidden" />
        {/* Center scan zone */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-16 h-16 border-4 rounded-lg transition-all ${
            scanning ? "border-yellow-400 animate-pulse" : done ? "border-green-400" : "border-white/60"
          }`} />
        </div>
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
            Starting camera...
          </div>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Hold a {target.name.toLowerCase()} object inside the white box, then tap Scan!
      </p>

      {detected !== null && !done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          {detected === target.name
            ? <div className="text-green-600 font-bold">✅ {detected}! That's correct!</div>
            : <div className="text-red-500 font-semibold">
                ❌ I see {detected ?? "no clear color"} — show me <strong>{target.name}</strong>!
              </div>
          }
        </motion.div>
      )}

      {done && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center text-green-600 font-bold text-xl">
          🎉 Perfect! That's {target.name}!
        </motion.div>
      )}

      {!done && (
        <div className="flex justify-center">
          <Button
            onClick={detectColor}
            disabled={!cameraReady || scanning}
            className="kid-gradient text-white font-bold px-8"
          >
            {scanning ? "🔍 Scanning..." : "📷 Scan Color!"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─────────────── FINGER COUNTING (OpenCV-style via MediaPipe) ─────────────── */
function FingerCountingExperiment({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [mpLoaded, setMpLoaded] = useState(false);
  const [target] = useState(() => 1 + Math.floor(Math.random() * 5));
  const [detected, setDetected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    loadMediaPipe();
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function loadMediaPipe() {
    if ((window as any).Hands) { setMpLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => setMpLoaded(true);
    document.head.appendChild(script);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
    } catch {
      setCameraError(true);
    }
  }

  function countFingersFromLandmarks(landmarks: any[]): number {
    // Finger tip and pip indices: [tip, pip]
    const fingers = [
      [8, 6], [12, 10], [16, 14], [20, 18] // index, middle, ring, pinky
    ];
    // Thumb: compare x (left/right hand)
    const thumbUp = Math.abs(landmarks[4].x - landmarks[3].x) > 0.04 ||
      landmarks[4].y < landmarks[3].y;
    let count = thumbUp ? 1 : 0;
    for (const [tip, pip] of fingers) {
      if (landmarks[tip].y < landmarks[pip].y) count++;
    }
    return count;
  }

  async function scanFingers() {
    if (!videoRef.current || !canvasRef.current || done) return;
    setScanning(true);
    setAttempts(a => a + 1);

    if (!mpLoaded || !(window as any).Hands) {
      // Fallback: simple simulation if MP not loaded
      setTimeout(() => {
        setScanning(false);
        setDetected(null);
      }, 800);
      return;
    }

    try {
      if (!handsRef.current) {
        const Hands = (window as any).Hands;
        handsRef.current = new Hands({ locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}` });
        handsRef.current.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.7 });
        await new Promise(res => handsRef.current.onResults(res));
      }

      handsRef.current.onResults((results: any) => {
        setScanning(false);
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const count = countFingersFromLandmarks(results.multiHandLandmarks[0]);
          setDetected(count);
          if (count === target) {
            setDone(true);
            fireConfetti();
            setTimeout(onComplete, 1800);
          }
        } else {
          setDetected(-1); // no hand
        }
      });

      await handsRef.current.send({ image: videoRef.current });
    } catch {
      // Fallback: use canvas pixel-based approach
      const ctx = canvasRef.current.getContext("2d")!;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      setScanning(false);
      setDetected(null);
    }
  }

  const fingerEmojis = ["", "☝️", "✌️", "🤟", "🖖", "🖐️"];

  if (cameraError) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-4xl">📷</div>
        <p className="text-muted-foreground">Camera not available. Try another experiment!</p>
        <Button onClick={onComplete} variant="outline">Skip</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-xl font-bold mb-1">Hold up <span className="text-primary font-extrabold text-3xl">{target}</span> finger{target !== 1 ? "s" : ""}!</div>
        <div className="text-5xl">{fingerEmojis[target]}</div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-xs mx-auto">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
        <canvas ref={canvasRef} width={320} height={240} className="hidden" />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="text-white font-bold text-lg animate-pulse">🔍 Counting fingers...</div>
          </div>
        )}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">Starting camera...</div>
        )}
      </div>

      {!mpLoaded && cameraReady && (
        <p className="text-center text-xs text-muted-foreground">Loading hand detection... ({attempts === 0 ? "ready soon" : "tap scan to try"})</p>
      )}

      {detected !== null && !done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          {detected === -1 ? (
            <div className="text-orange-500 font-semibold">🤔 No hand detected — hold your hand up clearly!</div>
          ) : detected === target ? (
            <div className="text-green-600 font-bold">✅ {detected} finger{detected !== 1 ? "s" : ""}! Correct!</div>
          ) : (
            <div className="text-red-500 font-semibold">
              I counted <strong>{detected}</strong> finger{detected !== 1 ? "s" : ""} — show me <strong>{target}</strong>!
            </div>
          )}
        </motion.div>
      )}

      {done && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center text-green-600 font-bold text-xl">
          🎉 {target} finger{target !== 1 ? "s" : ""}! You got it!
        </motion.div>
      )}

      {!done && (
        <div className="flex justify-center">
          <Button onClick={scanFingers} disabled={!cameraReady || scanning} className="kid-gradient text-white font-bold px-8">
            {scanning ? "🔍 Scanning..." : "✋ Count My Fingers!"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─────────────── EXPERIMENT POOL BY SUBJECT ─────────────── */
const EXPERIMENTS_BY_SUBJECT: Record<string, (() => Experiment)[]> = {
  math: [
    () => ({ id: "number-line", title: "Math Challenge", component: NumberLineExperiment }),
    () => ({ id: "counting", title: "Counting Stars", component: CountingExperiment }),
    () => ({ id: "math-pattern", title: "Number Patterns", component: MathPatternExperiment }),
    () => ({ id: "memory", title: "Number Memory", component: QuickMemoryExperiment }),
    () => ({ id: "number-line2", title: "Math Blaster", component: NumberLineExperiment }),
  ],
  science: [
    () => ({ id: "sorting", title: "Science Sorting", component: SortingExperiment }),
    () => ({ id: "pattern", title: "Spot the Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "memory", title: "Science Memory", component: QuickMemoryExperiment }),
    () => ({ id: "counting", title: "Count the Elements", component: CountingExperiment }),
    () => ({ id: "color", title: "Color Finder", component: WebcamColorExperiment }),
  ],
  english: [
    () => ({ id: "anagram", title: "Word Scramble", component: AnagramExperiment }),
    () => ({ id: "word-match", title: "Opposites Game", component: WordMatchExperiment }),
    () => ({ id: "memory", title: "Word Memory", component: QuickMemoryExperiment }),
    () => ({ id: "pattern", title: "Sentence Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "sorting", title: "Word Sorting", component: SortingExperiment }),
  ],
  "social-studies": [
    () => ({ id: "sorting", title: "Geography Sort", component: SortingExperiment }),
    () => ({ id: "memory", title: "World Memory", component: QuickMemoryExperiment }),
    () => ({ id: "pattern", title: "Culture Patterns", component: PatternCompleteExperiment }),
    () => ({ id: "color", title: "Flag Colors", component: WebcamColorExperiment }),
    () => ({ id: "word-match", title: "Word Match", component: WordMatchExperiment }),
  ],
  technology: [
    () => ({ id: "pattern", title: "Code Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "sorting", title: "Logic Sort", component: SortingExperiment }),
    () => ({ id: "memory", title: "Tech Memory", component: QuickMemoryExperiment }),
    () => ({ id: "number-line", title: "Binary Math", component: NumberLineExperiment }),
    () => ({ id: "finger-count", title: "Count the Bits", component: FingerCountingExperiment }),
  ],
  art: [
    () => ({ id: "color", title: "Color Match", component: WebcamColorExperiment }),
    () => ({ id: "memory", title: "Art Memory", component: QuickMemoryExperiment }),
    () => ({ id: "pattern", title: "Art Patterns", component: PatternCompleteExperiment }),
    () => ({ id: "sorting", title: "Color Sort", component: SortingExperiment }),
    () => ({ id: "shapes", title: "Find the Shape", component: ShapeColorExperiment }),
  ],
};

const DEFAULT_EXPERIMENTS = [
  () => ({ id: "pattern", title: "Pattern Game", component: PatternCompleteExperiment }),
  () => ({ id: "memory", title: "Memory Challenge", component: QuickMemoryExperiment }),
  () => ({ id: "counting", title: "Counting Fun", component: CountingExperiment }),
  () => ({ id: "shapes", title: "Shape Finder", component: ShapeColorExperiment }),
  () => ({ id: "word-match", title: "Word Match", component: WordMatchExperiment }),
];

/* ─────────────── MAIN EXPORT ─────────────── */
export default function LessonExperiment({ subject, lessonTitle, lessonOrder }: ExperimentProps) {
  const pool = EXPERIMENTS_BY_SUBJECT[subject] ?? DEFAULT_EXPERIMENTS;

  const pickNew = useCallback(() => {
    const factory = pool[Math.floor(Math.random() * pool.length)];
    return factory();
  }, [pool]);

  const [experiment, setExperiment] = useState<Experiment>(() => pickNew());
  const [completed, setCompleted] = useState(false);
  const [key, setKey] = useState(0);

  function handleComplete() { setCompleted(true); }

  function handleNewChallenge() {
    setCompleted(false);
    setExperiment(pickNew());
    setKey(k => k + 1);
  }

  const ExperimentComponent = experiment.component;

  return (
    <Card className="overflow-hidden">
      <div className="kid-gradient px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">🧪 {experiment.title}</h3>
          <p className="text-white/80 text-sm">Interactive Challenge</p>
        </div>
        <button
          onClick={handleNewChallenge}
          className="text-white/80 hover:text-white text-xs border border-white/30 rounded-lg px-3 py-1.5 transition-all hover:bg-white/15"
        >
          🎲 New Challenge
        </button>
      </div>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ExperimentComponent key={key} onComplete={handleComplete} lessonTitle={lessonTitle} />
          </motion.div>
        </AnimatePresence>

        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex gap-2 justify-center"
          >
            <Button variant="outline" size="sm" onClick={handleNewChallenge}>
              🎲 Try Another Challenge!
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
