using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NutriVida.Api.Services.Messaging;

namespace NutriVida.IntegrationTests;

public sealed class SmtpEmailServiceTests
{
    [Fact]
    public void IsConfigured_RequiresEnabledServerCredentialsAndValidSender()
    {
        var incomplete = new SmtpEmailService(
            Options.Create(new SmtpEmailOptions { Enabled = true, Host = "smtp.example.test" }),
            NullLogger<SmtpEmailService>.Instance);
        var configured = new SmtpEmailService(
            Options.Create(new SmtpEmailOptions
            {
                Enabled = true,
                Host = "smtp.example.test",
                Port = 587,
                Username = "smtp-user",
                Password = "smtp-secret",
                FromEmail = "consulta@example.test"
            }),
            NullLogger<SmtpEmailService>.Instance);

        Assert.False(incomplete.IsConfigured);
        Assert.True(configured.IsConfigured);
    }

    [Fact]
    public async Task SendAsync_WhenDisabled_FailsBeforeOpeningANetworkConnection()
    {
        var service = new SmtpEmailService(
            Options.Create(new SmtpEmailOptions()),
            NullLogger<SmtpEmailService>.Instance);

        var exception = await Assert.ThrowsAsync<EmailSmtpException>(() => service.SendAsync(
            new EmailDocument(
                [1, 2, 3],
                "reporte.pdf",
                "Plan nutricional",
                "Adjuntamos el informe solicitado.",
                "paciente@example.test",
                "Paciente de prueba"),
            CancellationToken.None));

        Assert.Contains("no está configurado", exception.Message);
    }
}
