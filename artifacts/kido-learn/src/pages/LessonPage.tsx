import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LessonExperiment from "@/components/experiments/LessonExperiment";
import AIQuizExperiment from "@/components/experiments/AIQuizExperiment";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => api.courses.get(courseId!),
    enabled: !!courseId,
  });

  const progressMutation = useMutation({
    mutationFn: () => api.progress.update(courseId!, lessonId!, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl animate-bounce mb-4">📖</div>
            <p className="text-muted-foreground">Loading lesson...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const lesson = (course as any)?.lessons?.find((l: any) => l.id === lessonId);
  const lessons = (course as any)?.lessons ?? [];
  const currentIndex = lessons.findIndex((l: any) => l.id === lessonId);
  const nextLesson = lessons[currentIndex + 1];
  const prevLesson = lessons[currentIndex - 1];

  if (!lesson) {
    return (
      <Layout>
        <div className="text-center py-16">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-xl font-bold">Lesson not found</p>
          <Button className="mt-4" onClick={() => navigate(`/courses/${courseId}`)}>Back to Course</Button>
        </div>
      </Layout>
    );
  }

  async function handleComplete() {
    if (lessonComplete) return;
    setLessonComplete(true);
    await progressMutation.mutateAsync();
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    toast({ title: "Lesson Complete! 🎉", description: "Great job! Keep it up!" });
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)}>
            ← Back to {(course as any)?.title}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <div className="kid-gradient px-6 py-4">
              <p className="text-white/80 text-sm mb-1">Lesson {lesson.order}</p>
              <h1 className="text-2xl font-extrabold text-white">{lesson.title}</h1>
              <p className="text-white/80 text-sm mt-1">{lesson.durationMinutes} minutes</p>
            </div>
            <CardContent className="p-6 prose max-w-none">
              <p className="text-lg leading-relaxed text-foreground">{lesson.content}</p>
            </CardContent>
          </Card>
        </motion.div>

        <LessonExperiment
          key={lessonId}
          subject={(course as any)?.subject ?? "general"}
          lessonTitle={lesson.title}
          lessonOrder={lesson.order}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            {!showQuiz && (
              <Button
                variant="outline"
                onClick={() => setShowQuiz(true)}
                className="border-primary text-primary hover:bg-primary/5"
              >
                🤖 Take AI Quiz
              </Button>
            )}
          </div>

          {!lessonComplete ? (
            <Button
              onClick={handleComplete}
              className="kid-gradient text-white font-bold px-8"
              disabled={progressMutation.isPending}
            >
              {progressMutation.isPending ? "Saving..." : "✅ Mark as Complete!"}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-bold">✅ Lesson Complete!</span>
              {nextLesson && (
                <Button
                  onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                  className="kid-gradient text-white font-bold"
                >
                  Next Lesson →
                </Button>
              )}
              {!nextLesson && (
                <Button
                  onClick={() => {
                    confetti({ particleCount: 200, spread: 120 });
                    navigate(`/courses/${courseId}`);
                  }}
                  className="kid-gradient text-white font-bold"
                >
                  🏆 Course Complete!
                </Button>
              )}
            </div>
          )}
        </div>

        {showQuiz && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AIQuizExperiment
              topic={lesson.title}
              difficulty="easy"
            />
          </motion.div>
        )}

        <div className="flex justify-between pt-4 border-t">
          {prevLesson ? (
            <Button
              variant="ghost"
              onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
            >
              ← Previous: {prevLesson.title}
            </Button>
          ) : <div />}
          {nextLesson && (
            <Button
              variant="ghost"
              onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
            >
              Next: {nextLesson.title} →
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
