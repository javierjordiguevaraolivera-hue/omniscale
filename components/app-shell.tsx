"use client";

import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Facebook,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Settings,
  Tags,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Solo la navegación es cliente (necesita la ruta activa y el logout). El layout
// que la usa es un server component y renderiza <main> con sus hijos aparte:
// así el contenido del servidor nunca cruza la frontera hacia un componente
// de cliente (si cruzara, los iconos de lucide romperían la serialización).

const navItems: {
  label: string;
  /** Etiqueta corta para la barra inferior, donde no cabe la larga. */
  corto?: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Histórico", href: "/history", icon: CalendarRange },
  { label: "Ofertas", href: "/offers", icon: Tags },
  { label: "Cuentas", href: "/accounts", icon: Wallet },
  { label: "Gastos", href: "/expenses", icon: Receipt },
  { label: "BMs", href: "/bms", icon: Facebook },
  { label: "Conexiones", corto: "Claves", href: "/connections", icon: KeyRound },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Ajustes", href: "/settings", icon: Settings },
];

function useLogout() {
  const router = useRouter();
  return useCallback(async () => {
    await createClient().auth.signOut();
    router.push("/auth/login");
  }, [router]);
}

const iniciales = (email: string) => (email.slice(0, 2) || "OS").toUpperCase();

/**
 * Navegación completa: barra lateral en escritorio, y en móvil y tablet una
 * cabecera arriba con el logo y una barra de pestañas abajo.
 *
 * El corte va en `lg` (1024px): un iPad en vertical (768) usa la barra inferior,
 * que es lo cómodo con el pulgar, y en horizontal ya entra la lateral.
 */
export function AppNav({ email }: { email: string }) {
  return (
    <>
      <Sidebar email={email} />
      <MobileHeader email={email} />
      <BottomNav />
    </>
  );
}

function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[260px] flex-col border-r border-outline-variant bg-surface-container-lowest px-xs py-md lg:flex">
      <div className="mb-xl px-sm">
        <Link href="/dashboard" className="block">
          <Image
            src="/omni-logo.png"
            alt="OMNI Scale"
            width={251}
            height={69}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <p className="mt-xs text-label-sm text-on-surface-variant opacity-70">
          Reporte de campañas
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center gap-3 border-l-4 border-brand-crimson bg-surface-container px-4 py-2 font-bold text-brand"
                  : "flex items-center gap-3 px-4 py-2 text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low hover:text-brand"
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-outline-variant px-4 pt-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-grow items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
              {iniciales(email)}
            </div>
            <span className="truncate text-label-md text-on-surface">
              {email}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-on-surface-variant transition-colors hover:text-error"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Cabecera de móvil y tablet: sustituye a la parte de arriba del sidebar. */
function MobileHeader({ email }: { email: string }) {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface-container-lowest/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3 px-md py-sm">
        <Link href="/dashboard" className="block shrink-0">
          <Image
            src="/omni-logo.png"
            alt="OMNI Scale"
            width={251}
            height={69}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container"
            title={email}
          >
            {iniciales(email)}
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1 text-on-surface-variant transition-colors hover:text-error"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Barra de pestañas inferior, deslizable.
 *
 * Son nueve secciones: en un teléfono no caben, así que se desliza. Dos detalles
 * que hacen que no se sienta rota: al entrar, la pestaña activa se centra sola
 * (si no, en /ajustes parecería que el menú empieza en "Panel" y no se ve dónde
 * estás), y las flechas de los extremos solo aparecen cuando de verdad queda
 * algo por deslizar hacia ese lado.
 */
function BottomNav() {
  const pathname = usePathname();
  const pista = useRef<HTMLDivElement>(null);
  const activo = useRef<HTMLAnchorElement>(null);
  const [masIzquierda, setMasIzquierda] = useState(false);
  const [masDerecha, setMasDerecha] = useState(false);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    // 4px de tolerancia: el scroll no siempre cae en enteros.
    setMasIzquierda(el.scrollLeft > 4);
    setMasDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    // `block: "nearest"` es clave: sin él, centrar en horizontal también
    // desplazaría la página en vertical.
    activo.current?.scrollIntoView({ inline: "center", block: "nearest" });
    medir();
  }, [pathname, medir]);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  const desplazar = (signo: number) => {
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: signo * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant bg-surface-container-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Secciones"
    >
      <div className="relative">
        {masIzquierda && (
          <button
            type="button"
            onClick={() => desplazar(-1)}
            aria-label="Ver secciones anteriores"
            className="absolute left-0 top-0 z-10 flex h-full w-8 items-center justify-start bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/90 to-transparent text-on-surface-variant"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={pista}
          onScroll={medir}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={active ? activo : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-[4.75rem] flex-1 snap-center flex-col items-center gap-1 px-2 pb-2 pt-2.5 transition-colors ${
                  active
                    ? "font-semibold text-brand"
                    : "text-on-surface-variant active:bg-surface-container-low"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-crimson" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap text-[11px] leading-none">
                  {item.corto ?? item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {masDerecha && (
          <button
            type="button"
            onClick={() => desplazar(1)}
            aria-label="Ver más secciones"
            className="absolute right-0 top-0 z-10 flex h-full w-8 items-center justify-end bg-gradient-to-l from-surface-container-lowest via-surface-container-lowest/90 to-transparent text-on-surface-variant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
