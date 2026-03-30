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

const quizRequestSchema = z.object({
  topic: z.string().min(1),
  numQuestions: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

router.post("/quiz", authenticate, async (req: AuthRequest, res) => {
  const parsed = quizRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { topic, numQuestions, difficulty } = parsed.data;

  const prompt = `Generate a ${difficulty} difficulty quiz about "${topic}" for kids aged 8-14.
Create exactly ${numQuestions} multiple choice questions.

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
- Explanations should be encouraging and educational`;

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
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
