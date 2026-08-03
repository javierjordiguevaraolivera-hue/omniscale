"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthShell, botonAuth } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
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
      titulo="Nueva contraseña"
      subtitulo="Elige la contraseña con la que vas a entrar de ahora en adelante"
    >
      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        {error && <p className="text-sm text-[#d03b3b]">{error}</p>}
        <button type="submit" className={botonAuth} disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </AuthShell>
  );
}
