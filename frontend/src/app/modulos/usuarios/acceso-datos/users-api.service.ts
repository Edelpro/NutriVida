import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import {
  AccessRequestItem,
  CreateUserRequest,
  PagedUsers,
  UpdateUserRequest,
  UserListItem,
} from '../modelos/user.models';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(query = '', status = '', page = 1): Observable<PagedUsers> {
    const params = new HttpParams()
      .set('q', query)
      .set('status', status)
      .set('page', page)
      .set('pageSize', 10);
    return this.http
      .get<PagedUsers>(`${this.baseUrl}/users`, { params })
      .pipe(catchError((error) => this.fail(error)));
  }

  create(body: CreateUserRequest): Observable<UserListItem> {
    return this.http
      .post<UserListItem>(`${this.baseUrl}/users`, body)
      .pipe(catchError((error) => this.fail(error)));
  }

  update(id: string, body: UpdateUserRequest): Observable<UserListItem> {
    return this.http
      .put<UserListItem>(`${this.baseUrl}/users/${id}`, body)
      .pipe(catchError((error) => this.fail(error)));
  }

  accessRequests(): Observable<AccessRequestItem[]> {
    return this.http
      .get<AccessRequestItem[]>(`${this.baseUrl}/access-requests`)
      .pipe(catchError((error) => this.fail(error)));
  }

  approveAccessRequest(id: string, temporaryPassword: string): Observable<unknown> {
    return this.http
      .post(`${this.baseUrl}/access-requests/${id}/approve`, { temporaryPassword })
      .pipe(catchError((error) => this.fail(error)));
  }

  rejectAccessRequest(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/access-requests/${id}/reject`, {})
      .pipe(catchError((error) => this.fail(error)));
  }

  private fail(error: unknown) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
