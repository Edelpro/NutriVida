import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
@Component({
  selector: 'app-settings',
  imports: [FormsModule, IconComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Configuración</h1>
        <p class="lede">
          Datos del consultorio, criterios predeterminados y preparación de integraciones.
        </p>
      </div>
      <button class="button button-primary" type="button" (click)="save()">Guardar cambios</button>
    </header>
    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Secciones de configuración">
        <a class="active" href="#practice">Consultorio</a><a href="#clinical">Criterios clínicos</a
        ><a href="#integrations">Integraciones</a><a href="#security">Seguridad</a>
      </nav>
      <div class="settings-content">
        <section id="practice" class="surface">
          <header class="surface-header"><h2>Consultorio</h2></header>
          <div class="surface-body form-grid">
            <div class="field col-6">
              <label for="practiceName">Nombre</label
              ><input id="practiceName" [(ngModel)]="practiceName" /><small
                >Visible en reportes y mensajes.</small
              >
            </div>
            <div class="field col-6">
              <label for="timezone">Zona horaria</label
              ><select id="timezone">
                <option>America/Guayaquil (UTC−5)</option></select
              ><small>Base para agenda y auditoría.</small>
            </div>
            <div class="field col-12">
              <label for="address">Dirección</label
              ><input id="address" value="Quito, Ecuador" /><small>&nbsp;</small>
            </div>
          </div>
        </section>
        <section id="clinical" class="surface">
          <header class="surface-header"><h2>Criterios clínicos</h2></header>
          <div class="surface-body form-grid">
            <div class="field col-6">
              <label for="defaultFormula">Fórmula predeterminada</label
              ><select id="defaultFormula">
                <option>Mifflin–St Jeor</option>
                <option>Harris–Benedict revisada</option></select
              ><small>Siempre puede cambiarse por evaluación.</small>
            </div>
            <div class="field col-6">
              <label for="etaDefault">ETA predeterminado</label
              ><input id="etaDefault" type="number" value="10" min="0" max="30" /><small
                >Porcentaje editable; no se aplica ocultamente.</small
              >
            </div>
            <div class="col-12 notice">
              <app-icon name="info" />Las fórmulas Schofield/FAO y DRI quedan deshabilitadas hasta
              completar variantes y validación clínica.
            </div>
          </div>
        </section>
        <section id="integrations" class="surface">
          <header class="surface-header"><h2>Integraciones</h2></header>
          <div class="surface-body integrations">
            <div>
              <span class="integration-icon"><app-icon name="mail" /></span>
              <p><strong>Correo transaccional</strong><small>Proveedor no configurado</small></p>
              <span class="badge badge-warning">Pendiente</span>
            </div>
            <div>
              <span class="integration-icon"><app-icon name="phone" /></span>
              <p>
                <strong>WhatsApp Business</strong
                ><small>Proveedor y plantillas no configurados</small>
              </p>
              <span class="badge badge-warning">Pendiente</span>
            </div>
            <div>
              <span class="integration-icon"><app-icon name="food" /></span>
              <p>
                <strong>Catálogos alimentarios</strong
                ><small>Importación autorizada por edición</small>
              </p>
              <span class="badge">Disponible</span>
            </div>
          </div>
        </section>
        <section id="security" class="surface">
          <header class="surface-header"><h2>Seguridad y privacidad</h2></header>
          <div class="surface-body">
            <div class="notice">
              <app-icon name="info" /><span
                >Desarrollo usa una identidad local controlada. Producción exige proveedor JWT,
                roles, secretos externos, HTTPS y revisión LOPDP antes del despliegue.</span
              >
            </div>
            <ul class="security-list">
              <li><app-icon name="check" /> Archivado en lugar de borrado clínico</li>
              <li><app-icon name="check" /> Control de concurrencia por versión</li>
              <li><app-icon name="check" /> Consentimiento separado por canal</li>
              <li><app-icon name="check" /> Destinos enmascarados en auditoría</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>`,
  styles: [
    `
      .settings-layout {
        display: grid;
        grid-template-columns: 12rem minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .settings-nav {
        position: sticky;
        top: 5rem;
        display: grid;
        padding: 0.5rem;
        background: white;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
      }
      .settings-nav a {
        padding: 0.7rem;
        color: var(--text-muted);
        font-size: 0.8rem;
        font-weight: 700;
        text-decoration: none;
        border-radius: 0.45rem;
      }
      .settings-nav a.active,
      .settings-nav a:hover {
        background: var(--surface-muted);
        color: var(--primary-dark);
      }
      .settings-content {
        display: grid;
        gap: 1rem;
      }
      .integrations {
        display: grid;
        gap: 0.2rem;
      }
      .integrations > div {
        min-height: 4rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.7rem;
        border-bottom: 1px solid #eeeae2;
      }
      .integrations > div:last-child {
        border: 0;
      }
      .integration-icon {
        width: 2.3rem;
        height: 2.3rem;
        display: grid;
        place-items: center;
        border-radius: 0.5rem;
        background: var(--avocado-soft);
        color: var(--primary);
      }
      .integrations p,
      .integrations strong,
      .integrations small {
        display: block;
        margin: 0;
      }
      .integrations small {
        margin-top: 0.2rem;
        color: var(--text-muted);
        font-size: 0.7rem;
      }
      .security-list {
        margin: 1rem 0 0;
        padding: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.7rem;
        list-style: none;
      }
      .security-list li {
        display: flex;
        gap: 0.5rem;
        color: var(--text-muted);
        font-size: 0.78rem;
      }
      .security-list app-icon {
        color: var(--primary);
      }
      @media (max-width: 760px) {
        .settings-layout {
          grid-template-columns: 1fr;
        }
        .settings-nav {
          position: static;
          grid-template-columns: 1fr 1fr;
        }
        .security-list {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SettingsComponent {
  private readonly toast = inject(ToastService);
  practiceName = 'NutriVida · Consulta nutricional';
  readonly saving = signal(false);
  save(): void {
    this.toast.show(
      'success',
      'Configuración guardada',
      'Los cambios de desarrollo se conservaron en esta sesión.',
    );
  }
}
