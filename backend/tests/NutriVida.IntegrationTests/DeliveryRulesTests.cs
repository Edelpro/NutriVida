using NutriVida.Api.Security;
using NutriVida.Api.Services.Pdf;
using NutriVida.Domain.Identity;

namespace NutriVida.IntegrationTests;

public sealed class DeliveryRulesTests
{
    private static readonly DateTime Now = new(2026, 11, 2, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void FourFailures_DoNotLockTheAccount()
    {
        var user = new ApplicationUser();
        for (var i = 0; i < LoginLockout.MaxAttempts - 1; i++) LoginLockout.RegisterFailure(user, Now);
        Assert.False(LoginLockout.IsLocked(user, Now));
    }

    [Fact]
    public void FifthFailure_LocksForFifteenMinutes()
    {
        var user = new ApplicationUser();
        for (var i = 0; i < LoginLockout.MaxAttempts; i++) LoginLockout.RegisterFailure(user, Now);
        Assert.True(LoginLockout.IsLocked(user, Now.AddMinutes(14)));
        Assert.False(LoginLockout.IsLocked(user, Now.AddMinutes(16)));
    }

    [Fact]
    public void Clear_RemovesLockAndCounter()
    {
        var user = new ApplicationUser();
        for (var i = 0; i < LoginLockout.MaxAttempts; i++) LoginLockout.RegisterFailure(user, Now);
        LoginLockout.Clear(user);
        Assert.False(LoginLockout.IsLocked(user, Now));
        Assert.Equal(0, user.FailedLoginAttempts);
    }

    [Fact]
    public void PatientCopy_RemovesProfessionalNotesAndHistory()
    {
        var data = new ClinicalReportPdfData("Ana", "PRUEBA", new DateOnly(1990, 1, 1), "Meta", "Dra.", Now,
            [], new ClinicalAssessmentPdfRow("Ingesta", "Lactosa", "Maní", "07:00", 7, "Buena", "Caminar", 100, "AM",
                false, 4, "Diaria", "Nota privada", "Diabetes", "Padre", "Metformina", "Omega", "Glucosa 110", "Embarazo"),
            null, null, null, []);

        var copy = ClinicalReportAudiencePolicy.ForPatient(data);

        Assert.True(copy.IsPatientCopy);
        Assert.Equal("Maní", copy.Assessment!.Allergies);
        Assert.Empty(copy.Assessment.ClinicalNotes);
        Assert.Empty(copy.Assessment.MedicalHistory);
        Assert.Empty(copy.Assessment.Medications);
        Assert.Empty(copy.Assessment.LabResults);
        Assert.Empty(copy.Assessment.ReproductiveStatus);
    }

    [Fact]
    public void PatientCopy_DoesNotPrintProfessionalSections()
    {
        var data = new ClinicalReportPdfData("Ana", "PRUEBA", new DateOnly(1990, 1, 1), "Meta", "Dra.", Now,
            [], new ClinicalAssessmentPdfRow("Ingesta", "", "", "07:00", 7, "", "", 0, "", false, null, "", "Nota privada"),
            null, null, null, []);

        var bytes = new ClinicalReportPdfService().Create(ClinicalReportAudiencePolicy.ForPatient(data));

        Assert.True(bytes.Length > 1000);
    }
}
