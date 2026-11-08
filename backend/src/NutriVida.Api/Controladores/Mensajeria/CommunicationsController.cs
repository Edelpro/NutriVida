using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using NutriVida.Domain.Auditing;
using NutriVida.Domain.Communications;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Domain.Patients;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Messaging;
using NutriVida.Api.Services.Pdf;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Communications;

[ApiController]
[Route("api/communications")]
public sealed class CommunicationsController(
    NutriVidaDbContext db,
    IClinicalReportPdfService pdfService,
    IClinicalReportDataService reportData,
    IConfiguration configuration,
    IEmailDocumentSender emailSender,
    IWhatsAppDocumentSender whatsAppSender) : ControllerBase
{
    private int SharedLinkDays => Math.Clamp(configuration.GetValue("Messaging:SharedLinkDays", 7), 1, 30);

    [HttpGet("integration-status")]
    public IActionResult IntegrationStatus() => Ok(new
    {
        email = new { configured = emailSender.IsConfigured, mode = emailSender.IsConfigured ? "Smtp" : "DirectLink" },
        whatsApp = new { configured = whatsAppSender.IsConfigured, mode = whatsAppSender.IsConfigured ? "WhatsAppCloud" : "DirectLink" }
    });

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid patientId, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var rows = await (from message in db.MessageDispatches.AsNoTracking()
                          join patient in db.Patients.AsNoTracking() on message.PatientId equals patient.Id
                          where accessiblePatientIds.Contains(patient.Id)
                              && !message.IsArchived && message.PatientId == patientId
                          orderby message.CreatedAtUtc descending
                          select new
                          {
                              message.Id,
                              message.CreatedAtUtc,
                              patientName = patient.FirstName + " " + patient.LastName,
                              channel = message.Channel.ToString(),
                              message.DestinationMasked,
                              status = message.Status.ToString()
                          })
            .Take(50)
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview(SendMessageRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (request.PatientId == Guid.Empty) return ValidationProblem("Selecciona un paciente válido.");
        var patient = await db.AccessiblePatients(User).AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.PatientId, cancellationToken);
        if (patient is null) return NotFound();
        if (request.MenuPlanId.HasValue)
        {
            var linkedPlan = await db.MenuPlans.AsNoTracking()
                .Where(x => x.Id == request.MenuPlanId.Value
                    && x.PatientId == request.PatientId
                    && !x.IsArchived)
                .Select(x => (MenuPlanStatus?)x.Status)
                .FirstOrDefaultAsync(cancellationToken);
            if (linkedPlan is null)
                return ValidationProblem("El plan seleccionado no pertenece al paciente activo o ya no está disponible.");
            if (linkedPlan != MenuPlanStatus.Approved)
                return Conflict(new { title = "Plan sin aprobar", detail = "Aprueba el plan en Planes de menú antes de compartirlo con el paciente." });
        }
        var consent = request.Channel == MessageChannel.Email ? patient.EmailConsentAtUtc : patient.WhatsAppConsentAtUtc;
        if (!consent.HasValue) return Conflict(new { title = "Falta consentimiento", detail = "Registra el consentimiento del paciente para este canal." });

        if (request.Channel == MessageChannel.Email && string.IsNullOrWhiteSpace(patient.Email))
            return Conflict(new { title = "Falta correo", detail = "Registra un correo válido en el expediente antes de preparar el envío." });
        var phoneDigits = NormalizeWhatsAppPhone(patient.Phone);
        if (request.Channel == MessageChannel.WhatsApp && phoneDigits.Length is < 7 or > 15)
            return Conflict(new { title = "Falta teléfono", detail = "Registra un teléfono válido con código de país antes de preparar WhatsApp." });

        var destination = request.Channel == MessageChannel.Email ? MaskEmail(patient.Email) : MaskPhone(patient.Phone);
        var message = new MessageDispatch
        {
            PatientId = request.PatientId,
            MenuPlanId = request.MenuPlanId,
            Channel = request.Channel,
            Status = MessageStatus.Draft,
            DestinationMasked = destination,
            Subject = request.Subject.Trim(),
            SecureLinkToken = Convert.ToHexString(Guid.NewGuid().ToByteArray())
        };
        var reportUrl = $"{Request.Scheme}://{Request.Host}/api/communications/shared/{message.SecureLinkToken}/clinical-summary.pdf";
        var bodyWithReport = $"{request.Body.Trim()}\n\nDescargar PDF nutricional: {reportUrl}\nEnlace válido por {SharedLinkDays} días.";
        var encodedSubject = Uri.EscapeDataString(request.Subject.Trim());
        var encodedBody = Uri.EscapeDataString(bodyWithReport);
        var actionUrl = request.Channel == MessageChannel.Email
            ? $"mailto:{patient.Email}?subject={encodedSubject}&body={encodedBody}"
            : $"https://wa.me/{phoneDigits}?text={Uri.EscapeDataString($"{request.Subject.Trim()}\n\n{bodyWithReport}")}";
        var canSendAutomatically = request.Channel == MessageChannel.Email
            ? emailSender.IsConfigured
            : whatsAppSender.IsConfigured;
        var mode = request.Channel == MessageChannel.Email
            ? emailSender.IsConfigured ? "Smtp" : "DirectLink"
            : whatsAppSender.IsConfigured ? "WhatsAppCloud" : "DirectLink";
        db.MessageDispatches.Add(message);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new
        {
            message.Id,
            message.Channel,
            message.Status,
            destination,
            actionUrl,
            reportUrl,
            canSendAutomatically,
            mode,
            notice = canSendAutomatically
                ? $"PDF preparado. Revisa el destino y confirma el envío directo por {(request.Channel == MessageChannel.Email ? "correo" : "WhatsApp")}."
                : "Se preparó un enlace directo al PDF. La persona profesional confirma el envío en correo o WhatsApp."
        });
    }

    [HttpPost("{id:guid}/send-email-document")]
    public async Task<IActionResult> SendEmailDocument(
        Guid id,
        SendPreparedEmailRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (!emailSender.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "El correo real no está configurado",
                Detail = "Configura el servidor SMTP y sus credenciales como secretos antes de enviar."
            });

        var dispatch = await db.MessageDispatches.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived, cancellationToken);
        if (dispatch is null) return NotFound();
        var patient = await db.AccessiblePatients(User)
            .SingleOrDefaultAsync(x => x.Id == dispatch.PatientId, cancellationToken);
        if (patient is null) return NotFound();
        if (dispatch.Channel != MessageChannel.Email)
            return ValidationProblem("El registro seleccionado no corresponde al canal correo.");
        if (!patient.EmailConsentAtUtc.HasValue)
            return Conflict(new { title = "Falta consentimiento", detail = "Registra nuevamente el consentimiento para correo antes de enviar." });
        if (string.IsNullOrWhiteSpace(patient.Email))
            return Conflict(new { title = "Falta correo", detail = "Registra un correo válido en el expediente antes de enviar." });
        if (dispatch.Status == MessageStatus.Sent)
            return Ok(new
            {
                dispatch.Id,
                status = dispatch.Status.ToString(),
                dispatch.SentAtUtc,
                alreadySent = true,
                notice = "Este PDF ya fue aceptado por el servidor de correo y no se volvió a enviar."
            });
        if (dispatch.Status == MessageStatus.Queued)
            return Conflict(new
            {
                title = "Envío pendiente de confirmación",
                detail = "No se repetirá el envío para evitar duplicados. Revisa la bandeja del destinatario."
            });

        var document = await CreateClinicalPdfAsync(patient, dispatch.MenuPlanId, cancellationToken);
        dispatch.Status = MessageStatus.Queued;
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            var result = await emailSender.SendAsync(new EmailDocument(
                document.Content,
                document.FileName,
                dispatch.Subject,
                $"{request.Body.Trim()}\n\nSe adjunta el informe nutricional en formato PDF.\nEste documento contiene información confidencial.",
                patient.Email,
                $"{patient.FirstName} {patient.LastName}"), cancellationToken);
            dispatch.Status = MessageStatus.Sent;
            dispatch.SentAtUtc = DateTime.UtcNow;
            dispatch.ProviderReference = result.MessageId;
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new
            {
                dispatch.Id,
                status = dispatch.Status.ToString(),
                dispatch.SentAtUtc,
                alreadySent = false,
                providerMessageId = result.MessageId,
                destination = dispatch.DestinationMasked,
                notice = "El servidor de correo aceptó el mensaje con el PDF adjunto."
            });
        }
        catch (EmailSmtpException exception)
        {
            dispatch.Status = MessageStatus.Failed;
            dispatch.ProviderReference = "Proveedor rechazó la solicitud";
            await db.SaveChangesAsync(CancellationToken.None);
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Status = StatusCodes.Status502BadGateway,
                Title = "El correo no aceptó el PDF",
                Detail = exception.Message
            });
        }
    }

    [HttpPost("{id:guid}/send-whatsapp-document")]
    public async Task<IActionResult> SendWhatsAppDocument(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (!whatsAppSender.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "WhatsApp Business no está configurado",
                Detail = "Configura PhoneNumberId y AccessToken como secretos del servidor antes de enviar."
            });

        var dispatch = await db.MessageDispatches.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived, cancellationToken);
        if (dispatch is null) return NotFound();
        var patient = await db.AccessiblePatients(User)
            .SingleOrDefaultAsync(x => x.Id == dispatch.PatientId, cancellationToken);
        if (patient is null) return NotFound();
        if (dispatch.Channel != MessageChannel.WhatsApp)
            return ValidationProblem("El registro seleccionado no corresponde al canal WhatsApp.");
        if (!patient.WhatsAppConsentAtUtc.HasValue)
            return Conflict(new { title = "Falta consentimiento", detail = "Registra nuevamente el consentimiento para WhatsApp antes de enviar." });

        var phoneDigits = NormalizeWhatsAppPhone(patient.Phone);
        if (phoneDigits.Length is < 7 or > 15)
            return Conflict(new { title = "Falta teléfono", detail = "Registra un teléfono válido con código de país antes de enviar." });
        if (dispatch.Status == MessageStatus.Sent)
            return Ok(new
            {
                dispatch.Id,
                status = dispatch.Status.ToString(),
                dispatch.SentAtUtc,
                alreadySent = true,
                notice = "Este PDF ya fue aceptado por WhatsApp y no se volvió a enviar."
            });
        if (dispatch.Status == MessageStatus.Queued)
            return Conflict(new
            {
                title = "Envío pendiente de confirmación",
                detail = "No se repetirá el envío para evitar duplicados. Revisa el teléfono o el panel de Meta."
            });

        var document = await CreateClinicalPdfAsync(patient, dispatch.MenuPlanId, cancellationToken);
        dispatch.Status = MessageStatus.Queued;
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            var result = await whatsAppSender.SendAsync(new WhatsAppDocument(
                document.Content,
                document.FileName,
                $"{dispatch.Subject}\n\nDocumento confidencial enviado por NutriVida.",
                phoneDigits), cancellationToken);
            dispatch.Status = MessageStatus.Sent;
            dispatch.SentAtUtc = DateTime.UtcNow;
            dispatch.ProviderReference = result.MessageId;
            await db.SaveChangesAsync(cancellationToken);
            return Ok(new
            {
                dispatch.Id,
                status = dispatch.Status.ToString(),
                dispatch.SentAtUtc,
                alreadySent = false,
                providerMessageId = result.MessageId,
                destination = dispatch.DestinationMasked,
                notice = "Meta aceptó el PDF para entrega por WhatsApp."
            });
        }
        catch (WhatsAppCloudException exception)
        {
            dispatch.Status = MessageStatus.Failed;
            dispatch.ProviderReference = exception.ProviderStatusCode.HasValue
                ? $"HTTP {exception.ProviderStatusCode.Value}"
                : "Proveedor rechazó la solicitud";
            await db.SaveChangesAsync(CancellationToken.None);
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Status = StatusCodes.Status502BadGateway,
                Title = "WhatsApp no aceptó el PDF",
                Detail = exception.Message
            });
        }
    }

    [AllowAnonymous]
    [HttpGet("shared/{token}/clinical-summary.pdf")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> SharedPdf(string token, CancellationToken cancellationToken)
    {
        var validFrom = DateTime.UtcNow.AddDays(-SharedLinkDays);
        var dispatch = await db.MessageDispatches.AsNoTracking().SingleOrDefaultAsync(
            x => x.SecureLinkToken == token && !x.IsArchived && x.CreatedAtUtc >= validFrom,
            cancellationToken);
        if (dispatch is null) return NotFound(new { title = "Enlace no disponible", detail = "El enlace venció o fue archivado." });
        var patient = await db.Patients.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == dispatch.PatientId && !x.IsArchived, cancellationToken);
        if (patient is null) return NotFound();
        var consent = dispatch.Channel == MessageChannel.Email
            ? patient.EmailConsentAtUtc
            : patient.WhatsAppConsentAtUtc;
        if (!consent.HasValue)
            return NotFound(new { title = "Enlace no disponible", detail = "El enlace venció o fue archivado." });

        var document = await CreateClinicalPdfAsync(patient, dispatch.MenuPlanId, cancellationToken);
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = patient.ClinicId,
            ActorEmail = "Enlace compartido",
            Action = "DescargarEnlace",
            EntityType = "PatientClinicalReport",
            EntityId = patient.Id.ToString(),
            ChangedFields = $"Envío {dispatch.Id} por {dispatch.Channel}",
            CorrelationId = HttpContext.TraceIdentifier,
            OccurredAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        return File(document.Content, "application/pdf", document.FileName);
    }

    private async Task<ClinicalPdfDocument> CreateClinicalPdfAsync(
        Patient patient,
        Guid? menuPlanId,
        CancellationToken cancellationToken)
    {
        var professionalName = await db.ApplicationUsers.AsNoTracking()
            .Where(x => x.Id == patient.AssignedNutritionistUserId)
            .Select(x => x.FullName)
            .SingleOrDefaultAsync(cancellationToken);
        var data = await reportData.BuildAsync(patient, professionalName ?? "NutriVida", menuPlanId,
            ClinicalReportAudience.Patient, cancellationToken);
        var generatedAt = data.GeneratedAtUtc;
        var bytes = pdfService.Create(data);
        var safeName = string.Join('-', new[] { patient.FirstName, patient.LastName }
            .SelectMany(value => value.Split(' ', StringSplitOptions.RemoveEmptyEntries))).ToLowerInvariant();
        return new ClinicalPdfDocument(
            bytes,
            $"reporte-nutricional-{safeName}-{generatedAt:yyyyMMdd}.pdf");
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User, includeArchived: true).Select(x => x.Id);
        var message = await db.MessageDispatches.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived
                && accessiblePatientIds.Contains(x.PatientId), cancellationToken);
        if (message is null) return NotFound();
        message.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        return parts.Length == 2 ? $"{parts[0][..Math.Min(2, parts[0].Length)]}***@{parts[1]}" : "***";
    }
    private static string MaskPhone(string phone) => phone.Length > 4 ? $"***{phone[^4..]}" : "***";
    private static string NormalizeWhatsAppPhone(string phone)
    {
        var digits = string.Concat(phone.Where(char.IsDigit));
        if (digits.Length == 10 && digits.StartsWith('0')) return $"593{digits[1..]}";
        return digits;
    }

    private sealed record ClinicalPdfDocument(byte[] Content, string FileName);
}

public sealed record SendMessageRequest(
    Guid PatientId,
    Guid? MenuPlanId,
    [EnumDataType(typeof(MessageChannel))] MessageChannel Channel,
    [Required, MinLength(3), MaxLength(160)] string Subject,
    [Required, MinLength(10), MaxLength(2000)] string Body);

public sealed record SendPreparedEmailRequest(
    [Required, MinLength(10), MaxLength(2000)] string Body);
