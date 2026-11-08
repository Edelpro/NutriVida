import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, AuditEvent } from '../../../../nucleo/api.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';

const TECHNICAL_FIELDS = new Set(['Id', 'CreatedAtUtc', 'UpdatedAtUtc', 'ClinicId', 'PatientId', 'IsArchived']);
const FIELD_LABELS: Record<string, string> = {
  FirstName: 'nombres', LastName: 'apellidos', DocumentNumber: 'identificación', DateOfBirth: 'nacimiento',
  SexAtBirth: 'sexo', Email: 'correo', Phone: 'teléfono', Occupation: 'ocupación', Goal: 'objetivo',
  Status: 'estado', EmailConsentAtUtc: 'autorización de correo', WhatsAppConsentAtUtc: 'autorización de WhatsApp',
  AssignedNutritionistUserId: 'responsable', WeightKg: 'peso', HeightCm: 'estatura', WaistCm: 'cintura',
  HipCm: 'cadera', BodyFatPercent: 'grasa', Notes: 'notas', MeasuredAtUtc: 'fecha de medición',
  Allergies: 'alergias', Intolerances: 'intolerancias', ClinicalNotes: 'notas clínicas', DailyIntake: 'ingesta',
  ProblemStatement: 'problema', Etiology: 'etiología', SignsAndSymptoms: 'signos y síntomas',
  TotalEnergyKcal: 'energía total', Name: 'nombre', EnergyTargetKcal: 'meta energética', FullName: 'nombre',
  ProfessionalNotes: 'notas profesionales', StartsOn: 'inicio', EndsOn: 'fin', ApprovedAtUtc: 'aprobación',
  ApprovedByName: 'aprobado por', StartsAtUtc: 'fecha y hora', DurationMinutes: 'duración', Reason: 'motivo',
  LastLoginAtUtc: 'último acceso', FailedLoginAttempts: 'intentos fallidos', LockedUntilUtc: 'bloqueo',
  Role: 'rol', IsActive: 'estado de la cuenta', MustChangePassword: 'cambio de contraseña',
};

@Component({
  selector: 'app-audit',
  imports: [DatePipe, IconComponent],
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Control administrativo</p>
        <h1>Auditoría</h1>
        <p class="lede">Historial de cambios y descargas clínicas, sin exponer contraseñas ni valores sensibles.</p>
      </div>
      <span class="badge"><app-icon name="shield" /> Solo Administrador</span>
    </header>
    <div class="notice notice-success">
      <app-icon name="info" /><span>Este registro es de solo lectura desde la aplicación. Conserva actor, acción, campos afectados, fecha y correlación técnica.</span>
    </div>
    <section class="surface">
      <header class="surface-header"><h2>Actividad reciente</h2><span class="caption">{{ total() }} eventos</span></header>
      @if (loading()) {
        <div class="status-message"><span class="spinner"></span></div>
      } @else if (!events().length) {
        <div class="empty-state"><div><app-icon name="shield" /><h2>Sin eventos todavía</h2><p>Los próximos cambios clínicos aparecerán aquí.</p></div></div>
      } @else {
        <div class="data-table-wrap"><table class="data-table">
          <thead><tr><th>Fecha</th><th>Responsable</th><th>Acción</th><th>Módulo / registro</th><th>Campos</th></tr></thead>
          <tbody>@for (event of events(); track event.id) {
            <tr><td>{{ event.occurredAtUtc | date:'dd/MM/yyyy HH:mm' }}</td><td><strong>{{ event.actorEmail || 'Sistema' }}</strong><small>{{ roleLabel(event.actorRole) }}</small></td><td><span class="badge">{{ actionLabel(event.action) }}</span></td><td>{{ entityLabel(event.entityType) }}<small class="record-id">{{ event.entityId }}</small></td><td>{{ fieldsLabel(event) }}</td></tr>
          }</tbody>
        </table></div>
        <div class="pagination">
          <span>Página {{ page() }} de {{ totalPages() }}</span>
          <div class="toolbar">
            <button class="button button-secondary button-small" type="button" [disabled]="page() <= 1 || loading()" (click)="load(page() - 1)">Anterior</button>
            <button class="button button-secondary button-small" type="button" [disabled]="page() >= totalPages() || loading()" (click)="load(page() + 1)">Siguiente</button>
          </div>
        </div>
      }
    </section>
  </div>`,
  styles: [`
    .notice { margin-bottom: 1rem; }
    td small { display:block; margin-top:.2rem; color:var(--text-muted); }
    .record-id { max-width:12rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:monospace; }
    .page-header .badge { display:flex; align-items:center; gap:.4rem; }
  `],
})
export class AuditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly events = signal<AuditEvent[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly page = signal(1);
  totalPages(): number { return Math.max(1, Math.ceil(this.total() / 25)); }
  ngOnInit(): void { this.load(1); }
  load(page: number): void {
    this.loading.set(true);
    this.api.auditEvents(page).subscribe({
      next: (result) => { this.events.set(result.items); this.total.set(result.total); this.page.set(page); this.loading.set(false); },
      error: (error: Error) => { this.loading.set(false); this.toast.show('error', 'No se cargó la auditoría', error.message); },
    });
  }
  roleLabel(role: string): string { return role === 'ClinicAdmin' ? 'Administrador' : role === 'Nutritionist' ? 'Nutricionista' : role; }
  actionLabel(action: string): string {
    const labels: Record<string, string> = { GenerarPDF: 'PDF clínico', DescargarEnlace: 'Descarga por enlace', IniciarSesion: 'Inicio de sesión', AccesoFallido: 'Acceso fallido', ConsultarExpediente: 'Consulta de expediente', ConsultarReporte: 'Consulta de reporte' };
    return labels[action] ?? action;
  }
  fieldsLabel(event: AuditEvent): string {
    // Al crear se guardan todos los campos: listarlos no aporta información.
    if (!event.changedFields || event.action === 'Crear') return '—';
    if (event.action === 'DescargarEnlace') return event.changedFields;
    const names = event.changedFields.split(', ').filter((name) => !TECHNICAL_FIELDS.has(name));
    if (!names.length) return '—';
    const labels = names.slice(0, 6).map((name) => FIELD_LABELS[name] ?? name);
    return names.length > 6 ? `${labels.join(', ')} y ${names.length - 6} más` : labels.join(', ');
  }
  entityLabel(entity: string): string {
    const labels: Record<string, string> = { Patient: 'Paciente', NutritionAssessment: 'Evaluación', AnthropometricMeasurement: 'Antropometría', NutritionDiagnosis: 'Diagnóstico', Consultation: 'Atención', WeeklyFollowUp: 'Seguimiento', MenuPlan: 'Plan de menú', Dish: 'Plato', ApplicationUser: 'Usuario', FoodCatalogImport: 'Catálogo oficial', PatientClinicalReport: 'Reporte clínico', EnergyCalculation: 'Cálculo energético', MessageDispatch: 'Mensaje', FoodItem: 'Alimento', ClinicSettings: 'Configuración', AccessRequest: 'Solicitud de acceso', DishIngredient: 'Ingrediente de plato', MenuPlanItem: 'Alimento del plan', QuickTemplate: 'Plantilla' };
    return labels[entity] ?? entity;
  }
}
