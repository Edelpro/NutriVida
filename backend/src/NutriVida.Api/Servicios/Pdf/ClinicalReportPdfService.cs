using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using PdfSharp.Fonts;

namespace NutriVida.Api.Services.Pdf;

public sealed record ClinicalReportPdfData(
    string PatientName,
    string DocumentNumber,
    string Goal,
    DateTime GeneratedAtUtc,
    IReadOnlyList<ClinicalMeasurementPdfRow> Measurements,
    ClinicalAssessmentPdfRow? Assessment,
    IReadOnlyList<ClinicalFollowUpPdfRow> FollowUps);

public sealed record ClinicalMeasurementPdfRow(DateTime Date, decimal WeightKg, decimal HeightCm,
    decimal? WaistCm, decimal? BodyFatPercent);
public sealed record ClinicalAssessmentPdfRow(string DailyIntake, string Intolerances, string Allergies,
    decimal SleepHours, string ExerciseType, int ExerciseMinutes, bool Constipation,
    int? BristolStoolType, string ClinicalNotes);
public sealed record ClinicalFollowUpPdfRow(DateOnly FollowUpDate, decimal? WeightKg, decimal? SleepHours,
    int? ExerciseMinutes, string ExerciseType, int? AdherencePercent, int? BristolStoolType, string Symptoms);

public interface IClinicalReportPdfService
{
    byte[] Create(ClinicalReportPdfData data);
}

public sealed class ClinicalReportPdfService : IClinicalReportPdfService
{
    private static readonly object FontLock = new();
    private static readonly Color Green = Color.FromRgb(39, 112, 25);
    private static readonly Color SoftGreen = Color.FromRgb(234, 244, 218);
    private static readonly Color WarmGray = Color.FromRgb(90, 82, 72);

    public byte[] Create(ClinicalReportPdfData data)
    {
        EnsureFontResolver();
        var document = new Document();
        document.Info.Title = $"Resumen clínico nutricional - {data.PatientName}";
        document.Info.Author = "NutriVida";
        document.Info.Subject = "Resumen para revisión profesional";

        var normal = document.Styles[StyleNames.Normal]!;
        normal.Font.Name = "Arial";
        normal.Font.Size = Unit.FromPoint(9);
        normal.Font.Color = WarmGray;

        var section = document.AddSection();
        section.PageSetup.PageFormat = PageFormat.A4;
        section.PageSetup.TopMargin = Unit.FromCentimeter(1.5);
        section.PageSetup.BottomMargin = Unit.FromCentimeter(1.5);
        section.PageSetup.LeftMargin = Unit.FromCentimeter(1.7);
        section.PageSetup.RightMargin = Unit.FromCentimeter(1.7);

        var header = section.Headers.Primary.AddParagraph();
        header.AddFormattedText("NutriVida", TextFormat.Bold).Font.Color = Green;
        header.AddText("  ·  Gestión clínica nutricional");
        header.Format.Font.Size = Unit.FromPoint(9);
        header.Format.Borders.Bottom.Width = Unit.FromPoint(0.75);
        header.Format.Borders.Bottom.Color = SoftGreen;
        header.Format.SpaceAfter = Unit.FromPoint(8);

        var footer = section.Footers.Primary.AddParagraph();
        footer.Format.Alignment = ParagraphAlignment.Center;
        footer.Format.Font.Size = Unit.FromPoint(7.5);
        footer.AddText("Documento confidencial · Página ");
        footer.AddPageField();
        footer.AddText(" de ");
        footer.AddNumPagesField();

        AddTitle(section, "Resumen clínico nutricional");
        var meta = section.AddParagraph();
        meta.AddFormattedText(data.PatientName, TextFormat.Bold).Font.Size = Unit.FromPoint(13);
        meta.AddLineBreak();
        meta.AddText($"Identificación: {data.DocumentNumber}   ·   Generado: {data.GeneratedAtUtc:dd/MM/yyyy HH:mm} UTC");
        meta.Format.SpaceAfter = Unit.FromPoint(8);

        AddCallout(section, "Objetivo terapéutico", Clean(data.Goal, "Sin objetivo registrado."));

        AddHeading(section, "Evolución antropométrica");
        if (data.Measurements.Count == 0)
            AddEmpty(section, "No existen mediciones registradas.");
        else
        {
            var table = CreateTable(section, 5);
            AddHeaderRow(table, "Fecha", "Peso", "Talla", "Cintura", "% grasa");
            foreach (var row in data.Measurements.TakeLast(12))
                AddDataRow(table, row.Date.ToString("dd/MM/yyyy"), $"{row.WeightKg:0.0} kg",
                    $"{row.HeightCm:0.0} cm", Format(row.WaistCm, "cm"), Format(row.BodyFatPercent, "%"));
        }

        AddHeading(section, "Última evaluación integral");
        if (data.Assessment is null)
            AddEmpty(section, "No existe una evaluación nutricional registrada.");
        else
        {
            var assessment = data.Assessment;
            AddLabelValue(section, "Ingesta diaria", assessment.DailyIntake);
            AddLabelValue(section, "Alergias", assessment.Allergies);
            AddLabelValue(section, "Intolerancias", assessment.Intolerances);
            AddLabelValue(section, "Sueño y ejercicio", $"{assessment.SleepHours:0.0} h · {Clean(assessment.ExerciseType, "sin tipo")} · {assessment.ExerciseMinutes} min");
            AddLabelValue(section, "Tránsito intestinal", assessment.Constipation
                ? $"Estreñimiento reportado · Bristol {assessment.BristolStoolType?.ToString() ?? "sin registro"}"
                : $"Sin estreñimiento · Bristol {assessment.BristolStoolType?.ToString() ?? "sin registro"}");
            AddLabelValue(section, "Notas clínicas", assessment.ClinicalNotes);
        }

        AddHeading(section, "Seguimiento y evolución");
        if (data.FollowUps.Count == 0)
            AddEmpty(section, "No existen seguimientos registrados.");
        else
        {
            var table = CreateTable(section, 6);
            AddHeaderRow(table, "Fecha", "Peso", "Sueño", "Ejercicio", "Adherencia", "Bristol");
            foreach (var row in data.FollowUps.Take(8))
                AddDataRow(table, row.FollowUpDate.ToString("dd/MM/yyyy"), Format(row.WeightKg, "kg"),
                    row.SleepHours.HasValue ? $"{row.SleepHours:0.0} h" : "—",
                    row.ExerciseMinutes.HasValue ? $"{row.ExerciseMinutes} min · {Clean(row.ExerciseType, "—")}" : Clean(row.ExerciseType, "—"),
                    row.AdherencePercent.HasValue ? $"{row.AdherencePercent}%" : "—",
                    row.BristolStoolType?.ToString() ?? "—");
        }

        var warning = section.AddParagraph();
        warning.Format.SpaceBefore = Unit.FromPoint(12);
        warning.Format.Shading.Color = Color.FromRgb(255, 246, 224);
        warning.Format.Borders.Color = Color.FromRgb(224, 178, 85);
        warning.Format.Borders.Width = Unit.FromPoint(0.7);
        warning.Format.LeftIndent = Unit.FromPoint(8);
        warning.Format.RightIndent = Unit.FromPoint(8);
        warning.Format.SpaceBefore = Unit.FromPoint(12);
        warning.Format.SpaceAfter = Unit.FromPoint(4);
        warning.AddFormattedText("Nota profesional. ", TextFormat.Bold);
        warning.AddText("Este resumen apoya la revisión del profesional y no sustituye diagnóstico, juicio clínico ni consentimiento informado.");

        var renderer = new PdfDocumentRenderer { Document = document };
        renderer.RenderDocument();
        using var stream = new MemoryStream();
        renderer.PdfDocument.Save(stream, false);
        return stream.ToArray();
    }

    private static void AddTitle(Section section, string text)
    {
        var paragraph = section.AddParagraph(text);
        paragraph.Format.Font.Name = "Georgia";
        paragraph.Format.Font.Size = Unit.FromPoint(22);
        paragraph.Format.Font.Bold = true;
        paragraph.Format.Font.Color = Color.FromRgb(55, 43, 32);
        paragraph.Format.SpaceAfter = Unit.FromPoint(8);
    }

    private static void AddHeading(Section section, string text)
    {
        var paragraph = section.AddParagraph(text);
        paragraph.Format.Font.Size = Unit.FromPoint(12);
        paragraph.Format.Font.Bold = true;
        paragraph.Format.Font.Color = Green;
        paragraph.Format.SpaceBefore = Unit.FromPoint(13);
        paragraph.Format.SpaceAfter = Unit.FromPoint(5);
        paragraph.Format.KeepWithNext = true;
    }

    private static void AddCallout(Section section, string label, string value)
    {
        var paragraph = section.AddParagraph();
        paragraph.Format.Shading.Color = SoftGreen;
        paragraph.Format.LeftIndent = Unit.FromPoint(8);
        paragraph.Format.RightIndent = Unit.FromPoint(8);
        paragraph.Format.SpaceBefore = Unit.FromPoint(3);
        paragraph.Format.SpaceAfter = Unit.FromPoint(8);
        paragraph.AddFormattedText(label + ": ", TextFormat.Bold).Font.Color = Green;
        paragraph.AddText(value);
    }

    private static Table CreateTable(Section section, int columns)
    {
        var table = section.AddTable();
        table.Borders.Color = Color.FromRgb(220, 216, 207);
        table.Borders.Width = Unit.FromPoint(0.5);
        table.Rows.LeftIndent = 0;
        var width = 17.6 / columns;
        for (var i = 0; i < columns; i++) table.AddColumn(Unit.FromCentimeter(width));
        return table;
    }

    private static void AddHeaderRow(Table table, params string[] cells)
    {
        var row = table.AddRow();
        row.HeadingFormat = true;
        row.Shading.Color = Green;
        foreach (var (text, index) in cells.Select((text, index) => (text, index)))
        {
            row.Cells[index].AddParagraph(text);
            row.Cells[index].Format.Font.Bold = true;
            row.Cells[index].Format.Font.Color = Colors.White;
            row.Cells[index].VerticalAlignment = VerticalAlignment.Center;
        }
    }

    private static void AddDataRow(Table table, params string[] cells)
    {
        var row = table.AddRow();
        foreach (var (text, index) in cells.Select((text, index) => (text, index)))
        {
            row.Cells[index].AddParagraph(Clean(text, "—"));
            row.Cells[index].Format.Font.Size = Unit.FromPoint(8);
            row.Cells[index].VerticalAlignment = VerticalAlignment.Center;
        }
    }

    private static void AddLabelValue(Section section, string label, string? value)
    {
        var paragraph = section.AddParagraph();
        paragraph.Format.SpaceAfter = Unit.FromPoint(3);
        paragraph.AddFormattedText(label + ": ", TextFormat.Bold).Font.Color = Green;
        paragraph.AddText(Clean(value, "Sin registro."));
    }

    private static void AddEmpty(Section section, string text)
    {
        var paragraph = section.AddParagraph(text);
        paragraph.Format.Font.Italic = true;
        paragraph.Format.Font.Color = Colors.Gray;
    }

    private static string Format(decimal? value, string unit) => value.HasValue ? $"{value:0.0} {unit}" : "—";
    private static string Clean(string? value, string fallback) => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static void EnsureFontResolver()
    {
        if (GlobalFontSettings.FontResolver is not null) return;
        lock (FontLock)
        {
            GlobalFontSettings.FontResolver ??= new NutriVidaFontResolver();
        }
    }
}
