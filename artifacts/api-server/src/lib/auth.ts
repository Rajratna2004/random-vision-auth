import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "kido-learn-secret-key";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: number; role: string };
  } catch {
    return null;
  }
}
