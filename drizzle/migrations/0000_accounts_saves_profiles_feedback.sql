CREATE TABLE public.player_saves (
  user_id uuid PRIMARY KEY,
  state jsonb NOT NULL,
  save_version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  device_label text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_saves TO authenticated;
GRANT ALL ON public.player_saves TO service_role;
ALTER TABLE public.player_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own save" ON public.player_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own save" ON public.player_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own save" ON public.player_saves FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own save" ON public.player_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handle_format CHECK (
    handle IS NULL OR (
      handle ~ '^[a-z0-9_]{3,20}$'
      AND handle = lower(handle)
      AND handle NOT IN ('admin', 'dormvibes', 'support', 'floor3', 'ra', 'mod', 'moderator', 'staff', 'system', 'root', 'help', 'official')
    )
  )
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('love', 'confusing', 'bug', 'idea')),
  note text NOT NULL CHECK (char_length(note) <= 1000),
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users send their own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);