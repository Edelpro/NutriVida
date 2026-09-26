import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, expand, reduce, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../nucleo/configuracion/api.tokens';
import { apiErrorMessage } from '../../../nucleo/http/api-error';
import { Dish, DishRequest, PagedDishes } from '../modelos/dish.models';

@Injectable({ providedIn: 'root' })
export class DishesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(query = '', mealName = '', maxCost = '', page = 1, pageSize = 10): Observable<PagedDishes> {
    let params = new HttpParams()
      .set('q', query)
      .set('mealName', mealName)
      .set('page', page)
      .set('pageSize', pageSize);
    if (maxCost) params = params.set('maxCostPerServing', maxCost);
    return this.http
      .get<PagedDishes>(`${this.base}/dishes`, { params })
      .pipe(catchError((e) => this.fail(e)));
  }

  listAll(): Observable<Dish[]> {
    const pageSize = 50;
    return this.list('', '', '', 1, pageSize).pipe(
      expand((result) =>
        result.page < result.totalPages ? this.list('', '', '', result.page + 1, pageSize) : EMPTY,
      ),
      reduce((all, result) => [...all, ...result.items], [] as Dish[]),
    );
  }

  create(body: DishRequest): Observable<Dish> {
    return this.http.post<Dish>(`${this.base}/dishes`, body).pipe(catchError((e) => this.fail(e)));
  }

  update(id: string, body: DishRequest): Observable<Dish> {
    return this.http
      .put<Dish>(`${this.base}/dishes/${id}`, body)
      .pipe(catchError((e) => this.fail(e)));
  }

  archive(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/dishes/${id}/archive`, {})
      .pipe(catchError((e) => this.fail(e)));
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<{ url: string }>(`${this.base}/dishes/media/image`, body)
      .pipe(catchError((e) => this.fail(e)));
  }

  private fail(error: unknown) {
    return throwError(() => new Error(apiErrorMessage(error)));
  }
}
