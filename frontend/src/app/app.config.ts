import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './nucleo/autenticacion/auth.interceptor';
import { API_BASE_URL } from './nucleo/configuracion/api.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: API_BASE_URL,
      useFactory: () =>
        (window as { NUTRIVIDA_CONFIG?: { apiBaseUrl?: string } }).NUTRIVIDA_CONFIG?.apiBaseUrl ??
        'http://localhost:5158/api',
    },
  ],
};
