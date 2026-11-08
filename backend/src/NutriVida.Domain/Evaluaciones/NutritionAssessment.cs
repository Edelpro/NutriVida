using NutriVida.Domain.Common;

namespace NutriVida.Domain.Assessments;

public sealed class NutritionAssessment : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid? ConsultationId { get; set; }
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
    public string DailyIntake { get; set; } = string.Empty;
    public string EatingSchedule { get; set; } = string.Empty;
    public string Allergies { get; set; } = string.Empty;
    public string Intolerances { get; set; } = string.Empty;
    public decimal SleepHours { get; set; }
    public string SleepQuality { get; set; } = string.Empty;
    public string ExerciseType { get; set; } = string.Empty;
    public int ExerciseMinutesPerWeek { get; set; }
    public string ExerciseSchedule { get; set; } = string.Empty;
    public bool HasConstipation { get; set; }
    public int? BristolStoolType { get; set; }
    public string BowelFrequency { get; set; } = string.Empty;
    public string ClinicalNotes { get; set; } = string.Empty;
    public string MedicalHistory { get; set; } = string.Empty;
    public string FamilyHistory { get; set; } = string.Empty;
    public string Medications { get; set; } = string.Empty;
    public string Supplements { get; set; } = string.Empty;
    public string LabResults { get; set; } = string.Empty;
    public string ReproductiveStatus { get; set; } = string.Empty;
    public string Recall24hJson { get; set; } = string.Empty;
}

public sealed class AnthropometricMeasurement : BaseEntity
{
    public Guid PatientId { get; set; }
    public DateTime MeasuredAtUtc { get; set; } = DateTime.UtcNow;
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public string Notes { get; set; } = string.Empty;
    public decimal? SittingHeightCm { get; set; }
    public decimal? ArmSpanCm { get; set; }
    public decimal? TricepsSkinfoldMm { get; set; }
    public decimal? SubscapularSkinfoldMm { get; set; }
    public decimal? BicepsSkinfoldMm { get; set; }
    public decimal? IliacCrestSkinfoldMm { get; set; }
    public decimal? SupraspinaleSkinfoldMm { get; set; }
    public decimal? AbdominalSkinfoldMm { get; set; }
    public decimal? FrontThighSkinfoldMm { get; set; }
    public decimal? MedialCalfSkinfoldMm { get; set; }
    public decimal? ArmRelaxedCm { get; set; }
    public decimal? ArmFlexedCm { get; set; }
    public decimal? ForearmCm { get; set; }
    public decimal? ChestCm { get; set; }
    public decimal? MidThighCm { get; set; }
    public decimal? CalfCm { get; set; }
    public decimal? NeckCm { get; set; }
    public decimal? HeadCm { get; set; }
    public decimal? HumerusBreadthCm { get; set; }
    public decimal? WristBreadthCm { get; set; }
    public decimal? FemurBreadthCm { get; set; }
    public decimal? UsualWeightKg { get; set; }
    public decimal? KneeHeightCm { get; set; }
    public decimal? GripStrengthKg { get; set; }
    public string EdemaGrade { get; set; } = string.Empty;
    public string AscitesGrade { get; set; } = string.Empty;
}
