using NutriVida.Api.Services.Pdf;

namespace NutriVida.IntegrationTests;

public sealed class ClinicalReportPdfTests
{
    [Fact]
    public void Create_ReturnsValidPdfWithMoreThanOneKilobyte()
    {
        var service = new ClinicalReportPdfService();
        var bytes = service.Create(new ClinicalReportPdfData(
            "Paciente de prueba", "TEST-001", "Mejorar hábitos", DateTime.UtcNow,
            [new ClinicalMeasurementPdfRow(DateTime.UtcNow, 66.9m, 164m, 78m, 28m)],
            new ClinicalAssessmentPdfRow("Tres comidas", "Ninguna", "Ninguna", 7.5m,
                "Caminata", 150, false, 4, "Evolución estable"),
            [new ClinicalFollowUpPdfRow(DateOnly.FromDateTime(DateTime.Today), 66.9m, 7.5m,
                150, "Caminata", 85, 4, "Sin síntomas")]
        ));

        Assert.True(bytes.Length > 1_000);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }
}
