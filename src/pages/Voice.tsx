import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
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

      recognitionRef.current.onerror = (event) => {
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
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          type: "chat",
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to get response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Speak the response
      if (fullResponse && "speechSynthesis" in window) {
        speakResponse(fullResponse);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI response");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    synthRef.current = new SpeechSynthesisUtterance(text);
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
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
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
              <p className="whitespace-pre-wrap">{response}</p>
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
