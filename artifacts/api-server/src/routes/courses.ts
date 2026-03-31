import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { coursesTable, lessonsTable, userProgressTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { z } from "zod";

const router: IRouter = Router();

router.get("/courses", async (_req, res) => {
  const courses = await db.select().from(coursesTable).orderBy(coursesTable.createdAt);

  res.json(
    courses.map((c) => ({
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
    }))
  );
});

router.get("/courses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "NotFound", message: "Course not found" });
    return;
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) {
    res.status(404).json({ error: "NotFound", message: "Course not found" });
    return;
  }

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.courseId, id))
    .orderBy(lessonsTable.order);

  res.json({
    id: String(course.id),
    title: course.title,
    description: course.description,
    subject: course.subject,
    gradeLevel: course.gradeLevel,
    thumbnail: course.thumbnail,
    totalLessons: course.totalLessons,
    durationMinutes: course.durationMinutes,
    difficulty: course.difficulty,
    createdAt: course.createdAt.toISOString(),
    lessons: lessons.map((l) => ({
      id: String(l.id),
      title: l.title,
      content: l.content,
      order: l.order,
      durationMinutes: l.durationMinutes,
      videoUrl: l.videoUrl,
      imageUrl: l.imageUrl ?? null,
      challenges: l.challenges ?? null,
    })),
  });
});

router.get("/progress", authenticate, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const courses = await db.select().from(coursesTable);
  const progressData = await db
    .select()
    .from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.completed, true)));

  const result = courses.map((course) => {
    const completed = progressData.filter((p) => p.courseId === course.id).length;
    return {
      courseId: String(course.id),
      courseTitle: course.title,
      completedLessons: completed,
      totalLessons: course.totalLessons,
      percentComplete: course.totalLessons > 0 ? (completed / course.totalLessons) * 100 : 0,
      lastAccessedAt:
        progressData
          .filter((p) => p.courseId === course.id)
          .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]
          ?.completedAt?.toISOString() ?? null,
    };
  });

  res.json(result);
});

const updateProgressSchema = z.object({
  lessonId: z.string(),
  completed: z.boolean(),
});

router.post("/progress/:courseId", authenticate, async (req: AuthRequest, res) => {
  const parsed = updateProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const userId = req.userId!;
  const courseId = parseInt(req.params.courseId);
  const lessonId = parseInt(parsed.data.lessonId);

  if (isNaN(courseId) || isNaN(lessonId)) {
    res.status(400).json({ error: "BadRequest", message: "Invalid IDs" });
    return;
  }

  const existing = await db
    .select()
    .from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.lessonId, lessonId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userProgressTable)
      .set({
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? new Date() : null,
      })
      .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.lessonId, lessonId)));
  } else {
    await db.insert(userProgressTable).values({
      userId,
      courseId,
      lessonId,
      completed: parsed.data.completed,
      completedAt: parsed.data.completed ? new Date() : null,
    });
  }

  const completedCount = await db
    .select({ count: count() })
    .from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.courseId, courseId), eq(userProgressTable.completed, true)));

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);

  res.json({
    courseId: String(courseId),
    courseTitle: course?.title ?? "",
    completedLessons: completedCount[0]?.count ?? 0,
    totalLessons: course?.totalLessons ?? 0,
    percentComplete:
      course && course.totalLessons > 0
        ? ((completedCount[0]?.count ?? 0) / course.totalLessons) * 100
        : 0,
  });
});

export default router;
