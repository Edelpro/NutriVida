using NutriVida.Domain.Common;

namespace NutriVida.Domain.Energy;

public enum EnergyFormula { MifflinStJeor, RevisedHarrisBenedict }

public sealed class EnergyCalculation : BaseEntity
{
    public Guid PatientId { get; set; }
    public EnergyFormula Formula { get; set; }
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
    public int AgeYears { get; set; }
    public string Sex { get; set; } = string.Empty;
    public decimal ActivityFactor { get; set; }
    public decimal EtaPercent { get; set; }
    public decimal GoalAdjustmentKcal { get; set; }
    public decimal RestingEnergyKcal { get; set; }
    public decimal TotalEnergyKcal { get; set; }
}
