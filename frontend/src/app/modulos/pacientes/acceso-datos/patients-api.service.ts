import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import {
  CreatePatientRequest,
  NutritionistOption,
  PagedPatients,
  PatientDetails,
  UpdatePatientRequest,
} from '../modelos/patient.models';

@Injectable({ providedIn: 'root' })
export class PatientsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query = '', page = 1, archived = false): Observable<PagedPatients> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page)
      .set('pageSize', 10)
      .set('archived', archived);
    return this.http
      .get<PagedPatients>(`${this.baseUrl}/patients`, { params })
      .pipe(catchError((error) => this.fail(error)));
  }

  restore(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/patients/${id}/restore`, {})
      .pipe(catchError((error) => this.fail(error)));
  }

  nutritionists(): Observable<NutritionistOption[]> {
    return this.http
      .get<NutritionistOption[]>(`${this.baseUrl}/users/nutritionists`)
      .pipe(catchError((error) => this.fail(error)));
  }

  get(id: string): Observable<PatientDetails> {
    return this.http
      .get<PatientDetails>(`${this.baseUrl}/patients/${id}`)
      .pipe(catchError((error) => this.fail(error)));
  }

  create(body: CreatePatientRequest): Observable<PatientDetails> {
    return this.http
      .post<PatientDetails>(`${this.baseUrl}/patients`, body)
      .pipe(catchError((error) => this.fail(error)));
  }

  update(id: string, body: UpdatePatientRequest): Observable<PatientDetails> {
    return this.http
      .put<PatientDetails>(`${this.baseUrl}/patients/${id}`, body)
      .pipe(catchError((error) => this.fail(error)));
  }

  archive(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/patients/${id}/archive`, {})
      .pipe(catchError((error) => this.fail(error)));
  }

  private fail(error: unknown) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
