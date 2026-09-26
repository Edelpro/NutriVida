using NutriVida.Domain.Common;

namespace NutriVida.Domain.Consultations;

public enum ConsultationStatus { Scheduled, InProgress, Completed, Cancelled }

public sealed class Consultation : BaseEntity
{
    public Guid PatientId { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public int DurationMinutes { get; set; } = 45;
    public ConsultationStatus Status { get; set; } = ConsultationStatus.Scheduled;
    public string Reason { get; set; } = string.Empty;
    public string ProfessionalName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
