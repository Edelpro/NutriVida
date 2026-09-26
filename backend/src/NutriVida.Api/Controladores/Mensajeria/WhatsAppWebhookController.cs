using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NutriVida.Api.Services.Messaging;
using NutriVida.Domain.Communications;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Communications;

[ApiController]
[AllowAnonymous]
[Route("api/communications/whatsapp/webhook")]
public sealed class WhatsAppWebhookController(
    NutriVidaDbContext db,
    IOptions<WhatsAppCloudOptions> configuredOptions,
    ILogger<WhatsAppWebhookController> logger) : ControllerBase
{
    private readonly WhatsAppCloudOptions options = configuredOptions.Value;

    [HttpGet]
    public IActionResult Verify()
    {
        var mode = Request.Query["hub.mode"].ToString();
        var token = Request.Query["hub.verify_token"].ToString();
        var challenge = Request.Query["hub.challenge"].ToString();
        if (mode == "subscribe"
            && !string.IsNullOrWhiteSpace(options.VerifyToken)
            && FixedTimeEquals(token, options.VerifyToken))
            return Content(challenge, "text/plain", Encoding.UTF8);
        return Unauthorized();
    }

    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.AppSecret))
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        await using var buffer = new MemoryStream();
        await Request.Body.CopyToAsync(buffer, cancellationToken);
        var payload = buffer.ToArray();
        if (!HasValidSignature(payload, Request.Headers["X-Hub-Signature-256"].ToString()))
            return Unauthorized();

        try
        {
            using var json = JsonDocument.Parse(payload);
            foreach (var (providerId, providerStatus) in ReadStatuses(json.RootElement))
            {
                var dispatch = await db.MessageDispatches.SingleOrDefaultAsync(
                    x => x.ProviderReference == providerId && !x.IsArchived,
                    cancellationToken);
                if (dispatch is null) continue;
                var nextStatus = MapStatus(providerStatus);
                if (nextStatus.HasValue && Rank(nextStatus.Value) >= Rank(dispatch.Status))
                    dispatch.Status = nextStatus.Value;
            }
            await db.SaveChangesAsync(cancellationToken);
            return Ok();
        }
        catch (JsonException)
        {
            logger.LogWarning("Meta envió un webhook de WhatsApp con JSON no válido.");
            return BadRequest();
        }
    }

    private bool HasValidSignature(byte[] payload, string signatureHeader)
    {
        const string prefix = "sha256=";
        if (!signatureHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        try
        {
            var supplied = Convert.FromHexString(signatureHeader[prefix.Length..]);
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(options.AppSecret));
            var expected = hmac.ComputeHash(payload);
            return supplied.Length == expected.Length
                && CryptographicOperations.FixedTimeEquals(supplied, expected);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool FixedTimeEquals(string supplied, string expected)
    {
        var suppliedBytes = Encoding.UTF8.GetBytes(supplied);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return suppliedBytes.Length == expectedBytes.Length
            && CryptographicOperations.FixedTimeEquals(suppliedBytes, expectedBytes);
    }

    private static IEnumerable<(string Id, string Status)> ReadStatuses(JsonElement root)
    {
        if (!root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
            yield break;
        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty("changes", out var changes) || changes.ValueKind != JsonValueKind.Array)
                continue;
            foreach (var change in changes.EnumerateArray())
            {
                if (!change.TryGetProperty("value", out var value)
                    || !value.TryGetProperty("statuses", out var statuses)
                    || statuses.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var status in statuses.EnumerateArray())
                {
                    if (status.TryGetProperty("id", out var id)
                        && status.TryGetProperty("status", out var state)
                        && !string.IsNullOrWhiteSpace(id.GetString())
                        && !string.IsNullOrWhiteSpace(state.GetString()))
                        yield return (id.GetString()!, state.GetString()!);
                }
            }
        }
    }

    private static MessageStatus? MapStatus(string status) => status.ToLowerInvariant() switch
    {
        "sent" => MessageStatus.Sent,
        "delivered" => MessageStatus.Delivered,
        "read" => MessageStatus.Read,
        "failed" => MessageStatus.Failed,
        _ => null
    };

    private static int Rank(MessageStatus status) => status switch
    {
        MessageStatus.Draft => 0,
        MessageStatus.Queued => 1,
        MessageStatus.Sent => 2,
        MessageStatus.Delivered => 3,
        MessageStatus.Read => 4,
        MessageStatus.Failed => 5,
        _ => 0
    };
}
