-- Add question_type and supporting fields to questions table
-- Types: 'single' (one correct), 'multiple' (multiple correct), 'boolean' (true/false), 'open' (manual review)

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS correct_indices integer[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS correct_answers text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill correct_indices from existing correct_index for legacy single-choice questions
UPDATE public.questions
SET correct_indices = ARRAY[correct_index]
WHERE (correct_indices IS NULL OR array_length(correct_indices, 1) IS NULL)
  AND correct_index IS NOT NULL;

-- Validation: question_type must be one of allowed values (use trigger, not CHECK, per guidelines)
CREATE OR REPLACE FUNCTION public.validate_question_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.question_type NOT IN ('single','multiple','boolean','open') THEN
    RAISE EXCEPTION 'Invalid question_type: %', NEW.question_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_question_type ON public.questions;
CREATE TRIGGER trg_validate_question_type
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.validate_question_type();

-- Track per-question student responses (needed for open answers + partial scoring)
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  quiz_result_id uuid,
  selected_indices integer[] NOT NULL DEFAULT '{}'::integer[],
  open_answer text,
  is_correct boolean,
  partial_score numeric(5,2),
  needs_review boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers or teachers/admins all"
ON public.quiz_answers FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Users insert own answers"
ON public.quiz_answers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers/admins can grade open answers"
ON public.quiz_answers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can delete answers"
ON public.quiz_answers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user ON public.quiz_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review ON public.quiz_answers(needs_review) WHERE needs_review = true;