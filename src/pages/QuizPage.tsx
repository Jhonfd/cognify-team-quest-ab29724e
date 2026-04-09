import { useState } from 'react';
import { quizQuestions } from '@/data/quizData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Brain, ArrowRight, RotateCcw } from 'lucide-react';

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = quizQuestions[currentQ];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === question.correctIndex) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentQ + 1 >= quizQuestions.length) {
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
    const finalScore = selected === question.correctIndex ? score : score; // score already updated
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      subject: 'mixed',
      score: score + (selected === question.correctIndex ? 0 : 0), // already counted
      total_questions: quizQuestions.length,
    });
    setSaving(false);
    toast({ title: '¡Quiz completado!', description: `Puntaje guardado: ${score}/${quizQuestions.length}` });
  };

  const restart = () => {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / quizQuestions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">¡Quiz completado!</h2>
        <div className="glass-card p-8 text-center space-y-2">
          <p className="text-5xl font-bold text-primary">{score}/{quizQuestions.length}</p>
          <p className="text-muted-foreground">Puntaje: {pct}%</p>
        </div>
        <Button onClick={restart} className="gradient-primary text-primary-foreground gap-2">
          <RotateCcw className="w-4 h-4" /> Intentar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Pregunta {currentQ + 1} de {quizQuestions.length}
        </span>
        <span className="text-sm font-medium text-primary">Puntaje: {score}</span>
      </div>

      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="h-2 rounded-full gradient-primary transition-all duration-300"
          style={{ width: `${((currentQ + 1) / quizQuestions.length) * 100}%` }}
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
            {currentQ + 1 >= quizQuestions.length ? 'Finalizar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
