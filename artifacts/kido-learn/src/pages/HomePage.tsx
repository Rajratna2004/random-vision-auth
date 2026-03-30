import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/store";

const subjectGradients: Record<string, string> = {
  math:           "from-[#FF6B6B] to-[#FF8E53]",
  science:        "from-[#4CAF50] to-[#45B649]",
  english:        "from-[#9B59B6] to-[#8E44AD]",
  "social-studies": "from-[#FF4E91] to-[#FF6B6B]",
  technology:     "from-[#0DA2E7] to-[#0ebaff]",
  art:            "from-[#F7971E] to-[#FFD200]",
};

const floatingItems = [
  { char: "A", color: "#FF6B6B", x: "5%",  y: "18%", size: 52, delay: 0 },
  { char: "B", color: "#4CAF50", x: "90%", y: "12%", size: 44, delay: 0.5 },
  { char: "C", color: "#9B59B6", x: "78%", y: "60%", size: 38, delay: 1 },
  { char: "1", color: "#FF8E53", x: "14%", y: "65%", size: 46, delay: 0.3 },
  { char: "2", color: "#0DA2E7", x: "85%", y: "38%", size: 40, delay: 0.8 },
  { char: "3", color: "#F7971E", x: "50%", y: "78%", size: 34, delay: 1.2 },
  { char: "★", color: "#FFD200", x: "28%", y: "20%", size: 36, delay: 0.6 },
  { char: "★", color: "#FF6B6B", x: "68%", y: "75%", size: 30, delay: 1.5 },
  { char: "●", color: "#4CAF50", x: "42%", y: "15%", size: 28, delay: 0.2 },
  { char: "▲", color: "#9B59B6", x: "22%", y: "78%", size: 32, delay: 0.9 },
  { char: "◆", color: "#FF4E91", x: "60%", y: "55%", size: 26, delay: 1.3 },
];

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
  const totalLessonsCompleted = (progress as any[]).reduce((sum: number, p: any) => sum + p.completedLessons, 0);

  return (
    <Layout>
      <div className="space-y-10 -mt-8">

        {/* ── Sky Hero ── */}
        <div className="sky-hero rounded-3xl pt-12 pb-8 px-6 min-h-[320px] flex flex-col items-center justify-center relative">

          {/* Floating colorful letters / shapes */}
          {floatingItems.map((item, i) => (
            <div
              key={i}
              className="float-item absolute select-none pointer-events-none font-heading font-bold"
              style={{
                left: item.x,
                top: item.y,
                fontSize: item.size,
                color: item.color,
                textShadow: `0 3px 0 rgba(0,0,0,0.15)`,
                animationDelay: `${item.delay}s`,
              }}
            >
              {item.char}
            </div>
          ))}

          {/* Clouds */}
          <div className="cloud-shape absolute top-6 left-[8%] w-28 h-10 opacity-80" style={{ animationDelay: "0.4s" }} />
          <div className="cloud-shape absolute top-10 right-[10%] w-20 h-7 opacity-70" style={{ animationDelay: "1.1s" }} />
          <div className="cloud-shape absolute bottom-16 left-[35%] w-16 h-6 opacity-60" />

          {/* Rainbow */}
          <div className="absolute bottom-0 right-[5%] w-48 h-24 overflow-hidden pointer-events-none">
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full border-[10px] border-red-400 opacity-60" />
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full border-[8px] border-orange-400 opacity-60" />
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full border-[7px] border-yellow-400 opacity-60" />
            <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full border-[6px] border-green-400 opacity-60" />
            <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full border-[5px] border-blue-400 opacity-60" />
            <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full border-[4px] border-purple-400 opacity-60" />
          </div>

          {/* Title */}
          <div className="relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-5xl sm:text-6xl text-white drop-shadow-lg mb-2"
              style={{ textShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              KidoLearn
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/90 text-xl font-bold mb-6"
              style={{ textShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
            >
              ✨ Learn, Play &amp; Grow! ✨
            </motion.p>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-4 flex-wrap"
            >
              {[
                { value: activeProgress.length, label: "Courses Started" },
                { value: totalLessonsCompleted,  label: "Lessons Done" },
                { value: (courses as any[]).length, label: "Courses Available" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/30 backdrop-blur-sm rounded-2xl px-5 py-3 text-center min-w-[90px]"
                >
                  <div className="font-heading text-3xl text-white drop-shadow">{stat.value}</div>
                  <div className="text-white/80 text-xs font-bold">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ── Continue Learning ── */}
        {activeProgress.length > 0 && (
          <div>
            <h2 className="font-heading text-3xl text-gray-700 mb-4">📖 Continue Learning</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeProgress.slice(0, 4).map((p: any, i: number) => {
                const course = (courses as any[]).find((c) => c.id === p.courseId);
                const grad = subjectGradients[course?.subject] ?? "from-[#0DA2E7] to-[#0ebaff]";
                return (
                  <motion.div
                    key={p.courseId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => navigate(`/courses/${p.courseId}`)}
                    className="cursor-pointer"
                  >
                    <div className="bg-white rounded-3xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden border-2 border-gray-100">
                      <div className={`h-2 bg-gradient-to-r ${grad}`} />
                      <div className="p-4 flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-3xl shadow-md shrink-0`}>
                          {course?.thumbnail ?? "📚"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate">{p.courseTitle}</h3>
                          <p className="text-xs text-gray-400 mb-2">
                            {p.completedLessons}/{p.totalLessons} lessons
                          </p>
                          <Progress value={p.percentComplete} className="h-2.5 rounded-full" />
                          <p className="text-xs text-right mt-1 font-bold text-[#0DA2E7]">
                            {Math.round(p.percentComplete)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── All Courses ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-3xl text-gray-700">🎓 All Courses</h2>
            <button
              onClick={() => navigate("/courses")}
              className="bg-[#0DA2E7] text-white font-bold px-5 py-2 rounded-full shadow hover:bg-[#0b92d0] transition-all text-sm"
            >
              View All →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(courses as any[]).slice(0, 6).map((course: any, i: number) => {
              const grad = subjectGradients[course.subject] ?? "from-[#0DA2E7] to-[#0ebaff]";
              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="cursor-pointer"
                >
                  <div className={`bg-gradient-to-br ${grad} rounded-3xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-2`}>
                    <div className="text-5xl drop-shadow-md">{course.thumbnail ?? "📚"}</div>
                    <h3 className="font-heading text-white text-lg leading-tight drop-shadow">{course.title}</h3>
                    <div className="flex gap-1 flex-wrap justify-center">
                      <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{course.gradeLevel}</span>
                      <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{course.totalLessons} lessons</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="font-heading text-3xl text-gray-700 mb-5">🚀 Quick Play</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "All Courses", emoji: "📚", grad: "from-[#0DA2E7] to-[#26d0ce]", path: "/courses" },
              { label: "Play Games",  emoji: "🎮", grad: "from-[#FF6B6B] to-[#FF8E53]", path: "/games" },
              { label: "My Profile",  emoji: "👤", grad: "from-[#9B59B6] to-[#8E44AD]", path: "/profile" },
              { label: "My Progress", emoji: "📊", grad: "from-[#F7971E] to-[#FFD200]", path: "/profile" },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(item.path)}
                className={`cursor-pointer bg-gradient-to-br ${item.grad} rounded-3xl p-5 shadow-lg flex flex-col items-center gap-2 text-center`}
              >
                <div className="text-4xl drop-shadow-md">{item.emoji}</div>
                <span className="font-heading text-white text-base drop-shadow">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
