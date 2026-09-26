import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, AuditEvent } from '../../../../nucleo/api.service';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';

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
            <tr><td>{{ event.occurredAtUtc | date:'dd/MM/yyyy HH:mm' }}</td><td><strong>{{ event.actorEmail || 'Sistema' }}</strong><small>{{ roleLabel(event.actorRole) }}</small></td><td><span class="badge">{{ actionLabel(event.action) }}</span></td><td>{{ entityLabel(event.entityType) }}<small class="record-id">{{ event.entityId }}</small></td><td>{{ event.changedFields || 'Lectura documentada' }}</td></tr>
          }</tbody>
        </table></div>
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
  ngOnInit(): void {
    this.api.auditEvents().subscribe({
      next: (result) => { this.events.set(result.items); this.total.set(result.total); this.loading.set(false); },
      error: (error: Error) => { this.loading.set(false); this.toast.show('error', 'No se cargó la auditoría', error.message); },
    });
  }
  roleLabel(role: string): string { return role === 'ClinicAdmin' ? 'Administrador' : role === 'Nutritionist' ? 'Nutricionista' : role; }
  actionLabel(action: string): string { return action === 'GenerarPDF' ? 'PDF clínico' : action; }
  entityLabel(entity: string): string {
    const labels: Record<string, string> = { Patient: 'Paciente', NutritionAssessment: 'Evaluación', AnthropometricMeasurement: 'Antropometría', NutritionDiagnosis: 'Diagnóstico', Consultation: 'Atención', WeeklyFollowUp: 'Seguimiento', MenuPlan: 'Plan de menú', Dish: 'Plato', ApplicationUser: 'Usuario', FoodCatalogImport: 'Catálogo oficial', PatientClinicalReport: 'Reporte clínico' };
    return labels[entity] ?? entity;
  }
}
