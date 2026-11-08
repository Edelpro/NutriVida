using NutriVida.Domain.Common;

namespace NutriVida.Domain.MenuPlanning;

public enum MenuPlanStatus { Draft, ReadyForReview, Approved, Sent }

public sealed class MenuPlan : BaseEntity
{
    public Guid PatientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartsOn { get; set; }
    public DateOnly EndsOn { get; set; }
    public decimal EnergyTargetKcal { get; set; }
    public MenuPlanStatus Status { get; set; } = MenuPlanStatus.Draft;
    public DateTime? ApprovedAtUtc { get; set; }
    public string ApprovedByName { get; set; } = string.Empty;
    public string ProfessionalNotes { get; set; } = string.Empty;
    public List<MenuPlanItem> Items { get; set; } = [];
}

public sealed class MenuPlanItem : BaseEntity
{
    public Guid MenuPlanId { get; set; }
    public Guid? FoodItemId { get; set; }
    public int DayOfWeek { get; set; }
    public string MealName { get; set; } = string.Empty;
    public string FoodNameSnapshot { get; set; } = string.Empty;
    public decimal Portions { get; set; }
    public decimal Grams { get; set; }
    public decimal EnergyKcal { get; set; }
    public string HouseholdMeasure { get; set; } = string.Empty;
}
