import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Sparkles, 
  Play, 
  Users, 
  Brain,
  Loader2,
  ExternalLink,
  Clock,
  BookOpen,
  MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VideoRecommendation {
  id: string;
  topic: string;
  title: string;
  channel: string;
  video_id: string;
  thumbnail_url: string;
  description: string;
  duration: string;
}

interface TopicSuggestion {
  explanation: string;
  videos: VideoRecommendation[];
  relatedTopics: string[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Educational YouTube channels for curated recommendations
const CURATED_CHANNELS = [
  "3Blue1Brown",
  "Khan Academy", 
  "MIT OpenCourseWare",
  "Computerphile",
  "The Coding Train",
  "freeCodeCamp",
  "Traversy Media",
  "Abdul Bari",
  "mycodeschool"
];

export default function Learn() {
  const [searchTopic, setSearchTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<string[]>([]);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("ai");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) loadRecentTopics();
  }, [user]);

  const loadRecentTopics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("studied_topics")
      .select("topic")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false })
      .limit(10);

    if (data) {
      setRecentTopics(data.map(t => t.topic));
    }
  };

  const searchAndLearn = async (topic: string = searchTopic) => {
    if (!topic.trim()) return;

    setIsSearching(true);
    setAiExplanation("");
    setVideos([]);
    setRelatedTopics([]);
    setActiveTab("ai");

    try {
      // Get AI explanation with streaming
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: topic }],
          type: "learn",
        }),
      });

      if (!response.ok) throw new Error("Failed to get explanation");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                setAiExplanation(fullContent);
              }
            } catch {}
          }
        }
      }

      // Generate video recommendations (simulated curated list)
      const mockVideos: VideoRecommendation[] = [
        {
          id: crypto.randomUUID(),
          topic: topic,
          title: `${topic} - Complete Tutorial`,
          channel: "Khan Academy",
          video_id: "dQw4w9WgXcQ",
          thumbnail_url: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
          description: `Learn ${topic} from scratch with clear explanations`,
          duration: "15:30"
        },
        {
          id: crypto.randomUUID(),
          topic: topic,
          title: `${topic} Explained Visually`,
          channel: "3Blue1Brown",
          video_id: "aircAruvnKk",
          thumbnail_url: `https://img.youtube.com/vi/aircAruvnKk/mqdefault.jpg`,
          description: `Visual intuition for ${topic} concepts`,
          duration: "18:45"
        },
        {
          id: crypto.randomUUID(),
          topic: topic,
          title: `${topic} for Beginners`,
          channel: "freeCodeCamp",
          video_id: "rfscVS0vtbw",
          thumbnail_url: `https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg`,
          description: `Beginner-friendly introduction to ${topic}`,
          duration: "22:10"
        }
      ];
      setVideos(mockVideos);

      // Generate related topics
      setRelatedTopics([
        `${topic} applications`,
        `${topic} examples`,
        `Advanced ${topic}`,
        `${topic} vs alternatives`,
        `${topic} best practices`
      ]);

      // Track topic
      if (user) {
        const { data: existing } = await supabase
          .from("studied_topics")
          .select("id, study_count")
          .eq("user_id", user.id)
          .eq("topic", topic)
          .maybeSingle();

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
            .insert({ user_id: user.id, topic, source: "learn" });
        }
      }

    } catch (error: any) {
      toast.error(error.message || "Failed to search topic");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchAndLearn();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Smart Learning
        </h1>
        <p className="text-sm text-muted-foreground">
          Search any topic - get AI explanations, videos, and community discussions
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to learn? (e.g., Binary Search Trees)"
              className="pl-10"
            />
          </div>
          <Button onClick={() => searchAndLearn()} disabled={isSearching || !searchTopic.trim()}>
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Learn"}
          </Button>
        </div>

        {/* Recent Topics */}
        {recentTopics.length > 0 && !aiExplanation && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {recentTopics.slice(0, 5).map((topic) => (
              <Badge 
                key={topic} 
                variant="secondary" 
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => {
                  setSearchTopic(topic);
                  searchAndLearn(topic);
                }}
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {(aiExplanation || isSearching) && (
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-4 pt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Explanation
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-2">
                  <Play className="w-4 h-4" />
                  Videos ({videos.length})
                </TabsTrigger>
                <TabsTrigger value="community" className="gap-2">
                  <Users className="w-4 h-4" />
                  Discussions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ai" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full p-4">
                {isSearching && !aiExplanation ? (
                  <div className="flex items-center gap-3 py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Getting AI explanation...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-primary" />
                          AI Explanation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap leading-relaxed">{aiExplanation}</p>
                      </CardContent>
                    </Card>

                    {relatedTopics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Related Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {relatedTopics.map((topic) => (
                            <Badge
                              key={topic}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/10"
                              onClick={() => {
                                setSearchTopic(topic);
                                searchAndLearn(topic);
                              }}
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/quiz?topic=${encodeURIComponent(searchTopic)}`)}
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Take a Quiz
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/flashcards?topic=${encodeURIComponent(searchTopic)}`)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Flashcards
                      </Button>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="videos" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full p-4">
                <div className="grid gap-4">
                  <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
                    <Sparkles className="w-4 h-4 inline mr-2 text-primary" />
                    AI recommends watching these in order for best understanding
                  </div>
                  
                  {videos.map((video, index) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="relative w-48 flex-shrink-0">
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {video.duration}
                          </div>
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                            #{index + 1}
                          </div>
                        </div>
                        <CardContent className="flex-1 p-4">
                          <h3 className="font-semibold mb-1 line-clamp-2">{video.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{video.channel}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {video.description}
                          </p>
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={`https://www.youtube.com/watch?v=${video.video_id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Play className="w-3 h-3 mr-2" />
                              Watch Video
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="community" className="flex-1 overflow-hidden mt-0">
              <div className="h-full flex items-center justify-center p-8">
                <Card className="max-w-md text-center">
                  <CardContent className="pt-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Join the Discussion</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect with other students studying "{searchTopic}"
                      </p>
                      <Button onClick={() => navigate("/community")}>
                        <Users className="w-4 h-4 mr-2" />
                        Go to Community
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!aiExplanation && !isSearching && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Smart Learning Flow</h2>
            <p className="text-muted-foreground mb-6">
              Enter any topic to get a complete learning experience: AI explanations, 
              curated video lectures, and community discussions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Binary Search", "Quick Sort", "Database Normalization", "TCP/IP"].map((topic) => (
                <Badge 
                  key={topic}
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    setSearchTopic(topic);
                    searchAndLearn(topic);
                  }}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
