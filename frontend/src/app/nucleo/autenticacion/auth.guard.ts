import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './auth.models';

export const authGuard: CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated())
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (auth.user()?.mustChangePassword && state.url !== '/cambiar-clave')
    return router.createUrlTree(['/cambiar-clave']);
  return true;
};

export const roleGuard =
  (roles: UserRole[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    return auth.hasRole(...roles) ? true : inject(Router).createUrlTree(['/sin-acceso']);
  };
