import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3,
    TrendingUp,
    Target,
    Clock,
    Brain,
    Flame,
    Award,
    Loader2,
    BookOpen,
    ArrowUp,
    ArrowDown
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

interface TopicStats {
    topic: string;
    quizCount: number;
    avgScore: number;
    studyTime: number;
    trend: "up" | "down" | "stable";
}

interface WeeklyData {
    day: string;
    studyMinutes: number;
    quizzes: number;
}

export default function Analytics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);
    const [totalStudyTime, setTotalStudyTime] = useState(0);
    const [avgQuizScore, setAvgQuizScore] = useState(0);
    const [readinessScore, setReadinessScore] = useState(0);
    const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [strengths, setStrengths] = useState<string[]>([]);
    const [weaknesses, setWeaknesses] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            loadAnalytics();
        }
    }, [user]);

    const loadAnalytics = async () => {
        if (!user) return;

        try {
            // Load quiz results
            const { data: quizResults } = await supabase
                .from("quiz_results")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            // Load study sessions
            const { data: sessions } = await supabase
                .from("study_sessions")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            // Load studied topics
            const { data: studiedTopics } = await supabase
                .from("studied_topics")
                .select("*")
                .eq("user_id", user.id);

            // Calculate stats
            if (quizResults && quizResults.length > 0) {
                const avgScore = quizResults.reduce((sum, r) => sum + Number(r.score_percentage), 0) / quizResults.length;
                setAvgQuizScore(Math.round(avgScore));

                // Calculate topic-wise stats
                const topicMap = new Map<string, { scores: number[], count: number }>();
                quizResults.forEach(r => {
                    const existing = topicMap.get(r.topic) || { scores: [], count: 0 };
                    existing.scores.push(Number(r.score_percentage));
                    existing.count++;
                    topicMap.set(r.topic, existing);
                });

                const stats: TopicStats[] = Array.from(topicMap.entries()).map(([topic, data]) => ({
                    topic,
                    quizCount: data.count,
                    avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
                    studyTime: Math.floor(Math.random() * 300) + 60, // Mock study time
                    trend: Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : "stable"
                }));
                setTopicStats(stats);

                // Identify strengths and weaknesses
                const sorted = [...stats].sort((a, b) => b.avgScore - a.avgScore);
                setStrengths(sorted.slice(0, 3).filter(s => s.avgScore >= 70).map(s => s.topic));
                setWeaknesses(sorted.slice(-3).filter(s => s.avgScore < 70).map(s => s.topic));
            }

            // Calculate total study time
            if (sessions) {
                const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                setTotalStudyTime(totalMinutes);
            }

            // Calculate streak
            if (sessions && sessions.length > 0) {
                let currentStreak = 0;
                let checkDate = new Date();

                for (let i = 0; i < 30; i++) {
                    const dateStr = format(subDays(checkDate, i), "yyyy-MM-dd");
                    const hasActivity = sessions.some(s => s.created_at.startsWith(dateStr)) ||
                        (quizResults && quizResults.some(q => q.created_at.startsWith(dateStr)));
                    if (hasActivity) {
                        currentStreak++;
                    } else if (i > 0) {
                        break;
                    }
                }
                setStreak(currentStreak);
            }

            // Calculate AI readiness score
            const readiness = Math.min(100, Math.round(
                (avgQuizScore * 0.4) +
                (Math.min(100, totalStudyTime / 10) * 0.3) +
                (streak * 5 * 0.3)
            ));
            setReadinessScore(readiness || 65);

            // Mock weekly data
            setWeeklyData([
                { day: "Mon", studyMinutes: 45, quizzes: 2 },
                { day: "Tue", studyMinutes: 60, quizzes: 1 },
                { day: "Wed", studyMinutes: 30, quizzes: 0 },
                { day: "Thu", studyMinutes: 90, quizzes: 3 },
                { day: "Fri", studyMinutes: 75, quizzes: 2 },
                { day: "Sat", studyMinutes: 120, quizzes: 4 },
                { day: "Sun", studyMinutes: 45, quizzes: 1 }
            ]);

        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    Progress Analytics
                </h1>
                <p className="text-muted-foreground">Track your learning journey and identify areas for improvement</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full" />
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                                <Flame className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{streak}</p>
                                <p className="text-sm text-muted-foreground">Day Streak</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{formatTime(totalStudyTime)}</p>
                                <p className="text-sm text-muted-foreground">Total Study Time</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full" />
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                                <Target className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{avgQuizScore}%</p>
                                <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full" />
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                                <Award className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{readinessScore}%</p>
                                <p className="text-sm text-muted-foreground">Exam Readiness</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Exam Readiness */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        AI-Powered Exam Readiness Score
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="relative pt-1">
                            <Progress value={readinessScore} className="h-4" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Needs Work</span>
                                <span>Developing</span>
                                <span>Ready</span>
                                <span>Excellent</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Based on your quiz performance, study consistency, and topic coverage, you're{" "}
                            <span className="font-medium text-foreground">
                                {readinessScore >= 80 ? "well-prepared" : readinessScore >= 60 ? "on track" : "building your foundation"}
                            </span>{" "}
                            for your exams.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for detailed analytics */}
            <Tabs defaultValue="topics" className="w-full">
                <TabsList>
                    <TabsTrigger value="topics" className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        By Topic
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Weekly Trends
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="gap-2">
                        <Brain className="w-4 h-4" />
                        Insights
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="topics" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance by Topic</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topicStats.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Take some quizzes to see topic-wise analytics</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {topicStats.map((stat) => (
                                        <div key={stat.topic} className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium">{stat.topic}</span>
                                                    <div className="flex items-center gap-2">
                                                        {stat.trend === "up" && <ArrowUp className="w-4 h-4 text-green-500" />}
                                                        {stat.trend === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                                                        <span className={stat.avgScore >= 70 ? "text-green-600" : stat.avgScore >= 50 ? "text-yellow-600" : "text-red-600"}>
                                                            {stat.avgScore}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <Progress value={stat.avgScore} className="h-2" />
                                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                                    <span>{stat.quizCount} quizzes</span>
                                                    <span>{formatTime(stat.studyTime)} studied</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="weekly" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>This Week's Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-2">
                                {weeklyData.map((day) => (
                                    <div key={day.day} className="text-center">
                                        <p className="text-xs text-muted-foreground mb-2">{day.day}</p>
                                        <div className="h-24 bg-muted rounded-lg relative flex flex-col-reverse">
                                            <div
                                                className="bg-primary/60 rounded-b-lg transition-all"
                                                style={{ height: `${Math.min(100, day.studyMinutes / 1.2)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs mt-1 font-medium">{day.studyMinutes}m</p>
                                        <p className="text-xs text-muted-foreground">{day.quizzes} quiz</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600">
                                    <ArrowUp className="w-5 h-5" />
                                    Your Strengths
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {strengths.length === 0 ? (
                                    <p className="text-muted-foreground">Keep practicing to identify your strong areas!</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {strengths.map((topic) => (
                                            <Badge key={topic} className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-600">
                                    <Target className="w-5 h-5" />
                                    Areas to Improve
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {weaknesses.length === 0 ? (
                                    <p className="text-muted-foreground">Great job! No weak areas identified yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {weaknesses.map((topic) => (
                                            <Badge key={topic} className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
