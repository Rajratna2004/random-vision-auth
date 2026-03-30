import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/store";

const subjectColors: Record<string, string> = {
  math: "from-blue-400 to-blue-600",
  science: "from-green-400 to-green-600",
  english: "from-yellow-400 to-orange-500",
  "social-studies": "from-red-400 to-pink-600",
  technology: "from-purple-400 to-purple-600",
  art: "from-pink-400 to-rose-600",
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
  const totalCoursesStarted = activeProgress.length;
  const totalLessonsCompleted = (progress as any[]).reduce((sum: number, p: any) => sum + p.completedLessons, 0);

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 px-6 rounded-2xl kid-gradient text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 text-8xl opacity-20 -mt-4 -mr-4">🌟</div>
          <div className="absolute bottom-0 left-0 text-6xl opacity-20 mb-2 ml-2">🚀</div>
          <h1 className="text-3xl font-extrabold mb-2">
            Hello, {user?.firstName}! 👋
          </h1>
          <p className="text-white/90 text-lg">
            Ready for today's learning adventure?
          </p>
          <div className="flex justify-center gap-8 mt-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{totalCoursesStarted}</div>
              <div className="text-white/80 text-sm">Courses Started</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{totalLessonsCompleted}</div>
              <div className="text-white/80 text-sm">Lessons Done</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{(courses as any[]).length}</div>
              <div className="text-white/80 text-sm">Courses Available</div>
            </div>
          </div>
        </motion.div>

        {activeProgress.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">📖 Continue Learning</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeProgress.slice(0, 4).map((p: any, i: number) => {
                const course = (courses as any[]).find((c) => c.id === p.courseId);
                return (
                  <motion.div
                    key={p.courseId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                      onClick={() => navigate(`/courses/${p.courseId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subjectColors[course?.subject] ?? "from-gray-400 to-gray-600"} flex items-center justify-center text-2xl`}>
                            {course?.thumbnail ?? "📚"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate">{p.courseTitle}</h3>
                            <p className="text-xs text-muted-foreground">
                              {p.completedLessons}/{p.totalLessons} lessons
                            </p>
                          </div>
                        </div>
                        <Progress value={p.percentComplete} className="h-2" />
                        <p className="text-xs text-right mt-1 text-muted-foreground">
                          {Math.round(p.percentComplete)}%
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">🎓 All Courses</h2>
            <Button variant="outline" onClick={() => navigate("/courses")}>View All</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(courses as any[]).slice(0, 6).map((course: any, i: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div className={`h-2 bg-gradient-to-r ${subjectColors[course.subject] ?? "from-gray-400 to-gray-600"}`} />
                  <CardContent className="p-4">
                    <div className="text-4xl mb-2">{course.thumbnail ?? "📚"}</div>
                    <h3 className="font-bold">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{course.gradeLevel}</span>
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{course.totalLessons} lessons</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
