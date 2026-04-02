import { motion } from "framer-motion";

interface ProgressData {
  coursesStarted: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  totalCourses: number;
  totalLessons: number;
}

interface ProgressDashboardProps {
  firstName: string;
  lastName: string;
  progress: ProgressData;
}

const LEVELS = [
  { min: 0,  max: 4,  label: "Beginner",  emoji: "🌱", color: "from-slate-400 to-slate-500",    bg: "bg-slate-100",    text: "text-slate-700" },
  { min: 5,  max: 14, label: "Learner",   emoji: "📚", color: "from-blue-400 to-blue-500",       bg: "bg-blue-100",     text: "text-blue-700"  },
  { min: 15, max: 29, label: "Explorer",  emoji: "🔭", color: "from-cyan-400 to-teal-500",       bg: "bg-cyan-100",     text: "text-teal-700"  },
  { min: 30, max: 49, label: "Scholar",   emoji: "🎓", color: "from-purple-400 to-violet-500",   bg: "bg-purple-100",   text: "text-purple-700"},
  { min: 50, max: 59, label: "Champion",  emoji: "🏆", color: "from-yellow-400 to-amber-500",    bg: "bg-yellow-100",   text: "text-amber-700" },
  { min: 60, max: 60, label: "Grandmaster", emoji: "👑", color: "from-rose-400 to-pink-500",    bg: "bg-pink-100",     text: "text-pink-700"  },
];

function getLevelInfo(lessons: number) {
  return LEVELS.find((l) => lessons >= l.min && lessons <= l.max) ?? LEVELS[0];
}

function getMotivation(pct: number): { msg: string; emoji: string } {
  if (pct === 0)   return { msg: "Ready to start? Your adventure awaits!", emoji: "🚀" };
  if (pct < 15)    return { msg: "Great start! Keep exploring!", emoji: "🌱" };
  if (pct < 35)    return { msg: "You're building momentum — keep going!", emoji: "🔥" };
  if (pct < 60)    return { msg: "Wow, you're crushing it! Amazing!", emoji: "⭐" };
  if (pct < 85)    return { msg: "Almost there — you're incredible!", emoji: "🎯" };
  if (pct < 100)   return { msg: "So close to being a Grandmaster!", emoji: "🌟" };
  return { msg: "You completed everything — you're a legend!", emoji: "👑" };
}

const ACHIEVEMENTS = [
  { id: "first_step",    label: "First Step",     emoji: "👣", desc: "Complete your first lesson",   check: (p: ProgressData) => p.lessonsCompleted >= 1  },
  { id: "curious",       label: "Curious Mind",   emoji: "🤔", desc: "Start your first course",      check: (p: ProgressData) => p.coursesStarted >= 1    },
  { id: "quick_learner", label: "Quick Learner",  emoji: "⚡", desc: "Complete 5 lessons",           check: (p: ProgressData) => p.lessonsCompleted >= 5  },
  { id: "dedicated",     label: "Dedicated",      emoji: "💪", desc: "Complete 10 lessons",          check: (p: ProgressData) => p.lessonsCompleted >= 10 },
  { id: "course_ace",    label: "Course Ace",     emoji: "🎓", desc: "Finish your first course",     check: (p: ProgressData) => p.coursesCompleted >= 1  },
  { id: "halfway",       label: "Halfway Hero",   emoji: "🌟", desc: "Complete 30 lessons",          check: (p: ProgressData) => p.lessonsCompleted >= 30 },
  { id: "multi_master",  label: "Multi-Master",   emoji: "🏆", desc: "Complete 3 courses",           check: (p: ProgressData) => p.coursesCompleted >= 3  },
  { id: "grandmaster",   label: "Grandmaster",    emoji: "👑", desc: "Complete all 6 courses",       check: (p: ProgressData) => p.coursesCompleted >= 6  },
];

function CircularProgress({ value, max, size = 80, color }: { value: number; max: number; size?: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-extrabold text-slate-800">{pct}%</span>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, max, color, barColor, delay,
}: {
  icon: string; label: string; value: number; max: number;
  color: string; barColor: string; delay: number;
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 20 }}
      className={`${color} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs font-bold text-slate-600 leading-tight">{label}</span>
        </div>
        <CircularProgress value={value} max={max} size={56} color={barColor} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-extrabold text-slate-800">{value}</span>
          <span className="text-xs text-slate-500">/ {max}</span>
        </div>
        <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function AchievementBadge({ achievement, unlocked, index }: {
  achievement: typeof ACHIEVEMENTS[0]; unlocked: boolean; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 * index, type: "spring", stiffness: 300, damping: 18 }}
      title={unlocked ? achievement.desc : `🔒 ${achievement.desc}`}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 cursor-default transition-all ${
        unlocked
          ? "bg-white border-yellow-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          : "bg-slate-50 border-slate-200 opacity-40"
      }`}
    >
      <span className="text-2xl leading-none">{achievement.emoji}</span>
      <span className={`text-[10px] font-bold text-center leading-tight ${unlocked ? "text-slate-700" : "text-slate-400"}`}>
        {achievement.label}
      </span>
      {unlocked && (
        <span className="text-[9px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded-full">Earned!</span>
      )}
    </motion.div>
  );
}

export default function ProgressDashboard({ firstName, lastName, progress }: ProgressDashboardProps) {
  const { lessonsCompleted, coursesStarted, coursesCompleted, totalCourses, totalLessons } = progress;
  const overallPct = totalLessons === 0 ? 0 : Math.round((lessonsCompleted / totalLessons) * 100);
  const levelInfo = getLevelInfo(lessonsCompleted);
  const nextLevel = LEVELS.find((l) => l.min > lessonsCompleted);
  const motivation = getMotivation(overallPct);
  const starsEarned = lessonsCompleted;

  const nextGoal = (() => {
    if (lessonsCompleted === 0) return { msg: "Complete your very first lesson!", progress: 0 };
    if (coursesCompleted === 0) {
      const firstCourseTotal = 10;
      const firstCourseProgress = (progress as any).firstCourseCompleted ?? Math.min(lessonsCompleted, firstCourseTotal);
      return { msg: `Finish your first full course (${firstCourseTotal - Math.min(lessonsCompleted, firstCourseTotal)} lessons left)`, progress: Math.min(100, (firstCourseProgress / firstCourseTotal) * 100) };
    }
    if (nextLevel) {
      const needed = nextLevel.min - lessonsCompleted;
      return { msg: `Complete ${needed} more lesson${needed !== 1 ? "s" : ""} to reach ${nextLevel.label} ${nextLevel.emoji}`, progress: ((lessonsCompleted - levelInfo.min) / (levelInfo.max - levelInfo.min + 1)) * 100 };
    }
    return { msg: "You've reached the top — Grandmaster!", progress: 100 };
  })();

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          {["⭐","🌟","✨","💫","⭐","🌟"].map((s, i) => (
            <span key={i} className="absolute text-2xl" style={{ top: `${10 + i * 14}%`, left: `${5 + i * 16}%`, opacity: 0.6 }}>{s}</span>
          ))}
        </div>
        <div className="relative flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, repeatDelay: 3 }}
            className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
          >
            {levelInfo.emoji}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-0.5">Learning Journey</p>
            <h2 className="text-xl font-extrabold leading-tight truncate">{firstName}'s Dashboard</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {levelInfo.emoji} {levelInfo.label}
              </span>
              <span className="bg-yellow-400/30 backdrop-blur-sm text-yellow-100 text-xs font-bold px-2.5 py-1 rounded-full">
                ⭐ {starsEarned} Stars
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-center">
            <div className="text-3xl font-extrabold">{overallPct}%</div>
            <div className="text-white/70 text-[10px] font-semibold">Complete</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 relative">
          <div className="flex justify-between text-xs text-white/70 font-semibold mb-1">
            <span>{motivation.emoji} {motivation.msg}</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/60 mt-1">
            <span>{lessonsCompleted} lessons done</span>
            <span>{totalLessons} total</span>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon="📖" label="Courses\nStarted" value={coursesStarted} max={totalCourses}
          color="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
          barColor="#6366f1" delay={0.1}
        />
        <StatCard
          icon="✅" label="Lessons\nCompleted" value={lessonsCompleted} max={totalLessons}
          color="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100"
          barColor="#22c55e" delay={0.18}
        />
        <StatCard
          icon="🏆" label="Courses\nFinished" value={coursesCompleted} max={totalCourses}
          color="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100"
          barColor="#f59e0b" delay={0.26}
        />
      </div>

      {/* Next Goal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-violet-800 mb-1">Next Goal</h3>
            <p className="text-xs text-violet-600 font-medium leading-relaxed">{nextGoal.msg}</p>
            <div className="mt-2 w-full h-2 bg-violet-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, nextGoal.progress))}%` }}
                transition={{ delay: 0.6, duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Achievement Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            🏅 Achievements
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {ACHIEVEMENTS.filter((a) => a.check(progress)).length}/{ACHIEVEMENTS.length} earned
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENTS.map((achievement, i) => (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.check(progress)}
              index={i}
            />
          ))}
        </div>
      </motion.div>

      {/* Level Progress */}
      {nextLevel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-4"
        >
          <h3 className="text-sm font-extrabold text-amber-800 mb-3">⚡ Level Progress</h3>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${levelInfo.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
              {levelInfo.emoji}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span className={levelInfo.text}>{levelInfo.label}</span>
                <span className="text-slate-400">→</span>
                <span className={nextLevel.text}>{nextLevel.label} {nextLevel.emoji}</span>
              </div>
              <div className="w-full h-3 bg-amber-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${levelInfo.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, ((lessonsCompleted - levelInfo.min) / (levelInfo.max - levelInfo.min + 1)) * 100)}%` }}
                  transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-amber-600 font-semibold mt-1">
                {nextLevel.min - lessonsCompleted} lesson{nextLevel.min - lessonsCompleted !== 1 ? "s" : ""} to {nextLevel.label}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${nextLevel.bg} flex items-center justify-center text-2xl flex-shrink-0 opacity-50`}>
              {nextLevel.emoji}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
