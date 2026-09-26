using NutriVida.Domain.Common;

namespace NutriVida.Domain.Templates;

public sealed class QuickTemplate : BaseEntity
{
    public Guid ClinicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public QuickTemplateScope Scope { get; set; } = QuickTemplateScope.MenuPlan;
    public string ValuesJson { get; set; } = "{}";
    // Se conservan para migrar instalaciones anteriores sin perder sus plantillas de menú.
    public string PlanName { get; set; } = string.Empty;
    public string ProfessionalNotes { get; set; } = string.Empty;
}

public enum QuickTemplateScope
{
    Assessment = 0,
    FollowUp = 1,
    MenuPlan = 2,
    Communication = 3
}
