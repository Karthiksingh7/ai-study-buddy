CREATE TABLE IF NOT EXISTS public.mock_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  ai_evaluation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_test_results TO authenticated;
GRANT ALL ON public.mock_test_results TO service_role;

ALTER TABLE public.mock_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mock test results"
ON public.mock_test_results FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mock_test_results_user ON public.mock_test_results(user_id, created_at DESC);