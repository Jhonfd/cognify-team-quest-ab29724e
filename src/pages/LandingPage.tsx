import { Brain, Trophy, BarChart3, Users, Sparkles, ShieldCheck, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: BookOpen,
    title: 'Quices dinámicos',
    description: 'Aprende con quices por categorías o personalizados creados por tus administradores.',
  },
  {
    icon: Trophy,
    title: 'Ranking en tiempo real',
    description: 'Compite con tu equipo y mira tu posición actualizarse al instante.',
  },
  {
    icon: BarChart3,
    title: 'Métricas de desempeño',
    description: 'Visualiza tasas de éxito, progreso y áreas de mejora de cada miembro.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles y seguridad',
    description: 'Administradores y estudiantes con permisos claros y autenticación verificada.',
  },
  {
    icon: Sparkles,
    title: 'Creación guiada',
    description: 'Asistente paso a paso para crear categorías, preguntas y quices en un solo flujo.',
  },
  {
    icon: Zap,
    title: 'Pensado para equipos',
    description: 'Diseñado para grupos pequeños enfocados en Ciencia, Matemáticas y Computación.',
  },
];

const stats = [
  { value: '3', label: 'Áreas temáticas' },
  { value: '∞', label: 'Quices personalizados' },
  { value: 'Live', label: 'Ranking en tiempo real' },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Cognify</span>
        </div>
        <Button onClick={onGetStarted} variant="ghost" className="text-foreground hover:text-primary">
          Iniciar sesión
        </Button>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm text-muted-foreground mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          Plataforma educativa para equipos
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]">
          Aprende, compite y{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            mide tu progreso
          </span>{' '}
          con tu equipo
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Cognify es la plataforma de quices interactivos para equipos enfocados en Ciencia,
          Matemáticas y Computación. Crea, aprende y rankea en un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onGetStarted}
            size="lg"
            className="gradient-primary text-primary-foreground glow-primary text-base px-8 h-12"
          >
            Comenzar ahora
          </Button>
          <Button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            variant="outline"
            size="lg"
            className="text-base px-8 h-12"
          >
            Conocer más
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-20">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-6">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Todo lo que tu equipo necesita</h2>
          <p className="text-muted-foreground text-lg">
            Una experiencia completa para administrar el aprendizaje y motivar a través del juego.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card p-6 hover:border-primary/40 transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">¿Cómo funciona?</h2>
          <p className="text-muted-foreground text-lg">Tres pasos para empezar a aprender en equipo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: '01', t: 'Crea tu cuenta', d: 'Regístrate y verifica tu correo electrónico para acceder.' },
            { n: '02', t: 'Resuelve quices', d: 'Elige por categoría o toma quices personalizados de tu admin.' },
            { n: '03', t: 'Sube en el ranking', d: 'Acumula puntos y supera a tus compañeros de equipo.' },
          ].map((s) => (
            <div key={s.n} className="glass-card p-8 relative overflow-hidden">
              <div className="text-6xl font-bold bg-gradient-to-r from-primary/30 to-accent/20 bg-clip-text text-transparent mb-4">
                {s.n}
              </div>
              <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="glass-card p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="relative">
            <div className="inline-flex w-14 h-14 rounded-2xl gradient-primary items-center justify-center glow-primary mb-6">
              <Users className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">¿Listo para comenzar?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Únete a tu equipo en Cognify y empieza a aprender de forma colaborativa hoy mismo.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="gradient-primary text-primary-foreground glow-primary text-base px-10 h-12"
            >
              Crear mi cuenta
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-border/50 mt-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Cognify</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cognify. Aprendizaje en equipo.
          </p>
        </div>
      </footer>
    </div>
  );
}
