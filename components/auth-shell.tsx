import Link from "next/link";

/** Encabezado + pie legal compartido por las pantallas de autenticación. */
export function AuthShell({
  titulo,
  subtitulo,
  children,
  pie,
  legal,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
  legal?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-semibold text-[#26251e]">{titulo}</h2>
        <p className="text-sm text-muted-foreground mt-2">{subtitulo}</p>
      </div>

      {children}

      {pie && <p className="text-center text-sm text-muted-foreground">{pie}</p>}

      {legal && (
        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          {legal}{" "}
          <Link href="/terms-and-conditions" className="underline">
            Términos y Condiciones
          </Link>
          ,{" "}
          <Link href="/privacy-policy" className="underline">
            Política de Privacidad
          </Link>{" "}
          y{" "}
          <Link href="/data-deletion-policy" className="underline">
            Política de Eliminación de Datos
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/** Botón oscuro con degradado, igual al del sitio. */
export const botonAuth =
  "w-full h-11 rounded-lg bg-gradient-to-r from-black to-[#2c2c2c] text-white font-semibold text-base disabled:opacity-60 transition-opacity hover:opacity-90";
