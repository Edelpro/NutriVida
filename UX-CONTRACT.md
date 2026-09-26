# UX Contract

## Product context

- Audience: nutricionistas y administradores de una consulta personal.
- Primary jobs: registrar, evaluar, planificar, dar seguimiento y entregar documentación.
- Target market(s): Ecuador.
- Active locales: `es-EC`.
- Language/content register and native-review policy: español profesional; revisión de dominio por nutricionista ecuatoriano antes de producción.
- Timezone/calendar policy: `America/Guayaquil`, calendario gregoriano; las fechas clínicas sin hora se guardan como fecha, no como instante UTC.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope                | Authoritative source       | Source type                           | Reviewed date |
| ----------------------------- | -------------------------- | ------------------------------------- | ------------- |
| Product scope                 | `PRODUCT.md`               | Product brief                         | 2026-09-06    |
| Permission model              | `docs/SECURITY.md`         | Security policy, provisional          | 2026-09-06    |
| Data lifecycle                | `docs/ARCHITECTURE.md`     | Domain/architecture spec              | 2026-09-06    |
| Deletion / retention          | `docs/SECURITY.md`         | Decision pending; hard delete blocked | 2026-09-06    |
| Billing / payment             | `PRODUCT.md`               | Out of scope                          | 2026-09-06    |
| Legal / regulatory copy       | `docs/SECURITY.md`         | Legal review required                 | 2026-09-06    |
| Market / clinical conventions | `docs/CLINICAL-SOURCES.md` | Primary-source review                 | 2026-09-06    |

## Visual contract

- Project `DESIGN.md`: `/DESIGN.md`.
- Token ownership model: existing runtime canonical (model B).
- Runtime design-system/token source: `frontend/src/styles.scss`.
- Mapping/export/adapters: CSS custom properties consumed by shell and shared primitives.
- Token drift gate: lint `DESIGN.md`, then compare token names/values in review.
- Supported themes: light; forced-colors compatible.
- Design-context owner/review policy: durable changes update `DESIGN.md` and runtime tokens together.

## Canonical UI Map

| Capability      | Canonical owner                                               | Source of truth | Allowed variants                 | Verification        |
| --------------- | ------------------------------------------------------------- | --------------- | -------------------------------- | ------------------- |
| Table Selection | contrato de tabla en `compartido`                             | This file       | page                             | component + browser |
| Select/Listbox  | native select, platform popup accepted for MVP                | This file       | native                           | keyboard + popup    |
| Date            | typed/native date, platform popup accepted for MVP            | This file       | typed / native                   | locale + keyboard   |
| Form            | Angular form + shared field classes                           | This file       | create / edit                    | validation test     |
| Scrollbar       | global `styles.scss`                                          | `DESIGN.md`     | stable gutter                    | computed style      |
| Toast           | `frontend/src/app/compartido/notificaciones/toast.service.ts` | This file       | success / warning / info / error | live region         |
| CRUD            | feature service + API controller                              | `PRODUCT.md`    | return / stay                    | full flow           |

El recetario admite una fotografía opcional validada en cliente y servidor (JPG, PNG o WebP, máximo 5 MB) y un enlace web opcional para video demostrativo. La multimedia no contiene datos del paciente y no participa en cálculos nutricionales.

## Component behavior

| Component    | Default                | Hover             | Focus         | Active                   | Disabled          | Busy               | Error                     |
| ------------ | ---------------------- | ----------------- | ------------- | ------------------------ | ----------------- | ------------------ | ------------------------- |
| Button       | clear label            | stronger contrast | two-tone ring | 1px press                | muted, no handler | stable spinner     | persistent inline context |
| Icon button  | accessible name        | soft surface      | visible ring  | press                    | muted             | stable             | adjacent text             |
| Input        | labeled                | border darkens    | ring          | n/a                      | muted             | adornment slot     | text + aria association   |
| Secret input | masked                 | standard          | ring          | toggle                   | n/a               | n/a                | generic credential error  |
| Search       | clear + 300ms debounce | standard          | ring          | Enter when not composing | n/a               | reserved adornment | retry region              |
| Textarea     | resize none            | standard          | ring          | n/a                      | muted             | n/a                | text + aria association   |
| Table/list   | bounded page           | row highlight     | focus within  | selected row explicit    | n/a               | stable overlay     | retry row                 |

## Dataset navigation

- Ruta del plan nutricional: **Catálogo → Platos → Menú del paciente → Seguimiento**. La ruta comunica posición, no finalización; una etapa anterior no se marca como completada sin evidencia de datos.
- El selector `Paciente activo` abre una ficha de identificación y contacto en modo lectura. Cambiar la selección nunca edita ni guarda datos; `Editar datos` abre el formulario canónico del módulo Pacientes y exige guardado explícito.

- Admin tables: server pagination.
- Exploratory lists: explicit load more.
- URL state: search, filters, sort, page and page size.
- Page size: 10, 20 or 50; default 10.
- Empty/no-results/error/loading treatment: stable region with create, clear or retry action.
- Back/scroll restoration: URL restores list state; returning from detail focuses the originating row when possible.
- Selection scope: current page only in MVP; filter/sort/page clears selection and announces the change.

## Flow ledger

| Operation                   | Trigger                  | Pending                | Success destination           | Success feedback            | Failure recovery                                         | Focus outcome                    | Source ref            |
| --------------------------- | ------------------------ | ---------------------- | ----------------------------- | --------------------------- | -------------------------------------------------------- | -------------------------------- | --------------------- |
| Create                      | Nuevo paciente           | stable busy button     | patient list                  | Paciente creado             | preserve form + retry                                    | new row/list heading             | `PRODUCT.md`          |
| Select patient              | Selector Paciente activo | stable selector        | latest saved clinical summary | expediente actualizado      | retry patient data                                       | summary heading                  | This contract         |
| Edit patient from context   | Editar datos             | stable patient dialog  | patient list/current context  | Paciente actualizado        | preserve form + retry                                    | patient summary                  | This contract         |
| Edit assessment             | Editar evaluación        | stable busy button     | saved clinical summary        | Evaluación actualizada      | preserve form + retry                                    | summary heading                  | `PRODUCT.md`          |
| Login                       | Ingresar                 | stable busy button     | requested protected route     | authenticated shell         | generic credential error                                 | page heading                     | `docs/SECURITY.md`    |
| First password change       | Guardar y continuar      | stable busy button     | dashboard                     | Contraseña actualizada      | preserve fields + inline error                           | first invalid field/card heading | `docs/SECURITY.md`    |
| Request nutritionist access | Solicitar acceso         | stable busy button     | same card                     | solicitud pendiente enviada | preserve values + duplicate explanation                  | request summary                  | `docs/SECURITY.md`    |
| Approve access request      | Aceptar y crear cuenta   | dialog busy button     | same users page               | solicitud aprobada          | preserve dialog + refresh pending list                   | new user row                     | `docs/SECURITY.md`    |
| Reject access request       | Confirmar rechazo        | inline busy button     | same users page               | solicitud rechazada         | keep request + retry                                     | pending request list             | `docs/SECURITY.md`    |
| Create personalized food    | Nuevo alimento           | stable busy button     | same catalog                  | alimento creado             | preserve form + field errors                             | created catalog row              | `PRODUCT.md`          |
| Create user                 | Crear usuario            | dialog busy button     | same paginated list           | Usuario creado              | dialog preserves values                                  | new row/list heading             | `docs/SECURITY.md`    |
| Create dish template        | Crear plantilla de plato | dialog busy button     | same paginated library        | Plantilla creada            | dialog preserves ingredients                             | new row/list heading             | `PRODUCT.md`          |
| Use dish in menu            | Usar plato               | stable button          | same menu builder             | Plato añadido               | keep current menu                                        | menu item list                   | `PRODUCT.md`          |
| Apply quick template        | Usar como base           | stable button          | same owning module            | Plantilla aplicada          | preserve protected fields; draft remains editable        | first completed field            | `PRODUCT.md`          |
| Send WhatsApp PDF           | Enviar PDF por WhatsApp  | stable busy button     | same messaging screen         | Aceptado por WhatsApp       | preserve prepared PDF; never blind-retry                 | delivery status                  | `docs/SECURITY.md`    |
| Create quick template       | Crear plantilla          | dialog busy button     | same module-scoped library    | Plantilla creada            | dialog preserves values; API rejects cross-module fields | new card/library heading         | `PRODUCT.md`          |
| Apply assessment template   | Usar plantilla           | stable button          | same assessment               | Plantilla aplicada          | preserve every non-empty field                           | first completed field            | `PRODUCT.md`          |
| Apply follow-up template    | Usar plantilla           | stable button          | same follow-up                | Plantilla aplicada          | preserve an existing professional note                   | professional note                | `PRODUCT.md`          |
| Apply message template      | Usar plantilla           | stable button          | same messaging form           | Mensaje base aplicado       | editable subject/body; prepared action cleared           | message subject                  | `PRODUCT.md`          |
| Change role/status          | Guardar cambios          | confirmation then busy | same paginated list           | Cambios guardados           | dialog preserves values                                  | edited row/list heading          | `docs/SECURITY.md`    |
| Prepare message             | Preparar envío           | stable busy button     | same page                     | direct channel link         | preserve message + consent guidance                      | channel action                   | `docs/SECURITY.md`    |
| Edit                        | Guardar cambios          | stable busy button     | stay in clinical workflow     | Cambios guardados           | preserve values + retry                                  | page heading                     | `PRODUCT.md`          |
| Delete                      | unavailable              | n/a                    | n/a                           | n/a                         | n/a                                                      | n/a                              | `docs/SECURITY.md`    |
| Search                      | Buscar pacientes         | table overlay          | same URL                      | result count                | retry + keep query                                       | search/results                   | This contract         |
| Bulk action                 | Archivar seleccionados   | dialog pending         | same list                     | count archived              | dialog stays open                                        | next row/list                    | `docs/SECURITY.md`    |
| Upload/background job       | Importar catálogo        | progress by stage      | import result                 | summary                     | failed rows downloadable                                 | summary heading                  | `docs/DATA-IMPORT.md` |
| Cancel/back                 | Cancelar                 | none                   | originating context           | none                        | unsaved dialog                                           | originating trigger              | This contract         |
| Soft-delete                 | Archivar                 | warning dialog         | valid list page               | Archivado + restore         | dialog retry                                             | next row                         | `docs/SECURITY.md`    |
| Hard-delete (irreversible)  | blocked                  | n/a                    | n/a                           | n/a                         | n/a                                                      | n/a                              | `docs/SECURITY.md`    |

## Navigation and responsive behavior

- Guided intervention route: `Alimentos → Platos → Plan de menú → Seguimiento`; the same compact navigator appears on all four screens, marks the current stage in text and color, explains only the current task, and exposes explicit `Anterior` and `Siguiente` navigation. The first stage omits `Anterior`; the fourth closes the route with `Finalizar: Ver reportes`. The sidebar repeats the numbered sequence inside a dedicated `Plan nutricional` group.
- Dish-to-menu handoff: every saved dish exposes `Usar en un plan`; navigation preserves the selected dish in the URL and the menu builder confirms which dish is ready to add.
- Menu construction: choose meal/day first, then choose exactly one method: `plato guardado` or `alimento individual`. Templates are optional and collapsed by default; review/save remains the final numbered section.
- Route document title policy: `{Página} — NutriVida`, sin PII.
- Route error / 403 page behavior: vistas propias con navegación al inicio; 403 y 404 no se confunden.
- Breadcrumb/tab/route-state policy: breadcrumbs solo para jerarquía clínica; pasos de evaluación no se presentan como pestañas.
- Sidebar/drawer/bottom-sheet transformation: sidebar persistente sobre 900px; cajón modal accesible debajo.
- Responsive table strategy: desbordamiento horizontal con identificador visible; no ocultar columnas críticas.
- Truncation/full-value access: valores clínicos importantes envuelven; identificadores pueden copiarse desde detalle.
- Focus restoration and sticky-obstruction policy: `scroll-margin` protege campos; diálogos restauran el disparador.

## Overlays and feedback

- Dialog primitive: diálogo compartido, modal, foco contenido, Escape y restauración.
- Destructive confirmation levels: warning para archivo; danger únicamente para eliminación irreversible futura.
- Toast placement/duration/deduplication: arriba derecha, 5s, errores persistentes, deduplicación 2s.
- Alert/banner scope and persistence: inline para campo/formulario, página para conectividad, global solo para sesión/incidente.
- Tooltip delay/dismissal: 300ms, hover/focus, Escape.
- Unsaved-changes behavior: diálogo interno; `beforeunload` solo al cerrar pestaña.
- Layer/z-index contract: dropdown 200, popover 300, header 400, backdrop 500, dialog 600, drawer 700, command 800, toast 900.

## Async and resilience

- Mutation default: pesimista para datos clínicos y envíos externos.
- Idempotency and duplicate-submit policy: botón busy + clave de idempotencia en comunicaciones.
- Auto-save/draft recovery: evaluación y mensajería permiten borrador explícito por paciente en `sessionStorage`; los datos enviados se conservan en SQL Server.
- Offline/read-stale/write behavior: conservar lectura ya cargada; bloquear escritura y ofrecer reintento.
- Retry/backoff/timeout behavior: reintento manual; automático solo para GET idempotente y acotado.
- Version conflict and multi-tab behavior: `rowversion`, respuesta 409 y opción recargar/copiar cambios.
- Session expiry/re-authentication: conservar campos no sensibles en memoria y regresar al flujo.
- Long-running progress and return path: importes/reportes muestran etapa, no porcentaje falso.
- Stale-request cancellation/invalidation and pending-state ownership: `switchMap`/cancelación para búsqueda.
- Dialog/form preservation and retry after mutation failure: no cerrar ni borrar contenido antes de confirmación.

## Validation

- Schema/validation layer: DataAnnotations/validadores de aplicación en servidor; Angular en cliente.
- Trigger timing: submit y luego blur/cambio para campos con error.
- Error summary/inline policy: resumen en formularios largos y error asociado al campo.
- Server error mapping: `ProblemDetails` y errores de campo.
- Sensitive-value handling: no rutas, logs, toast ni almacenamiento local.
- Todos los formularios usan `novalidate`, foco al primer error, prevención de doble envío y conservación de valores.

## Permission and clipboard

- Permission UI strategy: ocultar Usuarios y Configuración cuando el rol no sea `ClinicAdmin`; Administración ve todos los pacientes y el campo de asignación, mientras Nutricionista ve solo sus pacientes y recibe la asignación automática al crear; crear/editar platos está disponible para ambos roles y archivar solo para `ClinicAdmin`; deshabilitar y explicar acciones visibles. El servidor devuelve 404 ante un expediente ajeno para impedir su enumeración por URL.
- Account provisioning: no hay registro público. `Solicitar acceso` guarda una petición pendiente con límite de intentos; el alta real ocurre cuando `ClinicAdmin` la aprueba, asigna contraseña temporal y el servidor crea una cuenta `Nutritionist`.
- Clipboard copy policy: vista truncada + botón; el toast nunca contiene el valor.
- Disabled-state explanation: ayuda visible o tooltip accesible con rol requerido.

## Verification

- Required static commands: `npm run build`, `npm test -- --watch=false`, `dotnet test backend/NutriVida.sln`, auditor premium estricto.
- Browser/device/locale/theme matrix: escritorio 1440x1000, móvil 390x844, `es-EC`, forced colors/reduced motion inspeccionados.
- Accessibility checks: semántica, teclado, foco, contraste y nombres accesibles.
- Native-language/domain review and target-user evidence: pendiente revisión final por nutricionista ecuatoriano.
- Component-state/visual regression coverage: capturas de dashboard y evaluación.
- Canonical sibling flow used for comparison: dashboard y evaluación comparten shell, acciones y feedback.
- Project audit command/result: se registra en `premium-audit.json`.
- CRUD full-flow evidence: `docs/qa/VERIFICATION.md`.
- Failure-path evidence: `docs/qa/VERIFICATION.md`.
