using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NutriVida.Api.Services.Messaging;

namespace NutriVida.IntegrationTests;

public sealed class WhatsAppCloudServiceTests
{
    [Fact]
    public async Task SendAsync_UploadsPdfAndSendsDocumentByMediaId()
    {
        var handler = new RecordingHandler(
            Json(HttpStatusCode.OK, "{\"id\":\"media-123\"}"),
            Json(HttpStatusCode.OK, "{\"messages\":[{\"id\":\"wamid.test-456\"}]}"));
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://graph.facebook.com/") };
        var options = Options.Create(new WhatsAppCloudOptions
        {
            Enabled = true,
            GraphApiVersion = "v23.0",
            PhoneNumberId = "123456789",
            AccessToken = "secret-token"
        });
        var service = new WhatsAppCloudService(client, options, NullLogger<WhatsAppCloudService>.Instance);

        var result = await service.SendAsync(new WhatsAppDocument(
            Encoding.UTF8.GetBytes("%PDF-test"),
            "reporte.pdf",
            "Tu plan está listo",
            "593958885668"), CancellationToken.None);

        Assert.Equal("media-123", result.MediaId);
        Assert.Equal("wamid.test-456", result.MessageId);
        Assert.Collection(handler.Requests,
            upload =>
            {
                Assert.Equal("https://graph.facebook.com/v23.0/123456789/media", upload.Uri);
                Assert.StartsWith("multipart/form-data", upload.ContentType);
                Assert.Contains("application/pdf", upload.Body);
                Assert.Contains("reporte.pdf", upload.Body);
                Assert.Equal("Bearer secret-token", upload.Authorization);
            },
            send =>
            {
                Assert.Equal("https://graph.facebook.com/v23.0/123456789/messages", send.Uri);
                Assert.Equal("application/json; charset=utf-8", send.ContentType);
                Assert.Contains("\"to\":\"593958885668\"", send.Body);
                Assert.Contains("\"type\":\"document\"", send.Body);
                Assert.Contains("\"id\":\"media-123\"", send.Body);
                Assert.Equal("Bearer secret-token", send.Authorization);
            });
    }

    [Fact]
    public void IsConfigured_RequiresEnabledPhoneIdAndSecret()
    {
        var service = new WhatsAppCloudService(
            new HttpClient(new RecordingHandler()),
            Options.Create(new WhatsAppCloudOptions { Enabled = true, GraphApiVersion = "v23.0" }),
            NullLogger<WhatsAppCloudService>.Instance);

        Assert.False(service.IsConfigured);
    }

    [Fact]
    public async Task SendAsync_ReportsProviderRejectionWithoutExposingToken()
    {
        var handler = new RecordingHandler(Json(
            HttpStatusCode.BadRequest,
            "{\"error\":{\"message\":\"Invalid test phone number\"}}"));
        var service = new WhatsAppCloudService(
            new HttpClient(handler) { BaseAddress = new Uri("https://graph.facebook.com/") },
            Options.Create(new WhatsAppCloudOptions
            {
                Enabled = true,
                GraphApiVersion = "v23.0",
                PhoneNumberId = "123456789",
                AccessToken = "secret-token"
            }),
            NullLogger<WhatsAppCloudService>.Instance);

        var exception = await Assert.ThrowsAsync<WhatsAppCloudException>(() => service.SendAsync(
            new WhatsAppDocument([1, 2, 3], "reporte.pdf", "Plan", "593958885668"),
            CancellationToken.None));

        Assert.Equal(400, exception.ProviderStatusCode);
        Assert.Contains("Invalid test phone number", exception.Message);
        Assert.DoesNotContain("secret-token", exception.Message);
    }

    private static HttpResponseMessage Json(HttpStatusCode statusCode, string body) => new(statusCode)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json")
    };

    private sealed record RecordedRequest(string Uri, string Authorization, string ContentType, string Body);

    private sealed class RecordingHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> queuedResponses = new(responses);
        public List<RecordedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(new RecordedRequest(
                request.RequestUri?.ToString() ?? string.Empty,
                request.Headers.Authorization?.ToString() ?? string.Empty,
                request.Content?.Headers.ContentType?.ToString() ?? string.Empty,
                request.Content is null
                    ? string.Empty
                    : await request.Content.ReadAsStringAsync(cancellationToken)));
            if (queuedResponses.Count == 0)
                throw new InvalidOperationException("No se configuró una respuesta para la solicitud HTTP.");
            return queuedResponses.Dequeue();
        }
    }
}
