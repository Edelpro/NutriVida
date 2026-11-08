using NutriVida.Domain.Common;

namespace NutriVida.Domain.FoodCatalog;

public enum FoodCatalogSource { EcuadorDemo, EcuadorAuthorized, SmaeAuthorized, Personalized }

public sealed class FoodItem : BaseEntity
{
    public string SourceCode { get; set; } = string.Empty;
    public FoodCatalogSource Source { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string ExchangeGroup { get; set; } = string.Empty;
    public decimal PortionGrams { get; set; }
    public string HouseholdMeasure { get; set; } = string.Empty;
    public decimal EnergyKcal { get; set; }
    public decimal ProteinG { get; set; }
    public decimal CarbohydrateG { get; set; }
    public decimal FatG { get; set; }
    public decimal FiberG { get; set; }
    public decimal SodiumMg { get; set; }
    public string SourceEdition { get; set; } = string.Empty;
    public string SourceReference { get; set; } = string.Empty;
}
