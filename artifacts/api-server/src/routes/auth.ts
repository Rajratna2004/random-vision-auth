import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, generateToken } from "../lib/auth.js";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { z } from "zod";

const router: IRouter = Router();

const COMMON_WORDS = [
  "password", "passwd", "admin", "administrator", "root", "user",
  "qwerty", "qwertyuiop", "letmein", "welcome", "monkey", "dragon",
  "master", "abc123", "iloveyou", "sunshine", "princess", "football",
  "baseball", "ninja", "shadow", "trustno1", "pokemon", "minecraft",
  "kidolearn", "kido", "learn", "school", "student", "teacher",
];

const SEQUENTIAL_PATTERNS = [
  "0123456789", "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
];

function isPasswordStrong(password: string): { valid: boolean; reason?: string } {
  if (password.length < 6) return { valid: false, reason: "Password must be at least 6 characters long" };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Password must include at least one uppercase letter (A-Z)" };
  if (!/[a-z]/.test(password)) return { valid: false, reason: "Password must include at least one lowercase letter (a-z)" };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Password must include at least one number (0-9)" };
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password)) {
    return { valid: false, reason: "Password must include at least one special character (!@#$%^&*...)" };
  }
  const lower = password.toLowerCase();
  if (COMMON_WORDS.some((w) => lower.includes(w))) {
    return { valid: false, reason: "Password must not contain common words like 'password', 'admin', or 'qwerty'" };
  }
  if (/(.)\1{2,}/.test(password)) {
    return { valid: false, reason: "Password must not have 3 or more repeating characters (aaa, 111...)" };
  }
  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - 4; i++) {
      if (lower.includes(seq.slice(i, i + 4))) {
        return { valid: false, reason: "Password must not contain sequential patterns like '1234' or 'abcd'" };
      }
    }
    const rev = seq.split("").reverse().join("");
    for (let i = 0; i <= rev.length - 4; i++) {
      if (lower.includes(rev.slice(i, i + 4))) {
        return { valid: false, reason: "Password must not contain sequential patterns like '4321' or 'dcba'" };
      }
    }
  }
  return { valid: true };
}

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["student", "teacher"]).default("student"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { username, email, password, firstName, lastName, role } = parsed.data;

  const passwordCheck = isPasswordStrong(password);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: "WeakPassword", message: passwordCheck.reason });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const usernameExists = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (usernameExists.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash, firstName, lastName, role })
    .returning();

  const token = generateToken(newUser.id, newUser.role);

  res.status(201).json({
    message: "Registration successful",
    token,
    user: {
      id: String(newUser.id),
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      hasFace: newUser.hasFace,
      createdAt: newUser.createdAt.toISOString(),
    },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id, user.role);

  res.json({
    message: "Login successful",
    token,
    user: {
      id: String(user.id),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hasFace: user.hasFace,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "NotFound", message: "User not found" });
    return;
  }
  res.json({
    id: String(user.id),
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    hasFace: user.hasFace,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
