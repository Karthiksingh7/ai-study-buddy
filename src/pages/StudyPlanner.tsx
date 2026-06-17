import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
    CalendarDays,
    Plus,
    Target,
    Clock,
    CheckCircle2,
    Circle,
    Loader2,
    Sparkles,
    BookOpen,
    Brain,
    RotateCcw,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isPast } from "date-fns";

import { generateJSON } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface StudyTask {
    id: string;
    title: string;
    description: string;
    scheduled_date: string;
    duration_minutes: number;
    task_type: "learn" | "practice" | "revise" | "test";
    topic: string;
    completed_at: string | null;
    priority: number;
}

interface StudyPlan {
    id: string;
    subject: string;
    exam_date: string;
    current_level: string;
    is_active: boolean;
    tasks: StudyTask[];
}

export default function StudyPlanner() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<StudyPlan[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // New plan form
    const [newSubject, setNewSubject] = useState("");
    const [newExamDate, setNewExamDate] = useState<Date>();
    const [newLevel, setNewLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

    useEffect(() => {
        loadPlans();
    }, [user]);

    const loadPlans = async () => {
        if (!user) return;

        // This will work after migration - for now use mock data
        setTimeout(() => {
            setPlans([
                {
                    id: "1",
                    subject: "Data Structures",
                    exam_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
                    current_level: "intermediate",
                    is_active: true,
                    tasks: [
                        { id: "t1", title: "Learn Binary Trees", description: "Study tree traversal algorithms", scheduled_date: format(new Date(), "yyyy-MM-dd"), duration_minutes: 45, task_type: "learn", topic: "Binary Trees", completed_at: null, priority: 1 },
                        { id: "t2", title: "Practice Tree Problems", description: "Solve 5 LeetCode problems", scheduled_date: format(new Date(), "yyyy-MM-dd"), duration_minutes: 60, task_type: "practice", topic: "Binary Trees", completed_at: null, priority: 2 },
                        { id: "t3", title: "Revise Arrays", description: "Quick review of array concepts", scheduled_date: format(addDays(new Date(), 1), "yyyy-MM-dd"), duration_minutes: 30, task_type: "revise", topic: "Arrays", completed_at: null, priority: 3 },
                        { id: "t4", title: "Graph Basics", description: "Introduction to graphs and representations", scheduled_date: format(addDays(new Date(), 2), "yyyy-MM-dd"), duration_minutes: 50, task_type: "learn", topic: "Graphs", completed_at: null, priority: 1 },
                    ]
                }
            ]);
            setLoading(false);
        }, 500);
    };

    const generatePlan = async () => {
        if (!newSubject.trim() || !newExamDate) {
            toast.error("Please fill in all fields");
            return;
        }

        setGenerating(true);
        try {
            const examDateStr = format(newExamDate, "yyyy-MM-dd");
            const todayStr = format(new Date(), "yyyy-MM-dd");

            const prompt = `Create a study plan for "${newSubject}" for a ${newLevel} level student.
Exam date: ${examDateStr}. Today: ${todayStr}.

Return ONLY valid JSON (no markdown):
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Brief description",
      "scheduled_date": "YYYY-MM-DD",
      "duration_minutes": 60,
      "task_type": "learn",
      "topic": "Specific topic",
      "priority": 1
    }
  ]
}

Rules:
- task_type must be one of: learn, practice, revise, test
- Generate 7-14 tasks spread between today and exam date
- Priority 1 (high) to 3 (low)
- Include a mix of learning, practice, revision, and test tasks`;

            const result = await generateJSON<{ tasks: any[] }>(
                prompt,
                "You are an expert study planner. Create effective, realistic study schedules.",
                { temperature: 0.7 }
            );

            const tasks = (result.tasks || []).map((t: any) => ({
                id: crypto.randomUUID(),
                title: t.title,
                description: t.description || "",
                scheduled_date: t.scheduled_date,
                duration_minutes: t.duration_minutes || 60,
                task_type: t.task_type || "learn",
                topic: t.topic || newSubject,
                completed_at: null,
                priority: t.priority || 2,
            }));

            const newPlan: StudyPlan = {
                id: crypto.randomUUID(),
                subject: newSubject,
                exam_date: examDateStr,
                current_level: newLevel,
                is_active: true,
                tasks,
            };

            setPlans(prev => [...prev, newPlan]);
            toast.success("Study plan created successfully!");
            setDialogOpen(false);
            setNewSubject("");
            setNewExamDate(undefined);
        } catch (error) {
            toast.error("Failed to generate study plan");
        } finally {
            setGenerating(false);
        }
    };

    const toggleTaskComplete = async (taskId: string) => {
        setPlans(prev => prev.map(plan => ({
            ...plan,
            tasks: plan.tasks.map(task =>
                task.id === taskId
                    ? { ...task, completed_at: task.completed_at ? null : new Date().toISOString() }
                    : task
            )
        })));
        toast.success("Task updated!");
    };

    const rescheduleTask = async (taskId: string, newDate: Date) => {
        setPlans(prev => prev.map(plan => ({
            ...plan,
            tasks: plan.tasks.map(task =>
                task.id === taskId
                    ? { ...task, scheduled_date: format(newDate, "yyyy-MM-dd") }
                    : task
            )
        })));
        toast.success("Task rescheduled!");
    };

    const weekDays = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 })
    });

    const getTasksForDate = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return plans.flatMap(p => p.tasks.filter(t => t.scheduled_date === dateStr));
    };

    const getTaskTypeColor = (type: string) => {
        switch (type) {
            case "learn": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
            case "practice": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
            case "revise": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
            case "test": return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getTaskTypeIcon = (type: string) => {
        switch (type) {
            case "learn": return <BookOpen className="w-4 h-4" />;
            case "practice": return <Target className="w-4 h-4" />;
            case "revise": return <RotateCcw className="w-4 h-4" />;
            case "test": return <Brain className="w-4 h-4" />;
            default: return <Circle className="w-4 h-4" />;
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        AI Study Planner
                    </h1>
                    <p className="text-muted-foreground">AI-powered personalized study schedules</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Study Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Create AI Study Plan
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                    placeholder="e.g., Data Structures & Algorithms"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Exam Date</label>
                                <Calendar
                                    mode="single"
                                    selected={newExamDate}
                                    onSelect={setNewExamDate}
                                    disabled={(date) => date < new Date()}
                                    className="rounded-md border"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Current Level</label>
                                <Select value={newLevel} onValueChange={(v) => setNewLevel(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={generatePlan} disabled={generating} className="w-full gap-2">
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating Plan...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate AI Study Plan
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Active Plans */}
            {plans.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {plans.map(plan => (
                        <Card key={plan.id} className="min-w-[250px] flex-shrink-0">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold">{plan.subject}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Exam: {format(new Date(plan.exam_date), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">{plan.current_level}</Badge>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span>{plan.tasks.filter(t => t.completed_at).length}/{plan.tasks.length} tasks done</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Week View */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Weekly Schedule</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setWeekStart(addDays(weekStart, -7))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[200px] text-center">
                                {format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setWeekStart(addDays(weekStart, 7))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {weekDays.map(day => {
                            const tasks = getTasksForDate(day);
                            const isSelected = isSameDay(day, selectedDate);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`min-h-[120px] border rounded-lg p-2 cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                                        } ${isToday(day) ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                    onClick={() => setSelectedDate(day)}
                                >
                                    <div className="text-center mb-2">
                                        <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                                        <p className={`text-lg font-semibold ${isToday(day) ? "text-primary" : ""}`}>
                                            {format(day, "d")}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        {tasks.slice(0, 3).map(task => (
                                            <div
                                                key={task.id}
                                                className={`text-xs p-1 rounded truncate ${getTaskTypeColor(task.task_type)} ${task.completed_at ? "opacity-50 line-through" : ""
                                                    }`}
                                            >
                                                {task.title}
                                            </div>
                                        ))}
                                        {tasks.length > 3 && (
                                            <p className="text-xs text-muted-foreground text-center">
                                                +{tasks.length - 3} more
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Selected Day Tasks */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Tasks for {format(selectedDate, "EEEE, MMMM d")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {getTasksForDate(selectedDate).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No tasks scheduled for this day</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {getTasksForDate(selectedDate).map(task => (
                                <div
                                    key={task.id}
                                    className={`flex items-start gap-3 p-4 rounded-lg border ${task.completed_at ? "bg-muted/30" : "bg-card"
                                        }`}
                                >
                                    <Checkbox
                                        checked={!!task.completed_at}
                                        onCheckedChange={() => toggleTaskComplete(task.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getTaskTypeColor(task.task_type)}`}>
                                                {getTaskTypeIcon(task.task_type)}
                                                {task.task_type}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {task.duration_minutes} min
                                            </Badge>
                                        </div>
                                        <h4 className={`font-medium ${task.completed_at ? "line-through text-muted-foreground" : ""}`}>
                                            {task.title}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Topic: {task.topic}</p>
                                    </div>
                                    {!task.completed_at && isPast(new Date(task.scheduled_date)) && !isToday(new Date(task.scheduled_date)) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => rescheduleTask(task.id, new Date())}
                                            className="gap-1"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reschedule
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
