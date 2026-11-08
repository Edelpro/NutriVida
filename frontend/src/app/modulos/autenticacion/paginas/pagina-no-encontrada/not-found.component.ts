import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../compartido/icono/icon.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="page">
      <section class="surface empty-state">
        <div>
          <app-icon name="info" />
          <h1>Esta página no existe</h1>
          <p>Puede que el enlace esté incompleto o que la página se haya movido.</p>
          <a class="button button-primary" routerLink="/inicio">Volver al inicio</a>
        </div>
      </section>
    </div>
  `,
})
export class NotFoundComponent {}
