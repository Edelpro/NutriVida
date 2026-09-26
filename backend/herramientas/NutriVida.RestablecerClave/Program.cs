using Microsoft.EntityFrameworkCore;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Infrastructure.Security;

const string passwordVariable = "NUTRIVIDA_CLAVE_TEMPORAL";
const string connectionVariable = "ConnectionStrings__NutriVida";

var email = args.FirstOrDefault()?.Trim().ToLowerInvariant();
var demoReady = args.Skip(1).Any(x => string.Equals(x, "--demo-ready", StringComparison.OrdinalIgnoreCase));
var temporaryPassword = Environment.GetEnvironmentVariable(passwordVariable);
var connectionString = Environment.GetEnvironmentVariable(connectionVariable)
    ?? "Server=.;Database=NutriVidaClinicalDev;Integrated Security=True;MultipleActiveResultSets=true;Encrypt=False;TrustServerCertificate=True";

if (string.IsNullOrWhiteSpace(email))
{
    Console.Error.WriteLine("Indica el correo de la cuenta que deseas recuperar.");
    return 2;
}

if (string.IsNullOrWhiteSpace(temporaryPassword) || temporaryPassword.Length < 12)
{
    Console.Error.WriteLine($"Define {passwordVariable} con una clave temporal de al menos 12 caracteres.");
    return 2;
}

var options = new DbContextOptionsBuilder<NutriVidaDbContext>()
    .UseSqlServer(connectionString)
    .Options;
await using var db = new NutriVidaDbContext(options);
var user = await db.ApplicationUsers.SingleOrDefaultAsync(x => x.Email == email);

if (user is null)
{
    Console.Error.WriteLine($"No existe una cuenta con el correo {email}.");
    return 3;
}

var credentials = PasswordHasher.Hash(temporaryPassword);
user.PasswordHash = credentials.Hash;
user.PasswordSalt = credentials.Salt;
user.IsActive = true;
user.IsArchived = false;
user.MustChangePassword = !demoReady;
user.UpdatedAtUtc = DateTime.UtcNow;
await db.SaveChangesAsync();

Console.WriteLine(demoReady
    ? $"Cuenta {email} recuperada y lista para la demostración local."
    : $"Cuenta {email} recuperada. La clave es temporal y deberá cambiarse al ingresar.");
return 0;
