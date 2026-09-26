using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Domain.FoodCatalog;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controllers.FoodCatalog;

[ApiController]
[Route("api/foods")]
public sealed class FoodsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] FoodCatalogSource? source,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 100);
        var query = db.FoodItems.AsNoTracking().Where(x => !x.IsArchived);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Name.Contains(q) || x.Group.Contains(q));
        if (source.HasValue) query = query.Where(x => x.Source == source);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return Ok(new { items, page, pageSize, total, notice = "Las filas EcuadorDemo son solo demostrativas y no deben usarse clínicamente." });
    }

    [HttpPost]
    [Authorize(Roles = "Nutritionist,ClinicAdmin")]
    public async Task<IActionResult> Create(
        SavePersonalizedFoodRequest request,
        CancellationToken cancellationToken)
    {
        var item = new FoodItem
        {
            SourceCode = $"PERSONAL-{Guid.NewGuid():N}",
            Source = FoodCatalogSource.Personalized,
            Name = request.Name.Trim(),
            Group = request.Group.Trim(),
            PortionGrams = request.PortionGrams,
            HouseholdMeasure = request.HouseholdMeasure.Trim(),
            EnergyKcal = request.EnergyKcal,
            ProteinG = request.ProteinG,
            CarbohydrateG = request.CarbohydrateG,
            FatG = request.FatG,
            FiberG = request.FiberG,
            SodiumMg = request.SodiumMg,
            SourceEdition = "Personalizado",
            SourceReference = request.SourceReference.Trim()
        };
        db.FoodItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/foods/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Nutritionist,ClinicAdmin")]
    public async Task<IActionResult> Update(
        Guid id,
        SavePersonalizedFoodRequest request,
        CancellationToken cancellationToken)
    {
        var item = await db.FoodItems.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived,
            cancellationToken);
        if (item is null) return NotFound();
        if (item.Source != FoodCatalogSource.Personalized)
            return Conflict(new
            {
                title = "Catálogo protegido",
                detail = "Los alimentos importados se actualizan publicando una nueva edición del catálogo."
            });

        item.Name = request.Name.Trim();
        item.Group = request.Group.Trim();
        item.PortionGrams = request.PortionGrams;
        item.HouseholdMeasure = request.HouseholdMeasure.Trim();
        item.EnergyKcal = request.EnergyKcal;
        item.ProteinG = request.ProteinG;
        item.CarbohydrateG = request.CarbohydrateG;
        item.FatG = request.FatG;
        item.FiberG = request.FiberG;
        item.SodiumMg = request.SodiumMg;
        item.SourceReference = request.SourceReference.Trim();
        await db.SaveChangesAsync(cancellationToken);
        return Ok(item);
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var item = await db.FoodItems.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived,
            cancellationToken);
        if (item is null) return NotFound();
        if (item.Source != FoodCatalogSource.Personalized)
            return Conflict(new
            {
                title = "Catálogo protegido",
                detail = "Solo los alimentos personalizados pueden archivarse individualmente."
            });
        item.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("import")]
    [Authorize(Roles = "ClinicAdmin")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Import([FromForm] IFormFile file,
        [FromForm] FoodCatalogSource source, [FromForm] string sourceEdition,
        [FromForm] string sourceReference, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("clinic_id"), out var clinicId)) return Forbid();
        if (source == FoodCatalogSource.EcuadorDemo)
            return ValidationProblem("Selecciona EcuadorAuthorized o SmaeAuthorized.");
        if (file.Length is 0 or > 5_000_000 || !Path.GetExtension(file.FileName).Equals(".csv", StringComparison.OrdinalIgnoreCase))
            return ValidationProblem("El archivo debe ser CSV y no superar 5 MB.");
        if (string.IsNullOrWhiteSpace(sourceEdition) || string.IsNullOrWhiteSpace(sourceReference))
            return ValidationProblem("La edición y la referencia de la fuente son obligatorias.");

        await using var uploadedStream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await uploadedStream.CopyToAsync(memory, cancellationToken);
        var checksum = Convert.ToHexString(SHA256.HashData(memory.ToArray())).ToLowerInvariant();
        memory.Position = 0;
        using var reader = new StreamReader(memory);
        var headerLine = await reader.ReadLineAsync(cancellationToken);
        if (headerLine is null) return ValidationProblem("El archivo está vacío.");
        var headers = ParseCsvLine(headerLine).Select((name, index) => new { Name = name.Trim(), Index = index })
            .ToDictionary(x => x.Name, x => x.Index, StringComparer.OrdinalIgnoreCase);
        var required = new[] { "source_code", "name", "group", "portion_grams", "household_measure",
            "energy_kcal", "protein_g", "carbohydrate_g", "fat_g", "fiber_g", "sodium_mg" };
        var missing = required.Where(column => !headers.ContainsKey(column)).ToArray();
        if (missing.Length > 0) return ValidationProblem($"Faltan columnas: {string.Join(", ", missing)}.");

        var rows = new List<FoodItem>();
        var errors = new List<string>();
        var lineNumber = 1;
        while (true)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line is null) break;
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line)) continue;
            if (rows.Count >= 10_000)
                return UnprocessableEntity(new { title = "Importación rechazada", errors = new[] { "El archivo supera el máximo de 10.000 filas." } });
            var values = ParseCsvLine(line);
            try
            {
                string Text(string key) => values[headers[key]].Trim();
                decimal Number(string key) => decimal.Parse(Text(key), NumberStyles.Number, CultureInfo.InvariantCulture);
                var item = new FoodItem
                {
                    SourceCode = Text("source_code"),
                    Source = source,
                    Name = Text("name"),
                    Group = Text("group"),
                    PortionGrams = Number("portion_grams"),
                    HouseholdMeasure = Text("household_measure"),
                    EnergyKcal = Number("energy_kcal"),
                    ProteinG = Number("protein_g"),
                    CarbohydrateG = Number("carbohydrate_g"),
                    FatG = Number("fat_g"),
                    FiberG = Number("fiber_g"),
                    SodiumMg = Number("sodium_mg"),
                    SourceEdition = sourceEdition.Trim(),
                    SourceReference = sourceReference.Trim()
                };
                if (string.IsNullOrWhiteSpace(item.SourceCode) || string.IsNullOrWhiteSpace(item.Name)
                    || string.IsNullOrWhiteSpace(item.Group) || item.PortionGrams <= 0
                    || new[] { item.EnergyKcal, item.ProteinG, item.CarbohydrateG, item.FatG, item.FiberG, item.SodiumMg }.Any(x => x < 0))
                    throw new FormatException("Código, nombre, grupo, porción o nutrientes no válidos.");
                rows.Add(item);
            }
            catch (Exception ex) when (ex is FormatException or IndexOutOfRangeException)
            {
                errors.Add($"Fila {lineNumber}: {ex.Message}");
                if (errors.Count == 50) break;
            }
        }
        if (errors.Count > 0) return UnprocessableEntity(new { title = "Importación rechazada", errors });
        if (rows.Count == 0) return UnprocessableEntity(new { title = "Importación rechazada", errors = new[] { "El catálogo no contiene filas de alimentos." } });
        var duplicateCodes = rows.GroupBy(x => x.SourceCode, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1).Select(group => group.Key).Take(20).ToArray();
        if (duplicateCodes.Length > 0)
            return UnprocessableEntity(new { title = "Importación rechazada", errors = new[] { $"Hay códigos duplicados: {string.Join(", ", duplicateCodes)}." } });

        var codes = rows.Select(x => x.SourceCode).ToArray();
        var existing = await db.FoodItems.Where(x => x.Source == source && codes.Contains(x.SourceCode))
            .ToDictionaryAsync(x => x.SourceCode, cancellationToken);
        foreach (var row in rows)
        {
            if (!existing.TryGetValue(row.SourceCode, out var current)) db.FoodItems.Add(row);
            else
            {
                current.Name = row.Name; current.Group = row.Group; current.PortionGrams = row.PortionGrams;
                current.HouseholdMeasure = row.HouseholdMeasure; current.EnergyKcal = row.EnergyKcal;
                current.ProteinG = row.ProteinG; current.CarbohydrateG = row.CarbohydrateG;
                current.FatG = row.FatG; current.FiberG = row.FiberG; current.SodiumMg = row.SodiumMg;
                current.SourceEdition = row.SourceEdition; current.SourceReference = row.SourceReference;
            }
        }
        var updatedCount = rows.Count(x => existing.ContainsKey(x.SourceCode));
        db.FoodCatalogImports.Add(new FoodCatalogImport
        {
            ClinicId = clinicId,
            Source = source,
            SourceEdition = sourceEdition.Trim(),
            SourceReference = sourceReference.Trim(),
            OriginalFileName = Path.GetFileName(file.FileName),
            Sha256 = checksum,
            ImportedRows = rows.Count,
            UpdatedRows = updatedCount,
            ImportedByUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId) ? actorId : null,
            ImportedByEmail = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
            ImportedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { imported = rows.Count, updated = updatedCount, source, sourceEdition, sha256 = checksum });
    }

    [HttpGet("imports")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> ImportHistory(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue("clinic_id"), out var clinicId)) return Forbid();
        var items = await db.FoodCatalogImports.AsNoTracking()
            .Where(x => x.ClinicId == clinicId)
            .OrderByDescending(x => x.ImportedAtUtc)
            .Take(50)
            .Select(x => new { x.Id, x.Source, x.SourceEdition, x.SourceReference, x.OriginalFileName,
                x.Sha256, x.ImportedRows, x.UpdatedRows, x.ImportedByEmail, x.ImportedAtUtc })
            .ToListAsync(cancellationToken);
        return Ok(items);
    }

    [HttpGet("import-template")]
    [Authorize(Roles = "ClinicAdmin")]
    public IActionResult ImportTemplate()
    {
        const string csv = "source_code,name,group,portion_grams,household_measure,energy_kcal,protein_g,carbohydrate_g,fat_g,fiber_g,sodium_mg\r\n";
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", "plantilla-catalogo-nutrivida.csv");
    }

    private static List<string> ParseCsvLine(string line)
    {
        var values = new List<string>();
        var current = new System.Text.StringBuilder();
        var quoted = false;
        for (var i = 0; i < line.Length; i++)
        {
            var character = line[i];
            if (character == '"' && quoted && i + 1 < line.Length && line[i + 1] == '"')
            {
                current.Append('"'); i++; continue;
            }
            if (character == '"') { quoted = !quoted; continue; }
            if (character == ',' && !quoted) { values.Add(current.ToString()); current.Clear(); continue; }
            current.Append(character);
        }
        values.Add(current.ToString());
        return values;
    }
}

public sealed record SavePersonalizedFoodRequest(
    [System.ComponentModel.DataAnnotations.Required, System.ComponentModel.DataAnnotations.MinLength(2), System.ComponentModel.DataAnnotations.MaxLength(180)] string Name,
    [System.ComponentModel.DataAnnotations.Required, System.ComponentModel.DataAnnotations.MinLength(2), System.ComponentModel.DataAnnotations.MaxLength(100)] string Group,
    [System.ComponentModel.DataAnnotations.Range(0.01, 5000)] decimal PortionGrams,
    [System.ComponentModel.DataAnnotations.Required, System.ComponentModel.DataAnnotations.MinLength(2), System.ComponentModel.DataAnnotations.MaxLength(120)] string HouseholdMeasure,
    [System.ComponentModel.DataAnnotations.Range(0, 10000)] decimal EnergyKcal,
    [System.ComponentModel.DataAnnotations.Range(0, 1000)] decimal ProteinG,
    [System.ComponentModel.DataAnnotations.Range(0, 1000)] decimal CarbohydrateG,
    [System.ComponentModel.DataAnnotations.Range(0, 1000)] decimal FatG,
    [System.ComponentModel.DataAnnotations.Range(0, 1000)] decimal FiberG,
    [System.ComponentModel.DataAnnotations.Range(0, 100000)] decimal SodiumMg,
    [System.ComponentModel.DataAnnotations.Required, System.ComponentModel.DataAnnotations.MinLength(3), System.ComponentModel.DataAnnotations.MaxLength(500)] string SourceReference);
