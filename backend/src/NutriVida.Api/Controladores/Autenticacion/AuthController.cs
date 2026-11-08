using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;
using NutriVida.Domain.Auditing;
using NutriVida.Domain.Identity;

namespace NutriVida.Api.Controllers.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(NutriVidaDbContext db, IConfiguration configuration) : ControllerBase
{
    private static readonly (string Hash, string Salt) UnknownUserCredentials =
        PasswordHasher.Hash(Guid.NewGuid().ToString());

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.ApplicationUsers.SingleOrDefaultAsync(
            x => x.Email == normalizedEmail && x.IsActive && !x.IsArchived, cancellationToken);
        var now = DateTime.UtcNow;
        // Se calcula siempre para que el tiempo de respuesta no revele si la cuenta existe.
        var passwordMatches = user is null
            ? PasswordHasher.Verify(request.Password, UnknownUserCredentials.Hash, UnknownUserCredentials.Salt) && false
            : PasswordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt);
        if (user is null || LoginLockout.IsLocked(user, now) || !passwordMatches)
        {
            if (user is not null)
            {
                if (!LoginLockout.IsLocked(user, now)) LoginLockout.RegisterFailure(user, now);
                db.AuditEvents.Add(new AuditEvent
                {
                    ClinicId = user.ClinicId,
                    ActorUserId = user.Id,
                    ActorEmail = user.Email,
                    ActorRole = user.Role,
                    Action = "AccesoFallido",
                    EntityType = "ApplicationUser",
                    EntityId = user.Id.ToString(),
                    ChangedFields = string.Empty,
                    CorrelationId = HttpContext.TraceIdentifier,
                    OccurredAtUtc = now
                });
                await db.SaveChangesAsync(cancellationToken);
            }
            return Unauthorized(new
            {
                title = "No se pudo iniciar sesión",
                detail = "El correo o la contraseña no son correctos. Tras varios intentos la cuenta se bloquea 15 minutos."
            });
        }

        LoginLockout.Clear(user);
        user.LastLoginAtUtc = DateTime.UtcNow;
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = user.ClinicId,
            ActorUserId = user.Id,
            ActorEmail = user.Email,
            ActorRole = user.Role,
            Action = "IniciarSesion",
            EntityType = "ApplicationUser",
            EntityId = user.Id.ToString(),
            ChangedFields = string.Empty,
            CorrelationId = HttpContext.TraceIdentifier,
            OccurredAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);

        return Ok(CreateSession(user));
    }

    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        id = User.FindFirstValue(ClaimTypes.NameIdentifier),
        fullName = User.Identity?.Name,
        email = User.FindFirstValue(ClaimTypes.Email),
        role = User.FindFirstValue(ClaimTypes.Role)
    });

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Forbid();

        var user = await db.ApplicationUsers.SingleOrDefaultAsync(
            x => x.Id == userId && x.IsActive && !x.IsArchived,
            cancellationToken);
        if (user is null) return Forbid();

        if (!PasswordHasher.Verify(request.CurrentPassword, user.PasswordHash, user.PasswordSalt))
            return BadRequest(new
            {
                title = "Contraseña actual no válida",
                detail = "La contraseña actual no coincide con la cuenta."
            });

        if (PasswordHasher.Verify(request.NewPassword, user.PasswordHash, user.PasswordSalt))
            return BadRequest(new
            {
                title = "Elige otra contraseña",
                detail = "La contraseña nueva debe ser diferente de la temporal o actual."
            });

        var credentials = PasswordHasher.Hash(request.NewPassword);
        user.PasswordHash = credentials.Hash;
        user.PasswordSalt = credentials.Salt;
        user.MustChangePassword = false;
        await db.SaveChangesAsync(cancellationToken);
        // El token anterior queda revocado al cambiar la credencial: se entrega uno nuevo.
        return Ok(CreateSession(user));
    }

    private object CreateSession(ApplicationUser user)
    {
        var issuer = configuration["Authentication:Issuer"]
            ?? throw new InvalidOperationException("Falta Authentication:Issuer.");
        var audience = configuration["Authentication:Audience"]
            ?? throw new InvalidOperationException("Falta Authentication:Audience.");
        var signingKey = configuration["Authentication:SigningKey"]
            ?? throw new InvalidOperationException("Falta Authentication:SigningKey.");
        var expiresAtUtc = DateTime.UtcNow.AddHours(8);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("clinic_id", user.ClinicId.ToString()),
            new Claim(SessionValidation.MustChangePasswordClaim, user.MustChangePassword ? "true" : "false"),
            new Claim(SessionValidation.StampClaim, PasswordHasher.SessionStamp(user.PasswordSalt))
        };
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAtUtc,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256));

        return new
        {
            accessToken = new JwtSecurityTokenHandler().WriteToken(token),
            expiresAtUtc,
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Role,
                user.MustChangePassword
            }
        };
    }
}

public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(8), MaxLength(200)] string Password);

public sealed record ChangePasswordRequest(
    [Required, MinLength(8), MaxLength(200)] string CurrentPassword,
    [Required, MinLength(12), MaxLength(200)] string NewPassword);
