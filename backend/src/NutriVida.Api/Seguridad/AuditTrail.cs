using System.Security.Claims;
using NutriVida.Domain.Auditing;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Security;

public static class AuditTrail
{
    /// <summary>Registra una acción que no cambia datos, como consultar un expediente.</summary>
    public static void Record(this NutriVidaDbContext db, HttpContext http, Guid clinicId, string action,
        string entityType, string entityId, string details = "")
    {
        var user = http.User;
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = clinicId,
            ActorUserId = user.TryGetUserId(out var userId) ? userId : null,
            ActorEmail = user.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
            ActorRole = user.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ChangedFields = details,
            CorrelationId = http.TraceIdentifier,
            OccurredAtUtc = DateTime.UtcNow
        });
    }
}
