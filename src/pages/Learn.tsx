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
import { FormattedMessage } from "@/components/FormattedMessage";
import {
  Search,
  Sparkles,
  Play,
  Users,
  Brain,
  Loader2,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Youtube,
  GraduationCap,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { streamChatWithGemini, generateJSON } from "@/lib/gemini";

interface VideoRecommendation {
  title: string;
  channel: string;
  searchQuery: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export default function Learn() {
  const [searchTopic, setSearchTopic] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<string[]>([]);
  const [recentTopics, setRecentTopics] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("ai");
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
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
    setIsLoadingVideos(true);

    try {
      // Start AI explanation streaming
      const explanationPromise = streamChatWithGemini(
        [{
          role: "user", content: `Explain the topic: "${topic}". Provide a clear, comprehensive explanation suitable for a student. Include:
- A brief introduction
- Key concepts with examples
- Important formulas or rules (if applicable)
- Real-world applications
- Common mistakes to avoid

Use markdown formatting with headers (##), bold, bullet points, code blocks where relevant, and tables if helpful.` }],
        "You are an expert educator and tutor. Provide clear, well-structured, and engaging explanations of academic topics. Use rich markdown formatting to make the content visually appealing and easy to scan.",
        (_chunk, fullText) => {
          setAiExplanation(fullText);
        }
      );

      // Generate video recommendations in parallel using Gemini
      const videoPromise = generateJSON<{
        videos: { title: string; channel: string; searchQuery: string; description: string; difficulty: string }[];
        relatedTopics: string[];
      }>(
        `For the topic "${topic}", suggest 5 real YouTube video recommendations that a student should watch.

Return ONLY valid JSON (no markdown):
{
  "videos": [
    {
      "title": "Exact descriptive video title a student would search for",
      "channel": "Well-known educational YouTube channel name",
      "searchQuery": "exact YouTube search query to find this video",
      "description": "Brief 1-line description of what the video covers",
      "difficulty": "beginner"
    }
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
}

Rules:
- Use REAL well-known educational channels: Khan Academy, 3Blue1Brown, MIT OpenCourseWare, freeCodeCamp, Traversy Media, Abdul Bari, mycodeschool, Computerphile, The Coding Train, Neso Academy, Gate Smashers, Jenny's Lectures, CrashCourse, Kurzgesagt, Organic Chemistry Tutor, Professor Leonard etc.
- searchQuery should be specific enough to find the exact topic on YouTube (include the channel name in the query)
- difficulty must be one of: beginner, intermediate, advanced
- Order videos from beginner to advanced
- relatedTopics should be specific, searchable academic subtopics related to "${topic}"`,
        "You are an educational content curator who knows YouTube educational channels extremely well.",
        { temperature: 0.5 }
      ).catch(() => null);

      // Wait for both
      await explanationPromise;
      const videoResult = await videoPromise;

      if (videoResult) {
        setVideos(videoResult.videos || []);
        setRelatedTopics(videoResult.relatedTopics || []);
      } else {
        // Fallback related topics
        setRelatedTopics([
          `${topic} examples`,
          `${topic} applications`,
          `Advanced ${topic}`,
        ]);
      }

      // Track topic
      if (user) {
        const { data: existing } = await supabase
          .from("studied_topics")
          .select("id, study_count")
          .eq("user_id", user.id)
          .eq("topic", topic)
          .maybeSingle();

        if (existing) {
          await supabase.from("studied_topics").update({
            study_count: existing.study_count + 1,
            last_studied_at: new Date().toISOString()
          }).eq("id", existing.id);
        } else {
          await supabase.from("studied_topics").insert({
            user_id: user.id, topic, source: "learn"
          });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to search topic");
    } finally {
      setIsSearching(false);
      setIsLoadingVideos(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchAndLearn();
  };

  const getDifficultyColor = (d: string) => {
    if (d === "beginner") return "bg-green-500/10 text-green-500 border-green-500/30";
    if (d === "intermediate") return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    return "bg-red-500/10 text-red-500 border-red-500/30";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Smart Learning</h1>
            <p className="text-sm text-muted-foreground">
              Search any topic — get AI explanations, videos, and community discussions
            </p>
          </div>
        </div>
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

        {recentTopics.length > 0 && !aiExplanation && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {recentTopics.slice(0, 5).map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => { setSearchTopic(topic); searchAndLearn(topic); }}
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

            {/* AI Explanation Tab */}
            <TabsContent value="ai" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full p-4">
                {isSearching && !aiExplanation ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="font-medium">Generating explanation...</p>
                        <p className="text-sm text-muted-foreground">AI is analyzing "{searchTopic}"</p>
                      </div>
                    </div>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* AI Response Card */}
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                      {/* Gradient accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-cyan-500" />

                      <div className="p-5 pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{searchTopic}</h3>
                            <p className="text-xs text-muted-foreground">AI-generated explanation</p>
                          </div>
                        </div>
                        <FormattedMessage content={aiExplanation} />
                      </div>
                    </div>

                    {/* Related Topics */}
                    {relatedTopics.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          Continue Learning
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {relatedTopics.map((topic) => (
                            <Badge
                              key={topic}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors group"
                              onClick={() => { setSearchTopic(topic); searchAndLearn(topic); }}
                            >
                              {topic}
                              <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions */}
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

            {/* Videos Tab */}
            <TabsContent value="videos" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>Curated video recommendations — click to search on YouTube</span>
                  </div>

                  {isLoadingVideos && videos.length === 0 ? (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">Finding the best videos...</span>
                    </div>
                  ) : videos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Youtube className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>No video recommendations available yet.</p>
                      <p className="text-sm">Search a topic to get video suggestions.</p>
                    </div>
                  ) : (
                    videos.map((video, index) => (
                      <a
                        key={index}
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Card className="overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 group cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {/* Number badge */}
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-lg shadow-red-500/20">
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                                      {video.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                      <Youtube className="w-3 h-3 text-red-500" />
                                      {video.channel}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getDifficultyColor(video.difficulty)}`}>
                                    {video.difficulty}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                                  {video.description}
                                </p>
                              </div>

                              <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Community Tab */}
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/20 flex items-center justify-center mx-auto mb-6">
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
                  onClick={() => { setSearchTopic(topic); searchAndLearn(topic); }}
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
