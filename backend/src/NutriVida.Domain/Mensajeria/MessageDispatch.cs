using NutriVida.Domain.Common;

namespace NutriVida.Domain.Communications;

public enum MessageChannel { Email, WhatsApp }
public enum MessageStatus { Draft, Queued, Sent, Failed, Delivered, Read }

public sealed class MessageDispatch : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid? MenuPlanId { get; set; }
    public MessageChannel Channel { get; set; }
    public MessageStatus Status { get; set; } = MessageStatus.Draft;
    public string DestinationMasked { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string SecureLinkToken { get; set; } = string.Empty;
    public DateTime? SentAtUtc { get; set; }
    public string ProviderReference { get; set; } = string.Empty;
}
