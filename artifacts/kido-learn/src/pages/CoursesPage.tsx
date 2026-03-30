import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const subjectColors: Record<string, string> = {
  math: "from-blue-400 to-blue-600",
  science: "from-green-400 to-green-600",
  english: "from-yellow-400 to-orange-500",
  "social-studies": "from-red-400 to-pink-600",
  technology: "from-purple-400 to-purple-600",
  art: "from-pink-400 to-rose-600",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export default function CoursesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.list(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.progress.list(),
  });

  const filtered = (courses as any[]).filter((c: any) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.subject === filter;
    return matchSearch && matchFilter;
  });

  const subjects = ["all", ...Array.from(new Set((courses as any[]).map((c: any) => c.subject)))];

  function getProgress(courseId: string) {
    return (progress as any[]).find((p: any) => p.courseId === courseId);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">📚 All Courses</h1>
          <p className="text-muted-foreground">Pick a course and start your learning journey!</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="🔍 Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === s
                    ? "kid-gradient text-white shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course: any, i: number) => {
            const prog = getProgress(course.id);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden h-full"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div className={`h-2 bg-gradient-to-r ${subjectColors[course.subject] ?? "from-gray-400 to-gray-600"}`} />
                  <CardContent className="p-5">
                    <div className="text-5xl mb-3">{course.thumbnail ?? "📚"}</div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg leading-tight">{course.title}</h3>
                      <Badge className={`text-xs shrink-0 ${difficultyColors[course.difficulty] ?? ""}`}>
                        {course.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{course.gradeLevel}</span>
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {course.totalLessons} lessons
                      </span>
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {course.durationMinutes} min
                      </span>
                    </div>
                    {prog && prog.completedLessons > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{Math.round(prog.percentComplete)}%</span>
                        </div>
                        <Progress value={prog.percentComplete} className="h-2" />
                      </div>
                    )}
                    {(!prog || prog.completedLessons === 0) && (
                      <div className="text-xs text-primary font-medium">Start learning →</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg">No courses found. Try a different search!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
