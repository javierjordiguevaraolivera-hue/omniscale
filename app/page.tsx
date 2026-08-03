import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Blocks,
  Lightbulb,
  RefreshCw,
  Rocket,
  Sparkles,
  Upload,
} from "lucide-react";

const pasos = [
  {
    icono: Upload,
    titulo: "Importa y rankea",
    texto:
      "Traemos data histórica y rankeamos cada elemento publicitario por ROAS y conversiones.",
  },
  {
    icono: Blocks,
    titulo: "Construye campañas",
    texto:
      "La IA arma estructuras de campaña con audiencias, copies y creativos listos para escalar.",
  },
  {
    icono: Rocket,
    titulo: "Lanza y aprende",
    texto:
      "Lanzas variaciones en Meta y el sistema aprende en tiempo real para mejorar resultados.",
  },
];

const features = [
  {
    icono: BarChart3,
    titulo: "Analiza tu data histórica",
    texto: "La IA evalúa cada creativo, copy y audiencia con base en rendimiento real.",
  },
  {
    icono: Blocks,
    titulo: "Construye estructuras completas",
    texto: "Selecciona elementos top y genera campañas con ad sets y targets optimizados.",
  },
  {
    icono: Lightbulb,
    titulo: "Explica cada decisión",
    texto: "Transparencia total sobre por qué cada creativo y audiencia fue elegida.",
  },
  {
    icono: RefreshCw,
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
    <main className="flex min-h-screen flex-col bg-white text-[#0f172a]">
      {/* Barra de anuncio */}
      <div className="w-full bg-[#0d1526] px-4 py-2 text-center text-xs font-medium text-white">
        <span className="font-semibold">Oferta de lanzamiento:</span> 20% off +
        hasta 1,000 créditos de IA
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/omni-logo.png"
              alt="OMNI Scale"
              width={251}
              height={69}
              className="h-9 w-auto"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#plataforma" className="transition-colors hover:text-[#0f172a]">
              Plataforma
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-[#0f172a]">
              Cómo funciona
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-slate-600 transition-colors hover:text-[#0f172a]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#16243d] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ir al panel
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#f7f9fc] px-5 pb-24 pt-20">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-cell" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="rounded-full border border-blue-100 bg-blue-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
            Encuentra anuncios ganadores más rápido
          </span>
          <h1 className="mt-8 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            Agentes IA que lanzan 100+ variaciones en Meta en segundos.
          </h1>
          <p className="mt-6 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-3xl font-semibold leading-tight text-transparent md:text-5xl">
            Construido desde tus ganadores reales.
          </p>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-slate-600">
            OMNI Scale analiza campañas históricas, ordena creativos, copies y
            audiencias por rendimiento, y activa automáticamente combinaciones
            optimizadas.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#16243d] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90"
            >
              Empezar
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-[#0f172a] shadow-sm transition-colors hover:bg-slate-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="relative overflow-hidden px-5 py-20">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-cell opacity-60" />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Cómo funciona
          </h2>
          <p className="mt-3 text-center text-slate-600">
            Desde importar datos hasta lanzar campañas con IA en minutos.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pasos.map((p, i) => {
              const Icono = p.icono;
              return (
                <article
                  key={p.titulo}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#16243d]">
                      <Icono className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Paso {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{p.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {p.texto}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plataforma */}
      <section
        id="plataforma"
        className="relative overflow-hidden bg-[#f7f9fc] px-5 py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-cell" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <div className="flex flex-col gap-9">
            {features.map((f) => {
              const Icono = f.icono;
              return (
                <div key={f.titulo} className="flex gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#16243d]">
                    <Icono className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {f.titulo}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {f.texto}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mock del resumen de campaña */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between rounded-xl bg-[#0d1526] px-5 py-4">
              <p className="text-sm font-semibold text-white">
                Resumen de campaña IA
              </p>
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                Resumen
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-7 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h4 className="mt-4 text-xl font-bold tracking-tight">
                Tu campaña IA está lista
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Revisa la estrategia y valida cada sección.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[
                { v: "LEADS", l: "Objetivo" },
                { v: "10", l: "Ad Sets" },
                { v: "60", l: "Ads" },
              ].map((t) => (
                <div
                  key={t.l}
                  className="rounded-xl border border-slate-200 bg-white py-4"
                >
                  <p className="text-base font-bold">{t.v}</p>
                  <p className="text-xs text-slate-500">{t.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-sm font-bold text-emerald-800">
                Construido con ganadores probados
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {["$90.46", "$116.13", "$103.99"].map((v) => (
                  <div
                    key={v}
                    className="rounded-xl border border-emerald-100 bg-white py-3"
                  >
                    <p className="text-sm font-bold text-emerald-700">{v}</p>
                    <p className="text-xs text-slate-500">avg CPA</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estrategias */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Controla cómo la IA construye tus campañas
          </h2>
          <p className="mt-3 text-center text-slate-600">
            Define si la IA prioriza ganadores, explora ideas nuevas o combina ambos
            enfoques.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {estrategias.map((e) => (
              <article
                key={e.titulo}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <h3 className="mb-5 text-lg font-semibold">{e.titulo}</h3>
                <div className="flex flex-col gap-3">
                  {e.filas.map(([nombre, desc]) => (
                    <div
                      key={nombre}
                      className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3.5"
                    >
                      <span className="text-sm font-semibold">{nombre}</span>
                      <span className="text-right text-xs text-slate-500">
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
      <footer className="mt-auto border-t border-slate-200 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-slate-500 md:flex-row">
          <p>Derechos reservados · OMNI AGENCIA S.A.C - RUC 20612101648</p>
          <nav className="flex flex-wrap gap-5">
            <Link href="/terms-and-conditions" className="hover:text-[#0f172a]">
              Términos y Condiciones
            </Link>
            <Link href="/privacy-policy" className="hover:text-[#0f172a]">
              Política de Privacidad
            </Link>
            <Link href="/data-deletion-policy" className="hover:text-[#0f172a]">
              Política de Eliminación de Datos
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
