using NutriVida.Api.Controllers.FoodCatalog;

namespace NutriVida.IntegrationTests;

public sealed class FoodCsvNumberTests
{
    [Theory]
    [InlineData("1.5", 1.5)]
    [InlineData("0", 0)]
    [InlineData("10000", 10000)]
    public void AcceptsDecimalPoint(string text, double expected) =>
        Assert.Equal((decimal)expected, FoodCsvNumber.Parse(text, "energy_kcal", 10000));

    [Theory]
    [InlineData("1,5", 1.5)]
    [InlineData("80", 80)]
    public void SemicolonFiles_AcceptDecimalComma(string text, double expected) =>
        Assert.Equal((decimal)expected, FoodCsvNumber.Parse(text, "energy_kcal", 10000, decimalComma: true));

    [Theory]
    [InlineData("1.500")]
    [InlineData("1.5")]
    public void SemicolonFiles_RejectAmbiguousPoints(string text) =>
        Assert.Throws<FormatException>(() => FoodCsvNumber.Parse(text, "energy_kcal", 10000, decimalComma: true));

    [Theory]
    [InlineData("1,5")]
    [InlineData("1,500")]
    [InlineData("-1")]
    [InlineData("1e3")]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("10000.01")]
    [InlineData("99999999999999999999999999999999999")]
    public void RejectsAmbiguousOrOutOfRangeValues(string text)
    {
        var error = Assert.Throws<FormatException>(() => FoodCsvNumber.Parse(text, "energy_kcal", 10000));
        Assert.Contains("energy_kcal", error.Message);
    }
}
