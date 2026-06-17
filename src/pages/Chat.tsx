import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, BookOpen, GraduationCap, Lightbulb, Plus, MessageSquare, Trash2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypingIndicator } from "@/components/TypingIndicator";
import { FormattedMessage } from "@/components/FormattedMessage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview: string;
}

type ChatMode = "standard" | "eli10" | "exam" | "revision";
type Subject = "general" | "math" | "dsa" | "electronics" | "dbms" | "os";

const modeInfo: Record<ChatMode, { label: string; icon: React.ElementType; description: string }> = {
  standard: { label: "Standard", icon: Sparkles, description: "Balanced explanations" },
  eli10: { label: "ELI10", icon: Lightbulb, description: "Explain like I'm 10" },
  exam: { label: "Exam Mode", icon: GraduationCap, description: "Exam-oriented answers" },
  revision: { label: "Revision", icon: BookOpen, description: "Quick summary" },
};

const subjectInfo: Record<Subject, string> = {
  general: "General",
  math: "Mathematics",
  dsa: "DSA",
  electronics: "Electronics",
  dbms: "DBMS",
  os: "Operating Systems",
};

import { streamChatWithGemini } from "@/lib/gemini";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [studiedTopics, setStudiedTopics] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("standard");
  const [subject, setSubject] = useState<Subject>("general");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Only scroll on new messages, not on initial load
  const scrollToBottom = useCallback(() => {
    if (!isInitialLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isInitialLoad]);

  useEffect(() => {
    if (messages.length > 0 && !isInitialLoad) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isInitialLoad]);

  // Load conversations and topics
  useEffect(() => {
    if (user) {
      loadConversations();
      loadStudiedTopics();
    } else {
      // Load guest chats from localStorage
      loadGuestConversations();
    }
  }, [user]);

  // --- Guest (localStorage) persistence helpers ---
  const GUEST_STORAGE_KEY = "studybuddy_guest_chats";

  const loadGuestConversations = () => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!stored) return;
      const allConvs: Record<string, { messages: Message[]; updatedAt: string }> = JSON.parse(stored);
      const convList: Conversation[] = Object.entries(allConvs).map(([id, conv]) => {
        const firstUser = conv.messages.find(m => m.role === "user");
        const lastMsg = conv.messages[conv.messages.length - 1];
        return {
          id,
          title: firstUser?.content.slice(0, 40) + ((firstUser?.content.length || 0) > 40 ? "..." : "") || "Chat",
          created_at: conv.updatedAt,
          updated_at: conv.updatedAt,
          preview: lastMsg?.content.slice(0, 60) || ""
        };
      });
      // Sort by most recent first
      convList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(convList);
      if (convList.length > 0 && !currentConversationId) {
        const convId = convList[0].id;
        setCurrentConversationId(convId);
        setMessages(allConvs[convId].messages);
      }
    } catch (e) {
      console.warn("Failed to load guest chats:", e);
    }
  };

  const saveGuestMessage = (convId: string, message: Message) => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      const allConvs: Record<string, { messages: Message[]; updatedAt: string }> = stored ? JSON.parse(stored) : {};
      if (!allConvs[convId]) {
        allConvs[convId] = { messages: [], updatedAt: new Date().toISOString() };
      }
      allConvs[convId].messages.push(message);
      allConvs[convId].updatedAt = new Date().toISOString();
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(allConvs));
    } catch (e) {
      console.warn("Failed to save guest chat:", e);
    }
  };

  const deleteGuestConversation = (convId: string) => {
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!stored) return;
      const allConvs = JSON.parse(stored);
      delete allConvs[convId];
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(allConvs));
    } catch (e) {
      console.warn("Failed to delete guest chat:", e);
    }
  };

  const loadStudiedTopics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("studied_topics")
      .select("topic")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false })
      .limit(15);

    if (data) {
      setStudiedTopics(data.map(t => t.topic));
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    // Get distinct conversations from chat_messages
    const { data } = await supabase
      .from("chat_messages")
      .select("conversation_id, content, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Group by conversation_id
      const conversationMap = new Map<string, Conversation>();

      data.forEach(msg => {
        const convId = msg.conversation_id || "default";
        if (!conversationMap.has(convId)) {
          // Get title from first user message
          const title = msg.role === "user"
            ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "")
            : "Conversation";

          conversationMap.set(convId, {
            id: convId,
            title: title,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            preview: msg.content.slice(0, 80)
          });
        }
      });

      // Get unique conversations with first user message as title
      const convList: Conversation[] = [];
      for (const [convId] of conversationMap) {
        const convMessages = data.filter(m => (m.conversation_id || "default") === convId);
        const firstUserMsg = convMessages.find(m => m.role === "user");
        const lastMsg = convMessages[0];

        convList.push({
          id: convId,
          title: firstUserMsg?.content.slice(0, 40) + (firstUserMsg && firstUserMsg.content.length > 40 ? "..." : "") || "Chat",
          created_at: convMessages[convMessages.length - 1]?.created_at || new Date().toISOString(),
          updated_at: lastMsg?.created_at || new Date().toISOString(),
          preview: lastMsg?.content.slice(0, 60) || ""
        });
      }

      setConversations(convList);

      // Load most recent conversation if none selected
      if (!currentConversationId && convList.length > 0) {
        loadConversation(convList[0].id);
      }
    }
  };

  const loadConversation = async (conversationId: string) => {
    setIsInitialLoad(true);
    setCurrentConversationId(conversationId);

    if (user) {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (data && !error) {
        setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      }
    } else {
      // Load from localStorage for guests
      try {
        const stored = localStorage.getItem(GUEST_STORAGE_KEY);
        if (stored) {
          const allConvs = JSON.parse(stored);
          if (allConvs[conversationId]) {
            setMessages(allConvs[conversationId].messages);
          }
        }
      } catch (e) {
        console.warn("Failed to load guest conversation:", e);
      }
    }

    // Allow scrolling for new messages after a short delay
    setTimeout(() => setIsInitialLoad(false), 500);
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsInitialLoad(false);
  };

  const deleteConversation = async (conversationId: string) => {
    // Delete from localStorage
    deleteGuestConversation(conversationId);

    // Delete from DB if logged in
    if (user) {
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId);
    }

    setConversations(prev => prev.filter(c => c.id !== conversationId));

    if (currentConversationId === conversationId) {
      startNewConversation();
    }

    toast.success("Conversation deleted");
  };

  const trackTopic = async (topic: string) => {
    if (!user || !topic.trim()) return;

    const { data: existing } = await supabase
      .from("studied_topics")
      .select("id, study_count")
      .eq("user_id", user.id)
      .eq("topic", topic)
      .single();

    if (existing) {
      await supabase
        .from("studied_topics")
        .update({
          study_count: existing.study_count + 1,
          last_studied_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("studied_topics")
        .insert({ user_id: user.id, topic, source: "chat" });
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string, convId?: string) => {
    const conversationId = convId || currentConversationId;
    if (!conversationId) return;

    // Always save to localStorage (guest fallback)
    saveGuestMessage(conversationId, {
      id: crypto.randomUUID(),
      role: role as "user" | "assistant",
      content,
    });

    // Also save to Supabase if logged in
    if (user) {
      try {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          role,
          content,
          message_type: "text",
          conversation_id: conversationId,
        });
      } catch (e) {
        console.warn("Failed to save to DB:", e);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Create a new conversation ID only when the user sends their first message
    let activeConvId = currentConversationId;
    if (!activeConvId) {
      activeConvId = crypto.randomUUID();
      setCurrentConversationId(activeConvId);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsInitialLoad(false);

    // Save user message
    await saveMessage("user", userMessage.content, activeConvId);

    // Update conversation in list
    const convTitle = userMessage.content.slice(0, 40) + (userMessage.content.length > 40 ? "..." : "");
    setConversations(prev => {
      const existing = prev.find(c => c.id === activeConvId);
      if (existing) {
        return prev.map(c => c.id === activeConvId
          ? { ...c, updated_at: new Date().toISOString(), preview: userMessage.content.slice(0, 60) }
          : c
        );
      } else {
        return [{
          id: activeConvId!,
          title: convTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          preview: userMessage.content.slice(0, 60)
        }, ...prev];
      }
    });

    // Extract and track topic
    const words = userMessage.content.split(" ");
    if (words.length >= 2) {
      const potentialTopic = words.slice(0, 4).join(" ").replace(/[?!.,]/g, "");
      if (potentialTopic.length > 5) {
        trackTopic(potentialTopic);
      }
    }

    try {
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const systemPrompt = `You are StudyBuddy, a helpful AI study assistant.
Mode: ${modeInfo[chatMode].description}
${subject !== "general" ? `Subject focus: ${subjectInfo[subject]}` : ""}
${chatMode === "eli10" ? "Explain concepts in very simple terms, like explaining to a 10-year-old. Use analogies and examples." : ""}
${chatMode === "exam" ? "Give exam-oriented, concise answers with key points, formulas, and important definitions." : ""}
${chatMode === "revision" ? "Give quick, bullet-point summaries focusing on key concepts." : ""}
Provide clear, accurate, well-structured answers. Use markdown formatting.`;

      const chatMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantContent = await streamChatWithGemini(
        chatMessages,
        systemPrompt,
        (_chunk, fullText) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
          );
        }
      );

      if (assistantContent) {
        await saveMessage("assistant", assistantContent);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to get AI response. Please try again.", { duration: 5000 });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ maxHeight: '100%' }}>
      {/* Sidebar - Conversation History */}
      <div className={cn(
        "border-r border-border bg-muted/30 flex flex-col transition-all duration-200",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-border">
          <Button onClick={startNewConversation} className="w-full gap-2">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>

        <div className="p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Chat History
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs">Start a new chat to begin</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group p-3 rounded-md cursor-pointer transition-colors hover:bg-muted",
                    currentConversationId === conv.id && "bg-primary/10"
                  )}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{conv.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.preview}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(conv.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card border border-border rounded-r-md p-1 hover:bg-muted transition-colors"
        style={{ left: sidebarOpen ? "256px" : "0" }}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              AI Study Assistant
              <Badge variant="outline" className="text-xs ml-2">AI Assistant</Badge>
            </h1>
            <div className="flex items-center gap-2">
              <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(subjectInfo).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={chatMode} onValueChange={(v) => setChatMode(v as ChatMode)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modeInfo).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <info.icon className="w-3 h-3" />
                        {info.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{modeInfo[chatMode].description}</span>
            {subject !== "general" && (
              <Badge variant="outline" className="text-xs">
                {subjectInfo[subject]}
              </Badge>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-foreground">Welcome to StudyBuddy!</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  I'm your AI study companion. Ask me to explain concepts, help with homework, or give you study tips.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Explain Binary Search", "Help with calculus", "Study tips for exams", "Explain normalization"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-2 rounded-md bg-muted text-sm text-foreground hover:bg-primary/10 transition-colors border border-border"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border border-border"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <FormattedMessage content={message.content} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask StudyBuddy anything..."
              className="min-h-[48px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-[48px] w-[48px]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
