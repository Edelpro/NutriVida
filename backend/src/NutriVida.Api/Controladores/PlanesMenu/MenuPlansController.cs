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
        var (error, items) = await ValidateAndBuildItems(request, [], cancellationToken);
        if (error is not null) return ValidationProblem(error);

        var plan = new MenuPlan
        {
            PatientId = request.PatientId,
            Name = request.Name.Trim(),
            StartsOn = request.StartsOn,
            EndsOn = request.EndsOn,
            EnergyTargetKcal = request.EnergyTargetKcal,
            ProfessionalNotes = request.ProfessionalNotes.Trim(),
            Items = items!
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
        var (error, items) = await ValidateAndBuildItems(request, plan.Items, cancellationToken);
        if (error is not null) return ValidationProblem(error);

        plan.Name = request.Name.Trim();
        plan.StartsOn = request.StartsOn;
        plan.EndsOn = request.EndsOn;
        plan.EnergyTargetKcal = request.EnergyTargetKcal;
        plan.ProfessionalNotes = request.ProfessionalNotes.Trim();
        // Un plan aprobado que cambia debe revisarse otra vez.
        plan.Status = MenuPlanStatus.Draft;
        plan.ApprovedAtUtc = null;
        plan.ApprovedByName = string.Empty;
        // Se añaden de forma explícita: con un Id ya generado, EF trataría las filas nuevas
        // asignadas a la colección como existentes e intentaría actualizarlas.
        db.MenuPlanItems.RemoveRange(plan.Items);
        foreach (var item in items!) item.MenuPlanId = plan.Id;
        db.MenuPlanItems.AddRange(items);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(plan);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out _)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var plan = await db.MenuPlans.Include(x => x.Items).SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived && accessiblePatientIds.Contains(x.PatientId),
            cancellationToken);
        if (plan is null) return NotFound();
        plan.Status = MenuPlanStatus.Approved;
        plan.ApprovedAtUtc = DateTime.UtcNow;
        plan.ApprovedByName = User.Identity?.Name ?? "Profesional";
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

    private async Task<(string? Error, List<MenuPlanItem>? Items)> ValidateAndBuildItems(
        MenuPlanRequest request,
        IReadOnlyCollection<MenuPlanItem> currentItems,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0) return ("Añade al menos un alimento o plato al menú.", null);
        if (request.StartsOn == default || request.EndsOn == default) return ("Selecciona fechas válidas para el plan.", null);
        if (request.EndsOn < request.StartsOn) return ("La fecha final debe ser posterior a la inicial.", null);
        if (request.Items.Any(x => string.IsNullOrWhiteSpace(x.MealName) || string.IsNullOrWhiteSpace(x.FoodNameSnapshot)))
            return ("Cada alimento debe tener tiempo de comida y nombre.", null);
        if (request.Items.Any(x => !MenuPlanRules.IsDayWithinPlan(request.StartsOn, request.EndsOn, x.DayOfWeek)))
            return ("Hay alimentos en un día que no forma parte de las fechas del plan.", null);

        var foodIds = request.Items.Where(x => x.FoodItemId.HasValue).Select(x => x.FoodItemId!.Value).Distinct().ToArray();
        if (foodIds.Any(x => x == Guid.Empty)) return ("Selecciona alimentos válidos del catálogo.", null);
        var foods = await db.FoodItems.AsNoTracking()
            .Where(x => foodIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        // Un alimento archivado solo se admite si ya estaba en el plan que se está editando.
        var usable = foodIds.All(id => foods.TryGetValue(id, out var food)
            && (!food.IsArchived || currentItems.Any(x => x.FoodItemId == id)));
        if (!usable) return ("Uno o más alimentos ya no están disponibles. Actualiza el catálogo y vuelve a agregarlos.", null);

        var items = request.Items.Select(row =>
        {
            var portions = decimal.Round(row.Portions, 2);
            var item = new MenuPlanItem
            {
                FoodItemId = row.FoodItemId,
                DayOfWeek = row.DayOfWeek,
                MealName = row.MealName.Trim(),
                FoodNameSnapshot = row.FoodNameSnapshot.Trim(),
                Portions = portions,
                Grams = row.Grams,
                EnergyKcal = row.EnergyKcal,
                HouseholdMeasure = row.HouseholdMeasure.Trim()
            };
            if (row.FoodItemId is not { } foodId) return item;

            // Los valores nutricionales salen del servidor. Lo que ya estaba en el plan conserva su
            // instantánea: una edición nueva del catálogo no cambia en silencio un plan antiguo.
            var snapshot = currentItems.FirstOrDefault(x => x.FoodItemId == foodId && x.Portions == portions);
            var food = foods[foodId];
            item.FoodNameSnapshot = row.FoodNameSnapshot.Contains(food.Name, StringComparison.OrdinalIgnoreCase)
                ? row.FoodNameSnapshot.Trim()
                : snapshot?.FoodNameSnapshot ?? food.Name;
            item.Grams = snapshot?.Grams ?? decimal.Round(food.PortionGrams * row.Portions, 2);
            item.EnergyKcal = snapshot?.EnergyKcal ?? decimal.Round(food.EnergyKcal * row.Portions, 2);
            item.HouseholdMeasure = snapshot?.HouseholdMeasure ?? food.HouseholdMeasure;
            return item;
        }).ToList();
        return (null, items);
    }
}

public static class MenuPlanRules
{
    /// <summary>dayOfWeek va de 1 (lunes) a 7 (domingo). Un plan de 7 días o más incluye todos.</summary>
    public static bool IsDayWithinPlan(DateOnly startsOn, DateOnly endsOn, int dayOfWeek)
    {
        if (endsOn.DayNumber - startsOn.DayNumber >= 6) return dayOfWeek is >= 1 and <= 7;
        for (var date = startsOn; date <= endsOn; date = date.AddDays(1))
            if ((date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek) == dayOfWeek) return true;
        return false;
    }
}

public sealed record MenuPlanItemRequest(
    Guid? FoodItemId,
    [Range(1, 7)] int DayOfWeek,
    [Required, MaxLength(60)] string MealName,
    [Required, MaxLength(180)] string FoodNameSnapshot,
    [Range(0.01, 20)] decimal Portions,
    [Range(0.01, 10000)] decimal Grams,
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
