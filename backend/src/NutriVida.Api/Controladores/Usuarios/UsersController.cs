using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Identity;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;

namespace NutriVida.Api.Controllers.Users;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "ClinicAdmin")]
public sealed class UsersController(NutriVidaDbContext db) : ControllerBase
{
    private const string AdminRole = "ClinicAdmin";
    private const string NutritionistRole = "Nutritionist";

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 50);
        var query = db.ApplicationUsers.AsNoTracking()
            .Where(x => x.ClinicId == clinicId && !x.IsArchived);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(x => x.FullName.Contains(term) || x.Email.Contains(term));
        }

        if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
            query = query.Where(x => x.IsActive);
        else if (string.Equals(status, "inactive", StringComparison.OrdinalIgnoreCase))
            query = query.Where(x => !x.IsActive);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new UserListItem(
                x.Id,
                x.FullName,
                x.Email,
                x.Role,
                x.IsActive,
                x.MustChangePassword,
                x.LastLoginAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            items,
            page,
            pageSize,
            total,
            totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize))
        });
    }

    [HttpGet("nutritionists")]
    public async Task<IActionResult> ListNutritionists(CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();

        var items = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.ClinicId == clinicId
                && x.Role == NutritionistRole
                && x.IsActive
                && !x.IsArchived)
            .OrderBy(x => x.FullName)
            .Select(x => new NutritionistOption(x.Id, x.FullName, x.Email))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var role = NormalizeRole(request.Role);
        if (role != NutritionistRole) return InvalidRole();

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.ApplicationUsers.AnyAsync(x => x.Email == email, cancellationToken))
            return Conflict(new
            {
                title = "Correo ya registrado",
                detail = "Ya existe una cuenta con ese correo institucional."
            });

        var credentials = PasswordHasher.Hash(request.TemporaryPassword);
        var user = new ApplicationUser
        {
            ClinicId = clinicId,
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = credentials.Hash,
            PasswordSalt = credentials.Salt,
            Role = role,
            IsActive = true,
            MustChangePassword = request.MustChangePassword
        };

        db.ApplicationUsers.Add(user);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                title = "No se pudo crear la cuenta",
                detail = "El correo ya está en uso. Actualiza la lista e inténtalo nuevamente."
            });
        }

        return Created($"/api/users/{user.Id}", ToListItem(user));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId) || !TryGetUserId(out var currentUserId)) return Forbid();
        var role = NormalizeRole(request.Role);
        if (role is null) return InvalidRole();

        var user = await db.ApplicationUsers.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived,
            cancellationToken);
        if (user is null) return NotFound();

        if (user.Id == currentUserId && !request.IsActive)
            return Conflict(new
            {
                title = "Cambio no permitido",
                detail = "No puedes desactivar tu propia cuenta administradora."
            });

        if (user.Role == AdminRole && (role != AdminRole || !request.IsActive))
            return Conflict(new
            {
                title = "Administrador protegido",
                detail = "NutriVida conserva una sola cuenta Administrador activa. Su rol y estado no se pueden cambiar."
            });
        if (user.Role != AdminRole && role == AdminRole)
            return Conflict(new
            {
                title = "Administrador único",
                detail = "Las cuentas nuevas y existentes del equipo solo pueden tener el rol Nutricionista."
            });

        if (user.Role == NutritionistRole && user.IsActive && !request.IsActive)
        {
            var assignedPatients = await db.Patients.CountAsync(
                patient => patient.ClinicId == clinicId
                    && patient.AssignedNutritionistUserId == user.Id
                    && !patient.IsArchived,
                cancellationToken);
            if (assignedPatients > 0)
                return Conflict(new
                {
                    title = "Reasigna los pacientes primero",
                    detail = $"Este nutricionista tiene {assignedPatients} paciente(s) activo(s) asignado(s). Reasígnalos antes de desactivar la cuenta."
                });
        }

        user.FullName = request.FullName.Trim();
        user.Role = role;
        user.IsActive = request.IsActive;
        user.MustChangePassword = request.MustChangePassword;

        if (!string.IsNullOrWhiteSpace(request.TemporaryPassword))
        {
            var credentials = PasswordHasher.Hash(request.TemporaryPassword);
            user.PasswordHash = credentials.Hash;
            user.PasswordSalt = credentials.Salt;
            user.MustChangePassword = true;
            user.FailedLoginAttempts = 0;
            user.LockedUntilUtc = null;
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToListItem(user));
    }

    private bool TryGetClinicId(out Guid clinicId) =>
        Guid.TryParse(User.FindFirstValue("clinic_id"), out clinicId);

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static string? NormalizeRole(string role)
    {
        if (string.Equals(role?.Trim(), AdminRole, StringComparison.OrdinalIgnoreCase)) return AdminRole;
        if (string.Equals(role?.Trim(), NutritionistRole, StringComparison.OrdinalIgnoreCase)) return NutritionistRole;
        return null;
    }

    private BadRequestObjectResult InvalidRole() => BadRequest(new
    {
        title = "Rol no válido",
        detail = "Solo se pueden registrar cuentas con el rol Nutricionista."
    });

    private static UserListItem ToListItem(ApplicationUser user) => new(
        user.Id,
        user.FullName,
        user.Email,
        user.Role,
        user.IsActive,
        user.MustChangePassword,
        user.LastLoginAtUtc);
}

public sealed record UserListItem(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    bool MustChangePassword,
    DateTime? LastLoginAtUtc);

public sealed record NutritionistOption(Guid Id, string FullName, string Email);

public sealed record CreateUserRequest(
    [Required, MinLength(3), MaxLength(160)] string FullName,
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MaxLength(40)] string Role,
    [Required, MinLength(12), MaxLength(200)] string TemporaryPassword,
    bool MustChangePassword = true);

public sealed record UpdateUserRequest(
    [Required, MinLength(3), MaxLength(160)] string FullName,
    [Required, MaxLength(40)] string Role,
    bool IsActive,
    bool MustChangePassword,
    [MinLength(12), MaxLength(200)] string? TemporaryPassword);
