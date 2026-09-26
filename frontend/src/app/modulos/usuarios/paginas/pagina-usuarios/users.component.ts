import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  defer,
  distinctUntilChanged,
  finalize,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';
import { UserRole } from '../../../../nucleo/autenticacion/auth.models';
import { UsersApiService } from '../../acceso-datos/users-api.service';
import { AccessRequestItem, UserFormValue, UserListItem } from '../../modelos/user.models';

@Component({
  selector: 'app-users',
  imports: [FormsModule, IconComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent {
  @ViewChild('userDialog') private userDialog?: ElementRef<HTMLDialogElement>;

  private readonly api = inject(UsersApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private readonly loadRequests = new Subject<void>();

  readonly users = signal<UserListItem[]>([]);
  readonly accessRequests = signal<AccessRequestItem[]>([]);
  readonly requestsLoading = signal(false);
  readonly requestsError = signal('');
  readonly requestActionId = signal<string | null>(null);
  readonly rejectingRequestId = signal<string | null>(null);
  readonly selectedAccessRequest = signal<AccessRequestItem | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly editingUser = signal<UserListItem | null>(null);
  readonly submitted = signal(false);
  readonly confirming = signal(false);
  readonly showPassword = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  query = '';
  status = '';
  model: UserFormValue = this.emptyModel();

  constructor() {
    this.loadRequests
      .pipe(
        startWith(void 0),
        switchMap(() =>
          defer(() => {
            this.loading.set(true);
            this.error.set('');
            return this.api.list(this.query.trim(), this.status, this.page()).pipe(
              catchError((error: Error) => {
                this.error.set(error.message);
                return of(null);
              }),
              finalize(() => this.loading.set(false)),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        this.users.set(result.items);
        this.page.set(result.page);
        this.total.set(result.total);
        this.totalPages.set(result.totalPages);
      });

    this.loadAccessRequests();

    this.searchChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadRequests.next();
      });
  }

  onSearch(value: string): void {
    this.query = value;
    this.searchChanges.next(value.trim());
  }

  clearSearch(input: HTMLInputElement): void {
    this.query = '';
    this.searchChanges.next('');
    input.focus();
  }

  applyStatus(): void {
    this.page.set(1);
    this.loadRequests.next();
  }

  changePage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages() || nextPage === this.page()) return;
    this.page.set(nextPage);
    this.loadRequests.next();
  }

  retry(): void {
    this.loadRequests.next();
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.selectedAccessRequest.set(null);
    this.model = this.emptyModel();
    this.openDialog();
  }

  openApproval(request: AccessRequestItem): void {
    this.editingUser.set(null);
    this.selectedAccessRequest.set(request);
    this.model = {
      ...this.emptyModel(),
      fullName: request.fullName,
      email: request.email,
    };
    this.openDialog();
  }

  openEdit(user: UserListItem): void {
    this.editingUser.set(user);
    this.selectedAccessRequest.set(null);
    this.model = {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      temporaryPassword: '',
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
    this.openDialog();
  }

  requestSave(form: NgForm): void {
    this.submitted.set(true);
    this.formError.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.formError.set('Revisa los campos marcados antes de continuar.');
      queueMicrotask(() =>
        this.userDialog?.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    this.confirming.set(true);
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.formError.set('');
    const current = this.editingUser();
    const accessRequest = this.selectedAccessRequest();
    const request = accessRequest
      ? this.api.approveAccessRequest(accessRequest.id, this.model.temporaryPassword)
      : current
      ? this.api.update(current.id, {
          fullName: this.model.fullName.trim(),
          role: this.model.role,
          isActive: this.model.isActive,
          mustChangePassword: this.model.mustChangePassword,
          temporaryPassword: this.model.temporaryPassword.trim() || null,
        })
      : this.api.create({
          fullName: this.model.fullName.trim(),
          email: this.model.email.trim().toLowerCase(),
          role: this.model.role,
          temporaryPassword: this.model.temporaryPassword,
          mustChangePassword: this.model.mustChangePassword,
        });

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.toast.show(
          'success',
          accessRequest ? 'Solicitud aprobada' : current ? 'Cambios guardados' : 'Usuario creado',
          accessRequest
            ? `La solicitud de ${this.model.fullName} fue aprobada y la cuenta ya está activa.`
            : current
            ? `La cuenta de ${this.model.fullName} fue actualizada.`
            : `La cuenta de ${this.model.fullName} ya puede ingresar.`,
        );
        this.loadAccessRequests();
        this.loadRequests.next();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.confirming.set(false);
        this.formError.set(error.message);
      },
    });
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.userDialog?.nativeElement.close();
  }

  resetDialogState(): void {
    this.confirming.set(false);
    this.submitted.set(false);
    this.showPassword.set(false);
    this.formError.set('');
  }

  requestRejection(id: string): void {
    this.rejectingRequestId.set(id);
  }

  cancelRejection(): void {
    this.rejectingRequestId.set(null);
  }

  confirmReject(request: AccessRequestItem): void {
    if (this.requestActionId()) return;
    this.requestActionId.set(request.id);
    this.api
      .rejectAccessRequest(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.requestActionId.set(null);
          this.rejectingRequestId.set(null);
          this.toast.show('success', 'Solicitud rechazada', `No se creó la cuenta de ${request.fullName}.`);
          this.loadAccessRequests();
        },
        error: (error: Error) => {
          this.requestActionId.set(null);
          this.toast.show('error', 'No se pudo rechazar', error.message);
        },
      });
  }

  isCurrentUser(user: UserListItem): boolean {
    return user.id === this.auth.user()?.id;
  }

  roleLabel(role: UserRole): string {
    return {
      ClinicAdmin: 'Administrador',
      Nutritionist: 'Nutricionista',
    }[role];
  }

  formatLastAccess(value: string | null): string {
    if (!value) return 'Aún no ingresa';
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Guayaquil',
    }).format(new Date(value));
  }

  rangeStart(): number {
    return this.total() === 0 ? 0 : (this.page() - 1) * 10 + 1;
  }

  rangeEnd(): number {
    return Math.min(this.page() * 10, this.total());
  }

  private openDialog(): void {
    this.resetDialogState();
    queueMicrotask(() => this.userDialog?.nativeElement.showModal());
  }

  refreshAccessRequests(): void {
    if (this.requestsLoading()) return;
    this.loadAccessRequests();
  }

  private loadAccessRequests(): void {
    this.requestsLoading.set(true);
    this.requestsError.set('');
    this.api
      .accessRequests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.accessRequests.set(items);
          this.requestsLoading.set(false);
        },
        error: (error: Error) => {
          this.requestsLoading.set(false);
          this.requestsError.set(error.message);
          this.toast.show('error', 'No se cargaron las solicitudes', error.message);
        },
      });
  }

  private emptyModel(): UserFormValue {
    return {
      fullName: '',
      email: '',
      role: 'Nutritionist',
      temporaryPassword: '',
      isActive: true,
      mustChangePassword: true,
    };
  }
}
