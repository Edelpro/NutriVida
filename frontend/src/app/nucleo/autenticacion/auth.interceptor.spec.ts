import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_BASE_URL } from '../configuracion/api.tokens';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const session = {
  accessToken: 'token-inicial',
  expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
  user: {
    id: '1',
    fullName: 'Prueba',
    email: 'prueba@example.test',
    role: 'Nutritionist',
    mustChangePassword: true,
  },
};

describe('sesión', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login('prueba@example.test', 'clave-de-prueba').subscribe();
    http.expectOne('/api/auth/login').flush(session);
  });

  afterEach(() => localStorage.clear());

  it('usa el token nuevo después de cambiar la contraseña temporal', () => {
    const auth = TestBed.inject(AuthService);
    auth.changePassword('clave-de-prueba', 'clave-nueva-de-prueba').subscribe();
    http.expectOne('/api/auth/change-password').flush({
      ...session,
      accessToken: 'token-nuevo',
      user: { ...session.user, mustChangePassword: false },
    });

    expect(auth.user()?.mustChangePassword).toBe(false);
    TestBed.inject(HttpClient).get('/api/dashboard').subscribe();
    const request = http.expectOne('/api/dashboard');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-nuevo');
  });

  it('cierra la sesión cuando la API la rechaza con 401', () => {
    TestBed.inject(HttpClient)
      .get('/api/patients')
      .subscribe({ error: () => undefined });
    http.expectOne('/api/patients').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(localStorage.getItem('nutrivida.accessToken')).toBeNull();
  });

  it('no cierra la sesión por un 403 de permisos', () => {
    TestBed.inject(HttpClient)
      .get('/api/users')
      .subscribe({ error: () => undefined });
    http.expectOne('/api/users').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(TestBed.inject(AuthService).user()).not.toBeNull();
  });
});
