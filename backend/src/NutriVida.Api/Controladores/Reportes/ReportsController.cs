using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Pdf;
using NutriVida.Domain.Auditing;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Reports;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController(NutriVidaDbContext db, IClinicalReportPdfService pdfService) : ControllerBase
{
    [HttpGet("clinical-summary")]
    public async Task<IActionResult> Summary([FromQuery] Guid patientId, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var patient = await db.AccessiblePatients(User).AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == patientId, cancellationToken);
        if (patient is null) return NotFound();
        var measures = await db.AnthropometricMeasurements.AsNoTracking().Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderBy(x => x.MeasuredAtUtc)
            .Select(x => new { x.MeasuredAtUtc, x.WeightKg, x.HeightCm, x.WaistCm, x.BodyFatPercent })
            .ToListAsync(cancellationToken);
        var lastAssessment = await db.NutritionAssessments.AsNoTracking().Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.RecordedAtUtc).FirstOrDefaultAsync(cancellationToken);
        var followUps = await db.WeeklyFollowUps.AsNoTracking().Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.FollowUpDate).Take(8).ToListAsync(cancellationToken);
        return Ok(new
        {
            patient = new { patient.Id, fullName = patient.FirstName + " " + patient.LastName, patient.Goal },
            measurements = measures,
            lastAssessment,
            followUps,
            generatedAtUtc = DateTime.UtcNow,
            disclaimer = "Resumen para revisión profesional; no sustituye diagnóstico ni criterio clínico."
        });
    }

    [HttpGet("clinical-summary.pdf")]
    public async Task<IActionResult> Pdf([FromQuery] Guid patientId, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var patient = await db.AccessiblePatients(User).AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == patientId, cancellationToken);
        if (patient is null) return NotFound();

        var measures = await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderBy(x => x.MeasuredAtUtc)
            .Select(x => new ClinicalMeasurementPdfRow(x.MeasuredAtUtc, x.WeightKg, x.HeightCm, x.WaistCm, x.BodyFatPercent))
            .ToListAsync(cancellationToken);
        var assessment = await db.NutritionAssessments.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.RecordedAtUtc)
            .Select(x => new ClinicalAssessmentPdfRow(x.DailyIntake, x.Intolerances, x.Allergies,
                x.SleepHours, x.ExerciseType, x.ExerciseMinutesPerWeek, x.HasConstipation, x.BristolStoolType, x.ClinicalNotes))
            .FirstOrDefaultAsync(cancellationToken);
        var followUps = await db.WeeklyFollowUps.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.FollowUpDate)
            .Take(8)
            .Select(x => new ClinicalFollowUpPdfRow(x.FollowUpDate, x.WeightKg, x.AverageSleepHours,
                x.ExerciseMinutes, x.ExerciseType, x.PlanAdherencePercent, x.BristolStoolType, x.Symptoms))
            .ToListAsync(cancellationToken);

        var generatedAt = DateTime.UtcNow;
        var bytes = pdfService.Create(new ClinicalReportPdfData(
            $"{patient.FirstName} {patient.LastName}", patient.DocumentNumber, patient.Goal,
            generatedAt, measures, assessment, followUps));
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = clinicId,
            ActorUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId) ? actorId : null,
            ActorEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
            ActorRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            Action = "GenerarPDF",
            EntityType = "PatientClinicalReport",
            EntityId = patient.Id.ToString(),
            ChangedFields = "",
            CorrelationId = HttpContext.TraceIdentifier,
            OccurredAtUtc = generatedAt
        });
        await db.SaveChangesAsync(cancellationToken);

        var safeName = string.Join('-', new[] { patient.FirstName, patient.LastName }
            .SelectMany(value => value.Split(' ', StringSplitOptions.RemoveEmptyEntries)))
            .ToLowerInvariant();
        return File(bytes, "application/pdf", $"reporte-nutricional-{safeName}-{generatedAt:yyyyMMdd}.pdf");
    }

    private bool TryGetClinicId(out Guid clinicId) =>
        Guid.TryParse(User.FindFirstValue("clinic_id"), out clinicId);
}
