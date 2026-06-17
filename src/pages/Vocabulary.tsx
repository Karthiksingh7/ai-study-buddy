import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    BookOpen, Volume2, Star, ChevronLeft, ChevronRight, RotateCcw,
    Trophy, Flame, CheckCircle2, XCircle, Sparkles, Globe, Heart, Brain,
    Loader2, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateJSON } from "@/lib/gemini";

// Vocabulary data structure
interface VocabWord {
    id: string;
    word: string;
    pronunciation: string;
    partOfSpeech: string;
    meaning: string;
    example: string;
    synonyms: string[];
    translation?: Record<string, string>;
    difficulty: "easy" | "medium" | "hard";
    learned: boolean;
    favorite: boolean;
}

// Sample vocabulary data for multiple languages
const vocabularyData: Record<string, VocabWord[]> = {
    english: [
        { id: "1", word: "Ephemeral", pronunciation: "/ɪˈfem.ər.əl/", partOfSpeech: "adjective", meaning: "Lasting for a very short time", example: "Fame in the world of social media is often ephemeral.", synonyms: ["fleeting", "transient", "momentary"], difficulty: "hard", learned: false, favorite: false },
        { id: "2", word: "Ubiquitous", pronunciation: "/juːˈbɪk.wɪ.təs/", partOfSpeech: "adjective", meaning: "Present, appearing, or found everywhere", example: "Smartphones have become ubiquitous in modern society.", synonyms: ["omnipresent", "universal", "pervasive"], difficulty: "hard", learned: false, favorite: false },
        { id: "3", word: "Resilient", pronunciation: "/rɪˈzɪl.i.ənt/", partOfSpeech: "adjective", meaning: "Able to recover quickly from difficulties", example: "Children are often more resilient than adults give them credit for.", synonyms: ["tough", "strong", "hardy"], difficulty: "medium", learned: false, favorite: false },
        { id: "4", word: "Pragmatic", pronunciation: "/præɡˈmæt.ɪk/", partOfSpeech: "adjective", meaning: "Dealing with things sensibly and realistically", example: "We need to take a more pragmatic approach to problem-solving.", synonyms: ["practical", "sensible", "realistic"], difficulty: "medium", learned: false, favorite: false },
        { id: "5", word: "Eloquent", pronunciation: "/ˈel.ə.kwənt/", partOfSpeech: "adjective", meaning: "Fluent or persuasive in speaking or writing", example: "She gave an eloquent speech that moved the audience.", synonyms: ["articulate", "expressive", "fluent"], difficulty: "medium", learned: false, favorite: false },
        { id: "6", word: "Serendipity", pronunciation: "/ˌser.ənˈdɪp.ə.ti/", partOfSpeech: "noun", meaning: "The occurrence of events by chance in a happy way", example: "Finding that book was pure serendipity.", synonyms: ["chance", "fortune", "luck"], difficulty: "hard", learned: false, favorite: false },
        { id: "7", word: "Candid", pronunciation: "/ˈkæn.dɪd/", partOfSpeech: "adjective", meaning: "Truthful and straightforward; frank", example: "I appreciate your candid feedback on my work.", synonyms: ["honest", "frank", "straightforward"], difficulty: "easy", learned: false, favorite: false },
        { id: "8", word: "Meticulous", pronunciation: "/məˈtɪk.jə.ləs/", partOfSpeech: "adjective", meaning: "Showing great attention to detail", example: "She is meticulous about keeping accurate records.", synonyms: ["thorough", "careful", "precise"], difficulty: "medium", learned: false, favorite: false },
        { id: "9", word: "Benevolent", pronunciation: "/bəˈnev.əl.ənt/", partOfSpeech: "adjective", meaning: "Well-meaning and kindly", example: "The benevolent donor gave millions to charity.", synonyms: ["kind", "generous", "charitable"], difficulty: "medium", learned: false, favorite: false },
        { id: "10", word: "Verbose", pronunciation: "/vɜːˈbəʊs/", partOfSpeech: "adjective", meaning: "Using more words than necessary", example: "His verbose writing style made the article hard to read.", synonyms: ["wordy", "long-winded", "prolix"], difficulty: "hard", learned: false, favorite: false },
    ],
    spanish: [
        { id: "s1", word: "Mariposa", pronunciation: "/ma.ɾi.ˈpo.sa/", partOfSpeech: "noun", meaning: "Butterfly", example: "La mariposa voló sobre las flores.", synonyms: ["lepidóptero"], translation: { english: "butterfly" }, difficulty: "easy", learned: false, favorite: false },
        { id: "s2", word: "Desarrollo", pronunciation: "/de.sa.ˈro.ʝo/", partOfSpeech: "noun", meaning: "Development", example: "El desarrollo de la tecnología es impresionante.", synonyms: ["evolución", "progreso"], translation: { english: "development" }, difficulty: "medium", learned: false, favorite: false },
        { id: "s3", word: "Amanecer", pronunciation: "/a.ma.ne.ˈθeɾ/", partOfSpeech: "noun/verb", meaning: "Dawn / To dawn", example: "Ver el amanecer es mágico.", synonyms: ["alba", "aurora"], translation: { english: "dawn" }, difficulty: "easy", learned: false, favorite: false },
        { id: "s4", word: "Esperanza", pronunciation: "/es.pe.ˈɾan.θa/", partOfSpeech: "noun", meaning: "Hope", example: "Nunca perdemos la esperanza.", synonyms: ["ilusión", "deseo"], translation: { english: "hope" }, difficulty: "easy", learned: false, favorite: false },
        { id: "s5", word: "Conocimiento", pronunciation: "/ko.no.θi.ˈmjen.to/", partOfSpeech: "noun", meaning: "Knowledge", example: "El conocimiento es poder.", synonyms: ["sabiduría", "saber"], translation: { english: "knowledge" }, difficulty: "medium", learned: false, favorite: false },
    ],
    french: [
        { id: "f1", word: "Papillon", pronunciation: "/pa.pi.jɔ̃/", partOfSpeech: "noun", meaning: "Butterfly", example: "Le papillon vole dans le jardin.", synonyms: ["lépidoptère"], translation: { english: "butterfly" }, difficulty: "easy", learned: false, favorite: false },
        { id: "f2", word: "Développement", pronunciation: "/de.vlɔp.mɑ̃/", partOfSpeech: "noun", meaning: "Development", example: "Le développement durable est important.", synonyms: ["évolution", "progrès"], translation: { english: "development" }, difficulty: "medium", learned: false, favorite: false },
        { id: "f3", word: "Bonheur", pronunciation: "/bɔ.nœʁ/", partOfSpeech: "noun", meaning: "Happiness", example: "Le bonheur est dans les petites choses.", synonyms: ["joie", "félicité"], translation: { english: "happiness" }, difficulty: "easy", learned: false, favorite: false },
        { id: "f4", word: "Connaissance", pronunciation: "/kɔ.nɛ.sɑ̃s/", partOfSpeech: "noun", meaning: "Knowledge", example: "La connaissance ouvre des portes.", synonyms: ["savoir", "sagesse"], translation: { english: "knowledge" }, difficulty: "medium", learned: false, favorite: false },
        { id: "f5", word: "Rêve", pronunciation: "/ʁɛv/", partOfSpeech: "noun", meaning: "Dream", example: "Mon rêve est de voyager.", synonyms: ["songe"], translation: { english: "dream" }, difficulty: "easy", learned: false, favorite: false },
    ],
    german: [
        { id: "g1", word: "Schmetterling", pronunciation: "/ˈʃmɛtɐlɪŋ/", partOfSpeech: "noun", meaning: "Butterfly", example: "Der Schmetterling fliegt im Garten.", synonyms: ["Falter"], translation: { english: "butterfly" }, difficulty: "medium", learned: false, favorite: false },
        { id: "g2", word: "Entwicklung", pronunciation: "/ɛntˈvɪklʊŋ/", partOfSpeech: "noun", meaning: "Development", example: "Die Entwicklung ist beeindruckend.", synonyms: ["Fortschritt"], translation: { english: "development" }, difficulty: "hard", learned: false, favorite: false },
        { id: "g3", word: "Glück", pronunciation: "/ɡlʏk/", partOfSpeech: "noun", meaning: "Happiness/Luck", example: "Ich wünsche dir viel Glück!", synonyms: ["Freude"], translation: { english: "happiness, luck" }, difficulty: "easy", learned: false, favorite: false },
        { id: "g4", word: "Wissen", pronunciation: "/ˈvɪsn̩/", partOfSpeech: "noun", meaning: "Knowledge", example: "Wissen ist Macht.", synonyms: ["Kenntnis"], translation: { english: "knowledge" }, difficulty: "easy", learned: false, favorite: false },
        { id: "g5", word: "Träumen", pronunciation: "/ˈtʁɔʏmən/", partOfSpeech: "verb", meaning: "To dream", example: "Ich träume von einer besseren Welt.", synonyms: [], translation: { english: "to dream" }, difficulty: "easy", learned: false, favorite: false },
    ],
    hindi: [
        { id: "h1", word: "तितली", pronunciation: "/ti.tə.liː/", partOfSpeech: "noun", meaning: "Butterfly", example: "तितली फूलों पर उड़ रही है।", synonyms: [], translation: { english: "butterfly" }, difficulty: "easy", learned: false, favorite: false },
        { id: "h2", word: "विकास", pronunciation: "/vi.kaːs/", partOfSpeech: "noun", meaning: "Development", example: "देश का विकास हो रहा है।", synonyms: ["प्रगति"], translation: { english: "development" }, difficulty: "easy", learned: false, favorite: false },
        { id: "h3", word: "खुशी", pronunciation: "/kʰu.ʃiː/", partOfSpeech: "noun", meaning: "Happiness", example: "खुशी बांटने से बढ़ती है।", synonyms: ["आनंद", "हर्ष"], translation: { english: "happiness" }, difficulty: "easy", learned: false, favorite: false },
        { id: "h4", word: "ज्ञान", pronunciation: "/ɡjaːn/", partOfSpeech: "noun", meaning: "Knowledge", example: "ज्ञान ही शक्ति है।", synonyms: ["विद्या"], translation: { english: "knowledge" }, difficulty: "easy", learned: false, favorite: false },
        { id: "h5", word: "सपना", pronunciation: "/sə.pə.naː/", partOfSpeech: "noun", meaning: "Dream", example: "मेरा सपना है डॉक्टर बनना।", synonyms: ["स्वप्न"], translation: { english: "dream" }, difficulty: "easy", learned: false, favorite: false },
    ],
};

const languages = [
    { code: "english", name: "English", flag: "🇬🇧" },
    { code: "spanish", name: "Spanish", flag: "🇪🇸" },
    { code: "french", name: "French", flag: "🇫🇷" },
    { code: "german", name: "German", flag: "🇩🇪" },
    { code: "hindi", name: "Hindi", flag: "🇮🇳" },
];

export default function Vocabulary() {
    const { user } = useAuth();
    const [selectedLanguage, setSelectedLanguage] = useState("english");
    const [words, setWords] = useState<VocabWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMeaning, setShowMeaning] = useState(false);
    const [streak, setStreak] = useState(0);
    const [wordsLearnedToday, setWordsLearnedToday] = useState(0);
    const [activeTab, setActiveTab] = useState("learn");
    const [quizMode, setQuizMode] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [quizTotal, setQuizTotal] = useState(0);
    const [quizOptions, setQuizOptions] = useState<string[]>([]);
    const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Load vocabulary for selected language
    useEffect(() => {
        const langWords = vocabularyData[selectedLanguage] || [];
        setWords(langWords.map(w => ({ ...w })));
        setCurrentIndex(0);
        setShowMeaning(false);
    }, [selectedLanguage]);

    // Load streak from localStorage
    useEffect(() => {
        const savedStreak = localStorage.getItem("vocab-streak");
        const lastDate = localStorage.getItem("vocab-last-date");
        const today = new Date().toDateString();

        if (lastDate === today && savedStreak) {
            setStreak(parseInt(savedStreak));
        } else if (lastDate && lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate === yesterday.toDateString()) {
                setStreak(parseInt(savedStreak || "0"));
            } else {
                setStreak(0);
            }
        }

        const learnedToday = localStorage.getItem(`vocab-learned-${today}`);
        if (learnedToday) {
            setWordsLearnedToday(parseInt(learnedToday));
        }
    }, []);

    // Generate new vocabulary words using Gemini AI
    const generateNewWords = async () => {
        setIsGenerating(true);
        const langName = languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
        const existingWords = words.map(w => w.word).join(", ");

        try {
            const prompt = `Generate exactly 5 new vocabulary words for learning ${langName}. 
Do NOT include any of these words: ${existingWords || "none"}.

Return a JSON array of objects. Each object must have exactly these fields:
- "word": the vocabulary word in ${langName}
- "pronunciation": IPA pronunciation
- "partOfSpeech": noun, verb, adjective, etc.
- "meaning": clear definition in English
- "example": example sentence using the word in ${langName}
- "synonyms": array of 1-3 synonyms in ${langName}
${selectedLanguage !== "english" ? '- "translation": { "english": "english translation" }' : ''}
- "difficulty": one of "easy", "medium", or "hard"

Mix difficulties. Only return the JSON array, nothing else.`;

            const generated = await generateJSON<any[]>(
                prompt,
                "You are a language learning expert. Generate diverse, useful vocabulary words suitable for students. Return ONLY valid JSON.",
                { temperature: 0.9, maxOutputTokens: 2048 }
            );

            if (!Array.isArray(generated) || generated.length === 0) {
                throw new Error("Invalid response format");
            }

            const newWords: VocabWord[] = generated.map((w, i) => ({
                id: `gen-${Date.now()}-${i}`,
                word: w.word || "",
                pronunciation: w.pronunciation || "",
                partOfSpeech: w.partOfSpeech || "unknown",
                meaning: w.meaning || "",
                example: w.example || "",
                synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
                translation: w.translation,
                difficulty: ["easy", "medium", "hard"].includes(w.difficulty) ? w.difficulty : "medium",
                learned: false,
                favorite: false,
            }));

            setWords(prev => [...prev, ...newWords]);
            setCurrentIndex(words.length); // Jump to the first new word
            setShowMeaning(false);
            toast.success(`Generated ${newWords.length} new ${langName} words! ✨`);
        } catch (error: any) {
            console.error("Failed to generate vocabulary:", error);
            toast.error(error.message || "Failed to generate new words. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const currentWord = words[currentIndex];

    const speakWord = () => {
        if (!currentWord) return;
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = selectedLanguage === "english" ? "en-US" :
            selectedLanguage === "spanish" ? "es-ES" :
                selectedLanguage === "french" ? "fr-FR" :
                    selectedLanguage === "german" ? "de-DE" : "hi-IN";
        speechSynthesis.speak(utterance);
    };

    const nextWord = () => {
        setShowMeaning(false);
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const prevWord = () => {
        setShowMeaning(false);
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    };

    const markAsLearned = () => {
        if (!currentWord || currentWord.learned) return;

        setWords(prev => prev.map(w =>
            w.id === currentWord.id ? { ...w, learned: true } : w
        ));

        const today = new Date().toDateString();
        const newCount = wordsLearnedToday + 1;
        setWordsLearnedToday(newCount);
        localStorage.setItem(`vocab-learned-${today}`, newCount.toString());

        // Update streak
        const newStreak = streak + (wordsLearnedToday === 0 ? 1 : 0);
        setStreak(newStreak);
        localStorage.setItem("vocab-streak", newStreak.toString());
        localStorage.setItem("vocab-last-date", today);

        toast.success("Word marked as learned! 🎉");
        nextWord();
    };

    const toggleFavorite = () => {
        if (!currentWord) return;
        setWords(prev => prev.map(w =>
            w.id === currentWord.id ? { ...w, favorite: !w.favorite } : w
        ));
        toast.success(currentWord.favorite ? "Removed from favorites" : "Added to favorites ⭐");
    };

    const startQuiz = () => {
        setQuizMode(true);
        setQuizScore(0);
        setQuizTotal(0);
        setQuizAnswer(null);
        generateQuizQuestion();
    };

    const generateQuizQuestion = () => {
        if (words.length < 4) {
            toast.error("Need at least 4 words to start quiz");
            return;
        }

        const randomIndex = Math.floor(Math.random() * words.length);
        setCurrentIndex(randomIndex);

        // Generate 4 options including correct answer
        const correctAnswer = words[randomIndex].meaning;
        const wrongAnswers = words
            .filter((_, i) => i !== randomIndex)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(w => w.meaning);

        const options = [...wrongAnswers, correctAnswer].sort(() => Math.random() - 0.5);
        setQuizOptions(options);
        setQuizAnswer(null);
    };

    const handleQuizAnswer = (answer: string) => {
        setQuizAnswer(answer);
        const isCorrect = answer === currentWord?.meaning;
        setQuizTotal(prev => prev + 1);
        if (isCorrect) {
            setQuizScore(prev => prev + 1);
            toast.success("Correct! 🎉");
        } else {
            toast.error(`Wrong! The answer was: ${currentWord?.meaning}`);
        }

        setTimeout(() => {
            generateQuizQuestion();
        }, 1500);
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case "easy": return "bg-green-500/20 text-green-500 border-green-500/30";
            case "medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
            case "hard": return "bg-red-500/20 text-red-500 border-red-500/30";
            default: return "";
        }
    };

    const learnedWords = words.filter(w => w.learned);
    const favoriteWords = words.filter(w => w.favorite);
    const progressPercent = words.length > 0 ? (learnedWords.length / words.length) * 100 : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-border bg-gradient-to-r from-[hsl(var(--gradient-start)/0.08)] via-[hsl(var(--gradient-mid)/0.05)] to-[hsl(var(--gradient-end)/0.08)]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gradient-start)/0.3)]">
                            <BookOpen className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                                Daily Vocabulary
                            </h1>
                            <p className="text-muted-foreground">Learn new words every day</p>
                        </div>
                    </div>

                    {/* Language Selector & Generate Button */}
                    <div className="flex items-center gap-3">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger className="w-[180px]">
                                <Globe className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {languages.map(lang => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        <span className="mr-2">{lang.flag}</span> {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={generateNewWords}
                            disabled={isGenerating}
                            className="gap-2"
                            variant="default"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate New Words
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="font-semibold">{streak}</span>
                        <span className="text-muted-foreground text-sm">day streak</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-semibold">{wordsLearnedToday}</span>
                        <span className="text-muted-foreground text-sm">words today</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                        <Brain className="w-5 h-5 text-purple-500" />
                        <span className="font-semibold">{learnedWords.length}/{words.length}</span>
                        <span className="text-muted-foreground text-sm">mastered</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="learn" className="gap-2">
                            <BookOpen className="w-4 h-4" /> Learn
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2">
                            <Brain className="w-4 h-4" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="favorites" className="gap-2">
                            <Heart className="w-4 h-4" /> Favorites
                        </TabsTrigger>
                    </TabsList>

                    {/* Learn Tab - Flashcard */}
                    <TabsContent value="learn" className="flex items-center justify-center">
                        {currentWord ? (
                            <div className="max-w-lg w-full">
                                <Card className="relative overflow-hidden">
                                    {/* Gradient Border Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gradient-start)/0.1)] to-[hsl(var(--gradient-end)/0.1)] opacity-50" />

                                    <CardHeader className="relative text-center pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge className={getDifficultyColor(currentWord.difficulty)}>
                                                {currentWord.difficulty}
                                            </Badge>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" onClick={speakWord}>
                                                    <Volume2 className="w-5 h-5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={toggleFavorite}>
                                                    <Star className={cn("w-5 h-5", currentWord.favorite && "fill-yellow-500 text-yellow-500")} />
                                                </Button>
                                            </div>
                                        </div>

                                        <CardTitle className="text-4xl font-bold mt-4 bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                                            {currentWord.word}
                                        </CardTitle>
                                        <p className="text-muted-foreground font-mono">{currentWord.pronunciation}</p>
                                        <Badge variant="outline" className="mt-2">{currentWord.partOfSpeech}</Badge>
                                    </CardHeader>

                                    <CardContent className="relative text-center pt-4">
                                        {!showMeaning ? (
                                            <Button onClick={() => setShowMeaning(true)} size="lg" className="w-full">
                                                <Sparkles className="w-4 h-4 mr-2" /> Reveal Meaning
                                            </Button>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="p-4 rounded-lg bg-muted/50">
                                                    <p className="font-semibold text-lg">{currentWord.meaning}</p>
                                                </div>

                                                <div className="text-left p-4 rounded-lg bg-muted/30 border border-border">
                                                    <p className="text-sm text-muted-foreground mb-1">Example:</p>
                                                    <p className="italic">"{currentWord.example}"</p>
                                                </div>

                                                {currentWord.synonyms.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                        <span className="text-sm text-muted-foreground">Synonyms:</span>
                                                        {currentWord.synonyms.map(syn => (
                                                            <Badge key={syn} variant="secondary">{syn}</Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {currentWord.translation?.english && (
                                                    <p className="text-sm text-muted-foreground">
                                                        English: <span className="font-medium text-foreground">{currentWord.translation.english}</span>
                                                    </p>
                                                )}

                                                <div className="flex gap-3 pt-4">
                                                    <Button variant="outline" onClick={nextWord} className="flex-1">
                                                        <RotateCcw className="w-4 h-4 mr-2" /> Review Later
                                                    </Button>
                                                    <Button onClick={markAsLearned} className="flex-1" disabled={currentWord.learned}>
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        {currentWord.learned ? "Learned ✓" : "Mark Learned"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Navigation */}
                                <div className="flex justify-between items-center mt-6">
                                    <Button variant="outline" onClick={prevWord}>
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <span className="text-muted-foreground">
                                        {currentIndex + 1} / {words.length}
                                    </span>
                                    <Button variant="outline" onClick={nextWord}>
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No words available for this language.</p>
                        )}
                    </TabsContent>

                    {/* Quiz Tab */}
                    <TabsContent value="quiz" className="flex items-center justify-center">
                        {!quizMode ? (
                            <Card className="max-w-md w-full text-center p-8">
                                <Brain className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--gradient-start))]" />
                                <CardTitle className="mb-2">Vocabulary Quiz</CardTitle>
                                <CardDescription className="mb-6">Test your knowledge with a quick quiz!</CardDescription>
                                <Button onClick={startQuiz} size="lg">
                                    <Sparkles className="w-4 h-4 mr-2" /> Start Quiz
                                </Button>
                            </Card>
                        ) : currentWord ? (
                            <div className="max-w-lg w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <Badge variant="outline">Score: {quizScore}/{quizTotal}</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => setQuizMode(false)}>
                                        Exit Quiz
                                    </Button>
                                </div>

                                <Card>
                                    <CardHeader className="text-center">
                                        <CardTitle className="text-3xl bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                                            {currentWord.word}
                                        </CardTitle>
                                        <p className="text-muted-foreground">What does this word mean?</p>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {quizOptions.map((option, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left h-auto py-3 px-4",
                                                    quizAnswer === option && option === currentWord.meaning && "bg-green-500/20 border-green-500",
                                                    quizAnswer === option && option !== currentWord.meaning && "bg-red-500/20 border-red-500",
                                                    quizAnswer && option === currentWord.meaning && "bg-green-500/20 border-green-500"
                                                )}
                                                onClick={() => !quizAnswer && handleQuizAnswer(option)}
                                                disabled={!!quizAnswer}
                                            >
                                                {quizAnswer && option === currentWord.meaning && (
                                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                                )}
                                                {quizAnswer === option && option !== currentWord.meaning && (
                                                    <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                                )}
                                                {option}
                                            </Button>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : null}
                    </TabsContent>

                    {/* Favorites Tab */}
                    <TabsContent value="favorites">
                        <ScrollArea className="h-[500px]">
                            {favoriteWords.length > 0 ? (
                                <div className="grid gap-3">
                                    {favoriteWords.map(word => (
                                        <Card key={word.id} className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{word.word}</h3>
                                                    <p className="text-sm text-muted-foreground">{word.meaning}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    setWords(prev => prev.map(w =>
                                                        w.id === word.id ? { ...w, favorite: false } : w
                                                    ));
                                                }}>
                                                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p>No favorite words yet</p>
                                    <p className="text-sm">Star words while learning to save them here</p>
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
