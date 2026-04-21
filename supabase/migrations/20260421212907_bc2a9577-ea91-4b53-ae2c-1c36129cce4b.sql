-- Function to generate random invite code
CREATE OR REPLACE FUNCTION public.generate_group_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Groups table
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  invite_code text NOT NULL UNIQUE DEFAULT public.generate_group_invite_code(),
  teacher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view groups"
  ON public.groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can create their own groups"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Teachers can update their own groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can delete their own groups"
  ON public.groups FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group members table (one student can belong to only one group)
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view group members"
  ON public.group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers can add members to their groups"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Students can join a group themselves"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can be removed by teacher admin or self"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND teacher_id = auth.uid())
    OR auth.uid() = user_id
  );

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);