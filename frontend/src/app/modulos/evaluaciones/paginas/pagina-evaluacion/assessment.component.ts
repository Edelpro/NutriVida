import { DatePipe, SlicePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService, AssessmentRecord, DiagnosisRecord } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { QuickTemplate } from '../../../plantillas/modelos/quick-template.models';
import { QuickTemplatesComponent } from '../../../plantillas/paginas/tarjetas-plantillas/quick-templates.component';
import { isLegacySleepQuality, SLEEP_QUALITY_OPTIONS } from '../../modelos/calidad-sueno';

@Component({
  selector: 'app-assessment',
  imports: [
    FormsModule,
    DatePipe,
    SlicePipe,
    IconComponent,
    PatientContextBarComponent,
    QuickTemplatesComponent,
  ],
  template: ` <div class="page assessment-page">
    <div class="breadcrumbs">
      <span>Pacientes</span><app-icon name="arrow" /><span
        >{{ patientContext.selected()?.firstName }} {{ patientContext.selected()?.lastName }}</span
      ><app-icon name="arrow" /><strong>{{
        editorOpen() ? (editingId() ? 'Editar evaluación' : 'Nueva evaluación') : 'Expediente'
      }}</strong>
    </div>
    <header class="page-header">
      <div>
        <p class="eyebrow">Proceso de atención nutricional</p>
        <h1>Evaluación nutricional</h1>
        <p class="lede">
          Historia integral para sustentar el diagnóstico y el plan de intervención.
        </p>
      </div>
      <span
        class="badge"
        [class.badge-warning]="editorOpen()"
        [class.badge-success]="!editorOpen()"
      >
        {{ editorOpen() ? 'Edición activa' : 'Datos guardados' }}
      </span>
    </header>
    <app-patient-context-bar />

    @if (!editorOpen()) {
      @if (assessmentsLoading()) {
        <section class="surface record-state" aria-live="polite">
          <p>Cargando el expediente del paciente…</p>
        </section>
      } @else if (assessmentsError()) {
        <section class="surface record-state record-state-error" role="alert">
          <div>
            <p class="eyebrow">No se pudo abrir el expediente</p>
            <h2>Revisa la conexión con la API</h2>
            <p>{{ assessmentsError() }}</p>
          </div>
          <button type="button" class="button button-secondary" (click)="reloadPatientData()">
            Reintentar
          </button>
        </section>
      } @else if (activeAssessment(); as record) {
        <section class="surface assessment-record" aria-labelledby="saved-assessment-title">
          <header class="record-toolbar">
            <div>
              <p class="eyebrow">Última evaluación guardada</p>
              <h2 id="saved-assessment-title">Historia nutricional del paciente</h2>
              <p class="caption">
                Registrada el {{ record.recordedAtUtc | date: 'dd MMMM y · HH:mm' : '' : 'es-EC' }}
              </p>
            </div>
            <div class="toolbar">
              <button type="button" class="button button-secondary" (click)="startNewAssessment()">
                Nueva evaluación
              </button>
              <button type="button" class="button button-primary" (click)="editAssessment(record)">
                Editar evaluación
              </button>
            </div>
          </header>
          <div class="record-grid">
            <section class="record-group record-wide">
              <p class="eyebrow">Historia alimentaria</p>
              <dl>
                <div>
                  <dt>Ingesta habitual</dt>
                  <dd>{{ record.dailyIntake || 'Sin información' }}</dd>
                </div>
                <div>
                  <dt>Horarios y contexto</dt>
                  <dd>{{ record.eatingSchedule || 'Sin información' }}</dd>
                </div>
              </dl>
            </section>
            <section class="record-group">
              <p class="eyebrow">Seguridad alimentaria</p>
              <dl>
                <div>
                  <dt>Alergias</dt>
                  <dd>{{ record.allergies || 'No registradas' }}</dd>
                </div>
                <div>
                  <dt>Intolerancias</dt>
                  <dd>{{ record.intolerances || 'No registradas' }}</dd>
                </div>
              </dl>
            </section>
            <section class="record-group">
              <p class="eyebrow">Sueño y ejercicio</p>
              <dl class="record-facts">
                <div>
                  <dt>Horas de sueño</dt>
                  <dd>{{ record.sleepHours }} h</dd>
                </div>
                <div>
                  <dt>Calidad</dt>
                  <dd>{{ record.sleepQuality || 'No registrada' }}</dd>
                </div>
                <div>
                  <dt>Ejercicio</dt>
                  <dd>{{ record.exerciseType || 'No registrado' }}</dd>
                </div>
                <div>
                  <dt>Minutos</dt>
                  <dd>{{ record.exerciseMinutesPerWeek }} por semana</dd>
                </div>
                <div class="record-full">
                  <dt>Horario</dt>
                  <dd>{{ record.exerciseSchedule || 'No registrado' }}</dd>
                </div>
              </dl>
            </section>
            <section class="record-group">
              <p class="eyebrow">Salud digestiva</p>
              <dl class="record-facts">
                <div>
                  <dt>Estreñimiento</dt>
                  <dd>{{ record.hasConstipation ? 'Sí' : 'No' }}</dd>
                </div>
                <div>
                  <dt>Bristol</dt>
                  <dd>
                    {{
                      record.bristolStoolType ? 'Tipo ' + record.bristolStoolType : 'No registrado'
                    }}
                  </dd>
                </div>
                <div class="record-full">
                  <dt>Frecuencia</dt>
                  <dd>{{ record.bowelFrequency || 'No registrada' }}</dd>
                </div>
              </dl>
            </section>
            <section class="record-group">
              <p class="eyebrow">Notas clínicas</p>
              <p class="record-copy">
                {{ record.clinicalNotes || 'No se añadieron notas clínicas.' }}
              </p>
            </section>
            @if (activeDiagnosis(); as diagnosis) {
              <section class="record-group record-wide diagnosis-summary">
                <p class="eyebrow">Diagnóstico PES vinculado</p>
                <dl class="record-facts">
                  <div>
                    <dt>Código o dominio</dt>
                    <dd>{{ diagnosis.problemCode }}</dd>
                  </div>
                  <div>
                    <dt>Problema</dt>
                    <dd>{{ diagnosis.problemStatement }}</dd>
                  </div>
                  <div>
                    <dt>Etiología</dt>
                    <dd>{{ diagnosis.etiology }}</dd>
                  </div>
                  <div>
                    <dt>Signos y síntomas</dt>
                    <dd>{{ diagnosis.signsAndSymptoms }}</dd>
                  </div>
                </dl>
              </section>
            }
          </div>
        </section>
      } @else {
        <section class="surface record-state">
          <div>
            <p class="eyebrow">Expediente sin evaluación</p>
            <h2>Registra la primera historia nutricional</h2>
            <p>
              El paciente ya está seleccionado. Completa la evaluación para continuar con
              diagnóstico y plan.
            </p>
          </div>
          <button type="button" class="button button-primary" (click)="startNewAssessment()">
            Registrar primera evaluación
          </button>
        </section>
      }
    }

    @if (editorOpen()) {
      <app-quick-templates scope="assessment" (templateSelected)="aplicarPlantilla($event)" />

      <ol class="steps" aria-label="Secciones de la evaluación">
        @for (step of steps; track step.label; let index = $index) {
          <li [class.current]="index === 1" [class.done]="index === 0">
            <span>{{ index === 0 ? '✓' : index + 1 }}</span
            ><small>{{ step.label }}</small>
          </li>
        }
      </ol>

      <form #assessmentForm="ngForm" novalidate (ngSubmit)="save(assessmentForm)">
        <div class="assessment-layout">
          <div class="sections">
            <section class="surface">
              <header class="surface-header">
                <div>
                  <p class="eyebrow">02 · Historia alimentaria</p>
                  <h2>Ingesta diaria y horarios</h2>
                </div>
                <app-icon name="food" />
              </header>
              <div class="surface-body form-grid">
                <div class="field col-12">
                  <label class="required" for="intake">Recordatorio de ingesta habitual</label
                  ><textarea
                    id="intake"
                    name="dailyIntake"
                    [(ngModel)]="model.dailyIntake"
                    required
                    maxlength="4000"
                    placeholder="Describe alimentos, bebidas, cantidades y preparaciones desde que despierta hasta que duerme."
                  ></textarea
                  ><small
                    >Incluye agua, suplementos, fines de semana y comidas fuera de casa.</small
                  >
                </div>
                <div class="field col-12">
                  <label class="required" for="schedule">Horarios y contexto</label
                  ><textarea
                    id="schedule"
                    name="eatingSchedule"
                    [(ngModel)]="model.eatingSchedule"
                    required
                    maxlength="1000"
                    placeholder="07:00 desayuno en casa; 10:30 colación en oficina…"
                  ></textarea
                  ><small
                    >Registra ayunos, apetito, compañía, velocidad y lugar si son relevantes.</small
                  >
                </div>
              </div>
            </section>
            <section class="surface">
              <header class="surface-header">
                <div>
                  <p class="eyebrow">Seguridad alimentaria</p>
                  <h2>Alergias e intolerancias</h2>
                </div>
                <app-icon name="info" />
              </header>
              <div class="surface-body form-grid">
                <div class="field col-6">
                  <label for="allergies">Alergias confirmadas</label
                  ><textarea
                    id="allergies"
                    name="allergies"
                    [(ngModel)]="model.allergies"
                    maxlength="1000"
                    placeholder="Alimento, reacción, severidad y confirmación"
                  ></textarea
                  ><small>Si no existen, escribe “Niega alergias conocidas”.</small>
                </div>
                <div class="field col-6">
                  <label for="intolerances">Intolerancias o molestias</label
                  ><textarea
                    id="intolerances"
                    name="intolerances"
                    [(ngModel)]="model.intolerances"
                    maxlength="1000"
                    placeholder="Alimento, cantidad, síntomas y tiempo de aparición"
                  ></textarea
                  ><small>Diferencia sospecha, preferencia y diagnóstico.</small>
                </div>
              </div>
            </section>
            <section class="surface">
              <header class="surface-header">
                <div>
                  <p class="eyebrow">Estilo de vida</p>
                  <h2>Sueño y ejercicio</h2>
                </div>
                <app-icon name="activity" />
              </header>
              <div class="surface-body form-grid">
                <div class="field col-3">
                  <label class="required" for="sleep">Horas de sueño</label
                  ><input
                    id="sleep"
                    name="sleepHours"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    [(ngModel)]="model.sleepHours"
                    required
                  /><small>Promedio diario.</small>
                </div>
                <div class="field col-3">
                  <label for="sleepQuality">Calidad</label
                  ><select id="sleepQuality" name="sleepQuality" [(ngModel)]="model.sleepQuality">
                    <option value="">Selecciona la calidad</option>
                    @for (quality of sleepQualityOptions; track quality) {
                      <option [value]="quality">{{ quality }}</option>
                    }
                    @if (isHistoricalSleepQuality(model.sleepQuality)) {
                      <option [value]="model.sleepQuality">
                        {{ model.sleepQuality }} (valor anterior)
                      </option>
                    }</select
                  ><small>Percepción del paciente.</small>
                </div>
                <div class="field col-3">
                  <label for="exerciseMinutes">Minutos por semana</label
                  ><input
                    id="exerciseMinutes"
                    name="exerciseMinutes"
                    type="number"
                    min="0"
                    max="3000"
                    [(ngModel)]="model.exerciseMinutesPerWeek"
                  /><small>Total aproximado.</small>
                </div>
                <div class="field col-3">
                  <label for="exerciseType">Tipo de ejercicio</label
                  ><input
                    id="exerciseType"
                    name="exerciseType"
                    [(ngModel)]="model.exerciseType"
                    placeholder="Caminata, fuerza…"
                  /><small>Incluye intensidad.</small>
                </div>
                <div class="field col-12">
                  <label for="exerciseSchedule">Horario y frecuencia</label
                  ><input
                    id="exerciseSchedule"
                    name="exerciseSchedule"
                    [(ngModel)]="model.exerciseSchedule"
                    placeholder="Lunes, miércoles y viernes · 18:30"
                  /><small>Registra días, hora, duración e intensidad si se conocen.</small>
                </div>
              </div>
            </section>
            <section class="surface">
              <header class="surface-header">
                <div>
                  <p class="eyebrow">Salud digestiva</p>
                  <h2>Tránsito intestinal y escala de Bristol</h2>
                </div>
                <app-icon name="clipboard" />
              </header>
              <div class="surface-body form-grid">
                <div class="col-4">
                  <span class="field-label">Estreñimiento referido</span>
                  <div class="binary">
                    <label
                      ><input
                        type="radio"
                        name="constipation"
                        [value]="true"
                        [(ngModel)]="model.hasConstipation"
                      />
                      Sí</label
                    ><label
                      ><input
                        type="radio"
                        name="constipation"
                        [value]="false"
                        [(ngModel)]="model.hasConstipation"
                      />
                      No</label
                    >
                  </div>
                </div>
                <div class="field col-8">
                  <label for="bowel">Frecuencia de evacuación</label
                  ><input
                    id="bowel"
                    name="bowelFrequency"
                    [(ngModel)]="model.bowelFrequency"
                    placeholder="Ej. 1 vez al día, con esfuerzo ocasional"
                  /><small>Incluye dolor, urgencia o uso de laxantes en notas.</small>
                </div>
                <fieldset class="bristol col-12">
                  <legend>Tipo de heces más frecuente (Bristol 1–7)</legend>
                  <div class="bristol-grid">
                    @for (type of bristolTypes; track type.value) {
                      <label [class.selected]="model.bristolStoolType === type.value"
                        ><input
                          type="radio"
                          name="bristol"
                          [value]="type.value"
                          [(ngModel)]="model.bristolStoolType"
                        /><strong>{{ type.value }}</strong
                        ><span>{{ type.label }}</span></label
                      >
                    }
                  </div>
                  <small
                    >La escala describe forma y consistencia; no establece diagnóstico por sí
                    sola.</small
                  >
                </fieldset>
                <div class="field col-12">
                  <label for="notes">Notas clínicas</label
                  ><textarea
                    id="notes"
                    name="clinicalNotes"
                    [(ngModel)]="model.clinicalNotes"
                    maxlength="4000"
                    placeholder="Síntomas, antecedentes, medicación, suplementos, señales de alarma y acuerdos…"
                  ></textarea
                  ><small
                    >Documenta fuente y contexto. Las decisiones clínicas requieren revisión
                    profesional.</small
                  >
                </div>
              </div>
            </section>
            <section class="surface">
              <header class="surface-header">
                <div>
                  <p class="eyebrow">Problema nutricional</p>
                  <h2>Diagnóstico PES</h2>
                </div>
                <app-icon name="report" />
              </header>
              <div class="surface-body form-grid">
                <div class="field col-4">
                  <label class="required" for="problemCode">Código o dominio</label>
                  <input
                    id="problemCode"
                    name="problemCode"
                    [(ngModel)]="model.problemCode"
                    [required]="!editingId() || !!editingDiagnosisId()"
                    maxlength="80"
                    placeholder="Ej. NI-5.8.5"
                  />
                  <small>Según la terminología aprobada por la clínica.</small>
                </div>
                <div class="field col-8">
                  <label class="required" for="problemStatement">Problema</label>
                  <input
                    id="problemStatement"
                    name="problemStatement"
                    [(ngModel)]="model.problemStatement"
                    [required]="!editingId() || !!editingDiagnosisId()"
                    maxlength="1000"
                    placeholder="Problema nutricional identificable"
                  />
                  <small>No se genera automáticamente.</small>
                </div>
                <div class="field col-6">
                  <label class="required" for="etiology">Etiología relacionada</label>
                  <textarea
                    id="etiology"
                    name="etiology"
                    [(ngModel)]="model.etiology"
                    [required]="!editingId() || !!editingDiagnosisId()"
                    maxlength="2000"
                  ></textarea>
                  <small>Causa o factor modificable respaldado por la evaluación.</small>
                </div>
                <div class="field col-6">
                  <label class="required" for="signs">Signos y síntomas</label>
                  <textarea
                    id="signs"
                    name="signs"
                    [(ngModel)]="model.signsAndSymptoms"
                    [required]="!editingId() || !!editingDiagnosisId()"
                    maxlength="2000"
                  ></textarea>
                  <small>Evidencia medible que permitirá el seguimiento.</small>
                </div>
                <div class="col-12 notice notice-warning">
                  <app-icon name="info" />
                  <span
                    >El diagnóstico se guarda como borrador y requiere aprobación explícita del
                    nutricionista.</span
                  >
                </div>
              </div>
            </section>
          </div>

          <aside class="summary surface">
            <header class="surface-header"><h2>Resumen de captura</h2></header>
            <div class="surface-body">
              <div class="summary-row">
                <span>Ingesta</span
                ><b [class.missing]="!model.dailyIntake">{{
                  model.dailyIntake ? 'Registrada' : 'Pendiente'
                }}</b>
              </div>
              <div class="summary-row">
                <span>Alergias</span><b>{{ model.allergies || 'Sin confirmar' }}</b>
              </div>
              <div class="summary-row">
                <span>Sueño</span><b>{{ model.sleepHours || '—' }} h</b>
              </div>
              <div class="summary-row">
                <span>Ejercicio</span><b>{{ model.exerciseMinutesPerWeek }} min/sem</b>
              </div>
              <div class="summary-row">
                <span>Bristol</span><b>Tipo {{ model.bristolStoolType || '—' }}</b>
              </div>
              <div class="summary-row">
                <span>Problema PES</span><b>{{ model.problemStatement || 'Pendiente' }}</b>
              </div>
              <div class="notice">
                <app-icon name="info" /><span
                  >Completa esta historia antes de formular diagnóstico PES o prescripción.</span
                >
              </div>
              <a class="button button-secondary" href="#intake">Revisar desde el inicio</a>
            </div>
          </aside>
        </div>
        <footer class="save-bar">
          <span
            ><strong>Borrador local activo</strong
            ><small>Los cambios no enviados se conservan en este navegador.</small></span
          >
          <div class="toolbar">
            <button type="button" class="button button-secondary" (click)="cancelEditor()">
              Cancelar
            </button>
            <button type="button" class="button button-secondary" (click)="saveDraft()">
              Guardar borrador</button
            ><button type="submit" class="button button-primary" [disabled]="saving()">
              {{
                saving()
                  ? 'Guardando…'
                  : editingId()
                    ? 'Actualizar evaluación'
                    : 'Guardar evaluación'
              }}
            </button>
          </div>
        </footer>
      </form>
    }
    <section class="surface record-history">
      <header class="surface-header">
        <div>
          <p class="eyebrow">Expediente</p>
          <h2>Evaluaciones guardadas</h2>
        </div>
        <span class="caption">{{ assessments().length }} registros</span>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ingesta</th>
              <th>Sueño</th>
              <th>Ejercicio</th>
              <th>Bristol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of assessments(); track row.id) {
              <tr>
                <td>{{ row.recordedAtUtc | date: 'dd MMM y · HH:mm' : '' : 'es-EC' }}</td>
                <td>
                  {{ row.dailyIntake | slice: 0 : 55 }}{{ row.dailyIntake.length > 55 ? '…' : '' }}
                </td>
                <td>{{ row.sleepHours }} h · {{ row.sleepQuality || 'Sin detalle' }}</td>
                <td>{{ row.exerciseMinutesPerWeek }} min</td>
                <td>Tipo {{ row.bristolStoolType || '—' }}</td>
                <td>
                  <div class="toolbar">
                    <button
                      class="button button-secondary button-small"
                      type="button"
                      (click)="viewAssessment(row)"
                    >
                      Ver
                    </button>
                    <button
                      class="button button-secondary button-small"
                      type="button"
                      (click)="editAssessment(row)"
                    >
                      Editar
                    </button>
                    @if (auth.hasRole('ClinicAdmin')) {
                      <button
                        class="button button-danger button-small"
                        type="button"
                        (click)="requestArchive(row)"
                      >
                        Archivar
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty-row">
                  Todavía no existen evaluaciones guardadas para el paciente activo.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    @if (archiveTarget(); as target) {
      <div class="dialog-backdrop" role="presentation" (click)="cancelArchive()">
        <section
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="archive-title"
          (click)="$event.stopPropagation()"
        >
          <p class="eyebrow">Acción administrativa</p>
          <h2 id="archive-title">¿Archivar esta evaluación?</h2>
          <p>
            La evaluación del
            {{ target.recordedAtUtc | date: 'dd MMM y' : '' : 'es-EC' }} permanecerá en auditoría y
            dejará de mostrarse en el expediente activo.
          </p>
          <div class="toolbar dialog-actions">
            <button type="button" class="button button-secondary" (click)="cancelArchive()">
              Cancelar
            </button>
            <button type="button" class="button button-danger" (click)="archiveAssessment()">
              Archivar evaluación
            </button>
          </div>
        </section>
      </div>
    }
  </div>`,
  styles: [
    `
      .breadcrumbs {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 1rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .breadcrumbs app-icon {
        width: 0.8rem;
        height: 0.8rem;
      }
      .patient-strip {
        margin-bottom: 1rem;
      }
      .steps {
        margin: 0 0 1rem;
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        list-style: none;
        background: white;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
      }
      .steps li {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        position: relative;
        color: var(--text-muted);
      }
      .steps li::after {
        content: '';
        height: 1px;
        position: absolute;
        left: 2.2rem;
        right: 0.5rem;
        top: 1rem;
        background: var(--border);
      }
      .steps li:last-child::after {
        display: none;
      }
      .steps span {
        width: 2rem;
        height: 2rem;
        z-index: 1;
        display: grid;
        place-items: center;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: white;
        font-size: 0.75rem;
        font-weight: 800;
      }
      .steps .done span {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
      }
      .steps .current {
        color: var(--primary-dark);
        font-weight: 800;
      }
      .steps .current span {
        border: 2px solid var(--primary);
        background: var(--avocado-soft);
      }
      .steps small {
        z-index: 1;
        background: white;
        padding-right: 0.35rem;
      }
      .assessment-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 18rem;
        gap: 1rem;
        align-items: start;
      }
      .sections {
        display: grid;
        gap: 1rem;
      }
      .surface-header > app-icon {
        color: var(--primary);
      }
      .summary {
        position: sticky;
        top: 5rem;
      }
      .summary-row {
        padding: 0.75rem 0;
        border-bottom: 1px solid #eeeae2;
        display: grid;
        gap: 0.25rem;
      }
      .summary-row span {
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .summary-row b {
        font-size: 0.82rem;
      }
      .summary-row .missing {
        color: var(--warning);
      }
      .summary .notice {
        margin: 1rem 0;
      }
      .summary .button {
        width: 100%;
      }
      .binary {
        margin-top: 0.4rem;
        display: flex;
        gap: 0.5rem;
      }
      .binary label {
        min-width: 5rem;
        padding: 0.65rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: 0.82rem;
      }
      .binary input,
      .bristol input {
        accent-color: var(--primary);
      }
      .bristol {
        margin: 0;
        padding: 0;
        border: 0;
      }
      .bristol legend {
        margin-bottom: 0.6rem;
        font-size: 0.79rem;
        font-weight: 750;
      }
      .bristol-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.4rem;
      }
      .bristol label {
        min-height: 5rem;
        padding: 0.55rem;
        display: grid;
        align-content: start;
        gap: 0.25rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: white;
        cursor: pointer;
      }
      .bristol label.selected {
        border-color: var(--primary);
        background: var(--surface-muted);
        box-shadow: inset 0 0 0 1px var(--primary);
      }
      .bristol label strong {
        font: 700 1.1rem var(--font-display);
        color: var(--primary-dark);
      }
      .bristol label span {
        font-size: 0.63rem;
        color: var(--text-muted);
      }
      .bristol > small {
        display: block;
        margin-top: 0.45rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .save-bar {
        min-height: 4.5rem;
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        position: sticky;
        bottom: 0;
        z-index: 8;
        background: rgba(255, 255, 255, 0.97);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: 0 -8px 24px rgba(59, 35, 15, 0.05);
      }
      .record-state,
      .record-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .record-state {
        min-height: 9rem;
        margin-bottom: 1rem;
        padding: 1.25rem;
      }
      .record-state h2,
      .record-toolbar h2,
      .confirm-dialog h2 {
        margin: 0.2rem 0 0.35rem;
      }
      .record-state p:not(.eyebrow),
      .record-toolbar .caption,
      .confirm-dialog p:not(.eyebrow) {
        margin: 0;
        color: var(--text-muted);
      }
      .record-state-error {
        border-color: rgba(180, 54, 43, 0.32);
        background: #fffaf8;
      }
      .assessment-record {
        margin-bottom: 1rem;
        overflow: hidden;
      }
      .record-toolbar {
        padding: 1.25rem;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(110deg, rgba(241, 247, 226, 0.72), rgba(255, 255, 255, 0));
      }
      .record-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .record-group {
        min-width: 0;
        padding: 1.2rem 1.25rem;
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
      }
      .record-group:nth-child(even) {
        border-right: 0;
      }
      .record-wide {
        grid-column: 1 / -1;
        border-right: 0;
      }
      .record-group dl {
        margin: 0.7rem 0 0;
      }
      .record-group dl > div + div {
        margin-top: 0.85rem;
      }
      .record-group dt {
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .record-group dd,
      .record-copy {
        margin: 0.25rem 0 0;
        color: var(--text);
        font-size: 0.86rem;
        line-height: 1.55;
        white-space: pre-line;
      }
      .record-facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem 1rem;
      }
      .record-facts > div + div {
        margin-top: 0 !important;
      }
      .record-full {
        grid-column: 1 / -1;
      }
      .diagnosis-summary {
        background: rgba(249, 246, 236, 0.55);
      }
      .record-history {
        margin-top: 1rem;
      }
      .dialog-backdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(28, 21, 13, 0.44);
        backdrop-filter: blur(2px);
      }
      .confirm-dialog {
        width: min(100%, 30rem);
        padding: 1.4rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: white;
        box-shadow: 0 24px 70px rgba(38, 27, 14, 0.24);
      }
      .dialog-actions {
        justify-content: flex-end;
        margin-top: 1.25rem;
      }
      .save-bar strong,
      .save-bar small {
        display: block;
      }
      .save-bar small {
        margin-top: 0.18rem;
        color: var(--text-muted);
        font-size: 0.7rem;
      }
      @media (max-width: 1120px) {
        .assessment-layout {
          grid-template-columns: 1fr;
        }
        .summary {
          position: static;
        }
        .steps small {
          display: none;
        }
        .steps li {
          justify-content: center;
        }
        .steps li::after {
          left: 60%;
          right: -40%;
        }
      }
      @media (max-width: 700px) {
        .record-state,
        .record-toolbar {
          align-items: stretch;
          flex-direction: column;
        }
        .record-toolbar .toolbar,
        .record-state .button {
          width: 100%;
        }
        .record-toolbar .button {
          flex: 1;
        }
        .record-grid,
        .record-facts {
          grid-template-columns: 1fr;
        }
        .record-group,
        .record-group:nth-child(even) {
          grid-column: 1;
          border-right: 0;
        }
        .record-full {
          grid-column: 1;
        }
        .bristol-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        .save-bar {
          align-items: stretch;
          flex-direction: column;
        }
        .save-bar .toolbar {
          width: 100%;
        }
        .save-bar .button {
          flex: 1;
        }
      }
    `,
  ],
})
export class AssessmentComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly patientContext = inject(PatientContextService);
  readonly saving = signal(false);
  readonly assessments = signal<AssessmentRecord[]>([]);
  readonly diagnoses = signal<DiagnosisRecord[]>([]);
  readonly activeAssessment = signal<AssessmentRecord | null>(null);
  readonly activeDiagnosis = signal<DiagnosisRecord | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editingDiagnosisId = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly assessmentsLoading = signal(false);
  readonly assessmentsError = signal('');
  readonly archiveTarget = signal<AssessmentRecord | null>(null);
  readonly sleepQualityOptions = SLEEP_QUALITY_OPTIONS;
  private loadedPatientId = '';
  readonly steps = [
    { label: 'Datos generales' },
    { label: 'Historia' },
    { label: 'Antropometría' },
    { label: 'Cálculos' },
    { label: 'Diagnóstico' },
    { label: 'Plan' },
  ];
  readonly bristolTypes = [
    { value: 1, label: 'Bolitas duras' },
    { value: 2, label: 'Grumosa' },
    { value: 3, label: 'Con grietas' },
    { value: 4, label: 'Lisa y suave' },
    { value: 5, label: 'Trozos blandos' },
    { value: 6, label: 'Pastosa' },
    { value: 7, label: 'Líquida' },
  ];
  model = this.emptyModel();
  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (patientId && patientId !== this.loadedPatientId) {
        this.resetEditor();
        this.loadAssessments(patientId);
      } else if (!patientId) {
        this.loadedPatientId = '';
        this.resetEditor();
        this.assessments.set([]);
        this.diagnoses.set([]);
        this.activeAssessment.set(null);
        this.activeDiagnosis.set(null);
      }
    });
  }

  isHistoricalSleepQuality(value: string): boolean {
    return isLegacySleepQuality(value);
  }

  startNewAssessment(): void {
    this.resetEditor();
    this.editorOpen.set(true);
    this.scrollToEditor();
  }

  cancelEditor(): void {
    this.resetEditor();
    const latest = this.assessments()[0] ?? null;
    this.selectActiveAssessment(latest);
  }

  viewAssessment(row: AssessmentRecord): void {
    this.resetEditor();
    this.selectActiveAssessment(row);
    document
      .querySelector('.assessment-record')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  reloadPatientData(): void {
    const patientId = this.patientContext.selectedId();
    if (patientId) this.loadAssessments(patientId, true);
  }
  aplicarPlantilla(plantilla: QuickTemplate): void {
    const modelo = this.model as Record<string, unknown>;
    let completados = 0;
    let conservados = 0;
    for (const [campo, valor] of Object.entries(plantilla.values)) {
      const actual = modelo[campo];
      if (actual === '' || actual === null || actual === undefined) {
        modelo[campo] = valor;
        completados += 1;
      } else {
        conservados += 1;
      }
    }
    this.toast.show(
      'success',
      'Plantilla aplicada',
      completados
        ? `${completados} campos recibieron una guía editable${conservados ? `; ${conservados} conservaron tus datos` : ''}.`
        : 'Tus campos ya tenían contenido; no se reemplazó ningún dato.',
    );
  }
  saveDraft(): void {
    const patientId = this.patientContext.selectedId() || 'sin-paciente';
    sessionStorage.setItem(`nutrivida-assessment-draft.${patientId}`, JSON.stringify(this.model));
    this.toast.show('success', 'Borrador guardado', 'Se conservó únicamente en este navegador.');
  }
  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.toast.show('error', 'Faltan datos obligatorios', 'Revisa ingesta, horarios y sueño.');
      return;
    }
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show(
        'error',
        'Selecciona un paciente',
        'La evaluación debe pertenecer a un expediente.',
      );
      return;
    }
    this.saving.set(true);
    const editingId = this.editingId();
    const request = editingId
      ? this.api.updateAssessment(patientId, editingId, this.model)
      : this.api.saveAssessment(patientId, this.model);
    request.subscribe({
      next: (savedAssessment) => {
        this.persistDiagnosis(patientId, savedAssessment, Boolean(editingId));
      },
      error: (e) => {
        this.saving.set(false);
        this.saveDraft();
        this.toast.show('error', 'No se envió al servidor', e.message);
      },
    });
  }

  editAssessment(row: AssessmentRecord): void {
    this.selectActiveAssessment(row);
    this.editingId.set(row.id);
    const diagnosis = this.activeDiagnosis();
    this.editingDiagnosisId.set(diagnosis?.id ?? null);
    Object.assign(this.model, {
      dailyIntake: row.dailyIntake,
      eatingSchedule: row.eatingSchedule,
      allergies: row.allergies,
      intolerances: row.intolerances,
      sleepHours: row.sleepHours,
      sleepQuality: row.sleepQuality,
      exerciseType: row.exerciseType,
      exerciseMinutesPerWeek: row.exerciseMinutesPerWeek,
      exerciseSchedule: row.exerciseSchedule,
      hasConstipation: row.hasConstipation,
      bristolStoolType: row.bristolStoolType,
      bowelFrequency: row.bowelFrequency,
      clinicalNotes: row.clinicalNotes,
      problemCode: diagnosis?.problemCode ?? '',
      problemStatement: diagnosis?.problemStatement ?? '',
      etiology: diagnosis?.etiology ?? '',
      signsAndSymptoms: diagnosis?.signsAndSymptoms ?? '',
    });
    this.editorOpen.set(true);
    this.scrollToEditor();
    this.toast.show(
      'success',
      'Evaluación cargada',
      'Edita los datos y pulsa Actualizar evaluación.',
    );
  }

  requestArchive(row: AssessmentRecord): void {
    this.archiveTarget.set(row);
  }

  cancelArchive(): void {
    this.archiveTarget.set(null);
  }

  archiveAssessment(): void {
    const row = this.archiveTarget();
    if (!row) return;
    const patientId = this.patientContext.selectedId();
    if (!patientId) return;
    this.api.archiveAssessment(patientId, row.id).subscribe({
      next: () => {
        this.archiveTarget.set(null);
        if (this.editingId() === row.id) this.resetEditor();
        this.loadAssessments(patientId, true);
        this.toast.show('success', 'Evaluación archivada');
      },
      error: (e) => this.toast.show('error', 'No se archivó la evaluación', e.message),
    });
  }

  private loadAssessments(patientId: string, force = false): void {
    if (!force && this.loadedPatientId === patientId) return;
    this.loadedPatientId = patientId;
    this.assessmentsLoading.set(true);
    this.assessmentsError.set('');
    forkJoin({
      assessments: this.api.assessments(patientId),
      diagnoses: this.api.diagnoses(patientId),
    }).subscribe({
      next: ({ assessments, diagnoses }) => {
        this.assessments.set(assessments);
        this.diagnoses.set(diagnoses);
        this.assessmentsLoading.set(false);
        this.selectActiveAssessment(assessments[0] ?? null);
      },
      error: (e) => {
        this.assessments.set([]);
        this.diagnoses.set([]);
        this.activeAssessment.set(null);
        this.activeDiagnosis.set(null);
        this.assessmentsLoading.set(false);
        this.assessmentsError.set(e.message);
      },
    });
  }

  private selectActiveAssessment(record: AssessmentRecord | null): void {
    this.activeAssessment.set(record);
    this.activeDiagnosis.set(
      record
        ? (this.diagnoses().find((diagnosis) => diagnosis.assessmentId === record.id) ?? null)
        : null,
    );
  }

  private persistDiagnosis(
    patientId: string,
    assessment: AssessmentRecord,
    isUpdate: boolean,
  ): void {
    const payload = {
      assessmentId: assessment.id,
      problemCode: this.model.problemCode,
      problemStatement: this.model.problemStatement,
      etiology: this.model.etiology,
      signsAndSymptoms: this.model.signsAndSymptoms,
    };
    const diagnosisId = this.editingDiagnosisId();
    const hasCompleteDiagnosis = Object.values(payload)
      .filter((_, index) => index > 0)
      .every((value) => String(value).trim().length > 0);

    if (isUpdate && !diagnosisId && !hasCompleteDiagnosis) {
      this.finishSave(
        patientId,
        'Evaluación actualizada',
        'Los cambios quedaron guardados en el expediente.',
      );
      return;
    }

    const request = diagnosisId
      ? this.api.updateDiagnosis(patientId, diagnosisId, payload)
      : this.api.saveDiagnosis(patientId, payload);
    request.subscribe({
      next: () =>
        this.finishSave(
          patientId,
          isUpdate ? 'Evaluación actualizada' : 'Evaluación y problema guardados',
          'La historia y su diagnóstico PES quedaron vinculados en el expediente.',
        ),
      error: (e) => {
        this.saving.set(false);
        this.toast.show(
          'error',
          'La evaluación se guardó, pero el diagnóstico PES no se actualizó',
          e.message,
        );
      },
    });
  }

  private finishSave(patientId: string, title: string, detail: string): void {
    this.saving.set(false);
    sessionStorage.removeItem(`nutrivida-assessment-draft.${patientId}`);
    this.resetEditor();
    this.loadAssessments(patientId, true);
    this.toast.show('success', title, detail);
  }

  private resetEditor(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.editingDiagnosisId.set(null);
    this.model = this.emptyModel();
  }

  private scrollToEditor(): void {
    setTimeout(() =>
      document.querySelector('#intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  private emptyModel() {
    return {
      dailyIntake: '',
      eatingSchedule: '',
      allergies: '',
      intolerances: '',
      sleepHours: null as number | null,
      sleepQuality: '',
      exerciseType: '',
      exerciseMinutesPerWeek: 0,
      exerciseSchedule: '',
      hasConstipation: false,
      bristolStoolType: null as number | null,
      bowelFrequency: '',
      clinicalNotes: '',
      problemCode: '',
      problemStatement: '',
      etiology: '',
      signsAndSymptoms: '',
    };
  }
}
