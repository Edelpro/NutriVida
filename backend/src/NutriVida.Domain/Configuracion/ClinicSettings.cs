using NutriVida.Domain.Common;
using NutriVida.Domain.Energy;

namespace NutriVida.Domain.Settings;

public sealed class ClinicSettings : BaseEntity
{
    public Guid ClinicId { get; set; }
    public string PracticeName { get; set; } = "NutriVida · Consulta nutricional";
    public string Address { get; set; } = string.Empty;
    public EnergyFormula DefaultFormula { get; set; } = EnergyFormula.MifflinStJeor;
    public decimal DefaultEtaPercent { get; set; } = 0.10m;
}
