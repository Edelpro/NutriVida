import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '../../../../compartido/icono/icon.component';
import { ToastService } from '../../../../compartido/notificaciones/toast.service';
import { AuthService } from '../../../../nucleo/autenticacion/auth.service';

type AccessMode = 'login' | 'request';

@Component({
  selector: 'app-login',
  imports: [FormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly mode = signal<AccessMode>('login');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly loginSubmitted = signal(false);
  readonly requestSubmitted = signal(false);
  readonly requestPrepared = signal(false);
  readonly error = signal('');
  readonly requestError = signal('');

  email = '';
  password = '';
  requestName = '';
  requestEmail = '';

  switchMode(mode: AccessMode): void {
    this.mode.set(mode);
    this.error.set('');
    this.loginSubmitted.set(false);
    this.requestSubmitted.set(false);
    this.requestPrepared.set(false);
    this.requestError.set('');
  }

  submit(form: NgForm): void {
    this.loginSubmitted.set(true);
    this.error.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de ingresar.');
      return;
    }

    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (response) => {
        this.loading.set(false);
        const destination = response.user.mustChangePassword
          ? '/cambiar-clave'
          : this.route.snapshot.queryParamMap.get('returnUrl') || '/inicio';
        void this.router.navigateByUrl(destination);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.password = '';
        this.error.set(
          error.message.includes('No hay conexión con la API')
            ? 'Servidor no disponible. Inicia NutriVida.Api en Visual Studio y vuelve a intentarlo.'
            : 'El correo o la contraseña no son correctos. Verifica tus datos.',
        );
      },
    });
  }

  prepareRequest(form: NgForm): void {
    this.requestSubmitted.set(true);
    this.requestError.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (this.loading()) return;
    this.loading.set(true);
    this.auth
      .requestAccess(this.requestName.trim(), this.requestEmail.trim().toLowerCase())
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.requestPrepared.set(true);
          this.toast.show(
            'success',
            'Solicitud enviada',
            'Administración ya puede revisarla en Usuarios y roles.',
          );
        },
        error: (error: Error) => {
          this.loading.set(false);
          this.requestError.set(error.message);
        },
      });
  }

}
