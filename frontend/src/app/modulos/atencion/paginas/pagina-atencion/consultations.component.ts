import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { ConsultationsApiService } from '../../acceso-datos/consultations-api.service';
import { ConsultationListItem } from '../../modelos/consultation.models';

@Component({
  selector: 'app-consultations',
  imports: [FormsModule, RouterLink, IconComponent, PatientContextBarComponent, DatePipe],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Agenda clínica</p>
        <h1>Atención</h1>
        <p class="lede">
          Organiza consultas y abre la historia sin perder el contexto del paciente.
        </p>
      </div>
      <button class="button button-primary" type="button" (click)="openComposer()">
        <app-icon name="plus" /> Agendar consulta
      </button>
    </header>
    <app-patient-context-bar />
    @if (showComposer()) {
      <form
        #consultationForm="ngForm"
        class="surface composer"
        novalidate
        (ngSubmit)="save(consultationForm)"
      >
        <header class="surface-header">
          <h2>Nueva consulta</h2>
          <button class="button button-quiet" type="button" (click)="showComposer.set(false)">
            <app-icon name="close" /> Cerrar
          </button>
        </header>
        <div class="surface-body form-grid">
          <div class="field col-4">
            <label>Paciente activo</label>
            <input [value]="activePatientName()" disabled />
            <small>Se guardará en el expediente seleccionado arriba.</small>
          </div>
          <div class="field col-3">
            <label class="required" for="consultDate">Fecha</label>
            <input
              id="consultDate"
              name="consultDate"
              type="date"
              [(ngModel)]="draft.date"
              required
            />
            <small>Zona America/Guayaquil.</small>
          </div>
          <div class="field col-3">
            <label class="required" for="consultTime">Hora</label>
            <input
              id="consultTime"
              name="consultTime"
              type="time"
              [(ngModel)]="draft.time"
              required
            />
            <small>Duración predeterminada: 45 min.</small>
          </div>
          <div class="field col-12">
            <label class="required" for="consultReason">Motivo</label>
            <input
              id="consultReason"
              name="consultReason"
              [(ngModel)]="draft.reason"
              required
              maxlength="500"
              placeholder="Control, primera consulta, revisión de menú…"
            />
            <small>&nbsp;</small>
          </div>
        </div>
        <footer class="composer-footer">
          <button class="button button-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar en agenda' }}
          </button>
        </footer>
      </form>
    }
    <div class="day-layout">
      <section class="surface">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Agenda</p>
            <h2>{{ selectedDate() | date: "EEEE, d 'de' MMMM" : '' : 'es-EC' }}</h2>
          </div>
          <div class="toolbar">
            <button
              class="button button-secondary button-small"
              type="button"
              (click)="moveDay(-1)"
            >
              Día anterior
            </button>
            <button class="button button-secondary button-small" type="button" (click)="moveDay(1)">
              Día siguiente
            </button>
          </div>
        </header>
        @if (loading()) {
          <div class="status-message"><span class="spinner"></span></div>
        } @else {
          <div class="agenda-list">
            @for (item of agenda(); track item.id) {
              <article>
                <time>{{ item.startsAtUtc | date: 'HH:mm' }}</time
                ><span class="line"></span>
                <div>
                  <span class="badge">{{ statusLabel(item.status) }}</span>
                  <h3>{{ item.patientName }}</h3>
                  <p>{{ item.reason }} · {{ item.durationMinutes }} min</p>
                </div>
                <div class="toolbar">
                  <button class="button button-secondary button-small" type="button" (click)="edit(item)">Editar</button>
                  @if (auth.hasRole('ClinicAdmin')) {<button class="button button-danger button-small" type="button" (click)="archive(item)">Archivar</button>}
                  <a class="button button-secondary button-small" routerLink="/evaluaciones" (click)="patientContext.select(item.patientId)">Abrir <app-icon name="arrow" /></a>
                </div>
              </article>
            } @empty {
              <div class="empty-state">
                <div>
                  <app-icon name="calendar" />
                  <h2>Sin consultas</h2>
                  <p>Agenda una atención para este día.</p>
                </div>
              </div>
            }
          </div>
        }
      </section>
      <aside class="surface quick">
        <div class="surface-body">
          <p class="eyebrow">Preparación</p>
          <h2>Antes de atender</h2>
          <ul>
            <li><app-icon name="check" /><span>Consentimientos y contacto</span></li>
            <li><app-icon name="check" /><span>Última antropometría</span></li>
            <li><app-icon name="check" /><span>Seguimiento según control acordado</span></li>
            <li><app-icon name="check" /><span>Plan vigente y mensajes</span></li>
          </ul>
          <div class="notice">
            <app-icon name="info" />Las consultas no completadas quedan señaladas para revisión.
          </div>
        </div>
      </aside>
    </div>
  </div>`,
  styles: [
    `
      .composer {
        margin-bottom: 1rem;
      }
      .composer-footer {
        padding: 1rem 1.15rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
      }
      .day-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(17rem, 0.55fr);
        gap: 1rem;
      }
      .agenda-list {
        padding: 0.25rem 1.1rem;
      }
      .agenda-list article {
        min-height: 6.2rem;
        display: grid;
        grid-template-columns: 3.7rem 1.1rem minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.7rem;
        border-bottom: 1px solid #eeeae2;
      }
      .agenda-list article:last-child {
        border: 0;
      }
      .agenda-list time {
        font: 700 1rem var(--font-display);
      }
      .agenda-list .line {
        width: 0.7rem;
        height: 0.7rem;
        border: 2px solid var(--primary);
        border-radius: 50%;
        position: relative;
      }
      .agenda-list .line::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 0.65rem;
        width: 1px;
        height: 5.35rem;
        background: #d7e2c6;
      }
      .agenda-list article:last-child .line::after {
        display: none;
      }
      .agenda-list h3 {
        margin: 0.35rem 0 0.2rem;
      }
      .agenda-list p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.76rem;
      }
      .quick {
        border-radius: 2.5rem 0.8rem 0.8rem;
      }
      .quick ul {
        margin: 1rem 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
        list-style: none;
      }
      .quick li {
        display: flex;
        gap: 0.6rem;
        font-size: 0.83rem;
      }
      .quick li app-icon {
        color: var(--primary);
      }
      .quick .notice {
        margin-top: 1.25rem;
      }
      @media (max-width: 950px) {
        .day-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 650px) {
        .agenda-list article {
          grid-template-columns: 3rem 0.8rem 1fr;
        }
        .agenda-list article > a {
          grid-column: 3;
        }
        .surface-header .toolbar {
          display: none;
        }
      }
    `,
  ],
})
export class ConsultationsComponent implements OnInit {
  private readonly api = inject(ConsultationsApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly patientContext = inject(PatientContextService);
  readonly showComposer = signal(false);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly selectedDate = signal(new Date());
  readonly agenda = signal<ConsultationListItem[]>([]);
  readonly editingId = signal<string | null>(null);
  draft = { date: this.dateKey(new Date()), time: '09:00', reason: '', durationMinutes: 45, status: 0, notes: '' };

  ngOnInit(): void {
    this.load();
  }
  activePatientName(): string {
    const patient = this.patientContext.selected();
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Selecciona un paciente';
  }
  openComposer(): void {
    if (!this.patientContext.selectedId()) {
      this.toast.show('error', 'Selecciona un paciente antes de agendar');
      return;
    }
    this.draft = {
      date: this.dateKey(this.selectedDate()),
      time: '09:00',
      reason: '',
      durationMinutes: 45,
      status: 0,
      notes: '',
    };
    this.showComposer.set(true);
  }
  moveDay(days: number): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + days);
    this.selectedDate.set(date);
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.api.list(this.dateKey(this.selectedDate())).subscribe({
      next: (rows) => {
        this.agenda.set(rows);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.agenda.set([]);
        this.loading.set(false);
        this.toast.show('error', 'No se cargó la agenda', error.message);
      },
    });
  }
  save(form: NgForm): void {
    const patientId = this.patientContext.selectedId();
    if (form.invalid || !patientId) {
      form.control.markAllAsTouched();
      this.toast.show(
        'error',
        patientId ? 'Completa fecha, hora y motivo' : 'Selecciona un paciente',
      );
      return;
    }
    const startsAtUtc = new Date(`${this.draft.date}T${this.draft.time}:00`).toISOString();
    this.saving.set(true);
    const editingId = this.editingId();
    const request = editingId
      ? this.api.update(editingId, {
          startsAtUtc,
          durationMinutes: this.draft.durationMinutes,
          reason: this.draft.reason,
          status: this.draft.status,
          notes: this.draft.notes,
        })
      : this.api.create({
        patientId,
        startsAtUtc,
        durationMinutes: this.draft.durationMinutes,
        reason: this.draft.reason,
      });
    request.subscribe({
        next: () => {
          this.saving.set(false);
          this.editingId.set(null);
          this.showComposer.set(false);
          this.selectedDate.set(new Date(`${this.draft.date}T12:00:00`));
          this.load();
          this.toast.show('success', editingId ? 'Consulta actualizada' : 'Consulta guardada en la agenda');
        },
        error: (error: Error) => {
          this.saving.set(false);
          this.toast.show('error', 'No se guardó la consulta', error.message);
        },
      });
  }
  edit(item: ConsultationListItem): void {
    const date = new Date(item.startsAtUtc);
    this.patientContext.select(item.patientId);
    this.editingId.set(item.id);
    this.draft = {
      date: this.dateKey(date),
      time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      reason: item.reason,
      durationMinutes: item.durationMinutes,
      status: item.status === 'Completed' ? 2 : item.status === 'Cancelled' ? 3 : item.status === 'InProgress' ? 1 : 0,
      notes: '',
    };
    this.showComposer.set(true);
  }
  archive(item: ConsultationListItem): void {
    if (!confirm('¿Archivar esta consulta? Se conservará en la auditoría.')) return;
    this.api.archive(item.id).subscribe({
      next: () => { this.load(); this.toast.show('success', 'Consulta archivada'); },
      error: (e) => this.toast.show('error', 'No se archivó la consulta', e.message),
    });
  }
  statusLabel(status: string): string {
    return status === 'Completed'
      ? 'Completada'
      : status === 'Cancelled'
        ? 'Cancelada'
        : 'Programada';
  }
  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
