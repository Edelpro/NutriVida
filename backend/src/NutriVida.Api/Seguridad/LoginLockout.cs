using NutriVida.Domain.Identity;

namespace NutriVida.Api.Security;

public static class LoginLockout
{
    public const int MaxAttempts = 5;
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    public static bool IsLocked(ApplicationUser user, DateTime utcNow) =>
        user.LockedUntilUtc is { } until && until > utcNow;

    public static void RegisterFailure(ApplicationUser user, DateTime utcNow)
    {
        user.FailedLoginAttempts++;
        if (user.FailedLoginAttempts < MaxAttempts) return;
        user.LockedUntilUtc = utcNow.Add(Duration);
        user.FailedLoginAttempts = 0;
    }

    public static void Clear(ApplicationUser user)
    {
        user.FailedLoginAttempts = 0;
        user.LockedUntilUtc = null;
    }
}
