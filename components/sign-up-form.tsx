"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthShell, botonAuth } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      titulo="Crea tu cuenta"
      subtitulo="Registra el usuario con el que vas a entrar al panel"
      pie={
        <>
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/login" className="font-medium text-foreground underline">
            Inicia sesión
          </Link>
        </>
      }
      legal="Al registrarte, aceptas nuestros"
    >
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Contraseña"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="repeat-password">Repite la contraseña</Label>
          <Input
            id="repeat-password"
            type="password"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
        <button type="submit" className={botonAuth} disabled={isLoading}>
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthShell>
  );
}
