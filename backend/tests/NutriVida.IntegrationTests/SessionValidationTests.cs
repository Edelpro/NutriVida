using System.Security.Claims;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Security;

namespace NutriVida.IntegrationTests;

public sealed class SessionValidationTests
{
    private static readonly Guid ClinicId = Guid.NewGuid();
    private static readonly string Salt = PasswordHasher.Hash("clave-de-prueba-larga").Salt;

    private static ClaimsPrincipal Token(string salt, string role = "Nutritionist") => new(new ClaimsIdentity(
    [
        new Claim(ClaimTypes.Role, role),
        new Claim("clinic_id", ClinicId.ToString()),
        new Claim(SessionValidation.StampClaim, PasswordHasher.SessionStamp(salt))
    ], "Test"));

    private static SessionUserState State(bool isActive = true, bool isArchived = false, string? salt = null,
        string role = "Nutritionist") => new(isActive, isArchived, role, ClinicId, false, salt ?? Salt);

    [Fact]
    public void ActiveAccountWithSameCredential_StaysValid() =>
        Assert.True(SessionValidation.IsCurrent(Token(Salt), State()));

    [Fact]
    public void DeactivatedAccount_IsRevoked() =>
        Assert.False(SessionValidation.IsCurrent(Token(Salt), State(isActive: false)));

    [Fact]
    public void ArchivedAccount_IsRevoked() =>
        Assert.False(SessionValidation.IsCurrent(Token(Salt), State(isArchived: true)));

    [Fact]
    public void MissingAccount_IsRevoked() =>
        Assert.False(SessionValidation.IsCurrent(Token(Salt), null));

    [Fact]
    public void ChangedPassword_RevokesEarlierTokens() =>
        Assert.False(SessionValidation.IsCurrent(Token(Salt), State(salt: PasswordHasher.Hash("otra-clave-de-prueba").Salt)));

    [Fact]
    public void ChangedRole_IsRevoked() =>
        Assert.False(SessionValidation.IsCurrent(Token(Salt), State(role: "ClinicAdmin")));

    [Fact]
    public void TokenWithoutStamp_IsRevoked()
    {
        var token = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Role, "Nutritionist"),
            new Claim("clinic_id", ClinicId.ToString())
        ], "Test"));

        Assert.False(SessionValidation.IsCurrent(token, State()));
    }
}
