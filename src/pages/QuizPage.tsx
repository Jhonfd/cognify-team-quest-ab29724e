import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Brain, ArrowRight, RotateCcw, ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type QuestionType = 'single' | 'multiple' | 'boolean' | 'open';

interface QuizQuestion {
  id: string;
  question: string;
  question_type: QuestionType;
  options: string[];
  correct_index: number;
  correct_indices: number[];
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
  time_mode: 'none' | 'total' | 'per_question';
  time_total_seconds: number | null;
  time_per_question_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
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

  // Per-question response state
  const [selectedSet, setSelectedSet] = useState<number[]>([]);
  const [openText, setOpenText] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  // Timer state
  const [activeTimeMode, setActiveTimeMode] = useState<'none' | 'total' | 'per_question'>('none');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [perQSeconds, setPerQSeconds] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      const { data: qData } = await supabase.from('questions').select('category');

      const counts: Record<string, number> = {};
      qData?.forEach(q => { counts[q.category] = (counts[q.category] || 0) + 1; });

      setCategories(
        (cats ?? []).map((c: any) => ({ ...c, count: counts[c.slug] || 0 }))
      );

      const { data: quizData } = await supabase.from('custom_quizzes')
        .select('id, title, description, category_id, time_mode, time_total_seconds, time_per_question_seconds, starts_at, ends_at')
        .eq('is_active', true);
      const { data: links } = await supabase.from('custom_quiz_questions').select('quiz_id');
      const linkCounts: Record<string, number> = {};
      links?.forEach(l => { linkCounts[l.quiz_id] = (linkCounts[l.quiz_id] || 0) + 1; });

      setCustomQuizzes(
        (quizData ?? []).map((q: any) => ({ ...q, question_count: linkCounts[q.id] || 0 }))
      );
    };
    fetchData();
  }, []);

  const normalize = (qs: any[]): QuizQuestion[] =>
    qs.map(q => ({
      id: q.id,
      question: q.question,
      question_type: (q.question_type ?? 'single') as QuestionType,
      options: q.options ?? [],
      correct_index: q.correct_index ?? 0,
      correct_indices: (q.correct_indices && q.correct_indices.length > 0)
        ? q.correct_indices
        : [q.correct_index ?? 0],
    }));

  const startCategoryQuiz = async (cat: Category) => {
    const { data } = await supabase.from('questions')
      .select('id, question, question_type, options, correct_index, correct_indices')
      .eq('category', cat.slug);
    if (!data || data.length === 0) return;
    setQuestions(normalize(data));
    setQuizMode('category');
    setQuizLabel(`${cat.icon} ${cat.name}`);
    setQuizSubject(cat.slug);
    resetState();
  };

  const startCustomQuiz = async (quiz: CustomQuiz) => {
    const now = new Date();
    if (quiz.starts_at && new Date(quiz.starts_at) > now) {
      toast({ title: 'Aún no disponible', description: `Disponible desde ${new Date(quiz.starts_at).toLocaleString()}`, variant: 'destructive' });
      return;
    }
    if (quiz.ends_at && new Date(quiz.ends_at) < now) {
      toast({ title: 'Quiz cerrado', description: 'La ventana de disponibilidad ya finalizó.', variant: 'destructive' });
      return;
    }

    const { data: links } = await supabase.from('custom_quiz_questions').select('question_id').eq('quiz_id', quiz.id).order('sort_order');
    if (!links || links.length === 0) return;
    const ids = links.map(l => l.question_id);
    const { data } = await supabase.from('questions')
      .select('id, question, question_type, options, correct_index, correct_indices')
      .in('id', ids);
    if (!data || data.length === 0) return;
    const sorted = ids.map(id => data.find(q => q.id === id)).filter(Boolean) as any[];
    setQuestions(normalize(sorted));
    setQuizMode('custom');
    setQuizLabel(`✨ ${quiz.title}`);
    setQuizSubject(quiz.title);
    resetState();

    // Configure timer
    setActiveTimeMode(quiz.time_mode ?? 'none');
    if (quiz.time_mode === 'total' && quiz.time_total_seconds) {
      setSecondsLeft(quiz.time_total_seconds);
      setPerQSeconds(null);
    } else if (quiz.time_mode === 'per_question' && quiz.time_per_question_seconds) {
      setPerQSeconds(quiz.time_per_question_seconds);
      setSecondsLeft(quiz.time_per_question_seconds);
    } else {
      setSecondsLeft(null);
      setPerQSeconds(null);
    }
  };

  const resetState = () => {
    setCurrentQ(0); setSelectedSet([]); setOpenText(''); setScore(0); setAnswered(false); setFinished(false);
    setActiveTimeMode('none'); setSecondsLeft(null); setPerQSeconds(null);
  };

  const question = questions[currentQ];

  const arraysEqual = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort(); const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  };

  // Returns partial score 0..1 for current question based on type
  const computeScore = (q: QuizQuestion, sel: number[], txt: string): { points: number; correct: boolean | null; needsReview: boolean } => {
    if (q.question_type === 'open') {
      return { points: 0, correct: null, needsReview: true };
    }
    if (q.question_type === 'multiple') {
      const correctSet = new Set(q.correct_indices);
      const selSet = new Set(sel);
      const totalCorrect = correctSet.size || 1;
      let hits = 0; let wrong = 0;
      selSet.forEach(i => { if (correctSet.has(i)) hits++; else wrong++; });
      // partial: (hits - wrong) / totalCorrect, clamp 0..1
      const raw = (hits - wrong) / totalCorrect;
      const points = Math.max(0, Math.min(1, raw));
      return { points, correct: arraysEqual(sel, q.correct_indices), needsReview: false };
    }
    // single or boolean
    const correctIdx = q.correct_indices[0] ?? q.correct_index;
    const ok = sel.length === 1 && sel[0] === correctIdx;
    return { points: ok ? 1 : 0, correct: ok, needsReview: false };
  };

  const submitAnswer = async () => {
    if (!question || !user) return;
    const result = computeScore(question, selectedSet, openText);
    setScore(s => s + result.points);
    setAnswered(true);

    // Save per-question answer
    await supabase.from('quiz_answers').insert({
      user_id: user.id,
      question_id: question.id,
      selected_indices: selectedSet,
      open_answer: question.question_type === 'open' ? openText : null,
      is_correct: result.correct,
      partial_score: result.points,
      needs_review: result.needsReview,
    });
  };

  const canSubmit = (() => {
    if (answered) return false;
    if (!question) return false;
    if (question.question_type === 'open') return openText.trim().length > 0;
    return selectedSet.length > 0;
  })();

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      saveResult();
    } else {
      setCurrentQ(c => c + 1);
      setSelectedSet([]);
      setOpenText('');
      setAnswered(false);
    }
  };

  const saveResult = async () => {
    if (!user) return;
    // Final score uses ceil/round of accumulated partial points
    const finalScore = Math.round(score);
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      subject: quizSubject,
      score: finalScore,
      total_questions: questions.length,
    });
    toast({ title: '¡Quiz completado!', description: `Puntaje guardado: ${finalScore}/${questions.length}` });
  };

  const restart = () => {
    setQuizMode(null);
    setQuestions([]);
    resetState();
  };

  const toggleSelected = (i: number) => {
    if (answered) return;
    if (question.question_type === 'multiple') {
      setSelectedSet(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
    } else {
      setSelectedSet([i]);
    }
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
    const finalScore = Math.round(score);
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">¡Quiz completado!</h2>
        <p className="text-muted-foreground">{quizLabel}</p>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-5xl font-bold text-primary">{finalScore}/{questions.length}</p>
          <p className="text-muted-foreground">Puntaje: {pct}%</p>
          <p className="text-xs text-muted-foreground">Las preguntas abiertas serán revisadas por tu profesor.</p>
        </div>
        <Button onClick={restart} className="gradient-primary text-primary-foreground gap-2">
          <RotateCcw className="w-4 h-4" /> Elegir otro quiz
        </Button>
      </div>
    );
  }

  // Quiz screen
  const correctIdxForFeedback = question.correct_indices ?? [question.correct_index];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={restart} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {quizLabel}
        </button>
        <span className="text-sm font-medium text-primary">Puntaje: {score.toFixed(score % 1 === 0 ? 0 : 2)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Pregunta {currentQ + 1} de {questions.length}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
          {question.question_type === 'single' && 'Una correcta'}
          {question.question_type === 'multiple' && 'Varias correctas'}
          {question.question_type === 'boolean' && 'Verdadero/Falso'}
          {question.question_type === 'open' && 'Respuesta abierta'}
        </span>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div className="h-2 rounded-full gradient-primary transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="glass-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-foreground">{question.question}</h2>

        {/* Open answer */}
        {question.question_type === 'open' && (
          <div className="space-y-3">
            <Textarea
              value={openText}
              onChange={e => setOpenText(e.target.value)}
              placeholder="Escribe tu respuesta..."
              disabled={answered}
              className="min-h-[120px]"
            />
            {answered && (
              <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 border border-warning/30 rounded-md p-3">
                <Clock className="w-4 h-4" />
                Tu respuesta será revisada por el profesor.
              </div>
            )}
          </div>
        )}

        {/* Boolean */}
        {question.question_type === 'boolean' && (
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, idx) => {
              const isSelected = selectedSet.includes(idx);
              const isCorrect = correctIdxForFeedback.includes(idx);
              let cls = 'glass-card p-4 cursor-pointer transition-all text-center font-medium border';
              if (answered) {
                if (isCorrect) cls += ' border-success/50 bg-success/10';
                else if (isSelected) cls += ' border-destructive/50 bg-destructive/10';
                else cls += ' opacity-50';
              } else if (isSelected) cls += ' border-primary';
              else cls += ' hover:border-primary/50';
              return (
                <button key={idx} onClick={() => toggleSelected(idx)} className={cls} disabled={answered}>
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Single / Multiple choice */}
        {(question.question_type === 'single' || question.question_type === 'multiple') && (
          <div className="grid gap-3">
            {question.options.map((opt, idx) => {
              const isSelected = selectedSet.includes(idx);
              const isCorrect = correctIdxForFeedback.includes(idx);
              let cls = 'glass-card p-4 cursor-pointer transition-all text-left w-full border';
              if (answered) {
                if (isCorrect) cls += ' border-success/50 bg-success/10';
                else if (isSelected) cls += ' border-destructive/50 bg-destructive/10';
                else cls += ' opacity-50';
              } else if (isSelected) cls += ' border-primary';
              else cls += ' hover:border-primary/50';
              return (
                <button key={idx} onClick={() => toggleSelected(idx)} className={cls} disabled={answered}>
                  <div className="flex items-center gap-3">
                    {question.question_type === 'multiple' ? (
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    )}
                    <span className="text-foreground flex-1">{opt}</span>
                    {answered && isCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                    {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                  </div>
                </button>
              );
            })}
            {question.question_type === 'multiple' && !answered && (
              <p className="text-xs text-muted-foreground">Marca todas las opciones correctas. El puntaje es parcial.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {!answered ? (
          <Button onClick={submitAnswer} disabled={!canSubmit} className="gradient-primary text-primary-foreground gap-2">
            Responder <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleNext} className="gradient-primary text-primary-foreground gap-2">
            {currentQ + 1 >= questions.length ? 'Finalizar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
