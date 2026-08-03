import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: solo para uso en el servidor (cron, server actions).
 * Nunca importar desde componentes de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
