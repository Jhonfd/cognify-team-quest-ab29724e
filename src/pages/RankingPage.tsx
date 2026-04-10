import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react';

interface QuizDetail {
  subject: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface RankingEntry {
  user_id: string;
  name: string;
  total_score: number;
  quizzes: QuizDetail[];
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchRanking = async () => {
    const { data: results } = await supabase.from('quiz_results').select('user_id, score, total_questions, subject, completed_at');
    const { data: profiles } = await supabase.from('profiles').select('user_id, name');
    if (!results || !profiles) return;

    const nameMap: Record<string, string> = {};
    profiles.forEach(p => { nameMap[p.user_id] = p.name || 'Sin nombre'; });

    const userMap: Record<string, { total_score: number; quizzes: QuizDetail[] }> = {};
    results.forEach(r => {
      if (!userMap[r.user_id]) userMap[r.user_id] = { total_score: 0, quizzes: [] };
      userMap[r.user_id].total_score += r.score;
      userMap[r.user_id].quizzes.push({
        subject: r.subject,
        score: r.score,
        total_questions: r.total_questions,
        completed_at: r.completed_at,
      });
    });

    const entries: RankingEntry[] = Object.entries(userMap)
      .map(([user_id, data]) => ({
        user_id,
        total_score: data.total_score,
        name: nameMap[user_id] || 'Desconocido',
        quizzes: data.quizzes.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
      }))
      .sort((a, b) => b.total_score - a.total_score);

    setRanking(entries);
  };

  useEffect(() => {
    fetchRanking();
    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_results' }, () => fetchRanking())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getMedal = (idx: number) => {
    if (idx === 0) return <Trophy className="w-5 h-5 text-warning" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (idx === 2) return <Medal className="w-5 h-5 text-warning/60" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{idx + 1}</span>;
  };

  const toggleExpand = (userId: string) => {
    setExpandedUser(prev => prev === userId ? null : userId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ranking del equipo</h1>
        <p className="text-muted-foreground">Clasificación por puntaje acumulado · Haz clic para ver detalles</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px_40px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>Nombre</span>
          <span className="text-right">Puntaje</span>
          <span></span>
        </div>
        {ranking.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay resultados aún</div>
        ) : (
          ranking.map((entry, idx) => (
            <div key={entry.user_id}>
              <div
                onClick={() => toggleExpand(entry.user_id)}
                className={`grid grid-cols-[60px_1fr_100px_40px] gap-4 p-4 items-center transition-colors hover:bg-secondary/50 cursor-pointer ${idx === 0 ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-center">{getMedal(idx)}</div>
                <span className="font-medium text-foreground">{entry.name}</span>
                <span className="text-right font-bold text-primary">{entry.total_score}</span>
                <div className="flex items-center justify-center text-muted-foreground">
                  {expandedUser === entry.user_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {expandedUser === entry.user_id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="rounded-lg bg-secondary/30 border border-border/50 overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_80px] gap-2 p-3 text-xs font-medium text-muted-foreground border-b border-border/50">
                      <span>Temática</span>
                      <span className="text-center">Resultado</span>
                      <span className="text-right">% Acierto</span>
                    </div>
                    {entry.quizzes.map((q, i) => {
                      const pct = Math.round((q.score / q.total_questions) * 100);
                      return (
                        <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-2 p-3 text-sm items-center border-b border-border/20 last:border-0">
                          <span className="text-foreground">{q.subject}</span>
                          <span className="text-center text-muted-foreground">{q.score}/{q.total_questions}</span>
                          <span className={`text-right font-semibold ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
