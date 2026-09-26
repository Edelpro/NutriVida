using NutriVida.Domain.Common;

namespace NutriVida.Domain.FoodCatalog;

public sealed class FoodCatalogImport : BaseEntity
{
    public Guid ClinicId { get; set; }
    public FoodCatalogSource Source { get; set; }
    public string SourceEdition { get; set; } = string.Empty;
    public string SourceReference { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public int ImportedRows { get; set; }
    public int UpdatedRows { get; set; }
    public Guid? ImportedByUserId { get; set; }
    public string ImportedByEmail { get; set; } = string.Empty;
    public DateTime ImportedAtUtc { get; set; } = DateTime.UtcNow;
}
