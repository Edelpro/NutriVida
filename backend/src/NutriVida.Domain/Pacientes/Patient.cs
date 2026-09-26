using NutriVida.Domain.Common;

namespace NutriVida.Domain.Patients;

public enum BiologicalSex { Female, Male, Intersex, NotSpecified }
public enum PatientStatus { Active, Paused, Archived }

public sealed class Patient : BaseEntity
{
    public Guid ClinicId { get; set; }
    public Guid? AssignedNutritionistUserId { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public BiologicalSex SexAtBirth { get; set; } = BiologicalSex.NotSpecified;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Occupation { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public PatientStatus Status { get; set; } = PatientStatus.Active;
    public DateTime? EmailConsentAtUtc { get; set; }
    public DateTime? WhatsAppConsentAtUtc { get; set; }
}
