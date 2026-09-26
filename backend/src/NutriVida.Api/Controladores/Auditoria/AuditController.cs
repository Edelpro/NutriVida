using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Auditing;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "ClinicAdmin")]
public sealed class AuditController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? entityType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(User.FindFirstValue("clinic_id"), out var clinicId)) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 100);
        var query = db.AuditEvents.AsNoTracking().Where(x => x.ClinicId == clinicId);
        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(x => x.EntityType == entityType.Trim());

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.OccurredAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.OccurredAtUtc,
                x.ActorEmail,
                x.ActorRole,
                x.Action,
                x.EntityType,
                x.EntityId,
                x.ChangedFields,
                x.CorrelationId
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items, page, pageSize, total });
    }
}
