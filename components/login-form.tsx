"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthShell, botonAuth } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      titulo="Hola de nuevo"
      subtitulo="Ingresa a tu cuenta OMNI Scale"
      pie={
        <>
          ¿No tienes una cuenta?{" "}
          <Link href="/auth/sign-up" className="font-medium text-foreground underline">
            Regístrate
          </Link>
        </>
      }
      legal="Al iniciar sesión, aceptas nuestros"
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
          <div className="flex items-center">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/auth/forgot-password"
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
        <button type="submit" className={botonAuth} disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </AuthShell>
  );
}
