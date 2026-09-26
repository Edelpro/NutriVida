import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, IconComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly error = signal('');

  currentPassword = '';
  newPassword = '';
  confirmation = '';

  submit(form: NgForm): void {
    this.submitted.set(true);
    this.error.set('');
    if (form.invalid || this.newPassword !== this.confirmation) {
      form.control.markAllAsTouched();
      this.error.set(
        this.newPassword !== this.confirmation
          ? 'La confirmación no coincide con la contraseña nueva.'
          : 'Revisa los campos marcados antes de continuar.',
      );
      return;
    }

    this.saving.set(true);
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.show('success', 'Contraseña actualizada', 'Ya puedes utilizar NutriVida.');
        void this.router.navigateByUrl('/inicio');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.error.set(error.message);
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
