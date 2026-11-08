# Guía de módulos y carpetas

Esta guía explica cómo está dividido NutriVida y dónde agregar código sin mezclar la interfaz, la lógica y el acceso a datos.

## Recorrido de una operación

```text
Pantalla Angular
  -> servicio de acceso a datos del módulo
  -> controlador protegido de ASP.NET Core
  -> reglas y entidades del dominio
  -> Entity Framework Core
  -> SQL Server
```

La pantalla nunca escribe directamente en SQL Server. La API valida la identidad, el rol y los datos antes de guardar.

## Angular

Ruta base: `frontend/src/app`.

- `nucleo/`: autenticación JWT, protección de rutas, configuración HTTP y paciente activo. Se usa en toda la aplicación.
- `compartido/`: iconos, notificaciones y piezas visuales reutilizables. No contiene reglas de un módulo clínico concreto.
- `modulos/`: una carpeta independiente para cada área funcional.

Cada módulo sigue esta estructura:

```text
modulos/<nombre>/
  paginas/        Componentes HTML, SCSS y TypeScript que ve la persona usuaria
  modelos/        Interfaces y tipos de datos del módulo
  acceso-datos/   Servicios Angular que llaman a la API
```

Ejemplo de Usuarios:

```text
modulos/usuarios/
  paginas/pagina-usuarios/
    users.component.ts       Estado, validación y acciones de la pantalla
    users.component.html     Formulario, tabla y mensajes accesibles
    users.component.scss     Diseño responsivo del módulo
  modelos/user.models.ts     Contratos TypeScript
  acceso-datos/users-api.service.ts
                             GET, POST y PUT hacia /api/users
```

Los nombres visibles están en español. Algunos nombres de clases permanecen en inglés técnico (`UsersComponent`, `UserRole`) para conservar contratos existentes y evitar romper importaciones; no afecta lo que ve el usuario.

## API y dominio

Ruta base: `backend/src`.

- `NutriVida.Api/Controladores/`: puntos de entrada HTTP, separados por módulo en carpetas en español; Seguimientos y PlanesMenu tienen controladores independientes.
- `NutriVida.Application/`: cálculos y casos de uso que no dependen de la pantalla.
- `NutriVida.Domain/`: entidades clínicas y reglas centrales.
- `NutriVida.Infrastructure/`: Entity Framework Core, SQL Server, migraciones, seguridad y datos iniciales.

En Usuarios, `Controladores/Usuarios/UsersController.cs` lista, crea y actualiza cuentas. Solo acepta el rol `ClinicAdmin`, limita los datos a la clínica del token y nunca devuelve hashes de contraseña.

## Módulos funcionales

| Módulo | Responsabilidad |
|---|---|
| Autenticación | Iniciar sesión, conservar sesión JWT, solicitar acceso sin registro público y forzar el cambio de una contraseña temporal. |
| Usuarios | Crear cuentas internas, asignar roles, activar/desactivar y restablecer contraseña temporal. |
| Diagnóstico PES | Problema, etiología y signos o síntomas con lista de códigos, aprobación y archivo. También puede registrarse desde la Evaluación. |
| Configuración | Nombre del consultorio para los PDF, dirección y criterios predeterminados del cálculo energético. |
| Pacientes | Datos personales, contacto, objetivo, consentimientos y asignación al nutricionista responsable. La ficha reúne en una sola pantalla el avance por etapas, alergias, próxima atención e historia del paciente. |
| Atención | Agenda y registro de cada consulta. |
| Evaluaciones | Historia clínica, ingesta, alergias, intolerancias, sueño, ejercicio, tránsito intestinal, Bristol y diagnóstico PES. |
| Antropometría | Fecha, peso, estatura, cintura, cadera, grasa corporal, observaciones e historial de evolución por paciente. |
| Cálculo energético | Fórmulas de gasto energético, actividad física y efecto térmico de los alimentos. |
| Seguimiento y evolución | Control en cualquier fecha, período evaluado opcional, próximo control, peso, adherencia, ejercicio, sueño, síntomas y ajustes. |
| Planes de menú | Comidas, porciones, equivalentes y totales nutricionales por paciente. |
| Alimentos | Catálogo versionado; tablas autorizadas de Ecuador y SMAE mediante importación. |
| Reportes | Resumen clínico y evolución del expediente activo. |
| Mensajería | Preparación de correo o WhatsApp con consentimiento y confirmación humana. |
| Configuración | Datos de la clínica y opciones administrativas. |

## Roles

- `ClinicAdmin` — Administrador: gestiona usuarios y configuración, ve todos los pacientes de la clínica y asigna o reasigna al profesional responsable.
- `Nutritionist` — Nutricionista: trabaja solamente con sus pacientes asignados, su expediente, evaluación, cálculos, planes y reportes.

La API decide siempre si una operación está permitida. Ocultar un botón en Angular mejora la experiencia, pero no sustituye la autorización del servidor.

## Cómo agregar un campo nuevo

1. Añadir la propiedad en la entidad del dominio si debe persistirse.
2. Actualizar la configuración de Entity Framework y crear una migración.
3. Añadir el dato al contrato del controlador y validar su formato.
4. Actualizar el modelo y el servicio `acceso-datos` de Angular.
5. Incorporar el control en la página con etiqueta, error y estado de carga.
6. Agregar una prueba de la regla y ejecutar las pruebas de backend y frontend.

No se debe guardar información clínica en `localStorage`; allí solo se conserva la sesión necesaria. Los registros enviados se persisten en SQL Server.
