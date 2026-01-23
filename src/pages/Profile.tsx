import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  User, 
  BookOpen, 
  Brain, 
  Sparkles, 
  Trophy, 
  Clock, 
  Target,
  TrendingUp,
  Calendar,
  Loader2,
  Save
} from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  total_study_time: number;
  quizzes_completed: number;
  flashcards_created: number;
}

interface StudiedTopic {
  id: string;
  topic: string;
  source: string;
  study_count: number;
  last_studied_at: string;
}

interface QuizResult {
  id: string;
  topic: string;
  difficulty: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  created_at: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studiedTopics, setStudiedTopics] = useState<StudiedTopic[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStudiedTopics();
      loadQuizResults();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // Profile doesn't exist, create one
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, display_name: user.user_metadata?.name || null })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile);
        setDisplayName(newProfile.display_name || "");
        setBio(newProfile.bio || "");
      }
    } else if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
    }
    setLoading(false);
  };

  const loadStudiedTopics = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("studied_topics")
      .select("*")
      .eq("user_id", user.id)
      .order("last_studied_at", { ascending: false })
      .limit(20);

    if (data) setStudiedTopics(data);
  };

  const loadQuizResults = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("quiz_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setQuizResults(data);
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved!");
      setProfile({ ...profile, display_name: displayName, bio });
      setEditMode(false);
    }
    setSaving(false);
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const getAverageScore = () => {
    if (quizResults.length === 0) return 0;
    const total = quizResults.reduce((sum, r) => sum + Number(r.score_percentage), 0);
    return (total / quizResults.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-6">
        <Avatar className="w-20 h-20">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          {editMode ? (
            <div className="space-y-3">
              <Input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Textarea
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={saveProfile} disabled={saving} size="sm" className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{displayName || "Student"}</h1>
              <p className="text-muted-foreground">{bio || "No bio yet"}</p>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                Edit Profile
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{profile?.quizzes_completed || 0}</div>
            <p className="text-xs text-muted-foreground">Quizzes Taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{getAverageScore()}%</div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{studiedTopics.length}</div>
            <p className="text-xs text-muted-foreground">Topics Studied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{profile?.flashcards_created || 0}</div>
            <p className="text-xs text-muted-foreground">Flashcards</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Studied Topics
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-2">
            <Trophy className="w-4 h-4" />
            Quiz History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Learning Journey</CardTitle>
            </CardHeader>
            <CardContent>
              {studiedTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Start learning to track your topics!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studiedTopics.map((topic) => (
                    <div key={topic.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{topic.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            Studied {topic.study_count} time{topic.study_count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {topic.source}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(topic.last_studied_at), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {quizResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Take a quiz to see your results!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          Number(result.score_percentage) >= 70 ? "bg-green-100 text-green-600" : 
                          Number(result.score_percentage) >= 50 ? "bg-yellow-100 text-yellow-600" : 
                          "bg-red-100 text-red-600"
                        }`}>
                          {Number(result.score_percentage).toFixed(0)}%
                        </div>
                        <div>
                          <p className="font-medium">{result.topic}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {result.difficulty}
                            </Badge>
                            <span>{result.correct_answers}/{result.total_questions} correct</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(result.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}