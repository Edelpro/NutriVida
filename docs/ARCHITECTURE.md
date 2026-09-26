# Arquitectura

## Decisión

Monolito modular con dos aplicaciones desplegables:

- `frontend`: Angular 22, TypeScript, HTML y SCSS.
- `backend`: ASP.NET Core 10, C# 14, Entity Framework Core 10 y SQL Server.

Esta estructura conserva separación por dominio sin el costo operativo de microservicios prematuros.

## Capas del backend

- `NutriVida.Domain`: entidades, enumeraciones e invariantes.
- `NutriVida.Application`: casos de uso, contratos, DTO y cálculos puros.
- `NutriVida.Infrastructure`: EF Core, SQL Server, sembrado e integraciones.
- `NutriVida.Api`: HTTP, autenticación, autorización y composición.

Cada módulo clínico conserva carpetas propias dentro de las capas. Los controladores coordinan HTTP, validación de entrada y persistencia; las reglas clínicas calculables, como energía, viven en servicios de aplicación puros y probados.

En Angular, cada módulo usa una sección vertical `modulos/<módulo>` con `paginas`, `modelos` y `acceso-datos` cuando corresponde. La sesión JWT y el contexto de paciente activo viven en `nucleo`; las barras, iconos y notificaciones reutilizables viven en `compartido`.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| Pacientes | Identidad, contacto, estado, consentimientos y asignación al nutricionista responsable |
| Atención | Episodios de atención y agenda |
| Historia clínica | Antecedentes, medicación, laboratorios y notas |
| Evaluaciones | Ingesta, alergias, intolerancias, sueño, ejercicio y digestión |
| Antropometría | Peso, talla, perímetros y composición corporal |
| Cálculo energético | Fórmulas de REE/BMR, actividad, ETA y objetivo |
| Alimentos | Catálogos Ecuador, SMAE y alimentos personalizados |
| Platos | Preparaciones reutilizables, ingredientes, costo estimado y nutrición por porción |
| Plantillas | Bases editables para objetivos, condiciones, presupuesto y seguimiento |
| Planes de menú | Porciones, comidas, días y metas de macronutrientes |
| Seguimientos | Registro semanal y evolución |
| Reportes | Documentos aprobados, trazabilidad y entrega |
| Mensajería | Correo, WhatsApp, consentimiento e idempotencia |
| Identidad/Auditoría | Usuarios, roles, permisos y bitácora inmutable |

## Datos y despliegue

- Desarrollo: instancia local completa de SQL Server (`MSSQLSERVER`).
- Producción: SQL Server administrado, TLS, cifrado de respaldos y secretos fuera del repositorio.
- La API usa control de concurrencia por `rowversion` en registros clínicos.
- Las operaciones externas usan una clave de idempotencia y confirmación pesimista.
- Las migraciones de EF Core son el mecanismo de evolución de esquema.
- La autorización clínica usa un filtro central de pacientes: Administración opera sobre toda la clínica y cada nutricionista únicamente sobre los identificadores que tiene asignados. Atenciones, evaluaciones, diagnósticos, energía, menús, seguimientos, reportes, mensajería y dashboard reutilizan ese filtro.
