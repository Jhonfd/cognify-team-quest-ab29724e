
-- Categories table for dynamic categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📚',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing categories
INSERT INTO public.categories (slug, name, icon, description) VALUES
  ('algebra', 'Álgebra', '📐', 'Ecuaciones, funciones y expresiones algebraicas'),
  ('geometry', 'Geometría', '📏', 'Figuras, áreas, volúmenes y geometría analítica'),
  ('physics', 'Física', '⚡', 'Mecánica, termodinámica y electromagnetismo'),
  ('chemistry', 'Química', '🧪', 'Tabla periódica, reacciones y enlaces químicos'),
  ('biology', 'Biología', '🧬', 'Células, genética y ecosistemas'),
  ('astronomy', 'Astronomía', '🌌', 'Sistema solar, estrellas y universo'),
  ('computing', 'Sistemas & Computación', '💻', 'Programación, redes y sistemas operativos');

-- Custom quizzes table
CREATE TABLE public.custom_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active quizzes" ON public.custom_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quizzes" ON public.custom_quizzes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update quizzes" ON public.custom_quizzes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete quizzes" ON public.custom_quizzes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_custom_quizzes_updated_at BEFORE UPDATE ON public.custom_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction table for quiz questions
CREATE TABLE public.custom_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.custom_quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(quiz_id, question_id)
);

ALTER TABLE public.custom_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view quiz questions" ON public.custom_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quiz questions" ON public.custom_quiz_questions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update quiz questions" ON public.custom_quiz_questions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete quiz questions" ON public.custom_quiz_questions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
