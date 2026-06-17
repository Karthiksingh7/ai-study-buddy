-- Migration: RBAC Authentication System
-- Adds role-based access control tables for AI Study Buddy

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'mentor', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Study Plans table for AI Study Planner
CREATE TABLE public.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  current_level TEXT NOT NULL CHECK (current_level IN ('beginner', 'intermediate', 'advanced')),
  syllabus_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Study Tasks table
CREATE TABLE public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  task_type TEXT NOT NULL CHECK (task_type IN ('learn', 'practice', 'revise', 'test')),
  topic TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  rescheduled_from DATE,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5)
);

-- User Context table for AI memory
CREATE TABLE public.user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  syllabus JSONB DEFAULT '{}',
  weak_topics TEXT[] DEFAULT '{}',
  strong_topics TEXT[] DEFAULT '{}',
  learning_preferences JSONB DEFAULT '{}',
  preferred_doubt_mode TEXT DEFAULT 'standard',
  preferred_subjects TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Uploaded Documents table
CREATE TABLE public.uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt', 'md')),
  file_size INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  extracted_text TEXT,
  flashcards_generated INTEGER DEFAULT 0,
  questions_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Mock Tests table
CREATE TABLE public.mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  syllabus_id UUID,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'intermediate', 'hard')),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL,
  question_types TEXT[] DEFAULT ARRAY['mcq'],
  created_by UUID,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Mock Test Questions table
CREATE TABLE public.mock_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'descriptive', 'coding')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  explanation TEXT,
  order_index INTEGER NOT NULL
);

-- Mock Test Results table
CREATE TABLE public.mock_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.mock_tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL,
  ai_evaluation JSONB,
  total_score NUMERIC(5,2),
  max_score INTEGER,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Syllabi table
CREATE TABLE public.syllabi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board_or_exam TEXT NOT NULL,
  subjects TEXT[] NOT NULL,
  topics JSONB NOT NULL,
  is_official BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User Syllabus selection
CREATE TABLE public.user_syllabus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  syllabus_id UUID REFERENCES public.syllabi(id) ON DELETE SET NULL,
  custom_syllabus JSONB,
  completed_topics TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Classrooms table for Mentor mode
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  mentor_id UUID NOT NULL,
  invite_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Classroom Students join table
CREATE TABLE public.classroom_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(classroom_id, student_id)
);

-- Classroom Tasks table
CREATE TABLE public.classroom_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('assignment', 'quiz', 'reading', 'project')),
  due_date TIMESTAMP WITH TIME ZONE,
  max_score INTEGER,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Classroom Task Submissions
CREATE TABLE public.classroom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.classroom_tasks(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  ai_feedback JSONB,
  mentor_feedback TEXT,
  score NUMERIC(5,2),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(task_id, student_id)
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'institutional')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  payment_provider TEXT,
  payment_id TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Usage Tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  UNIQUE(user_id, feature, date)
);

-- Audit Logs table for admins
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_plans
CREATE POLICY "Users can view their own plans" ON public.study_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plans" ON public.study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.study_plans
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_tasks
CREATE POLICY "Users can view tasks from their plans" ON public.study_tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.study_plans WHERE id = plan_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can manage tasks in their plans" ON public.study_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.study_plans WHERE id = plan_id AND user_id = auth.uid())
  );

-- RLS Policies for user_context
CREATE POLICY "Users can manage their own context" ON public.user_context
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for uploaded_documents
CREATE POLICY "Users can manage their own documents" ON public.uploaded_documents
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for mock_tests
CREATE POLICY "Anyone can view public tests" ON public.mock_tests
  FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "Users can create tests" ON public.mock_tests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update their tests" ON public.mock_tests
  FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for mock_test_questions
CREATE POLICY "Anyone can view questions of accessible tests" ON public.mock_test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mock_tests 
      WHERE id = test_id AND (is_public = true OR created_by = auth.uid())
    )
  );

-- RLS Policies for mock_test_results
CREATE POLICY "Users can view their own results" ON public.mock_test_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own results" ON public.mock_test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for syllabi
CREATE POLICY "Anyone can view syllabi" ON public.syllabi
  FOR SELECT USING (true);

-- RLS Policies for user_syllabus
CREATE POLICY "Users can manage their own syllabus" ON public.user_syllabus
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for classrooms
CREATE POLICY "Mentors can manage their classrooms" ON public.classrooms
  FOR ALL USING (mentor_id = auth.uid());
CREATE POLICY "Students can view joined classrooms" ON public.classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students 
      WHERE classroom_id = id AND student_id = auth.uid()
    )
  );

-- RLS Policies for classroom_students
CREATE POLICY "Mentors can manage their classroom students" ON public.classroom_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id AND mentor_id = auth.uid()
    )
  );
CREATE POLICY "Students can view themselves" ON public.classroom_students
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can join classrooms" ON public.classroom_students
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- RLS Policies for classroom_tasks
CREATE POLICY "Mentors can manage classroom tasks" ON public.classroom_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id AND mentor_id = auth.uid()
    )
  );
CREATE POLICY "Students can view classroom tasks" ON public.classroom_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students 
      WHERE classroom_id = classroom_tasks.classroom_id AND student_id = auth.uid()
    )
  );

-- RLS Policies for classroom_submissions
CREATE POLICY "Students can manage their submissions" ON public.classroom_submissions
  FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Mentors can view/grade submissions" ON public.classroom_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classroom_tasks t
      JOIN public.classrooms c ON c.id = t.classroom_id
      WHERE t.id = task_id AND c.mentor_id = auth.uid()
    )
  );

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true);

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can track usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update usage" ON public.usage_tracking
  FOR UPDATE USING (true);

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Insert default syllabi
INSERT INTO public.syllabi (name, board_or_exam, subjects, topics) VALUES
('CBSE Class 12 - PCM', 'CBSE', ARRAY['Physics', 'Chemistry', 'Mathematics'], 
 '{"Physics": ["Electrostatics", "Current Electricity", "Magnetism", "EMI", "Optics", "Modern Physics"], 
   "Chemistry": ["Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Organic Chemistry"], 
   "Mathematics": ["Relations and Functions", "Calculus", "Vectors", "3D Geometry", "Probability"]}'::jsonb),
('GATE CS', 'GATE', ARRAY['DSA', 'OS', 'DBMS', 'Networks', 'TOC'], 
 '{"DSA": ["Arrays", "Trees", "Graphs", "Dynamic Programming", "Sorting"], 
   "OS": ["Process Management", "Memory Management", "File Systems", "Deadlocks"], 
   "DBMS": ["SQL", "Normalization", "Transactions", "Indexing"],
   "Networks": ["TCP/IP", "OSI Model", "Routing", "Security"]}'::jsonb),
('JEE Main', 'JEE', ARRAY['Physics', 'Chemistry', 'Mathematics'],
 '{"Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"],
   "Chemistry": ["Physical Chemistry", "Inorganic Chemistry", "Organic Chemistry"],
   "Mathematics": ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry"]}'::jsonb),
('JNTU B.Tech CSE', 'JNTU', ARRAY['DSA', 'OS', 'DBMS', 'Networks', 'Software Engineering'],
 '{"DSA": ["Arrays", "Linked Lists", "Trees", "Graphs", "Algorithms"],
   "OS": ["Process Scheduling", "Memory", "File Systems", "Synchronization"],
   "DBMS": ["ER Model", "SQL", "Normalization", "Transactions"]}'::jsonb),
('VTU B.Tech CSE', 'VTU', ARRAY['DSA', 'OS', 'DBMS', 'Networks', 'Web Technologies'],
 '{"DSA": ["Sorting", "Searching", "Trees", "Graphs", "Hashing"],
   "OS": ["CPU Scheduling", "Deadlocks", "Memory Management", "File Systems"],
   "DBMS": ["Relational Model", "SQL", "Normalization", "Transaction Management"]}'::jsonb);

-- Create function for tracking usage
CREATE OR REPLACE FUNCTION public.track_usage(p_user_id UUID, p_feature TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, feature, count, date)
  VALUES (p_user_id, p_feature, 1, CURRENT_DATE)
  ON CONFLICT (user_id, feature, date) 
  DO UPDATE SET count = usage_tracking.count + 1;
END;
$$;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_user_id UUID, p_feature TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan TEXT;
  v_usage INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get user's plan
  SELECT plan INTO v_plan FROM public.subscriptions WHERE user_id = p_user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  
  -- Get today's usage
  SELECT COALESCE(count, 0) INTO v_usage 
  FROM public.usage_tracking 
  WHERE user_id = p_user_id AND feature = p_feature AND date = CURRENT_DATE;
  
  -- Set limits based on plan
  v_limit := CASE 
    WHEN v_plan = 'free' THEN 10
    WHEN v_plan = 'pro' THEN 1000
    WHEN v_plan = 'institutional' THEN 10000
    ELSE 10
  END;
  
  RETURN jsonb_build_object(
    'allowed', v_usage < v_limit,
    'usage', v_usage,
    'limit', v_limit,
    'plan', v_plan
  );
END;
$$;
