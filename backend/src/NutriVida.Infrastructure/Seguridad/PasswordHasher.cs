using System.Security.Cryptography;

namespace NutriVida.Infrastructure.Security;

public static class PasswordHasher
{
    private const int Iterations = 120_000;
    private const int KeySize = 32;

    public static (string Hash, string Salt) Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    /// <summary>
    /// Huella de la credencial vigente. La sal cambia con cada contraseña nueva, así que los
    /// tokens emitidos antes del cambio dejan de coincidir.
    /// </summary>
    public static string SessionStamp(string saltBase64) =>
        Convert.ToHexString(SHA256.HashData(Convert.FromBase64String(saltBase64)))[..16];

    public static bool Verify(string password, string hashBase64, string saltBase64)
    {
        var salt = Convert.FromBase64String(saltBase64);
        var expected = Convert.FromBase64String(hashBase64);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
