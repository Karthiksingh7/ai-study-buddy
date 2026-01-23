-- Create profiles table for user learning profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_study_time INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  flashcards_created INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create studied_topics table to track user learning
CREATE TABLE public.studied_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  source TEXT DEFAULT 'chat',
  study_count INTEGER DEFAULT 1,
  last_studied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on studied_topics
ALTER TABLE public.studied_topics ENABLE ROW LEVEL SECURITY;

-- Studied topics policies
CREATE POLICY "Users can view their own studied topics" 
ON public.studied_topics FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own studied topics" 
ON public.studied_topics FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own studied topics" 
ON public.studied_topics FOR UPDATE 
USING (auth.uid() = user_id);

-- Create quiz_results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percentage NUMERIC(5,2) NOT NULL,
  time_taken_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Quiz results policies
CREATE POLICY "Users can view their own quiz results" 
ON public.quiz_results FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz results" 
ON public.quiz_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update profile stats
CREATE OR REPLACE FUNCTION public.update_profile_quiz_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET quizzes_completed = quizzes_completed + 1,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for quiz completion
CREATE TRIGGER on_quiz_completed
AFTER INSERT ON public.quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_quiz_count();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();