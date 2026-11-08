using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriVida.Application.Energy;
using NutriVida.Domain.Energy;
using NutriVida.Infrastructure.Persistence;
using NutriVida.Api.Security;

namespace NutriVida.Api.Controllers.Energy;

[ApiController]
[Route("api/energy")]
public sealed class EnergyController(IEnergyCalculator calculator, NutriVidaDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid patientId, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (!await db.CanAccessPatientAsync(User, patientId, cancellationToken))
            return NotFound();
        return Ok(await db.EnergyCalculations.AsNoTracking()
            .Where(x => x.PatientId == patientId && !x.IsArchived)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken));
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate(CalculateEnergyRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (request.PatientId.HasValue)
        {
            if (request.PatientId.Value == Guid.Empty)
                return ValidationProblem("Selecciona un paciente válido.");
            if (!await db.CanAccessPatientAsync(User, request.PatientId.Value, cancellationToken))
                return NotFound(new { title = "Paciente no encontrado", detail = "Actualiza la lista y selecciona nuevamente el expediente." });
        }

        var result = calculator.Calculate(new EnergyCalculationRequest(request.Formula, request.WeightKg,
            request.HeightCm, request.AgeYears, request.Sex, request.ActivityFactor, request.EtaPercent,
            request.GoalAdjustmentKcal));
        if (result.TotalEnergyKcal < EnergyCalculator.MinimumTotalKcal) return TotalTooLow();
        if (request.PatientId.HasValue)
        {
            db.EnergyCalculations.Add(new EnergyCalculation
            {
                PatientId = request.PatientId.Value,
                Formula = request.Formula,
                WeightKg = request.WeightKg,
                HeightCm = request.HeightCm,
                AgeYears = request.AgeYears,
                Sex = request.Sex,
                ActivityFactor = request.ActivityFactor,
                EtaPercent = request.EtaPercent,
                GoalAdjustmentKcal = request.GoalAdjustmentKcal,
                RestingEnergyKcal = result.RestingEnergyKcal,
                TotalEnergyKcal = result.TotalEnergyKcal,
                CalculatedByName = User.Identity?.Name ?? "Profesional"
            });
            await db.SaveChangesAsync(cancellationToken);
        }
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CalculateEnergyRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        if (!request.PatientId.HasValue || request.PatientId == Guid.Empty) return ValidationProblem("Selecciona un paciente válido.");
        var accessiblePatientIds = db.AccessiblePatients(User).Select(x => x.Id);
        var calculation = await db.EnergyCalculations.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived && x.PatientId == request.PatientId
                && accessiblePatientIds.Contains(x.PatientId), cancellationToken);
        if (calculation is null) return NotFound();
        var result = calculator.Calculate(new EnergyCalculationRequest(request.Formula, request.WeightKg,
            request.HeightCm, request.AgeYears, request.Sex, request.ActivityFactor, request.EtaPercent,
            request.GoalAdjustmentKcal));
        if (result.TotalEnergyKcal < EnergyCalculator.MinimumTotalKcal) return TotalTooLow();
        Apply(request, result, calculation);
        calculation.CalculatedByName = User.Identity?.Name ?? "Profesional";
        await db.SaveChangesAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "ClinicAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        if (!User.TryGetClinicId(out var clinicId)) return Forbid();
        var accessiblePatientIds = db.AccessiblePatients(User, includeArchived: true).Select(x => x.Id);
        var calculation = await db.EnergyCalculations.SingleOrDefaultAsync(
            x => x.Id == id && !x.IsArchived
                && accessiblePatientIds.Contains(x.PatientId), cancellationToken);
        if (calculation is null) return NotFound();
        calculation.IsArchived = true;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private IActionResult TotalTooLow() => ValidationProblem(
        $"El requerimiento resultante es menor a {EnergyCalculator.MinimumTotalKcal:0} kcal/día. Revisa los datos y el ajuste por objetivo.");

    private static void Apply(CalculateEnergyRequest request, EnergyCalculationResult result, EnergyCalculation calculation)
    {
        calculation.PatientId = request.PatientId!.Value;
        calculation.Formula = request.Formula;
        calculation.WeightKg = request.WeightKg;
        calculation.HeightCm = request.HeightCm;
        calculation.AgeYears = request.AgeYears;
        calculation.Sex = request.Sex;
        calculation.ActivityFactor = request.ActivityFactor;
        calculation.EtaPercent = request.EtaPercent;
        calculation.GoalAdjustmentKcal = request.GoalAdjustmentKcal;
        calculation.RestingEnergyKcal = result.RestingEnergyKcal;
        calculation.TotalEnergyKcal = result.TotalEnergyKcal;
    }
}

public sealed record CalculateEnergyRequest(
    Guid? PatientId,
    [EnumDataType(typeof(EnergyFormula))] EnergyFormula Formula,
    [Range(20, 350, ErrorMessage = "El peso debe estar entre 20 y 350 kg.")] decimal WeightKg,
    [Range(90, 250, ErrorMessage = "La estatura debe estar entre 90 y 250 cm.")] decimal HeightCm,
    [Range(18, 120, ErrorMessage = "La edad debe estar entre 18 y 120 años.")] int AgeYears,
    [Required, RegularExpression("(?i)^(male|female|masculino|femenino)$", ErrorMessage = "Selecciona sexo femenino o masculino para la fórmula.")] string Sex,
    [Range(1.0, 2.5, ErrorMessage = "El factor de actividad debe estar entre 1,0 y 2,5.")] decimal ActivityFactor,
    [Range(0, 0.30, ErrorMessage = "El ETA debe estar entre 0 % y 30 %.")] decimal EtaPercent,
    [Range(-1000, 1000, ErrorMessage = "El ajuste debe estar entre -1000 y 1000 kcal.")] decimal GoalAdjustmentKcal);
