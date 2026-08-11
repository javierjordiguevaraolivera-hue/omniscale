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
 * `?rollup=1` consolida además el día de ayer y purga las capturas viejas. Va
 * en un solo cron a propósito: si lo hicieran los dos, el de 2 minutos gastaría
 * una consulta de más en cada corrida.
 *
 * Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente cuando la
 * env var CRON_SECRET está definida en el proyecto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const fuentes = parsearFuentes(params.get("fuentes"));
  const rollup = params.get("rollup");

  try {
    const result = await runIngest("cron", fuentes, {
      // Sin el parámetro, decide la propia corrida (las completas consolidan).
      rollup: rollup === null ? undefined : rollup === "1",
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
