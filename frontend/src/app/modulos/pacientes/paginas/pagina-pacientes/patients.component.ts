import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { PatientsApiService } from '../../acceso-datos/patients-api.service';
import { toLocalIsoDate } from '../../../../nucleo/fechas';
import { NutritionistOption, Patient } from '../../modelos/patient.models';

type PatientForm = {
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sexAtBirth: number;
  email: string;
  phone: string;
  occupation: string;
  goal: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  status: number;
  rowVersion: string;
  assignedNutritionistUserId: string;
};

@Component({
  selector: 'app-patients',
  imports: [FormsModule, DatePipe, IconComponent, RouterLink],
  template: ` <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Gestión clínica</p>
          <h1>Pacientes</h1>
          <p class="lede">
            {{ auth.hasRole('ClinicAdmin')
              ? 'Todos los expedientes de la clínica y su profesional responsable.'
              : 'Tus expedientes asignados, consentimientos y objetivos de atención.' }}
          </p>
        </div>
        <button class="button button-primary" type="button" (click)="openCreate()">
          <app-icon name="plus" /> Nuevo paciente
        </button>
      </header>
      <div class="notice notice-success ownership-guide">
        <app-icon name="users" />
        <span>
          <strong>{{ auth.hasRole('ClinicAdmin') ? 'Vista de Administración.' : 'Vista personal.' }}</strong>
          {{ auth.hasRole('ClinicAdmin')
            ? 'Puedes consultar todos los pacientes y reasignar su nutricionista responsable.'
            : 'Solo aparecen los pacientes asignados a tu cuenta.' }}
        </span>
      </div>
      @if (loadError()) {
        <div class="notice notice-danger connection" role="alert">
          <app-icon name="info" />
          <span><strong>No se cargaron datos de ejemplo.</strong> {{ loadError() }}</span>
          <button class="button button-secondary button-small" type="button" (click)="load(1)">
            Reintentar
          </button>
        </div>
      }
      <section class="surface">
        <div class="patient-toolbar">
          <label class="search"
            ><span class="field-label">Buscar pacientes</span
            ><span
              ><app-icon name="search" /><input
                class="search-input"
                [(ngModel)]="query"
                (keyup.enter)="load(1)"
                placeholder="Nombre, cédula o correo" /></span
          ></label>
          <div class="toolbar">
            <button class="button button-secondary" type="button" (click)="load(1)">Buscar</button>
            @if (query) {
              <button class="button button-quiet" type="button" (click)="clearSearch()">
                Limpiar
              </button>
            }
            @if (auth.hasRole('ClinicAdmin')) {
              <button class="button button-quiet" type="button" (click)="toggleArchived()">
                {{ showArchived() ? 'Ver activos' : 'Ver archivados' }}
              </button>
            }
          </div>
        </div>
        @if (loading()) {
          <div class="status-message">
            <span class="spinner" aria-label="Cargando pacientes"></span>
          </div>
        } @else if (!patients().length) {
          <div class="empty-state">
            <div>
              <app-icon name="users" />
              <h2>Sin resultados</h2>
              <p>Prueba otro término o registra un paciente nuevo.</p>
              <button class="button button-primary" type="button" (click)="openCreate()">
                Nuevo paciente
              </button>
            </div>
          </div>
        } @else {
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Identificación</th>
                  <th>Contacto</th>
                  <th>Objetivo</th>
                  @if (auth.hasRole('ClinicAdmin')) { <th>Nutricionista responsable</th> }
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (patient of patients(); track patient.id) {
                  <tr>
                    <td>
                      <span class="patient-cell"
                        ><span class="initials">{{ initials(patient) }}</span
                        ><span
                          ><a class="patient-link" [routerLink]="['/pacientes', patient.id]"
                            ><strong>{{ patient.firstName }} {{ patient.lastName }}</strong></a
                          ><small>{{
                            patient.dateOfBirth | date: 'dd MMM yyyy' : '' : 'es-EC'
                          }}</small></span
                        ></span
                      >
                    </td>
                    <td>{{ patient.documentNumber }}</td>
                    <td>
                      <span class="contact"
                        >{{ patient.email }}<small>{{ patient.phone }}</small></span
                      >
                    </td>
                    <td class="goal">{{ patient.goal || 'Sin objetivo registrado' }}</td>
                    @if (auth.hasRole('ClinicAdmin')) {
                      <td>
                        <span class="responsible-name">
                          {{ patient.assignedNutritionistName || 'Sin asignar' }}
                        </span>
                      </td>
                    }
                    <td><span class="badge">Activo</span></td>
                    <td>
                      @if (showArchived()) {
                        <button class="button button-secondary button-small" type="button" (click)="restore(patient)">
                          Restaurar
                        </button>
                      } @else {
                      <span class="row-actions"
                        ><a
                          class="row-file"
                          [routerLink]="['/pacientes', patient.id]"
                          [attr.aria-label]="'Abrir ficha de ' + patient.firstName"
                          title="Abrir ficha"
                        >
                          <app-icon name="eye" /></a
                        ><button
                          type="button"
                          (click)="openEdit(patient)"
                          aria-label="Editar {{ patient.firstName }}"
                          title="Editar paciente"
                        >
                          <app-icon name="edit" /></button
                        >@if (auth.hasRole('ClinicAdmin')) {
                          <button
                            class="danger"
                            type="button"
                            (click)="confirmArchive(patient)"
                            aria-label="Archivar {{ patient.firstName }}"
                            title="Archivar paciente"
                          >
                            <app-icon name="trash" />
                          </button>
                        }
                      </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>{{ total() }} pacientes · página {{ page() }} de {{ totalPages() }}</span>
            <div class="toolbar">
              <button
                class="button button-secondary button-small"
                [disabled]="page() === 1"
                (click)="load(page() - 1)"
              >
                Anterior</button
              ><button
                class="button button-secondary button-small"
                [disabled]="page() === totalPages()"
                (click)="load(page() + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </section>
    </div>

    <dialog #editor (cancel)="closeEditor()">
      <form #patientForm="ngForm" novalidate (ngSubmit)="save(patientForm)">
        <header class="dialog-header">
          <div>
            <p class="eyebrow">Expediente</p>
            <h2>{{ editingId() ? 'Editar paciente' : 'Nuevo paciente' }}</h2>
          </div>
          <button
            class="button button-quiet"
            type="button"
            (click)="closeEditor()"
            aria-label="Cerrar"
          >
            <app-icon name="close" />
          </button>
        </header>
        <div class="dialog-body">
          @if (saveError()) {
            <div class="notice notice-danger form-error" role="alert">
              <app-icon name="info" />
              <span><strong>No se guardó el paciente.</strong> {{ saveError() }}</span>
            </div>
          }
          <div class="form-grid">
            <div class="field col-6">
              <label class="required" for="firstName">Nombres</label
              ><input
                id="firstName"
                name="firstName"
                [(ngModel)]="form.firstName"
                #firstNameModel="ngModel"
                required
                minlength="2"
                maxlength="100"
                [attr.aria-invalid]="firstNameModel.invalid && (firstNameModel.touched || submitted())"
                aria-describedby="firstNameHelp"
              />@if (firstNameModel.invalid && (firstNameModel.touched || submitted())) {
                <small id="firstNameHelp" class="field-error">Escribe al menos 2 caracteres.</small>
              } @else { <small id="firstNameHelp">Como aparecen en su identificación.</small> }
            </div>
            <div class="field col-6">
              <label class="required" for="lastName">Apellidos</label
              ><input
                id="lastName"
                name="lastName"
                [(ngModel)]="form.lastName"
                #lastNameModel="ngModel"
                required
                minlength="2"
                maxlength="100"
                [attr.aria-invalid]="lastNameModel.invalid && (lastNameModel.touched || submitted())"
                aria-describedby="lastNameHelp"
              />@if (lastNameModel.invalid && (lastNameModel.touched || submitted())) {
                <small id="lastNameHelp" class="field-error">Escribe al menos 2 caracteres.</small>
              } @else { <small id="lastNameHelp">Como aparecen en su identificación.</small> }
            </div>
            <div class="field col-4">
              <label class="required" for="document">Identificación</label
              ><input
                id="document"
                name="document"
                [(ngModel)]="form.documentNumber"
                #documentModel="ngModel"
                required
                minlength="3"
                maxlength="30"
                [attr.aria-invalid]="documentModel.invalid && (documentModel.touched || submitted())"
                aria-describedby="documentHelp"
              />@if (documentModel.invalid && (documentModel.touched || submitted())) {
                <small id="documentHelp" class="field-error">Escribe una identificación de 3 a 30 caracteres.</small>
              } @else { <small id="documentHelp">Cédula, pasaporte o código.</small> }
            </div>
            <div class="field col-4">
              <label class="required" for="birth">Fecha de nacimiento</label
              ><input
                id="birth"
                name="birth"
                type="date"
                [(ngModel)]="form.dateOfBirth"
                #birthModel="ngModel"
                min="1900-01-01"
                [max]="today"
                required
                [attr.aria-invalid]="birthModel.invalid && (birthModel.touched || submitted())"
                aria-describedby="birthHelp"
              />@if (birthModel.invalid && (birthModel.touched || submitted())) {
                <small id="birthHelp" class="field-error">Selecciona una fecha entre 1900 y hoy.</small>
              } @else { <small id="birthHelp">No puede ser una fecha futura.</small> }
            </div>
            <div class="field col-4">
              <label class="required" for="sex">Sexo para fórmulas</label
              ><select
                id="sex"
                name="sex"
                [(ngModel)]="form.sexAtBirth"
                required
              >
                <option [ngValue]="1">Masculino</option>
                <option [ngValue]="0">Femenino</option>
                <option [ngValue]="3">No especificado</option></select
              ><small>Solo se usa cuando una ecuación lo requiere.</small>
            </div>
            @if (auth.hasRole('ClinicAdmin')) {
              <div class="field col-12">
                <label class="required" for="assignedNutritionist">Nutricionista responsable</label>
                <select
                  id="assignedNutritionist"
                  name="assignedNutritionist"
                  [(ngModel)]="form.assignedNutritionistUserId"
                  #assignedNutritionistModel="ngModel"
                  required
                  [attr.aria-invalid]="assignedNutritionistModel.invalid && (assignedNutritionistModel.touched || submitted())"
                  aria-describedby="assignedNutritionistHelp"
                >
                  <option value="">Selecciona un profesional</option>
                  @for (nutritionist of nutritionists(); track nutritionist.id) {
                    <option [value]="nutritionist.id">
                      {{ nutritionist.fullName }} · {{ nutritionist.email }}
                    </option>
                  }
                </select>
                @if (assignedNutritionistModel.invalid && (assignedNutritionistModel.touched || submitted())) {
                  <small id="assignedNutritionistHelp" class="field-error">Selecciona quién atenderá este expediente.</small>
                } @else {
                  <small id="assignedNutritionistHelp">Solo este profesional y Administración podrán consultar el expediente.</small>
                }
              </div>
            } @else {
              <div class="assignment-note col-12">
                <app-icon name="users" />
                <span><strong>Responsable:</strong> este paciente quedará asignado a tu cuenta.</span>
              </div>
            }
            <div class="field col-6">
              <label for="email">Correo</label
              ><input
                id="email"
                name="email"
                type="email"
                [(ngModel)]="form.email"
                (ngModelChange)="onContactChange()"
                #emailModel="ngModel"
                email
                maxlength="180"
                [attr.aria-invalid]="emailModel.invalid && (emailModel.touched || submitted())"
                aria-describedby="patientEmailHelp"
              />@if (emailModel.invalid && (emailModel.touched || submitted())) {
                <small id="patientEmailHelp" class="field-error">Ingresa un correo válido.</small>
              } @else { <small id="patientEmailHelp">Verifica antes de habilitar envíos.</small> }
            </div>
            <div class="field col-6">
              <label class="required" for="phone">Teléfono / WhatsApp</label
              ><input
                id="phone"
                name="phone"
                [(ngModel)]="form.phone"
                (ngModelChange)="onContactChange()"
                #phoneModel="ngModel"
                required
                minlength="7"
                maxlength="30"
                pattern="[+]?[0-9][0-9 ()-]{5,28}[0-9]"
                [attr.aria-invalid]="phoneModel.invalid && (phoneModel.touched || submitted())"
                aria-describedby="phoneHelp"
              />@if (phoneModel.invalid && (phoneModel.touched || submitted())) {
                <small id="phoneHelp" class="field-error">Usa de 7 a 15 dígitos e incluye el código de país.</small>
              } @else { <small id="phoneHelp">Ejemplo: +593 99 123 4567.</small> }
            </div>
            <div class="field col-6">
              <label for="occupation">Ocupación</label
              ><input
                id="occupation"
                name="occupation"
                [(ngModel)]="form.occupation"
                maxlength="120"
              /><small>&nbsp;</small>
            </div>
            <div class="field col-12">
              <label for="goal">Objetivo acordado</label
              ><textarea id="goal" name="goal" [(ngModel)]="form.goal" maxlength="600"></textarea
              ><small>Redáctalo como objetivo clínico revisable.</small>
            </div>
            <fieldset id="consentimientos" class="col-12 consent">
              <legend>Autorizaciones de contacto</legend>
              <p>
                Activa cada canal únicamente después de confirmar y registrar la autorización real
                del paciente. Si cambias el correo o el teléfono, vuelve a confirmar su autorización.
              </p>
              <label class="check-line"
                ><input type="checkbox" name="emailConsent" [(ngModel)]="form.emailConsent" />
                El paciente autorizó comunicaciones por correo</label
              ><label class="check-line"
                ><input type="checkbox" name="waConsent" [(ngModel)]="form.whatsAppConsent" />
                El paciente autorizó comunicaciones por WhatsApp</label
              >
            </fieldset>
          </div>
        </div>
        <footer class="dialog-footer">
          <button class="button button-secondary" type="button" (click)="closeEditor()">
            Cancelar</button
          ><button class="button button-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar paciente' }}
          </button>
        </footer>
      </form>
    </dialog>

    <dialog #archiveDialog class="confirm-dialog">
      <header class="dialog-header"><h2>Archivar expediente</h2></header>
      <div class="dialog-body">
        <p>
          El expediente de
          <strong>{{ archiveTarget()?.firstName }} {{ archiveTarget()?.lastName }}</strong> dejará
          de aparecer en la lista activa. No se eliminará la historia clínica.
        </p>
        <div class="notice notice-warning">
          <app-icon name="info" /> Esta acción conserva los datos por trazabilidad.
        </div>
      </div>
      <footer class="dialog-footer">
        <button class="button button-secondary" type="button" (click)="archiveDialog.close()">
          Cancelar</button
        ><button class="button button-danger" type="button" (click)="archive()">
          Archivar expediente
        </button>
      </footer>
    </dialog>`,
  styles: [
    `
      .connection {
        margin-bottom: 1rem;
        align-items: center;
      }
      .ownership-guide {
        margin-bottom: 1rem;
        align-items: center;
      }
      .ownership-guide strong {
        display: block;
        margin-bottom: 0.1rem;
      }
      .connection span {
        flex: 1;
      }
      .connection strong,
      .form-error strong {
        display: block;
        margin-bottom: 0.12rem;
        color: var(--danger);
      }
      .form-error {
        margin-bottom: 1rem;
      }
      .patient-toolbar {
        padding: 1rem 1.1rem;
        display: flex;
        align-items: end;
        gap: 0.75rem;
        border-bottom: 1px solid var(--border-soft);
        background: linear-gradient(90deg, var(--section-wash), transparent 62%);
      }
      .search {
        width: min(30rem, 100%);
        display: grid;
        gap: 0.35rem;
      }
      .search > span:last-child {
        position: relative;
        display: block;
      }
      .search app-icon {
        position: absolute;
        left: 0.75rem;
        top: 0.8rem;
        color: var(--text-muted);
      }
      .search-input {
        padding-left: 2.45rem;
      }
      .patient-cell,
      .contact {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .contact {
        display: block;
      }
      .patient-cell small,
      .contact small {
        display: block;
        margin-top: 0.18rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .initials {
        flex: none;
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--avocado-soft);
        color: var(--primary-dark);
        font-size: 0.72rem;
        font-weight: 800;
      }
      .goal {
        max-width: 17rem;
        color: var(--text-muted);
      }
      .responsible-name {
        display: inline-block;
        max-width: 13rem;
        overflow-wrap: anywhere;
        color: var(--text);
        font-size: 0.76rem;
        font-weight: 700;
      }
      .assignment-note {
        min-height: 3rem;
        padding: 0.7rem 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        border: 1px solid var(--border-soft);
        border-radius: var(--radius-md);
        color: var(--text-muted);
        background: var(--section-wash);
        font-size: 0.76rem;
      }
      .assignment-note app-icon {
        color: var(--primary);
      }
      .row-actions {
        display: flex;
        gap: 0.25rem;
      }
      .patient-link {
        color: inherit;
        text-decoration: none;
      }
      .patient-link:hover {
        text-decoration: underline;
      }
      .row-file {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        color: var(--primary);
      }
      .row-actions button {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 0.4rem;
        background: transparent;
        color: var(--primary);
        cursor: pointer;
      }
      .row-actions button:hover {
        background: var(--surface-muted);
      }
      .row-actions .danger {
        color: var(--danger);
      }
      .consent {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface-muted);
      }
      .consent legend {
        padding: 0 0.35rem;
        font-size: 0.78rem;
        font-weight: 800;
      }
      .consent p {
        grid-column: 1 / -1;
        margin: 0;
        color: var(--text-muted);
        font-size: 0.72rem;
        line-height: 1.45;
      }
      .confirm-dialog {
        width: min(31rem, calc(100% - 2rem));
      }
      @media (max-width: 700px) {
        .patient-cell {
          min-width: 12rem;
        }
        .patient-toolbar {
          align-items: stretch;
          flex-direction: column;
        }
        .search {
          width: 100%;
        }
        .patient-toolbar .toolbar {
          width: 100%;
        }
        .patient-toolbar .button {
          flex: 1;
        }
        .consent {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PatientsComponent implements OnInit, AfterViewInit {
  readonly auth = inject(AuthService);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('archiveDialog') archiveDialog!: ElementRef<HTMLDialogElement>;
  private readonly api = inject(PatientsApiService);
  private readonly patientContext = inject(PatientContextService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private pendingEditId: string | null = null;
  private viewReady = false;
  readonly patients = signal<Patient[]>([]);
  readonly nutritionists = signal<NutritionistOption[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly archiveTarget = signal<Patient | null>(null);
  readonly showArchived = signal(false);
  readonly today = toLocalIsoDate();
  private savedContact = { email: '', phone: '' };
  query = '';
  form: PatientForm = this.emptyForm();
  ngOnInit(): void {
    if (this.auth.hasRole('ClinicAdmin')) this.loadNutritionists();
    this.load(1);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.pendingEditId = params.get('editar');
      this.openRequestedPatient();
    });
  }
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.openRequestedPatient();
  }
  toggleArchived(): void {
    this.showArchived.update((value) => !value);
    this.load(1);
  }
  restore(patient: Patient): void {
    this.api.restore(patient.id).subscribe({
      next: () => {
        this.toast.show('success', 'Paciente restaurado', 'Vuelve a estar entre los pacientes activos.');
        this.patientContext.refresh();
        this.load(1);
      },
      error: (error: Error) => this.toast.show('error', 'No se restauró el paciente', error.message),
    });
  }
  load(page: number): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.list(this.query, page, this.showArchived()).subscribe({
      next: (result) => {
        this.patients.set(result.items);
        this.page.set(result.page);
        this.total.set(result.total);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.patients.set([]);
        this.total.set(0);
        this.totalPages.set(1);
        this.loadError.set(error.message);
        this.loading.set(false);
      },
    });
  }
  clearSearch(): void {
    this.query = '';
    this.load(1);
  }
  initials(p: Patient): string {
    return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`;
  }
  openCreate(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.saveError.set('');
    this.submitted.set(false);
    this.editor.nativeElement.showModal();
  }
  onContactChange(): void {
    if (!this.editingId()) return;
    if (this.form.email.trim().toLowerCase() !== this.savedContact.email.trim().toLowerCase())
      this.form.emailConsent = false;
    if (this.form.phone.replace(/\D/g, '') !== this.savedContact.phone.replace(/\D/g, ''))
      this.form.whatsAppConsent = false;
  }
  openEdit(patient: Patient): void {
    this.openEditById(patient.id);
  }
  private openEditById(patientId: string): void {
    this.saveError.set('');
    this.submitted.set(false);
    this.api.get(patientId).subscribe({
      next: (p) => {
        this.editingId.set(p.id);
        this.savedContact = { email: p.email, phone: p.phone };
        Object.assign(this.form, {
          documentNumber: p.documentNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          sexAtBirth: p.sexAtBirth,
          email: p.email,
          phone: p.phone,
          occupation: p.occupation,
          goal: p.goal,
          emailConsent: p.emailConsent,
          whatsAppConsent: p.whatsAppConsent,
          status:
            typeof p.status === 'number'
              ? p.status
              : p.status === 'Paused'
                ? 1
                : p.status === 'Archived'
                  ? 2
                  : 0,
          rowVersion: p.rowVersion,
          assignedNutritionistUserId: p.assignedNutritionistUserId ?? '',
        });
        this.changeDetector.detectChanges();
        if (!this.editor.nativeElement.open) this.editor.nativeElement.showModal();
        if (this.route.snapshot.queryParamMap.get('seccion') === 'consentimientos') {
          setTimeout(() => document.getElementById('consentimientos')?.scrollIntoView({ block: 'center' }));
        }
      },
      error: (e) => {
        this.clearEditRequest();
        this.toast.show('error', 'No se abrió el expediente', e.message);
      },
    });
  }
  closeEditor(): void {
    this.submitted.set(false);
    if (this.editor.nativeElement.open) this.editor.nativeElement.close();
    this.clearEditRequest();
  }
  save(formRef: NgForm): void {
    this.submitted.set(true);
    if (formRef.invalid) {
      formRef.control.markAllAsTouched();
      queueMicrotask(() =>
        this.editor.nativeElement.querySelector<HTMLElement>('.ng-invalid:not(form)')?.focus(),
      );
      this.toast.show('error', 'Revisa los campos marcados', 'Corrige el primer campo señalado antes de guardar.');
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    const id = this.editingId();
    const request = id
      ? this.api.update(id, {
          documentNumber: this.form.documentNumber,
          firstName: this.form.firstName,
          lastName: this.form.lastName,
          dateOfBirth: this.form.dateOfBirth,
          sexAtBirth: this.form.sexAtBirth,
          email: this.form.email,
          phone: this.form.phone,
          occupation: this.form.occupation,
          goal: this.form.goal,
          status: this.form.status,
          rowVersion: this.form.rowVersion,
          emailConsent: this.form.emailConsent,
          whatsAppConsent: this.form.whatsAppConsent,
          assignedNutritionistUserId: this.form.assignedNutritionistUserId || null,
        })
      : this.api.create({
          documentNumber: this.form.documentNumber,
          firstName: this.form.firstName,
          lastName: this.form.lastName,
          dateOfBirth: this.form.dateOfBirth,
          sexAtBirth: this.form.sexAtBirth,
          email: this.form.email,
          phone: this.form.phone,
          occupation: this.form.occupation,
          goal: this.form.goal,
          emailConsent: this.form.emailConsent,
          whatsAppConsent: this.form.whatsAppConsent,
          assignedNutritionistUserId: this.form.assignedNutritionistUserId || null,
        });
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.submitted.set(false);
        this.closeEditor();
        this.patientContext.refresh(saved.id);
        this.toast.show('success', id ? 'Paciente actualizado' : 'Paciente registrado');
        this.load(1);
      },
      error: (e) => {
        this.saving.set(false);
        this.saveError.set(e.message);
        this.toast.show('error', 'No se pudo guardar', e.message);
      },
    });
  }
  confirmArchive(p: Patient): void {
    this.archiveTarget.set(p);
    this.archiveDialog.nativeElement.showModal();
  }
  archive(): void {
    const p = this.archiveTarget();
    if (!p) return;
    this.api.archive(p.id).subscribe({
      next: () => {
        this.archiveDialog.nativeElement.close();
        this.patientContext.refresh();
        this.toast.show('success', 'Expediente archivado', 'La historia clínica se conservó.');
        this.load(1);
      },
      error: (e) => this.toast.show('error', 'No se pudo archivar', e.message),
    });
  }
  private emptyForm(): PatientForm {
    return {
      documentNumber: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      sexAtBirth: 3,
      email: '',
      phone: '',
      occupation: '',
      goal: '',
      emailConsent: false,
      whatsAppConsent: false,
      status: 0,
      rowVersion: '',
      assignedNutritionistUserId: '',
    };
  }

  private loadNutritionists(): void {
    this.api.nutritionists().subscribe({
      next: (items) => {
        this.nutritionists.set(items);
        if (!this.form.assignedNutritionistUserId && items.length === 1)
          this.form.assignedNutritionistUserId = items[0].id;
      },
      error: (error: Error) => {
        this.nutritionists.set([]);
        this.toast.show('error', 'No se cargaron los nutricionistas', error.message);
      },
    });
  }

  private openRequestedPatient(): void {
    if (!this.viewReady || !this.pendingEditId) return;
    const patientId = this.pendingEditId;
    this.pendingEditId = null;
    this.openEditById(patientId);
  }

  private clearEditRequest(): void {
    if (!this.route.snapshot.queryParamMap.has('editar')) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
