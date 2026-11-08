using NutriVida.Api.Controladores.PlanesMenu;
using NutriVida.Api.Controllers.Patients;
using NutriVida.Application.Energy;
using NutriVida.Domain.Energy;

namespace NutriVida.IntegrationTests;

public sealed class ClinicalRulesTests
{
    [Theory]
    [InlineData("1710034065", true)]
    [InlineData("1710034064", false)]
    [InlineData("9910034065", false)]
    [InlineData("1770034065", false)]
    public void Cedula_ChecksProvinceAndVerifierDigit(string value, bool expected) =>
        Assert.Equal(expected, EcuadorianId.IsValidCedula(value));

    [Theory]
    [InlineData("PRUEBA-001")]
    [InlineData("AB123456")]
    [InlineData("123456789")]
    public void PassportsAndCodes_AreNotTreatedAsCedula(string value) =>
        Assert.False(EcuadorianId.LooksLikeCedula(value));

    [Theory]
    [InlineData(1, true)]
    [InlineData(2, false)]
    [InlineData(7, false)]
    public void OneDayPlan_OnlyAcceptsItsOwnWeekday(int day, bool expected) =>
        Assert.Equal(expected, MenuPlanRules.IsDayWithinPlan(new DateOnly(2026, 11, 2), new DateOnly(2026, 11, 2), day));

    [Fact]
    public void WeekendPlan_MapsSundayToSeven()
    {
        var saturday = new DateOnly(2026, 11, 7);
        var sunday = new DateOnly(2026, 11, 8);
        Assert.True(MenuPlanRules.IsDayWithinPlan(saturday, sunday, 6));
        Assert.True(MenuPlanRules.IsDayWithinPlan(saturday, sunday, 7));
        Assert.False(MenuPlanRules.IsDayWithinPlan(saturday, sunday, 1));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    public void WeeklyPlan_AcceptsEveryDay(int day) =>
        Assert.True(MenuPlanRules.IsDayWithinPlan(new DateOnly(2026, 11, 4), new DateOnly(2026, 11, 10), day));

    [Fact]
    public void ImpossibleEnergyCombination_FallsBelowTheMinimum()
    {
        var result = new EnergyCalculator().Calculate(new EnergyCalculationRequest(
            EnergyFormula.MifflinStJeor, 20, 90, 120, "female", 1, 0, -1000));

        Assert.True(result.TotalEnergyKcal < EnergyCalculator.MinimumTotalKcal);
    }
}
