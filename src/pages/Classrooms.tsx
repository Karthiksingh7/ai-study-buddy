import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
    Users, Plus, BookOpen, Copy, LogIn, Loader2, Settings,
    ArrowLeft, Send, Trash2, Calendar, FileText, GraduationCap,
    MessageCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Classroom {
    id: string;
    name: string;
    description?: string;
    subject: string;
    invite_code: string;
    mentor_id: string;
    student_count: number;
    is_mentor: boolean;
    mentor_name?: string;
    created_at?: string;
}

interface ClassroomTask {
    id: string;
    title: string;
    description?: string;
    task_type: string;
    due_date?: string;
    max_score?: number;
    created_at: string;
}

interface ClassroomMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
}

const STORAGE_KEY = "studybuddy-classrooms";
const MESSAGES_KEY = "studybuddy-classroom-messages";

// Helper to load from localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
}

function saveToStorage(key: string, data: any) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // Silently fail on storage errors
    }
}

export default function Classrooms() {
    const { user } = useAuth();
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [newClassSubject, setNewClassSubject] = useState("");
    const [newClassDesc, setNewClassDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Classroom detail view
    const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
    const [tasks, setTasks] = useState<ClassroomTask[]>([]);
    const [messages, setMessages] = useState<ClassroomMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeTab, setActiveTab] = useState("discussion");

    // Task creation
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskType, setNewTaskType] = useState("assignment");
    const [creatingTask, setCreatingTask] = useState(false);

    // Load classrooms
    useEffect(() => {
        loadClassrooms();
    }, [user]);

    const loadClassrooms = async () => {
        setLoading(true);

        if (user) {
            try {
                // Load classrooms where user is mentor
                const { data: mentorRooms, error: mentorErr } = await (supabase as any)
                    .from("classrooms")
                    .select("*")
                    .eq("mentor_id", user.id);

                // Load classrooms where user is a student
                const { data: studentJoins, error: joinErr } = await (supabase as any)
                    .from("classroom_students")
                    .select("classroom_id")
                    .eq("student_id", user.id);

                let studentRooms: any[] = [];
                if (studentJoins && studentJoins.length > 0) {
                    const classroomIds = studentJoins.map((j: any) => j.classroom_id);
                    const { data } = await (supabase as any)
                        .from("classrooms")
                        .select("*")
                        .in("id", classroomIds);
                    studentRooms = data || [];
                }

                const allRooms: Classroom[] = [];
                const seen = new Set<string>();

                // Add mentor rooms
                (mentorRooms || []).forEach((r: any) => {
                    if (!seen.has(r.id)) {
                        seen.add(r.id);
                        allRooms.push({
                            ...r,
                            student_count: 0,
                            is_mentor: true,
                            invite_code: r.invite_code || r.id.slice(0, 6).toUpperCase(),
                        });
                    }
                });

                // Add student rooms
                studentRooms.forEach((r: any) => {
                    if (!seen.has(r.id)) {
                        seen.add(r.id);
                        allRooms.push({
                            ...r,
                            student_count: 0,
                            is_mentor: false,
                            invite_code: r.invite_code || r.id.slice(0, 6).toUpperCase(),
                        });
                    }
                });

                // Get student counts
                for (const room of allRooms) {
                    const { count } = await (supabase as any)
                        .from("classroom_students")
                        .select("id", { count: "exact", head: true })
                        .eq("classroom_id", room.id);
                    room.student_count = count || 0;
                }

                setClassrooms(allRooms);
            } catch (err) {
                console.error("Error loading classrooms:", err);
                // Fall back to localStorage
                setClassrooms(loadFromStorage(STORAGE_KEY, []));
            }
        } else {
            // Guest mode — use localStorage
            setClassrooms(loadFromStorage(STORAGE_KEY, []));
        }

        setLoading(false);
    };

    // Create classroom
    const createClassroom = async () => {
        if (!newClassName.trim() || !newClassSubject.trim()) {
            toast.error("Please fill in the name and subject");
            return;
        }

        setCreating(true);
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        if (user) {
            try {
                const { data, error } = await (supabase as any)
                    .from("classrooms")
                    .insert({
                        name: newClassName.trim(),
                        description: newClassDesc.trim() || null,
                        subject: newClassSubject.trim(),
                        mentor_id: user.id,
                        invite_code: inviteCode,
                    })
                    .select()
                    .single();

                if (error) throw error;

                setClassrooms(prev => [...prev, {
                    ...data,
                    student_count: 0,
                    is_mentor: true,
                }]);
                toast.success(`Classroom created! Invite code: ${inviteCode}`);
            } catch (err: any) {
                console.error("Error creating classroom:", err);
                toast.error(err.message || "Failed to create classroom");
                setCreating(false);
                return;
            }
        } else {
            // Guest mode
            const newRoom: Classroom = {
                id: crypto.randomUUID(),
                name: newClassName.trim(),
                description: newClassDesc.trim() || undefined,
                subject: newClassSubject.trim(),
                invite_code: inviteCode,
                mentor_id: "guest",
                student_count: 0,
                is_mentor: true,
            };
            const updated = [...classrooms, newRoom];
            setClassrooms(updated);
            saveToStorage(STORAGE_KEY, updated);
            toast.success(`Classroom created! Invite code: ${inviteCode}`);
        }

        setNewClassName("");
        setNewClassSubject("");
        setNewClassDesc("");
        setCreating(false);
        setDialogOpen(false);
    };

    // Join classroom
    const joinClassroom = async () => {
        if (!joinCode.trim()) {
            toast.error("Please enter an invite code");
            return;
        }

        setJoining(true);

        if (user) {
            try {
                // Find classroom by invite code
                const { data: room, error: findErr } = await (supabase as any)
                    .from("classrooms")
                    .select("*")
                    .eq("invite_code", joinCode.trim().toUpperCase())
                    .single();

                if (findErr || !room) {
                    toast.error("Classroom not found. Please check the invite code.");
                    setJoining(false);
                    return;
                }

                // Check if already a member
                if (room.mentor_id === user.id) {
                    toast.error("You are the mentor of this classroom!");
                    setJoining(false);
                    return;
                }

                const { data: existing } = await (supabase as any)
                    .from("classroom_students")
                    .select("id")
                    .eq("classroom_id", room.id)
                    .eq("student_id", user.id)
                    .single();

                if (existing) {
                    toast.error("You're already in this classroom!");
                    setJoining(false);
                    return;
                }

                // Join
                const { error: joinErr } = await (supabase as any)
                    .from("classroom_students")
                    .insert({
                        classroom_id: room.id,
                        student_id: user.id,
                    });

                if (joinErr) throw joinErr;

                setClassrooms(prev => [...prev, {
                    ...room,
                    student_count: 0,
                    is_mentor: false,
                }]);
                toast.success(`Joined "${room.name}" successfully! 🎉`);
            } catch (err: any) {
                console.error("Error joining classroom:", err);
                toast.error(err.message || "Failed to join classroom");
            }
        } else {
            // Guest mode — simulate join
            const alreadyExists = classrooms.find(c => c.invite_code === joinCode.trim().toUpperCase());
            if (alreadyExists) {
                toast.error("You're already in this classroom!");
                setJoining(false);
                return;
            }

            const newRoom: Classroom = {
                id: crypto.randomUUID(),
                name: `Classroom (${joinCode.trim().toUpperCase()})`,
                subject: "General",
                invite_code: joinCode.trim().toUpperCase(),
                mentor_id: "unknown",
                student_count: 1,
                is_mentor: false,
                mentor_name: "Mentor",
            };
            const updated = [...classrooms, newRoom];
            setClassrooms(updated);
            saveToStorage(STORAGE_KEY, updated);
            toast.success("Joined classroom!");
        }

        setJoinCode("");
        setJoining(false);
    };

    // Delete classroom
    const deleteClassroom = async (classroom: Classroom) => {
        if (user && classroom.is_mentor) {
            try {
                await (supabase as any).from("classrooms").delete().eq("id", classroom.id);
            } catch (err) {
                console.error("Error deleting:", err);
            }
        }
        const updated = classrooms.filter(c => c.id !== classroom.id);
        setClassrooms(updated);
        saveToStorage(STORAGE_KEY, updated);
        if (activeClassroom?.id === classroom.id) setActiveClassroom(null);
        toast.success("Classroom removed");
    };

    // Enter classroom detail view
    const enterClassroom = async (classroom: Classroom) => {
        setActiveClassroom(classroom);
        setActiveTab("discussion");

        // Load tasks
        if (user) {
            try {
                const { data } = await (supabase as any)
                    .from("classroom_tasks")
                    .select("*")
                    .eq("classroom_id", classroom.id)
                    .order("created_at", { ascending: false });
                setTasks(data || []);
            } catch {
                setTasks([]);
            }
        } else {
            setTasks(loadFromStorage(`tasks-${classroom.id}`, []));
        }

        // Load messages from localStorage (chat isn't in DB)
        setMessages(loadFromStorage(`${MESSAGES_KEY}-${classroom.id}`, []));
    };

    // Send message in classroom discussion
    const sendMessage = () => {
        if (!newMessage.trim()) return;

        const msg: ClassroomMessage = {
            id: crypto.randomUUID(),
            sender: user?.email?.split("@")[0] || "Guest",
            text: newMessage.trim(),
            timestamp: new Date().toISOString(),
        };

        const updated = [...messages, msg];
        setMessages(updated);
        saveToStorage(`${MESSAGES_KEY}-${activeClassroom?.id}`, updated);
        setNewMessage("");
    };

    // Create task
    const createTask = async () => {
        if (!newTaskTitle.trim() || !activeClassroom) return;
        setCreatingTask(true);

        const task: ClassroomTask = {
            id: crypto.randomUUID(),
            title: newTaskTitle.trim(),
            description: newTaskDesc.trim() || undefined,
            task_type: newTaskType,
            created_at: new Date().toISOString(),
        };

        if (user) {
            try {
                const { data, error } = await (supabase as any)
                    .from("classroom_tasks")
                    .insert({
                        classroom_id: activeClassroom.id,
                        title: task.title,
                        description: task.description,
                        task_type: task.task_type,
                    })
                    .select()
                    .single();

                if (error) throw error;
                setTasks(prev => [data, ...prev]);
            } catch (err: any) {
                toast.error(err.message || "Failed to create task");
                setCreatingTask(false);
                return;
            }
        } else {
            const updated = [task, ...tasks];
            setTasks(updated);
            saveToStorage(`tasks-${activeClassroom.id}`, updated);
        }

        setNewTaskTitle("");
        setNewTaskDesc("");
        setCreatingTask(false);
        setTaskDialogOpen(false);
        toast.success("Task created! ✅");
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Invite code copied to clipboard!");
    };

    const getTaskTypeIcon = (type: string) => {
        switch (type) {
            case "assignment": return <FileText className="w-4 h-4" />;
            case "quiz": return <GraduationCap className="w-4 h-4" />;
            case "reading": return <BookOpen className="w-4 h-4" />;
            case "project": return <Settings className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getTaskTypeColor = (type: string) => {
        switch (type) {
            case "assignment": return "bg-blue-500/20 text-blue-500";
            case "quiz": return "bg-purple-500/20 text-purple-500";
            case "reading": return "bg-green-500/20 text-green-500";
            case "project": return "bg-orange-500/20 text-orange-500";
            default: return "bg-gray-500/20 text-gray-500";
        }
    };

    // ──────────── CLASSROOM DETAIL VIEW ────────────
    if (activeClassroom) {
        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-4 bg-gradient-to-r from-[hsl(var(--gradient-start)/0.08)] to-[hsl(var(--gradient-end)/0.08)]">
                    <Button variant="ghost" size="icon" onClick={() => setActiveClassroom(null)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold">{activeClassroom.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {activeClassroom.subject} • {activeClassroom.student_count} students
                            {activeClassroom.is_mentor && " • You are the mentor"}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyInviteCode(activeClassroom.invite_code)} className="gap-1">
                        <Copy className="w-3.5 h-3.5" />
                        {activeClassroom.invite_code}
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-3 w-fit">
                        <TabsTrigger value="discussion" className="gap-2">
                            <MessageCircle className="w-4 h-4" /> Discussion
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="gap-2">
                            <FileText className="w-4 h-4" /> Tasks
                        </TabsTrigger>
                        <TabsTrigger value="members" className="gap-2">
                            <Users className="w-4 h-4" /> Members
                        </TabsTrigger>
                    </TabsList>

                    {/* Discussion Tab */}
                    <TabsContent value="discussion" className="flex-1 flex flex-col overflow-hidden m-0 p-4">
                        <div className="flex-1 overflow-auto space-y-3 mb-4">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                                    <p>No messages yet. Start the discussion!</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {msg.sender[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-medium text-sm">{msg.sender}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground mt-0.5">{msg.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Input
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && sendMessage()}
                                className="flex-1"
                            />
                            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="flex-1 overflow-auto m-0 p-4">
                        {activeClassroom.is_mentor && (
                            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 mb-4">
                                        <Plus className="w-4 h-4" /> Add Task
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Task</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Title</label>
                                            <Input
                                                placeholder="e.g., Complete Chapter 5 exercises"
                                                value={newTaskTitle}
                                                onChange={e => setNewTaskTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Description (optional)</label>
                                            <Textarea
                                                placeholder="Describe the task..."
                                                value={newTaskDesc}
                                                onChange={e => setNewTaskDesc(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Type</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {["assignment", "quiz", "reading", "project"].map(type => (
                                                    <Button
                                                        key={type}
                                                        variant={newTaskType === type ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setNewTaskType(type)}
                                                        className="capitalize gap-1"
                                                    >
                                                        {getTaskTypeIcon(type)}
                                                        {type}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button onClick={createTask} disabled={creatingTask || !newTaskTitle.trim()} className="w-full">
                                            {creatingTask ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Create Task
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {tasks.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No tasks yet</p>
                                {activeClassroom.is_mentor && (
                                    <p className="text-sm mt-1">Click "Add Task" to create one</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => (
                                    <Card key={task.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", getTaskTypeColor(task.task_type))}>
                                                    {getTaskTypeIcon(task.task_type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium">{task.title}</h4>
                                                    {task.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                                    )}
                                                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(task.created_at).toLocaleDateString()}
                                                        </span>
                                                        <Badge variant="outline" className="capitalize text-xs">{task.task_type}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members" className="flex-1 overflow-auto m-0 p-4">
                        <div className="space-y-3">
                            {/* Mentor */}
                            <Card>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                        {activeClassroom.is_mentor ? (user?.email?.[0] || "M") : (activeClassroom.mentor_name?.[0] || "M")}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">
                                            {activeClassroom.is_mentor ? (user?.email?.split("@")[0] || "You") : (activeClassroom.mentor_name || "Mentor")}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Mentor</p>
                                    </div>
                                    <Badge>Mentor</Badge>
                                </CardContent>
                            </Card>

                            {/* Students placeholder */}
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">{activeClassroom.student_count} student(s) enrolled</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // ──────────── CLASSROOMS LIST VIEW ────────────
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Classrooms
                    </h1>
                    <p className="text-muted-foreground">Join or create study groups with mentors and peers</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Classroom
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Classroom</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Classroom Name</label>
                                <Input
                                    placeholder="e.g., DSA Batch 2024"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                    placeholder="e.g., Data Structures"
                                    value={newClassSubject}
                                    onChange={(e) => setNewClassSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description (optional)</label>
                                <Textarea
                                    placeholder="Brief description of the classroom"
                                    value={newClassDesc}
                                    onChange={(e) => setNewClassDesc(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <Button onClick={createClassroom} disabled={creating} className="w-full">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Classroom
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Join Classroom */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Enter invite code to join a classroom"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === "Enter" && joinClassroom()}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={joinClassroom} disabled={joining}>
                            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Classrooms Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {classrooms.map((classroom) => (
                            <Card key={classroom.id} className="hover:shadow-md transition-shadow group">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <Badge variant={classroom.is_mentor ? "default" : "secondary"}>
                                                {classroom.is_mentor ? "Mentor" : "Student"}
                                            </Badge>
                                            {classroom.is_mentor && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteClassroom(classroom);
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-lg mb-1">{classroom.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-1">{classroom.subject}</p>
                                    {classroom.description && (
                                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{classroom.description}</p>
                                    )}

                                    {classroom.mentor_name && (
                                        <p className="text-sm mb-3">
                                            <span className="text-muted-foreground">Mentor:</span> {classroom.mentor_name}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Users className="w-4 h-4" />
                                            {classroom.student_count} students
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyInviteCode(classroom.invite_code);
                                            }}
                                            className="gap-1"
                                        >
                                            <Copy className="w-3 h-3" />
                                            {classroom.invite_code}
                                        </Button>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={() => enterClassroom(classroom)}
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        Enter Classroom
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Empty State */}
                    {classrooms.length === 0 && (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Create a classroom or join one with an invite code
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button onClick={() => setDialogOpen(true)} className="gap-2">
                                        <Plus className="w-4 h-4" /> Create Classroom
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
