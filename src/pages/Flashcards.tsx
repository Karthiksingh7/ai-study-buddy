import { useState, useEffect } from "react";
import { Sparkles, Plus, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Flashcard {
  id: string;
  topic: string;
  question: string;
  answer: string;
  flipped?: boolean;
}

import { generateJSON } from "@/lib/gemini";

export default function Flashcards() {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadFlashcards();
  }, [user]);

  const loadFlashcards = async () => {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setCards(data.map((c) => ({ ...c, flipped: false })));
    }
  };

  const generateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Create 5 flashcards about: ${topic}

Return ONLY valid JSON array (no markdown):
[
  { "question": "Question text", "answer": "Answer text" }
]

Make questions specific and educational. Answers should be concise but complete.`;

      const flashcardsData = await generateJSON<{ question: string; answer: string }[]>(
        prompt,
        "You are an expert educator. Create clear, educational flashcards.",
        { temperature: 0.7 }
      );

      const cards_arr = Array.isArray(flashcardsData) ? flashcardsData : (flashcardsData as any).flashcards || [];

      // Save to database and update state
      const newCards: Flashcard[] = [];
      for (const card of cards_arr) {
        const { data: inserted, error } = await supabase
          .from("flashcards")
          .insert({
            user_id: user?.id,
            topic: topic.trim(),
            question: card.question,
            answer: card.answer,
          })
          .select()
          .single();

        if (inserted && !error) {
          newCards.push({ ...inserted, flipped: false });
        }
      }

      setCards((prev) => [...newCards, ...prev]);
      setTopic("");
      toast.success(`Generated ${newCards.length} flashcards!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate flashcards");
    } finally {
      setIsGenerating(false);
    }
  };

  const flipCard = (id: string) => {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, flipped: !card.flipped } : card))
    );
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (!error) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Flashcard deleted");
    }
  };

  // Group cards by topic
  const groupedCards = cards.reduce((acc, card) => {
    if (!acc[card.topic]) acc[card.topic] = [];
    acc[card.topic].push(card);
    return acc;
  }, {} as Record<string, Flashcard[]>);

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          AI Flashcards
        </h1>
        <p className="text-muted-foreground">Generate smart flashcards for any topic</p>
      </div>

      {/* Generator */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">Generate New Flashcards</h2>
        <div className="flex gap-3">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic (e.g., French Revolution, Quadratic Equations)"
            className="bg-secondary border-border"
            onKeyDown={(e) => e.key === "Enter" && generateFlashcards()}
          />
          <Button onClick={generateFlashcards} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Flashcards */}
      {Object.keys(groupedCards).length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-medium mb-2">No flashcards yet</h2>
            <p className="text-muted-foreground">
              Enter a topic above to generate AI-powered flashcards
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedCards).map(([topicName, topicCards]) => (
            <div key={topicName}>
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                {topicName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topicCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => flipCard(card.id)}
                    className="glass-card p-6 min-h-[180px] cursor-pointer hover:border-primary/50 transition-all duration-300 relative group"
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(card.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>

                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {card.flipped ? "Answer" : "Question"}
                        </span>
                      </div>
                      <p className="flex-1 text-sm">
                        {card.flipped ? card.answer : card.question}
                      </p>
                      <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
