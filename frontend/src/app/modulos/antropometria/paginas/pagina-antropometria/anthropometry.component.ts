import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService, AnthropometrySummary } from '../../../../nucleo/api.service';
import { toLocalIsoDate } from '../../../../nucleo/fechas';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import {
  ASCITES_OPTIONS,
  EDEMA_OPTIONS,
  MEASURE_GROUPS,
  MeasureKey,
  deriveIndicators,
} from '../../modelos/anthropometry-fields';

type AnthropometryForm = Partial<Record<MeasureKey, number | null>> & {
  edemaGrade: string;
  ascitesGrade: string;
  measuredOn: string;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPercent: number | null;
  notes: string;
};

@Component({
  selector: 'app-anthropometry',
  imports: [FormsModule, DatePipe, DecimalPipe, IconComponent, PatientContextBarComponent],
  template: `
    <div class="page anthropometry-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Evaluación clínica</p>
          <h1>Antropometría</h1>
          <p class="lede">
            Registra cada medición y consulta la evolución sin reemplazar datos anteriores.
          </p>
        </div>
        <button class="button button-primary" type="button" (click)="startCreate()">
          <app-icon name="plus" /> Nueva medición
        </button>
      </header>

      <app-patient-context-bar />

      @if (editorOpen()) {
        <section class="surface editor" aria-labelledby="anthropometryEditorTitle">
          <header class="surface-header">
            <div>
              <p class="eyebrow">{{ editingId() ? 'Corrección clínica' : 'Nuevo registro' }}</p>
              <h2 id="anthropometryEditorTitle">
                {{ editingId() ? 'Editar medición' : 'Registrar medición antropométrica' }}
              </h2>
            </div>
            <button class="icon-button" type="button" aria-label="Cerrar formulario" (click)="cancelEdit()">
              <app-icon name="close" />
            </button>
          </header>
          <form #measureForm="ngForm" class="surface-body form-grid" novalidate (ngSubmit)="save(measureForm)">
            <div class="field col-4">
              <label class="required" for="measuredOn">Fecha de medición</label>
              <input id="measuredOn" name="measuredOn" type="date" [(ngModel)]="form.measuredOn"
                [max]="today" required #measuredOn="ngModel"
                [attr.aria-invalid]="measuredOn.invalid && (measuredOn.touched || submitted())"
                aria-describedby="measuredOnHelp" />
              <small id="measuredOnHelp" [class.field-error]="measuredOn.invalid && (measuredOn.touched || submitted())">
                {{ measuredOn.invalid && (measuredOn.touched || submitted()) ? 'Selecciona una fecha válida, no futura.' : 'Día en que se tomó la medición.' }}
              </small>
            </div>
            <div class="field col-4">
              <label class="required" for="weightKg">Peso</label>
              <div class="unit-input"><input id="weightKg" name="weightKg" type="number" inputmode="decimal"
                [(ngModel)]="form.weightKg" min="20" max="350" step="0.1" required #weightKg="ngModel"
                [attr.aria-invalid]="weightKg.invalid && (weightKg.touched || submitted())"
                aria-describedby="weightHelp" /><span>kg</span></div>
              <small id="weightHelp" [class.field-error]="weightKg.invalid && (weightKg.touched || submitted())">Rango admitido: 20 a 350 kg.</small>
            </div>
            <div class="field col-4">
              <label class="required" for="heightCm">Estatura</label>
              <div class="unit-input"><input id="heightCm" name="heightCm" type="number" inputmode="decimal"
                [(ngModel)]="form.heightCm" min="90" max="250" step="0.1" required #heightCm="ngModel"
                [attr.aria-invalid]="heightCm.invalid && (heightCm.touched || submitted())"
                aria-describedby="heightHelp" /><span>cm</span></div>
              <small id="heightHelp" [class.field-error]="heightCm.invalid && (heightCm.touched || submitted())">Rango admitido: 90 a 250 cm.</small>
            </div>
            <div class="field col-4">
              <label for="waistCm">Circunferencia de cintura</label>
              <div class="unit-input"><input id="waistCm" name="waistCm" type="number" inputmode="decimal"
                [(ngModel)]="form.waistCm" min="20" max="250" step="0.1" #waistCm="ngModel"
                [attr.aria-invalid]="waistCm.invalid && (waistCm.touched || submitted())" /><span>cm</span></div>
            </div>
            <div class="field col-4">
              <label for="hipCm">Circunferencia de cadera</label>
              <div class="unit-input"><input id="hipCm" name="hipCm" type="number" inputmode="decimal"
                [(ngModel)]="form.hipCm" min="20" max="250" step="0.1" #hipCm="ngModel"
                [attr.aria-invalid]="hipCm.invalid && (hipCm.touched || submitted())" /><span>cm</span></div>
            </div>
            <div class="field col-4">
              <label for="bodyFatPercent">Grasa corporal</label>
              <div class="unit-input"><input id="bodyFatPercent" name="bodyFatPercent" type="number" inputmode="decimal"
                [(ngModel)]="form.bodyFatPercent" min="0" max="80" step="0.1" #bodyFatPercent="ngModel"
                [attr.aria-invalid]="bodyFatPercent.invalid && (bodyFatPercent.touched || submitted())" /><span>%</span></div>
            </div>
            @for (group of measureGroups; track group.title) {
              <details class="measure-group col-12" [open]="groupHasValues(group.fields)">
                <summary><strong>{{ group.title }}</strong> <small>{{ group.help }}</small></summary>
                <div class="form-grid">
                  @for (field of group.fields; track field.key) {
                    <div class="field col-3">
                      <label [for]="field.key">{{ field.label }}</label>
                      <div class="unit-input">
                        <input
                          [id]="field.key"
                          [name]="field.key"
                          type="number"
                          inputmode="decimal"
                          step="0.1"
                          [min]="field.min"
                          [max]="field.max"
                          [(ngModel)]="form[field.key]"
                        /><span>{{ field.unit }}</span>
                      </div>
                    </div>
                  }
                  @if (group.title === 'Paciente clínico') {
                    <div class="field col-3">
                      <label for="edemaGrade">Edema</label>
                      <select id="edemaGrade" name="edemaGrade" [(ngModel)]="form.edemaGrade">
                        <option value="">No evaluado</option>
                        @for (option of edemaOptions; track option) {
                          <option>{{ option }}</option>
                        }
                      </select>
                    </div>
                    <div class="field col-3">
                      <label for="ascitesGrade">Ascitis</label>
                      <select id="ascitesGrade" name="ascitesGrade" [(ngModel)]="form.ascitesGrade">
                        <option value="">No evaluada</option>
                        @for (option of ascitesOptions; track option) {
                          <option>{{ option }}</option>
                        }
                      </select>
                    </div>
                  }
                </div>
              </details>
            }
            @if (formIndicators().length) {
              <section class="indicators col-12" aria-label="Indicadores calculados">
                @for (item of formIndicators(); track item.label) {
                  <article><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.help }}</small></article>
                }
              </section>
            }
            <div class="field col-12">
              <label for="anthropometryNotes">Observaciones</label>
              <textarea class="resize-none" id="anthropometryNotes" name="notes" [(ngModel)]="form.notes"
                maxlength="1000" rows="4" placeholder="Ej.: primera medición de referencia"></textarea>
              <small>Contexto de la toma, condiciones o notas para la próxima comparación.</small>
            </div>
            <footer class="form-actions col-12">
              <button class="button button-secondary" type="button" (click)="cancelEdit()">Cancelar</button>
              <button class="button button-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Guardando…' : editingId() ? 'Guardar cambios' : 'Guardar medición' }}
              </button>
            </footer>
          </form>
        </section>
      }

      @if (loading()) {
        <section class="surface state" aria-live="polite">Cargando mediciones…</section>
      } @else if (loadError()) {
        <section class="surface state state-error" role="alert">
          <span>{{ loadError() }}</span>
          <button class="button button-secondary button-small" type="button" (click)="reload()">Reintentar</button>
        </section>
      } @else if (latest(); as current) {
        <section class="metrics" aria-label="Última medición">
          <article><span>Peso actual</span><strong>{{ current.weightKg | number: '1.1-2' }} kg</strong><small>{{ weightChange() }}</small></article>
          <article><span>Estatura</span><strong>{{ current.heightCm | number: '1.0-2' }} cm</strong><small>Última registrada</small></article>
          <article><span>IMC estimado</span><strong>{{ bmi(current) | number: '1.1-1' }}</strong><small>Peso ÷ estatura²; sin clasificación</small></article>
          <article><span>Cintura / cadera</span><strong>{{ waistHipRatio(current) }}</strong><small>Solo si ambas medidas existen</small></article>
        </section>
      }

      @if (latest(); as current) {
        @if (latestDetails(current).length || latestIndicators(current).length) {
          <section class="surface details" aria-labelledby="latestDetailsTitle">
            <header class="surface-header"><h2 id="latestDetailsTitle">Última medición completa</h2></header>
            <div class="surface-body">
              @if (latestIndicators(current).length) {
                <div class="indicators">
                  @for (item of latestIndicators(current); track item.label) {
                    <article><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.help }}</small></article>
                  }
                </div>
              }
              <dl class="detail-list">
                @for (item of latestDetails(current); track item.label) {
                  <div><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
                }
              </dl>
            </div>
          </section>
        }
      }

      @if (weightBars().length > 1) {
        <section class="surface weight-chart" aria-labelledby="weightChartTitle">
          <header class="surface-header"><h2 id="weightChartTitle">Evolución del peso</h2></header>
          <div class="bars" role="img" [attr.aria-label]="weightChartLabel()">
            @for (bar of weightBars(); track bar.key) {
              <div class="bar">
                <b>{{ bar.value }} kg</b>
                <span class="bar-fill" [style.height.%]="bar.height"></span>
                <small>{{ bar.label }}</small>
              </div>
            }
          </div>
        </section>
      }

      <section class="surface history" aria-labelledby="anthropometryHistoryTitle">
        <header class="surface-header">
          <div><p class="eyebrow">Evolución</p><h2 id="anthropometryHistoryTitle">Historial de mediciones</h2></div>
          <span class="caption">{{ measurements().length }} {{ measurements().length === 1 ? 'registro' : 'registros' }}</span>
        </header>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Fecha</th><th>Peso</th><th>Estatura</th><th>Cintura</th><th>Cadera</th><th>Grasa</th><th>Observaciones</th><th>Acción</th></tr></thead>
            <tbody>
              @for (row of measurements(); track row.id) {
                <tr>
                  <td>{{ row.measuredAtUtc | date: 'dd MMM y' : 'UTC' : 'es-EC' }}</td>
                  <td><strong>{{ row.weightKg | number: '1.1-2' }} kg</strong></td>
                  <td>{{ row.heightCm | number: '1.0-2' }} cm</td>
                  <td>{{ row.waistCm == null ? '—' : (row.waistCm | number: '1.0-2') + ' cm' }}</td>
                  <td>{{ row.hipCm == null ? '—' : (row.hipCm | number: '1.0-2') + ' cm' }}</td>
                  <td>{{ row.bodyFatPercent == null ? '—' : (row.bodyFatPercent | number: '1.0-2') + ' %' }}</td>
                  <td class="notes-cell">{{ row.notes || 'Sin observaciones' }}</td>
                  <td><button class="button button-secondary button-small" type="button" (click)="edit(row)"><app-icon name="edit" /> Editar</button></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty-row">No hay mediciones. Usa “Nueva medición” para crear la referencia inicial.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .measure-group { padding: .7rem .85rem; border: 1px solid var(--border-section); border-radius: .7rem; }
    .measure-group summary { cursor: pointer; }
    .measure-group summary small { color: var(--text-muted); font-weight: 400; margin-left: .35rem; }
    .measure-group .form-grid { margin-top: .75rem; }
    .indicators { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .6rem; }
    .indicators article { padding: .6rem .75rem; display: grid; background: var(--surface-muted); border-radius: .6rem; }
    .indicators span, .indicators small { color: var(--text-muted); font-size: .75rem; }
    .details { margin-bottom: 1rem; }
    .detail-list { margin: .9rem 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: .6rem .9rem; }
    .detail-list dt { color: var(--text-muted); font-size: .75rem; }
    .detail-list dd { margin: 0; font-weight: 650; }
    .weight-chart { margin-bottom: 1rem; }
    .weight-chart .bars { height: 12rem; padding: 1rem 1.15rem; display: flex; align-items: stretch; gap: .6rem; overflow-x: auto; }
    .weight-chart .bar { flex: 1 0 3.2rem; max-width: 6rem; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: .25rem; font-size: .72rem; }
    .weight-chart .bar-fill { width: 100%; max-height: calc(100% - 2.6rem); background: var(--fresh); border-radius: .35rem .35rem 0 0; }
    .weight-chart small { color: var(--text-muted); }

    .anthropometry-page { max-width: 92rem; }
    .editor { margin-bottom: 1rem; scroll-margin-top: 1rem; }
    .unit-input { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); overflow: hidden; }
    .unit-input:focus-within { outline: 3px solid color-mix(in srgb, var(--focus), white 28%); outline-offset: 2px; }
    .unit-input input { min-width: 0; border: 0; outline: 0; }
    .unit-input span { padding: 0 .75rem; color: var(--text-muted); font-size: .75rem; font-weight: 750; }
    .form-actions { display: flex; justify-content: flex-end; gap: .65rem; padding-top: .8rem; border-top: 1px solid var(--border-soft); }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; margin: 1rem 0; }
    .metrics article { padding: 1rem; border: 1px solid var(--border-section); border-radius: var(--radius-lg); background: linear-gradient(145deg, var(--surface), var(--surface-muted)); }
    .metrics span, .metrics small { display: block; color: var(--text-muted); font-size: 0.72rem; }
    .metrics strong { display: block; margin: .35rem 0; font: 700 1.35rem/1.1 var(--font-display); }
    .history { margin-top: 1rem; }
    .notes-cell { min-width: 14rem; max-width: 24rem; white-space: normal; }
    .state { min-height: 6rem; display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem; color: var(--text-muted); }
    .state-error { color: var(--danger); }
    @media (max-width: 900px) { .metrics { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 600px) { .page-header { align-items: stretch; flex-direction: column; } .metrics { grid-template-columns: 1fr; } .form-actions { flex-direction: column-reverse; } }
  `],
})
export class AnthropometryComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly patientContext = inject(PatientContextService);
  readonly measurements = signal<AnthropometrySummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly today = toLocalIsoDate();
  readonly latest = () => this.measurements()[0] ?? null;
  private loadedPatientId = '';
  form: AnthropometryForm = this.emptyForm();
  readonly measureGroups = MEASURE_GROUPS;
  readonly edemaOptions = EDEMA_OPTIONS;
  readonly ascitesOptions = ASCITES_OPTIONS;

  groupHasValues(fields: { key: MeasureKey }[]): boolean {
    return fields.some((field) => this.form[field.key] != null);
  }
  formIndicators() {
    return deriveIndicators(this.form);
  }
  latestIndicators(row: AnthropometrySummary) {
    return deriveIndicators(row);
  }
  latestDetails(row: AnthropometrySummary): { label: string; value: string }[] {
    const details = MEASURE_GROUPS.flatMap((group) => group.fields)
      .filter((field) => row[field.key] != null)
      .map((field) => ({ label: field.label, value: `${Number(row[field.key])} ${field.unit}` }));
    if (row.edemaGrade) details.push({ label: 'Edema', value: row.edemaGrade });
    if (row.ascitesGrade) details.push({ label: 'Ascitis', value: row.ascitesGrade });
    return details;
  }

  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (patientId && patientId !== this.loadedPatientId) this.load(patientId);
      if (!patientId) {
        this.loadedPatientId = '';
        this.measurements.set([]);
      }
    });
  }

  startCreate(): void {
    if (!this.patientContext.selectedId()) {
      this.toast.show('error', 'Selecciona un paciente', 'La medición debe pertenecer a un expediente.');
      return;
    }
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.submitted.set(false);
    this.editorOpen.set(true);
    this.scrollToEditor();
  }

  edit(row: AnthropometrySummary): void {
    this.editingId.set(row.id);
    this.form = {
      measuredOn: row.measuredAtUtc.slice(0, 10), weightKg: row.weightKg, heightCm: row.heightCm,
      waistCm: row.waistCm, hipCm: row.hipCm, bodyFatPercent: row.bodyFatPercent, notes: row.notes ?? '',
      edemaGrade: row.edemaGrade ?? '', ascitesGrade: row.ascitesGrade ?? '',
      ...Object.fromEntries(
        MEASURE_GROUPS.flatMap((group) => group.fields).map((field) => [field.key, row[field.key] ?? null]),
      ),
    };
    this.submitted.set(false);
    this.editorOpen.set(true);
    this.scrollToEditor();
  }

  cancelEdit(): void { this.editorOpen.set(false); this.editingId.set(null); this.submitted.set(false); }
  reload(): void { const id = this.patientContext.selectedId(); if (id) this.load(id); }

  save(form: NgForm): void {
    this.submitted.set(true);
    if (form.invalid || !this.form.weightKg || !this.form.heightCm || this.form.measuredOn > this.today) {
      form.control.markAllAsTouched();
      queueMicrotask(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      this.toast.show('error', 'Revisa la medición', 'Corrige los campos marcados antes de guardar.');
      return;
    }
    const patientId = this.patientContext.selectedId();
    if (!patientId || this.saving()) return;
    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.api.updateAnthropometry(patientId, id, this.form) : this.api.saveAnthropometry(patientId, this.form);
    request.subscribe({
      next: () => { this.saving.set(false); this.cancelEdit(); this.load(patientId); this.toast.show('success', id ? 'Medición actualizada' : 'Medición guardada', 'El historial antropométrico quedó actualizado.'); },
      error: (error) => { this.saving.set(false); this.toast.show('error', 'No se guardó la medición', error.message); },
    });
  }

  weightBars() {
    const rows = this.measurements().slice(0, 12).reverse();
    const max = Math.max(...rows.map((row) => Number(row.weightKg)));
    return rows.map((row) => {
      const [, month, day] = row.measuredAtUtc.slice(0, 10).split('-');
      return {
        key: row.id,
        value: Number(row.weightKg).toFixed(1),
        // Parte de cero: un eje recortado haría parecer enorme un cambio pequeño.
        height: (Number(row.weightKg) / max) * 100,
        label: `${day}/${month}`,
      };
    });
  }
  weightChartLabel(): string {
    return `Peso en cada medición: ${this.weightBars().map((bar) => `${bar.label}, ${bar.value} kg`).join('; ')}`;
  }
  bmi(row: AnthropometrySummary): number { const meters = row.heightCm / 100; return meters ? row.weightKg / (meters * meters) : 0; }
  waistHipRatio(row: AnthropometrySummary): string { return row.waistCm && row.hipCm ? (row.waistCm / row.hipCm).toFixed(2) : '—'; }
  weightChange(): string {
    const [current, previous] = this.measurements();
    if (!current || !previous) return 'Primera referencia';
    const delta = current.weightKg - previous.weightKg;
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg desde la anterior`;
  }

  private load(patientId: string): void {
    this.loadedPatientId = patientId; this.loading.set(true); this.loadError.set(''); this.cancelEdit();
    this.api.anthropometry(patientId).subscribe({
      next: (rows) => { if (this.patientContext.selectedId() !== patientId) return; this.measurements.set(rows); this.loading.set(false); },
      error: (error) => { this.measurements.set([]); this.loading.set(false); this.loadError.set(error.message); },
    });
  }
  private emptyForm(): AnthropometryForm { return { measuredOn: this.today, weightKg: null, heightCm: null, waistCm: null, hipCm: null, bodyFatPercent: null, notes: '', edemaGrade: '', ascitesGrade: '' }; }
  private scrollToEditor(): void { setTimeout(() => document.querySelector('.editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
}
