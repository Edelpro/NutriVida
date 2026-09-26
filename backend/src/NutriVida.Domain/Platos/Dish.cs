using NutriVida.Domain.Common;

namespace NutriVida.Domain.MenuPlanning;

public sealed class Dish : BaseEntity
{
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MealName { get; set; } = string.Empty;
    public int Servings { get; set; } = 1;
    public int PreparationMinutes { get; set; }
    public DateOnly CostReferenceDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public string Instructions { get; set; } = string.Empty;
    public string CostNotes { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string VideoUrl { get; set; } = string.Empty;
    public List<DishIngredient> Ingredients { get; set; } = [];
}

public sealed class DishIngredient : BaseEntity
{
    public Guid DishId { get; set; }
    public Guid FoodItemId { get; set; }
    public string FoodNameSnapshot { get; set; } = string.Empty;
    public string HouseholdMeasureSnapshot { get; set; } = string.Empty;
    public decimal Portions { get; set; }
    public decimal Grams { get; set; }
    public decimal EstimatedCostUsd { get; set; }
    public decimal EnergyKcal { get; set; }
    public decimal ProteinG { get; set; }
    public decimal CarbohydrateG { get; set; }
    public decimal FatG { get; set; }
    public decimal FiberG { get; set; }
    public decimal SodiumMg { get; set; }
}
