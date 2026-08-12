/**
 * Gastos que NO son de ads: suscripciones, herramientas, contabilidad.
 *
 * Se descuentan del resultado MENSUAL, nunca del día. El panel de hoy sigue
 * siendo gasto de ads contra revenue y nada más: un cobro de $200 de una
 * herramienta no puede hacer ver un martes en pérdida.
 *
 * No hay tabla de cargos mes a mes a propósito. Todo se deduce de cuatro datos
 * (día de cobro, inicio, activo, pagado_hasta), así que no hay que mantener
 * contabilidad a mano ni acordarse de marcar nada.
 */

export type Gasto = {
  id: string;
  nombre: string;
  motivo: string;
  categoria: string;
  monto: number;
  tipo: "suscripcion" | "unico";
  dia_cobro: number | null;
  inicio: string; // YYYY-MM-DD
  activo: boolean;
  pagado_hasta: string | null; // YYYY-MM-DD
  notas: string;
};

/** Categorías sugeridas. Es texto libre: la lista solo ayuda a no inventar. */
export const CATEGORIAS = [
  "herramientas",
  "tracking",
  "contabilidad",
  "infraestructura",
  "publicidad no-ads",
  "otros",
] as const;

/** Último día de un mes (mes 1-based). Se usa para el día 31 en febrero. */
const ultimoDia = (anio: number, mes: number) =>
  new Date(Date.UTC(anio, mes, 0)).getUTCDate();

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Mes de una fecha ISO: "2026-08-12" -> "2026-08". */
export const mesDe = (iso: string) => iso.slice(0, 7);

/**
 * Fecha del cobro de un gasto en un mes dado.
 *
 * Si el mes no tiene ese día — cobro el 31 en febrero — se ajusta al último día
 * del mes, que es lo que hacen las plataformas.
 */
export function fechaDeCobro(mesISO: string, diaCobro: number): string {
  const [anio, mes] = mesISO.split("-").map(Number);
  const dia = Math.min(diaCobro, ultimoDia(anio, mes));
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/**
 * ¿Cuánto de este gasto cae en el mes indicado?
 *
 * Un gasto único cuenta en el mes de su fecha de inicio. Una suscripción cuenta
 * si su cobro de ese mes está dentro de la ventana viva: desde `inicio`, y —si
 * ya se apagó— hasta `pagado_hasta` inclusive.
 *
 * Por qué `<= pagado_hasta` es lo correcto y no un off-by-one: si cobra el 14 y
 * lo apagas el 20 de agosto, lo pagado cubre hasta el 13 de septiembre; el cobro
 * del 14 de agosto ya ocurrió y cuenta, el del 14 de septiembre no. Y si lo
 * apagas el 12 de agosto, lo pagado llega al 13 de agosto y el cobro del 14 ya
 * no cuenta. Las dos situaciones salen bien con la misma regla.
 */
export function montoEnMes(g: Gasto, mesISO: string): number {
  if (g.tipo === "unico") {
    return mesDe(g.inicio) === mesISO ? g.monto : 0;
  }
  if (g.dia_cobro === null) return 0;

  const cobro = fechaDeCobro(mesISO, g.dia_cobro);
  if (cobro < g.inicio) return 0;
  if (!g.activo) {
    if (!g.pagado_hasta || cobro > g.pagado_hasta) return 0;
  }
  return g.monto;
}

/** Total de gastos no-ads de un mes. */
export const totalDelMes = (gastos: Gasto[], mesISO: string) =>
  gastos.reduce((t, g) => t + montoEnMes(g, mesISO), 0);

/** Meses (más reciente primero) que toca un rango de días, ambos inclusive. */
export function mesesDelRango(desde: string, hasta: string): string[] {
  const meses: string[] = [];
  let [anio, mes] = desde.split("-").map(Number);
  const limite = mesDe(hasta);
  for (let i = 0; i < 120; i++) {
    const actual = `${anio}-${dosDigitos(mes)}`;
    meses.push(actual);
    if (actual >= limite) break;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return meses.reverse();
}

export type EstadoGasto = {
  texto: string;
  tono: "ok" | "pendiente" | "apagado" | "terminado";
};

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Estado en palabras, deducido. Contesta las dos preguntas que importan: ¿ya me
 * cobraron este mes? y ¿me van a volver a cobrar?
 */
export function estadoDeGasto(g: Gasto, hoy: string): EstadoGasto {
  if (g.tipo === "unico") {
    return g.inicio <= hoy
      ? { texto: `Cobro único · ${dm(g.inicio)}`, tono: "terminado" }
      : { texto: `Cobro único · el ${dm(g.inicio)}`, tono: "pendiente" };
  }

  if (!g.activo) {
    if (g.pagado_hasta && g.pagado_hasta >= hoy) {
      return {
        texto: `Apagado · vigente hasta ${dm(g.pagado_hasta)} · sin más cobros`,
        tono: "apagado",
      };
    }
    return {
      texto: g.pagado_hasta ? `Terminado ${dm(g.pagado_hasta)}` : "Apagado",
      tono: "terminado",
    };
  }

  const cobro = fechaDeCobro(mesDe(hoy), g.dia_cobro ?? 1);
  return cobro <= hoy
    ? { texto: `Cobrado el ${dm(cobro)}`, tono: "ok" }
    : { texto: `Cobra el ${dm(cobro)}`, tono: "pendiente" };
}

/**
 * Fecha sugerida de "pagado hasta" al apagar: el día antes del próximo cobro.
 * Es lo que pasa de verdad al cancelar en casi cualquier SaaS — sigues usándolo
 * hasta que se acaba el periodo que ya pagaste, y no te vuelven a cobrar.
 */
export function sugerirPagadoHasta(g: Gasto, hoy: string): string {
  if (g.tipo === "unico" || g.dia_cobro === null) return hoy;

  const esteMes = fechaDeCobro(mesDe(hoy), g.dia_cobro);
  // Si el cobro de este mes ya pasó, lo pagado llega hasta el día antes del
  // cobro del mes que viene; si aún no ha pasado, hasta el día antes de este.
  const base = esteMes <= hoy ? siguienteMes(mesDe(hoy)) : mesDe(hoy);
  const proximo = fechaDeCobro(base, g.dia_cobro);
  return diaAntes(proximo);
}

function siguienteMes(mesISO: string): string {
  let [anio, mes] = mesISO.split("-").map(Number);
  mes += 1;
  if (mes > 12) {
    mes = 1;
    anio += 1;
  }
  return `${anio}-${dosDigitos(mes)}`;
}

function diaAntes(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
