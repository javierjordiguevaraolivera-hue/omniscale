import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app-shell";
import { hasEnvVars } from "@/lib/utils";

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
    <div className="min-h-screen bg-surface-bright text-on-surface">
      <Sidebar email={String(data.claims.email ?? "")} />
      <main className="ml-[260px] min-h-screen px-lg pb-lg pt-lg">{children}</main>
    </div>
  );
}

function FaltanEnvVars() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bright p-6">
      <div className="max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h1 className="text-headline-sm text-brand">Falta conectar Supabase</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Define estas variables de entorno y vuelve a cargar. En local van en{" "}
          <code>.env.local</code>; en Vercel, en Project Settings → Environment
          Variables.
        </p>
        <ul className="mt-4 flex flex-col gap-1 font-mono text-label-sm text-on-surface-variant">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
          <li>CRON_SECRET</li>
        </ul>
        <p className="mt-4 text-body-md text-on-surface-variant">
          Después ejecuta en orden los archivos de{" "}
          <code>supabase/migrations/</code> en el SQL Editor del proyecto.
        </p>
      </div>
    </div>
  );
}
