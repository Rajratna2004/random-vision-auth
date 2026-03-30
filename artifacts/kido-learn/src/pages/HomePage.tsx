import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/store";

const subjectGradients: Record<string, string> = {
  math:             "from-[#FF6B6B] to-[#FF8E53]",
  science:          "from-[#4CAF50] to-[#45B649]",
  english:          "from-[#9B59B6] to-[#8E44AD]",
  "social-studies": "from-[#FF4E91] to-[#FF6B6B]",
  technology:       "from-[#0DA2E7] to-[#0ebaff]",
  art:              "from-[#F7971E] to-[#FFD200]",
};

const subjectIcons: Record<string, string> = {
  math: "🔢", science: "🔬", english: "📝", "social-studies": "🌍", technology: "💻", art: "🎨",
};

export default function HomePage() {
  const [, navigate] = useLocation();
  const user = getStoredUser();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.list(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.progress.list(),
  });

  const activeProgress = (progress as any[]).filter((p) => p.completedLessons > 0);
  const totalLessonsCompleted = (progress as any[]).reduce(
    (sum: number, p: any) => sum + p.completedLessons,
    0
  );
  const totalCourses = (courses as any[]).length;

  return (
    <Layout>
      <div className="space-y-10 -mt-8">

        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #0DA2E7 0%, #0ebaff 55%, #26d0ce 100%)",
            boxShadow: "0 8px 32px rgba(13,162,231,0.28)",
          }}
        >
          {/* Subtle dot-grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.14) 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Decorative glow blobs */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 px-8 py-10 sm:py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left: text content */}
            <div className="text-center sm:text-left">
              <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-2">
                Welcome back, {user?.firstName} 👋
              </p>
              <h1 className="font-heading text-4xl sm:text-5xl text-white leading-tight mb-3"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                Learn. Play. Grow.
              </h1>
              <p className="text-white/85 text-base font-medium max-w-xs sm:max-w-sm">
                Your interactive learning journey — courses, quizzes, and AI-powered hand-tracking games.
              </p>
              <div className="mt-6 flex gap-3 justify-center sm:justify-start flex-wrap">
                <button
                  onClick={() => navigate("/courses")}
                  className="bg-white text-[#0DA2E7] font-bold px-5 py-2.5 rounded-2xl text-sm hover:bg-white/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Browse Courses
                </button>
                <button
                  onClick={() => navigate("/games")}
                  className="bg-white/20 backdrop-blur-sm text-white font-bold px-5 py-2.5 rounded-2xl text-sm hover:bg-white/30 transition-all border border-white/30"
                >
                  Play Games
                </button>
              </div>
            </div>

            {/* Right: stats */}
            <div className="flex gap-3 sm:flex-col sm:items-end shrink-0">
              {[
                { value: activeProgress.length, label: "Courses in progress", icon: "📖" },
                { value: totalLessonsCompleted,  label: "Lessons completed",   icon: "✅" },
                { value: totalCourses,           label: "Total courses",        icon: "🎓" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/20 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-3 text-center sm:text-right min-w-[90px]"
                >
                  <div className="font-heading text-3xl text-white leading-none">{stat.value}</div>
                  <div className="text-white/75 text-[11px] font-semibold mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Continue Learning ── */}
        {activeProgress.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-gray-800">Continue Learning</h2>
              <button
                onClick={() => navigate("/courses")}
                className="text-[#0DA2E7] text-sm font-bold hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeProgress.slice(0, 4).map((p: any, i: number) => {
                const course = (courses as any[]).find((c) => c.id === p.courseId);
                const grad = subjectGradients[course?.subject] ?? "from-[#0DA2E7] to-[#0ebaff]";
                return (
                  <motion.div
                    key={p.courseId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => navigate(`/courses/${p.courseId}`)}
                    className="cursor-pointer group"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#0DA2E7]/30 hover:shadow-lg transition-all duration-200 group-hover:-translate-y-0.5"
                         style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                      <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
                      <div className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                          {course?.thumbnail ?? "📚"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-800 truncate">{p.courseTitle}</h3>
                          <p className="text-xs text-gray-400 mb-2">
                            {p.completedLessons} of {p.totalLessons} lessons
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={p.percentComplete} className="h-2 rounded-full flex-1" />
                            <span className="text-xs font-bold text-[#0DA2E7] shrink-0">
                              {Math.round(p.percentComplete)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── All Courses ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-gray-800">All Courses</h2>
            <button
              onClick={() => navigate("/courses")}
              className="bg-[#0DA2E7] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#0b92d0] transition-all text-sm shadow-sm"
            >
              View All →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(courses as any[]).slice(0, 6).map((course: any, i: number) => {
              const grad = subjectGradients[course.subject] ?? "from-[#0DA2E7] to-[#0ebaff]";
              const icon = subjectIcons[course.subject] ?? "📚";
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="cursor-pointer group"
                >
                  <div className={`bg-gradient-to-br ${grad} rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col gap-2`}
                       style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>
                    <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center text-2xl">
                      {course.thumbnail ?? icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight">{course.title}</h3>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] bg-black/15 text-white font-semibold px-2 py-0.5 rounded-full">{course.gradeLevel}</span>
                        <span className="text-[10px] bg-black/15 text-white font-semibold px-2 py-0.5 rounded-full">{course.totalLessons} lessons</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Quick Access ── */}
        <section>
          <h2 className="text-xl font-extrabold text-gray-800 mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "All Courses", sub: "Browse library",  icon: "📚", grad: "from-[#0DA2E7] to-[#26d0ce]", path: "/courses" },
              { label: "Play Games",  sub: "Hand tracking AI", icon: "🎮", grad: "from-[#FF6B6B] to-[#FF8E53]", path: "/games" },
              { label: "My Profile",  sub: "View account",     icon: "👤", grad: "from-[#9B59B6] to-[#8E44AD]", path: "/profile" },
              { label: "Progress",    sub: "Track learning",   icon: "📊", grad: "from-[#F7971E] to-[#FFD200]", path: "/profile" },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(item.path)}
                className="cursor-pointer"
              >
                <div className={`bg-gradient-to-br ${item.grad} rounded-2xl p-4 flex flex-col gap-1`}
                     style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>
                  <div className="text-3xl mb-1">{item.icon}</div>
                  <div className="font-bold text-white text-sm leading-tight">{item.label}</div>
                  <div className="text-white/70 text-[11px] font-medium">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  );
}
