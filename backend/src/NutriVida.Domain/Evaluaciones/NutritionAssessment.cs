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
}

public sealed class AnthropometricMeasurement : BaseEntity
{
    public Guid PatientId { get; set; }
    public DateTime MeasuredAtUtc { get; set; } = DateTime.UtcNow;
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public string Notes { get; set; } = string.Empty;
}
