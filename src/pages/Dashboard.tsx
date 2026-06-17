import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MessageCircle, BookOpen, Sparkles, GraduationCap, Brain, FileText,
    Code2, Mic, Camera, Calendar, BarChart3, Users, Gamepad2, Clock,
    ClipboardList, ArrowRight, Flame, Target, Trophy,
    ChevronRight, Star, Rocket, Wand2, Activity, LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dashboard features
const FEATURES = [
    {
        id: "chat",
        title: "AI Chat",
        description: "24/7 AI tutoring and instant explanations",
        icon: MessageCircle,
        path: "/chat",
        color: "bg-indigo-500",
        category: "Core"
    },
    {
        id: "learn",
        title: "Smart Learning",
        description: "Adaptive learning paths tailored to you",
        icon: BookOpen,
        path: "/learn",
        color: "bg-blue-500",
        category: "Core"
    },
    {
        id: "study-planner",
        title: "Study Planner",
        description: "AI-optimized study schedules",
        icon: Calendar,
        path: "/study-planner",
        color: "bg-rose-500",
        category: "Productivity",
        isNew: true
    },
    {
        id: "analytics",
        title: "Analytics",
        description: "Track your learning progress",
        icon: BarChart3,
        path: "/analytics",
        color: "bg-amber-500",
        category: "Insights",
        isNew: true
    },
    {
        id: "voice",
        title: "Voice Buddy",
        description: "Hands-free AI assistant",
        icon: Mic,
        path: "/voice",
        color: "bg-red-500",
        category: "Core"
    },
    {
        id: "scan",
        title: "Smart Scan",
        description: "Capture and explain images",
        icon: Camera,
        path: "/scan",
        color: "bg-teal-500",
        category: "Tools"
    },
    {
        id: "quiz",
        title: "AI Quiz",
        description: "Adaptive quizzes for mastery",
        icon: Brain,
        path: "/quiz",
        color: "bg-violet-500",
        category: "Assessment"
    },
    {
        id: "mock-tests",
        title: "Mock Tests",
        description: "Full-length practice exams",
        icon: ClipboardList,
        path: "/mock-tests",
        color: "bg-orange-500",
        category: "Assessment",
        isNew: true
    },
    {
        id: "coding",
        title: "Coding Practice",
        description: "LeetCode-style problems with AI",
        icon: Code2,
        path: "/coding",
        color: "bg-emerald-500",
        category: "Practice",
        isNew: true
    },
    {
        id: "flashcards",
        title: "Flashcards",
        description: "AI-generated study cards",
        icon: Sparkles,
        path: "/flashcards",
        color: "bg-cyan-500",
        category: "Tools"
    },
    {
        id: "documents",
        title: "Documents",
        description: "PDF analysis and notes",
        icon: FileText,
        path: "/documents",
        color: "bg-blue-600",
        category: "Tools",
        isNew: true
    },
    {
        id: "syllabus",
        title: "Syllabus",
        description: "Track curriculum progress",
        icon: GraduationCap,
        path: "/syllabus",
        color: "bg-fuchsia-500",
        category: "Productivity",
        isNew: true
    },
    {
        id: "community",
        title: "Community",
        description: "Connect with study groups",
        icon: Users,
        path: "/community",
        color: "bg-sky-500",
        category: "Social"
    },
    {
        id: "classrooms",
        title: "Classrooms",
        description: "Virtual learning spaces",
        icon: Users,
        path: "/classrooms",
        color: "bg-lime-500",
        category: "Social",
        isNew: true
    },
    {
        id: "games",
        title: "Smart Break",
        description: "Brain training games",
        icon: Gamepad2,
        path: "/games",
        color: "bg-yellow-500",
        category: "Fun"
    },
    {
        id: "sessions",
        title: "Sessions",
        description: "Study session tracking",
        icon: Clock,
        path: "/sessions",
        color: "bg-slate-500",
        category: "Productivity"
    }
];

// Quick actions
const QUICK_ACTIONS = [
    { title: "New Chat", icon: MessageCircle, path: "/chat", color: "bg-indigo-500" },
    { title: "Quick Quiz", icon: Brain, path: "/quiz", color: "bg-violet-500" },
    { title: "Upload Doc", icon: FileText, path: "/documents", color: "bg-blue-500" },
    { title: "Voice AI", icon: Mic, path: "/voice", color: "bg-rose-500" }
];

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Gradient color palettes - Beautiful combinations
    const GRADIENT_THEMES = [
        { start: "270 70% 60%", mid: "230 70% 50%", end: "190 80% 50%", primary: "270 70% 55%", name: "Purple Dream" },      // Purple → Blue → Cyan
        { start: "330 70% 55%", mid: "290 60% 50%", end: "250 70% 55%", primary: "310 65% 55%", name: "Rose Violet" },       // Pink → Purple → Indigo
        { start: "200 80% 50%", mid: "230 70% 55%", end: "270 65% 55%", primary: "220 75% 55%", name: "Ocean Mist" },         // Cyan → Blue → Purple
        { start: "280 75% 55%", mid: "310 70% 50%", end: "340 75% 55%", primary: "300 70% 55%", name: "Magenta Flow" },       // Purple → Magenta → Pink
        { start: "180 60% 45%", mid: "200 70% 50%", end: "230 75% 55%", primary: "200 70% 50%", name: "Teal Wave" },          // Teal → Cyan → Blue
        { start: "250 70% 55%", mid: "280 65% 55%", end: "310 70% 55%", primary: "270 70% 55%", name: "Lavender Dream" },     // Indigo → Purple → Pink
        { start: "170 65% 45%", mid: "200 75% 50%", end: "240 70% 55%", primary: "200 70% 50%", name: "Aqua Sunset" },        // Aqua → Blue → Indigo
    ];

    const applyGradientTheme = (theme: typeof GRADIENT_THEMES[0]) => {
        const root = document.documentElement;
        root.style.setProperty("--gradient-start", theme.start);
        root.style.setProperty("--gradient-mid", theme.mid);
        root.style.setProperty("--gradient-end", theme.end);
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--ring", theme.primary);
        root.style.setProperty("--accent", theme.end);
        root.style.setProperty("--sidebar-primary", theme.primary);
        root.style.setProperty("--sidebar-ring", theme.primary);
    };

    const randomGradient = () => {
        const currentIndex = parseInt(localStorage.getItem("gradient-index") || "-1", 10);
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * GRADIENT_THEMES.length);
        } while (newIndex === currentIndex && GRADIENT_THEMES.length > 1);

        applyGradientTheme(GRADIENT_THEMES[newIndex]);
        localStorage.setItem("gradient-index", newIndex.toString());
    };

    const handleFeatureClick = (path: string) => {
        randomGradient();
        navigate(path);
    };

    useEffect(() => {
        setMounted(true);
        // Apply saved or random gradient on mount
        const savedIndex = parseInt(localStorage.getItem("gradient-index") || "-1", 10);
        if (savedIndex >= 0 && savedIndex < GRADIENT_THEMES.length) {
            applyGradientTheme(GRADIENT_THEMES[savedIndex]);
        } else {
            randomGradient();
        }
    }, []);

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Student";
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

    return (
        <div className="min-h-screen pb-20">
            {/* Header Section */}
            <div className={cn(
                "mb-8 transition-opacity duration-200",
                mounted ? "opacity-100" : "opacity-0"
            )}>
                {/* Welcome Card */}
                <div className="hero-card p-6 md:p-8 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                                <span className="text-xl font-bold text-white">{firstName[0]}</span>
                            </div>
                            <div>
                                <p className="text-primary text-sm font-medium">
                                    {greeting}
                                </p>
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                    Welcome back, <span className="text-primary">{firstName}</span>
                                </h1>
                            </div>
                        </div>

                        {/* Status Widget */}
                        <div className="glass-card p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">AI Ready</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    AI Assistant
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {[
                            { icon: Flame, value: "7", label: "Day Streak", color: "bg-orange-500" },
                            { icon: Target, value: "12", label: "Topics", color: "bg-indigo-500" },
                            { icon: Trophy, value: "85%", label: "Accuracy", color: "bg-emerald-500" }
                        ].map((stat, i) => (
                            <div key={i} className="stat-card flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-foreground">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action, i) => (
                        <Button
                            key={i}
                            onClick={() => navigate(action.path)}
                            variant="outline"
                            size="sm"
                            className="gap-2 text-foreground hover:bg-primary/5 hover:border-primary/30"
                        >
                            <div className={cn("w-5 h-5 rounded flex items-center justify-center", action.color)}>
                                <action.icon className="w-3 h-3 text-white" />
                            </div>
                            {action.title}
                        </Button>
                    ))}
                </div>
            </div>

            {/* AI Suggestion Card */}
            <div className={cn(
                "glass-card p-5 mb-8 transition-opacity duration-200",
                mounted ? "opacity-100" : "opacity-0"
            )}>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <Wand2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-semibold text-foreground">AI Suggestion</h3>
                            <Badge variant="outline" className="text-xs">
                                Personalized
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">
                            Based on your recent activity, reviewing <strong className="text-foreground">Data Structures</strong> would
                            boost your quiz performance.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                size="sm"
                                onClick={() => navigate("/quiz")}
                                className="gap-2"
                            >
                                Start Practice <ArrowRight className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Title */}
            <div className={cn(
                "flex items-center justify-between mb-5 transition-opacity duration-200",
                mounted ? "opacity-100" : "opacity-0"
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">All Features</h2>
                        <p className="text-sm text-muted-foreground">16 AI-powered tools</p>
                    </div>
                </div>
                <Badge variant="outline">
                    <Star className="w-3 h-3 mr-1" />
                    {FEATURES.filter(f => f.isNew).length} New
                </Badge>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {FEATURES.map((feature, i) => (
                    <div
                        key={feature.id}
                        className={cn(
                            "feature-card cursor-pointer group",
                            mounted ? "opacity-100" : "opacity-0"
                        )}
                        style={{ transitionDelay: `${50 + i * 20}ms`, transitionDuration: "200ms" }}
                        onClick={() => handleFeatureClick(feature.path)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", feature.color)}>
                                <feature.icon className="w-5 h-5 text-white" />
                            </div>

                            {feature.isNew && (
                                <Badge variant="outline" className="text-xs">
                                    NEW
                                </Badge>
                            )}
                        </div>

                        {/* Content */}
                        <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                            {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {feature.description}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{feature.category}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom CTA */}
            <div className={cn(
                "mt-10 text-center transition-opacity duration-200",
                mounted ? "opacity-100" : "opacity-0"
            )}>
                <div className="glass-card inline-flex items-center gap-4 p-4 px-6">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-foreground font-medium">Need help getting started?</p>
                        <p className="text-sm text-muted-foreground">Ask your AI tutor anything</p>
                    </div>
                    <Button
                        onClick={() => navigate("/chat")}
                        className="ml-2 gap-2"
                        size="sm"
                    >
                        Start Chat <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
