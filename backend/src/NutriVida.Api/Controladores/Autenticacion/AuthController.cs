using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;
using NutriVida.Domain.Auditing;

namespace NutriVida.Api.Controllers.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(NutriVidaDbContext db, IConfiguration configuration) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.ApplicationUsers.SingleOrDefaultAsync(
            x => x.Email == normalizedEmail && x.IsActive && !x.IsArchived, cancellationToken);
        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized(new
            {
                title = "No se pudo iniciar sesión",
                detail = "El correo o la contraseña no son correctos."
            });

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
            new Claim("must_change_password", user.MustChangePassword ? "true" : "false")
        };
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAtUtc,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256));

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

        return Ok(new
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
        });
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
        return NoContent();
    }
}

public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(180)] string Email,
    [Required, MinLength(8), MaxLength(200)] string Password);

public sealed record ChangePasswordRequest(
    [Required, MinLength(8), MaxLength(200)] string CurrentPassword,
    [Required, MinLength(12), MaxLength(200)] string NewPassword);
