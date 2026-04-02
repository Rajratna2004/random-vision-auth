import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AIQuizExperiment from "@/components/experiments/AIQuizExperiment";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getLessonMedia, type DiagramStep } from "@/lib/lessonMedia";
import confetti from "canvas-confetti";

interface ChallengeItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function TheoryContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/);
  return (
    <div className="space-y-4 text-base leading-relaxed text-foreground/90">
      {paragraphs.map((para, i) => {
        const lines = para.split(/\n/);
        const isList = lines.every(l => l.trim().startsWith("- ") || l.trim().startsWith("* ") || /^\d+\.\s/.test(l.trim()));
        if (isList && lines.length > 1) {
          return (
            <ul key={i} className="space-y-1.5 ml-2">
              {lines.map((line, j) => {
                const cleaned = line.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, "");
                return (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span><FormattedText text={cleaned} /></span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <p key={i}>
            <FormattedText text={para} />
          </p>
        );
      })}
    </div>
  );
}

function ConceptDiagram({ steps }: { steps: DiagramStep[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2">
      {steps.map((step, i) => {
        if (step.isArrow) {
          return (
            <div key={i} className="flex items-center justify-center text-2xl text-muted-foreground px-1">
              {step.icon}
            </div>
          );
        }
        const colors: Record<string, string> = {
          green: "from-emerald-50 to-green-50 border-emerald-200",
          blue: "from-blue-50 to-sky-50 border-blue-200",
          red: "from-red-50 to-rose-50 border-red-200",
        };
        const colorClass = step.color ? colors[step.color] ?? colors.green : "from-white to-slate-50 border-slate-200";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 bg-gradient-to-b ${colorClass} px-4 py-3 min-w-[80px] shadow-sm`}
          >
            <span className="text-2xl leading-tight text-center">{step.icon}</span>
            {step.label && (
              <span className="text-[10px] font-semibold text-slate-600 text-center mt-1 whitespace-pre-line leading-tight">
                {step.label}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}


function ChallengeCard({
  challenge,
  index,
  onAnswer,
}: {
  challenge: ChallengeItem;
  index: number;
  onAnswer: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === challenge.correctIndex;
    onAnswer(correct);
    if (correct) {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.65 }, colors: ["#0DA2E7", "#26d0ce", "#fbbf24"] });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <div className="px-5 py-4 bg-muted/40 border-b border-border/50 flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full kid-gradient text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-foreground leading-snug pt-0.5">
            {challenge.question}
          </p>
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="grid grid-cols-1 gap-2">
            {challenge.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === challenge.correctIndex;
              const answered = selected !== null;
              let cls = "w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 ";
              if (!answered) {
                cls += "border-border hover:border-primary hover:bg-primary/5 cursor-pointer";
              } else if (isCorrect) {
                cls += "border-green-400 bg-green-50 text-green-700 cursor-default";
              } else if (isSelected) {
                cls += "border-red-400 bg-red-50 text-red-600 cursor-default";
              } else {
                cls += "border-border bg-muted/30 text-muted-foreground opacity-50 cursor-default";
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={answered}>
                  <span className="font-bold mr-2 text-primary/70">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {answered && isCorrect && <span className="ml-2">✓</span>}
                  {answered && isSelected && !isCorrect && <span className="ml-2">✗</span>}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {selected !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <div className={`mt-2 rounded-xl px-4 py-3 text-sm ${
                  selected === challenge.correctIndex
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-amber-50 border border-amber-200 text-amber-800"
                }`}>
                  <span className="mr-1">{selected === challenge.correctIndex ? "🎉" : "💡"}</span>
                  {challenge.explanation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [challengeScore, setChallengeScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

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

  const lesson = useMemo(() => (course as any)?.lessons?.find((l: any) => l.id === lessonId), [course, lessonId]);
  const lessons = useMemo(() => (course as any)?.lessons ?? [], [course]);
  const currentIndex = useMemo(() => lessons.findIndex((l: any) => l.id === lessonId), [lessons, lessonId]);
  const nextLesson = lessons[currentIndex + 1];
  const prevLesson = lessons[currentIndex - 1];

  const challenges: ChallengeItem[] = useMemo(() => lesson?.challenges ?? [], [lesson]);
  const totalChallenges = challenges.length;

  const courseTitle = (course as any)?.title ?? "";
  const media = useMemo(
    () => getLessonMedia(courseTitle, lesson?.order ?? 0),
    [courseTitle, lesson?.order]
  );

  function handleChallengeAnswer(correct: boolean) {
    if (correct) setChallengeScore((s) => s + 1);
    setAnsweredCount((c) => c + 1);
  }

  async function handleComplete() {
    if (lessonComplete) return;
    setLessonComplete(true);
    await progressMutation.mutateAsync();
    confetti({ particleCount: 180, spread: 120, origin: { y: 0.5 }, colors: ["#0DA2E7", "#26d0ce", "#fbbf24", "#f472b6"] });
    toast({ title: "Lesson Complete! 🎉", description: "Excellent work! Keep going!" });
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground font-medium">Loading lesson...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!lesson) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-xl font-bold text-foreground mb-4">Lesson not found</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>← Back to Course</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/courses/${courseId}`)}>
            ← {courseTitle}
          </Button>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground font-medium truncate">{lesson.title}</span>
        </div>

        {/* Hero Card with Image Banner */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden shadow-lg border-0">
            {/* Image Banner */}
            <div className="relative h-52 overflow-hidden">
              <img
                src={lesson.imageUrl || media.imageUrl}
                alt={lesson.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = media.imageUrl;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
                    Lesson {lesson.order}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
                    {lesson.durationMinutes} min
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
                  {media.emoji} {lesson.title}
                </h1>
              </div>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Simple "What You'll Learn" Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100">
                <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2">💡 In Simple Words</h2>
                <p className="text-base font-semibold text-blue-900 leading-relaxed">{media.simpleSummary}</p>
              </div>

              {/* Theory Content */}
              <div>
                <h2 className="text-lg font-extrabold text-foreground mb-3">📖 Let's Learn!</h2>
                <TheoryContent content={lesson.content} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Concept Diagram Section */}
        {media.diagramSteps && media.diagramSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden shadow-md border-0">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg shadow">
                  💡
                </div>
                <div>
                  <h2 className="font-extrabold text-foreground">How It Works — Step by Step</h2>
                  <p className="text-xs text-muted-foreground">See the concept visually!</p>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 p-4">
                  <ConceptDiagram steps={media.diagramSteps} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}


        {/* Key Facts Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="overflow-hidden shadow-md border-0">
            <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-yellow-50 to-amber-50">
              <h2 className="font-extrabold text-foreground flex items-center gap-2">
                <span className="text-xl">⭐</span> Key Facts to Remember
              </h2>
            </div>
            <CardContent className="p-5 space-y-3">
              {media.keyFacts.map((fact, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex gap-3 items-start"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full kid-gradient text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/90">{fact}</p>
                </motion.div>
              ))}

              {/* Fun Fact */}
              <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                <p className="text-sm font-semibold text-purple-800 leading-relaxed">{media.funFact}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Challenges Section */}
        {totalChallenges > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">🎯 Practice Challenges</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{totalChallenges} questions to test your understanding</p>
              </div>
              {answeredCount > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-primary">{challengeScore}/{answeredCount}</div>
                  <div className="text-xs text-muted-foreground">correct</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {answeredCount > 0 && (
              <div className="w-full bg-secondary rounded-full h-2">
                <motion.div
                  className="kid-gradient h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(answeredCount / totalChallenges) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}

            <div className="space-y-3">
              {challenges.map((ch, i) => (
                <ChallengeCard
                  key={i}
                  challenge={ch}
                  index={i}
                  onAnswer={handleChallengeAnswer}
                />
              ))}
            </div>

            {/* Score summary when all answered */}
            <AnimatePresence>
              {answeredCount === totalChallenges && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="kid-gradient border-0 shadow-lg">
                    <CardContent className="p-6 text-center text-white">
                      <div className="text-4xl mb-2">
                        {challengeScore === totalChallenges ? "🏆" : challengeScore >= totalChallenges * 0.7 ? "⭐" : "📚"}
                      </div>
                      <h3 className="text-xl font-extrabold">
                        {challengeScore}/{totalChallenges} Correct!
                      </h3>
                      <p className="text-white/85 text-sm mt-1">
                        {challengeScore === totalChallenges
                          ? "Perfect! You've mastered this lesson!"
                          : challengeScore >= totalChallenges * 0.7
                          ? "Great job! Review the explanations to improve."
                          : "Keep practicing! Read through the theory again."}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* AI Quiz Section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {!showQuiz ? (
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
              onClick={() => setShowQuiz(true)}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                  🤖
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-base">AI-Powered Quiz</h3>
                  <p className="text-sm text-muted-foreground">5 unique AI-generated questions about {lesson.title}</p>
                </div>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 font-bold shrink-0">
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AIQuizExperiment topic={lesson.title} difficulty="easy" />
          )}
        </motion.div>

        {/* Complete / Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between gap-3 pt-2 border-t border-border/50"
        >
          <div>
            {prevLesson && (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}>
                ← Prev
              </Button>
            )}
          </div>

          {!lessonComplete ? (
            <Button
              onClick={handleComplete}
              className="kid-gradient text-white font-bold px-8 shadow-md"
              disabled={progressMutation.isPending}
            >
              {progressMutation.isPending ? "Saving..." : "✅ Mark Complete"}
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-bold text-sm">✅ Completed!</span>
              {nextLesson ? (
                <Button
                  onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                  className="kid-gradient text-white font-bold"
                >
                  Next: {nextLesson.title.length > 22 ? nextLesson.title.slice(0, 22) + "…" : nextLesson.title} →
                </Button>
              ) : (
                <Button
                  onClick={() => { confetti({ particleCount: 250, spread: 150 }); navigate(`/courses/${courseId}`); }}
                  className="kid-gradient text-white font-bold"
                >
                  🏆 Course Complete!
                </Button>
              )}
            </div>
          )}

          <div>
            {nextLesson && (
              <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}>
                Next →
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
