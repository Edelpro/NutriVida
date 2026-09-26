import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../../../../nucleo/api.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';

interface ReportMeasurement {
  measuredAtUtc: string;
  weightKg: number;
  heightCm: number;
  waistCm: number | null;
  bodyFatPercent: number | null;
}

interface ReportFollowUp {
  followUpDate: string;
  weightKg: number | null;
  averageSleepHours: number | null;
  exerciseMinutes: number | null;
  exerciseType: string;
  planAdherencePercent: number | null;
  bristolStoolType: number | null;
  symptoms: string;
}

interface ClinicalReport {
  patient: { id: string; fullName: string; goal: string };
  measurements: ReportMeasurement[];
  lastAssessment: {
    dailyIntake: string;
    intolerances: string;
    allergies: string;
    clinicalNotes: string;
  } | null;
  followUps: ReportFollowUp[];
  disclaimer: string;
}

@Component({
  selector: 'app-reports',
  imports: [IconComponent, PatientContextBarComponent, DatePipe, DecimalPipe],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Análisis clínico</p>
        <h1>Reportes</h1>
        <p class="lede">
          Resumen longitudinal para revisión profesional y entrega controlada al paciente.
        </p>
      </div>
      <div class="toolbar">
        <button class="button button-secondary" type="button" (click)="windowPrint()">
          Imprimir
        </button>
        <button class="button button-primary" type="button" [disabled]="downloading() || !reportData()" (click)="downloadPdf()">
          <app-icon name="download" /> {{ downloading() ? 'Generando…' : 'Descargar PDF clínico' }}
        </button>
      </div>
    </header>
    <app-patient-context-bar />
    @if (loading()) {
      <div class="status-message"><span class="spinner"></span></div>
    } @else if (hasClinicalData()) {
      <section class="report-hero">
        <div>
          <p class="eyebrow">Evolución antropométrica</p>
          <strong>{{ weightChangeLabel() }} <em>kg</em></strong>
          <p>{{ reportData()?.patient?.fullName }} · cambio desde el primer registro</p>
        </div>
        <div class="chart" role="img" [attr.aria-label]="chartAriaLabel()">
          @for (bar of chartBars(); track bar.date) {
            <span [style.height.%]="bar.height"
              ><b>{{ bar.value }}</b></span
            >
          }
        </div>
        <dl>
          <div>
            <dt>IMC actual</dt>
            <dd>{{ bmi() === null ? '—' : (bmi() | number: '1.1-1') }}</dd>
          </div>
          <div>
            <dt>Cintura</dt>
            <dd>
              {{
                latestMeasurement()?.waistCm === null
                  ? '—'
                  : (latestMeasurement()?.waistCm | number: '1.1-1') + ' cm'
              }}
            </dd>
          </div>
          <div>
            <dt>Adherencia</dt>
            <dd>{{ latestFollowUp()?.planAdherencePercent === null || latestFollowUp()?.planAdherencePercent === undefined ? '—' : latestFollowUp()?.planAdherencePercent + '%' }}</dd>
          </div>
        </dl>
      </section>
      <div class="report-grid">
        <section class="surface">
          <header class="surface-header"><h2>Indicadores del último seguimiento</h2></header>
          <div class="surface-body indicators">
            <div>
              <span><app-icon name="clock" /> Sueño</span
              ><strong>{{ latestFollowUp()?.averageSleepHours ?? '—' }} h</strong
              ><small>promedio diario</small>
              <div class="progress"><span style="width:72%"></span></div>
            </div>
            <div>
              <span><app-icon name="activity" /> Ejercicio</span
              ><strong>{{ latestFollowUp()?.exerciseMinutes ?? '—' }} min</strong
              ><small>{{ latestFollowUp()?.exerciseType || 'sin registro' }}</small>
              <div class="progress"><span [style.width.%]="exercisePercent()"></span></div>
            </div>
            <div>
              <span><app-icon name="clipboard" /> Tránsito</span
              ><strong>Bristol {{ latestFollowUp()?.bristolStoolType ?? '—' }}</strong
              ><small>{{ latestFollowUp()?.symptoms || 'sin observaciones' }}</small>
              <div class="progress"><span [style.width.%]="bristolPercent()"></span></div>
            </div>
          </div>
        </section>
        <section class="surface">
          <header class="surface-header"><h2>Hallazgos y acuerdos</h2></header>
          <div class="surface-body notes">
            <p>
              <span class="badge">Ingesta</span>
              {{ reportData()?.lastAssessment?.dailyIntake || 'Sin evaluación registrada.' }}
            </p>
            <p>
              <span class="badge">Tolerancia</span>
              {{ reportData()?.lastAssessment?.intolerances || 'Sin intolerancias registradas.' }}
            </p>
            <p>
              <span class="badge">Notas</span>
              {{ reportData()?.lastAssessment?.clinicalNotes || 'Sin notas clínicas.' }}
            </p>
            <div class="notice"><app-icon name="info" />{{ reportData()?.disclaimer }}</div>
          </div>
        </section>
      </div>
      <section class="surface timeline">
        <header class="surface-header">
          <h2>Línea de tiempo clínica</h2>
          <span class="caption">Fuente: historia y seguimientos</span>
        </header>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Resultado</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              @for (event of timeline(); track event.key) {
                <tr>
                  <td>{{ event.date | date: 'dd MMM y' : '' : 'es-EC' }}</td>
                  <td>{{ event.type }}</td>
                  <td>{{ event.result }}</td>
                  <td>Equipo clínico</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <section class="surface empty-state">
        <div>
          <app-icon name="report" />
          <h2>Aún no hay evolución para reportar</h2>
          <p>Registra una evaluación, mediciones o un seguimiento para el paciente activo.</p>
        </div>
      </section>
    }
    <footer class="report-footer">
      <span>Generado para revisión profesional · America/Guayaquil</span
      ><span>NutriVida · Historia clínica nutricional</span>
    </footer>
  </div>`,
  styles: [
    `
      .patient-strip {
        margin-bottom: 1rem;
      }
      .report-hero {
        min-height: 15rem;
        padding: 1.5rem;
        display: grid;
        grid-template-columns: 0.7fr 1.4fr 0.7fr;
        gap: 1.5rem;
        align-items: center;
        color: white;
        background: var(--primary-dark);
        border-radius: 2.5rem 0.8rem 0.8rem;
        overflow: hidden;
      }
      .report-hero .eyebrow,
      .report-hero p {
        color: #dcebc6;
      }
      .report-hero > div > strong {
        font: 700 2.7rem var(--font-display);
      }
      .report-hero em {
        font: 600 0.8rem var(--font-sans);
      }
      .chart {
        height: 10rem;
        display: flex;
        align-items: end;
        gap: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.25);
      }
      .chart span {
        flex: 1;
        min-height: 20%;
        position: relative;
        border-radius: 0.4rem 0.4rem 0 0;
        background: linear-gradient(var(--avocado-soft), var(--fresh));
      }
      .chart b {
        position: absolute;
        top: -1.2rem;
        width: 100%;
        text-align: center;
        font-size: 0.68rem;
      }
      .report-hero dl {
        margin: 0;
        display: grid;
        gap: 0.7rem;
      }
      .report-hero dl div {
        padding: 0.6rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
      }
      .report-hero dt {
        color: #dcebc6;
        font-size: 0.7rem;
      }
      .report-hero dd {
        margin: 0.25rem 0 0;
        font-weight: 800;
      }
      .report-grid {
        margin: 1rem 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .indicators {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      .indicators > div {
        padding-right: 1rem;
        border-right: 1px solid var(--border);
      }
      .indicators > div:last-child {
        border: 0;
      }
      .indicators span,
      .indicators strong,
      .indicators small {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .indicators span {
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .indicators strong {
        margin: 0.6rem 0;
        font: 700 1.15rem var(--font-display);
      }
      .indicators small {
        min-height: 2rem;
        color: var(--text-muted);
        font-size: 0.66rem;
      }
      .indicators .progress {
        margin-top: 0.5rem;
      }
      .notes p {
        padding-bottom: 0.65rem;
        border-bottom: 1px solid #eeeae2;
        font-size: 0.78rem;
      }
      .notes .badge {
        margin-right: 0.45rem;
      }
      .timeline {
        margin-bottom: 1rem;
      }
      .report-footer {
        padding: 0.75rem;
        display: flex;
        justify-content: space-between;
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      @media print {
        .page-header .toolbar {
          display: none;
        }
        .page {
          padding: 0.5rem;
        }
        .report-hero {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
      @media (max-width: 980px) {
        .report-hero {
          grid-template-columns: 1fr 1fr;
        }
        .chart {
          grid-row: 2;
          grid-column: 1/-1;
        }
        .report-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 650px) {
        .report-hero {
          grid-template-columns: 1fr;
        }
        .chart {
          grid-column: 1;
        }
        .indicators {
          grid-template-columns: 1fr;
        }
        .indicators > div {
          padding: 0 0 1rem;
          border: 0;
          border-bottom: 1px solid var(--border);
        }
      }
    `,
  ],
})
export class ReportsComponent {
  private readonly api = inject(ApiService);
  private readonly patientContext = inject(PatientContextService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly reportData = signal<ClinicalReport | null>(null);
  readonly latestMeasurement = computed(() => this.reportData()?.measurements.at(-1) ?? null);
  readonly latestFollowUp = computed(() => this.reportData()?.followUps[0] ?? null);
  readonly chartBars = computed(() => {
    const rows = (this.reportData()?.measurements ?? []).slice(-5);
    const weights = rows.map((row) => Number(row.weightKg));
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;
    return rows.map((row) => ({
      date: row.measuredAtUtc,
      value: Number(row.weightKg).toFixed(1),
      height: range ? 35 + ((Number(row.weightKg) - min) / range) * 55 : 65,
    }));
  });
  readonly timeline = computed(() => {
    const report = this.reportData();
    if (!report) return [];
    return [
      ...report.measurements.map((row) => ({
        key: `measurement-${row.measuredAtUtc}`,
        date: row.measuredAtUtc,
        type: 'Antropometría',
        result: `${Number(row.weightKg).toFixed(1)} kg${row.waistCm ? ` · cintura ${Number(row.waistCm).toFixed(1)} cm` : ''}`,
      })),
      ...report.followUps.map((row) => ({
        key: `follow-up-${row.followUpDate}`,
        date: `${row.followUpDate}T00:00:00`,
        type: 'Seguimiento nutricional',
        result: `${row.weightKg === null ? 'Sin peso' : `${Number(row.weightKg).toFixed(1)} kg`} · ${row.planAdherencePercent === null ? 'Sin adherencia' : `${row.planAdherencePercent}% adherencia`}`,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  });
  private loadedPatientId = '';

  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (!patientId || patientId === this.loadedPatientId) return;
      this.loadedPatientId = patientId;
      this.loading.set(true);
      this.api.report(patientId).subscribe({
        next: (report) => {
          if (this.patientContext.selectedId() !== patientId) return;
          this.reportData.set(report as ClinicalReport);
          this.loading.set(false);
        },
        error: () => {
          if (this.patientContext.selectedId() !== patientId) return;
          this.reportData.set(null);
          this.loading.set(false);
        },
      });
    });
  }
  hasClinicalData(): boolean {
    const report = this.reportData();
    return !!(report?.measurements.length || report?.followUps.length || report?.lastAssessment);
  }
  weightChangeLabel(): string {
    const rows = this.reportData()?.measurements ?? [];
    if (rows.length < 2) return '0.0';
    const change = Number(rows.at(-1)!.weightKg) - Number(rows[0].weightKg);
    return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}`;
  }
  bmi(): number | null {
    const row = this.latestMeasurement();
    if (!row?.heightCm) return null;
    return Number(row.weightKg) / Math.pow(Number(row.heightCm) / 100, 2);
  }
  exercisePercent(): number {
    return Math.min(100, ((this.latestFollowUp()?.exerciseMinutes ?? 0) / 150) * 100);
  }
  bristolPercent(): number {
    return ((this.latestFollowUp()?.bristolStoolType ?? 0) / 7) * 100;
  }
  chartAriaLabel(): string {
    const values = this.chartBars()
      .map((bar) => `${bar.value} kilogramos`)
      .join(', ');
    return values ? `Evolución de peso: ${values}` : 'Sin mediciones de peso';
  }
  windowPrint(): void {
    window.print();
  }
  downloadPdf(): void {
    const patientId = this.patientContext.selectedId();
    const patient = this.reportData()?.patient;
    if (!patientId || !patient) return;
    this.downloading.set(true);
    this.api.reportPdf(patientId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `reporte-nutricional-${patient.fullName.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
        this.toast.show('success', 'PDF clínico generado', 'La descarga quedó registrada en auditoría.');
      },
      error: (error: Error) => {
        this.downloading.set(false);
        this.toast.show('error', 'No se pudo generar el PDF', error.message);
      },
    });
  }
}
