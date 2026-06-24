import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FormattedMessage } from "@/components/FormattedMessage";
import {
    ClipboardList,
    Plus,
    Play,
    Clock,
    Trophy,
    Loader2,
    Brain,
    Code,
    FileText,
    CheckCircle2,
    Star,
    X,
    ArrowLeft,
    ArrowRight,
    Timer,
    AlertTriangle,
    ChevronLeft,
    Target,
    Award,
    BarChart3,
    Sparkles
} from "lucide-react";




interface MockTest {
    id: string;
    title: string;
    subject: string;
    difficulty: string;
    duration_minutes: number;
    total_marks: number;
    question_count: number;
    question_types: string[];
    avg_score?: number;
    attempts: number;
}

interface Question {
    id: number;
    type: "mcq" | "descriptive" | "coding";
    question: string;
    options?: string[];
    correctIndex?: number;
    expected_points?: string[];
    model_answer?: string;
    test_cases?: { input: string; expected_output: string }[];
    hints?: string[];
    model_solution?: string;
    explanation?: string;
    marks: number;
    difficulty: string;
}

interface UserAnswer {
    questionId: number;
    answer: string | number;
}

interface TestResult {
    totalScore: number;
    maxScore: number;
    percentage: number;
    timeTaken: number;
    questionResults: {
        questionId: number;
        correct: boolean;
        score: number;
        maxScore: number;
        feedback?: string;
    }[];
}

type ViewMode = "list" | "taking" | "results";

export default function MockTests() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [tests, setTests] = useState<MockTest[]>([
        {
            id: "1",
            title: "DSA Full Practice Test",
            subject: "Data Structures",
            difficulty: "intermediate",
            duration_minutes: 60,
            total_marks: 100,
            question_count: 25,
            question_types: ["mcq", "coding"],
            avg_score: 72,
            attempts: 156
        },
        {
            id: "2",
            title: "DBMS Concepts Quiz",
            subject: "DBMS",
            difficulty: "easy",
            duration_minutes: 30,
            total_marks: 50,
            question_count: 20,
            question_types: ["mcq"],
            avg_score: 85,
            attempts: 89
        },
        {
            id: "3",
            title: "OS Advanced Test",
            subject: "Operating Systems",
            difficulty: "hard",
            duration_minutes: 90,
            total_marks: 150,
            question_count: 30,
            question_types: ["mcq", "descriptive"],
            avg_score: 58,
            attempts: 45
        }
    ]);
    const [creating, setCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTest, setNewTest] = useState({
        title: "",
        subject: "",
        difficulty: "intermediate",
        duration: "60",
        types: ["mcq"]
    });

    // Test taking state
    const [activeTest, setActiveTest] = useState<MockTest | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testStartTime, setTestStartTime] = useState<number>(0);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (viewMode === "taking" && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        // Auto-submit when time runs out
                        handleSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [viewMode, timeRemaining]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const startTest = async (test: MockTest) => {
        setActiveTest(test);
        setIsLoadingQuestions(true);
        setViewMode("taking");
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setTestResult(null);
        setTestStartTime(Date.now());
        setTimeRemaining(test.duration_minutes * 60);

        try {
            // Generate questions using Gemini API directly
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("No API key");

            const questionCount = Math.min(test.question_count, 15);
            const typesStr = test.question_types.join(", ");

            const prompt = `Generate exactly ${questionCount} ${test.difficulty} difficulty questions about "${test.subject}" for a mock test.

Question types to include: ${typesStr}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "Clear, specific question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct",
      "marks": 4,
      "difficulty": "${test.difficulty}"
    }
  ]
}

Rules:
- For MCQ: exactly 4 options, correctIndex is 0-3, include explanation
- For descriptive: include expected_points array and model_answer string, marks: 10
- For coding: include hints array and model_solution string, marks: 15
- Questions must be factually accurate and educationally valuable
- Options must be plausible (no obvious wrong answers)
- Each question must have a unique id starting from 1`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 8192,
                        },
                    }),
                }
            );

            if (!response.ok) throw new Error("API request failed");

            const data = await response.json();
            let content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            // Clean and parse JSON
            content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(content);
            const generatedQuestions = parsed.questions || [];

            if (generatedQuestions.length === 0) throw new Error("No questions generated");

            // Validate each question has required fields
            const validQuestions = generatedQuestions.map((q: any, idx: number) => ({
                ...q,
                id: idx + 1,
                type: q.type || "mcq",
                marks: q.marks || 4,
                difficulty: q.difficulty || test.difficulty,
                correctIndex: q.type === "mcq" ? (q.correctIndex ?? 0) : undefined,
            }));

            setQuestions(validQuestions);
            toast.success(`${validQuestions.length} questions generated!`);
        } catch (error: any) {
            console.error("Error generating questions:", error);
            toast.info("Using curated questions for this test");
            setQuestions(generateSampleQuestions(test));
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const generateSampleQuestions = (test: MockTest): Question[] => {
        const questionBanks: Record<string, Question[]> = {
            "Data Structures": [
                {
                    id: 1, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the time complexity of searching for an element in a balanced Binary Search Tree?",
                    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                    correctIndex: 1,
                    explanation: "In a balanced BST, each comparison eliminates half the remaining nodes, giving O(log n) time complexity."
                },
                {
                    id: 2, type: "mcq", marks: 4, difficulty: "easy",
                    question: "Which data structure follows the LIFO (Last In, First Out) principle?",
                    options: ["Queue", "Stack", "Array", "Linked List"],
                    correctIndex: 1,
                    explanation: "A Stack follows LIFO — the last element pushed is the first one popped."
                },
                {
                    id: 3, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the worst-case time complexity of QuickSort?",
                    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
                    correctIndex: 2,
                    explanation: "QuickSort's worst case is O(n²), occurring when the pivot is always the smallest or largest element (e.g., already sorted array with first element as pivot)."
                },
                {
                    id: 4, type: "mcq", marks: 4, difficulty: "easy",
                    question: "In a singly linked list, what does the last node's next pointer point to?",
                    options: ["The first node", "The previous node", "NULL", "Itself"],
                    correctIndex: 2,
                    explanation: "In a singly linked list, the last node's next pointer is NULL, indicating the end of the list."
                },
                {
                    id: 5, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which traversal of a Binary Search Tree gives elements in sorted order?",
                    options: ["Preorder", "Postorder", "Inorder", "Level order"],
                    correctIndex: 2,
                    explanation: "Inorder traversal (Left → Root → Right) of a BST visits nodes in ascending order."
                },
                {
                    id: 6, type: "mcq", marks: 4, difficulty: "hard",
                    question: "What is the amortized time complexity of inserting an element into a dynamic array (ArrayList)?",
                    options: ["O(n)", "O(1)", "O(log n)", "O(n²)"],
                    correctIndex: 1,
                    explanation: "While occasional resizing takes O(n), the amortized cost per insertion is O(1) because resizing happens infrequently."
                },
                {
                    id: 7, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which data structure is used to implement BFS (Breadth-First Search) on a graph?",
                    options: ["Stack", "Queue", "Priority Queue", "Hash Table"],
                    correctIndex: 1,
                    explanation: "BFS uses a Queue to process nodes level by level, ensuring all neighbors are visited before moving deeper."
                },
                {
                    id: 8, type: "mcq", marks: 4, difficulty: "hard",
                    question: "In a Min-Heap with n elements, what is the time complexity of extracting the minimum element?",
                    options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
                    correctIndex: 2,
                    explanation: "Extracting the min requires removing the root and then heapifying down, which takes O(log n)."
                },
                {
                    id: 9, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the space complexity of storing a graph with V vertices and E edges using an adjacency matrix?",
                    options: ["O(V)", "O(E)", "O(V²)", "O(V + E)"],
                    correctIndex: 2,
                    explanation: "An adjacency matrix uses a V×V 2D array, requiring O(V²) space regardless of the number of edges."
                },
                {
                    id: 10, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which algorithm finds the shortest path in a weighted graph with no negative edges?",
                    options: ["DFS", "Bellman-Ford", "Dijkstra's Algorithm", "Floyd-Warshall"],
                    correctIndex: 2,
                    explanation: "Dijkstra's Algorithm efficiently finds shortest paths from a source in graphs with non-negative edge weights using a greedy approach."
                },
            ],
            "DBMS": [
                {
                    id: 1, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What does ACID stand for in database transactions?",
                    options: [
                        "Atomicity, Consistency, Isolation, Durability",
                        "Association, Consistency, Isolation, Durability",
                        "Atomicity, Completeness, Isolation, Dependency",
                        "Atomicity, Consistency, Integration, Durability"
                    ],
                    correctIndex: 0,
                    explanation: "ACID stands for Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrent transactions don't interfere), and Durability (committed data persists)."
                },
                {
                    id: 2, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which normal form eliminates transitive dependencies?",
                    options: ["1NF", "2NF", "3NF", "BCNF"],
                    correctIndex: 2,
                    explanation: "Third Normal Form (3NF) eliminates transitive dependencies — non-key attributes must depend only on the primary key, not on other non-key attributes."
                },
                {
                    id: 3, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What type of SQL JOIN returns all rows from both tables, with NULLs where there is no match?",
                    options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
                    correctIndex: 3,
                    explanation: "A FULL OUTER JOIN returns all rows from both tables, filling in NULLs where no matching row exists in the other table."
                },
                {
                    id: 4, type: "mcq", marks: 4, difficulty: "easy",
                    question: "Which SQL command is used to remove all rows from a table without logging individual row deletions?",
                    options: ["DELETE", "DROP", "TRUNCATE", "REMOVE"],
                    correctIndex: 2,
                    explanation: "TRUNCATE removes all rows from a table quickly without logging individual row deletions. Unlike DROP, it keeps the table structure."
                },
                {
                    id: 5, type: "mcq", marks: 4, difficulty: "hard",
                    question: "In a B+ Tree index, where are the actual data pointers stored?",
                    options: ["All nodes", "Root node only", "Internal nodes only", "Leaf nodes only"],
                    correctIndex: 3,
                    explanation: "In a B+ Tree, data pointers are stored only at the leaf level. Internal nodes store keys for navigation purposes only."
                },
                {
                    id: 6, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which type of database lock allows multiple transactions to read but prevents any from writing?",
                    options: ["Exclusive Lock (X)", "Shared Lock (S)", "Update Lock (U)", "Intent Lock (I)"],
                    correctIndex: 1,
                    explanation: "A Shared Lock (S) allows multiple transactions to read the data simultaneously but prevents any transaction from modifying it."
                },
                {
                    id: 7, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is a deadlock in database systems?",
                    options: [
                        "When a transaction takes too long",
                        "When two or more transactions wait for each other to release locks",
                        "When a transaction fails to commit",
                        "When a query returns no results"
                    ],
                    correctIndex: 1,
                    explanation: "A deadlock occurs when two or more transactions are each waiting for the other to release a lock, creating a circular wait condition."
                },
                {
                    id: 8, type: "mcq", marks: 4, difficulty: "easy",
                    question: "Which SQL clause is used to filter groups of rows?",
                    options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
                    correctIndex: 1,
                    explanation: "HAVING filters groups created by GROUP BY, while WHERE filters individual rows before grouping."
                },
                {
                    id: 9, type: "mcq", marks: 4, difficulty: "hard",
                    question: "What is the purpose of Write-Ahead Logging (WAL) in databases?",
                    options: [
                        "To speed up read queries",
                        "To ensure durability by writing changes to a log before applying them",
                        "To compress data for storage",
                        "To encrypt sensitive data"
                    ],
                    correctIndex: 1,
                    explanation: "WAL ensures durability by recording changes to a log file before modifying the actual database, enabling crash recovery."
                },
                {
                    id: 10, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is a foreign key constraint?",
                    options: [
                        "A key that is always unique",
                        "A reference to the primary key of another table",
                        "A key that cannot be null",
                        "An encrypted key for security"
                    ],
                    correctIndex: 1,
                    explanation: "A foreign key is a column (or set of columns) that references the primary key of another table, establishing a relationship between the two tables."
                },
            ],
            "Operating Systems": [
                {
                    id: 1, type: "mcq", marks: 4, difficulty: "easy",
                    question: "Which scheduling algorithm may cause the 'starvation' problem?",
                    options: ["Round Robin", "FCFS", "Shortest Job First (SJF)", "Multilevel Queue"],
                    correctIndex: 2,
                    explanation: "SJF can cause starvation because longer processes may wait indefinitely if shorter processes keep arriving."
                },
                {
                    id: 2, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is a race condition in operating systems?",
                    options: [
                        "When a process runs faster than expected",
                        "When two processes compete for CPU time",
                        "When the outcome depends on the order of execution of concurrent processes",
                        "When a process completes before its deadline"
                    ],
                    correctIndex: 2,
                    explanation: "A race condition occurs when the behavior of software depends on the relative timing of events, such as the order in which threads are scheduled."
                },
                {
                    id: 3, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which page replacement algorithm is known as the 'optimal' algorithm?",
                    options: ["FIFO", "LRU", "OPT (Bélády's Algorithm)", "Clock Algorithm"],
                    correctIndex: 2,
                    explanation: "OPT replaces the page that won't be used for the longest time in the future, giving the minimum number of page faults. It's theoretical since future access patterns aren't known."
                },
                {
                    id: 4, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What is the primary purpose of virtual memory?",
                    options: [
                        "To increase CPU speed",
                        "To provide more memory than physically available by using disk",
                        "To make programs run faster",
                        "To protect the OS kernel"
                    ],
                    correctIndex: 1,
                    explanation: "Virtual memory allows processes to use more memory than physically available by swapping pages between RAM and disk storage."
                },
                {
                    id: 5, type: "mcq", marks: 4, difficulty: "hard",
                    question: "Which of the following conditions is NOT required for a deadlock to occur?",
                    options: [
                        "Mutual Exclusion",
                        "Hold and Wait",
                        "Preemption",
                        "Circular Wait"
                    ],
                    correctIndex: 2,
                    explanation: "The four necessary conditions for deadlock are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemption (the ability to forcefully take resources) actually prevents deadlock."
                },
                {
                    id: 6, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is thrashing in an operating system?",
                    options: [
                        "When the CPU overheats",
                        "When too many processes compete for CPU",
                        "When the system spends more time paging than executing",
                        "When a hard drive fails"
                    ],
                    correctIndex: 2,
                    explanation: "Thrashing occurs when the system spends most of its time swapping pages in and out of memory rather than executing processes, severely degrading performance."
                },
                {
                    id: 7, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What is the difference between a process and a thread?",
                    options: [
                        "A process is faster than a thread",
                        "A thread is an independent program",
                        "Threads share the same memory space within a process",
                        "A process can only have one thread"
                    ],
                    correctIndex: 2,
                    explanation: "Threads within a process share the same address space and resources, making context switching between threads faster than between processes."
                },
                {
                    id: 8, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which synchronization primitive allows a limited number of concurrent accesses to a resource?",
                    options: ["Mutex", "Semaphore", "Spinlock", "Barrier"],
                    correctIndex: 1,
                    explanation: "A Semaphore maintains a count, allowing up to N concurrent accesses. A counting semaphore can permit multiple threads, while a binary semaphore acts like a mutex."
                },
                {
                    id: 9, type: "mcq", marks: 4, difficulty: "hard",
                    question: "In the Banker's Algorithm, what does the 'safe state' mean?",
                    options: [
                        "All processes have completed execution",
                        "There exists at least one sequence in which all processes can finish without deadlock",
                        "No process is currently waiting",
                        "The CPU utilization is above 90%"
                    ],
                    correctIndex: 1,
                    explanation: "A safe state means there exists a safe sequence where all processes can obtain their maximum required resources, execute, and release them without causing deadlock."
                },
                {
                    id: 10, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the purpose of a Translation Lookaside Buffer (TLB)?",
                    options: [
                        "To store frequently used data",
                        "To cache page table entries for faster address translation",
                        "To buffer disk I/O operations",
                        "To manage network packets"
                    ],
                    correctIndex: 1,
                    explanation: "TLB is a hardware cache that stores recent virtual-to-physical page translations, significantly speeding up memory access by avoiding repeated page table lookups."
                },
            ],
        };

        // Find matching question bank or use a general set
        const subjectLower = test.subject.toLowerCase();
        let selectedBank: Question[] = [];

        for (const [key, questions] of Object.entries(questionBanks)) {
            if (subjectLower.includes(key.toLowerCase()) || key.toLowerCase().includes(subjectLower)) {
                selectedBank = questions;
                break;
            }
        }

        // If no matching bank, create general CS questions
        if (selectedBank.length === 0) {
            selectedBank = [
                {
                    id: 1, type: "mcq", marks: 4, difficulty: "easy",
                    question: `What is the primary purpose of an algorithm?`,
                    options: ["To write code", "To solve a problem step by step", "To debug programs", "To compile code"],
                    correctIndex: 1,
                    explanation: "An algorithm is a well-defined sequence of steps to solve a specific problem."
                },
                {
                    id: 2, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What does CPU stand for?",
                    options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"],
                    correctIndex: 0,
                    explanation: "CPU stands for Central Processing Unit, the primary component that executes instructions."
                },
                {
                    id: 3, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the time complexity of binary search on a sorted array?",
                    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
                    correctIndex: 1,
                    explanation: "Binary search halves the search space at each step, giving O(log n) time complexity."
                },
                {
                    id: 4, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "Which layer of the OSI model handles routing?",
                    options: ["Data Link Layer", "Transport Layer", "Network Layer", "Application Layer"],
                    correctIndex: 2,
                    explanation: "The Network Layer (Layer 3) handles routing of data packets between networks."
                },
                {
                    id: 5, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What is the difference between RAM and ROM?",
                    options: [
                        "RAM is permanent, ROM is temporary",
                        "RAM is volatile (loses data on power off), ROM is non-volatile",
                        "ROM is faster than RAM",
                        "There is no difference"
                    ],
                    correctIndex: 1,
                    explanation: "RAM (Random Access Memory) is volatile — it loses data when power is off. ROM (Read-Only Memory) retains data permanently."
                },
                {
                    id: 6, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is polymorphism in object-oriented programming?",
                    options: [
                        "The ability of a class to inherit from multiple classes",
                        "The ability of objects of different types to be treated as the same type",
                        "Hiding implementation details",
                        "Creating new classes from existing ones"
                    ],
                    correctIndex: 1,
                    explanation: "Polymorphism allows objects of different classes to be treated as objects of a common superclass, enabling different behaviors through the same interface."
                },
                {
                    id: 7, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is the purpose of DNS in computer networks?",
                    options: [
                        "To encrypt network traffic",
                        "To translate domain names to IP addresses",
                        "To route packets between networks",
                        "To assign IP addresses automatically"
                    ],
                    correctIndex: 1,
                    explanation: "DNS (Domain Name System) translates human-readable domain names (like google.com) into IP addresses that computers use to identify each other."
                },
                {
                    id: 8, type: "mcq", marks: 4, difficulty: "hard",
                    question: "What is the CAP theorem in distributed systems?",
                    options: [
                        "A system can achieve Compression, Authentication, and Performance simultaneously",
                        "A distributed system can provide at most two of: Consistency, Availability, Partition tolerance",
                        "Caching Always improves Performance",
                        "Concurrency requires Atomic Processing"
                    ],
                    correctIndex: 1,
                    explanation: "The CAP theorem states that a distributed system cannot simultaneously guarantee all three: Consistency, Availability, and Partition Tolerance."
                },
                {
                    id: 9, type: "mcq", marks: 4, difficulty: "easy",
                    question: "What is the output of 5 + '3' in JavaScript?",
                    options: ["8", "'53'", "Error", "undefined"],
                    correctIndex: 1,
                    explanation: "JavaScript performs type coercion: the number 5 is converted to a string and concatenated with '3', resulting in the string '53'."
                },
                {
                    id: 10, type: "mcq", marks: 4, difficulty: "intermediate",
                    question: "What is a hash collision and how is it typically resolved?",
                    options: [
                        "When two keys produce different hash values — resolved by rehashing",
                        "When two keys produce the same hash value — resolved by chaining or open addressing",
                        "When a hash table runs out of memory — resolved by resizing",
                        "When a hash function is too slow — resolved by using a faster algorithm"
                    ],
                    correctIndex: 1,
                    explanation: "A hash collision occurs when different keys produce the same hash value. Common resolution methods include chaining (linked lists at each bucket) and open addressing (probing for the next empty slot)."
                },
            ];
        }

        // Select questions based on count and shuffle
        const questionCount = Math.min(test.question_count, selectedBank.length);
        const shuffled = [...selectedBank].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, questionCount).map((q, idx) => ({ ...q, id: idx + 1 }));
    };

    const handleAnswerChange = (questionId: number, answer: string | number) => {
        setUserAnswers((prev) => {
            const existing = prev.findIndex((a) => a.questionId === questionId);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { questionId, answer };
                return updated;
            }
            return [...prev, { questionId, answer }];
        });
    };

    const getUserAnswer = (questionId: number): string | number | undefined => {
        return userAnswers.find((a) => a.questionId === questionId)?.answer;
    };

    const handleSubmitTest = useCallback(async () => {
        if (!activeTest || questions.length === 0) return;

        const timeTaken = Math.floor((Date.now() - testStartTime) / 1000);
        let totalScore = 0;
        let maxScore = 0;
        const questionResults: TestResult["questionResults"] = [];

        questions.forEach((q) => {
            const userAnswer = getUserAnswer(q.id);
            maxScore += q.marks;
            let score = 0;
            let correct = false;
            let feedback = "";

            if (q.type === "mcq") {
                if (userAnswer !== undefined && userAnswer === q.correctIndex) {
                    score = q.marks;
                    correct = true;
                    feedback = "Correct!";
                } else if (userAnswer !== undefined) {
                    feedback = q.explanation || "Incorrect. Review this concept.";
                } else {
                    feedback = "Not attempted";
                }
            } else if (q.type === "descriptive") {
                // For descriptive, give partial credit if answered
                if (userAnswer && typeof userAnswer === "string" && userAnswer.length > 20) {
                    score = q.marks * 0.6; // 60% for attempting with substantial answer
                    feedback = "Answer submitted. Review model answer for improvement.";
                } else if (userAnswer) {
                    score = q.marks * 0.3;
                    feedback = "Answer too brief. Expand your explanation.";
                } else {
                    feedback = "Not attempted";
                }
            } else if (q.type === "coding") {
                if (userAnswer && typeof userAnswer === "string" && userAnswer.length > 10) {
                    score = q.marks * 0.5; // 50% for attempting
                    feedback = "Code submitted. Manual review needed.";
                } else {
                    feedback = "Not attempted";
                }
            }

            totalScore += score;
            questionResults.push({
                questionId: q.id,
                correct,
                score,
                maxScore: q.marks,
                feedback
            });
        });

        const result: TestResult = {
            totalScore: Math.round(totalScore * 10) / 10,
            maxScore,
            percentage: Math.round((totalScore / maxScore) * 100),
            timeTaken,
            questionResults
        };

        setTestResult(result);
        setViewMode("results");

        // Save to database
        if (user) {
            try {
                await supabase.from("mock_test_results").insert({
                    test_id: activeTest.id,
                    user_id: user.id,
                    answers: userAnswers,
                    total_score: result.totalScore,
                    max_score: result.maxScore,
                    time_taken_seconds: timeTaken,
                    ai_evaluation: { questionResults }
                });
                toast.success("Test results saved!");
            } catch (error) {
                console.error("Error saving results:", error);
            }
        }
    }, [activeTest, questions, userAnswers, testStartTime, user]);

    const exitTest = () => {
        if (viewMode === "taking") {
            if (!confirm("Are you sure you want to exit? Your progress will be lost.")) {
                return;
            }
        }
        setViewMode("list");
        setActiveTest(null);
        setQuestions([]);
        setUserAnswers([]);
        setTestResult(null);
    };

    const createTest = async () => {
        if (!newTest.title.trim() || !newTest.subject.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setCreating(true);
        await new Promise((r) => setTimeout(r, 1500));

        const test: MockTest = {
            id: crypto.randomUUID(),
            title: newTest.title,
            subject: newTest.subject,
            difficulty: newTest.difficulty,
            duration_minutes: parseInt(newTest.duration),
            total_marks: parseInt(newTest.duration) * 1.5,
            question_count: Math.floor(parseInt(newTest.duration) / 3),
            question_types: newTest.types,
            attempts: 0
        };

        setTests((prev) => [test, ...prev]);
        setShowCreateForm(false);
        setNewTest({ title: "", subject: "", difficulty: "intermediate", duration: "60", types: ["mcq"] });
        setCreating(false);
        toast.success("Mock test created! AI will generate questions when you start.");
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case "easy": return "bg-green-500/20 text-green-400 border-green-500/30";
            case "intermediate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "hard": return "bg-red-500/20 text-red-400 border-red-500/30";
            default: return "bg-gray-500/20 text-gray-400";
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "mcq": return <Brain className="w-4 h-4" />;
            case "coding": return <Code className="w-4 h-4" />;
            case "descriptive": return <FileText className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    // Results View
    if (viewMode === "results" && testResult && activeTest) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={exitTest} className="gap-2">
                            <ChevronLeft className="w-4 h-4" />
                            Back to Tests
                        </Button>
                    </div>

                    {/* Score Card */}
                    <Card className="overflow-hidden border-primary/20">
                        <div className="bg-gradient-to-r from-primary/20 via-cyan-500/10 to-primary/20 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-cyan-400 mb-4 shadow-lg shadow-primary/30">
                                {testResult.percentage >= 70 ? (
                                    <Trophy className="w-12 h-12 text-primary-foreground" />
                                ) : testResult.percentage >= 40 ? (
                                    <Target className="w-12 h-12 text-primary-foreground" />
                                ) : (
                                    <AlertTriangle className="w-12 h-12 text-primary-foreground" />
                                )}
                            </div>
                            <h1 className="text-4xl font-bold mb-2">{testResult.percentage}%</h1>
                            <p className="text-xl text-muted-foreground">
                                {testResult.totalScore} / {testResult.maxScore} marks
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Completed in {formatTime(testResult.timeTaken)}
                            </p>
                        </div>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="p-4 text-center">
                            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold">{testResult.questionResults.filter((r) => r.correct).length}</p>
                            <p className="text-sm text-muted-foreground">Correct</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold">
                                {testResult.questionResults.filter((r) => !r.correct && r.score === 0).length}
                            </p>
                            <p className="text-sm text-muted-foreground">Incorrect</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="text-2xl font-bold">{questions.length}</p>
                            <p className="text-sm text-muted-foreground">Questions</p>
                        </Card>
                    </div>

                    {/* Question Review */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Question Review
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questions.map((q, idx) => {
                                const result = testResult.questionResults.find((r) => r.questionId === q.id);
                                const userAnswer = getUserAnswer(q.id);
                                return (
                                    <div key={q.id} className={`p-4 rounded-lg border ${result?.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-medium">Q{idx + 1}. {q.question}</span>
                                            <Badge className={result?.correct ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                                {result?.score}/{result?.maxScore}
                                            </Badge>
                                        </div>
                                        {q.type === "mcq" && q.options && (
                                            <div className="space-y-1 mt-2">
                                                {q.options.map((opt, i) => (
                                                    <div
                                                        key={i}
                                                        className={`px-3 py-1 rounded text-sm ${i === q.correctIndex
                                                            ? "bg-green-500/20 text-green-400"
                                                            : userAnswer === i
                                                                ? "bg-red-500/20 text-red-400"
                                                                : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        {String.fromCharCode(65 + i)}. {opt}
                                                        {i === q.correctIndex && " ✓"}
                                                        {userAnswer === i && i !== q.correctIndex && " ✗"}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.explanation && (
                                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                                                <strong>Explanation:</strong> {q.explanation}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center">
                        <Button onClick={exitTest} variant="outline">
                            Back to Tests
                        </Button>
                        <Button onClick={() => startTest(activeTest)} className="gap-2 bg-gradient-to-r from-primary to-cyan-500">
                            <Play className="w-4 h-4" />
                            Retake Test
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Test Taking View
    if (viewMode === "taking" && activeTest) {
        const currentQuestion = questions[currentQuestionIndex];
        const answeredCount = userAnswers.length;
        const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
                {/* Test Header */}
                <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border p-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={exitTest}>
                                <X className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="font-semibold">{activeTest.title}</h2>
                                <p className="text-sm text-muted-foreground">
                                    Question {currentQuestionIndex + 1} of {questions.length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Progress</p>
                                <p className="font-semibold">{answeredCount}/{questions.length} answered</p>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"}`}>
                                <Timer className="w-5 h-5" />
                                <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-4xl mx-auto mt-3">
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        {isLoadingQuestions ? (
                            <Card className="p-12 text-center">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Generating Questions...</h3>
                                <p className="text-muted-foreground">AI is preparing your personalized mock test</p>
                            </Card>
                        ) : currentQuestion ? (
                            <Card className="overflow-hidden">
                                <div className="bg-gradient-to-r from-primary/10 to-cyan-500/10 px-6 py-4 border-b border-border/50">
                                    <div className="flex items-center justify-between">
                                        <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                                            {currentQuestion.difficulty}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1">
                                            {getTypeIcon(currentQuestion.type)}
                                            {currentQuestion.type.toUpperCase()}
                                        </Badge>
                                        <span className="text-sm font-medium">
                                            {currentQuestion.marks} marks
                                        </span>
                                    </div>
                                </div>
                                <CardContent className="p-6 space-y-6">
                                    <div className="text-lg font-medium leading-relaxed">
                                        <FormattedMessage content={currentQuestion.question} />
                                    </div>

                                    {/* MCQ Options */}
                                    {currentQuestion.type === "mcq" && currentQuestion.options && (
                                        <RadioGroup
                                            value={getUserAnswer(currentQuestion.id)?.toString() || ""}
                                            onValueChange={(v) => handleAnswerChange(currentQuestion.id, parseInt(v))}
                                            className="space-y-3"
                                        >
                                            {currentQuestion.options.map((option, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${getUserAnswer(currentQuestion.id) === idx
                                                        ? "border-primary bg-primary/10"
                                                        : "border-border"
                                                        }`}
                                                    onClick={() => handleAnswerChange(currentQuestion.id, idx)}
                                                >
                                                    <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                                                    <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer">
                                                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    {/* Descriptive Answer */}
                                    {currentQuestion.type === "descriptive" && (
                                        <Textarea
                                            placeholder="Write your detailed answer here..."
                                            value={(getUserAnswer(currentQuestion.id) as string) || ""}
                                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                            className="min-h-[200px]"
                                        />
                                    )}

                                    {/* Coding Answer */}
                                    {currentQuestion.type === "coding" && (
                                        <div className="space-y-4">
                                            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                    <p className="text-sm font-medium text-yellow-500">💡 Hint: {currentQuestion.hints[0]}</p>
                                                </div>
                                            )}
                                            <Textarea
                                                placeholder="Write your code here..."
                                                value={(getUserAnswer(currentQuestion.id) as string) || ""}
                                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                                className="min-h-[300px] font-mono text-sm"
                                            />
                                            {currentQuestion.test_cases && (
                                                <div className="p-3 bg-muted/50 rounded-lg">
                                                    <p className="text-sm font-medium mb-2">Sample Test Cases:</p>
                                                    {currentQuestion.test_cases.slice(0, 2).map((tc, i) => (
                                                        <div key={i} className="text-sm font-mono">
                                                            <span className="text-muted-foreground">Input:</span> {tc.input}
                                                            <span className="mx-2">→</span>
                                                            <span className="text-muted-foreground">Output:</span> {tc.expected_output}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="p-12 text-center">
                                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">No Questions Available</h3>
                                <p className="text-muted-foreground">There was an issue loading questions.</p>
                                <Button onClick={exitTest} className="mt-4">Back to Tests</Button>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Navigation Footer */}
                {!isLoadingQuestions && questions.length > 0 && (
                    <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4">
                        <div className="max-w-4xl mx-auto flex items-center justify-between">
                            {/* Question Navigator */}
                            <div className="flex gap-1 flex-wrap max-w-md">
                                {questions.slice(0, 15).map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`w-8 h-8 rounded text-sm font-medium transition-all ${idx === currentQuestionIndex
                                            ? "bg-primary text-primary-foreground"
                                            : getUserAnswer(q.id) !== undefined
                                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                : "bg-muted hover:bg-muted/80"
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                                {questions.length > 15 && (
                                    <span className="text-sm text-muted-foreground self-center ml-2">+{questions.length - 15} more</span>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </Button>
                                {currentQuestionIndex < questions.length - 1 ? (
                                    <Button
                                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmitTest}
                                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Submit Test
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Test List View
    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
                            <ClipboardList className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Mock Tests</h1>
                            <p className="text-muted-foreground text-sm">Full-length practice tests with AI evaluation</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowCreateForm(true)} className="gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/25">
                        <Plus className="w-4 h-4" />
                        Create Mock Test
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* Create Test Form */}
                {showCreateForm && (
                    <Card className="mb-6 overflow-hidden border-primary/20">
                        <div className="h-1 bg-gradient-to-r from-primary via-cyan-400 to-primary" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Create New Mock Test
                            </CardTitle>
                            <CardDescription>AI will generate questions when you start the test</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Test Title</label>
                                    <Input
                                        placeholder="e.g., DSA Full Practice Test"
                                        value={newTest.title}
                                        onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subject</label>
                                    <Input
                                        placeholder="e.g., Data Structures"
                                        value={newTest.subject}
                                        onChange={(e) => setNewTest({ ...newTest, subject: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Difficulty</label>
                                    <Select value={newTest.difficulty} onValueChange={(v) => setNewTest({ ...newTest, difficulty: v })}>
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
                                    <label className="text-sm font-medium">Duration (minutes)</label>
                                    <Select value={newTest.duration} onValueChange={(v) => setNewTest({ ...newTest, duration: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">30 minutes</SelectItem>
                                            <SelectItem value="60">60 minutes</SelectItem>
                                            <SelectItem value="90">90 minutes</SelectItem>
                                            <SelectItem value="120">120 minutes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Question Types</label>
                                <div className="flex gap-2">
                                    {["mcq", "descriptive", "coding"].map((type) => (
                                        <Button
                                            key={type}
                                            variant={newTest.types.includes(type) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                if (newTest.types.includes(type)) {
                                                    setNewTest({ ...newTest, types: newTest.types.filter((t) => t !== type) });
                                                } else {
                                                    setNewTest({ ...newTest, types: [...newTest.types, type] });
                                                }
                                            }}
                                            className="gap-1"
                                        >
                                            {getTypeIcon(type)}
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={createTest} disabled={creating} className="gap-2">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Create Test
                                </Button>
                                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tests Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tests.map((test) => (
                        <Card key={test.id} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-primary/50 to-cyan-500/50 group-hover:from-primary group-hover:to-cyan-500 transition-colors" />
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{test.title}</h3>
                                        <p className="text-sm text-muted-foreground">{test.subject}</p>
                                    </div>
                                    <Badge className={getDifficultyColor(test.difficulty)}>
                                        {test.difficulty}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        {test.duration_minutes} mins
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Brain className="w-4 h-4" />
                                        {test.question_count} questions
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Trophy className="w-4 h-4" />
                                        {test.total_marks} marks
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {test.attempts} attempts
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-4">
                                    {test.question_types.map((type) => (
                                        <Badge key={type} variant="outline" className="text-xs gap-1">
                                            {getTypeIcon(type)}
                                            {type}
                                        </Badge>
                                    ))}
                                </div>

                                {test.avg_score !== undefined && (
                                    <div className="flex items-center gap-2 mb-4 p-2 bg-primary/5 rounded-lg border border-primary/10">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm">Avg Score: <strong className="text-primary">{test.avg_score}%</strong></span>
                                    </div>
                                )}

                                <Button onClick={() => startTest(test)} className="w-full gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90">
                                    <Play className="w-4 h-4" />
                                    Start Test
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
