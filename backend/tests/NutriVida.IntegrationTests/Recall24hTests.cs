using NutriVida.Api.Services.Pdf;

namespace NutriVida.IntegrationTests;

public sealed class Recall24hTests
{
    private static readonly Recall24hRow[] Rows =
    [
        new(null, "Desayuno", "Avena", 1, "1 taza", 100, 150, 5, 27, 3),
        new(null, "Desayuno", "Leche", 1, "1 taza", 240, 110, 9, 12, 4),
        new(null, "Almuerzo", "Arroz", 2, "1/2 taza", 200, 140, 4, 30, 0.5m)
    ];

    [Fact]
    public void Totals_AddEveryRow() =>
        Assert.Equal("400 kcal · proteína 18 g · carbohidrato 69 g · grasa 7.5 g", Recall24hJson.DescribeTotals(Rows));

    [Fact]
    public void Foods_AreGroupedByMeal() =>
        Assert.Equal("Desayuno: Avena, Leche\nAlmuerzo: Arroz", Recall24hJson.DescribeFoods(Rows));

    [Theory]
    [InlineData("")]
    [InlineData("no es json")]
    public void InvalidContent_IsEmpty(string json) => Assert.Empty(Recall24hJson.Parse(json));
}
