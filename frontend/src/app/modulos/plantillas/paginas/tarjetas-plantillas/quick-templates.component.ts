import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { QuickTemplatesApiService } from '../../acceso-datos/quick-templates-api.service';
import {
  QUICK_TEMPLATE_SCOPE_CONFIG,
  QuickTemplate,
  QuickTemplateRequest,
  QuickTemplateScope,
} from '../../modelos/quick-template.models';

@Component({
  selector: 'app-quick-templates',
  imports: [FormsModule, IconComponent],
  templateUrl: './quick-templates.component.html',
  styleUrl: './quick-templates.component.scss',
})
export class QuickTemplatesComponent implements OnInit {
  @ViewChild('templateDialog') private templateDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('archiveDialog') private archiveDialog?: ElementRef<HTMLDialogElement>;
  readonly templateSelected = output<QuickTemplate>();
  readonly scope = input.required<QuickTemplateScope>();
  private readonly api = inject(QuickTemplatesApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly templates = signal<QuickTemplate[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly editing = signal<QuickTemplate | null>(null);
  readonly archiving = signal<QuickTemplate | null>(null);
  readonly config = computed(() => QUICK_TEMPLATE_SCOPE_CONFIG[this.scope()]);
  model!: QuickTemplateRequest;

  ngOnInit(): void {
    this.model = this.emptyModel();
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.templates.set(rows),
        error: (error: Error) => this.error.set(error.message),
      });
  }
  contentOf(template: QuickTemplate): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [];
    for (const field of this.config().fields) {
      const value = template.values[field.key];
      if (!value) continue;
      rows.push({
        label: field.label,
        value: field.options?.find((option) => option.value === value)?.label ?? value,
      });
    }
    if (template.values['itemsJson']) {
      try {
        const items = JSON.parse(template.values['itemsJson']) as { foodNameSnapshot: string }[];
        rows.push({ label: `Alimentos (${items.length})`, value: items.map((item) => item.foodNameSnapshot).join(', ') });
      } catch {
        rows.push({ label: 'Alimentos', value: 'No se pudieron leer' });
      }
    }
    return rows;
  }
  use(template: QuickTemplate): void {
    this.templateSelected.emit(template);
    this.toast.show(
      'success',
      'Plantilla aplicada',
      'Revisa y personaliza el borrador antes de guardarlo.',
    );
  }
  openCreate(): void {
    this.editing.set(null);
    this.model = this.emptyModel();
    this.formError.set('');
    queueMicrotask(() => this.templateDialog?.nativeElement.showModal());
  }
  openEdit(template: QuickTemplate): void {
    this.editing.set(template);
    this.model = {
      name: template.name,
      scope: template.scope,
      category: template.category,
      objective: template.objective,
      summary: template.summary,
      values: { ...template.values },
    };
    this.formError.set('');
    queueMicrotask(() => this.templateDialog?.nativeElement.showModal());
  }
  save(form: NgForm): void {
    this.formError.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.formError.set('Completa los campos marcados.');
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    const current = this.editing();
    const request = current ? this.api.update(current.id, this.model) : this.api.create(this.model);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.templateDialog?.nativeElement.close();
        this.toast.show('success', current ? 'Plantilla actualizada' : 'Plantilla creada');
        this.load();
      },
      error: (error: Error) => this.formError.set(error.message),
    });
  }
  requestArchive(template: QuickTemplate): void {
    if (!this.canArchive()) return;
    this.archiving.set(template);
    queueMicrotask(() => this.archiveDialog?.nativeElement.showModal());
  }
  confirmArchive(): void {
    const template = this.archiving();
    if (!template || this.saving()) return;
    this.saving.set(true);
    this.api
      .archive(template.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.archiveDialog?.nativeElement.close();
          this.archiving.set(null);
          this.toast.show('success', 'Plantilla archivada');
          this.load();
        },
        error: (error: Error) =>
          this.toast.show('error', 'No se archivó la plantilla', error.message),
      });
  }
  canArchive(): boolean {
    return this.auth.hasRole('ClinicAdmin');
  }
  closeEditor(): void {
    if (!this.saving()) this.templateDialog?.nativeElement.close();
  }
  closeArchive(): void {
    if (!this.saving()) this.archiveDialog?.nativeElement.close();
  }
  private emptyModel(): QuickTemplateRequest {
    return {
      name: '',
      scope: this.scope(),
      category: 'Objetivo',
      objective: '',
      summary: '',
      values: Object.fromEntries(this.config().fields.map((field) => [field.key, ''])),
    };
  }
}
