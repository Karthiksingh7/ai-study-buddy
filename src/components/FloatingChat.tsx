import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FormattedMessage } from "@/components/FormattedMessage";
import {
    MessageCircle, X, Send, Loader2, Sparkles, Bot, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { chatWithGemini } from "@/lib/gemini";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const conversationHistory = messages.map(m => ({
                role: m.role as "user" | "assistant",
                content: m.content
            }));
            conversationHistory.push({ role: "user", content: userMessage });

            const response = await chatWithGemini(
                conversationHistory,
                "You are a helpful AI study assistant. Give concise, clear explanations."
            );

            setMessages(prev => [...prev, { role: "assistant", content: response }]);
        } catch (error: any) {
            console.error("Chat error:", error);
            toast.error("Failed to get response. Check your API key.");
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const hasApiKey = import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE";

    // Closed state - floating button
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                aria-label="Open AI Study Assistant"
                className={cn(
                    "fixed z-[9999] w-14 h-14 rounded-xl flex items-center justify-center",
                    "bg-primary hover:bg-primary/90 hover:scale-105",
                    "shadow-lg hover:shadow-xl",
                    "transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "cursor-pointer",
                    "right-4 bottom-4 sm:right-6 sm:bottom-6"
                )}
            >
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </button>
        );
    }

    // Open state - chat window
    return (
        <div
            className={cn(
                "fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden",
                "right-2 bottom-2 sm:right-4 sm:bottom-4",
                "w-[calc(100vw-16px)] sm:w-96 h-[70vh] sm:h-[500px] max-h-[calc(100vh-32px)]"
            )}
        >
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                            StudyBuddy AI
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Online
                            </span>
                        </h3>
                        <p className="text-xs text-muted-foreground">Gemini 1.5 Flash</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={clearChat}
                            title="Clear chat"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6">
                        {!hasApiKey ? (
                            <>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
                                </div>
                                <h3 className="font-semibold text-base sm:text-lg mb-2 text-foreground">API Key Required</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-xs">
                                    To use AI chat, add your Gemini API key to the <code className="bg-muted px-1 rounded">.env</code> file.
                                </p>
                                <div className="text-left bg-muted p-3 rounded-lg text-xs w-full max-w-xs">
                                    <p className="font-medium mb-2 text-foreground">Steps:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                        <li>Get key from <span className="text-primary">aistudio.google.com</span></li>
                                        <li>Open <code>.env</code> file</li>
                                        <li>Replace YOUR_GEMINI_API_KEY_HERE</li>
                                        <li>Restart dev server</li>
                                    </ol>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                                </div>
                                <h3 className="font-semibold text-base sm:text-lg mb-2 text-foreground">How can I help you?</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-xs">
                                    I'm your AI study assistant. Ask me anything!
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {["Explain recursion", "Help with calculus", "Study tips"].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                            className="px-3 py-1.5 text-xs bg-muted hover:bg-primary/10 border border-border rounded-md transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((message, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex",
                                    message.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-sm"
                                            : "bg-muted text-foreground rounded-bl-sm"
                                    )}
                                >
                                    {message.role === "assistant" ? (
                                        <FormattedMessage content={message.content} />
                                    ) : (
                                        message.content
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.content === "" && (
                            <div className="flex justify-start">
                                <div className="bg-muted px-4 py-3 rounded-xl rounded-bl-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border bg-muted/20">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={hasApiKey ? "Ask anything..." : "API key required..."}
                        disabled={!hasApiKey || isLoading}
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    />
                    <Button
                        size="icon"
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading || !hasApiKey}
                        className="h-10 w-10 rounded-lg"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
