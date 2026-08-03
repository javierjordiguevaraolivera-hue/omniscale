import Image from "next/image";
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center">
          <Link href="/">
            <Image
              src="/omniscale-logo.png"
              alt="OMNI Scale"
              width={112}
              height={62}
              className="h-9 w-auto"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-12">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        OMNI AGENCIA S.A.C - RUC 20612101648 · soporte@omniscale.pro
      </footer>
    </div>
  );
}
