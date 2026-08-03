import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const pasos = [
  {
    titulo: "Importa y rankea",
    texto:
      "Traemos data histórica y rankeamos cada elemento publicitario por ROAS y conversiones.",
  },
  {
    titulo: "Construye campañas",
    texto:
      "La IA arma estructuras de campaña con audiencias, copies y creativos listos para escalar.",
  },
  {
    titulo: "Lanza y aprende",
    texto:
      "Lanzas variaciones en Meta y el sistema aprende en tiempo real para mejorar resultados.",
  },
];

const features = [
  {
    titulo: "Analiza tu data histórica",
    texto: "La IA evalúa cada creativo, copy y audiencia con base en rendimiento real.",
  },
  {
    titulo: "Construye estructuras completas",
    texto: "Selecciona elementos top y genera campañas con ad sets y targets optimizados.",
  },
  {
    titulo: "Explica cada decisión",
    texto: "Transparencia total sobre por qué cada creativo y audiencia fue elegida.",
  },
  {
    titulo: "Aprendizaje continuo",
    texto: "Cada resultado nuevo mejora al sistema para que tu siguiente campaña rinda mejor.",
  },
];

const estrategias = [
  {
    titulo: "Estrategia de audiencia",
    filas: [
      ["Conservadora", "Solo audiencias con mejor rendimiento"],
      ["Balanceada", "Ganadores + audiencias nuevas"],
      ["Experimental", "Prueba audiencias nuevas"],
    ],
  },
  {
    titulo: "Estrategia de copy y creativo",
    filas: [
      ["Conservadora", "Copy y creativos probados"],
      ["Balanceada", "Top creativos + copy nuevo"],
      ["Experimental", "Genera copy totalmente nuevo"],
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Barra de anuncio */}
      <div className="w-full bg-primary text-primary-foreground text-center text-sm py-2 px-4">
        <span className="font-semibold">Oferta de lanzamiento:</span> 20% off +
        hasta 1,000 créditos de IA
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/omniscale-logo.png"
              alt="OMNI Scale"
              width={128}
              height={71}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#plataforma" className="hover:text-foreground">Plataforma</a>
            <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl">
              <Link href="/dashboard">Ir al panel</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 pt-20 pb-16 text-center bg-gradient-to-b from-secondary to-background">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
          <span className="inline-block rounded-full border border-border bg-background px-4 py-1 text-xs font-medium text-muted-foreground">
            Encuentra anuncios ganadores más rápido
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0f172a]">
            Agentes IA que lanzan 100+ variaciones en Meta en segundos.
          </h1>
          <p className="text-lg font-medium text-muted-foreground">
            Construido desde tus ganadores reales.
          </p>
          <p className="max-w-2xl text-muted-foreground">
            OMNI Scale analiza campañas históricas, ordena creativos, copies y
            audiencias por rendimiento, y activa automáticamente combinaciones
            optimizadas.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="rounded-xl px-8">
              <Link href="/dashboard">Empezar</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-8">
              <Link href="/auth/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="px-5 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center">Cómo funciona</h2>
          <p className="text-center text-muted-foreground mt-2">
            Desde importar datos hasta lanzar campañas con IA en minutos.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {pasos.map((p, i) => (
              <article
                key={p.titulo}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-lg">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground mt-2">{p.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Plataforma */}
      <section id="plataforma" className="px-5 py-16 bg-muted">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8">
            {features.map((f) => (
              <div key={f.titulo}>
                <h3 className="font-semibold text-xl">{f.titulo}</h3>
                <p className="text-muted-foreground mt-1">{f.texto}</p>
              </div>
            ))}
          </div>
          {/* Mock de resumen de campaña */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Resumen de campaña IA
            </p>
            <h4 className="text-lg font-semibold mt-2">Tu campaña IA está lista</h4>
            <p className="text-sm text-muted-foreground">
              Revisa la estrategia y valida cada sección.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-5 text-center">
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-bold">LEADS</p>
                <p className="text-xs text-muted-foreground">Objetivo</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-bold">10</p>
                <p className="text-xs text-muted-foreground">Ad Sets</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-bold">60</p>
                <p className="text-xs text-muted-foreground">Ads</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              Construido con ganadores probados
            </p>
            <div className="grid grid-cols-3 gap-3 mt-2 text-center">
              {["$90.46", "$116.13", "$103.99"].map((v) => (
                <div key={v} className="rounded-xl border border-border p-3">
                  <p className="font-semibold">{v}</p>
                  <p className="text-xs text-muted-foreground">avg CPA</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Estrategias */}
      <section className="px-5 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center">
            Controla cómo la IA construye tus campañas
          </h2>
          <p className="text-center text-muted-foreground mt-2">
            Define si la IA prioriza ganadores, explora ideas nuevas o combina
            ambos enfoques.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {estrategias.map((e) => (
              <article
                key={e.titulo}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="font-semibold text-lg mb-4">{e.titulo}</h3>
                <div className="flex flex-col gap-3">
                  {e.filas.map(([nombre, desc]) => (
                    <div
                      key={nombre}
                      className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3"
                    >
                      <span className="font-medium text-sm">{nombre}</span>
                      <span className="text-xs text-muted-foreground text-right">
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border px-5 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            Derechos reservados · OMNI AGENCIA S.A.C - RUC 20612101648
          </p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/terms-and-conditions" className="hover:text-foreground">
              Términos y Condiciones
            </Link>
            <Link href="/privacy-policy" className="hover:text-foreground">
              Política de Privacidad
            </Link>
            <Link href="/data-deletion-policy" className="hover:text-foreground">
              Política de Eliminación de Datos
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
