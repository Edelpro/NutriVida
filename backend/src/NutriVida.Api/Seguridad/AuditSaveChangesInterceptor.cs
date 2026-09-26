using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NutriVida.Domain.Auditing;
using NutriVida.Domain.Common;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Security;

public sealed class AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        AddAuditEvents(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AddAuditEvents(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AddAuditEvents(DbContext? context)
    {
        if (context is not NutriVidaDbContext db) return;
        var http = httpContextAccessor.HttpContext;
        if (http?.User.Identity?.IsAuthenticated != true) return;
        if (!Guid.TryParse(http.User.FindFirstValue("clinic_id"), out var clinicId)) return;

        Guid? actorId = Guid.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedActor)
            ? parsedActor
            : null;
        var events = db.ChangeTracker.Entries<BaseEntity>()
            .Where(entry => entry.Entity is not AuditEvent
                && entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Select(entry => new AuditEvent
            {
                ClinicId = clinicId,
                ActorUserId = actorId,
                ActorEmail = http.User.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
                ActorRole = http.User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
                Action = entry.State switch
                {
                    EntityState.Added => "Crear",
                    EntityState.Deleted => "Eliminar",
                    _ when entry.Entity.IsArchived => "Archivar",
                    _ => "Editar"
                },
                EntityType = entry.Metadata.ClrType.Name,
                EntityId = entry.Entity.Id.ToString(),
                ChangedFields = string.Join(", ", entry.Properties
                    .Where(property => entry.State == EntityState.Added || property.IsModified)
                    .Select(property => property.Metadata.Name)
                    .Where(name => name is not nameof(BaseEntity.RowVersion)
                        and not "PasswordHash" and not "PasswordSalt")
                    .OrderBy(name => name)),
                CorrelationId = http.TraceIdentifier,
                OccurredAtUtc = DateTime.UtcNow
            })
            .ToArray();

        if (events.Length > 0) db.AuditEvents.AddRange(events);
    }
}
