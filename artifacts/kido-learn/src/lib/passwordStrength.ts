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

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      id: "length",
      label: "At least 6 characters long",
      passed: password.length >= 6,
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
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  let level: PasswordStrength["level"] = "weak";
  let color = "#ef4444";
  if (score === 100) { level = "strong"; color = "#22c55e"; }
  else if (score >= 80) { level = "good"; color = "#84cc16"; }
  else if (score >= 60) { level = "fair"; color = "#f59e0b"; }

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
