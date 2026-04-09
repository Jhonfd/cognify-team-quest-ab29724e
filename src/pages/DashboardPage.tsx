import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, Award, TrendingUp } from 'lucide-react';

interface Stats {
  avgScore: number;
  totalQuizzes: number;
  bestScore: number;
  totalParticipants: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ avgScore: 0, totalQuizzes: 0, bestScore: 0, totalParticipants: 0 });

  const fetchStats = async () => {
    const { data } = await supabase.from('quiz_results').select('*');
    if (!data || data.length === 0) {
      setStats({ avgScore: 0, totalQuizzes: 0, bestScore: 0, totalParticipants: 0 });
      return;
    }
    const scores = data.map(r => (r.score / r.total_questions) * 100);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    const uniqueUsers = new Set(data.map(r => r.user_id)).size;
    setStats({
      avgScore: Math.round(avg),
      totalQuizzes: data.length,
      bestScore: Math.round(best),
      totalParticipants: uniqueUsers,
    });
  };

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_results' }, () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: 'Promedio del equipo', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Quizzes completados', value: stats.totalQuizzes.toString(), icon: Target, color: 'text-success' },
    { label: 'Mejor puntaje', value: `${stats.bestScore}%`, icon: Trophy, color: 'text-warning' },
    { label: 'Participantes', value: stats.totalParticipants.toString(), icon: Award, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Métricas del equipo en tiempo real</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="glass-card p-6 space-y-3 glow-primary">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
