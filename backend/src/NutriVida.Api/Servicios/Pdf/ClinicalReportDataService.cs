using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Assessments;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Domain.Patients;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Services.Pdf;

public enum ClinicalReportAudience { Professional, Patient }

public interface IClinicalReportDataService
{
    Task<ClinicalReportPdfData> BuildAsync(Patient patient, string preparedBy, Guid? menuPlanId,
        ClinicalReportAudience audience, CancellationToken cancellationToken);
}

public sealed class ClinicalReportDataService(NutriVidaDbContext db) : IClinicalReportDataService
{
    private static string DescribeMeasurement(AnthropometricMeasurement m)
    {
        var parts = new List<string>();
        void Add(string label, decimal? value, string unit)
        {
            if (value.HasValue) parts.Add($"{label} {value.Value:0.#} {unit}");
        }
        Add("Talla sentada", m.SittingHeightCm, "cm");
        Add("Envergadura", m.ArmSpanCm, "cm");
        Add("Pliegue tríceps", m.TricepsSkinfoldMm, "mm");
        Add("subescapular", m.SubscapularSkinfoldMm, "mm");
        Add("bíceps", m.BicepsSkinfoldMm, "mm");
        Add("cresta ilíaca", m.IliacCrestSkinfoldMm, "mm");
        Add("supraespinal", m.SupraspinaleSkinfoldMm, "mm");
        Add("abdominal", m.AbdominalSkinfoldMm, "mm");
        Add("muslo", m.FrontThighSkinfoldMm, "mm");
        Add("pantorrilla", m.MedialCalfSkinfoldMm, "mm");
        Add("Perímetro brazo relajado", m.ArmRelaxedCm, "cm");
        Add("brazo flexionado", m.ArmFlexedCm, "cm");
        Add("antebrazo", m.ForearmCm, "cm");
        Add("tórax", m.ChestCm, "cm");
        Add("muslo medio", m.MidThighCm, "cm");
        Add("pantorrilla", m.CalfCm, "cm");
        Add("cuello", m.NeckCm, "cm");
        Add("cefálico", m.HeadCm, "cm");
        Add("Diámetro húmero", m.HumerusBreadthCm, "cm");
        Add("muñeca", m.WristBreadthCm, "cm");
        Add("fémur", m.FemurBreadthCm, "cm");
        Add("Peso habitual", m.UsualWeightKg, "kg");
        Add("Altura de rodilla", m.KneeHeightCm, "cm");
        Add("Fuerza de agarre", m.GripStrengthKg, "kg");
        if (!string.IsNullOrWhiteSpace(m.EdemaGrade)) parts.Add($"Edema {m.EdemaGrade}");
        if (!string.IsNullOrWhiteSpace(m.AscitesGrade)) parts.Add($"Ascitis {m.AscitesGrade}");
        return string.Join(" · ", parts);
    }

    public async Task<ClinicalReportPdfData> BuildAsync(Patient patient, string preparedBy, Guid? menuPlanId,
        ClinicalReportAudience audience, CancellationToken cancellationToken)
    {
        var forPatient = audience == ClinicalReportAudience.Patient;
        var measures = await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderBy(x => x.MeasuredAtUtc)
            .Select(x => new ClinicalMeasurementPdfRow(x.MeasuredAtUtc, x.WeightKg, x.HeightCm, x.WaistCm, x.HipCm, x.BodyFatPercent))
            .ToListAsync(cancellationToken);
        var latestMeasurement = forPatient ? null : await db.AnthropometricMeasurements.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.MeasuredAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var assessment = await db.NutritionAssessments.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.RecordedAtUtc)
            .Select(x => new ClinicalAssessmentPdfRow(x.DailyIntake, x.Intolerances, x.Allergies,
                x.EatingSchedule, x.SleepHours, x.SleepQuality, x.ExerciseType,
                x.ExerciseMinutesPerWeek, x.ExerciseSchedule, x.HasConstipation,
                x.BristolStoolType, x.BowelFrequency, x.ClinicalNotes,
                x.MedicalHistory, x.FamilyHistory, x.Medications, x.Supplements, x.LabResults, x.ReproductiveStatus,
                x.Recall24hJson))
            .FirstOrDefaultAsync(cancellationToken);

        var diagnosisQuery = db.NutritionDiagnoses.AsNoTracking().Where(x => x.PatientId == patient.Id && !x.IsArchived);
        if (forPatient) diagnosisQuery = diagnosisQuery.Where(x => x.Status == DiagnosisStatus.Approved);
        var diagnosisEntity = await diagnosisQuery
            .OrderByDescending(x => x.ApprovedAtUtc ?? x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var diagnosis = diagnosisEntity is null ? null : new ClinicalDiagnosisPdfRow(
            diagnosisEntity.ProblemCode, diagnosisEntity.ProblemStatement, diagnosisEntity.Etiology,
            diagnosisEntity.SignsAndSymptoms, diagnosisEntity.Status.ToString(),
            diagnosisEntity.ProfessionalName, diagnosisEntity.CreatedAtUtc);

        var energyEntity = await db.EnergyCalculations.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var energy = energyEntity is null ? null : new ClinicalEnergyPdfRow(
            energyEntity.Formula.ToString(), energyEntity.RestingEnergyKcal,
            energyEntity.ActivityFactor, energyEntity.EtaPercent, energyEntity.GoalAdjustmentKcal,
            energyEntity.TotalEnergyKcal, energyEntity.CreatedAtUtc);

        var menuQuery = db.MenuPlans.AsNoTracking().Include(x => x.Items)
            .Where(x => x.PatientId == patient.Id && !x.IsArchived);
        if (menuPlanId.HasValue) menuQuery = menuQuery.Where(x => x.Id == menuPlanId.Value);
        if (forPatient) menuQuery = menuQuery.Where(x => x.Status == MenuPlanStatus.Approved);
        var menuEntity = await menuQuery.OrderByDescending(x => x.StartsOn).FirstOrDefaultAsync(cancellationToken);
        var menu = menuEntity is null ? null : new ClinicalMenuPlanPdfData(
            menuEntity.Name, menuEntity.StartsOn, menuEntity.EndsOn, menuEntity.EnergyTargetKcal,
            menuEntity.Status.ToString(), menuEntity.ProfessionalNotes,
            menuEntity.Items.Select(x => new ClinicalMenuItemPdfRow(x.DayOfWeek, x.MealName,
                x.FoodNameSnapshot, x.Portions, x.Grams, x.EnergyKcal, x.HouseholdMeasure)).ToList());

        var followUps = await db.WeeklyFollowUps.AsNoTracking()
            .Where(x => x.PatientId == patient.Id && !x.IsArchived)
            .OrderByDescending(x => x.FollowUpDate)
            .Take(8)
            .Select(x => new ClinicalFollowUpPdfRow(x.FollowUpDate, x.WeightKg, x.AverageSleepHours,
                x.ExerciseMinutes, x.ExerciseType, x.PlanAdherencePercent, x.BristolStoolType, x.Symptoms))
            .ToListAsync(cancellationToken);

        var practiceName = await db.ClinicSettings.AsNoTracking()
            .Where(x => x.ClinicId == patient.ClinicId)
            .Select(x => x.PracticeName)
            .FirstOrDefaultAsync(cancellationToken);

        var data = new ClinicalReportPdfData(
            $"{patient.FirstName} {patient.LastName}", patient.DocumentNumber, patient.DateOfBirth,
            patient.Goal, preparedBy, DateTime.UtcNow, measures, assessment, diagnosis, energy, menu, followUps,
            string.IsNullOrWhiteSpace(practiceName) ? "NutriVida" : practiceName,
            AnthropometryDetails: latestMeasurement is null ? string.Empty : DescribeMeasurement(latestMeasurement));
        return forPatient ? ClinicalReportAudiencePolicy.ForPatient(data) : data;
    }
}

public static class ClinicalReportAudiencePolicy
{
    /// <summary>
    /// Lo que se entrega al paciente no incluye las notas ni los antecedentes del profesional:
    /// esos datos no salen de la historia clínica por un enlace o un adjunto.
    /// </summary>
    public static ClinicalReportPdfData ForPatient(ClinicalReportPdfData data) => data with
    {
        Assessment = data.Assessment is null ? null : data.Assessment with
        {
            ClinicalNotes = string.Empty,
            MedicalHistory = string.Empty,
            FamilyHistory = string.Empty,
            Medications = string.Empty,
            Supplements = string.Empty,
            LabResults = string.Empty,
            ReproductiveStatus = string.Empty
        },
        IsPatientCopy = true,
        AnthropometryDetails = string.Empty
    };
}
