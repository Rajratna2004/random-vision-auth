export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordStrength {
  score: number;
  level: "weak" | "fair" | "good" | "strong";
  color: string;
  checks: PasswordCheck[];
}

const COMMON_WORDS = [
  "password", "passwd", "admin", "administrator", "root", "user",
  "qwerty", "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "letmein", "welcome", "monkey", "dragon", "master",
  "abc123", "123abc", "iloveyou", "sunshine", "princess",
  "football", "baseball", "ninja", "shadow", "superman",
  "batman", "trustno1", "starwars", "pokemon", "minecraft",
  "kidolearn", "kido", "learn", "school", "student", "teacher",
];

const SEQUENTIAL_PATTERNS = [
  "0123456789",
  "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiopasdfghjklzxcvbnm",
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "zyxwvutsrqponmlkjihgfedcba",
];

function hasSequential(password: string): boolean {
  const lower = password.toLowerCase();
  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - 4; i++) {
      if (lower.includes(seq.slice(i, i + 4))) return true;
    }
    const rev = seq.split("").reverse().join("");
    for (let i = 0; i <= rev.length - 4; i++) {
      if (lower.includes(rev.slice(i, i + 4))) return true;
    }
  }
  return false;
}

function hasCommonWord(password: string): boolean {
  const lower = password.toLowerCase();
  return COMMON_WORDS.some((w) => lower.includes(w));
}

function hasRepeating(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      id: "length",
      label: "At least 12 characters long",
      passed: password.length >= 12,
    },
    {
      id: "uppercase",
      label: "Contains uppercase letter (A–Z)",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "lowercase",
      label: "Contains lowercase letter (a–z)",
      passed: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "Contains a number (0–9)",
      passed: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Contains special character (!@#$%^&*...)",
      passed: /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password),
    },
    {
      id: "noCommon",
      label: 'No common words (password, admin, qwerty...)',
      passed: password.length === 0 || !hasCommonWord(password),
    },
    {
      id: "noRepeat",
      label: "No repeating characters (aaa, 111...)",
      passed: password.length === 0 || !hasRepeating(password),
    },
    {
      id: "noSequential",
      label: "No sequential patterns (1234, abcd, qwerty...)",
      passed: password.length === 0 || !hasSequential(password),
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  let level: PasswordStrength["level"] = "weak";
  let color = "#ef4444";
  if (score >= 100) { level = "strong"; color = "#22c55e"; }
  else if (score >= 75) { level = "good"; color = "#84cc16"; }
  else if (score >= 50) { level = "fair"; color = "#f59e0b"; }

  return { score, level, color, checks };
}

export function getPasswordErrors(password: string): string[] {
  return checkPasswordStrength(password)
    .checks.filter((c) => !c.passed)
    .map((c) => c.label);
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordStrength(password).checks.every((c) => c.passed);
}
