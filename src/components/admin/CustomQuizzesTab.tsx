import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Category { id: string; slug: string; name: string; icon: string; }
interface Question { id: string; category: string; question: string; }
interface CustomQuiz {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  is_active: boolean;
  created_by: string;
  question_ids: string[];
}

export default function CustomQuizzesTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<CustomQuiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomQuiz | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCatId, setFCatId] = useState<string>('none');
  const [fActive, setFActive] = useState(true);
  const [fSelectedQs, setFSelectedQs] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState<string>('all');

  const fetchAll = async () => {
    const [{ data: cats }, { data: qs }, { data: quizData }, { data: links }] = await Promise.all([
      supabase.from('categories').select('id, slug, name, icon').order('name'),
      supabase.from('questions').select('id, category, question').order('category'),
      supabase.from('custom_quizzes').select('*').order('created_at', { ascending: false }),
      supabase.from('custom_quiz_questions').select('quiz_id, question_id'),
    ]);
    setCategories((cats as Category[]) ?? []);
    setAllQuestions((qs as Question[]) ?? []);

    const linkMap: Record<string, string[]> = {};
    links?.forEach(l => {
      if (!linkMap[l.quiz_id]) linkMap[l.quiz_id] = [];
      linkMap[l.quiz_id].push(l.question_id);
    });

    setQuizzes(
      (quizData ?? []).map((q: any) => ({ ...q, question_ids: linkMap[q.id] ?? [] }))
    );
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => {
    setEditing(null);
    setFTitle(''); setFDesc(''); setFCatId('none'); setFActive(true); setFSelectedQs([]);
    setDialogOpen(true);
  };

  const openEdit = (q: CustomQuiz) => {
    setEditing(q);
    setFTitle(q.title); setFDesc(q.description); setFCatId(q.category_id ?? 'none');
    setFActive(q.is_active); setFSelectedQs([...q.question_ids]);
    setDialogOpen(true);
  };

  const toggleQ = (qId: string) => {
    setFSelectedQs(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const save = async () => {
    if (!fTitle.trim()) {
      toast({ title: 'Error', description: 'El título es requerido', variant: 'destructive' });
      return;
    }
    if (fSelectedQs.length === 0) {
      toast({ title: 'Error', description: 'Selecciona al menos una pregunta', variant: 'destructive' });
      return;
    }

    const catId = fCatId === 'none' ? null : fCatId;

    if (editing) {
      const { error } = await supabase.from('custom_quizzes').update({
        title: fTitle, description: fDesc, category_id: catId, is_active: fActive,
      }).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

      // Replace question links
      await supabase.from('custom_quiz_questions').delete().eq('quiz_id', editing.id);
      const links = fSelectedQs.map((qId, i) => ({ quiz_id: editing.id, question_id: qId, sort_order: i }));
      await supabase.from('custom_quiz_questions').insert(links);

      toast({ title: 'Actualizado', description: 'Quiz actualizado' });
    } else {
      const { data, error } = await supabase.from('custom_quizzes').insert({
        title: fTitle, description: fDesc, category_id: catId, is_active: fActive, created_by: user!.id,
      }).select('id').single();
      if (error || !data) { toast({ title: 'Error', description: error?.message ?? 'Error desconocido', variant: 'destructive' }); return; }

      const links = fSelectedQs.map((qId, i) => ({ quiz_id: data.id, question_id: qId, sort_order: i }));
      await supabase.from('custom_quiz_questions').insert(links);

      toast({ title: 'Creado', description: 'Quiz personalizado creado' });
    }
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('custom_quizzes').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminado', description: 'Quiz eliminado' });
    setDeleteId(null);
    fetchAll();
  };

  const toggleActive = async (q: CustomQuiz) => {
    await supabase.from('custom_quizzes').update({ is_active: !q.is_active }).eq('id', q.id);
    fetchAll();
  };

  const catName = (catId: string | null) => categories.find(c => c.id === catId)?.name ?? 'Mixto';

  const filteredQuestions = filterCat === 'all'
    ? allQuestions
    : allQuestions.filter(q => {
        const cat = categories.find(c => c.slug === q.category);
        return cat?.id === filterCat || q.category === filterCat;
      });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Nuevo quiz personalizado
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_80px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Título</span><span>Categoría</span><span>Preguntas</span><span>Acciones</span>
        </div>
        {quizzes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay quices personalizados</div>
        ) : quizzes.map(q => (
          <div key={q.id} className="grid grid-cols-[1fr_100px_80px_80px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <div>
              <span className="text-foreground font-medium">{q.title}</span>
              {!q.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>}
            </div>
            <span className="text-xs text-muted-foreground">{catName(q.category_id)}</span>
            <span className="text-sm text-muted-foreground">{q.question_ids.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => toggleActive(q)} title={q.is_active ? 'Desactivar' : 'Activar'}>
                {q.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>{editing ? 'Editar quiz' : 'Nuevo quiz personalizado'}</DialogTitle></DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2"><Label>Título</Label><Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Nombre del quiz" /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Descripción breve" /></div>
            <div className="space-y-2">
              <Label>Categoría (opcional)</Label>
              <Select value={fCatId} onValueChange={setFCatId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría (Mixto)</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={fActive} onCheckedChange={setFActive} />
              <Label>Quiz activo (visible para estudiantes)</Label>
            </div>

            <div className="space-y-2">
              <Label>Seleccionar preguntas ({fSelectedQs.length} seleccionadas)</Label>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="border border-border rounded-md max-h-[200px] overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No hay preguntas</div>
                ) : filteredQuestions.map(q => (
                  <label key={q.id} className="flex items-center gap-3 p-3 border-b border-border/30 last:border-0 cursor-pointer hover:bg-secondary/30">
                    <Checkbox
                      checked={fSelectedQs.includes(q.id)}
                      onCheckedChange={() => toggleQ(q.id)}
                    />
                    <span className="text-sm text-foreground flex-1 truncate">{q.question}</span>
                    <span className="text-xs text-muted-foreground">{q.category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={save} className="gradient-primary text-primary-foreground">
              {editing ? 'Guardar cambios' : 'Crear quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar quiz?</AlertDialogTitle>
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
