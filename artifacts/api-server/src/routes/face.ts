import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { generateToken } from "../lib/auth.js";
import { z } from "zod";

const router: IRouter = Router();

const faceRegisterSchema = z.object({
  descriptor: z.array(z.number()).length(128),
});

const faceVerifySchema = z.object({
  descriptor: z.array(z.number()).length(128),
});

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

router.post("/register", authenticate, async (req: AuthRequest, res) => {
  const parsed = faceRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const userId = req.userId!;
  await db.update(usersTable).set({
    faceDescriptor: parsed.data.descriptor,
    hasFace: true,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  res.json({ message: "Face registered successfully" });
});

router.post("/verify", async (req, res) => {
  const parsed = faceVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Invalid descriptor" });
    return;
  }

  const { descriptor } = parsed.data;
  const users = await db.select().from(usersTable).where(eq(usersTable.hasFace, true));

  let bestMatch: { user: typeof users[0]; distance: number } | null = null;

  for (const user of users) {
    if (!user.faceDescriptor || !Array.isArray(user.faceDescriptor)) continue;
    const dist = euclideanDistance(descriptor, user.faceDescriptor as number[]);
    if (!bestMatch || dist < bestMatch.distance) {
      bestMatch = { user, distance: dist };
    }
  }

  const THRESHOLD = 0.6;

  if (!bestMatch || bestMatch.distance > THRESHOLD) {
    res.json({ match: false, distance: bestMatch?.distance ?? 1, message: "No matching face found" });
    return;
  }

  const token = generateToken(bestMatch.user.id, bestMatch.user.role);

  res.json({
    match: true,
    distance: bestMatch.distance,
    message: "Face matched",
    token,
    user: {
      id: String(bestMatch.user.id),
      username: bestMatch.user.username,
      email: bestMatch.user.email,
      firstName: bestMatch.user.firstName,
      lastName: bestMatch.user.lastName,
      role: bestMatch.user.role,
      hasFace: bestMatch.user.hasFace,
      createdAt: bestMatch.user.createdAt.toISOString(),
    },
  });
});

export default router;
