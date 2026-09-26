using Microsoft.AspNetCore.Http;
using NutriVida.Api.Intermediarios;

namespace NutriVida.IntegrationTests;

public sealed class CancelacionSolicitudMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_IgnoresCancellationWhenBrowserClosedRequest()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var context = new DefaultHttpContext
        {
            RequestAborted = cancellation.Token
        };
        var middleware = new CancelacionSolicitudMiddleware(
            _ => throw new TaskCanceledException("Solicitud sustituida por el navegador."));

        await middleware.InvokeAsync(context);
    }

    [Fact]
    public async Task InvokeAsync_DoesNotHideUnexpectedCancellation()
    {
        var context = new DefaultHttpContext();
        var middleware = new CancelacionSolicitudMiddleware(
            _ => throw new TaskCanceledException("Cancelación interna inesperada."));

        await Assert.ThrowsAsync<TaskCanceledException>(() => middleware.InvokeAsync(context));
    }
}
