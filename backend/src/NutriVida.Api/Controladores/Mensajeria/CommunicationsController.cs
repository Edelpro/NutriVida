using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using NutriVida.Domain.Communications;
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
    IWhatsAppDocumentSender whatsAppSender) : ControllerBase
{
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
            var ownsMenuPlan = await db.MenuPlans.AsNoTracking().AnyAsync(
                x => x.Id == request.MenuPlanId.Value
                    && x.PatientId == request.PatientId
                    && !x.IsArchived,
                cancellationToken);
            if (!ownsMenuPlan)
                return ValidationProblem("El plan seleccionado no pertenece al paciente activo o ya no está disponible.");
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
        var bodyWithReport = $"{request.Body.Trim()}\n\nDescargar PDF nutricional: {reportUrl}\nEnlace válido por 7 días.";
        var encodedSubject = Uri.EscapeDataString(request.Subject.Trim());
        var encodedBody = Uri.EscapeDataString(bodyWithReport);
        var actionUrl = request.Channel == MessageChannel.Email
            ? $"mailto:{patient.Email}?subject={encodedSubject}&body={encodedBody}"
            : $"https://wa.me/{phoneDigits}?text={Uri.EscapeDataString($"{request.Subject.Trim()}\n\n{bodyWithReport}")}";
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
            canSendAutomatically = request.Channel == MessageChannel.WhatsApp && whatsAppSender.IsConfigured,
            mode = request.Channel == MessageChannel.WhatsApp && whatsAppSender.IsConfigured
                ? "WhatsAppCloud"
                : "DirectLink",
            notice = request.Channel == MessageChannel.WhatsApp && whatsAppSender.IsConfigured
                ? "PDF preparado. Revisa el destino y confirma el envío directo por WhatsApp."
                : "Se preparó un enlace directo al PDF. La persona profesional confirma el envío en correo o WhatsApp."
        });
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

        var document = await CreateClinicalPdfAsync(patient, cancellationToken);
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
        var validFrom = DateTime.UtcNow.AddDays(-7);
        var dispatch = await db.MessageDispatches.AsNoTracking().SingleOrDefaultAsync(
            x => x.SecureLinkToken == token && !x.IsArchived && x.CreatedAtUtc >= validFrom,
            cancellationToken);
        if (dispatch is null) return NotFound(new { title = "Enlace no disponible", detail = "El enlace venció o fue archivado." });
        var patient = await db.Patients.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == dispatch.PatientId && !x.IsArchived, cancellationToken);
        if (patient is null) return NotFound();

        var document = await CreateClinicalPdfAsync(patient, cancellationToken);
        return File(document.Content, "application/pdf", document.FileName);
    }

    private async Task<ClinicalPdfDocument> CreateClinicalPdfAsync(
        Patient patient,
        CancellationToken cancellationToken)
    {
        var measures = await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderBy(x => x.MeasuredAtUtc)
            .Select(x => new ClinicalMeasurementPdfRow(x.MeasuredAtUtc, x.WeightKg, x.HeightCm, x.WaistCm, x.BodyFatPercent))
            .ToListAsync(cancellationToken);
        var assessment = await db.NutritionAssessments.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.RecordedAtUtc)
            .Select(x => new ClinicalAssessmentPdfRow(x.DailyIntake, x.Intolerances, x.Allergies,
                x.SleepHours, x.ExerciseType, x.ExerciseMinutesPerWeek, x.HasConstipation, x.BristolStoolType, x.ClinicalNotes))
            .FirstOrDefaultAsync(cancellationToken);
        var followUps = await db.WeeklyFollowUps.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.FollowUpDate).Take(8)
            .Select(x => new ClinicalFollowUpPdfRow(x.FollowUpDate, x.WeightKg, x.AverageSleepHours,
                x.ExerciseMinutes, x.ExerciseType, x.PlanAdherencePercent, x.BristolStoolType, x.Symptoms))
            .ToListAsync(cancellationToken);
        var generatedAt = DateTime.UtcNow;
        var bytes = pdfService.Create(new ClinicalReportPdfData(
            $"{patient.FirstName} {patient.LastName}", patient.DocumentNumber, patient.Goal,
            generatedAt, measures, assessment, followUps));
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
