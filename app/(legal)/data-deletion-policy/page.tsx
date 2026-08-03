import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Política de Eliminación de Datos | OMNI Scale" };

export default function Page() {
  return (
    <LegalDoc
      titulo="Política de Eliminación de Datos"
      subtitulo="Última actualización: 2026"
      secciones={[
        {
          titulo: "1. Finalidad",
          parrafos: [
            "Esta política describe las condiciones, métodos y plazos para la eliminación de datos personales y datos operativos asociados a la plataforma OMNI SCALE.",
          ],
        },
        {
          titulo: "2. Alcance",
          parrafos: [
            "Aplica a datos de perfil de cuenta, datos de autenticación, integraciones, activos sincronizados, métricas operativas, registros de análisis de IA y logs técnicos asociados.",
          ],
        },
        {
          titulo: "3. Canales de Solicitud",
          parrafos: [
            "Las solicitudes de eliminación pueden realizarse desde la configuración de cuenta dentro de la plataforma o por correo a soporte@omniscale.pro desde la identidad titular de la cuenta.",
          ],
        },
        {
          titulo: "4. Verificación de Identidad",
          parrafos: [
            "Antes de procesar la eliminación, OMNI SCALE puede verificar la identidad para prevenir solicitudes no autorizadas y proteger la titularidad de la cuenta.",
          ],
        },
        {
          titulo: "5. Efectos Inmediatos",
          parrafos: [
            "Una vez confirmada la eliminación, se revoca el acceso, se cierran sesiones activas y se deshabilita la operación de la cuenta.",
          ],
        },
        {
          titulo: "6. Datos Eliminados",
          lista: [
            "Datos de perfil y onboarding",
            "Tokens OAuth e integraciones externas",
            "Activos publicitarios sincronizados",
            "Métricas y snapshots almacenados",
            "Registros de recomendaciones y análisis de IA",
            "Logs operativos y de actividad vinculados a la cuenta",
          ],
        },
        {
          titulo: "7. Integraciones y Permisos",
          parrafos: [
            "Se eliminan los tokens de acceso almacenados y se detienen las tareas automáticas de sincronización del usuario. Una nueva conexión requerirá una autorización explícita.",
          ],
        },
        {
          titulo: "8. Plazo de Procesamiento",
          parrafos: [
            "La desactivación lógica es inmediata. La eliminación permanente de sistemas activos se completa en un máximo de 7 días calendario, salvo obligaciones legales de conservación.",
          ],
        },
        {
          titulo: "9. Conservación en Backups",
          parrafos: [
            "Los backups cifrados pueden retener datos residuales de forma temporal hasta que finalice su ciclo de rotación. Esos backups no se usan para restauración normal de cuentas eliminadas.",
          ],
        },
        {
          titulo: "10. Excepciones Legales y de Seguridad",
          parrafos: [
            "Puede conservarse un registro mínimo cuando lo exija la ley, una orden judicial, prevención de fraude, obligaciones tributarias o resolución de disputas.",
          ],
        },
        {
          titulo: "11. Irreversibilidad",
          parrafos: [
            "Una vez completada la eliminación, la cuenta y sus datos asociados no pueden recuperarse. Crear una cuenta nueva requiere un nuevo proceso de registro.",
          ],
        },
        {
          titulo: "12. Sistemas de Terceros",
          parrafos: [
            "La información exportada previamente a plataformas de terceros (por ejemplo Meta o Google) queda sujeta a las políticas de eliminación y conservación propias de esos proveedores.",
          ],
        },
        {
          titulo: "13. Derechos del Titular",
          parrafos: [
            "Además de la eliminación, el usuario puede ejercer derechos de acceso, rectificación, portabilidad, oposición y revocación del consentimiento cuando corresponda.",
          ],
        },
        {
          titulo: "14. Trazabilidad",
          parrafos: [
            "OMNI SCALE puede conservar una traza técnica mínima que acredite que la solicitud fue atendida, sin preservar datos de negocio eliminados.",
          ],
        },
        {
          titulo: "15. Actualizaciones de la Política",
          parrafos: [
            "Esta política puede actualizarse por cambios legales, estándares de seguridad o evolución de la plataforma. Las nuevas versiones se publicarán en los canales oficiales de OMNI SCALE.",
          ],
        },
        {
          titulo: "16. Contacto",
          parrafos: [
            "OMNI AGENCIA S.A.C. · RUC: 20612101648 · Correo: soporte@omniscale.pro",
          ],
        },
      ]}
    />
  );
}
