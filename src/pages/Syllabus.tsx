import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
    BookOpen,
    CheckCircle2,
    Circle,
    Loader2,
    GraduationCap,
    Target,
    ChevronDown,
    ChevronRight
} from "lucide-react";

interface SyllabusItem {
    id: string;
    name: string;
    board_or_exam: string;
    subjects: string[];
    topics: Record<string, string[]>;
}

interface UserProgress {
    syllabusId: string;
    completedTopics: string[];
}

export default function Syllabus() {
    const { user } = useAuth();
    const [syllabi, setSyllabi] = useState<SyllabusItem[]>([
        {
            id: "1",
            name: "GATE CS",
            board_or_exam: "GATE",
            subjects: ["DSA", "OS", "DBMS", "Networks", "TOC"],
            topics: {
                "DSA": ["Arrays", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Sorting"],
                "OS": ["Process Management", "Memory Management", "File Systems", "Deadlocks", "Synchronization"],
                "DBMS": ["SQL", "Normalization", "Transactions", "Indexing", "ER Model"],
                "Networks": ["TCP/IP", "OSI Model", "Routing", "Security", "Protocols"],
                "TOC": ["Automata", "Regular Languages", "CFG", "Turing Machines"]
            }
        },
        {
            id: "2",
            name: "CBSE Class 12 - PCM",
            board_or_exam: "CBSE",
            subjects: ["Physics", "Chemistry", "Mathematics"],
            topics: {
                "Physics": ["Electrostatics", "Current Electricity", "Magnetism", "EMI", "Optics", "Modern Physics"],
                "Chemistry": ["Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Organic Chemistry"],
                "Mathematics": ["Relations and Functions", "Calculus", "Vectors", "3D Geometry", "Probability"]
            }
        },
        {
            id: "3",
            name: "JEE Main",
            board_or_exam: "JEE",
            subjects: ["Physics", "Chemistry", "Mathematics"],
            topics: {
                "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"],
                "Chemistry": ["Physical Chemistry", "Inorganic Chemistry", "Organic Chemistry"],
                "Mathematics": ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry"]
            }
        }
    ]);
    const [selectedSyllabus, setSelectedSyllabus] = useState<SyllabusItem | null>(null);
    const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const selectSyllabus = (syllabus: SyllabusItem) => {
        setSelectedSyllabus(syllabus);
        // Load saved progress for this syllabus
        const saved = localStorage.getItem(`syllabus_${syllabus.id}_${user?.id}`);
        if (saved) {
            setCompletedTopics(new Set(JSON.parse(saved)));
        } else {
            setCompletedTopics(new Set());
        }
        // Expand first subject by default
        if (syllabus.subjects.length > 0) {
            setExpandedSubjects(new Set([syllabus.subjects[0]]));
        }
    };

    const toggleSubject = (subject: string) => {
        setExpandedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(subject)) {
                next.delete(subject);
            } else {
                next.add(subject);
            }
            return next;
        });
    };

    const toggleTopic = (subject: string, topic: string) => {
        const key = `${subject}::${topic}`;
        setCompletedTopics(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            // Save to localStorage
            if (selectedSyllabus && user) {
                localStorage.setItem(
                    `syllabus_${selectedSyllabus.id}_${user.id}`,
                    JSON.stringify(Array.from(next))
                );
            }
            return next;
        });
    };

    const getSubjectProgress = (subject: string) => {
        if (!selectedSyllabus) return 0;
        const topics = selectedSyllabus.topics[subject] || [];
        if (topics.length === 0) return 0;
        const completed = topics.filter(t => completedTopics.has(`${subject}::${t}`)).length;
        return Math.round((completed / topics.length) * 100);
    };

    const getTotalProgress = () => {
        if (!selectedSyllabus) return 0;
        let total = 0;
        let completed = 0;
        Object.entries(selectedSyllabus.topics).forEach(([subject, topics]) => {
            total += topics.length;
            completed += topics.filter(t => completedTopics.has(`${subject}::${t}`)).length;
        });
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    };

    if (!selectedSyllabus) {
        return (
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-primary" />
                        Syllabus-Based Learning
                    </h1>
                    <p className="text-muted-foreground">Select your syllabus to track progress and get aligned content</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {syllabi.map((syllabus) => (
                        <Card
                            key={syllabus.id}
                            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary"
                            onClick={() => selectSyllabus(syllabus)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    </div>
                                    <Badge>{syllabus.board_or_exam}</Badge>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{syllabus.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {syllabus.subjects.length} subjects • {Object.values(syllabus.topics).flat().length} topics
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {syllabus.subjects.slice(0, 3).map((subject) => (
                                        <Badge key={subject} variant="secondary" className="text-xs">
                                            {subject}
                                        </Badge>
                                    ))}
                                    {syllabus.subjects.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{syllabus.subjects.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSyllabus(null)}>
                            ← Back
                        </Button>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-primary" />
                        {selectedSyllabus.name}
                    </h1>
                    <p className="text-muted-foreground">Track your progress through each topic</p>
                </div>
                <Badge className="text-lg px-4 py-2">{getTotalProgress()}% Complete</Badge>
            </div>

            {/* Overall Progress */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Overall Progress</span>
                        <span className="text-sm text-muted-foreground">
                            {Array.from(completedTopics).length} / {Object.values(selectedSyllabus.topics).flat().length} topics
                        </span>
                    </div>
                    <Progress value={getTotalProgress()} className="h-3" />
                </CardContent>
            </Card>

            {/* Subjects */}
            <div className="space-y-4">
                {selectedSyllabus.subjects.map((subject) => (
                    <Card key={subject}>
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleSubject(subject)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {expandedSubjects.has(subject) ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5" />
                                    )}
                                    <CardTitle className="text-lg">{subject}</CardTitle>
                                    <Badge variant="outline">
                                        {selectedSyllabus.topics[subject]?.length || 0} topics
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        {getSubjectProgress(subject)}%
                                    </span>
                                    <Progress value={getSubjectProgress(subject)} className="w-24 h-2" />
                                </div>
                            </div>
                        </CardHeader>
                        {expandedSubjects.has(subject) && (
                            <CardContent className="pt-0">
                                <div className="grid gap-2 md:grid-cols-2">
                                    {selectedSyllabus.topics[subject]?.map((topic) => {
                                        const isCompleted = completedTopics.has(`${subject}::${topic}`);
                                        return (
                                            <div
                                                key={topic}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isCompleted ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : "hover:bg-muted/50"
                                                    }`}
                                                onClick={() => toggleTopic(subject, topic)}
                                            >
                                                <Checkbox checked={isCompleted} />
                                                <span className={isCompleted ? "line-through text-muted-foreground" : ""}>
                                                    {topic}
                                                </span>
                                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
