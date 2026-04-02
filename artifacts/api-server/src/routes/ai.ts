import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { coursesTable, userProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { z } from "zod";
import OpenAI from "openai";

const router: IRouter = Router();

function getClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

const FUN_CONTEXTS = [
  "Use toys, games, and playgrounds as context.",
  "Use animals and a jungle adventure as context.",
  "Use space and astronauts as context.",
  "Use food, pizza, and ice cream as context.",
  "Use sports and a championship game as context.",
  "Use superheroes and a city as context.",
  "Use a school trip or field trip as context.",
];

const MATH_TOPICS = ["addition", "subtraction", "multiplication", "division", "fractions", "mental math", "numbers"];

function isMathTopic(topic: string): boolean {
  const t = topic.toLowerCase();
  return MATH_TOPICS.some((m) => t.includes(m));
}

function buildDifficultyGuide(topic: string, difficulty: string, seed: number): string {
  const t = topic.toLowerCase();
  const ctx = FUN_CONTEXTS[seed % FUN_CONTEXTS.length];

  if (isMathTopic(t)) {
    if (t.includes("addition") || t.includes("adding")) {
      if (difficulty === "easy") {
        return `EASY ADDITION RULES (strictly follow):
- Every question is a simple "What is A + B = ?" format where A and B are single-digit numbers (1-9)
- Example questions: "What is 3 + 5?", "What is 7 + 2?", "What is 4 + 6?"
- The answer must be between 2 and 18
- Wrong options should be nearby numbers (correct ± 1, ± 2, ± 3)
- Keep it super simple — this is for beginners
- ${ctx}`;
      } else if (difficulty === "medium") {
        return `MEDIUM ADDITION RULES (strictly follow):
- Every question adds THREE or MORE numbers together, e.g. "What is 4 + 7 + 3 = ?"
- OR add two 2-digit numbers, e.g. "What is 14 + 23 = ?"
- Mix both types across the 5 questions
- Numbers should be between 1-30
- Wrong options should be plausible nearby numbers
- ${ctx}`;
      } else {
        return `HARD ADDITION RULES (strictly follow):
- Questions are real-world WORD PROBLEMS requiring addition reasoning
- Example: "Mia collected 34 stickers on Monday and 47 on Tuesday. How many does she have in total?"
- OR conceptual: "Which of these equals 100?" with choices like "55+45", "60+30", "70+20", "80+30"
- Use 2-3 digit numbers
- Vary problem styles: combining groups, total cost, distance, scores
- ${ctx}`;
      }
    }

    if (t.includes("subtraction") || t.includes("subtract")) {
      if (difficulty === "easy") {
        return `EASY SUBTRACTION RULES:
- Simple "What is A - B = ?" with single-digit numbers (result always positive, e.g. 8-3, 7-4)
- Example: "What is 9 - 4?", "What is 6 - 2?"
- Answer between 1 and 9, wrong options differ by 1-3
- ${ctx}`;
      } else if (difficulty === "medium") {
        return `MEDIUM SUBTRACTION RULES:
- Subtract from 2-digit numbers, or chain subtraction: e.g. "What is 30 - 7 - 5 = ?"
- OR: "What is 45 - 18 = ?"
- Numbers between 10-50, mix both styles
- ${ctx}`;
      } else {
        return `HARD SUBTRACTION RULES:
- Real-world word problems: "Jake had 82 marbles. He gave 37 to his friend. How many are left?"
- OR find the missing number: "?? - 24 = 15. What is ???"
- 2-3 digit numbers, varied contexts
- ${ctx}`;
      }
    }

    if (t.includes("multiplication") || t.includes("multiply")) {
      if (difficulty === "easy") {
        return `EASY MULTIPLICATION RULES:
- Simple "What is A × B?" with numbers 1-5 only (times tables 1-5)
- Example: "What is 3 × 4?", "What is 2 × 5?"
- Wrong options close to correct answer
- ${ctx}`;
      } else if (difficulty === "medium") {
        return `MEDIUM MULTIPLICATION RULES:
- Times tables 6-12, OR multi-step: "What is 3 × 4 × 2?"
- Example: "What is 7 × 8?", "What is 3 × 4 × 2?"
- ${ctx}`;
      } else {
        return `HARD MULTIPLICATION RULES:
- Word problems: "A classroom has 6 rows of desks with 8 desks in each row. How many desks total?"
- OR 2-digit × 1-digit: "What is 24 × 3?"
- Varied problem styles
- ${ctx}`;
      }
    }

    if (t.includes("division") || t.includes("divid")) {
      if (difficulty === "easy") {
        return `EASY DIVISION RULES:
- Simple "What is A ÷ B?" where result is a whole number, small numbers (e.g. 12÷4, 8÷2, 9÷3)
- Example: "What is 10 ÷ 2?", "What is 6 ÷ 3?"
- ${ctx}`;
      } else if (difficulty === "medium") {
        return `MEDIUM DIVISION RULES:
- Larger dividends (20-80), e.g. "What is 48 ÷ 6?", "What is 56 ÷ 7?"
- ${ctx}`;
      } else {
        return `HARD DIVISION RULES:
- Word problems: "24 students are split into equal teams of 4. How many teams?"
- OR remainder problems: "What is 17 ÷ 5? (think: how many groups of 5 fit?)"
- ${ctx}`;
      }
    }

    if (t.includes("fraction")) {
      if (difficulty === "easy") {
        return `EASY FRACTIONS RULES:
- Identify simple fractions: "Which picture shows 1/2?", "What fraction is shaded if 1 of 4 parts is shaded?"
- Use halves, quarters, thirds only
- Very visual descriptions in questions
- ${ctx}`;
      } else if (difficulty === "medium") {
        return `MEDIUM FRACTIONS RULES:
- Compare or add simple fractions: "Which is bigger: 1/2 or 1/4?", "What is 1/4 + 1/4?"
- Use halves, thirds, quarters, fifths
- ${ctx}`;
      } else {
        return `HARD FRACTIONS RULES:
- Word problems: "A pizza has 8 slices. You eat 3. What fraction is left?"
- Mixed numbers or equivalence: "Which fraction equals 1/2? (2/4, 3/5, 2/3, 3/8)"
- ${ctx}`;
      }
    }

    // Generic math fallback
    if (difficulty === "easy") {
      return `EASY MATH RULES: Simple 1-step questions with small numbers (1-20). Single operation only. Very straightforward. ${ctx}`;
    } else if (difficulty === "medium") {
      return `MEDIUM MATH RULES: 2-step questions or larger numbers (20-100). Slightly more thinking required. ${ctx}`;
    } else {
      return `HARD MATH RULES: Word problems and real-world applications using multi-step reasoning. ${ctx}`;
    }
  }

  // ── Non-math subjects ──
  if (t.includes("science") || t.includes("plant") || t.includes("animal") || t.includes("water") || t.includes("solar") || t.includes("weather") || t.includes("body")) {
    if (difficulty === "easy") return `EASY SCIENCE RULES: Ask about single basic facts a young child would know (e.g. "What do plants need to grow?"). Simple vocabulary. 4 clear options. ${ctx}`;
    if (difficulty === "medium") return `MEDIUM SCIENCE RULES: Apply a concept or identify cause-and-effect (e.g. "What happens when water is heated?"). One step of reasoning. ${ctx}`;
    return `HARD SCIENCE RULES: Ask about WHY or HOW things work, comparisons, or multi-step reasoning. Use correct scientific terms. ${ctx}`;
  }

  if (t.includes("geograph") || t.includes("continent") || t.includes("country") || t.includes("capital") || t.includes("ocean") || t.includes("map")) {
    if (difficulty === "easy") return `EASY GEOGRAPHY RULES: Famous capitals, continents, or very well-known countries (e.g. "What is the capital of France?"). ${ctx}`;
    if (difficulty === "medium") return `MEDIUM GEOGRAPHY RULES: Landmarks, climate zones, major rivers, population facts. ${ctx}`;
    return `HARD GEOGRAPHY RULES: Geopolitical facts, border countries, comparative geography, lesser-known capitals. ${ctx}`;
  }

  if (t.includes("cod") || t.includes("program") || t.includes("algorithm") || t.includes("loop") || t.includes("variable")) {
    if (difficulty === "easy") return `EASY CODING RULES: Basic definitions only — "What is a variable?", "What does a loop do?". Simple one-sentence answers. ${ctx}`;
    if (difficulty === "medium") return `MEDIUM CODING RULES: Read a simple code snippet and predict the output, or choose the right concept for a given task. ${ctx}`;
    return `HARD CODING RULES: Debugging, algorithm logic, nested structures, or time-complexity basics. ${ctx}`;
  }

  if (t.includes("art") || t.includes("color") || t.includes("paint") || t.includes("draw")) {
    if (difficulty === "easy") return `EASY ART RULES: Basic color mixing, famous artists, simple art materials (e.g. "What do you mix to get orange?"). ${ctx}`;
    if (difficulty === "medium") return `MEDIUM ART RULES: Art techniques, styles, famous paintings and their artists. ${ctx}`;
    return `HARD ART RULES: Art movements, historical context, art theory, symbolism. ${ctx}`;
  }

  if (t.includes("read") || t.includes("story") || t.includes("word") || t.includes("letter") || t.includes("spelling") || t.includes("grammar")) {
    if (difficulty === "easy") return `EASY READING RULES: Simple vocabulary, rhyming words, basic comprehension, letter recognition. ${ctx}`;
    if (difficulty === "medium") return `MEDIUM READING RULES: Context clues, synonyms/antonyms, simple inference. ${ctx}`;
    return `HARD READING RULES: Literary devices, author's purpose, complex inference, figurative language. ${ctx}`;
  }

  // Default generic guide
  if (difficulty === "easy") return `EASY RULES: Ask only the most basic, single-fact questions a young child (age 7-8) could answer. Simple language, no complex reasoning. ${ctx}`;
  if (difficulty === "medium") return `MEDIUM RULES: Questions require one step of thinking or applying a known concept. Suitable for age 9-11. ${ctx}`;
  return `HARD RULES: Multi-step reasoning, analysis, or application of multiple concepts. Suitable for age 12-14. ${ctx}`;
}

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
  const difficultyGuide = buildDifficultyGuide(topic, difficulty, seed);

  const prompt = `You are a quiz creator for a kids' learning app. Generate a quiz for the topic: "${topic}".
Difficulty: ${difficulty.toUpperCase()}
Number of questions: ${numQuestions}
Quiz session seed (use to vary questions): ${seed}

=== STRICT DIFFICULTY RULES — YOU MUST FOLLOW THESE EXACTLY ===
${difficultyGuide}
=== END RULES ===

IMPORTANT:
- Every question MUST follow the difficulty rules above exactly
- Use different numbers, names, and scenarios from session to session (seed: ${seed})
- Wrong answer choices must be plausible but clearly wrong to someone who knows the topic
- Keep language simple and friendly for kids
- Explanations must be short, encouraging, and educational

Respond ONLY with valid JSON in this exact format:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation why this is correct."
    }
  ]
}`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.9,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "AIError", message: "Failed to generate quiz" });
    return;
  }

  const quiz = JSON.parse(content);
  res.json(quiz);
});

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
