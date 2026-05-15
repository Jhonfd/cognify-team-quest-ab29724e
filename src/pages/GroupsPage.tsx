import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Users, Copy, UserPlus, UserMinus, Shield } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  invite_code: string;
  teacher_id: string;
  teacher_name?: string;
  member_count: number;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  joined_at: string;
}

interface ProfileLite { user_id: string; name: string; email: string; }

export default function GroupsPage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileLite>>({});
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [membersOf, setMembersOf] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [allStudents, setAllStudents] = useState<ProfileLite[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    const [{ data: groupsData }, { data: profs }, { data: gm }] = await Promise.all([
      supabase
        .from('groups')
        .select('id, name, description, teacher_id, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, name, email'),
      supabase.from('group_members').select('group_id, user_id'),
    ]);

    const pmap: Record<string, ProfileLite> = {};
    (profs ?? []).forEach((p: any) => { pmap[p.user_id] = p; });
    setProfileMap(pmap);

    const counts: Record<string, number> = {};
    const assigned = new Set<string>();
    (gm ?? []).forEach((m: any) => {
      counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
      assigned.add(m.user_id);
    });
    setAssignedIds(assigned);

    // Fetch invite codes via RPC (only returned for groups the caller owns or if admin)
    const codeEntries = await Promise.all(
      (groupsData ?? []).map(async (g: any) => {
        const { data } = await supabase.rpc('get_group_invite_code', { p_group_id: g.id });
        return [g.id, (data as string) ?? ''] as const;
      })
    );
    const codeMap: Record<string, string> = Object.fromEntries(codeEntries);

    const gs: Group[] = (groupsData ?? []).map((g: any) => ({
      ...g,
      invite_code: codeMap[g.id] ?? '',
      teacher_name: pmap[g.teacher_id]?.name || 'Desconocido',
      member_count: counts[g.id] ?? 0,
    }));
    setGroups(gs);

    // Filter students only for assignment list
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const studentIds = new Set((roles ?? []).filter((r: any) => r.role === 'student').map((r: any) => r.user_id));
    setAllStudents((profs ?? []).filter((p: any) => studentIds.has(p.user_id)));
  };

  useEffect(() => { fetchData(); }, []);

  if (userRole !== 'teacher' && userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Acceso restringido</h2>
        <p className="text-muted-foreground">Solo profesores y administradores pueden gestionar grupos.</p>
      </div>
    );
  }

  const fetchMembers = async (groupId: string) => {
    const { data } = await supabase.from('group_members').select('*').eq('group_id', groupId).order('joined_at');
    const ms: Member[] = (data ?? []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      joined_at: m.joined_at,
      name: profileMap[m.user_id]?.name || 'Sin nombre',
      email: profileMap[m.user_id]?.email || '',
    }));
    setMembers(ms);
  };

  const openNew = () => {
    setEditing(null);
    setFName('');
    setFDesc('');
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setFName(g.name);
    setFDesc(g.description);
    setDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!fName.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    if (editing) {
      const { error } = await supabase.from('groups').update({ name: fName, description: fDesc }).eq('id', editing.id);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      toast({ title: 'Actualizado', description: 'Grupo actualizado' });
    } else {
      const { error } = await supabase.from('groups').insert({ name: fName, description: fDesc, teacher_id: user!.id });
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      toast({ title: 'Creado', description: 'Grupo creado correctamente' });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('groups').delete().eq('id', deleteId);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Eliminado', description: 'Grupo eliminado' });
    setDeleteId(null);
    fetchData();
  };

  const openMembers = async (g: Group) => {
    setMembersOf(g);
    await fetchMembers(g.id);
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('group_members').delete().eq('id', memberId);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Eliminado', description: 'Estudiante removido del grupo' });
    if (membersOf) {
      fetchMembers(membersOf.id);
      fetchData();
    }
  };

  const addStudent = async () => {
    if (!selectedStudent || !membersOf) return;
    const { error } = await supabase.from('group_members').insert({ group_id: membersOf.id, user_id: selectedStudent });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Agregado', description: 'Estudiante agregado al grupo' });
    setAddOpen(false);
    setSelectedStudent('');
    fetchMembers(membersOf.id);
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copiado', description: `Código ${code} copiado al portapapeles` });
  };

  const myGroups = userRole === 'admin' ? groups : groups.filter(g => g.teacher_id === user?.id);
  const availableStudents = allStudents.filter(s => !assignedIds.has(s.user_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' ? 'Todos los grupos del sistema' : 'Gestiona tus grupos de estudiantes'}
          </p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Nuevo grupo
        </Button>
      </div>

      {myGroups.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no has creado ningún grupo</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myGroups.map(g => (
            <div key={g.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{g.name}</h3>
                  {g.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{g.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(g.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {userRole === 'admin' && (
                <p className="text-xs text-muted-foreground">Profesor: {g.teacher_name}</p>
              )}

              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/40 border border-border/50">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Código de invitación</p>
                  <p className="font-mono font-bold text-primary text-sm truncate">{g.invite_code}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyCode(g.invite_code)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={() => openMembers(g)}>
                <Users className="w-4 h-4" /> {g.member_count} {g.member_count === 1 ? 'estudiante' : 'estudiantes'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="Ej. 5° A — Matemáticas" />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Detalles del grupo" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveGroup} className="gradient-primary text-primary-foreground">
              {editing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={!!membersOf} onOpenChange={(open) => { if (!open) setMembersOf(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Miembros de {membersOf?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{members.length} estudiantes</p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <UserPlus className="w-4 h-4" /> Agregar
              </Button>
            </div>
            <div className="rounded-lg border border-border max-h-[50vh] overflow-y-auto">
              {members.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Sin miembros aún. Comparte el código de invitación o agrega manualmente.</p>
              ) : members.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 border-b border-border/30 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMember(m.id)}>
                    <UserMinus className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add student dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar estudiante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Estudiantes disponibles (sin grupo)</Label>
            {availableStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center bg-secondary/30 rounded">Todos los estudiantes ya están en algún grupo.</p>
            ) : (
              <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pr-1">
                {availableStudents.map(s => (
                  <button
                    key={s.user_id}
                    type="button"
                    onClick={() => setSelectedStudent(s.user_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedStudent === s.user_id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-secondary/30 hover:border-muted-foreground/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{s.name || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={addStudent} disabled={!selectedStudent} className="gradient-primary text-primary-foreground">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los estudiantes ya no estarán vinculados a este grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
