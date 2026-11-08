using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Assessments;
using NutriVida.Api.Security;
using NutriVida.Api.Services.Pdf;
using NutriVida.Api.Services.Time;
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
        var hasRecall = request.Recall24h is { Count: > 0 };
        if ((!hasRecall && string.IsNullOrWhiteSpace(request.DailyIntake)) || string.IsNullOrWhiteSpace(request.EatingSchedule))
            return ValidationProblem("Completa la ingesta diaria y sus horarios.");
        if (request.BristolStoolType is < 1 or > 7) return ValidationProblem("El tipo de Bristol debe estar entre 1 y 7.");
        var assessment = new NutritionAssessment { PatientId = patientId };
        var recall = await BuildRecall(request, cancellationToken);
        if (recall.Error is not null) return ValidationProblem(recall.Error);
        ApplyAssessment(request, assessment, recall.Rows);
        db.NutritionAssessments.Add(assessment);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/assessments/{assessment.Id}", assessment);
    }

    [HttpPut("assessments/{id:guid}")]
    public async Task<IActionResult> UpdateAssessment(Guid patientId, Guid id, AssessmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var hasRecall = request.Recall24h is { Count: > 0 };
        if ((!hasRecall && string.IsNullOrWhiteSpace(request.DailyIntake)) || string.IsNullOrWhiteSpace(request.EatingSchedule))
            return ValidationProblem("Completa la ingesta diaria y sus horarios.");
        if (request.BristolStoolType is < 1 or > 7) return ValidationProblem("El tipo de Bristol debe estar entre 1 y 7.");
        var assessment = await db.NutritionAssessments.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (assessment is null) return NotFound();
        var recall = await BuildRecall(request, cancellationToken);
        if (recall.Error is not null) return ValidationProblem(recall.Error);
        ApplyAssessment(request, assessment, recall.Rows);
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

    [HttpGet("anthropometry")]
    public async Task<IActionResult> ListAnthropometry(Guid patientId, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var measurements = await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.MeasuredAtUtc)
            .ToListAsync(cancellationToken);
        return Ok(measurements);
    }

    [HttpPost("anthropometry")]
    public async Task<IActionResult> AddAnthropometry(Guid patientId, AnthropometryRequest request, CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        if (!IsValidMeasurementDate(request.MeasuredOn))
            return ValidationProblem("La fecha de medición debe estar entre 1900 y el día actual.");
        var measure = new AnthropometricMeasurement
        {
            PatientId = patientId,
            MeasuredAtUtc = request.MeasuredOn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
        };
        ApplyAnthropometry(request, measure);
        db.AnthropometricMeasurements.Add(measure);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/patients/{patientId}/anthropometry/{measure.Id}", measure);
    }

    [HttpPut("anthropometry/{id:guid}")]
    public async Task<IActionResult> UpdateAnthropometry(Guid patientId, Guid id, AnthropometryRequest request,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        if (!IsValidMeasurementDate(request.MeasuredOn))
            return ValidationProblem("La fecha de medición debe estar entre 1900 y el día actual.");
        var measure = await db.AnthropometricMeasurements.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (measure is null) return NotFound();
        ApplyAnthropometry(request, measure);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(measure);
    }

    [HttpPost("anthropometry/{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> ArchiveAnthropometry(Guid patientId, Guid id,
        CancellationToken cancellationToken)
    {
        if (!await OwnsPatient(patientId, cancellationToken)) return NotFound();
        var measure = await db.AnthropometricMeasurements.SingleOrDefaultAsync(
            x => x.Id == id && x.PatientId == patientId && !x.IsArchived, cancellationToken);
        if (measure is null) return NotFound();
        measure.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<bool> OwnsPatient(Guid patientId, CancellationToken cancellationToken) =>
        db.CanAccessPatientAsync(User, patientId, cancellationToken);

    private static bool IsValidMeasurementDate(DateOnly measuredOn) =>
        measuredOn >= new DateOnly(1900, 1, 1) && measuredOn <= ClinicClock.Today();

    private static void ApplyAnthropometry(AnthropometryRequest request, AnthropometricMeasurement measure)
    {
        measure.MeasuredAtUtc = request.MeasuredOn.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        measure.WeightKg = request.WeightKg;
        measure.HeightCm = request.HeightCm;
        measure.WaistCm = request.WaistCm;
        measure.HipCm = request.HipCm;
        measure.BodyFatPercent = request.BodyFatPercent;
        measure.Notes = request.Notes.Trim();
        measure.SittingHeightCm = request.SittingHeightCm;
        measure.ArmSpanCm = request.ArmSpanCm;
        measure.TricepsSkinfoldMm = request.TricepsSkinfoldMm;
        measure.SubscapularSkinfoldMm = request.SubscapularSkinfoldMm;
        measure.BicepsSkinfoldMm = request.BicepsSkinfoldMm;
        measure.IliacCrestSkinfoldMm = request.IliacCrestSkinfoldMm;
        measure.SupraspinaleSkinfoldMm = request.SupraspinaleSkinfoldMm;
        measure.AbdominalSkinfoldMm = request.AbdominalSkinfoldMm;
        measure.FrontThighSkinfoldMm = request.FrontThighSkinfoldMm;
        measure.MedialCalfSkinfoldMm = request.MedialCalfSkinfoldMm;
        measure.ArmRelaxedCm = request.ArmRelaxedCm;
        measure.ArmFlexedCm = request.ArmFlexedCm;
        measure.ForearmCm = request.ForearmCm;
        measure.ChestCm = request.ChestCm;
        measure.MidThighCm = request.MidThighCm;
        measure.CalfCm = request.CalfCm;
        measure.NeckCm = request.NeckCm;
        measure.HeadCm = request.HeadCm;
        measure.HumerusBreadthCm = request.HumerusBreadthCm;
        measure.WristBreadthCm = request.WristBreadthCm;
        measure.FemurBreadthCm = request.FemurBreadthCm;
        measure.UsualWeightKg = request.UsualWeightKg;
        measure.KneeHeightCm = request.KneeHeightCm;
        measure.GripStrengthKg = request.GripStrengthKg;
        measure.EdemaGrade = request.EdemaGrade?.Trim() ?? string.Empty;
        measure.AscitesGrade = request.AscitesGrade?.Trim() ?? string.Empty;
    }

    /// <summary>Los valores de lo que está en el catálogo se calculan aquí, no en el navegador.</summary>
    private async Task<(string? Error, List<Recall24hRow> Rows)> BuildRecall(
        AssessmentRequest request, CancellationToken cancellationToken)
    {
        var items = request.Recall24h ?? [];
        if (items.Count > 100) return ("El recordatorio admite hasta 100 alimentos.", []);
        var ids = items.Where(x => x.FoodItemId.HasValue).Select(x => x.FoodItemId!.Value).Distinct().ToArray();
        var foods = await db.FoodItems.AsNoTracking()
            .Where(x => ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        if (foods.Count != ids.Length)
            return ("Uno o más alimentos del recordatorio ya no existen en el catálogo.", []);
        return (null, items.Select(item =>
        {
            if (item.FoodItemId is { } id)
            {
                var food = foods[id];
                return new Recall24hRow(id, item.MealName.Trim(), food.Name, item.Portions,
                    food.HouseholdMeasure,
                    decimal.Round(food.PortionGrams * item.Portions, 1),
                    decimal.Round(food.EnergyKcal * item.Portions, 1),
                    decimal.Round(food.ProteinG * item.Portions, 1),
                    decimal.Round(food.CarbohydrateG * item.Portions, 1),
                    decimal.Round(food.FatG * item.Portions, 1));
            }
            return new Recall24hRow(null, item.MealName.Trim(), item.FoodName.Trim(), item.Portions,
                item.HouseholdMeasure?.Trim() ?? string.Empty, item.Grams, item.EnergyKcal,
                item.ProteinG, item.CarbohydrateG, item.FatG);
        }).ToList());
    }

    private static void ApplyAssessment(AssessmentRequest request, NutritionAssessment assessment, List<Recall24hRow> recall)
    {
        assessment.Recall24hJson = recall.Count == 0 ? string.Empty : JsonSerializer.Serialize(recall, Recall24hJson.Options);
        // Si solo se llenó la tabla, el texto de ingesta se arma con ella para no pedir el dato dos veces.
        var intake = request.DailyIntake.Trim();
        if (intake.Length == 0) intake = Recall24hJson.DescribeFoods(recall);
        assessment.DailyIntake = intake.Length > 4000 ? intake[..4000] : intake;
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
        assessment.MedicalHistory = request.MedicalHistory?.Trim() ?? string.Empty;
        assessment.FamilyHistory = request.FamilyHistory?.Trim() ?? string.Empty;
        assessment.Medications = request.Medications?.Trim() ?? string.Empty;
        assessment.Supplements = request.Supplements?.Trim() ?? string.Empty;
        assessment.LabResults = request.LabResults?.Trim() ?? string.Empty;
        assessment.ReproductiveStatus = request.ReproductiveStatus?.Trim() ?? string.Empty;
    }
}

public sealed record RecallItemRequest(
    Guid? FoodItemId,
    [Required, MaxLength(60)] string MealName,
    [MaxLength(180)] string FoodName,
    [Range(0.01, 100)] decimal Portions,
    [MaxLength(120)] string? HouseholdMeasure = null,
    [Range(0, 10000)] decimal Grams = 0,
    [Range(0, 20000)] decimal EnergyKcal = 0,
    [Range(0, 2000)] decimal ProteinG = 0,
    [Range(0, 2000)] decimal CarbohydrateG = 0,
    [Range(0, 2000)] decimal FatG = 0);

public sealed record AssessmentRequest(
    [MaxLength(4000)] string DailyIntake,
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
    [MaxLength(4000)] string ClinicalNotes,
    [MaxLength(2000)] string? MedicalHistory = null,
    [MaxLength(2000)] string? FamilyHistory = null,
    [MaxLength(1000)] string? Medications = null,
    [MaxLength(1000)] string? Supplements = null,
    [MaxLength(2000)] string? LabResults = null,
    [MaxLength(60)] string? ReproductiveStatus = null,
    IReadOnlyList<RecallItemRequest>? Recall24h = null);
public sealed record AnthropometryRequest(
    DateOnly MeasuredOn,
    [Range(20, 350)] decimal WeightKg,
    [Range(90, 250)] decimal HeightCm,
    [Range(20, 250)] decimal? WaistCm,
    [Range(20, 250)] decimal? HipCm,
    [Range(0, 80)] decimal? BodyFatPercent,
    [MaxLength(1000)] string Notes,
    [Range(40, 150)] decimal? SittingHeightCm = null,
    [Range(60, 260)] decimal? ArmSpanCm = null,
    [Range(1, 100)] decimal? TricepsSkinfoldMm = null,
    [Range(1, 100)] decimal? SubscapularSkinfoldMm = null,
    [Range(1, 100)] decimal? BicepsSkinfoldMm = null,
    [Range(1, 100)] decimal? IliacCrestSkinfoldMm = null,
    [Range(1, 100)] decimal? SupraspinaleSkinfoldMm = null,
    [Range(1, 100)] decimal? AbdominalSkinfoldMm = null,
    [Range(1, 100)] decimal? FrontThighSkinfoldMm = null,
    [Range(1, 100)] decimal? MedialCalfSkinfoldMm = null,
    [Range(5, 100)] decimal? ArmRelaxedCm = null,
    [Range(5, 100)] decimal? ArmFlexedCm = null,
    [Range(5, 100)] decimal? ForearmCm = null,
    [Range(30, 250)] decimal? ChestCm = null,
    [Range(10, 150)] decimal? MidThighCm = null,
    [Range(5, 100)] decimal? CalfCm = null,
    [Range(10, 100)] decimal? NeckCm = null,
    [Range(20, 80)] decimal? HeadCm = null,
    [Range(1, 20)] decimal? HumerusBreadthCm = null,
    [Range(1, 20)] decimal? WristBreadthCm = null,
    [Range(1, 25)] decimal? FemurBreadthCm = null,
    [Range(20, 350)] decimal? UsualWeightKg = null,
    [Range(20, 80)] decimal? KneeHeightCm = null,
    [Range(0, 150)] decimal? GripStrengthKg = null,
    [MaxLength(40)] string? EdemaGrade = null,
    [MaxLength(40)] string? AscitesGrade = null);
