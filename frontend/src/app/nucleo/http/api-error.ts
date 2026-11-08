import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const validationMessages = Object.values(error.error?.errors ?? {})
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return (
      validationMessages[0] ||
      error.error?.detail ||
      // El título automático de un 404 llega en inglés ("Not Found").
      (error.status === 404
        ? 'No se encontró. Puede que ya no exista o que no esté asignado a tu cuenta.'
        : error.error?.title) ||
      (error.status === 0
        ? 'No hay conexión con la API. Comprueba que NutriVida.Api esté ejecutándose.'
        : 'El servidor no pudo completar la solicitud.')
    );
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
