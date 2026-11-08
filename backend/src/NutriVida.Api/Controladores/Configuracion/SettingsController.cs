using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Api.Security;
using NutriVida.Domain.Energy;
using NutriVida.Domain.Settings;
using NutriVida.Infrastructure.Persistence;

namespace NutriVida.Api.Controladores.Configuracion;

[ApiController]
[Route("api/settings")]
public sealed class SettingsController(NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var settings = await db.ClinicSettings.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ClinicId == clinicId, cancellationToken) ?? new ClinicSettings();
        return Ok(ToResponse(settings));
    }

    [HttpPut]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Update(SaveSettingsRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var settings = await db.ClinicSettings.SingleOrDefaultAsync(x => x.ClinicId == clinicId, cancellationToken);
        if (settings is null)
        {
            settings = new ClinicSettings { ClinicId = clinicId };
            db.ClinicSettings.Add(settings);
        }
        settings.PracticeName = request.PracticeName.Trim();
        settings.Address = request.Address?.Trim() ?? string.Empty;
        settings.DefaultFormula = request.DefaultFormula;
        settings.DefaultEtaPercent = request.DefaultEtaPercent;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(settings));
    }

    private static object ToResponse(ClinicSettings settings) => new
    {
        settings.PracticeName,
        settings.Address,
        settings.DefaultFormula,
        settings.DefaultEtaPercent
    };
}

public sealed record SaveSettingsRequest(
    [Required, MinLength(3), MaxLength(160)] string PracticeName,
    [MaxLength(300)] string? Address,
    [EnumDataType(typeof(EnergyFormula))] EnergyFormula DefaultFormula,
    [Range(0, 0.30)] decimal DefaultEtaPercent);
