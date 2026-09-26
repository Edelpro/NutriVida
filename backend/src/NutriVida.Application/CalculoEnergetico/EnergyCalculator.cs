using NutriVida.Domain.Energy;

namespace NutriVida.Application.Energy;

public sealed record EnergyCalculationRequest(
    EnergyFormula Formula,
    decimal WeightKg,
    decimal HeightCm,
    int AgeYears,
    string Sex,
    decimal ActivityFactor,
    decimal EtaPercent,
    decimal GoalAdjustmentKcal = 0);

public sealed record EnergyCalculationResult(
    string Formula,
    decimal RestingEnergyKcal,
    decimal ActivityEnergyKcal,
    decimal EtaKcal,
    decimal GoalAdjustmentKcal,
    decimal TotalEnergyKcal,
    string Equation,
    string Source,
    string Caution);

public interface IEnergyCalculator
{
    EnergyCalculationResult Calculate(EnergyCalculationRequest request);
}

public sealed class EnergyCalculator : IEnergyCalculator
{
    public EnergyCalculationResult Calculate(EnergyCalculationRequest request)
    {
        Validate(request);
        var male = request.Sex.Equals("male", StringComparison.OrdinalIgnoreCase)
            || request.Sex.Equals("masculino", StringComparison.OrdinalIgnoreCase);

        var resting = request.Formula switch
        {
            EnergyFormula.MifflinStJeor => 10m * request.WeightKg + 6.25m * request.HeightCm
                - 5m * request.AgeYears + (male ? 5m : -161m),
            EnergyFormula.RevisedHarrisBenedict when male => 88.362m + 13.397m * request.WeightKg
                + 4.799m * request.HeightCm - 5.677m * request.AgeYears,
            EnergyFormula.RevisedHarrisBenedict => 447.593m + 9.247m * request.WeightKg
                + 3.098m * request.HeightCm - 4.330m * request.AgeYears,
            _ => throw new ArgumentOutOfRangeException(nameof(request.Formula))
        };

        var activityTotal = resting * request.ActivityFactor;
        var activityEnergy = activityTotal - resting;
        var eta = activityTotal * request.EtaPercent;
        var total = activityTotal + eta + request.GoalAdjustmentKcal;
        var equation = request.Formula == EnergyFormula.MifflinStJeor
            ? "10×peso + 6.25×talla − 5×edad + constante por sexo"
            : "Harris-Benedict revisada (Roza y Shizgal, 1984)";
        var source = request.Formula == EnergyFormula.MifflinStJeor
            ? "Mifflin et al., Am J Clin Nutr. 1990"
            : "Roza & Shizgal, Am J Clin Nutr. 1984";

        return new EnergyCalculationResult(
            request.Formula.ToString(), Round(resting), Round(activityEnergy), Round(eta),
            request.GoalAdjustmentKcal, Round(total), equation, source,
            "Estimación de apoyo profesional; requiere interpretación clínica individual.");
    }

    private static decimal Round(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);

    private static void Validate(EnergyCalculationRequest request)
    {
        if (request.WeightKg is < 20 or > 350) throw new ArgumentOutOfRangeException(nameof(request.WeightKg));
        if (request.HeightCm is < 90 or > 250) throw new ArgumentOutOfRangeException(nameof(request.HeightCm));
        if (request.AgeYears is < 18 or > 120) throw new ArgumentOutOfRangeException(nameof(request.AgeYears));
        if (request.ActivityFactor is < 1.0m or > 2.5m) throw new ArgumentOutOfRangeException(nameof(request.ActivityFactor));
        if (request.EtaPercent is < 0 or > 0.30m) throw new ArgumentOutOfRangeException(nameof(request.EtaPercent));
        if (request.GoalAdjustmentKcal is < -1000 or > 1000) throw new ArgumentOutOfRangeException(nameof(request.GoalAdjustmentKcal));
        if (!request.Sex.Equals("male", StringComparison.OrdinalIgnoreCase)
            && !request.Sex.Equals("masculino", StringComparison.OrdinalIgnoreCase)
            && !request.Sex.Equals("female", StringComparison.OrdinalIgnoreCase)
            && !request.Sex.Equals("femenino", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("La fórmula seleccionada requiere sexo femenino o masculino.", nameof(request.Sex));
    }
}
