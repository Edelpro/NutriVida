using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Assessments;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.Assessments;

[ApiController]
[Route("api/patients/{patientId:guid}")]
public sealed class AssessmentsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet("assessments")]
    public async Task<IActionResult> List(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        return Ok(await db.NutritionAssessments.AsNoTracking().Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.RecordedAtUtc).ToListAsync(cancellationToken));
    }

    [HttpPost("assessments")]
    public async Task<IActionResult> Create(Guid patientId, AssessmentRequest request, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.DailyIntake) || string.IsNullOrWhiteSpace(request.EatingSchedule))
            return ValidationProblem("Completa la ingesta diaria y sus horarios.");
        if (request.BristolStoolType is < 1 or > 7) return ValidationProblem("El tipo de Bristol debe estar entre 1 y 7.");
        var assessment = new NutritionAssessment { PatientId = patientId };
        ApplyAssessment(request, assessment);
        db.NutritionAssessments.Add(assessment);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/assessments/{assessment.Id}", assessment);
    }

    [HttpPut("assessments/{id:guid}")]
    public async Task<IActionResult> UpdateAssessment(Guid patientId, Guid id, AssessmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.DailyIntake) || string.IsNullOrWhiteSpace(request.EatingSchedule))
            return ValidationProblem("Completa la ingesta diaria y sus horarios.");
        if (request.BristolStoolType is < 1 or > 7) return ValidationProblem("El tipo de Bristol debe estar entre 1 y 7.");
        var assessment = await db.NutritionAssessments.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (assessment is null) return NotFound();
        ApplyAssessment(request, assessment);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(assessment);
    }

    [HttpPost("assessments/{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> ArchiveAssessment(Guid patientId, Guid id, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var assessment = await db.NutritionAssessments.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (assessment is null) return NotFound();
        assessment.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("anthropometry/latest")]
    public async Task<IActionResult> LatestAnthropometry(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var measurement = await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.MeasuredAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(measurement);
    }

    [HttpPost("anthropometry")]
    public async Task<IActionResult> AddAnthropometry(Guid patientId, AnthropometryRequest request, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var measure = new AnthropometricMeasurement
        {
            PatientId = patientId,
            WeightKg = request.WeightKg,
            HeightCm = request.HeightCm,
            WaistCm = request.WaistCm,
            BodyFatPercent = request.BodyFatPercent,
            Notes = request.Notes.Trim()
        };
        db.AnthropometricMeasurements.Add(measure);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/anthropometry/{measure.Id}", measure);
    }

    private Task<bool> OwnsPatient(Guid patientId, CancellationToken cancellationToken) =>
        db.CanAccessPatientAsync(User, patientId, cancellationToken);

    private static void ApplyAssessment(AssessmentRequest request, NutritionAssessment assessment)
    {
        assessment.DailyIntake = request.DailyIntake.Trim();
        assessment.EatingSchedule = request.EatingSchedule.Trim();
        assessment.Allergies = request.Allergies.Trim();
        assessment.Intolerances = request.Intolerances.Trim();
        assessment.SleepHours = request.SleepHours;
        assessment.SleepQuality = request.SleepQuality.Trim();
        assessment.ExerciseType = request.ExerciseType.Trim();
        assessment.ExerciseMinutesPerWeek = request.ExerciseMinutesPerWeek;
        assessment.ExerciseSchedule = request.ExerciseSchedule.Trim();
        assessment.HasConstipation = request.HasConstipation;
        assessment.BristolStoolType = request.BristolStoolType;
        assessment.BowelFrequency = request.BowelFrequency.Trim();
        assessment.ClinicalNotes = request.ClinicalNotes.Trim();
    }
}

public sealed record AssessmentRequest(
    [Required, MaxLength(4000)] string DailyIntake,
    [Required, MaxLength(1000)] string EatingSchedule,
    [MaxLength(1000)] string Allergies,
    [MaxLength(1000)] string Intolerances,
    [Range(0, 24)] decimal SleepHours,
    [MaxLength(100)] string SleepQuality,
    [MaxLength(300)] string ExerciseType,
    [Range(0, 3000)] int ExerciseMinutesPerWeek,
    [MaxLength(500)] string ExerciseSchedule,
    bool HasConstipation,
    [Range(1, 7)] int? BristolStoolType,
    [MaxLength(200)] string BowelFrequency,
    [MaxLength(4000)] string ClinicalNotes);
public sealed record AnthropometryRequest(
    [Range(20, 350)] decimal WeightKg,
    [Range(90, 250)] decimal HeightCm,
    [Range(20, 250)] decimal? WaistCm,
    [Range(0, 80)] decimal? BodyFatPercent,
    [MaxLength(1000)] string Notes);
