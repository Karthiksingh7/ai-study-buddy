import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    GraduationCap,
    Users,
    ClipboardList,
    TrendingUp,
    Plus,
    Loader2,
    BookOpen,
    Target,
    BarChart3
} from "lucide-react";

interface ClassroomSummary {
    id: string;
    name: string;
    subject: string;
    studentCount: number;
}

interface StudentSummary {
    id: string;
    name: string;
    quizScore: number;
    studyTime: number;
    lastActive: string;
}

export default function MentorDashboard() {
    const { user } = useAuth();
    const { isMentor } = useRole();
    const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
    const [students, setStudents] = useState<StudentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [newClassName, setNewClassName] = useState("");
    const [newClassSubject, setNewClassSubject] = useState("");

    useEffect(() => {
        if (isMentor) {
            loadMentorData();
        }
    }, [isMentor]);

    const loadMentorData = async () => {
        try {
            // Load mentor's classrooms (will work after migration)
            // For now, use mock data
            setClassrooms([
                { id: "1", name: "DSA Batch 2024", subject: "DSA", studentCount: 25 },
                { id: "2", name: "DBMS Fundamentals", subject: "DBMS", studentCount: 18 }
            ]);

            setStudents([
                { id: "1", name: "Student 1", quizScore: 85, studyTime: 120, lastActive: "2 hours ago" },
                { id: "2", name: "Student 2", quizScore: 72, studyTime: 90, lastActive: "1 day ago" },
                { id: "3", name: "Student 3", quizScore: 91, studyTime: 150, lastActive: "30 mins ago" }
            ]);
        } catch (error) {
            console.error("Error loading mentor data:", error);
        } finally {
            setLoading(false);
        }
    };

    const createClassroom = async () => {
        if (!newClassName.trim() || !newClassSubject.trim()) {
            toast.error("Please fill in all fields");
            return;
        }

        // Will create classroom after migration
        toast.success(`Classroom "${newClassName}" created!`);
        setNewClassName("");
        setNewClassSubject("");
        loadMentorData();
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
                        <GraduationCap className="w-6 h-6 text-primary" />
                        Mentor Dashboard
                    </h1>
                    <p className="text-muted-foreground">Manage classrooms and track student progress</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Mentor Access
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{classrooms.length}</p>
                                <p className="text-sm text-muted-foreground">Classrooms</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {classrooms.reduce((acc, c) => acc + c.studentCount, 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Students</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">12</p>
                                <p className="text-sm text-muted-foreground">Assignments</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                                <Target className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">78%</p>
                                <p className="text-sm text-muted-foreground">Avg Performance</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="classrooms" className="w-full">
                <TabsList>
                    <TabsTrigger value="classrooms" className="gap-2">
                        <BookOpen className="w-4 h-4" />
                        Classrooms
                    </TabsTrigger>
                    <TabsTrigger value="students" className="gap-2">
                        <Users className="w-4 h-4" />
                        Students
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Reports
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="classrooms" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Your Classrooms</CardTitle>
                                <Dialog>
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
                                            <Button onClick={createClassroom} className="w-full">
                                                Create Classroom
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {classrooms.map((classroom) => (
                                    <Card key={classroom.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold">{classroom.name}</h3>
                                                    <Badge variant="secondary" className="mt-1">
                                                        {classroom.subject}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-primary">{classroom.studentCount}</p>
                                                    <p className="text-xs text-muted-foreground">students</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <Button variant="outline" size="sm" className="flex-1">
                                                    View Students
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1">
                                                    Assign Task
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {students.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Last active: {student.lastActive}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-green-600">{student.quizScore}%</p>
                                                <p className="text-xs text-muted-foreground">Quiz Score</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-blue-600">{student.studyTime}m</p>
                                                <p className="text-xs text-muted-foreground">Study Time</p>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>AI-Generated Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">
                                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Generate AI-powered performance reports for your students</p>
                                <Button className="mt-4">Generate Class Report</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
