import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Brain, ArrowRight, RotateCcw, ArrowLeft } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
}

const CAT_META: Record<string, { name: string; icon: string; description: string }> = {
  algebra: { name: 'Álgebra', icon: '📐', description: 'Ecuaciones, funciones y expresiones algebraicas' },
  geometry: { name: 'Geometría', icon: '📏', description: 'Figuras, áreas, volúmenes y teoremas' },
  physics: { name: 'Física', icon: '⚡', description: 'Mecánica, energía, fuerzas y movimiento' },
  chemistry: { name: 'Química', icon: '🧪', description: 'Elementos, reacciones y estructura atómica' },
  biology: { name: 'Biología', icon: '🧬', description: 'Células, genética y organismos vivos' },
  astronomy: { name: 'Astronomía', icon: '🌌', description: 'Planetas, estrellas y el universo' },
  computing: { name: 'Sistemas & Computación', icon: '💻', description: 'Redes, programación, hardware y sistemas operativos' },
};

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch categories from DB
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('questions').select('category');
      if (!data) return;
      const counts: Record<string, number> = {};
      data.forEach(q => { counts[q.category] = (counts[q.category] || 0) + 1; });
      const cats: Category[] = Object.entries(counts).map(([id, count]) => ({
        id,
        count,
        name: CAT_META[id]?.name ?? id,
        icon: CAT_META[id]?.icon ?? '📝',
        description: CAT_META[id]?.description ?? '',
      }));
      setCategories(cats);
    };
    fetchCats();
  }, []);

  const startQuiz = async (categoryId: string) => {
    const { data } = await supabase.from('questions').select('id, question, options, correct_index').eq('category', categoryId);
    if (!data || data.length === 0) return;
    setQuestions(data as QuizQuestion[]);
    setCatId(categoryId);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  const question = questions[currentQ];
  const catMeta = catId ? (CAT_META[catId] ?? { name: catId, icon: '📝', description: '' }) : null;

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
    if (!user || !catId) return;
    setSaving(true);
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      subject: catId,
      score,
      total_questions: questions.length,
    });
    setSaving(false);
    toast({ title: '¡Quiz completado!', description: `Puntaje guardado: ${score}/${questions.length}` });
  };

  const restart = () => {
    setCatId(null);
    setQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  // Category selection screen
  if (!catId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elige una temática</h1>
          <p className="text-muted-foreground">Selecciona un tema para comenzar el quiz</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => startQuiz(cat.id)}
              className="glass-card p-6 text-left transition-all hover:border-primary/50 hover:scale-[1.02] space-y-2"
            >
              <span className="text-3xl">{cat.icon}</span>
              <h3 className="text-lg font-semibold text-foreground">{cat.name}</h3>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
              <span className="text-xs text-primary">{cat.count} preguntas</span>
            </button>
          ))}
        </div>
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
        <p className="text-muted-foreground">{catMeta?.icon} {catMeta?.name}</p>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-5xl font-bold text-primary">{score}/{questions.length}</p>
          <p className="text-muted-foreground">Puntaje: {pct}%</p>
        </div>
        <Button onClick={restart} className="gradient-primary text-primary-foreground gap-2">
          <RotateCcw className="w-4 h-4" /> Elegir otro tema
        </Button>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={restart} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {catMeta?.icon} {catMeta?.name}
        </button>
        <span className="text-sm font-medium text-primary">Puntaje: {score}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Pregunta {currentQ + 1} de {questions.length}
        </span>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="h-2 rounded-full gradient-primary transition-all duration-300"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
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
