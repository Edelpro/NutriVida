import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import { DashboardData } from '../modelos/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getDashboard(): Observable<DashboardData> {
    return this.http
      .get<DashboardData>(`${this.baseUrl}/dashboard`)
      .pipe(catchError((error) => throwError(() => new Error(apiErrorMessage(error)))));
  }
}
