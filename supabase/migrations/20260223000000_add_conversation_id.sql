-- Add conversation_id column to chat_messages for grouping messages into conversations
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id text;

-- Create index for faster conversation lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(user_id, conversation_id);

-- Add mock_test_results table if it doesn't exist (used by MockTests.tsx)
CREATE TABLE IF NOT EXISTS mock_test_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  test_title text NOT NULL,
  subject text,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  score_percentage numeric NOT NULL DEFAULT 0,
  time_taken_seconds integer,
  difficulty text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on mock_test_results
ALTER TABLE mock_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for mock_test_results
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_test_results' AND policyname = 'Users can view own mock test results') THEN
    CREATE POLICY "Users can view own mock test results" ON mock_test_results FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_test_results' AND policyname = 'Users can insert own mock test results') THEN
    CREATE POLICY "Users can insert own mock test results" ON mock_test_results FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
