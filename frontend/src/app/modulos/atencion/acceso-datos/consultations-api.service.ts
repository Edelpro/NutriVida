import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import { ConsultationListItem, CreateConsultationRequest, UpdateConsultationRequest } from '../modelos/consultation.models';

@Injectable({ providedIn: 'root' })
export class ConsultationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(date: string): Observable<ConsultationListItem[]> {
    return this.http
      .get<ConsultationListItem[]>(`${this.baseUrl}/consultations`, { params: { date } })
      .pipe(catchError((error) => this.fail(error)));
  }

  listByPatient(patientId: string): Observable<ConsultationListItem[]> {
    return this.http
      .get<ConsultationListItem[]>(`${this.baseUrl}/consultations/by-patient/${patientId}`)
      .pipe(catchError((error) => this.fail(error)));
  }

  create(request: CreateConsultationRequest): Observable<ConsultationListItem> {
    return this.http
      .post<ConsultationListItem>(`${this.baseUrl}/consultations`, request)
      .pipe(catchError((error) => this.fail(error)));
  }

  update(id: string, request: UpdateConsultationRequest): Observable<ConsultationListItem> {
    return this.http
      .put<ConsultationListItem>(`${this.baseUrl}/consultations/${id}`, request)
      .pipe(catchError((error) => this.fail(error)));
  }

  archive(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/consultations/${id}/archive`, {})
      .pipe(catchError((error) => this.fail(error)));
  }

  private fail(error: unknown) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
