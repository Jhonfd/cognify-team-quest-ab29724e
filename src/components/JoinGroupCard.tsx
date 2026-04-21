import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, LogOut } from 'lucide-react';

interface MyGroup {
  id: string;
  name: string;
  description: string;
  member_id: string;
}

export default function JoinGroupCard() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [myGroup, setMyGroup] = useState<MyGroup | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMyGroup = async () => {
    if (!user) return;
    const { data: m } = await supabase
      .from('group_members')
      .select('id, group_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!m) { setMyGroup(null); return; }
    const { data: g } = await supabase
      .from('groups')
      .select('id, name, description')
      .eq('id', m.group_id)
      .maybeSingle();
    if (g) setMyGroup({ ...g, member_id: m.id });
  };

  useEffect(() => { fetchMyGroup(); }, [user]);

  if (userRole !== 'student') return null;

  const join = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);
    const { data: g, error: gErr } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.trim().toUpperCase())
      .maybeSingle();
    if (gErr || !g) {
      setLoading(false);
      return toast({ title: 'Código inválido', description: 'No existe un grupo con ese código', variant: 'destructive' });
    }
    const { error } = await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id });
    setLoading(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: '¡Te uniste!', description: `Ahora eres parte de ${g.name}` });
    setCode('');
    fetchMyGroup();
  };

  const leave = async () => {
    if (!myGroup) return;
    const { error } = await supabase.from('group_members').delete().eq('id', myGroup.member_id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Saliste del grupo' });
    fetchMyGroup();
  };

  return (
    <div className="glass-card p-5">
      {myGroup ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Tu grupo</p>
              <p className="font-bold text-foreground truncate">{myGroup.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={leave} className="gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Únete a un grupo</p>
              <p className="text-xs text-muted-foreground">Pide el código a tu profesor</p>
            </div>
          </div>
          <div className="flex gap-2 flex-1 min-w-[220px]">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={6}
              className="font-mono uppercase tracking-wider"
            />
            <Button onClick={join} disabled={!code.trim() || loading} className="gradient-primary text-primary-foreground">
              {loading ? '...' : 'Unirme'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
