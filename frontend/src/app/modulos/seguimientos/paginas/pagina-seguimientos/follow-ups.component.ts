import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { FlujoPlanNutricionalComponent } from '../../../../compartido/flujo-plan-nutricional/flujo-plan-nutricional.component';
import { QuickTemplate } from '../../../plantillas/modelos/quick-template.models';
import { QuickTemplatesComponent } from '../../../plantillas/paginas/tarjetas-plantillas/quick-templates.component';

interface FollowUpRow {
  id: string;
  followUpDate: string;
  periodStartsOn: string | null;
  periodEndsOn: string | null;
  nextAppointmentOn: string | null;
  followUpIntervalDays: number | null;
  objectiveStatus: number;
  weightKg: number | null;
  exerciseMinutes: number | null;
  exerciseType: string;
  averageSleepHours: number | null;
  planAdherencePercent: number | null;
  bristolStoolType: number | null;
  symptoms: string;
  adjustments: string;
  professionalNotes: string;
}

function todayLocal(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const STANDARD_INTERVALS = [7, 14, 21, 30];

export function addDaysToIsoDate(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day || !Number.isInteger(days)) return '';
  const result = new Date(Date.UTC(year, month - 1, day));
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-follow-ups',
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    IconComponent,
    PatientContextBarComponent,
    QuickTemplatesComponent,
    FlujoPlanNutricionalComponent,
  ],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Monitoreo</p>
        <h1>Seguimiento y evolución</h1>
        <p class="lede">
          Registra cada control según la frecuencia clínica acordada y compara la evolución.
        </p>
      </div>
    </header>
    <app-flujo-plan-nutricional [currentStep]="4" />
    <app-patient-context-bar />
    <div class="notice notice-success follow-guide">
      <app-icon name="info" /><span
        ><strong>Este paso se registra cuando exista un control real.</strong> Puede ser semanal,
        quincenal, mensual o según el criterio profesional; no modifica el menú guardado.</span
      >
    </div>
    <details class="template-disclosure">
      <summary>Usar una guía para la nota de seguimiento <small>Opcional</small></summary>
      <app-quick-templates
        scope="followUp"
        (templateSelected)="aplicarPlantilla($event)"
      />
    </details>
    <div class="follow-layout">
      <form #followForm="ngForm" class="surface" novalidate (ngSubmit)="save(followForm)">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Registro rápido</p>
            <h2>{{ editingId() ? 'Editar seguimiento' : 'Nuevo seguimiento' }}</h2>
          </div>
          <app-icon name="activity" />
        </header>
        <div class="surface-body form-grid">
          <p class="form-section-title col-12">Programación del control</p>
          <div class="field col-4">
            <label class="required" for="followUpDate">Fecha del seguimiento</label
            ><input
              id="followUpDate"
              name="followUpDate"
              type="date"
              [(ngModel)]="model.followUpDate"
              (ngModelChange)="onFollowUpDateChange()"
              [max]="today"
              required
            /><small>Fecha real de entrevista o control.</small>
          </div>
          <div class="field col-4">
            <label for="followUpFrequency">Frecuencia sugerida</label
            ><select
              id="followUpFrequency"
              name="followUpFrequency"
              [(ngModel)]="frequencyMode"
              (ngModelChange)="onFrequencyChange()"
            >
              <option [ngValue]="null">Sin programar</option>
              <option [ngValue]="7">Cada 7 días</option>
              <option [ngValue]="14">Cada 14 días</option>
              <option [ngValue]="21">Cada 21 días</option>
              <option [ngValue]="30">Cada 30 días</option>
              <option value="custom">Personalizada</option>
            </select><small>Orienta el próximo control; puede cambiarse.</small>
          </div>
          @if (frequencyMode === 'custom') {
            <div class="field col-4">
              <label class="required" for="customInterval">Intervalo personalizado</label
              ><input
                id="customInterval"
                name="customInterval"
                type="number"
                min="1"
                max="365"
                [(ngModel)]="customIntervalDays"
                (ngModelChange)="onFrequencyChange()"
                required
              /><small>días entre controles</small>
            </div>
          } @else {
            <div class="field col-4">
              <label for="nextAppointment">Próximo control</label
              ><input
                id="nextAppointment"
                name="nextAppointment"
                type="date"
                [(ngModel)]="model.nextAppointmentOn"
                [min]="model.followUpDate"
              /><small>Se calcula al elegir una frecuencia.</small>
            </div>
          }
          @if (frequencyMode === 'custom') {
            <div class="field col-4">
              <label for="nextAppointmentCustom">Próximo control</label
              ><input
                id="nextAppointmentCustom"
                name="nextAppointmentCustom"
                type="date"
                [(ngModel)]="model.nextAppointmentOn"
                [min]="model.followUpDate"
              /><small>Se calcula y puede ajustarse manualmente.</small>
            </div>
          }
          <div class="field col-4">
            <label for="periodStartsOn">Período evaluado desde</label
            ><input id="periodStartsOn" name="periodStartsOn" type="date" [(ngModel)]="model.periodStartsOn" [max]="model.followUpDate" />
            <small>Opcional; completa ambas fechas.</small>
          </div>
          <div class="field col-4">
            <label for="periodEndsOn">Período evaluado hasta</label
            ><input id="periodEndsOn" name="periodEndsOn" type="date" [(ngModel)]="model.periodEndsOn" [min]="model.periodStartsOn || undefined" [max]="model.followUpDate" />
            <small>Opcional; no puede superar el control.</small>
          </div>
          <div class="field col-4">
            <label for="objectiveStatus">Estado del objetivo</label
            ><select id="objectiveStatus" name="objectiveStatus" [(ngModel)]="model.objectiveStatus">
              <option [ngValue]="0">No evaluado</option>
              <option [ngValue]="1">En progreso</option>
              <option [ngValue]="2">Alcanzado</option>
              <option [ngValue]="3">Sin cambios</option>
              <option [ngValue]="4">Requiere ajuste</option>
            </select><small>Conclusión clínica de este control.</small>
          </div>
          <p class="form-section-title col-12">Indicadores registrados</p>
          <div class="field col-4">
            <label for="weeklyWeight">Peso</label
            ><input
              id="weeklyWeight"
              name="weight"
              type="number"
              step="0.1"
              min="20"
              max="350"
              [(ngModel)]="model.weightKg"
            /><small>kg · opcional</small>
          </div>
          <div class="field col-4">
            <label for="adherence">Adherencia</label
            ><input
              id="adherence"
              name="adherence"
              type="number"
              min="0"
              max="100"
              [(ngModel)]="model.planAdherencePercent"
            /><small>% referido</small>
          </div>
          <div class="field col-4">
            <label for="weeklyExercise">Ejercicio</label
            ><input
              id="weeklyExercise"
              name="exercise"
              [(ngModel)]="model.exerciseType"
              placeholder="Caminata y fuerza"
            /><small>Tipo e intensidad.</small>
          </div>
          <div class="field col-4">
            <label for="weeklyMinutes">Minutos</label
            ><input
              id="weeklyMinutes"
              name="minutes"
              type="number"
              min="0"
              max="3000"
              [(ngModel)]="model.exerciseMinutes"
            /><small>Total del período evaluado.</small>
          </div>
          <div class="field col-4">
            <label for="weeklySleep">Sueño promedio</label
            ><input
              id="weeklySleep"
              name="sleep"
              type="number"
              min="0"
              max="24"
              step="0.1"
              [(ngModel)]="model.averageSleepHours"
            /><small>horas/día</small>
          </div>
          <div class="field col-4">
            <label for="weeklyBristol">Bristol frecuente</label
            ><select id="weeklyBristol" name="bristol" [(ngModel)]="model.bristolStoolType">
              <option [ngValue]="null">No registrado</option>
              @for (i of [1, 2, 3, 4, 5, 6, 7]; track i) {
                <option [ngValue]="i">Tipo {{ i }}</option>
              }</select
            ><small>Forma y consistencia.</small>
          </div>
          <div class="field col-8">
            <label for="symptoms">Síntomas o dificultades</label
            ><input
              id="symptoms"
              name="symptoms"
              [(ngModel)]="model.symptoms"
              placeholder="Hambre, digestión, energía, barreras…"
            /><small>Texto referido por el paciente.</small>
          </div>
          <div class="field col-12">
            <label for="adjustments">Ajustes acordados</label
            ><textarea
              id="adjustments"
              name="adjustments"
              rows="3"
              maxlength="2000"
              [(ngModel)]="model.adjustments"
              placeholder="Cambios de porciones, horarios, actividad o estrategia…"
            ></textarea><small>Registra únicamente los cambios acordados en este control.</small>
          </div>
          <div class="field col-12">
            <label for="followNotes">Nota profesional</label
            ><textarea
              id="followNotes"
              name="notes"
              [(ngModel)]="model.professionalNotes"
            ></textarea
            ><small>Acuerdos y ajustes que deben revisarse.</small>
          </div>
        </div>
        <footer class="form-footer">
          @if (editingId()) {
            <button class="button button-secondary" type="button" [disabled]="saving()" (click)="cancelEdit(followForm)">
              Cancelar edición
            </button>
          }
          <button class="button button-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar seguimiento' }}
          </button>
        </footer>
      </form>
      <aside class="trend">
        <p class="eyebrow">Tendencia reciente</p>
        <strong class="trend-value">{{ weightChangeLabel() }} <em>kg</em></strong>
        <p>
          {{ bars().length < 2
            ? 'Hacen falta dos controles con peso para ver el cambio.'
            : 'en los últimos cuatro controles con peso' }}
        </p>
        <div class="bars" [attr.aria-label]="trendAriaLabel()">
          @for (bar of bars(); track bar.label) {
            <span [style.height.%]="bar.height"
              ><b>{{ bar.value }}</b
              ><small>{{ bar.label }}</small></span
            >
          }
        </div>
        <div class="trend-note">
          <span
            >Sueño promedio <b>{{ latest()?.averageSleepHours ?? '—' }} h</b></span
          ><span
            >Ejercicio <b>{{ latest()?.exerciseMinutes ?? '—' }} min</b></span
          ><span
            >Bristol <b>Tipo {{ latest()?.bristolStoolType ?? '—' }}</b></span
          >
        </div>
      </aside>
    </div>
    <section class="surface history">
      <header class="surface-header">
        <h2>Historial de seguimiento</h2>
        <span class="caption">Últimos 8 registros</span>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Período</th>
              <th>Peso</th>
              <th>Adherencia</th>
              <th>Estado</th>
              <th>Próximo control</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of history(); track row.id) {
              <tr>
                <td>{{ row.followUpDate | date: 'dd MMM y' : '' : 'es-EC' }}</td>
                <td>{{ periodLabel(row) }}</td>
                <td>{{ row.weightKg === null ? '—' : (row.weightKg | number: '1.1-1') + ' kg' }}</td>
                <td>
                  <span class="badge">{{ row.planAdherencePercent === null ? '—' : row.planAdherencePercent + '%' }}</span>
                </td>
                <td><span class="status-pill" [attr.data-status]="row.objectiveStatus">{{ objectiveStatusLabel(row.objectiveStatus) }}</span></td>
                <td>{{ row.nextAppointmentOn ? (row.nextAppointmentOn | date: 'dd MMM y' : '' : 'es-EC') : 'Sin programar' }}</td>
                <td><div class="toolbar">
                  <button class="button button-secondary button-small" type="button" (click)="edit(row)">Editar</button>
                  @if (auth.hasRole('ClinicAdmin')) {
                    @if (archiveCandidateId() === row.id) {
                      <span class="archive-confirm" role="group" aria-label="Confirmar archivo del seguimiento">
                        <span>¿Archivar?</span>
                        <button class="button button-secondary button-small" type="button" [disabled]="archivingId() === row.id" (click)="cancelArchive()">Cancelar</button>
                        <button class="button button-danger button-small" type="button" [disabled]="archivingId() === row.id" (click)="archive(row)">{{ archivingId() === row.id ? 'Archivando…' : 'Confirmar' }}</button>
                      </span>
                    } @else {
                      <button class="button button-danger button-small" type="button" (click)="requestArchive(row)">Archivar</button>
                    }
                  }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  </div>`,
  styles: [
    `
      .patient-strip {
        margin-bottom: 1rem;
      }
      .follow-guide {
        margin-bottom: 1rem;
      }
      .follow-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 19rem;
        gap: 1rem;
      }
      .surface-header > app-icon {
        color: var(--primary);
      }
      .form-footer {
        padding: 1rem 1.15rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.65rem;
        position: sticky;
        bottom: 0;
        z-index: 2;
        background: color-mix(in srgb, white, var(--surface-muted) 12%);
      }
      .form-section-title {
        margin: 0.2rem 0 -0.15rem;
        padding-bottom: 0.5rem;
        color: var(--primary-dark);
        border-bottom: 1px solid color-mix(in srgb, var(--primary), transparent 82%);
        font: 700 0.88rem var(--font-display);
      }
      @media (min-width: 901px) {
        .trend {
          position: sticky;
          top: 1rem;
          align-self: start;
        }
      }
      .trend {
        padding: 1.3rem;
        color: white;
        background: var(--primary-dark);
        border-radius: 2.5rem 0.8rem 0.8rem;
        overflow: hidden;
      }
      .trend .eyebrow,
      .trend p,
      .trend small {
        color: #dcebc6;
      }
      .trend-value {
        font: 700 2.2rem var(--font-display);
      }
      .trend-value em {
        font: 600 0.8rem var(--font-sans);
      }
      .bars {
        height: 10rem;
        margin: 1.5rem 0 1rem;
        display: flex;
        align-items: end;
        gap: 0.55rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.25);
      }
      .bars > span {
        flex: 1;
        min-height: 25%;
        padding-top: 0.35rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        background: linear-gradient(var(--avocado-soft), #82af24);
        border-radius: 0.35rem 0.35rem 0 0;
        color: var(--primary-dark);
      }
      .bars b {
        font-size: 0.72rem;
      }
      .bars small {
        padding: 0.25rem 0;
        color: var(--primary-dark);
        font-size: 0.72rem;
      }
      .trend-note {
        display: grid;
        gap: 0.5rem;
      }
      .trend-note span {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
      }
      .history {
        margin-top: 1rem;
      }
      .history table {
        min-width: 67rem;
      }
      .status-pill {
        display: inline-flex;
        padding: 0.28rem 0.48rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        color: var(--text-muted);
        background: var(--surface-muted);
        font-size: 0.72rem;
        font-weight: 750;
        white-space: nowrap;
      }
      .status-pill[data-status='1'] {
        color: var(--primary-dark);
        border-color: color-mix(in srgb, var(--primary), transparent 68%);
        background: color-mix(in srgb, var(--avocado-soft), white 70%);
      }
      .status-pill[data-status='2'] {
        color: var(--primary-dark);
        border-color: color-mix(in srgb, var(--primary), transparent 55%);
        background: color-mix(in srgb, var(--fresh), white 78%);
      }
      .status-pill[data-status='4'] {
        color: #7a4a08;
        border-color: #e4c38d;
        background: #fff7e8;
      }
      .archive-confirm {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      @media (max-width: 980px) {
        .follow-layout {
          grid-template-columns: 1fr;
        }
        .trend {
          min-height: 22rem;
        }
        .bars {
          height: 8rem;
        }
      }
      @media (max-width: 650px) {
        .form-footer {
          position: static;
          flex-direction: column-reverse;
        }
        .form-footer .button {
          width: 100%;
        }
      }
    `,
  ],
})
export class FollowUpsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  private readonly patientContext = inject(PatientContextService);
  private loadedPatientId = '';
  readonly today = todayLocal();
  readonly saving = signal(false);
  readonly history = signal<FollowUpRow[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly archiveCandidateId = signal<string | null>(null);
  readonly archivingId = signal<string | null>(null);
  frequencyMode: number | 'custom' | null = null;
  customIntervalDays: number | null = null;
  readonly latest = computed(() => this.history()[0] ?? null);
  readonly bars = computed(() => {
    const rows = this.history()
      .filter((row) => row.weightKg !== null)
      .slice(0, 4)
      .reverse();
    const values = rows.map((row) => Number(row.weightKg));
    const max = Math.max(...values);
    // La altura parte de cero: un eje recortado haría parecer enorme un cambio pequeño.
    return rows.map((row) => ({
      label: this.shortDate(row.followUpDate).slice(0, 5),
      value: Number(row.weightKg).toFixed(1),
      height: (Number(row.weightKg) / max) * 90,
    }));
  });
  model = {
    followUpDate: todayLocal(),
    periodStartsOn: null as string | null,
    periodEndsOn: null as string | null,
    nextAppointmentOn: null as string | null,
    followUpIntervalDays: null as number | null,
    objectiveStatus: 0,
    weightKg: null as number | null,
    exerciseMinutes: null as number | null,
    exerciseType: '',
    averageSleepHours: null as number | null,
    planAdherencePercent: null as number | null,
    bristolStoolType: null as number | null,
    symptoms: '',
    adjustments: '',
    professionalNotes: '',
  };
  aplicarPlantilla(plantilla: QuickTemplate): void {
    const modelo = this.model as Record<string, unknown>;
    const numericos = ['exerciseMinutes', 'averageSleepHours', 'planAdherencePercent', 'bristolStoolType', 'objectiveStatus', 'followUpIntervalDays'];
    let completados = 0;
    let conservados = 0;
    for (const [campo, valor] of Object.entries(plantilla.values)) {
      if (!valor) continue;
      const actual = modelo[campo];
      const vacio =
        actual === '' || actual === null || actual === undefined || (campo === 'objectiveStatus' && actual === 0);
      if (!vacio) {
        conservados += 1;
        continue;
      }
      modelo[campo] = numericos.includes(campo) ? Number(valor) : valor;
      completados += 1;
    }
    this.toast.show(
      'success',
      'Plantilla aplicada',
      conservados
        ? `Se completaron ${completados} campos y se conservaron ${conservados} que ya tenían datos.`
        : `Se completaron ${completados} campos. Revísalos antes de guardar.`,
    );
  }
  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (patientId && patientId !== this.loadedPatientId) {
        this.resetEditor();
        this.loadHistory(patientId);
      }
    });
  }
  private loadHistory(patientId: string, force = false): void {
    if (!force && this.loadedPatientId === patientId) return;
    this.loadedPatientId = patientId;
    this.api.followUps(patientId).subscribe({
      next: (rows) => {
        this.history.set(rows as FollowUpRow[]);
      },
      error: (error: Error) => this.toast.show('error', 'No se cargó el historial', error.message),
    });
  }
  save(form: NgForm): void {
    if (form.invalid) {
      this.toast.show('error', 'Revisa los campos marcados', 'La fecha del seguimiento y el intervalo deben ser válidos.');
      this.focusFirstInvalidField();
      return;
    }
    if (!!this.model.periodStartsOn !== !!this.model.periodEndsOn) {
      this.toast.show('error', 'Período incompleto', 'Completa las dos fechas del período evaluado o deja ambas vacías.');
      document.querySelector<HTMLElement>('#periodStartsOn')?.focus();
      return;
    }
    if (this.model.periodStartsOn && this.model.periodEndsOn && this.model.periodStartsOn > this.model.periodEndsOn) {
      this.toast.show('error', 'Período no válido', 'La fecha inicial debe ser anterior o igual a la fecha final.');
      document.querySelector<HTMLElement>('#periodStartsOn')?.focus();
      return;
    }
    if (this.model.periodEndsOn && this.model.periodEndsOn > this.model.followUpDate) {
      this.toast.show('error', 'Período no válido', 'El período evaluado no puede terminar después del seguimiento.');
      document.querySelector<HTMLElement>('#periodEndsOn')?.focus();
      return;
    }
    if (this.model.nextAppointmentOn && this.model.nextAppointmentOn < this.model.followUpDate) {
      this.toast.show('error', 'Próximo control no válido', 'El próximo control no puede ser anterior al seguimiento.');
      document.querySelector<HTMLElement>('#nextAppointment, #nextAppointmentCustom')?.focus();
      return;
    }
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show('error', 'Selecciona un paciente');
      return;
    }
    this.saving.set(true);
    const editingId = this.editingId();
    const payload = {
      ...this.model,
      followUpIntervalDays: this.resolvedIntervalDays(),
    };
    const request = editingId
      ? this.api.updateFollowUp(payload, patientId, editingId)
      : this.api.saveFollowUp(payload, patientId);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.resetEditor();
        form.resetForm(this.model);
        this.loadHistory(patientId, true);
        this.toast.show('success', editingId ? 'Seguimiento actualizado' : 'Seguimiento guardado');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.show('error', 'No se pudo guardar', e.message);
      },
    });
  }

  edit(row: FollowUpRow): void {
    this.editingId.set(row.id);
    this.archiveCandidateId.set(null);
    this.model = {
      followUpDate: row.followUpDate,
      periodStartsOn: row.periodStartsOn,
      periodEndsOn: row.periodEndsOn,
      nextAppointmentOn: row.nextAppointmentOn,
      followUpIntervalDays: row.followUpIntervalDays,
      objectiveStatus: row.objectiveStatus,
      weightKg: row.weightKg,
      exerciseMinutes: row.exerciseMinutes,
      exerciseType: row.exerciseType,
      averageSleepHours: row.averageSleepHours,
      planAdherencePercent: row.planAdherencePercent,
      bristolStoolType: row.bristolStoolType,
      symptoms: row.symptoms,
      adjustments: row.adjustments,
      professionalNotes: row.professionalNotes,
    };
    if (row.followUpIntervalDays === null) {
      this.frequencyMode = null;
      this.customIntervalDays = null;
    } else if (STANDARD_INTERVALS.includes(row.followUpIntervalDays)) {
      this.frequencyMode = row.followUpIntervalDays;
      this.customIntervalDays = null;
    } else {
      this.frequencyMode = 'custom';
      this.customIntervalDays = row.followUpIntervalDays;
    }
    document.querySelector('#followUpDate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    queueMicrotask(() => document.querySelector<HTMLElement>('#followUpDate')?.focus());
  }

  cancelEdit(form: NgForm): void {
    this.resetEditor();
    form.resetForm(this.model);
    queueMicrotask(() => document.querySelector<HTMLElement>('#followUpDate')?.focus());
  }

  requestArchive(row: FollowUpRow): void {
    this.archiveCandidateId.set(row.id);
  }

  cancelArchive(): void {
    this.archiveCandidateId.set(null);
  }

  archive(row: FollowUpRow): void {
    const patientId = this.patientContext.selectedId();
    if (!patientId) return;
    this.archivingId.set(row.id);
    this.api.archiveFollowUp(patientId, row.id).subscribe({
      next: () => {
        this.archivingId.set(null);
        this.archiveCandidateId.set(null);
        if (this.editingId() === row.id) this.resetEditor();
        this.loadHistory(patientId, true);
        this.toast.show('success', 'Seguimiento archivado', 'Se conserva en la auditoría y se oculta del historial activo.');
      },
      error: (e) => {
        this.archivingId.set(null);
        this.toast.show('error', 'No se archivó el seguimiento', e.message);
      },
    });
  }

  onFollowUpDateChange(): void {
    this.updateNextAppointment();
  }

  onFrequencyChange(): void {
    this.model.followUpIntervalDays = this.resolvedIntervalDays();
    this.updateNextAppointment();
  }

  private shortDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  periodLabel(row: FollowUpRow): string {
    return row.periodStartsOn && row.periodEndsOn
      ? `${this.shortDate(row.periodStartsOn)} a ${this.shortDate(row.periodEndsOn)}`
      : 'Sin período definido';
  }

  objectiveStatusLabel(status: number): string {
    return ['No evaluado', 'En progreso', 'Alcanzado', 'Sin cambios', 'Requiere ajuste'][status] ?? 'No evaluado';
  }

  weightChangeLabel(): string {
    const rows = this.history()
      .filter((row) => row.weightKg !== null)
      .slice(0, 4);
    if (rows.length < 2) return '—';
    const change = Number(rows[0].weightKg) - Number(rows.at(-1)!.weightKg);
    return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}`;
  }

  trendAriaLabel(): string {
    const values = this.bars()
      .map((bar) => `${bar.value} kilogramos`)
      .join(', ');
    return values ? `Peso en controles recientes: ${values}` : 'Sin datos de peso en seguimientos';
  }

  private resolvedIntervalDays(): number | null {
    if (this.frequencyMode === 'custom') return this.customIntervalDays;
    return this.frequencyMode;
  }

  private updateNextAppointment(): void {
    const days = this.resolvedIntervalDays();
    this.model.followUpIntervalDays = days;
    if (!days || !this.model.followUpDate) {
      this.model.nextAppointmentOn = null;
      return;
    }
    this.model.nextAppointmentOn = addDaysToIsoDate(this.model.followUpDate, days);
  }

  private resetEditor(): void {
    this.editingId.set(null);
    this.archiveCandidateId.set(null);
    this.frequencyMode = null;
    this.customIntervalDays = null;
    this.model = {
      followUpDate: todayLocal(),
      periodStartsOn: null,
      periodEndsOn: null,
      nextAppointmentOn: null,
      followUpIntervalDays: null,
      objectiveStatus: 0,
      weightKg: null,
      exerciseMinutes: null,
      exerciseType: '',
      averageSleepHours: null,
      planAdherencePercent: null,
      bristolStoolType: null,
      symptoms: '',
      adjustments: '',
      professionalNotes: '',
    };
  }

  private focusFirstInvalidField(): void {
    queueMicrotask(() => document.querySelector<HTMLElement>('form .ng-invalid:not(form)')?.focus());
  }
}
