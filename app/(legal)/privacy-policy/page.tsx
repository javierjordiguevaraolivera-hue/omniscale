import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Política de Privacidad | OMNI Scale" };

export default function Page() {
  return (
    <LegalDoc
      titulo="Política de Privacidad"
      subtitulo="OMNI SCALE - Última actualización: 2026"
      secciones={[
        {
          titulo: "1. Introducción",
          parrafos: [
            "La presente Política de Privacidad describe cómo OMNI AGENCIA S.A.C., titular de la plataforma OMNI SCALE, recopila, utiliza, almacena, protege y trata la información personal de los usuarios que acceden o utilizan sus servicios digitales.",
            "OMNI SCALE es una plataforma SaaS orientada a análisis, automatización, optimización y gestión de campañas publicitarias mediante tecnologías de inteligencia artificial y procesamiento de datos.",
            "El respeto por la privacidad constituye un principio fundamental dentro del diseño y operación del servicio.",
          ],
        },
        {
          titulo: "2. Identificación del Responsable",
          lista: [
            "Razón Social: OMNI AGENCIA S.A.C.",
            "RUC: 20612101648",
            "Dirección: Ca. Rio Chicama 5539, Perú",
            "Correo: soporte@omniscale.pro",
            "Plataforma: OMNI SCALE",
          ],
          parrafos: [
            "OMNI AGENCIA S.A.C. actúa como Responsable del Tratamiento de Datos Personales.",
          ],
        },
        {
          titulo: "3. Marco Legal Aplicable",
          lista: [
            "Ley N° 29733 de Protección de Datos Personales del Perú",
            "Reglamento de la Ley de Protección de Datos Personales",
            "GDPR cuando resulte aplicable",
            "Estándares internacionales de seguridad informática",
            "Políticas de plataformas tecnológicas integradas (Meta, Google, etc.)",
          ],
        },
        {
          titulo: "4. Definiciones",
          lista: [
            "Usuario: persona natural o jurídica que utiliza OMNI SCALE.",
            "Datos Personales: información que identifica o hace identificable a una persona.",
            "Tratamiento: operación realizada sobre datos personales.",
            "Plataforma: software OMNI SCALE y servicios asociados.",
            "Servicios de IA: sistemas automatizados que analizan información para recomendaciones.",
          ],
        },
        {
          titulo: "5. Información que Recopilamos",
          parrafos: [
            "Información proporcionada por el usuario: nombre completo, correo electrónico, nombre comercial o empresa, tipo de negocio, país o región, información de onboarding y preferencias operativas.",
            "Información de autenticación: identificador único de usuario, hash de credenciales, tokens de sesión, registros de acceso y verificaciones de correo. OMNI SCALE no almacena contraseñas en texto plano.",
            "Información de integraciones externas: IDs de cuentas publicitarias, campañas activas, ad sets, creatividades, métricas de rendimiento, datos agregados de conversiones y estado de cuentas publicitarias. El acceso ocurre únicamente mediante autorización explícita del usuario.",
            "Datos técnicos y operativos: dirección IP, tipo de navegador, sistema operativo, resolución de pantalla, identificadores de sesión, logs de actividad y eventos en el sistema.",
            "Información generada por IA: análisis automatizados, recomendaciones estratégicas, predicciones de rendimiento y sugerencias de optimización. Las decisiones finales permanecen bajo control humano del usuario.",
          ],
        },
        {
          titulo: "6. Finalidades del Tratamiento",
          lista: [
            "Operación del servicio: crear cuentas, permitir acceso seguro, gestionar suscripciones y ejecutar funcionalidades del software.",
            "Inteligencia y automatización: analizar campañas, generar insights, detectar oportunidades de mejora y automatizar procesos autorizados.",
            "Seguridad: prevenir fraude, detectar accesos no autorizados y proteger la infraestructura tecnológica.",
            "Mejora continua: optimizar rendimiento del sistema, desarrollar nuevas funciones y analizar comportamiento agregado.",
            "Cumplimiento legal: obligaciones regulatorias y requerimientos judiciales válidos.",
          ],
        },
        {
          titulo: "7. Base Legal",
          lista: [
            "Consentimiento del usuario",
            "Ejecución contractual",
            "Interés legítimo",
            "Obligaciones legales",
          ],
        },
        {
          titulo: "8. Principios de Privacidad",
          lista: [
            "Licitud",
            "Transparencia",
            "Minimización de datos",
            "Seguridad",
            "Confidencialidad",
            "Limitación de finalidad",
            "Responsabilidad proactiva",
          ],
        },
        {
          titulo: "9. Uso de Inteligencia Artificial",
          parrafos: [
            "La plataforma puede usar sistemas automatizados para evaluar, clasificar y recomendar acciones.",
          ],
          lista: [
            "No toma decisiones legales vinculantes",
            "No reemplaza decisiones humanas",
            "No perfila usuarios sensibles",
            "Opera sobre datos funcionales del servicio",
          ],
        },
        {
          titulo: "10. Compartición de Datos",
          parrafos: [
            "OMNI SCALE no vende datos personales. Solo comparte con proveedores esenciales para operación y seguridad.",
          ],
        },
        {
          titulo: "11. Proveedores Tecnológicos",
          lista: [
            "Supabase Inc.",
            "Vercel Inc.",
            "Meta Platforms Inc.",
            "Google LLC",
            "Proveedores cloud y hosting",
          ],
        },
        {
          titulo: "12. Transferencia Internacional",
          parrafos: [
            "Los datos pueden procesarse fuera del Perú por la naturaleza global de internet y cloud.",
          ],
        },
        {
          titulo: "13. Seguridad de la Información",
          lista: [
            "Cifrado SSL/TLS",
            "Autenticación segura",
            "Control de acceso por roles",
            "Monitoreo continuo",
            "Registros auditables",
            "Protección contra acceso indebido",
          ],
        },
        {
          titulo: "14. Conservación de Datos",
          lista: [
            "Mientras la cuenta esté activa",
            "Durante la prestación del servicio",
            "Hasta solicitud de eliminación",
            "Por períodos legales obligatorios",
          ],
        },
        {
          titulo: "15. Derechos del Titular",
          parrafos: [
            "Puedes solicitar acceso, rectificación, eliminación, portabilidad, oposición y revocación. Contacto: soporte@omniscale.pro",
          ],
        },
        {
          titulo: "16. Eliminación de Cuenta y Datos",
          parrafos: [
            "Puedes solicitar eliminación permanente, desconexión de integraciones y borrado de data asociada.",
          ],
        },
        {
          titulo: "17. Cookies",
          parrafos: [
            "Usamos cookies para autenticación, dashboard, analítica y seguridad.",
          ],
        },
        {
          titulo: "18. Menores",
          parrafos: ["OMNI SCALE no está dirigido a menores de edad."],
        },
        {
          titulo: "19. Privacidad por Diseño",
          parrafos: ["OMNI SCALE adopta Privacy by Design y Privacy by Default."],
        },
        {
          titulo: "20. Limitación de Responsabilidad",
          parrafos: [
            "OMNI SCALE es una herramienta tecnológica y no asume decisiones de negocio del usuario.",
          ],
        },
        {
          titulo: "21. Modificaciones",
          parrafos: [
            "La política puede actualizarse por evolución del servicio, cambios legales o nuevas tecnologías.",
          ],
        },
        {
          titulo: "22. Contacto",
          parrafos: [
            "OMNI AGENCIA S.A.C. · RUC: 20612101648 · Dirección: Ca. Rio Chicama 5539, Perú · Correo: soporte@omniscale.pro",
          ],
        },
      ]}
    />
  );
}
