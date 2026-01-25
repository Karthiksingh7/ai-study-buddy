-- Create discussion groups table
CREATE TABLE public.discussion_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  icon TEXT DEFAULT 'book',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create group memberships table
CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.discussion_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  role TEXT DEFAULT 'member',
  UNIQUE(group_id, user_id)
);

-- Create discussion messages table
CREATE TABLE public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.discussion_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_ai_response BOOLEAN DEFAULT false,
  reply_to UUID REFERENCES public.discussion_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create video recommendations table
CREATE TABLE public.video_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  video_id TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user video history table
CREATE TABLE public.user_video_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.video_recommendations(id) ON DELETE CASCADE NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  watch_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, video_id)
);

-- Create games/breaks tracking table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER,
  duration_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.discussion_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Discussion groups policies (public read, members can interact)
CREATE POLICY "Anyone can view groups" ON public.discussion_groups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON public.discussion_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Group memberships policies
CREATE POLICY "Members can view memberships" ON public.group_memberships
  FOR SELECT USING (true);

CREATE POLICY "Users can join groups" ON public.group_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- Discussion messages policies
CREATE POLICY "Members can view messages" ON public.discussion_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships 
      WHERE group_id = discussion_messages.group_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages" ON public.discussion_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_memberships 
      WHERE group_id = discussion_messages.group_id 
      AND user_id = auth.uid()
    )
  );

-- Video recommendations policies (public read)
CREATE POLICY "Anyone can view videos" ON public.video_recommendations
  FOR SELECT USING (true);

CREATE POLICY "System can insert videos" ON public.video_recommendations
  FOR INSERT WITH CHECK (true);

-- User video history policies
CREATE POLICY "Users can view their video history" ON public.user_video_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track their videos" ON public.user_video_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their video history" ON public.user_video_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Game sessions policies
CREATE POLICY "Users can view their game sessions" ON public.game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create game sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update group member count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussion_groups 
    SET member_count = member_count + 1 
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussion_groups 
    SET member_count = member_count - 1 
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger for member count
CREATE TRIGGER update_member_count_trigger
AFTER INSERT OR DELETE ON public.group_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count();

-- Enable realtime for discussion messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_messages;

-- Insert default study groups
INSERT INTO public.discussion_groups (name, description, subject, icon) VALUES
('Data Structures & Algorithms', 'Discuss arrays, trees, graphs, and algorithmic techniques', 'DSA', 'code'),
('Mathematics', 'Calculus, algebra, statistics and more', 'Math', 'calculator'),
('Operating Systems', 'Process management, memory, file systems', 'OS', 'cpu'),
('Database Management', 'SQL, normalization, transactions', 'DBMS', 'database'),
('Computer Networks', 'TCP/IP, protocols, network architecture', 'Networks', 'network'),
('Web Development', 'HTML, CSS, JavaScript, React and more', 'Web Dev', 'globe'),
('Machine Learning', 'AI, neural networks, deep learning', 'ML', 'brain'),
('General Studies', 'Open discussion for any topic', 'General', 'book');