import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, ChevronDown, ChevronUp, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

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
  group_id: string | null;
  group_name: string | null;
  quizzes: QuizDetail[];
}

interface GroupRankingEntry {
  group_id: string;
  group_name: string;
  total_score: number;
  member_count: number;
  avg_score: number;
}

export default function RankingPage() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [groupRanking, setGroupRanking] = useState<GroupRankingEntry[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const fetchRanking = async () => {
    const [{ data: results }, { data: profiles }, { data: groupsData }, { data: members }] = await Promise.all([
      supabase.from('quiz_results').select('user_id, score, total_questions, subject, completed_at'),
      supabase.from('profiles').select('user_id, name'),
      supabase.from('groups').select('id, name'),
      supabase.from('group_members').select('group_id, user_id'),
    ]);
    if (!results || !profiles) return;

    const nameMap: Record<string, string> = {};
    profiles.forEach(p => { nameMap[p.user_id] = p.name || 'Sin nombre'; });

    const groupNameMap: Record<string, string> = {};
    (groupsData ?? []).forEach((g: any) => { groupNameMap[g.id] = g.name; });
    setGroups((groupsData ?? []) as any);

    const userToGroup: Record<string, string> = {};
    (members ?? []).forEach((m: any) => { userToGroup[m.user_id] = m.group_id; });

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
      .map(([user_id, data]) => {
        const gid = userToGroup[user_id] ?? null;
        return {
          user_id,
          total_score: data.total_score,
          name: nameMap[user_id] || 'Desconocido',
          group_id: gid,
          group_name: gid ? (groupNameMap[gid] ?? null) : null,
          quizzes: data.quizzes.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
        };
      })
      .sort((a, b) => b.total_score - a.total_score);

    setRanking(entries);

    // Group ranking aggregation
    const groupAgg: Record<string, { total_score: number; member_count: number }> = {};
    (groupsData ?? []).forEach((g: any) => { groupAgg[g.id] = { total_score: 0, member_count: 0 }; });
    (members ?? []).forEach((m: any) => {
      if (groupAgg[m.group_id]) groupAgg[m.group_id].member_count += 1;
    });
    entries.forEach(e => {
      if (e.group_id && groupAgg[e.group_id]) {
        groupAgg[e.group_id].total_score += e.total_score;
      }
    });

    const gEntries: GroupRankingEntry[] = Object.entries(groupAgg)
      .map(([gid, data]) => ({
        group_id: gid,
        group_name: groupNameMap[gid] ?? 'Grupo',
        total_score: data.total_score,
        member_count: data.member_count,
        avg_score: data.member_count > 0 ? Math.round(data.total_score / data.member_count) : 0,
      }))
      .sort((a, b) => b.total_score - a.total_score);
    setGroupRanking(gEntries);
  };

  useEffect(() => {
    fetchRanking();
    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_results' }, () => fetchRanking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchRanking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchRanking())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    const { error } = await supabase.from('quiz_results').delete().eq('user_id', deleteUserId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminado', description: 'Resultados del usuario eliminados del ranking' });
    setDeleteUserId(null);
    fetchRanking();
  };

  const getMedal = (idx: number) => {
    if (idx === 0) return <Trophy className="w-5 h-5 text-warning" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (idx === 2) return <Medal className="w-5 h-5 text-warning/60" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{idx + 1}</span>;
  };

  const toggleExpand = (userId: string) => {
    setExpandedUser(prev => prev === userId ? null : userId);
  };

  const isAdmin = userRole === 'admin';
  const filteredRanking = filterGroup === 'all'
    ? ranking
    : filterGroup === 'none'
      ? ranking.filter(e => !e.group_id)
      : ranking.filter(e => e.group_id === filterGroup);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ranking del equipo</h1>
        <p className="text-muted-foreground">Clasificación por puntaje acumulado</p>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="students" className="gap-2"><Trophy className="w-4 h-4" /> Por estudiante</TabsTrigger>
          <TabsTrigger value="groups" className="gap-2"><Users className="w-4 h-4" /> Por grupo</TabsTrigger>
        </TabsList>

        {/* STUDENTS TAB */}
        <TabsContent value="students" className="space-y-4 mt-4">
          {groups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar:</span>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estudiantes</SelectItem>
                  <SelectItem value="none">Sin grupo asignado</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className={`grid ${isAdmin ? 'grid-cols-[60px_1fr_140px_100px_40px_40px]' : 'grid-cols-[60px_1fr_140px_100px_40px]'} gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground`}>
              <span>#</span>
              <span>Nombre</span>
              <span>Grupo</span>
              <span className="text-right">Puntaje</span>
              <span></span>
              {isAdmin && <span></span>}
            </div>
            {filteredRanking.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No hay resultados</div>
            ) : (
              filteredRanking.map((entry, idx) => (
                <div key={entry.user_id}>
                  <div
                    className={`grid ${isAdmin ? 'grid-cols-[60px_1fr_140px_100px_40px_40px]' : 'grid-cols-[60px_1fr_140px_100px_40px]'} gap-4 p-4 items-center transition-colors hover:bg-secondary/50 ${idx === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-center">{getMedal(idx)}</div>
                    <span className="font-medium text-foreground cursor-pointer truncate" onClick={() => toggleExpand(entry.user_id)}>{entry.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {entry.group_name ? (
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{entry.group_name}</span>
                      ) : (
                        <span className="opacity-50">— sin grupo —</span>
                      )}
                    </span>
                    <span className="text-right font-bold text-primary">{entry.total_score}</span>
                    <div className="flex items-center justify-center text-muted-foreground cursor-pointer" onClick={() => toggleExpand(entry.user_id)}>
                      {expandedUser === entry.user_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(entry.user_id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
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
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_120px_100px_100px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
              <span>#</span>
              <span>Grupo</span>
              <span className="text-center">Miembros</span>
              <span className="text-right">Promedio</span>
              <span className="text-right">Total</span>
            </div>
            {groupRanking.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No hay grupos creados aún</div>
            ) : (
              groupRanking.map((g, idx) => (
                <div
                  key={g.group_id}
                  className={`grid grid-cols-[60px_1fr_120px_100px_100px] gap-4 p-4 items-center border-b border-border/30 last:border-0 ${idx === 0 ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-center">{getMedal(idx)}</div>
                  <span className="font-medium text-foreground truncate">{g.group_name}</span>
                  <span className="text-center text-sm text-muted-foreground">{g.member_count}</span>
                  <span className="text-right font-semibold text-foreground">{g.avg_score}</span>
                  <span className="text-right font-bold text-primary">{g.total_score}</span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar del ranking?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán todos los resultados de quizzes de este usuario del ranking. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
