using System.Security.Claims;
using NutriVida.Api.Security;
using NutriVida.Domain.Patients;

namespace NutriVida.IntegrationTests;

public sealed class PatientAccessPolicyTests
{
    [Fact]
    public void Administrator_SeesEveryPatientInTheirClinic()
    {
        var clinicId = Guid.NewGuid();
        var firstNutritionist = Guid.NewGuid();
        var secondNutritionist = Guid.NewGuid();
        var user = BuildUser(Guid.NewGuid(), clinicId, "ClinicAdmin");
        var patients = BuildPatients(clinicId, firstNutritionist, secondNutritionist);

        var visible = patients.AsQueryable().Where(user.PatientAccessFilter()).ToList();

        Assert.Equal(3, visible.Count);
        Assert.DoesNotContain(visible, patient => patient.ClinicId != clinicId);
    }

    [Fact]
    public void Nutritionist_SeesOnlyTheirAssignedPatients()
    {
        var clinicId = Guid.NewGuid();
        var nutritionistId = Guid.NewGuid();
        var otherNutritionistId = Guid.NewGuid();
        var user = BuildUser(nutritionistId, clinicId, "Nutritionist");
        var patients = BuildPatients(clinicId, nutritionistId, otherNutritionistId);

        var visible = patients.AsQueryable().Where(user.PatientAccessFilter()).ToList();

        var patient = Assert.Single(visible);
        Assert.Equal(nutritionistId, patient.AssignedNutritionistUserId);
    }

    [Fact]
    public void ArchivedPatients_AreOnlyIncludedWhenRequested()
    {
        var clinicId = Guid.NewGuid();
        var user = BuildUser(Guid.NewGuid(), clinicId, "ClinicAdmin");
        var archived = new Patient { ClinicId = clinicId, IsArchived = true };

        Assert.Empty(new[] { archived }.AsQueryable().Where(user.PatientAccessFilter()));
        Assert.Single(new[] { archived }.AsQueryable().Where(user.PatientAccessFilter(includeArchived: true)));
    }

    private static ClaimsPrincipal BuildUser(Guid userId, Guid clinicId, string role) =>
        new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("clinic_id", clinicId.ToString()),
            new Claim(ClaimTypes.Role, role)
        ], "Tests"));

    private static List<Patient> BuildPatients(
        Guid clinicId,
        Guid firstNutritionist,
        Guid secondNutritionist) =>
    [
        new Patient { ClinicId = clinicId, AssignedNutritionistUserId = firstNutritionist },
        new Patient { ClinicId = clinicId, AssignedNutritionistUserId = secondNutritionist },
        new Patient { ClinicId = clinicId, AssignedNutritionistUserId = null },
        new Patient { ClinicId = Guid.NewGuid(), AssignedNutritionistUserId = firstNutritionist },
        new Patient { ClinicId = clinicId, AssignedNutritionistUserId = firstNutritionist, IsArchived = true }
    ];
}
