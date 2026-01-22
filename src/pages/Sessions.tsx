import { useState, useEffect } from "react";
import { BookOpen, Play, Square, Clock, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface StudySession {
  id: string;
  title: string;
  subject: string | null;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  ended_at: string | null;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [notes, setNotes] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setSessions(data);
      // Check for active session
      const active = data.find((s) => !s.ended_at);
      if (active) {
        setActiveSession(active);
        setNotes(active.notes || "");
        // Calculate elapsed time
        const startTime = new Date(active.created_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    }
  };

  const startSession = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a session title");
      return;
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user?.id,
        title: newTitle.trim(),
        subject: newSubject.trim() || null,
      })
      .select()
      .single();

    if (data && !error) {
      setActiveSession(data);
      setSessions((prev) => [data, ...prev]);
      setElapsedTime(0);
      setShowNewSession(false);
      setNewTitle("");
      setNewSubject("");
      toast.success("Study session started!");
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    const durationMinutes = Math.ceil(elapsedTime / 60);

    const { error } = await supabase
      .from("study_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        notes: notes.trim() || null,
      })
      .eq("id", activeSession.id);

    if (!error) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, ended_at: new Date().toISOString(), duration_minutes: durationMinutes, notes: notes.trim() || null }
            : s
        )
      );
      setActiveSession(null);
      setElapsedTime(0);
      setNotes("");
      toast.success(`Session ended! Duration: ${durationMinutes} minutes`);
    }
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("study_sessions").delete().eq("id", id);
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session deleted");
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Study Sessions
        </h1>
        <p className="text-muted-foreground">Track your study time and progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="text-2xl font-bold text-primary">{sessions.length}</div>
          <div className="text-sm text-muted-foreground">Total Sessions</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-2xl font-bold text-primary">
            {totalHours}h {remainingMinutes}m
          </div>
          <div className="text-sm text-muted-foreground">Total Study Time</div>
        </div>
      </div>

      {/* Active Session */}
      {activeSession ? (
        <div className="glass-card p-6 mb-8 border-primary/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{activeSession.title}</h2>
              {activeSession.subject && (
                <p className="text-sm text-muted-foreground">{activeSession.subject}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-success">In Progress</span>
            </div>
          </div>

          <div className="text-4xl font-mono font-bold text-primary mb-6 text-center">
            {formatTime(elapsedTime)}
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this session..."
            className="bg-secondary border-border mb-4"
            rows={3}
          />

          <Button onClick={endSession} variant="destructive" className="w-full">
            <Square className="w-5 h-5 mr-2" />
            End Session
          </Button>
        </div>
      ) : showNewSession ? (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Start New Session</h2>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Session title (e.g., Math Chapter 5)"
              className="bg-secondary border-border"
            />
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject (optional)"
              className="bg-secondary border-border"
            />
            <div className="flex gap-2">
              <Button onClick={startSession} className="flex-1">
                <Play className="w-5 h-5 mr-2" />
                Start
              </Button>
              <Button variant="outline" onClick={() => setShowNewSession(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowNewSession(true)} className="mb-8">
          <Plus className="w-5 h-5 mr-2" />
          Start New Session
        </Button>
      )}

      {/* Session History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Session History</h2>
        {sessions.filter((s) => s.ended_at).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No completed sessions yet</p>
            <p className="text-sm">Start a study session to track your progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions
              .filter((s) => s.ended_at)
              .map((session) => (
                <div
                  key={session.id}
                  className="glass-card p-4 flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="font-medium">{session.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.subject && `${session.subject} • `}
                      {session.duration_minutes} min •{" "}
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteSession(session.id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
