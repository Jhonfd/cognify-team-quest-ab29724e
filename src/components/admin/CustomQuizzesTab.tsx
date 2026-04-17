import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

interface Category { id: string; slug: string; name: string; icon: string; }
interface Question { id: string; category: string; question: string; options?: string[]; correct_index?: number; }
interface CustomQuiz {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  is_active: boolean;
  created_by: string;
  question_ids: string[];
}

interface DraftQuestion {
  tempId: string;
  question: string;
  options: string[];
  correct_index: number;
}

const STEPS = ['Información', 'Preguntas', 'Revisión'] as const;

export default function CustomQuizzesTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<CustomQuiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomQuiz | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1: Info + categoría
  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fActive, setFActive] = useState(true);
  const [catMode, setCatMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [fCatId, setFCatId] = useState<string>('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📚');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Step 2: Preguntas
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<string[]>([]);
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

  const resetWizard = () => {
    setStep(0);
    setFTitle(''); setFDesc(''); setFActive(true);
    setCatMode(categories.length > 0 ? 'existing' : 'new');
    setFCatId(categories[0]?.id ?? '');
    setNewCatName(''); setNewCatSlug(''); setNewCatIcon('📚'); setNewCatDesc('');
    setDraftQuestions([]); setSelectedExisting([]); setFilterCat('all');
  };

  const openNew = () => {
    setEditing(null);
    resetWizard();
    setDialogOpen(true);
  };

  const openEdit = (q: CustomQuiz) => {
    setEditing(q);
    setStep(0);
    setFTitle(q.title); setFDesc(q.description); setFActive(q.is_active);
    setCatMode(q.category_id ? 'existing' : 'none');
    setFCatId(q.category_id ?? '');
    setNewCatName(''); setNewCatSlug(''); setNewCatIcon('📚'); setNewCatDesc('');
    setDraftQuestions([]);
    setSelectedExisting([...q.question_ids]);
    setFilterCat('all');
    setDialogOpen(true);
  };

  /* ---------- Drafts ---------- */
  const addDraft = () => {
    setDraftQuestions(prev => [...prev, {
      tempId: crypto.randomUUID(),
      question: '',
      options: ['', '', '', ''],
      correct_index: 0,
    }]);
  };

  const updateDraft = (id: string, patch: Partial<DraftQuestion>) => {
    setDraftQuestions(prev => prev.map(d => d.tempId === id ? { ...d, ...patch } : d));
  };

  const removeDraft = (id: string) => {
    setDraftQuestions(prev => prev.filter(d => d.tempId !== id));
  };

  const toggleExisting = (qId: string) => {
    setSelectedExisting(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  /* ---------- Validation per step ---------- */
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!fTitle.trim()) return 'El título es requerido';
      if (catMode === 'existing' && !fCatId) return 'Selecciona una categoría existente';
      if (catMode === 'new') {
        if (!newCatName.trim()) return 'El nombre de la nueva categoría es requerido';
        if (!newCatSlug.trim()) return 'El slug de la nueva categoría es requerido';
      }
    }
    if (s === 1) {
      const totalQs = draftQuestions.length + selectedExisting.length;
      if (totalQs === 0) return 'Agrega al menos una pregunta (nueva o existente)';
      for (const d of draftQuestions) {
        if (!d.question.trim()) return 'Todas las preguntas nuevas deben tener enunciado';
        if (d.options.some(o => !o.trim())) return 'Todas las opciones de las preguntas nuevas deben tener texto';
      }
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { toast({ title: 'Error', description: err, variant: 'destructive' }); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep(s => Math.max(s - 1, 0));

  /* ---------- Save ---------- */
  const save = async () => {
    for (let s = 0; s <= 1; s++) {
      const err = validateStep(s);
      if (err) { toast({ title: 'Error', description: err, variant: 'destructive' }); setStep(s); return; }
    }

    let categoryIdToUse: string | null = null;
    let categorySlugForQuestions: string | null = null;

    if (catMode === 'existing') {
      categoryIdToUse = fCatId;
      categorySlugForQuestions = categories.find(c => c.id === fCatId)?.slug ?? null;
    } else if (catMode === 'new') {
      // Create category first
      const { data: newCat, error: catErr } = await supabase.from('categories').insert({
        slug: newCatSlug.trim().toLowerCase(),
        name: newCatName.trim(),
        icon: newCatIcon || '📚',
        description: newCatDesc,
      }).select('id, slug').single();
      if (catErr || !newCat) {
        toast({ title: 'Error al crear categoría', description: catErr?.message ?? 'desconocido', variant: 'destructive' });
        return;
      }
      categoryIdToUse = newCat.id;
      categorySlugForQuestions = newCat.slug;
    }

    // Insert new draft questions into bank
    let createdQuestionIds: string[] = [];
    if (draftQuestions.length > 0) {
      const slugForQs = categorySlugForQuestions ?? 'mixto';
      const payload = draftQuestions.map(d => ({
        category: slugForQs,
        question: d.question,
        options: d.options,
        correct_index: d.correct_index,
        created_by: user?.id ?? null,
      }));
      const { data: created, error: qErr } = await supabase.from('questions').insert(payload).select('id');
      if (qErr) {
        toast({ title: 'Error al crear preguntas', description: qErr.message, variant: 'destructive' });
        return;
      }
      createdQuestionIds = (created ?? []).map(c => c.id);
    }

    const allQIds = [...selectedExisting, ...createdQuestionIds];

    if (editing) {
      const { error } = await supabase.from('custom_quizzes').update({
        title: fTitle, description: fDesc, category_id: categoryIdToUse, is_active: fActive,
      }).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

      await supabase.from('custom_quiz_questions').delete().eq('quiz_id', editing.id);
      const links = allQIds.map((qId, i) => ({ quiz_id: editing.id, question_id: qId, sort_order: i }));
      if (links.length > 0) await supabase.from('custom_quiz_questions').insert(links);

      toast({ title: 'Actualizado', description: 'Quiz actualizado' });
    } else {
      const { data, error } = await supabase.from('custom_quizzes').insert({
        title: fTitle, description: fDesc, category_id: categoryIdToUse, is_active: fActive, created_by: user!.id,
      }).select('id').single();
      if (error || !data) {
        toast({ title: 'Error', description: error?.message ?? 'Error desconocido', variant: 'destructive' });
        return;
      }

      const links = allQIds.map((qId, i) => ({ quiz_id: data.id, question_id: qId, sort_order: i }));
      if (links.length > 0) await supabase.from('custom_quiz_questions').insert(links);

      toast({ title: 'Creado', description: `Quiz creado con ${allQIds.length} pregunta(s)` });
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

  const totalQsCount = draftQuestions.length + selectedExisting.length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Nuevo quiz personalizado
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_90px_100px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Título</span><span>Categoría</span><span>Preguntas</span><span>Acciones</span>
        </div>
        {quizzes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay quices personalizados</div>
        ) : quizzes.map(q => (
          <div key={q.id} className="grid grid-cols-[1fr_120px_90px_100px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <div>
              <span className="text-foreground font-medium">{q.title}</span>
              {!q.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>}
            </div>
            <span className="text-xs text-muted-foreground truncate">{catName(q.category_id)}</span>
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

      {/* Wizard Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar quiz' : 'Nuevo quiz personalizado'}</DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between px-2 py-3 border-b border-border">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step ? 'bg-primary text-primary-foreground' :
                    i === step ? 'gradient-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2 py-2">
            {/* STEP 0: Info + categoría */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título del quiz *</Label>
                  <Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Ej: Examen final de Cálculo" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Descripción breve" />
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Tabs value={catMode} onValueChange={(v) => setCatMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="existing">Existente</TabsTrigger>
                      <TabsTrigger value="new">Crear nueva</TabsTrigger>
                      <TabsTrigger value="none">Sin categoría</TabsTrigger>
                    </TabsList>
                    <TabsContent value="existing" className="pt-3">
                      <Select value={fCatId} onValueChange={setFCatId}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    <TabsContent value="new" className="pt-3 space-y-3">
                      <div className="grid grid-cols-[80px_1fr] gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Icono</Label>
                          <Input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} placeholder="📚" maxLength={2} className="text-center" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre *</Label>
                          <Input value={newCatName} onChange={e => {
                            setNewCatName(e.target.value);
                            if (!editing) setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                          }} placeholder="Ej: Cálculo" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Slug (identificador) *</Label>
                        <Input value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="ej: calculo" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Opcional" />
                      </div>
                    </TabsContent>
                    <TabsContent value="none" className="pt-3">
                      <p className="text-sm text-muted-foreground">El quiz será marcado como "Mixto" sin categoría asociada.</p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={fActive} onCheckedChange={setFActive} />
                  <Label>Quiz activo (visible para estudiantes)</Label>
                </div>
              </div>
            )}

            {/* STEP 1: Preguntas */}
            {step === 1 && (
              <Tabs defaultValue="new" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">Crear nuevas ({draftQuestions.length})</TabsTrigger>
                  <TabsTrigger value="bank">Del banco ({selectedExisting.length})</TabsTrigger>
                </TabsList>

                {/* New questions */}
                <TabsContent value="new" className="space-y-3 pt-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Las preguntas creadas aquí se guardarán también en el banco general.</p>
                    <Button size="sm" onClick={addDraft} className="gap-1"><Plus className="w-3 h-3" /> Agregar</Button>
                  </div>
                  {draftQuestions.length === 0 ? (
                    <div className="border border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground">
                      Aún no has creado preguntas nuevas
                    </div>
                  ) : draftQuestions.map((d, idx) => (
                    <div key={d.tempId} className="border border-border rounded-md p-3 space-y-2 bg-secondary/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground">Pregunta nueva #{idx + 1}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeDraft(d.tempId)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        value={d.question}
                        onChange={e => updateDraft(d.tempId, { question: e.target.value })}
                        placeholder="Escribe la pregunta"
                      />
                      {d.options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={opt}
                            onChange={e => {
                              const n = [...d.options]; n[i] = e.target.value;
                              updateDraft(d.tempId, { options: n });
                            }}
                            placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant={i === d.correct_index ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateDraft(d.tempId, { correct_index: i })}
                            className={i === d.correct_index ? 'gradient-primary text-primary-foreground' : ''}
                            title={i === d.correct_index ? 'Correcta' : 'Marcar como correcta'}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </TabsContent>

                {/* Existing bank */}
                <TabsContent value="bank" className="space-y-2 pt-3">
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="border border-border rounded-md max-h-[300px] overflow-y-auto">
                    {filteredQuestions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No hay preguntas en el banco</div>
                    ) : filteredQuestions.map(q => (
                      <label key={q.id} className="flex items-center gap-3 p-3 border-b border-border/30 last:border-0 cursor-pointer hover:bg-secondary/30">
                        <Checkbox
                          checked={selectedExisting.includes(q.id)}
                          onCheckedChange={() => toggleExisting(q.id)}
                        />
                        <span className="text-sm text-foreground flex-1 truncate">{q.question}</span>
                        <span className="text-xs text-muted-foreground">{q.category}</span>
                      </label>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* STEP 2: Revisión */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="glass-card p-4 space-y-2">
                  <h3 className="font-semibold text-foreground">Resumen del quiz</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Título:</span> <span className="text-foreground">{fTitle}</span></div>
                    {fDesc && <div><span className="text-muted-foreground">Descripción:</span> <span className="text-foreground">{fDesc}</span></div>}
                    <div>
                      <span className="text-muted-foreground">Categoría:</span>{' '}
                      <span className="text-foreground">
                        {catMode === 'existing' ? categories.find(c => c.id === fCatId)?.name :
                         catMode === 'new' ? `${newCatIcon} ${newCatName} (nueva)` :
                         'Sin categoría (Mixto)'}
                      </span>
                    </div>
                    <div><span className="text-muted-foreground">Estado:</span> <span className="text-foreground">{fActive ? 'Activo' : 'Inactivo'}</span></div>
                    <div><span className="text-muted-foreground">Total preguntas:</span> <span className="text-foreground font-bold">{totalQsCount}</span></div>
                    <div className="pl-3 text-xs text-muted-foreground">
                      • {draftQuestions.length} nuevas (se guardarán en el banco)<br />
                      • {selectedExisting.length} del banco existente
                    </div>
                  </div>
                </div>

                {totalQsCount === 0 && (
                  <p className="text-sm text-destructive">⚠ Debes agregar al menos una pregunta antes de guardar.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={back} disabled={step === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Atrás
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} className="gradient-primary text-primary-foreground gap-1">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={save} className="gradient-primary text-primary-foreground gap-1">
                  <Check className="w-4 h-4" /> {editing ? 'Guardar cambios' : 'Crear quiz'}
                </Button>
              )}
            </div>
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
