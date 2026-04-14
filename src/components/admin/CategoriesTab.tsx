import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
}

export default function CategoriesTab({ toast }: { toast: any }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [fSlug, setFSlug] = useState('');
  const [fName, setFName] = useState('');
  const [fIcon, setFIcon] = useState('📚');
  const [fDesc, setFDesc] = useState('');

  const fetchCats = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { fetchCats(); }, []);

  const openNew = () => {
    setEditing(null);
    setFSlug(''); setFName(''); setFIcon('📚'); setFDesc('');
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setFSlug(c.slug); setFName(c.name); setFIcon(c.icon); setFDesc(c.description);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!fSlug.trim() || !fName.trim()) {
      toast({ title: 'Error', description: 'Slug y nombre son requeridos', variant: 'destructive' });
      return;
    }
    if (editing) {
      const { error } = await supabase.from('categories').update({
        slug: fSlug, name: fName, icon: fIcon, description: fDesc,
      }).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Actualizada', description: 'Categoría actualizada' });
    } else {
      const { error } = await supabase.from('categories').insert({
        slug: fSlug, name: fName, icon: fIcon, description: fDesc,
      });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Creada', description: 'Categoría agregada' });
    }
    setDialogOpen(false);
    fetchCats();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminada', description: 'Categoría eliminada' });
    setDeleteId(null);
    fetchCats();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Nueva categoría
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[50px_1fr_1fr_80px] gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
          <span>Icono</span><span>Nombre</span><span>Slug</span><span>Acciones</span>
        </div>
        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No hay categorías</div>
        ) : categories.map(c => (
          <div key={c.id} className="grid grid-cols-[50px_1fr_1fr_80px] gap-4 p-4 items-center border-b border-border/30 last:border-0">
            <span className="text-2xl">{c.icon}</span>
            <span className="text-foreground font-medium">{c.name}</span>
            <span className="text-muted-foreground text-sm">{c.slug}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Slug (identificador único)</Label><Input value={fSlug} onChange={e => setFSlug(e.target.value)} placeholder="ej: trigonometry" /></div>
            <div className="space-y-2"><Label>Nombre</Label><Input value={fName} onChange={e => setFName(e.target.value)} placeholder="ej: Trigonometría" /></div>
            <div className="space-y-2"><Label>Icono (emoji)</Label><Input value={fIcon} onChange={e => setFIcon(e.target.value)} placeholder="📚" /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Descripción de la categoría" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={save} className="gradient-primary text-primary-foreground">
              {editing ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Las preguntas asociadas no se eliminarán.</AlertDialogDescription>
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
