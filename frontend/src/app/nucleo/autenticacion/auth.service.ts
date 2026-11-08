import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../configuracion/api.tokens';
import { apiErrorMessage } from '../http/api-error';
import { AuthUser, LoginResponse, UserRole } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokenKey = 'nutrivida.accessToken';
  private readonly userKey = 'nutrivida.user';
  private readonly expiryKey = 'nutrivida.expiresAtUtc';
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  readonly user = signal<AuthUser | null>(this.readUser());
  readonly isAuthenticated = computed(() => !!this.user() && this.hasValidToken());

  constructor() {
    if (this.user()) this.scheduleExpiry();
    else this.clearStoredSession();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap((response) => this.storeSession(response)),
      catchError((error) => throwError(() => new Error(apiErrorMessage(error)))),
    );
  }

  requestAccess(fullName: string, email: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/access-requests`, { fullName, email })
      .pipe(catchError((error) => throwError(() => new Error(apiErrorMessage(error)))));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/auth/change-password`, {
        currentPassword,
        newPassword,
      })
      .pipe(
        tap((response) => this.storeSession(response)),
        map(() => undefined),
        catchError((error) => throwError(() => new Error(apiErrorMessage(error)))),
      );
  }

  logout(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.clearStoredSession();
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }

  private storeSession(response: LoginResponse): void {
    localStorage.setItem(this.tokenKey, response.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    localStorage.setItem(this.expiryKey, response.expiresAtUtc);
    this.user.set(response.user);
    this.scheduleExpiry();
  }

  private clearStoredSession(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.expiryKey);
  }

  hasRole(...roles: UserRole[]): boolean {
    return !!this.user() && roles.includes(this.user()!.role);
  }

  private hasValidToken(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const token = localStorage.getItem(this.tokenKey);
    const expiry = localStorage.getItem(this.expiryKey);
    return !!token && !!expiry && new Date(expiry).getTime() > Date.now();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    const expiry = localStorage.getItem(this.expiryKey);
    const delay = expiry ? new Date(expiry).getTime() - Date.now() : 0;
    if (delay <= 0) {
      this.clearStoredSession();
      this.user.set(null);
      return;
    }
    this.expiryTimer = setTimeout(() => this.logout(), Math.min(delay, 2_147_483_647));
  }

  private readUser(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem(this.userKey);
      const expiry = localStorage.getItem(this.expiryKey);
      return stored && expiry && new Date(expiry).getTime() > Date.now()
        ? JSON.parse(stored)
        : null;
    } catch {
      return null;
    }
  }
}
