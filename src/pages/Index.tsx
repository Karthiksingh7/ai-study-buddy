import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, MessageCircle, BookOpen, Code2, FileText, Sparkles, GraduationCap,
  Zap, PlayCircle, ChevronRight, Star, Users, Mic, Camera, Calendar,
  BarChart3, Gamepad2, ArrowRight, Settings, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items for top bar
const NAV_ITEMS = [
  { icon: BookOpen, label: "Study", path: "/learn" },
  { icon: Code2, label: "CodeBuddy", path: "/coding" },
  { icon: FileText, label: "Documents", path: "/documents" },
  { icon: Brain, label: "Quiz", path: "/quiz" },
  { icon: Users, label: "Groups", path: "/community" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
];

// Feature cards
const FEATURE_CARDS = [
  {
    icon: Brain,
    title: 'AI Tutor',
    description: "Personalized AI assistant that adapts to your learning style and generates custom quizzes.",
    color: "bg-indigo-500",
    path: "/chat",
  },
  {
    icon: Code2,
    title: "CodeBuddy",
    description: "AI-driven code analysis with time/space complexity insights and optimization tips.",
    color: "bg-emerald-500",
    path: "/coding",
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "Interactive study rooms with live peer suggestions, code sharing, and video chat.",
    color: "bg-blue-500",
    path: "/community",
  },
  {
    icon: FileText,
    title: "Smart Documents",
    description: "AI-powered document analysis with instant summaries and study notes.",
    color: "bg-amber-500",
    path: "/documents",
  },
];

// Quick action buttons
const QUICK_ACTIONS = [
  { icon: Code2, label: "CodeBuddy", color: "bg-emerald-500", path: "/coding" },
  { icon: Sparkles, label: "AI Assistant", color: "bg-indigo-500", path: "/chat" },
  { icon: BookOpen, label: "Study Modules", color: "bg-blue-500", path: "/learn" },
  { icon: Users, label: "Join Groups", color: "bg-violet-500", path: "/community" },
];

// Learning progress items
const LEARNING_PROGRESS = [
  { topic: "Web Development", progress: 75, color: "bg-indigo-500" },
  { topic: "Data Structures", progress: 60, color: "bg-emerald-500" },
  { topic: "Machine Learning", progress: 40, color: "bg-blue-500" },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">StudyBuddy</span>
          </div>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-border text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
              AI Active
            </Badge>
            <Button
              onClick={() => navigate("/auth")}
              variant="default"
              size="sm"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left Column - Hero */}
          <div className={cn(
            "transition-opacity duration-300",
            mounted ? "opacity-100" : "opacity-0"
          )}>
            {/* Logo Badge */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted border border-border">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">AI-Powered Learning Platform</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-bold mb-5 text-foreground leading-tight">
              Study smarter,<br />not harder
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed">
              Your personal AI study companion that adapts to your learning style and helps you achieve your academic goals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="h-11 px-6"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/learn")}
                className="h-11 px-6"
              >
                Learn More
              </Button>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors text-left"
                >
                  <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", action.color)}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column - Dashboard Preview */}
          <div className={cn(
            "transition-opacity duration-300 delay-100",
            mounted ? "opacity-100" : "opacity-0"
          )}>
            {/* Dashboard Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-md bg-indigo-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Learning Dashboard</h2>
                <p className="text-sm text-muted-foreground">Tools to accelerate your learning</p>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {FEATURE_CARDS.map((card, i) => (
                <div
                  key={i}
                  className="group p-4 rounded-lg bg-card border border-border hover:border-primary/25 transition-colors cursor-pointer"
                  onClick={() => navigate(card.path)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", card.color)}>
                      <card.icon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-medium text-foreground text-sm">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Learning Progress Section */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground text-sm">Learning Progress</h3>
              </div>

              <div className="space-y-4">
                {LEARNING_PROGRESS.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{item.topic}</span>
                      <span className="text-sm font-medium text-foreground">{item.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Features Bar */}
        <div className={cn(
          "mt-20 p-6 rounded-lg bg-card border border-border transition-opacity duration-300",
          mounted ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              { icon: Mic, label: "Voice AI", color: "text-rose-500", path: "/voice" },
              { icon: Camera, label: "Smart Scan", color: "text-amber-500", path: "/scan" },
              { icon: Calendar, label: "Study Planner", color: "text-blue-500", path: "/study-planner" },
              { icon: BarChart3, label: "Analytics", color: "text-indigo-500", path: "/analytics" },
              { icon: Brain, label: "AI Quiz", color: "text-violet-500", path: "/quiz" },
              { icon: GraduationCap, label: "Syllabus", color: "text-emerald-500", path: "/syllabus" },
              { icon: Gamepad2, label: "Brain Games", color: "text-orange-500", path: "/games" },
              { icon: Sparkles, label: "Flashcards", color: "text-cyan-500", path: "/flashcards" },
            ].map((feature, i) => (
              <button
                key={i}
                onClick={() => navigate(feature.path)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <feature.icon className={cn("w-5 h-5", feature.color)} />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{feature.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-foreground">AI Study Buddy</span>
          </div>

          <p className="text-sm text-muted-foreground">© 2024 AI Study Buddy</p>

          <Badge variant="outline" className="text-muted-foreground">
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            AI Assistant
          </Badge>
        </div>
      </footer>
    </div>
  );
};

export default Index;
