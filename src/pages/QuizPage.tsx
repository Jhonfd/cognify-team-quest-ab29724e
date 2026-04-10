import { useState } from 'react';
import { quizCategories, QuizCategory } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Brain, ArrowRight, RotateCcw, ArrowLeft } from 'lucide-react';

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState<QuizCategory | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const questions = category?.questions ?? [];
  const question = questions[currentQ];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === question.correctIndex) setScore(s => s + 1);
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
    if (!user || !category) return;
    setSaving(true);
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      subject: category.id,
      score,
      total_questions: questions.length,
    });
    setSaving(false);
    toast({ title: '¡Quiz completado!', description: `Puntaje guardado: ${score}/${questions.length}` });
  };

  const restart = () => {
    setCategory(null);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  // Category selection screen
  if (!category) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Elige una temática</h1>
          <p className="text-muted-foreground">Selecciona un tema para comenzar el quiz</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat)}
              className="glass-card p-6 text-left transition-all hover:border-primary/50 hover:scale-[1.02] space-y-2"
            >
              <span className="text-3xl">{cat.icon}</span>
              <h3 className="text-lg font-semibold text-foreground">{cat.name}</h3>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
              <span className="text-xs text-primary">{cat.questions.length} preguntas</span>
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
        <p className="text-muted-foreground">{category.icon} {category.name}</p>
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
          <ArrowLeft className="w-4 h-4" /> {category.icon} {category.name}
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
              if (idx === question.correctIndex) cls += ' border-success/50 bg-success/10';
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
                  {answered && idx === question.correctIndex && <CheckCircle className="w-5 h-5 text-success ml-auto" />}
                  {answered && idx === selected && idx !== question.correctIndex && <XCircle className="w-5 h-5 text-destructive ml-auto" />}
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
