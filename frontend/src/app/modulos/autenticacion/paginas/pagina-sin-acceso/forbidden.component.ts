import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../compartido/icono/icon.component';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page forbidden-page">
      <section class="surface forbidden-surface">
        <span class="forbidden-icon"><app-icon name="shield" /></span>
        <p class="eyebrow">Acceso restringido</p>
        <h1>Esta sección requiere otro permiso</h1>
        <p>
          Tu sesión está activa, pero tu rol no permite administrar esta sección. Si necesitas
          acceso, comunícate con la persona administradora de la clínica.
        </p>
        <a class="button button-primary" routerLink="/inicio">Volver al inicio</a>
      </section>
    </div>
  `,
  styles: [
    `
      .forbidden-page {
        min-height: calc(100dvh - 2rem);
        display: grid;
        place-items: center;
      }
      .forbidden-surface {
        width: min(100%, 36rem);
        padding: clamp(1.6rem, 5vw, 3.5rem);
        text-align: center;
      }
      .forbidden-icon {
        width: 4.5rem;
        height: 4.5rem;
        margin: 0 auto 1.25rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--primary);
        background: var(--surface-muted);
      }
      .forbidden-icon app-icon {
        width: 2.2rem;
        height: 2.2rem;
      }
      .forbidden-surface p:not(.eyebrow) {
        margin: 0 auto 1.5rem;
        color: var(--text-muted);
        line-height: 1.6;
      }
    `,
  ],
})
export class ForbiddenComponent {}
