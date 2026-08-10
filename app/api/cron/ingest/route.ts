import { runIngest, type Fuentes } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Lo invoca el cron de Vercel (ver vercel.json).
 *
 * `?fuentes=everflow` solo trae conversiones y revenue; `?fuentes=gasto` solo
 * el gasto; sin parámetro trae todo. Sirve para correr cada fuente a su propia
 * frecuencia: Everflow refleja cada conversión en minutos, pero Windsor
 * actualiza el gasto cada ~6 horas.
 *
 * Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente cuando la
 * env var CRON_SECRET está definida en el proyecto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const pedido = new URL(request.url).searchParams.get("fuentes");
  const fuentes: Fuentes =
    pedido === "everflow" || pedido === "gasto" ? pedido : "todo";

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
