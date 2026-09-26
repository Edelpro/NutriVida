import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService, MenuPlanSummary, PatientDetails } from '../../../../nucleo/api.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { PatientContextService } from '../../../../nucleo/contexto-paciente/patient-context.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { PatientContextBarComponent } from '../../../../compartido/contexto-paciente/patient-context-bar.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { QuickTemplate } from '../../../plantillas/modelos/quick-template.models';
import { QuickTemplatesComponent } from '../../../plantillas/paginas/tarjetas-plantillas/quick-templates.component';

@Component({
  selector: 'app-communications',
  imports: [
    FormsModule,
    IconComponent,
    PatientContextBarComponent,
    DatePipe,
    QuickTemplatesComponent,
  ],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Entrega al paciente</p>
        <h1>Mensajería</h1>
        <p class="lede">
          Comparte el PDF clínico por correo o envíalo como documento mediante WhatsApp Business.
        </p>
      </div>
      <span class="badge">Envío con confirmación</span>
    </header>
    <app-patient-context-bar />
    <div class="notice notice-warning">
      <app-icon name="info" /><span
        >Primero prepara y revisa el documento. Si WhatsApp Business está configurado, confirma el
        número y NutriVida carga el PDF directamente a Meta. El estado “aceptado” no significa
        todavía “entregado” o “leído”.</span
      >
    </div>
    <app-quick-templates
      scope="communication"
      (templateSelected)="aplicarPlantilla($event)"
    />
    <div class="message-layout">
      <form #messageForm="ngForm" class="surface" novalidate (ngSubmit)="preview(messageForm)">
        <header class="surface-header">
          <div>
            <p class="eyebrow">Nuevo mensaje</p>
            <h2>Compartir plan nutricional</h2>
          </div>
          <app-icon name="send" />
        </header>
        <div class="surface-body form-grid">
          <div class="field col-12">
            <label for="messagePatient">Paciente</label
            ><select id="messagePatient" disabled>
              <option>
                {{ patientContext.selected()?.firstName }} {{ patientContext.selected()?.lastName }}
              </option></select
            ><small
              >{{ contact()?.email || 'Sin correo' }} ·
              {{ contact()?.phone || 'Sin teléfono' }}</small
            >
          </div>
          <div class="field col-12">
            <label for="messagePlan">Plan a compartir</label>
            <select
              id="messagePlan"
              name="messagePlan"
              [(ngModel)]="selectedPlanId"
              (ngModelChange)="clearPrepared()"
            >
              <option value="">Sin vincular un plan</option>
              @for (plan of plans(); track plan.id) {
                <option [value]="plan.id">
                  {{ plan.name }} · {{ plan.energyTargetKcal }} kcal
                </option>
              }
            </select>
            <small>
              {{
                plans().length
                  ? 'El enlace y la auditoría quedarán relacionados con el plan elegido.'
                  : 'Guarda primero un plan de menú para vincularlo al mensaje.'
              }}
            </small>
          </div>
          <fieldset class="channels col-12">
            <legend>Canal autorizado</legend>
            <label [class.selected]="channel === 0"
              ><input
                type="radio"
                name="channel"
                [value]="0"
                [(ngModel)]="channel"
                (ngModelChange)="clearPrepared()"
              /><app-icon name="mail" /><span
                ><strong>Correo</strong
                ><small>{{
                  contact()?.emailConsent ? 'Consentimiento registrado' : 'Consentimiento pendiente'
                }}</small></span
              ></label
            ><label [class.selected]="channel === 1"
              ><input
                type="radio"
                name="channel"
                [value]="1"
                [(ngModel)]="channel"
                (ngModelChange)="clearPrepared()"
              /><app-icon name="phone" /><span
                ><strong>WhatsApp</strong
                ><small>{{
                  contact()?.whatsAppConsent
                    ? 'Consentimiento registrado'
                    : 'Consentimiento pendiente'
                }}</small></span
              ></label
            >
          </fieldset>
          <div class="field col-12">
            <label class="required" for="subject">Asunto</label
            ><input
              id="subject"
              name="subject"
              [(ngModel)]="subject"
              (ngModelChange)="clearPrepared()"
              #subjectModel="ngModel"
              required
              minlength="3"
              maxlength="160"
              [attr.aria-invalid]="
                (subjectModel.invalid || subject.trim().length < 3) &&
                (subjectModel.touched || submitted())
              "
              aria-describedby="subjectHelp"
            />
            @if (
              (subjectModel.invalid || subject.trim().length < 3) &&
              (subjectModel.touched || submitted())
            ) {
              <small id="subjectHelp" class="field-error"
                >Escribe un asunto de 3 a 160 caracteres.</small
              >
            } @else {
              <small id="subjectHelp">Evita información clínica sensible en el asunto.</small>
            }
          </div>
          <div class="field col-12">
            <label class="required" for="message">Mensaje</label
            ><textarea
              id="message"
              name="message"
              [(ngModel)]="message"
              (ngModelChange)="clearPrepared()"
              #messageModel="ngModel"
              required
              minlength="10"
              maxlength="2000"
              [attr.aria-invalid]="
                (messageModel.invalid || message.trim().length < 10) &&
                (messageModel.touched || submitted())
              "
              aria-describedby="messageHelp"
            ></textarea>
            @if (
              (messageModel.invalid || message.trim().length < 10) &&
              (messageModel.touched || submitted())
            ) {
              <small id="messageHelp" class="field-error"
                >Escribe un mensaje de 10 a 2000 caracteres.</small
              >
            } @else {
              <small id="messageHelp"
                >El plan se comparte mediante un enlace seguro, no como texto abierto.</small
              >
            }
          </div>
        </div>
        <footer class="send-footer">
          <button class="button button-secondary" type="button" (click)="saveDraft()">
            Guardar borrador</button
          ><button class="button button-primary" type="submit" [disabled]="sending()">
            <app-icon name="send" />{{ sending() ? 'Preparando…' : 'Preparar envío' }}
          </button>
          @if (preparedAction(); as action) {
            <a
              class="button button-secondary"
              [href]="action.reportUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar PDF
            </a>
            @if (action.canSendAutomatically && channel === 1) {
              <div class="delivery-confirmation">
                <label>
                  <input
                    type="checkbox"
                    [checked]="deliveryConfirmed()"
                    (change)="deliveryConfirmed.set($any($event.target).checked)"
                  />
                  Confirmo el envío del PDF a {{ action.destination }}
                </label>
                <button
                  class="button button-primary"
                  type="button"
                  [disabled]="sendingWhatsApp() || !deliveryConfirmed() || deliveryAccepted()"
                  (click)="sendWhatsAppDocument(action.dispatchId)"
                >
                  <app-icon name="phone" />
                  {{
                    deliveryAccepted()
                      ? 'PDF aceptado por WhatsApp'
                      : sendingWhatsApp()
                        ? 'Enviando PDF…'
                        : 'Enviar PDF por WhatsApp'
                  }}
                </button>
              </div>
            } @else {
              <a
                class="button button-primary"
                [href]="action.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <app-icon [name]="channel === 0 ? 'mail' : 'phone'" />{{ action.label }}
              </a>
            }
          }
        </footer>
      </form>
      <aside class="preview">
        <p class="eyebrow">Vista del paciente</p>
        <div class="phone">
          <div class="phone-head"><span class="mini-mark">N</span><strong>NutriVida</strong></div>
          <div class="bubble">
            <strong>{{ subject }}</strong>
            <p>{{ message }}</p>
            <a>Ver mi plan nutricional</a><small>Enlace protegido y con vigencia limitada</small>
          </div>
        </div>
        <div class="checks">
          <p>
            <app-icon name="check" />
            {{ channelConsent() ? 'Consentimiento vigente' : 'Consentimiento pendiente' }}
          </p>
          <p><app-icon name="check" /> {{ channelDestination() || 'Destino pendiente' }}</p>
          <p><app-icon name="check" /> Preparación con registro de auditoría</p>
        </div>
      </aside>
    </div>
    <section class="surface history">
      <header class="surface-header">
        <h2>Historial de comunicaciones</h2>
        <span class="caption">Destinos enmascarados</span>
      </header>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Canal</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (item of history(); track item.id) {
              <tr>
                <td>{{ item.createdAtUtc | date: 'dd MMM y · HH:mm' : '' : 'es-EC' }}</td>
                <td>{{ item.patientName }}</td>
                <td>{{ item.channel === 'Email' ? 'Correo' : 'WhatsApp' }}</td>
                <td>{{ item.destinationMasked }}</td>
                <td>
                  <span class="badge">{{ statusLabel(item.status) }}</span>
                </td>
                <td>
                  @if (auth.hasRole('ClinicAdmin')) {
                    <button
                      class="button button-danger button-small"
                      type="button"
                      (click)="archive(item)"
                    >
                      Archivar
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty-row">
                  Todavía no hay comunicaciones para el paciente activo.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  </div>`,
  styles: [
    `
      .notice {
        margin-bottom: 1rem;
      }
      .message-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 20rem;
        gap: 1rem;
      }
      .surface-header > app-icon {
        color: var(--primary);
      }
      .channels {
        margin: 0;
        padding: 0;
        border: 0;
      }
      .channels legend {
        margin-bottom: 0.5rem;
        font-size: 0.79rem;
        font-weight: 750;
      }
      .channels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
      }
      .channels label {
        min-height: 4rem;
        padding: 0.7rem;
        display: grid;
        grid-template-columns: auto auto 1fr;
        align-items: center;
        gap: 0.55rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
      }
      .channels label.selected {
        border-color: var(--primary);
        background: var(--surface-muted);
        box-shadow: inset 0 0 0 1px var(--primary);
      }
      .channels input {
        accent-color: var(--primary);
      }
      .channels app-icon {
        color: var(--primary);
      }
      .channels strong,
      .channels small {
        display: block;
      }
      .channels small {
        margin-top: 0.2rem;
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      .send-footer {
        padding: 1rem 1.15rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
        border-top: 1px solid var(--border);
        flex-wrap: wrap;
      }
      .delivery-confirmation {
        flex: 1 1 100%;
        padding: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.8rem;
        border: 1px solid var(--border-section);
        border-radius: var(--radius-md);
        background: var(--section-wash);
      }
      .delivery-confirmation label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }
      .delivery-confirmation input {
        width: 1rem;
        height: 1rem;
        accent-color: var(--primary);
      }
      .preview {
        padding: 1.3rem;
        color: white;
        background: var(--primary-dark);
        border-radius: 2.5rem 0.8rem 0.8rem;
      }
      .preview .eyebrow {
        color: #dcebc6;
      }
      .phone {
        padding: 1rem;
        border-radius: 1.2rem;
        background: #f0f2ec;
        color: var(--text);
        box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.35);
      }
      .phone-head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-bottom: 0.6rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.78rem;
      }
      .mini-mark {
        width: 1.7rem;
        height: 1.7rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        font-weight: 800;
      }
      .bubble {
        margin-top: 1rem;
        padding: 0.85rem;
        border-radius: 0.8rem 0.8rem 0.8rem 0.2rem;
        background: white;
        font-size: 0.74rem;
      }
      .bubble p {
        margin: 0.45rem 0;
        color: var(--text-muted);
        line-height: 1.45;
      }
      .bubble a {
        display: block;
        padding: 0.6rem;
        border-radius: 0.4rem;
        background: var(--primary);
        color: white;
        text-align: center;
        font-weight: 800;
      }
      .bubble small {
        display: block;
        margin-top: 0.45rem;
        color: var(--text-muted);
        font-size: 0.6rem;
        text-align: center;
      }
      .checks {
        margin-top: 1rem;
      }
      .checks p {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0.55rem 0;
        color: #dcebc6;
        font-size: 0.7rem;
      }
      .checks app-icon {
        color: var(--avocado-soft);
      }
      .history {
        margin-top: 1rem;
      }
      @media (max-width: 950px) {
        .message-layout {
          grid-template-columns: 1fr;
        }
        .preview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .preview > .eyebrow {
          grid-column: 1/-1;
        }
      }
      @media (max-width: 650px) {
        .channels {
          grid-template-columns: 1fr;
        }
        .preview {
          display: block;
        }
        .send-footer {
          flex-direction: column;
        }
        .delivery-confirmation {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class CommunicationsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly patientContext = inject(PatientContextService);
  readonly sending = signal(false);
  readonly sendingWhatsApp = signal(false);
  readonly deliveryConfirmed = signal(false);
  readonly deliveryAccepted = signal(false);
  readonly submitted = signal(false);
  readonly history = signal<any[]>([]);
  readonly contact = signal<PatientDetails | null>(null);
  readonly plans = signal<MenuPlanSummary[]>([]);
  readonly preparedAction = signal<{
    dispatchId: string;
    url: string;
    reportUrl: string;
    label: string;
    destination: string;
    canSendAutomatically: boolean;
  } | null>(null);
  private loadedPatientId = '';
  selectedPlanId = '';
  channel = 0;
  subject = 'Tu plan nutricional está listo';
  message =
    'Hola, revisamos tu plan y ya está disponible. Ábrelo desde el enlace seguro y escríbenos si tienes dudas.';
  aplicarPlantilla(plantilla: QuickTemplate): void {
    this.subject = plantilla.values['subject'] ?? '';
    this.message = plantilla.values['message'] ?? '';
    this.preparedAction.set(null);
    this.toast.show(
      'success',
      'Mensaje base aplicado',
      'Personalízalo y revísalo antes de preparar el envío.',
    );
  }
  clearPrepared(): void {
    this.preparedAction.set(null);
    this.deliveryConfirmed.set(false);
    this.deliveryAccepted.set(false);
  }
  constructor() {
    effect(() => {
      const patientId = this.patientContext.selectedId();
      if (patientId && patientId !== this.loadedPatientId) {
        this.preparedAction.set(null);
        this.deliveryConfirmed.set(false);
        this.deliveryAccepted.set(false);
        this.loadHistory(patientId);
        this.api.patient(patientId).subscribe({
          next: (patient) => this.contact.set(patient),
          error: () => this.contact.set(null),
        });
        this.api.menuPlans(patientId).subscribe({
          next: (plans) => {
            if (this.patientContext.selectedId() !== patientId) return;
            this.plans.set(plans);
            this.selectedPlanId = plans[0]?.id ?? '';
          },
          error: () => {
            this.plans.set([]);
            this.selectedPlanId = '';
          },
        });
      }
    });
  }
  private loadHistory(patientId: string): void {
    this.loadedPatientId = patientId;
    this.api.communications(patientId).subscribe({
      next: (rows) => this.history.set(rows as any[]),
      error: () => this.history.set([]),
    });
  }
  preview(form: NgForm): void {
    if (this.sending()) return;
    this.submitted.set(true);
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show('error', 'Selecciona un paciente');
      return;
    }
    if (form.invalid || this.subject.trim().length < 3 || this.message.trim().length < 10) {
      form.control.markAllAsTouched();
      queueMicrotask(() =>
        document
          .querySelector<HTMLElement>(
            '#subject[aria-invalid="true"], #message[aria-invalid="true"]',
          )
          ?.focus(),
      );
      this.toast.show(
        'error',
        'Revisa el mensaje',
        'Corrige los campos marcados antes de preparar el envío.',
      );
      return;
    }
    if (!this.channelConsent()) {
      this.toast.show(
        'error',
        'Falta consentimiento',
        'Regístralo en el expediente del paciente para este canal.',
      );
      return;
    }
    if (!this.channelDestination()) {
      this.toast.show(
        'error',
        'Falta el destino',
        'Registra el correo o teléfono en el expediente del paciente.',
      );
      return;
    }
    this.sending.set(true);
    this.api
      .previewMessage({
        patientId,
        menuPlanId: this.selectedPlanId || null,
        channel: this.channel,
        subject: this.subject,
        body: this.message,
      })
      .subscribe({
        next: (response: any) => {
          this.sending.set(false);
          this.submitted.set(false);
          this.preparedAction.set({
            dispatchId: response.id,
            url: response.actionUrl,
            reportUrl: response.reportUrl,
            label: this.channel === 0 ? 'Abrir correo con PDF' : 'Abrir WhatsApp con PDF',
            destination: response.destination,
            canSendAutomatically: response.canSendAutomatically === true,
          });
          this.deliveryConfirmed.set(false);
          this.deliveryAccepted.set(false);
          this.loadHistory(patientId);
          this.toast.show(
            'success',
            'PDF preparado',
            response.canSendAutomatically
              ? 'Revisa el destino y confirma el envío del documento.'
              : 'Abre el canal y confirma el envío del enlace seguro.',
          );
        },
        error: (e) => {
          this.sending.set(false);
          this.toast.show('error', 'No se preparó el envío', e.message);
        },
      });
  }

  sendWhatsAppDocument(dispatchId: string): void {
    if (this.sendingWhatsApp() || !this.deliveryConfirmed() || this.deliveryAccepted()) return;
    const patientId = this.patientContext.selectedId();
    if (!patientId) return;
    this.sendingWhatsApp.set(true);
    this.api.sendWhatsAppDocument(dispatchId).subscribe({
      next: (response: any) => {
        this.sendingWhatsApp.set(false);
        this.deliveryAccepted.set(true);
        this.loadHistory(patientId);
        this.toast.show(
          'success',
          response.alreadySent ? 'PDF enviado anteriormente' : 'PDF aceptado por WhatsApp',
          response.notice,
        );
      },
      error: (e) => {
        this.sendingWhatsApp.set(false);
        this.toast.show('error', 'No se envió el PDF', e.message);
      },
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      Draft: 'Preparado',
      Queued: 'Confirmación pendiente',
      Sent: 'Aceptado por WhatsApp',
      Failed: 'Rechazado',
      Delivered: 'Entregado',
      Read: 'Leído',
    };
    return labels[status] ?? status;
  }

  saveDraft(): void {
    const patientId = this.patientContext.selectedId();
    if (!patientId) {
      this.toast.show('error', 'Selecciona un paciente');
      return;
    }
    sessionStorage.setItem(
      `nutrivida-message-draft.${patientId}`,
      JSON.stringify({ channel: this.channel, subject: this.subject, message: this.message }),
    );
    this.toast.show('success', 'Borrador guardado', 'Se conservará en este navegador.');
  }

  archive(item: { id: string }): void {
    if (!confirm('¿Archivar este registro de comunicación? Se conservará en auditoría.')) return;
    const patientId = this.patientContext.selectedId();
    if (!patientId) return;
    this.api.archiveCommunication(item.id).subscribe({
      next: () => {
        this.loadHistory(patientId);
        this.toast.show('success', 'Comunicación archivada');
      },
      error: (e) => this.toast.show('error', 'No se archivó la comunicación', e.message),
    });
  }

  channelConsent(): boolean {
    return this.channel === 0 ? !!this.contact()?.emailConsent : !!this.contact()?.whatsAppConsent;
  }

  channelDestination(): string {
    return this.channel === 0 ? (this.contact()?.email ?? '') : (this.contact()?.phone ?? '');
  }
}
