"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthShell, botonAuth } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Esta URL debe estar en la lista de Redirect URLs de Supabase.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        titulo="Revisa tu correo"
        subtitulo="Te enviamos las instrucciones para restablecer tu contraseña"
        pie={
          <Link href="/auth/login" className="font-medium text-foreground underline">
            Volver a iniciar sesión
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Si tu cuenta está registrada con correo y contraseña, vas a recibir un
          enlace para crear una nueva.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="Restablece tu contraseña"
      subtitulo="Ingresa tu correo y te enviamos un enlace para crear una nueva"
      pie={
        <>
          ¿Ya la recordaste?{" "}
          <Link href="/auth/login" className="font-medium text-foreground underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="Ingresa tu correo"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
        <button type="submit" className={botonAuth} disabled={isLoading}>
          {isLoading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </AuthShell>
  );
}
