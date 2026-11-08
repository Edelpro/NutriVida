import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ApiService, PatientDetails } from '../../../../nucleo/api.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { ConsultationsApiService } from '../../../atencion/acceso-datos/consultations-api.service';
import {
  PatientFileData,
  PatientFileFollowUp,
  PatientFileMessage,
  buildStages,
  buildTimeline,
  nextConsultation,
  nextPendingStage,
} from '../../modelos/patient-file';

const TIMELINE_PAGE = 15;

@Component({
  selector: 'app-patient-file',
  imports: [DatePipe, RouterLink, IconComponent],
  template: `<div class="page">
    <a class="back-link" routerLink="/pacientes">
      <span class="back-icon"><app-icon name="arrow" /></span> Pacientes
    </a>

    @if (loading()) {
      <div class="status-message" aria-live="polite">
        <span class="spinner" aria-label="Cargando la ficha del paciente"></span>
      </div>
    } @else if (error()) {
      <div class="notice notice-danger connection-error" role="alert">
        <app-icon name="info" />
        <span><strong>No se pudo abrir la ficha.</strong> {{ error() }}</span>
        <button class="button button-secondary button-small" type="button" (click)="load()">
          Reintentar
        </button>
      </div>
    } @else if (patient(); as patient) {
      <header class="page-header">
        <div>
          <p class="eyebrow">Ficha del paciente</p>
          <h1>{{ patient.firstName }} {{ patient.lastName }}</h1>
          <p class="lede">
            {{ patient.documentNumber }} · {{ age() }} años · {{ sexLabel(patient.sexAtBirth) }}
            <span class="badge status">{{ statusLabel(patient.status) }}</span>
          </p>
        </div>
        <div class="toolbar">
          <a
            class="button button-secondary"
            routerLink="/pacientes"
            [queryParams]="{ editar: patient.id }"
          >
            <app-icon name="edit" /> Editar datos
          </a>
          <a class="button button-primary" routerLink="/atencion">
            <app-icon name="calendar" /> Nueva atención
          </a>
        </div>
      </header>

      @if (!latestAssessment()) {
        <div class="notice notice-warning">
          <app-icon name="info" />
          <span
            ><strong>Alergias e intolerancias sin registrar.</strong> Complétalas en la evaluación
            antes de armar un menú.</span
          >
        </div>
      } @else if (latestAssessment()?.allergies || latestAssessment()?.intolerances) {
        <div class="notice notice-warning" role="status">
          <app-icon name="info" />
          <span>
            @if (latestAssessment()?.allergies) {
              <strong>Alergias:</strong> {{ latestAssessment()?.allergies }}.
            }
            @if (latestAssessment()?.intolerances) {
              <strong>Intolerancias:</strong> {{ latestAssessment()?.intolerances }}.
            }
          </span>
        </div>
      }

      <div class="file-layout">
        <section class="surface" aria-labelledby="stagesTitle">
          <header class="surface-header">
            <div>
              <p class="eyebrow">Proceso de atención</p>
              <h2 id="stagesTitle">Cómo va este paciente</h2>
            </div>
          </header>
          @if (nextStage(); as next) {
            <a class="next-step" [routerLink]="next.route">
              <span
                ><small>Siguiente paso</small><strong>{{ next.pendingAction }}</strong></span
              >
              <app-icon name="arrow" />
            </a>
          }
          <ul class="stages">
            @for (stage of stages(); track stage.key) {
              <li>
                <span class="stage-icon" [attr.data-state]="stage.state"
                  ><app-icon [name]="stage.icon"
                /></span>
                <div class="stage-text">
                  <strong>{{ stage.title }}</strong>
                  <span>{{ stage.summary }}</span>
                  @if (stage.date) {
                    <small>{{ stage.date | date: 'dd MMM y' : '' : 'es-EC' }}</small>
                  }
                </div>
                <span class="stage-state" [attr.data-state]="stage.state">{{
                  stage.stateLabel
                }}</span>
                <a class="button button-secondary button-small" [routerLink]="stage.route">
                  Abrir
                </a>
              </li>
            }
          </ul>
        </section>

        <aside class="side">
          <section class="surface" aria-labelledby="nextVisitTitle">
            <header class="surface-header"><h2 id="nextVisitTitle">Próxima atención</h2></header>
            <div class="surface-body">
              @if (nextVisit(); as visit) {
                <p class="visit-date">
                  {{ visit.startsAtUtc | date: "EEEE d 'de' MMMM, HH:mm" : '' : 'es-EC' }}
                </p>
                <p class="muted">{{ visit.reason }} · {{ visit.durationMinutes }} min</p>
              } @else {
                <p class="muted">No hay ninguna atención programada.</p>
              }
              @if (suggestedControl(); as control) {
                <p class="muted">Control sugerido en el seguimiento: {{ control | date: 'dd MMM y' : '' : 'es-EC' }}</p>
              }
            </div>
          </section>

          <section class="surface" aria-labelledby="contactTitle">
            <header class="surface-header"><h2 id="contactTitle">Datos del paciente</h2></header>
            <dl class="surface-body facts">
              <div>
                <dt>Objetivo acordado</dt>
                <dd>{{ patient.goal || 'Sin objetivo registrado' }}</dd>
              </div>
              <div>
                <dt>Nacimiento</dt>
                <dd>{{ patient.dateOfBirth | date: 'dd MMM y' : '' : 'es-EC' }}</dd>
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
              <div>
                <dt>Autorizaciones de contacto</dt>
                <dd>
                  Correo: {{ patient.emailConsent ? 'sí' : 'no' }} · WhatsApp:
                  {{ patient.whatsAppConsent ? 'sí' : 'no' }}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <section class="surface timeline" aria-labelledby="timelineTitle">
        <header class="surface-header">
          <h2 id="timelineTitle">Historia del paciente</h2>
          <span class="caption">{{ timeline().length }} {{ timeline().length === 1 ? 'registro' : 'registros' }}</span>
        </header>
        @if (!timeline().length) {
          <div class="empty-state">
            <div>
              <app-icon name="clock" />
              <h2>Todavía no hay registros</h2>
              <p>Aquí aparecerá cada atención, medición, plan y control de este paciente.</p>
            </div>
          </div>
        } @else {
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Registro</th>
                  <th>Detalle</th>
                  <th><span class="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                @for (event of visibleTimeline(); track event.key) {
                  <tr>
                    <td class="nowrap">{{ event.date | date: 'dd MMM y' : '' : 'es-EC' }}</td>
                    <td class="nowrap">
                      <strong>{{ event.type }}</strong>
                    </td>
                    <td>{{ event.detail }}</td>
                    <td class="row-link">
                      <a [routerLink]="event.route" [attr.aria-label]="'Abrir ' + event.type"
                        ><app-icon name="arrow"
                      /></a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (timeline().length > timelineLimit()) {
            <div class="pagination">
              <span>Mostrando {{ timelineLimit() }} de {{ timeline().length }}</span>
              <button
                class="button button-secondary button-small"
                type="button"
                (click)="showMore()"
              >
                Ver más
              </button>
            </div>
          }
        }
      </section>
    }
  </div>`,
  styles: [
    `
      .back-link {
        margin-bottom: 0.9rem;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--primary-dark);
        font-size: 0.85rem;
        font-weight: 650;
        text-decoration: none;
      }
      .back-icon {
        display: inline-flex;
        transform: rotate(180deg);
      }
      .status {
        margin-left: 0.35rem;
      }
      .notice {
        margin-bottom: 1rem;
      }
      .file-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 21rem;
        gap: 1rem;
        align-items: start;
      }
      .side {
        display: grid;
        gap: 1rem;
      }
      .next-step {
        margin: 0.9rem 1.15rem 0;
        padding: 0.7rem 0.9rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        color: var(--primary-dark);
        background: var(--surface-muted);
        border: 1px solid var(--border-section);
        border-radius: var(--radius-md, 0.625rem);
        text-decoration: none;
      }
      .next-step span {
        display: grid;
      }
      .next-step small {
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .stages {
        margin: 0;
        padding: 0.35rem 1.15rem 0.6rem;
        list-style: none;
      }
      .stages li {
        padding: 0.75rem 0;
        display: grid;
        grid-template-columns: 2.25rem minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 0.75rem;
        border-bottom: 1px solid var(--border-soft);
      }
      .stages li:last-child {
        border-bottom: 0;
      }
      .stage-icon {
        width: 2.25rem;
        height: 2.25rem;
        display: grid;
        place-items: center;
        color: var(--primary-dark);
        background: var(--avocado-soft);
        border-radius: 0.6rem;
      }
      .stage-icon[data-state='pending'] {
        color: var(--text-muted);
        background: var(--surface-muted);
      }
      .stage-text {
        min-width: 0;
        display: grid;
        gap: 0.1rem;
      }
      .stage-text span {
        color: var(--text-muted);
        font-size: 0.85rem;
        overflow-wrap: anywhere;
      }
      .stage-text small {
        color: var(--text-muted);
        font-size: 0.75rem;
      }
      .stage-state {
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
        color: var(--primary-dark);
      }
      .stage-state[data-state='draft'] {
        color: var(--warning);
      }
      .stage-state[data-state='pending'] {
        color: var(--text-muted);
      }
      .visit-date {
        margin: 0 0 0.25rem;
        font-weight: 700;
      }
      .visit-date::first-letter {
        text-transform: uppercase;
      }
      .muted {
        margin: 0;
      }
      .facts {
        margin: 0;
        display: grid;
        gap: 0.75rem;
      }
      .facts dt {
        color: var(--text-muted);
        font-size: 0.75rem;
      }
      .facts dd {
        margin: 0.1rem 0 0;
        font-weight: 600;
        font-size: 0.875rem;
        overflow-wrap: anywhere;
      }
      .timeline {
        margin-top: 1rem;
      }
      .nowrap {
        white-space: nowrap;
      }
      .row-link a {
        display: inline-flex;
        padding: 0.25rem;
        color: var(--primary);
      }
      @media (max-width: 1000px) {
        .file-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      @media (max-width: 560px) {
        .timeline thead {
          display: none;
        }
        .timeline table,
        .timeline tbody {
          min-width: 0;
          width: 100%;
          display: block;
        }
        .timeline tr {
          padding: 0.65rem 1rem;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.1rem 0.5rem;
        }
        .timeline td {
          height: auto;
          padding: 0;
          border: 0;
        }
        .timeline td:nth-child(3) {
          grid-column: 1 / -1;
          grid-row: 2;
          white-space: normal;
        }
        .timeline td.row-link {
          display: none;
        }
        .timeline tbody tr + tr {
          border-top: 1px solid var(--border-soft);
        }
        .stages li {
          grid-template-columns: 2.25rem minmax(0, 1fr) auto;
        }
        .stage-state {
          grid-column: 2;
          grid-row: 2;
        }
        .stages .button {
          grid-column: 3;
          grid-row: 1 / span 2;
        }
      }
    `,
  ],
})
export class PatientFileComponent {
  private readonly api = inject(ApiService);
  private readonly consultationsApi = inject(ConsultationsApiService);
  private readonly context = inject(PatientContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private patientId = '';

  readonly loading = signal(true);
  readonly error = signal('');
  readonly patient = signal<PatientDetails | null>(null);
  readonly data = signal<PatientFileData | null>(null);
  readonly timelineLimit = signal(TIMELINE_PAGE);

  readonly latestAssessment = computed(() => this.data()?.assessments[0] ?? null);
  readonly stages = computed(() => {
    const data = this.data();
    return data ? buildStages(data) : [];
  });
  readonly nextStage = computed(() => nextPendingStage(this.stages()));
  readonly nextVisit = computed(() => nextConsultation(this.data()?.consultations ?? []));
  readonly suggestedControl = computed(() => this.data()?.followUps[0]?.nextAppointmentOn ?? null);
  readonly timeline = computed(() => {
    const data = this.data();
    return data ? buildTimeline(data) : [];
  });
  readonly visibleTimeline = computed(() => this.timeline().slice(0, this.timelineLimit()));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.patientId = params.get('id') ?? '';
      this.load();
    });
  }

  load(): void {
    const id = this.patientId;
    this.loading.set(true);
    this.error.set('');
    this.timelineLimit.set(TIMELINE_PAGE);
    forkJoin({
      patient: this.api.patient(id),
      assessments: this.api.assessments(id),
      measurements: this.api.anthropometry(id),
      diagnoses: this.api.diagnoses(id),
      energy: this.api.energyCalculations(id),
      plans: this.api.menuPlans(id),
      followUps: this.api.followUps(id),
      consultations: this.consultationsApi.listByPatient(id),
      messages: this.api.communications(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ patient, followUps, messages, ...rest }) => {
          this.patient.set(patient);
          this.data.set({
            ...rest,
            followUps: followUps as PatientFileFollowUp[],
            messages: messages as PatientFileMessage[],
          });
          // Los módulos que se abren desde aquí trabajan sobre este mismo paciente.
          if (this.context.selectedId() !== id) this.context.select(id);
          this.loading.set(false);
        },
        error: (error: Error) => {
          this.patient.set(null);
          this.data.set(null);
          this.error.set(error.message);
          this.loading.set(false);
        },
      });
  }

  showMore(): void {
    this.timelineLimit.update((limit) => limit + TIMELINE_PAGE);
  }

  age(): number {
    const birth = this.patient()?.dateOfBirth;
    if (!birth) return 0;
    const [year, month, day] = birth.split('-').map(Number);
    const today = new Date();
    const hadBirthday =
      today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
    return Math.max(0, today.getFullYear() - year - (hadBirthday ? 0 : 1));
  }

  sexLabel(value: number): string {
    return value === 1 ? 'Masculino' : value === 0 ? 'Femenino' : 'Sexo no especificado';
  }

  statusLabel(status: string | number): string {
    const value = String(status);
    if (value === 'Archived' || value === '2') return 'Archivado';
    if (value === 'Paused' || value === '1') return 'En pausa';
    return 'Activo';
  }
}
