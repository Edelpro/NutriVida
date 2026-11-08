using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Utils;

namespace NutriVida.Api.Services.Messaging;

public sealed class SmtpEmailOptions
{
    public const string SectionName = "Messaging:Smtp";

    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string SocketSecurity { get; set; } = nameof(SecureSocketOptions.StartTls);
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "NutriVida";
}

public sealed record EmailDocument(
    byte[] Content,
    string FileName,
    string Subject,
    string Body,
    string RecipientEmail,
    string RecipientName);

public sealed record EmailSendResult(string MessageId, string ProviderResponse);

public sealed class EmailSmtpException(string message) : Exception(message);

public interface IEmailDocumentSender
{
    bool IsConfigured { get; }
    Task<EmailSendResult> SendAsync(EmailDocument document, CancellationToken cancellationToken);
}

public sealed class SmtpEmailService(
    IOptions<SmtpEmailOptions> configuredOptions,
    ILogger<SmtpEmailService> logger) : IEmailDocumentSender
{
    private readonly SmtpEmailOptions options = configuredOptions.Value;

    public bool IsConfigured =>
        options.Enabled
        && !string.IsNullOrWhiteSpace(options.Host)
        && options.Port is > 0 and <= 65535
        && !string.IsNullOrWhiteSpace(options.Username)
        && !string.IsNullOrWhiteSpace(options.Password)
        && MailboxAddress.TryParse(options.FromEmail, out _);

    public async Task<EmailSendResult> SendAsync(
        EmailDocument document,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
            throw new EmailSmtpException(
                "El correo SMTP no está configurado. Define servidor, cuenta, contraseña y remitente mediante secretos del entorno.");

        if (!MailboxAddress.TryParse(document.RecipientEmail, out var recipient))
            throw new EmailSmtpException("El correo del paciente no tiene un formato válido.");

        var message = new MimeMessage
        {
            Subject = document.Subject.Trim(),
            MessageId = MimeUtils.GenerateMessageId()
        };
        message.From.Add(new MailboxAddress(options.FromName.Trim(), options.FromEmail.Trim()));
        message.To.Add(new MailboxAddress(document.RecipientName.Trim(), recipient.Address));

        var body = new BodyBuilder { TextBody = document.Body.Trim() };
        body.Attachments.Add(document.FileName, document.Content, ContentType.Parse("application/pdf"));
        message.Body = body.ToMessageBody();

        if (!Enum.TryParse<SecureSocketOptions>(options.SocketSecurity, true, out var socketSecurity))
            socketSecurity = SecureSocketOptions.StartTls;

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(options.Host.Trim(), options.Port, socketSecurity, cancellationToken);
            await client.AuthenticateAsync(options.Username.Trim(), options.Password, cancellationToken);
            var providerResponse = await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
            return new EmailSendResult(message.MessageId, providerResponse);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (MailKit.Security.AuthenticationException exception)
        {
            logger.LogWarning(exception, "El proveedor SMTP rechazó la autenticación.");
            throw new EmailSmtpException(
                "El servidor de correo rechazó las credenciales. Revisa el usuario y la contraseña de aplicación.");
        }
        catch (Exception exception) when (exception is IOException or SmtpCommandException or SmtpProtocolException)
        {
            logger.LogWarning(exception, "El proveedor SMTP no aceptó el envío.");
            throw new EmailSmtpException(
                "El servidor de correo no aceptó el mensaje. Revisa su configuración e inténtalo nuevamente.");
        }
    }
}
