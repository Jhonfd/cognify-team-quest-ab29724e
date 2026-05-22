
-- 1. Add scheduling + time limit columns
ALTER TABLE public.custom_quizzes
  ADD COLUMN IF NOT EXISTS time_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS time_total_seconds integer,
  ADD COLUMN IF NOT EXISTS time_per_question_seconds integer,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Validate time_mode + window via trigger (avoid time-based check constraints)
CREATE OR REPLACE FUNCTION public.validate_custom_quiz()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.time_mode NOT IN ('none','total','per_question') THEN
    RAISE EXCEPTION 'Invalid time_mode: %', NEW.time_mode;
  END IF;
  IF NEW.time_mode = 'total' AND (NEW.time_total_seconds IS NULL OR NEW.time_total_seconds <= 0) THEN
    RAISE EXCEPTION 'time_total_seconds must be > 0 when time_mode = total';
  END IF;
  IF NEW.time_mode = 'per_question' AND (NEW.time_per_question_seconds IS NULL OR NEW.time_per_question_seconds <= 0) THEN
    RAISE EXCEPTION 'time_per_question_seconds must be > 0 when time_mode = per_question';
  END IF;
  IF NEW.starts_at IS NOT NULL AND NEW.ends_at IS NOT NULL AND NEW.starts_at >= NEW.ends_at THEN
    RAISE EXCEPTION 'starts_at must be before ends_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_custom_quiz ON public.custom_quizzes;
CREATE TRIGGER trg_validate_custom_quiz
BEFORE INSERT OR UPDATE ON public.custom_quizzes
FOR EACH ROW EXECUTE FUNCTION public.validate_custom_quiz();

-- 2. Many-to-many: quiz <-> groups
CREATE TABLE IF NOT EXISTS public.custom_quiz_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.custom_quizzes(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_quiz_groups_quiz ON public.custom_quiz_groups(quiz_id);
CREATE INDEX IF NOT EXISTS idx_custom_quiz_groups_group ON public.custom_quiz_groups(group_id);

ALTER TABLE public.custom_quiz_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view quiz group assignments"
ON public.custom_quiz_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers/admins can manage quiz group assignments - insert"
ON public.custom_quiz_groups FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Teachers/admins can manage quiz group assignments - delete"
ON public.custom_quiz_groups FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
);

-- 3. Allow teachers to manage custom quizzes (they create scheduled ones)
DROP POLICY IF EXISTS "Teachers can insert quizzes" ON public.custom_quizzes;
CREATE POLICY "Teachers can insert quizzes"
ON public.custom_quizzes FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = created_by)
  AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Teachers can update own quizzes" ON public.custom_quizzes;
CREATE POLICY "Teachers can update own quizzes"
ON public.custom_quizzes FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'teacher') AND auth.uid() = created_by)
);

DROP POLICY IF EXISTS "Teachers can delete own quizzes" ON public.custom_quizzes;
CREATE POLICY "Teachers can delete own quizzes"
ON public.custom_quizzes FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'teacher') AND auth.uid() = created_by)
);

DROP POLICY IF EXISTS "Teachers can insert quiz questions" ON public.custom_quiz_questions;
CREATE POLICY "Teachers can insert quiz questions"
ON public.custom_quiz_questions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.custom_quizzes q WHERE q.id = quiz_id AND q.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Teachers can delete quiz questions" ON public.custom_quiz_questions;
CREATE POLICY "Teachers can delete quiz questions"
ON public.custom_quiz_questions FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.custom_quizzes q WHERE q.id = quiz_id AND q.created_by = auth.uid())
);

-- 4. Restrict SELECT on custom_quizzes: students only see assigned + within window
DROP POLICY IF EXISTS "Anyone authenticated can view active quizzes" ON public.custom_quizzes;
CREATE POLICY "View quizzes (role/group/window aware)"
ON public.custom_quizzes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
  OR (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >= now())
    AND (
      NOT EXISTS (SELECT 1 FROM public.custom_quiz_groups g WHERE g.quiz_id = custom_quizzes.id)
      OR EXISTS (
        SELECT 1 FROM public.custom_quiz_groups g
        JOIN public.group_members m ON m.group_id = g.group_id
        WHERE g.quiz_id = custom_quizzes.id AND m.user_id = auth.uid()
      )
    )
  )
);
