import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { hasEnvVars } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Panel" },
  { href: "/history", label: "Histórico" },
  { href: "/accounts", label: "Cuentas" },
  { href: "/connections", label: "Conexiones" },
  { href: "/settings", label: "Ajustes" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasEnvVars) return <FaltanEnvVars />;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login");

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
          <Link href="/dashboard" className="shrink-0">
            <Image
              src="/omniscale-logo.png"
              alt="OMNI Scale"
              width={112}
              height={62}
              className="h-9 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1 text-sm overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground whitespace-nowrap"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {String(data.claims.email ?? "")}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 py-8">{children}</main>
    </div>
  );
}

function FaltanEnvVars() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">Falta conectar Supabase</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Define estas variables de entorno y vuelve a cargar. En local van en{" "}
          <code>.env.local</code>; en Vercel, en Project Settings → Environment
          Variables.
        </p>
        <ul className="mt-4 flex flex-col gap-1 text-xs font-mono text-muted-foreground">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
          <li>CRON_SECRET</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          Después ejecuta <code>supabase/schema.sql</code> en el SQL Editor del
          proyecto para crear las tablas.
        </p>
      </div>
    </div>
  );
}
