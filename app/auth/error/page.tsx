import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Error | OMNI Scale" };

async function DetalleError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? `Código del error: ${params.error}`
        : "Ocurrió un error no especificado."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthShell
      titulo="Algo salió mal"
      subtitulo="No pudimos completar la operación"
      pie={
        <Link href="/auth/login" className="font-medium text-foreground underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <Suspense>
        <DetalleError searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
