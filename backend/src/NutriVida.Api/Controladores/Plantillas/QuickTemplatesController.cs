using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.Templates;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controladores.Plantillas;

[ApiController]
[Route("api/quick-templates")]
public sealed class QuickTemplatesController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? scope, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        QuickTemplateScope? parsedScope = null;
        if (!string.IsNullOrWhiteSpace(scope))
        {
            if (!TryParseScope(scope, out var selectedScope))
                return ValidationProblemFor("scope", "El módulo de plantilla no es válido.");
            parsedScope = selectedScope;
        }

        var query = db.QuickTemplates.AsNoTracking()
            .Where(x => x.ClinicId == clinicId && !x.IsArchived);
        if (parsedScope.HasValue) query = query.Where(x => x.Scope == parsedScope.Value);

        var templates = await query
            .OrderBy(x => x.Category).ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);
        return Ok(templates.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(QuickTemplateRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        if (!TryValidate(request, out var scope, out var values, out var validation))
            return ValidationProblem(validation);
        var template = new QuickTemplate { ClinicId = clinicId };
        Apply(request, scope, values, template);
        db.QuickTemplates.Add(template);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/quick-templates/{template.Id}", ToResponse(template));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, QuickTemplateRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        if (!TryValidate(request, out var scope, out var values, out var validation))
            return ValidationProblem(validation);
        var template = await db.QuickTemplates.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived, cancellationToken);
        if (template is null) return NotFound();
        Apply(request, scope, values, template);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(template));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var template = await db.QuickTemplates.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived, cancellationToken);
        if (template is null) return NotFound();
        template.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private bool TryGetClinicId(out Guid clinicId) =>
        Guid.TryParse(User.FindFirstValue("clinic_id"), out clinicId);

    private static readonly IReadOnlyDictionary<QuickTemplateScope, IReadOnlyDictionary<string, int>> AllowedValues =
        new Dictionary<QuickTemplateScope, IReadOnlyDictionary<string, int>>
        {
            [QuickTemplateScope.Assessment] = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["dailyIntake"] = 4000,
                ["eatingSchedule"] = 1000,
                ["allergies"] = 2000,
                ["intolerances"] = 2000,
                ["sleepQuality"] = 500,
                ["exerciseType"] = 500,
                ["exerciseSchedule"] = 1000,
                ["bowelFrequency"] = 500,
                ["clinicalNotes"] = 4000,
                ["medicalHistory"] = 2000,
                ["familyHistory"] = 2000,
                ["medications"] = 1000,
                ["supplements"] = 1000,
                ["labResults"] = 2000,
                ["reproductiveStatus"] = 60,
                ["sleepHours"] = 10,
                ["exerciseMinutesPerWeek"] = 10,
                ["hasConstipation"] = 10,
                ["bristolStoolType"] = 10,
                ["problemCode"] = 80,
                ["problemStatement"] = 1000,
                ["etiology"] = 2000,
                ["signsAndSymptoms"] = 2000
            },
            [QuickTemplateScope.FollowUp] = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["professionalNotes"] = 2000,
                ["symptoms"] = 2000,
                ["adjustments"] = 2000,
                ["exerciseType"] = 300,
                ["exerciseMinutes"] = 10,
                ["averageSleepHours"] = 10,
                ["planAdherencePercent"] = 10,
                ["bristolStoolType"] = 10,
                ["objectiveStatus"] = 10,
                ["followUpIntervalDays"] = 10
            },
            [QuickTemplateScope.MenuPlan] = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["planName"] = 180,
                ["professionalNotes"] = 2000,
                ["energyTargetKcal"] = 10,
                ["itemsJson"] = 30000
            },
            [QuickTemplateScope.Communication] = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["subject"] = 180,
                ["message"] = 4000
            }
        };

    private static void Apply(
        QuickTemplateRequest request,
        QuickTemplateScope scope,
        IReadOnlyDictionary<string, string> values,
        QuickTemplate template)
    {
        template.Name = request.Name.Trim();
        template.Category = request.Category.Trim();
        template.Objective = request.Objective.Trim();
        template.Summary = request.Summary.Trim();
        template.Scope = scope;
        template.ValuesJson = JsonSerializer.Serialize(values);
        template.PlanName = values.GetValueOrDefault("planName", string.Empty);
        template.ProfessionalNotes = values.GetValueOrDefault("professionalNotes", string.Empty);
    }

    private static QuickTemplateResponse ToResponse(QuickTemplate template)
    {
        Dictionary<string, string>? values = null;
        if (!string.IsNullOrWhiteSpace(template.ValuesJson))
        {
            try { values = JsonSerializer.Deserialize<Dictionary<string, string>>(template.ValuesJson); }
            catch (JsonException) { /* La compatibilidad antigua se resuelve abajo. */ }
        }
        values ??= [];
        if (template.Scope == QuickTemplateScope.MenuPlan && values.Count == 0)
        {
            values["planName"] = template.PlanName;
            values["professionalNotes"] = template.ProfessionalNotes;
        }
        return new QuickTemplateResponse(
            template.Id,
            ScopeName(template.Scope),
            template.Name,
            template.Category,
            template.Objective,
            template.Summary,
            values);
    }

    private static bool TryValidate(
        QuickTemplateRequest request,
        out QuickTemplateScope scope,
        out IReadOnlyDictionary<string, string> values,
        out ValidationProblemDetails validation)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
        scope = QuickTemplateScope.MenuPlan;
        values = new Dictionary<string, string>();
        if (!TryParseScope(request.Scope, out scope))
        {
            errors["scope"] = ["Selecciona un módulo válido para la plantilla."];
        }
        else
        {
            var allowed = AllowedValues[scope];
            var cleanValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in request.Values ?? [])
            {
                if (!allowed.TryGetValue(pair.Key, out var maxLength))
                {
                    errors[$"values.{pair.Key}"] = ["Este campo no pertenece al módulo seleccionado."];
                    continue;
                }
                var value = pair.Value?.Trim() ?? string.Empty;
                if (value.Length > maxLength)
                    errors[$"values.{pair.Key}"] = [$"El contenido no puede superar {maxLength} caracteres."];
                cleanValues[pair.Key] = value;
            }
            if (!cleanValues.Values.Any(value => !string.IsNullOrWhiteSpace(value)))
                errors["values"] = ["Agrega al menos un contenido reutilizable."];
            values = cleanValues;
        }

        validation = new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Revisa la plantilla",
            Detail = "La plantilla contiene campos incompletos o que no corresponden al módulo."
        };
        return errors.Count == 0;
    }

    private static bool TryParseScope(string value, out QuickTemplateScope scope)
    {
        scope = value.Trim().ToLowerInvariant() switch
        {
            "assessment" => QuickTemplateScope.Assessment,
            "followup" => QuickTemplateScope.FollowUp,
            "menuplan" => QuickTemplateScope.MenuPlan,
            "communication" => QuickTemplateScope.Communication,
            _ => (QuickTemplateScope)(-1)
        };
        return Enum.IsDefined(scope);
    }

    private static string ScopeName(QuickTemplateScope scope) => scope switch
    {
        QuickTemplateScope.Assessment => "assessment",
        QuickTemplateScope.FollowUp => "followUp",
        QuickTemplateScope.MenuPlan => "menuPlan",
        QuickTemplateScope.Communication => "communication",
        _ => throw new ArgumentOutOfRangeException(nameof(scope))
    };

    private BadRequestObjectResult ValidationProblemFor(string field, string message) =>
        BadRequest(new ValidationProblemDetails(new Dictionary<string, string[]> { [field] = [message] })
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Revisa la plantilla"
        });
}

public sealed record QuickTemplateRequest(
    [Required, MinLength(3), MaxLength(180)] string Name,
    [Required, MaxLength(60)] string Category,
    [Required, MinLength(3), MaxLength(180)] string Objective,
    [Required, MinLength(10), MaxLength(500)] string Summary,
    [Required] string Scope,
    [Required] Dictionary<string, string> Values);

public sealed record QuickTemplateResponse(
    Guid Id,
    string Scope,
    string Name,
    string Category,
    string Objective,
    string Summary,
    IReadOnlyDictionary<string, string> Values);
