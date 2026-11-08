using System.Globalization;
using System.Text.Json;

namespace NutriVida.Api.Services.Pdf;

public sealed record Recall24hRow(
    Guid? FoodItemId,
    string MealName,
    string FoodName,
    decimal Portions,
    string HouseholdMeasure,
    decimal Grams,
    decimal EnergyKcal,
    decimal ProteinG,
    decimal CarbohydrateG,
    decimal FatG);

public static class Recall24hJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static IReadOnlyList<Recall24hRow> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<Recall24hRow>>(json, Options) ?? []; }
        catch (JsonException) { return []; }
    }

    public static string DescribeFoods(IReadOnlyList<Recall24hRow> rows) => string.Join("\n", rows
        .GroupBy(row => row.MealName)
        .Select(meal => $"{meal.Key}: {string.Join(", ", meal.Select(row => row.FoodName))}"));

    public static string DescribeTotals(IReadOnlyList<Recall24hRow> rows)
    {
        if (rows.Count == 0) return string.Empty;
        string Value(decimal value) => value.ToString("0.#", CultureInfo.InvariantCulture);
        return $"{Value(rows.Sum(x => x.EnergyKcal))} kcal · proteína {Value(rows.Sum(x => x.ProteinG))} g · "
            + $"carbohidrato {Value(rows.Sum(x => x.CarbohydrateG))} g · grasa {Value(rows.Sum(x => x.FatG))} g";
    }
}
