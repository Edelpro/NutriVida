import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, finalize, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../configuracion/api.tokens';
import { apiErrorMessage } from '../http/api-error';

export interface PatientContextItem {
  id: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  status: string;
  assignedNutritionistUserId: string | null;
  assignedNutritionistName: string | null;
}

export interface PatientContextDetails extends PatientContextItem {
  sexAtBirth: number;
  occupation: string;
  goal: string;
  emailConsent: boolean;
  whatsAppConsent: boolean;
  rowVersion: string;
}

@Injectable({ providedIn: 'root' })
export class PatientContextService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'nutrivida.activePatientId';
  private readonly detailsRequests = new Subject<string>();
  readonly patients = signal<PatientContextItem[]>([]);
  readonly selectedId = signal(this.readStoredId());
  readonly selected = computed(
    () => this.patients().find((patient) => patient.id === this.selectedId()) ?? null,
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly details = signal<PatientContextDetails | null>(null);
  readonly detailsLoading = signal(false);
  readonly detailsError = signal('');
  private loaded = false;

  constructor() {
    this.detailsRequests
      .pipe(
        tap(() => {
          this.details.set(null);
          this.detailsError.set('');
          this.detailsLoading.set(true);
        }),
        switchMap((patientId) =>
          patientId
            ? this.http.get<PatientContextDetails>(`${this.baseUrl}/patients/${patientId}`).pipe(
                catchError((error) => {
                  this.detailsError.set(apiErrorMessage(error));
                  return of(null);
                }),
              )
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((details) => {
        this.details.set(details);
        this.detailsLoading.set(false);
      });
  }

  load(force = false): void {
    if (this.loading() || (this.loaded && !force)) return;
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<{ items: PatientContextItem[] }>(`${this.baseUrl}/patients`, {
        params: { page: 1, pageSize: 50 },
      })
      .pipe(
        catchError((error) => {
          this.error.set(apiErrorMessage(error));
          return throwError(() => error);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.loaded = true;
          this.patients.set(result.items);
          const currentExists = result.items.some((patient) => patient.id === this.selectedId());
          if (!currentExists) this.select(result.items[0]?.id ?? '');
          else this.loadDetails(this.selectedId());
        },
        error: () => this.patients.set([]),
      });
  }

  select(patientId: string): void {
    this.selectedId.set(patientId);
    this.loadDetails(patientId);
    if (typeof localStorage === 'undefined') return;
    try {
      if (patientId) localStorage.setItem(this.storageKey, patientId);
      else localStorage.removeItem(this.storageKey);
    } catch {
      // El contexto continúa en memoria cuando el navegador bloquea el almacenamiento local.
    }
  }

  refresh(selectPatientId?: string): void {
    if (selectPatientId) this.select(selectPatientId);
    this.loaded = false;
    this.load(true);
  }

  private readStoredId(): string {
    if (typeof localStorage === 'undefined') return '';
    try {
      return localStorage.getItem(this.storageKey) ?? '';
    } catch {
      return '';
    }
  }

  private loadDetails(patientId: string): void {
    this.detailsRequests.next(patientId);
  }
}
