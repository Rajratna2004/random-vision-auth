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

const subjectGradients: Record<string, string> = {
  math:             "from-[#FF6B6B] to-[#FF8E53]",
  science:          "from-[#4CAF50] to-[#45B649]",
  english:          "from-[#9B59B6] to-[#8E44AD]",
  "social-studies": "from-[#FF4E91] to-[#FF6B6B]",
  technology:       "from-[#0DA2E7] to-[#0ebaff]",
  art:              "from-[#F7971E] to-[#FFD200]",
};

const difficultyBadge: Record<string, string> = {
  beginner:     "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced:     "bg-red-100 text-red-700",
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
          <h1 className="font-heading text-4xl text-gray-700 mb-1">📚 All Courses</h1>
          <p className="text-gray-400 font-bold">Pick a course and start your learning journey!</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="🔍 Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs rounded-full"
          />
          <div className="flex gap-2 flex-wrap">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  filter === s
                    ? "bg-[#0DA2E7] text-white shadow-md"
                    : "bg-white text-gray-500 hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7] border border-gray-200"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((course: any, i: number) => {
            const prog = getProgress(course.id);
            const grad = subjectGradients[course.subject] ?? "from-[#0DA2E7] to-[#0ebaff]";
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="cursor-pointer"
              >
                <div className={`bg-gradient-to-br ${grad} rounded-3xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-2 h-full`}>
                  <div className="text-5xl drop-shadow-md">{course.thumbnail ?? "📚"}</div>
                  <h3 className="font-heading text-white text-lg leading-tight drop-shadow">{course.title}</h3>
                  <p className="text-white/80 text-xs line-clamp-2 font-semibold">{course.description}</p>
                  <div className="flex gap-1 flex-wrap justify-center mt-auto pt-1">
                    <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{course.gradeLevel}</span>
                    <span className="text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">{course.totalLessons} lessons</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${difficultyBadge[course.difficulty] ?? "bg-white/25 text-white"}`}>
                      {course.difficulty}
                    </span>
                  </div>
                  {prog && prog.completedLessons > 0 && (
                    <div className="w-full mt-1">
                      <Progress value={prog.percentComplete} className="h-2 bg-white/30" />
                      <p className="text-xs text-white/80 text-right mt-0.5 font-bold">{Math.round(prog.percentComplete)}%</p>
                    </div>
                  )}
                  {(!prog || prog.completedLessons === 0) && (
                    <div className="text-xs text-white font-bold bg-white/20 px-3 py-1 rounded-full mt-1">
                      Start learning →
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg font-bold">No courses found. Try a different search!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
