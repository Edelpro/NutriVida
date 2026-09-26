using NutriVida.Domain.Common;

namespace NutriVida.Domain.Identity;

public enum AccessRequestStatus
{
    Pending,
    Approved,
    Rejected
}

public sealed class AccessRequest : BaseEntity
{
    public Guid ClinicId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RequestedRole { get; set; } = "Nutritionist";
    public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}
