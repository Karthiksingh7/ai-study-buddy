import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Brain, FileText, Code2, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Activity = {
    id: string;
    title: string;
    type: "Quiz" | "Document" | "Chat";
    date: string;
};

const SHORTCUTS = [
    {
        id: "study",
        title: "Start Studying",
        description: "Chat with your AI tutor anytime",
        icon: BookOpen,
        path: "/chat",
        tint: "blue",
    },
    {
        id: "quiz",
        title: "Take a Quiz",
        description: "Test your knowledge with AI quizzes",
        icon: Brain,
        path: "/quiz",
        tint: "sky",
    },
    {
        id: "doc",
        title: "Upload Document",
        description: "Summarize and analyze your PDFs",
        icon: FileText,
        path: "/documents",
        tint: "cyan",
    },
    {
        id: "code",
        title: "Coding Practice",
        description: "Sharpen your skills with problems",
        icon: Code2,
        path: "/coding",
        tint: "indigo",
    },
] as const;

const TINTS: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        ring: "ring-blue-100",
        glow: "group-hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.45)]",
    },
    sky: {
        bg: "bg-sky-50",
        text: "text-sky-600",
        ring: "ring-sky-100",
        glow: "group-hover:shadow-[0_25px_50px_-12px_rgba(14,165,233,0.45)]",
    },
    cyan: {
        bg: "bg-cyan-50",
        text: "text-cyan-600",
        ring: "ring-cyan-100",
        glow: "group-hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.45)]",
    },
    indigo: {
        bg: "bg-indigo-50",
        text: "text-indigo-600",
        ring: "ring-indigo-100",
        glow: "group-hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.45)]",
    },
};

const TAG_STYLE: Record<Activity["type"], string> = {
    Quiz: "bg-sky-50 text-sky-700",
    Document: "bg-cyan-50 text-cyan-700",
    Chat: "bg-blue-50 text-blue-700",
};

const TAG_ICON: Record<Activity["type"], typeof Brain> = {
    Quiz: Brain,
    Document: FileText,
    Chat: MessageCircle,
};

const PLACEHOLDER_ACTIVITY: Activity[] = [
    { id: "p1", title: "Data Structures Review", type: "Chat", date: "Today" },
    { id: "p2", title: "Calculus Practice Quiz", type: "Quiz", date: "Yesterday" },
    { id: "p3", title: "Machine Learning Notes", type: "Document", date: "2 days ago" },
];

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
<<<<<<< HEAD

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

        // Light theme coordinated colors
        const hue = parseInt(theme.primary.split(" ")[0]);
        root.style.setProperty("--background", `${hue} 20% 99%`);
        root.style.setProperty("--foreground", `${hue} 40% 10%`);
        root.style.setProperty("--card", `${hue} 30% 97%`);
        root.style.setProperty("--card-foreground", `${hue} 40% 10%`);
        root.style.setProperty("--secondary", `${hue} 25% 93%`);
        root.style.setProperty("--muted", `${hue} 20% 95%`);
        root.style.setProperty("--muted-foreground", `${hue} 15% 42%`);
        root.style.setProperty("--border", `${hue} 20% 88%`);
        root.style.setProperty("--input", `${hue} 20% 90%`);
        root.style.setProperty("--sidebar-background", `${hue} 25% 97%`);
        root.style.setProperty("--sidebar-foreground", `${hue} 40% 15%`);
        root.style.setProperty("--sidebar-accent", `${hue} 30% 93%`);
        root.style.setProperty("--sidebar-accent-foreground", `${hue} 40% 15%`);
        root.style.setProperty("--sidebar-border", `${hue} 18% 90%`);
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
=======
    const [activity, setActivity] = useState<Activity[]>(PLACEHOLDER_ACTIVITY);
>>>>>>> 449052d4e34fb18a822db100e9afa6a9045e21f4

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data } = await supabase
                    .from("chat_messages" as any)
                    .select("id, message, created_at")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(3);
                if (data && Array.isArray(data) && data.length > 0) {
                    setActivity(
                        data.map((row: any) => ({
                            id: row.id,
                            title: (row.message || "Study session").slice(0, 60),
                            type: "Chat" as const,
                            date: new Date(row.created_at).toLocaleDateString(),
                        }))
                    );
                }
            } catch {
                /* keep placeholder */
            }
        })();
    }, [user]);

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Student";

    return (
<<<<<<< HEAD
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
                                    Welcome back, <span className="heading-gradient">{firstName}</span>
                                </h1>
                            </div>
                        </div>

                        {/* Status Widget */}
                        <div className="glass-card p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
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
=======
        <div className="min-h-screen bg-[#F6F9FF] -m-4 md:-m-6 lg:-m-8">
            {/* HERO with animated wave background */}
            <section className="relative overflow-hidden">
                {/* Soft gradient base */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-sky-50/40 to-transparent" />

                {/* Animated SVG wave */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <svg
                        className="absolute -top-10 left-0 w-[200%] h-full opacity-60 animate-[wave-shift_12s_ease-in-out_infinite]"
                        viewBox="0 0 1440 400"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="waveGrad1" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#bfdbfe" />
                                <stop offset="50%" stopColor="#a5b4fc" />
                                <stop offset="100%" stopColor="#7dd3fc" />
                            </linearGradient>
                            <linearGradient id="waveGrad2" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#93c5fd" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,200 C240,120 480,280 720,200 C960,120 1200,280 1440,200 L1440,400 L0,400 Z"
                            fill="url(#waveGrad1)"
                        />
                        <path
                            d="M0,260 C240,180 480,320 720,260 C960,200 1200,320 1440,260 L1440,400 L0,400 Z"
                            fill="url(#waveGrad2)"
                            opacity="0.5"
                        />
                    </svg>
>>>>>>> 449052d4e34fb18a822db100e9afa6a9045e21f4
                </div>

                <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-14 pb-20 md:pt-20 md:pb-28">
                    <div className="grid md:grid-cols-[1fr_auto] items-center gap-10">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-3 tracking-wide">
                                YOUR LEARNING SPACE
                            </p>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                                Welcome back, {firstName} <span className="inline-block">👋</span>
                            </h1>
                            <p className="mt-4 text-lg text-gray-500 max-w-xl">
                                Ready to learn something amazing today?
                            </p>
                        </div>

                        {/* 3D Floating study objects */}
                        <div
                            className="relative h-44 w-64 hidden md:block"
                            style={{ perspective: "500px" }}
                        >
                            <div
                                className="absolute left-2 top-6 text-6xl drop-shadow-[0_12px_18px_rgba(99,102,241,0.25)] animate-[float_3s_ease-in-out_infinite]"
                                style={{ transform: "perspective(500px) rotateX(10deg) rotateY(-8deg)" }}
                            >
<<<<<<< HEAD
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
                        <h2 className="text-lg font-semibold heading-gradient">All Features</h2>
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
                            "feature-card-3d relative cursor-pointer group",
                            mounted ? "opacity-100" : "opacity-0"
                        )}
                        style={{ transitionDelay: `${50 + i * 20}ms`, transitionDuration: "200ms" }}
                        onClick={() => handleFeatureClick(feature.path)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", feature.color)}>
                                <feature.icon className="w-5 h-5 text-white" />
=======
                                📖
                            </div>
                            <div
                                className="absolute right-6 top-0 text-5xl drop-shadow-[0_12px_18px_rgba(245,158,11,0.3)] animate-[float_3s_ease-in-out_infinite]"
                                style={{
                                    transform: "perspective(500px) rotateX(10deg) rotateY(8deg)",
                                    animationDelay: "0.5s",
                                }}
                            >
                                ✏️
                            </div>
                            <div
                                className="absolute right-0 bottom-2 text-6xl drop-shadow-[0_12px_18px_rgba(250,204,21,0.4)] animate-[float_3s_ease-in-out_infinite]"
                                style={{
                                    transform: "perspective(500px) rotateX(10deg) rotateY(4deg)",
                                    animationDelay: "1s",
                                }}
                            >
                                💡
>>>>>>> 449052d4e34fb18a822db100e9afa6a9045e21f4
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div className="max-w-6xl mx-auto px-6 md:px-10 pb-24 -mt-10">
                {/* Section heading */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3">
                        Jump back in
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 pl-4">
                        Pick a tool and keep your momentum going.
                    </p>
                </div>

                {/* Shortcut cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
                    {SHORTCUTS.map((card, i) => {
                        const tint = TINTS[card.tint];
                        const Icon = card.icon;
                        return (
                            <button
                                key={card.id}
                                onClick={() => navigate(card.path)}
                                style={{
                                    perspective: "900px",
                                    transitionDelay: mounted ? `${i * 100}ms` : "0ms",
                                }}
                                className={cn(
                                    "tilt-card group text-left bg-white border border-gray-100 rounded-2xl p-6",
                                    "shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 ease-out",
                                    "hover:border-blue-100",
                                    tint.glow,
                                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                                )}
                            >
                                <div className="tilt-inner transition-transform duration-500 ease-out">
                                <div
                                    className={cn(
                                        "tilt-icon w-12 h-12 rounded-xl flex items-center justify-center ring-1 mb-5 transition-transform duration-500 ease-out",
                                        tint.bg,
                                        tint.ring
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", tint.text)} />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-base mb-1.5">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {card.description}
                                </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Recent Activity */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3">
                            Recent Activity
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            Last 3 sessions
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                        {activity.map((item, i) => {
                            const TagIcon = TAG_ICON[item.type];
                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-4 px-6 py-5 transition-colors hover:bg-gray-50/60",
                                        i !== activity.length - 1 && "border-b border-gray-100"
                                    )}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                        <TagIcon className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-xs font-medium px-2.5 py-1 rounded-full",
                                            TAG_STYLE[item.type]
                                        )}
                                    >
                                        {item.type}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
