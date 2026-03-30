import { useState, useEffect, useRef } from "react";
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
  component: React.FC<{ onComplete: () => void }>;
}

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}

function NumberLineExperiment({ onComplete }: { onComplete: () => void }) {
  const problems = [
    { a: 3, b: 5, op: "+" as const }, { a: 8, b: 4, op: "-" as const },
    { a: 6, b: 7, op: "+" as const }, { a: 12, b: 5, op: "-" as const },
    { a: 4, b: 9, op: "+" as const }, { a: 15, b: 7, op: "-" as const },
    { a: 2, b: 11, op: "+" as const }, { a: 20, b: 8, op: "-" as const },
  ];
  const [problem] = useState(() => problems[Math.floor(Math.random() * problems.length)]);
  const answer = problem.op === "+" ? problem.a + problem.b : problem.a - problem.b;
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const options = Array.from({ length: 4 }, (_, i) => {
    const offsets = [-2, -1, 0, 1].sort(() => Math.random() - 0.5);
    return answer + offsets[i];
  }).sort(() => Math.random() - 0.5);

  const uniqueOptions = Array.from(new Set([answer, ...options.slice(0, 3)])).slice(0, 4);

  function handleSelect(n: number) {
    if (done) return;
    setSelected(n);
    if (n === answer) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">
        What is {problem.a} {problem.op} {problem.b}?
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {uniqueOptions.map((opt) => (
          <Button
            key={opt}
            size="lg"
            className={`w-16 h-16 text-2xl font-bold rounded-xl ${
              selected === opt
                ? opt === answer
                  ? "bg-green-500 text-white"
                  : "bg-red-400 text-white"
                : "kid-gradient text-white"
            }`}
            onClick={() => handleSelect(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 Correct!</div>}
    </div>
  );
}

function ShapeColorExperiment({ onComplete }: { onComplete: () => void }) {
  const items = [
    { shape: "🔴", name: "Red Circle" }, { shape: "🔵", name: "Blue Circle" },
    { shape: "🟡", name: "Yellow Circle" }, { shape: "🟢", name: "Green Circle" },
    { shape: "🟠", name: "Orange Circle" }, { shape: "🟣", name: "Purple Circle" },
  ];
  const [target] = useState(() => items[Math.floor(Math.random() * items.length)]);
  const [shuffled] = useState(() => [...items].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSelect(name: string) {
    if (done) return;
    setSelected(name);
    if (name === target.name) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">Tap the {target.name}!</div>
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {shuffled.map((item) => (
          <button
            key={item.name}
            onClick={() => handleSelect(item.name)}
            className={`text-6xl p-3 rounded-2xl transition-all ${
              selected === item.name
                ? item.name === target.name
                  ? "bg-green-100 scale-110"
                  : "bg-red-100 scale-90 opacity-50"
                : "hover:bg-secondary hover:scale-105"
            }`}
          >
            {item.shape}
          </button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 You got it!</div>}
    </div>
  );
}

function WordMatchExperiment({ onComplete }: { onComplete: () => void }) {
  const pairs = [
    { word: "Big", opposite: "Small" }, { word: "Hot", opposite: "Cold" },
    { word: "Fast", opposite: "Slow" }, { word: "Happy", opposite: "Sad" },
    { word: "Day", opposite: "Night" }, { word: "Up", opposite: "Down" },
    { word: "Old", opposite: "Young" }, { word: "Empty", opposite: "Full" },
  ];
  const [pair] = useState(() => pairs[Math.floor(Math.random() * pairs.length)]);
  const [options] = useState(() => {
    const wrongs = pairs.filter((p) => p !== pair).map((p) => p.opposite);
    const shuffled = [...wrongs].sort(() => Math.random() - 0.5).slice(0, 3);
    return [pair.opposite, ...shuffled].sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSelect(opt: string) {
    if (done) return;
    setSelected(opt);
    if (opt === pair.opposite) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">What is the opposite of "{pair.word}"?</div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <Button
            key={opt}
            size="lg"
            className={`h-14 text-lg font-semibold ${
              selected === opt
                ? opt === pair.opposite
                  ? "bg-green-500 text-white"
                  : "bg-red-400 text-white"
                : "kid-gradient text-white"
            }`}
            onClick={() => handleSelect(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 That's right!</div>}
    </div>
  );
}

function PatternCompleteExperiment({ onComplete }: { onComplete: () => void }) {
  const patterns = [
    { seq: ["🌟", "🌙", "🌟", "🌙"], next: "🌟", distractors: ["🌙", "⭐", "☀️"] },
    { seq: ["🍎", "🍊", "🍎", "🍊"], next: "🍎", distractors: ["🍊", "🍋", "🍇"] },
    { seq: ["🔴", "🔵", "🔴", "🔵"], next: "🔴", distractors: ["🔵", "🟡", "🟢"] },
    { seq: ["🐱", "🐶", "🐱", "🐶"], next: "🐱", distractors: ["🐶", "🐭", "🐸"] },
    { seq: ["⬜", "⬛", "⬜", "⬛"], next: "⬜", distractors: ["⬛", "🟥", "🟦"] },
    { seq: ["1️⃣", "2️⃣", "3️⃣", "1️⃣"], next: "2️⃣", distractors: ["1️⃣", "3️⃣", "4️⃣"] },
  ];
  const [pattern] = useState(() => patterns[Math.floor(Math.random() * patterns.length)]);
  const [options] = useState(() => [pattern.next, ...pattern.distractors].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSelect(opt: string) {
    if (done) return;
    setSelected(opt);
    if (opt === pattern.next) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-2xl font-bold">What comes next?</div>
      <div className="flex items-center justify-center gap-3 text-4xl">
        {pattern.seq.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
        <span className="text-muted-foreground font-bold text-2xl">?</span>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className={`text-4xl p-3 rounded-2xl transition-all ${
              selected === opt
                ? opt === pattern.next
                  ? "bg-green-100 scale-110 ring-2 ring-green-400"
                  : "bg-red-100 scale-90 opacity-50"
                : "hover:bg-secondary hover:scale-105"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl">🎉 You completed the pattern!</div>}
    </div>
  );
}

function SortingExperiment({ onComplete }: { onComplete: () => void }) {
  const challenges = [
    { items: ["Cat", "Apple", "Banana", "Dog"], categories: { Animals: ["Cat", "Dog"], Fruits: ["Apple", "Banana"] } },
    { items: ["Rain", "Sun", "Fish", "Bird"], categories: { Weather: ["Rain", "Sun"], Animals: ["Fish", "Bird"] } },
    { items: ["Circle", "Car", "Bus", "Square"], categories: { Shapes: ["Circle", "Square"], Vehicles: ["Car", "Bus"] } },
    { items: ["2", "5", "Red", "Blue"], categories: { Numbers: ["2", "5"], Colors: ["Red", "Blue"] } },
  ];

  const [challenge] = useState(() => challenges[Math.floor(Math.random() * challenges.length)]);
  const [shuffled] = useState(() => [...challenge.items].sort(() => Math.random() - 0.5));
  const [sorted, setSorted] = useState<Record<string, string[]>>(
    Object.fromEntries(Object.keys(challenge.categories).map((k) => [k, []]))
  );
  const [done, setDone] = useState(false);

  function handleDrop(item: string, category: string) {
    if (done) return;
    setSorted((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = next[k].filter((i) => i !== item);
      });
      next[category] = [...next[category], item];
      return next;
    });
  }

  useEffect(() => {
    const correct = Object.entries(challenge.categories).every(([cat, items]) => {
      const s = sorted[cat] ?? [];
      return items.every((i) => s.includes(i)) && s.every((i) => (items as string[]).includes(i));
    });
    if (correct && Object.values(sorted).flat().length === challenge.items.length) {
      setDone(true);
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }, [sorted]);

  const placed = Object.values(sorted).flat();
  const remaining = shuffled.filter((i) => !placed.includes(i));

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-center">Sort these into the right groups!</div>
      <div className="flex flex-wrap gap-2 justify-center min-h-12">
        {remaining.map((item) => (
          <div key={item} className="px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium cursor-grab">
            {item}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(challenge.categories).map(([cat]) => (
          <div key={cat} className="border-2 border-dashed border-primary/30 rounded-xl p-3 min-h-20">
            <div className="text-sm font-bold text-primary mb-2">{cat}</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(sorted[cat] ?? []).map((item) => (
                <span key={item} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {remaining.map((item) => (
                <button
                  key={item}
                  onClick={() => handleDrop(item, cat)}
                  className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full hover:border-primary hover:bg-primary/5 transition-all"
                >
                  + {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {done && <div className="text-green-600 font-bold text-xl text-center">🎉 Perfectly sorted!</div>}
    </div>
  );
}

function QuickMemoryExperiment({ onComplete }: { onComplete: () => void }) {
  const emojis = ["🍎", "🌟", "🎈", "🐱", "🌈", "🎵", "🦋", "🌸", "⚡", "🎯", "🍕", "🚀"];
  const [gridSize] = useState(() => 3 + Math.floor(Math.random() * 2));
  const [sequence] = useState(() => {
    const shuffled = [...emojis].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, gridSize);
  });
  const [phase, setPhase] = useState<"show" | "recall">("show");
  const [choices] = useState(() => {
    const wrongs = emojis.filter((e) => !sequence.includes(e)).slice(0, gridSize);
    return [...sequence, ...wrongs].sort(() => Math.random() - 0.5);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("recall"), 2500);
    return () => clearTimeout(t);
  }, []);

  function handleSelect(emoji: string) {
    if (done || phase === "show") return;
    const next = selected.includes(emoji)
      ? selected.filter((e) => e !== emoji)
      : [...selected, emoji];
    setSelected(next);

    if (next.length === sequence.length) {
      const correct = sequence.every((e) => next.includes(e));
      if (correct) {
        setDone(true);
        fireConfetti();
        setTimeout(onComplete, 1500);
      }
    }
  }

  return (
    <div className="text-center space-y-5">
      {phase === "show" ? (
        <>
          <div className="text-xl font-bold">Remember these! 🧠</div>
          <div className="flex gap-4 justify-center text-5xl">
            {sequence.map((e, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.2 }}
              >
                {e}
              </motion.span>
            ))}
          </div>
          <div className="text-muted-foreground text-sm">They'll disappear in 2.5 seconds...</div>
        </>
      ) : (
        <>
          <div className="text-xl font-bold">Which ones did you see?</div>
          <div className="grid grid-cols-3 gap-3">
            {choices.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`text-4xl p-3 rounded-2xl transition-all ${
                  selected.includes(emoji)
                    ? done
                      ? sequence.includes(emoji)
                        ? "bg-green-100 ring-2 ring-green-400"
                        : "bg-red-100"
                      : "bg-primary/20 ring-2 ring-primary scale-95"
                    : "hover:bg-secondary hover:scale-105"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">Select {sequence.length} emojis</div>
          {done && <div className="text-green-600 font-bold text-xl">🎉 Amazing memory!</div>}
        </>
      )}
    </div>
  );
}

function CountingExperiment({ onComplete }: { onComplete: () => void }) {
  const emojis = ["⭐", "🍎", "🐱", "🌸", "🎯", "🦋", "⚡", "🎈"];
  const [emoji] = useState(() => emojis[Math.floor(Math.random() * emojis.length)]);
  const [count] = useState(() => 2 + Math.floor(Math.random() * 8));
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function handleCheck() {
    const isCorrect = parseInt(answer) === count;
    setChecked(true);
    setCorrect(isCorrect);
    if (isCorrect) {
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-5">
      <div className="text-xl font-bold">How many {emoji} do you see?</div>
      <div className="flex flex-wrap gap-2 justify-center text-4xl max-w-xs mx-auto">
        {Array.from({ length: count }).map((_, i) => (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 }}>
            {emoji}
          </motion.span>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-20 h-12 text-2xl font-bold text-center border-2 rounded-xl border-primary focus:outline-none"
          disabled={checked && correct}
          min={0}
          max={20}
        />
        <Button
          onClick={handleCheck}
          className="kid-gradient text-white"
          disabled={(checked && correct) || !answer}
        >
          Check!
        </Button>
      </div>
      {checked && (
        <div className={`font-bold text-xl ${correct ? "text-green-600" : "text-red-500"}`}>
          {correct ? "🎉 Correct!" : `Not quite! The answer is ${count}. Try again!`}
        </div>
      )}
      {checked && !correct && (
        <Button size="sm" onClick={() => { setChecked(false); setAnswer(""); }}>Try Again</Button>
      )}
    </div>
  );
}

function AnagramExperiment({ onComplete }: { onComplete: () => void }) {
  const words = [
    { scrambled: "TAC", word: "CAT" }, { scrambled: "OGD", word: "DOG" },
    { scrambled: "NUS", word: "SUN" }, { scrambled: "UFN", word: "FUN" },
    { scrambled: "GBI", word: "BIG" }, { scrambled: "NUR", word: "RUN" },
    { scrambled: "TRY", word: "TRY" }, { scrambled: "YSK", word: "SKY" },
    { scrambled: "PAKPLE", word: "APPLE" }, { scrambled: "RTSEE", word: "TREES" },
    { scrambled: "SATRS", word: "STARS" }, { scrambled: "AOCEN", word: "OCEAN" },
  ];
  const [challenge] = useState(() => words[Math.floor(Math.random() * words.length)]);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function handleCheck() {
    const isCorrect = answer.toUpperCase() === challenge.word;
    setChecked(true);
    setCorrect(isCorrect);
    if (isCorrect) {
      fireConfetti();
      setTimeout(onComplete, 1500);
    }
  }

  return (
    <div className="text-center space-y-5">
      <div className="text-xl font-bold">Unscramble this word!</div>
      <div className="flex gap-2 justify-center">
        {challenge.scrambled.split("").map((letter, i) => (
          <div key={i} className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center text-xl font-bold">
            {letter}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 justify-center">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase())}
          className="border-2 rounded-xl border-primary text-center text-xl font-bold p-2 w-32 focus:outline-none uppercase"
          placeholder="???"
          disabled={checked && correct}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        />
        <Button onClick={handleCheck} className="kid-gradient text-white" disabled={!answer || (checked && correct)}>
          Check!
        </Button>
      </div>
      {checked && (
        <div className={`font-bold text-xl ${correct ? "text-green-600" : "text-red-500"}`}>
          {correct ? "🎉 You unscrambled it!" : `Try again! Hint: ${challenge.word.length} letters`}
        </div>
      )}
      {checked && !correct && (
        <Button size="sm" onClick={() => { setChecked(false); setAnswer(""); }}>Try Again</Button>
      )}
    </div>
  );
}

const EXPERIMENTS_BY_SUBJECT: Record<string, (() => Experiment)[]> = {
  math: [
    () => ({ id: "number-line", title: "Math Challenge", component: NumberLineExperiment }),
    () => ({ id: "counting", title: "Counting Stars", component: CountingExperiment }),
    () => ({ id: "pattern", title: "Complete the Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "memory", title: "Quick Memory", component: QuickMemoryExperiment }),
    () => ({ id: "sorting", title: "Number Sorting", component: SortingExperiment }),
  ],
  science: [
    () => ({ id: "sorting", title: "Science Sorting", component: SortingExperiment }),
    () => ({ id: "pattern", title: "Spot the Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "memory", title: "Science Memory", component: QuickMemoryExperiment }),
    () => ({ id: "counting", title: "Count the Elements", component: CountingExperiment }),
    () => ({ id: "shapes", title: "Find the Shape", component: ShapeColorExperiment }),
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
    () => ({ id: "shapes", title: "Flag Colors", component: ShapeColorExperiment }),
    () => ({ id: "word-match", title: "Word Match", component: WordMatchExperiment }),
  ],
  technology: [
    () => ({ id: "pattern", title: "Code Pattern", component: PatternCompleteExperiment }),
    () => ({ id: "sorting", title: "Logic Sort", component: SortingExperiment }),
    () => ({ id: "memory", title: "Tech Memory", component: QuickMemoryExperiment }),
    () => ({ id: "number-line", title: "Binary Math", component: NumberLineExperiment }),
    () => ({ id: "counting", title: "Count the Bits", component: CountingExperiment }),
  ],
  art: [
    () => ({ id: "shapes", title: "Color Match", component: ShapeColorExperiment }),
    () => ({ id: "memory", title: "Art Memory", component: QuickMemoryExperiment }),
    () => ({ id: "pattern", title: "Art Patterns", component: PatternCompleteExperiment }),
    () => ({ id: "sorting", title: "Color Sort", component: SortingExperiment }),
    () => ({ id: "counting", title: "Count the Colors", component: CountingExperiment }),
  ],
};

const DEFAULT_EXPERIMENTS = [
  () => ({ id: "pattern", title: "Pattern Game", component: PatternCompleteExperiment }),
  () => ({ id: "memory", title: "Memory Challenge", component: QuickMemoryExperiment }),
  () => ({ id: "counting", title: "Counting Fun", component: CountingExperiment }),
  () => ({ id: "shapes", title: "Shape Finder", component: ShapeColorExperiment }),
  () => ({ id: "word-match", title: "Word Match", component: WordMatchExperiment }),
];

export default function LessonExperiment({ subject, lessonTitle, lessonOrder }: ExperimentProps) {
  const pool = EXPERIMENTS_BY_SUBJECT[subject] ?? DEFAULT_EXPERIMENTS;
  const [experiment] = useState<Experiment>(() => {
    const factory = pool[Math.floor(Math.random() * pool.length)];
    return factory();
  });
  const [completed, setCompleted] = useState(false);
  const [key, setKey] = useState(0);

  function handleComplete() {
    setCompleted(true);
  }

  function handleNewChallenge() {
    setCompleted(false);
    setKey((k) => k + 1);
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
          onClick={() => setKey((k) => k + 1)}
          className="text-white/70 hover:text-white text-xs border border-white/30 rounded-lg px-2 py-1 transition-all hover:bg-white/10"
        >
          🎲 New Challenge
        </button>
      </div>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <ExperimentComponent key={key} onComplete={handleComplete} />
          </motion.div>
        </AnimatePresence>

        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex gap-2 justify-center"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChallenge}
            >
              🎲 Try Another Challenge!
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
