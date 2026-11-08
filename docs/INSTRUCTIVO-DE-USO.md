# Instructivo de uso — NutriVida

Esta guía explica cómo iniciar y usar la aplicación local. Para practicar, utiliza únicamente los datos ficticios de `GUIA-DE-REGISTRO.md`.

## Aprobar antes de entregar al paciente

- **Diagnóstico PES:** en Evaluaciones, pulsa **Aprobar diagnóstico**.
- **Plan de menú:** en Planes guardados, pulsa **Aprobar**. Si editas un plan aprobado, vuelve a borrador.
- El paciente solo recibe lo aprobado, sin notas clínicas, antecedentes, medicación ni laboratorios. El PDF de **Reportes** es la versión completa para el profesional.

## Contraseñas

- Cualquier persona puede cambiar la suya en **Cambiar contraseña**, en el menú lateral.
- Si alguien la olvida, Administración le asigna una temporal en **Usuarios y roles**. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.

## 1. Herramientas necesarias

- Visual Studio con la carga de trabajo **ASP.NET y desarrollo web**.
- .NET 10 SDK.
- SQL Server (servicio `MSSQLSERVER`).
- Node.js LTS y npm.
- Visual Studio Code es opcional para Angular; la API se abre en Visual Studio.

## 2. Abrir el proyecto

- Solución de la API: `C:\Users\PC\Documents\ChatGPT\proyecto\backend\NutriVida.sln`
- Carpeta de Angular: `C:\Users\PC\Documents\ChatGPT\proyecto\frontend`
- Base de datos local: instancia predeterminada `Server=.`, base `NutriVidaClinicalDev`.

## 3. Iniciar la API

En Visual Studio:

1. Abre `backend\NutriVida.sln`.
2. Selecciona `NutriVida.Api` como proyecto de inicio.
3. Elige el perfil **http**.
4. Pulsa **Ctrl+F5**. No vuelvas a iniciarla si ya está escuchando en el puerto 5158.

También puedes iniciarla desde PowerShell, situado en la carpeta raíz del proyecto:

```powershell
dotnet run --project backend\src\NutriVida.Api --launch-profile http
```

Comprueba:

- API saludable: `http://localhost:5158/health`
- Swagger: `http://localhost:5158/swagger`

Al iniciar en desarrollo, la API aplica las migraciones pendientes y conserva los registros existentes en SQL Server.

## 4. Iniciar Angular

Abre una segunda terminal en la carpeta raíz:

```powershell
npm --prefix frontend install
npm --prefix frontend start
```

Después abre `http://localhost:4200`.

Si ejecutas `ng serve -o` desde `proyecto`, Angular responde que estás fuera de un workspace. Usa `npm --prefix frontend start` o entra primero con `cd frontend`.

## 5. Accesos locales

| Rol | Usuario | Contraseña local |
|---|---|---|
| Administrador | `admin@nutrivida.local` | `NutriVida2026#` |
| Nutricionista | `nutricionista@nutrivida.local` | `NutriVida2026#` |

La API restaura estas dos cuentas al iniciar únicamente en Desarrollo local, por lo que la clave anterior siempre vuelve a funcionar para la demostración. No uses estas credenciales ni `ResetDemoCredentials` en producción.

Si quieres probar un cambio de contraseña persistente, establece primero `Development:ResetDemoCredentials` en `false`. Para recuperar después una cuenta local, cierra la API y ejecuta:

```powershell
$env:NUTRIVIDA_CLAVE_TEMPORAL='OtraClaveTemporal2026#'
dotnet run --project backend\herramientas\NutriVida.RestablecerClave -- admin@nutrivida.local --demo-ready
```

Luego ingresa con la clave temporal indicada por la herramienta.

## 6. Orden correcto de trabajo

```text
Paciente
  → Atención
  → Evaluación + antropometría + diagnóstico PES
  → Cálculo energético
  → Catálogo de alimentos
  → Plato o preparación
  → Menú del paciente
  → Seguimiento
  → Reporte PDF
  → Correo o WhatsApp
```

La franja **Paciente activo** conecta los módulos. Antes de guardar, comprueba siempre que muestra el nombre correcto.

### Pacientes

Registra identificación, nombres, fecha, sexo usado por las fórmulas, contacto, objetivo y consentimientos. La app no permite fechas futuras, identificaciones repetidas, correos inválidos ni teléfonos fuera de 7 a 15 dígitos.

### Atención

Crea la cita con fecha, hora, duración y motivo. Esto alimenta la agenda; no reemplaza la evaluación clínica.

### Evaluación

Registra ingesta, horarios, alergias, intolerancias, sueño, ejercicio, estreñimiento, frecuencia y Bristol. Completa el diagnóstico PES revisado por la profesional. Bristol solo acepta valores de 1 a 7.

### Antropometría

Selecciona el paciente activo y pulsa **Nueva medición**. Registra fecha, peso, estatura y, cuando se hayan tomado, cintura, cadera y grasa corporal. Cada captura se conserva en el historial; **Editar** corrige el registro seleccionado sin borrar las demás fechas. Los indicadores de IMC y cintura/cadera son referencias matemáticas y requieren interpretación profesional.

### Cálculo energético

Selecciona fórmula, peso, talla, edad, sexo, actividad, ETA y ajuste. La pantalla muestra el desglose y la fuente; el resultado es una estimación que requiere criterio profesional.

### Catálogo → Platos → Menú

1. **Catálogo:** confirma que el alimento existe y que la fuente/edición está identificada.
2. **Platos:** combina alimentos, porciones y costo; la app calcula energía y nutrientes por porción. Foto y video son opcionales.
3. **Menú:** añade un plato guardado o alimentos individuales, completa las porciones y guarda el plan del paciente activo.

Los datos `EcuadorDemo` son ficticios. Antes del uso clínico se debe importar una tabla ecuatoriana o SMAE autorizada y registrar su edición.

### Seguimiento

Registra semana, peso, adherencia, ejercicio, sueño, Bristol, síntomas y nota profesional. El historial queda asociado al paciente activo.

### Reportes

Revisa el expediente y pulsa **Descargar PDF clínico**. El informe reúne identificación, objetivo, antropometría, evaluación integral, diagnóstico PES, cálculo energético, el último plan de alimentación con sus porciones y los seguimientos recientes. El PDF se genera en la API y la acción queda registrada en Auditoría.

### Mensajería

Selecciona paciente, plan, canal, asunto y mensaje. El consentimiento del canal es obligatorio. Si aparece **Consentimiento pendiente**, verifica el destino, marca la confirmación solamente después de recibir la autorización real del paciente y pulsa **Registrar autorización**. El borrador permanece en la pantalla y ya puedes usar **Preparar envío**. Esta acción registra el borrador y genera el PDF del plan elegido. Con SMTP o WhatsApp Cloud configurados, revisa el destino enmascarado, marca la confirmación y pulsa **Enviar PDF por correo** o **Enviar PDF por WhatsApp**. Sin proveedor configurado, se conserva la alternativa `mailto:` o `wa.me` con enlace temporal. Consulta `docs/CORREO-SMTP.md` y `docs/WHATSAPP-CLOUD.md` para activar cada proveedor sin publicar secretos.

### Usuarios, roles y auditoría

- **Nutricionista:** registra y edita el trabajo clínico.
- **Administrador único:** además gestiona usuarios, configuración, importaciones y auditoría; también puede archivar pacientes, atenciones, evaluaciones, cálculos, menús, seguimientos, mensajes, plantillas y platos.
- Las cuentas nuevas y las solicitudes de acceso siempre usan el rol **Nutricionista**.
- La URL directa de una sección administrativa muestra **Acceso restringido** al rol Nutricionista.
- Los registros se archivan; no existe eliminación definitiva desde la interfaz.

### Cómo comprobar que sí quedó guardado

Después de guardar, revisa la sección **Historial** o **Registros guardados** situada al final del mismo módulo. El formulario puede quedar limpio para permitir una captura nueva, pero el registro anterior permanece en SQL Server. Al pulsar **Editar**, sus datos vuelven al formulario; el botón principal cambia a **Actualizar**. Si recargas la página, el historial debe seguir visible mientras estén seleccionados el mismo **Paciente activo** y la misma base `NutriVidaClinicalDev`.

## 7. Plantillas rápidas

Las plantillas ahorran escritura, pero nunca guardan ni prescriben automáticamente:

- Evaluación: estructura una primera consulta.
- Seguimiento: propone una estructura de control.
- Menú: crea una base editable por objetivo o presupuesto.
- Mensajería: propone asunto y texto editables.

Todas se guardan en SQL Server separadas por módulo. **Crear plantilla** conserva una nueva base; **Editar** la actualiza y solo el Administrador puede **Archivar**. Pulsa **Usar como base**, personaliza los datos y después guarda con el botón principal del módulo.

## 8. Verificación completa

Con la API ejecutándose, el Administrador puede comprobar el flujo completo sin enviar mensajes externos:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verificar-flujo-completo.ps1 -Password 'NutriVida2026#'
```

Debe terminar con `"status": "PASS"`. El script crea un expediente `QA-...`, valida un Bristol incorrecto, y comprueba paciente, atención, evaluación, antropometría, PES, energía, plato, menú, seguimiento, PDF, auditoría y enlaces de correo/WhatsApp.

## 9. Problemas frecuentes

- **`address already in use` en 5158:** ya existe otra API abierta. Detén la anterior en Visual Studio o cierra su terminal; no inicies dos instancias.
- **Angular outside a workspace:** usa `npm --prefix frontend start` desde la raíz.
- **Error de conexión SQL:** abre Servicios de Windows y confirma que `SQL Server (MSSQLSERVER)` esté en ejecución. La cadena de desarrollo debe comenzar con `Server=.`.
- **Credenciales incorrectas:** confirma que la API conectó a `NutriVidaClinicalDev`; si es necesario, usa la herramienta de restablecimiento.
- **No aparece un registro en otro módulo:** selecciona el mismo **Paciente activo**, actualiza la lista y confirma que la API siga encendida.
- **WhatsApp o correo no habilitado:** registra primero el destino y el consentimiento correspondiente en Pacientes.

Para un ejemplo completo campo por campo, continúa con [GUIA-DE-REGISTRO.md](GUIA-DE-REGISTRO.md).
