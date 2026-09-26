import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService, EnergyRecord, EnergyResult } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';

@Component({
  selector: 'app-energy',
  imports: [FormsModule, DatePipe, DecimalPipe, IconComponent, PatientContextBarComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Evaluación · energía</p>
        <h1>Cálculo de gasto energético</h1>
        <p class="lede">
          Compara ecuaciones validadas, actividad física, efecto térmico de los alimentos (ETA) y
          ajuste clínico.
        </p>
      </div>
      <span class="badge">Cálculo trazable</span>
    </header>
    <app-patient-context-bar />
    <div class="notice notice-warning">
      <app-icon name="info" /><span
        >El resultado es una estimación. El profesional debe validar contexto clínico, composición
        corporal, evolución y objetivo.</span
      >
    </div>
    <div class="calculator-layout">
      <form #energyForm="ngForm" class="surface" novalidate (ngSubmit)="calculate(energyForm)">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Parámetros</p>
            <h2>Datos para la ecuación</h2>
          </div>
          <app-icon name="energy" />
        </header>
        <div class="surface-body form-grid">
          <div class="field col-6">
            <label class="required" for="formula">Fórmula</label
            ><select id="formula" name="formula" [(ngModel)]="model.formula" required>
              <option [ngValue]="0">Mifflin–St Jeor (1990)</option>
              <option [ngValue]="1">Harris–Benedict revisada (1984)</option></select
            ><small>Ambas estiman gasto energético en reposo en adultos.</small>
          </div>
          <div class="field col-6">
            <label class="required" for="sex-energy">Sexo usado por la ecuación</label
            ><select id="sex-energy" name="sex" [(ngModel)]="model.sex" required>
              <option value="" disabled>Selecciona una opción</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option></select
            ><small>Constante exigida por las ecuaciones implementadas.</small>
          </div>
          <div class="field col-4">
            <label class="required" for="weight">Peso</label
            ><input
              id="weight"
              name="weight"
              type="number"
              min="20"
              max="350"
              step="0.1"
              [(ngModel)]="model.weightKg"
              required
            /><small>kg</small>
          </div>
          <div class="field col-4">
            <label class="required" for="height">Estatura</label
            ><input
              id="height"
              name="height"
              type="number"
              min="90"
              max="250"
              step="0.1"
              [(ngModel)]="model.heightCm"
              required
            /><small>cm</small>
          </div>
          <div class="field col-4">
            <label class="required" for="age">Edad</label
            ><input
              id="age"
              name="age"
              type="number"
              min="18"
              max="120"
              [(ngModel)]="model.ageYears"
              required
            /><small>años</small>
          </div>
          <div class="field col-6">
            <label class="required" for="activity-factor">Factor de actividad</label
            ><select
              id="activity-factor"
              name="activityFactor"
              [(ngModel)]="model.activityFactor"
              required
            >
              <option [ngValue]="1.2">1.20 · sedentaria</option>
              <option [ngValue]="1.375">1.375 · ligera</option>
              <option [ngValue]="1.55">1.55 · moderada</option>
              <option [ngValue]="1.725">1.725 · alta</option>
              <option [ngValue]="1.9">1.90 · muy alta</option></select
            ><small>Configurable según actividad y criterio profesional.</small>
          </div>
          <div class="field col-3">
            <label class="required" for="eta">ETA</label
            ><input
              id="eta"
              name="eta"
              type="number"
              min="0"
              max="30"
              step="1"
              [ngModel]="model.etaPercent * 100"
              (ngModelChange)="model.etaPercent = $event / 100"
              required
            /><small>% sobre reposo × actividad.</small>
          </div>
          <div class="field col-3">
            <label for="adjustment">Ajuste de objetivo</label
            ><input
              id="adjustment"
              name="adjustment"
              type="number"
              min="-1000"
              max="1000"
              step="50"
              [(ngModel)]="model.goalAdjustmentKcal"
            /><small>kcal/día</small>
          </div>
        </div>
        <footer class="form-footer">
          <button class="button button-primary" type="submit" [disabled]="loading()">
            <app-icon name="energy" /> {{ loading() ? 'Calculando…' : 'Calcular y registrar' }}
          </button>
        </footer>
      </form>
      <section class="result" [class.empty]="!result()">
        @if (result(); as r) {
          <p class="eyebrow">Resultado estimado</p>
          <strong class="total">{{ r.totalEnergyKcal | number: '1.0-0' }} <em>kcal/día</em></strong>
          <div class="result-lines">
            <span
              ><small>Reposo</small><b>{{ r.restingEnergyKcal | number: '1.0-0' }} kcal</b></span
            ><span
              ><small>Actividad</small
              ><b>+ {{ r.activityEnergyKcal | number: '1.0-0' }} kcal</b></span
            ><span
              ><small>ETA</small><b>+ {{ r.etaKcal | number: '1.0-0' }} kcal</b></span
            ><span
              ><small>Ajuste</small
              ><b
                >{{ r.goalAdjustmentKcal >= 0 ? '+' : '' }}{{ r.goalAdjustmentKcal }} kcal</b
              ></span
            >
          </div>
          <div class="equation">
            <small>Ecuación aplicada</small>
            <p>{{ r.equation }}</p>
            <cite>{{ r.source }}</cite>
          </div>
          <div class="notice"><app-icon name="info" />{{ r.caution }}</div>
        } @else {
          <app-icon name="energy" />
          <h2>Aún sin cálculo</h2>
          <p>Completa los parámetros para ver el desglose de energía.</p>
        }
      </section>
    </div>
    <section class="surface energy-history">
      <header class="surface-header"><div><p class="eyebrow">Expediente</p><h2>Cálculos guardados</h2></div><span class="caption">{{ history().length }} registros</span></header>
      <div class="data-table-wrap"><table class="data-table">
        <thead><tr><th>Fecha</th><th>Fórmula</th><th>Datos</th><th>Actividad / ETA</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>
          @for (row of history(); track row.id) {
            <tr><td>{{ row.createdAtUtc | date: 'dd MMM y · HH:mm' : '' : 'es-EC' }}</td><td>{{ formulaLabel(row.formula) }}</td><td>{{ row.weightKg }} kg · {{ row.heightCm }} cm</td><td>{{ row.activityFactor }} · {{ row.etaPercent * 100 | number: '1.0-0' }}%</td><td><strong>{{ row.totalEnergyKcal | number: '1.0-0' }} kcal</strong></td><td><div class="toolbar"><button class="button button-secondary button-small" type="button" (click)="edit(row)">Editar</button>@if (auth.hasRole('ClinicAdmin')) {<button class="button button-danger button-small" type="button" (click)="archive(row)">Archivar</button>}</div></td></tr>
          } @empty { <tr><td colspan="6" class="empty-row">Todavía no hay cálculos guardados para el paciente activo.</td></tr> }
        </tbody>
      </table></div>
    </section>
    <section class="method surface">
      <div class="surface-body">
        <h2>Método transparente</h2>
        <p>
          <strong>Total = reposo × factor de actividad + ETA + ajuste.</strong> El ETA se calcula
          como porcentaje del subtotal reposo × actividad. La pantalla conserva fórmula, insumos y
          fuente para auditoría.
        </p>
        <div class="source-links">
          <span>Mifflin–St Jeor · 1990</span><span>Harris–Benedict revisada · 1984</span
          ><span>ETA configurable · 0–30%</span>
        </div>
      </div>
    </section>
  </div>`,
  styles: [
    `
      .notice {
        margin-bottom: 1rem;
      }
      .calculator-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(19rem, 0.65fr);
        gap: 1rem;
        align-items: stretch;
      }
      .surface > app-icon,
      .surface-header > app-icon {
        color: var(--warning);
      }
      .form-footer {
        padding: 1rem 1.15rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
      }
      .result {
        padding: 1.5rem;
        border-radius: 2.5rem 0.8rem 0.8rem 0.8rem;
        background: var(--primary-dark);
        color: white;
        position: relative;
        overflow: hidden;
      }
      .result::after {
        content: '';
        position: absolute;
        width: 13rem;
        height: 13rem;
        right: -6rem;
        top: -6rem;
        border: 1.7rem solid rgba(222, 236, 164, 0.13);
        border-radius: 45% 55% 40% 60%;
      }
      .result .eyebrow,
      .result small,
      .result cite {
        color: #dcebc6;
      }
      .total {
        display: block;
        margin: 0.8rem 0 1.2rem;
        font: 700 2.45rem/1 var(--font-display);
        position: relative;
        z-index: 1;
      }
      .total em {
        font: 600 0.8rem var(--font-sans);
      }
      .result-lines {
        display: grid;
        gap: 0.7rem;
      }
      .result-lines span {
        padding-bottom: 0.6rem;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        font-size: 0.82rem;
      }
      .result-lines small {
        display: block;
      }
      .equation {
        margin: 1rem 0;
        padding: 0.85rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 0.6rem;
        background: rgba(255, 255, 255, 0.06);
      }
      .equation p {
        margin: 0.35rem 0;
        font-size: 0.82rem;
      }
      .equation cite {
        font-size: 0.7rem;
      }
      .result .notice {
        position: relative;
        z-index: 1;
        margin: 0;
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
        color: white;
      }
      .result.empty {
        min-height: 26rem;
        display: grid;
        place-items: center;
        align-content: center;
        text-align: center;
        color: #dcebc6;
      }
      .result.empty > app-icon {
        width: 3rem;
        height: 3rem;
        margin-bottom: 1rem;
      }
      .result.empty h2 {
        color: white;
      }
      .method {
        margin-top: 1rem;
      }
      .energy-history { margin-top: 1rem; }
      .method p {
        max-width: 58rem;
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .source-links {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .source-links span {
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 0.4rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      @media (max-width: 1000px) {
        .calculator-layout {
          grid-template-columns: 1fr;
        }
        .result.empty {
          min-height: 15rem;
        }
      }
    `,
  ],
})
export class EnergyComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  private readonly patientContext = inject(PatientContextService);
  readonly loading = signal(false);
  readonly result = signal<EnergyResult | null>(null);
  readonly history = signal<EnergyRecord[]>([]);
  readonly editingId = signal<string | null>(null);
  model = {
    patientId: '',
    formula: 0,
    weightKg: null as number | null,
    heightCm: null as number | null,
    ageYears: null as number | null,
    sex: '',
    activityFactor: 1.55,
    etaPercent: 0.1,
    goalAdjustmentKcal: 0,
  };
  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (!patientId || patientId === this.model.patientId) return;
      this.model.patientId = patientId;
      this.model.weightKg = null;
      this.model.heightCm = null;
      this.result.set(null);
      this.editingId.set(null);
      this.loadHistory(patientId);
      forkJoin({
        patient: this.api.patient(patientId),
        anthropometry: this.api.latestAnthropometry(patientId),
      }).subscribe({
        next: ({ patient, anthropometry }) => {
          if (this.patientContext.selectedId() !== patientId) return;
          this.model.ageYears = this.age(patient.dateOfBirth);
          this.model.sex =
            patient.sexAtBirth === 0 ? 'female' : patient.sexAtBirth === 1 ? 'male' : '';
          this.model.weightKg = anthropometry?.weightKg ?? null;
          this.model.heightCm = anthropometry?.heightCm ?? null;
        },
        error: (error: Error) =>
          this.toast.show('error', 'No se cargaron los datos del paciente', error.message),
      });
    });
  }
  calculate(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.toast.show('error', 'Revisa los parámetros');
      return;
    }
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show(
        'error',
        'Selecciona un paciente',
        'El cálculo debe guardarse en un expediente.',
      );
      return;
    }
    this.model.patientId = patientId;
    this.loading.set(true);
    const editingId = this.editingId();
    const request = editingId
      ? this.api.updateEnergyCalculation(editingId, this.model)
      : this.api.calculateEnergy(this.model);
    request.subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
        this.editingId.set(null);
        this.loadHistory(patientId);
        this.toast.show('success', editingId ? 'Cálculo actualizado' : 'Cálculo registrado');
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.show('error', 'No se pudo calcular', e.message);
      },
    });
  }

  edit(row: EnergyRecord): void {
    this.editingId.set(row.id);
    Object.assign(this.model, {
      patientId: row.patientId,
      formula: row.formula,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
      ageYears: row.ageYears,
      sex: row.sex,
      activityFactor: row.activityFactor,
      etaPercent: row.etaPercent,
      goalAdjustmentKcal: row.goalAdjustmentKcal,
    });
    document.querySelector('#formula')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.toast.show('success', 'Cálculo cargado', 'Modifica los parámetros y vuelve a guardar.');
  }

  archive(row: EnergyRecord): void {
    if (!confirm('¿Archivar este cálculo energético? Se conservará en auditoría.')) return;
    this.api.archiveEnergyCalculation(row.id).subscribe({
      next: () => {
        if (this.editingId() === row.id) this.editingId.set(null);
        this.loadHistory(row.patientId);
        this.toast.show('success', 'Cálculo archivado');
      },
      error: (e) => this.toast.show('error', 'No se archivó el cálculo', e.message),
    });
  }

  formulaLabel(formula: number): string {
    return formula === 0 ? 'Mifflin–St Jeor' : 'Harris–Benedict revisada';
  }

  private loadHistory(patientId: string): void {
    this.api.energyCalculations(patientId).subscribe({
      next: (rows) => this.history.set(rows),
      error: (e) => {
        this.history.set([]);
        this.toast.show('error', 'No se cargaron los cálculos guardados', e.message);
      },
    });
  }

  private age(dateOfBirth: string): number {
    const birth = new Date(`${dateOfBirth}T00:00:00`);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      years--;
    }
    return years;
  }
}
