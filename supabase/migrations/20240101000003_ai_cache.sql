-- AI-analyse resultaten cache (gedeeld tussen gebruikers, niet-gevoelig).
-- De sleutel is een hash van de volledige invoer (projectidee, keywords, thema,
-- call-teksten en promptversie), dus een hit betekent letterlijk dezelfde input.
--
-- Opschonen van oude entries (bijv. via cron of handmatig):
--   DELETE FROM public.ai_reviews WHERE created_at < NOW() - INTERVAL '30 days';

CREATE TABLE IF NOT EXISTS public.ai_reviews (
  input_hash text PRIMARY KEY,
  payload jsonb NOT NULL,
  provider text,
  model text,
  call_count integer,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reviews_created_at ON public.ai_reviews(created_at DESC);

ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;

-- De cache bevat alleen AI-beoordelingen van publieke EU-call-teksten;
-- expliciet leesbaar/schrijfbaar voor de anon (publishable) key.
CREATE POLICY "Anonymous read AI cache" ON public.ai_reviews
  FOR SELECT USING (true);

CREATE POLICY "Anonymous insert AI cache" ON public.ai_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anonymous update AI cache" ON public.ai_reviews
  FOR UPDATE USING (true) WITH CHECK (true);
