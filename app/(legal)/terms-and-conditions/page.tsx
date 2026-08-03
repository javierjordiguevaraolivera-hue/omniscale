import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Términos y Condiciones | OMNI Scale" };

export default function Page() {
  return (
    <LegalDoc
      titulo="Términos y Condiciones del Servicio"
      subtitulo="Última actualización: 2026"
      secciones={[
        {
          titulo: "1. Introducción",
          parrafos: [
            "Estos Términos y Condiciones regulan el acceso y uso de la plataforma OMNI SCALE, propiedad de OMNI AGENCIA S.A.C. (RUC 20612101648), con domicilio en Ca. Rio Chicama 5539, Perú.",
            "Al acceder, registrarte o utilizar OMNI SCALE, aceptas íntegramente estos Términos y Condiciones. Si no estás de acuerdo con ellos, debes abstenerte de usar la plataforma.",
          ],
        },
        {
          titulo: "2. Definiciones",
          lista: [
            "Plataforma: software web OMNI SCALE y sistemas asociados.",
            "Usuario: persona natural o jurídica que utiliza el servicio.",
            "Cuenta: registro digital del usuario que permite acceso.",
            "Servicios: herramientas de análisis, automatización, integración e IA.",
          ],
        },
        {
          titulo: "3. Naturaleza del Servicio",
          parrafos: [
            "OMNI SCALE es una plataforma SaaS que permite analizar campañas publicitarias, automatizar procesos, integrar cuentas externas y generar recomendaciones con inteligencia artificial.",
            "OMNI SCALE es una herramienta tecnológica y no brinda asesoría financiera, legal, tributaria ni de inversión.",
          ],
        },
        {
          titulo: "4. Registro de Cuenta",
          parrafos: [
            "El usuario debe proporcionar información veraz y actualizada, proteger sus credenciales y asumir la responsabilidad por toda actividad realizada desde su cuenta.",
          ],
        },
        {
          titulo: "5. Requisito de Edad",
          parrafos: [
            "El usuario declara tener al menos 18 años de edad y capacidad legal para contratar servicios digitales.",
          ],
        },
        {
          titulo: "6. Uso Permitido y Prohibido",
          lista: [
            "No realizar fraude ni actividades ilegales.",
            "No infringir políticas publicitarias de terceros.",
            "No intentar accesos no autorizados.",
            "No distribuir malware.",
            "No realizar ingeniería inversa de la plataforma.",
          ],
        },
        {
          titulo: "7. Integraciones de Terceros",
          parrafos: [
            "OMNI SCALE puede integrarse con Meta, Google, TikTok y otros proveedores mediante APIs oficiales. La disponibilidad y continuidad de esos servicios externos están fuera del control de OMNI SCALE.",
          ],
        },
        {
          titulo: "8. Inteligencia Artificial",
          parrafos: [
            "Las salidas de IA son informativas y de apoyo estratégico. No reemplazan asesoría profesional, y las decisiones finales permanecen bajo responsabilidad del usuario.",
          ],
        },
        {
          titulo: "9. Propiedad Intelectual",
          parrafos: [
            "El software, algoritmos, interfaz, modelos, marca y activos relacionados son propiedad exclusiva de OMNI AGENCIA S.A.C. Se concede una licencia limitada, revocable e intransferible para uso del servicio.",
          ],
        },
        {
          titulo: "10. Contenido del Usuario",
          parrafos: [
            "El usuario conserva la titularidad de su contenido cargado o integrado y otorga a OMNI SCALE una licencia limitada para tratarlo únicamente con fines de operación de la plataforma y servicios contratados.",
          ],
        },
        {
          titulo: "11. Disponibilidad del Servicio",
          parrafos: [
            "OMNI SCALE procura operación continua, pero no garantiza disponibilidad ininterrumpida ni ausencia total de errores. Pueden existir mantenimientos, mejoras y cambios técnicos sin aviso previo.",
          ],
        },
        {
          titulo: "12. Planes y Facturación",
          parrafos: [
            "Los planes pueden incluir facturación recurrente según la suscripción elegida. Los pagos no son reembolsables, salvo cuando la ley aplicable lo exija.",
          ],
        },
        {
          titulo: "13. Cancelación y Suspensión",
          parrafos: [
            "El usuario puede cancelar su cuenta en cualquier momento. OMNI SCALE podrá suspender o terminar el acceso en caso de incumplimiento de estos términos, riesgos de seguridad o abuso del servicio.",
          ],
        },
        {
          titulo: "14. Limitación de Responsabilidad",
          parrafos: [
            "OMNI SCALE no garantiza resultados comerciales, ROAS, crecimiento de ventas, volumen de leads ni desempeño específico de campañas. OMNI SCALE no responde por pérdidas indirectas, lucro cesante o acciones de plataformas externas.",
          ],
        },
        {
          titulo: "15. Exclusión de Garantías",
          parrafos: [
            'El servicio se proporciona "tal cual" y "según disponibilidad", sin garantías expresas o implícitas sobre continuidad, idoneidad para un fin particular o aptitud comercial.',
          ],
        },
        {
          titulo: "16. Seguridad",
          parrafos: [
            "OMNI SCALE aplica medidas de seguridad técnicas y organizativas razonables. Sin embargo, ningún sistema conectado a internet puede garantizar seguridad absoluta.",
          ],
        },
        {
          titulo: "17. Privacidad y Protección de Datos",
          parrafos: [
            "El tratamiento de datos personales se rige por la Política de Privacidad de OMNI SCALE, la cual forma parte integrante de estos Términos y Condiciones.",
          ],
        },
        {
          titulo: "18. Modificaciones del Servicio",
          parrafos: [
            "OMNI SCALE puede agregar, modificar o retirar funcionalidades, módulos e integraciones debido a la evolución del producto, exigencias regulatorias o decisiones técnicas.",
          ],
        },
        {
          titulo: "19. Uso Internacional",
          parrafos: [
            "El usuario acepta que la operación del servicio y el tratamiento de datos pueden ejecutarse en múltiples jurisdicciones, por la naturaleza global de la infraestructura de internet y proveedores cloud.",
          ],
        },
        {
          titulo: "20. Suspensión Temporal del Servicio",
          parrafos: [
            "El acceso puede suspenderse temporalmente por incidentes de seguridad, mantenimiento técnico, órdenes legales, problemas de infraestructura o prevención de abuso.",
          ],
        },
        {
          titulo: "21. Indemnidad",
          parrafos: [
            "El usuario acepta indemnizar y mantener indemne a OMNI AGENCIA S.A.C. frente a reclamos, daños o sanciones derivados del uso indebido de la plataforma o infracciones legales atribuibles al usuario.",
          ],
        },
        {
          titulo: "22. Relación entre Partes",
          parrafos: [
            "El uso de OMNI SCALE no crea relación laboral, de agencia, sociedad, franquicia ni representación legal entre OMNI AGENCIA S.A.C. y el usuario.",
          ],
        },
        {
          titulo: "23. Fuerza Mayor",
          parrafos: [
            "OMNI SCALE no será responsable por retrasos o interrupciones originados por fuerza mayor, caídas de proveedores, fallas de conectividad o eventos fuera de su control razonable.",
          ],
        },
        {
          titulo: "24. Legislación Aplicable y Jurisdicción",
          parrafos: [
            "Estos Términos y Condiciones se rigen por las leyes de la República del Perú. Cualquier controversia será resuelta por las autoridades competentes del Perú, salvo norma imperativa en contrario.",
          ],
        },
        {
          titulo: "25. Modificaciones",
          parrafos: [
            "OMNI SCALE puede actualizar estos Términos y Condiciones en cualquier momento. El uso continuo del servicio después de una actualización implica aceptación de la nueva versión.",
          ],
        },
        {
          titulo: "26. Contacto",
          parrafos: [
            "OMNI AGENCIA S.A.C. · RUC: 20612101648 · Dirección: Ca. Rio Chicama 5539, Perú · Correo: soporte@omniscale.pro",
          ],
        },
      ]}
    />
  );
}
