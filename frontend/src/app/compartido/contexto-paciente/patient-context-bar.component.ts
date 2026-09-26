import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientContextService } from '../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../icono/icon.component';

@Component({
  selector: 'app-patient-context-bar',
  imports: [FormsModule, RouterLink, IconComponent, DatePipe],
  template: `
    <section class="patient-context" aria-label="Paciente activo">
      <div class="context-controls">
        <span class="context-icon"><app-icon name="users" /></span>
        <label for="activePatient">
          <strong>Paciente activo</strong>
          <small>Selecciona el expediente que vas a consultar o completar.</small>
        </label>
        @if (context.loading()) {
          <span class="context-status">Cargando pacientes…</span>
        } @else if (context.patients().length) {
          <select
            id="activePatient"
            [ngModel]="context.selectedId()"
            (ngModelChange)="selectPatient($event)"
          >
            @for (patient of context.patients(); track patient.id) {
              <option [value]="patient.id">
                {{ patient.firstName }} {{ patient.lastName }} · {{ patient.documentNumber }}
              </option>
            }
          </select>
        } @else {
          <a class="button button-primary button-small" routerLink="/pacientes">Registrar paciente</a>
        }
        @if (context.error()) {
          <button
            class="button button-secondary button-small"
            type="button"
            (click)="context.load(true)"
          >
            Reintentar
          </button>
        }
      </div>

      @if (context.detailsLoading()) {
        <div class="details-state" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span> Cargando ficha del paciente…
        </div>
      } @else if (context.details(); as patient) {
        <div class="patient-summary" aria-labelledby="patientSummaryTitle">
          <header class="summary-header">
            <div>
              <p class="summary-kicker">Expediente seleccionado</p>
              <h2 id="patientSummaryTitle">{{ patient.firstName }} {{ patient.lastName }}</h2>
              <p>{{ patient.documentNumber }} · {{ age(patient.dateOfBirth) }} años</p>
            </div>
            <span class="status-badge" [class.inactive]="!isActive(patient.status)">
              {{ statusLabel(patient.status) }}
            </span>
          </header>

          <dl class="patient-facts">
            <div>
              <dt>Fecha de nacimiento</dt>
              <dd>{{ patient.dateOfBirth | date: 'dd MMM yyyy' : 'UTC' : 'es-EC' }}</dd>
            </div>
            <div>
              <dt>Sexo para fórmulas</dt>
              <dd>{{ sexLabel(patient.sexAtBirth) }}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{{ patient.phone || 'No registrado' }}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{{ patient.email || 'No registrado' }}</dd>
            </div>
            <div>
              <dt>Ocupación</dt>
              <dd>{{ patient.occupation || 'No registrada' }}</dd>
            </div>
            <div>
              <dt>Nutricionista responsable</dt>
              <dd>{{ patient.assignedNutritionistName || 'Sin asignar' }}</dd>
            </div>
            <div class="goal-fact">
              <dt>Objetivo acordado</dt>
              <dd>{{ patient.goal || 'Sin objetivo registrado' }}</dd>
            </div>
          </dl>

          <footer class="summary-footer">
            <div class="consents" aria-label="Consentimientos de contacto">
              <span [class.allowed]="patient.emailConsent">
                <app-icon name="mail" /> Correo
                {{ patient.emailConsent ? 'autorizado' : 'sin autorización' }}
              </span>
              <span [class.allowed]="patient.whatsAppConsent">
                <app-icon name="phone" /> WhatsApp
                {{ patient.whatsAppConsent ? 'autorizado' : 'sin autorización' }}
              </span>
            </div>
            <a
              class="button button-secondary button-small"
              routerLink="/pacientes"
              [queryParams]="{ editar: patient.id }"
            >
              <app-icon name="edit" /> Editar datos
            </a>
          </footer>
        </div>
      } @else if (context.detailsError()) {
        <div class="details-state details-error" role="alert">
          <span>No se pudo abrir la ficha. {{ context.detailsError() }}</span>
          <button
            class="button button-secondary button-small"
            type="button"
            (click)="retryDetails()"
          >
            Reintentar
          </button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .patient-context {
        margin-bottom: 1rem;
        overflow: hidden;
        border: 1px solid var(--border-section);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }
      .context-controls {
        min-height: 4.35rem;
        padding: 0.72rem 0.85rem;
        display: grid;
        grid-template-columns: 2.35rem minmax(10rem, 1fr) minmax(16rem, 1.15fr) auto;
        align-items: center;
        gap: 0.75rem;
        background: linear-gradient(90deg, var(--section-wash), transparent 72%);
      }
      .context-icon {
        width: 2.35rem;
        height: 2.35rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--primary-dark);
        background: var(--avocado-soft);
      }
      label strong,
      label small {
        display: block;
      }
      label strong {
        font-size: 0.78rem;
      }
      label small,
      .context-status {
        margin-top: 0.18rem;
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      select {
        width: 100%;
        min-height: 2.55rem;
        padding: 0.55rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        color: var(--text);
        background: var(--surface);
      }
      .details-state {
        min-height: 4.5rem;
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        border-top: 1px solid var(--border-soft);
        color: var(--text-muted);
        font-size: 0.78rem;
      }
      .details-error {
        justify-content: space-between;
        color: var(--danger);
      }
      .patient-summary {
        border-top: 1px solid var(--border-soft);
      }
      .summary-header,
      .summary-footer {
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .summary-header h2 {
        margin: 0.1rem 0 0.18rem;
        font-family: var(--font-display);
        font-size: 1.05rem;
        line-height: 1.2;
      }
      .summary-header p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .summary-kicker {
        color: var(--primary);
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }
      .status-badge {
        padding: 0.28rem 0.55rem;
        border: 1px solid rgba(52, 122, 22, 0.24);
        border-radius: 999px;
        color: var(--primary-dark);
        background: var(--surface-muted);
        font-size: 0.66rem;
        font-weight: 800;
      }
      .status-badge.inactive {
        border-color: var(--border);
        color: var(--text-muted);
        background: var(--surface);
      }
      .patient-facts {
        margin: 0;
        padding: 0.85rem 1rem;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.85rem 1.25rem;
        border-top: 1px solid var(--border-soft);
        border-bottom: 1px solid var(--border-soft);
        background: rgba(141, 186, 38, 0.025);
      }
      .patient-facts div {
        min-width: 0;
      }
      .patient-facts dt {
        margin-bottom: 0.18rem;
        color: var(--text-muted);
        font-size: 0.64rem;
        font-weight: 700;
      }
      .patient-facts dd {
        margin: 0;
        overflow-wrap: anywhere;
        font-size: 0.76rem;
        font-weight: 650;
      }
      .goal-fact {
        grid-column: span 2;
      }
      .consents {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem 1rem;
      }
      .consents span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      .consents span.allowed {
        color: var(--primary-dark);
        font-weight: 700;
      }
      .consents app-icon,
      .summary-footer .button app-icon {
        width: 1rem;
        height: 1rem;
      }
      @media (max-width: 700px) {
        .context-controls {
          grid-template-columns: 2.35rem 1fr;
        }
        select,
        .context-status,
        .context-controls > a,
        .context-controls > button {
          grid-column: 1/-1;
        }
        .patient-facts {
          grid-template-columns: 1fr 1fr;
        }
        .goal-fact {
          grid-column: 1 / -1;
        }
        .summary-footer {
          align-items: stretch;
          flex-direction: column;
        }
        .summary-footer .button {
          justify-content: center;
        }
      }
      @media (max-width: 430px) {
        .patient-facts {
          grid-template-columns: 1fr;
        }
        .goal-fact {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class PatientContextBarComponent implements OnInit {
  readonly context = inject(PatientContextService);
  readonly patientChange = output<string>();

  ngOnInit(): void {
    this.context.load();
  }

  selectPatient(id: string): void {
    this.context.select(id);
    this.patientChange.emit(id);
  }

  retryDetails(): void {
    this.context.select(this.context.selectedId());
  }

  age(dateOfBirth: string): number {
    const [year, month, day] = dateOfBirth.split('-').map(Number);
    if (!year || !month || !day) return 0;
    const today = new Date();
    let age = today.getFullYear() - year;
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
      age--;
    }
    return Math.max(0, age);
  }

  sexLabel(value: number): string {
    return value === 1 ? 'Masculino' : value === 0 ? 'Femenino' : 'No especificado';
  }

  isActive(status: string): boolean {
    return status === 'Active' || status === 'Activo' || status === '0';
  }

  statusLabel(status: string): string {
    if (status === 'Archived' || status === 'Archivado' || status === '2') return 'Archivado';
    if (status === 'Paused' || status === 'Pausado' || status === '1') return 'Pausado';
    return 'Activo';
  }
}
