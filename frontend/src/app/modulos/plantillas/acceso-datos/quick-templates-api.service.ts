import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import {
  QuickTemplate,
  QuickTemplateRequest,
  QuickTemplateScope,
} from '../modelos/quick-template.models';

@Injectable({ providedIn: 'root' })
export class QuickTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(scope: QuickTemplateScope): Observable<QuickTemplate[]> {
    return this.http
      .get<QuickTemplate[]>(`${this.base}/quick-templates`, { params: { scope } })
      .pipe(catchError((e) => this.fail(e)));
  }
  create(body: QuickTemplateRequest): Observable<QuickTemplate> {
    return this.http
      .post<QuickTemplate>(`${this.base}/quick-templates`, body)
      .pipe(catchError((e) => this.fail(e)));
  }
  update(id: string, body: QuickTemplateRequest): Observable<QuickTemplate> {
    return this.http
      .put<QuickTemplate>(`${this.base}/quick-templates/${id}`, body)
      .pipe(catchError((e) => this.fail(e)));
  }
  archive(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/quick-templates/${id}/archive`, {})
      .pipe(catchError((e) => this.fail(e)));
  }
  private fail(error: unknown) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
