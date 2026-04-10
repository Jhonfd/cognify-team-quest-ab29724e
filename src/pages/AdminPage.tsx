import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, BookOpen, Shield, Plus, Pencil, Trash2, UserCog } from 'lucide-react';

type AppRole = 'admin' | 'student';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role?: AppRole;
}

interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct_index: number;
}

const DEFAULT_CATEGORIES = [
  { id: 'algebra', name: 'Álgebra', icon: '📐' },
  { id: 'geometry', name: 'Geometría', icon: '📏' },
  { id: 'physics', name: 'Física', icon: '⚡' },
  { id: 'chemistry', name: 'Química', icon: '🧪' },
  { id: 'biology', name: 'Biología', icon: '🧬' },
  { id: 'astronomy', name: 'Astronomía', icon: '🌌' },
  { id: 'computing', name: 'Sistemas & Computación', icon: '💻' },
];

export default function AdminPage() {
  const { userRole } = useAuth();
  const { toast } = useToast();

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Acceso restringido</h2>
        <p className="text-muted-foreground">Solo los administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona estudiantes, preguntas y roles</p>
      </div>
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students" className="gap-2"><Users className="w-4 h-4" /> Estudiantes</TabsTrigger>
          <TabsTrigger value="questions" className="gap-2"><BookOpen className="w-4 h-4" /> Preguntas</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><UserCog className="w-4 h-4" /> Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="students"><StudentsTab toast={toast} /></TabsContent>
        <TabsContent value="questions"><QuestionsTab toast={toast} /></TabsContent>
        <TabsContent value="roles"><RolesTab toast={toast} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================== STUDENTS TAB ==================== */
function StudentsTab({ toast }: { toast: any }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const fetch = async () => {
    const { data: profs } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (!profs) return;
    const roleMap: Record<string, AppRole> = {};
    roles?.forEach(r => { roleMap[r.user_id] = r.role as AppRole; });
    setProfiles(profs.map(p => ({ ...p, role: roleMap[p.user_id] })));
  };

  useEffect(() => { fetch(); }, []);

  const handleEdit = (p: Profile) => {
    setEditProfile(p);
    setEditName(p.name);
    setEditEmail(p.email);
  };

  const saveEdit = async () => {
    if (!editProfile) return;
    const { error } = await supabase.from('profiles').update({ name: editName, email: editEmail }).eq('id', editProfile.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Actualizado', description: 'Perfil actualizado correctamente' });
    setEditProfile(null);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('profiles').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminado', description: 'Perfil eliminado' });
    setDeleteId(null);
    fetch();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_80px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Nombre</span><span>Email</span><span>Rol</span><span>Acciones</span>
        </div>
        {profiles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay estudiantes registrados</div>
        ) : profiles.map(p => (
          <div key={p.id} className="grid grid-cols-[1fr_1fr_100px_80px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <span className="text-foreground font-medium truncate">{p.name || 'Sin nombre'}</span>
            <span className="text-muted-foreground truncate">{p.email}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full text-center ${p.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
              {p.role === 'admin' ? 'Admin' : 'Estudiante'}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onOpenChange={() => setEditProfile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar estudiante</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveEdit} className="gradient-primary text-primary-foreground">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el perfil del estudiante.</AlertDialogDescription>
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

/* ==================== QUESTIONS TAB ==================== */
function QuestionsTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; icon: string }[]>([]);

  // Form state
  const [fCategory, setFCategory] = useState('algebra');
  const [fCustomCategory, setFCustomCategory] = useState('');
  const [fUseCustom, setFUseCustom] = useState(false);
  const [fQuestion, setFQuestion] = useState('');
  const [fOptions, setFOptions] = useState(['', '', '', '']);
  const [fCorrect, setFCorrect] = useState(0);

  const fetchQ = async () => {
    const { data } = await supabase.from('questions').select('*').order('category').order('created_at');
    const qs = (data as Question[]) ?? [];
    setQuestions(qs);

    // Build dynamic categories from DB + defaults
    const dbCats = new Set(qs.map(q => q.category));
    const merged = [...DEFAULT_CATEGORIES];
    dbCats.forEach(cat => {
      if (!merged.find(c => c.id === cat)) {
        merged.push({ id: cat, name: cat, icon: '📝' });
      }
    });
    setAllCategories(merged);
  };

  useEffect(() => { fetchQ(); }, []);

  const filtered = filterCat === 'all' ? questions : questions.filter(q => q.category === filterCat);

  const openNew = () => {
    setEditing(null);
    setFCategory('algebra');
    setFCustomCategory('');
    setFUseCustom(false);
    setFQuestion('');
    setFOptions(['', '', '', '']);
    setFCorrect(0);
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    const isDefault = DEFAULT_CATEGORIES.find(c => c.id === q.category);
    if (isDefault) {
      setFCategory(q.category);
      setFUseCustom(false);
      setFCustomCategory('');
    } else {
      setFCategory('');
      setFUseCustom(true);
      setFCustomCategory(q.category);
    }
    setFQuestion(q.question);
    setFOptions([...q.options]);
    setFCorrect(q.correct_index);
    setDialogOpen(true);
  };

  const save = async () => {
    const finalCategory = fUseCustom ? fCustomCategory.trim().toLowerCase().replace(/\s+/g, '_') : fCategory;
    if (!finalCategory || !fQuestion.trim() || fOptions.some(o => !o.trim())) {
      toast({ title: 'Error', description: 'Completa todos los campos', variant: 'destructive' });
      return;
    }
    if (editing) {
      const { error } = await supabase.from('questions').update({
        category: finalCategory, question: fQuestion, options: fOptions, correct_index: fCorrect,
      }).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Actualizada', description: 'Pregunta actualizada' });
    } else {
      const { error } = await supabase.from('questions').insert({
        category: finalCategory, question: fQuestion, options: fOptions, correct_index: fCorrect, created_by: user?.id,
      });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Creada', description: 'Pregunta agregada' });
    }
    setDialogOpen(false);
    fetchQ();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('questions').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminada', description: 'Pregunta eliminada' });
    setDeleteId(null);
    fetchQ();
  };

  const catName = (id: string) => allCategories.find(c => c.id === id)?.name ?? id;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Nueva pregunta</Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Pregunta</span><span>Categoría</span><span>Acciones</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay preguntas</div>
        ) : filtered.map(q => (
          <div key={q.id} className="grid grid-cols-[1fr_120px_80px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <span className="text-foreground text-sm truncate">{q.question}</span>
            <span className="text-xs text-muted-foreground">{catName(q.category)}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex items-center gap-2 mb-2">
                <Button type="button" variant={!fUseCustom ? 'default' : 'outline'} size="sm" onClick={() => setFUseCustom(false)}>
                  Existente
                </Button>
                <Button type="button" variant={fUseCustom ? 'default' : 'outline'} size="sm" onClick={() => setFUseCustom(true)}>
                  Personalizada
                </Button>
              </div>
              {fUseCustom ? (
                <Input
                  value={fCustomCategory}
                  onChange={e => setFCustomCategory(e.target.value)}
                  placeholder="Nombre de la nueva temática (ej: Historia, Economía)"
                />
              ) : (
                <Select value={fCategory} onValueChange={setFCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pregunta</Label>
              <Input value={fQuestion} onChange={e => setFQuestion(e.target.value)} placeholder="Escribe la pregunta" />
            </div>
            {fOptions.map((opt, i) => (
              <div key={i} className="space-y-1">
                <Label className="flex items-center gap-2">
                  Opción {String.fromCharCode(65 + i)}
                  {i === fCorrect && <span className="text-xs text-green-400">(Correcta)</span>}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={e => { const n = [...fOptions]; n[i] = e.target.value; setFOptions(n); }}
                    placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={i === fCorrect ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFCorrect(i)}
                    className={i === fCorrect ? 'gradient-primary text-primary-foreground' : ''}
                  >
                    ✓
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={save} className="gradient-primary text-primary-foreground">
              {editing ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pregunta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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

/* ==================== ROLES TAB ==================== */
function RolesTab({ toast }: { toast: any }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [changingUser, setChangingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('student');

  const fetch = async () => {
    const { data: profs } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (!profs) return;
    const roleMap: Record<string, AppRole> = {};
    roles?.forEach(r => { roleMap[r.user_id] = r.role as AppRole; });
    setProfiles(profs.map(p => ({ ...p, role: roleMap[p.user_id] })));
  };

  useEffect(() => { fetch(); }, []);

  const openChange = (p: Profile) => {
    setChangingUser(p);
    setNewRole(p.role ?? 'student');
  };

  const saveRole = async () => {
    if (!changingUser) return;
    // Upsert: try update first, then insert if not exists
    const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', changingUser.user_id).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', changingUser.user_id));
    } else {
      ({ error } = await supabase.from('user_roles').insert({ user_id: changingUser.user_id, role: newRole }));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Rol actualizado', description: `${changingUser.name} ahora es ${newRole === 'admin' ? 'Administrador' : 'Estudiante'}` });
    setChangingUser(null);
    fetch();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_100px_80px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Nombre</span><span>Email</span><span>Rol actual</span><span>Cambiar</span>
        </div>
        {profiles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay usuarios</div>
        ) : profiles.map(p => (
          <div key={p.id} className="grid grid-cols-[1fr_1fr_100px_80px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <span className="text-foreground font-medium truncate">{p.name || 'Sin nombre'}</span>
            <span className="text-muted-foreground truncate">{p.email}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full text-center ${p.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
              {p.role === 'admin' ? 'Admin' : 'Estudiante'}
            </span>
            <Button variant="ghost" size="icon" onClick={() => openChange(p)}><Shield className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={!!changingUser} onOpenChange={() => setChangingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar rol de {changingUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewRole('student')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  newRole === 'student' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium">Estudiante</span>
              </button>
              <button
                type="button"
                onClick={() => setNewRole('admin')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  newRole === 'admin' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                <Shield className="w-6 h-6" />
                <span className="text-sm font-medium">Administrador</span>
              </button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveRole} className="gradient-primary text-primary-foreground">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
