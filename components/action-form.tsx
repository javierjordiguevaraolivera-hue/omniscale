"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type AccionForm = (
  previo: string | null,
  formData: FormData,
) => Promise<string | null>;

/**
 * Formulario que muestra el error de la server action ahí mismo.
 * Si la acción lanzara la excepción, Next mostraría su pantalla genérica
 * ("This page couldn't load") sin decir qué falló.
 */
export function ActionForm({
  accion,
  className,
  children,
}: {
  accion: AccionForm;
  className?: string;
  children: React.ReactNode;
}) {
  const [error, formAction] = useActionState(accion, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {error && (
        <p className="col-span-full text-body-md text-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** Botón de envío que se desactiva mientras la acción corre. */
export function SubmitButton({
  children,
  pendiente,
  className,
}: {
  children: React.ReactNode;
  pendiente?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`disabled:opacity-60 ${className ?? ""}`}
    >
      {pending ? (pendiente ?? "Guardando...") : children}
    </button>
  );
}
