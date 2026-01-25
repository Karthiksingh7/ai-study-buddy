-- Fix security: Restrict video_recommendations insert to service role only
DROP POLICY IF EXISTS "System can insert videos" ON public.video_recommendations;

-- Only allow inserts from edge functions (service role)
CREATE POLICY "Service role can insert videos" ON public.video_recommendations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');