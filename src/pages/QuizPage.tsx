import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Brain, ArrowRight, RotateCcw, ArrowLeft, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  count: number;
}

interface CustomQuiz {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  question_count: number;
}

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [quizMode, setQuizMode] = useState<'category' | 'custom' | null>(null);
  const [quizLabel, setQuizLabel] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories from DB
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      const { data: qData } = await supabase.from('questions').select('category');

      const counts: Record<string, number> = {};
      qData?.forEach(q => { counts[q.category] = (counts[q.category] || 0) + 1; });

      setCategories(
        (cats ?? []).map((c: any) => ({
          ...c,
          count: counts[c.slug] || 0,
        }))
      );

      // Fetch active custom quizzes
      const { data: quizData } = await supabase.from('custom_quizzes').select('id, title, description, category_id').eq('is_active', true);
      const { data: links } = await supabase.from('custom_quiz_questions').select('quiz_id');
      const linkCounts: Record<string, number> = {};
      links?.forEach(l => { linkCounts[l.quiz_id] = (linkCounts[l.quiz_id] || 0) + 1; });

      setCustomQuizzes(
        (quizData ?? []).map((q: any) => ({ ...q, question_count: linkCounts[q.id] || 0 }))
      );
    };
    fetchData();
  }, []);

  const startCategoryQuiz = async (cat: Category) => {
    const { data } = await supabase.from('questions').select('id, question, options, correct_index').eq('category', cat.slug);
    if (!data || data.length === 0) return;
    setQuestions(data as QuizQuestion[]);
    setQuizMode('category');
    setQuizLabel(`${cat.icon} ${cat.name}`);
    setQuizSubject(cat.slug);
    resetState();
  };

  const startCustomQuiz = async (quiz: CustomQuiz) => {
    const { data: links } = await supabase.from('custom_quiz_questions').select('question_id').eq('quiz_id', quiz.id).order('sort_order');
    if (!links || links.length === 0) return;
    const ids = links.map(l => l.question_id);
    const { data } = await supabase.from('questions').select('id, question, options, correct_index').in('id', ids);
    if (!data || data.length === 0) return;
    // Sort by original order
    const sorted = ids.map(id => data.find(q => q.id === id)).filter(Boolean) as QuizQuestion[];
    setQuestions(sorted);
    setQuizMode('custom');
    setQuizLabel(`✨ ${quiz.title}`);
    setQuizSubject(quiz.title);
    resetState();
  };

  const resetState = () => {
    setCurrentQ(0); setSelected(null); setScore(0); setAnswered(false); setFinished(false);
  };

  const question = questions[currentQ];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === question.correct_index) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      saveResult();
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const saveResult = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      subject: quizSubject,
      score,
      total_questions: questions.length,
    });
    setSaving(false);
    toast({ title: '¡Quiz completado!', description: `Puntaje guardado: ${score}/${questions.length}` });
  };

  const restart = () => {
    setQuizMode(null);
    setQuestions([]);
    resetState();
  };

  // Selection screen
  if (!quizMode) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elige un quiz</h1>
          <p className="text-muted-foreground">Selecciona un tema o un quiz personalizado</p>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Por categoría</TabsTrigger>
            <TabsTrigger value="custom" className="gap-2"><Sparkles className="w-4 h-4" /> Quices personalizados</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {categories.filter(c => c.count > 0).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startCategoryQuiz(cat)}
                  className="glass-card p-6 text-left transition-all hover:border-primary/50 hover:scale-[1.02] space-y-2"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <h3 className="text-lg font-semibold text-foreground">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  <span className="text-xs text-primary">{cat.count} preguntas</span>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {customQuizzes.length === 0 ? (
                <div className="col-span-full p-8 text-center text-muted-foreground">No hay quices personalizados disponibles</div>
              ) : customQuizzes.map(quiz => (
                <button
                  key={quiz.id}
                  onClick={() => startCustomQuiz(quiz)}
                  className="glass-card p-6 text-left transition-all hover:border-primary/50 hover:scale-[1.02] space-y-2"
                >
                  <span className="text-3xl">✨</span>
                  <h3 className="text-lg font-semibold text-foreground">{quiz.title}</h3>
                  <p className="text-sm text-muted-foreground">{quiz.description || 'Quiz personalizado'}</p>
                  <span className="text-xs text-primary">{quiz.question_count} preguntas</span>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">¡Quiz completado!</h2>
        <p className="text-muted-foreground">{quizLabel}</p>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-5xl font-bold text-primary">{score}/{questions.length}</p>
          <p className="text-muted-foreground">Puntaje: {pct}%</p>
        </div>
        <Button onClick={restart} className="gradient-primary text-primary-foreground gap-2">
          <RotateCcw className="w-4 h-4" /> Elegir otro quiz
        </Button>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={restart} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {quizLabel}
        </button>
        <span className="text-sm font-medium text-primary">Puntaje: {score}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Pregunta {currentQ + 1} de {questions.length}</span>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div className="h-2 rounded-full gradient-primary transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="glass-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">{question.question}</h2>
        <div className="grid gap-3">
          {question.options.map((opt, idx) => {
            let cls = 'glass-card p-4 cursor-pointer transition-all text-left w-full border';
            if (answered) {
              if (idx === question.correct_index) cls += ' border-success/50 bg-success/10';
              else if (idx === selected) cls += ' border-destructive/50 bg-destructive/10';
              else cls += ' opacity-50';
            } else if (idx === selected) {
              cls += ' border-primary';
            } else {
              cls += ' hover:border-primary/50';
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} className={cls} disabled={answered}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-foreground">{opt}</span>
                  {answered && idx === question.correct_index && <CheckCircle className="w-5 h-5 text-success ml-auto" />}
                  {answered && idx === selected && idx !== question.correct_index && <XCircle className="w-5 h-5 text-destructive ml-auto" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="gradient-primary text-primary-foreground gap-2">
            {currentQ + 1 >= questions.length ? 'Finalizar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
