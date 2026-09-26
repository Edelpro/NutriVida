using NutriVida.Domain.Common;

namespace NutriVida.Domain.FollowUps;

public sealed class WeeklyFollowUp : BaseEntity
{
    public Guid PatientId { get; set; }
    public DateOnly FollowUpDate { get; set; }
    public DateOnly? PeriodStartsOn { get; set; }
    public DateOnly? PeriodEndsOn { get; set; }
    public DateOnly? NextAppointmentOn { get; set; }
    public int? FollowUpIntervalDays { get; set; }
    public FollowUpObjectiveStatus ObjectiveStatus { get; set; }
    public decimal? WeightKg { get; set; }
    public int? ExerciseMinutes { get; set; }
    public string ExerciseType { get; set; } = string.Empty;
    public decimal? AverageSleepHours { get; set; }
    public int? PlanAdherencePercent { get; set; }
    public int? BristolStoolType { get; set; }
    public string Symptoms { get; set; } = string.Empty;
    public string Adjustments { get; set; } = string.Empty;
    public string ProfessionalNotes { get; set; } = string.Empty;
}

public enum FollowUpObjectiveStatus
{
    NotEvaluated = 0,
    InProgress = 1,
    Achieved = 2,
    NoChange = 3,
    NeedsAdjustment = 4,
}
