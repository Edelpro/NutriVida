using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Api.Security;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controladores.PlanesMenu;

[ApiController]
[Route("api/menu-plans")]
public sealed class MenuPlansController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? patientId,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var patientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var query = db.MenuPlans.AsNoTracking().Where(x => !x.IsArchived && patientIds.Contains(x.PatientId));
        if (patientId.HasValue) query = query.Where(x => x.PatientId == patientId);

        return Ok(await query
            .Include(x => x.Items)
            .OrderByDescending(x => x.StartsOn)
            .ToListAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        MenuPlanRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (request.PatientId == Guid.Empty)
            return ValidationProblem("Selecciona un paciente válido.");
        if (!await db.CanAccessPatientAsync(User, request.PatientId, cancellationToken))
            return NotFound(new { title = "Paciente no encontrado", detail = "Actualiza la lista y selecciona nuevamente el expediente." });
        if (request.Items.Count == 0)
            return ValidationProblem("Añade al menos un alimento o plato al menú.");
        if (request.StartsOn == default || request.EndsOn == default)
            return ValidationProblem("Selecciona fechas válidas para el plan.");
        if (request.EndsOn < request.StartsOn)
            return ValidationProblem("La fecha final debe ser posterior a la inicial.");
        if (request.Items.Any(x => string.IsNullOrWhiteSpace(x.MealName) || string.IsNullOrWhiteSpace(x.FoodNameSnapshot)))
            return ValidationProblem("Cada alimento debe tener tiempo de comida y nombre.");
        var referencedFoodIds = request.Items
            .Where(x => x.FoodItemId.HasValue)
            .Select(x => x.FoodItemId!.Value)
            .Distinct()
            .ToArray();
        if (referencedFoodIds.Any(x => x == Guid.Empty))
            return ValidationProblem("Selecciona alimentos válidos del catálogo.");
        if (referencedFoodIds.Length > 0)
        {
            var availableFoodCount = await db.FoodItems.AsNoTracking()
                .CountAsync(x => referencedFoodIds.Contains(x.Id) && !x.IsArchived, cancellationToken);
            if (availableFoodCount != referencedFoodIds.Length)
                return ValidationProblem("Uno o más alimentos ya no están disponibles. Actualiza el catálogo y vuelve a agregarlos.");
        }

        var plan = new MenuPlan
        {
            PatientId = request.PatientId,
            Name = request.Name.Trim(),
            StartsOn = request.StartsOn,
            EndsOn = request.EndsOn,
            EnergyTargetKcal = request.EnergyTargetKcal,
            ProfessionalNotes = request.ProfessionalNotes.Trim(),
            Items = request.Items.Select(x => new MenuPlanItem
            {
                FoodItemId = x.FoodItemId,
                DayOfWeek = x.DayOfWeek,
                MealName = x.MealName.Trim(),
                FoodNameSnapshot = x.FoodNameSnapshot.Trim(),
                Portions = x.Portions,
                Grams = x.Grams,
                EnergyKcal = x.EnergyKcal,
                HouseholdMeasure = x.HouseholdMeasure.Trim()
            }).ToList()
        };

        db.MenuPlans.Add(plan);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/menu-plans/{plan.Id}", plan);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MenuPlanRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var plan = await db.MenuPlans.Include(x => x.Items).SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived && accessiblePatientIds.Contains(x.PatientId),
            cancellationToken);
        if (plan is null) return NotFound();
        if (request.PatientId != plan.PatientId)
            return ValidationProblem("El paciente del plan no se puede cambiar.");
        var error = await ValidateRequest(request, cancellationToken);
        if (error is not null) return ValidationProblem(error);

        plan.Name = request.Name.Trim();
        plan.StartsOn = request.StartsOn;
        plan.EndsOn = request.EndsOn;
        plan.EnergyTargetKcal = request.EnergyTargetKcal;
        plan.ProfessionalNotes = request.ProfessionalNotes.Trim();
        db.MenuPlanItems.RemoveRange(plan.Items);
        plan.Items = BuildItems(request);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(plan);
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User, includeArchived: true).Select(x => x.Id);
        var plan = await db.MenuPlans.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived && accessiblePatientIds.Contains(x.PatientId),
            cancellationToken);
        if (plan is null) return NotFound();
        plan.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<string?> ValidateRequest(MenuPlanRequest request, CancellationToken cancellationToken)
    {
        if (request.PatientId == Guid.Empty) return "Selecciona un paciente válido.";
        if (!await db.CanAccessPatientAsync(User, request.PatientId, cancellationToken))
            return "El paciente seleccionado no está disponible.";
        if (request.Items.Count == 0) return "Añade al menos un alimento o plato al menú.";
        if (request.StartsOn == default || request.EndsOn == default) return "Selecciona fechas válidas para el plan.";
        if (request.EndsOn < request.StartsOn) return "La fecha final debe ser posterior a la inicial.";
        if (request.Items.Any(x => string.IsNullOrWhiteSpace(x.MealName) || string.IsNullOrWhiteSpace(x.FoodNameSnapshot)))
            return "Cada alimento debe tener tiempo de comida y nombre.";
        var foodIds = request.Items.Where(x => x.FoodItemId.HasValue).Select(x => x.FoodItemId!.Value).Distinct().ToArray();
        if (foodIds.Any(x => x == Guid.Empty)) return "Selecciona alimentos válidos del catálogo.";
        if (foodIds.Length > 0 && await db.FoodItems.AsNoTracking().CountAsync(x => foodIds.Contains(x.Id) && !x.IsArchived, cancellationToken) != foodIds.Length)
            return "Uno o más alimentos ya no están disponibles.";
        return null;
    }

    private static List<MenuPlanItem> BuildItems(MenuPlanRequest request) => request.Items.Select(x => new MenuPlanItem
    {
        FoodItemId = x.FoodItemId,
        DayOfWeek = x.DayOfWeek,
        MealName = x.MealName.Trim(),
        FoodNameSnapshot = x.FoodNameSnapshot.Trim(),
        Portions = x.Portions,
        Grams = x.Grams,
        EnergyKcal = x.EnergyKcal,
        HouseholdMeasure = x.HouseholdMeasure.Trim()
    }).ToList();
}

public sealed record MenuPlanItemRequest(
    Guid? FoodItemId,
    [Range(1, 7)] int DayOfWeek,
    [Required, MaxLength(60)] string MealName,
    [Required, MaxLength(180)] string FoodNameSnapshot,
    [Range(0.25, 20)] decimal Portions,
    [Range(0.1, 10000)] decimal Grams,
    [Range(0, 10000)] decimal EnergyKcal,
    [MaxLength(120)] string HouseholdMeasure);

public sealed record MenuPlanRequest(
    Guid PatientId,
    [Required, MinLength(3), MaxLength(180)] string Name,
    DateOnly StartsOn,
    DateOnly EndsOn,
    [Range(500, 6000)] decimal EnergyTargetKcal,
    [MaxLength(2000)] string ProfessionalNotes,
    [Required, MinLength(1)]
    IReadOnlyList<MenuPlanItemRequest> Items);
