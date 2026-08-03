import { runIngest } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Lo invoca el cron de Vercel cada minuto (ver vercel.json).
 * Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente
 * cuando la env var CRON_SECRET está definida en el proyecto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngest();
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
