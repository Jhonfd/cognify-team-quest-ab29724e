import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal } from 'lucide-react';

interface RankingEntry {
  user_id: string;
  name: string;
  total_score: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const fetchRanking = async () => {
    const { data: results } = await supabase.from('quiz_results').select('user_id, score');
    const { data: profiles } = await supabase.from('profiles').select('user_id, name');
    if (!results || !profiles) return;

    const scoreMap: Record<string, number> = {};
    results.forEach(r => { scoreMap[r.user_id] = (scoreMap[r.user_id] || 0) + r.score; });

    const nameMap: Record<string, string> = {};
    profiles.forEach(p => { nameMap[p.user_id] = p.name || 'Sin nombre'; });

    const entries: RankingEntry[] = Object.entries(scoreMap)
      .map(([user_id, total_score]) => ({ user_id, total_score, name: nameMap[user_id] || 'Desconocido' }))
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ranking del equipo</h1>
        <p className="text-muted-foreground">Clasificación por puntaje acumulado</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>#</span>
          <span>Nombre</span>
          <span className="text-right">Puntaje</span>
        </div>
        {ranking.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay resultados aún</div>
        ) : (
          ranking.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`grid grid-cols-[60px_1fr_100px] gap-4 p-4 items-center transition-colors hover:bg-secondary/50 ${idx === 0 ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center justify-center">{getMedal(idx)}</div>
              <span className="font-medium text-foreground">{entry.name}</span>
              <span className="text-right font-bold text-primary">{entry.total_score}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
