using NutriVida.Domain.Common;

namespace NutriVida.Domain.Assessments;

public enum DiagnosisStatus { Draft, Approved, Superseded }

public sealed class NutritionDiagnosis : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid? AssessmentId { get; set; }
    public string ProblemCode { get; set; } = string.Empty;
    public string ProblemStatement { get; set; } = string.Empty;
    public string Etiology { get; set; } = string.Empty;
    public string SignsAndSymptoms { get; set; } = string.Empty;
    public DiagnosisStatus Status { get; set; } = DiagnosisStatus.Draft;
    public string ProfessionalName { get; set; } = string.Empty;
    public DateTime? ApprovedAtUtc { get; set; }
}
