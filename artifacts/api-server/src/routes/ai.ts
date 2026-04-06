import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { coursesTable, userProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { z } from "zod";
import OpenAI from "openai";

const router: IRouter = Router();

function getClient() {
  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  };
  if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    config.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  }
  return new OpenAI(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded pseudo-random number generator (LCG) — deterministic but varied
// ─────────────────────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate 3 wrong options close to the correct answer
function wrongOptions(correct: number, rng: () => number, min: number, max: number): number[] {
  const pool = new Set<number>();
  const deltas = [-3, -2, -1, 1, 2, 3, 4, -4, 5, -5];
  for (const d of deltas) {
    const w = correct + d;
    if (w !== correct && w >= min && w <= max) pool.add(w);
    if (pool.size >= 6) break;
  }
  while (pool.size < 3) {
    const w = randInt(rng, min, max);
    if (w !== correct) pool.add(w);
  }
  return shuffle(Array.from(pool), rng).slice(0, 3);
}

function makeQuestion(question: string, correct: number, rng: () => number, min: number, max: number, explanation: string) {
  const wrongs = wrongOptions(correct, rng, min, max);
  const allOptions = shuffle([correct, ...wrongs], rng);
  return {
    question,
    options: allOptions.map(String),
    correctIndex: allOptions.indexOf(correct),
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Programmatic Math Question Generators — 100% correct, no AI drift
// ─────────────────────────────────────────────────────────────────────────────

function generateAdditionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const a = randInt(rng, 1, 9);
    const b = randInt(rng, 1, 9);
    const correct = a + b;
    return makeQuestion(`What is ${a} + ${b}?`, correct, rng, 1, 18,
      `${a} + ${b} = ${correct}. Well done! ⭐`);
  } else {
    // medium: 50/50 between 3-number chain and 2-digit addition
    if (rng() < 0.5) {
      const a = randInt(rng, 1, 15);
      const b = randInt(rng, 1, 15);
      const c = randInt(rng, 1, 15);
      const correct = a + b + c;
      return makeQuestion(`What is ${a} + ${b} + ${c}?`, correct, rng, 3, 50,
        `Add step by step: ${a} + ${b} = ${a + b}, then + ${c} = ${correct}. 🌟`);
    } else {
      const a = randInt(rng, 10, 35);
      const b = randInt(rng, 10, 35);
      const correct = a + b;
      return makeQuestion(`What is ${a} + ${b}?`, correct, rng, 15, 75,
        `${a} + ${b} = ${correct}. Great adding! 🌟`);
    }
  }
}

function generateSubtractionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const b = randInt(rng, 1, 5);
    const a = randInt(rng, b + 1, 9);
    const correct = a - b;
    return makeQuestion(`What is ${a} - ${b}?`, correct, rng, 0, 9,
      `${a} - ${b} = ${correct}. Excellent! ⭐`);
  } else {
    if (rng() < 0.5) {
      const a = randInt(rng, 20, 50);
      const b = randInt(rng, 5, 19);
      const correct = a - b;
      return makeQuestion(`What is ${a} - ${b}?`, correct, rng, 1, 49,
        `${a} - ${b} = ${correct}. Nice work! 🌟`);
    } else {
      const a = randInt(rng, 10, 30);
      const b = randInt(rng, 1, 9);
      const c = randInt(rng, 1, Math.min(5, a - b - 1));
      const correct = a - b - c;
      return makeQuestion(`What is ${a} - ${b} - ${c}?`, correct, rng, 0, 30,
        `Subtract step by step: ${a} - ${b} = ${a - b}, then - ${c} = ${correct}. 🌟`);
    }
  }
}

function generateMultiplicationQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, 1, 5);
    const correct = a * b;
    return makeQuestion(`What is ${a} × ${b}?`, correct, rng, 1, 25,
      `${a} × ${b} = ${correct}. That's the times table! ⭐`);
  } else {
    if (rng() < 0.5) {
      const a = randInt(rng, 6, 9);
      const b = randInt(rng, 6, 9);
      const correct = a * b;
      return makeQuestion(`What is ${a} × ${b}?`, correct, rng, 30, 90,
        `${a} × ${b} = ${correct}. You know your times tables! 🌟`);
    } else {
      const a = randInt(rng, 2, 9);
      const b = randInt(rng, 2, 6);
      const c = randInt(rng, 2, 4);
      const correct = a * b * c;
      return makeQuestion(`What is ${a} × ${b} × ${c}?`, correct, rng, 4, 200,
        `Multiply step by step: ${a} × ${b} = ${a * b}, then × ${c} = ${correct}. 🌟`);
    }
  }
}

function generateDivisionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const b = randInt(rng, 2, 5);
    const result = randInt(rng, 1, 5);
    const a = b * result;
    return makeQuestion(`What is ${a} ÷ ${b}?`, result, rng, 1, 9,
      `${a} ÷ ${b} = ${result}. Division is sharing equally! ⭐`);
  } else {
    const b = randInt(rng, 2, 9);
    const result = randInt(rng, 3, 9);
    const a = b * result;
    return makeQuestion(`What is ${a} ÷ ${b}?`, result, rng, 1, 20,
      `${a} ÷ ${b} = ${result}. ${b} × ${result} = ${a}. 🌟`);
  }
}

function generateFractionQ(difficulty: string, rng: () => number) {
  const denominators = [2, 3, 4, 5, 8];
  const denom = denominators[Math.floor(rng() * denominators.length)];
  const numer = randInt(rng, 1, denom - 1);
  if (difficulty === "easy") {
    const items = ["🍕", "🎂", "🍎", "🌟", "📚"][Math.floor(rng() * 5)];
    const parts = denom;
    const shaded = numer;
    return {
      question: `A shape is split into ${parts} equal parts. ${shaded} part${shaded > 1 ? "s are" : " is"} coloured. What fraction is coloured?`,
      options: shuffle([`${numer}/${denom}`, `${denom}/${numer}`, `1/${denom + 1}`, `${numer + 1}/${denom}`], rng),
      correctIndex: 0,
      explanation: `${shaded} out of ${parts} parts = ${numer}/${denom}. Great fractions! ⭐`,
    };
  } else {
    const q2denom = denominators[Math.floor(rng() * denominators.length)];
    const q2numer = randInt(rng, 1, q2denom - 1);
    const bigger = numer / denom > q2numer / q2denom;
    return {
      question: `Which fraction is bigger: ${numer}/${denom} or ${q2numer}/${q2denom}?`,
      options: shuffle([`${numer}/${denom}`, `${q2numer}/${q2denom}`, "They are equal", `${numer + q2numer}/${denom + q2denom}`], rng),
      correctIndex: 0,
      explanation: `${bigger ? `${numer}/${denom} > ${q2numer}/${q2denom}` : `${q2numer}/${q2denom} > ${numer}/${denom}`}. Compare by converting to decimals! 🌟`,
    };
  }
}

const MATH_TOPIC_MAP: { keywords: string[]; gen: (d: string, rng: () => number) => any }[] = [
  { keywords: ["addition", "adding", "add "], gen: generateAdditionQ },
  { keywords: ["subtraction", "subtract", "minus"], gen: generateSubtractionQ },
  { keywords: ["multiplication", "multiply", "times table"], gen: generateMultiplicationQ },
  { keywords: ["division", "divid", "sharing"], gen: generateDivisionQ },
  { keywords: ["fraction"], gen: generateFractionQ },
];

function tryProgrammaticMath(topic: string, difficulty: string, numQ: number, seed: number) {
  const t = topic.toLowerCase();
  const entry = MATH_TOPIC_MAP.find((e) => e.keywords.some((k) => t.includes(k)));
  if (!entry) return null;

  const rng = mkRng(seed);
  const questions = [];
  for (let i = 0; i < numQ; i++) {
    questions.push(entry.gen(difficulty, rng));
  }
  return { topic, questions };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompt builder — only for hard math + all non-math subjects
// ─────────────────────────────────────────────────────────────────────────────
function buildAIPrompt(topic: string, difficulty: string, numQ: number, seed: number): string {
  const t = topic.toLowerCase();

  const contexts = [
    "toys, games, and playgrounds",
    "animals and a jungle adventure",
    "food, pizza, and ice cream",
    "sports and a championship game",
    "superheroes and their powers",
    "a fun school trip",
    "pets and a pet show",
  ];
  const ctx = contexts[seed % contexts.length];

  let specificRules = "";

  if (t.includes("addition") || t.includes("adding")) {
    specificRules = `HARD ADDITION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Each question involves adding 2-3 numbers (2-3 digit range)
- Example: "The school store sold 34 pencils on Monday and 47 on Tuesday. How many total?"
- Vary: combining groups, total scores, total distances, total costs`;
  } else if (t.includes("subtraction") || t.includes("subtract")) {
    specificRules = `HARD SUBTRACTION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve taking away, finding differences, or missing numbers
- Example: "A bag had 82 marbles. 37 were lost. How many remain?"`;
  } else if (t.includes("multiplication") || t.includes("multiply")) {
    specificRules = `HARD MULTIPLICATION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve groups, arrays, repeated addition
- Example: "6 shelves each have 9 books. How many books total?"`;
  } else if (t.includes("division") || t.includes("divid")) {
    specificRules = `HARD DIVISION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve fair sharing, grouping, splitting
- Example: "48 cupcakes shared equally among 6 friends. How many each?"`;
  } else if (t.includes("fraction")) {
    specificRules = `HARD FRACTIONS — mix of word problems and concept questions:
- Use ${ctx} as the story setting
- Cover: equivalent fractions, ordering, adding simple fractions
- Example: "A pizza has 8 slices. You ate 3. What fraction is left?"`;
  } else if (t.includes("science") || t.includes("plant") || t.includes("animal") || t.includes("weather") || t.includes("body") || t.includes("water") || t.includes("solar")) {
    const levels: Record<string, string> = {
      easy: "Ask single basic facts with simple words. Age 7-8 level. Example: 'What do plants need to grow?'",
      medium: "Apply a concept or cause-and-effect. One step of reasoning. Age 9-11 level. Example: 'What happens when ice is heated?'",
      hard: "Ask WHY or HOW things work. Use scientific terms. Multi-step reasoning. Age 12-14 level.",
    };
    specificRules = `SCIENCE (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("geograph") || t.includes("continent") || t.includes("country") || t.includes("capital") || t.includes("ocean") || t.includes("map")) {
    const levels: Record<string, string> = {
      easy: "Famous capitals, major continents, very well-known countries. Example: 'What is the capital of France?'",
      medium: "Landmarks, climate zones, major rivers, population facts.",
      hard: "Border countries, comparative geography, lesser-known capitals, geopolitical facts.",
    };
    specificRules = `GEOGRAPHY (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("cod") || t.includes("program") || t.includes("algorithm") || t.includes("loop") || t.includes("variable")) {
    const levels: Record<string, string> = {
      easy: "Basic definitions: 'What is a variable?', 'What does a loop do?' Simple one-sentence answers.",
      medium: "Read a short code snippet and predict the output. Or choose the right concept for a task.",
      hard: "Debugging, algorithm logic, nested structures, or basic time-complexity.",
    };
    specificRules = `CODING (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("art") || t.includes("color") || t.includes("paint") || t.includes("draw")) {
    const levels: Record<string, string> = {
      easy: "Basic colour mixing, famous artists by first name, simple art materials. Example: 'What colours mix to make green?'",
      medium: "Art techniques, styles, famous paintings matched to artists.",
      hard: "Art movements, historical context, art theory, symbolism.",
    };
    specificRules = `ART (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("read") || t.includes("story") || t.includes("word") || t.includes("letter") || t.includes("spelling") || t.includes("grammar")) {
    const levels: Record<string, string> = {
      easy: "Simple vocabulary, rhyming words, basic comprehension, letter sounds. Age 7-8.",
      medium: "Context clues, synonyms/antonyms, simple inference. Age 9-11.",
      hard: "Literary devices, author's purpose, figurative language, complex inference. Age 12-14.",
    };
    specificRules = `READING/LANGUAGE (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else {
    const levels: Record<string, string> = {
      easy: "Only the most basic, single-fact questions. Simple language. Age 7-8.",
      medium: "One step of thinking or applying a known concept. Age 9-11.",
      hard: "Multi-step reasoning or applying multiple concepts. Age 12-14.",
    };
    specificRules = `TOPIC: ${topic} (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  }

  return `You are making a quiz for a kids learning app. Session: ${seed}.

Topic: "${topic}" | Difficulty: ${difficulty.toUpperCase()} | Questions: ${numQ}

RULES YOU MUST FOLLOW:
${specificRules}

GENERAL RULES:
- Keep language simple and friendly for kids
- Each question has exactly 4 options
- Wrong options must be plausible but wrong
- Vary numbers, names, scenarios using seed ${seed}
- Explanations: short, encouraging, educational

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Route
// ─────────────────────────────────────────────────────────────────────────────
const quizRequestSchema = z.object({
  topic: z.string().min(1),
  numQuestions: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  seed: z.number().optional(),
});

router.post("/quiz", authenticate, async (req: AuthRequest, res) => {
  const parsed = quizRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { topic, numQuestions, difficulty, seed = Date.now() } = parsed.data;

  // Use programmatic generation for easy and medium math — 100% reliable
  if (difficulty !== "hard") {
    const programmatic = tryProgrammaticMath(topic, difficulty, numQuestions, seed);
    if (programmatic) {
      res.json(programmatic);
      return;
    }
  }

  // Fall through to AI for: hard math (word problems) + all non-math subjects
  const prompt = buildAIPrompt(topic, difficulty, numQuestions, seed);

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "AIError", message: "Failed to generate quiz — no content returned" });
      return;
    }

    const quiz = JSON.parse(content);
    res.json(quiz);
  } catch (err: any) {
    const msg = err?.message ?? "Unknown AI error";
    const isKeyError = msg.includes("API key") || msg.includes("Incorrect API key") || msg.includes("401") || msg.includes("invalid_api_key");
    res.status(500).json({
      error: "AIError",
      message: isKeyError
        ? "OpenAI API key is missing or invalid. Please set OPENAI_API_KEY in your environment."
        : `AI quiz generation failed: ${msg}`,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Recommend Route
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recommend", authenticate, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const allCourses = await db.select().from(coursesTable);

  const userProgress = await db
    .select()
    .from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.completed, true)));

  const inProgressCourseIds = new Set(userProgress.map((p) => p.courseId));

  const courseSummary = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    gradeLevel: c.gradeLevel,
    difficulty: c.difficulty,
    inProgress: inProgressCourseIds.has(c.id),
  }));

  const prompt = `You are a helpful educational recommendation AI for a kids learning platform.

Available courses:
${JSON.stringify(courseSummary, null, 2)}

The student has made progress in courses with IDs: [${Array.from(inProgressCourseIds).join(", ")}]

Please recommend 3-4 courses that would be most beneficial for this student to take next.

Respond ONLY with valid JSON in this format:
{
  "courseIds": [1, 2, 3],
  "reason": "Brief encouraging explanation of why these courses are recommended"
}`;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");

    const result = JSON.parse(content);
    const recommendedIds: number[] = result.courseIds ?? [];
    const recommendedCourses = allCourses.filter((c) => recommendedIds.includes(c.id)).slice(0, 4);

    const fallback = allCourses.slice(0, 4);
    const finalCourses = recommendedCourses.length > 0 ? recommendedCourses : fallback;

    res.json({
      recommendations: finalCourses.map((c) => ({
        id: String(c.id),
        title: c.title,
        description: c.description,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        thumbnail: c.thumbnail,
        totalLessons: c.totalLessons,
        durationMinutes: c.durationMinutes,
        difficulty: c.difficulty,
        createdAt: c.createdAt.toISOString(),
      })),
      reason: result.reason ?? "Here are some courses to get you started!",
    });
  } catch {
    const fallback = allCourses.slice(0, 4);
    res.json({
      recommendations: fallback.map((c) => ({
        id: String(c.id),
        title: c.title,
        description: c.description,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        thumbnail: c.thumbnail,
        totalLessons: c.totalLessons,
        durationMinutes: c.durationMinutes,
        difficulty: c.difficulty,
        createdAt: c.createdAt.toISOString(),
      })),
      reason: "Here are some popular courses to get you started!",
    });
  }
});

export default router;
