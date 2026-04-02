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

const QUESTION_STYLES = [
  "scenario-based story questions (e.g. 'If Sarah has 3 apples and gives 1 away...')",
  "visual imagination questions (e.g. 'Picture a number line...')",
  "real-world application questions (e.g. 'At the store you buy...')",
  "fill-in-the-blank style questions",
  "true/false style questions rewritten as multiple choice",
  "definition or vocabulary questions",
  "cause-and-effect questions",
  "compare and contrast questions",
];

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

  const styleIndex = seed % QUESTION_STYLES.length;
  const style = QUESTION_STYLES[styleIndex];
  const angleIndex = seed % 7;
  const angles = [
    "Focus on fun real-life examples a child would relate to (games, food, animals, school).",
    "Use creative storytelling contexts (space, jungle, underwater, time travel).",
    "Use sports and outdoor activities as the context for questions.",
    "Use cooking, baking, and food as the context.",
    "Use animals and nature as the context.",
    "Use superheroes and fantasy as the context for problems.",
    "Use everyday shopping and money as the context.",
  ];
  const angleHint = angles[angleIndex];

  const prompt = `You are generating a UNIQUE and FRESH quiz. This is quiz session #${seed}.

Generate a ${difficulty} difficulty quiz about "${topic}" for kids aged 8-14.
Create exactly ${numQuestions} multiple choice questions.

IMPORTANT — This quiz MUST be completely different from any previous quiz on this topic:
- Use the question style: ${style}
- ${angleHint}
- Vary the numbers, names, and examples used — do NOT use the most obvious or textbook-standard questions
- Mix question types: some conceptual, some applied, some creative
- If the topic is math, use different numbers each time (avoid always using 5, 10, 15, 20)
- Randomness seed hint: ${seed} — let this influence your creative choices

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
}

Rules:
- Each question has exactly 4 options
- correctIndex is 0-based (0, 1, 2, or 3)
- Questions should be educational and age-appropriate
- Explanations should be encouraging and educational
- Make sure all 4 options are plausible (no obviously wrong answers)
- Do NOT repeat the same question or numbers from a typical quiz on this topic`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 1.0,
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
