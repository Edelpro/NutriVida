using NutriVida.Application.Energy;
using NutriVida.Domain.Energy;

namespace NutriVida.UnitTests;

public sealed class EnergyCalculatorTests
{
    private readonly EnergyCalculator _calculator = new();

    [Fact]
    public void MifflinFemale_ReturnsTransparentBreakdown()
    {
        var result = _calculator.Calculate(new EnergyCalculationRequest(
            EnergyFormula.MifflinStJeor, 66.9m, 164m, 34, "female", 1.55m, 0.10m));
        Assert.Equal(1363m, result.RestingEnergyKcal);
        Assert.Equal(750m, result.ActivityEnergyKcal);
        Assert.Equal(211m, result.EtaKcal);
        Assert.Equal(2324m, result.TotalEnergyKcal);
        Assert.Contains("Mifflin", result.Source);
    }

    [Fact]
    public void RevisedHarrisMale_AppliesGoalAdjustment()
    {
        var result = _calculator.Calculate(new EnergyCalculationRequest(
            EnergyFormula.RevisedHarrisBenedict, 80m, 178m, 40, "male", 1.375m, 0.10m, -300m));
        Assert.True(result.RestingEnergyKcal > 1600m);
        Assert.Equal(-300m, result.GoalAdjustmentKcal);
        Assert.True(result.TotalEnergyKcal > result.RestingEnergyKcal);
    }

    [Fact]
    public void UnsupportedSex_IsRejectedRatherThanGuessed()
    {
        var request = new EnergyCalculationRequest(
            EnergyFormula.MifflinStJeor, 70m, 170m, 30, "not-specified", 1.2m, 0.1m);
        Assert.Throws<ArgumentException>(() => _calculator.Calculate(request));
    }

    [Theory]
    [InlineData(10, 170, 30, 1.2, .1)]
    [InlineData(70, 60, 30, 1.2, .1)]
    [InlineData(70, 170, 15, 1.2, .1)]
    [InlineData(70, 170, 30, 3.0, .1)]
    [InlineData(70, 170, 30, 1.2, .5)]
    public void OutOfRangeInputs_AreRejected(double weight, double height, int age, double activity, double eta)
    {
        var request = new EnergyCalculationRequest(EnergyFormula.MifflinStJeor,
            (decimal)weight, (decimal)height, age, "female", (decimal)activity, (decimal)eta);
        Assert.Throws<ArgumentOutOfRangeException>(() => _calculator.Calculate(request));
    }
}
