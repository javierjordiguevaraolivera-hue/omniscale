import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas EXCEPTO:
     * - _next/static, _next/image (archivos de Next)
     * - favicon.ico e imágenes
     * - manifest.webmanifest y sw.js: los pide el navegador SIN cookies de
     *   sesión al instalar la app; si pasaran por el middleware acabarían en un
     *   redirect al login y no habría instalación posible.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
