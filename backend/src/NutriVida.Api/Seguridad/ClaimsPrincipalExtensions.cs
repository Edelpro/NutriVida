using System.Security.Claims;

namespace NutriVida.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetClinicId(this ClaimsPrincipal user, out Guid clinicId) =>
        Guid.TryParse(user.FindFirstValue("clinic_id"), out clinicId);

    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId) =>
        Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
