import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { ApiService, ClinicSettings, MessagingIntegrationStatus } from '../../../../nucleo/api.service';
@Component({
  selector: 'app-settings',
  imports: [FormsModule, IconComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Configuración</h1>
        <p class="lede">
          Datos del consultorio, criterios predeterminados y estado de las integraciones.
        </p>
      </div>
      <button class="button button-primary" type="button" [disabled]="saving() || !loaded()" (click)="save()">
        {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
      </button>
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
              ><input id="practiceName" name="practiceName" maxlength="160" [(ngModel)]="form.practiceName" /><small
                >Aparece en el encabezado de los reportes PDF.</small
              >
            </div>
            <div class="field col-6">
              <label for="timezone">Zona horaria</label
              ><select id="timezone" disabled>
                <option>America/Guayaquil (UTC−5)</option></select
              ><small>Base para agenda y auditoría.</small>
            </div>
            <div class="field col-12">
              <label for="address">Dirección</label
              ><input id="address" name="address" maxlength="300" [(ngModel)]="form.address" /><small>&nbsp;</small>
            </div>
          </div>
        </section>
        <section id="clinical" class="surface">
          <header class="surface-header"><h2>Criterios clínicos</h2></header>
          <div class="surface-body form-grid">
            <div class="field col-6">
              <label for="defaultFormula">Fórmula predeterminada</label
              ><select id="defaultFormula" name="defaultFormula" [(ngModel)]="form.defaultFormula">
                <option [ngValue]="0">Mifflin–St Jeor</option>
                <option [ngValue]="1">Harris–Benedict revisada</option></select
              ><small>Valor inicial; puede cambiarse en cada cálculo.</small>
            </div>
            <div class="field col-6">
              <label for="etaDefault">ETA predeterminado</label
              ><input id="etaDefault" name="etaDefault" type="number" min="0" max="30" [(ngModel)]="etaPercent" /><small
                >Valor inicial; puede cambiarse en cada cálculo.</small
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
              <p>
                <strong>Correo transaccional</strong
                ><small>{{
                  integrationStatus()?.email?.configured
                    ? 'SMTP configurado para envío de PDF'
                    : 'SMTP no configurado; se mantiene el enlace manual'
                }}</small>
              </p>
              <span
                class="badge"
                [class.badge-warning]="!integrationStatus()?.email?.configured"
                >{{ integrationStatus()?.email?.configured ? 'Disponible' : 'Pendiente' }}</span
              >
            </div>
            <div>
              <span class="integration-icon"><app-icon name="phone" /></span>
              <p>
                <strong>WhatsApp Business</strong
                ><small>{{
                  integrationStatus()?.whatsApp?.configured
                    ? 'WhatsApp Cloud configurado para envío de PDF'
                    : 'WhatsApp Cloud no configurado; se mantiene el enlace manual'
                }}</small>
              </p>
              <span
                class="badge"
                [class.badge-warning]="!integrationStatus()?.whatsApp?.configured"
                >{{
                  integrationStatus()?.whatsApp?.configured ? 'Disponible' : 'Pendiente'
                }}</span
              >
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
                >Antes de atender pacientes reales falta configurar el servidor seguro y completar la
                revisión legal de protección de datos (LOPDP).</span
              >
            </div>
            <ul class="security-list">
              <li><app-icon name="check" /> Los registros clínicos se archivan, no se borran</li>
              <li><app-icon name="check" /> Aviso si otra persona cambió el mismo paciente</li>
              <li><app-icon name="check" /> Autorización separada para correo y WhatsApp</li>
              <li><app-icon name="check" /> Correos y teléfonos parcialmente ocultos en el historial</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>`,
  styles: [
    `
      input:disabled,
      select:disabled {
        color: var(--text-muted);
        background: var(--surface-muted);
      }
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
        font-size: 0.72rem;
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
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  form: ClinicSettings = { practiceName: '', address: '', defaultFormula: 0, defaultEtaPercent: 0.1 };
  etaPercent = 10;
  readonly saving = signal(false);
  readonly loaded = signal(false);
  readonly integrationStatus = signal<MessagingIntegrationStatus | null>(null);
  constructor() {
    this.api.settings().subscribe({
      next: (settings) => {
        this.form = settings;
        this.etaPercent = Math.round(settings.defaultEtaPercent * 100);
        this.loaded.set(true);
      },
      error: (error: Error) => this.toast.show('error', 'No se cargó la configuración', error.message),
    });
    this.api.messagingIntegrationStatus().subscribe({
      next: (status) => this.integrationStatus.set(status),
      error: () => this.integrationStatus.set(null),
    });
  }
  save(): void {
    if (this.form.practiceName.trim().length < 3) {
      this.toast.show('error', 'Revisa el nombre', 'Escribe el nombre del consultorio.');
      return;
    }
    if (!(this.etaPercent >= 0 && this.etaPercent <= 30)) {
      this.toast.show('error', 'Revisa el ETA', 'Debe estar entre 0 % y 30 %.');
      return;
    }
    this.saving.set(true);
    this.api.saveSettings({ ...this.form, defaultEtaPercent: this.etaPercent / 100 }).subscribe({
      next: (settings) => {
        this.form = settings;
        this.saving.set(false);
        this.toast.show('success', 'Configuración guardada');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.show('error', 'No se guardó la configuración', error.message);
      },
    });
  }
}
