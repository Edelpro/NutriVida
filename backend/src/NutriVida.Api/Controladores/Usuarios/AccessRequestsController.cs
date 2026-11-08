using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Identity;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;

namespace NutriVida.Api.Controllers.Users;

[ApiController]
[Route("api/access-requests")]
public sealed class AccessRequestsController(NutriVidaDbContext db) : ControllerBase
{
    private const string AdminRole = "ClinicAdmin";
    private const string NutritionistRole = "Nutritionist";

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Create(
        CreateAccessRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var clinicId = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.Role == AdminRole && x.IsActive && !x.IsArchived)
            .Select(x => (Guid?)x.ClinicId)
            .SingleOrDefaultAsync(cancellationToken);
        if (!clinicId.HasValue)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                title = "Solicitudes no disponibles",
                detail = "No existe una cuenta administradora activa para revisar la solicitud."
            });

        // Misma respuesta en todos los casos: este formulario es público y no debe revelar qué correos existen.
        var alreadyKnown = await db.ApplicationUsers.AnyAsync(x => x.Email == email && !x.IsArchived, cancellationToken)
            || await db.AccessRequests.AnyAsync(
                x => x.ClinicId == clinicId.Value && x.Email == email
                    && x.Status == AccessRequestStatus.Pending && !x.IsArchived,
                cancellationToken);
        if (alreadyKnown)
            return Accepted(new { fullName = request.FullName.Trim(), email, role = NutritionistRole, status = "Pending" });

        var accessRequest = new AccessRequest
        {
            ClinicId = clinicId.Value,
            FullName = request.FullName.Trim(),
            Email = email,
            RequestedRole = NutritionistRole
        };
        db.AccessRequests.Add(accessRequest);
        await db.SaveChangesAsync(cancellationToken);

        return Accepted(new
        {
            accessRequest.Id,
            accessRequest.FullName,
            accessRequest.Email,
            role = NutritionistRole,
            status = "Pending"
        });
    }

    [HttpGet]
    [Authorize(Roles = AdminRole)]
    public async Task<IActionResult> List(
        [FromQuery] string status = "pending",
        CancellationToken cancellationToken = default)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();

        var normalizedStatus = status.Trim().ToLowerInvariant() switch
        {
            "approved" => AccessRequestStatus.Approved,
            "rejected" => AccessRequestStatus.Rejected,
            _ => AccessRequestStatus.Pending
        };
        var items = await db.AccessRequests.AsNoTracking()
            .Where(x => x.ClinicId == clinicId && x.Status == normalizedStatus && !x.IsArchived)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new AccessRequestItem(
                x.Id,
                x.FullName,
                x.Email,
                x.RequestedRole,
                x.Status.ToString(),
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = AdminRole)]
    public async Task<IActionResult> Approve(
        Guid id,
        ApproveAccessRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId) || !TryGetUserId(out var reviewerId)) return Forbid();
        var accessRequest = await db.AccessRequests.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived,
            cancellationToken);
        if (accessRequest is null) return NotFound();
        if (accessRequest.Status != AccessRequestStatus.Pending)
            return Conflict(new
            {
                title = "Solicitud ya revisada",
                detail = "Actualiza la lista para consultar su estado actual."
            });
        if (await db.ApplicationUsers.AnyAsync(x => x.Email == accessRequest.Email, cancellationToken))
            return Conflict(new
            {
                title = "Correo ya registrado",
                detail = "Ya existe una cuenta con el correo de esta solicitud."
            });

        var credentials = PasswordHasher.Hash(request.TemporaryPassword);
        var user = new ApplicationUser
        {
            ClinicId = clinicId,
            FullName = accessRequest.FullName,
            Email = accessRequest.Email,
            PasswordHash = credentials.Hash,
            PasswordSalt = credentials.Salt,
            Role = NutritionistRole,
            IsActive = true,
            MustChangePassword = true
        };
        accessRequest.Status = AccessRequestStatus.Approved;
        accessRequest.ReviewedByUserId = reviewerId;
        accessRequest.ReviewedAtUtc = DateTime.UtcNow;
        db.ApplicationUsers.Add(user);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                title = "No se pudo aprobar",
                detail = "El correo ya está en uso. Actualiza la lista e inténtalo nuevamente."
            });
        }

        return Ok(new
        {
            requestId = accessRequest.Id,
            userId = user.Id,
            user.FullName,
            user.Email,
            user.Role
        });
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = AdminRole)]
    public async Task<IActionResult> Reject(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId) || !TryGetUserId(out var reviewerId)) return Forbid();
        var accessRequest = await db.AccessRequests.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived,
            cancellationToken);
        if (accessRequest is null) return NotFound();
        if (accessRequest.Status != AccessRequestStatus.Pending)
            return Conflict(new
            {
                title = "Solicitud ya revisada",
                detail = "Actualiza la lista para consultar su estado actual."
            });

        accessRequest.Status = AccessRequestStatus.Rejected;
        accessRequest.ReviewedByUserId = reviewerId;
        accessRequest.ReviewedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private bool TryGetClinicId(out Guid clinicId) =>
        Guid.TryParse(User.FindFirstValue("clinic_id"), out clinicId);

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}

public sealed record CreateAccessRequest(
    [Required, MinLength(3), MaxLength(160)] string FullName,
    [Required, EmailAddress, MaxLength(180)] string Email);

public sealed record ApproveAccessRequest(
    [Required, MinLength(12), MaxLength(200)] string TemporaryPassword);

public sealed record AccessRequestItem(
    Guid Id,
    string FullName,
    string Email,
    string RequestedRole,
    string Status,
    DateTime CreatedAtUtc);
