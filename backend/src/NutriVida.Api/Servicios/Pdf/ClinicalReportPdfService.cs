using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using PdfSharp.Fonts;

namespace NutriVida.Api.Services.Pdf;

public sealed record ClinicalReportPdfData(
    string PatientName,
    string DocumentNumber,
    DateOnly DateOfBirth,
    string Goal,
    string PreparedBy,
    DateTime GeneratedAtUtc,
    IReadOnlyList<ClinicalMeasurementPdfRow> Measurements,
    ClinicalAssessmentPdfRow? Assessment,
    ClinicalDiagnosisPdfRow? Diagnosis,
    ClinicalEnergyPdfRow? Energy,
    ClinicalMenuPlanPdfData? MenuPlan,
    IReadOnlyList<ClinicalFollowUpPdfRow> FollowUps,
    string PracticeName = "NutriVida",
    bool IsPatientCopy = false,
    string AnthropometryDetails = "");

public sealed record ClinicalMeasurementPdfRow(DateTime Date, decimal WeightKg, decimal HeightCm,
    decimal? WaistCm, decimal? HipCm, decimal? BodyFatPercent);
public sealed record ClinicalAssessmentPdfRow(string DailyIntake, string Intolerances, string Allergies,
    string EatingSchedule, decimal SleepHours, string SleepQuality, string ExerciseType,
    int ExerciseMinutes, string ExerciseSchedule, bool Constipation, int? BristolStoolType,
    string BowelFrequency, string ClinicalNotes,
    string MedicalHistory = "", string FamilyHistory = "", string Medications = "",
    string Supplements = "", string LabResults = "", string ReproductiveStatus = "",
    string Recall24hJson = "");
public sealed record ClinicalDiagnosisPdfRow(string ProblemCode, string ProblemStatement, string Etiology,
    string SignsAndSymptoms, string Status, string ProfessionalName, DateTime CreatedAtUtc);
public sealed record ClinicalEnergyPdfRow(string Formula, decimal RestingEnergyKcal,
    decimal ActivityFactor, decimal EtaPercent, decimal GoalAdjustmentKcal,
    decimal TotalEnergyKcal, DateTime CreatedAtUtc);
public sealed record ClinicalMenuPlanPdfData(string Name, DateOnly StartsOn, DateOnly EndsOn,
    decimal EnergyTargetKcal, string Status, string ProfessionalNotes,
    IReadOnlyList<ClinicalMenuItemPdfRow> Items);
public sealed record ClinicalMenuItemPdfRow(int DayOfWeek, string MealName, string FoodName,
    decimal Portions, decimal Grams, decimal EnergyKcal, string HouseholdMeasure);
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
        header.AddFormattedText(Clean(data.PracticeName, "NutriVida"), TextFormat.Bold).Font.Color = Green;
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

        AddTitle(section, "Informe nutricional");
        var meta = section.AddParagraph();
        meta.AddFormattedText(data.PatientName, TextFormat.Bold).Font.Size = Unit.FromPoint(13);
        meta.AddLineBreak();
        meta.AddText($"Identificación: {data.DocumentNumber}   ·   Nacimiento: {data.DateOfBirth:dd/MM/yyyy}");
        meta.AddLineBreak();
        meta.AddText($"Profesional: {Clean(data.PreparedBy, "NutriVida")}   ·   Emitido: {data.GeneratedAtUtc.AddHours(-5):dd/MM/yyyy HH:mm} (hora de Ecuador)");
        meta.Format.SpaceAfter = Unit.FromPoint(8);

        AddCallout(section, "Objetivo terapéutico", Clean(data.Goal, "Sin objetivo registrado."));

        AddHeading(section, "Evolución antropométrica");
        if (data.Measurements.Count == 0)
            AddEmpty(section, "No existen mediciones registradas.");
        else
        {
            var table = CreateTable(section, 6);
            AddHeaderRow(table, "Fecha", "Peso", "Talla", "Cintura", "Cadera", "% grasa");
            foreach (var row in data.Measurements.TakeLast(12))
                AddDataRow(table, row.Date.ToString("dd/MM/yyyy"), $"{row.WeightKg:0.0} kg",
                    $"{row.HeightCm:0.0} cm", Format(row.WaistCm, "cm"), Format(row.HipCm, "cm"),
                    Format(row.BodyFatPercent, "%"));
        }

        if (!string.IsNullOrWhiteSpace(data.AnthropometryDetails))
            AddLabelValue(section, "Medidas adicionales de la última toma", data.AnthropometryDetails);

        AddHeading(section, "Evaluación nutricional vigente");
        if (data.Assessment is null)
            AddEmpty(section, "No existe una evaluación nutricional registrada.");
        else
        {
            var assessment = data.Assessment;
            AddLabelValue(section, "Ingesta diaria", assessment.DailyIntake);
            var recallTotals = Recall24hJson.DescribeTotals(Recall24hJson.Parse(assessment.Recall24hJson));
            if (recallTotals.Length > 0) AddLabelValue(section, "Recordatorio de 24 horas", recallTotals);
            AddLabelValue(section, "Horarios de alimentación", assessment.EatingSchedule);
            AddLabelValue(section, "Alergias", assessment.Allergies);
            AddLabelValue(section, "Intolerancias", assessment.Intolerances);
            AddLabelValue(section, "Sueño", $"{assessment.SleepHours:0.0} h · {Clean(assessment.SleepQuality, "calidad no registrada")}");
            AddLabelValue(section, "Actividad física", $"{Clean(assessment.ExerciseType, "sin tipo")} · {assessment.ExerciseMinutes} min/semana · {Clean(assessment.ExerciseSchedule, "horario no registrado")}");
            AddLabelValue(section, "Tránsito intestinal", assessment.Constipation
                ? $"Estreñimiento reportado · Bristol {assessment.BristolStoolType?.ToString() ?? "sin registro"} · {Clean(assessment.BowelFrequency, "frecuencia no registrada")}"
                : $"Sin estreñimiento · Bristol {assessment.BristolStoolType?.ToString() ?? "sin registro"} · {Clean(assessment.BowelFrequency, "frecuencia no registrada")}");
            if (!data.IsPatientCopy)
            {
                AddLabelValue(section, "Antecedentes personales", assessment.MedicalHistory);
                AddLabelValue(section, "Antecedentes familiares", assessment.FamilyHistory);
                AddLabelValue(section, "Medicación", assessment.Medications);
                AddLabelValue(section, "Suplementos", assessment.Supplements);
                AddLabelValue(section, "Laboratorios", assessment.LabResults);
                AddLabelValue(section, "Embarazo o lactancia", assessment.ReproductiveStatus);
                AddLabelValue(section, "Notas clínicas", assessment.ClinicalNotes);
            }
        }

        AddHeading(section, "Diagnóstico nutricional PES");
        if (data.Diagnosis is null)
            AddEmpty(section, data.IsPatientCopy ? "Sin diagnóstico aprobado para compartir." : "No existe un diagnóstico PES registrado.");
        else
        {
            AddLabelValue(section, "Problema", $"{Clean(data.Diagnosis.ProblemCode, "Sin código")} · {data.Diagnosis.ProblemStatement}");
            AddLabelValue(section, "Etiología", data.Diagnosis.Etiology);
            AddLabelValue(section, "Signos y síntomas", data.Diagnosis.SignsAndSymptoms);
            AddLabelValue(section, "Estado y responsable", $"{StatusLabel(data.Diagnosis.Status)} · {Clean(data.Diagnosis.ProfessionalName, "Sin responsable")} · {data.Diagnosis.CreatedAtUtc:dd/MM/yyyy}");
        }

        AddHeading(section, "Cálculo energético");
        if (data.Energy is null)
            AddEmpty(section, "No existe un cálculo energético guardado.");
        else
        {
            var energy = CreateTable(section, 6);
            AddHeaderRow(energy, "Fórmula", "GER", "Actividad", "ETA", "Ajuste", "Objetivo");
            AddDataRow(energy, FormulaLabel(data.Energy.Formula), $"{data.Energy.RestingEnergyKcal:0} kcal",
                $"× {data.Energy.ActivityFactor:0.00}", $"{data.Energy.EtaPercent * 100:0.#}%",
                $"{data.Energy.GoalAdjustmentKcal:+0;-0;0} kcal", $"{data.Energy.TotalEnergyKcal:0} kcal/día");
        }

        AddHeading(section, "Plan de alimentación");
        if (data.MenuPlan is null)
            AddEmpty(section, data.IsPatientCopy ? "Sin plan aprobado para compartir." : "No existe un plan de menú vinculado al informe.");
        else
        {
            var plan = data.MenuPlan;
            AddCallout(section, plan.Name,
                $"{plan.StartsOn:dd/MM/yyyy} al {plan.EndsOn:dd/MM/yyyy} · {plan.EnergyTargetKcal:0} kcal/día · {StatusLabel(plan.Status)}");
            AddLabelValue(section, "Indicaciones", plan.ProfessionalNotes);
            if (plan.Items.Count == 0)
                AddEmpty(section, "El plan no contiene alimentos registrados.");
            else
            {
                var menu = CreateTable(section, 6);
                AddHeaderRow(menu, "Día", "Tiempo", "Alimento / preparación", "Porción", "Cantidad", "Energía");
                foreach (var item in plan.Items.OrderBy(x => x.DayOfWeek).ThenBy(x => x.MealName).Take(42))
                    AddDataRow(menu, DayName(item.DayOfWeek), item.MealName, item.FoodName,
                        $"{item.Portions:0.##}",
                        string.IsNullOrWhiteSpace(item.HouseholdMeasure) ? $"{item.Grams:0.#} g" : $"{item.HouseholdMeasure} · {item.Grams:0.#} g",
                        $"{item.EnergyKcal:0} kcal");
                if (plan.Items.Count > 42)
                    AddEmpty(section, $"Se muestran 42 de {plan.Items.Count} alimentos para mantener el documento conciso.");
            }
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
    private static string DayName(int day) => day switch
    {
        1 => "Lun", 2 => "Mar", 3 => "Mié", 4 => "Jue", 5 => "Vie", 6 => "Sáb", 7 => "Dom", _ => "—"
    };
    private static string FormulaLabel(string formula) => formula switch
    {
        "MifflinStJeor" => "Mifflin-St Jeor",
        "RevisedHarrisBenedict" => "Harris-Benedict revisada",
        _ => Clean(formula, "Sin fórmula")
    };
    private static string StatusLabel(string status) => status switch
    {
        "Draft" => "Borrador",
        "ReadyForReview" => "Listo para revisión",
        "Approved" => "Aprobado",
        "Sent" => "Enviado",
        "Superseded" => "Reemplazado",
        _ => Clean(status, "Sin estado")
    };

    private static void EnsureFontResolver()
    {
        if (GlobalFontSettings.FontResolver is not null) return;
        lock (FontLock)
        {
            GlobalFontSettings.FontResolver ??= new NutriVidaFontResolver();
        }
    }
}
