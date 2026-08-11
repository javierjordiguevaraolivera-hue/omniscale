import { parsearFuentes, runIngest } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Lo invoca el cron de Vercel (ver vercel.json).
 *
 * `?fuentes=everflow,facebook` corre solo esas; sin parámetro corre todas.
 * Sirve para darle a cada fuente su propio ritmo: Everflow y Facebook son APIs
 * propias sin límite práctico y van cada 2 minutos, mientras Windsor sirve una
 * copia que solo refresca cada ~6 horas.
 *
 * Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente cuando la
 * env var CRON_SECRET está definida en el proyecto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const fuentes = parsearFuentes(
    new URL(request.url).searchParams.get("fuentes"),
  );

  try {
    const result = await runIngest("cron", fuentes);
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
