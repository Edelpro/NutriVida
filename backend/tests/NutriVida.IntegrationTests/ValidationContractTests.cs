using System.ComponentModel.DataAnnotations;
using System.Reflection;
using NutriVida.Api.Controllers.Communications;
using NutriVida.Api.Controllers.Energy;
using NutriVida.Api.Controllers.Patients;
using NutriVida.Api.Controllers.Assessments;
using NutriVida.Api.Controladores.Seguimientos;
using NutriVida.Api.Controladores.Platos;
using NutriVida.Api.Controladores.PlanesMenu;
using NutriVida.Api.Controllers.Users;
using NutriVida.Api.Controllers.FoodCatalog;
using NutriVida.Domain.Communications;
using NutriVida.Domain.Energy;
using NutriVida.Domain.FollowUps;
using NutriVida.Domain.Patients;

namespace NutriVida.IntegrationTests;

public sealed class ValidationContractTests
{
    [Fact]
    public void Patient_RejectsShortIdentityAndPhone()
    {
        var request = new CreatePatientRequest("1", "A", "B", new DateOnly(1990, 1, 1),
            BiologicalSex.Female, "correo-invalido", "12", "", "", false, false, null);

        var errors = Validate(request);

        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.DocumentNumber)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Phone)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Email)));
    }

    [Fact]
    public void Patient_AllowsEmptyEmail()
    {
        var request = new CreatePatientRequest("PRUEBA-001", "Ana", "Torres", new DateOnly(1990, 1, 1),
            BiologicalSex.Female, "", "+593990000000", "", "", false, false, null);

        Assert.DoesNotContain(Validate(request), x => x.MemberNames.Contains(nameof(request.Email)));
    }

    [Fact]
    public void Patient_RejectsUnknownBiologicalSexValue()
    {
        var request = new CreatePatientRequest("PRUEBA-001", "Ana", "Torres", new DateOnly(1990, 1, 1),
            (BiologicalSex)99, "ana@example.test", "+593990000000", "", "", false, false, null);

        Assert.Contains(Validate(request), x => x.MemberNames.Contains(nameof(request.SexAtBirth)));
    }

    [Fact]
    public void Energy_RejectsImpossibleClinicalRanges()
    {
        var request = new CalculateEnergyRequest(Guid.NewGuid(), EnergyFormula.MifflinStJeor,
            10, 300, 10, "otro", 5, 0.8m, 5000);

        Assert.True(Validate(request).Count >= 6);
    }

    [Theory]
    [InlineData("Female")]
    [InlineData("MALE")]
    [InlineData("Femenino")]
    public void Energy_AcceptsSupportedSexValuesRegardlessOfCase(string sex)
    {
        var request = new CalculateEnergyRequest(Guid.NewGuid(), EnergyFormula.MifflinStJeor,
            70, 165, 35, sex, 1.55m, 0.10m, 0);

        Assert.DoesNotContain(Validate(request), x => x.MemberNames.Contains(nameof(request.Sex)));
    }

    [Fact]
    public void Menu_RequiresAtLeastOneItem()
    {
        var request = new MenuPlanRequest(Guid.NewGuid(), "Plan", DateOnly.FromDateTime(DateTime.Today),
            DateOnly.FromDateTime(DateTime.Today.AddDays(7)), 1800, "", []);

        Assert.Contains(Validate(request), x => x.MemberNames.Contains(nameof(request.Items)));
    }

    [Fact]
    public void Message_RejectsEmptyContent()
    {
        var request = new SendMessageRequest(Guid.NewGuid(), null, MessageChannel.WhatsApp, "", "corto");

        var errors = Validate(request);
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Subject)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Body)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public void Assessment_RejectsBristolOutsideClinicalScale(int bristolType)
    {
        var request = new AssessmentRequest("Ingesta registrada", "07:00 y 13:00", "", "",
            7, "Adecuada", "Caminata", 120, "Tres veces por semana", false,
            bristolType, "Diaria", "Sin observaciones");

        Assert.Contains(Validate(request), x => x.MemberNames.Contains(nameof(request.BristolStoolType)));
    }

    [Fact]
    public void Anthropometry_RejectsImpossibleClinicalRanges()
    {
        var request = new AnthropometryRequest(DateOnly.FromDateTime(DateTime.Today),
            10, 300, 10, 300, 90, "Medición inválida");

        var errors = Validate(request);
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.WeightKg)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.HeightCm)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.WaistCm)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.HipCm)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.BodyFatPercent)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public void FollowUp_RejectsBristolOutsideClinicalScale(int bristolType)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var request = new FollowUpRequest(today, today.AddDays(-14), today, today.AddDays(14), 14,
            FollowUpObjectiveStatus.InProgress, 70, 120, "Caminata", 7, 80, bristolType,
            "Sin síntomas", "Mantener el plan", "Control de prueba");

        Assert.Contains(Validate(request), x => x.MemberNames.Contains(nameof(request.BristolStoolType)));
    }

    [Fact]
    public void FollowUp_AllowsFlexibleIntervalAndOptionalIndicators()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var request = new FollowUpRequest(today, null, null, today.AddDays(21), 21,
            FollowUpObjectiveStatus.NotEvaluated, null, null, string.Empty, null, null, null,
            string.Empty, string.Empty, "Control acordado según evolución clínica");

        Assert.Empty(Validate(request));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(366)]
    public void FollowUp_RejectsIntervalOutsideSupportedRange(int intervalDays)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var request = new FollowUpRequest(today, null, null, null, intervalDays,
            FollowUpObjectiveStatus.NotEvaluated, null, null, string.Empty, null, null, null,
            string.Empty, string.Empty, string.Empty);

        Assert.Contains(Validate(request), x => x.MemberNames.Contains(nameof(request.FollowUpIntervalDays)));
    }

    [Fact]
    public void Dish_RejectsInvalidIngredientRanges()
    {
        var request = new DishRequest("Plato de prueba", "Almuerzo", 0, 1500,
            DateOnly.FromDateTime(DateTime.Today), "Preparación de prueba", "", null, null,
            [new DishIngredientRequest(Guid.NewGuid(), 0, -1)]);

        var errors = Validate(request);
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Servings)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.PreparationMinutes)));
    }

    [Fact]
    public void AccessRequest_RequiresValidIdentityAndEmail()
    {
        var request = new CreateAccessRequest("A", "correo-invalido");

        var errors = Validate(request);

        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.FullName)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Email)));
    }

    [Fact]
    public void PersonalizedFood_RejectsMissingReferenceAndInvalidPortion()
    {
        var request = new SavePersonalizedFoodRequest(
            "A", "", 0, "", -1, -1, -1, -1, -1, -1, "");

        var errors = Validate(request);

        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Name)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.Group)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.PortionGrams)));
        Assert.Contains(errors, x => x.MemberNames.Contains(nameof(request.SourceReference)));
    }

    private static List<ValidationResult> Validate(object value)
    {
        var results = new List<ValidationResult>();
        var constructor = value.GetType().GetConstructors().Single();
        foreach (var parameter in constructor.GetParameters())
        {
            var attributes = parameter.GetCustomAttributes<ValidationAttribute>().ToArray();
            if (attributes.Length == 0) continue;
            var property = value.GetType().GetProperty(parameter.Name!, BindingFlags.Public | BindingFlags.Instance)!;
            var context = new ValidationContext(value) { MemberName = property.Name };
            Validator.TryValidateValue(property.GetValue(value), context, results, attributes);
        }
        return results;
    }
}
