import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FormattedMessage } from "@/components/FormattedMessage";
import {
    FileText, Upload, Loader2, Sparkles, BookOpen, Brain, FileQuestion, Download,
    Trash2, Search, FolderOpen, GraduationCap, Presentation, FileType,
    Zap, Copy, ChevronRight, Clock, CheckCircle2, X, PenTool, Lightbulb,
    FileDown, Star, Award, Target, Layers, LayoutTemplate, FileOutput
} from "lucide-react";
import { cn } from "@/lib/utils";

import { streamChatWithGemini, streamChatWithGeminiFile } from "@/lib/gemini";

interface Document {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    created_at: string;
    content?: string;
    fileBase64?: string;
    fileMimeType?: string;
    summary?: string;
    notes?: string;
    flashcards_generated: number;
    questions_generated: number;
}

interface StudyNote {
    id: string;
    topic: string;
    subject: string;
    content: string;
    created_at: string;
    type: "short" | "detailed" | "ppt" | "analysis";
}

// Expert study topics by category
const STUDY_CATEGORIES = [
    {
        category: "Computer Science",
        topics: [
            { topic: "Data Structures & Algorithms", icon: "🗃️" },
            { topic: "Operating Systems", icon: "💻" },
            { topic: "Database Management Systems", icon: "🗄️" },
            { topic: "Computer Networks", icon: "🌐" },
            { topic: "Software Engineering", icon: "⚙️" },
        ]
    },
    {
        category: "AI & Machine Learning",
        topics: [
            { topic: "Neural Networks & Deep Learning", icon: "🧠" },
            { topic: "Natural Language Processing", icon: "💬" },
            { topic: "Computer Vision", icon: "👁️" },
            { topic: "Reinforcement Learning", icon: "🎮" },
        ]
    },
    {
        category: "Mathematics",
        topics: [
            { topic: "Calculus & Differential Equations", icon: "📐" },
            { topic: "Linear Algebra", icon: "📊" },
            { topic: "Probability & Statistics", icon: "🎲" },
            { topic: "Discrete Mathematics", icon: "🔢" },
        ]
    },
    {
        category: "Science",
        topics: [
            { topic: "Physics - Mechanics & Thermodynamics", icon: "⚡" },
            { topic: "Organic Chemistry", icon: "🧪" },
            { topic: "Molecular Biology", icon: "🧬" },
        ]
    }
];

export default function Documents() {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("analyze");
    const [documents, setDocuments] = useState<Document[]>([]);
    const [studyNotes, setStudyNotes] = useState<StudyNote[]>([]);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [topicInput, setTopicInput] = useState("");
    const [textToAnalyze, setTextToAnalyze] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({ title: "", content: "", type: "" });
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Helper to read a file as base64
    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data URL prefix (e.g. "data:application/pdf;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Get MIME type for Gemini API
    const getFileMimeType = (file: File): string => {
        if (file.type) return file.type;
        const ext = file.name.split('.').pop()?.toLowerCase();
        const mimeMap: Record<string, string> = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'md': 'text/markdown',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return mimeMap[ext || ''] || 'application/octet-stream';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Limit file size to 20MB for Gemini inline data
        if (file.size > 20 * 1024 * 1024) {
            toast.error("File is too large. Maximum size is 20MB.");
            return;
        }

        setUploading(true);

        try {
            let content = "";
            let fileBase64 = "";
            const fileMimeType = getFileMimeType(file);

            if (file.type === "text/plain" || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                content = await file.text();
            }

            // Read all files as base64 for Gemini multimodal analysis
            fileBase64 = await readFileAsBase64(file);

            const newDoc: Document = {
                id: crypto.randomUUID(),
                filename: file.name,
                file_type: file.name.split('.').pop() || 'unknown',
                file_size: file.size,
                created_at: new Date().toISOString(),
                content,
                fileBase64,
                fileMimeType,
                flashcards_generated: 0,
                questions_generated: 0
            };

            setDocuments(prev => [newDoc, ...prev]);
            toast.success("Document uploaded! Ready for AI analysis.");
        } catch (error) {
            toast.error("Failed to upload document");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Expert AI generation with specialized prompts
    const generateExpertContent = async (prompt: string, systemContext: string, doc?: Document) => {
        setIsGenerating(true);
        setGeneratedContent("");

        try {
            let content = "";

            // Use multimodal API if we have base64 file data (PDF, etc.)
            if (doc?.fileBase64 && doc?.fileMimeType) {
                await streamChatWithGeminiFile(
                    prompt,
                    doc.fileBase64,
                    doc.fileMimeType,
                    systemContext,
                    (_chunk, fullText) => {
                        content = fullText;
                        setGeneratedContent(fullText);
                    }
                );
            } else {
                await streamChatWithGemini(
                    [{ role: "user", content: prompt }],
                    systemContext,
                    (_chunk, fullText) => {
                        content = fullText;
                        setGeneratedContent(fullText);
                    }
                );
            }

            return content;
        } catch (error: any) {
            toast.error("Failed to generate. Please try again.");
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate expert short notes
    const generateShortNotes = async (topic: string) => {
        const systemPrompt = `You are an expert academic tutor and content creator specializing in creating concise, exam-focused study materials. Your notes are known for:
- Crystal clear explanations
- Perfect organization
- Highlighting what matters for exams
- Including memory tricks and mnemonics
- Being visually structured for quick revision`;

        const userPrompt = `Create EXPERT SHORT NOTES on "${topic}" that a student can use for quick revision before exams.

FORMAT REQUIREMENTS:
## ${topic} - Quick Revision Notes

### 🎯 Key Concepts (One-liners)
- Concept 1: Brief definition
- Concept 2: Brief definition
(5-7 most important concepts)

### 📝 Important Points
• Point with **key term** highlighted
• Include formulas in \`code blocks\`
(8-10 points)

### 🧠 Memory Tricks
- Mnemonics or acronyms to remember key concepts

### ⚡ Quick Formulas/Rules
\`\`\`
Formula 1: explanation
Formula 2: explanation
\`\`\`

### ❓ Common Exam Questions
1. Frequently asked question type 1
2. Frequently asked question type 2

### ✅ Summary (5 Lines)
Summarize everything in 5 bullet points.

Make it comprehensive yet concise. Use emojis for visual appeal.`;

        const content = await generateExpertContent(userPrompt, systemPrompt);
        if (content) {
            const newNote: StudyNote = {
                id: crypto.randomUUID(), topic, subject: "Study Notes",
                content, created_at: new Date().toISOString(), type: "short"
            };
            setStudyNotes(prev => [newNote, ...prev]);
            toast.success("Expert short notes generated!");
        }
    };

    // Generate detailed study notes
    const generateDetailedNotes = async (topic: string) => {
        const systemPrompt = `You are a university professor creating comprehensive lecture notes. Your notes are:
- Thorough and academically rigorous
- Include real-world examples
- Cover edge cases and exceptions
- Suitable for deep understanding`;

        const userPrompt = `Create DETAILED STUDY NOTES on "${topic}" for comprehensive understanding.

STRUCTURE:
# ${topic} - Comprehensive Study Guide

## 1. Introduction & Overview
- What is it and why is it important?
- Historical context (if relevant)
- Prerequisites

## 2. Core Concepts
### 2.1 [First Major Concept]
- Detailed explanation
- Examples
- Visual representation (describe)

### 2.2 [Second Major Concept]
(Continue for all major concepts)

## 3. Important Formulas/Theorems
| Name | Formula | Usage |
|------|---------|-------|
| ... | ... | ... |

## 4. Worked Examples
**Example 1:** [Problem]
**Solution:** Step-by-step solution

## 5. Common Mistakes to Avoid
- Mistake 1 and how to avoid it
- Mistake 2 and how to avoid it

## 6. Practice Problems
1. Easy level problem
2. Medium level problem
3. Hard level problem

## 7. Quick Reference Summary
Key takeaways in bullet points

## 8. Further Reading
- Related topics to explore

Be thorough, clear, and academically precise.`;

        const content = await generateExpertContent(userPrompt, systemPrompt);
        if (content) {
            const newNote: StudyNote = {
                id: crypto.randomUUID(), topic, subject: "Detailed Notes",
                content, created_at: new Date().toISOString(), type: "detailed"
            };
            setStudyNotes(prev => [newNote, ...prev]);
            toast.success("Comprehensive notes generated!");
        }
    };

    // Generate PPT outline
    const generatePPTOutline = async (topic: string) => {
        const systemPrompt = `You are an expert presentation designer who creates engaging, professional slide decks for academic and corporate audiences.`;

        const userPrompt = `Create a PROFESSIONAL POWERPOINT PRESENTATION OUTLINE on "${topic}".

FORMAT AS SLIDES:

---
## 📊 Slide 1: Title Slide
**${topic}**
- Subtitle: A Comprehensive Overview
- Presented by: [Student Name]
- Date: [Current Date]

---
## 📊 Slide 2: Learning Objectives
By the end of this presentation, you will:
• Objective 1
• Objective 2
• Objective 3

---
## 📊 Slide 3: Introduction
• What is ${topic}?
• Why is it important?
• Real-world relevance

**Speaker Notes:** Start with an engaging question or statistic

---
## 📊 Slide 4-8: Main Content Slides
[Create 5 content slides with:]
• Clear headings
• 3-4 bullet points each
• Suggested visuals/diagrams
• Speaker notes

---
## 📊 Slide 9: Key Takeaways
✅ Takeaway 1
✅ Takeaway 2
✅ Takeaway 3

---
## 📊 Slide 10: Quiz/Discussion
❓ Question 1 for audience
❓ Question 2 for discussion

---
## 📊 Slide 11: Summary & Conclusion
• Recap main points
• Call to action or next steps

---
## 📊 Slide 12: References & Resources
• Source 1
• Source 2
• Further reading

Create engaging, professional content suitable for a 15-20 minute presentation.`;

        const content = await generateExpertContent(userPrompt, systemPrompt);
        if (content) {
            const newNote: StudyNote = {
                id: crypto.randomUUID(), topic, subject: "Presentation",
                content, created_at: new Date().toISOString(), type: "ppt"
            };
            setStudyNotes(prev => [newNote, ...prev]);
            toast.success("PPT outline generated!");
        }
    };

    // Analyze document with AI
    const analyzeDocument = async (doc: Document) => {
        setProcessing(`${doc.id}-analyze`);

        const systemPrompt = `You are an expert document analyst. Provide thorough, insightful analysis of academic documents. Carefully read and analyze the full document content provided.`;

        const userPrompt = `Analyze this document: "${doc.filename}"
${doc.content ? `\nContent:\n${doc.content.slice(0, 8000)}` : '\nThe document file is attached above. Read and analyze its full content.'}

Provide:
## 📄 Document Analysis

### 📌 Document Overview
- Type and purpose
- Target audience
- Key themes

### 🎯 Main Topics Covered
1. Topic 1 with brief description
2. Topic 2 with brief description
(List all major topics)

### 💡 Key Insights
- Most important takeaway 1
- Most important takeaway 2
- Most important takeaway 3

### 📝 Summary (200 words)
Comprehensive summary of the document

### 🎓 Study Recommendations
- What to focus on for exams
- Related topics to explore
- Suggested practice areas

### ⚠️ Important Notes
Any warnings, prerequisites, or special considerations`;

        const content = await generateExpertContent(userPrompt, systemPrompt, doc);
        if (content) {
            setDocuments(prev => prev.map(d =>
                d.id === doc.id ? { ...d, summary: content.slice(0, 500) + "..." } : d
            ));
            setModalContent({ title: `Analysis: ${doc.filename}`, content, type: "analysis" });
            setShowModal(true);
        }
        setProcessing(null);
    };

    // Generate notes from document
    const generateNotesFromDoc = async (doc: Document) => {
        setProcessing(`${doc.id}-notes`);

        const systemPrompt = `You are an expert note-taker who converts documents into perfect study notes. Carefully read and extract key information from the full document content provided.`;

        const userPrompt = `Convert "${doc.filename}" into SHORT REVISION NOTES.
${doc.content ? `\nContent:\n${doc.content.slice(0, 8000)}` : '\nThe document file is attached above. Read its full content and create comprehensive notes from it.'}

Create notes following this format:
## 📚 ${doc.filename} - Study Notes

### 🎯 Key Concepts
• Concept 1: One-line explanation
• Concept 2: One-line explanation
(All important concepts)

### 📝 Important Points
1. **Point 1** - Details
2. **Point 2** - Details
(10-15 key points)

### 📐 Formulas & Definitions
\`\`\`
Term 1: Definition
Formula: Expression
\`\`\`

### 💡 Tips & Tricks
- Memory trick 1
- Common mistake to avoid

### ✅ Quick Summary
5-line summary for last-minute revision`;

        const content = await generateExpertContent(userPrompt, systemPrompt, doc);
        if (content) {
            const newNote: StudyNote = {
                id: crypto.randomUUID(), topic: doc.filename, subject: "Document Notes",
                content, created_at: new Date().toISOString(), type: "short"
            };
            setStudyNotes(prev => [newNote, ...prev]);
            toast.success("Notes generated from document!");
        }
        setProcessing(null);
    };

    // Summarize pasted text
    const summarizeText = async () => {
        if (!textToAnalyze.trim()) {
            toast.error("Please paste some text to analyze");
            return;
        }

        const systemPrompt = `You are an expert at summarizing and extracting key information from academic content.`;

        const userPrompt = `Analyze and summarize this content:

${textToAnalyze}

Provide:
## 📋 Content Analysis

### 📌 Type of Content
What kind of document/content is this?

### 🎯 Main Topic
The primary subject matter

### 💡 Key Points
• Point 1
• Point 2
• Point 3
(All important points)

### 📝 Concise Summary (100-150 words)
Clear, structured summary

### 🎓 Key Takeaways
1. Most important takeaway
2. Second most important
3. Third most important

### ❓ Potential Exam Questions
- Question that could be asked from this
- Another possible question`;

        await generateExpertContent(userPrompt, systemPrompt);
    };

    // Download as PDF (using print functionality)
    const downloadAsPDF = (title: string, content: string) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { color: #1a1a2e; border-bottom: 2px solid #4361ee; padding-bottom: 10px; }
            h2 { color: #4361ee; margin-top: 30px; }
            h3 { color: #3f3d56; }
            code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 8px; overflow-x: auto; }
            ul, ol { padding-left: 25px; }
            li { margin: 8px 0; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #4361ee; color: white; }
            .header { text-align: center; margin-bottom: 30px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 ${title}</h1>
            <p style="color:#666">Generated by AI Study Buddy • ${new Date().toLocaleDateString()}</p>
          </div>
          <div>${content.replace(/\n/g, '<br>').replace(/#{1,3}\s/g, '<h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\`(.*?)\`/g, '<code>$1</code>')}</div>
          <div class="footer">
            <p>AI Study Buddy - Your Personal Learning Assistant</p>
            <p>Powered by AI Assistant</p>
          </div>
        </body>
        </html>
      `);
            printWindow.document.close();
            printWindow.print();
        }
        toast.success("PDF ready for download!");
    };

    // Download as Word Document
    const downloadAsWord = (title: string, content: string) => {
        const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Calibri', sans-serif; font-size: 12pt; line-height: 1.6; margin: 40px; }
    h1 { color: #2c3e50; font-size: 24pt; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { color: #3498db; font-size: 18pt; margin-top: 25px; margin-bottom: 15px; }
    h3 { color: #34495e; font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
    p { margin: 10px 0; }
    ul, ol { margin-left: 20px; padding-left: 15px; }
    li { margin: 8px 0; }
    code { background: #ecf0f1; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; }
    pre { background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #bdc3c7; padding: 12px; text-align: left; }
    th { background: #3498db; color: white; font-weight: bold; }
    .slide { page-break-before: always; border: 2px solid #3498db; padding: 30px; margin: 20px 0; border-radius: 10px; }
    .slide-title { color: #2c3e50; font-size: 20pt; margin-bottom: 15px; }
    .footer { margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 10pt; border-top: 1px solid #ecf0f1; padding-top: 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .date { color: #7f8c8d; font-size: 10pt; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📚 ${title}</h1>
    <p class="date">Generated by AI Study Buddy • ${new Date().toLocaleDateString()}</p>
  </div>
  ${content
                .replace(/## 📊 Slide (\d+): (.*)/g, '<div class="slide"><h2 class="slide-title">Slide $1: $2</h2>')
                .replace(/---/g, '</div>')
                .replace(/#{3}\s(.*)/g, '<h3>$1</h3>')
                .replace(/#{2}\s(.*)/g, '<h2>$1</h2>')
                .replace(/#{1}\s(.*)/g, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre>$1</pre>')
                .replace(/\`(.*?)\`/g, '<code>$1</code>')
                .replace(/^[•●]\s(.*)/gm, '<li>$1</li>')
                .replace(/^- (.*)/gm, '<li>$1</li>')
                .replace(/^\d+\.\s(.*)/gm, '<li>$1</li>')
                .replace(/\n/g, '<br>')
            }
  <div class="footer">
    <p><strong>AI Study Buddy</strong> - Your Personal Learning Assistant</p>
    <p>Powered by AI Assistant</p>
  </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Word document downloaded!");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied!");
    };

    const deleteDocument = (docId: string) => {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        toast.success("Document deleted");
    };

    const deleteNote = (noteId: string) => {
        setStudyNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success("Note deleted");
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
            case 'pptx': case 'ppt': return <Presentation className="w-6 h-6 text-orange-500" />;
            case 'doc': case 'docx': return <FileType className="w-6 h-6 text-blue-500" />;
            default: return <FileText className="w-6 h-6 text-gray-500" />;
        }
    };

    const getNoteIcon = (type: string) => {
        switch (type) {
            case 'ppt': return <Presentation className="w-4 h-4" />;
            case 'detailed': return <BookOpen className="w-4 h-4" />;
            case 'analysis': return <Brain className="w-4 h-4" />;
            default: return <PenTool className="w-4 h-4" />;
        }
    };

    const getNoteColor = (type: string) => {
        switch (type) {
            case 'ppt': return "border-orange-500/50 text-orange-500 bg-orange-500/10";
            case 'detailed': return "border-blue-500/50 text-blue-500 bg-blue-500/10";
            case 'analysis': return "border-purple-500/50 text-purple-500 bg-purple-500/10";
            default: return "border-green-500/50 text-green-500 bg-green-500/10";
        }
    };

    const filteredNotes = studyNotes.filter(note =>
        note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-violet-500/5">
            {/* Header */}
            <div className="p-6 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <Brain className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                Expert Document Analysis
                                <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
                                    <Sparkles className="w-3 h-3 mr-1" /> AI Powered
                                </Badge>
                            </h1>
                            <p className="text-muted-foreground text-sm">Generate study notes, PPTs & summaries • Powered by AI Assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1 py-1.5">
                            <Award className="w-4 h-4 text-yellow-500" />
                            {studyNotes.length} Notes Created
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="px-6 pt-4 border-b border-border/30">
                        <TabsList className="bg-muted/50 p-1">
                            <TabsTrigger value="analyze" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                                <FileText className="w-4 h-4" /> Document Analysis
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                                <PenTool className="w-4 h-4" /> Generate Notes
                            </TabsTrigger>
                            <TabsTrigger value="library" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                                <FolderOpen className="w-4 h-4" /> My Library
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 px-6 py-4">
                        {/* Document Analysis Tab */}
                        <TabsContent value="analyze" className="m-0 space-y-6">
                            {/* Upload Section */}
                            <Card className="border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 transition-all cursor-pointer group bg-gradient-to-br from-violet-500/5 to-purple-500/5"
                                onClick={() => fileInputRef.current?.click()}>
                                <CardContent className="p-10 text-center">
                                    <input type="file" ref={fileInputRef} onChange={handleFileSelect}
                                        accept=".pdf,.ppt,.pptx,.txt,.md,.doc,.docx" className="hidden" />
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
                                        <Upload className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Upload Document for AI Analysis</h3>
                                    <p className="text-muted-foreground">PDF, PPT, PPTX, DOC, DOCX, TXT, Markdown</p>
                                    <p className="text-xs text-muted-foreground mt-2">Our AI will analyze, summarize, and generate study materials</p>
                                    {uploading && (
                                        <div className="mt-4 flex items-center justify-center gap-2 text-violet-500">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Processing document...
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Text Analysis */}
                            <Card className="border-violet-500/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                                        Quick Text Analysis & Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea placeholder="Paste any text, notes, or document content for instant AI analysis and summary..."
                                        value={textToAnalyze} onChange={(e) => setTextToAnalyze(e.target.value)}
                                        className="min-h-[150px] resize-none" />
                                    <div className="flex gap-3">
                                        <Button onClick={summarizeText} disabled={!textToAnalyze.trim() || isGenerating}
                                            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90">
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            Analyze & Summarize
                                        </Button>
                                        <Button variant="outline" onClick={() => setTextToAnalyze("")}>Clear</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Generated Content Display */}
                            {generatedContent && activeTab === "analyze" && (
                                <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" /> Analysis Result
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => downloadAsPDF("Document Analysis", generatedContent)} className="gap-1">
                                                <FileDown className="w-4 h-4" /> Download PDF
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent)} className="gap-1">
                                                <Copy className="w-4 h-4" /> Copy
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-sm dark:prose-invert max-w-none max-h-[400px] overflow-auto">
                                            <FormattedMessage content={generatedContent} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Uploaded Documents */}
                            {documents.length > 0 && (
                                <div className="space-y-4">
                                    <h2 className="font-bold text-lg flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-violet-500" /> Uploaded Documents
                                    </h2>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {documents.map((doc) => (
                                            <Card key={doc.id} className="group hover:shadow-xl transition-all hover:border-violet-500/50">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-3 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl">
                                                            {getFileIcon(doc.file_type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold truncate">{doc.filename}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="secondary">{doc.file_type.toUpperCase()}</Badge>
                                                                <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8"
                                                            onClick={() => deleteDocument(doc.id)}>
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                                        <Button variant="outline" size="sm" className="gap-1"
                                                            onClick={() => analyzeDocument(doc)} disabled={processing === `${doc.id}-analyze`}>
                                                            {processing === `${doc.id}-analyze` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                                            Analyze
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="gap-1"
                                                            onClick={() => generateNotesFromDoc(doc)} disabled={processing === `${doc.id}-notes`}>
                                                            {processing === `${doc.id}-notes` ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />}
                                                            Generate Notes
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Generate Notes Tab */}
                        <TabsContent value="notes" className="m-0 space-y-6">
                            {/* Topic Input */}
                            <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GraduationCap className="w-6 h-6 text-violet-500" />
                                        Generate Expert Study Materials
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input placeholder="Enter any topic (e.g., Binary Search Trees, Quantum Mechanics, DBMS Normalization...)"
                                        value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
                                        className="text-lg py-6" />

                                    <div className="grid grid-cols-3 gap-3">
                                        <Button onClick={() => generateShortNotes(topicInput)}
                                            disabled={!topicInput.trim() || isGenerating}
                                            className="gap-2 h-auto py-4 flex-col bg-gradient-to-br from-green-500 to-emerald-500 hover:opacity-90">
                                            <PenTool className="w-6 h-6" />
                                            <span className="font-bold">Short Notes</span>
                                            <span className="text-xs opacity-80">Quick revision</span>
                                        </Button>
                                        <Button onClick={() => generateDetailedNotes(topicInput)}
                                            disabled={!topicInput.trim() || isGenerating}
                                            className="gap-2 h-auto py-4 flex-col bg-gradient-to-br from-blue-500 to-cyan-500 hover:opacity-90">
                                            <BookOpen className="w-6 h-6" />
                                            <span className="font-bold">Detailed Notes</span>
                                            <span className="text-xs opacity-80">Comprehensive</span>
                                        </Button>
                                        <Button onClick={() => generatePPTOutline(topicInput)}
                                            disabled={!topicInput.trim() || isGenerating}
                                            className="gap-2 h-auto py-4 flex-col bg-gradient-to-br from-orange-500 to-red-500 hover:opacity-90">
                                            <Presentation className="w-6 h-6" />
                                            <span className="font-bold">PPT Outline</span>
                                            <span className="text-xs opacity-80">Presentation ready</span>
                                        </Button>
                                    </div>

                                    {isGenerating && (
                                        <div className="flex items-center justify-center gap-3 py-4 text-violet-500">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>AI is generating expert content...</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Access Topics */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Target className="w-5 h-5 text-violet-500" /> Quick Access Topics
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {STUDY_CATEGORIES.map((cat) => (
                                        <Card key={cat.category} className="hover:border-violet-500/30 transition-colors">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-bold text-violet-500">{cat.category}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="flex flex-wrap gap-2">
                                                    {cat.topics.map((item) => (
                                                        <Button key={item.topic} variant="outline" size="sm"
                                                            onClick={() => setTopicInput(item.topic)}
                                                            className="gap-1.5 hover:bg-violet-500/10 hover:border-violet-500">
                                                            <span>{item.icon}</span>
                                                            <span className="text-xs">{item.topic.split(' ').slice(0, 2).join(' ')}</span>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Generated Content */}
                            {generatedContent && activeTab === "notes" && (
                                <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Star className="w-5 h-5 text-yellow-500" /> Generated Content
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => downloadAsPDF(topicInput || "Study Notes", generatedContent)} className="gap-1">
                                                <FileDown className="w-4 h-4" /> Download PDF
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent)} className="gap-1">
                                                <Copy className="w-4 h-4" /> Copy
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-sm dark:prose-invert max-w-none max-h-[500px] overflow-auto">
                                            <FormattedMessage content={generatedContent} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Library Tab */}
                        <TabsContent value="library" className="m-0 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-violet-500" /> Your Study Library
                                </h2>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Search notes..." value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                                </div>
                            </div>

                            {filteredNotes.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="p-12 text-center">
                                        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                                        <h3 className="font-bold mb-2">No notes yet</h3>
                                        <p className="text-muted-foreground mb-4">Generate study notes from the Notes tab</p>
                                        <Button onClick={() => setActiveTab("notes")} className="gap-2">
                                            <PenTool className="w-4 h-4" /> Generate Notes
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredNotes.map((note) => (
                                        <Card key={note.id} className="group hover:shadow-lg transition-all cursor-pointer hover:border-violet-500/50"
                                            onClick={() => { setModalContent({ title: note.topic, content: note.content, type: note.type }); setShowModal(true); }}>
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <Badge className={cn("gap-1", getNoteColor(note.type))}>
                                                        {getNoteIcon(note.type)}
                                                        {note.type === "ppt" ? "PPT" : note.type === "detailed" ? "Detailed" : note.type === "analysis" ? "Analysis" : "Short Notes"}
                                                    </Badge>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}>
                                                        <Trash2 className="w-3 h-3 text-destructive" />
                                                    </Button>
                                                </div>
                                                <h4 className="font-bold truncate">{note.topic}</h4>
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(note.created_at).toLocaleDateString()}
                                                </p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                                    <span className="text-xs text-muted-foreground">{note.subject}</span>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowModal(false)}>
                    <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
                            <div>
                                <Badge className={cn("mb-2", getNoteColor(modalContent.type))}>
                                    {modalContent.type === "ppt" ? "📊 Presentation" : modalContent.type === "detailed" ? "📚 Detailed Notes" : modalContent.type === "analysis" ? "🔍 Analysis" : "📝 Short Notes"}
                                </Badge>
                                <CardTitle>{modalContent.title}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => downloadAsWord(modalContent.title, modalContent.content)} className="gap-1 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20">
                                    <FileType className="w-4 h-4 text-blue-500" /> Word
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => downloadAsPDF(modalContent.title, modalContent.content)} className="gap-1">
                                    <FileDown className="w-4 h-4" /> PDF
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(modalContent.content)}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <ScrollArea className="max-h-[65vh]">
                            <CardContent className="pt-6">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <FormattedMessage content={modalContent.content} />
                                </div>
                            </CardContent>
                        </ScrollArea>
                    </Card>
                </div>
            )}
        </div>
    );
}
