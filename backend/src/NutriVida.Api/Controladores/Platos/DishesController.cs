using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.MenuPlanning;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controladores.Platos;

[ApiController]
[Route("api/dishes")]
public sealed class DishesController(NutriVidaDbContext db) : ControllerBase
{
    private const long MaxImageBytes = 5 * 1024 * 1024;

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? mealName,
        [FromQuery] decimal? maxCostPerServing,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var query = db.Dishes.AsNoTracking()
            .Include(x => x.Ingredients)
            .Where(x => x.ClinicId == clinicId && !x.IsArchived);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(x => x.Name.Contains(term) || x.Ingredients.Any(i => i.FoodNameSnapshot.Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(mealName)) query = query.Where(x => x.MealName == mealName.Trim());

        var rows = await query.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        var filtered = rows.Select(ToResponse);
        if (maxCostPerServing.HasValue)
            filtered = filtered.Where(x => x.CostPerServingUsd <= maxCostPerServing.Value);
        var materialized = filtered.ToList();
        var total = materialized.Count;
        var items = materialized.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Ok(new { items, page, pageSize, total, totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var dish = await db.Dishes.AsNoTracking().Include(x => x.Ingredients)
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived, cancellationToken);
        return dish is null ? NotFound() : Ok(ToResponse(dish));
    }

    [HttpPost]
    public async Task<IActionResult> Create(DishRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var validation = await ValidateAndBuildIngredients(request, cancellationToken);
        if (validation.Error is not null) return ValidationProblem(validation.Error);

        var dish = new Dish { ClinicId = clinicId };
        Apply(request, dish, validation.Ingredients!);
        db.Dishes.Add(dish);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/dishes/{dish.Id}", ToResponse(dish));
    }

    [HttpPost("media/image")]
    [RequestSizeLimit(MaxImageBytes)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        if (file.Length is <= 0 or > MaxImageBytes)
            return ValidationProblem("Selecciona una imagen de hasta 5 MB.");

        var extension = await DetectImageExtension(file, cancellationToken);
        if (extension is null)
            return ValidationProblem("El archivo debe ser una imagen JPG, PNG o WebP válida.");

        var relativeFolder = Path.Combine("uploads", "platos", clinicId.ToString("N"));
        var physicalFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativeFolder);
        Directory.CreateDirectory(physicalFolder);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var physicalPath = Path.Combine(physicalFolder, fileName);
        await using (var stream = System.IO.File.Create(physicalPath))
            await file.CopyToAsync(stream, cancellationToken);

        var relativeUrl = "/" + Path.Combine(relativeFolder, fileName).Replace('\\', '/');
        var absoluteUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";
        return Ok(new { url = absoluteUrl });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, DishRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var dish = await db.Dishes.Include(x => x.Ingredients)
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived, cancellationToken);
        if (dish is null) return NotFound();
        var validation = await ValidateAndBuildIngredients(request, cancellationToken);
        if (validation.Error is not null) return ValidationProblem(validation.Error);

        db.DishIngredients.RemoveRange(dish.Ingredients);
        Apply(request, dish, validation.Ingredients!);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(dish));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetClinicId(out var clinicId)) return Forbid();
        var dish = await db.Dishes.SingleOrDefaultAsync(
            x => x.Id == id && x.ClinicId == clinicId && !x.IsArchived, cancellationToken);
        if (dish is null) return NotFound();
        dish.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<(string? Error, List<DishIngredient>? Ingredients)> ValidateAndBuildIngredients(
        DishRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.MealName)
            || string.IsNullOrWhiteSpace(request.Instructions))
            return ("Completa nombre, tiempo de comida y preparación.", null);
        if (request.Ingredients.Count is < 1 or > 40)
            return ("Agrega entre 1 y 40 ingredientes.", null);
        if (request.CostReferenceDate == default || request.CostReferenceDate > DateOnly.FromDateTime(DateTime.Today))
            return ("La fecha de referencia del costo debe ser válida y no puede estar en el futuro.", null);
        if (request.Ingredients.Any(x => x.FoodItemId == Guid.Empty))
            return ("Selecciona un alimento válido en cada ingrediente.", null);
        if (request.Ingredients.GroupBy(x => x.FoodItemId).Any(x => x.Count() > 1))
            return ("Un alimento no puede repetirse; ajusta sus porciones en una sola fila.", null);
        if (!IsOptionalWebUrl(request.ImageUrl) || !IsOptionalWebUrl(request.VideoUrl))
            return ("La imagen y el video deben usar enlaces web http o https válidos.", null);

        var foodIds = request.Ingredients.Select(x => x.FoodItemId).ToArray();
        var foods = await db.FoodItems.AsNoTracking()
            .Where(x => foodIds.Contains(x.Id) && !x.IsArchived)
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        if (foods.Count != foodIds.Length)
            return ("Uno o más alimentos ya no están disponibles en el catálogo.", null);

        var ingredients = request.Ingredients.Select(row =>
        {
            var food = foods[row.FoodItemId];
            return new DishIngredient
            {
                FoodItemId = food.Id,
                FoodNameSnapshot = food.Name,
                HouseholdMeasureSnapshot = food.HouseholdMeasure,
                Portions = row.Portions,
                Grams = decimal.Round(food.PortionGrams * row.Portions, 2),
                EstimatedCostUsd = decimal.Round(row.EstimatedCostUsd, 2),
                EnergyKcal = decimal.Round(food.EnergyKcal * row.Portions, 2),
                ProteinG = decimal.Round(food.ProteinG * row.Portions, 2),
                CarbohydrateG = decimal.Round(food.CarbohydrateG * row.Portions, 2),
                FatG = decimal.Round(food.FatG * row.Portions, 2),
                FiberG = decimal.Round(food.FiberG * row.Portions, 2),
                SodiumMg = decimal.Round(food.SodiumMg * row.Portions, 2)
            };
        }).ToList();
        return (null, ingredients);
    }

    private static void Apply(DishRequest request, Dish dish, List<DishIngredient> ingredients)
    {
        dish.Name = request.Name.Trim();
        dish.MealName = request.MealName.Trim();
        dish.Servings = request.Servings;
        dish.PreparationMinutes = request.PreparationMinutes;
        dish.CostReferenceDate = request.CostReferenceDate;
        dish.Instructions = request.Instructions.Trim();
        dish.CostNotes = request.CostNotes.Trim();
        dish.ImageUrl = request.ImageUrl?.Trim() ?? string.Empty;
        dish.VideoUrl = request.VideoUrl?.Trim() ?? string.Empty;
        dish.Ingredients = ingredients;
    }

    private bool TryGetClinicId(out Guid clinicId) =>
        Guid.TryParse(User.FindFirstValue("clinic_id"), out clinicId);

    private static DishResponse ToResponse(Dish dish)
    {
        var totalCost = dish.Ingredients.Sum(x => x.EstimatedCostUsd);
        return new DishResponse(
            dish.Id, dish.Name, dish.MealName, dish.Servings, dish.PreparationMinutes,
            dish.CostReferenceDate, dish.Instructions, dish.CostNotes, dish.ImageUrl, dish.VideoUrl,
            decimal.Round(totalCost, 2), decimal.Round(totalCost / dish.Servings, 2),
            decimal.Round(dish.Ingredients.Sum(x => x.EnergyKcal) / dish.Servings, 1),
            decimal.Round(dish.Ingredients.Sum(x => x.ProteinG) / dish.Servings, 1),
            decimal.Round(dish.Ingredients.Sum(x => x.CarbohydrateG) / dish.Servings, 1),
            decimal.Round(dish.Ingredients.Sum(x => x.FatG) / dish.Servings, 1),
            decimal.Round(dish.Ingredients.Sum(x => x.FiberG) / dish.Servings, 1),
            decimal.Round(dish.Ingredients.Sum(x => x.SodiumMg) / dish.Servings, 1),
            dish.UpdatedAtUtc,
            dish.Ingredients.Select(x => new DishIngredientResponse(
                x.Id, x.FoodItemId, x.FoodNameSnapshot, x.HouseholdMeasureSnapshot,
                x.Portions, x.Grams, x.EstimatedCostUsd, x.EnergyKcal,
                x.ProteinG, x.CarbohydrateG, x.FatG, x.FiberG, x.SodiumMg)).ToList());
    }

    private static bool IsOptionalWebUrl(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || (Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
            && uri.Scheme is "http" or "https");

    private static async Task<string?> DetectImageExtension(IFormFile file, CancellationToken cancellationToken)
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        if (read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return ".jpg";
        if (read >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return ".png";
        if (read >= 12 && header[..4].SequenceEqual("RIFF"u8.ToArray()) && header[8..12].SequenceEqual("WEBP"u8.ToArray())) return ".webp";
        return null;
    }
}

public sealed record DishIngredientRequest(
    Guid FoodItemId,
    [Range(0.25, 40)] decimal Portions,
    [Range(0, 10000)] decimal EstimatedCostUsd);

public sealed record DishRequest(
    [Required, MinLength(3), MaxLength(180)] string Name,
    [Required, MaxLength(60)] string MealName,
    [Range(1, 100)] int Servings,
    [Range(0, 1440)] int PreparationMinutes,
    DateOnly CostReferenceDate,
    [Required, MinLength(5), MaxLength(4000)] string Instructions,
    [MaxLength(600)] string CostNotes,
    [MaxLength(2048)] string? ImageUrl,
    [MaxLength(2048)] string? VideoUrl,
    [Required, MinLength(1), MaxLength(40)]
    IReadOnlyList<DishIngredientRequest> Ingredients);

public sealed record DishIngredientResponse(
    Guid Id, Guid FoodItemId, string FoodName, string HouseholdMeasure,
    decimal Portions, decimal Grams, decimal EstimatedCostUsd, decimal EnergyKcal,
    decimal ProteinG, decimal CarbohydrateG, decimal FatG, decimal FiberG, decimal SodiumMg);

public sealed record DishResponse(
    Guid Id, string Name, string MealName, int Servings, int PreparationMinutes,
    DateOnly CostReferenceDate, string Instructions, string CostNotes, string ImageUrl, string VideoUrl,
    decimal TotalCostUsd, decimal CostPerServingUsd, decimal EnergyKcalPerServing,
    decimal ProteinGPerServing, decimal CarbohydrateGPerServing, decimal FatGPerServing,
    decimal FiberGPerServing, decimal SodiumMgPerServing,
    DateTime UpdatedAtUtc, IReadOnlyList<DishIngredientResponse> Ingredients);
