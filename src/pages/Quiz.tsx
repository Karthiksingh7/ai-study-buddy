import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Sparkles } from "lucide-react";
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [],
          type: "quiz",
          topic,
          difficulty,
          questionCount: parseInt(questionCount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) throw new Error("No content received");

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid response format");

      const parsed = JSON.parse(jsonMatch[0]) as QuizQuestion[];
      setQuestions(parsed);
      setStartTime(Date.now());

      // Track this topic as studied
      if (user) {
        await trackStudiedTopic(topic);
      }

      toast.success(`${parsed.length} questions generated!`);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-primary">{finalScore.toFixed(0)}%</div>
            <p className="text-muted-foreground">
              You got {correctCount} out of {questions.length} questions correct
            </p>
            <Badge variant={finalScore >= 70 ? "default" : "secondary"} className="text-sm">
              {finalScore >= 90 ? "Excellent!" : finalScore >= 70 ? "Good Job!" : finalScore >= 50 ? "Keep Practicing" : "Needs Improvement"}
            </Badge>
            <div className="pt-4 space-y-2">
              <Button onClick={resetQuiz} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" />
                Take Another Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI Quiz Generator</h1>
          <p className="text-muted-foreground">Test your knowledge on any topic</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <Input
                placeholder="e.g., Photosynthesis, World War II, Calculus..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateQuiz()}
              />
            </div>

            {studiedTopics.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Recent Topics</label>
                <div className="flex flex-wrap gap-2">
                  {studiedTopics.slice(0, 5).map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setTopic(t)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Questions</label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger>
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

            <Button onClick={generateQuiz} disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Generate Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{difficulty}</Badge>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  "w-full p-4 text-left rounded-lg border-2 transition-all",
                  !showResult && isSelected && "border-primary bg-primary/5",
                  !showResult && !isSelected && "border-border hover:border-primary/50",
                  showResult && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/20",
                  showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    !showResult && isSelected && "bg-primary text-primary-foreground",
                    !showResult && !isSelected && "bg-muted",
                    showResult && isCorrect && "bg-green-500 text-white",
                    showResult && isSelected && !isCorrect && "bg-red-500 text-white"
                  )}>
                    {showResult && isCorrect && <CheckCircle2 className="w-5 h-5" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5" />}
                    {!showResult && String.fromCharCode(65 + index)}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}

          {showExplanation && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Explanation:</p>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
            </div>
          )}

          <div className="pt-4">
            {!showExplanation ? (
              <Button onClick={handleSubmitAnswer} className="w-full" disabled={selectedAnswer === null}>
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} className="w-full">
                {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2">
        {questions.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full",
              index < currentQuestion && results[index]?.isCorrect && "bg-green-500",
              index < currentQuestion && !results[index]?.isCorrect && "bg-red-500",
              index === currentQuestion && "bg-primary",
              index > currentQuestion && "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}