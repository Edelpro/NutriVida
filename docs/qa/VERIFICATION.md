# Evidencia de verificación

Última verificación: 2026-11-03. Entorno: Windows, Angular 22.2, ASP.NET Core 10 y SQL Server (`MSSQLSERVER`). Las secciones posteriores conservan evidencia de revisiones anteriores (2026-09).

## Resultado automatizado

| Comprobación | Resultado |
|---|---|
| `dotnet test backend/NutriVida.sln` | Correcto: 8 unitarias + 90 de integración |
| `npm --prefix frontend test -- --watch=false` | Correcto: 42 pruebas |
| `npm --prefix frontend run build` | Correcto |
| NuGet vulnerable (incluye transitivas) | 0 paquetes vulnerables |
| `npm audit` | 0 vulnerabilidades |
| `scripts/verificar-flujo-completo.ps1` | PASS con SQL Server real |
| API en modo `Production` sobre base vacía | Migra, crea administrador con cambio obligatorio, sin datos demo, Swagger oculto, encabezados de seguridad presentes |

Las pruebas automáticas no usan SQL Server: los recorridos contra la base se validan con el script de flujo completo y pruebas manuales.

### Comprobado manualmente contra SQL Server (2026-11-02)

- Horas de citas correctas y sin desplazamiento al editar; agenda por día de Ecuador.
- Primer ingreso, revocación de sesión al desactivar o cambiar contraseña, bloqueo tras 5 intentos y desbloqueo por Administración.
- Importación CSV: rechazo de coma decimal y valores fuera de rango.
- Enlace del PDF: bloqueo al retirar el consentimiento y registro de cada descarga.
- PDF para el paciente sin notas ni plan en borrador; PDF profesional completo.
- Aprobación de planes y diagnósticos; un plan editado vuelve a borrador; no se comparte un plan sin aprobar.
- Edición de planes y platos, ficha del paciente, selector con más de 50 pacientes, archivar y restaurar.

### No comprobado

- Envío real por SMTP y WhatsApp Cloud (requiere credenciales; cubierto solo con pruebas simuladas).
- Safari/iOS y dispositivos físicos.
- Carga con muchos datos y despliegue en un servidor real con HTTPS.

## Flujo funcional API y SQL Server

Se verificó además un paciente sintético creado por el flujo integral reutilizable (`QA-20260922235014`) contra `NutriVidaClinicalDev`. El script `scripts/verificar-flujo-completo.ps1` registra y vuelve a consultar paciente, evaluación, antropometría, diagnóstico PES, energía, plato, menú, seguimiento, atención, reporte PDF, auditoría y borradores de correo/WhatsApp; nunca confirma un envío externo.

| Control | Resultado |
|---|---|
| Acceso anónimo a `/api/patients` | Rechazado con HTTP 401 |
| Acceso anónimo a `/api/users` | Rechazado con HTTP 401 |
| Login `ClinicAdmin`, `Nutritionist` | Token JWT emitido para los dos roles de la aplicación personal |
| Paciente creado visible en lista/dashboard | Correcto |
| Evaluación y antropometría del mismo expediente | Guardadas y recuperadas |
| Cálculo energético | Guardado; respuesta 2761 kcal en caso probado |
| Seguimiento y evolución | Fecha e intervalo flexible guardados y recuperados en reporte |
| Atención | Guardada en agenda |
| Plan de menú por porciones | Guardado con alimento versionado |
| Platos reutilizables | Ingredientes, costo USD y nutrición por porción persistidos |
| Plantillas rápidas | 12 tarjetas SQL separadas por 4 módulos; crear, editar, validar y archivar comprobados; campos cruzados rechazados con HTTP 400 |
| Correo y WhatsApp | Consentimiento validado, auditoría registrada y enlace directo generado |
| Flujo QA completo | PASS: Bristol inválido rechazado, 1 evaluación, 1 antropometría, 1 diagnóstico, 2.091 kcal, 1 plato, 1 seguimiento, 1 atención, 1 menú, PDF válido, auditoría, correo y enlace `wa.me` válido |
| Estabilidad SQL Server | Instancia `MSSQLSERVER` actualizada mediante migraciones y cinco reintentos transitorios |

## Navegador e interacción

Se usó el navegador integrado de Codex sobre `http://127.0.0.1:4200` con la API en `http://localhost:5158`.

| Control | Resultado |
|---|---|
| Identidad de página | Login, Inicio, Pacientes, Evaluación, Cálculo energético, Menús, Mensajería y Usuarios correctos |
| Pantalla con contenido | Correcto; encabezados, datos y navegación presentes |
| Overlay de framework | Ausente |
| Consola | 0 errores y 0 advertencias luego de las correcciones |
| Desbordamiento | Sin desbordamiento significativo; tablas conservan scroll propio |
| Interacción energética | Mifflin femenina, 66.9 kg, 164 cm, 34 años, AF 1.55 y ETA 10% → 2324 kcal/día; toast confirmado |
| Interacción clínica | Evaluación integral + diagnóstico PES guardados; toast confirmado |
| Móvil | Sidebar en cajón, scrim, controles apilados y contenido legible a 319 × 880 px |
| Acceso y solicitud | Alternancia estable en 1440 × 1000 y 390 × 844; validación inline correcta |
| Usuarios y roles | Datos reales de SQL Server, tabla paginada y diálogo de alta visibles |
| Acceso administrativo | `admin@nutrivida.local` autenticado y dirigido a Inicio; las credenciales demo se restauran solo en Development |
| Persistencia transversal | El paciente QA aparece en Inicio, Pacientes y los selectores del resto de módulos |
| Mensajería | Consentimientos visibles, plantillas rápidas, historial enmascarado y canales Correo/WhatsApp disponibles |
| Permisos | Administrador accede; Nutricionista no ve el módulo y la URL directa termina en `/sin-acceso` |
| API de usuarios por rol | `ClinicAdmin`: HTTP 200 y 3 cuentas; `Nutritionist`: HTTP 403 |
| Asignación de pacientes | Administración ve 12 expedientes y su responsable; el nutricionista de demostración recibió 12 expedientes migrados, todos con su propio identificador de usuario |
| Aislamiento entre nutricionistas | Pruebas de política confirman que un profesional no puede listar expedientes ajenos, sin asignar, archivados ni de otra clínica; la API devuelve 404 para recursos fuera de su alcance |
| Plantillas rápidas | Tres tarjetas SQL visibles en Evaluación, Seguimiento, Menú y Mensajería; aplicación y validación inline comprobadas |
| Platos reutilizables | Plato demostrativo visible con costo por porción y nutrición; archivo restringido al administrador |
| Inicio local | API en 5158 y Angular en 4200 iniciaron con una sola instancia durante la prueba. |
| Delimitación visual | Encabezados y pies del panel usan borde translúcido y lavado mínimo; los módulos clínicos conservan jerarquía sin exceso de tarjetas |

## Estados revisados

- Carga inicial y datos SQL Server.
- Error explícito y reintento cuando la API está desconectada; no hay sustitución silenciosa por datos ficticios.
- Contexto de paciente compartido entre evaluación, cálculo, seguimiento, menú, reporte y mensajería.
- Login JWT, cierre de sesión y visibilidad de Configuración según rol.
- Login rediseñado con alternancia accesible entre ingreso y solicitud; la solicitud no crea cuentas públicas.
- Administración de usuarios protegida para `ClinicAdmin`, con alta, edición, rol, estado y contraseña temporal.
- Administración puede asignar o reasignar pacientes; Nutricionista recibe automáticamente las altas y solo ve su cartera. La desactivación se bloquea hasta reasignar pacientes activos.
- Cambio obligatorio de contraseña temporal antes de entrar a cualquier módulo clínico.
- Diálogo de usuario móvil con controles completos, pie fijo y sin pérdida de contenido.
- Búsqueda con resultados y estado vacío.
- Formularios con campos obligatorios y controles nativos documentados.
- Resultado de cálculo, toast de éxito y error de servidor.
- Evaluación con ingesta, alergias, intolerancias, sueño, ejercicio, estreñimiento, Bristol y PES.
- Importador CSV autorizado abierto con fuente, edición, referencia, archivo y límites visibles.
- Navegación móvil abierta y fondo bloqueado por scrim.
- Plantillas móviles a 390 × 844: sin desbordamiento horizontal; diálogo completo dentro del viewport y acciones alcanzables.

## Ledger de fidelidad visual

| Referencia conceptual | Implementación | Resolución |
|---|---|---|
| Logo aguacate y marca en sidebar | Marca derivada del AVIF del cliente, mismo anclaje superior | Conservado |
| Blanco, café, verde aguacate y ámbar | Tokens `DESIGN.md` y `styles.scss` coincidentes | Conservado |
| Sidebar persistente y navegación clínica | 10 módulos, estado activo y perfil inferior | Conservado y ampliado |
| Franja de indicadores y agenda | Indicadores SQL, agenda y paciente en foco | Conservado |
| Panel orgánico del paciente | Curva principal limitada al foco clínico | Conservado |
| Evaluación con stepper y resumen lateral | Flujo de 6 pasos, campos clínicos y resumen sticky | Conservado y ampliado con PES |
| Acceso en hojas superpuestas | Login y solicitud con una única rotación controlada; versión móvil sin rotación | Conservado y adaptado |
| Administración de equipo | Tabla paginada, estados, roles y diálogo de alta/edición | Añadido con autorización real |
| Tipografía editorial + sans para datos | Georgia en títulos y Aptos/Segoe UI en operación | Conservado |

Conceptos fuente: 1536 × 1024. Captura desktop observada: 1384 × 882 por el marco del navegador integrado. Captura móvil observada: 319 × 880.

## Diferencia de copy sobre el pliegue

El concepto usaba `Inicio` y `Resumen de tu jornada y pacientes`. La versión implementada conserva la intención y usa `Buenos días, Valeria` y `Tu consulta de hoy, las alertas pendientes y el progreso reciente en un solo lugar` para dar prioridad operativa. `Pacientes activos`, `Consultas de hoy`, `Seguimientos`, `Próxima consulta`, `Agenda` y `Paciente en foco` se conservan.

## Riesgos pendientes antes de producción

- Probar Safari/iOS y navegadores físicos; la validación actual cubre el navegador Chromium integrado.
- Sustituir cuentas/clave JWT locales y configurar un proveedor de identidad administrado.
- Configurar proveedores de correo/WhatsApp Business si se requiere envío automático sin confirmación humana.
- Cargar y validar tablas alimentarias autorizadas; los registros `EcuadorDemo` no son clínicos.
- Aprobar textos de consentimiento, política de retención y cumplimiento LOPDP.
- Revisión clínica formal de fórmulas, factores, terminología PES y reportes.
