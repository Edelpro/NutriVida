import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ToastService } from '../../compartido/notificaciones/toast.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token =
    typeof localStorage === 'undefined' ? null : localStorage.getItem('nutrivida.accessToken');
  return next(
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request,
  ).pipe(
    tap({
      error: (error: unknown) => {
        // La API revocó la sesión: cuenta desactivada o contraseña cambiada en otro equipo.
        const revoked = token && error instanceof HttpErrorResponse && error.status === 401;
        if (!revoked || !auth.user()) return;
        auth.logout();
        toast.show('info', 'Tu sesión terminó', 'Vuelve a ingresar para continuar.');
      },
    }),
  );
};
