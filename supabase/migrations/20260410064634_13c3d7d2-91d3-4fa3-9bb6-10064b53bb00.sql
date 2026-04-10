
-- Create questions table for dynamic quiz questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read questions
CREATE POLICY "Authenticated users can view questions"
ON public.questions FOR SELECT TO authenticated
USING (true);

-- Admins can insert questions
CREATE POLICY "Admins can insert questions"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update questions
CREATE POLICY "Admins can update questions"
ON public.questions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete questions
CREATE POLICY "Admins can delete questions"
ON public.questions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to delete profiles (students)
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
