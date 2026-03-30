import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

const subjectColors: Record<string, string> = {
  math: "from-blue-400 to-blue-600",
  science: "from-green-400 to-green-600",
  english: "from-yellow-400 to-orange-500",
  "social-studies": "from-red-400 to-pink-600",
  technology: "from-purple-400 to-purple-600",
  art: "from-pink-400 to-rose-600",
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: () => api.courses.get(id!),
    enabled: !!id,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.progress.list(),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl animate-bounce mb-4">📚</div>
            <p className="text-muted-foreground">Loading course...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-xl font-bold">Course not found</p>
          <Button className="mt-4" onClick={() => navigate("/courses")}>Back to Courses</Button>
        </div>
      </Layout>
    );
  }

  const courseProgress = (progress as any[]).find((p: any) => p.courseId === id);
  const completedLessonIds = new Set(
    (progress as any[])
      .filter((p: any) => p.courseId === id && p.completedLessons > 0)
      .flatMap(() => [])
  );

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/courses")} className="mb-2">
          ← Back to Courses
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl bg-gradient-to-r ${subjectColors[(course as any).subject] ?? "from-gray-400 to-gray-600"} p-6 text-white`}
        >
          <div className="flex items-start gap-4">
            <div className="text-6xl">{(course as any).thumbnail ?? "📚"}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold mb-1">{(course as any).title}</h1>
              <p className="text-white/90 mb-3">{(course as any).description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white border-0">{(course as any).gradeLevel}</Badge>
                <Badge className="bg-white/20 text-white border-0">{(course as any).difficulty}</Badge>
                <Badge className="bg-white/20 text-white border-0">{(course as any).totalLessons} lessons</Badge>
                <Badge className="bg-white/20 text-white border-0">{(course as any).durationMinutes} min</Badge>
              </div>
            </div>
          </div>

          {courseProgress && courseProgress.completedLessons > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span>Your Progress</span>
                <span>{courseProgress.completedLessons}/{courseProgress.totalLessons} lessons</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all"
                  style={{ width: `${courseProgress.percentComplete}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        <div>
          <h2 className="text-xl font-bold mb-3">📋 Lessons</h2>
          <div className="space-y-3">
            {(course as any).lessons?.map((lesson: any, i: number) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => navigate(`/courses/${id}/lessons/${lesson.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br ${subjectColors[(course as any).subject] ?? "from-gray-400 to-gray-600"} text-white shrink-0`}>
                      {lesson.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground">{lesson.durationMinutes} minutes</p>
                    </div>
                    <div className="text-sm text-primary font-medium shrink-0">
                      Start →
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
