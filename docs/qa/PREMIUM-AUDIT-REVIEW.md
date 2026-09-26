# Revisión de hallazgos del auditor UI

Fecha: 2026-09-25.

El auditor base reportó 54 veces la regla `affordance.actionless-button`. Se revisaron individualmente y no son botones sin acción: el analizador reconoce `onclick`, `@click` y `v-on:click`, pero no reconoce el enlace de eventos de Angular `(click)`. Los botones de envío también usan `type="submit"` dentro de formularios Angular. El build, las pruebas Angular y la comprobación real en navegador confirman los manejadores.

| Archivo | Líneas reportadas | Resolución comprobada |
|---|---:|---|
| `frontend/src/app/app.html` | 54 | El scrim ejecuta `(click)="menuOpen.set(false)"`. |
| `frontend/src/app/modulos/autenticacion/paginas/pagina-acceso/login.component.html` | 54, 139, 210, 238 | Copiar, alternar modo y revelar contraseña tienen `(click)` real. |
| `frontend/src/app/modulos/autenticacion/paginas/pagina-cambio-clave/change-password.component.html` | 31, 61, 97 | Revelar claves y cerrar sesión tienen `(click)` real. |
| `frontend/src/app/modulos/plantillas/paginas/tarjetas-plantillas/quick-templates.component.html` | 8, 19, 30, 39, 53, 59, 79, 180, 209, 216 | Alta, recarga, aplicación, edición, archivo y cierre del diálogo tienen `(click)` real o envío de formulario. |
| `frontend/src/app/modulos/platos/paginas/pagina-platos/dishes.component.html` | 12, 78, 94, 116, 126, 177, 191, 199, 222, 231, 253, 336, 384, 435, 498, 523, 639, 670, 677 | Alta, filtros, reintento, receta, edición, archivo, paginación, ingredientes y cierre tienen `(click)` real. |
| `frontend/src/app/modulos/usuarios/paginas/pagina-usuarios/users.component.html` | 7, 22, 39, 60, 63, 72, 75, 102, 127, 202, 219, 229, 258, 380, 442, 450, 457 | Alta, búsqueda, reintento, edición, paginación, cierre, revelado, confirmación y guardado tienen `(click)` real. |

La interacción fue además comprobada en navegador. No se cambió el tipo semántico de los botones ni se añadieron manejadores inline solo para satisfacer una limitación del analizador.
