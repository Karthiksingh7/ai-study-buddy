import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  MessageSquare,
  Send,
  ArrowLeft,
  Sparkles,
  Code,
  Calculator,
  Cpu,
  Database,
  Network,
  Globe,
  Brain,
  BookOpen,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  name: string;
  description: string;
  subject: string;
  icon: string;
  member_count: number;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  is_ai_response: boolean;
  created_at: string;
  user_name?: string;
}

const iconMap: Record<string, any> = {
  code: Code,
  calculator: Calculator,
  cpu: Cpu,
  database: Database,
  network: Network,
  globe: Globe,
  brain: Brain,
  book: BookOpen,
};

import { chatWithGemini } from "@/lib/gemini";

export default function Community() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup && user) {
      checkMembership();
      loadMessages();
      subscribeToMessages();
    }
    return () => {
      supabase.channel('discussion-messages').unsubscribe();
    };
  }, [selectedGroup, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from("discussion_groups")
      .select("*")
      .order("member_count", { ascending: false });

    if (data && !error) {
      setGroups(data);
    }
  };

  const checkMembership = async () => {
    if (!selectedGroup || !user) return;

    const { data } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("group_id", selectedGroup.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsMember(!!data);
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("discussion_messages")
      .select("*")
      .eq("group_id", selectedGroup.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data && !error) {
      // Fetch user profiles for messages
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      setMessages(data.map(m => ({
        ...m,
        user_name: m.is_ai_response ? "AI Assistant" : (profileMap.get(m.user_id) || "Student")
      })));
    }
    setIsLoading(false);
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel('discussion-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_messages',
          filter: `group_id=eq.${selectedGroup.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Get user profile
          if (!newMsg.is_ai_response) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", newMsg.user_id)
              .maybeSingle();
            newMsg.user_name = profile?.display_name || "Student";
          } else {
            newMsg.user_name = "AI Assistant";
          }

          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();
  };

  const joinGroup = async () => {
    if (!selectedGroup || !user) return;

    const { error } = await supabase
      .from("group_memberships")
      .insert({ group_id: selectedGroup.id, user_id: user.id });

    if (error) {
      toast.error("Failed to join group");
    } else {
      setIsMember(true);
      toast.success(`Joined ${selectedGroup.name}!`);
      loadMessages();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !user || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Send user message
    const { error } = await supabase
      .from("discussion_messages")
      .insert({
        group_id: selectedGroup.id,
        user_id: user.id,
        content: messageContent,
        is_ai_response: false
      });

    if (error) {
      toast.error("Failed to send message");
      setNewMessage(messageContent);
      setIsSending(false);
      return;
    }

    // Check if AI should respond (mention @ai or ask a question)
    if (messageContent.toLowerCase().includes("@ai") || messageContent.endsWith("?")) {
      try {
        const aiContent = await chatWithGemini(
          [{ role: "user", content: messageContent }],
          `You are a helpful AI study assistant in a student discussion group called "${selectedGroup.name}" focused on ${selectedGroup.subject}. Topic: ${selectedGroup.description}. Give concise, helpful answers.`
        );

        if (aiContent) {
          await supabase
            .from("discussion_messages")
            .insert({
              group_id: selectedGroup.id,
              user_id: user.id,
              content: aiContent,
              is_ai_response: true
            });
        }
      } catch (err) {
        console.error("AI response error:", err);
      }
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || BookOpen;
    return Icon;
  };

  if (selectedGroup) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              {(() => {
                const Icon = getIcon(selectedGroup.icon);
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
            </div>
            <div>
              <h1 className="font-semibold">{selectedGroup.name}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedGroup.member_count} members
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {selectedGroup.subject}
          </Badge>
        </div>

        {/* Messages */}
        {!isMember ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-md text-center">
              <CardHeader>
                <CardTitle>Join this group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {selectedGroup.description}
                </p>
                <Button onClick={joinGroup} className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Join Group
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2">Tip: Type @ai to get AI assistance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.user_id === user?.id && !msg.is_ai_response && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className={cn(
                          msg.is_ai_response && "bg-primary text-primary-foreground"
                        )}>
                          {msg.is_ai_response ? (
                            <Sparkles className="w-4 h-4" />
                          ) : (
                            msg.user_name?.[0]?.toUpperCase() || "S"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "flex-1 max-w-[75%]",
                        msg.user_id === user?.id && !msg.is_ai_response && "text-right"
                      )}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {msg.user_name}
                        </div>
                        <div className={cn(
                          "inline-block p-3 rounded-lg",
                          msg.is_ai_response
                            ? "bg-primary/10 border border-primary/20"
                            : msg.user_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                        )}>
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (use @ai for AI help)"
                  className="flex-1"
                  disabled={isSending}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Study Community
        </h1>
        <p className="text-sm text-muted-foreground">
          Join subject groups, discuss with peers, get AI help
        </p>
      </div>

      {/* Groups Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const Icon = getIcon(group.icon);
            return (
              <Card
                key={group.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedGroup(group)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        <Badge variant="outline" className="flex-shrink-0">
                          {group.subject}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {group.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {group.member_count} members
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
