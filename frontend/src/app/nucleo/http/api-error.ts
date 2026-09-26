import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const validationMessages = Object.values(error.error?.errors ?? {})
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return (
      validationMessages[0] ||
      error.error?.detail ||
      error.error?.title ||
      (error.status === 0
        ? 'No hay conexión con la API. Comprueba que NutriVida.Api esté ejecutándose.'
        : 'El servidor no pudo completar la solicitud.')
    );
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
