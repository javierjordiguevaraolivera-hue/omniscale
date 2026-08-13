import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { RegistrarSW } from "@/components/pwa";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "OMNI Scale",
  description:
    "Reporte automatizado de campañas: gasto, conversiones, revenue y profit por oferta y plataforma, en tiempo real.",
  applicationName: "OMNI Scale",
  // iOS no lee el manifest: la app instalada se configura con estas.
  appleWebApp: {
    capable: true,
    title: "OMNI Scale",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // Sin esto, iOS y Android intentan convertir números largos en enlaces de
  // teléfono dentro de las tablas.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Que la app pinte por debajo del notch y de la barra de gestos; el shell
  // compensa con env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: "#16243d",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.className} antialiased`}>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
