/**
 * Traduce los errores de Supabase a algo que se pueda leer y accionar.
 * Sin esto, un fallo del servidor termina en la pantalla genérica de Next
 * ("This page couldn't load") sin decir qué pasó.
 */
export function mensajeDeError(e: unknown): string {
  const raw =
    typeof e === "string"
      ? e
      : e instanceof Error
        ? e.message
        : ((e as { message?: string })?.message ?? String(e));

  const t = raw.toLowerCase();

  if (t.includes("could not find the table") || t.includes("does not exist")) {
    return "Faltan las tablas en Supabase. Ejecuta supabase/schema.sql completo en el SQL Editor del proyecto y vuelve a intentar.";
  }
  if (t.includes("could not find the function")) {
    return "Faltan las funciones SQL en Supabase. Vuelve a ejecutar supabase/schema.sql completo en el SQL Editor.";
  }
  if (t.includes("could not find the") && t.includes("column")) {
    return `La tabla existe pero le falta una columna (${raw}). Vuelve a ejecutar supabase/schema.sql, que es re-ejecutable.`;
  }
  if (t.includes("supabasekey is required") || t.includes("supabaseurl is required")) {
    return "Faltan las variables de entorno de Supabase en el servidor (SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL).";
  }
  if (t.includes("violates check constraint")) {
    return "El valor no es válido para ese campo. Revisa la plataforma seleccionada.";
  }
  if (t.includes("duplicate key")) {
    return "Ya existe un registro igual.";
  }
  if (t.includes("no autorizado")) {
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }
  return raw.slice(0, 300);
}
