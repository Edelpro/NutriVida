using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Pdf;
using NutriVida.Api.Services.Messaging;
using NutriVida.Api.Intermediarios;
using NutriVida.Application.Energy;
using NutriVida.Infrastructure;
using NutriVida.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context => new BadRequestObjectResult(
        new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Revisa los datos enviados",
            Detail = "Corrige los campos indicados antes de guardar."
        });
});
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddScoped<IInterceptor>(provider => provider.GetRequiredService<AuditSaveChangesInterceptor>());
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<IEnergyCalculator, EnergyCalculator>();
builder.Services.AddScoped<IClinicalReportPdfService, ClinicalReportPdfService>();
builder.Services.AddScoped<IClinicalReportDataService, ClinicalReportDataService>();
builder.Services.Configure<SmtpEmailOptions>(
    builder.Configuration.GetSection(SmtpEmailOptions.SectionName));
builder.Services.AddSingleton<IEmailDocumentSender, SmtpEmailService>();
builder.Services.Configure<WhatsAppCloudOptions>(
    builder.Configuration.GetSection(WhatsAppCloudOptions.SectionName));
builder.Services.AddHttpClient<IWhatsAppDocumentSender, WhatsAppCloudService>(client =>
{
    client.BaseAddress = new Uri("https://graph.facebook.com/");
    client.Timeout = TimeSpan.FromSeconds(45);
});
builder.Services.AddProblemDetails();
var allowedOrigins = builder.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200", "http://127.0.0.1:4200"];
builder.Services.AddCors(options => options.AddPolicy("Angular", policy => policy
    .WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 240,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var issuer = builder.Configuration["Authentication:Issuer"]
    ?? throw new InvalidOperationException("Falta Authentication:Issuer.");
var audience = builder.Configuration["Authentication:Audience"]
    ?? throw new InvalidOperationException("Falta Authentication:Audience.");
var signingKey = builder.Configuration["Authentication:SigningKey"]
    ?? throw new InvalidOperationException("Falta Authentication:SigningKey.");
if (Encoding.UTF8.GetByteCount(signingKey) < 32)
    throw new InvalidOperationException("Authentication:SigningKey debe tener al menos 32 bytes.");
if (builder.Environment.IsProduction())
{
    if (signingKey.Contains("DEV-ONLY", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Producción no puede usar la clave JWT de desarrollo.");
    if (allowedOrigins.Length == 0 || allowedOrigins.Any(origin => origin.Contains("localhost", StringComparison.OrdinalIgnoreCase)))
        throw new InvalidOperationException("Configura Security:AllowedOrigins con el dominio HTTPS real de producción.");
    if (builder.Configuration.GetValue<bool>($"{WhatsAppCloudOptions.SectionName}:Enabled"))
    {
        var requiredWhatsAppSettings = new[] { "PhoneNumberId", "AccessToken", "AppSecret", "VerifyToken" };
        var missingWhatsAppSettings = requiredWhatsAppSettings
            .Where(name => string.IsNullOrWhiteSpace(
                builder.Configuration[$"{WhatsAppCloudOptions.SectionName}:{name}"]))
            .ToArray();
        if (missingWhatsAppSettings.Length > 0)
            throw new InvalidOperationException(
                $"Faltan secretos de WhatsApp Cloud: {string.Join(", ", missingWhatsAppSettings)}.");
    }
    if (builder.Configuration.GetValue<bool>($"{SmtpEmailOptions.SectionName}:Enabled"))
    {
        var requiredSmtpSettings = new[] { "Host", "Username", "Password", "FromEmail" };
        var missingSmtpSettings = requiredSmtpSettings
            .Where(name => string.IsNullOrWhiteSpace(
                builder.Configuration[$"{SmtpEmailOptions.SectionName}:{name}"]))
            .ToArray();
        if (missingSmtpSettings.Length > 0)
            throw new InvalidOperationException(
                $"Faltan secretos de correo SMTP: {string.Join(", ", missingSmtpSettings)}.");
    }
}
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
        options.Events = new JwtBearerEvents { OnTokenValidated = SessionValidation.OnTokenValidated };
    });
builder.Services.AddAuthorization(options =>
    options.AddPolicy("ClinicalStaff", policy => policy.RequireRole("Nutritionist", "ClinicAdmin")));

var app = builder.Build();
// Detrás de un proxy o balanceador: sin esto, todos los usuarios cuentan como una sola IP
// para los límites de acceso y HTTPS parece HTTP.
if (builder.Configuration.GetValue<bool>("Security:TrustForwardedHeaders"))
{
    var forwarded = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };
    forwarded.KnownIPNetworks.Clear();
    forwarded.KnownProxies.Clear();
    app.UseForwardedHeaders(forwarded);
}
if (app.Environment.IsProduction())
{
    app.UseHsts();
    app.UseHttpsRedirection();
    app.Use(async (context, next) =>
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.Append("Referrer-Policy", "no-referrer");
        context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        context.Response.Headers.Append("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        await next();
    });
}
app.UseExceptionHandler(exceptionHandlerApp => exceptionHandlerApp.Run(async context =>
{
    var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var status = exception is ArgumentException ? StatusCodes.Status400BadRequest : StatusCodes.Status500InternalServerError;
    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(new ProblemDetails
    {
        Status = status,
        Title = status == 400 ? "Solicitud no válida" : "No se pudo completar la operación",
        Detail = app.Environment.IsDevelopment() ? exception?.Message : "Inténtalo nuevamente o contacta al administrador."
    });
}));
app.UseMiddleware<CancelacionSolicitudMiddleware>();

if (builder.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<NutriVidaDbContext>();
    await db.Database.MigrateAsync();
    var adminEmail = builder.Configuration["Bootstrap:AdminEmail"];
    var adminPassword = builder.Configuration["Bootstrap:AdminPassword"];
    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
    {
        if (adminPassword.Length < 12)
            throw new InvalidOperationException("Bootstrap:AdminPassword debe tener al menos 12 caracteres.");
        await DatabaseSeeder.BootstrapAdministratorAsync(db,
            builder.Configuration["Bootstrap:AdminName"] ?? "Administración",
            adminEmail, adminPassword);
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUi(options =>
    {
        options.Path = "/swagger";
        options.DocumentPath = "/openapi/v1.json";
    });
    if (!builder.Configuration.GetValue<bool>("SkipDatabaseInitialization"))
    {
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NutriVidaDbContext>();
        await db.Database.MigrateAsync();
        await DatabaseSeeder.InitialiseAsync(
            db,
            builder.Configuration.GetValue<bool>("Development:ResetDemoCredentials"));
    }
}

app.UseCors("Angular");
app.UseStaticFiles();
app.UseAuthentication();
// Después de autenticar: el límite global cuenta por usuario y no por IP compartida.
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    var requiresChange = string.Equals(
        context.User.FindFirstValue(SessionValidation.MustChangePasswordClaim), "true", StringComparison.OrdinalIgnoreCase);
    var passwordRoute = context.Request.Path.StartsWithSegments("/api/auth/change-password")
        || context.Request.Path.StartsWithSegments("/api/auth/me");
    if (context.User.Identity?.IsAuthenticated == true && requiresChange && !passwordRoute)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Cambio de contraseña requerido",
            Detail = "Cambia la contraseña temporal antes de continuar."
        });
        return;
    }
    await next();
});
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "NutriVida.Api" })).AllowAnonymous();
app.MapGet("/health/ready", async (NutriVidaDbContext db, CancellationToken cancellationToken) =>
    await db.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { status = "ready" })
        : Results.StatusCode(StatusCodes.Status503ServiceUnavailable)).AllowAnonymous();
app.MapControllers().RequireAuthorization("ClinicalStaff");
app.Run();

public partial class Program;
