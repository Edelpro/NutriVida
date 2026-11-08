import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { ApiService, AssessmentRecord, DiagnosisRecord } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import {
  DIAGNOSIS_CODE_GROUPS,
  OTHER_DIAGNOSIS_CODE,
  findDiagnosisCode,
} from '../../../evaluaciones/modelos/diagnosis-codes';

@Component({
  selector: 'app-diagnoses',
  imports: [FormsModule, DatePipe, IconComponent, PatientContextBarComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Proceso de atención nutricional</p>
        <h1>Diagnóstico PES</h1>
        <p class="lede">Problema, etiología y signos o síntomas de cada paciente, con su aprobación.</p>
      </div>
      <button class="button button-primary" type="button" (click)="startCreate()">
        <app-icon name="plus" /> Nuevo diagnóstico
      </button>
    </header>

    <app-patient-context-bar />

    @if (editorOpen()) {
      <form #diagnosisForm="ngForm" class="surface editor" novalidate (ngSubmit)="save(diagnosisForm)">
        <header class="surface-header">
          <h2>{{ editingId() ? 'Editar diagnóstico' : 'Nuevo diagnóstico' }}</h2>
        </header>
        <div class="surface-body form-grid">
          <div class="field col-6">
            <label class="required" for="diagnosisCode">Código o dominio</label>
            <select
              id="diagnosisCode"
              name="diagnosisCode"
              [ngModel]="codeSelection()"
              (ngModelChange)="selectCode($event)"
            >
              <option value="">Selecciona un código</option>
              @for (group of groups; track group.domain) {
                <optgroup [label]="group.domain">
                  @for (item of group.codes; track item.code) {
                    <option [value]="item.code">{{ item.code }} · {{ item.label }}</option>
                  }
                </optgroup>
              }
              <option [value]="otherCode">Otro código…</option>
            </select>
            @if (codeSelection() === otherCode) {
              <label class="required" for="diagnosisOtherCode">Escribe el código</label>
              <input id="diagnosisOtherCode" name="diagnosisOtherCode" maxlength="80" required [(ngModel)]="model.problemCode" />
            }
          </div>
          <div class="field col-6">
            <label for="diagnosisAssessment">Evaluación vinculada</label>
            <select id="diagnosisAssessment" name="diagnosisAssessment" [(ngModel)]="model.assessmentId">
              <option [ngValue]="null">Sin vincular</option>
              @for (assessment of assessments(); track assessment.id) {
                <option [ngValue]="assessment.id">
                  {{ assessment.recordedAtUtc | date: 'dd MMM y · HH:mm' : '' : 'es-EC' }}
                </option>
              }
            </select>
          </div>
          <div class="field col-12">
            <label class="required" for="diagnosisProblem">Problema</label>
            <input id="diagnosisProblem" name="diagnosisProblem" required maxlength="1000" [(ngModel)]="model.problemStatement" />
          </div>
          <div class="field col-6">
            <label class="required" for="diagnosisEtiology">Etiología: relacionado con</label>
            <textarea id="diagnosisEtiology" name="diagnosisEtiology" rows="3" required maxlength="2000" [(ngModel)]="model.etiology"></textarea>
          </div>
          <div class="field col-6">
            <label class="required" for="diagnosisSigns">Signos y síntomas: evidenciado por</label>
            <textarea id="diagnosisSigns" name="diagnosisSigns" rows="3" required maxlength="2000" [(ngModel)]="model.signsAndSymptoms"></textarea>
          </div>
          @if (model.problemStatement && model.etiology && model.signsAndSymptoms) {
            <p class="pes-preview col-12">{{ sentence(model) }}</p>
          }
          <div class="notice col-12">
            <app-icon name="info" /><span>Se guarda como borrador. Al editar uno aprobado, vuelve a borrador.</span>
          </div>
        </div>
        <footer class="form-footer">
          <button class="button button-secondary" type="button" (click)="cancel()">Cancelar</button>
          <button class="button button-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar diagnóstico' }}
          </button>
        </footer>
      </form>
    }

    <section class="list" aria-label="Diagnósticos del paciente">
      @if (loading()) {
        <div class="status-message"><span class="spinner" aria-label="Cargando diagnósticos"></span></div>
      } @else if (loadError()) {
        <div class="notice notice-danger" role="alert">
          <app-icon name="info" /><span>{{ loadError() }}</span>
          <button class="button button-secondary button-small" type="button" (click)="reload()">Reintentar</button>
        </div>
      } @else {
        @for (diagnosis of diagnoses(); track diagnosis.id) {
          <article class="surface diagnosis">
            <div class="diagnosis-top">
              <span class="code">{{ diagnosis.problemCode }}</span>
              @if (isApproved(diagnosis)) {
                <span class="badge">Aprobado por {{ diagnosis.approvedByName || diagnosis.professionalName }}</span>
              } @else {
                <span class="badge badge-warning">Borrador</span>
              }
              <small>{{ diagnosis.createdAtUtc | date: 'dd MMM y' : '' : 'es-EC' }}</small>
            </div>
            <p class="sentence">{{ sentence(diagnosis) }}</p>
            <div class="toolbar">
              @if (!isApproved(diagnosis)) {
                <button class="button button-primary button-small" type="button" [disabled]="busyId() === diagnosis.id" (click)="approve(diagnosis)">Aprobar</button>
              }
              <button class="button button-secondary button-small" type="button" (click)="edit(diagnosis)">Editar</button>
              @if (auth.hasRole('ClinicAdmin')) {
                <button class="button button-danger button-small" type="button" [disabled]="busyId() === diagnosis.id" (click)="archive(diagnosis)">Archivar</button>
              }
            </div>
          </article>
        } @empty {
          <div class="surface empty-state">
            <div>
              <app-icon name="clipboard" />
              <h2>Este paciente aún no tiene diagnóstico</h2>
              <p>Registra el problema nutricional después de la evaluación.</p>
              <button class="button button-primary" type="button" (click)="startCreate()">Nuevo diagnóstico</button>
            </div>
          </div>
        }
      }
    </section>
  </div>`,
  styles: [
    `
      .editor {
        margin-bottom: 1rem;
      }
      .form-footer {
        padding: 0.9rem 1.15rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
        border-top: 1px solid var(--border-soft);
      }
      .pes-preview {
        margin: 0;
        padding: 0.75rem 0.9rem;
        background: var(--surface-muted);
        border-radius: var(--radius-md);
      }
      .list {
        display: grid;
        gap: 0.8rem;
      }
      .diagnosis {
        padding: 1rem 1.15rem;
        display: grid;
        gap: 0.6rem;
      }
      .diagnosis-top {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.6rem;
      }
      .diagnosis-top small {
        margin-left: auto;
        color: var(--text-muted);
      }
      .code {
        font-weight: 800;
        color: var(--primary-dark);
      }
      .sentence {
        margin: 0;
        line-height: 1.5;
      }
    `,
  ],
})
export class DiagnosesComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly context = inject(PatientContextService);
  readonly auth = inject(AuthService);
  readonly groups = DIAGNOSIS_CODE_GROUPS;
  readonly otherCode = OTHER_DIAGNOSIS_CODE;
  readonly diagnoses = signal<DiagnosisRecord[]>([]);
  readonly assessments = signal<AssessmentRecord[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  private readonly writingOtherCode = signal(false);
  private loadedPatientId = '';
  model = this.emptyModel();

  constructor() {
    effect(() => {
      const patientId = this.context.selectedId();
      if (!patientId || patientId === this.loadedPatientId) return;
      this.cancel();
      this.load(patientId);
    });
  }

  reload(): void {
    const patientId = this.context.selectedId();
    if (patientId) this.load(patientId);
  }

  codeSelection(): string {
    if (this.writingOtherCode()) return OTHER_DIAGNOSIS_CODE;
    if (!this.model.problemCode) return '';
    return findDiagnosisCode(this.model.problemCode) ? this.model.problemCode : OTHER_DIAGNOSIS_CODE;
  }

  selectCode(value: string): void {
    if (value === OTHER_DIAGNOSIS_CODE) {
      this.writingOtherCode.set(true);
      this.model.problemCode = '';
      return;
    }
    this.writingOtherCode.set(false);
    this.model.problemCode = value;
    const match = findDiagnosisCode(value);
    if (match && !this.model.problemStatement.trim()) this.model.problemStatement = match.label;
  }

  sentence(item: { problemStatement: string; etiology: string; signsAndSymptoms: string }): string {
    const clean = (text: string) => text.trim().replace(/[.\s]+$/, '');
    return `${clean(item.problemStatement)}, relacionado con ${clean(item.etiology)}, evidenciado por ${clean(item.signsAndSymptoms)}.`;
  }

  isApproved(diagnosis: DiagnosisRecord): boolean {
    return diagnosis.status === 1 || diagnosis.status === 'Approved';
  }

  startCreate(): void {
    if (!this.context.selectedId()) {
      this.toast.show('error', 'Selecciona un paciente', 'El diagnóstico debe pertenecer a un expediente.');
      return;
    }
    this.editingId.set(null);
    this.writingOtherCode.set(false);
    this.model = { ...this.emptyModel(), assessmentId: this.assessments()[0]?.id ?? null };
    this.editorOpen.set(true);
  }

  edit(diagnosis: DiagnosisRecord): void {
    this.editingId.set(diagnosis.id);
    this.writingOtherCode.set(false);
    this.model = {
      assessmentId: diagnosis.assessmentId,
      problemCode: diagnosis.problemCode,
      problemStatement: diagnosis.problemStatement,
      etiology: diagnosis.etiology,
      signsAndSymptoms: diagnosis.signsAndSymptoms,
    };
    this.editorOpen.set(true);
  }

  cancel(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.writingOtherCode.set(false);
  }

  save(form: NgForm): void {
    const patientId = this.context.selectedId();
    if (form.invalid || !this.model.problemCode.trim() || !patientId) {
      form.control.markAllAsTouched();
      this.toast.show('error', 'Faltan datos', 'Completa código, problema, etiología y signos o síntomas.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    const id = this.editingId();
    const request = id
      ? this.api.updateDiagnosis(patientId, id, this.model)
      : this.api.saveDiagnosis(patientId, this.model);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load(patientId);
        this.toast.show('success', id ? 'Diagnóstico actualizado' : 'Diagnóstico guardado', 'Queda en borrador hasta que lo apruebes.');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toast.show('error', 'No se guardó el diagnóstico', error.message);
      },
    });
  }

  approve(diagnosis: DiagnosisRecord): void {
    this.runAction(diagnosis, this.api.approveDiagnosis.bind(this.api), 'Diagnóstico aprobado', 'No se aprobó el diagnóstico');
  }

  archive(diagnosis: DiagnosisRecord): void {
    if (!confirm('¿Archivar este diagnóstico? Se conservará en la auditoría.')) return;
    this.runAction(diagnosis, this.api.archiveDiagnosis.bind(this.api), 'Diagnóstico archivado', 'No se archivó el diagnóstico');
  }

  private runAction(
    diagnosis: DiagnosisRecord,
    action: (patientId: string, id: string) => import('rxjs').Observable<unknown>,
    success: string,
    failure: string,
  ): void {
    const patientId = this.context.selectedId();
    if (!patientId || this.busyId()) return;
    this.busyId.set(diagnosis.id);
    action(patientId, diagnosis.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load(patientId);
        this.toast.show('success', success);
      },
      error: (error: Error) => {
        this.busyId.set(null);
        this.toast.show('error', failure, error.message);
      },
    });
  }

  private load(patientId: string): void {
    this.loadedPatientId = patientId;
    this.loading.set(true);
    this.loadError.set('');
    this.api.assessments(patientId).subscribe({
      next: (assessments) => {
        if (this.context.selectedId() === patientId) this.assessments.set(assessments);
      },
      error: () => this.assessments.set([]),
    });
    this.api.diagnoses(patientId).subscribe({
      next: (diagnoses) => {
        if (this.context.selectedId() !== patientId) return;
        this.diagnoses.set(diagnoses);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.diagnoses.set([]);
        this.loadError.set(error.message);
        this.loading.set(false);
      },
    });
  }

  private emptyModel() {
    return {
      assessmentId: null as string | null,
      problemCode: '',
      problemStatement: '',
      etiology: '',
      signsAndSymptoms: '',
    };
  }
}
