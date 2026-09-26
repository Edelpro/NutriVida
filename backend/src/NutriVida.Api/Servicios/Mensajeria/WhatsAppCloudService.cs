using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace NutriVida.Api.Services.Messaging;

public sealed class WhatsAppCloudOptions
{
    public const string SectionName = "Messaging:WhatsAppCloud";

    public bool Enabled { get; init; }
    public string GraphApiVersion { get; init; } = "v23.0";
    public string PhoneNumberId { get; init; } = string.Empty;
    public string AccessToken { get; init; } = string.Empty;
    public string AppSecret { get; init; } = string.Empty;
    public string VerifyToken { get; init; } = string.Empty;
    public string TemplateName { get; init; } = string.Empty;
    public string TemplateLanguage { get; init; } = "es";
}

public sealed record WhatsAppDocument(
    byte[] Content,
    string FileName,
    string Caption,
    string RecipientPhone);

public sealed record WhatsAppSendResult(string MediaId, string MessageId);

public sealed class WhatsAppCloudException(string message, int? providerStatusCode = null) : Exception(message)
{
    public int? ProviderStatusCode { get; } = providerStatusCode;
}

public interface IWhatsAppDocumentSender
{
    bool IsConfigured { get; }
    Task<WhatsAppSendResult> SendAsync(WhatsAppDocument document, CancellationToken cancellationToken);
}

public sealed class WhatsAppCloudService(
    HttpClient httpClient,
    IOptions<WhatsAppCloudOptions> configuredOptions,
    ILogger<WhatsAppCloudService> logger) : IWhatsAppDocumentSender
{
    private readonly WhatsAppCloudOptions options = configuredOptions.Value;

    public bool IsConfigured => options.Enabled
        && Regex.IsMatch(options.GraphApiVersion, "^v[0-9]+\\.[0-9]+$")
        && options.PhoneNumberId.All(char.IsDigit)
        && options.PhoneNumberId.Length > 5
        && !string.IsNullOrWhiteSpace(options.AccessToken);

    public async Task<WhatsAppSendResult> SendAsync(
        WhatsAppDocument document,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "WhatsApp Business no está configurado. Define PhoneNumberId y AccessToken mediante secretos del entorno.");

        var mediaId = await UploadPdfAsync(document, cancellationToken);
        var messageId = await SendDocumentAsync(document, mediaId, cancellationToken);
        return new WhatsAppSendResult(mediaId, messageId);
    }

    private async Task<string> UploadPdfAsync(
        WhatsAppDocument document,
        CancellationToken cancellationToken)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("whatsapp"), "messaging_product");
        form.Add(new StringContent("application/pdf"), "type");
        var file = new ByteArrayContent(document.Content);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", document.FileName);

        using var request = CreateRequest(HttpMethod.Post, $"{options.GraphApiVersion}/{options.PhoneNumberId}/media");
        request.Content = form;
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw CreateProviderException("Meta rechazó la carga del PDF", response, payload);

        using var json = JsonDocument.Parse(payload);
        if (!json.RootElement.TryGetProperty("id", out var id) || string.IsNullOrWhiteSpace(id.GetString()))
            throw new WhatsAppCloudException("Meta no devolvió el identificador del PDF cargado.");
        return id.GetString()!;
    }

    private async Task<string> SendDocumentAsync(
        WhatsAppDocument document,
        string mediaId,
        CancellationToken cancellationToken)
    {
        object body;
        if (string.IsNullOrWhiteSpace(options.TemplateName))
        {
            body = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = document.RecipientPhone,
                type = "document",
                document = new
                {
                    id = mediaId,
                    caption = Truncate(document.Caption, 1024),
                    filename = document.FileName
                }
            };
        }
        else
        {
            body = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = document.RecipientPhone,
                type = "template",
                template = new
                {
                    name = options.TemplateName,
                    language = new { code = options.TemplateLanguage },
                    components = new[]
                    {
                        new
                        {
                            type = "header",
                            parameters = new[]
                            {
                                new
                                {
                                    type = "document",
                                    document = new { id = mediaId, filename = document.FileName }
                                }
                            }
                        }
                    }
                }
            };
        }
        using var request = CreateRequest(HttpMethod.Post, $"{options.GraphApiVersion}/{options.PhoneNumberId}/messages");
        request.Content = JsonContent.Create(body);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw CreateProviderException("Meta rechazó el envío del PDF", response, payload);

        using var json = JsonDocument.Parse(payload);
        if (!json.RootElement.TryGetProperty("messages", out var messages)
            || messages.GetArrayLength() == 0
            || !messages[0].TryGetProperty("id", out var id)
            || string.IsNullOrWhiteSpace(id.GetString()))
            throw new WhatsAppCloudException("Meta aceptó la solicitud sin devolver el identificador del mensaje.");
        return id.GetString()!;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.AccessToken);
        return request;
    }

    private WhatsAppCloudException CreateProviderException(
        string title,
        HttpResponseMessage response,
        string payload)
    {
        var providerMessage = ReadProviderMessage(payload);
        logger.LogWarning(
            "WhatsApp Cloud respondió {StatusCode}. No se registran token, teléfono ni contenido clínico.",
            (int)response.StatusCode);
        return new WhatsAppCloudException(
            $"{title}. {providerMessage}",
            (int)response.StatusCode);
    }

    private static string ReadProviderMessage(string payload)
    {
        try
        {
            using var json = JsonDocument.Parse(payload);
            if (json.RootElement.TryGetProperty("error", out var error)
                && error.TryGetProperty("message", out var message))
                return message.GetString() ?? "Revisa la configuración de WhatsApp Business.";
        }
        catch (JsonException)
        {
            // La respuesta no es JSON; no se expone el contenido remoto completo.
        }
        return "Revisa la configuración de WhatsApp Business.";
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
