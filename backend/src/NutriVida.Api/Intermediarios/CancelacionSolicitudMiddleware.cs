namespace NutriVida.Api.Intermediarios;

/// <summary>
/// Trata como cierre normal las consultas que el navegador cancela al cambiar de pantalla,
/// recargar la aplicación o sustituir una solicitud por otra más reciente.
/// </summary>
public sealed class CancelacionSolicitudMiddleware(RequestDelegate siguiente)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await siguiente(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // El cliente ya cerró la conexión. No hay una respuesta válida que enviar y
            // la cancelación no debe tratarse como un error clínico ni de base de datos.
        }
    }
}
