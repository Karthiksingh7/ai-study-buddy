import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedMessage } from "@/components/FormattedMessage";
import { toast } from "sonner";
import { chatWithGemini } from "@/lib/gemini";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);

        if (result.isFinal) {
          handleSendToAI(transcriptText);
          setIsListening(false);
          recognitionRef.current?.stop();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast.error("Voice recognition error. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setResponse("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendToAI = async (text: string) => {
    setIsProcessing(true);
    try {
      const systemPrompt = `You are StudyBuddy Voice Assistant. Give clear, concise answers suitable for being read aloud. Keep responses under 200 words. Use simple language.`;

      const result = await chatWithGemini(
        [{ role: "user", content: text }],
        systemPrompt,
        { temperature: 0.7, maxOutputTokens: 1024 }
      );

      setResponse(result);

      // Save voice interaction to database
      if (user) {
        try {
          // Save user question
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            role: "user",
            content: text,
            message_type: "voice",
          });
          // Save AI response
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            role: "assistant",
            content: result,
            message_type: "voice",
          });
          // Track as studied topic
          const words = text.split(" ");
          if (words.length >= 2) {
            const potentialTopic = words.slice(0, 5).join(" ").replace(/[?!.,]/g, "");
            if (potentialTopic.length > 5) {
              const { data: existing } = await supabase
                .from("studied_topics")
                .select("id, study_count")
                .eq("user_id", user.id)
                .eq("topic", potentialTopic)
                .maybeSingle();
              if (existing) {
                await supabase.from("studied_topics").update({
                  study_count: (existing.study_count || 0) + 1,
                  last_studied_at: new Date().toISOString()
                }).eq("id", existing.id);
              } else {
                await supabase.from("studied_topics").insert({
                  user_id: user.id, topic: potentialTopic, source: "voice"
                });
              }
            }
          }
        } catch (dbErr) {
          console.warn("Could not save voice interaction:", dbErr);
        }
      }

      // Speak the response
      if (result && "speechSynthesis" in window) {
        speakResponse(result);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI response");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    // Strip markdown formatting for speech
    const cleanText = text
      .replace(/[#*_`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, ". ");
    synthRef.current = new SpeechSynthesisUtterance(cleanText);
    synthRef.current.rate = 0.9;
    synthRef.current.pitch = 1;

    synthRef.current.onstart = () => setIsSpeaking(true);
    synthRef.current.onend = () => setIsSpeaking(false);
    synthRef.current.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(synthRef.current);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mic className="w-6 h-6 text-primary" />
          Voice Buddy
        </h1>
        <p className="text-muted-foreground">Hands-free study assistant</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Voice button */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
            ? "bg-destructive pulse-record glow-effect"
            : "bg-primary hover:bg-primary/90"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
          ) : isListening ? (
            <MicOff className="w-12 h-12 text-destructive-foreground" />
          ) : (
            <Mic className="w-12 h-12 text-primary-foreground" />
          )}
        </button>

        <p className="mt-6 text-muted-foreground">
          {isProcessing
            ? "Processing your question..."
            : isListening
              ? "Listening... Speak now"
              : "Tap to start speaking"}
        </p>

        {/* Transcript */}
        {transcript && (
          <div className="mt-8 w-full max-w-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">You said:</h3>
            <div className="glass-card p-4">
              <p>{transcript}</p>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="mt-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">StudyBuddy says:</h3>
              {isSpeaking && (
                <Button variant="ghost" size="sm" onClick={stopSpeaking}>
                  <Volume2 className="w-4 h-4 mr-1 animate-pulse" />
                  Stop
                </Button>
              )}
            </div>
            <div className="glass-card p-4">
              <FormattedMessage content={response} />
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>💡 Tip: Ask clear, specific questions for better responses</p>
      </div>
    </div>
  );
}
