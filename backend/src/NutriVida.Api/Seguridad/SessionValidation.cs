using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;

namespace NutriVida.Api.Security;

public sealed record SessionUserState(
    bool IsActive,
    bool IsArchived,
    string Role,
    Guid ClinicId,
    bool MustChangePassword,
    string PasswordSalt);

/// <summary>
/// Un JWT sigue siendo válido hasta expirar; esta comprobación aplica de inmediato la desactivación
/// de una cuenta y el cambio de contraseña o de rol.
/// </summary>
public static class SessionValidation
{
    public const string StampClaim = "credential_stamp";
    public const string MustChangePasswordClaim = "must_change_password";

    public static bool IsCurrent(ClaimsPrincipal principal, SessionUserState? user) =>
        user is { IsActive: true, IsArchived: false }
        && principal.IsInRole(user.Role)
        && principal.TryGetClinicId(out var clinicId) && clinicId == user.ClinicId
        && principal.FindFirstValue(StampClaim) == PasswordHasher.SessionStamp(user.PasswordSalt);

    public static async Task OnTokenValidated(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (principal is null || !principal.TryGetUserId(out var userId))
        {
            context.Fail("Sesión no válida.");
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<NutriVidaDbContext>();
        var user = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new SessionUserState(x.IsActive, x.IsArchived, x.Role, x.ClinicId,
                x.MustChangePassword, x.PasswordSalt))
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);
        if (!IsCurrent(principal, user))
        {
            context.Fail("La sesión ya no está vigente.");
            return;
        }

        // El estado de la base manda sobre el que se copió en el token al iniciar sesión.
        var identity = (ClaimsIdentity)principal.Identity!;
        if (identity.FindFirst(MustChangePasswordClaim) is { } stale) identity.RemoveClaim(stale);
        identity.AddClaim(new Claim(MustChangePasswordClaim, user!.MustChangePassword ? "true" : "false"));
    }
}
