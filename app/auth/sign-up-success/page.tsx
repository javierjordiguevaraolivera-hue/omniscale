import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Cuenta creada | OMNI Scale" };

export default function Page() {
  return (
    <AuthShell
      titulo="Revisa tu correo"
      subtitulo="Falta confirmar la cuenta"
      pie={
        <Link href="/auth/login" className="font-medium text-foreground underline">
          Ir a iniciar sesión
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">
        La cuenta se creó correctamente. Abre el enlace que te enviamos por correo
        para confirmarla y ya puedes entrar al panel.
      </p>
    </AuthShell>
  );
}
