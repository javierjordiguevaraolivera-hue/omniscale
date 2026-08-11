"use client";

import {
  CalendarRange,
  Facebook,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Solo el sidebar es cliente (necesita la ruta activa y el logout). El layout
// que lo usa es un server component y renderiza <main> con sus hijos aparte:
// así el contenido del servidor nunca cruza la frontera hacia un componente
// de cliente (si cruzara, los iconos de lucide romperían la serialización).

const navItems: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Histórico", href: "/history", icon: CalendarRange },
  { label: "Cuentas", href: "/accounts", icon: Wallet },
  { label: "BMs", href: "/bms", icon: Facebook },
  { label: "Conexiones", href: "/connections", icon: KeyRound },
  { label: "Logs", href: "/logs", icon: ScrollText },
  { label: "Ajustes", href: "/settings", icon: Settings },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = (email.slice(0, 2) || "OS").toUpperCase();

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/auth/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-outline-variant bg-surface-container-lowest px-xs py-md">
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
              {initials}
            </div>
            <span className="truncate text-label-md text-on-surface">{email}</span>
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
