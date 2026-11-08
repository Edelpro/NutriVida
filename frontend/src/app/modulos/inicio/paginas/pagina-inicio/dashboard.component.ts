import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { DashboardApiService } from '../../acceso-datos/dashboard-api.service';
import { DashboardData, EMPTY_DASHBOARD } from '../../modelos/dashboard.models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, DatePipe, DecimalPipe],
  template: `
    <div class="page dashboard-page">
      <header class="dashboard-header">
        <div>
          <h1>Inicio</h1>
          <p>Resumen de tu jornada y pacientes</p>
        </div>
        <div class="professional-summary">
          <time [attr.datetime]="today.toISOString()">
            <app-icon name="calendar" />
            {{ today | date: "EEEE, d 'de' MMMM 'de' y" : '' : 'es-EC' }}
          </time>
          <span class="profile-separator"></span>
          <span class="professional-avatar"><app-icon name="users" /></span>
          <span
            ><strong>{{ auth.user()?.fullName }}</strong
            ><small>{{ roleLabel() }}</small></span
          >
        </div>
      </header>

      <div class="page-actions" aria-label="Acciones principales">
        <a class="button button-secondary" routerLink="/pacientes">
          <app-icon name="plus" /> Nuevo paciente
        </a>
        <a class="button button-primary" routerLink="/atencion">
          <app-icon name="calendar" /> Nueva atención
        </a>
      </div>

      @if (error()) {
        <div class="notice notice-danger connection-error" role="alert">
          <app-icon name="info" />
          <span><strong>No se pudieron cargar los datos reales.</strong> {{ error() }}</span>
          <button class="button button-secondary button-small" type="button" (click)="load()">
            Reintentar
          </button>
        </div>
      }

      @if (loading()) {
        <div class="status-message" aria-live="polite">
          <span class="spinner" aria-label="Cargando el panel clínico"></span>
        </div>
      } @else if (!error()) {
        <div class="dashboard-layout">
          <section class="surface agenda-card">
            <header class="card-heading">
              <h2><app-icon name="calendar" /> Próximas atenciones</h2>
            </header>
            <div class="agenda-list">
              @for (appointment of data().appointments; track appointment.id) {
                <article [class.is-next]="$first">
                  <time [attr.datetime]="appointment.startsAtUtc">
                    <strong>{{ appointment.startsAtUtc | date: 'HH:mm' }}</strong>
                    <small>{{ endTime(appointment.startsAtUtc, appointment.durationMinutes) }}</small>
                  </time>
                  <span class="agenda-dot" aria-hidden="true"></span>
                  <div>
                    <strong>{{ appointment.patientName }}</strong>
                    <small>
                      {{ dayLabel(appointment.startsAtUtc) }}{{ appointment.reason || 'Consulta nutricional' }}
                    </small>
                  </div>
                </article>
              } @empty {
                <div class="compact-empty">
                  <app-icon name="calendar" />
                  <strong>Agenda libre</strong>
                  <span>No hay atenciones en los próximos 3 días.</span>
                </div>
              }
            </div>
            <a class="card-link" routerLink="/atencion"
              >Ver agenda completa <app-icon name="arrow"
            /></a>
          </section>

          <section class="patient-current" aria-label="Paciente en foco">
            <span class="leaf leaf-one" aria-hidden="true"></span>
            <span class="leaf leaf-two" aria-hidden="true"></span>
            <p>Paciente en foco</p>
            @if (data().currentPatient; as patient) {
              <h2>{{ patient.fullName }}</h2>
              <small>C.I. {{ patient.documentNumber }} · {{ patient.ageYears }} años</small>
              <div class="clinical-metrics">
                <div>
                  <span>IMC actual</span>
                  <strong>{{
                    patient.bmi === null ? '—' : (patient.bmi | number: '1.1-1')
                  }}</strong>
                  <small>{{ bmiLabel(patient.bmi) }}</small>
                </div>
                <div>
                  <span>Peso actual</span>
                  <strong
                    >{{ patient.weightKg === null ? '—' : (patient.weightKg | number: '1.1-1')
                    }}<em> kg</em></strong
                  >
                  <small>{{ weightChange(patient.weightChangeKg) }}</small>
                </div>
                <div>
                  <span>% Grasa</span>
                  <strong
                    >{{
                      patient.bodyFatPercent === null
                        ? '—'
                        : (patient.bodyFatPercent | number: '1.1-1') + ' %'
                    }}</strong
                  >
                  <small>{{ patient.bodyFatPercent === null ? 'Sin registro' : 'Última medición' }}</small>
                </div>
              </div>
              <div class="therapeutic-goal">
                <span>Objetivo terapéutico</span>
                <p>{{ patient.goal || 'Objetivo pendiente de registrar.' }}</p>
              </div>
              <div class="plan-progress">
                <span
                  ><strong>Adherencia al plan</strong
                  ><b>{{ patient.adherencePercent === null ? 'Sin registro' : patient.adherencePercent + '%' }}</b></span
                >
                <div class="progress">
                  <span [style.width.%]="patient.adherencePercent ?? 0"></span>
                </div>
              </div>
              <a class="patient-action" [routerLink]="['/pacientes', patient.id]">
                Ver ficha del paciente <app-icon name="arrow" />
              </a>
            } @else {
              <div class="compact-empty current-empty">
                <app-icon name="users" />
                <strong>Sin paciente en agenda</strong>
                <span>Programa una atención para mostrar aquí su evolución.</span>
              </div>
            }
          </section>

          <section class="surface patient-summary">
            <header class="card-heading"><h2>Resumen de pacientes</h2></header>
            <div class="patient-status">
              <div class="donut" [style.background]="donutGradient()">
                <span
                  ><strong>{{ data().totalPatients }}</strong
                  ><small>Total</small></span
                >
              </div>
              <ul>
                <li>
                  <i class="active"></i><span>Activos</span
                  ><strong
                    >{{ data().activePatients }} ({{ percent(data().activePatients) }}%)</strong
                  >
                </li>
                <li>
                  <i class="paused"></i><span>En pausa</span
                  ><strong
                    >{{ data().pausedPatients }} ({{ percent(data().pausedPatients) }}%)</strong
                  >
                </li>
                <li>
                  <i class="new"></i><span>Nuevos este mes</span
                  ><strong>{{ data().newPatientsThisMonth }}</strong>
                </li>
                <li>
                  <i class="archived"></i><span>Archivados</span
                  ><strong>{{ data().archivedPatients }}</strong>
                </li>
              </ul>
            </div>
            <div class="objective-summary">
              <strong>Distribución por objetivo</strong>
              @for (item of data().objectiveDistribution; track item.label) {
                <div>
                  <span>{{ item.label }}</span
                  ><b>{{ item.percent }}%</b>
                  <i><span [style.width.%]="item.percent"></span></i>
                </div>
              }
            </div>
            <a class="card-link align-right" routerLink="/reportes"
              >Ver reporte completo <app-icon name="arrow"
            /></a>
          </section>

          <section class="surface pending-card">
            <header class="card-heading"><h2>Pendientes de revisar</h2></header>
            <div class="pending-list">
              <a routerLink="/seguimientos">
                <span class="pending-icon amber"><app-icon name="bell" /></span>
                <span
                  ><strong>Recordatorios de seguimiento</strong
                  ><small>Registros que requieren revisión</small></span
                >
                <b>{{ data().pendingFollowUps }}</b
                ><app-icon name="arrow" />
              </a>
              <a routerLink="/menus">
                <span class="pending-icon"><app-icon name="clipboard" /></span>
                <span
                  ><strong>Planes para revisar</strong
                  ><small>Planes de alimentación por ajustar</small></span
                >
                <b>{{ data().plansToReview }}</b
                ><app-icon name="arrow" />
              </a>
              <a routerLink="/mensajeria">
                <span class="pending-icon"><app-icon name="send" /></span>
                <span
                  ><strong>Mensajes pendientes</strong
                  ><small>Borradores o envíos por revisar</small></span
                >
                <b>{{ data().messagesToReview }}</b
                ><app-icon name="arrow" />
              </a>
            </div>
            <a class="card-link align-right" routerLink="/seguimientos"
              >Ver seguimientos <app-icon name="arrow"
            /></a>
          </section>

          <section class="surface recent-patients">
            <header class="card-heading"><h2>Pacientes recientes</h2></header>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Edad</th>
                    <th>Objetivo</th>
                    <th>Última atención</th>
                    <th>Próxima atención</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (patient of data().recentPatients; track patient.id) {
                    <tr>
                      <td>
                        <a class="patient-link" [routerLink]="['/pacientes', patient.id]">
                          <strong>{{ patient.fullName }}</strong>
                        </a>
                      </td>
                      <td>{{ patient.ageYears }}</td>
                      <td class="objective-cell">{{ patient.goal || 'Por definir' }}</td>
                      <td>
                        {{
                          patient.lastConsultationUtc
                            ? (patient.lastConsultationUtc | date: 'dd MMM y' : '' : 'es-EC')
                            : '—'
                        }}
                      </td>
                      <td>
                        {{
                          patient.nextConsultationUtc
                            ? (patient.nextConsultationUtc | date: 'dd MMM y' : '' : 'es-EC')
                            : '—'
                        }}
                      </td>
                      <td>
                        <span class="badge" [class.badge-warning]="patient.status === 'Paused'">{{
                          statusLabel(patient.status)
                        }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="empty-row">
                        Registra tu primer paciente para iniciar el historial.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <a class="card-link" routerLink="/pacientes"
              >Ver todos los pacientes <app-icon name="arrow"
            /></a>
          </section>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-page {
        max-width: 92rem;
      }
      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }
      .dashboard-header h1 {
        margin: 0 0 0.25rem;
        font-size: 2rem;
      }
      .dashboard-header p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.86rem;
      }
      .dashboard-layout {
        display: grid;
        grid-template-columns: minmax(16rem, 0.9fr) minmax(20rem, 1.12fr) minmax(18rem, 1fr);
        gap: 1rem;
        align-items: stretch;
      }
      .card-heading {
        min-height: 3.25rem;
        padding: 0.95rem 1rem 0.7rem;
        border-bottom: 1px solid var(--border-soft);
        background: linear-gradient(90deg, var(--section-wash), transparent 72%);
      }
      .card-heading h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        font: 700 1rem/1.2 var(--font-display);
      }
      .card-heading app-icon {
        color: var(--text);
      }
      .agenda-card,
      .patient-summary,
      .pending-card,
      .recent-patients {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .agenda-list {
        padding: 0 0.95rem;
        flex: 1;
      }
      .agenda-list article {
        min-height: 3.65rem;
        display: grid;
        grid-template-columns: 2.8rem 0.65rem minmax(0, 1fr);
        align-items: center;
        gap: 0.55rem;
        border-bottom: 1px solid #ece8df;
        position: relative;
      }
      .agenda-list article.is-next {
        margin: 0 -0.4rem;
        padding: 0 0.4rem;
        border: 1.5px solid var(--primary);
        border-radius: 1.1rem 3rem 1.1rem 1.1rem;
      }
      .agenda-list time strong,
      .agenda-list time small,
      .agenda-list article div strong,
      .agenda-list article div small {
        display: block;
      }
      .agenda-list time strong {
        font-size: 0.78rem;
        font-variant-numeric: tabular-nums;
      }
      .agenda-list time small,
      .agenda-list article div small {
        margin-top: 0.18rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .agenda-list article div strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.78rem;
      }
      .agenda-dot {
        width: 0.42rem;
        height: 0.42rem;
        border-radius: 50%;
        background: var(--fresh);
        box-shadow:
          0 0 0 2px white,
          0 0 0 3px var(--fresh);
      }
      .card-link {
        min-height: 2.7rem;
        padding: 0.65rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--primary-dark);
        font-size: 0.72rem;
        font-weight: 750;
        text-decoration: none;
        border-top: 1px solid var(--border-soft);
        background: rgba(141, 186, 38, 0.025);
      }
      .card-link app-icon {
        width: 0.85rem;
        height: 0.85rem;
      }
      .align-right {
        justify-content: flex-end;
      }
      .compact-empty {
        min-height: 9rem;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 0.35rem;
        padding: 1rem;
        text-align: center;
        color: var(--text-muted);
      }
      .compact-empty app-icon {
        width: 1.8rem;
        height: 1.8rem;
        color: var(--fresh);
      }
      .compact-empty strong {
        color: var(--text);
        font-size: 0.8rem;
      }
      .compact-empty span {
        font-size: 0.72rem;
      }
      .patient-current {
        min-height: 22rem;
        padding: 1.55rem 1.85rem;
        position: relative;
        border: 1.7px solid var(--primary);
        border-radius: 1.8rem 4.8rem 2.8rem 1.5rem;
        background: white;
        overflow: hidden;
      }
      .patient-current > p {
        margin: 0 0 1rem;
        font: 700 0.78rem/1 var(--font-display);
      }
      .patient-current h2 {
        margin: 0 0 0.25rem;
        font-size: 1rem;
      }
      .patient-current > small {
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .leaf {
        position: absolute;
        width: 1.3rem;
        height: 3.5rem;
        right: 1.2rem;
        top: -0.5rem;
        border-radius: 100% 0 100% 0;
        background: var(--primary);
        transform: rotate(28deg);
      }
      .leaf-two {
        width: 0.85rem;
        height: 2.6rem;
        right: 3.15rem;
        top: 0.8rem;
        background: var(--fresh);
        transform: rotate(-16deg);
      }
      .clinical-metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin: 1.35rem 0 1rem;
      }
      .clinical-metrics div {
        padding: 0 0.75rem;
        border-right: 1px solid var(--border);
      }
      .clinical-metrics div:first-child {
        padding-left: 0;
      }
      .clinical-metrics div:last-child {
        border: 0;
      }
      .clinical-metrics span,
      .clinical-metrics strong,
      .clinical-metrics small {
        display: block;
      }
      .clinical-metrics span {
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .clinical-metrics strong {
        margin: 0.3rem 0;
        color: var(--primary-dark);
        font: 700 1.55rem/1 var(--font-display);
      }
      .clinical-metrics em {
        font: 600 0.66rem/1 var(--font-sans);
      }
      .clinical-metrics small {
        color: var(--primary);
        font-size: 0.72rem;
      }
      .therapeutic-goal {
        padding: 0.55rem 0 0.75rem;
        border-top: 1px solid #eeeae2;
      }
      .therapeutic-goal span {
        font-size: 0.72rem;
        font-weight: 750;
      }
      .therapeutic-goal p {
        margin: 0.22rem 0 0;
        color: var(--text-muted);
        font-size: 0.72rem;
        line-height: 1.35;
      }
      .plan-progress > span {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.38rem;
        font-size: 0.72rem;
      }
      .plan-progress b {
        font-weight: 750;
      }
      .patient-link {
        color: inherit;
      }
      .patient-action {
        min-height: 2.15rem;
        margin-top: 0.9rem;
        padding: 0.48rem 0.75rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1px solid var(--primary);
        border-radius: 0.45rem;
        color: var(--text);
        font-size: 0.72rem;
        font-weight: 750;
        text-decoration: none;
      }
      .patient-action app-icon {
        width: 0.9rem;
        height: 0.9rem;
        color: var(--primary);
      }
      .pending-list {
        padding: 0 1rem;
        flex: 1;
      }
      .pending-list a {
        min-height: 4rem;
        display: grid;
        grid-template-columns: 2.25rem 1fr auto 0.8rem;
        align-items: center;
        gap: 0.55rem;
        border-bottom: 1px solid #ece8df;
        color: var(--text);
        text-decoration: none;
      }
      .pending-list a > span strong,
      .pending-list a > span small {
        display: block;
      }
      .pending-list a > span strong {
        font-size: 0.72rem;
      }
      .pending-list a > span small {
        margin-top: 0.2rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .pending-list a > b {
        color: var(--primary);
        font: 700 1.25rem/1 var(--font-display);
      }
      .pending-list a > app-icon {
        width: 0.72rem;
        height: 0.72rem;
        color: var(--primary);
      }
      .pending-icon {
        width: 2.1rem;
        height: 2.1rem;
        display: grid !important;
        place-items: center;
        border-radius: 0.45rem;
        background: #edf5d8;
        color: var(--primary);
      }
      .pending-icon.amber {
        background: var(--warning-soft);
        color: var(--warning);
      }
      .recent-patients {
        grid-column: 2/4;
      }
      .recent-patients .data-table {
        min-width: 45rem;
        font-size: 0.72rem;
      }
      .recent-patients .data-table th {
        height: 2.15rem;
        padding: 0.45rem 0.6rem;
        font-size: 0.72rem;
        text-transform: none;
        letter-spacing: 0;
        background: white;
      }
      .recent-patients .data-table td {
        height: 2.65rem;
        padding: 0.55rem 0.6rem;
      }
      .recent-patients .badge {
        font-size: 0.72rem;
        padding: 0.22rem 0.38rem;
      }
      .empty-row {
        text-align: center;
        color: var(--text-muted);
      }
      @media (max-width: 1200px) {
        .dashboard-layout {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .patient-summary {
          grid-column: 1;
          grid-row: 2;
        }
        .pending-card {
          grid-column: 2;
        }
        .recent-patients {
          grid-column: 1/-1;
        }
      }
      @media (max-width: 760px) {
        .dashboard-header {
          align-items: flex-start;
        }
        .professional-summary time,
        .profile-separator {
          display: none;
        }
        .professional-summary > span:last-child {
          display: none;
        }
        .page-actions .button {
          flex: 1;
        }
        .dashboard-layout {
          grid-template-columns: 1fr;
        }
        .patient-summary,
        .pending-card,
        .recent-patients {
          grid-column: auto;
          grid-row: auto;
        }
        .patient-current {
          padding: 1.35rem;
        }
        .clinical-metrics strong {
          font-size: 1.3rem;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  readonly auth = inject(AuthService);
  readonly data = signal<DashboardData>(EMPTY_DASHBOARD);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly today = new Date();
  readonly donutGradient = computed(() => {
    const active = this.percent(this.data().activePatients);
    const paused = active + this.percent(this.data().pausedPatients);
    return `conic-gradient(var(--primary) 0 ${active}%, var(--fresh) ${active}% ${paused}%, #d9d5cd ${paused}% 100%)`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.dashboardApi.getDashboard().subscribe({
      next: (value) => {
        this.data.set(value);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.data.set(EMPTY_DASHBOARD);
        this.error.set(error.message);
        this.loading.set(false);
      },
    });
  }

  percent(value: number): number {
    return this.data().totalPatients ? Math.round((value / this.data().totalPatients) * 100) : 0;
  }

  dayLabel(startsAtUtc: string): string {
    const day = new Date(startsAtUtc);
    if (day.toDateString() === new Date().toDateString()) return 'Hoy · ';
    return `${day.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })} · `;
  }

  endTime(startsAtUtc: string, durationMinutes: number): string {
    const end = new Date(new Date(startsAtUtc).getTime() + durationMinutes * 60_000);
    return end.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  bmiLabel(value: number | null): string {
    if (value === null) return 'Sin medición';
    if (value < 18.5) return 'Bajo referencia';
    if (value < 25) return 'Rango de referencia';
    return 'Revisar en consulta';
  }

  weightChange(value: number | null): string {
    if (value === null) return 'Sin comparación';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} kg desde la anterior`;
  }

  statusLabel(status: string): string {
    return status === 'Paused' ? 'En pausa' : status === 'Archived' ? 'Archivado' : 'Activo';
  }

  roleLabel(): string {
    const role = this.auth.user()?.role;
    if (role === 'ClinicAdmin') return 'Administración clínica';
    return 'Nutricionista clínica';
  }
}
