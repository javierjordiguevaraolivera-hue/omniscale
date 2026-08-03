import { BarChart3, Sparkles, Zap } from "lucide-react";

const ventajas = [
  { Icono: Zap, texto: "Lanza cientos de variaciones de anuncios" },
  { Icono: Sparkles, texto: "Identifica los anuncios con mejor rendimiento" },
  { Icono: BarChart3, texto: "Las campañas aprenden y evolucionan" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      {/* Panel izquierdo (solo desktop) */}
      <div className="hidden lg:flex w-1/2 relative bg-black text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-left"
          style={{ backgroundImage: "url(/auth-pattern.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-center px-20 space-y-12 w-full">
          <div>
            <h1 className="text-4xl font-semibold">OMNI Scale</h1>
            <p className="mt-4 text-slate-300 max-w-sm">
              Testea, escala y automatiza tus campañas 10x más rápido.
            </p>
          </div>
          <div className="space-y-8 text-slate-300">
            {ventajas.map(({ Icono, texto }) => (
              <div key={texto} className="flex items-center gap-5">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                  <Icono className="h-5 w-5 text-white/80" strokeWidth={2} />
                </div>
                <span className="text-sm">{texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
