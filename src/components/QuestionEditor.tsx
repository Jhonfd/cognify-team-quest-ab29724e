import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Plus } from 'lucide-react';

export type QuestionType = 'single' | 'multiple' | 'boolean' | 'open';

export interface EditableQuestion {
  question: string;
  question_type: QuestionType;
  options: string[];
  correct_indices: number[];
  correct_answers: string[];
}

export const emptyQuestion = (): EditableQuestion => ({
  question: '',
  question_type: 'single',
  options: ['', '', '', ''],
  correct_indices: [0],
  correct_answers: [],
});

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Opción múltiple (una correcta)',
  multiple: 'Opción múltiple (varias correctas)',
  boolean: 'Verdadero o falso',
  open: 'Respuesta abierta',
};

export function validateQuestion(q: EditableQuestion): string | null {
  if (!q.question.trim()) return 'Todas las preguntas deben tener enunciado';
  if (q.question_type === 'open') return null;
  if (q.question_type === 'boolean') {
    if (q.correct_indices.length !== 1) return 'En verdadero/falso marca la respuesta correcta';
    return null;
  }
  if (q.options.some(o => !o.trim())) return 'Todas las opciones deben tener texto';
  if (q.correct_indices.length === 0) return 'Marca al menos una respuesta correcta';
  if (q.question_type === 'single' && q.correct_indices.length !== 1) return 'En opción única marca solo una correcta';
  return null;
}

interface Props {
  value: EditableQuestion;
  onChange: (patch: Partial<EditableQuestion>) => void;
  onRemove?: () => void;
  index?: number;
}

export default function QuestionEditor({ value, onChange, onRemove, index }: Props) {
  const setType = (t: QuestionType) => {
    if (t === 'boolean') {
      onChange({
        question_type: t,
        options: ['Verdadero', 'Falso'],
        correct_indices: [0],
      });
    } else if (t === 'open') {
      onChange({
        question_type: t,
        options: [],
        correct_indices: [],
      });
    } else {
      // single or multiple → ensure 4 options if currently empty/boolean
      const opts = value.options.length >= 2 && !(value.options[0] === 'Verdadero')
        ? value.options
        : ['', '', '', ''];
      onChange({
        question_type: t,
        options: opts,
        correct_indices: t === 'single' ? [value.correct_indices[0] ?? 0] : value.correct_indices,
      });
    }
  };

  const toggleCorrect = (i: number) => {
    if (value.question_type === 'multiple') {
      const next = value.correct_indices.includes(i)
        ? value.correct_indices.filter(x => x !== i)
        : [...value.correct_indices, i].sort((a, b) => a - b);
      onChange({ correct_indices: next });
    } else {
      onChange({ correct_indices: [i] });
    }
  };

  const updateOption = (i: number, v: string) => {
    const n = [...value.options];
    n[i] = v;
    onChange({ options: n });
  };

  const addOption = () => onChange({ options: [...value.options, ''] });
  const removeOption = (i: number) => {
    if (value.options.length <= 2) return;
    const n = value.options.filter((_, idx) => idx !== i);
    onChange({
      options: n,
      correct_indices: value.correct_indices.filter(x => x !== i).map(x => (x > i ? x - 1 : x)),
    });
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-3 bg-secondary/20">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">
          {index !== undefined ? `Pregunta #${index + 1}` : 'Pregunta'}
        </span>
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <X className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Tipo de pregunta</Label>
        <Select value={value.question_type} onValueChange={(v) => setType(v as QuestionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map(t => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Enunciado</Label>
        <Textarea
          value={value.question}
          onChange={e => onChange({ question: e.target.value })}
          placeholder="Escribe la pregunta"
          className="min-h-[60px]"
        />
      </div>

      {value.question_type === 'open' && (
        <div className="text-xs text-muted-foreground border border-dashed border-border rounded p-3">
          📝 El estudiante escribirá una respuesta de texto libre. El profesor la revisará y calificará manualmente después.
        </div>
      )}

      {value.question_type === 'boolean' && (
        <div className="space-y-2">
          <Label className="text-xs">Respuesta correcta</Label>
          <div className="grid grid-cols-2 gap-2">
            {['Verdadero', 'Falso'].map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ correct_indices: [i] })}
                className={`p-3 rounded-md border-2 font-medium transition-all ${
                  value.correct_indices[0] === i
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {(value.question_type === 'single' || value.question_type === 'multiple') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              Opciones {value.question_type === 'multiple' && '(marca todas las correctas)'}
            </Label>
            <Button type="button" size="sm" variant="ghost" onClick={addOption} className="gap-1 h-7">
              <Plus className="w-3 h-3" /> Opción
            </Button>
          </div>
          {value.options.map((opt, i) => {
            const isCorrect = value.correct_indices.includes(i);
            return (
              <div key={i} className="flex gap-2 items-center">
                {value.question_type === 'multiple' ? (
                  <Checkbox checked={isCorrect} onCheckedChange={() => toggleCorrect(i)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleCorrect(i)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isCorrect ? 'border-primary bg-primary' : 'border-border'
                    }`}
                    title="Marcar como correcta"
                  >
                    {isCorrect && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                )}
                <Input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                  className="flex-1"
                />
                {value.options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
