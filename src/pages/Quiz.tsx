import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Brain, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Sparkles, Zap, Target, Award, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizResult {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
}

import { generateJSON } from "@/lib/gemini";

const POPULAR_TOPICS = [
  { topic: "Data Structures", icon: "🗃️" },
  { topic: "Machine Learning", icon: "🤖" },
  { topic: "Calculus", icon: "📐" },
  { topic: "Operating Systems", icon: "💻" },
  { topic: "Database Systems", icon: "🗄️" },
  { topic: "Computer Networks", icon: "🌐" },
];

export default function Quiz() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "intermediate" | "hard">("intermediate");
  const [questionCount, setQuestionCount] = useState("5");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [studiedTopics, setStudiedTopics] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadStudiedTopics();
    }
  }, [user]);

  const loadStudiedTopics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("studied_topics")
      .select("topic")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false })
      .limit(10);

    if (data) {
      setStudiedTopics(data.map(t => t.topic));
    }
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    setQuestions([]);
    setResults([]);
    setCurrentQuestion(0);
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowExplanation(false);

    try {
      const prompt = `Generate exactly ${questionCount} ${difficulty} difficulty multiple-choice quiz questions about "${topic}".

Return ONLY valid JSON array (no markdown) in this format:
[
  {
    "question": "Clear, specific question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this answer is correct"
  }
]

Rules:
- Exactly 4 options per question
- correctIndex is 0-3
- Questions must be factually accurate
- Options must be plausible (no obvious wrong answers)
- Include clear explanations`;

      const parsed = await generateJSON<QuizQuestion[]>(prompt,
        "You are an expert quiz generator. Generate accurate, educational quiz questions.",
        { temperature: 0.7 }
      );

      // Handle both array and object with questions key
      const questions_arr = Array.isArray(parsed) ? parsed : (parsed as any).questions || [];
      setQuestions(questions_arr);
      setStartTime(Date.now());

      if (user) {
        await trackStudiedTopic(topic);
      }

      toast.success(`${questions_arr.length} questions generated!`);
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const trackStudiedTopic = async (topicName: string) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("studied_topics")
      .select("id, study_count")
      .eq("user_id", user.id)
      .eq("topic", topicName)
      .single();

    if (existing) {
      await supabase
        .from("studied_topics")
        .update({
          study_count: existing.study_count + 1,
          last_studied_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("studied_topics")
        .insert({ user_id: user.id, topic: topicName, source: "quiz" });
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.error("Please select an answer");
      return;
    }

    const isCorrect = selectedAnswer === questions[currentQuestion].correctIndex;
    setResults([...results, {
      questionIndex: currentQuestion,
      selectedIndex: selectedAnswer,
      isCorrect,
    }]);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizComplete(true);

    if (!user || !startTime) return;

    const correctAnswers = results.filter(r => r.isCorrect).length +
      (selectedAnswer === questions[currentQuestion].correctIndex ? 1 : 0);
    const totalQuestions = questions.length;
    const scorePercentage = (correctAnswers / totalQuestions) * 100;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    await supabase.from("quiz_results").insert({
      user_id: user.id,
      topic,
      difficulty,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      score_percentage: scorePercentage,
      time_taken_seconds: timeTaken,
    });
  };

  const resetQuiz = () => {
    setQuestions([]);
    setResults([]);
    setCurrentQuestion(0);
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTopic("");
  };

  const correctCount = results.filter(r => r.isCorrect).length +
    (showExplanation && selectedAnswer === questions[currentQuestion]?.correctIndex ? 1 : 0);
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  if (quizComplete) {
    const finalScore = (correctCount / questions.length) * 100;
    const getScoreGrade = () => {
      if (finalScore >= 90) return { label: "Excellent!", color: "from-emerald-500 to-green-500", icon: Award };
      if (finalScore >= 70) return { label: "Great Job!", color: "from-blue-500 to-cyan-500", icon: Star };
      if (finalScore >= 50) return { label: "Good Effort!", color: "from-yellow-500 to-orange-500", icon: Zap };
      return { label: "Keep Learning!", color: "from-purple-500 to-violet-500", icon: Target };
    };
    const grade = getScoreGrade();

    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-blob" />
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
            </div>

            <Card className="relative w-full max-w-lg text-center border-2 border-primary/20 bg-card/80 backdrop-blur-sm shadow-2xl">
              <CardHeader className="pb-2">
                <div className={cn(
                  "mx-auto w-24 h-24 rounded-3xl flex items-center justify-center mb-4 shadow-xl bg-gradient-to-br",
                  grade.color
                )}>
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">Quiz Complete!</CardTitle>
                <p className="text-muted-foreground">Topic: {topic}</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="relative">
                  <div className={cn(
                    "text-7xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    grade.color
                  )}>
                    {finalScore.toFixed(0)}%
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <grade.icon className="w-5 h-5 text-primary" />
                    <span className="text-lg font-medium">{grade.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-500">{correctCount}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
                    <div className="text-xs text-muted-foreground">Wrong</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-500">{questions.length}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button onClick={resetQuiz} size="lg" className="w-full gap-2 h-12 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 shadow-lg">
                    <RotateCcw className="w-5 h-5" />
                    Take Another Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-2xl mx-auto relative">
            {/* Header */}
            <div className="text-center space-y-4 pt-8">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-primary/30">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  AI Quiz Generator
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Test your knowledge with AI-powered quizzes
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" /> Powered by AI
                </Badge>
              </div>
            </div>

            {/* Main Card */}
            <Card className="border-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
              <CardContent className="p-8 space-y-6">
                {/* Topic Input */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Choose Your Topic
                  </label>
                  <Input
                    placeholder="e.g., Machine Learning, Calculus, World History..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generateQuiz()}
                    className="h-14 text-lg bg-muted/50 border-2 border-border/50 focus:border-primary/50 rounded-xl"
                  />
                </div>

                {/* Popular Topics */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Popular Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TOPICS.map((t) => (
                      <button
                        key={t.topic}
                        onClick={() => setTopic(t.topic)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all border-2",
                          topic === t.topic
                            ? "bg-primary/10 border-primary/50 text-primary"
                            : "bg-muted/50 border-transparent hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <span className="mr-2">{t.icon}</span>
                        {t.topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Topics */}
                {studiedTopics.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Your Recent Topics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {studiedTopics.slice(0, 5).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 py-1.5 px-3"
                          onClick={() => setTopic(t)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" /> Difficulty
                    </label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border/50 bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">
                          <span className="flex items-center gap-2">🟢 Easy</span>
                        </SelectItem>
                        <SelectItem value="intermediate">
                          <span className="flex items-center gap-2">🟡 Intermediate</span>
                        </SelectItem>
                        <SelectItem value="hard">
                          <span className="flex items-center gap-2">🔴 Hard</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-500" /> Questions
                    </label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger className="h-12 rounded-xl border-2 border-border/50 bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 questions</SelectItem>
                        <SelectItem value="5">5 questions</SelectItem>
                        <SelectItem value="10">10 questions</SelectItem>
                        <SelectItem value="15">15 questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateQuiz}
                  disabled={loading}
                  size="lg"
                  className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 shadow-lg shadow-primary/30 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Generate Quiz
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-primary/5">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
          {/* Progress Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-semibold",
                  difficulty === "easy" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
                  difficulty === "intermediate" && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30",
                  difficulty === "hard" && "bg-red-500/10 text-red-500 border border-red-500/30"
                )}>
                  {difficulty === "easy" ? "🟢" : difficulty === "intermediate" ? "🟡" : "🔴"} {difficulty}
                </div>
                <Badge variant="outline" className="bg-card/50">{topic}</Badge>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50">
                <span className="text-2xl font-bold text-primary">{currentQuestion + 1}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{questions.length}</span>
              </div>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-3 rounded-full bg-muted/50" />
              <div className="absolute inset-0 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          <Card className="border-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-xl leading-relaxed font-medium">{question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctIndex;
                const showResult = showExplanation;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    className={cn(
                      "w-full p-5 text-left rounded-xl border-2 transition-all duration-300",
                      !showResult && isSelected && "border-primary bg-primary/5 shadow-lg shadow-primary/10",
                      !showResult && !isSelected && "border-border/50 hover:border-primary/50 hover:bg-muted/30",
                      showResult && isCorrect && "border-emerald-500 bg-emerald-500/10",
                      showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                        !showResult && isSelected && "bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg",
                        !showResult && !isSelected && "bg-muted/50 text-muted-foreground",
                        showResult && isCorrect && "bg-emerald-500 text-white",
                        showResult && isSelected && !isCorrect && "bg-red-500 text-white"
                      )}>
                        {showResult && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                        {!showResult && String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-base">{option}</span>
                    </div>
                  </button>
                );
              })}

              {showExplanation && (
                <div className="mt-6 p-5 bg-gradient-to-r from-primary/5 to-cyan-500/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Explanation</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{question.explanation}</p>
                </div>
              )}

              <div className="pt-6">
                {!showExplanation ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    size="lg"
                    className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 rounded-xl"
                    disabled={selectedAnswer === null}
                  >
                    Submit Answer
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 rounded-xl"
                  >
                    {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question Indicators */}
          <div className="flex justify-center gap-2 pb-6">
            {questions.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  index < currentQuestion && results[index]?.isCorrect && "bg-emerald-500 shadow-lg shadow-emerald-500/50",
                  index < currentQuestion && !results[index]?.isCorrect && "bg-red-500 shadow-lg shadow-red-500/50",
                  index === currentQuestion && "bg-primary w-6 shadow-lg shadow-primary/50",
                  index > currentQuestion && "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}