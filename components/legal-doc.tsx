export type LegalSection = {
  titulo: string;
  parrafos?: string[];
  lista?: string[];
};

export function LegalDoc({
  titulo,
  subtitulo,
  secciones,
}: {
  titulo: string;
  subtitulo: string;
  secciones: LegalSection[];
}) {
  return (
    <article>
      <h1 className="text-3xl font-bold">{titulo}</h1>
      <p className="text-sm text-muted-foreground mt-2">{subtitulo}</p>
      <div className="mt-8 flex flex-col gap-6">
        {secciones.map((s, i) => (
          <section key={i}>
            <h2 className="font-semibold text-lg">{s.titulo}</h2>
            {s.parrafos?.map((p, j) => (
              <p key={j} className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {p}
              </p>
            ))}
            {s.lista && (
              <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
                {s.lista.map((li, j) => (
                  <li key={j} className="text-sm text-muted-foreground">
                    {li}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
