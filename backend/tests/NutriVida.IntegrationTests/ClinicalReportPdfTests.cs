using NutriVida.Api.Services.Pdf;

namespace NutriVida.IntegrationTests;

public sealed class ClinicalReportPdfTests
{
    [Fact]
    public void Create_ReturnsValidPdfWithMoreThanOneKilobyte()
    {
        var service = new ClinicalReportPdfService();
        var bytes = service.Create(new ClinicalReportPdfData(
            "Paciente de prueba", "TEST-001", new DateOnly(1990, 4, 12), "Mejorar hábitos",
            "Lic. Nutricionista de prueba", DateTime.UtcNow,
            [new ClinicalMeasurementPdfRow(DateTime.UtcNow, 66.9m, 164m, 78m, 99m, 28m)],
            new ClinicalAssessmentPdfRow("Tres comidas", "Ninguna", "Ninguna", "07:00, 13:00 y 19:00",
                7.5m, "Buena", "Caminata", 150, "Lunes, miércoles y viernes", false, 4,
                "Una vez al día", "Evolución estable"),
            new ClinicalDiagnosisPdfRow("NI-1.5", "Ingesta energética inadecuada", "Horarios irregulares",
                "Registro de ingesta", "Aprobado", "Lic. Nutricionista", DateTime.UtcNow),
            new ClinicalEnergyPdfRow("Mifflin-St Jeor", 1450m, 1.45m, 10m, -250m, 1950m, DateTime.UtcNow),
            new ClinicalMenuPlanPdfData("Plan semanal", DateOnly.FromDateTime(DateTime.Today),
                DateOnly.FromDateTime(DateTime.Today.AddDays(6)), 1950m, "Aprobado",
                "Mantener hidratación y respetar horarios.",
                [new ClinicalMenuItemPdfRow(1, "Desayuno", "Avena con fruta", 1m, 280m, 410m, "1 tazón")]),
            [new ClinicalFollowUpPdfRow(DateOnly.FromDateTime(DateTime.Today), 66.9m, 7.5m,
                150, "Caminata", 85, 4, "Sin síntomas")]
        ));

        Assert.True(bytes.Length > 1_000);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }
}
