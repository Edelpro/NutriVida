# NutriVida — definición del producto

NutriVida es una aplicación web para profesionales de nutrición en Ecuador. Centraliza la historia clínica nutricional, la evaluación antropométrica y de hábitos, los cálculos energéticos, la planificación de menús por porciones, el seguimiento y evolución con frecuencia definida por el profesional, los reportes y la comunicación consentida con el paciente.

## Usuarios y alcance inicial

- Nutricionista: administra únicamente los pacientes asignados a su cuenta y sus atenciones, evaluaciones, planes y seguimientos; también crea o edita platos reutilizables de la clínica.
- Administrador: consulta todos los pacientes de la clínica, asigna o reasigna su nutricionista responsable y gestiona usuarios, catálogos y configuración; también puede archivar registros reutilizables.
- Paciente: recibe enlaces seguros a documentos; el portal del paciente queda fuera del primer alcance.

## Flujo clínico

El flujo sigue las cuatro etapas del Nutrition Care Process (NCP): evaluación y reevaluación, diagnóstico nutricional, intervención, y monitorización/evaluación. La aplicación apoya el criterio profesional; no diagnostica ni prescribe automáticamente.

1. Registrar al paciente, asignar su nutricionista responsable y guardar su consentimiento de contacto.
2. Abrir una atención.
3. Completar historia clínica, hábitos/ingesta y antropometría.
4. Registrar el problema nutricional, etiología, signos y síntomas (PES).
5. Estimar requerimientos energéticos con fórmula, actividad y ETA explícitas.
6. Diseñar un plan de menú por porciones y fuente de alimentos.
7. Emitir un reporte revisado y aprobado por el nutricionista.
8. Enviar un enlace seguro por correo o WhatsApp cuando exista consentimiento.
9. Registrar un seguimiento cuando exista un control real, con período evaluado y próximo control opcionales.

## Módulos funcionales

- Inicio y agenda.
- Pacientes.
- Atenciones.
- Historia clínica.
- Evaluación nutricional.
- Antropometría.
- Hábitos, ingesta y salud digestiva.
- Cálculos energéticos.
- Catálogo de alimentos Ecuador / SMAE / personalizado. Los catálogos autorizados se importan por edición; un profesional puede crear y editar un alimento personalizado indicando porción, nutrientes y referencia real.
- Platos y preparaciones reutilizables con costo estimado por porción.
- Plantillas rápidas editables y persistentes en SQL Server, separadas por Evaluación, Seguimiento, Planes de menú y Mensajería.
- Planes de menú por porciones.
- Seguimiento y evolución con intervalo flexible.
- Reportes.
- Mensajería y consentimientos.
- Usuarios, permisos, auditoría y configuración.
- Solicitudes de acceso: el formulario público solo registra una petición pendiente; la cuenta Nutricionista nace después de la aprobación explícita del Administrador y con contraseña temporal.

## Límites clínicos y regulatorios

- Todo cálculo muestra fórmula, versión, entradas, resultado y responsable de aprobación.
- ETA es configurable; no se oculta dentro de un factor de actividad.
- Los diagnósticos y planes requieren aprobación explícita del profesional.
- No se habilita eliminación definitiva hasta que el cliente apruebe una política de retención.
- No se envían historias clínicas completas por mensajería; se envían enlaces seguros y de corta vigencia.
- Los textos de consentimiento y la política de privacidad requieren validación jurídica ecuatoriana antes de producción.

## Fuera del primer alcance

- Facturación y pagos.
- Portal del paciente.
- Teleconsulta.
- Integración con laboratorios o dispositivos.
- Recomendaciones generadas por inteligencia artificial.
